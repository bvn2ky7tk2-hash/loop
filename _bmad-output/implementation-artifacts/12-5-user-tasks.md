# Story 12.5: User Tasks

Status: done

## Story

As a user,
Tôi muốn xem, nhận và xử lý các user task được giao,
Để có thể tham gia vào quy trình theo đúng vai trò.

## Acceptance Criteria

1. `GET /api/v1/processes/user-tasks` inbox của user hiện tại (filter theo assigneeId=userId).
2. `GET /api/v1/processes/user-tasks/:id` chi tiết task.
3. `PATCH /api/v1/processes/user-tasks/:id/claim` nhận task PENDING → IN_PROGRESS, gán assigneeId=userId.
4. `POST /api/v1/processes/user-tasks/:id/complete` hoàn thành task, tiếp tục engine execution, ghi activity log.
5. `POST /api/v1/processes/user-tasks/:id/return` trả lại task IN_PROGRESS → PENDING, xóa assigneeId.
6. Chỉ assignee hiện tại mới có thể complete/return task.
7. Notification `PROCESS_TASK_ASSIGNED` gửi khi task được tạo với assigneeId.

## Tasks / Subtasks

- [x] Task 1: DTOs
  - [x] `dto/complete-task.dto.ts` — variables?
  - [x] `dto/return-task.dto.ts` — reason?

- [x] Task 2: ProcessUserTasksService
  - [x] `findAll(userId, page, pageSize, instanceId)` — filter theo assigneeId
  - [x] `findOne(id)` — include instance, assignee
  - [x] `claim(id, userId)` — validate PENDING, không clash với assignee khác
  - [x] `complete(id, userId, dto)` — update status, ghi log, call engineService.completeUserTask()
  - [x] `returnTask(id, userId, dto)` — validate IN_PROGRESS + ownership, reset

- [x] Task 3: ProcessUserTasksController
  - [x] 5 endpoints

- [x] Task 4: ProcessUserTasksModule

## File Structure

```
src/processes/user-tasks/
├── dto/
│   ├── complete-task.dto.ts
│   └── return-task.dto.ts
├── process-user-tasks.controller.ts
├── process-user-tasks.service.ts
└── process-user-tasks.module.ts
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### File List

- `apps/backend/src/processes/user-tasks/dto/complete-task.dto.ts` (new)
- `apps/backend/src/processes/user-tasks/dto/return-task.dto.ts` (new)
- `apps/backend/src/processes/user-tasks/process-user-tasks.service.ts` (new)
- `apps/backend/src/processes/user-tasks/process-user-tasks.controller.ts` (new)
- `apps/backend/src/processes/user-tasks/process-user-tasks.module.ts` (new)

## Change Log

| Date | Change |
|------|--------|
| 2026-05-26 | Story implemented — tsc --noEmit passes |
