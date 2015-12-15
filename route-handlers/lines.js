let ratp = requireFromRoot("ratp/ratp");
let navitia = requireFromRoot("navitia");

export default ({ app, wrap }) => {
  app.get("/api/lines", wrap(async function (req, res) {
    let lines = await ratp.getAllLines();
    return res.json(lines);
  }));

  app.get("/api/lines/:line", wrap(async function (req, res) {
    let lineDetails = await navitia.getLineDetails(req.params.line);
    return res.json(lineDetails);
  }));
};
