# Story 12.3: BPMN Engine Service

Status: done

## Story

As a system,
Tôi muốn có một service wrap `bpmn-engine` npm package,
Để có thể start, resume, complete user task và trigger timer events với state persistence.

## Acceptance Criteria

1. `BpmnEngineService.start(instanceId, bpmnXml, variables)` — khởi động engine, serialize state, return `BpmnEngineExecutionState`.
2. `BpmnEngineService.resume(instanceId, bpmnXml, tokenState)` — khôi phục engine từ state đã lưu.
3. `BpmnEngineService.completeUserTask(instanceId, activityId, variables)` — resume → signal → save state mới.
4. `BpmnEngineService.triggerTimerEvent(instanceId, activityId)` — resume → cancelActivity → save state mới.
5. Khi engine emit `wait` event với UserTask type → tạo `ProcessUserTask` record và gửi notification.
6. Khi unsupported element → log Pino warn, không throw.
7. Khi engine error → set instance status = ERROR, tạo activity log.
8. Khi execution.state === 'idle' → set instance status = COMPLETED.

## Tasks / Subtasks

- [x] Task 1: BpmnEngineService implementation
  - [x] Import `Engine` từ `bpmn-engine`
  - [x] `start()` method — execute với listener, serialize state
  - [x] `resume()` method — recover + resume
  - [x] `completeUserTask()` — load instance từ DB, recover, signal, update tokenState
  - [x] `triggerTimerEvent()` — recover, cancelActivity, update tokenState

- [x] Task 2: Event handling
  - [x] `handleWaitActivities()` — phân loại UserTask vs Timer vs Unsupported
  - [x] `createUserTaskRecord()` — tạo ProcessUserTask + ProcessActivityLog + Notification
  - [x] `checkCompletion()` — set COMPLETED khi state === 'idle'

## Dev Notes

### bpmn-engine API

```typescript
// Start
const engine = new Engine({ name: instanceId, source: bpmnXml });
const execution = await engine.execute({ listener, variables });
const state = await engine.getState(); // → BpmnEngineExecutionState

// Resume from saved state
engine.recover(tokenState); // tokenState: BpmnEngineExecutionState
const execution = await engine.resume({ listener });

// Signal user task
execution.signal({ id: activityId, ...variables });

// Cancel timer boundary
execution.cancelActivity({ id: activityId });

// Check completion
execution.state === 'idle' // → completed
```

### Type Casting

Do Prisma trả về `Json` type, cần cast: `instance.tokenState as unknown as BpmnEngineExecutionState`

### File

```
src/processes/engine/
└── bpmn-engine.service.ts
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### File List

- `apps/backend/src/processes/engine/bpmn-engine.service.ts` (new)

## Change Log

| Date | Change |
|------|--------|
| 2026-05-26 | Story implemented — tsc --noEmit passes |
