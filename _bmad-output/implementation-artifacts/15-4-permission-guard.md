---
id: "15-4"
title: "PermissionGuard + @RequirePermission Decorator"
status: "done"
epic: 15
story: 4
---

# Story 15.4: PermissionGuard + @RequirePermission Decorator

As a backend service,
I want a global PermissionGuard that checks `@RequirePermission(code)` on any handler and blocks unauthorized requests with 403,
So that permission enforcement is declarative and consistent across all endpoints.

## Acceptance Criteria

1. `@RequirePermission(code)` decorator sets metadata on handler or class
2. `PermissionGuard` skips public endpoints (`@Public()`)
3. Guard skips if no `@RequirePermission` present (open to authenticated users)
4. Guard calls `PermissionsService.userHasPermission(user.id, code)` 
5. Returns 403 ForbiddenException with Vietnamese message if denied
6. Registered globally as `APP_GUARD` in `AppModule`

## Tasks/Subtasks

- [x] Task 1: Create `@RequirePermission` decorator
  - [x] 1.1 `src/common/decorators/require-permission.decorator.ts`
- [x] Task 2: Create `PermissionGuard`
  - [x] 2.1 `src/common/guards/permission.guard.ts`
  - [x] 2.2 Reflector reads PERMISSION_KEY metadata
  - [x] 2.3 403 ForbiddenException on denial
- [x] Task 3: Register as APP_GUARD in AppModule

## Dev Notes

- Guard order: ThrottlerGuard → PermissionGuard (both APP_GUARD, applied in registration order)
- `@RequirePermission` uses `PermissionCode` type for type safety
- Public routes skip all checks (no user, no permission check)

## Dev Agent Record

### Completion Notes
- @RequirePermission decorator with PermissionCode type
- PermissionGuard: skip Public, skip no-metadata, check via PermissionsService
- Registered as APP_GUARD in AppModule
- TypeScript: no new errors

## File List
- apps/backend/src/common/decorators/require-permission.decorator.ts (new)
- apps/backend/src/common/guards/permission.guard.ts (new)
- apps/backend/src/app.module.ts (updated)

## Change Log
- 2026-05-27: Story 15.4 complete — PermissionGuard + @RequirePermission decorator
