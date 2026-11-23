// Prueba rápida de los esquemas de Mongoose SIN base de datos (usa validate(), que sí ejecuta el pre("validate")).
// Ejecutar: npm run test:modelos
const assert = require("node:assert/strict");
const Servicio = require("../src/models/servicio");
const Bitacora = require("../src/models/bitacora");

const mensajes = async (doc) => {
  try {
    await doc.validate();
    return [];
  } catch (e) {
    return Object.values(e.errors).map((x) => x.message);
  }
};
const base = { codigo: "mec-001", nombre: "  Cambio   de aceite ", categoria: "mantenimiento", manoObra: 25, tiempoEstimadoMin: 45, repuestos: [{ nombre: "Filtro", cantidad: 2, costoUnitario: 8.5 }] };

(async () => {
// Válido: pre("validate") normaliza código y nombre; los virtuales se calculan
const ok = new Servicio(base);
assert.equal((await mensajes(ok)).length, 0);
assert.equal(ok.codigo, "MEC-001"); // el pre("validate") lo pasó a mayúsculas
assert.equal(ok.nombre, "Cambio de aceite");
assert.equal(ok.costoRepuestos, 17);
assert.equal(ok.costoEstimado, 42);

// Inválidos: cada regla devuelve su mensaje en español
assert.ok((await mensajes(new Servicio({ ...base, codigo: "x" }))).some((m) => m.includes("formato AAA-123")));
assert.ok((await mensajes(new Servicio({ ...base, categoria: "otra" }))).some((m) => m.includes("La categoría debe ser una de")));
assert.ok((await mensajes(new Servicio({ ...base, tiempoEstimadoMin: 20 }))).some((m) => m.includes("múltiplo de 15")));
assert.ok((await mensajes(new Servicio({ ...base, manoObra: -1 }))).some((m) => m.includes("no puede ser negativa")));
assert.ok((await mensajes(new Servicio({ ...base, repuestos: [base.repuestos[0], base.repuestos[0]] }))).some((m) => m.includes("repuestos repetidos")));

const bit = { ordenId: 1, userId: 1, placa: "abc-123", visita: 1, descripcion: "Revisión de frenos" };
assert.equal((await mensajes(new Bitacora(bit))).length, 0);
assert.equal(new Bitacora(bit).placa, "ABC-123");
assert.ok((await mensajes(new Bitacora({ ...bit, descripcion: "x" }))).some((m) => m.includes("al menos 5")));
assert.ok((await mensajes(new Bitacora({ ...bit, visita: 0 }))).some((m) => m.includes("al menos 1")));

console.log("Esquemas OK: Servicio y Bitacora validan con mensajes en español.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
