# Loop ERP — Master Audit Kiến trúc (Performance · Security · SaaS Multi-tenant)

> Ngày: 2026-06-03 · Winston (System Architect)
> Nguồn: audit vét cạn multi-agent (40 agent, 49 finding thô → 48 deduped → verify đối kháng + completeness critic).
> **Mục đích: nguồn sự thật DUY NHẤT để fix dứt điểm một lần.** 48 finding rời rạc quy về 7 CỤM GỐC RỄ — sửa gốc dập hàng loạt.

## Nguyên tắc nền (đã chắc — giữ nguyên)
Cách ly tenant ở tầng **DB-trong-HTTP-request** đúng & chắc (CLS + Prisma `$extends`); cron dùng `forEachTenant`; `scheduled-reports.processor` + `telegram-poller` đã wrap CLS đúng (dùng làm MẪU CHUẨN). Guard order, JWT rotation+bcrypt, ValidationPipe, CORS allowlist, cookie flags, GlobalExceptionFilter: OK. **Lỗ hổng nằm ở các tầng NGOÀI request + schema + lifecycle.**

---

## CỤM 1 — Fail-open tenant resolution *(gốc rễ của ~10 finding rò chéo tenant)*
`getTenantId()` trả `undefined` → mọi filter tenant biến mất (raw SQL nhánh `Prisma.sql\`\``, `tenantWhere()`, cache key `:default`). Bản "đã fix đợt trước" chỉ vá thân query, vẫn fail-open ở nhánh rỗng.
- **ROOT FIX**: `tenant-aware.service.ts:16` `getTenantId()` → khi `isTenantEnforced()` mà thiếu tenantId thì **throw** (fail-closed). Cấm nhánh `Prisma.sql\`\`` rỗng cho `tenant_id`. Cache: bỏ fallback `:default` → throw/skip cache.
- Dập: accounting P&L/CĐKT (`accounting.service.ts:308`, HIGH), CRM raw kpi/forecast/analytics (`crm-kpi.service.ts:48`, MED), bug-stats/reports raw (`bug-stats.service.ts:97`, MED), `employees.generateNextCode` else (`employees.service.ts:62`, LOW), dashboard cache (`dashboard.service.ts:44`, LOW), analytics cache+where{} (`analytics.service.ts:25`, MED), org_units CTE (`org-scope.service.ts:63`, LOW — thêm `AND tenant_id`).

## CỤM 2 — Background workers/event chạy NGOÀI CLS *(gốc rễ ~8 finding ghi/đọc chéo tenant)*
EventBus đăng ký BullMQ Worker `async (job)=>handler(job.data)` không `cls.run`; payload không mang tenantId → tenant-extension vô hiệu ở mọi luồng nền.
- **ROOT FIX**: (a) Tạo helper dùng chung `runWorkerWithTenant(job, fn)` = `cls.run(()=>{ if(job.data.tenantId) cls.set(CLS_TENANT_ID, job.data.tenantId); return fn() })`. (b) Thêm `tenantId` vào MỌI event/job payload tại điểm `emit()`/`enqueue()`. Mẫu chuẩn có sẵn: `scheduled-reports.processor.ts:50`.
- Dập: ProcessEventBus (`process-event-bus.service.ts:43`, HIGH) + Hr/Finance/ProjectEventBus; `bpmn-engine.emitCompleted` thiếu tenantId (`bpmn-engine.service.ts:737`); ContractLifecycleHandler (`contract-lifecycle-handler.service.ts:49`, HIGH), EmployeeOnboardingHandler (`employee-onboarding-handler.service.ts:28`, HIGH), Accounting auto-journal (`accounting.service.ts:36`, HIGH), TimerEvent (`timer-event.service.ts:97`, MED), PayslipQueue (`payslip-queue.service.ts:99`, MED), Expense/OT/HrDecision/Vehicle/Attendance ProcessHandler (LOW), HrAttendanceLeaveListener updateMany (`hr-attendance-leave.listener.ts:38`, LOW), OkrService onCompleted REQUEST-scoped (`okr.service.ts:30`, MED — tách singleton).

