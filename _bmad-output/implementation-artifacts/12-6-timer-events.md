# Story 12.6: Timer Events

Status: done

## Story

As a system,
Tôi muốn có khả năng schedule và fire timer boundary events,
Để quy trình tự động tiến tiếp sau một khoảng thời gian.

## Acceptance Criteria

1. `TimerEventService` dùng BullMQ queue `process-timers` (TÁCH BIỆT với `notifications` queue).
2. `scheduleTimer(instanceId, activityId, delayMs)` — enqueue job với delay, jobId unique dạng `timer-{instanceId}-{activityId}`.
3. Job khi fire → gọi `BpmnEngineService.triggerTimerEvent()`.
4. `cancelTimer(instanceId, activityId)` — xóa job pending khi instance bị cancel.
5. Duplicate job được handle bằng cách xóa job cũ trước khi enqueue mới.
6. Worker có retry: 3 lần, exponential backoff 10s.

## Tasks / Subtasks

- [x] Task 1: TimerEventService
  - [x] `onModuleInit()` — khởi động Queue + Worker
  - [x] `onModuleDestroy()` — đóng Queue + Worker
  - [x] `scheduleTimer()` — enqueue với delay
  - [x] `cancelTimer()` — remove job
  - [x] `process()` — xử lý job, gọi engineService

- [x] Task 2: Tích hợp vào ProcessesModule

## Dev Notes

### BullMQ Pattern

Pattern giống `NotificationQueueService` tại `src/notifications/notification-queue.service.ts`:
- `OnModuleInit` / `OnModuleDestroy`
- Queue + Worker init trong `onModuleInit()`
- Connection từ env `REDIS_HOST` + `REDIS_PORT`

### Queue Name

`process-timers` — KHÔNG dùng chung với `notifications` queue.

### JobId Strategy

`timer-{instanceId}-{activityId}` — đảm bảo idempotent (xóa trùng trước khi enqueue).

## File Structure

```
src/processes/timers/
└── timer-event.service.ts
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### File List

- `apps/backend/src/processes/timers/timer-event.service.ts` (new)
- `apps/backend/src/processes/processes.module.ts` (new — module tổng)
- `apps/backend/src/app.module.ts` (modified — import ProcessesModule)

## Change Log

| Date | Change |
|------|--------|
| 2026-05-26 | Story implemented — tsc --noEmit passes |
