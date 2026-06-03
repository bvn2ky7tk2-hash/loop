---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-06-03'
inputDocuments:
  - "architecture.md"
  - "ui-design-guidelines.md"
  - "loop-product-roadmap.md"
workflowType: 'architecture'
scope: 'mobile-completion'
project_name: 'Loop'
user_name: 'Tuan Anh'
date: '2026-06-03'
---

# Mobile Architecture Decision Document — Hoàn thiện app Loop Mobile

_Tài liệu kiến trúc chuyên biệt cho nỗ lực HOÀN THIỆN app mobile (`apps/mobile`). Tài liệu này **bổ sung, KHÔNG thay thế** `architecture.md` (kiến trúc hệ thống tổng). Tập trung 2 trụ: (1) đồng bộ Design System mobile↔web, (2) mở rộng độ phủ nghiệp vụ trên mobile._

> **Mục tiêu (do Tuan Anh chốt):**
> 1. **Đồng bộ Design System** mobile ↔ web (preset màu, palette token, dark/light).
> 2. **Mở rộng độ phủ nghiệp vụ** mobile (Payslip, KB, Calendar, OT, Booking, Feed, Contracts/Insurance...).
>
> **Quyết định nền (đã chốt):** lớp token chung đặt tại `packages/shared/design-tokens`; tài liệu chi tiết tới spec màn hình theo phase.

---

## 1. Phân tích bối cảnh (Project Context Analysis)

### 1.1 Hiện trạng app mobile

