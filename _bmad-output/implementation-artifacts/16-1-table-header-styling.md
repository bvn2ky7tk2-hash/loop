# Story 16.1: Table Header Styling Fix

Status: ready

## Story

As a user,
I want table headers to be clearly readable and visually consistent in both dark and light mode,
So that column names are easy to scan without eye strain.

## Acceptance Criteria

1. Trong dark mode, `headerBg` của Table là `#2D3F56` (khớp với `bgCard` trong design system — sáng hơn page bg `#0F172A`).
2. `headerColor` dark mode là `#F1F5F9` (textPrimary).
3. `headerSortActiveBg` và `headerSortHoverBg` dark mode sáng hơn `headerBg` một cấp: `#3D5068`.
4. Trong light mode: `headerBg` là `#F1F5F9`, `headerColor` là `#1E293B` — giữ nguyên như hiện tại.
5. CSS global `text-transform: uppercase` cho `.ant-table-thead` bị xóa — headers hiển thị theo casing gốc của từng column title.
6. Font weight header giữ nguyên `600`, font size giữ nguyên `13px`.
7. `headerSplitColor` dark mode là `#3D5068` (border giữa các cột đầu bảng rõ hơn một chút).
8. Tất cả bảng trong hệ thống (không cần sửa từng trang) tự động áp dụng — vì token ở App.tsx `ConfigProvider` là global.
9. TypeScript compile `cd apps/web && npx tsc --noEmit` không lỗi.

## Tasks / Subtasks

- [ ] Task 1: Cập nhật `Table` token trong `apps/web/src/App.tsx` (AC: 1, 2, 3, 4, 7)
  - [ ] Đổi `headerBg`: dark `'#334155'` → `'#2D3F56'`
  - [ ] Đổi `headerSortActiveBg`: dark `'#3D4F67'` → `'#3D5068'`
  - [ ] Đổi `headerSortHoverBg`: dark `'#3D4F67'` → `'#3D5068'`
  - [ ] Đổi `headerSplitColor`: dark `'#475569'` → `'#3D5068'`

- [ ] Task 2: Xóa `text-transform: uppercase` khỏi global CSS trong `App.tsx` (AC: 5, 6)
  - [ ] Tìm block `/* Table headers */` trong `createGlobalStyle` (line ~80)
  - [ ] Xóa dòng `text-transform: uppercase !important;`
  - [ ] Giữ nguyên `font-weight: 600 !important;` và `font-size: 13px !important;`

- [ ] Task 3: Verify TypeScript compile (AC: 9)
  - [ ] `cd apps/web && npx tsc --noEmit`

## Dev Notes

### Vị trí sửa trong `apps/web/src/App.tsx`

**Phần 1 — Token Table** (line ~189):

```tsx
// TRƯỚC
Table: {
  headerBg:          isDark ? '#334155' : '#F1F5F9',
  headerColor:       isDark ? '#F1F5F9' : '#1E293B',
  headerSortActiveBg:isDark ? '#3D4F67' : '#E2E8F0',
  headerSortHoverBg: isDark ? '#3D4F67' : '#E9EFF5',
  headerSplitColor:  isDark ? '#475569' : '#CBD5E1',
  rowHoverBg:        isDark ? '#253347' : '#F8FAFC',
  bodySortBg:        isDark ? '#263345' : '#F8FAFC',
},

// SAU
Table: {
  headerBg:          isDark ? '#2D3F56' : '#F1F5F9',
  headerColor:       isDark ? '#F1F5F9' : '#1E293B',
  headerSortActiveBg:isDark ? '#3D5068' : '#E2E8F0',
  headerSortHoverBg: isDark ? '#3D5068' : '#E9EFF5',
  headerSplitColor:  isDark ? '#3D5068' : '#CBD5E1',
  rowHoverBg:        isDark ? '#253347' : '#F8FAFC',
  bodySortBg:        isDark ? '#263345' : '#F8FAFC',
},
```

**Phần 2 — Global CSS** (line ~80):

```css
/* TRƯỚC */
.ant-table-thead > tr > th,
.ant-table-thead > tr > td {
  font-weight: 600 !important;
  font-size: 13px !important;
  letter-spacing: 0.03em !important;
  text-transform: uppercase !important;  ← XÓA DÒNG NÀY
}

/* SAU */
.ant-table-thead > tr > th,
.ant-table-thead > tr > td {
  font-weight: 600 !important;
  font-size: 13px !important;
  letter-spacing: 0.03em !important;
}
```

### Lý do chọn `#2D3F56` thay vì `#334155`

Theo design system trong CLAUDE.md:
- `bgContainer` dark = `#1E293B` (nền modal, drawer)
- `bgCard` dark = `#2D3F56` (card trong modal — sáng hơn container)
- `bgSubPanel` dark = `#1A2744` (footer, sub-section)

Table header cần nổi lên so với table body (`colorBgContainer = #1E293B`),
nên dùng `#2D3F56` (bgCard) — nhất quán với toàn hệ thống.

### References

- `apps/web/src/App.tsx` — ConfigProvider theme + createGlobalStyle
- `_bmad-output/planning-artifacts/ui-design-guidelines.md` — Palette chuẩn dark mode
