-- Migration: Add screens registry table and new permission codes
-- screens table: synced from screens.registry.ts, admin read-only
-- New permissions: finance, leaves, contracts, admin:settings

CREATE TABLE "screens" (
  "id"         VARCHAR(36)  NOT NULL,
  "module"     TEXT         NOT NULL,
  "route"      TEXT         NOT NULL,
  "label"      TEXT         NOT NULL,
  "icon"       TEXT,
  "perm_code"  TEXT,
  "sort_order" INTEGER      NOT NULL DEFAULT 0,
  "is_active"  BOOLEAN      NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "screens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "screens_route_key" UNIQUE ("route"),
  CONSTRAINT "screens_perm_code_fkey"
    FOREIGN KEY ("perm_code") REFERENCES "permissions"("code") ON DELETE SET NULL
);

-- updatedAt trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER screens_updated_at
  BEFORE UPDATE ON "screens"
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
