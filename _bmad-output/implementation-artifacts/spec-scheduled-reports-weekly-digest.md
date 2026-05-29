---
title: 'v2.5 Scheduled Reports & Weekly Digest'
type: 'feature'
created: '2026-05-28'
status: 'done'
baseline_commit: '018927b'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Loop ERP chưa có hệ thống gửi báo cáo định kỳ tự động, khiến admin phải xuất báo cáo thủ công và người dùng bỏ lỡ tóm tắt công việc đầu tuần.

**Approach:** Xây dựng ScheduledReportsModule (NestJS + BullMQ cron) để gửi Weekly Digest cá nhân hóa theo role mỗi thứ 2 lúc 8h, và cho phép Admin cấu hình scheduled reports định kỳ qua giao diện web.

## Boundaries & Constraints

**Always:**
- Dùng `PaginationDto` + `PaginatedResult` + `paginate()` cho list endpoint
- Dùng `useThemePalette()`, `PageHeader`, `StatCard`, `FilterBar`, `CenteredModal`, `confirmDelete` trên frontend
- Column table: wrap trong `<Text style={{ color }}>`, không trả plain string
- Tag: explicit isDark style. KHÔNG dùng `components` override trên Table
- MailService đã có — dùng thêm method `sendHtml(to, subject, html)` hoặc reuse transporter trực tiếp
- Log thay vì throw khi SMTP không cấu hình
- Thêm `SMTP_FROM` vào `.env.example` nếu chưa có
- BullMQ pattern: raw `Queue` + `Worker` (không dùng `@nestjs/bull` decorator) — giống NotificationQueueService

**Ask First:**
- Nếu schema `ScheduledReport` đã tồn tại trong DB với tên khác

**Never:**
- Không tạo fancy PDF (chỉ Excel cho EXCEL format, HTML email cho cả 2 format vì PDF generation phức tạp)
- Không gọi `findMany()` không có `take`
- Không hardcode màu primary, không tự khai báo `isDark`/`textPrimary`

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| SMTP không cấu hình | Không có SMTP_HOST | Log warning, không gửi email, không throw | Logger.warn |
| sendNow với ID không tồn tại | id không hợp lệ | 404 NotFoundException | Throw trước khi xử lý |
| Report MONTHLY dayOfMonth=5, hôm nay=ngày 3 | Check hàng ngày | Bỏ qua, không gửi | - |
| Recipients email không hợp lệ | Tạo report với email sai | 400 validation error | Class-validator @IsEmail |
| Weekly digest user không có task/leave | User active, không có data | Gửi email với section rỗng "Không có mục nào" | - |

</frozen-after-approval>

## Code Map

- `apps/backend/prisma/schema.prisma` -- thêm enum ReportFrequency, ReportFormat, model ScheduledReport
- `apps/backend/src/scheduled-reports/` -- module mới (service, processor, scheduler, controller, dto, module)
- `apps/backend/src/notifications/mail.service.ts` -- thêm method sendHtml() generic
- `apps/backend/src/app.module.ts` -- import ScheduledReportsModule
- `apps/backend/.env.example` -- thêm SMTP_FROM nếu chưa có
- `apps/backend/prisma/seed-scheduled-reports.js` -- seed 3 sample reports
- `apps/backend/package.json` -- thêm script seed:scheduled-reports
- `apps/web/src/api/scheduled-reports.ts` -- API client
- `apps/web/src/pages/admin/ScheduledReportsPage.tsx` -- trang CRUD admin
- `apps/web/src/router.tsx` -- thêm lazy import + route `/scheduled-reports`
- `apps/web/src/config/modules.config.tsx` -- thêm item vào admin group
- `apps/web/src/config/screens.registry.ts` -- thêm screen definition

## Tasks & Acceptance

**Execution:**
- [ ] `apps/backend/prisma/schema.prisma` -- thêm enum ReportFrequency, ReportFormat, model ScheduledReport -- DB schema mới cho scheduled reports
- [ ] Chạy `npx prisma db push && npx prisma generate` trong apps/backend -- migrate schema + generate client
- [ ] `apps/backend/src/notifications/mail.service.ts` -- thêm method `sendHtml(to: string, subject: string, html: string): Promise<void>` -- cho phép gửi HTML email tùy ý
- [ ] `apps/backend/src/scheduled-reports/dto/create-scheduled-report.dto.ts` -- tạo DTO với validators -- validation đầu vào
- [ ] `apps/backend/src/scheduled-reports/scheduled-reports.service.ts` -- CRUD + sendWeeklyDigest() + sendScheduledReports() + generateExcelReport() -- core logic
- [ ] `apps/backend/src/scheduled-reports/scheduled-reports.processor.ts` -- BullMQ worker xử lý jobs -- async processing
- [ ] `apps/backend/src/scheduled-reports/scheduled-reports.scheduler.ts` -- cron setup onModuleInit -- lên lịch jobs
- [ ] `apps/backend/src/scheduled-reports/scheduled-reports.controller.ts` -- REST endpoints CRUD + sendNow -- HTTP API
- [ ] `apps/backend/src/scheduled-reports/scheduled-reports.module.ts` -- module declaration -- NestJS wiring
- [ ] `apps/backend/src/app.module.ts` -- import ScheduledReportsModule -- kích hoạt module
- [ ] `apps/backend/prisma/seed-scheduled-reports.js` -- tạo seed script Node.js -- demo data
- [ ] `apps/backend/package.json` -- thêm script `seed:scheduled-reports` -- chạy seed dễ dàng
- [ ] `apps/web/src/api/scheduled-reports.ts` -- tạo API client types + functions -- frontend ↔ backend
- [ ] `apps/web/src/pages/admin/ScheduledReportsPage.tsx` -- trang CRUD đầy đủ -- UI admin
- [ ] `apps/web/src/router.tsx` -- lazy import + route `scheduled-reports` -- routing
- [ ] `apps/web/src/config/modules.config.tsx` -- thêm vào admin group -- navigation
- [ ] `apps/web/src/config/screens.registry.ts` -- thêm screen def -- permission + search

