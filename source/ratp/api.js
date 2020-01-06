const TOKEN = "FvChCBnSetVgTKk324rO";
const API_HOST = "http://apixha.ixxi.net";

import RatpApiError from "~/common/errors/RatpApiError";
import BogusRatpApiResponseError from "~/common/errors/BogusRatpApiResponseError";

let promisify = require("promisify-node");
let _ = require("lodash");
let needle = promisify(require("needle"));

let moduleLogger = log.child({ component: "ratp/api" });

const ONE_SECOND = 1000;
const TTL = 5 * ONE_SECOND;
let cache = {};
let addToCache = (url, response) => {
  let now = new Date();
  cache[url] = {
    promise: Promise.resolve(response),
    date: now,
    validUntil: new Date(now.getTime() + TTL),
  };
};

let validateNextStops = (nextStops) => {
  let now = new Date();
  if (!Array.isArray(nextStops)) {
    let err = new BogusRatpApiResponseError("nextStops isn't an array?!?");
    moduleLogger.warn({ nextStops }, err);
    throw err;
  }
  nextStops.forEach((stop) => {
    if (stop.waitingTime == null) {
      return;
    }
    if (stop.waitingTimeRaw === "Service termine"
      || stop.waitingTimeRaw === "Train arrete") {
      return;
    }
    if (stop.waitingTime < -60) {
      moduleLogger.debug({ stop }, "Bogus data from the RATP API: waitingTime < -60");
      throw new BogusRatpApiResponseError("waitingTime < -60");
    }
    let stopTime = new Date(stop.nextStopTime).getTime();
    let minutesUntilStop = Math.ceil((stopTime - now) / 1000 / 60);
    if (minutesUntilStop < -1 || minutesUntilStop > 120) {
      moduleLogger.debug({ stop }, "Bogus data from the RATP API: impossible nextStopTime");
      throw new BogusRatpApiResponseError("impossible nextStopTime");
    }
  });
};

let ratpApi = {
  async query(details, validateFn = () => {}) {
    const url = `${API_HOST}/APIX?keyapp=${TOKEN}` +
      "&" + details +
      `&withText=true&apixFormat=json`;
    let logger = moduleLogger.child({ url });
    if (cache[url] && new Date().getTime() < cache[url].validUntil.getTime()) {
      return cache[url].promise;
    }
    if (cache[url] && new Date().getTime() > cache[url].validUntil.getTime()) {
      delete cache[url];
    }
    try {
      let response = await needle.get(url);
      logger = logger.child({ response: response.body });
      let data;
      try {
        data = JSON.parse(response.body);
      } catch (error) {
        error.message = "Failed to parse response: " + error.message;
        logger.error({ error, response }, "Failed to parse response");
        return Promise.reject(error);
      }
      if (!data) {
        logger.error("No data returned from the RATP API");
        return Promise.reject(new BogusRatpApiResponseError("no data returned"));
      }
      if (data.errorMsg) {
        logger.error({ error: data.errorMsg }, "The RATP API returned an error");
        return Promise.reject(new RatpApiError(data.errorMsg));
      }
      validateFn(data);
      addToCache(url, data);
      return data;
    } catch (error) {
      logger.error(error, "Failed to query the RATP API");
      error.statusCode = 503;
      return Promise.reject(error);
    }
  },

  async queryNextStops(stationId, lineId, directionId) {
    let now = new Date().getTime();
    let response = await ratpApi.query(`cmd=getNextStopsRealtime` +
      `&stopArea=${stationId}&line=${lineId}&direction=${directionId}`,
      data => validateNextStops(data.nextStopsOnLines[0].nextStops));
    let stops = response.nextStopsOnLines[0].nextStops
      .filter((stop) => stop.bStopInStation && stop.waitingTime != null && stop.nextStopTime
        && stop.waitingTimeRaw !== "Service termine"
        && stop.waitingTimeRaw !== "Train arrete")
      .map((stop) => {
        let stopTime = new Date(stop.nextStopTime).getTime();
        let minutesUntilStop = Math.ceil((stopTime - now) / 1000 / 60);
        let message = minutesUntilStop + " min";
        if (message === "1 mins") {
          message = "1 min";
        }
        if (stop.waitingTimeRaw === "Train a l'approche"
          || stop.waitingTime === -60
          || message === "0 mins") {
          message = "< 1 min";
        }
        if (stop.waitingTimeRaw === "Train a quai"
          || stop.waitingTimeRaw === "A l'arret"
          || stop.waitingTimeRaw === "A quai") {
          message = "À quai";
        }
        if (stop.waitingTimeRaw === "Train retarde") {
          message += " +";
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
  },

  async queryIssues(query = "networkType=all&category=all") {
    let events = await ratpApi.query(`cmd=getTrafficSituation&${query}`);
    let issues = [];
    events.events
      .filter((event) => !!event.incidents)
      .forEach((event) => {
        issues = _.union(issues, event.incidents);
      }) || [];
    return issues;
  },
};

export default ratpApi;
