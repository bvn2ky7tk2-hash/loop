-- Phase 2: HR & Finance
-- Contracts, Leave Management, Payroll, Expenses

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "contract_type"   AS ENUM ('FULL_TIME', 'PART_TIME', 'PROBATION', 'FREELANCE');
CREATE TYPE "contract_status" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');
CREATE TYPE "leave_status"    AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "payroll_status"  AS ENUM ('DRAFT', 'PROCESSING', 'APPROVED', 'PAID');
CREATE TYPE "expense_category" AS ENUM ('TRAVEL', 'MEALS', 'EQUIPMENT', 'SOFTWARE', 'TRAINING', 'OTHER');
CREATE TYPE "expense_status"  AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');

-- ─── Contracts ───────────────────────────────────────────────────────────────

CREATE TABLE "contracts" (
    "id"              TEXT              NOT NULL,
    "employee_id"     TEXT              NOT NULL,
    "type"            "contract_type"   NOT NULL DEFAULT 'FULL_TIME',
    "status"          "contract_status" NOT NULL DEFAULT 'ACTIVE',
    "start_date"      DATE              NOT NULL,
    "end_date"        DATE,
    "salary_monthly"  DECIMAL(15,2)     NOT NULL,
    "currency"        "BudgetCurrency"  NOT NULL DEFAULT 'VND',
    "note"            TEXT,
    "signed_at"       DATE,
    "created_at"      TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3)      NOT NULL,
    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "contracts_employee_id_idx" ON "contracts"("employee_id");
CREATE INDEX "contracts_status_idx"      ON "contracts"("status");
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Leave Types ─────────────────────────────────────────────────────────────

CREATE TABLE "leave_types" (
    "id"               TEXT         NOT NULL,
    "name"             TEXT         NOT NULL,
    "max_days_per_year" INTEGER      NOT NULL,
    "is_paid"          BOOLEAN      NOT NULL DEFAULT true,
    "color"            TEXT         NOT NULL DEFAULT '#2563EB',
    "is_active"        BOOLEAN      NOT NULL DEFAULT true,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_types_pkey"        PRIMARY KEY ("id"),
    CONSTRAINT "leave_types_name_key"    UNIQUE ("name")
);

-- ─── Leave Requests ──────────────────────────────────────────────────────────

CREATE TABLE "leave_requests" (
    "id"               TEXT           NOT NULL,
    "employee_id"      TEXT           NOT NULL,
    "leave_type_id"    TEXT           NOT NULL,
    "start_date"       DATE           NOT NULL,
    "end_date"         DATE           NOT NULL,
    "days"             DECIMAL(5,1)   NOT NULL,
    "reason"           TEXT,
    "status"           "leave_status" NOT NULL DEFAULT 'PENDING',
    "approved_by_id"   TEXT,
    "approved_at"      TIMESTAMP(3),
    "rejected_reason"  TEXT,
    "created_at"       TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3)   NOT NULL,
    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "leave_requests_employee_id_idx" ON "leave_requests"("employee_id");
CREATE INDEX "leave_requests_status_idx"      ON "leave_requests"("status");
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_fkey"
    FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approved_by_id_fkey"
    FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Leave Balances ──────────────────────────────────────────────────────────

CREATE TABLE "leave_balances" (
    "id"            TEXT         NOT NULL,
    "employee_id"   TEXT         NOT NULL,
    "leave_type_id" TEXT         NOT NULL,
    "year"          INTEGER      NOT NULL,
    "total_days"    DECIMAL(5,1) NOT NULL,
    "used_days"     DECIMAL(5,1) NOT NULL DEFAULT 0,
    CONSTRAINT "leave_balances_pkey"                                PRIMARY KEY ("id"),
    CONSTRAINT "leave_balances_employee_id_leave_type_id_year_key" UNIQUE ("employee_id","leave_type_id","year")
);
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_fkey"
    FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON UPDATE CASCADE;

