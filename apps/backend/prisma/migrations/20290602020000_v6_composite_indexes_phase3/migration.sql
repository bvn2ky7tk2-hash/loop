-- CreateIndex
CREATE INDEX "expenses_tenant_id_status_created_at_idx" ON "expenses"("tenant_id", "status", "created_at");
-- CreateIndex
CREATE INDEX "leave_requests_tenant_id_status_start_date_idx" ON "leave_requests"("tenant_id", "status", "start_date");
-- CreateIndex
CREATE INDEX "leave_requests_tenant_id_employee_id_idx" ON "leave_requests"("tenant_id", "employee_id");
-- CreateIndex
CREATE INDEX "time_entries_tenant_id_date_idx" ON "time_entries"("tenant_id", "date");
-- CreateIndex
CREATE INDEX "time_logs_tenant_id_log_date_idx" ON "time_logs"("tenant_id", "log_date");
-- CreateIndex
CREATE INDEX "time_logs_tenant_id_user_id_log_date_idx" ON "time_logs"("tenant_id", "user_id", "log_date");
