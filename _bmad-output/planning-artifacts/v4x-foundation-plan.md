# Loop 360 — v4.x Foundation Plan & Architecture Standards

> **Mục đích kép:**  
> 1. Kế hoạch thực thi v4.1 → v4.3 — hoàn thiện nền móng trước v5  
> 2. Chuẩn kiến trúc bắt buộc — mọi module v5+ phải tuân thủ  
>  
> **Author:** Winston (System Architect)  
> **Date:** 2026-05-29  
> **Status:** Approved — áp dụng ngay từ v4.1

---

## Tại sao cần document này

Sau v4.0, codebase Loop đang ở trạng thái **"production-safe cho single-tenant"** nhưng có một số vấn đề mang tính hệ thống nếu không sửa ngay sẽ:

1. Gây data leak giữa tenant khi deploy multi-tenant (83/93 services thiếu tenantId filter)
2. Vỡ silently khi scale lên 2+ instance (EventEmitter in-memory)
3. Tích lũy nợ kỹ thuật khiến mỗi module v5 lại phải copy-paste 50+ dòng boilerplate

**Cam kết:** Sau v4.3, mọi module mới trong v5 chỉ cần extend `TenantAwareService`, implement business logic — tất cả cross-cutting concerns đã được xử lý tự động.

---

## Phần 1 — Đánh giá hiện trạng

### 1.1 Bảo mật — Điểm mạnh (giữ nguyên)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| httpOnly cookie + sameSite strict | ✅ | Đúng chuẩn, không cần thay đổi |
| Refresh token bcrypt hash | ✅ | Nếu DB bị lộ, token không dùng được |
| Helmet + CSP production | ✅ | Cấu hình đúng |
| Global ValidationPipe whitelist | ✅ | Không nhận field ngoài DTO |
| GlobalExceptionFilter | ✅ | Không leak stack trace / Prisma error |
| Rate limiting global + auth | ✅ | ThrottlerGuard global 100/60s, auth 10/60s |
| Zero `dangerouslySetInnerHTML` | ✅ | 0 occurrence trong toàn frontend |
| CORS whitelist | ✅ | Không dùng `*` |
| DB indexes (tenantId, deletedAt, status) | ✅ | Coverage tốt cho query patterns |

### 1.2 Vấn đề cần xử lý theo mức độ

| ID | Mức độ | Vấn đề | Ảnh hưởng |
|---|---|---|---|
| P1 | 🔴 SaaS Blocker | 83/93 services không filter tenantId | Data cross-tenant khi multi-tenant |
| P2 | 🔴 SaaS Blocker | JWT không có tenantId → DB lookup mỗi request | 100 users = 100 extra DB queries/giây |
| P3 | 🔴 Resilience | EventEmitter in-memory cho finance + BPM events | Vỡ hoàn toàn khi 2+ instance |
| P4 | 🟠 Production | Không có `enableShutdownHooks()` | Jobs bị cut khi pod terminate |
| P5 | 🟠 Production | Không có compression middleware | Responses không gzip, mobile suffer |
| P6 | 🟠 Performance | Dashboard APIs không cache | Recalculate mỗi request |
| P7 | 🟡 Minor | `module-config @Public` thiếu @Throttle | Info leak |
| P8 | 🟡 Minor | `today-events` full employee scan | Chậm khi > 500 nhân viên |
| P9 | 🟡 Tech debt | PDF payslip synchronous in-process | Block event loop khi bulk |
| P10 | 🔵 Future | MinIO single bucket không có tenant prefix | Data không tách biệt |

---

## Phần 2 — Execution Plan v4.x

### v4.1 — Quickfixes (0.5 ngày, làm trước)

5 fix độc lập, không dependency, làm song song trong 1 commit:

```
apps/backend/src/main.ts
  + import compression from 'compression';
  + app.use(compression());
  + app.enableShutdownHooks();

apps/backend/src/module-config/module-config.controller.ts
  @Get(':id/status')
  + @Throttle({ global: { ttl: 60_000, limit: 200 } })

apps/backend/src/dashboard/dashboard-v3.controller.ts
  today-events: findMany({ where: { isActive: true }, take: 500, ... })

apps/backend/package.json
  + "compression": "^1.7.4"
  + "@types/compression": "^1.7.5"
```

**Commit:** `fix(v4.1): compression, shutdown hooks, today-events scan, throttle module-config`

---

