const TOKEN = "FvChCBnSetVgTKk324rO";
const API_HOST = "http://apixha.ixxi.net";

let needle = require("needle");

let moduleLogger = log.child({ component: "ratp/api" });

let ratpApi = {
  query(details) {
    return new Promise((resolve, reject) => {
      let url = `${API_HOST}/APIX?keyapp=${TOKEN}` +
        "&" + details +
        `&withText=true&apixFormat=json`;
      let logger = moduleLogger.child({ url });
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
        return resolve(data);
      });
    });
  },
};

export default ratpApi;
