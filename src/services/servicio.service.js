// SERVICIO del catálogo (MongoDB). Aquí viven las reglas; el controlador solo traduce HTTP.
const Servicio = require("../models/servicio");
const Bitacora = require("../models/bitacora");
const prisma = require("../db/prisma");
const HttpError = require("../utils/httpError");
const { esObjectId } = require("../utils/ids");

// Campos que el cliente puede enviar (lista blanca: no se acepta _id, timestamps, etc.)
const CAMPOS_EDITABLES = ["codigo", "nombre", "categoria", "descripcion", "manoObra", "tiempoEstimadoMin", "repuestos", "activo"];
const CAMPOS_PROYECTABLES = [...CAMPOS_EDITABLES, "createdAt", "updatedAt"];
const ORDENES_PERMITIDOS = ["nombre", "-nombre", "manoObra", "-manoObra", "tiempoEstimadoMin", "-tiempoEstimadoMin", "createdAt", "-createdAt"];

const soloEditables = (cuerpo) => {
  const origen = cuerpo && typeof cuerpo === "object" && !Array.isArray(cuerpo) ? cuerpo : {};
  return Object.fromEntries(CAMPOS_EDITABLES.filter((c) => origen[c] !== undefined).map((c) => [c, origen[c]]));
};

const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const validarId = (id) => {
  if (!esObjectId(id)) throw new HttpError(400, "El id del servicio no es válido");
};

const crear = async (cuerpo) => Servicio.create(soloEditables(cuerpo)); // 400 por ValidationError, 409 por E11000

// GET /api/servicios?q=&categoria=&activo=&fields=&sort=&page=&limit=
const listar = async ({ q, categoria, activo, fields, sort = "nombre", page = 1, limit = 20 } = {}) => {
  const filtro = {};
  if (q) {
    const regex = new RegExp(escaparRegex(String(q)), "i"); // búsqueda parcial sin distinguir mayúsculas
    filtro.$or = [{ nombre: regex }, { codigo: regex }];
  }
  if (categoria) filtro.categoria = String(categoria);
  if (activo !== undefined) filtro.activo = String(activo) === "true";

  if (!ORDENES_PERMITIDOS.includes(sort)) {
    throw new HttpError(400, `sort debe ser uno de: ${ORDENES_PERMITIDOS.join(", ")}`);
  }
  const pagina = Math.max(parseInt(page, 10) || 1, 1);
  const limite = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  let consulta = Servicio.find(filtro).sort(sort).skip((pagina - 1) * limite).limit(limite);
  if (fields) {
    // Proyección: ?fields=nombre,codigo. Con proyección se devuelve lean (sin virtuales, que dependen de otros campos)
    const pedidos = String(fields).split(",").map((c) => c.trim()).filter(Boolean);
    const invalidos = pedidos.filter((c) => !CAMPOS_PROYECTABLES.includes(c));
    if (invalidos.length) throw new HttpError(400, `Campos no permitidos en fields: ${invalidos.join(", ")}`);
    consulta = consulta.select(pedidos.join(" ")).lean();
  }
  const [datos, total] = await Promise.all([consulta, Servicio.countDocuments(filtro)]);
  return { total, page: pagina, limit: limite, data: datos };
};

const obtener = async (id) => {
  validarId(id);
  const servicio = await Servicio.findById(id);
  if (!servicio) throw new HttpError(404, "Servicio no encontrado");
  return servicio;
};

// PUT: findById + set + save() → así corren las validaciones y el pre("validate") de todo el documento
const actualizar = async (id, cuerpo) => {
  validarId(id);
  const servicio = await Servicio.findById(id);
  if (!servicio) throw new HttpError(404, "Servicio no encontrado");
  servicio.set(soloEditables(cuerpo));
  return servicio.save();
};

// Borrado protegido: PostgreSQL decide si el servicio está en uso
const eliminar = async (id) => {
  validarId(id);
  const servicio = await Servicio.findById(id).select("_id");
  if (!servicio) throw new HttpError(404, "Servicio no encontrado");

  const ordenesQueLoUsan = await prisma.ordenServicio.count({ where: { servicioId: id } });
  if (ordenesQueLoUsan > 0) {
    throw new HttpError(409, `No se puede eliminar: ${ordenesQueLoUsan} orden(es) de servicio usan este servicio`);
  }
  // Cascada en MongoDB: primero sus bitácoras (huérfanas, pues ya no hay órdenes), luego el servicio
  const { deletedCount } = await Bitacora.deleteMany({ servicio: servicio._id });
  await Servicio.deleteOne({ _id: servicio._id });
  return { mensaje: "Servicio eliminado", bitacorasEliminadas: deletedCount };
};

module.exports = { crear, listar, obtener, actualizar, eliminar };