| Hạng mục | Trạng thái |
|---|---|
| **Stack** | Expo SDK 56, RN 0.85.3, React 19.2, expo-router (typed routes), React Query 5, Zustand 5, react-native-paper 5 (MD3) |
| **Auth** | JWT trong `expo-secure-store`, auto-refresh khi 401 ([client.ts](../../apps/mobile/src/api/client.ts)) |
| **Tenant isolation** | ✅ ĐÚNG — tenantId nằm trong JWT, backend re-derive từ DB. Mobile **không cần** gửi header tenant ([jwt.strategy.ts:69](../../apps/backend/src/auth/strategies/jwt.strategy.ts#L69)) |
| **Luồng hoàn chỉnh (9)** | Login, Dashboard, Tasks, Timesheet, Leaves, Expenses, Approvals, Processes/BPM, Notifications, Profile |
| **Còn khung** | Bugs (`bugs.tsx` + `bug/[id].tsx`) — API có, UI trống |
| **Design system** | ❌ Chỉ có mode light/dark/system; KHÔNG preset; KHÔNG palette tập trung; STATUS_COLORS hardcode rải rác |

### 1.2 Ràng buộc kỹ thuật & phụ thuộc

- **`packages/shared` build bằng `tsc` → `dist/` (CommonJS).** Module token chung PHẢI là **TypeScript thuần, zero-dependency React** để cả web (Vite/ESM) lẫn mobile (Metro) cùng `import` được. Mọi logic phụ thuộc React (`useThemeStore`, `useColorScheme`) PHẢI nằm ở wrapper hook riêng từng app — KHÔNG đặt trong `packages/shared`.
- **Mobile có mode `'system'`** (web chỉ light/dark). Hook palette mobile PHẢI resolve `'system'` qua `useColorScheme()` trước khi tính `isDark`.
- **react-native-paper là MD3** — token màu của Paper (`primary`, `onSurface`, `surfaceVariant`...) khác tên với palette web (`textPrimary`, `bgCard`...). Cần lớp **map (adapter)** giữa hai hệ, không thay thế lẫn nhau.
- **AGENTS.md mobile bắt buộc:** đọc docs Expo SDK 56 chính xác trước khi viết code Expo mới (`https://docs.expo.dev/versions/v56.0.0/`).

### 1.3 Cross-cutting concerns nhận diện

1. **Component không tái dùng được giữa 2 nền.** Web dùng AntD + React DOM (`<PageHeader>`, `<StatCard>`, `<CenteredModal>`, `<Table>`). Những thứ này **KHÔNG render trên React Native.** → "Đồng bộ design system" = **chia sẻ TOKEN (giá trị màu, preset, khoảng cách)**, KHÔNG chia sẻ COMPONENT. Mobile cần **thư viện component riêng "soi gương" web**, dựng trên react-native-paper.
2. **Giới hạn tab bar.** Mobile hiện ~7 tab hiển thị; thêm 6–8 module nữa sẽ vỡ UX. Cần **kiến trúc điều hướng phân tầng** (tab cốt lõi + hub "Thêm").
3. **Backend gap.** 3 module thiếu endpoint self-service (Contracts, Insurance, Recruitment referral) — phải làm backend TRƯỚC khi làm UI.
4. **Vận hành.** Chưa có Error Boundary / crash reporting; push notification & work-status chưa wire; chưa có lộ trình build lên thiết bị.

---

## 2. TRỤ 1 — Kiến trúc đồng bộ Design System

### 2.1 Quyết định cốt lõi (ADR-M01)

> **Tách "token" khỏi "component". Chia sẻ token qua `packages/shared/design-tokens`; mỗi nền tự dựng lớp hook + component riêng.**

```
packages/shared/src/design-tokens/        ← TS thuần, zero React, dùng chung WEB + MOBILE
  presets.ts        → 12 ThemePreset (loop, minimal, navy, ... midnight)
  palette.ts        → getPalette(preset, isDark): PaletteTokens (10 token)
  status-colors.ts  → STATUS_COLORS theo domain (task/project/leave/expense/bug...)
  spacing.ts        → spacing scale, radius, fontSize (đồng bộ borderRadius:8, fontSize gốc)
  index.ts          → re-export
```

**Lý do tách:**
- `packages/shared` đã build `tsc → dist` không bundler → không thể chứa JSX/React hook.
- Web đã có `theme.store.ts` (Zustand) + `useThemePalette` (React). Mobile sẽ có bản tương ứng. Cả hai **gọi cùng `getPalette()` thuần** → một nguồn sự thật cho GIÁ TRỊ; mỗi nền giữ binding React riêng.
- Rủi ro refactor web thấp: web chỉ đổi *nguồn* của bảng giá trị (từ inline trong hook → import từ shared), **không đổi API hook** → component web không phải sửa.

### 2.2 Mô hình dữ liệu token (shared, thuần TS)

```typescript
// packages/shared/src/design-tokens/presets.ts
export interface ThemePreset {
  id: string;
  name: string;
  primary: string;
  hover: string;
  active: string;
  navBg: string;        // web-only: nền sidebar/topbar
  navText: string;
  navTheme?: 'dark' | 'light';
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  loop:     { id: 'loop',     name: 'Loop',     primary: '#0052CC', hover: '#2684FF', active: '#003E99', navBg: '#0052CC', navText: '#fff' },
  minimal:  { id: 'minimal',  name: 'Minimal',  primary: '#0052CC', hover: '#2684FF', active: '#003E99', navBg: '#ffffff', navText: '#172B4D', navTheme: 'light' },
  navy:     { id: 'navy',     name: 'Navy',     primary: '#2563EB', hover: '#3B82F6', active: '#1D4ED8', navBg: '#1E3A5F', navText: '#fff' },
  slate:    { id: 'slate',    name: 'Slate',    primary: '#475569', hover: '#64748B', active: '#334155', navBg: '#475569', navText: '#fff' },
  indigo:   { id: 'indigo',   name: 'Indigo',   primary: '#4F46E5', hover: '#4338CA', active: '#3730A3', navBg: 'linear-gradient(135deg,#3730A3,#4F46E5)', navText: '#fff' },
  ocean:    { id: 'ocean',    name: 'Ocean',    primary: '#0EA5E9', hover: '#0284C7', active: '#0369A1', navBg: 'linear-gradient(135deg,#075985,#0EA5E9)', navText: '#fff' },
  teal:     { id: 'teal',     name: 'Teal',     primary: '#14B8A6', hover: '#0D9488', active: '#0F766E', navBg: 'linear-gradient(135deg,#0F766E,#14B8A6)', navText: '#fff' },
  emerald:  { id: 'emerald',  name: 'Emerald',  primary: '#10B981', hover: '#059669', active: '#047857', navBg: 'linear-gradient(135deg,#047857,#10B981)', navText: '#fff' },
  rose:     { id: 'rose',     name: 'Rose',     primary: '#F43F5E', hover: '#E11D48', active: '#BE123C', navBg: 'linear-gradient(135deg,#9F1239,#E11D48)', navText: '#fff' },
  violet:   { id: 'violet',   name: 'Violet',   primary: '#7C3AED', hover: '#6D28D9', active: '#5B21B6', navBg: 'linear-gradient(135deg,#4C1D95,#7C3AED)', navText: '#fff' },
  amber:    { id: 'amber',    name: 'Amber',    primary: '#F59E0B', hover: '#D97706', active: '#B45309', navBg: 'linear-gradient(135deg,#78350F,#B45309)', navText: '#fff' },
  midnight: { id: 'midnight', name: 'Midnight', primary: '#38BDF8', hover: '#0284C7', active: '#0369A1', navBg: '#0F172A', navText: 'rgba(255,255,255,0.85)' },
};
```

```typescript
// packages/shared/src/design-tokens/palette.ts
export interface PaletteTokens {
  isDark: boolean;
  textPrimary: string; textSecondary: string; textMuted: string;
  bgPage: string; bgContainer: string; bgCard: string; bgSubPanel: string;
  borderColor: string; linkColor: string; primary: string;
}

// Bảng giá trị DUY NHẤT — trùng khít useThemePalette web hiện tại.
export function getPalette(preset: ThemePreset, isDark: boolean): PaletteTokens {
  return {
    isDark,
    textPrimary:   isDark ? '#F1F5F9'                : '#0F172A',
    textSecondary: isDark ? 'rgba(255,255,255,0.5)'  : '#475569',
    textMuted:     isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
    bgPage:        isDark ? '#0F172A'                : '#F1F5F9',
    bgContainer:   isDark ? '#1E293B'                : '#ffffff',
    bgCard:        isDark ? '#2D3F56'                : '#FAFAFA',
    bgSubPanel:    isDark ? '#1A2744'                : '#F8FAFC',
    borderColor:   isDark ? '#334155'                : '#E2E8F0',
    linkColor:     isDark ? '#93C5FD'                : preset.primary,
    primary:       preset.primary,
  };
}
```

> ⚠️ **navBg gradient** dùng cú pháp CSS `linear-gradient` — chỉ web hiểu. Mobile **bỏ qua navBg** (không có sidebar). Nếu sau này cần gradient header mobile, parse riêng bằng `expo-linear-gradient`; KHÔNG đưa logic parse vào shared.

### 2.3 Lớp binding phía Web (refactor tối thiểu — ADR-M02)

- `apps/web/src/store/theme.store.ts`: thay mảng preset inline bằng `import { THEME_PRESETS } from '@loop/shared'`. Giữ nguyên API store.
- `apps/web/src/hooks/useThemePalette.ts`: thay bảng giá trị inline bằng `return { ...getPalette(preset, mode === 'dark'), preset }`. **API hook không đổi** → 0 component web phải sửa.
- **Rủi ro:** thấp. Test bằng cách so sánh từng giá trị token trước/sau (đã liệt kê đầy đủ ở §2.2 — phải trùng khít).

### 2.4 Lớp binding phía Mobile (mới — ADR-M03)

**a) Nâng theme store mobile** thêm preset:

```typescript
// apps/mobile/src/store/theme.ts  (nâng cấp)
import { THEME_PRESETS, type ThemePreset } from '@loop/shared';

interface ThemeState {
  mode: ThemeMode;              // 'light' | 'dark' | 'system'  (giữ nguyên)
  presetId: string;            // MỚI — default 'loop'
  preset: ThemePreset;         // MỚI — derived
  setMode: (m: ThemeMode) => Promise<void>;
  setPreset: (id: string) => Promise<void>;   // MỚI
  loadTheme: () => Promise<void>;             // load cả mode + presetId
}
// Lưu presetId vào SecureStore key 'themePreset' (song song key 'themeMode' cũ)
```

**b) Port `useThemePalette` sang mobile** — resolve `'system'`:

