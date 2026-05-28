# Story 16.7: Number Format Migration

Status: ready
depends-on: 16-6-number-format-utils

## Story

As a user,
I want all numbers displayed consistently throughout the app using Vietnamese formatting,
So that I don't see mixed formats (some using dots, some commas, some raw numbers) on different screens.

## Acceptance Criteria

1. **Điều kiện tiên quyết:** Story 16.6 (format utils) đã complete.
2. Toàn bộ 10 file bên dưới không còn dùng `.toFixed()`, `.toLocaleString()` trực tiếp — tất cả đi qua `utils/format.ts`.
3. Số nguyên (count, id, quantity) → `formatNumber`.
4. Tiền tệ (VND, chi phí, lương, ngân sách) → `formatCurrency`.
5. Số giờ / effort → `formatHours`.
6. Phần trăm → `formatPercent`.
7. Số lớn trên SparklineCard (KPI summary) → `formatCompact`.
8. Không có `toLocaleString('vi-VN')` inline trong `.tsx` files nữa.
9. TypeScript compile không lỗi.

## Danh sách file cần migrate (10 files)

| File | Pattern hiện tại |
|------|-----------------|
| `pages/cost/CostPage.tsx` | `.toLocaleString()` — tiền/số |
| `pages/budget/BudgetPage.tsx` | `.toLocaleString('vi-VN')` tiền; `.toFixed(1)` giờ |
| `pages/payroll/PayrollPage.tsx` | `.toLocaleString('vi-VN')` lương |
| `pages/expenses/ExpensePage.tsx` | `.toLocaleString()` tiền |
| `pages/contracts/ContractsPage.tsx` | `.toLocaleString()` / `.toFixed()` |
| `pages/dashboard/DashboardPage.tsx` | `.toLocaleString()` |
| `pages/reports/ReportsPage.tsx` | `.toLocaleString()` |
| `pages/personnel/PersonnelPage.tsx` | `.toLocaleString()` |
| `pages/projects/ProjectsPage.tsx` | `.toLocaleString()` |
| `components/CostBreakdownTooltip.tsx` | `.toLocaleString()` tiền |

## Tasks / Subtasks

- [ ] Task 1: Migrate `CostPage.tsx` (AC: 2, 3, 4)
  - [ ] Thêm import `{ formatNumber, formatCurrency }` từ `../../utils/format`
  - [ ] Thay tất cả `.toLocaleString()` → `formatNumber()` hoặc `formatCurrency()` theo ngữ cảnh

- [ ] Task 2: Migrate `BudgetPage.tsx` (AC: 2, 4, 5)
  - [ ] Thêm import `{ formatCurrency, formatHours }`
  - [ ] `.toLocaleString('vi-VN') + ' ₫'` → `formatCurrency()`
  - [ ] `.toFixed(1) + 'h'` → `formatHours()`

- [ ] Task 3: Migrate `PayrollPage.tsx` (AC: 2, 4)
  - [ ] `n.toLocaleString('vi-VN') + ' đ'` → `formatCurrency()`

- [ ] Task 4: Migrate `ExpensePage.tsx` (AC: 2, 4)
  - [ ] `.toLocaleString()` tiền → `formatCurrency()`

- [ ] Task 5: Migrate `ContractsPage.tsx` (AC: 2, 3, 4, 5)
  - [ ] Scan và phân loại: tiền → `formatCurrency`, số → `formatNumber`, giờ → `formatHours`

- [ ] Task 6: Migrate `DashboardPage.tsx` (AC: 2, 3, 7)
  - [ ] KPI trên SparklineCard → `formatCompact`
  - [ ] Số thường → `formatNumber`

- [ ] Task 7: Migrate `ReportsPage.tsx` (AC: 2, 3, 4)
  - [ ] Tiền → `formatCurrency`, số → `formatNumber`

- [ ] Task 8: Migrate `PersonnelPage.tsx` (AC: 2, 3)
  - [ ] Số → `formatNumber`

- [ ] Task 9: Migrate `ProjectsPage.tsx` (AC: 2, 3, 4)
  - [ ] Ngân sách → `formatCurrency`, số → `formatNumber`

- [ ] Task 10: Migrate `CostBreakdownTooltip.tsx` (AC: 2, 4)
  - [ ] Chi phí → `formatCurrency`

- [ ] Task 11: Verify không còn raw format inline (AC: 8)
  - [ ] `grep -rn "\.toLocaleString\|\.toFixed" apps/web/src/pages apps/web/src/components --include="*.tsx"` → output phải trống

- [ ] Task 12: Verify TypeScript compile (AC: 9)
  - [ ] `cd apps/web && npx tsc --noEmit`

## Dev Notes

### Pattern chuẩn khi migrate

```tsx
// TRƯỚC
{value.toLocaleString('vi-VN')} đ
{value.toFixed(1)}h
{(pct * 100).toFixed(0)}%

// SAU — import một lần ở đầu file
import { formatCurrency, formatHours, formatPercent } from '../../utils/format';

{formatCurrency(value)}
{formatHours(value)}
{formatPercent(pct * 100)}
```

### Xử lý giá trị có thể null/undefined

Các hàm format đã xử lý null/undefined → `'—'`. Dev không cần thêm optional chaining riêng:

```tsx
// ❌ Không cần
{value != null ? formatCurrency(value) : '—'}

// ✅ Đủ rồi
{formatCurrency(value)}
```

### Import path tương đối

| File | Import path |
|------|------------|
| `pages/*/` | `../../utils/format` |
| `components/` | `../utils/format` |
| `components/bugs/` | `../../utils/format` |

### References

- `apps/web/src/utils/format.ts` — từ Story 16.6
- 10 file cần migrate như bảng trên
