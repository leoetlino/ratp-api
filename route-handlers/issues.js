let ratp = requireFromRoot("ratp/ratp");

export default ({ app, wrap }) => {
  app.get(["/api/issues", "/api/issues/all"], wrap(async function (req, res) {
    let issues = await ratp.getIssuesForAll();
    return res.json(issues);
  }));

  app.get("/api/issues/metro", wrap(async function (req, res) {
    let issues = await ratp.getIssuesForMetro();
    return res.json(issues);
  }));

  app.get("/api/issues/line-:line", wrap(async function (req, res) {
    if (!req.params.line) {
      throw new Error("line is required");
    }
    let issues = await ratp.getIssuesForLine(req.params.line);
    return res.json(issues);
  }));
};
