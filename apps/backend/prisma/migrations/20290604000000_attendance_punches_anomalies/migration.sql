-- CreateEnum
CREATE TYPE "punch_source" AS ENUM ('IMPORT', 'DEVICE', 'MANUAL');

-- CreateEnum
CREATE TYPE "attendance_anomaly" AS ENUM ('LATE_ARRIVAL', 'EARLY_DEPARTURE', 'MISSING_CHECKIN', 'MISSING_CHECKOUT');

-- AlterTable
ALTER TABLE "attendance_records" ADD COLUMN     "anomalies" "attendance_anomaly"[] DEFAULT ARRAY[]::"attendance_anomaly"[];

-- CreateTable
CREATE TABLE "attendance_punches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL DEFAULT 'loop-default-tenant-001',
    "employee_id" TEXT NOT NULL,
    "punched_at" TIMESTAMP(3) NOT NULL,
    "source" "punch_source" NOT NULL DEFAULT 'IMPORT',
    "device_id" TEXT,
    "raw_code" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_punches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_punches_tenant_id_employee_id_punched_at_idx" ON "attendance_punches"("tenant_id", "employee_id", "punched_at");

-- CreateIndex
CREATE INDEX "attendance_punches_tenant_id_idx" ON "attendance_punches"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_punches_tenant_id_employee_id_punched_at_key" ON "attendance_punches"("tenant_id", "employee_id", "punched_at");

-- AddForeignKey
ALTER TABLE "attendance_punches" ADD CONSTRAINT "attendance_punches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_punches" ADD CONSTRAINT "attendance_punches_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

