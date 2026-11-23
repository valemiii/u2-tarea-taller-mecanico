# Guion del video (5 minutos máximo, con cara y voz)

**1 · Workload y decisión de base (≈1:30).** Muestre la fila "Cliente registra una entrada de bitácora" de `docs/Tarea_modelo_hibrido.md` (~75 al día, crece sin límite, ~137 000 en 5 años) y la tabla de la sección 2: por eso Bitácora va a MongoDB y la orden a PostgreSQL (estado, FK, integridad). Diga qué se copia (`placa`) y su costo.

**2 · Recorrido del endpoint que crea en MongoDB validando PostgreSQL (≈2:30).** En `src/services/bitacora.service.js` → `crear`: `aEnteroPositivo` → `cargarOrdenPropia` (404 si no existe, 403 si es de otro) → visita automática → `Bitacora.create` con `userId` del JWT y `placa` copiada → E11000 → 409 en `errorHandler.js`. En Postman: la petición de la orden ajena (403), la inexistente (404), la creada (201) y la visita repetida (409).

**3 · Qué pasa si una base falla a la mitad (≈1:00).** Sección 8 del documento. Demostración: `docker compose stop mongo` y repetir `POST /api/ordenes` → 503 sin guardar nada. Explique el orden "validar primero, escribir después" y el caso de bitácoras huérfanas al borrar una orden.

Hable con sus palabras: si el video no muestra que entiende su código, el bloque de integración vale 0.
