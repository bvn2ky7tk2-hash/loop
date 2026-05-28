---
id: "15-5"
title: "Retrofit existing API controllers with @RequirePermission"
status: "done"
epic: 15
story: 5
---

# Story 15.5: Retrofit Existing API Controllers

## Acceptance Criteria
1. All feature endpoints have `@RequirePermission` decorator matching domain
2. Services accept `orgUnitIds: string[] | null` (null = ADMIN, no filter; [] = unassigned, nothing visible)
3. Controllers pass `req.orgUnitIds` without `?? []` conversion
4. No redundant `@UseInterceptors(OrgScopeInterceptor)` on controllers (removed from bugs, processes)

## Tasks/Subtasks
- [x] Fix service signatures: projects, users, employees, timesheet, process-instances
- [x] Add @RequirePermission to: projects, tasks, org-units, users, employees, reports, timesheet, alerts, dashboard, cost, bugs controllers
- [x] Remove duplicate OrgScopeInterceptor from bugs, process-definitions, process-instances controllers

## File List
- apps/backend/src/projects/projects.controller.ts (updated)
- apps/backend/src/projects/projects.service.ts (updated)
- apps/backend/src/tasks/tasks.controller.ts (updated)
- apps/backend/src/org-units/org-units.controller.ts (updated)
- apps/backend/src/users/users.controller.ts (updated)
- apps/backend/src/users/users.service.ts (updated)
- apps/backend/src/employees/employees.controller.ts (updated)
- apps/backend/src/employees/employees.service.ts (updated)
- apps/backend/src/reports/reports.controller.ts (updated)
- apps/backend/src/timesheet/timesheet.controller.ts (updated)
- apps/backend/src/timesheet/timesheet.service.ts (updated)
- apps/backend/src/alerts/alerts.controller.ts (updated)
- apps/backend/src/dashboard/dashboard.controller.ts (updated)
- apps/backend/src/cost/cost.controller.ts (updated)
- apps/backend/src/bugs/bugs.controller.ts (updated)
- apps/backend/src/processes/definitions/process-definitions.controller.ts (updated)
- apps/backend/src/processes/instances/process-instances.controller.ts (updated)
- apps/backend/src/processes/instances/process-instances.service.ts (updated)

## Change Log
- 2026-05-27: Story 15.5 complete — all controllers retrofitted, null-aware orgUnitIds
