---
name: project-master-roadmap
description: Loop 360 — Master Roadmap tổng hợp từ v1 đến v6. Nguồn sự thật duy nhất về tiến độ và kế hoạch.
metadata:
  type: project
---

Cập nhật: 2026-06-01. Thay thế tất cả file roadmap riêng lẻ cũ.

---

## TỔNG QUAN NHANH

```
v1–v4        ████████████████████  DONE ✅
v5.0–8       ████████████████████  DONE ✅  (commit a45d3b9, TS 0 errors)
Seed         ████████████████████  DONE ✅  (2026-05-31, 500 NV, 50 dự án)
D20 UI Audit ████████████████████  DONE ✅  (2026-06-01, 76 files, 0 TS errors)
QA Chức năng ░░░░░░░░░░░░░░░░░░░░  TODO    (62 màn hình, 4 stream)
v5.9 UX      ░░░░░░░░░░░░░░░░░░░░  TODO    (sau QA)
v6           ░░░░░░░░░░░░░░░░░░░░  PLANNED (SaaS compliance)
```

---

## PHASE 1 — v1.0 → v4.3 (HOÀN THÀNH ✅)

### v1.0 – v2.0: Module nền
- Auth (JWT httpOnly), Org Units, Users, Employees, Projects, Tasks (5 cấp), Timesheet
- Alerts, Notifications, Reports (Excel), Dashboard, Mobile (Expo SDK 56)
- BPM Module (bpmn-js modeler, ProcessDefinition, user tasks, inbox)
- Bug & Issue Tracking (MinIO, severity, BugStatus 9 giá trị, CR workflow)
- RBAC + Function Permissions (Epic 15)

**12 nâng cấp nghiệp vụ v2:**
- ✅ TNCN + BHXH/BHYT tự động (Epic 22 Payroll Compliance)
- ✅ Client Contract Management (milestone, payment schedule)
- ✅ CRM Activity Logging (call, email, meeting)
- ✅ Employee Self-Service (payslip, số dư phép, OT)
- ✅ Skill Matrix + Resource Demand Planning
- ✅ OKR / KPI Management
- ✅ Sales Forecasting & Revenue Planning
- ✅ Knowledge Base nội bộ
- ✅ Financial Reports (P&L + Balance Sheet)
- Procurement, Portal, Integration Hub → dời v6

### v3.0: Platform Layer
- ✅ Global Search (Ctrl+K), Dark Mode system-wide, Theme Preset (9 màu)
- ✅ Sidebar collapse / responsive
- ✅ Company Feed / Newsfeed
- ✅ Meeting Calendar + Room Booking + attendees sync
- ✅ Vehicle Booking + BPM
- ✅ CommentThread nhúng 7 entities (Task, OKR, Leave, Expense, PerformanceReview, Deal, Candidate)
- ✅ Accounting full (double-entry + reports)
- ✅ Multi-tenant + White Label (Tenant model, useTenantStore, TenantSettingsPage)
- 🔄 Integration Hub (Slack/Teams/Zapier) → v6

### v4.0–v4.3: Infrastructure SaaS
- ✅ 93/93 services TenantAwareService (extend + tenantWhere())
- ✅ JWT payload có tenantId (auth.service.ts:44,102)
- ✅ BullMQ: ProcessEventBus + FinanceEventBus + PayslipQueue
- ✅ MinIO per-tenant: prefix `tenant/{tenantId}/`
- ✅ Redis cache: dashboard APIs TTL theo tenantId
- ✅ Compression + Graceful shutdown

---

## PHASE 2 — v5.0 → v5.9 (ĐANG THỰC HIỆN)

### v5.0 ✅ DONE
- E16: OT APPROVED → PayrollRecord auto, Unpaid Leave Deduction, Leave/OT summary panel FE
- E17: BudgetPlan/Line/Transaction CRUD, BPM budget-approval-v1, dashboard FE

### v5.1 ✅ DONE (code)
- E18: Contract expiry cron (5 ngưỡng), Contract renewal BPM + RenewalModal
- E18.3: Employee offboarding checklist
- E18.4: Contract Lifecycle Automation via HrEventBus
- E18.5: HR Decision fixes (SALARY_CHANGE → update Contract.salaryMonthly + InsuranceEvent)
- E19: PerformanceBonusConfig, calculateFromReview, SalaryBand, SalaryReviewSuggestion
- E17.5: Budget Utilization Alert (cron daily ≥80%)

