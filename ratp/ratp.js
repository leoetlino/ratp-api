let co = require("co");
let _ = require("lodash");

let moduleLogger = log.child({ component: "ratp" });

let ratpApi = requireFromRoot("ratp/api");
let ratpDb = requireFromRoot("ratp/database");

let normaliseName = (name) => {
  return name.toString().toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/\-/g, "_")
    .replace(/[^\w\_]+/g, "-")
    .replace(/\_\_+/g, "_")
    .replace(/^_+/, "")
    .replace(/_+$/, "");
};

let ratp = {
  getLineId(lineCode) {
    return ratpDb.getField("SELECT _id FROM line WHERE code = ?", "_id", lineCode);
  },

  getLineCode(lineId) {
    return ratpDb.getField("SELECT code FROM line WHERE code = ?", "code", lineId);
  },

  getAllLines() {
    return ratpDb.getRows("SELECT _id as id, code, name FROM line ORDER BY length(code), code");
  },

  getStationId(stationName) {
    let normalisedName = normaliseName(stationName);
    return ratpDb.getField("SELECT _id FROM stopplace WHERE normalized_name = ?", "_id", normalisedName);
  },

  getStationName(stationId) {
    return ratpDb.getField("SELECT name FROM stopplace WHERE _id = ?", "name", stationId);
  },

  getAllStations() {
    return ratpDb.getRows("SELECT _id as id, name, normalized_name as normalisedName FROM stopplace");
  },

  getAllStationsOnLine(lineCode) {
    return ratpDb.getRows("SELECT " +
      "stopplace._id as id, stopplace.name, stopplace.normalized_name as normalisedName " +
      "FROM stopplace " +
      "INNER JOIN stoppoint on stopplace._id = stoppoint.stoparea_id " +
      "WHERE stoppoint.line_id = (SELECT _id FROM line WHERE line.code = ?) " +
      "ORDER BY y, x ASC",
      lineCode);
  },

  getDirectionId(directionName) {
    let normalisedName = normaliseName(directionName);
    return ratpDb.getField("SELECT _id FROM direction WHERE normalized_name = ?", "_id", normalisedName);
  },

  getDirectionName(directionId) {
    return ratpDb.getField("SELECT name FROM direction WHERE _id = ?", "name", directionId);
  },

  getDirectionIdForLine(directionName, lineCode) {
    let normalisedName = normaliseName(directionName);
    return ratpDb.getField(
      "SELECT _id FROM direction WHERE normalized_name = ? " +
      "AND line_id = (SELECT _id FROM line WHERE line.code = ?)",
      "_id",
      normalisedName, lineCode);
  },

  getDirectionsForLine(lineCode) {
    return ratpDb.getRows("SELECT _id as id, name, normalized_name as normalisedName FROM direction " +
      "WHERE line_id = (SELECT _id FROM line WHERE line.code = ?)",
      lineCode);
  },

  getNextStops(stationId, lineId, directionId) {
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

  getIssuesForAll() {
    return co(function* () {
      let events = yield ratpApi.query(`cmd=getTrafficSituation` +
        `&networkType=all&category=all`);
      let issues = [];
      events.events
        .filter((event) => !!event.incidents)
        .forEach((event) => {
          issues = _.union(issues, event.incidents);
        }) || [];
      return issues;
    });
  },

  getIssuesForMetro() {
    return co(function* () {
      let events = yield ratpApi.query(`cmd=getTrafficSituation` +
        `&networkType=groupoflines&network=1`);
      let issues = [];
      events.events
        .filter((event) => !!event.incidents)
        .forEach((event) => {
          issues = _.union(issues, event.incidents);
        }) || [];
      return issues;
    });
  },

  getIssuesForLine(lineCode) {
    return co(function* () {
      let issues = yield ratp.getIssuesForMetro();
      let relevantIssues = issues
        .filter((issue) => {
          let concernsLine = false;
          if (!issue.lines) {
            return false;
          }
          issue.lines.forEach((line) => {
            if (line.name === lineCode) {
              concernsLine = true;
            }
          });
          return concernsLine;
        }) || [];
      return relevantIssues;
    });
  },
};

export default ratp;
