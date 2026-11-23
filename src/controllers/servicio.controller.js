const catchAsync = require("../utils/catchAsync");
const servicioService = require("../services/servicio.service");

const crear = catchAsync(async (req, res) => res.status(201).json(await servicioService.crear(req.body)));
const listar = catchAsync(async (req, res) => res.json(await servicioService.listar(req.query)));
const obtener = catchAsync(async (req, res) => res.json(await servicioService.obtener(req.params.id)));
const actualizar = catchAsync(async (req, res) => res.json(await servicioService.actualizar(req.params.id, req.body)));
const eliminar = catchAsync(async (req, res) => res.json(await servicioService.eliminar(req.params.id)));

module.exports = { crear, listar, obtener, actualizar, eliminar };
