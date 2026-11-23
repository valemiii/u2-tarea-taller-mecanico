// Express 4 no captura los errores de funciones async: esto los envía a next() (errorHandler)
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