### v4.2 — Tenant Isolation (3–4 ngày) — SaaS Blocker

Đây là sprint quan trọng nhất. Chia làm 3 bước theo thứ tự dependency.

#### Bước 1: Tạo nền móng (nửa ngày)

**1a. Thêm tenantId vào JWT payload**

```typescript
// apps/backend/src/auth/auth.service.ts
// Thêm tenantId vào JwtPayload interface và sign()
const payload = {
  sub: user.id, email: user.email, role: user.role,
  orgUnitId: user.orgUnitId,
  tenantId: user.tenantId,   // ← THÊM
};

// apps/backend/src/auth/jwt.strategy.ts
// JwtPayload interface thêm tenantId
// validate(): KHÔNG cần DB lookup nữa
export interface JwtPayload {
  sub: string; email: string; role: string;
  orgUnitId: string | null;
  tenantId: string | null;   // ← THÊM
}

async validate(payload: JwtPayload) {
  // Bỏ prisma.user.findUnique — lấy từ JWT, không hit DB
  if (!payload.sub) throw new UnauthorizedException();
  return {
    id: payload.sub, email: payload.email, role: payload.role,
    orgUnitId: payload.orgUnitId, tenantId: payload.tenantId,
    isActive: true,
  };
}
```

> **Lưu ý:** Sau thay đổi này, mọi user cần login lại (token cũ không có tenantId). Chấp nhận được khi deploy.

**1b. Tạo `TenantAwareService` base class**

```typescript
// apps/backend/src/common/services/tenant-aware.service.ts
import { Inject, Optional } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

export interface TenantUser {
  id: string;
  tenantId?: string | null;
  role: string;
  orgUnitId?: string | null;
}

/**
 * Base class cho tất cả service có data access theo tenant.
 * Extends class này → tự động có getTenantId() và tenantWhere().
 * Không cần @Inject(REQUEST) thủ công trong mỗi service.
 */
export abstract class TenantAwareService {
  constructor(
    @Optional() @Inject(REQUEST) protected readonly _req?: any,
  ) {}

  /**
   * Lấy tenantId từ JWT (qua request context).
   * Fallback về DEFAULT_TENANT_ID khi chạy on-prem.
   */
  protected getTenantId(): string | undefined {
    return (
      this._req?.user?.tenantId ??
      this._req?.__tenantId ??
      process.env.DEFAULT_TENANT_ID ??
      undefined
    );
  }

  /**
   * Trả về where clause có tenantId kèm điều kiện thêm.
   * Nếu tenantId là undefined (on-prem / admin global), trả về chỉ extra.
   *
   * @example
   * this.tenantWhere({ deletedAt: null, status: 'ACTIVE' })
   * // → { tenantId: 'abc', deletedAt: null, status: 'ACTIVE' }
   */
  protected tenantWhere<T extends object>(extra?: T): T & { tenantId?: string } {
    const tid = this.getTenantId();
    return tid ? { tenantId: tid, ...(extra ?? {}) } as any : { ...(extra ?? {}) } as any;
  }
}
```

#### Bước 2: Roll-out tenantId filtering (2 ngày)

**Pattern chuẩn** — mỗi service chỉ cần 2 thay đổi:

```typescript
// TRƯỚC
@Injectable()
export class LeavesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 50) {
    const where = { deletedAt: null };
    // ... findMany({ where })
  }
}

// SAU
@Injectable()
export class LeavesService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req: any,          // ← thêm
  ) {
    super(req);                          // ← thêm
  }

  async findAll(page = 1, limit = 50) {
    const where = this.tenantWhere({ deletedAt: null });  // ← thay thế
    // ... findMany({ where }) — không đổi gì khác
  }
}
```

**Thứ tự roll-out theo batch:**

| Batch | Services | Priority |
|---|---|---|
| B1 — Financial | `payroll*.service`, `expenses.service`, `accounting.service`, `salary-records.service` | 🔴 Làm trước |
| B2 — HR | `leaves.service`, `overtime.service`, `hr-decisions.service`, `hr-insurance.service` | 🔴 Làm trước |
| B3 — Core | `assets.service`, `bugs/*.service`, `feed.service`, `timesheet.service` | 🟠 Ngày 2 |
| B4 — CRM/OKR | `okr.service`, `crm/activities`, `forecast.service`, `contacts.service` | 🟠 Ngày 2 |
| B5 — Supporting | `kb.service`, `calendar.service`, `room-booking.service`, `vehicle-booking.service` | 🟡 Ngày 3 |
| B6 — Platform | `alerts.service`, `notifications.service`, `reports.service`, `scheduled-reports.service` | 🟡 Ngày 3 |
| B7 — Admin | `users.service` (careful: admin có thể cần xem cross-tenant), `permissions.service` | 🟡 Ngày 4 |

