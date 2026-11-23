require("dotenv").config();
const app = require("./app");
const prisma = require("./db/prisma");
const { connectMongo, disconnectMongo } = require("./db/mongo");

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error("JWT_SECRET es obligatorio y debe tener al menos 32 caracteres");
    }
    // El servidor arranca solo si las dos bases responden
    await connectMongo();
    await prisma.$connect();
    console.log("Conexión a PostgreSQL establecida (Prisma).");

    const server = app.listen(PORT, () => console.log(`Servidor ejecutándose en el puerto ${PORT}`));
    const cerrar = async () => {
      server.close();
      await Promise.all([prisma.$disconnect(), disconnectMongo()]);
      process.exit(0);
    };
    process.on("SIGTERM", cerrar);
    process.on("SIGINT", cerrar);
  } catch (error) {
    console.error("No se pudo iniciar la API:", error.message);
    process.exit(1);
  }
};

start();