-- ─── Payroll Periods ─────────────────────────────────────────────────────────

CREATE TABLE "payroll_periods" (
    "id"              TEXT             NOT NULL,
    "name"            TEXT             NOT NULL,
    "start_date"      DATE             NOT NULL,
    "end_date"        DATE             NOT NULL,
    "status"          "payroll_status" NOT NULL DEFAULT 'DRAFT',
    "processed_by_id" TEXT,
    "processed_at"    TIMESTAMP(3),
    "created_at"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3)     NOT NULL,
    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_processed_by_id_fkey"
    FOREIGN KEY ("processed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Payroll Records ─────────────────────────────────────────────────────────

CREATE TABLE "payroll_records" (
    "id"             TEXT         NOT NULL,
    "period_id"      TEXT         NOT NULL,
    "employee_id"    TEXT         NOT NULL,
    "work_days"      DECIMAL(5,1) NOT NULL,
    "leave_days"     DECIMAL(5,1) NOT NULL DEFAULT 0,
    "overtime_hours" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "base_salary"    DECIMAL(15,2) NOT NULL,
    "deductions"     DECIMAL(15,2) NOT NULL DEFAULT 0,
    "bonus"          DECIMAL(15,2) NOT NULL DEFAULT 0,
    "net_salary"     DECIMAL(15,2) NOT NULL,
    "note"           TEXT,
    CONSTRAINT "payroll_records_pkey"                    PRIMARY KEY ("id"),
    CONSTRAINT "payroll_records_period_id_employee_id_key" UNIQUE ("period_id","employee_id")
);
CREATE INDEX "payroll_records_period_id_idx" ON "payroll_records"("period_id");
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_period_id_fkey"
    FOREIGN KEY ("period_id") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Expenses ────────────────────────────────────────────────────────────────

CREATE TABLE "expenses" (
    "id"               TEXT               NOT NULL,
    "project_id"       TEXT,
    "submitted_by_id"  TEXT               NOT NULL,
    "title"            TEXT               NOT NULL,
    "category"         "expense_category" NOT NULL DEFAULT 'OTHER',
    "total_amount"     DECIMAL(15,2)      NOT NULL,
    "currency"         "BudgetCurrency"   NOT NULL DEFAULT 'VND',
    "status"           "expense_status"   NOT NULL DEFAULT 'PENDING',
    "approved_by_id"   TEXT,
    "approved_at"      TIMESTAMP(3),
    "rejected_reason"  TEXT,
    "note"             TEXT,
    "created_at"       TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3)       NOT NULL,
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "expenses_submitted_by_id_idx" ON "expenses"("submitted_by_id");
CREATE INDEX "expenses_status_idx"          ON "expenses"("status");
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_submitted_by_id_fkey"
    FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approved_by_id_fkey"
    FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Expense Items ───────────────────────────────────────────────────────────

CREATE TABLE "expense_items" (
    "id"          TEXT          NOT NULL,
    "expense_id"  TEXT          NOT NULL,
    "description" TEXT          NOT NULL,
    "amount"      DECIMAL(15,2) NOT NULL,
    CONSTRAINT "expense_items_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_expense_id_fkey"
    FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Seed: Leave Types mặc định ──────────────────────────────────────────────

INSERT INTO "leave_types" ("id","name","max_days_per_year","is_paid","color","is_active","created_at") VALUES
  (gen_random_uuid()::text, 'Annual Leave',  12, true,  '#2563EB', true, NOW()),
  (gen_random_uuid()::text, 'Sick Leave',     6, true,  '#DC2626', true, NOW()),
  (gen_random_uuid()::text, 'Unpaid Leave',   5, false, '#6B7280', true, NOW()),
  (gen_random_uuid()::text, 'Maternity Leave',180, true,'#7C3AED', true, NOW()),
  (gen_random_uuid()::text, 'Paternity Leave',5, true,  '#059669', true, NOW());
