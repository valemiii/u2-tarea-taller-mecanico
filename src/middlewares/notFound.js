const HttpError = require("../utils/httpError");

module.exports = (req, res, next) => next(new HttpError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
