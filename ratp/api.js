const TOKEN = "FvChCBnSetVgTKk324rO";
const API_HOST = "http://apixha.ixxi.net";

let needle = require("needle");

let moduleLogger = log.child({ component: "ratp/api" });

const ONE_SECOND = 1000;
const TTL = 15 * ONE_SECOND;
let cache = {};

let ratpApi = {
  query(details) {
    const url = `${API_HOST}/APIX?keyapp=${TOKEN}` +
      "&" + details +
      `&withText=true&apixFormat=json`;
    let logger = moduleLogger.child({ url });
    if (cache[url] && new Date().getTime() < cache[url].validUntil.getTime()) {
      logger.debug("Returning promise from cache");
      return cache[url].promise;
    }
    if (cache[url] && new Date().getTime() > cache[url].validUntil.getTime()) {
      logger.debug("Removing cache entry which expired");
      delete cache[url];
    }
    return new Promise((resolve, reject) => {
      needle.get(url, (error, response) => {
        if (error) {
          logger.error(error, "Failed to query the RATP API");
          return reject(error);
        }
        logger = logger.child({ response: response.body });
        let data;
        try {
          data = JSON.parse(response.body);
        } catch (err) {
          err.message = "Failed to parse response: " + err.message;
          logger.error(err, "Failed to parse response");
          return reject(err);
        }
        if (!data) {
          logger.error("No data returned from the RATP API");
          return reject(new Error("No data returned from the RATP API."));
        }
        if (data.errorMsg) {
          logger.error({ error: data.errorMsg }, "The RATP API returned an error");
          return reject(new Error("The RATP API returned an error: " + data.errorMsg));
        }
        resolve(data);
        cache[url] = {
          promise: Promise.resolve(data),
          date: new Date(),
          validUntil: new Date(new Date().getTime() + TTL),
        };
      });
    });
  },
};

export default ratpApi;