```typescript
// apps/mobile/src/hooks/useThemePalette.ts  (MỚI)
import { useColorScheme } from 'react-native';
import { getPalette, type PaletteTokens } from '@loop/shared';
import { useThemeStore } from '../store/theme';

export function useThemePalette(): PaletteTokens & { preset: ThemePreset } {
  const sys = useColorScheme();
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'system' ? sys === 'dark' : mode === 'dark';
  return { ...getPalette(preset, isDark), preset };
}
```

**c) Map palette → react-native-paper MD3** (động theo preset) tại `app/_layout.tsx`:

```typescript
// Thay brandLightTheme/brandDarkTheme hardcode bằng builder động
function buildPaperTheme(preset: ThemePreset, isDark: boolean) {
  const base = isDark ? MD3DarkTheme : MD3LightTheme;
  const p = getPalette(preset, isDark);
  return {
    ...base,
    colors: {
      ...base.colors,
      primary:           preset.primary,
      onPrimary:         '#FFFFFF',
      primaryContainer:  `${preset.primary}22`,
      onPrimaryContainer: isDark ? '#F1F5F9' : preset.active,
      background:        p.bgPage,
      surface:           p.bgContainer,
      surfaceVariant:    p.bgCard,
      onSurface:         p.textPrimary,
      onSurfaceVariant:  p.textSecondary,
      outline:           p.borderColor,
    },
  };
}
```

