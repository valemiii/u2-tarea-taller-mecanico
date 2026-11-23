# Taller mecánico · API REST híbrida (PostgreSQL + MongoDB)

Tarea individual de la Unidad 2 · Desarrollo Web Avanzado · **Caso 5 (Taller mecánico)** · Valeria Guaiguacundo

| Base | Qué guarda | Por qué |
|---|---|---|
| **PostgreSQL** (Prisma) | `User`, `OrdenServicio` (1:N con User, `servicioId String?`) | estado con transiciones, FK, integridad |
| **MongoDB** (Mongoose) | `Servicio` (catálogo, repuestos embebidos), `Bitacora` (crece en cada visita) | forma variable, lectura masiva, crecimiento sin límite |

El modelado completo (workload, decisión de base, ERD, referencias, dato copiado y fallas) está en [`docs/Tarea_modelo_hibrido.md`](docs/Tarea_modelo_hibrido.md).

## Puesta en marcha

```bash
npm install
cp .env.example .env            # y cambie JWT_SECRET (32 caracteres o más)
docker compose up -d            # PostgreSQL, pgAdmin y MongoDB
npx prisma migrate deploy       # crea las tablas (migración prisma/migrations/20261123000000_init_taller)
npx prisma generate
npm start                       # solo arranca si MongoDB y PostgreSQL conectan
npm run test:modelos            # prueba de los esquemas de Mongoose, sin base de datos
```

Si Prisma detecta diferencias con la migración, regenérela: borre `prisma/migrations/20261123000000_init_taller` y ejecute `npx prisma migrate dev --name init_taller`.

## Estructura

```
src/
  db/          prisma.js · mongo.js            una conexión por base
  models/      servicio.js · bitacora.js       esquemas de Mongoose
  services/    reglas de negocio e integración entre bases
  controllers/ routes/ middlewares/ utils/
prisma/        schema.prisma + migración
postman/       colección repetible (75 aserciones)
docs/          modelo híbrido, ERD y evidencias
```

## Dónde está cada requisito

| Requisito | Archivo |
|---|---|
| Esquema: required, enum, min/max, minlength, match, validación propia, arreglo, virtual, `pre("validate")` sin `next` | `src/models/servicio.js` |
| CRUD en capas, `?q=` (regex), `?fields=`, `sort`, PUT con `findById` + `save()` | `src/services/servicio.service.js` |
| Crear en PostgreSQL validando MongoDB (`isValidObjectId` + búsqueda) | `src/services/orden.service.js` → `crear` |
| Crear en MongoDB validando PostgreSQL (404/403, userId del JWT, placa copiada) | `src/services/bitacora.service.js` → `crear` |
| Índice único (409 por E11000) | `src/models/bitacora.js` · `src/middlewares/errorHandler.js` |
| Consulta unida con `$in` + `Map` | `src/services/orden.service.js` → `unirConServicios` |
| Lista con `populate`, orden y `aggregate` | `src/services/bitacora.service.js` → `listar` |
| Borrado protegido (409) con cascada | `src/services/servicio.service.js` → `eliminar` |
| `@@index` en PostgreSQL | `prisma/schema.prisma` |

## Endpoints

Ver la tabla completa en la sección 7 de `docs/Tarea_modelo_hibrido.md`. Las escrituras llevan `Authorization: Bearer <token>` (token de `POST /api/auth/login`).

## Evidencia (pendiente de capturar)

- [ ] `docs/run-collection.png`: resumen de **Run collection** de Postman (todo en verde, corrida dos veces).
- [ ] `docs/compass-colecciones.png` y `docs/compass-indices.png`: colecciones `servicios` y `bitacoras` e índices (`ordenId_1_visita_1` único, `codigo_1` único).
- [ ] `docs/pgadmin-servicio-id.png`: tabla `ordenes_servicio` con la columna `servicio_id` (el `_id` de MongoDB). Cree antes una orden y **no** corra la limpieza, o ejecute solo hasta la creación.
- [ ] Video de 5 minutos máximo (ver `docs/GUION_VIDEO.md`).
