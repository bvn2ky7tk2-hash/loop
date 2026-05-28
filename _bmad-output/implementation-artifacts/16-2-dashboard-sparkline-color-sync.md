# Story 16.2: Dashboard SparklineCard Color Sync

Status: ready

## Story

As a user,
I want all stat cards (SparklineCard) across every dashboard to use a consistent color palette,
So that the UI feels cohesive and doesn't show random hardcoded colors that break when the theme changes.

## Acceptance Criteria

1. Toàn bộ SparklineCard với `filled` prop dùng màu từ bảng **màu ngữ nghĩa chuẩn** bên dưới — không hardcode màu tùy tiện.
2. Các card liên quan đến "tổng" / "chính" dùng `preset.primary` (theo theme hiện tại của user).
3. Không còn hardcode `'#4F46E5'`, `'#7C3AED'`, `'#2563EB'` trong prop `color` của SparklineCard — các màu này vi phạm CLAUDE.md.
4. `CostPage.tsx` — 4 SparklineCard dùng đúng màu ngữ nghĩa theo bảng chuẩn.
5. `DashboardPage.tsx` — kiểm tra và chuẩn hóa nếu có hardcode.
6. `ReportsPage.tsx` — kiểm tra và chuẩn hóa nếu có hardcode.
7. `BugDashboardPage.tsx` — giữ nguyên màu ngữ nghĩa hiện tại (blue/orange/green/red là semantic, không phải primary — OK).
8. `TimesheetManagerPage.tsx` — kiểm tra và chuẩn hóa nếu có hardcode primary cứng.
9. TypeScript compile không lỗi.

## Bảng màu ngữ nghĩa chuẩn cho SparklineCard

| Ý nghĩa | Màu | Hex |
|---------|-----|-----|
| Chính / Primary | `preset.primary` | theo theme |
| Thành công / Hoàn thành | Emerald | `#10B981` |
| Cảnh báo / Chờ | Amber | `#F59E0B` |
| Lỗi / Vượt ngưỡng | Red | `#EF4444` |
| Thông tin / Trung lập | Blue | `#3B82F6` |
| Chi phí / Tài chính | Teal | `#0891B2` |

> Màu **tím** (`#7C3AED`) chỉ dùng cho module BPM/Workflow. Không dùng trong các module khác.

## Tasks / Subtasks

- [ ] Task 1: Chuẩn hóa màu trong `CostPage.tsx` (AC: 4)
  - [ ] Đọc 4 SparklineCard hiện tại — ghi lại ý nghĩa từng card
  - [ ] Map sang màu ngữ nghĩa chuẩn theo bảng trên
  - [ ] Đảm bảo dùng `const { preset } = useThemeStore()` để lấy `preset.primary`

- [ ] Task 2: Kiểm tra và fix `DashboardPage.tsx` (AC: 5)
  - [ ] Scan toàn bộ `color=` prop của SparklineCard
  - [ ] Đổi hardcode primary color → `preset.primary`

- [ ] Task 3: Kiểm tra và fix `ReportsPage.tsx` (AC: 6)
  - [ ] Scan toàn bộ `color=` prop của SparklineCard
  - [ ] Chuẩn hóa theo bảng màu ngữ nghĩa

- [ ] Task 4: Kiểm tra `TimesheetManagerPage.tsx` (AC: 8)
  - [ ] Confirm không có hardcode primary color vi phạm CLAUDE.md

- [ ] Task 5: Verify TypeScript compile (AC: 9)
  - [ ] `cd apps/web && npx tsc --noEmit`

## Dev Notes

### CostPage — Mapping màu đề xuất

```tsx
// TRƯỚC (vi phạm CLAUDE.md — hardcode màu)
<SparklineCard label="Tổng dự án"   color="#7C3AED" filled ... />
<SparklineCard label="Chi phí"      color={primary}  filled ... />
<SparklineCard label="Ngân sách"    color="#FA8C16"  filled ... />
<SparklineCard label="Vượt ngân sách" color="#10B981" filled ... />

// SAU (dùng bảng màu ngữ nghĩa chuẩn)
const { preset } = useThemeStore();
<SparklineCard label="Tổng dự án"     color={preset.primary} filled ... />
<SparklineCard label="Chi phí thực"   color="#0891B2"        filled ... />   // Teal = Finance
<SparklineCard label="Ngân sách"      color="#F59E0B"        filled ... />   // Amber = Ngân sách
<SparklineCard label="Vượt ngân sách" color="#EF4444"        filled ... />   // Red = Cảnh báo
```

> **Lưu ý:** Màu cụ thể trong CostPage cần dev tự quyết định khi đọc code —
> mapping trên là gợi ý dựa trên ý nghĩa ngữ nghĩa.

### Pattern chuẩn để lấy primary color

```tsx
// Luôn dùng pattern này, KHÔNG hardcode hex của primary
const { mode, preset } = useThemeStore();
// ...
<SparklineCard color={preset.primary} filled />
```

### Màu hardcode bị cấm trong SparklineCard (theo CLAUDE.md)

- `'#4F46E5'` — Indigo primary cứng
- `'#2563EB'` — Blue primary cứng
- `'#7C3AED'` — Violet primary cứng (ngoại lệ: BPM module OK)

### References

- `apps/web/src/pages/cost/CostPage.tsx` — 4 SparklineCard cần fix
- `apps/web/src/pages/dashboard/DashboardPage.tsx`
- `apps/web/src/pages/reports/ReportsPage.tsx`
- `apps/web/src/pages/timesheet/TimesheetManagerPage.tsx`
- `apps/web/src/components/ui/SparklineCard.tsx` — component definition
- `apps/web/src/store/theme.store.ts` — `useThemeStore` hook
