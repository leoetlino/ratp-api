let ratpApi = requireFromRoot("ratp/api");
let ratpDb = requireFromRoot("ratp/database");
let normaliseName = requireFromRoot("common/normalise-name");

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
    return ratpDb.getField("SELECT _id FROM stoparea WHERE name_normalized = ?", "_id", normalisedName);
  },

  getStationName(stationId) {
    return ratpDb.getField("SELECT name FROM stoparea WHERE _id = ?", "name", stationId);
  },

  getAllStations() {
    return ratpDb.getRows("SELECT _id as id, name, name_normalized as normalisedName FROM stoparea");
  },

  getAllStationsOnLine(lineCode) {
    return ratpDb.getRows("SELECT " +
      "stoparea._id as id, stoparea.name, stoparea.name_normalized as normalisedName " +
      "FROM stoparea " +
      "INNER JOIN stoppoint_in_direction on stoparea._id = stoppoint_in_direction.stoparea_id " +
      "WHERE stoppoint_in_direction.line_id = (SELECT _id FROM line WHERE line.code = ?) " +
      "ORDER BY y, x ASC",
      lineCode);
  },

  getDirectionId(directionName) {
    let normalisedName = normaliseName(directionName);
    return ratpDb.getField("SELECT _id FROM direction WHERE name_normalized = ?", "_id", normalisedName);
  },

  getDirectionName(directionId) {
    return ratpDb.getField("SELECT name FROM direction WHERE _id = ?", "name", directionId);
  },

  getDirectionIdForLine(directionName, lineCode) {
    let normalisedName = normaliseName(directionName);
    return ratpDb.getField(
      "SELECT _id FROM direction WHERE name_normalized = ? " +
      "AND line_id = (SELECT _id FROM line WHERE line.code = ?)",
      "_id",
      normalisedName, lineCode);
  },

  getDirectionsForLine(lineCode) {
    return ratpDb.getRows("SELECT _id as id, name, name_normalized as normalisedName FROM direction " +
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

  async getIssuesForLine(lineCode) {
    let issues = await ratp.getIssuesForMetro();
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
  },
};

export default ratp;
