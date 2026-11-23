// Registra cada petición al terminar: método, ruta, estado y duración
module.exports = (req, res, next) => {
  const inicio = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)} ms`);
  });
  next();
};
