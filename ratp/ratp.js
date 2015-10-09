let co = require("co");
let _ = require("lodash");

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
    return ratpApi.queryNextStops(stationId, lineId, directionId);
  },

  getIssuesForAll() {
    return ratpApi.queryIssues();
  },

  getIssuesForMetro() {
    return ratpApi.queryIssues("networkType=groupoflines&network=1");
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
