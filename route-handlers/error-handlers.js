export default ({app}) => {
  app.use(function notFoundHandler(req, res) {
    res.status(404);
    return res.json({
      result: "error",
      error: "Not found",
    });
  });

  app.use(function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
    req.log.error(err);
    if (err.message.includes("datasource_noresponse")) {
      return res.status(503).json({
        error: err.message,
      });
    }
    return res.status(500).json({
      error: err.message,
    });
  });
};
