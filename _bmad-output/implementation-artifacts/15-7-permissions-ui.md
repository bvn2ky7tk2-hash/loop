---
id: "15-7"
title: "Admin UI — PermissionsPage (3 tabs)"
status: "done"
epic: 15
story: 7
---

# Story 15.7: Admin UI — 3-tab PermissionsPage

## Acceptance Criteria
1. PermissionsPage at `/permissions` with 3 tabs
2. Tab 1: System Roles — table of 4 roles, click to open checkbox modal for permission assignment
3. Tab 2: Module Roles — CRUD module roles, assign permissions per role
4. Tab 3: User Overrides — select user, see effective permissions, add/remove overrides
5. Menu item "Phân quyền" under System group in AppSidebar

## File List
- apps/web/src/api/permissions.ts (new)
- apps/web/src/pages/permissions/PermissionsPage.tsx (new)
- apps/web/src/router.tsx (updated)
- apps/web/src/components/layout/AppSidebar.tsx (updated)

## Change Log
- 2026-05-27: Story 15.7 complete — PermissionsPage with 3 tabs, sidebar menu