### v5.2a ✅ DONE (code)
**E16F — Fix Bảng Công:**
- E16F.1: standardDays từ HolidayCalendar (bỏ hardcode 26)
- E16F.2: MonthlyAttendance → sync TimesheetRecord (1 nguồn sự thật)
- E16F.3: OT = workedHours - effectiveShiftHours, phân loại WEEKDAY/WEEKEND/HOLIDAY, WorkShift.breakMinutes
- E16F.4: LeaveRequest APPROVED → HrEventBus → TimesheetRecord.leaveDays auto
- E16F.5: LeavePolicy.accrualMode (ANNUAL_UPFRONT / MONTHLY_ACCRUAL)
- E16F.6: Cron 1/1 tạo LeaveBalance năm mới + carry-over
- E16F.7: Cron carryOverExpiry: CLEAR hoặc CONVERT phép tồn thành tiền
- E16F.8: Quy trình Giải trình Chấm công (BPM attendance-explanation-v1), model AttendanceExplanation

### v5.2b ✅ DONE (code)
**E16G — Fix Bảng Lương:**
- E16G.1: isBhxhExempt/isPitExempt/pitExemptCeiling trên SalaryColumn
- E16G.2: OT pay đúng ×1.5/×2.0/×3.0 theo breakdown E16F.3
- E16G.3: PerformanceBonus APPROVED → PayrollRecord.bonus
- E16G.4: InsuranceConfig.bhxhExemptForProbation config
- E16G.5: Seed verify 5 loại nhân viên
- E16G.6: Lương 2 mức khi QĐ hiệu lực giữa tháng, ProjectCost đọc SalaryRecord tại thời điểm log
- E16G.7: Lương tháng 13 (PayrollPeriodType.MONTH_13)

### v5.3 ✅ DONE (code)
**E20 + E21 — Project Finance & Accounting:**
- E20.1: Daily cost snapshot (labor × rate + Expense APPROVED)
- E20.1b: Task create/delete trigger recalculate parent progress
- E20.2: Milestone COMPLETED → auto tạo Invoice, Invoice.dealId + clientContractId
- E20.3: Deal WON → Project tạo + kickoff BPM deal-to-project-kickoff-v1
- E20.4: ProjectJournal CRUD
- E20.5: Convert unresolvedItem → Task, Dashboard "Việc chưa chốt"
- E21.1: Invoice PAID → auto JournalEntry (InvoiceAccountMapping)
- E21.2: PO received → AP JournalEntry

### v5.4 ✅ DONE (code)
**E22 — CRM → Delivery + Chăm sóc KH:**
- E22.1: CustomerTicket → Issue linking
- E22.2: Deal KPI (win rate, cycle time, revenue thực tế vs deal value)
- E22.3: CRM Analytics Dashboard (real API)
- E22.4: Cron nhắc nhở nextActionDueAt
- E22.5: LeadFollowUpSchedule model, reminder khi lead không có activity N ngày
- E22.6: CustomerSurveySchedule (MONTHLY/QUARTERLY/YEARLY)
- E22.7: ActivityType bổ sung (DEMO, SITE_VISIT, SURVEY, TASK), CrmActivity.projectId