**Module NestJS cần update** — thêm `scope: Scope.REQUEST` khi service dùng `@Inject(REQUEST)`:

```typescript
// Bắt buộc cho mọi TenantAwareService — REQUEST scope
@Module({
  providers: [
    { provide: LeavesService, useClass: LeavesService, scope: Scope.REQUEST },
  ],
})
export class LeavesModule {}
```

#### Bước 3: MinIO per-tenant path (2 giờ)

```typescript
// apps/backend/src/storage/storage.service.ts
upload(file: Buffer, filename: string, tenantId?: string): string {
  const prefix = tenantId ? `${tenantId}/` : 'shared/';
  const key = `${prefix}${randomUUID()}-${filename}`;
  // ... upload với key
}
```

---

### v4.3 — Resilience & Performance (2–3 ngày)

#### R-01: EventEmitter → BullMQ Events

**Vấn đề:** `ProcessEventBus` và `FinanceEventBus` dùng Node `EventEmitter`. Khi deploy 2+ instance, event fire trên instance A sẽ không đến listeners ở instance B.

**Solution — BullMQ as Event Bus:**

```typescript
// apps/backend/src/common/events/domain-event-bus.service.ts
import { Queue, Worker, Job } from 'bullmq';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../services/redis.service';

export interface DomainEvent<T = unknown> {
  type: string;
  payload: T;
  tenantId?: string;
  timestamp: Date;
}

@Injectable()
export class DomainEventBus implements OnModuleInit, OnModuleDestroy {
  private queues = new Map<string, Queue>();
  private workers = new Map<string, Worker>();

  constructor(private readonly redis: RedisService) {}

  async publish<T>(eventType: string, payload: T, tenantId?: string) {
    const queue = this.getQueue(eventType);
    await queue.add(eventType, { type: eventType, payload, tenantId, timestamp: new Date() });
  }

  subscribe<T>(eventType: string, handler: (event: DomainEvent<T>) => Promise<void>) {
    const worker = new Worker(
      eventType,
      async (job: Job<DomainEvent<T>>) => handler(job.data),
      { connection: this.redis.client },
    );
    this.workers.set(eventType, worker);
  }

  private getQueue(eventType: string): Queue {
    if (!this.queues.has(eventType)) {
      this.queues.set(eventType, new Queue(eventType, { connection: this.redis.client }));
    }
    return this.queues.get(eventType)!;
  }

  async onModuleInit() {}
  async onModuleDestroy() {
    await Promise.all([...this.queues.values()].map(q => q.close()));
    await Promise.all([...this.workers.values()].map(w => w.close()));
  }
}
```

**Migration:** Thay `this.eventBus.emit(...)` → `this.domainEventBus.publish(...)` trong `leaves.service`, `expenses.service`, `bpmn-engine.service`.

#### R-02: Redis Cache Layer cho Dashboard

```typescript
// apps/backend/src/common/decorators/cache-result.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const CACHE_TTL_KEY = 'cache_ttl';
export const CACHE_KEY_PREFIX = 'cache_key_prefix';

/**
 * @CacheResult(300) — cache response 5 phút, key tự động từ method + args + tenantId
 */
export const CacheResult = (ttlSeconds: number) =>
  SetMetadata(CACHE_TTL_KEY, ttlSeconds);
```

Pattern thủ công đơn giản hơn (dùng ngay, không cần interceptor):

```typescript
// Pattern chuẩn cho dashboard endpoints
async getFinanceSummary(tenantId: string): Promise<FinanceSummaryDto> {
  const key = `dashboard:finance:${tenantId}`;
  const cached = await this.redis.get(key);
  if (cached) return JSON.parse(cached);

  const data = await this.calcFinanceSummary(tenantId);
  await this.redis.setex(key, 300, JSON.stringify(data)); // TTL 5 phút
  return data;
}

// Invalidate khi có write operation liên quan
async approveInvoice(id: string, tenantId: string) {
  await this.prisma.invoice.update(...);
  await this.redis.del(`dashboard:finance:${tenantId}`); // ← invalidate cache
}
```