**Acceptance Criteria:**
- Given Admin truy cập `/scheduled-reports`, when trang load, then hiển thị table danh sách reports + 2 StatCards (Tổng / Đang bật)
- Given Admin tạo report mới với template `payroll-summary`, frequency `MONTHLY`, dayOfMonth=5, recipients valid emails, when submit, then report được tạo và xuất hiện trong table
- Given Admin nhấn "Gửi ngay" trên một report, when xác nhận, then endpoint POST `/scheduled-reports/:id/send` được gọi và trả 201
- Given SMTP không cấu hình, when weekly digest trigger, then không throw error, log warning
- Given `npx tsc --noEmit` ở backend và web, then không có lỗi TypeScript
- Given chạy `npm run seed:scheduled-reports`, then 3 records xuất hiện trong bảng `scheduled_reports`

## Design Notes

BullMQ pattern dùng raw Queue + Worker (giống NotificationQueueService) — KHÔNG dùng `@nestjs/bull` decorator vì project đã chọn pattern này.

Weekly Digest email: role ADMIN → thống kê tổng (contracts expiring, leave pending); role LEADERSHIP/PM → team tasks overdue, leave cần approve; role MEMBER → tasks due this week, timesheet status.

Excel export: dùng `exceljs` (đã có trong deps). Format PDF → gửi email HTML thay vì file đính kèm (tránh phụ thuộc puppeteer).

## Verification

**Commands:**
- `cd apps/backend && npx tsc --noEmit` -- expected: 0 errors ✅
- `cd apps/web && npx tsc --noEmit` -- expected: 0 errors ✅
- `cd apps/backend && npm run seed:scheduled-reports` -- expected: "Seeded 3 scheduled reports" ✅

## Suggested Review Order

**Schema & DB**

- Enums ReportFrequency/ReportFormat + model ScheduledReport; cấu trúc bảng mới
  [`schema.prisma:2254`](../../apps/backend/prisma/schema.prisma#L2254)

**Backend — Core Logic**

- Service chính: CRUD, Weekly Digest (role-aware), sendScheduledReports, Excel builder
  [`scheduled-reports.service.ts:1`](../../apps/backend/src/scheduled-reports/scheduled-reports.service.ts#L1)

- BullMQ Worker xử lý jobs weekly-digest và scheduled-reports
  [`scheduled-reports.processor.ts:1`](../../apps/backend/src/scheduled-reports/scheduled-reports.processor.ts#L1)

- Cron setup onModuleInit — đăng ký repeat jobs, xử lý Redis không sẵn sàng gracefully
  [`scheduled-reports.scheduler.ts:1`](../../apps/backend/src/scheduled-reports/scheduled-reports.scheduler.ts#L1)

- REST endpoints CRUD + sendNow; tất cả @Roles(ADMIN)
  [`scheduled-reports.controller.ts:1`](../../apps/backend/src/scheduled-reports/scheduled-reports.controller.ts#L1)

**Validation & DTOs**

- DTO tạo mới với validators đầy đủ (@IsEmail each, @IsIn template list)
  [`create-scheduled-report.dto.ts:1`](../../apps/backend/src/scheduled-reports/dto/create-scheduled-report.dto.ts#L1)

**Email Extension**

- Thêm method sendHtml() generic vào MailService hiện có
  [`mail.service.ts:30`](../../apps/backend/src/notifications/mail.service.ts#L30)

**Module Wiring**

- Module declaration — imports NotificationsModule để lấy MailService
  [`scheduled-reports.module.ts:1`](../../apps/backend/src/scheduled-reports/scheduled-reports.module.ts#L1)

- Import ScheduledReportsModule vào AppModule
  [`app.module.ts:49`](../../apps/backend/src/app.module.ts#L49)

**Frontend — UI**

- Page CRUD đầy đủ: PageHeader, 2 StatCards, FilterBar, Table, CenteredModal form
  [`ScheduledReportsPage.tsx:1`](../../apps/web/src/pages/admin/ScheduledReportsPage.tsx#L1)

- API client types + methods
  [`scheduled-reports.ts:1`](../../apps/web/src/api/scheduled-reports.ts#L1)

**Config & Navigation**

- Lazy import + route `/scheduled-reports` trong router
  [`router.tsx:72`](../../apps/web/src/router.tsx#L72)

- Admin group menu item + ICON_MAP
  [`modules.config.tsx:381`](../../apps/web/src/config/modules.config.tsx#L381)

- Screen definition (permission + sortOrder)
  [`screens.registry.ts:83`](../../apps/web/src/config/screens.registry.ts#L83)

**Seed**

- Seed 3 demo reports (payroll MONTHLY, OKR WEEKLY, headcount MONTHLY inactive)
  [`seed-scheduled-reports.js:1`](../../apps/backend/prisma/seed-scheduled-reports.js#L1)
