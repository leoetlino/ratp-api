const PORT = process.env.PORT || 8800;

let fs = require("fs");
let _ = require("lodash");
let bodyParser = require("body-parser");
let express = require("express");
let app = express();
let http = require("http").createServer(app);
let cors = require("cors");
let moduleLogger = log.child({ component: "http" });

app.use(cors());
app.options("*", cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(function (req, res, next) {
  let requestId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0;
    var v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  req.log = log.child({
    "req_id": requestId,
    req: {
      method: req.method,
      url: req.url,
      ip: req.ip,
    },
  });
  next();
});

let args = { app };
let handlers = _.without(fs.readdirSync(global.appRoot + "/route-handlers"), "error-handlers.js");
for (let handler of handlers) {
  if (handler.includes(".")) {
    moduleLogger.info("Loading file: " + handler);
    try {
      require(global.appRoot + "/route-handlers/" + handler)(args);
    } catch (error) {
      moduleLogger.fatal(error, `Failed to load ${handler}.`);
      process.exit(1);
    }
    continue;
  }

  moduleLogger.info("Loading handler: " + handler);
  let subhandlers = fs.readdirSync(global.appRoot + "/route-handlers/" + handler);
  for (let subhandler of subhandlers) {
    let file = `${handler}/${subhandler}`;
    moduleLogger.info("Loading file: " + file);
    try {
      requireFromRoot(`route-handlers/${file}`)(args);
    } catch (error) {
      moduleLogger.fatal(error, `Failed to load ${file}.`);
      process.exit(1);
    }
  }
}

requireFromRoot("route-handlers/error-handlers")(args);

http.listen(PORT);
log.info({ component: "http" }, "Listening on port " + PORT);
