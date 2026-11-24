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
cp .env.example .env            # complete valores censurados y configure JWT_SECRET
docker compose up -d            # PostgreSQL, pgAdmin y MongoDB
npx prisma migrate deploy       # crea las tablas (migración prisma/migrations/20261123000000_init_taller)
npx prisma generate
npm start                       # solo arranca si MongoDB y PostgreSQL conectan
npm run test:modelos            # prueba de los esquemas de Mongoose, sin base de datos
```

Si Prisma detecta diferencias con la migración, regenérela: borre `prisma/migrations/20261123000000_init_taller` y ejecute `npx prisma migrate dev --name init_taller`.

## Puertos y credenciales locales

| Servicio | Puerto en el host | Puerto del contenedor | Acceso local |
|---|---:|---:|---|
| API Node.js | `3000` | — | `http://localhost:3000` |
| PostgreSQL | `55432` | `5432` | Base `espe_db` |
| pgAdmin | `55050` | `80` | `http://localhost:55050` |
| MongoDB de Docker Compose | `27017` | `27017` | Base `espe_mongo` |
| MongoDB usado por la aplicación en este entorno | `27018` | `27017` | Base `espe_mongo` |

La aplicación local se conecta a MongoDB por `localhost:27018`: ese es el contenedor `espe-mongo` que ya estaba ejecutándose en este entorno. El servicio `mongo` de este `docker-compose.yml`, en cambio, publica el puerto `27017`. Para que la aplicación use el MongoDB de Compose, cambie el puerto de `MONGODB_URI` en su `.env` a `27017`.

Credenciales de desarrollo definidas por Docker Compose:

| Servicio | Usuario/correo | Contraseña |
|---|---|---|
| PostgreSQL | `espe_user` | `espe_password` |
| pgAdmin | `admin@espe.com` | `admin_password` |
| MongoDB de Docker Compose | `espe_user` | `espe_password` |

Estas credenciales son solo para desarrollo local. La URI y credenciales del MongoDB existente en `27018`, así como `JWT_SECRET`, se configuran en `.env`; no comparta ni agregue ese archivo al repositorio. `.env.example` es una plantilla con valores censurados y debe completarse con la configuración del entorno antes de iniciar la aplicación.

La API no incluye un usuario predeterminado: registre uno en `POST /api/auth/register` y obtenga un token en `POST /api/auth/login`.

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

## Evidencia

- [x] [Ejecución de Postman](docs/POSTMAN%20PASS.png): Run collection en verde.
- [x] [Colecciones de MongoDB Compass](docs/COMPASS%20LISTO.png): `bitacoras`, `espe_mongo` y `servicios` en `espe_mongo`.
- [x] [Índices de `servicios` en MongoDB Compass](docs/COMPASS%20INDICES%20SERVICIOS.png): `_id_`, `codigo_1` y `categoria_1_nombre_1`.
- [x] [Índices de `bitacoras` en MongoDB Compass](docs/COMPASS%20INDICES%20BITACORAS.png).
- [x] [Índice de la colección `espe_mongo` en MongoDB Compass](docs/COMPASS%20INDICE%20ESPE-MONGO.png).
- [x] [Columna `servicio_id` en pgAdmin](docs/pgadmin-servicio-id.png).
- [x] [Orden en pgAdmin con el `_id` de MongoDB guardado en `servicio_id`](docs/CAPTURA%20ID%20DE%20MONGO%20EN%20BD.png).
