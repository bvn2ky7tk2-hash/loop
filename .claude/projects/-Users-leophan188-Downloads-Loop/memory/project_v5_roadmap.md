---
name: project-v5-roadmap
description: Loop v5.x roadmap triển khai đầy đủ — thứ tự, trạng thái, dependency, tỷ lệ hoàn thành
metadata:
  type: project
---

Loop v5.x = **liên thông nghiệp vụ + Business Intelligence**. Không mở rộng module mới.
**PRD gốc:** `_bmad-output/planning-artifacts/prds/prd-v5-2026-05-29/prd.md`
**Cập nhật:** 2026-05-30 — sau session review kiến trúc toàn hệ thống

---

## Tổng quan tiến độ

```
v5.0  E16+E17          ████████████████████  100% ✅
v5.1  E18+E19 (BE)     ████████████████░░░░   80% ⚠️  FE còn thiếu
v5.1b FE + E18.4+E18.5 ░░░░░░░░░░░░░░░░░░░░    0% ← TIẾP THEO
v5.2a E16F (Bảng Công) ░░░░░░░░░░░░░░░░░░░░    0%
v5.2b E16G (Bảng Lương)░░░░░░░░░░░░░░░░░░░░    0%
v5.3  E20+E21 (Finance)███░░░░░░░░░░░░░░░░░░  ~15% (E20.1 done)
v5.4  E22 (CRM)        ░░░░░░░░░░░░░░░░░░░░    0%
v5.5  E23 (Workflow)   ░░░░░░░░░░░░░░░░░░░░    0%
v5.6  E25 (End User)   ░░░░░░░░░░░░░░░░░░░░    0%
v5.7  E26 (Platform)   ░░░░░░░░░░░░░░░░░░░░    0%
v5.8  E24 (BI)         ██░░░░░░░░░░░░░░░░░░   10% (FE pages có, mock data)
v5.9  UX Redesign      ░░░░░░░░░░░░░░░░░░░░    0%
─────────────────────────────────────────────
Tổng v5                ████░░░░░░░░░░░░░░░░  ~11% (scope finalized 2026-05-30: 9 epic, 50+ stories)
```

---

## Thứ tự triển khai (dependency-driven)

```
[✅ DONE]  v5.0   E16+E17    OT/Leave→Payroll, Budget Module
[⚠️ 80%]  v5.1   E18+E19    Contract Lifecycle, Performance (BE xong, FE thiếu)
[TODO]     v5.1b  FE+E18.4+5 Hoàn thiện FE + Contract lifecycle automation + HR Decision fixes
[TODO]     v5.2a  E16F       Fix Bảng Công + Phép Năm + Giải trình  ← SAU v5.1b
[TODO]     v5.2b  E16G       Fix Bảng Lương (7 stories)              ← SAU E16F
[TODO]     v5.3   E20+E21    Project Finance + Invoice→Journal         ← PARALLEL với E16F/G nếu đủ dev
[TODO]     v5.4   E22        CRM → Delivery + Journal + Chăm sóc KH    ← SAU E20
[TODO]     v5.5   E23        Smart Workflow (Delegation + Automation + E23.4–7)
[TODO]     v5.6   E25        End User Utilities                          ← PARALLEL với E23 (sau E23.4)
[TODO]     v5.7   E26        Platform & Admin Utilities                  ← PARALLEL với E25 (sau E23.2/E23.4)
[TODO]     v5.8   E24        BI Dashboards — kết nối real API           ← SAU TẤT CẢ
[TODO]     v5.9   UX         Navigation 8 module + UX Revision 2        ← SAU E24
```

---

## v5.0 ✅ DONE (100%)

| Story | Nội dung | Trạng thái |
|---|---|---|
| E16.1 | OT APPROVED → PayrollRecord | ✅ |
| E16.2 | Unpaid Leave Deduction | ✅ |
| E16.3 | yearEndLeaveSettlement | ⚠️ Khai báo nhưng chưa có trong code → E16F.7 |
| E16.4 | Payroll OT/Leave summary panel FE | ✅ |
| E17.1–4 | BudgetPlan/Line/Transaction CRUD + BPM + dashboard FE | ✅ |

---

## v5.1 ⚠️ 80% (BE xong, FE thiếu)

