let ratp = requireFromRoot("ratp/ratp");
let co = require("co");

export default ({ app }) => {
  app.get("/api/lines", function (req, res, next) {
    return co(function * () {
      let lines = yield ratp.getAllLines();
      return res.json(lines);
    }).catch(next);
  });
};
