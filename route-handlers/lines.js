let navitia = requireFromRoot("navitia");
let co = require("co");

export default ({ app }) => {
  app.get("/api/lines", function (req, res, next) {
    return co(function * () {
      let lines = yield navitia.getAllLines();
      return res.json(lines);
    }).catch(next);
  });

  app.get("/api/lines/:line", function (req, res, next) {
    if (!req.params.line) {
      return next(new Error("line is required"));
    }
    return co(function * () {
      let line = yield navitia.getLineDetails(req.params.line, req.query.depth);
      return res.json(line);
    }).catch(next);
  });
};
