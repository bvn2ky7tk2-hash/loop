# Loop — Quy tắc bắt buộc cho Dev & AI

> Dự án **Loop ERP** — Loop.vn  
> Mọi trao đổi và câu trả lời phải bằng **tiếng Việt**.  
> Tài liệu này là nguồn sự thật duy nhất. Đọc kỹ trước khi viết bất kỳ dòng code nào.

---

## Tài liệu chi tiết

| Tài liệu | Nội dung |
|---|---|
| [`../_bmad-output/planning-artifacts/ui-design-guidelines.md`](../_bmad-output/planning-artifacts/ui-design-guidelines.md) | Toàn bộ quy tắc UI, dark mode, palette, checklist |
| [`../_bmad-output/planning-artifacts/coding-standards.md`](../_bmad-output/planning-artifacts/coding-standards.md) | Rate limit, DB pool, pagination, validation, error handling |
| [`../_bmad-output/planning-artifacts/architecture.md`](../_bmad-output/planning-artifacts/architecture.md) | Kiến trúc hệ thống, module boundary, ADR |

---

## 1. DESIGN — Theme, Dark/Light, Màu sắc (Frontend)

Loop có **3 chiều theme** phải kiểm soát cùng lúc: `mode` (dark/light) + `preset` (9 màu) + `navBg` (sidebar).

### Nguyên tắc #1 — Không hardcode primary color

```tsx
// ❌ SAI — sai ngay khi user đổi preset
color: '#4F46E5'
background: '#2563EB33'

// ✅ ĐÚNG — theo preset hiện tại
const { mode, preset } = useThemeStore();
color: preset.primary
background: `${preset.primary}30`        // primary + ~20% opacity
border: `1px solid var(--color-primary)` // CSS var cũng OK
```

### Nguyên tắc #2 — Mọi màu nền/chữ phải dùng `useThemePalette()` — KHÔNG tự khai báo lại

Hook tập trung tại `hooks/useThemePalette.ts` — trả toàn bộ palette chuẩn:

```tsx
// ✅ ĐÚNG — 1 dòng thay vì 8 dòng khai báo lặp
import { useThemePalette } from '../../hooks/useThemePalette';

const { isDark, textPrimary, textMuted, bgCard, bgContainer, borderColor, linkColor, preset } = useThemePalette();

// ❌ SAI — tự khai báo lại trong từng component (đã bị xóa khỏi 20+ pages)
const { mode, preset } = useThemeStore();
const isDark = mode === 'dark';
const textPrimary = isDark ? '#F1F5F9' : '#0F172A';
// ... 6 dòng nữa
```

Bảng palette đầy đủ (nguồn sự thật duy nhất):

| Token | Dark | Light |
|---|---|---|
| `textPrimary` | `#F1F5F9` | `#0F172A` |
| `textSecondary` | `rgba(255,255,255,0.5)` | `#475569` |
| `textMuted` | `rgba(255,255,255,0.45)` | `rgba(0,0,0,0.45)` |
| `bgPage` | `#0F172A` | `#F1F5F9` |
| `bgContainer` | `#1E293B` | `#ffffff` |
| `bgCard` | `#2D3F56` | `#FAFAFA` |
| `bgSubPanel` | `#1A2744` | `#F8FAFC` |
| `borderColor` | `#334155` | `#E2E8F0` |
| `linkColor` | `#93C5FD` | `preset.primary` |

Layering nền (bắt buộc): `bgPage` < `bgContainer` < `bgCard` < `bgSubPanel`

Sidebar/Topbar — dùng `preset.navBg` / `preset.navText`, không cần `isDark` guard.

### Nguyên tắc #3 — Active state: border + bg tint, text luôn đọc được

```tsx
// ✅ Chuẩn — active qua visual cue, không phụ thuộc màu accent làm text
{
  border: `2px solid ${preset.primary}`,
  background: isDark ? `${preset.primary}30` : `${preset.primary}0F`,
  color: isDark ? '#F1F5F9' : preset.primary,  // dark→trắng, light→accent
}
```

### Nguyên tắc #4 — Link text và accent text phải dùng `linkColor`

`preset.primary` (vd `#4F46E5`) trên nền tối `#243044` cho tương phản **~1.4:1** — không đọc được.  
Mọi `<a>`, `<Button type="link">`, `<Text code>`, số/điểm highlight trong table **BẮT BUỘC** dùng:

```tsx
const linkColor = isDark ? '#93C5FD' : preset.primary;
// #93C5FD = blue-300, tương phản ~4:1 trên nền tối

// ✅ ĐÚNG
<a href={`mailto:${v}`} style={{ color: linkColor }}>{v}</a>
<Button type="link" style={{ padding: 0, color: linkColor }}>{name}</Button>
<Text code style={{ color: linkColor }}>{code}</Text>
<span style={{ color: linkColor, fontWeight: 600 }}>{score}</span>
valueStyle={{ color: linkColor }}  // Ant Design Statistic

// ❌ SAI — quá tối trên dark bg, tương phản không đủ
<a style={{ color: preset.primary }}>...</a>
```

