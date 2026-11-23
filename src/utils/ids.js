const mongoose = require("mongoose");
const HttpError = require("./httpError");

// isValidObjectId también acepta cualquier texto de 12 caracteres; aquí exigimos los 24 hexadecimales.
const esObjectId = (valor) =>
  typeof valor === "string" && /^[0-9a-fA-F]{24}$/.test(valor) && mongoose.isValidObjectId(valor);

// Id numérico de PostgreSQL (SERIAL) que viene como texto en la URL
const aEnteroPositivo = (valor, nombre) => {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, `${nombre} debe ser un entero positivo`);
  return n;
};

module.exports = { esObjectId, aEnteroPositivo };
