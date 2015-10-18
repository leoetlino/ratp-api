const TOKEN = config.get("navitia.apiToken");
const API_HOST = "https://api.navitia.io";

let co = require("co");
let promisify = require("promisify-node");
let _ = require("lodash");
let moment = require("moment");
let needle = promisify(require("needle"));
let normaliseName = requireFromRoot("normalise-name");

let Profiler = requireFromRoot("profiler");
let moduleLogger = log.child({ component: "navitia" });

const ONE_SECOND = 1000;
const ONE_MINUTE = ONE_SECOND * 60;
const TTL = 5 * ONE_MINUTE;
let cache = {};
let addToCache = (url, response) => {
  let now = new Date();
  cache[url] = {
    promise: Promise.resolve(response),
    date: now,
    validUntil: new Date(now.getTime() + TTL),
  };
};

let fixResponse = (response) => {
  if (Array.isArray(response)) {
    return response.map(item => fixResponse(item));
  }
  if (typeof response !== "object") {
    return response;
  }
  let fixedResponse = {};
  for (let key in response) {
    if (!response.hasOwnProperty(key)) {
      return;
    }
    let value = response[key];
    if (typeof value === "object") {
      value = fixResponse(value);
    }
    if (value === "False" || value === "True") {
      value = (value === "True");
    }
    let newKey = key.replace(/_([a-z])/g, g => g[1].toUpperCase());
    fixedResponse[newKey] = value;
  }
  return fixedResponse;
};

let navitia = {
  query(path) {
    const url = `${API_HOST}${path}`;
    let logger = moduleLogger.child({ url });
    if (cache[url] && new Date().getTime() < cache[url].validUntil.getTime()) {
      return cache[url].promise;
    }
    if (cache[url] && new Date().getTime() > cache[url].validUntil.getTime()) {
      delete cache[url];
    }
    moduleLogger.debug({ url }, "Querying API");
    let profiler = Profiler.start("Querying API", { url });
    return co(function* () {
      try {
        let response = yield needle.get(url, { username: TOKEN });
        logger = logger.child({ response: response.body });
        profiler.end();
        let data = fixResponse(response.body);
        if (typeof data.error === "object" && data.error.message) {
          logger.error({ error: data.error.message, errorCode: data.error.id }, "The Navitia API returned an error");
          return Promise.reject(new Error(`The Navitia API returned an error: ${data.error.message} (${data.error.id})`));
        }
        if (data.message === "no token") {
          return Promise.reject(new Error("No valid token for the Navitia API."));
        }
        if (response.statusCode === 400) {
          logger.error({ error: data.message }, "The Navitia API returned an error (bad request)");
          return Promise.reject(new Error(`The Navitia API returned an error (bad request): ${data.error.message}`));
        }
        addToCache(url, data);
        return data;
      } catch (error) {
        logger.error(error, "Failed to query the Navitia API");
        profiler.end();
        return Promise.reject(error);
      }
    });
  },

  getAllLines() {
    return co(function* () {
      return yield navitia.query("/v1/coverage/fr-idf/networks/network:RTP/lines");
    });
  },

  getRoutesForLine(lineCode) {
    return co(function* () {
      let response = yield navitia.query(`/v1/coverage/fr-idf/routes?filter=line.code=${lineCode}`);
      return response.routes;
    });
  },

  getStopsOnLine(lineCode, directionName) {
    return co(function* () {
      let response = yield navitia.query(`/v1/coverage/fr-idf/routes?filter=line.code=${lineCode}&depth=3`);
      let routes = response.routes;
      let stopPoints = routes[0].stopPoints;
      if (directionName) {
        directionName = normaliseName(directionName);
        let route = routes.find(r => normaliseName(r.direction.stopArea.name) === directionName);
        if (!route) {
          return Promise.reject(new Error(`Could not find route with direction “${directionName}”`));
        }
        stopPoints = route.stopPoints;
      }
      return stopPoints;
    });
  },

  getStopAreaId(stopName, lineCode, directionName) {
    return co(function* () {
      let stops = yield navitia.getStopsOnLine(lineCode, directionName);
      stopName = normaliseName(stopName);
      let stop = stops.find(s => normaliseName(s.name) === stopName);
      if (!stop) {
        return Promise.reject(new Error(`Could not find stop “${stopName}” on ${lineCode}, ` +
          `direction ${directionName}`));
      }
      return stop.stopArea.id;
    });
  },

  queryNextTheoreticalStops(stopAreaId, lineCode, directionName) {
    return co(function* () {
      if (directionName) {
        directionName = normaliseName(directionName);
      }
      let nowString = moment().format("YYYY-MM-DDTHH:mm");
      let response = yield navitia.query(`/v1/coverage/fr-idf/stop_areas/${stopAreaId}/stop_schedules` +
        `?depth=0&max_date_times=4&duration=3600` +
        `&filter=line.code=${lineCode}&from_datetime=${nowString}`);
      let nextStops = [];
      response.stopSchedules
        .filter(stop => stop.dateTimes[0].dateTime !== "")
        .forEach(stop => {
          stop.dateTimes.forEach(date => {
            let destination;
            let destinationLink = date.links.find(link => link.id.includes("destination:"));
            if (destinationLink) {
              let destinationNote = response.notes.find(note => note.id === destinationLink.id);
              destination = (destinationNote || {}).value;
            }
            if (!destination) {
              destination = stop.route.direction.stopArea.name;
            }

            let nextStopTime = moment(date.dateTime, "YYYYMMDDHHmmss").format();
            let vehicleJourney = (_.findWhere(date.links, { type: "vehicle_journey" }) || {}).value;

            if (directionName && normaliseName(destination) !== directionName) {
              return;
            }
            nextStops.push({
              destination,
              nextStopTime,
              vehicleJourney,
            });
          });
        });
      return nextStops;
    });
  },
};

export default navitia;
