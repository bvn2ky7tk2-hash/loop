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

### Nguyên tắc #2 — Mọi màu nền/chữ phải có isDark guard

```tsx
const { mode, preset } = useThemeStore();
const isDark = mode === 'dark';

// Text
const textPrimary   = isDark ? '#F1F5F9'               : '#0F172A';
const textSecondary = isDark ? 'rgba(255,255,255,0.5)'  : '#475569';
const textMuted     = isDark ? 'rgba(255,255,255,0.3)'  : 'rgba(0,0,0,0.35)';

// Nền — card PHẢI sáng hơn container cha (layering!)
const bgContainer = isDark ? '#1E293B' : '#ffffff';   // modal, drawer
const bgCard      = isDark ? '#2D3F56' : '#FAFAFA';   // card trong modal ← KHÁC bgContainer
const bgSubPanel  = isDark ? '#1A2744' : '#F8FAFC';   // footer, sub-section
const borderColor = isDark ? '#334155' : '#E2E8F0';

// Sidebar/Topbar — luôn tối, không cần isDark
const bgNav   = isDark ? '#0F172A' : preset.navBg;
const textNav = preset.navText;  // luôn '#fff' hoặc rgba white
```

### Nguyên tắc #3 — Active state: border + bg tint, text luôn đọc được

```tsx
// ✅ Chuẩn — active qua visual cue, không phụ thuộc màu accent làm text
{
  border: `2px solid ${preset.primary}`,
  background: isDark ? `${preset.primary}30` : `${preset.primary}0F`,
  color: isDark ? '#F1F5F9' : preset.primary,  // dark→trắng, light→accent
}
```

**Màu cấm hardcode (không guard):**
`#4F46E5` `#2563EB` `#7C3AED` (primary cứng) · `#0F172A` `#1E293B` `#475569` `#64748B` `#6B7280` (tối trên dark bg)

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
- [ ] `PaginationDto` + `PaginatedResult` cho mọi list endpoint
- [ ] `@Throttle` cho mọi public endpoint
- [ ] DTO đầy đủ validator
- [ ] `@Roles` đúng trên endpoint nhạy cảm
- [ ] Env vars mới → thêm vào `.env.example`
- [ ] Module import vào `app.module.ts`
- [ ] Component frontend: không hardcode primary color — dùng `preset.primary`
- [ ] Component frontend: mọi color/bg/border có `isDark` guard
- [ ] Component frontend: card bg khác modal/container bg (layering)
- [ ] Component frontend: sidebar text dùng `preset.navText` / `rgba(255,255,255,0.X)`

---

## 5. BRANDING

- Web title, copyright, footer: **"Loop.vn"** — không dùng "Loop" đơn thuần
- Logo: `/public/logo-icon.svg`

---

## 6. STACK & MONOREPO

```
apps/web/      → React 18, Vite, Ant Design 5, Zustand, TanStack Query
apps/backend/  → NestJS, Prisma ORM, PostgreSQL, BullMQ, MinIO
apps/mobile/   → React Native / Expo
packages/shared/ → shared types, utils dùng chung

_bmad-output/  → tài liệu thiết kế, PRD, planning artifacts (KHÔNG sửa khi dev)
```
