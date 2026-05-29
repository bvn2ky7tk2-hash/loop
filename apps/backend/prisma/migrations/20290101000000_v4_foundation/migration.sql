-- Migration: v4-foundation
-- S-01 + H-01: Thêm tenantId vào tất cả entity chính
-- H-06: Soft delete cho 7 model chính
-- FK Project -> Customer, Contract -> Employee (signedBy)
-- Unique constraints hỗ trợ multi-tenant

-- DropIndex unique code cũ (thay bằng composite unique với tenantId)
DROP INDEX "customers_code_key";
DROP INDEX "deals_code_key";
DROP INDEX "employees_code_key";
DROP INDEX "invoices_code_key";
DROP INDEX "org_units_code_key";
DROP INDEX "projects_code_key";

-- AlterTable: thêm tenant_id + soft delete cho các entity

ALTER TABLE "allocations" ADD COLUMN     "tenant_id" TEXT;

ALTER TABLE "assets" ADD COLUMN     "tenant_id" TEXT;

ALTER TABLE "bugs" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "tenant_id" TEXT;

ALTER TABLE "contacts" ADD COLUMN     "tenant_id" TEXT;

ALTER TABLE "contracts" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "signed_by_id" TEXT,
ADD COLUMN     "tenant_id" TEXT;

ALTER TABLE "customers" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "tenant_id" TEXT;

ALTER TABLE "deals" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "tenant_id" TEXT;

ALTER TABLE "employees" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "tenant_id" TEXT;

ALTER TABLE "invoices" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "tenant_id" TEXT;

ALTER TABLE "kb_articles" ADD COLUMN     "tenant_id" TEXT;

ALTER TABLE "leads" ADD COLUMN     "tenant_id" TEXT;

ALTER TABLE "leave_balances" ADD COLUMN     "tenant_id" TEXT;

ALTER TABLE "leave_requests" ADD COLUMN     "tenant_id" TEXT;

ALTER TABLE "okr_objectives" ADD COLUMN     "tenant_id" TEXT;

ALTER TABLE "org_units" ADD COLUMN     "tenant_id" TEXT;

ALTER TABLE "process_instances" ADD COLUMN     "tenant_id" TEXT;

-- Project: thay text field customer bằng FK customer_id
ALTER TABLE "projects" DROP COLUMN IF EXISTS "customer",
ADD COLUMN     "customer_id" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "tenant_id" TEXT;

ALTER TABLE "tasks" ADD COLUMN     "tenant_id" TEXT;

ALTER TABLE "time_entries" ADD COLUMN     "tenant_id" TEXT;

-- CreateIndex: composite unique với tenantId

CREATE UNIQUE INDEX "customers_tenant_id_code_key" ON "customers"("tenant_id", "code");

CREATE UNIQUE INDEX "deals_tenant_id_code_key" ON "deals"("tenant_id", "code");

CREATE UNIQUE INDEX "employees_tenant_id_code_key" ON "employees"("tenant_id", "code");

CREATE UNIQUE INDEX "invoices_tenant_id_code_key" ON "invoices"("tenant_id", "code");

CREATE UNIQUE INDEX "org_units_tenant_id_code_key" ON "org_units"("tenant_id", "code");

CREATE UNIQUE INDEX "projects_tenant_id_code_key" ON "projects"("tenant_id", "code");

-- CreateIndex: index cho tenant_id

CREATE INDEX "allocations_tenant_id_idx" ON "allocations"("tenant_id");
CREATE INDEX "assets_tenant_id_idx" ON "assets"("tenant_id");
CREATE INDEX "bugs_tenant_id_idx" ON "bugs"("tenant_id");
CREATE INDEX "bugs_deleted_at_idx" ON "bugs"("deleted_at");
CREATE INDEX "contacts_tenant_id_idx" ON "contacts"("tenant_id");
CREATE INDEX "contracts_tenant_id_idx" ON "contracts"("tenant_id");
CREATE INDEX "contracts_deleted_at_idx" ON "contracts"("deleted_at");
CREATE INDEX "customers_tenant_id_idx" ON "customers"("tenant_id");
CREATE INDEX "customers_deleted_at_idx" ON "customers"("deleted_at");
CREATE INDEX "deals_tenant_id_idx" ON "deals"("tenant_id");
CREATE INDEX "deals_deleted_at_idx" ON "deals"("deleted_at");
CREATE INDEX "employees_tenant_id_idx" ON "employees"("tenant_id");
CREATE INDEX "employees_deleted_at_idx" ON "employees"("deleted_at");
CREATE INDEX "invoices_tenant_id_idx" ON "invoices"("tenant_id");
CREATE INDEX "invoices_deleted_at_idx" ON "invoices"("deleted_at");
CREATE INDEX "kb_articles_tenant_id_idx" ON "kb_articles"("tenant_id");
CREATE INDEX "leads_tenant_id_idx" ON "leads"("tenant_id");
CREATE INDEX "leave_balances_tenant_id_idx" ON "leave_balances"("tenant_id");
CREATE INDEX "leave_requests_tenant_id_idx" ON "leave_requests"("tenant_id");
CREATE INDEX "okr_objectives_tenant_id_idx" ON "okr_objectives"("tenant_id");
CREATE INDEX "org_units_tenant_id_idx" ON "org_units"("tenant_id");
CREATE INDEX "process_instances_tenant_id_idx" ON "process_instances"("tenant_id");
CREATE INDEX "projects_customer_id_idx" ON "projects"("customer_id");
CREATE INDEX "projects_tenant_id_idx" ON "projects"("tenant_id");
CREATE INDEX "projects_deleted_at_idx" ON "projects"("deleted_at");
CREATE INDEX "tasks_tenant_id_idx" ON "tasks"("tenant_id");
CREATE INDEX "time_entries_tenant_id_idx" ON "time_entries"("tenant_id");

-- AddForeignKey: tenant relations

ALTER TABLE "org_units" ADD CONSTRAINT "org_units_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "projects" ADD CONSTRAINT "projects_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "allocations" ADD CONSTRAINT "allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "process_instances" ADD CONSTRAINT "process_instances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bugs" ADD CONSTRAINT "bugs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contracts" ADD CONSTRAINT "contracts_signed_by_id_fkey" FOREIGN KEY ("signed_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "deals" ADD CONSTRAINT "deals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "okr_objectives" ADD CONSTRAINT "okr_objectives_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kb_articles" ADD CONSTRAINT "kb_articles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
