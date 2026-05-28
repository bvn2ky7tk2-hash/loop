---
id: "15-6"
title: "Permissions Admin API"
status: "done"
epic: 15
story: 6
---

# Story 15.6: Permissions Admin API

## Acceptance Criteria
1. `GET /api/v1/admin/permissions` — list all 36 permission codes
2. `GET/PUT /api/v1/admin/permissions/roles/:role` — read/replace system role permissions
3. `GET/POST/DELETE /api/v1/admin/permissions/module-roles` — CRUD module roles
4. `GET/PUT /api/v1/admin/permissions/module-roles/:roleCode/permissions` — set module role perms
5. `GET/POST/DELETE /api/v1/admin/permissions/users/:userId/module-roles` — assign/revoke
6. `GET/PUT/DELETE /api/v1/admin/permissions/users/:userId/overrides` — user-level overrides
7. `GET /api/v1/admin/permissions/users/:userId/effective` — effective permission set
8. All endpoints require `ADMIN_PERMISSIONS` permission
9. isSystem=true module roles cannot be deleted

## Tasks/Subtasks
- [x] Task 1: Create DTOs
  - [x] `src/permissions/dto/permissions-admin.dto.ts`
- [x] Task 2: Create `PermissionsAdminService`
  - [x] `src/permissions/permissions-admin.service.ts`
- [x] Task 3: Create `PermissionsController`
  - [x] `src/permissions/permissions.controller.ts`
- [x] Task 4: Create `PermissionsModule`, register in AppModule

## File List
- apps/backend/src/permissions/dto/permissions-admin.dto.ts (new)
- apps/backend/src/permissions/permissions-admin.service.ts (new)
- apps/backend/src/permissions/permissions.controller.ts (new)
- apps/backend/src/permissions/permissions.module.ts (new)
- apps/backend/src/app.module.ts (updated)

## Change Log
- 2026-05-27: Story 15.6 complete — Permissions Admin API with 17 endpoints
