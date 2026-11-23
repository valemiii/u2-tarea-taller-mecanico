// Conexión a MongoDB (Mongoose): una sola conexión para toda la aplicación
const mongoose = require("mongoose");

// Sin buffer: si MongoDB se cae, las operaciones fallan de inmediato en vez de quedar colgadas.
mongoose.set("bufferCommands", false);

const connectMongo = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI es obligatoria para iniciar la API.");
  }
  try {
    // serverSelectionTimeoutMS: si MongoDB no responde en 5 s, el error llega rápido (503 en la API)
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  } catch {
    throw new Error("No se pudo conectar a MongoDB. Verifique el contenedor y MONGODB_URI.");
  }
  console.log(`Conexión a MongoDB establecida (${mongoose.connection.name}).`);
};

const disconnectMongo = () => mongoose.disconnect();

module.exports = { connectMongo, disconnectMongo };