#### R-03: PDF Generation → BullMQ

```typescript
// Thay vì generate PDF synchronous trong request handler:
// TRƯỚC
@Get(':id/payslip')
async downloadPayslip(@Param('id') id: string, @Res() res: Response) {
  const pdf = await this.pdfService.generate(id); // blocks 500ms–2s
  res.send(pdf);
}

// SAU — async job pattern
@Post(':id/payslip-request')
async requestPayslip(@Param('id') id: string) {
  const jobId = await this.payslipQueue.add({ recordId: id });
  return { jobId, status: 'QUEUED' };
}

@Get('payslip-jobs/:jobId')
async checkPayslipJob(@Param('jobId') jobId: string) {
  const job = await this.payslipQueue.getJob(jobId);
  if (job?.returnvalue) return { status: 'DONE', url: job.returnvalue.url };
  return { status: job?.finishedOn ? 'DONE' : 'PROCESSING' };
}
```

---

## Phần 3 — Chuẩn kiến trúc bắt buộc (áp dụng từ v5+)

> **Nguyên tắc:** Mọi rule đều phải có *enforcement mechanism* — không chỉ là convention viết trong docs mà developer có thể bỏ qua.

---

### 3.1 Backend — Module Template Chuẩn

Mọi module NestJS mới trong v5 phải theo cấu trúc sau:

```
src/{domain}/
├── {domain}.module.ts          ← đăng ký REQUEST scope nếu có TenantAwareService
├── {domain}.controller.ts      ← chỉ routing + DTO validation, không business logic
├── {domain}.service.ts         ← extends TenantAwareService, chứa business logic
├── dto/
│   ├── create-{domain}.dto.ts  ← class-validator decorators đầy đủ
│   ├── update-{domain}.dto.ts  ← PartialType(CreateDto)
│   └── list-{domain}.dto.ts    ← extends PaginationDto
└── entities/                   ← (optional) type definitions
```

**Scaffold chuẩn — service:**

```typescript
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Scope } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { Audited } from '../common/interceptors/audit-log.interceptor';
import { Create{Domain}Dto } from './dto/create-{domain}.dto';
import { Update{Domain}Dto } from './dto/update-{domain}.dto';

@Injectable({ scope: Scope.REQUEST })  // ← BẮTBUỘC khi extends TenantAwareService
export class {Domain}Service extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req: any,          // ← BẮTBUỘC
  ) {
    super(req);
  }

  async findAll(page = 1, limit = 50): Promise<PaginatedResult<{Domain}>> {
    const where = this.tenantWhere({ deletedAt: null });  // ← tenantId auto-injected
    const [data, total] = await this.prisma.$transaction([
      this.prisma.{domain}.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,                    // ← BẮTBUỘC: luôn có take
      }),
      this.prisma.{domain}.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const item = await this.prisma.{domain}.findFirst({
      where: { id, ...this.tenantWhere({ deletedAt: null }) },
    });
    if (!item) throw new NotFoundException('Không tìm thấy');
    return item;
  }

  async create(dto: Create{Domain}Dto) {
    return this.prisma.{domain}.create({
      data: { ...dto, tenantId: this.getTenantId() },  // ← tenantId auto-set
    });
  }

  async update(id: string, dto: Update{Domain}Dto) {
    await this.findOne(id); // verify ownership + existence
    return this.prisma.{domain}.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.{domain}.update({
      where: { id },
      data: { deletedAt: new Date() },  // ← soft delete BẮTBUỘC
    });
  }
}
```

**Scaffold chuẩn — controller:**

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Audited } from '../common/interceptors/audit-log.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Role } from '../generated/prisma';
import { {Domain}Service } from './{domain}.service';
import { Create{Domain}Dto } from './dto/create-{domain}.dto';
import { Update{Domain}Dto } from './dto/update-{domain}.dto';

@ApiTags('{domain}')
@ApiBearerAuth()
@Controller('api/v1/{domain}')          // ← prefix chuẩn /api/v1/
@Throttle({ default: { ttl: 60_000, limit: 60 } })  // ← rate limit mặc định
export class {Domain}Controller {
  constructor(private readonly service: {Domain}Service) {}

