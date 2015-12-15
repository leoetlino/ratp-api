let ratp = requireFromRoot("ratp/ratp");
let navitia = requireFromRoot("navitia");

export default ({ app, wrap }) => {
  app.get("/api/directions/line-:line", wrap(async function (req, res) {
    if (!req.params.line) {
      throw new Error("line is required");
    }
    let directions = await ratp.getDirectionsForLine(req.params.line);
    return res.json(directions);
  }));

  app.get("/api/routes/line-:line", wrap(async function (req, res) {
    if (!req.params.line) {
      throw new Error("line is required");
    }
    let routes = await navitia.getRoutesForLine(req.params.line);
    return res.json(routes);
  }));
};
