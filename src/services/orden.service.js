// SERVICIO de órdenes de servicio (PostgreSQL) que valida y une datos de MongoDB.
const prisma = require("../db/prisma");
const Servicio = require("../models/servicio");
const Bitacora = require("../models/bitacora");
const HttpError = require("../utils/httpError");
const { esObjectId, aEnteroPositivo } = require("../utils/ids");

const ESTADOS = ["RECIBIDA", "EN_DIAGNOSTICO", "EN_REPARACION", "LISTA", "ENTREGADA", "CANCELADA"];
// Transiciones permitidas: una orden solo avanza (o se cancela) desde su estado actual
const TRANSICIONES = {
  RECIBIDA: ["EN_DIAGNOSTICO", "CANCELADA"],
  EN_DIAGNOSTICO: ["EN_REPARACION", "CANCELADA"],
  EN_REPARACION: ["LISTA", "CANCELADA"],
  LISTA: ["ENTREGADA"],
  ENTREGADA: [],
  CANCELADA: [],
};
const PLACA_REGEX = /^[A-Z]{3}-\d{3,4}$/;
const CAMPOS_SERVICIO_EN_ORDEN = "codigo nombre categoria tiempoEstimadoMin manoObra";

const texto = (valor, nombre, max) => {
  if (typeof valor !== "string" || !valor.trim()) throw new HttpError(400, `${nombre} es obligatorio`);
  if (valor.trim().length > max) throw new HttpError(400, `${nombre} no puede superar ${max} caracteres`);
  return valor.trim();
};

// Carga una orden y comprueba que sea del usuario del token (404 si no existe, 403 si es de otro)
const cargarOrdenPropia = async (ordenId, userId) => {
  const orden = await prisma.ordenServicio.findUnique({ where: { id: ordenId } });
  if (!orden) throw new HttpError(404, "La orden de servicio no existe");
  if (orden.userId !== userId) throw new HttpError(403, "La orden de servicio pertenece a otro usuario");
  return orden;
};

// ── Crear en PostgreSQL validando MongoDB ────────────────────────────────────
const crear = async (userId, cuerpo = {}) => {
  const placa = texto(cuerpo.placa, "placa", 10).toUpperCase();
  if (!PLACA_REGEX.test(placa)) throw new HttpError(400, "placa debe tener el formato ABC-123 o ABC-1234");
  const marca = texto(cuerpo.marca, "marca", 40);
  const modelo = texto(cuerpo.modelo, "modelo", 40);
  let anio = null;
  if (cuerpo.anio !== undefined && cuerpo.anio !== null) {
    anio = Number(cuerpo.anio);
    if (!Number.isInteger(anio) || anio < 1950 || anio > new Date().getFullYear() + 1) throw new HttpError(400, "anio no es un año válido");
  }
  const observaciones = cuerpo.observaciones ? texto(cuerpo.observaciones, "observaciones", 300) : null;

  // 1) El _id del catálogo debe ser un ObjectId válido y existir en MongoDB (PostgreSQL no puede verificarlo con una FK)
  const { servicioId } = cuerpo;
  if (!esObjectId(servicioId)) throw new HttpError(400, "servicioId debe ser un ObjectId válido de 24 caracteres hexadecimales");
  const servicio = await Servicio.findById(servicioId).select("activo").lean();
  if (!servicio) throw new HttpError(404, "El servicio indicado en servicioId no existe");
  if (!servicio.activo) throw new HttpError(409, "El servicio indicado ya no está disponible");

  // 2) Recién entonces se escribe en PostgreSQL; el userId sale del JWT, nunca del cuerpo
  return prisma.ordenServicio.create({
    data: { userId, servicioId, placa, marca, modelo, anio, observaciones },
  });
};

// ── Consulta unida: PostgreSQL + MongoDB con $in + Map (2 consultas, sin N+1) ─
const unirConServicios = async (ordenes) => {
  const ids = [...new Set(ordenes.map((o) => o.servicioId).filter(Boolean))];
  const servicios = ids.length ? await Servicio.find({ _id: { $in: ids } }).select(CAMPOS_SERVICIO_EN_ORDEN).lean() : [];
  const porId = new Map(servicios.map((s) => [String(s._id), s]));
  return ordenes.map((o) => ({ ...o, servicio: porId.get(o.servicioId) ?? null }));
};

const listarMias = async (userId, { estado } = {}) => {
  if (estado !== undefined && !ESTADOS.includes(estado)) throw new HttpError(400, `estado debe ser uno de: ${ESTADOS.join(", ")}`);
  const ordenes = await prisma.ordenServicio.findMany({
    where: { userId, ...(estado ? { estado } : {}) },
    orderBy: { createdAt: "desc" },
  });
  return unirConServicios(ordenes);
};

const obtener = async (userId, idTexto) => {
  const orden = await cargarOrdenPropia(aEnteroPositivo(idTexto, "id"), userId);
  const [unida] = await unirConServicios([orden]);
  return unida;
};

const cambiarEstado = async (userId, idTexto, estado) => {
  if (!ESTADOS.includes(estado)) throw new HttpError(400, `estado debe ser uno de: ${ESTADOS.join(", ")}`);
  const orden = await cargarOrdenPropia(aEnteroPositivo(idTexto, "id"), userId);
  if (!TRANSICIONES[orden.estado].includes(estado)) {
    throw new HttpError(409, `No se puede pasar de ${orden.estado} a ${estado}`);
  }
  return prisma.ordenServicio.update({ where: { id: orden.id }, data: { estado } });
};

// Solo se borran órdenes sin avance (RECIBIDA) o canceladas. Se borra en PostgreSQL y luego su bitácora en MongoDB.
const eliminar = async (userId, idTexto) => {
  const orden = await cargarOrdenPropia(aEnteroPositivo(idTexto, "id"), userId);
  if (!["RECIBIDA", "CANCELADA"].includes(orden.estado)) {
    throw new HttpError(409, "Solo se pueden eliminar órdenes en estado RECIBIDA o CANCELADA");
  }
  await prisma.ordenServicio.delete({ where: { id: orden.id } });
  const { deletedCount } = await Bitacora.deleteMany({ ordenId: orden.id });
  return { mensaje: "Orden eliminada", bitacorasEliminadas: deletedCount };
};

module.exports = { crear, listarMias, obtener, cambiarEstado, eliminar, cargarOrdenPropia };
