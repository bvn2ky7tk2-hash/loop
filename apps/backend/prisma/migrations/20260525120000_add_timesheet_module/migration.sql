-- CreateEnum
CREATE TYPE "WorkStatusType" AS ENUM ('WORKING', 'WFH', 'MEETING', 'BREAK', 'OFF', 'BUSINESS_TRIP');

-- CreateEnum
CREATE TYPE "CheckInMethod" AS ENUM ('MANUAL', 'GPS', 'WIFI');

-- CreateEnum
CREATE TYPE "TimesheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TIMESHEET_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'TIMESHEET_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'TIMESHEET_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'TIMESHEET_APPROVAL_OVERDUE';
ALTER TYPE "NotificationType" ADD VALUE 'TIMESHEET_APPROVAL_ESCALATED';

-- CreateTable: work_statuses
CREATE TABLE "work_statuses" (
    "id"          TEXT         NOT NULL,
    "user_id"     TEXT         NOT NULL,
    "status_type" "WorkStatusType" NOT NULL,
    "started_at"  TIMESTAMP(3) NOT NULL,
    "ended_at"    TIMESTAMP(3),
    "note"        TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable: time_entries
CREATE TABLE "time_entries" (
    "id"                   TEXT         NOT NULL,
    "user_id"              TEXT         NOT NULL,
    "date"                 DATE         NOT NULL,
    "check_in_at"          TIMESTAMP(3),
    "check_out_at"         TIMESTAMP(3),
    "check_in_lat"         DECIMAL(10,7),
    "check_in_lng"         DECIMAL(10,7),
    "check_out_lat"        DECIMAL(10,7),
    "check_out_lng"        DECIMAL(10,7),
    "check_in_method"      "CheckInMethod" NOT NULL DEFAULT 'MANUAL',
    "is_manual_correction" BOOLEAN      NOT NULL DEFAULT false,
    "correction_reason"    TEXT,
    "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable: timesheet_records
CREATE TABLE "timesheet_records" (
    "id"               TEXT             NOT NULL,
    "user_id"          TEXT             NOT NULL,
    "period_start"     DATE             NOT NULL,
    "period_end"       DATE             NOT NULL,
    "working_days"     DECIMAL(5,2)     NOT NULL DEFAULT 0,
    "standard_days"    DECIMAL(5,2)     NOT NULL DEFAULT 0,
    "overtime_hours"   DECIMAL(7,2)     NOT NULL DEFAULT 0,
    "leave_days"       DECIMAL(5,2)     NOT NULL DEFAULT 0,
    "status"           "TimesheetStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at"     TIMESTAMP(3),
    "approved_at"      TIMESTAMP(3),
    "approved_by_id"   TEXT,
    "rejection_reason" TEXT,
    "locked_at"        TIMESTAMP(3),
    "created_at"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "timesheet_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_statuses_user_id_started_at_idx" ON "work_statuses"("user_id", "started_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "time_entries_user_id_date_key" ON "time_entries"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "timesheet_records_user_id_period_start_key" ON "timesheet_records"("user_id", "period_start");
CREATE INDEX "timesheet_records_user_id_period_start_idx" ON "timesheet_records"("user_id", "period_start");

-- AddForeignKey
ALTER TABLE "work_statuses" ADD CONSTRAINT "work_statuses_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_records" ADD CONSTRAINT "timesheet_records_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet_records" ADD CONSTRAINT "timesheet_records_approved_by_id_fkey"
    FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
