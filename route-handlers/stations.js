let ratp = requireFromRoot("ratp/ratp");
let navitia = requireFromRoot("navitia");

let simplifyStopResponse = ({ coord, id, name } = {}) => ({ coord, id, name });

export default ({ app, wrap }) => {
  app.get("/api/stations", wrap(async function (req, res) {
    let stations = await ratp.getAllStations();
    return res.json(stations);
  }));

  app.get("/api/stations/line-:line", wrap(async function (req, res) {
    if (!req.params.line) {
      throw new Error("line is required");
    }
    return res.json(await ratp.getAllStationsOnLine(req.params.line));
  }));

  app.get("/api/stations/line-:line/:direction", wrap(async function (req, res) {
    if (!req.params.line || !req.params.direction) {
      throw new Error("line and direction are required");
    }
    let stations = await navitia.getStopsOnLine(req.params.line, req.params.direction);
    // The response contains way too much information than needed.
    stations = stations.map(simplifyStopResponse);
    return res.json(stations);
  }));
};
