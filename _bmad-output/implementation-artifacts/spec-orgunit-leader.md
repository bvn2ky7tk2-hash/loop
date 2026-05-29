---
title: 'OrgUnit Leader — Gán lãnh đạo đơn vị tổ chức'
type: 'feature'
created: '2026-05-29'
status: 'done'
baseline_commit: 'e91d5fde623d3bd6af77fc759ef0695858e9a57e'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** OrgUnit hiện tại chỉ có `headJobTitleId` (chức danh trưởng đơn vị) nhưng không có FK trực tiếp đến Employee làm lãnh đạo, khiến sơ đồ tổ chức không thể hiển thị đúng tên người phụ trách và không cho phép admin gán/thay đổi lãnh đạo một cách tường minh.

**Approach:** Thêm `leaderId` (FK → Employee) vào `OrgUnit` schema, bổ sung API `PATCH /org-units/:id` để set/unset leader, cập nhật frontend hiển thị leader trong node sơ đồ và thêm modal gán lãnh đạo trong trang OrgChartPage.

## Boundaries & Constraints

**Always:**
- Dùng `useThemePalette()` cho mọi màu frontend — không hardcode primary color
- Column render Table phải wrap trong `<Text style={{ color }}>`
- Backend: validate `leaderId` phải là UUID hợp lệ; employee phải thuộc đơn vị đó
- `PATCH /org-units/:id` dùng chung endpoint update (thêm `leaderId` vào `UpdateOrgUnitDto`)
- Frontend: chỉ admin hoặc user có permission `org:manage` mới thấy nút "Gán lãnh đạo"

**Ask First:**
- Nếu `leaderId` trỏ đến nhân viên KHÔNG thuộc đơn vị đó: chặn hay cho phép?
  → Mặc định: **chặn** tại backend (employee.orgUnitId phải khớp)

**Never:**
- Không tạo endpoint riêng chỉ để set leader — dùng chung PATCH update
- Không bỏ logic `head` (từ headJobTitle) hiện tại — hiển thị song song
- Không thêm `directManagerId` auto-sync trong scope này (backend khác làm)

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Gán leader hợp lệ | `PATCH /org-units/:id { leaderId: validEmpId }` — emp thuộc đơn vị | OrgUnit trả về với `leader: { id, fullName, code }` | — |
| Gán leader ngoài đơn vị | `leaderId` là employee của đơn vị khác | 400 Bad Request "Nhân viên không thuộc đơn vị này" | Hiện message.error trên UI |
| Xóa leader | `PATCH /org-units/:id { leaderId: null }` | `leader: null` trong response | — |
| Đơn vị chưa có leader | GET tree | Node hiển thị "Chưa có lãnh đạo" (italic, textMuted) | — |
| Non-admin cố gán | Click nút (nếu bypass) | 403 Forbidden từ backend | message.error |

</frozen-after-approval>

## Code Map

- `apps/backend/prisma/schema.prisma` -- thêm `leaderId String? @map("leader_id")` + relation `leader Employee?`
- `apps/backend/src/org-units/dto/create-org-unit.dto.ts` -- thêm `@IsOptional() @IsUUID() leaderId?`
- `apps/backend/src/org-units/dto/update-org-unit.dto.ts` -- extend PartialType(CreateOrgUnitDto) — tự kế thừa leaderId
- `apps/backend/src/org-units/org-units.service.ts` -- update findAll() include leader, update() validate + persist leaderId
- `apps/web/src/api/org-units.ts` -- thêm `leader?` field vào OrgUnitTree, thêm `setLeader()` function
- `apps/web/src/pages/org/OrgChartPage.tsx` -- hiển thị leader trong OrgNode card + modal gán lãnh đạo

## Tasks & Acceptance