## CỤM 3 — Schema tenancy hardening *(1 migration — dập 7 finding + perf index)*
- `Category` thiếu hẳn `tenantId` + `@@unique([type,code])` global (`schema.prisma:4572`, MED): thêm tenantId (nullable cho seed global VN-locations, hoặc tách global vs per-tenant) + `@@unique([tenantId,type,code])`.
- **55 model lõi** `tenantId String?` KHÔNG `@default` (User/Employee/Invoice/PayrollRecord/Customer/ApiKey...) (`schema.prisma:61`, MED): backfill + `@default` + index (đồng bộ với 93 model đã hardening).
- Insurance/Tax config 4 model nullable + `@@unique([tenantId,effectiveFrom])` (`schema.prisma:2229`, MED): NOT NULL + default + FK.
- Unique GLOBAL business: `User.email`/`Asset.code`/`KbArticle.slug` (`schema.prisma:12`, MED) → `@@unique([tenantId, ...])` (User.email cân nhắc giữ global nếu login cross-tenant).
- RBAC global: `RolePermission`/`ModuleRole`/`ModuleRolePermission` dùng chung (`permissions.controller.ts:40`, HIGH) → thêm tenantId/tách system vs custom role.
- **Composite index** dẫn đầu tenantId (perf, LOW/MED): Task `[tenantId,projectId,status]`/`[tenantId,assigneeId,status]`/`[tenantId,dueDate]`; AuditLog `[tenantId,createdAt]`/`[tenantId,entity,entityId]`; LeaveRequest/Expense `[tenantId,status,date]`; AttendanceRecord/TimeLog/TimeEntry `[tenantId,date]`; Notification `[tenantId,userId,isRead,createdAt]`.

## CỤM 4 — Authz / IDOR chéo tenant *(per-endpoint, không migration)*
- **`resetDemo` TRUNCATE TOÀN DB** mọi tenant, chỉ `@Roles(ADMIN)` (`health.service.ts:243`, **CRITICAL**): khóa sau `DEPLOYMENT_MODE!=='saas'` / super-admin tách biệt.
- **Tenant controller IDOR**: ADMIN tenant A sửa/deactivate tenant B (`tenant.controller.ts:46`, HIGH): ép `id===CLS tenantId` (trừ super-admin).
- **Payroll**: export Excel theo recordId không check ownership (`payroll.controller.ts:132`, HIGH); list bảng lương theo kỳ không authz (`payroll.controller.ts:56`, HIGH) → `@Roles(ADMIN,LEADERSHIP)`/`@RequirePermission('payroll:read')`.
- Category IDOR sửa/xóa chéo (`categories.service.ts:32`, HIGH — đi cùng Cụm 3); GET categories/users không authz+scope (`categories.controller.ts:14`, `users.controller.ts:26`, MED).
- `module-config /:id/status` @Public findFirst không scope (`module-config.service.ts:60`, LOW).

## CỤM 5 — Storage tenant prefix *(truyền tenantId vào upload)*
- CV ứng viên (`candidates.service.ts:221`, MED) + Payslip PDF (`payslip-queue.service.ts:161`, HIGH) upload vào `shared/` — PII/lương mọi tenant chung namespace. Truyền `tenantId` (mẫu đúng: `bug-attachment.service.ts:62`).
- `presignedUrl` không validate ownership theo tenant ở tầng storage (`storage.service.ts:66`, MED): validate `storagePath.startsWith(\`${tenantId}/\`)`.

## CỤM 6 — Rate limit / Throttle thiếu *(thêm @Throttle)*
- payroll (generate/rerun/export, `payroll.controller.ts:25`, MED), accounting export (`accounting.controller.ts:85`, MED), tasks export (LOW), audit-log export (LOW).

