# Workload · Clínica de citas médicas (PostgreSQL + MongoDB)

Ejemplo resuelto para la sesión 7. Sigue la plantilla del material de Modelado (lección 2.2, caso de los sensores del clima)
y le agrega una línea por operación: **en qué base vive el dato**. El diagrama está en `ERD_clinica_hibrida.png`.

---

## 1. Casos de uso

- Una clínica atiende a ~2 000 pacientes que reservan citas en bloques de tiempo y eligen una especialidad.
- Después de la cita, el paciente deja una reseña (nota de 1 a 5, comentario y etiquetas).
- Los pacientes consultan el catálogo de especialidades, su historial de citas y las reseñas de cada especialidad.
- El administrador mantiene el catálogo de especialidades.

## 2. Datos principales

- Pacientes: 2 000 (crecen ~50 por mes).
- Especialidades: 15.
- Citas: ~300 por día.
- Reseñas: ~150 por día (la mitad de las citas). **Crecen sin límite.**
- Período: las citas y reseñas se guardan 5 años (historia clínica).

## 3. Suposiciones

- Un bloque de tiempo no se puede reservar dos veces (integridad fuerte).
- Una cita tiene como máximo **una** reseña.
- El nombre del paciente casi nunca cambia: se puede copiar en la reseña.
- El catálogo de especialidades cambia pocas veces al mes, pero cada especialidad puede tener campos distintos.
- Las reseñas se muestran por especialidad, las más nuevas primero, con el promedio.

## 4. Operaciones

| Actor: | Paciente |
|---|---|
| Descripción: | Reserva una cita en un bloque y elige la especialidad |
| Tipo de operación: | Escritura |
| Datos en la operación: | fecha, timeBlockId, specialtyId, userId (del JWT) |
| Frecuencia: | ~300 por día, picos a las 8:00 |
| Tasa: | 300 / día |
| Base: | **PostgreSQL** (transacción e integridad del bloque); lee MongoDB para validar `specialtyId` |

| Actor: | Paciente |
|---|---|
| Descripción: | Ve su historial de citas con el nombre de la especialidad |
| Tipo de operación: | Lectura |
| Datos en la operación: | citas + bloque (PostgreSQL) + name, code (MongoDB) |
| Frecuencia: | cada paciente activo, ~1 vez al día |
| Tasa: | ~1 000 / día |
| Base: | **Las dos**: se une en el servicio con `$in` (2 consultas) |

| Actor: | Paciente |
|---|---|
| Descripción: | Consulta el catálogo de especialidades |
| Tipo de operación: | Lectura |
| Datos en la operación: | name, area, durationMinutes, description |
| Frecuencia: | en cada visita a la página de reservas |
| Tasa: | ~5 000 / día |
| Base: | **MongoDB** (documento listo para mostrar) |

| Actor: | Paciente |
|---|---|
| Descripción: | Deja una reseña de su cita |
| Tipo de operación: | Escritura |
| Datos en la operación: | appointmentId, rating, comment, tags[]; userId del JWT; patientName copiado de PostgreSQL |
| Frecuencia: | la mitad de las citas |
| Tasa: | ~150 / día (sin límite en el tiempo: ~270 000 en 5 años) |
| Base: | **MongoDB**, colección aparte; lee PostgreSQL para validar la cita y su dueño |

| Actor: | Paciente (o visitante) |
|---|---|
| Descripción: | Lee las reseñas y el promedio de una especialidad |
| Tipo de operación: | Lectura |
| Datos en la operación: | patientName, rating, comment, tags, createdAt; promedio y total |
| Frecuencia: | al elegir especialidad |
| Tasa: | ~3 000 / día |
| Base: | **MongoDB** solamente (por eso se copia `patientName`) |

| Actor: | Administrador |
|---|---|
| Descripción: | Crea o edita una especialidad |
| Tipo de operación: | Escritura |
| Datos en la operación: | todos los campos de la especialidad |
| Frecuencia: | pocas veces al mes |
| Tasa: | ~5 / mes |
| Base: | **MongoDB** |

| Actor: | Administrador |
|---|---|
| Descripción: | Elimina una especialidad |
| Tipo de operación: | Escritura |
| Datos en la operación: | _id; conteo de citas que la usan |
| Frecuencia: | casi nunca |
| Tasa: | ~1 / año |
| Base: | **MongoDB**, revisando PostgreSQL (409 si hay citas; borra sus reseñas) |

## 5. Entidades

- **PostgreSQL**
  - User
    - Appointment (1:N, FK `userId`)
  - TimeBlock
    - Appointment (1:N, FK `timeBlockId`)
- **MongoDB**
  - Specialty
    - Review (1:N, `specialty` ObjectId + ref)
  - Review
    - tags[] (embebido)
- **Entre bases (sin FK)**
  - Appointment.specialtyId → Specialty._id (String)
  - Review.appointmentId → Appointment.id (Number, único)
  - Review.userId → User.id (Number) · Review.patientName (copia)

## 6. Observaciones

- Hay **10 lecturas por cada escritura** (~9 000 lecturas frente a ~450 escrituras al día): conviene que lo que más se lee salga de una sola consulta.
- Lo único que crece sin límite son las reseñas: van en su propia colección, nunca embebidas en la especialidad (límite de 16 MB).
- La reserva necesita integridad (no dos citas en el mismo bloque): se queda en PostgreSQL.
- `patientName` se copia porque la lista de reseñas se lee 3 000 veces al día y el nombre casi no cambia. Costo: si cambia, las reseñas viejas guardan el anterior.
- Índices que pide el workload: `Appointment.specialtyId` (PostgreSQL), `reviews.appointmentId` único y `reviews { specialty: 1, createdAt: -1 }` (MongoDB).
