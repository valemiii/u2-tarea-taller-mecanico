-- CreateEnum
CREATE TYPE "EstadoOrden" AS ENUM ('RECIBIDA', 'EN_DIAGNOSTICO', 'EN_REPARACION', 'LISTA', 'ENTREGADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordenes_servicio" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "servicio_id" VARCHAR(24),
    "placa" VARCHAR(10) NOT NULL,
    "marca" VARCHAR(40) NOT NULL,
    "modelo" VARCHAR(40) NOT NULL,
    "anio" SMALLINT,
    "estado" "EstadoOrden" NOT NULL DEFAULT 'RECIBIDA',
    "observaciones" VARCHAR(300),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordenes_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "ordenes_servicio_servicio_id_idx" ON "ordenes_servicio"("servicio_id");

-- CreateIndex
CREATE INDEX "ordenes_servicio_user_id_created_at_idx" ON "ordenes_servicio"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ordenes_servicio_estado_idx" ON "ordenes_servicio"("estado");

-- AddForeignKey
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