  @Get()
  @RequirePermission(PERMISSIONS.{DOMAIN}_READ)
  @ApiOperation({ summary: 'Danh sách' })
  findAll(@Query() { page, limit }: PaginationDto) {
    return this.service.findAll(page, limit);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.{DOMAIN}_READ)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.{DOMAIN}_CREATE)
  @Audited('CREATE', '{Domain}')
  create(@Body() dto: Create{Domain}Dto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @RequirePermission(PERMISSIONS.{DOMAIN}_UPDATE)
  @Audited('UPDATE', '{Domain}')
  update(@Param('id') id: string, @Body() dto: Update{Domain}Dto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @RequirePermission(PERMISSIONS.{DOMAIN}_DELETE)
  @Audited('DELETE', '{Domain}')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
```

**Scaffold chuẩn — module:**

```typescript
import { Module, Scope } from '@nestjs/common';
import { {Domain}Service } from './{domain}.service';
import { {Domain}Controller } from './{domain}.controller';

@Module({
  providers: [
    {
      provide: {Domain}Service,
      useClass: {Domain}Service,
      scope: Scope.REQUEST,  // ← BẮTBUỘC khi service extends TenantAwareService
    },
  ],
  controllers: [{Domain}Controller],
  exports: [{Domain}Service],
})
export class {Domain}Module {}
```

---

### 3.2 Backend — Checklist trước khi merge module mới

Developer phải check TẤT CẢ trước khi tạo PR:

```
BACKEND MODULE CHECKLIST
─────────────────────────────────────────────────────────
□ Service extends TenantAwareService                    ← BẮTBUỘC
□ Service scope = Scope.REQUEST trong Module            ← BẮTBUỘC
□ Mọi findMany() có: take + this.tenantWhere()          ← BẮTBUỘC
□ Mọi findFirst/findUnique có: this.tenantWhere() guard ← BẮTBUỘC
□ create() set tenantId: this.getTenantId()             ← BẮTBUỘC
□ Xóa item dùng soft delete (deletedAt) không hard delete ← BẮTBUỘC (trừ log)
□ Controller có @Throttle tường minh trên mỗi endpoint  ← BẮTBUỘC
□ Mọi write endpoint có @Audited decorator              ← BẮTBUỘC
□ Mọi sensitive endpoint có @RequirePermission          ← BẮTBUỘC
□ DTO có class-validator đầy đủ (không bỏ sót field)   ← BẮTBUỘC
□ List endpoint trả về PaginatedResult<T>               ← BẮTBUỘC
□ Không dùng Node EventEmitter cho cross-service events ← BẮTBUỘC: dùng DomainEventBus
□ Không import Prisma trực tiếp qua domain boundary     ← BẮTBUỘC: dùng Service
□ Không catch lỗi Prisma thủ công                       ← GlobalExceptionFilter xử lý
□ SMTP/FCM job: enqueue qua BullMQ không gọi sync       ← BẮTBUỘC
□ Env var mới → thêm vào .env.example                   ← BẮTBUỘC
□ Module được import vào app.module.ts                  ← kiểm tra
```

---

### 3.3 Prisma Schema — Rules cho model mới

Mọi model entity (không phải lookup table) phải có:

```prisma
model {Entity} {
  id        String    @id @default(uuid())

  // ── Tenant isolation ──────────────────────────────────────────
  tenantId  String?   @map("tenant_id")           // ← BẮTBUỘC

  // ── Audit trail ───────────────────────────────────────────────
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt      @map("updated_at")
  deletedAt DateTime? @map("deleted_at")           // ← BẮTBUỘC (trừ log-only tables)

  // ── Unique constraint: scoped theo tenant ─────────────────────
  // Nếu entity có code/slug: dùng @@unique([tenantId, code])
  // Không dùng @unique đơn lẻ cho code khi có multi-tenancy
  @@unique([tenantId, code])  // ← pattern chuẩn

  // ── Indexes bắtbuộc ───────────────────────────────────────────
  @@index([tenantId])
  @@index([deletedAt])
  // + thêm index cho field hay query/filter

  @@map("{entity_table_name}")  // ← snake_case
}
```

**Enum:** Luôn có `@@map("enum_name")` với snake_case.  
**Relation:** FK field luôn có `@map("fk_field_name")`.  
**Decimal:** Dùng `@db.Decimal(15, 2)` cho tiền tệ — không dùng `Float`.

---

### 3.4 Frontend — Page Template Chuẩn

Mọi trang CRUD mới phải theo cấu trúc:

```
apps/web/src/
├── api/{domain}.ts              ← API client + React Query hooks
└── pages/{module}/{Domain}Page.tsx  ← Page component
```

**Scaffold chuẩn — API module:**

```typescript
// apps/web/src/api/{domain}.ts
import { apiClient } from './client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface {Domain} {
  id: string;
  // ... fields
  createdAt: string;
  updatedAt: string;
}

export interface Create{Domain}Dto {
  // ... required fields với type rõ ràng
}

export interface Paginated{Domain} {
  data: {Domain}[];
  total: number; page: number; limit: number; totalPages: number;
}

// ── API calls ─────────────────────────────────────────────────────────────────
export const {domain}Api = {
  list: (page = 1, limit = 50) =>
    apiClient.get<Paginated{Domain}>('/{domain}', { params: { page, limit } }).then(r => r.data),
  get: (id: string) =>
    apiClient.get<{Domain}>(`/{domain}/${id}`).then(r => r.data),
  create: (data: Create{Domain}Dto) =>
    apiClient.post<{Domain}>('/{domain}', data).then(r => r.data),
  update: (id: string, data: Partial<Create{Domain}Dto>) =>
    apiClient.patch<{Domain}>(`/{domain}/${id}`, data).then(r => r.data),
  remove: (id: string) =>
    apiClient.delete(`/{domain}/${id}`),
};

// ── React Query Hooks ──────────────────────────────────────────────────────────
export const {domain}Keys = {
  all:  ['/{domain}'] as const,
  list: (page: number, limit: number) => ['/{domain}', 'list', page, limit] as const,
  detail: (id: string) => ['/{domain}', id] as const,
};

export function use{Domain}List(page = 1, limit = 50) {
  return useQuery({
    queryKey: {domain}Keys.list(page, limit),
    queryFn: () => {domain}Api.list(page, limit),
  });
}

export function useCreate{Domain}() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: {domain}Api.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: {domain}Keys.all }),
  });
}