### Nguyên tắc #5 — Column render trong Table: KHÔNG trả về plain string

Ant Design `colorText` token không đáng tin cậy trên mọi dark mode variant.  
Mọi render function của column **BẮT BUỘC** trả về JSX có `style={{ color: ... }}` tường minh:

```tsx
// ✅ ĐÚNG — luôn wrap trong Text với color tường minh
render: (v?: string) => v
  ? <Text style={{ color: textPrimary }}>{v}</Text>
  : <Text style={{ color: textMuted }}>—</Text>

render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>

// ❌ SAI — plain string, màu phụ thuộc token
render: (v) => v ?? '—'
render: (v) => dayjs(v).format('DD/MM/YYYY')
render: (v) => v ? `${v}M ₫` : '—'
```

### Nguyên tắc #6 — Tag màu trong dark mode: dùng explicit style

Ant Design dark algorithm **làm tối** tag preset-color, khiến tag bg tối hơn cả row bg → khó đọc.  
Tag dạng "nhãn nhóm/entity name" cần explicit style cho dark mode:

```tsx
// ✅ Tag xanh đọc được cả hai mode
<Tag
  style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}
  color={isDark ? undefined : 'blue'}
>
  {label}
</Tag>

// ✅ Tag xanh lá
<Tag
  style={isDark ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' } : {}}
  color={isDark ? undefined : 'green'}
>
  {label}
</Tag>

// ✅ Tag đỏ (cảnh báo)
<Tag
  style={isDark ? { background: 'rgba(248,113,113,0.15)', color: '#FCA5A5', borderColor: 'rgba(248,113,113,0.3)' } : {}}
  color={isDark ? undefined : 'red'}
>
  {label}
</Tag>

// Status Tag (OPEN/CLOSED, ASSIGNED…) — để dark algorithm xử lý là đủ, KHÔNG cần override
```

### Nguyên tắc #7 — KHÔNG dùng `components` override trên Table

```tsx
// ❌ KHÔNG BAO GIỜ — ghi đè global ConfigProvider token, gây header tối sai
<Table
  components={{ header: { cell: (props) => <th {...props} style={{ background: bgCard }} /> }}}
/>

// ✅ ĐÚNG — để App.tsx ConfigProvider xử lý header color toàn cục
<Table rowKey="id" columns={columns} dataSource={data} />
```

**Màu cấm hardcode (không guard):**
`#4F46E5` `#2563EB` `#7C3AED` (primary cứng) · `#0F172A` `#1E293B` `#475569` `#64748B` `#6B7280` (tối trên dark bg)

### Nguyên tắc #8 — StatCard: dùng component chung, nền đặc màu

Mọi "stat card / summary card" (thống kê đầu trang, KPI) **BẮT BUỘC** dùng `<StatCard>` từ `components/ui/StatCard.tsx`.

```tsx
import { StatCard } from '../../components/ui/StatCard';

// ✅ ĐÚNG
<StatCard label="Tổng tài sản" value={249} color="#F97316" icon={<LaptopOutlined />} />
<StatCard label="Đã thanh toán" value="1.200.000 đ" subValue="32 hóa đơn" color="#10B981" icon={<DollarOutlined />} />

// ❌ SAI — tự làm inline div + Statistic + bgCard
<div style={{ background: bgCard, border: `1px solid ${borderColor}`, ... }}>
  <Statistic valueStyle={{ color: preset.primary }} ... />
</div>
```

**Thiết kế StatCard:** nền đặc màu `linear-gradient(145deg, rgba(255,255,255,0.22), rgba(0,0,0,0.12)), ${color}` — text trắng hoàn toàn, không cần `isDark` guard, đẹp cả hai mode.

**Bảng màu StatCard chuẩn** — chỉ dùng màu sáng đủ tương phản với text trắng:

| Ý nghĩa | Màu |
|---|---|
| Primary / Tổng số | `#6366F1` (Indigo) |
| Thành công / Đã xong | `#10B981` (Emerald) |
| Cảnh báo / Chờ | `#F59E0B` (Amber) |
| Lỗi / Vượt ngưỡng | `#EF4444` (Red) |
| Thông tin | `#3B82F6` (Blue) |
| OT / Đặc biệt | `#F97316` (Orange) |
| Nhân sự / HR | `#8B5CF6` (Violet) |
| Trung lập | `#94A3B8` (Slate — chỉ khi không có dữ liệu) |

**Màu CẤM dùng trong StatCard** (tối, text trắng mất tương phản):  
`#B45309` `#D97706` `#059669` `#64748B` `preset.primary` (biến động) `linkColor` (biến động)

