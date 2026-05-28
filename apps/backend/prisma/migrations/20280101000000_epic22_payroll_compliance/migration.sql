-- Epic 22: Payroll Compliance — Thuế TNCN & BHXH/BHYT/BHTN
-- Applied via: prisma db push (shadow DB has pre-existing failure on 20260527400000)

-- Extend TimesheetRecord with OT breakdown + unpaid leave
ALTER TABLE "timesheet_records"
  ADD COLUMN IF NOT EXISTS "ot_weekday_hours" DECIMAL(7,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "ot_weekend_hours" DECIMAL(7,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "ot_holiday_hours" DECIMAL(7,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "unpaid_leave_days" DECIMAL(5,1) NOT NULL DEFAULT 0;

-- Add REVIEWED to payroll_status enum
ALTER TYPE "payroll_status" ADD VALUE IF NOT EXISTS 'REVIEWED' AFTER 'PROCESSING';

-- Add PAYSLIP_ISSUED to notification type enum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYSLIP_ISSUED';

-- Extend PayrollPeriod with type and adjustment FK
ALTER TABLE "payroll_periods"
  ADD COLUMN IF NOT EXISTS "type" "payroll_period_type" NOT NULL DEFAULT 'REGULAR',
  ADD COLUMN IF NOT EXISTS "adjustment_for_period_id" TEXT;

-- Extend PayrollRecord with all new compliance fields
ALTER TABLE "payroll_records"
  ADD COLUMN IF NOT EXISTS "paid_leave_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "unpaid_leave_days" DECIMAL(5,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "overtime_pay_breakdown" JSONB,
  ADD COLUMN IF NOT EXISTS "gross_salary" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "overtime_pay" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "allowances" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "bhxh_employee" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "bhyt_employee" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "bhtn_employee" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "bhxh_employer" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "bhyt_employer" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "bhtn_employer" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tnld_employer" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "taxable_income" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "self_deduction" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "dependent_deduction" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "dependent_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pit_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_labor_cost" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "payslip_path" TEXT,
  ADD COLUMN IF NOT EXISTS "config_snapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "override_note" TEXT;

-- Add composite index on payroll_records
CREATE INDEX IF NOT EXISTS "payroll_records_employee_id_period_id_idx" ON "payroll_records"("employee_id", "period_id");

-- New enums
CREATE TYPE IF NOT EXISTS "payroll_period_type" AS ENUM ('REGULAR', 'ADJUSTMENT');
CREATE TYPE IF NOT EXISTS "residency_status" AS ENUM ('RESIDENT', 'NON_RESIDENT');
CREATE TYPE IF NOT EXISTS "salary_column_type" AS ENUM ('EARNING', 'DEDUCTION');
CREATE TYPE IF NOT EXISTS "salary_column_source" AS ENUM ('CONTRACT_SALARY', 'ALLOWANCE_TYPE', 'FIXED_VALUE', 'FORMULA');

-- New tables
CREATE TABLE IF NOT EXISTS "insurance_configs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT,
  "effective_from" DATE NOT NULL,
  "bhxh_employee_rate" DECIMAL(5,4) NOT NULL,
  "bhyt_employee_rate" DECIMAL(5,4) NOT NULL,
  "bhtn_employee_rate" DECIMAL(5,4) NOT NULL,
  "bhxh_employer_rate" DECIMAL(5,4) NOT NULL,
  "bhyt_employer_rate" DECIMAL(5,4) NOT NULL,
  "bhtn_employer_rate" DECIMAL(5,4) NOT NULL,
  "tnld_rate" DECIMAL(5,4) NOT NULL,
  "bhxh_ceiling_multiple" INTEGER NOT NULL DEFAULT 20,
  "wage_base" DECIMAL(12,2) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("tenant_id", "effective_from")
);

CREATE TABLE IF NOT EXISTS "tax_brackets" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT,
  "name" TEXT NOT NULL,
  "effective_from" DATE NOT NULL,
  "brackets" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("tenant_id", "effective_from")
);

CREATE TABLE IF NOT EXISTS "tax_deduction_configs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT,
  "effective_from" DATE NOT NULL,
  "self_deduction" DECIMAL(15,2) NOT NULL,
  "dependent_deduction" DECIMAL(15,2) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("tenant_id", "effective_from")
);

