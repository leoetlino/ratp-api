export default class BadRequestError extends Error {
  constructor(message = "unknown") {
    super(message);
    this.message = "Request was invalid: " + message;
    this.name = "BadRequestError";
    this.statusCode = 400;
  }
}
