-- Epic 15: Authorization & Permission Management (Dual-Track RBAC)
-- Migration: add_permission_tables

-- ─── Track 1: System Role permissions ────────────────────────────────────────

CREATE TABLE "permissions" (
    "code"        TEXT NOT NULL,
    "module"      TEXT NOT NULL,
    "action"      TEXT NOT NULL,
    "description" TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "role_permissions" (
    "role"             "Role" NOT NULL,
    "permission_code"  TEXT NOT NULL,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role", "permission_code")
);

CREATE TABLE "user_permissions" (
    "user_id"          TEXT NOT NULL,
    "permission_code"  TEXT NOT NULL,
    "granted"          BOOLEAN NOT NULL DEFAULT true,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("user_id", "permission_code")
);

-- ─── Track 2: DB-driven module roles (ERP-ready) ─────────────────────────────

CREATE TABLE "module_roles" (
    "code"        TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "domain"      TEXT NOT NULL,
    "description" TEXT,
    "is_system"   BOOLEAN NOT NULL DEFAULT false,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "module_roles_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "module_role_permissions" (
    "role_code"        TEXT NOT NULL,
    "permission_code"  TEXT NOT NULL,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "module_role_permissions_pkey" PRIMARY KEY ("role_code", "permission_code")
);

CREATE TABLE "user_module_roles" (
    "user_id"     TEXT NOT NULL,
    "role_code"   TEXT NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_module_roles_pkey" PRIMARY KEY ("user_id", "role_code")
);

-- ─── Foreign Keys ─────────────────────────────────────────────────────────────

ALTER TABLE "role_permissions"
    ADD CONSTRAINT "role_permissions_permission_code_fkey"
    FOREIGN KEY ("permission_code") REFERENCES "permissions"("code") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_permissions"
    ADD CONSTRAINT "user_permissions_permission_code_fkey"
    FOREIGN KEY ("permission_code") REFERENCES "permissions"("code") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "module_role_permissions"
    ADD CONSTRAINT "module_role_permissions_role_code_fkey"
    FOREIGN KEY ("role_code") REFERENCES "module_roles"("code") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "module_role_permissions"
    ADD CONSTRAINT "module_role_permissions_permission_code_fkey"
    FOREIGN KEY ("permission_code") REFERENCES "permissions"("code") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_module_roles"
    ADD CONSTRAINT "user_module_roles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_module_roles"
    ADD CONSTRAINT "user_module_roles_role_code_fkey"
    FOREIGN KEY ("role_code") REFERENCES "module_roles"("code") ON DELETE CASCADE ON UPDATE CASCADE;
