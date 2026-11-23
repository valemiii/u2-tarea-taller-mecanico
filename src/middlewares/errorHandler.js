// Manejador de errores central (4 parámetros). Siempre responde JSON.
// Traduce los errores de las DOS bases a códigos HTTP:
//   Mongoose ValidationError → 400 · CastError → 400 · E11000 (índice único) → 409 · MongoDB caído → 503
//   Prisma P2002 → 409 · P2003 → 409 · P2025 → 404 · PostgreSQL caído → 503

const ERRORES_MONGO_CAIDO = ["MongooseServerSelectionError", "MongoServerSelectionError", "MongoNetworkError", "MongoNotConnectedError"];
const CODIGOS_PRISMA_CAIDO = ["P1001", "P1002", "P1008", "P1017"];

const mongoCaido = (err) => ERRORES_MONGO_CAIDO.includes(err.name) || /buffering timed out|before initial connection/i.test(err.message || "");
const postgresCaido = (err) => err.name === "PrismaClientInitializationError" || CODIGOS_PRISMA_CAIDO.includes(err.code);

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err.name === "ValidationError" && err.errors) {
    return res.status(400).json({
      error: "Error de validación",
      detalles: Object.values(err.errors).map((e) => ({ campo: e.path, mensaje: e.message })),
    });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ error: `Valor inválido para ${err.path}` });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "El cuerpo de la solicitud contiene JSON mal formado" });
  }
  // MongoDB: índice único violado (el código de MongoDB es un número, el de Prisma es texto)
  if (err.code === 11000) {
    const campos = Object.keys(err.keyPattern || {});
    const detalle = campos.includes("ordenId") && campos.includes("visita")
      ? "Ya existe una entrada de bitácora con esa visita para la orden"
      : `Ya existe un registro con ese valor${campos.length ? ` de ${campos.join(", ")}` : ""}`;
    return res.status(409).json({ error: detalle });
  }
  if (err.code === "P2002") return res.status(409).json({ error: "Ya existe un registro con ese valor" });
  if (err.code === "P2003") return res.status(409).json({ error: "No se puede completar: el registro está relacionado con otros datos" });
  if (err.code === "P2025") return res.status(404).json({ error: "Registro no encontrado" });

  if (mongoCaido(err)) return res.status(503).json({ error: "MongoDB no está disponible en este momento; no se guardó ningún cambio" });
  if (postgresCaido(err)) return res.status(503).json({ error: "PostgreSQL no está disponible en este momento; no se guardó ningún cambio" });

  const status = Number(err.status) >= 400 && Number(err.status) < 600 ? Number(err.status) : 500;
  const payload = { error: status === 500 ? "Error interno del servidor" : err.message };
  if (status === 500) {
    console.error(err);
    if (process.env.NODE_ENV !== "production") payload.stack = err.stack;
  }
  res.status(status).json(payload);
};

module.exports = errorHandler;
