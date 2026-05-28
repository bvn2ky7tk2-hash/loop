# Loop Frontend — UI Design Guidelines

> **Mục đích:** Quy tắc bắt buộc cho mọi component UI mới trong Loop.  
> Rút ra từ lỗi thực tế (text tối trên nền tối, hardcode màu bị sai khi đổi theme, contrast thấp).  
> Cập nhật mỗi khi phát hiện pattern lỗi mới.

---

## Hiểu hệ thống theme của Loop

Loop có **3 chiều** cần kiểm soát đồng thời:

| Chiều | Giá trị | Nguồn |
|---|---|---|
| **Mode** | `light` \| `dark` | `useThemeStore().mode` |
| **Preset** | 9 preset (Loop, Indigo, Ocean, Teal, Emerald, Rose, Violet, Amber, Midnight) | `useThemeStore().preset` |
| **Nav** | Sidebar/topbar bg = gradient riêng mỗi preset | `preset.navBg` |

```
ThemePreset {
  primary:  string   // màu chủ đạo (buttons, links, active states)
  hover:    string   // hover state của primary
  active:   string   // pressed/active state của primary
  navBg:    string   // nền sidebar + topbar — luôn tối (gradient hoặc solid)
  navText:  string   // text trên navBg — luôn sáng (#fff hoặc rgba white)
}
```

**ConfigProvider** (`App.tsx`) đã map preset → Ant Design tokens tự động.  
**CSS custom properties** cũng được set: `--color-primary`, `--color-primary-20`, `--color-primary-40`…

---

## 1. Nguyên tắc vàng — Không bao giờ hardcode màu cụ thể

### Primary color

```tsx
// ❌ SAI — sẽ sai khi user đổi preset
border: '1px solid #4F46E5'
color: '#2563EB'
background: '#7C3AED33'

// ✅ ĐÚNG — luôn theo preset hiện tại
const { preset } = useThemeStore();
border: `1px solid ${preset.primary}`
color: preset.primary
background: `${preset.primary}33`   // primary + 20% opacity

// ✅ ĐÚNG — dùng CSS var (cho static CSS / STATIC_CSS block)
border: '1px solid var(--color-primary)'
background: 'var(--color-primary-20)'
```

### Sidebar / Nav

```tsx
// ❌ SAI — cứng màu, sẽ sai khi đổi preset
background: '#3949AB'
background: '#0F172A'

// ✅ ĐÚNG
const { mode, preset } = useThemeStore();
background: mode === 'dark' ? '#0F172A' : preset.navBg
color: preset.navText   // luôn sáng vì navBg luôn tối
```

---

## 2. Palette chuẩn cho inline style

Luôn import `useThemeStore` và tính các token sau:

```tsx
const { mode, preset } = useThemeStore();
const isDark = mode === 'dark';

// ── Primary (KHÔNG hardcode — theo preset) ────────────────────────────────────
const primary       = preset.primary;
const primaryBg     = `${preset.primary}18`;  // ~10% — hover bg nhẹ
const primaryBgMid  = `${preset.primary}30`;  // ~20% — active bg
const primaryBorder = preset.primary;

// ── Text ─────────────────────────────────────────────────────────────────────
const textPrimary   = isDark ? '#F1F5F9'               : '#0F172A';
const textSecondary = isDark ? 'rgba(255,255,255,0.5)'  : '#475569';
const textMuted     = isDark ? 'rgba(255,255,255,0.3)'  : 'rgba(0,0,0,0.35)';
const textOnNav     = preset.navText;   // text trên sidebar/topbar

// ── Background ────────────────────────────────────────────────────────────────
const bgLayout    = isDark ? '#0F172A' : '#F8FAFC';   // app body
const bgContainer = isDark ? '#1E293B' : '#ffffff';   // modal, drawer, card chính
const bgCard      = isDark ? '#2D3F56' : '#FAFAFA';   // card trong modal ← KHÁC bgContainer!
const bgCardHover = isDark ? '#354A62' : '#F1F5F9';
const bgSubPanel  = isDark ? '#1A2744' : '#F8FAFC';   // footer, sub-section
const bgNav       = isDark ? '#0F172A' : preset.navBg; // sidebar/topbar

// ── Border ────────────────────────────────────────────────────────────────────
const borderColor  = isDark ? '#334155' : '#E2E8F0';
const borderSubtle = isDark ? '#3D4F65' : '#E9EFF5';
const divider      = isDark ? '#1E293B' : 'rgba(255,255,255,0.18)';
```

---

## 3. Quy tắc nền có độ sâu (Layering)

Mỗi lớp UI phải **sáng hơn lớp cha** để tạo độ sâu. Không dùng cùng màu cho container và nội dung bên trong.

