export default class RatpApiError extends Error {
  constructor(message = "unknown") {
    super(message);
    this.message = "The remote RATP API returned an error: " + message;
    this.name = "RatpApiError";
    this.statusCode = 500;
  }
}
