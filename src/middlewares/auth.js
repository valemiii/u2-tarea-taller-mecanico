const jwt = require("jsonwebtoken");
const HttpError = require("../utils/httpError");

// Verifica Authorization: Bearer <token> y deja el payload en req.user ({ id })
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return next(new HttpError(401, "Acceso denegado: falta el token"));
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new HttpError(401, "Token inválido o expirado"));
  }
};

module.exports = { authenticateToken };
