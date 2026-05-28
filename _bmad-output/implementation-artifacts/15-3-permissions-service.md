---
id: "15-3"
title: "PermissionsService — Effective Permission Computation"
status: "done"
epic: 15
story: 3
---

# Story 15.3: PermissionsService — Effective Permission Computation

As a backend service,
I want a PermissionsService that computes a user's effective permissions from 3 sources and caches the result in Redis,
So that every guard call is fast and correct.

## Acceptance Criteria

1. `getEffectivePermissions(userId)` returns `Set<string>` of all active permission codes
2. 3-source merge: Track1 (system role) + Track2 (module roles) + Track3 (user overrides)
3. User override with `granted=false` removes a code from the effective set
4. Results cached at `perm:{userId}` TTL 300s
5. `userHasPermission(userId, code)` returns boolean
6. `invalidateUser(userId)` and `invalidateAll()` clear the cache

## Tasks/Subtasks

- [x] Task 1: Create `PermissionsService`
  - [x] 1.1 `src/permissions/permissions.service.ts`
  - [x] 1.2 Query role_permissions, module_role_permissions, user_permissions
  - [x] 1.3 Redis cache perm:{userId} TTL 300s
- [x] Task 2: Register in CommonModule
  - [x] 2.1 Add to providers + exports in `common.module.ts`

## Dev Notes

- No CASL — custom Set-based computation
- Module role query: `moduleRolePermission WHERE role.userRoles.some({userId})`
- Cache fail-open: errors swallowed, always recomputes on Redis failure

## Dev Agent Record

### Completion Notes
- PermissionsService: 3-source merge, Redis TTL 300s, invalidateUser/All
- Added to CommonModule providers + exports
- TypeScript: no new errors

## File List
- apps/backend/src/permissions/permissions.service.ts (new)
- apps/backend/src/common/common.module.ts (updated)

## Change Log
- 2026-05-27: Story 15.3 complete — PermissionsService with 3-source merge + Redis cache
