ALTER TABLE "journal_lines" DROP CONSTRAINT IF EXISTS "journal_lines_account_code_fkey";
DO $$
DECLARE nm text; r record;
BEGIN
  FOREACH nm IN ARRAY ARRAY['allowance_types_name_key','automation_rules_key_key','bonus_types_name_key','chart_of_accounts_code_key','holiday_calendars_date_key','hr_decisions_decision_number_key','job_titles_code_key','leave_types_name_key','module_configs_module_id_key','performance_reviews_employee_id_period_key','positions_code_key','project_cost_snapshots_project_id_snapshot_date_key','revenue_targets_period_period_type_key','skills_name_key','social_insurance_books_book_number_key','user_groups_name_key','vehicles_plate_number_key','work_shifts_code_key'] LOOP
    FOR r IN SELECT conrelid::regclass AS tbl FROM pg_constraint WHERE conname = nm LOOP
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, nm);
    END LOOP;
    EXECUTE format('DROP INDEX IF EXISTS %I', nm);
  END LOOP;
END $$;
CREATE UNIQUE INDEX "allowance_types_tenant_id_name_key" ON "allowance_types"("tenant_id", "name");
CREATE UNIQUE INDEX "automation_rules_tenant_id_key_key" ON "automation_rules"("tenant_id", "key");
CREATE UNIQUE INDEX "bonus_types_tenant_id_name_key" ON "bonus_types"("tenant_id", "name");
CREATE UNIQUE INDEX "chart_of_accounts_tenant_id_code_key" ON "chart_of_accounts"("tenant_id", "code");
CREATE UNIQUE INDEX "holiday_calendars_tenant_id_date_key" ON "holiday_calendars"("tenant_id", "date");
CREATE UNIQUE INDEX "hr_decisions_tenant_id_decision_number_key" ON "hr_decisions"("tenant_id", "decision_number");
CREATE UNIQUE INDEX "job_titles_tenant_id_code_key" ON "job_titles"("tenant_id", "code");
CREATE UNIQUE INDEX "leave_types_tenant_id_name_key" ON "leave_types"("tenant_id", "name");
CREATE UNIQUE INDEX "module_configs_tenant_id_module_id_key" ON "module_configs"("tenant_id", "module_id");
CREATE UNIQUE INDEX "performance_reviews_tenant_id_employee_id_period_key" ON "performance_reviews"("tenant_id", "employee_id", "period");
CREATE UNIQUE INDEX "positions_tenant_id_code_key" ON "positions"("tenant_id", "code");
CREATE UNIQUE INDEX "project_cost_snapshots_tenant_id_project_id_snapshot_date_key" ON "project_cost_snapshots"("tenant_id", "project_id", "snapshot_date");
CREATE UNIQUE INDEX "revenue_targets_tenant_id_period_period_type_key" ON "revenue_targets"("tenant_id", "period", "period_type");
CREATE UNIQUE INDEX "skills_tenant_id_name_key" ON "skills"("tenant_id", "name");
CREATE UNIQUE INDEX "social_insurance_books_tenant_id_book_number_key" ON "social_insurance_books"("tenant_id", "book_number");
CREATE UNIQUE INDEX "telegram_configs_tenant_id_key" ON "telegram_configs"("tenant_id");
CREATE UNIQUE INDEX "user_groups_tenant_id_name_key" ON "user_groups"("tenant_id", "name");
CREATE UNIQUE INDEX "vehicles_tenant_id_plate_number_key" ON "vehicles"("tenant_id", "plate_number");
CREATE UNIQUE INDEX "work_shifts_tenant_id_code_key" ON "work_shifts"("tenant_id", "code");
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_tenant_id_account_code_fkey" FOREIGN KEY ("tenant_id", "account_code") REFERENCES "chart_of_accounts"("tenant_id", "code") ON DELETE RESTRICT ON UPDATE CASCADE;
