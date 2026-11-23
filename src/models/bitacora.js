// REGISTRO QUE CRECE en MongoDB: una entrada de bitácora por cada visita del vehículo a una orden.
// Va en su propia colección (no embebida en Servicio ni en la orden) porque crece sin límite.
const mongoose = require("mongoose");

const bitacoraSchema = new mongoose.Schema(
  {
    // Referencias a PostgreSQL (sin FK): las valida el servicio, no la base
    ordenId: {
      type: Number,
      required: [true, "ordenId es obligatorio"],
      min: [1, "ordenId debe ser un entero positivo"],
      validate: { validator: Number.isInteger, message: "ordenId debe ser un número entero" },
    },
    userId: {
      type: Number,
      required: [true, "userId es obligatorio"],
      min: [1, "userId debe ser un entero positivo"],
    },
    // Referencia dentro de MongoDB: ObjectId + ref → populate
    servicio: { type: mongoose.Schema.Types.ObjectId, ref: "Servicio" },
    // Dato copiado de PostgreSQL (OrdenServicio.placa): la bitácora se lee sin consultar PostgreSQL
    placa: {
      type: String,
      required: [true, "La placa es obligatoria"],
      trim: true,
      uppercase: true,
    },
    visita: {
      type: Number,
      required: [true, "El número de visita es obligatorio"],
      min: [1, "La visita debe ser al menos 1"],
      validate: { validator: Number.isInteger, message: "La visita debe ser un número entero" },
    },
    descripcion: {
      type: String,
      required: [true, "La descripción es obligatoria"],
      trim: true,
      minlength: [5, "La descripción debe tener al menos 5 caracteres"],
      maxlength: [1000, "La descripción no puede superar 1000 caracteres"],
    },
    kilometraje: {
      type: Number,
      min: [0, "El kilometraje no puede ser negativo"],
      max: [2000000, "El kilometraje no puede superar 2 000 000"],
      validate: { validator: Number.isInteger, message: "El kilometraje debe ser un número entero" },
    },
    trabajos: {
      type: [{ type: String, trim: true, minlength: [3, "Cada trabajo debe tener al menos 3 caracteres"], maxlength: [120, "Cada trabajo no puede superar 120 caracteres"] }],
      default: [],
      validate: { validator: (t) => t.length <= 15, message: "Una visita admite como máximo 15 trabajos" },
    },
    costo: {
      type: Number,
      default: 0,
      min: [0, "El costo no puede ser negativo"],
    },
    fecha: { type: Date, default: Date.now },
  },
  {
    collection: "bitacoras",
    id: false,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
  }
);

// Una sola visita con ese número por orden (workload: "una entrada por visita") → E11000 → 409
bitacoraSchema.index({ ordenId: 1, visita: 1 }, { unique: true });
// Servicio → sus entradas, de la más reciente a la más antigua (cascada al borrar el servicio)
bitacoraSchema.index({ servicio: 1, fecha: -1 });

bitacoraSchema.virtual("titulo").get(function () {
  return `Visita ${this.visita} · ${this.placa}`;
});

bitacoraSchema.pre("validate", function () {
  if (typeof this.descripcion === "string") this.descripcion = this.descripcion.replace(/\s+/g, " ");
});

module.exports = mongoose.models.Bitacora || mongoose.model("Bitacora", bitacoraSchema);
