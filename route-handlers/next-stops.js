let ratp = requireFromRoot("ratp/ratp");
let co = require("co");

export default ({ app }) => {
  app.get("/api/next-stops/line-:line/:direction/:station", function (req, res, onError) {
    if (!req.params.line || !req.params.direction || !req.params.station) {
      return onError(new Error("line, direction and station are required"));
    }
    return co(function * () {
      let lineId = yield ratp.getLineId(req.params.line);
      let stationId = yield ratp.getStationId(req.params.station);
      let directionId = yield ratp.getDirectionIdForLine(req.params.direction, req.params.line);
      let stops = yield ratp.getNextStops(stationId, lineId, directionId);
      return res.json(stops);
    }).catch(onError);
  });
};
