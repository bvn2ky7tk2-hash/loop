# Story 12.2: Process Definitions CRUD & Versioning

Status: done

## Story

As a PM hoặc Admin,
Tôi muốn quản lý (tạo, cập nhật, xem, đổi trạng thái) các Process Definition (quy trình BPMN),
Để có thể thiết kế và publish quy trình cho tổ chức.

## Acceptance Criteria

1. `GET /api/v1/processes/definitions` trả về danh sách definitions với pagination `{ data: [], meta: { total, page, pageSize } }`.
2. `POST /api/v1/processes/definitions` tạo definition mới, version=1, status=DRAFT. Chỉ ADMIN/PM.
3. `GET /api/v1/processes/definitions/:id` trả về definition đầy đủ kể cả bpmnXml.
4. `PUT /api/v1/processes/definitions/:id` cập nhật. Nếu definition đang ACTIVE và bpmnXml thay đổi → set cũ DEPRECATED, tạo bản mới với version+1 và status=ACTIVE.
5. `PATCH /api/v1/processes/definitions/:id/status` chuyển trạng thái DRAFT→ACTIVE hoặc ACTIVE→DEPRECATED. Validate transitions.
6. OrgScopeInterceptor được áp dụng.
7. JwtAuthGuard bắt buộc trên tất cả endpoints.

## Tasks / Subtasks

- [x] Task 1: Tạo DTO files
  - [x] `dto/create-definition.dto.ts` — name, description, bpmnXml
  - [x] `dto/update-definition.dto.ts` — partial update
  - [x] `dto/patch-status.dto.ts` — status enum validation

- [x] Task 2: ProcessDefinitionsService
  - [x] `findAll(orgUnitIds, page, pageSize)` — pagination
  - [x] `findOne(id)` — NotFoundException nếu không tồn tại
  - [x] `create(dto, orgUnitId)` — version=1, status=DRAFT
  - [x] `update(id, dto)` — versioning logic khi ACTIVE
  - [x] `patchStatus(id, status)` — validate transitions

- [x] Task 3: ProcessDefinitionsController
  - [x] 5 endpoints theo spec
  - [x] @Roles guard trên POST/PUT/PATCH

- [x] Task 4: ProcessDefinitionsModule
  - [x] Export ProcessDefinitionsService

## Dev Notes

### Versioning Logic

Khi update definition đang ACTIVE với bpmnXml mới:
1. Set definition cũ → DEPRECATED
2. Tạo definition mới với version+1, status=ACTIVE, cùng orgUnitId
3. Return definition mới

### File Structure

```
src/processes/definitions/
├── dto/
│   ├── create-definition.dto.ts
│   ├── update-definition.dto.ts
│   └── patch-status.dto.ts
├── process-definitions.controller.ts
├── process-definitions.service.ts
└── process-definitions.module.ts
```

### Imports

- Enums: `DefinitionStatus` từ `../../generated/prisma`
- Guard: `JwtAuthGuard` từ `../../common/guards/jwt-auth.guard`
- OrgScope: `OrgScopeInterceptor` từ `../../common/guards/org-scope.interceptor`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### File List

- `apps/backend/src/processes/definitions/dto/create-definition.dto.ts` (new)
- `apps/backend/src/processes/definitions/dto/update-definition.dto.ts` (new)
- `apps/backend/src/processes/definitions/dto/patch-status.dto.ts` (new)
- `apps/backend/src/processes/definitions/process-definitions.service.ts` (new)
- `apps/backend/src/processes/definitions/process-definitions.controller.ts` (new)
- `apps/backend/src/processes/definitions/process-definitions.module.ts` (new)

## Change Log

| Date | Change |
|------|--------|
| 2026-05-26 | Story implemented — tsc --noEmit passes |
