// Conexión a PostgreSQL (Prisma): una sola instancia para toda la aplicación
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;
