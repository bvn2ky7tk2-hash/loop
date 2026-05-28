---
id: "15-2"
title: "OrgScopeService — Redis-cached org unit visibility"
status: "done"
epic: 15
story: 2
---

# Story 15.2: OrgScopeService — Redis-Cached Org Unit Visibility

As a backend service,
I want an OrgScopeService that computes each user's visible org unit IDs using a recursive CTE and caches results in Redis,
So that every request is scoped correctly by org hierarchy without repeated DB queries.

## Acceptance Criteria

1. `RedisService` wraps ioredis with `get`, `setex`, `del`, `keys`, `delPattern`
2. `OrgScopeService.getVisibleOrgUnitIds(user)` returns: `null` for ADMIN, `[]` for unassigned, `[id]` for MEMBER, subtree for LEADERSHIP/PM
3. Results cached in Redis at `orgscope:{userId}` with TTL 600s
4. `invalidateUser(userId)` clears single user's cache
5. `invalidateAll()` clears all `orgscope:*` keys
6. `OrgScopeInterceptor` delegates to `OrgScopeService`, sets `req.orgUnitIds`
7. `CommonModule` (@Global) provides and exports `RedisService`, `OrgScopeService`, `OrgScopeInterceptor`
8. `AppModule` imports `CommonModule` and registers `OrgScopeInterceptor` as `APP_INTERCEPTOR`
9. `OrgUnitsService` calls `invalidateAll()` after create/update/remove
10. `UsersService` calls `invalidateUser(id)` after update when `orgUnitId` changed

## Tasks/Subtasks

- [x] Task 1: Create `RedisService` (ioredis wrapper)
  - [x] 1.1 `src/common/services/redis.service.ts`
- [x] Task 2: Create `OrgScopeService` with recursive CTE + Redis cache
  - [x] 2.1 `src/common/services/org-scope.service.ts`
  - [x] 2.2 ADMIN→null, MEMBER→[id], LEADERSHIP/PM→subtree, no orgUnit→[]
- [x] Task 3: Rewrite `OrgScopeInterceptor` to delegate to `OrgScopeService`
  - [x] 3.1 `src/common/guards/org-scope.interceptor.ts`
- [x] Task 4: Create `CommonModule` (@Global)
  - [x] 4.1 `src/common/common.module.ts`
- [x] Task 5: Wire into AppModule + invalidation hooks
  - [x] 5.1 `AppModule` imports `CommonModule`, registers `APP_INTERCEPTOR`
  - [x] 5.2 `OrgUnitsService` calls `invalidateAll()` on create/update/remove
  - [x] 5.3 `UsersService` calls `invalidateUser(id)` on update when orgUnitId changes

## Dev Notes

- `CommonModule` is `@Global()` so no need to import in each feature module
- Redis connection is lazy (`lazyConnect: true`) — no crash if Redis unavailable
- Cache errors are silenced with `.catch(() => null)` — fail-open strategy
- Subtree via recursive CTE in PostgreSQL, avoids loading all org units to memory

## Dev Agent Record

### Completion Notes
- RedisService: ioredis wrapper, lazyConnect, host/port via env
- OrgScopeService: ADMIN→null, MEMBER→[orgUnitId], LEADERSHIP/PM→subtree CTE, cache TTL 600s
- OrgScopeInterceptor rewritten to use OrgScopeService (fixed 3 bugs from original)
- CommonModule @Global, PrismaModule imported
- AppModule: APP_INTERCEPTOR = OrgScopeInterceptor (global)
- OrgUnitsService: invalidateAll() after create/update/remove
- UsersService: invalidateUser(id) after update with orgUnitId change
- TypeScript check: no new errors (only pre-existing throttler + tasks.controller issues)

## File List
- apps/backend/src/common/services/redis.service.ts (new)
- apps/backend/src/common/services/org-scope.service.ts (new)
- apps/backend/src/common/guards/org-scope.interceptor.ts (updated)
- apps/backend/src/common/common.module.ts (new)
- apps/backend/src/app.module.ts (updated)
- apps/backend/src/org-units/org-units.service.ts (updated)
- apps/backend/src/users/users.service.ts (updated)

## Change Log
- 2026-05-27: Story 15.2 complete — OrgScopeService with Redis cache, CommonModule @Global, invalidation hooks