| Story | BE | FE |
|---|---|---|
| E18.1 Contract expiry cron (5 ngưỡng alert) | ✅ | — |
| E18.2 Contract renewal BPM + RenewalModal | ✅ | ✅ |
| E18.3 Employee offboarding checklist | ✅ | ❌ |
| E19.1 PerformanceBonusConfig CRUD | ✅ | ❌ |
| E19.2 calculateFromReview + approveBonus | ✅ | ❌ |
| E19.3 SalaryBand + SalaryReviewSuggestion | ✅ schema | ❌ |

---

## v5.1b — Hoàn thiện FE v5.1 + Contract Automation + HR Decision Fixes

### FE còn thiếu (3 màn hình)

| Màn hình | Route | Gắn với |
|---|---|---|
| Offboarding Checklist | `/hr/offboarding` | BPM `employee-offboarding-v1` |
| Performance Bonus Config | `/hr/performance/bonus-config` | PerformanceBonusConfig model |
| Salary Review | `/hr/performance/salary-review` | SalaryReviewSuggestion + SalaryBand |

### E18.4 — Contract Lifecycle Automation (HrEventBus)

- HĐTV hết hạn → auto trigger PerformanceReview + start BPM `contract-renewal-v1`
- HĐLĐ hết hạn → trigger PerformanceReview → nếu PASS: auto renew theo `suggestRenewalType()` (BLLĐ 2 lần ký)
- FAIL hoặc không gia hạn → trigger `employee-offboarding-v1`
- Auto FeedPost khi nhân viên mới onboard / được thăng chức (FeedPage real data đã có)

### E18.5 — HR Decision Fixes (4 điểm)

1. **`SALARY_CHANGE/PROMOTION` → update `Contract.salaryMonthly`** (hiện không update → PayrollEngine tính lương cũ)
2. **`SALARY_CHANGE` → auto tạo `InsuranceEvent.SALARY_CHANGE`** (hiện HR phải làm tay 2 lần)
3. **`PositionHistory.endDate`** set cho record cũ khi tạo record mới (hiện overlap)
4. **`WorkHistory.description`** ghi đủ "Từ phòng X → phòng Y (QĐ-DC-2026-0012)"

### E17.5 — Budget Utilization Alert

- Cron daily: query BudgetLine có `spent/totalAmount >= 80%` → notification cho PM/Admin
- Alert escalate khi vượt 100%

---

## v5.2a — E16F: Fix Bảng Công + Phép Năm + Giải Trình (8 stories)

> **Dependency:** Phải xong trước E16G.

| Story | Nội dung | Schema mới |
|---|---|---|
| **E16F.1** | `standardDays` từ `HolidayCalendar` (bỏ hardcode 26) | — |
| **E16F.2** | `MonthlyAttendance` → sync vào `TimesheetRecord` (1 nguồn sự thật) | — |
| **E16F.3** | OT = workedHours - effectiveShiftHours (bỏ hardcode 8h). Phân loại WEEKDAY/WEEKEND/HOLIDAY. Thêm `breakMinutes` vào `WorkShift` | `WorkShift.breakMinutes Int @default(60)` |
| **E16F.4** | `LeaveRequest` APPROVED → HrEventBus → `TimesheetRecord.leaveDays` tự cộng | — |
| **E16F.5** | `LeavePolicy.accrualMode`: ANNUAL_UPFRONT \| MONTHLY_ACCRUAL | `LeavePolicy.accrualMode` enum field |
| **E16F.6** | Cron 1/1: tạo `LeaveBalance` năm mới + carry-over `min(remaining, maxCarryOver)` | — |
| **E16F.7** | Cron `carryOverExpiry`: CLEAR hoặc CONVERT phép tồn thành tiền (= E16.3 missing) | — |
| **E16F.8** | Quy trình Giải trình Chấm công (MISSING_CHECKIN/OUT, LATE_ARRIVAL, EARLY_DEPARTURE, BUSINESS_TRIP, ONSITE, WFH). Khi APPROVED: `lateMinutes=0`, full ngày công | `AttendanceExplanation` model, thêm BUSINESS_TRIP/ONSITE/WFH vào `AttendanceStatus` enum, BPM `attendance-explanation-v1` |

---

## v5.2b — E16G: Fix Bảng Lương (7 stories)

> **Dependency:** E16F.3 (OT breakdown), E16F.7 (bonus từ leave CONVERT).

