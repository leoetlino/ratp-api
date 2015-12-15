import BadRequestError from "~/common/errors/BadRequestError";

let ratp = requireFromRoot("ratp/ratp");
let navitia = requireFromRoot("navitia/navitia");

export default ({ app, wrap }) => {
  app.get("/api/next-stops/line-:line/:direction/:station", wrap(async function (req, res) {
    if (!req.params.line || !req.params.direction || !req.params.station) {
      throw new BadRequestError("line, direction and station are required");
    }
    let lineId = await ratp.getLineId(req.params.line);
    let stationId = await ratp.getStationId(req.params.station);
    let directionId = await ratp.getDirectionIdForLine(req.params.direction, req.params.line);
    let stops = await ratp.getNextStops(stationId, lineId, directionId);
    return res.json(stops);
  }));

  app.get("/api/next-theoretical-stops/line-:line/:direction/:station", wrap(async function (req, res) {
    if (!req.params.line || !req.params.direction || !req.params.station) {
      throw new BadRequestError("line, direction and station are required");
    }
    let stopAreaId = await navitia.getStopAreaId(req.params.station, req.params.line, req.params.direction);
    let stops = await navitia.queryNextTheoreticalStops(stopAreaId, req.params.line, req.params.direction);
    return res.json(stops);
  }));
};
