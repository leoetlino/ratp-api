let sqlite3 = require("sqlite3");
let database = new sqlite3.Database(global.appRoot + "/ratp.db", sqlite3.OPEN_READONLY, (err) => {
  if (!err) {
    return;
  }
  throw new Error(`Failed to open the database (is it at ${global.appRoot}/ratp.db?)`);
});

let moduleLogger = log.child({ component: "ratp/db" });

let ratpDb = {
  /**
   * Get a row field that matchs the query from the database
   * @param  {String}    query      SQL query
   * @param  {String}    field      Field to get
   * @return {Promise}
   */
  getField(query, field, ...parameters) {
    return new Promise((resolve, reject) => {
      database.get(query, ...parameters, (err, row) => {
        if (err) {
          return reject(err);
        }
        if (!row) {
          moduleLogger.warn({ query, parameters }, "No result in the database");
          return reject(new Error("No result in the database"));
        }
        if (!row[field]) {
          moduleLogger.warn({ query, field, parameters }, "No such field in the result row");
          return reject(new Error("No result in the database: no such row field"));
        }
        resolve(row[field]);
      });
    });
  },

  /**
   * Get a row that matchs the query from the database
   * @param  {String}    query      SQL query
   * @return {Promise}
   */
  getRow(query, ...parameters) {
    return new Promise((resolve, reject) => {
      database.get(query, ...parameters, (err, row) => {
        if (err) {
          return reject(err);
        }
        if (!row) {
          moduleLogger.warn({ query, parameters }, "No result in the database");
          return reject(new Error("No result in the database"));
        }
        resolve(row);
      });
    });
  },

  /**
   * Get rows that match the query from the database
   * @param  {String}    query      SQL query
   * @return {Promise}
   */
  getRows(query, ...parameters) {
    return new Promise((resolve, reject) => {
      database.all(query, ...parameters, (err, rows) => {
        if (err) {
          return reject(err);
        }
        if (!rows.length) {
          moduleLogger.warn({ query, parameters }, "No result in the database");
          return reject(new Error("No result in the database"));
        }
        resolve(rows);
      });
    });
  },
};

export default ratpDb;
