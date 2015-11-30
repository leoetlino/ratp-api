let ratp = requireFromRoot("ratp/ratp");
let navitia = requireFromRoot("navitia");
let co = require("co");

let simplifyStopResponse = ({ coord, id, name } = {}) => ({ coord, id, name });

export default ({ app }) => {
  app.get("/api/stations", function (req, res, next) {
    return co(function * () {
      let stations = yield ratp.getAllStations();
      return res.json(stations);
    }).catch(next);
  });

  app.get("/api/stations/line-:line", function (req, res, next) {
    if (!req.params.line) {
      return next(new Error("line is required"));
    }
    return co(function * () {
      res.json(yield ratp.getAllStationsOnLine(req.params.line));
    }).catch(next);
  });

  app.get("/api/stations/line-:line/:direction", function (req, res, next) {
    if (!req.params.line || !req.params.direction) {
      return next(new Error("line and direction are required"));
    }
    return co(function * () {
      let stations = yield navitia.getStopsOnLine(req.params.line, req.params.direction);
      // The response contains way too much information than needed.
      stations = stations.map(simplifyStopResponse);
      return res.json(stations);
    }).catch(next);
  });
};