| Story | Nội dung | Schema mới |
|---|---|---|
| **E16G.1** | Áp dụng `isBhxhExempt`/`isPitExempt`/`pitExemptCeiling` trên SalaryColumn | — |
| **E16G.2** | OT pay đúng ×1.5/×2.0/×3.0 dùng OT breakdown từ E16F.3 | — |
| **E16G.3** | `PerformanceBonus` APPROVED → `PayrollRecord.bonus` (hiện = 0) | — |
| **E16G.4** | `InsuranceConfig.bhxhExemptForProbation` config | `InsuranceConfig.bhxhExemptForProbation Boolean @default(false)` |
| **E16G.5** | Seed verify 5 loại nhân viên + so sánh với tính tay | — |
| **E16G.6** | Lương 2 mức khi QĐ lương hiệu lực giữa tháng: `baseSalary = Σ(salary_i/standardDays × workDays_i)`. BHXH dùng lương cuối kỳ. ProjectCost đọc SalaryRecord tại thời điểm log (không dùng lương hiện tại) | — |
| **E16G.7** | Lương tháng 13 = `Σ(baseSalary+overtimePay+bonus)/monthsWorked` (loại allowances). Không BHXH. Cộng ytdGross cho PIT | `PayrollPeriodType.MONTH_13` enum value |

---

## v5.3 — E20 + E21: Project Finance (~15% done)

| Story | Nội dung | BE | FE |
|---|---|---|---|
| **E20.1** | Daily cost snapshot (labor từ TimeLog × rate + Expense APPROVED) | ✅ | ✅ mock |
| **E20.1b** | Task create/delete trigger recalculate parent progress | ❌ | — |
| **E20.2** | Milestone COMPLETED → tự tạo Invoice. Thêm `Invoice.dealId` + `Invoice.clientContractId` | ❌ | ❌ |
| **E20.3** | Deal WON → Project tạo (✅) + kickoff BPM `deal-to-project-kickoff-v1` | ⚠️ Project tạo ✅, BPM chưa | ❌ |
| **E20.4** | ProjectJournal CRUD (ngày giờ, người tham dự, nội dung, đã/chưa chốt) | ❌ | ❌ |
| **E20.5** | Convert unresolvedItem → Task. Dashboard "Việc chưa chốt" per project | ❌ | ❌ |
| **E21.1** | Invoice PAID → auto JournalEntry (InvoiceAccountMapping đã có) | ⚠️ mapping có, trigger chưa | ❌ |
| **E21.2** | PO received → AP JournalEntry | ❌ | ❌ |

---

## v5.4 — E22: CRM → Delivery + Chăm sóc KH (0%)

| Story | Nội dung | Trạng thái |
|---|---|---|
| **E22.1** | CustomerTicket → Issue linking (Bug/Issue Register) | ❌ |
| **E22.2** | Deal KPI: win rate, cycle time, revenue thực tế vs deal value | ❌ |
| **E22.3** | CRM Analytics Dashboard (FE có mock, BE chưa) | ⚠️ FE mock |
| **E22.4** | Cron nhắc nhở `nextActionDueAt`: notification khi đến hạn/quá hạn activity | ❌ |
| **E22.5** | Lead Nurturing Schedule: `LeadFollowUpSchedule` model, reminder khi lead không có activity trong N ngày | ❌ |
| **E22.6** | Customer Survey định kỳ: `CustomerSurveySchedule` (MONTHLY/QUARTERLY/YEARLY), cron tạo activity + notify | ❌ |
| **E22.7** | ActivityType bổ sung (DEMO, SITE_VISIT, SURVEY, TASK) + `CrmActivity.projectId` để log sau Deal WON | ❌ |

**New models E22:** `LeadFollowUpSchedule`, `CustomerSurveySchedule`

---

## v5.5 — E23: Smart Workflow (0%) — mở rộng 4 stories mới 2026-05-30

| Story | Nội dung | Trạng thái |
|---|---|---|
| **E23.1** | DelegationRule UI — ủy quyền duyệt khi vắng mặt (BE+FE đã có, cần đánh dấu done) | ❌ |
| **E23.2** | AutomationRule nâng cấp (trigger+condition+action config) | ❌ |
| **E23.3** | Approval UX: batch approve, context panel đủ thông tin | ❌ |
| **E23.4** | BPM Email Delivery — wire MailService vào BpmnEngineService + NotificationPreference schema | ❌ |
| **E23.5** | Process Lifecycle Notifications — notify requester khi STARTED/COMPLETED/REJECTED; emitStarted/emitCancelled vào ProcessEventBus | ❌ |
| **E23.6** | Task Escalation Engine — cron 30 phút, phân cấp 1d/3d/7d, escalate tới manager, ProcessUserTask.lastEscalatedAt | ❌ |
| **E23.7** | Process Cancellation by Requester — PATCH cancel API, revert entity status, notify assignees | ❌ |

