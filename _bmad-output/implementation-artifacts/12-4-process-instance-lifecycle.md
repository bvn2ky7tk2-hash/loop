# Story 12.4: Process Instance Lifecycle

Status: done

## Story

As a user,
Tôi muốn khởi động, giám sát và huỷ process instances,
Để theo dõi tiến trình thực hiện quy trình.

## Acceptance Criteria

1. `POST /api/v1/processes/instances` khởi động instance mới từ definition ACTIVE. Gọi BpmnEngineService.start() và lưu tokenState.
2. `GET /api/v1/processes/instances` danh sách với filter theo definitionId, status.
3. `GET /api/v1/processes/instances/:id` chi tiết instance kèm userTasks.
4. `PATCH /api/v1/processes/instances/:id/cancel` huỷ instance, set user tasks PENDING/IN_PROGRESS → SKIPPED.
5. `GET /api/v1/processes/instances/:id/activity-log` lịch sử hoạt động.
6. Chỉ khởi động được definition có status=ACTIVE.
7. Link optional với Project qua `projectId`.

## Tasks / Subtasks

- [x] Task 1: DTO
  - [x] `dto/start-instance.dto.ts` — definitionId, projectId?, variables?

- [x] Task 2: ProcessInstancesService
  - [x] `findAll()` — filter + pagination
  - [x] `findOne()` — include definition, userTasks
  - [x] `start()` — validate ACTIVE status, create record, call engine, save tokenState
  - [x] `cancel()` — validate state, update tasks SKIPPED, create activity log
  - [x] `getActivityLog()` — ordered by startedAt

- [x] Task 3: ProcessInstancesController
  - [x] 5 endpoints theo spec
  - [x] JwtAuthGuard

- [x] Task 4: ProcessInstancesModule
  - [x] Import NotificationsModule
  - [x] Provide BpmnEngineService

## File Structure

```
src/processes/instances/
├── dto/
│   └── start-instance.dto.ts
├── process-instances.controller.ts
├── process-instances.service.ts
└── process-instances.module.ts
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### File List

- `apps/backend/src/processes/instances/dto/start-instance.dto.ts` (new)
- `apps/backend/src/processes/instances/process-instances.service.ts` (new)
- `apps/backend/src/processes/instances/process-instances.controller.ts` (new)
- `apps/backend/src/processes/instances/process-instances.module.ts` (new)

## Change Log

| Date | Change |
|------|--------|
| 2026-05-26 | Story implemented — tsc --noEmit passes |
