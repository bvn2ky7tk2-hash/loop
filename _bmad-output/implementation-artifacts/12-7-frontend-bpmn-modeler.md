# Story 12.7: Frontend — BPMN Modeler

Status: done

## Story

As a PM hoặc Admin,
Tôi muốn có giao diện web để thiết kế và quản lý BPMN process definitions,
Bao gồm danh sách definitions và BPMN modeler editor.

## Acceptance Criteria

1. `ProcessListPage` tại `/processes` — danh sách definitions với filter, create, activate, start instance.
2. `ProcessModelerPage` tại `/processes/modeler/:id` — BPMN editor cho từng definition.
3. `BpmnModeler` component wrap `bpmn-js` Modeler, load XML, emit `onChange`.
4. Khi save trên definition ACTIVE → backend tạo version mới (hiện thông báo cho user).
5. `src/api/processes.api.ts` — đầy đủ API functions + TanStack Query hooks.
6. Routes được register trong `router.tsx`.

## Tasks / Subtasks

- [x] Task 1: API client
  - [x] `src/api/processes.api.ts` — types + API functions + hooks

- [x] Task 2: Components
  - [x] `ProcessStatusBadge.tsx` — DefinitionStatusBadge, InstanceStatusBadge, UserTaskStatusBadge

- [x] Task 3: BpmnModeler component
  - [x] Dynamic import `bpmn-js/lib/Modeler` (code split)
  - [x] Container ref + lifecycle management
  - [x] `onChange` callback via eventBus `commandStack.changed`
  - [x] `onReady` callback khi modeler sẵn sàng

- [x] Task 4: Pages
  - [x] `ProcessListPage.tsx` — Table + Create modal + Start instance modal
  - [x] `ProcessModelerPage.tsx` — Header + Save button + Read-only alert khi DEPRECATED

- [x] Task 5: Router
  - [x] 4 routes đăng ký vào `router.tsx`

## Dev Notes

### bpmn-js Dynamic Import

Dùng dynamic import để tránh bundle size lớn:
```typescript
const { default: Modeler } = await import('bpmn-js/lib/Modeler');
```

### EventBus Pattern

```typescript
const eventBus = modeler.get('eventBus');
eventBus.on('commandStack.changed', handleChange);
```

### File Structure

```
apps/web/src/
├── api/processes.api.ts
└── pages/processes/
    ├── components/
    │   ├── BpmnModeler.tsx
    │   ├── ProcessStatusBadge.tsx
    │   └── (BpmnViewer.tsx — Story 12.8)
    ├── ProcessListPage.tsx
    └── ProcessModelerPage.tsx
```

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### File List

- `apps/web/src/api/processes.api.ts` (new)
- `apps/web/src/pages/processes/components/ProcessStatusBadge.tsx` (new)
- `apps/web/src/pages/processes/components/BpmnModeler.tsx` (new)
- `apps/web/src/pages/processes/ProcessListPage.tsx` (new)
- `apps/web/src/pages/processes/ProcessModelerPage.tsx` (new)
- `apps/web/src/router.tsx` (modified)

## Change Log

| Date | Change |
|------|--------|
| 2026-05-26 | Story implemented — tsc --noEmit passes |