Chi tiết đầy đủ → [`ui-design-guidelines.md`](../_bmad-output/planning-artifacts/ui-design-guidelines.md)

---

## 2. CODE — Backend

### Rate Limiting
Mọi public endpoint phải có `@Throttle`. Auth endpoint ≤ 10 req/60s.

```typescript
@Post('login')
@Public()
@Throttle({ auth: { ttl: 60_000, limit: 10 } })
login(@Body() dto: LoginDto) {}
```

### Pagination
**Mọi API trả về danh sách** phải dùng `PaginationDto` + `PaginatedResult`. Không có `findMany()` không có `take`.

```typescript
async list(page = 1, limit = 50): Promise<PaginatedResult<T>> {
  const [data, total] = await this.prisma.$transaction([
    this.prisma.item.findMany({ skip: (page-1)*limit, take: limit }),
    this.prisma.item.count(),
  ]);
  return paginate(data, total, page, limit);
}
```

### Validation
Mọi body/query param qua DTO có `class-validator`. `ValidationPipe` global đã bật `whitelist: true`.

```typescript
export class CreateItemDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  @IsOptional() @IsInt() @Min(0)
  estimateHours?: number;
}
```

### Module Boundary
Cross-domain communication qua **Service interface**, không Prisma join trực tiếp qua domain boundary.

Chi tiết → [`coding-standards.md`](../_bmad-output/planning-artifacts/coding-standards.md)

---

## 3. SECURITY

### Backend

| Quy tắc | Cách làm |
|---|---|
| Auth mặc định | `JwtAuthGuard` global — public endpoint đánh `@Public()` tường minh |
| Role guard | `@Roles(Role.ADMIN)` trên controller — không check role trong service |
| Rate limit | `ThrottlerGuard` global (100/60s) — auth endpoint chặt hơn (10/60s) |
| Error response | Dùng NestJS exceptions (`NotFoundException`, `ForbiddenException`…) — **không** trả raw Prisma error hoặc stack trace |
| Raw SQL | Luôn dùng parameterized query — không nối string vào SQL |
| File upload | Validate MIME type + giới hạn size trước khi đưa vào MinIO |
| Env vars | Không commit `.env` — mọi biến mới thêm vào `.env.example` |

```typescript
// ✅ Error đúng
if (!item) throw new NotFoundException('Không tìm thấy');

// ❌ Không bao giờ
throw new Error(prismaError.message); // lộ internal info
res.json({ error: e.stack });          // lộ stack trace
```

### Frontend

| Quy tắc | Cách làm |
|---|---|
| XSS | Không dùng `dangerouslySetInnerHTML` — nếu bắt buộc phải sanitize trước |
| Token | Không `console.log` token/session data |
| API call | Mọi request qua `axios` instance có interceptor — không gọi `fetch` trực tiếp |
| Sensitive display | Mask password/token trong UI — không hiển thị full value |

---

## 4. CODE CHUNG

### Không làm
- Không viết `findMany()` không có `where` + `take` → có thể dump toàn bộ DB
- Không hardcode connection string, secret, API key trong source code
- Không tạo DTO mới khi đã có sẵn trong `src/common/`
- Không `catch` lỗi Prisma thủ công — `GlobalExceptionFilter` đã xử lý P2002→409, P2025→404
- Không viết comment giải thích WHAT — chỉ comment WHY khi logic không rõ ràng

### Phải làm khi tạo module mới

**Backend:**
- [ ] `PaginationDto` + `PaginatedResult` cho mọi list endpoint
- [ ] `@Throttle` cho mọi public endpoint
- [ ] DTO đầy đủ validator
- [ ] `@Roles` đúng trên endpoint nhạy cảm
- [ ] Env vars mới → thêm vào `.env.example`
- [ ] Module import vào `app.module.ts`

