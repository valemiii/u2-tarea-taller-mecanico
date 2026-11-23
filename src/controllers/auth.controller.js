const catchAsync = require("../utils/catchAsync");
const authService = require("../services/auth.service");

const registrar = catchAsync(async (req, res) => {
  const user = await authService.registrar(req.body);
  res.status(201).json({ message: "Usuario registrado", user });
});

const iniciarSesion = catchAsync(async (req, res) => {
  res.json({ token: await authService.iniciarSesion(req.body) });
});

const perfil = catchAsync(async (req, res) => {
  res.json(await authService.perfil(req.user.id));
});

const eliminarCuenta = catchAsync(async (req, res) => {
  await authService.eliminarCuenta(req.user.id);
  res.json({ mensaje: "Cuenta eliminada" });
});

module.exports = { registrar, iniciarSesion, perfil, eliminarCuenta };