```
App layout bg    dark:#0F172A  /  light:#F8FAFC
  Sidebar        dark:#0F172A  /  light:preset.navBg     (luôn tối)
  Modal / Drawer dark:#1E293B  /  light:#ffffff
    Card         dark:#2D3F56  /  light:#FAFAFA    ← PHẢI khác modal bg!
      Row        dark:#243044  /  light:#F8FAFC
```

**Lỗi hay gặp:** card bg = `#1E293B` = modal bg → không phân biệt được.

---

## 4. Sidebar & Topbar — Luôn nền tối

`navBg` của mọi preset đều tối (gradient hoặc solid đậm).  
Text trong sidebar/topbar **không cần** `isDark` guard:

```tsx
// ✅ Sidebar text — luôn sáng
color: preset.navText              // chính — '#fff' hoặc 'rgba(255,255,255,0.85)'
color: 'rgba(255,255,255,0.5)'     // phụ
color: 'rgba(255,255,255,0.35)'    // mờ (role badge, hint)
```

---

## 5. Active state và Accent — Light vs Dark

Khi dùng màu accent (`preset.primary`) cho **text**, contrast trên nền tối thường thấp.  
Dùng accent cho **border + background tint**, text luôn đảm bảo đọc được:

```tsx
// ✅ Pattern chuẩn cho active item (card, tab, row...)
const activeStyle = {
  border: `2px solid ${preset.primary}`,
  background: isDark ? `${preset.primary}30` : `${preset.primary}0F`,
  color: isDark ? '#F1F5F9' : preset.primary,  // dark→trắng, light→màu accent
};

const inactiveStyle = {
  border: `2px solid ${borderColor}`,
  background: bgCard,
  color: textPrimary,
};
```

---

## 6. Màu cấm hardcode (không có guard)

| Màu | Lý do |
|---|---|
| `#4F46E5` `#2563EB` `#7C3AED` … | Hardcode primary color — sai khi đổi preset |
| `#0F172A` | Vô hình trên dark bg |
| `#1E293B` | Bằng nền container dark mode |
| `#374151` `#475569` | Quá tối, contrast < 3:1 trên dark bg |
| `#64748B` `#6B7280` | Borderline contrast, không đạt WCAG AA |
| `#E2E8F0` `#F1F5F9` | Màu sáng, vô hình trên light bg nếu dùng làm text |

---

## 7. Sử dụng ConfigProvider tokens (ưu tiên khi dùng Ant Design)

Ant Design components tự nhận token. Chỉ cần hardcode khi dùng **custom component inline style**.

| Token AntD | Dark | Light |
|---|---|---|
| `colorPrimary` | `preset.primary` | `preset.primary` |
| `colorText` | `#F1F5F9` | `#0F172A` |
| `colorTextSecondary` | `#94A3B8` | `#475569` |
| `colorBgContainer` | `#1E293B` | `#ffffff` |
| `colorBgLayout` | `#0F172A` | `#F8FAFC` |
| `colorBorder` | `#334155` | `#E2E8F0` |

---

## 8. CSS Custom Properties (cho class-based styles)

Dùng trong `STATIC_CSS` block hoặc khi không thể dùng JS:

```css
/* Primary variants */
var(--color-primary)        /* preset.primary */
var(--color-primary-20)     /* primary + 20% opacity */
var(--color-primary-40)     /* primary + 40% opacity */
var(--color-primary-hover)  /* preset.hover */
var(--color-primary-active) /* preset.active */
```

---

## 9. Checklist trước khi commit component mới

- [ ] **Không** hardcode primary color — dùng `preset.primary` hoặc `var(--color-primary)`
- [ ] **Không** hardcode `navBg` — dùng `preset.navBg`
- [ ] Mọi `color:` có `isDark` guard hoặc dùng AntD token
- [ ] Mọi `background:` phân biệt rõ với container cha (layering)
- [ ] Mọi `borderColor:` / `border:` có dark/light variant
- [ ] Text contrast đạt tối thiểu **4.5:1** (WCAG AA)
- [ ] Active state: border + bg tint, không dùng accent làm text duy nhất trong dark mode
- [ ] Sidebar text dùng `preset.navText` hoặc `rgba(255,255,255,0.X)` — không cần isDark

---

## 10. Ví dụ component đúng

- **Module Switcher Modal:** `apps/web/src/components/layout/ModuleSwitcherModal.tsx`
- **Slide Panel:** `apps/web/src/components/ui/SlidePanel.tsx`
- **Theme Panel:** `apps/web/src/components/ui/ThemePanel.tsx`
- **Theme + ConfigProvider setup:** `apps/web/src/App.tsx`
- **Theme Store + Presets:** `apps/web/src/store/theme.store.ts`

---

## Tham khảo thêm

- Backend coding standards: [`coding-standards.md`](./coding-standards.md)
- Architecture: [`architecture.md`](./architecture.md)
