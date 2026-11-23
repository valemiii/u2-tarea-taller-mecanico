// CATÁLOGO en MongoDB: Servicio del taller (cambiar aceite, frenos, alineación…).
// Cada servicio lleva sus repuestos embebidos (se leen siempre junto al servicio, son pocos y no crecen sin límite).
const mongoose = require("mongoose");

const CATEGORIAS = ["mantenimiento", "mecanica", "electrica", "frenos", "suspension", "neumaticos", "carroceria"];

const repuestoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, "El nombre del repuesto es obligatorio"],
      trim: true,
      minlength: [2, "El nombre del repuesto debe tener al menos 2 caracteres"],
      maxlength: [60, "El nombre del repuesto no puede superar 60 caracteres"],
    },
    cantidad: {
      type: Number,
      required: [true, "La cantidad del repuesto es obligatoria"],
      min: [1, "La cantidad del repuesto debe ser al menos 1"],
      max: [100, "La cantidad del repuesto no puede superar 100"],
      validate: { validator: Number.isInteger, message: "La cantidad del repuesto debe ser un número entero" },
    },
    costoUnitario: {
      type: Number,
      required: [true, "El costo unitario del repuesto es obligatorio"],
      min: [0, "El costo unitario no puede ser negativo"],
    },
  },
  { _id: false }
);

const servicioSchema = new mongoose.Schema(
  {
    codigo: {
      type: String,
      required: [true, "El código es obligatorio"],
      unique: true, // índice único → E11000 → 409
      match: [/^[A-Z]{3}-\d{3}$/, "El código debe tener el formato AAA-123 (tres letras, guion y tres dígitos)"],
    },
    nombre: {
      type: String,
      required: [true, "El nombre del servicio es obligatorio"],
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      maxlength: [80, "El nombre no puede superar 80 caracteres"],
    },
    categoria: {
      type: String,
      required: [true, "La categoría es obligatoria"],
      enum: { values: CATEGORIAS, message: `La categoría debe ser una de: ${CATEGORIAS.join(", ")}` },
    },
    descripcion: {
      type: String,
      trim: true,
      maxlength: [500, "La descripción no puede superar 500 caracteres"],
    },
    manoObra: {
      type: Number,
      required: [true, "El costo de mano de obra es obligatorio"],
      min: [0, "La mano de obra no puede ser negativa"],
      max: [5000, "La mano de obra no puede superar 5000"],
    },
    tiempoEstimadoMin: {
      type: Number,
      required: [true, "El tiempo estimado (en minutos) es obligatorio"],
      min: [15, "El tiempo estimado debe ser de al menos 15 minutos"],
      max: [4800, "El tiempo estimado no puede superar 4800 minutos (80 horas)"],
      // Validación propia: el taller agenda en bloques de 15 minutos
      validate: {
        validator: (v) => Number.isInteger(v) && v % 15 === 0,
        message: "El tiempo estimado debe ser un múltiplo de 15 minutos",
      },
    },
    // Arreglo de subdocumentos (forma variable: cada servicio usa repuestos distintos)
    repuestos: {
      type: [repuestoSchema],
      default: [],
      validate: [
        { validator: (r) => r.length <= 20, message: "Un servicio admite como máximo 20 repuestos" },
        {
          validator: (r) => new Set(r.map((x) => String(x.nombre).toLowerCase())).size === r.length,
          message: "No puede haber repuestos repetidos en el mismo servicio",
        },
      ],
    },
    activo: { type: Boolean, default: true },
  },
  {
    collection: "servicios",
    timestamps: true,
    id: false,
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
  }
);

// Índice compuesto para el filtro por categoría + orden por nombre del catálogo
servicioSchema.index({ categoria: 1, nombre: 1 });

const redondear = (n) => Math.round(n * 100) / 100;

// Virtuales: no se guardan, se calculan al leer
servicioSchema.virtual("costoRepuestos").get(function () {
  return redondear((this.repuestos || []).reduce((suma, r) => suma + r.cantidad * r.costoUnitario, 0));
});
servicioSchema.virtual("costoEstimado").get(function () {
  return redondear((this.manoObra || 0) + this.costoRepuestos);
});

// Mongoose 9: el middleware ya no recibe next; basta con una función (o async) que retorne
servicioSchema.pre("validate", function () {
  if (typeof this.codigo === "string") this.codigo = this.codigo.trim().toUpperCase();
  if (typeof this.nombre === "string") this.nombre = this.nombre.replace(/\s+/g, " ");
});

module.exports = mongoose.models.Servicio || mongoose.model("Servicio", servicioSchema);
module.exports.CATEGORIAS = CATEGORIAS;
