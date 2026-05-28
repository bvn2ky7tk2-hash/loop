---
id: "15-8"
title: "Frontend Permission Gate — usePermissions() + <CanDo>"
status: "done"
epic: 15
story: 8
---

# Story 15.8: Frontend Permission Gate

## Acceptance Criteria
1. `UserProfile` in auth store includes `permissions: string[]` and `moduleRoles: string[]`
2. `usePermissions()` hook returns `can(code)`, `canAny(...codes)`, `canAll(...codes)`, `hasRole(r)`, `hasModuleRole(code)`
3. `<CanDo permission="...">` renders children only if user has the permission
4. `<CanDo anyOf={[...]}` and `allOf={[...]}` variants supported
5. `fallback` prop for alternative content when denied

## File List
- apps/web/src/store/auth.store.ts (updated — added permissions, moduleRoles)
- apps/web/src/hooks/usePermissions.ts (new)
- apps/web/src/components/common/CanDo.tsx (new)

## Change Log
- 2026-05-27: Story 15.8 complete — usePermissions hook + CanDo component