### 2.5 Thống nhất STATUS_COLORS (ADR-M04)

Hiện mobile hardcode rải rác (`#10B981`, `#8C8C8C`, `#1B4F9C`...). Gom về shared theo **domain semantics** (khớp `project_color_system.md` của web):

```typescript
// packages/shared/src/design-tokens/status-colors.ts
export const STATUS_COLORS = {
  task:    { TODO:'#94A3B8', IN_PROGRESS:'#3B82F6', DONE:'#10B981', OVERDUE:'#EF4444', PENDING_APPROVAL:'#F59E0B' },
  project: { PLANNING:'#94A3B8', ACTIVE:'#3B82F6', ON_HOLD:'#F59E0B', CLOSED:'#64748B' },
  request: { PENDING:'#F59E0B', APPROVED:'#10B981', REJECTED:'#EF4444', CANCELLED:'#94A3B8', PAID:'#3B82F6' },
} as const;
```

Mobile dùng qua `<StatusBadge tone={...}>` (xem §2.6). Web giữ `<TaskStatusPill>`/`<StatusBadge>` hiện có nhưng đọc cùng bảng.

### 2.6 Thư viện component mobile "soi gương" web (ADR-M05)

> Component web KHÔNG port. Dựng bộ tương ứng tại `apps/mobile/src/components/ui/`, **cùng tên, cùng API tinh thần**, build trên react-native-paper + `useThemePalette()`.

