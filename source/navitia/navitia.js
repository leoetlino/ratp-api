const TOKEN = config.get("navitia.apiToken");
const API_HOST = "https://api.navitia.io";

let promisify = require("promisify-node");
let _ = require("lodash");
let moment = require("moment");
let needle = promisify(require("needle"));
let normaliseName = requireFromRoot("common/normalise-name");

let Profiler = requireFromRoot("common/profiler");
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

let getAllLinesOnNetwork = async function (networkId, depth = 0) {
  let response = await navitia.query(`/v1/coverage/fr-idf/networks/network:${networkId}/lines` +
    `?depth=${depth}&count=1000`);
  return response.lines;
};

let getLineDetails = async function (networkId, lineCode, depth = 1) {
  let response = await navitia.query(`/v1/coverage/fr-idf/networks/network:${networkId}/lines` +
    `?depth=${depth}&filter=line.code=${lineCode}`);
  return response.lines[0];
};

let navitia = {
  async query(path) {
    const url = `${API_HOST}${path}`;
    let logger = moduleLogger.child({ url });
    logger.debug("Querying API");
    if (cache[url] && new Date().getTime() < cache[url].validUntil.getTime()) {
      logger.trace("Returning cached results");
      return cache[url].promise;
    }
    if (cache[url] && new Date().getTime() > cache[url].validUntil.getTime()) {
      delete cache[url];
    }
    let profiler = Profiler.start("Querying API", { url });
    try {
      let response = await needle.get(url, { username: TOKEN });
      logger = logger.child({ response: response.body });
      profiler.end();
      let data = fixResponse(response.body);
      if (typeof data.error === "object" && data.error.message) {
        logger.error({ error: data.error.message, errorCode: data.error.id }, "The Navitia API returned an error");
        let error = new Error(`The Navitia API returned an error: ${data.error.message} (${data.error.id})`);
        if (data.error.id === "bad_filter") {
          error.statusCode = 404;
        }
        return Promise.reject(error);
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
  },

  async getAllLines(depth = 0) {
    let busLines = await getAllLinesOnNetwork("RTP", depth);
    let metroLines = await getAllLinesOnNetwork("OIF:439", depth);
    let tramwayLines = await getAllLinesOnNetwork("OIF:440", depth);
    let rerLines = await getAllLinesOnNetwork("RER", depth);
    return [].concat(busLines, metroLines, tramwayLines, rerLines);
  },

  getLineDetails(lineCode, depth = 1) {
    return getLineDetails("RTP", lineCode, depth)
      .then(null, () => getLineDetails("OIF:439", lineCode, depth))
      .then(null, () => getLineDetails("OIF:440", lineCode, depth))
      .then(null, () => getLineDetails("RER", lineCode, depth));
  },

  async getRoutesForLine(lineCode) {
    let response = await navitia.getLineDetails(lineCode);
    return response.routes;
  },

  async getStopsOnLine(lineCode, directionName) {
    let routes = await navitia.getRoutesForLine(lineCode);
    directionName = normaliseName(directionName);
    let route = routes.find(r => normaliseName(r.direction.stopArea.name) === directionName);
    // Special case for saint-lazare which got renamed to gare-st-lazare
    // Yes, it is not ideal to hard code it.
    // TODO: Maybe implement these name change fixes by using a synonym list?
    if (!route && directionName === "saint_lazare") {
      route = routes.find(r => normaliseName(r.direction.stopArea.name) === "gare_st_lazare");
    }
    if (!route) {
      return Promise.reject(new Error(`Could not find route with direction “${directionName}”`));
    }
    let response = await navitia.query(`/v1/coverage/fr-idf/routes/${route.id}?depth=3`);
    return response.routes[0].stopPoints;
  },

  async getStopAreaId(stopName, lineCode, directionName) {
    let stops = await navitia.getStopsOnLine(lineCode, directionName);
    stopName = normaliseName(stopName);
    let stop = stops.find(s => normaliseName(s.name) === stopName);
    if (!stop) {
      return Promise.reject(new Error(`Could not find stop “${stopName}” on ${lineCode}, ` +
        `direction ${directionName}`));
    }
    return stop.stopArea.id;
  },

  async queryNextTheoreticalStops(stopAreaId, lineCode, directionName) {
    if (directionName) {
      directionName = normaliseName(directionName);
    }
    let nowString = moment().format("YYYY-MM-DDTHH:mm");
    let response = await navitia.query(`/v1/coverage/fr-idf/stop_areas/${stopAreaId}/stop_schedules` +
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
            var destinationNote = response.notes.find(note => note.id === destinationLink.id);
            destination = (destinationNote || {}).value;
          }
          if (!destination) {
            destination = stop.route.direction.stopArea.name;
          }

          let nextStopTime = moment(date.dateTime, "YYYYMMDDHHmmss").format();
          let vehicleJourney = (_.findWhere(date.links, { type: "vehicle_journey" }) || {}).value;

          if (!destinationNote && directionName && normaliseName(destination) !== directionName) {
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
  },
};

export default navitia;
