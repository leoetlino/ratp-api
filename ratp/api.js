const TOKEN = "FvChCBnSetVgTKk324rO";
const API_HOST = "http://apixha.ixxi.net";

let co = require("co");
let _ = require("lodash");
let needle = require("needle");

let moduleLogger = log.child({ component: "ratp/api" });

const ONE_SECOND = 1000;
const TTL = 15 * ONE_SECOND;
let cache = {};

let ratpApi = {
  query(details) {
    const url = `${API_HOST}/APIX?keyapp=${TOKEN}` +
      "&" + details +
      `&withText=true&apixFormat=json`;
    let logger = moduleLogger.child({ url });
    if (cache[url] && new Date().getTime() < cache[url].validUntil.getTime()) {
      logger.debug("Returning promise from cache");
      return cache[url].promise;
    }
    if (cache[url] && new Date().getTime() > cache[url].validUntil.getTime()) {
      logger.debug("Removing cache entry which expired");
      delete cache[url];
    }
    return new Promise((resolve, reject) => {
      needle.get(url, (error, response) => {
        if (error) {
          logger.error(error, "Failed to query the RATP API");
          return reject(error);
        }
        logger = logger.child({ response: response.body });
        let data;
        try {
          data = JSON.parse(response.body);
        } catch (err) {
          err.message = "Failed to parse response: " + err.message;
          logger.error(err, "Failed to parse response");
          return reject(err);
        }
        if (!data) {
          logger.error("No data returned from the RATP API");
          return reject(new Error("No data returned from the RATP API."));
        }
        if (data.errorMsg) {
          logger.error({ error: data.errorMsg }, "The RATP API returned an error");
          return reject(new Error("The RATP API returned an error: " + data.errorMsg));
        }
        resolve(data);
        cache[url] = {
          promise: Promise.resolve(data),
          date: new Date(),
          validUntil: new Date(new Date().getTime() + TTL),
        };
      });
    });
  },

  queryNextStops(stationId, lineId, directionId) {
    return co(function* () {
      let response = yield ratpApi.query(`cmd=getNextStopsRealtime` +
        `&stopArea=${stationId}&line=${lineId}&direction=${directionId}`);
      let now = new Date().getTime();
      response.nextStopsOnLines[0].nextStops
        .forEach((stop) => {
          if (stop.waitingTimeRaw === "Service termine"
            || stop.waitingTimeRaw === "Train arrete") {
            return;
          }
          if (stop.waitingTime < -60) {
            moduleLogger.debug({ stop }, "Bogus data from the RATP API: waitingTime < -60");
            return Promise.reject(new Error("The RATP API returned bogus data: waitingTime < -60"));
          }
          let stopTime = new Date(stop.nextStopTime).getTime();
          let minutesUntilStop = Math.ceil((stopTime - now) / 1000 / 60);
          if (minutesUntilStop < -1 || minutesUntilStop > 120) {
            moduleLogger.debug({ stop }, "Bogus data from the RATP API: impossible nextStopTime");
            return Promise.reject(new Error("The RATP API returned bogus data: impossible nextStopTime"));
          }
        });
      let stops = response.nextStopsOnLines[0].nextStops
        .filter((stop) => stop.bStopInStation && stop.nextStopTime
          && stop.waitingTimeRaw !== "Service termine"
          && stop.waitingTimeRaw !== "Train arrete")
        .map((stop) => {
          let stopTime = new Date(stop.nextStopTime).getTime();
          let minutesUntilStop = Math.ceil((stopTime - now) / 1000 / 60);
          let message = minutesUntilStop + " mins";
          if (message === "1 mins") {
            message = "1 min";
          }
          if (stop.waitingTimeRaw === "Train a l'approche"
            || stop.waitingTime === -60
            || message === "0 mins") {
            message = "< 1 min";
          }
          if (stop.waitingTimeRaw === "Train a quai") {
            message = "À quai";
          }
          if (stop.waitingTimeRaw === "Train retarde") {
            message += " (R)";
          }
          return {
            destination: stop.destinationName,
            waitingTime: stop.waitingTime,
            nextStopTime: stop.nextStopTime,
            rawMessage: stop.waitingTimeRaw,
            message,
            delayed: stop.waitingTimeRaw === "Train retarde",
          };
        });
      return stops;
    });
  },

  queryIssues(query = "networkType=all&category=all") {
    return co(function* () {
      let events = yield ratpApi.query(`cmd=getTrafficSituation&${query}`);
      let issues = [];
      events.events
        .filter((event) => !!event.incidents)
        .forEach((event) => {
          issues = _.union(issues, event.incidents);
        }) || [];
      return issues;
    });
  },
};

export default ratpApi;
