export default class DatabaseNoResultError extends Error {
  constructor(message = "unknown") {
    super(message);
    this.message = "No result in the database: " + message;
    this.name = "DatabaseNoResultError";
    this.statusCode = 404;
  }
}
