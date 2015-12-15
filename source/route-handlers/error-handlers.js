export default ({app}) => {
  app.use(function notFoundHandler(req, res) {
    return res.status(404).json({
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
    return res.status(err.statusCode || 500).json({
      error: err.message || "Unknown error",
    });
  });
};
