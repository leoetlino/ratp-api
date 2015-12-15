export default class BogusRatpApiResponseError extends Error {
  constructor(message = "unknown") {
    super(message);
    this.message = "The remote RATP API returned bogus data: " + message;
    this.name = "BogusRatpApiResponseError";
    this.statusCode = 500;
  }
}
