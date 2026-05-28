-- Migration: Process Workflow Integration
-- Links Leave requests and Expenses to BPM process instances for configurable approval flows

-- Add unique process key to process definitions (admin-assigned, e.g. 'leave-approval')
ALTER TABLE "process_definitions" ADD COLUMN "key" VARCHAR(100);
CREATE UNIQUE INDEX "process_definitions_key_key" ON "process_definitions"("key");

-- Add process definition key to leave types (per-type approval flow config)
ALTER TABLE "leave_types" ADD COLUMN "process_definition_key" VARCHAR(100);

-- Add process instance FK to leave requests
ALTER TABLE "leave_requests" ADD COLUMN "process_instance_id" UUID;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_process_instance_id_fkey"
  FOREIGN KEY ("process_instance_id") REFERENCES "process_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "leave_requests_process_instance_id_idx" ON "leave_requests"("process_instance_id");

-- Add process instance FK to expenses
ALTER TABLE "expenses" ADD COLUMN "process_instance_id" UUID;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_process_instance_id_fkey"
  FOREIGN KEY ("process_instance_id") REFERENCES "process_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "expenses_process_instance_id_idx" ON "expenses"("process_instance_id");
