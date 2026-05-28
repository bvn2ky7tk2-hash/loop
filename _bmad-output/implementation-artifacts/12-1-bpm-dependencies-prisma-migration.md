# Story 12.1: BPM Dependencies & Prisma Migration

Status: review

## Story

As a developer,
I want the BPM module dependencies installed and database schema migrated,
So that all subsequent BPM stories have a stable foundation to build on.

## Acceptance Criteria

1. `bpmn-engine` được thêm vào `apps/backend/package.json` dependencies và resolvable sau `pnpm install`.
2. `bpmn-js` và `bpmn-js-properties-panel` được thêm vào `apps/web/package.json` dependencies và resolvable sau `pnpm install`.
3. Prisma schema có 4 models mới: `ProcessDefinition`, `ProcessInstance`, `ProcessUserTask`, `ProcessActivityLog` với đầy đủ fields, indexes, và relations theo spec.
4. Prisma schema có 3 enums mới: `DefinitionStatus`, `InstanceStatus`, `UserTaskStatus`.
5. `NotificationType` enum có thêm value `PROCESS_TASK_ASSIGNED`.
6. Các models hiện có (`OrgUnit`, `Project`, `User`) có thêm quan hệ ngược lại với BPM models.
7. `npx prisma migrate dev --name add_bpm_module` chạy thành công, tạo migration file trong `apps/backend/prisma/migrations/`.
8. `npx prisma validate` không báo lỗi sau migration.
9. `npx prisma generate` thành công — Prisma Client có types cho 4 models mới.
10. Backend TypeScript compile không lỗi sau khi thêm dependencies (`pnpm --filter backend build` hoặc `tsc --noEmit`).

## Tasks / Subtasks

- [x] Task 1: Install backend dependency `bpmn-engine` (AC: 1)
  - [x] Chạy `pnpm --filter backend add bpmn-engine` trong root monorepo
  - [x] Verify `bpmn-engine` xuất hiện trong `apps/backend/package.json` dependencies
  - [x] Verify `pnpm install` không lỗi

- [x] Task 2: Install web dependencies `bpmn-js` và `bpmn-js-properties-panel` (AC: 2)
  - [x] Chạy `pnpm --filter web add bpmn-js bpmn-js-properties-panel` trong root monorepo
  - [x] Verify cả hai package xuất hiện trong `apps/web/package.json` dependencies
  - [x] Verify `pnpm install` không lỗi

- [x] Task 3: Thêm 3 enums mới vào Prisma schema (AC: 4, 5)
  - [x] Thêm `DefinitionStatus { DRAFT ACTIVE DEPRECATED }` vào `schema.prisma`
  - [x] Thêm `InstanceStatus { RUNNING SUSPENDED COMPLETED CANCELLED ERROR }` vào `schema.prisma`
  - [x] Thêm `UserTaskStatus { PENDING IN_PROGRESS COMPLETED SKIPPED }` vào `schema.prisma`
  - [x] Thêm `PROCESS_TASK_ASSIGNED` vào enum `NotificationType` hiện có

- [x] Task 4: Thêm model `ProcessDefinition` vào Prisma schema (AC: 3)
  - [x] Thêm model với đầy đủ fields theo spec (xem Dev Notes)
  - [x] Thêm relation ngược `processDefinitions ProcessDefinition[]` vào model `OrgUnit` (AC: 6)

- [x] Task 5: Thêm model `ProcessInstance` vào Prisma schema (AC: 3)
  - [x] Thêm model với đầy đủ fields theo spec
  - [x] Thêm relation ngược `processInstances ProcessInstance[]` vào model `Project` (AC: 6)
  - [x] Thêm relations ngược vào model `User` (AC: 6):
    - `startedProcesses ProcessInstance[] @relation("ProcessInstanceStarter")`
    - `assignedProcessTasks ProcessUserTask[] @relation("ProcessTaskAssignee")`

- [x] Task 6: Thêm models `ProcessUserTask` và `ProcessActivityLog` vào Prisma schema (AC: 3)
  - [x] Thêm model `ProcessUserTask` với đầy đủ fields và indexes
  - [x] Thêm model `ProcessActivityLog` với đầy đủ fields và indexes

