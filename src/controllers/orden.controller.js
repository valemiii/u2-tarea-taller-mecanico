const catchAsync = require("../utils/catchAsync");
const ordenService = require("../services/orden.service");

const crear = catchAsync(async (req, res) => res.status(201).json(await ordenService.crear(req.user.id, req.body)));
const listarMias = catchAsync(async (req, res) => res.json(await ordenService.listarMias(req.user.id, req.query)));
const obtener = catchAsync(async (req, res) => res.json(await ordenService.obtener(req.user.id, req.params.id)));
const cambiarEstado = catchAsync(async (req, res) =>
  res.json(await ordenService.cambiarEstado(req.user.id, req.params.id, req.body?.estado))
);
const eliminar = catchAsync(async (req, res) => res.json(await ordenService.eliminar(req.user.id, req.params.id)));

module.exports = { crear, listarMias, obtener, cambiarEstado, eliminar };