## CỤM 7 — SaaS-ops / Lifecycle *(completeness critic — chương trình riêng, ~85%→100%)*
- **Quota/plan per-tenant + throttle per-tenant**: Throttler theo IP (noisy-neighbor DoS chéo tenant); KHÔNG có khái niệm quota/seat/storage limit → cả fairness lẫn thương mại hóa. Custom `ThrottlerGuard.getTracker` ghép tenantId; thêm tầng quota theo `Tenant.plan`.
- **Tenant provisioning**: `tenant.service.create()` trần — không seed RBAC/admin/module-config/category default → tenant mới rỗng quyền (chỉ "chạy" nhờ RBAC/Category global = chính lỗi cách ly). Viết `provisionTenant()`.
- **Audit coverage**: `audit-log.interceptor.ts` không set tenantId tường minh (fail-open → orphan), chỉ gắn ~10 controller (thiếu tenant/permissions/accounting/automation/health), không lưu before/after diff.
- **Token lifecycle**: refresh single-slot (multi-device kém), không tokenVersion/blacklist access-token (token cũ sống tới hết TTL sau khi disable user/tenant — liên quan IDOR tenant disable), không xoay JWT secret.
- **Env validation**: `ConfigModule.forRoot` không Joi schema; 24 nơi đọc `process.env` trực tiếp; thiếu MINIO_PUBLIC_URL/CORS_ORIGIN fail âm thầm/nguy hiểm.
- **Queue isolation**: không `BullModule.forRoot` prefix theo tenant → mọi tenant chung Redis keyspace; `queues.service` admin có thể liệt kê/sửa job chéo tenant (cần soi IDOR). Kiểm mọi producer set `job.data.tenantId`.
- **Presigned URL leakage**: bearer-URL 1h không nhúng identity, rewrite public; forward/log/cache → truy cập chéo trong 1h. Giảm expiry + Content-Disposition.
- **Shell injection (phụ)**: `health.service.ts:206` nối DATABASE_URL vào execSync → dùng execFile/spawn mảng tham số.
- **automation UPDATE_FIELD** raw thiếu `AND tenant_id` (`automation.service.ts:177`, MED) + whitelist table/field thay regex mở.
- Backup/export-xóa theo tenant (GDPR), correlation-id/tenant-id trong log: chưa có.
- **KHÔNG phải lỗ hổng**: WebSocket/SSE — codebase không dùng realtime (Telegram polling đã wrap CLS).

---

## False-positive đã loại (verifier bác bỏ)
- LeaveProcessHandler updateMany "ghi chéo" — cơ chế đúng nhưng updateMany neo UUID global, không ghi chéo thật.
- crm-activities.stats count "đếm chéo" — thực tế đi qua Prisma model API (đã scoped bởi extension).
- Notification thiếu index createdAt — có thật nhưng tác động thổi phồng (đã đưa vào Cụm 3 mức LOW).

---

## Lộ trình fix (theo rủi ro × chi phí)
| Đợt | Cụm | Đặc điểm | Rủi ro fix |
|---|---|---|---|
| **1** | Cụm 4 (authz/IDOR) + Cụm 6 (throttle) + Swagger-prod | Không migration, dập CRITICAL/HIGH | Thấp |
| **2** | Cụm 1 (fail-closed) + Cụm 2 (worker CLS helper) | Behavior change — guard theo `isTenantEnforced()` để giữ on-prem | Trung bình |
| **3** | Cụm 3 (schema migration) | Cần backfill + migration; làm 1 lượt | Trung-cao (data) |
| **4** | Cụm 5 (storage) + automation tenant + composite index | Bền vững | Thấp-TB |
| **5** | Cụm 7 (SaaS-ops/lifecycle) | Chương trình riêng (provisioning/quota/audit/token/env/queue) | TB |

**Khuyến nghị: Đợt 1+2 ngay** (khác biệt giữa "có vẻ multi-tenant" và "thực sự cách ly"). Mỗi đợt test-first + verify (tsc/jest/build) như các đợt trước.

---

## TIẾN ĐỘ FIX (cập nhật 2026-06-03)
- ✅ **Đợt 1** (`f56d57a`): Cụm 4 authz/IDOR (resetDemo CRITICAL, tenant IDOR, payroll authz/ownership) + Cụm 6 throttle + Swagger-prod.
- ✅ **Đợt 2** (`d0f52d0` Cụm 2, `43cd78e` Cụm 1): worker/event bus chạy trong CLS (7 bus auto-stamp + cls.run) + fail-closed getTenantId() (CLS-aware) + cache không fallback `:default`.
- ✅ **Cụm 5** (`e9fc6a9`): storage per-tenant prefix (CV/payslip) + presignedUrl ownership guard.
- ✅ **Raw SQL phụ** (`5fdb360`): automation UPDATE_FIELD + org-scope CTE thêm tenant filter.
- ⏳ **Cụm 3 (schema migration)** — CHƯA: cần DB backup + backfill + `prisma migrate`. Gồm Category tenantId, 55 model nullable→default, insurance/tax config NOT NULL, unique global→composite, composite index. Cũng mở khóa: Category IDOR + RBAC global authz (phụ thuộc cột tenantId). **Cần làm deliberate có backup.**
- ⏳ **Cụm 7 (SaaS-ops)** — CHƯA: provisioning seed, quota/throttle per-tenant, audit coverage+tenantId, token lifecycle, env validation (Joi), queue isolation. Chương trình riêng.
- ⏳ **Perf** — CHƯA: N+1 (leave-accrual 40k query, payroll-engine ~5N, cost), composite index (gộp Cụm 3).

Tất cả fix code-only: backend tsc 0, jest 81/81 sau mỗi đợt.
