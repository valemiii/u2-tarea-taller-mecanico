// Error con código HTTP: los servicios lo lanzan y el errorHandler lo convierte en JSON
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = HttpError;
