const catchAsync = require("../utils/catchAsync");
const bitacoraService = require("../services/bitacora.service");

const crear = catchAsync(async (req, res) =>
  res.status(201).json(await bitacoraService.crear(req.user.id, req.params.ordenId, req.body))
);
const listar = catchAsync(async (req, res) =>
  res.json(await bitacoraService.listar(req.user.id, req.params.ordenId, req.query))
);

module.exports = { crear, listar };
