# Story 12.8: Frontend — Process Monitoring & User Task Inbox

Status: done

## Story

As a user,
Tôi muốn theo dõi tiến trình các process instances và xử lý các user tasks được giao,
Bao gồm sơ đồ BPMN với token overlay và inbox tasks.

## Acceptance Criteria

1. `ProcessInstancesPage` tại `/processes/instances` — danh sách instances với filter status, definition.
2. `ProcessMonitorPage` tại `/processes/instances/:id` — chi tiết instance với BPMN viewer + token overlay.
3. `BpmnViewer` component (read-only) với overlay chỉ token đang active (xanh) và đã completed (green check).
4. `UserTaskList` component — danh sách tasks, claim / complete / return inline.
5. Activity log hiển thị dạng Timeline với timestamp.
6. Auto-refresh instance data mỗi 5 giây (refetchInterval).
7. Cancel instance button chỉ hiển thị khi status=RUNNING.

## Tasks / Subtasks

- [x] Task 1: BpmnViewer component
  - [x] Dynamic import `bpmn-js/lib/NavigatedViewer`
  - [x] `applyTokenOverlay()` — dùng bpmn-js overlays API
  - [x] Active → blue dot, Completed → green checkmark
  - [x] Re-apply khi `activeActivityIds` / `completedActivityIds` thay đổi

- [x] Task 2: UserTaskList component
  - [x] Table với columns: tên, trạng thái, người xử lý, hạn
  - [x] Claim / Complete / Return actions inline
  - [x] `showInstanceInfo` prop để hiển thị thêm thông tin quy trình

- [x] Task 3: ProcessInstancesPage
  - [x] Filter status + definition
  - [x] Navigate đến ProcessMonitorPage

- [x] Task 4: ProcessMonitorPage
  - [x] Descriptions panel — metadata
  - [x] Tabs: Sơ đồ / User Tasks / Activity Log
  - [x] BPMN viewer với token overlay
  - [x] Cancel button khi RUNNING
  - [x] Auto-refresh via `refetchInterval: 5000`

## Dev Notes

### bpmn-js Overlays API

```typescript
const overlays = viewer.get('overlays');
overlays.clear('token-overlay');
overlays.add(activityId, 'token-overlay', {
  position: { top: -12, right: -12 },
  html: '<div>...</div>',
});
```

### Token Overlay Strategy

- `completedActivityIds`: tất cả activityId trong ProcessActivityLog có completedAt
- `activeActivityIds`: activityId từ ProcessUserTask với status PENDING | IN_PROGRESS

### Auto-refresh

`useInstance()` hook có `refetchInterval: 5000` để poll backend mỗi 5s.

## File Structure

```
apps/web/src/pages/processes/
├── components/
│   ├── BpmnViewer.tsx
│   └── UserTaskList.tsx
├── ProcessInstancesPage.tsx
└── ProcessMonitorPage.tsx
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### File List

- `apps/web/src/pages/processes/components/BpmnViewer.tsx` (new)
- `apps/web/src/pages/processes/components/UserTaskList.tsx` (new)
- `apps/web/src/pages/processes/ProcessInstancesPage.tsx` (new)
- `apps/web/src/pages/processes/ProcessMonitorPage.tsx` (new)

## Change Log

| Date | Change |
|------|--------|
| 2026-05-26 | Story implemented — tsc --noEmit passes |
