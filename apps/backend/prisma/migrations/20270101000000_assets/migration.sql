-- Enums
CREATE TYPE "asset_category" AS ENUM ('LAPTOP','DESKTOP','PHONE','SERVER','PERIPHERAL','SOFTWARE','FURNITURE','VEHICLE','OTHER');
CREATE TYPE "asset_status"   AS ENUM ('AVAILABLE','ASSIGNED','UNDER_MAINTENANCE','RETIRED');

-- Tables
CREATE TABLE "assets" (
  "id"                  UUID        NOT NULL DEFAULT gen_random_uuid(),
  "code"                VARCHAR(50) NOT NULL,
  "name"                VARCHAR(200) NOT NULL,
  "category"            "asset_category" NOT NULL,
  "brand"               VARCHAR(100),
  "model"               VARCHAR(100),
  "serial_number"       VARCHAR(100),
  "org_unit_id"         UUID REFERENCES "org_units"("id") ON DELETE SET NULL,
  "status"              "asset_status" NOT NULL DEFAULT 'AVAILABLE',
  "purchase_date"       DATE,
  "purchase_price"      DECIMAL(18,2),
  "depreciation_years"  INT,
  "notes"               TEXT,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assets_code_key" UNIQUE ("code")
);

CREATE TABLE "asset_assignments" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "asset_id"     UUID        NOT NULL REFERENCES "assets"("id") ON DELETE CASCADE,
  "employee_id"  UUID        NOT NULL REFERENCES "employees"("id") ON DELETE RESTRICT,
  "assigned_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "returned_at"  TIMESTAMPTZ,
  "notes"        TEXT,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "asset_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "asset_maintenance" (
  "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
  "asset_id"      UUID         NOT NULL REFERENCES "assets"("id") ON DELETE CASCADE,
  "type"          VARCHAR(50)  NOT NULL,
  "performed_at"  DATE         NOT NULL,
  "cost"          DECIMAL(18,2),
  "performed_by"  VARCHAR(200),
  "notes"         TEXT,
  "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT "asset_maintenance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_assets_org_status"              ON "assets"("org_unit_id","status");
CREATE INDEX "idx_asset_assignments_asset_id"     ON "asset_assignments"("asset_id");
CREATE INDEX "idx_asset_assignments_employee_id"  ON "asset_assignments"("employee_id");
CREATE INDEX "asset_maintenance_asset_id_idx"     ON "asset_maintenance"("asset_id");

INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count")
VALUES (gen_random_uuid(),'asset_migration_checksum',NOW(),'20270101000000_assets',NULL,NULL,NOW(),1);