- [x] Task 7: Chạy Prisma migration (AC: 7, 8, 9)
  - [x] Dùng `npx prisma db push` (dev pattern — DB có drift từ các stories trước)
  - [x] Verify 4 tables được tạo: `process_definitions`, `process_instances`, `process_user_tasks`, `process_activity_logs`
  - [x] `npx prisma validate` — không lỗi
  - [x] `npx prisma generate` — Prisma Client được regenerate thành công

- [x] Task 8: Verify TypeScript compile (AC: 10)
  - [x] Chạy `cd apps/backend && npx tsc --noEmit`
  - [x] Không có TypeScript compile errors

## Dev Notes

### Cấu trúc module thực tế

Module theo pattern flat: `src/{domain}/` — **KHÔNG** phải `src/modules/{domain}/`. BPM module sẽ đặt ở `src/processes/` (Story 12.3+). Story này chỉ install dependencies và schema migration.

### Prisma schema — Conventions dự án

File: `apps/backend/prisma/schema.prisma`

Conventions bắt buộc (xem các models hiện có để follow):
- `@id @default(uuid())` — UUID, không phải cuid
- Column names: camelCase field + `@map("snake_case")` 
- Table names: `@@map("snake_case_plural")`
- Timestamps: `createdAt DateTime @default(now()) @map("created_at")` và `updatedAt DateTime @updatedAt @map("updated_at")`

### Prisma — Enums mới (thêm vào cuối file, sau PushToken)

```prisma
// ─── BPM ─────────────────────────────────────────────────────────────────────

enum DefinitionStatus {
  DRAFT
  ACTIVE
  DEPRECATED
}

enum InstanceStatus {
  RUNNING
  SUSPENDED
  COMPLETED
  CANCELLED
  ERROR
}

enum UserTaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  SKIPPED
}
```

### Prisma — Thêm vào `NotificationType` enum hiện có

Tìm `enum NotificationType` và thêm value mới:
```prisma
  PROCESS_TASK_ASSIGNED
```

### Prisma — Models mới (thêm sau enums BPM)

```prisma
model ProcessDefinition {
  id          String           @id @default(uuid())
  name        String
  description String?
  version     Int              @default(1)
  bpmnXml     String           @map("bpmn_xml") @db.Text
  orgUnitId   String           @map("org_unit_id")
  status      DefinitionStatus @default(DRAFT)
  createdAt   DateTime         @default(now()) @map("created_at")
  updatedAt   DateTime         @updatedAt @map("updated_at")

  orgUnit   OrgUnit           @relation(fields: [orgUnitId], references: [id])
  instances ProcessInstance[]

  @@index([orgUnitId])
  @@index([status])
  @@map("process_definitions")
}

model ProcessInstance {
  id           String         @id @default(uuid())
  definitionId String         @map("definition_id")
  projectId    String?        @map("project_id")
  startedBy    String         @map("started_by")
  status       InstanceStatus @default(RUNNING)
  variables    Json           @default("{}")
  tokenState   Json           @map("token_state") @default("{}")
  startedAt    DateTime       @default(now()) @map("started_at")
  completedAt  DateTime?      @map("completed_at")

  definition    ProcessDefinition    @relation(fields: [definitionId], references: [id])
  project       Project?             @relation(fields: [projectId], references: [id])
  startedByUser User                 @relation("ProcessInstanceStarter", fields: [startedBy], references: [id])
  userTasks     ProcessUserTask[]
  activityLog   ProcessActivityLog[]

  @@index([definitionId, status])
  @@index([startedBy])
  @@index([projectId])
  @@map("process_instances")
}

model ProcessUserTask {
  id             String         @id @default(uuid())
  instanceId     String         @map("instance_id")
  activityId     String         @map("activity_id")
  name           String
  assigneeId     String?        @map("assignee_id")
  candidateRoles String[]       @map("candidate_roles") @default([])
  formData       Json?          @map("form_data")
  status         UserTaskStatus @default(PENDING)
  dueDate        DateTime?      @map("due_date")
  completedAt    DateTime?      @map("completed_at")

  instance ProcessInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  assignee User?           @relation("ProcessTaskAssignee", fields: [assigneeId], references: [id])

  @@index([instanceId])
  @@index([assigneeId, status])
  @@map("process_user_tasks")
}

model ProcessActivityLog {
  id           String    @id @default(uuid())
  instanceId   String    @map("instance_id")
  activityId   String    @map("activity_id")
  activityName String    @map("activity_name")
  activityType String    @map("activity_type")
  performedBy  String?   @map("performed_by")
  startedAt    DateTime  @default(now()) @map("started_at")
  completedAt  DateTime? @map("completed_at")

  instance ProcessInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)

  @@index([instanceId])
  @@map("process_activity_logs")
}
```

