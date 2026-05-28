# Story 16.3: Bug & Task Status Pill Sync

Status: ready

## Story

As a user,
I want Bug status indicators to look visually consistent with Task status pills throughout the system,
So that the UI feels unified regardless of whether I'm viewing tasks or bugs.

## Acceptance Criteria

1. Tạo component mới `BugStatusPill.tsx` tại `apps/web/src/components/bugs/` — dùng cùng pattern với `TaskStatusPill.tsx` (custom rounded pill, `isDark` guard, không dùng Ant Design `<Tag>`).
2. `BugStatusPill` hỗ trợ đầy đủ tất cả `BugStatus`: `OPEN`, `PENDING`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `CANCELLED`.
3. Mọi màu nền/chữ trong `BugStatusPill` có `isDark` guard đúng chuẩn CLAUDE.md.
4. `BugStatusPill` có props: `status: BugStatus`, `size?: 'sm' | 'md'` — giống `TaskStatusPill`.
5. Toàn bộ file đang dùng `<BugStatusTag>` được thay bằng `<BugStatusPill>` — component cũ `BugStatusTag.tsx` bị xóa.
6. Labels hiển thị: theo bảng mapping bên dưới — tiếng Việt cho trạng thái workflow, giữ nguyên tiếng Anh cho các trạng thái final state (`OPEN`, `RESOLVED`, `CLOSED`) vì user đã quen với từ này trong ngữ cảnh bug tracking.
7. Visual style của pill nhất quán với `TaskStatusPill` — cùng border-radius (`9999px`), padding, font size.
8. TypeScript compile không lỗi.

## Bảng màu BugStatusPill

| Status | Label | Light bg | Light text | Dark bg | Dark text |
|--------|-------|----------|------------|---------|-----------|
| `OPEN` | Open | `#EFF6FF` | `#1D4ED8` | `#1e3a5f` | `#93c5fd` |
| `PENDING` | Chờ xử lý | `#FFFBEB` | `#92400E` | `#451a03` | `#fcd34d` |
| `PENDING_REVIEW` | Chờ duyệt | `#FFF7ED` | `#C2410C` | `#431407` | `#fdba74` |
| `APPROVED` | Đã duyệt | `#ECFDF5` | `#065F46` | `#052e16` | `#6ee7b7` |
| `REJECTED` | Từ chối | `#FEF2F2` | `#991B1B` | `#450a0a` | `#fca5a5` |
| `IN_PROGRESS` | Đang xử lý | `#EEF2FF` | `#4338CA` | `#1e1b4b` | `#a5b4fc` |
| `RESOLVED` | Resolved | `#F0FDF4` | `#166534` | `#14532d` | `#86efac` |
| `CLOSED` | Closed | `#F8FAFC` | `#475569` | `#1E293B` | `#94A3B8` |
| `CANCELLED` | Đã hủy | `#F9FAFB` | `#374151` | `#1f2937` | `#9ca3af` |

## Tasks / Subtasks

- [ ] Task 1: Tạo `apps/web/src/components/bugs/BugStatusPill.tsx` (AC: 1, 2, 3, 4, 6, 7)
  - [ ] Copy structure từ `TaskStatusPill.tsx`
  - [ ] Import `BugStatus` từ `../../api/bugs.api`
  - [ ] Thêm `CONFIG` map với đầy đủ 9 statuses theo bảng màu trên
  - [ ] Props: `status: BugStatus`, `size?: 'sm' | 'md'`

- [ ] Task 2: Tìm toàn bộ file dùng `BugStatusTag` (AC: 5)
  - [ ] `grep -r "BugStatusTag" apps/web/src --include="*.tsx"` để liệt kê
  - [ ] Thay `import { BugStatusTag }` → `import { BugStatusPill }`
  - [ ] Thay `<BugStatusTag status={...} />` → `<BugStatusPill status={...} />`

- [ ] Task 3: Xóa `BugStatusTag.tsx` (AC: 5)
  - [ ] Xóa file `apps/web/src/components/bugs/BugStatusTag.tsx`

- [ ] Task 4: Verify TypeScript compile (AC: 8)
  - [ ] `cd apps/web && npx tsc --noEmit`

## Dev Notes

### Template `BugStatusPill.tsx`

```tsx
import type { CSSProperties } from 'react';
import { useThemeStore } from '../../store/theme.store';
import type { BugStatus } from '../../api/bugs.api';

interface PillConfig {
  label: string;
  bg: string;
  color: string;
  darkBg: string;
  darkColor: string;
}

const CONFIG: Record<BugStatus, PillConfig> = {
  OPEN:           { label: 'Open',         bg: '#EFF6FF', color: '#1D4ED8', darkBg: '#1e3a5f', darkColor: '#93c5fd' },
  PENDING:        { label: 'Chờ xử lý',   bg: '#FFFBEB', color: '#92400E', darkBg: '#451a03', darkColor: '#fcd34d' },
  PENDING_REVIEW: { label: 'Chờ duyệt',   bg: '#FFF7ED', color: '#C2410C', darkBg: '#431407', darkColor: '#fdba74' },
  APPROVED:       { label: 'Đã duyệt',    bg: '#ECFDF5', color: '#065F46', darkBg: '#052e16', darkColor: '#6ee7b7' },
  REJECTED:       { label: 'Từ chối',     bg: '#FEF2F2', color: '#991B1B', darkBg: '#450a0a', darkColor: '#fca5a5' },
  IN_PROGRESS:    { label: 'Đang xử lý',  bg: '#EEF2FF', color: '#4338CA', darkBg: '#1e1b4b', darkColor: '#a5b4fc' },
  RESOLVED:       { label: 'Resolved',    bg: '#F0FDF4', color: '#166534', darkBg: '#14532d', darkColor: '#86efac' },
  CLOSED:         { label: 'Closed',      bg: '#F8FAFC', color: '#475569', darkBg: '#1E293B', darkColor: '#94A3B8' },
  CANCELLED:      { label: 'Đã hủy',      bg: '#F9FAFB', color: '#374151', darkBg: '#1f2937', darkColor: '#9ca3af' },
};

interface BugStatusPillProps {
  status: BugStatus;
  size?: 'sm' | 'md';
  style?: CSSProperties;
}

export function BugStatusPill({ status, size = 'md', style }: BugStatusPillProps) {
  const isDark = useThemeStore((s) => s.mode === 'dark');
  const fallback: PillConfig = { label: status, bg: '#F1F5F9', color: '#475569', darkBg: '#1E293B', darkColor: '#94A3B8' };
  const cfg = CONFIG[status] ?? fallback;

  const pillStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 9999,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    userSelect: 'none',
    backgroundColor: isDark ? cfg.darkBg : cfg.bg,
    color: isDark ? cfg.darkColor : cfg.color,
    ...(size === 'sm'
      ? { fontSize: 11, padding: '2px 8px', lineHeight: '16px' }
      : { fontSize: 12, padding: '3px 10px', lineHeight: '18px' }),
    ...style,
  };

  return <span style={pillStyle}>{cfg.label}</span>;
}
```

### Files cần update (chạy grep để xác nhận danh sách đầy đủ)

```bash
grep -r "BugStatusTag" apps/web/src --include="*.tsx" -l
```

Dự kiến: `BugDetailDrawer.tsx`, `MyBugsPage.tsx`, `BugListPage.tsx` và có thể các file khác.

### References

- `apps/web/src/components/bugs/BugStatusTag.tsx` — file sẽ bị xóa
- `apps/web/src/components/ui/TaskStatusPill.tsx` — tham chiếu pattern
- `apps/web/src/api/bugs.api.ts` — type `BugStatus`