> **Hotfix (không phải story):** Race condition 800ms tại `bpmn-engine.service.ts:180` — thay bằng `Promise.race`

> **E23 estimate:** 3.5–4 tuần (tăng từ 2–3 tuần ban đầu)

---

## v5.6 — E25: End User Utilities (0%) — thêm 2026-05-30

| Story | Nội dung | Trạng thái |
|---|---|---|
| **E25.1** | "My Work" Personal Dashboard — tổng hợp pending approvals, tasks, leave balance, timesheet hôm nay | ❌ |
| **E25.2** | Notification Preferences UI — Settings tab "Thông báo", toggle email/in-app per module (phụ thuộc E23.4) | ❌ |
| **E25.3** | Saved Filter Presets — lưu bộ lọc theo tên, load 1 click, max 10/user/page | ❌ |
| **E25.4** | @mention trong CommentThread — gõ @ → gợi ý user → notify mention | ❌ |
| **E25.5** | In-app Changelog — modal "Có gì mới" sau deploy, admin quản lý changelog entries | ❌ |

**Schema mới E25:** `SavedFilterPreset` · `AppChangelog`

---

## v5.7 — E26: Platform & Admin Utilities (0%) — thêm 2026-05-30

| Story | Nội dung | Trạng thái |
|---|---|---|
| **E26.1** | System Announcement Banner — admin broadcast maintenance/warning toàn tenant | ❌ |
| **E26.2** | Permission Audit Report — user→permissions matrix, "who can X" search, export CSV | ❌ |
| **E26.3** | Bulk Import mở rộng — thêm: LeaveBalance, SalaryBand, ChartOfAccounts, Customers/Leads | ❌ |
| **E26.4** | Email Delivery Dashboard — EmailLog schema, bảng trạng thái email, retry FAILED | ❌ |
| **E26.5** | BullMQ Job Browser — upgrade HealthPage: xem/retry jobs per queue, failed badge | ❌ |
| **E26.6** | Webhook Health Monitor — WebhookLog schema, tab trong IntegrationsPage (phụ thuộc E23.2) | ❌ |
| **E26.7** | Env Variable Validation on Startup — CRITICAL/WARNING/INFO check, HealthPage env section | ❌ |
| **E26.8** | SMTP Configuration UI — tab mới IntegrationsPage, TenantSmtpConfig schema (pass encrypted), test email | ❌ |
| **E26.9** | API Key Management — tạo/revoke keys có scopes, SHA-256 hash, rate limit riêng 1000/60s | ❌ |
| **E26.10** | Notification Template Editor — admin customize HTML email template per key, live preview, fallback default | ❌ |
| **E26.11** | Asset Module Enhancements — khấu hao tự động (cron), transfer phòng ban, thanh lý BPM, warranty alerts, danh mục tùy chỉnh | ❌ |

**E26 estimate:** 3–4 tuần (tăng từ 1.5–2 tuần ban đầu)

**Schema mới E26:** `SystemAnnouncement` · `EmailLog` · `WebhookLog` · `TenantSmtpConfig` · `ApiKey` · `NotificationTemplate` · `AssetTransfer` · `AssetDisposal` · `AssetCategory` (model thay enum)

---

## v5.8 — E24: BI Dashboards (~10% — FE pages có, mock data)

> **Dependency:** Cần data từ E16F/G/E20/E21/E22. Làm sau cùng.
> **Quyết định:** Tự xây bằng Recharts (không dùng Power BI) — nhất quán dark/light mode, on-premise.

