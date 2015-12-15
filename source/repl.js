let repl = require("repl");

global.log = require("./common/logs");
global.config = require("config");
global.appRoot = __dirname;
global.requireFromRoot = function (path) {
  return require(global.appRoot + "/source/" + path);
};

let replServer = repl.start({
  prompt: "ratp > ",
  useColors: true,
});

replServer.context.ratpDb = require("./ratp/database");
replServer.context.ratpApi = require("./ratp/api");
replServer.context.ratp = require("./ratp/ratp");
replServer.context.navitia = require("./navitia/navitia");
replServer.context.lodash = require("lodash");
replServer.context.print = (...args) => {
  console.log(...args, "\n");
};