| Web component | Mobile tương ứng | Ghi chú |
|---|---|---|
| `useThemePalette()` | `useThemePalette()` (§2.4b) | Cùng token, khác binding |
| `<PageHeader>` | `<PageHeader>` (RN) | title + icon + actions, dùng `bgContainer`/`textPrimary` |
| `<StatCard>` | `<StatCard>` (RN) | **giữ nguyên triết lý nền đặc màu** `linear-gradient(...) + color`, text trắng — dùng `expo-linear-gradient` |
| `<CenteredModal>` | dùng `<Portal>+<Modal>` của Paper | full-screen sheet, KHÔNG side-drawer |
| `<FilterBar>` + `<SearchInput>`/`<FilterSelect>` | bản RN (TextInput + Menu) | đồng nhất allowClear |
| `<StatusBadge>`/`<TaskStatusPill>` | bản RN (Chip) | đọc `STATUS_COLORS` shared |
| `<EmptyState>` | `<EmptyState>` (RN) | icon + title + desc + action |
| `<SectionCard>` | `<SectionCard>` (RN) | nền `bgCard` + border |
| `<DetailRow>`/`<DetailGrid>` | bản RN | cặp nhãn:giá trị, "—" khi rỗng |
| `confirmDelete()` | `confirmDelete()` (RN) | dùng Paper `<Dialog>` |
| `formatCurrency/Number/Hours` | **import thẳng `@loop/shared`** | thuần TS — DÙNG CHUNG được |

