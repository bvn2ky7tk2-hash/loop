# Story 16.8: Global Feature Search Bar + Topbar Redesign

Status: ready

## Story

As a user,
I want a search bar in the topbar where I can type a feature name and press Enter to navigate directly to it,
So that I can access any section of the app quickly without having to hunt through the sidebar.

## Acceptance Criteria

1. Topbar layout thay đổi:
   - **Trái:** `[☰ Toggle]` `[+ Create ▾]` `[🔍 Search box]`
   - **Phải:** `[Chào buổi X, Tên] [🔔] [🎨] [👤]`
   - Greeting **không còn** ở giữa (absolute center) — di chuyển sang vùng phải, trước bell icon.
2. Search box placeholder: `'Tìm chức năng...'`, width `220px` (desktop), icon `SearchOutlined` bên trái.
3. Gõ text → hiển thị dropdown gợi ý tìm trong danh sách menu từ `MODULES` config — tìm theo `label` của item và group.
4. Mỗi gợi ý hiển thị: icon chức năng + tên chức năng + tên module (sub-label).
5. Tối đa **8 kết quả** trong dropdown.
6. Nhấn `Enter` hoặc click vào gợi ý → navigate tới route tương ứng + đóng dropdown.
7. Nhấn `Escape` → xóa input + đóng dropdown.
8. Search **không phân biệt dấu** tiếng Việt (ví dụ: "quan li" tìm được "Quản lý").
9. Khi không có kết quả → hiển thị `'Không tìm thấy chức năng'`.
10. Search box styling: nền `rgba(255,255,255,0.12)`, border `rgba(255,255,255,0.25)`, text + placeholder màu trắng — nhất quán với topbar.
11. TypeScript compile không lỗi.

## Tasks / Subtasks

- [ ] Task 1: Tạo `apps/web/src/components/layout/GlobalSearch.tsx` (AC: 2–10)
  - [ ] Build danh sách searchable items từ `MODULES` (flatten tất cả `groups[].items[]`)
  - [ ] Implement search logic: normalize dấu, filter theo label
  - [ ] Render dropdown với icon + label + module name
  - [ ] Wire keyboard: Enter → navigate, Escape → clear
  - [ ] Style input + dropdown theo dark/topbar theme

- [ ] Task 2: Cập nhật `AppTopbar.tsx` — thêm `GlobalSearch` + move greeting sang phải (AC: 1)
  - [ ] Xóa `position: 'absolute', left: '50%', transform: 'translateX(-50%)'` của greeting div
  - [ ] Di chuyển greeting vào vùng right, trước `NotificationBell`
  - [ ] Thêm `<GlobalSearch />` vào vùng left, sau nút Create

- [ ] Task 3: Verify TypeScript compile (AC: 11)
  - [ ] `cd apps/web && npx tsc --noEmit`

## Dev Notes

### Cấu trúc dữ liệu searchable items

```typescript
interface SearchItem {
  key: string;       // route key, ví dụ '/tasks'
  label: string;     // 'My Tasks'
  moduleId: string;  // 'pm'
  moduleLabel: string; // 'Projects'
  icon: ReactNode;   // từ ICON_MAP
}

// Build từ MODULES config
const buildSearchItems = (): SearchItem[] =>
  MODULES.flatMap((mod) =>
    mod.groups.flatMap((g) =>
      g.items
        .filter((item) => item.visible)
        .map((item) => ({
          key: item.key,
          label: item.label,
          moduleId: mod.id,
          moduleLabel: mod.label,
          icon: ICON_MAP[item.key] ?? <AppstoreOutlined />,
        }))
    )
  );
```

### Normalize dấu tiếng Việt (AC: 8)

```typescript
const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const filterItems = (query: string): SearchItem[] => {
  if (!query.trim()) return [];
  const q = normalize(query);
  return ALL_ITEMS.filter(
    (item) => normalize(item.label).includes(q) || normalize(item.moduleLabel).includes(q)
  ).slice(0, 8);
};
```

### Template `GlobalSearch.tsx`

```tsx
import { useState, useRef, useEffect } from 'react';
import { Input } from 'antd';
import { SearchOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useModuleStore } from '../../store/module.store'; // để switch module khi navigate
import { MODULES, ICON_MAP } from '../../config/modules.config';
import { useThemeStore } from '../../store/theme.store';

// (searchItem types + buildSearchItems + normalize + filterItems như Dev Notes trên)

export function GlobalSearch() {
  const [query, setQuery]       = useState('');
  const [open, setOpen]         = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const navigate   = useNavigate();
  const inputRef   = useRef<any>(null);
  const results    = filterItems(query);

  const handleSelect = (item: SearchItem) => {
    navigate(item.key);
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { setActiveIdx((i) => Math.min(i + 1, results.length - 1)); e.preventDefault(); }
    if (e.key === 'ArrowUp')   { setActiveIdx((i) => Math.max(i - 1, 0)); e.preventDefault(); }
    if (e.key === 'Enter' && results[activeIdx]) { handleSelect(results[activeIdx]); }
    if (e.key === 'Escape')    { setQuery(''); setOpen(false); }
  };

  return (
    <div style={{ position: 'relative' }}>
      <Input
        ref={inputRef}
        prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.5)' }} />}
        placeholder="Tìm chức năng..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIdx(0); }}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{
          width: 220,
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 8,
          color: '#fff',
        }}
      />
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: 4,
          width: 280,
          background: /* isDark */ '#1E293B' /* light: #fff */,
          border: '1px solid #334155',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          zIndex: 1000,
          overflow: 'hidden',
        }}>
          {results.length === 0 ? (
            <div style={{ padding: '10px 14px', color: '#94A3B8', fontSize: 13 }}>
              Không tìm thấy chức năng
            </div>
          ) : results.map((item, idx) => (
            <div
              key={item.key}
              onMouseDown={() => handleSelect(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 14px',
                cursor: 'pointer',
                background: idx === activeIdx ? 'rgba(255,255,255,0.08)' : 'transparent',
              }}
            >
              <span style={{ color: '#94A3B8', fontSize: 16 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 13, color: '#F1F5F9', fontWeight: 500 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>{item.moduleLabel}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

> **Lưu ý `isDark`:** Dropdown popup cần dùng `isDark` guard cho background — refine khi implement:
> `background: isDark ? '#1E293B' : '#ffffff'`, `border: isDark ? '#334155' : '#E2E8F0'`.

### Topbar layout sau story này

```tsx
{/* Left */}
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <Button ... />           {/* Toggle sidebar */}
  <Dropdown ...>           {/* Create dropdown */}
  <GlobalSearch />         {/* NEW */}
</div>

{/* Right */}
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  {/* Greeting — di chuyển vào đây từ center */}
  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.62)' }}>{greeting},</span>
  <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>{firstName}</span>

  <NotificationBell ... />
  <Popover ...>            {/* Theme */}
  <Dropdown ...>           {/* User menu */}
</div>
```

### Navigation khi chọn kết quả

Khi navigate tới route, cần đồng thời **switch module** về module chứa route đó. Kiểm tra `useModuleStore` xem có `setModule(moduleId)` action không — nếu có thì gọi kèm.

### References

- `apps/web/src/components/layout/GlobalSearch.tsx` — tạo mới
- `apps/web/src/components/layout/AppTopbar.tsx` — tích hợp + move greeting
- `apps/web/src/config/modules.config.tsx` — `MODULES`, `ICON_MAP`
- `apps/web/src/store/module.store.ts` — kiểm tra action switch module
