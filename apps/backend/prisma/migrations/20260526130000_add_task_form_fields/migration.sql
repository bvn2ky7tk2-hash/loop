-- AddColumn: task_form_fields on process_definitions
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'process_definitions') THEN
    ALTER TABLE "process_definitions" ADD COLUMN IF NOT EXISTS "task_form_fields" JSONB;
  END IF;
END
$$;