**Nguyên tắc bắt buộc mobile (mirror CLAUDE.md §1):**
1. Mọi màn hình mobile mới PHẢI dùng `useThemePalette()` — KHÔNG `useTheme()` của Paper trực tiếp cho màu nền/chữ, KHÔNG hardcode hex.
2. Stat card đầu trang → `<StatCard>` (RN) với bảng màu sáng (§ giống CLAUDE.md Nguyên tắc #8).
3. Detail popup/form → `<CenteredModal>` (Paper Modal), KHÔNG slide drawer.
4. Link/accent text → `linkColor` từ palette.
5. Xóa item → `confirmDelete()`.
6. Format số/tiền/giờ → import từ `@loop/shared`.

---

## 3. TRỤ 2 — Kiến trúc mở rộng độ phủ nghiệp vụ

### 3.1 Kiến trúc điều hướng phân tầng (ADR-M06)

Tab bar mobile chịu tải tốt ~5 mục. Hiện đã 7. Thêm 6–8 module → PHẢI tái cấu trúc:

```
Tab bar (5 cốt lõi, luôn hiển thị):
  [Tổng quan] [Công việc] [Bảng công] [Quy trình] [Thêm ▾]

"Thêm" = Hub màn hình lưới (grid menu) gom mọi module phụ — điều hướng bằng expo-router stack:
  Nghỉ phép · Chi phí · Tăng ca · Phiếu lương · Lịch · Đặt phòng · Đặt xe ·
  Bảng tin · Kiến thức · Hợp đồng · Bảo hiểm · Bug & Issues · Thông báo · Tài khoản

Approvals: giữ tab động (chỉ PM/ADMIN) HOẶC đưa badge vào "Thêm".
```

- **Route:** chuyển các màn ít dùng từ `app/(tabs)/*` sang `app/(more)/*` (stack), giữ deep-link. Tab "Thêm" trỏ `app/(tabs)/more.tsx` render grid.
- **Badge tổng hợp** trên tab "Thêm" = tổng số mục cần chú ý (notif chưa đọc + approvals...).

### 3.2 Pattern màn hình chung (3 khuôn mẫu — ADR-M07)

Mọi module nghiệp vụ mobile quy về 3 khuôn:

1. **List screen:** `PageHeader` → `StatCard` (tùy chọn) → `FilterBar` → `FlatList` (phân trang `onEndReached`) → `EmptyState`. React Query `useInfiniteQuery` cho endpoint phân trang.
2. **Detail modal:** `CenteredModal` → `DetailGrid` → action buttons (`confirmDelete` khi cần).
3. **Create/Edit form:** `CenteredModal` → form fields (Paper `TextInput`/`Menu`/`DatePickerField`) → submit qua `useMutation` + invalidate query.

→ Mỗi module mới = ráp 3 khuôn + 1 file `api/<module>.ts`. Giảm chi phí mỗi module xuống mức cơ học.

### 3.3 Backend gap — phải làm TRƯỚC UI (ADR-M08)

| Module | Thiếu | Việc backend (theo CLAUDE.md §8) |
|---|---|---|
| **Contracts** | Không có self-service | Thêm `GET /contracts/mine` → tự lọc theo `employeeId` của user đăng nhập (KHÔNG nhận employeeId tùy ý từ query → tránh lộ dữ liệu). `@Throttle`, `PaginationDto`. |
| **Insurance** | Không có self-service | Thêm `GET /hr-insurance/my-enrollment` → resolve employeeId từ JWT. |
| **Recruitment referral** | Chưa có tính năng | Xây mới: model `Referral` (tenantId + `@@index`), endpoint nhân viên submit ứng viên giới thiệu. Lớn → phase sau. |
| **Vehicle Booking** | `take:200` không phân trang | Bổ sung `PaginationDto` cho `listRequests()`. |

> Mọi endpoint mới tuân thủ CLAUDE.md §8: model API tự inject tenant; nếu raw SQL phải tự lọc tenant; `@Throttle` cho endpoint nặng; `PaginationDto`; resolve employeeId từ JWT (KHÔNG từ query param tùy ý).

### 3.4 Spec màn hình theo module

#### Phase 1 — Quick wins (API sẵn sàng, value cao)

**M1. Phiếu lương (Payslip)** ⭐ — `apps/mobile/app/(more)/payslip.tsx`
- API: `GET /payroll/my-records` (list), `GET /payroll/records/:id/payslip` (presigned PDF), `.../payslip/excel`.
- List: mỗi record = kỳ lương, lương ròng (StatCard tổng), trạng thái. Tap → Detail modal.
- Detail: `DetailGrid` (lương cơ bản, phụ cấp, khấu trừ, BHXH, thực nhận) + nút "Tải PDF" (mở presigned URL bằng `expo-web-browser`/`Linking`).
- Pattern: List + Detail. Độ phức tạp: **Thấp**. Không form.

**M2. Kiến thức (Knowledge Base)** — `app/(more)/kb/index.tsx` + `kb/[id].tsx`
- API: `GET /kb/articles?search&categoryId&page`, `GET /kb/articles/:id`, `GET /kb/categories`.
- List: `SearchInput` + `FilterSelect`(category) trong `FilterBar` → `FlatList` infinite. Detail: render nội dung (markdown → `react-native-markdown-display`).
- Pattern: List + Detail (read-only cho nhân viên). Độ phức tạp: **Trung**.

**M3. Lịch (Calendar)** — `app/(more)/calendar.tsx`
- API: `GET /calendar/month?year&month`, `GET /calendar/events?from&to`, `POST/PATCH/DELETE /calendar/events`.
- UI: month grid (`react-native-calendars`) + list sự kiện ngày chọn + create modal.
- Pattern: List + Form. Độ phức tạp: **Trung-cao** (widget lịch).

#### Phase 2 — Mở rộng (workflow + booking)

**M4. Tăng ca (Overtime)** — `app/(more)/overtime.tsx`
- API: `GET /overtime?status&month&year&page` (phân trang), `POST /overtime`, `GET /overtime/form-schema`, `PATCH /overtime/:id/cancel`.
- Pattern: List + Form (date/time picker, hours, reason) + cancel. Có BPM approval. Độ phức tạp: **Trung**.

**M5. Đặt phòng họp (Room Booking)** — `app/(more)/room-booking.tsx`
- API: `GET /rooms/available?startTime&endTime`, `GET /room-bookings?page`, `POST /room-bookings`, `DELETE /room-bookings/:id`.
- UI: time-range picker → danh sách phòng trống → đặt. (Gantt web KHÔNG bê — mobile dùng list "phòng trống theo khung giờ"). Độ phức tạp: **Trung** (đã đơn giản hóa khỏi Gantt).

**M6. Đặt xe (Vehicle Booking)** — `app/(more)/vehicle-booking.tsx`
- API: `GET /vehicle-booking/vehicles`, `GET /vehicle-booking/requests`, `POST .../requests`, `.../cancel`, `.../complete`. (Cần bổ sung phân trang — §3.3.)
- Pattern: List + Form + status tracking. BPM approval. Độ phức tạp: **Trung**.

**M7. Bảng tin (Feed)** — `app/(more)/feed.tsx`
- API: `GET /feed?type&page` (phân trang), `POST /feed`, `POST /feed/:id/react`, `DELETE /feed/:id`.
- UI: social feed (FlatList) + reaction. Post tạo nếu có quyền `feed:create`. Độ phức tạp: **Trung**.

#### Phase 3 — Self-service nâng cao + dọn nợ

**M8. Hợp đồng (Contracts)** — cần backend `GET /contracts/mine` trước. List + Detail read-only. **Thấp** (sau khi có API).

**M9. Bảo hiểm (Insurance)** — cần backend `GET /hr-insurance/my-enrollment` trước. Detail card read-only. **Thấp**.

**M10. Hoàn thiện Bugs** — `bugs.tsx` + `bug/[id].tsx` đang khung. API `/bugs` đã có. List + Detail + (đổi status nếu được phép). **Trung**.

**M11. Recruitment referral** — xây mới backend + UI. **Cao** (đánh giá lại cuối phase).

---

## 4. Hạ tầng vận hành (Operational Hardening — ADR-M09)

| Hạng mục | Quyết định |
|---|---|
| **Error Boundary** | Bọc root `app/_layout.tsx` bằng React error boundary (Expo Router `ErrorBoundary` export) → màn hình lỗi thân thiện thay vì crash trắng. |
| **Crash reporting** | Tích hợp `sentry-expo` (hoặc `expo-error-recovery` tối thiểu). Thêm env `EXPO_PUBLIC_SENTRY_DSN` → `.env.example`. Không log token (CLAUDE.md §3 FE). |
| **Push notification** | Wire `usePushNotifications` đầy đủ: xin quyền, lấy Expo push token, gửi token lên backend (cần endpoint `POST /notifications/device-token` — kiểm tra/῍thêm), nhận & route deep-link khi tap. |
| **Work status** | Wire `useWorkStatus` vào `StatusFAB` (đã có component) — hiển thị trạng thái làm việc, đồng bộ chấm công. |
| **Build lên thiết bị** | **Ưu tiên local build:** `expo run:ios --device` (theo feedback user — KHÔNG dùng Expo Go/EAS để giải thích). Tài liệu hoá lệnh + yêu cầu Xcode/provisioning trong README mobile. |

---

## 5. Implementation Patterns & Consistency Rules (Mobile)

### 5.1 Naming & structure
```
apps/mobile/
  app/
    (tabs)/        → 5 tab cốt lõi + more.tsx (hub)
    (more)/        → màn hình module phụ (stack)
    <entity>/[id]  → detail routes
  src/
    api/<module>.ts        → 1 file/module, dùng api client chung
    components/ui/          → thư viện component mirror web (§2.6)
    hooks/                  → useThemePalette, usePushNotifications, useWorkStatus
    store/                  → auth, theme (có preset)
packages/shared/src/design-tokens/   → token dùng chung
```

### 5.2 Quy tắc bắt buộc (enforcement cho AI Agents khi làm mobile)
1. ✅ Màu: `useThemePalette()` — KHÔNG hardcode hex, KHÔNG `useTheme()` Paper cho text/bg.
2. ✅ Format số/tiền/giờ: import `@loop/shared` (KHÔNG viết lại).
3. ✅ List: `useInfiniteQuery` + `FlatList onEndReached` cho endpoint phân trang — KHÔNG load all.
4. ✅ Modal/form: `<CenteredModal>` (Paper Modal full-screen) — KHÔNG side-drawer.
5. ✅ Status: `<StatusBadge>`/`STATUS_COLORS` shared — KHÔNG tự chế màu.
6. ✅ API: qua `src/api/client.ts` (có refresh token) — KHÔNG `fetch` trực tiếp nơi khác.
7. ✅ Endpoint mới (backend): tuân thủ CLAUDE.md §8 (tenant, throttle, pagination, resolve employeeId từ JWT).
8. ✅ Trước khi viết code Expo mới: đọc docs SDK 56 (AGENTS.md mobile).

---

## 6. Roadmap theo phase

> **KHÔNG ước lượng thời gian** (tốc độ AI-dev đã thay đổi căn bản). Thứ tự = phụ thuộc kỹ thuật + giá trị.

**Phase 0 — Nền tảng Design System (chặn các phase sau)**
1. Tạo `packages/shared/src/design-tokens/` (presets, palette, status-colors, spacing) + build.
2. Refactor web `theme.store.ts` + `useThemePalette.ts` đọc từ shared (ADR-M02) — verify token trùng khít.
3. Mobile: nâng `theme.ts` (preset), thêm `useThemePalette` (ADR-M03), `buildPaperTheme` động.
4. Dựng thư viện `components/ui/` mobile mirror web (ADR-M05) + thêm UI chọn preset trong Profile.
5. Hạ tầng: Error Boundary + Sentry + wire push/work-status (ADR-M09).

**Phase 1 — Quick wins:** M1 Payslip → M2 Knowledge Base → M3 Calendar. Tái cấu trúc navigation hub "Thêm" (ADR-M06) làm cùng M1.

**Phase 2 — Mở rộng:** M4 Overtime → M5 Room Booking → M6 Vehicle Booking (+ phân trang BE) → M7 Feed.

**Phase 3 — Self-service nâng cao + nợ kỹ thuật:** Backend `GET /contracts/mine` + `GET /hr-insurance/my-enrollment` → M8 Contracts, M9 Insurance → M10 hoàn thiện Bugs → (đánh giá) M11 Referral.

---

## 7. Kết quả thẩm định kiến trúc (Validation)

### 7.1 Checklist hoàn chỉnh
- ✅ Token chung tách khỏi component (giải quyết "không port được AntD").
- ✅ `packages/shared` giữ thuần TS (tương thích Metro + Vite).
- ✅ Mobile resolve `'system'` mode đúng.
- ✅ Tenant isolation không bị động chạm (đã đúng qua JWT).
- ✅ Navigation chịu tải module mới (hub "Thêm").
- ✅ Backend gap nhận diện & đặt đúng thứ tự (trước UI).
- ✅ Tuân thủ CLAUDE.md (§1 design, §3 security, §8 multi-tenant).

### 7.2 Gap / rủi ro còn lại
- **Web refactor regression:** đổi nguồn token có thể lệch 1 giá trị → bắt buộc so khớp bảng §2.2. Rủi ro thấp, kiểm soát được.
- **react-native-calendars / markdown-display:** thêm dependency mới → kiểm tương thích Expo SDK 56 trước (AGENTS.md).
- **Push token endpoint:** cần xác nhận backend đã có `device-token` chưa; nếu chưa → thêm (phase 0).
- **Referral (M11):** phạm vi lớn, chưa có nền backend — để cuối, re-scope riêng.

### 7.3 Bàn giao triển khai (Implementation Handoff)
Thứ tự khởi công: **Phase 0 (token + component + hạ tầng) → Phase 1 → 2 → 3.** Mỗi module = 1 file `api/` + ráp 3 khuôn màn hình (§3.2). Bước kế tiếp đề xuất: chạy `bmad-create-epics-and-stories` để cắt tài liệu này thành epic/story theo phase, rồi `bmad-dev-story` từng story.

---

_Hết tài liệu kiến trúc mobile. Cập nhật `architecture.md` hệ thống chỉ khi có thay đổi cấp hệ thống (vd thêm `packages/shared/design-tokens` vào sơ đồ monorepo) — nên ghi dạng Amendment, không sửa thân chính._