### v5.5 ✅ DONE (code)
**E23 — Smart Workflow:**
- E23.1: DelegationRule UI — ủy quyền duyệt khi vắng mặt
- E23.2: AutomationRule nâng cấp (trigger+condition+action config)
- E23.3: Approval UX: batch approve, context panel đủ thông tin
- E23.4: BPM Email Delivery — MailService + NotificationPreference schema
- E23.5: Process Lifecycle Notifications (STARTED/COMPLETED/REJECTED → requester)
- E23.6: Task Escalation Engine (cron 30', 1d/3d/7d, ProcessUserTask.lastEscalatedAt)
- E23.7: Process Cancellation by Requester + revert entity status

### v5.6 ✅ DONE (code)
**E25 — End User Utilities:**
- E25.1: "My Work" Personal Dashboard (pending approvals, tasks, leave balance, timesheet hôm nay)
- E25.2: Notification Preferences UI (toggle email/in-app per module)
- E25.3: Saved Filter Presets (max 10/user/page)
- E25.4: @mention trong CommentThread
- E25.5: In-app Changelog (modal "Có gì mới" sau deploy)

### v5.7 ✅ DONE (code)
**E26 — Platform & Admin Utilities:**
- E26.1: System Announcement Banner (admin broadcast)
- E26.2: Permission Audit Report (user→permissions matrix, "who can X", export CSV)
- E26.3: Bulk Import mở rộng (LeaveBalance, SalaryBand, ChartOfAccounts, Customers/Leads)
- E26.4: Email Delivery Dashboard (EmailLog schema, retry FAILED)
- E26.5: BullMQ Job Browser (upgrade HealthPage)
- E26.6: Webhook Health Monitor (WebhookLog, tab IntegrationsPage)
- E26.7: Env Variable Validation on Startup
- E26.8: SMTP Configuration UI (TenantSmtpConfig, test email)
- E26.9: API Key Management (scopes, SHA-256 hash, rate limit riêng)
- E26.10: Notification Template Editor (HTML email, live preview)
- E26.11: Asset Module Enhancements (khấu hao tự động, transfer, thanh lý BPM, warranty alerts)

### v5.8 ✅ DONE (code)
**E24 — BI Dashboards (real API):**
- HR Analytics: headcount trend, attrition, salary distribution
- Payroll Analytics
- Project Analytics (kết nối project-cost.service)
- Finance Analytics (P&L, AR aging, cash flow)
- CRM Analytics
- Executive Dashboard (aggregate all modules + PDF export Puppeteer)
- Report Builder (entity→columns→filters→preview→export)

---

## HIỆN TẠI → ĐANG THỰC HIỆN

### ✅ Bước 1: Seed Demo Data — XONG (2026-05-31)

Data đầy đủ: 500 NV, 50 dự án, BPM, Finance, CRM — xem chi tiết tại `project_demo_seed_v5.md`

### 🔄 Bước 2: QA + UI Polish (4 stream song song)

**Checklist đầy đủ:** `.claude/qa-checklist.md` (62 màn hình, 4 stream)

**✅ D20 UI Audit — XONG (2026-06-01)**
- 76 files đã fix, TypeScript 0 errors
- Modal.confirm → confirmDelete: 9 files
- Hardcode màu cấm: 94 → ~0 true violations
- preset.primary text → linkColor: 17 → 0
- Plain string renders → Text JSX: ~30 → 0
- Palette tokens chuẩn hóa toàn hệ thống

**⏳ QA Chức năng — Đang chờ team**
- **Stream A — HR & Nhân sự** (15 màn hình): personnel, org, timesheet, leaves, OT, payroll, self-service, HR decisions, performance, training, contracts
- **Stream B — Projects & Workspace** (14 màn hình): projects, tasks, bugs, gantt, my-tasks, cost, OKR, knowledge-base, calendar, feed
- **Stream C — Finance & CRM** (14 màn hình): CRM pipeline/deals/customers, invoices, PO, expenses, budget, accounting, finance analytics, portal
- **Stream D — Platform & Admin** (19 màn hình): dashboard, BPM inbox/processes, recruit, assets, users, permissions, analytics, audit-log, admin tools

**Definition of Done mỗi màn hình:**
- Chức năng: list/create/edit/delete/filter/BPM/export hoạt động
- UI: useThemePalette · PageHeader · StatCard · Table no-plain-string · Tag isDark · linkColor · no hardcode colors · dark+light mode ok

### ⏳ Bước 3: v5.9 UX Redesign (SAU QA)

- Navigation: 10 module → 8 module theo persona (Work/People/Finance/CRM/Ops/Asset/Me/Admin)
- UX Revision 2: progress ring, dark sidebar, sparkline metric card, micro-animations
- Fix hardcoded colors: recruit (`#0EA5E9`), portal (`#64748B`), my-tasks (`#FEF2F2`)
- Accessibility WCAG 2.1 AA
- Spec: `loop-v3-navigation-redesign.md` + `ux-design-specification.md`

---

## PHASE 3 — v6.0: SaaS Production Readiness (PLANNED)

Mục tiêu: hệ thống đạt chuẩn production multi-tenant thực sự trước khi onboard tenant thật.

### Nhóm A — Schema tenantId toàn diện 🔴 BLOCKER

93/131 model chưa có tenantId. Quan trọng nhất:

| Model | Rủi ro |
|---|---|
| OvertimeRequest, Expense, ExpenseItem | Cross-tenant payroll/finance leak |
| TimesheetRecord, ProcessInstance, ProcessUserTask | Workflow cross-tenant |
| BudgetPlan, BudgetLine, BudgetTransaction | v5 models mới — thiếu ngay |
| ChartOfAccount, JournalEntry, JournalLine | Finance leak |
| InsuranceEnrollment, SalaryRecord | HR sensitive |
| CalendarEvent, RoomBooking, FeedPost | Ops/social leak |
| AuditLog, Notification, AutomationRule | System records |
| KpiMetric, KpiRecord, TrainingRecord, PerformanceReview | HR/OKR leak |

Việc cần làm: Prisma migration thêm `tenantId String? @map("tenant_id")` + backfill từ parent relation.

### Nhóm B — Service TenantAwareService còn thiếu 🔴

14 service vẫn dùng `this.prisma` trực tiếp:
```
recruit: jobs, candidates, interviews
crm: forecast, activities, client-contracts
comments, user-groups, procurement
skills, positions, job-titles
work-shifts, hr-holidays, leave-policies
```

### Nhóm C — Pagination Safety 🟠

`findMany()` thiếu `take`:
- accounting.service.ts (chartOfAccount, journalEntry)
- tasks.service.ts (tree traversal — cap 500)
- portal.service.ts (customerPortal, clientContract)
- calendar.service.ts (calendarEvent, roomBooking)

### Nhóm D — PRD Nghiệp Vụ Tồn Đọng 🟠

| PRD | Nội dung |
|---|---|
| HR HRIS v4.0 | Vòng đời nhân viên đầy đủ, audit trail, workflow PDF chuẩn pháp lý |
| Issue Register (v6 polish) | Bug+CR theo dự án triển khai — đã có Epic 14, cần review gap |
| Bulk Operations | Import wizard, bulk actions, export CSV/Excel toàn hệ thống |
| Integration Hub | Slack OAuth, Microsoft Teams, Zapier/Make webhook outbound |

**Nguyên tắc bắt buộc v6:**
- Không thêm model mới nếu chưa có tenantId
- Mọi service mới phải extend TenantAwareService từ đầu
- Migration phải có backfill + rollback plan

---

## BPM PROCESS DEFINITIONS

| Key | Trạng thái |
|---|---|
| `leave-request-v1` | ✅ seeded |
| `expense-claim-v1` | ✅ seeded |
| `overtime-approval-v1` | ✅ seeded |
| `contract-renewal-v1` | ✅ seeded |
| `employee-offboarding-v1` | ✅ seeded |
| `hr-decision-approval-v1` | ✅ seeded |
| `budget-approval-v1` | ✅ seeded |
| `deal-to-project-kickoff-v1` | ✅ seeded |
| `salary-review-v1` | ✅ seeded |
| `performance-review-v1` | ✅ seeded |
| `attendance-explanation-v1` | ❌ cần seed (E16F.8) |

---

## SCHEMA MỚI ĐÃ MIGRATE (v5)

| Model/Field | Epic | Ghi chú |
|---|---|---|
| `WorkShift.breakMinutes Int @default(60)` | E16F.3 | Giờ nghỉ trưa |
| `LeavePolicy.accrualMode` enum | E16F.5 | ANNUAL_UPFRONT / MONTHLY_ACCRUAL |
| `AttendanceExplanation` model | E16F.8 | Giải trình chấm công |
| `AttendanceStatus` + BUSINESS_TRIP/ONSITE/WFH | E16F.8 | Enum mở rộng |
| `InsuranceConfig.bhxhExemptForProbation Boolean` | E16G.4 | |
| `PayrollPeriodType.MONTH_13` | E16G.7 | Lương tháng 13 |
| `Invoice.dealId String?` | E20.2 | Liên kết CRM |
| `Invoice.clientContractId String?` | E20.2 | Liên kết hợp đồng |
| `ProjectJournal` model | E20.4 | Nhật ký dự án |
| `LeadFollowUpSchedule` model | E22.5 | Lịch chăm sóc lead |
| `CustomerSurveySchedule` model | E22.6 | Khảo sát định kỳ |
| `CrmActivity.projectId String?` | E22.7 | |
| `ActivityType` + DEMO/SITE_VISIT/SURVEY/TASK | E22.7 | |
| `NotificationPreference` model | E23.4 | |
| `ProcessUserTask.lastEscalatedAt DateTime?` | E23.6 | |
| `SavedFilterPreset` model | E25.3 | |
| `AppChangelog` model | E25.5 | |
| `SystemAnnouncement` model | E26.1 | |
| `EmailLog` model | E26.4 | |
| `WebhookLog` model | E26.6 | |
| `TenantSmtpConfig` model | E26.8 | |
| `ApiKey` model | E26.9 | SHA-256 hash |
| `NotificationTemplate` model | E26.10 | |
| `AssetTransfer`, `AssetDisposal`, `AssetCategory` | E26.11 | |
