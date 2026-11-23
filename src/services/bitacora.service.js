// SERVICIO de bitácora (MongoDB) que valida contra PostgreSQL.
const Bitacora = require("../models/bitacora");
const HttpError = require("../utils/httpError");
const { aEnteroPositivo, esObjectId } = require("../utils/ids");
const { cargarOrdenPropia } = require("./orden.service");

const CAMPOS_EDITABLES = ["descripcion", "kilometraje", "trabajos", "costo", "fecha", "visita"];
const ORDENES_PERMITIDOS = ["visita", "-visita", "fecha", "-fecha", "costo", "-costo"];

// ── Crear en MongoDB validando PostgreSQL ────────────────────────────────────
const crear = async (userId, ordenIdTexto, cuerpo = {}) => {
  const ordenId = aEnteroPositivo(ordenIdTexto, "ordenId");

  // La orden debe existir (404) y ser del usuario del token (403)
  const orden = await cargarOrdenPropia(ordenId, userId);
  if (["ENTREGADA", "CANCELADA"].includes(orden.estado)) {
    throw new HttpError(409, `La orden está ${orden.estado} y ya no admite entradas de bitácora`);
  }

  const datos = Object.fromEntries(CAMPOS_EDITABLES.filter((c) => cuerpo[c] !== undefined).map((c) => [c, cuerpo[c]]));
  // Si el cliente no manda la visita, es la siguiente a la última registrada
  if (datos.visita === undefined) {
    const ultima = await Bitacora.findOne({ ordenId }).sort({ visita: -1 }).select("visita").lean();
    datos.visita = (ultima?.visita ?? 0) + 1;
  }

  return Bitacora.create({
    ...datos,
    ordenId,
    userId, // del JWT, nunca del cuerpo
    placa: orden.placa, // dato copiado de PostgreSQL (desnormalización)
    servicio: esObjectId(orden.servicioId) ? orden.servicioId : undefined,
  }); // 400 por ValidationError; 409 por E11000 (visita repetida en la orden)
};

// ── Lista con populate + orden + aggregate ───────────────────────────────────
const listar = async (userId, ordenIdTexto, { sort = "-visita" } = {}) => {
  const ordenId = aEnteroPositivo(ordenIdTexto, "ordenId");
  await cargarOrdenPropia(ordenId, userId);
  if (!ORDENES_PERMITIDOS.includes(sort)) throw new HttpError(400, `sort debe ser uno de: ${ORDENES_PERMITIDOS.join(", ")}`);

  const [entradas, [resumen]] = await Promise.all([
    Bitacora.find({ ordenId }).sort(sort).populate("servicio", "codigo nombre categoria"),
    Bitacora.aggregate([
      { $match: { ordenId } }, // aggregate no convierte tipos: ordenId ya es Number
      {
        $group: {
          _id: "$ordenId",
          visitas: { $sum: 1 },
          costoTotal: { $sum: "$costo" },
          costoPromedio: { $avg: "$costo" },
          kilometrajeMaximo: { $max: "$kilometraje" },
        },
      },
      { $project: { _id: 0, visitas: 1, costoTotal: 1, costoPromedio: { $round: ["$costoPromedio", 2] }, kilometrajeMaximo: 1 } },
    ]),
  ]);
  return {
    ordenId,
    resumen: resumen ?? { visitas: 0, costoTotal: 0, costoPromedio: 0, kilometrajeMaximo: null },
    data: entradas,
  };
};

module.exports = { crear, listar };
