const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../db/prisma");
const HttpError = require("../utils/httpError");

// Nunca se devuelve el hash de la contraseña
const usuarioPublico = { id: true, email: true, name: true, createdAt: true };

const registrar = async ({ email, password, name } = {}) => {
  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== "string" || password.length < 8 || typeof name !== "string" || !name.trim()) {
    throw new HttpError(400, "email válido, name y password de al menos 8 caracteres son obligatorios");
  }
  const hash = await bcrypt.hash(password, 10);
  // Si el email ya existe, Prisma lanza P2002 y el errorHandler responde 409
  return prisma.user.create({
    data: { email: email.toLowerCase().trim(), password: hash, name: name.trim() },
    select: usuarioPublico,
  });
};

const iniciarSesion = async ({ email, password } = {}) => {
  const user = await prisma.user.findUnique({ where: { email: String(email || "").toLowerCase().trim() } });
  if (!user || !(await bcrypt.compare(String(password || ""), user.password))) {
    throw new HttpError(401, "Credenciales inválidas");
  }
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "4h" });
};

const perfil = async (id) => {
  const user = await prisma.user.findUnique({ where: { id }, select: usuarioPublico });
  if (!user) throw new HttpError(404, "Usuario no encontrado");
  return user;
};

// Borra la cuenta; si tiene órdenes, la FK (Restrict) lo impide → P2003 → 409
const eliminarCuenta = async (id) => {
  await prisma.user.delete({ where: { id } });
};

module.exports = { registrar, iniciarSesion, perfil, eliminarCuenta };
