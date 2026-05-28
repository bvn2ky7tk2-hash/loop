# Story 16.6: Number Format Utilities

Status: ready

## Story

As a developer,
I want a single shared utility module for number formatting,
So that every screen displays numbers, currency, and percentages in consistent vi-VN format instead of each file doing it differently.

## Acceptance Criteria

1. File `apps/web/src/utils/format.ts` được tạo mới với 5 hàm export: `formatNumber`, `formatCurrency`, `formatPercent`, `formatHours`, `formatCompact`.
2. `formatNumber(1234567)` → `'1.234.567'` (dấu chấm phân nghìn, locale vi-VN).
3. `formatCurrency(1234567)` → `'1.234.567 đ'` (dấu chấm phân nghìn + ký hiệu đồng Việt Nam).
4. `formatPercent(12.5)` → `'12,5%'` (dấu phẩy thập phân, locale vi-VN).
5. `formatHours(8.5)` → `'8h 30m'`; `formatHours(8)` → `'8h'`; `formatHours(0.5)` → `'30m'`.
6. `formatCompact(1234567)` → `'1,23M'`; `formatCompact(12345)` → `'12,35K'`; `formatCompact(999)` → `'999'`.
7. Mọi hàm xử lý `null`, `undefined`, `NaN` → trả `'—'` (em dash, không crash).
8. Unit tests cho tất cả 5 hàm tại `apps/web/src/utils/format.test.ts` — cover: giá trị bình thường, giá trị 0, giá trị âm, null/undefined.
9. TypeScript compile không lỗi, không có `any` trong file utils.

## Tasks / Subtasks

- [ ] Task 1: Tạo `apps/web/src/utils/format.ts` (AC: 1–7, 9)
  - [ ] `formatNumber` — `Intl.NumberFormat('vi-VN')` không decimal
  - [ ] `formatCurrency` — `Intl.NumberFormat('vi-VN')` + `' đ'`
  - [ ] `formatPercent` — `Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })` + `'%'`
  - [ ] `formatHours` — convert float hours → `Xh Ym` string
  - [ ] `formatCompact` — >= 1M → `Xm`, >= 1K → `Xk`, else bare number; dùng `vi-VN` decimal

- [ ] Task 2: Tạo `apps/web/src/utils/format.test.ts` (AC: 8)
  - [ ] Test `formatNumber`: 1234567 → '1.234.567', 0 → '0', -500 → '-500', null → '—'
  - [ ] Test `formatCurrency`: 1234567 → '1.234.567 đ', 0 → '0 đ', null → '—'
  - [ ] Test `formatPercent`: 12.5 → '12,5%', 100 → '100%', null → '—'
  - [ ] Test `formatHours`: 8.5 → '8h 30m', 8 → '8h', 0.5 → '30m', 0 → '0h', null → '—'
  - [ ] Test `formatCompact`: 1234567 → '1,23M', 12345 → '12,35K', 999 → '999', null → '—'

- [ ] Task 3: Verify TypeScript compile (AC: 9)
  - [ ] `cd apps/web && npx tsc --noEmit`

## Dev Notes

### `apps/web/src/utils/format.ts`

```typescript
const GUARD = (n: unknown): n is number =>
  n !== null && n !== undefined && !Number.isNaN(Number(n));

const viNum = new Intl.NumberFormat('vi-VN');
const viNum1 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const viNum2 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

export function formatNumber(n: number | null | undefined): string {
  if (!GUARD(n)) return '—';
  return viNum.format(Number(n));
}

export function formatCurrency(n: number | null | undefined): string {
  if (!GUARD(n)) return '—';
  return viNum.format(Number(n)) + ' đ';
}

export function formatPercent(n: number | null | undefined): string {
  if (!GUARD(n)) return '—';
  return viNum1.format(Number(n)) + '%';
}

export function formatHours(n: number | null | undefined): string {
  if (!GUARD(n)) return '—';
  const num = Number(n);
  if (num === 0) return '0h';
  const h = Math.floor(num);
  const m = Math.round((num - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatCompact(n: number | null | undefined): string {
  if (!GUARD(n)) return '—';
  const num = Number(n);
  if (Math.abs(num) >= 1_000_000) return viNum2.format(num / 1_000_000) + 'M';
  if (Math.abs(num) >= 1_000)     return viNum2.format(num / 1_000) + 'K';
  return viNum.format(num);
}
```

### Lưu ý về `Intl.NumberFormat` vi-VN

- Dấu phân nghìn: `.` (chấm)
- Dấu thập phân: `,` (phẩy)
- Tạo instance bên ngoài hàm (module-level) để tránh re-instantiate mỗi lần call — tốt hơn về hiệu năng khi render bảng lớn.

### References

- `apps/web/src/utils/format.ts` — file cần tạo
- `apps/web/src/utils/format.test.ts` — unit tests
- Không có dependency ngoài (không cần `numeral.js` hay thư viện thứ ba)
