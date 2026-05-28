---
id: "15-9"
title: "/auth/me returns permissions[] + moduleRoles[]"
status: "done"
epic: 15
story: 9
---

# Story 15.9: /auth/me — Include Permissions in Profile

## Acceptance Criteria
1. `GET /auth/me` returns: `id`, `name`, `email`, `role`, `permissions: string[]`, `moduleRoles: string[]`
2. `permissions` = effective permission codes (via PermissionsService, cached in Redis)
3. `moduleRoles` = list of assigned module role codes

## File List
- apps/backend/src/permissions/permissions.service.ts (updated — added getUserModuleRoleCodes)
- apps/backend/src/auth/auth.controller.ts (updated — me() async, returns permissions + moduleRoles)

## Change Log
- 2026-05-27: Story 15.9 complete — /auth/me enriched with permissions and moduleRoles
