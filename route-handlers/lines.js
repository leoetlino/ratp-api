let ratp = requireFromRoot("ratp/ratp");
let navitia = requireFromRoot("navitia");
let co = require("co");

export default ({ app }) => {
  app.get("/api/lines", function (req, res, next) {
    return co(function * () {
      let lines = yield ratp.getAllLines();
      return res.json(lines);
    }).catch(next);
  });

  app.get("/api/lines/:line", function (req, res, next) {
    return co(function * () {
      let lineDetails = yield navitia.getLineDetails(req.params.line);
      return res.json(lineDetails);
    }).catch(next);
  });
};