**Frontend — bắt buộc dùng component/hook chung:**
- [ ] Palette: dùng `useThemePalette()` — KHÔNG tự khai báo `textPrimary`, `bgCard`, `isDark`...
- [ ] Header trang: dùng `<PageHeader title icon actions />` — KHÔNG tự làm div inline
- [ ] Stat card đầu trang: dùng `<StatCard>` — KHÔNG tự làm div+Statistic
- [ ] Detail popup / form CRUD: dùng `<CenteredModal>` — KHÔNG dùng `<Drawer>` (Drawer mở bên phải, vi phạm UX hệ thống)
- [ ] Xóa item: dùng `confirmDelete({ itemName, onConfirm })` — KHÔNG dùng `Modal.confirm` inline
- [ ] Filter bar: dùng `<FilterBar>` bao ngoài các Select/Input filter
- [ ] Column toggle: dùng `<ColumnToggle>` + `useColumnVisibility`
- [ ] Phân trang: dùng `usePagination()` — KHÔNG dùng `pagination={{ pageSize: X }}` inline cứng
- [ ] Link/code/accent text: dùng `linkColor` từ `useThemePalette()` (xem Nguyên tắc #4)
- [ ] Column render Table: KHÔNG trả plain string — wrap trong `<Text style={{ color: textPrimary/textMuted }}>` (xem Nguyên tắc #5)
- [ ] Tag entity-name: dùng explicit isDark style (xem Nguyên tắc #6)
- [ ] KHÔNG dùng `components={{ header: { cell: ... }}}` trên Table (xem Nguyên tắc #7)
- [ ] StatCard: màu sáng đủ tương phản text trắng — tra bảng Nguyên tắc #8, cấm `preset.primary`/`linkColor`/màu tối

---

## 5. COMPONENT CHUNG — Bảng tra cứu nhanh

> Trước khi tự viết, hãy tra bảng này. Nếu đã có → dùng lại, không tạo mới.

### Hook

| Hook | File | Dùng khi |
|---|---|---|
| `useThemePalette()` | `hooks/useThemePalette.ts` | Mọi component cần màu (textPrimary, bgCard, linkColor...) |
| `useColumnVisibility()` | `hooks/useColumnVisibility.ts` | Table có ẩn/hiện cột |
| `usePermissions()` | `hooks/usePermissions.ts` | Kiểm tra quyền trong component |
| `usePagination()` | `hooks/usePagination.ts` | Phân trang chuẩn cho mọi Table (client-side & server-side) |

### UI Component

| Component | File | Dùng khi |
|---|---|---|
| `<PageHeader>` | `components/ui/PageHeader.tsx` | Header đầu mọi trang (title + icon + nút thêm) |
| `<StatCard>` | `components/ui/StatCard.tsx` | Stat/KPI card đầu trang (nền đặc màu) |
| `<SparklineCard>` | `components/ui/SparklineCard.tsx` | Stat card có sparkline chart (dashboard) |
| `<CenteredModal>` | `components/ui/CenteredModal.tsx` | Modal form + detail popup — thay thế cả `<Modal>` lẫn `<Drawer>` (KHÔNG dùng Drawer) |
| `<FilterBar>` | `components/FilterBar.tsx` | Thanh filter (bao ngoài Select/Input) |
| `<ColumnToggle>` | `components/ColumnToggle.tsx` | Toggle ẩn/hiện cột Table |
| `<TaskStatusPill>` | `components/ui/TaskStatusPill.tsx` | Badge trạng thái task |
| `<CanDo>` | `components/common/CanDo.tsx` | Permission gate |

### Utility function

| Function | File | Dùng khi |
|---|---|---|
| `confirmDelete()` | `components/ui/confirmDelete.ts` | Hộp thoại xác nhận xóa |
| `formatCurrency()` | `utils/format.ts` | Format tiền VNĐ |
| `formatNumber()` | `utils/format.ts` | Format số có dấu phân cách |
| `formatHours()` | `utils/format.ts` | Format giờ (8h 30m) |

### Pattern mẫu cho trang CRUD mới

```tsx
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { confirmDelete } from '../../components/ui/confirmDelete';

export default function MyPage() {
  const { textPrimary, textMuted, bgContainer, bgCard, borderColor, linkColor } = useThemePalette();
  // Client-side: const { resetPage, paginationProps } = usePagination(20);
  // Server-side: const { page, pageSize, resetPage, paginationProps } = usePagination(20);
  // useEffect(() => { resetPage(); }, [filter1, filter2, resetPage]);

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Tên module"
        icon={<SomeIcon />}
        iconColor="#6366F1"
        actions={<Button type="primary" icon={<PlusOutlined />}>Thêm</Button>}
      />

      {/* Stat cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}><StatCard label="Tổng" value={total} color="#6366F1" icon={<SomeIcon />} /></Col>
      </Row>

      {/* Filter */}
      <FilterBar>
        <Input prefix={<SearchOutlined />} placeholder="Tìm kiếm..." />
        <Select placeholder="Trạng thái" />
      </FilterBar>

      {/* Table */}
      <Table ... />
    </div>
  );
}
```

---

## 6. BRANDING

- Web title, copyright, footer: **"Loop.vn"** — không dùng "Loop" đơn thuần
- Logo: `/public/logo-icon.svg`

---

## 7. STACK & MONOREPO

```
apps/web/      → React 18, Vite, Ant Design 5, Zustand, TanStack Query
apps/backend/  → NestJS, Prisma ORM, PostgreSQL, BullMQ, MinIO
apps/mobile/   → React Native / Expo
packages/shared/ → shared types, utils dùng chung

_bmad-output/  → tài liệu thiết kế, PRD, planning artifacts (KHÔNG sửa khi dev)
```
