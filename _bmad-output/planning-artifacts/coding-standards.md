# Loop Backend — Coding Standards

> **Mục đích:** Quy tắc bắt buộc áp dụng cho mọi module mới trong hệ thống Loop.  
> Được rút ra từ các lỗi thực tế đã gặp phải (rate limiting, connection pool, pagination).  
> Cập nhật mỗi khi phát hiện pattern lỗi mới.

---

## 1. Rate Limiting

### Quy tắc
- **Mọi API endpoint** đều được bảo vệ bởi `ThrottlerGuard` global (100 req/60s/IP).
- **Auth endpoints** (`/login`, `/refresh`) phải dùng `@Throttle` riêng, chặt hơn (≤ 10 req/60s).
- **Public endpoints** (không cần JWT) phải đặc biệt chú ý rate limit vì không có barrier token.

### Cách làm

```typescript
// ✅ Đúng — auth endpoint
@Post('login')
@Public()
@Throttle({ auth: { ttl: 60_000, limit: 10 } })
login(@Body() dto: LoginDto) { ... }

// ✅ Đúng — endpoint nhạy cảm (OTP, reset password)
@Post('forgot-password')
@Public()
@Throttle({ auth: { ttl: 3_600_000, limit: 5 } }) // 5 lần/giờ
forgotPassword() { ... }

// ❌ Sai — public endpoint không có @Throttle
@Post('register')
@Public()
register() { ... }
```

### Config mặc định (app.module.ts)
```typescript
ThrottlerModule.forRoot({
  throttlers: [
    { name: 'global', ttl: 60_000, limit: 100 },
    { name: 'auth',   ttl: 60_000, limit: 10  },
  ],
})
```

---

## 2. Database Connection Pool

### Quy tắc
- **Không dùng default Pool** — luôn config tường minh qua env vars.
- `DB_POOL_MAX` mặc định `20` — khi scale nhiều instance: `tổng_connections = instances × DB_POOL_MAX` không vượt `max_connections` của PostgreSQL (default 100).
- `DB_CONN_TIMEOUT` = 5000ms — fail fast thay vì treo request vô tận.

### Cách làm

```typescript
// ✅ Đúng — prisma.service.ts
const pool = new Pool({
  connectionString: process.env['DATABASE_URL'],
  max:                     parseInt(process.env['DB_POOL_MAX']     ?? '20'),
  idleTimeoutMillis:       parseInt(process.env['DB_IDLE_TIMEOUT'] ?? '30000'),
  connectionTimeoutMillis: parseInt(process.env['DB_CONN_TIMEOUT'] ?? '5000'),
});

// ❌ Sai — không config pool
const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
```

### Env vars cần có trong .env.example
```
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=30000
DB_CONN_TIMEOUT=5000
```

### Công thức scale
```
PostgreSQL max_connections (default 100)
÷ số NestJS instances
= DB_POOL_MAX tối đa mỗi instance

Ví dụ: 3 instances → DB_POOL_MAX = 30 (giữ buffer 10 cho admin/migration)
```

---

## 3. Pagination

### Quy tắc
- **Mọi API trả về danh sách** phải có pagination — không có ngoại lệ.
- Dùng `PaginationDto` từ `src/common/dto/pagination.dto.ts` — không tự tạo lại.
- Default `limit = 50`, max `limit = 200` — không cho phép unlimited query.
- Response luôn bọc trong `PaginatedResult<T>` để frontend biết tổng số trang.
- **Ngoại lệ được phép:** tree/hierarchy data (`getProjectTaskTree`) — dùng flat load + build tree ở memory, nhưng phải giới hạn bằng project scope (không bao giờ query toàn bộ DB).

### Cách làm

```typescript
// ✅ Đúng — service
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';

async getItems(page = 1, limit = 50): Promise<PaginatedResult<Item>> {
  const where = { ... };
  const [data, total] = await this.prisma.$transaction([
    this.prisma.item.findMany({ where, skip: (page - 1) * limit, take: limit }),
    this.prisma.item.count({ where }),
  ]);
  return paginate(data, total, page, limit);
}

// ✅ Đúng — controller
@Get()
getItems(@Query() { page, limit }: PaginationDto) {
  return this.service.getItems(page, limit);
}

// ❌ Sai — không có pagination
async getItems() {
  return this.prisma.item.findMany({ where: { ... } });
}
```

### Response format chuẩn
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 50,
  "totalPages": 3
}
```

---

## 4. Input Validation

### Quy tắc
- Mọi body/query param phải qua DTO có `class-validator` decorator.
- `ValidationPipe` global đã bật `whitelist: true` + `forbidNonWhitelisted: true` — không cần lặp lại ở controller.
- Dùng `@Type(() => Number)` cho numeric query params (URL luôn là string).

```typescript
// ✅ Đúng — DTO
export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimateHours?: number;
}

// ❌ Sai — raw body không qua DTO
@Post()
create(@Body('name') name: string, @Body('hours') hours: number) { ... }
```

---

## 5. Authorization

### Quy tắc
- `JwtAuthGuard` global — mọi endpoint cần đánh `@Public()` tường minh nếu muốn public.
- Endpoint nào chỉ cho role cụ thể phải dùng `@Roles(Role.ADMIN, Role.PM)`.
- Không hardcode role check trong service — luôn qua guard/decorator.

```typescript
// ✅ Đúng
@Get('admin/stats')
@Roles(Role.ADMIN)
getStats() { ... }

// ❌ Sai — check role trong service
async getStats(userId: string) {
  const user = await this.prisma.user.findUnique(...);
  if (user.role !== 'ADMIN') throw new ForbiddenException();
}
```

---

## 6. Error Handling

### Quy tắc
- Dùng NestJS built-in exceptions: `NotFoundException`, `BadRequestException`, `ForbiddenException`, `ConflictException`.
- `GlobalExceptionFilter` đã xử lý Prisma errors (P2002 → 409, P2025 → 404) — không cần try/catch cho Prisma ở service.
- **Không bao giờ** trả về raw Prisma error hoặc stack trace ra client.

```typescript
// ✅ Đúng
async findOne(id: string) {
  const item = await this.prisma.item.findUnique({ where: { id } });
  if (!item) throw new NotFoundException('Không tìm thấy');
  return item;
}

// ❌ Sai — expose internal error
async findOne(id: string) {
  try {
    return await this.prisma.item.findUnique({ where: { id } });
  } catch (e) {
    throw new Error(e.message); // leak internal info
  }
}
```

---

## 7. Checklist khi tạo module mới

Trước khi merge một module mới, kiểm tra các mục sau:

- [ ] Tất cả list endpoint có `PaginationDto` + `PaginatedResult`
- [ ] Public endpoint có `@Throttle` phù hợp
- [ ] DTO đầy đủ validator cho mọi field
- [ ] Role guard đúng trên endpoint nhạy cảm
- [ ] Không có `findMany()` không có `take` limit
- [ ] Env vars mới được thêm vào `.env.example`
- [ ] Module được import vào `app.module.ts`
