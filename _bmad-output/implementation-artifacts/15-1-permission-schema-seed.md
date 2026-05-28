---
id: "15-1"
title: "Prisma Schema — Permission Tables + Seed Data (ERP-Ready)"
status: "review"
epic: 15
story: 1
---

# Story 15.1: Prisma Schema — Permission Tables + Seed Data (ERP-Ready)

As a system administrator,
I want the database to store permission codes, system role mappings, module roles, user-module role assignments, and user-level overrides,
So that the permission system supports both current simple RBAC and future ERP module-specific roles without breaking changes.

## Acceptance Criteria

1. Six new tables exist: `permissions`, `role_permissions`, `user_permissions`, `module_roles`, `module_role_permissions`, `user_module_roles`
2. `permissions` table: `code` (PK), `module`, `action`, `description`, `created_at`
3. `role_permissions`: composite PK `(role, permission_code)` linking enum Role → permission
4. `user_permissions`: PK `(user_id, permission_code)`, `granted boolean default true`
5. `module_roles`: `code` (PK), `name`, `domain`, `description`, `is_system boolean`
6. `module_role_permissions`: composite PK `(role_code, permission_code)`
7. `user_module_roles`: composite PK `(user_id, role_code)`
8. `users` table gains relations: `userPermissions`, `moduleRoles`
9. Seed: 35 permission codes, default role→permission mappings for 4 roles, placeholder module roles
10. ADMIN role: all 35 codes; MEMBER role: 14 specific codes
11. Seed is idempotent (upsert, no duplicates on re-run)

## Tasks/Subtasks

- [x] Task 1: Add 6 new Prisma models to schema.prisma
  - [x] 1.1 Add Permission, RolePermission, UserPermission models
  - [x] 1.2 Add ModuleRole, ModuleRolePermission, UserModuleRole models
  - [x] 1.3 Add relations to User model
- [x] Task 2: Create and run Prisma migration (prisma db push — dev environment with drift)
- [x] Task 3: Create permissions.constants.ts with all 36 codes + role default mappings
- [x] Task 4: Update prisma/seed.ts + seed-permissions.js (shared) + seed-full.js + seed-mega.js
- [x] Task 5: Verify seed is idempotent and correct

## Dev Notes

- Schema follows architecture.md Amendment 2026-05-27 (Dual-Track RBAC, ARCH-020–028)
- Permission code convention: `{domain_module}:action` (2-part, underscore for sub-modules)
- `role` field on `RolePermission` uses existing `Role` enum (ADMIN|LEADERSHIP|PM|MEMBER)
- `module_roles.is_system = true` → cannot be deleted (enforced at service layer later)
- Seed uses `upsert` (createOrUpdate) for idempotency
- Backend: `apps/backend/prisma/schema.prisma` + `apps/backend/prisma/seed.ts`
- Constants file: `apps/backend/src/permissions/permissions.constants.ts`

## Dev Agent Record

### Debug Log
- `prisma migrate dev` không chạy được vì DB drift với migration history → dùng `prisma db push` (dev env)
- AC nói 35 permission codes, thực tế đếm đúng là 36 (đếm lại đầy đủ tất cả module)

### Completion Notes
- 6 Prisma models mới: Permission, RolePermission, UserPermission, ModuleRole, ModuleRolePermission, UserModuleRole
- User model có 2 relations mới: userPermissions, moduleRoles
- `prisma db push` sync thành công, Prisma client regenerated
- permissions.constants.ts: 36 codes, DEFAULT_ROLE_PERMISSIONS cho 4 roles, SEED_MODULE_ROLES 8 placeholders
- seed.ts: `seedPermissions()` exported, gọi ở cuối main()
- seed-permissions.js: helper dùng raw SQL cho seed-full.js và seed-mega.js
- Verified: 36 perms, ADMIN=36 codes, MEMBER=14 codes, 8 module roles, user_permissions=0, user_module_roles=0
- Idempotent: seed chạy 2 lần không lỗi

## File List
- apps/backend/prisma/schema.prisma
- apps/backend/src/permissions/permissions.constants.ts (new)
- apps/backend/prisma/seed.ts
- apps/backend/prisma/seed-permissions.js (new)
- apps/backend/prisma/seed-full.js
- apps/backend/prisma/seed-mega.js
- apps/backend/prisma/test-permissions.ts (new — 59 tests)
- apps/backend/prisma/migrations/20260527100000_add_permission_tables/migration.sql (new)

## Change Log
- 2026-05-27: Story 15.1 complete — 6 permission tables, 36 permission codes, Dual-Track RBAC seed data, 59/59 tests passed