**Execution:**
- [x] `apps/backend/prisma/schema.prisma` -- Thêm field `leaderId String? @map("leader_id") @db.Uuid` và relation `leader Employee? @relation("OrgUnitLeader", fields: [leaderId], references: [id], onDelete: SetNull)` vào model `OrgUnit`; thêm `ledOrgUnits OrgUnit[] @relation("OrgUnitLeader")` vào model `Employee` -- FK cần để query leader info
- [x] `apps/backend/prisma/migrations` -- Chạy `npx prisma migrate dev --name add_org_unit_leader` để tạo migration -- persist schema change
- [x] `apps/backend/src/org-units/dto/create-org-unit.dto.ts` -- Thêm `@IsOptional() @IsUUID() leaderId?: string` -- cho phép truyền leaderId khi create/update
- [x] `apps/backend/src/org-units/org-units.service.ts` -- (1) `findAll()`: include `leader: { select: { id, fullName, code } }` trong prisma query. (2) `update()`: nếu `dto.leaderId !== undefined`, validate employee tồn tại và `employee.orgUnitId === id` (400 nếu sai đơn vị); persist `leaderId` -- hiển thị đúng + validate business rule
- [x] `apps/web/src/api/org-units.ts` -- Thêm `leader?: { id: string; fullName: string; code: string } | null` vào `OrgUnitTree`; thêm `setLeader: (orgUnitId, leaderId | null) => apiClient.patch(...)` -- frontend cần type + API call
- [x] `apps/web/src/pages/org/OrgChartPage.tsx` -- (1) Migrate sang `useThemePalette()` thay inline palette declarations. (2) Trong `OrgNode`: sau block `head`, hiển thị leader badge (CrownOutlined màu linkColor) hoặc "Chưa có lãnh đạo" italic. (3) Thêm nút edit leader trong actions row của card. (4) Thêm state + modal "Gán lãnh đạo": Select employees filtered by orgUnitId từ allEmployees. (5) Thêm handlers `handleAssignLeader` / `handleRemoveLeader` dùng `setLeader`. (6) Dùng `usePermissions().canAny('org:manage', 'hr:manage')` để guard nút -- UX đầy đủ theo spec

**Acceptance Criteria:**
- Given sơ đồ tổ chức đã load, when đơn vị có leader, then card hiển thị icon crown + tên leader với màu linkColor
- Given đơn vị chưa có leader, when render, then hiển thị "Chưa có lãnh đạo" italic với textMuted
- Given admin click edit icon trên card đơn vị, when modal mở, then dropdown chỉ list employees thuộc đơn vị đó
- Given admin chọn employee và confirm, when API trả 200, then message.success hiển thị và sơ đồ reload tự động
- Given employee không thuộc đơn vị, when gán, then API trả 400 và UI hiện message.error
- Given user không có quyền `org:manage` hoặc `hr:manage` và không phải ADMIN, when load trang, then nút "Gán lãnh đạo" không hiển thị

## Spec Change Log

## Design Notes

Leader hiển thị trong OrgNode **song song** với block `head` (từ headJobTitle). Hai block này có ý nghĩa khác nhau:
- `head`: người giữ chức danh trưởng (tự động resolve từ headJobTitleId, không cần gán tay)
- `leader`: người được admin chỉ định tường minh làm lãnh đạo (leaderId FK)

Trường hợp cả hai đều có → hiển thị cả hai (leader trên, head dưới).

```tsx
// Leader badge trong OrgNode card (sau block head)
{node.leader ? (
  <div style={{ fontSize: 10, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4,
    background: isDark ? 'rgba(147,197,253,0.12)' : 'rgba(99,102,241,0.08)',
    border: `1px solid ${isDark ? 'rgba(147,197,253,0.25)' : 'rgba(99,102,241,0.25)'}`,
    borderRadius: 5, padding: '3px 6px' }}>
    <CrownOutlined style={{ color: linkColor, fontSize: 10 }} />
    <span style={{ color: linkColor, fontWeight: 600 }}>{node.leader.fullName}</span>
  </div>
) : (
  <div style={{ fontSize: 10, color: textMuted, fontStyle: 'italic', marginBottom: 4 }}>
    Chưa có lãnh đạo
  </div>
)}
```

## Verification

**Commands:**
- `cd apps/backend && npx prisma validate` -- expected: Schema validation passed
- `cd apps/web && npx tsc --noEmit` -- expected: No TypeScript errors

**Manual checks (if no CLI):**
- Trong sơ đồ tổ chức: card đơn vị có leader hiển thị tên với icon crown màu linkColor
- Dark mode: leader text dùng `#93C5FD`, light mode dùng `preset.primary`
- Modal gán lãnh đạo chỉ hiện với admin/hr:manage role
- Dropdown chỉ list employees thuộc đơn vị đang chọn