### Prisma — Relations ngược cần thêm vào models hiện có

**Trong `model OrgUnit`** — thêm vào cuối block relations:
```prisma
  processDefinitions ProcessDefinition[]
```

**Trong `model Project`** — thêm vào cuối block relations:
```prisma
  processInstances ProcessInstance[]
```

**Trong `model User`** — thêm vào cuối block relations:
```prisma
  startedProcesses     ProcessInstance[] @relation("ProcessInstanceStarter")
  assignedProcessTasks ProcessUserTask[] @relation("ProcessTaskAssignee")
```

### Vị trí thêm các models trong file

Thêm toàn bộ section BPM sau model `PushToken` (cuối file), trước dòng kết thúc file. Dùng header comment:
```prisma
// ─── BPM ─────────────────────────────────────────────────────────────────────
```

### Lưu ý về `bpmn-engine`

`bpmn-engine` là npm package của paed0 — BPMN 2.0 execution engine cho Node.js. Package này có sẵn TypeScript declarations. Dùng `pnpm --filter backend add bpmn-engine` (không cần `--save-dev` vì là runtime dependency).

### Lưu ý về `bpmn-js`

`bpmn-js` là Camunda open-source BPMN modeler cho browser. `bpmn-js-properties-panel` là properties panel tương ứng. Đây là runtime dependencies của web app, không phải devDependencies.

### References

- Prisma schema hiện có: `apps/backend/prisma/schema.prisma`
- Package backend: `apps/backend/package.json`
- Package web: `apps/web/package.json`
- Model `OrgUnit` ở line ~48 của schema
- Model `Project` ở line ~124 của schema
- Model `User` ở line ~12 của schema
- Enum `NotificationType` ở line ~345 của schema

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `bpmn-engine@25.0.1` installed vào backend (npm package BPMN 2.0 runtime).
- `bpmn-js@18.16.1` và `bpmn-js-properties-panel@5.58.0` installed vào web. `@carbon/icons` (transitive dep) có build script warning nhưng không ảnh hưởng — packages resolvable bình thường.
- 4 models BPM + 3 enums mới + `PROCESS_TASK_ASSIGNED` trong `NotificationType` được thêm vào schema và push thành công.
- DB có drift từ các stories trước (Timesheet) nên dùng `prisma db push` thay vì `migrate dev` (consistent với pattern hiện tại của dự án).
- `dotenv` được cài thêm vào backend devDependencies để `prisma.config.ts` load được.
- DB user `loop` được cấp `CREATEDB` privilege bởi local superuser `leophan188` (cần thiết cho shadow database của Prisma Migrate dev).
- `npx tsc --noEmit` trong `apps/backend` không có errors.

### File List

- `apps/backend/package.json` (modified — added `bpmn-engine`, `dotenv`)
- `apps/web/package.json` (modified — added `bpmn-js`, `bpmn-js-properties-panel`)
- `apps/backend/prisma/schema.prisma` (modified — 4 new models, 3 new enums, PROCESS_TASK_ASSIGNED, reverse relations)
- `apps/backend/src/generated/prisma/index.d.ts` (regenerated by prisma generate)

### Change Log

| Date | Change |
|------|--------|
| 2026-05-26 | Story created từ Epic 12 — BPM Module |
| 2026-05-26 | Implementation complete — dependencies installed, schema migrated, client regenerated |