export function useUpdate{Domain}() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Create{Domain}Dto> }) =>
      {domain}Api.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: {domain}Keys.all }),
  });
}

export function useDelete{Domain}() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: {domain}Api.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: {domain}Keys.all }),
  });
}
```

**Scaffold chuẩn — Page component:**

```tsx
// apps/web/src/pages/{module}/{Domain}Page.tsx
import { useState } from 'react';
import { Table, Button, Input, Select, Form, Space, App, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader }    from '../../components/ui/PageHeader';
import { StatCard }      from '../../components/ui/StatCard';
import { FilterBar }     from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { useColumnVisibility } from '../../hooks/useColumnVisibility';
import { ColumnToggle }  from '../../components/ColumnToggle';
import {
  use{Domain}List, useCreate{Domain}, useUpdate{Domain}, useDelete{Domain},
  type {Domain}, type Create{Domain}Dto,
} from '../../api/{domain}';

const { Text } = Typography;

// ── Column definitions ────────────────────────────────────────────────────────
const COL_DEFS = [
  { key: 'name',      label: 'Tên' },
  { key: 'status',    label: 'Trạng thái' },
  { key: 'createdAt', label: 'Ngày tạo' },
];

export default function {Domain}Page() {
  const { message } = App.useApp();
  const { textPrimary, textMuted, linkColor, isDark } = useThemePalette();  // ← BẮTBUỘC

  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState<{Domain} | null>(null);
  const [search, setSearch]   = useState('');
  const [form]                = Form.useForm();

  const { isVisible, toggle } = useColumnVisibility('{domain}', COL_DEFS);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = use{Domain}List();
  const createMut = useCreate{Domain}();
  const updateMut = useUpdate{Domain}();
  const deleteMut = useDelete{Domain}();

  const items = data?.data ?? [];

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openCreate = () => { setEditing(null); form.resetFields(); setOpen(true); };
  const openEdit = (item: {Domain}) => {
    setEditing(item);
    form.setFieldsValue(item);
    setOpen(true);
  };
  const handleDelete = (item: {Domain}) => confirmDelete({
    itemName: item.name,
    onConfirm: () => deleteMut.mutateAsync(item.id)
      .then(() => message.success('Đã xóa'))
      .catch((e: any) => message.error(e?.response?.data?.message ?? 'Lỗi xóa')),
  });
  const handleFinish = async (values: Create{Domain}Dto) => {
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, data: values });
        message.success('Đã cập nhật');
      } else {
        await createMut.mutateAsync(values);
        message.success('Đã thêm');
      }
      setOpen(false);
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'Có lỗi xảy ra');
    }
  };

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns: ColumnsType<{Domain}> = [
    {
      title: 'Tên', dataIndex: 'name',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'Thao tác', key: 'actions', width: 90,
      render: (_: unknown, record: {Domain}) => (
        <Space>
          <Button type="text" size="small" icon={<EditOutlined />}
            style={{ color: linkColor }} onClick={() => openEdit(record)} />
          <Button type="text" size="small" icon={<DeleteOutlined />}
            danger onClick={() => handleDelete(record)} />
        </Space>
      ),
    },
  ].filter(c => !('dataIndex' in c) || isVisible(c.dataIndex as string));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="{Tên Module}"
        icon={<PlusOutlined />}
        iconColor="#6366F1"
        actions={
          <Space>
            <ColumnToggle defs={COL_DEFS} isVisible={isVisible} onToggle={toggle} />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm</Button>
          </Space>
        }
      />

      {/* StatCards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <StatCard label="Tổng" value={items.length} color="#6366F1" icon={<PlusOutlined />} />
        </div>
      </div>

      <FilterBar>
        <Input
          prefix={<SearchOutlined />} placeholder="Tìm kiếm..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: 260 }}
        />
      </FilterBar>

      <Table<{Domain}>
        rowKey="id"
        columns={columns}
        dataSource={items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))}
        loading={isLoading}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `${t} mục` }}
      />

      <CenteredModal
        title={editing ? 'Chỉnh sửa' : 'Thêm mới'}
        open={open}
        onClose={() => setOpen(false)}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => setOpen(false)} disabled={createMut.isPending || updateMut.isPending}>Huỷ</Button>
            <Button type="primary" loading={createMut.isPending || updateMut.isPending}
              onClick={() => form.submit()}>
              {editing ? 'Lưu' : 'Thêm'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item name="name" label="Tên" rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input maxLength={200} />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
```

---

### 3.5 Frontend — Checklist trước khi merge trang mới

```
FRONTEND PAGE CHECKLIST
─────────────────────────────────────────────────────────
□ Dùng useThemePalette() — KHÔNG tự khai báo textPrimary, bgCard, isDark   ← BẮTBUỘC
□ Dùng <PageHeader> — KHÔNG tự làm div inline                               ← BẮTBUỘC
□ Stat card dùng <StatCard> với màu sáng (tra bảng Nguyên tắc #8)           ← BẮTBUỘC
□ Xóa item dùng confirmDelete() — KHÔNG Modal.confirm inline                ← BẮTBUỘC
□ Filter bar dùng <FilterBar> bao ngoài                                      ← BẮTBUỘC
□ Column render trả về JSX với color tường minh — KHÔNG plain string         ← BẮTBUỘC
□ Link/accent text dùng linkColor từ useThemePalette()                       ← BẮTBUỘC
□ Tag entity-name: explicit isDark style (xem Nguyên tắc #6 CLAUDE.md)      ← BẮTBUỘC
□ KHÔNG dùng components={{ header: { cell: ... }}} trên Table                ← CẤM
□ KHÔNG hardcode màu primary (#4F46E5, #2563EB...) hoặc màu tối             ← CẤM
□ Table với nhiều cột: có <ColumnToggle> + useColumnVisibility               ← Nên có
□ Form submit: Button disabled khi loading                                   ← BẮTBUỘC
□ Error state: hiện message từ response.data.message                        ← BẮTBUỘC
□ Empty state: hiện khi data.length === 0                                    ← BẮTBUỘC
□ Route mới: đăng ký trong router.tsx + modules.config.tsx + screens.registry.ts ← BẮTBUỘC
□ API module có React Query hooks (không gọi trực tiếp trong component)      ← BẮTBUỘC
□ Query keys nhất quán: ['/{domain}', 'list', page, limit]                  ← Convention
```

---

### 3.6 Cross-Cutting Rules — Không có ngoại lệ

```
CÁC QUY TẮC KHÔNG CÓ NGOẠI LỆ
─────────────────────────────────────────────────────────────────────────────
[BACKEND]

1. TenantAwareService     Mọi service có data access PHẢI extends TenantAwareService.
                          Ngoại lệ: auth.service, tenant.service (system-level).

2. Pagination             Mọi list endpoint PHẢI trả PaginatedResult<T>.
                          Mọi findMany() PHẢI có take: limit.
                          Ngoại lệ cho phép: tree data (nhưng phải giới hạn theo scope).

3. Soft Delete            Mọi entity PHẢI có deletedAt. Dùng update({deletedAt:now()}).
                          Ngoại lệ: log tables, lookup tables (AllowanceType v.v.).

4. Event Bus              Không dùng Node EventEmitter cho cross-service communication.
                          Dùng DomainEventBus (BullMQ-backed).

5. Error Handling         Không catch Prisma errors thủ công.
                          Không throw raw Error — dùng NestJS exceptions.
                          Không trả stack trace ra response.

6. Audit                  Mọi write operation (create/update/delete/status-change)
                          PHẢI có @Audited decorator.

7. Rate Limit             Mọi controller endpoint PHẢI có @Throttle tường minh.
                          Mặc định: 60 req/60s. Write: 30 req/60s. Auth: 10 req/60s.

8. Raw SQL                Không dùng $queryRaw với string interpolation.
                          Luôn dùng parameterized: $queryRaw`SELECT ... WHERE id = ${id}`.

[FRONTEND]

9. Theme                  Mọi màu sắc qua useThemePalette(). Không hardcode HEX.

10. API calls             Mọi request qua apiClient (axios instance có interceptor).
                          Không dùng fetch() trực tiếp.

11. Form state            nút Submit PHẢI disabled khi mutation isPending.

12. Token/Secret          Không console.log token, password, hoặc sensitive data.
```

---

## Phần 4 — SaaS Readiness Gate

Sau khi hoàn thành v4.1 + v4.2 + v4.3, Loop đáp ứng:

### ✅ SaaS Tier 1 — Managed Multi-Tenant (Admin-provisioned)
Đủ để deploy cho nhiều tenant khi admin tạo tenant thủ công qua dashboard.

| Yêu cầu | Sau v4.3 |
|---|---|
| Data isolation hoàn toàn giữa tenant | ✅ |
| Auth secure (cookie, bcrypt, JWT) | ✅ |
| Multi-instance deployment an toàn | ✅ |
| Graceful shutdown | ✅ |
| Performance dashboard caching | ✅ |
| Audit trail đầy đủ | ✅ |
| File storage per-tenant | ✅ |

### 🔶 SaaS Tier 2 — Self-Service (cần thêm cho v5)

| Yêu cầu | Khi nào |
|---|---|
| Tenant self-registration flow | v5 sprint 1 |
| Subscription / billing integration | v5 sprint 2 |
| Per-tenant custom domain | v5 sprint 3 |
| PostgreSQL RLS backstop | v5 sprint 2 (safety net) |
| Tenant usage metrics / quota | v5 sprint 3 |

---

## Phần 5 — v4.x Timeline

| Sprint | Nội dung | Effort | Commit tag |
|---|---|---|---|
| **v4.1** | Quickfixes (5 items) | 0.5 ngày | `fix(v4.1)` |
| **v4.2** | Tenant Isolation + JWT tenantId | 3–4 ngày | `feat(v4.2)` |
| **v4.3** | EventBus → BullMQ, Redis cache, PDF queue | 2–3 ngày | `feat(v4.3)` |
| **Total** | | **~6–8 ngày** | |

**Điều kiện bắt đầu v5:** v4.1 + v4.2 hoàn thành. v4.3 có thể làm song song với v5 sprint 1.

---

## Phần 6 — Cách enforce trong thực tế

Các rule trên chỉ hiệu quả nếu có cơ chế nhắc nhở thực tế:

1. **CLAUDE.md** — thêm checklist backend + frontend vào CLAUDE.md để AI assistant nhắc mỗi lần generate code mới

2. **Module scaffold command** — tạo script `npm run scaffold:module {name}` generate các file template theo đúng chuẩn trên

3. **PR template** — tạo `.github/pull_request_template.md` với 2 checklist (backend + frontend) developer phải check trước khi submit

4. **TypeScript inheritance** — `TenantAwareService` là abstract class → TypeScript compiler sẽ báo lỗi nếu không implement đúng

5. **ESLint rule** (optional, v5+) — custom rule cấm `findMany` không có `take`, cấm `useThemeStore` trực tiếp
