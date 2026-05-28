# Story 16.4: Sign Out Dark Mode Fix & User Menu UX

Status: ready

## Story

As a user,
I want the user menu dropdown (avatar button in topbar) to look polished in both dark and light mode,
So that the "Sign out" area feels like a finished product, not an afterthought.

## Acceptance Criteria

1. Dropdown user menu trong dark mode có nền `#1E293B`, border `1px solid #334155` — không dùng Ant Design default dropdown bg.
2. Item tên user (disabled) hiển thị rõ: tên in đậm `#F1F5F9` (dark) / `#0F172A` (light), role dưới nhỏ hơn `rgba(255,255,255,0.5)` (dark) / `#64748B` (light).
3. "Sign out" item có icon `LogoutOutlined`, label "Đăng xuất" (tiếng Việt), màu `#EF4444` — rõ ràng là danger action.
4. Divider giữa tên user và "Đăng xuất" hiển thị đúng trong cả hai mode.
5. Dropdown hiển thị thêm email của user (bên dưới tên, nhỏ hơn role).
6. Avatar button có `Tooltip` "Tài khoản" khi hover.
7. Dropdown width tối thiểu `200px` để tên dài không bị wrap xấu.
8. TypeScript compile không lỗi.

## Tasks / Subtasks

- [ ] Task 1: Refactor `userMenuItems` trong `AppTopbar.tsx` (AC: 2, 3, 4, 5)
  - [ ] Cập nhật item tên user — thêm email, style theo isDark
  - [ ] Đổi label `'Sign out'` → `'Đăng xuất'`
  - [ ] Giữ `danger: true` trên item logout

- [ ] Task 2: Override Dropdown style bằng `overlayStyle` / `overlayInnerStyle` (AC: 1, 7)
  - [ ] Wrap `Dropdown` với `overlayInnerStyle` hoặc dùng `dropdownRender` để custom popup
  - [ ] Set `minWidth: 200`, nền và border theo `isDark`

- [ ] Task 3: Thêm Tooltip cho Avatar button (AC: 6)
  - [ ] Bọc `<Button>` avatar trong `<Tooltip title="Tài khoản">`

- [ ] Task 4: Verify TypeScript compile (AC: 8)
  - [ ] `cd apps/web && npx tsc --noEmit`

## Dev Notes

### Refactor `userMenuItems` trong `AppTopbar.tsx`

```tsx
// Lấy isDark từ useThemeStore — đã có sẵn trong component
const { mode, preset } = useThemeStore();
const isDark = mode === 'dark';

const textPrimary   = isDark ? '#F1F5F9'              : '#0F172A';
const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : '#64748B';

const userMenuItems = [
  {
    key: 'name',
    label: (
      <div style={{ padding: '4px 0' }}>
        <div style={{ fontWeight: 700, color: textPrimary, fontSize: 13 }}>
          {user?.name}
        </div>
        <div style={{ fontSize: 11, color: textSecondary, marginTop: 1 }}>
          {user?.email}
        </div>
        <div style={{ fontSize: 11, color: textSecondary, marginTop: 1 }}>
          {user?.role ?? 'MEMBER'}
        </div>
      </div>
    ),
    disabled: true,
  },
  { type: 'divider' as const },
  {
    key: 'logout',
    icon: <LogoutOutlined style={{ color: '#EF4444' }} />,
    label: <span style={{ color: '#EF4444' }}>Đăng xuất</span>,
    onClick: handleLogout,
  },
];
```

### Override Dropdown popup style

Ant Design 5 hỗ trợ `overlayInnerStyle` trên `<Dropdown>`:

```tsx
<Dropdown
  menu={{ items: userMenuItems }}
  placement="bottomRight"
  trigger={['click']}
  overlayInnerStyle={{
    background: isDark ? '#1E293B' : '#ffffff',
    border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
    borderRadius: 10,
    boxShadow: isDark
      ? '0 8px 24px rgba(0,0,0,0.4)'
      : '0 8px 24px rgba(0,0,0,0.12)',
    minWidth: 200,
    padding: '4px 0',
  }}
>
```

> **Lưu ý:** `overlayInnerStyle` áp dụng lên popup container. Nếu Ant Design version hiện tại không hỗ trợ, dùng `dropdownRender` để custom render toàn bộ popup.

### Tooltip cho Avatar button

```tsx
<Dropdown ...>
  <Tooltip title="Tài khoản" placement="bottom">
    <Button type="text" style={{ padding: '0 8px', height: 40 }}>
      <Avatar ... />
    </Button>
  </Tooltip>
</Dropdown>
```

> **Lưu ý Ant Design:** Khi `Tooltip` bọc `Dropdown`, `trigger` của `Dropdown` vẫn là `['click']` — không cần thay đổi gì khác.

### Vì sao không dùng `danger: true` của Ant Design cho logout

Ant Design `danger: true` không override được màu trong dark mode — text vẫn dùng Ant Design token `colorError`. Dùng inline style `color: '#EF4444'` đảm bảo hiển thị đúng trong cả hai mode.

### References

- `apps/web/src/components/layout/AppTopbar.tsx` — file chính cần sửa
- `apps/web/src/store/theme.store.ts` — `useThemeStore`
- `apps/web/src/store/auth.store.ts` — `user.email`
