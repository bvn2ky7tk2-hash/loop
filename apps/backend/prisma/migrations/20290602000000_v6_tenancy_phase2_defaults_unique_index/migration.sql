-- DropIndex
DROP INDEX "assets_code_key";
-- DropIndex
DROP INDEX "kb_articles_slug_key";
-- AlterTable
ALTER TABLE "allocations" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "api_keys" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "asset_disposals" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "asset_transfers" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "assets" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "attendance_explanations" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "bugs" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "candidates" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "client_contracts" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "comments" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "contacts" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "contracts" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "crm_activities" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "customer_portals" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "customer_survey_schedules" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "deals" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "delegation_rules" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "education_records" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "email_logs" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "employees" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "family_members" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "insurance_configs" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "interviews" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "invoice_account_mappings" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "invoices" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "job_openings" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "kb_articles" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "lead_follow_up_schedules" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "leads" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "leave_balances" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "leave_requests" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "notification_templates" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "okr_objectives" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "org_units" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "payroll_periods" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "payroll_records" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "performance_bonus_configs" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "performance_bonuses" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "previous_work_experiences" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "process_definitions" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "process_instances" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "project_journals" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "projects" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "purchase_orders" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "salary_columns" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "saved_reports" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "system_announcements" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "tax_brackets" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "tax_deduction_configs" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "time_entries" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "users" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "vendors" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- AlterTable
ALTER TABLE "wage_zone_configs" ALTER COLUMN "tenant_id" SET DEFAULT 'loop-default-tenant-001';
-- CreateIndex
CREATE UNIQUE INDEX "assets_tenant_id_code_key" ON "assets"("tenant_id", "code");
-- CreateIndex
CREATE INDEX "attendance_records_tenant_id_date_status_idx" ON "attendance_records"("tenant_id", "date", "status");
-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at");
-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_entity_entity_id_idx" ON "audit_logs"("tenant_id", "entity", "entity_id");
-- CreateIndex
CREATE UNIQUE INDEX "kb_articles_tenant_id_slug_key" ON "kb_articles"("tenant_id", "slug");
-- CreateIndex
CREATE INDEX "notifications_tenant_id_user_id_is_read_created_at_idx" ON "notifications"("tenant_id", "user_id", "is_read", "created_at");
-- CreateIndex
CREATE INDEX "tasks_tenant_id_project_id_status_idx" ON "tasks"("tenant_id", "project_id", "status");
-- CreateIndex
CREATE INDEX "tasks_tenant_id_assignee_id_status_idx" ON "tasks"("tenant_id", "assignee_id", "status");
-- CreateIndex
CREATE INDEX "tasks_tenant_id_due_date_idx" ON "tasks"("tenant_id", "due_date");
