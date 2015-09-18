let ratp = requireFromRoot("ratp/ratp");
let co = require("co");

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
      let stations = yield ratp.getAllStationsOnLine(req.params.line);
      return res.json(stations);
    }).catch(next);
  });
};
