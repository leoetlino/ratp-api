let ratp = requireFromRoot("ratp/ratp");
let navitia = requireFromRoot("navitia");
let co = require("co");

export default ({ app }) => {
  app.get("/api/directions/line-:line", function (req, res, next) {
    if (!req.params.line) {
      return next(new Error("line is required"));
    }
    return co(function * () {
      let directions = yield ratp.getDirectionsForLine(req.params.line);
      return res.json(directions);
    }).catch(next);
  });

  app.get("/api/routes/line-:line", function (req, res, next) {
    if (!req.params.line) {
      return next(new Error("line is required"));
    }
    return co(function * () {
      let routes = yield navitia.getRoutesForLine(req.params.line);
      return res.json(routes);
    }).catch(next);
  });
};