CREATE TABLE IF NOT EXISTS "wage_zone_configs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT,
  "effective_from" DATE NOT NULL,
  "zone1" DECIMAL(12,2) NOT NULL,
  "zone2" DECIMAL(12,2) NOT NULL,
  "zone3" DECIMAL(12,2) NOT NULL,
  "zone4" DECIMAL(12,2) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("tenant_id", "effective_from")
);

CREATE TABLE IF NOT EXISTS "employee_tax_profiles" (
  "employee_id" TEXT NOT NULL PRIMARY KEY,
  "tax_id" TEXT,
  "residency_status" "residency_status" NOT NULL DEFAULT 'RESIDENT',
  "wage_zone" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMPTZ NOT NULL,
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "dependents" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "employee_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "tax_id" TEXT,
  "registered_from" DATE NOT NULL,
  "registered_to" DATE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("employee_id") REFERENCES "employee_tax_profiles"("employee_id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "dependents_employee_id_idx" ON "dependents"("employee_id");

CREATE TABLE IF NOT EXISTS "allowance_types" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "default_amount" DECIMAL(12,2) NOT NULL,
  "is_bhxh_exempt" BOOLEAN NOT NULL DEFAULT true,
  "is_pit_exempt" BOOLEAN NOT NULL DEFAULT false,
  "pit_exempt_ceiling" DECIMAL(12,2),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "bonus_types" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "is_bhxh_exempt" BOOLEAN NOT NULL DEFAULT true,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "employee_bonuses" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "payroll_record_id" TEXT NOT NULL,
  "bonus_type_id" TEXT NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "note" TEXT,
  FOREIGN KEY ("payroll_record_id") REFERENCES "payroll_records"("id") ON DELETE CASCADE,
  FOREIGN KEY ("bonus_type_id") REFERENCES "bonus_types"("id"),
  UNIQUE("payroll_record_id", "bonus_type_id")
);

CREATE TABLE IF NOT EXISTS "employee_yearly_tax_summaries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "employee_id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "ytd_gross" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "ytd_taxable_income" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "ytd_pit_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "ytd_bhxh_employee" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ NOT NULL,
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE,
  UNIQUE("employee_id", "year")
);
CREATE INDEX IF NOT EXISTS "employee_yearly_tax_summaries_employee_id_year_idx" ON "employee_yearly_tax_summaries"("employee_id", "year");

CREATE TABLE IF NOT EXISTS "employee_allowances" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "payroll_record_id" TEXT NOT NULL,
  "allowance_type_id" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "override_note" TEXT,
  FOREIGN KEY ("payroll_record_id") REFERENCES "payroll_records"("id") ON DELETE CASCADE,
  FOREIGN KEY ("allowance_type_id") REFERENCES "allowance_types"("id"),
  UNIQUE("payroll_record_id", "allowance_type_id")
);

CREATE TABLE IF NOT EXISTS "salary_columns" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT,
  "name" TEXT NOT NULL,
  "type" "salary_column_type" NOT NULL,
  "source" "salary_column_source" NOT NULL,
  "allowance_type_id" TEXT,
  "fixed_value" DECIMAL(15,2),
  "formula" TEXT,
  "is_bhxh_exempt" BOOLEAN NOT NULL DEFAULT false,
  "is_pit_exempt" BOOLEAN NOT NULL DEFAULT false,
  "pit_exempt_ceiling" DECIMAL(12,2),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY ("allowance_type_id") REFERENCES "allowance_types"("id")
);
CREATE INDEX IF NOT EXISTS "salary_columns_tenant_id_is_active_idx" ON "salary_columns"("tenant_id", "is_active");
