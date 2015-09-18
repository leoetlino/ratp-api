let ratp = requireFromRoot("ratp/ratp");
let co = require("co");

export default ({ app }) => {
  app.get(["/api/issues", "/api/issues/all"], function (req, res, next) {
    return co(function * () {
      let issues = yield ratp.getIssuesForAll();
      return res.json(issues);
    }).catch(next);
  });

  app.get("/api/issues/metro", function (req, res, next) {
    return co(function * () {
      let issues = yield ratp.getIssuesForMetro();
      return res.json(issues);
    }).catch(next);
  });

  app.get("/api/issues/line-:line", function (req, res, next) {
    if (!req.params.line) {
      return next(new Error("line is required"));
    }
    return co(function * () {
      let issues = yield ratp.getIssuesForLine(req.params.line);
      return res.json(issues);
    }).catch(next);
  });
};
