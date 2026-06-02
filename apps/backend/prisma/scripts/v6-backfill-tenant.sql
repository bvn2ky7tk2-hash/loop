DO $$
DECLARE r record; n bigint; total bigint := 0;
BEGIN
  FOR r IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema='public' AND column_name='tenant_id'
    ORDER BY table_name
  LOOP
    EXECUTE format('UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL', r.table_name, 'loop-default-tenant-001');
    GET DIAGNOSTICS n = ROW_COUNT;
    total := total + n;
    IF n > 0 THEN RAISE NOTICE '% : % rows', r.table_name, n; END IF;
  END LOOP;
  RAISE NOTICE 'TOTAL backfilled: %', total;
END $$;
