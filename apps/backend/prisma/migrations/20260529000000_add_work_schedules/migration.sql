-- CreateEnum
CREATE TYPE "ScheduleRepeatType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "work_shifts" ADD COLUMN IF NOT EXISTS "schedule_phases_placeholder" TEXT;
ALTER TABLE "work_shifts" DROP COLUMN IF EXISTS "schedule_phases_placeholder";

-- CreateTable
CREATE TABLE "work_schedules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "repeat_type" "ScheduleRepeatType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_schedule_phases" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "phase_order" INTEGER NOT NULL,

    CONSTRAINT "work_schedule_phases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_schedules_employee_id_idx" ON "work_schedules"("employee_id");

-- CreateIndex
CREATE INDEX "work_schedule_phases_schedule_id_idx" ON "work_schedule_phases"("schedule_id");

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedule_phases" ADD CONSTRAINT "work_schedule_phases_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "work_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedule_phases" ADD CONSTRAINT "work_schedule_phases_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "work_shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