| Page | File | Cần làm |
|---|---|---|
| HR Analytics | `HrAnalyticsPage.tsx` | BE `GET /reports/hr/analytics` — headcount trend, attrition, salary dist |
| Payroll Analytics | `PayrollAnalyticsPage.tsx` | BE analytics — cần E16G xong |
| Project Analytics | `ProjectAnalyticsPage.tsx` | Kết nối `project-cost.service.ts` đã có |
| Finance Analytics | `FinanceAnalyticsPage.tsx` | BE finance P&L, AR aging, cash flow |
| CRM Analytics | `CrmAnalyticsPage.tsx` | BE CRM analytics — cần E22 xong |
| Executive Dashboard | `ExecutiveDashboardPage.tsx` | Aggregate all modules + PDF export (Puppeteer) |
| Report Builder | `ReportBuilderPage.tsx` | BE query engine: entity→columns→filters→preview→export |

---

## v5.9 — UX Redesign (0%, SAU E24)

- Navigation: 10 module → 8 module theo persona (Work/People/Finance/CRM/Ops/Asset/Me/Admin)
- UX Revision 2: progress ring, dark sidebar, sparkline metric card, micro-animations
- Fix hardcoded colors: recruit (`#0EA5E9`), portal (`#64748B`), my-tasks (`#FEF2F2`)
- Accessibility WCAG 2.1 AA
- Spec: `loop-v3-navigation-redesign.md` + `ux-design-specification.md`

---

## Tổng hợp schema mới cần migrate

| Epic | Model/Field mới | Ghi chú |
|---|---|---|
| E16F.3 | `WorkShift.breakMinutes Int @default(60)` | Giờ nghỉ trưa |
| E16F.5 | `LeavePolicy.accrualMode` enum | ANNUAL_UPFRONT / MONTHLY_ACCRUAL |
| E16F.8 | `AttendanceExplanation` model | Giải trình chấm công |
| E16F.8 | `AttendanceStatus` + BUSINESS_TRIP/ONSITE/WFH | Enum thêm |
| E16G.4 | `InsuranceConfig.bhxhExemptForProbation Boolean` | |
| E16G.7 | `PayrollPeriodType.MONTH_13` enum value | Lương tháng 13 |
| E20.2 | `Invoice.dealId String?` | Liên kết CRM |
| E20.2 | `Invoice.clientContractId String?` | Liên kết hợp đồng |
| E20.4 | `ProjectJournal` model | Nhật ký dự án |
| E22.5 | `LeadFollowUpSchedule` model | Lịch chăm sóc lead |
| E22.6 | `CustomerSurveySchedule` model | Khảo sát định kỳ |
| E22.7 | `CrmActivity.projectId String?` | Link activity → project sau Deal WON |
| E22.7 | `ActivityType` + DEMO/SITE_VISIT/SURVEY/TASK | |
| E23.4 | `NotificationPreference` model (userId, moduleType, channel: EMAIL/IN_APP/BOTH) | |
| E23.6 | `ProcessUserTask.lastEscalatedAt DateTime?` | |
| E25.3 | `SavedFilterPreset` model (userId, pageKey, name, filters Json) | |
| E25.5 | `AppChangelog` model (version, title, items Json, publishedAt) | |
| E26.1 | `SystemAnnouncement` model (message, type, targetRole, startAt, endAt) | |
| E26.4 | `EmailLog` model (toEmail, subject, status, module, error) | |
| E26.6 | `WebhookLog` model (endpointUrl, ruleId, status, responseCode, durationMs) | |
| E26.8 | `TenantSmtpConfig` model (host, port, user, pass encrypted, fromEmail, fromName) | |
| E26.9 | `ApiKey` model (name, keyHash SHA-256, keyPrefix, scopes[], expiresAt) | |
| E26.10 | `NotificationTemplate` model (tenantId, key, subject, bodyHtml) | |
| E26.11 | `Asset` thêm warrantyExpiry/insuranceExpiry/currentBookValue; `AssetTransfer`; `AssetDisposal`; `AssetCategory` model (thay enum) | |

## BPM process keys v5

| Key | Trạng thái |
|---|---|
| `overtime-approval-v1` | ✅ seeded |
| `budget-approval-v1` | ✅ seeded |
| `contract-renewal-v1` | ✅ seeded |
| `employee-offboarding-v1` | ✅ seeded |
| `deal-to-project-kickoff-v1` | ✅ seeded |
| `salary-review-v1` | ✅ seeded |
| `year-end-leave-closure-v1` | ✅ seeded |
| `attendance-explanation-v1` | ❌ cần seed (E16F.8) |
| `hr-decision-approval` | ✅ đã dùng trong hr-decisions.service.ts |
