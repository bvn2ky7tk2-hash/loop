-- Go-live hardening (P1 perf): composite index dẫn đầu tenant_id cho list lọc theo tenant.
-- Đã có trong schema.prisma (@@index); file này để áp THỦ CÔNG lên production an toàn.
-- CONCURRENTLY: không khóa bảng khi tạo (chạy NGOÀI transaction; psql tự autocommit từng câu).
-- Idempotent: IF NOT EXISTS — chạy lại nhiều lần vô hại.
--
-- Cách chạy: psql "$DATABASE_URL" -f prisma/scripts/golive-composite-indexes.sql

CREATE INDEX CONCURRENTLY IF NOT EXISTS bugs_tenant_id_status_idx ON bugs(tenant_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS payroll_records_tenant_id_period_id_idx ON payroll_records(tenant_id, period_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS contracts_tenant_id_status_idx ON contracts(tenant_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS invoices_tenant_id_status_idx ON invoices(tenant_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS deals_tenant_id_stage_idx ON deals(tenant_id, stage);
CREATE INDEX CONCURRENTLY IF NOT EXISTS process_instances_tenant_id_status_idx ON process_instances(tenant_id, status);
