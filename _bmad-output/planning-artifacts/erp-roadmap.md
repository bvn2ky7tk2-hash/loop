# Loop ERP Roadmap

> Cập nhật 2026-05-28 — Căn cứ trên `modules.config.tsx`, `router.tsx`, Prisma schema thực tế.
> **Phase 3 hoàn thành toàn bộ:** 10 module, 44 Prisma models, auto-journal FinanceEventBus, HR Training + Performance Review, Reports Phase 3 tabs (CRM/Recruitment/Asset).

---

## Cấu trúc module hiện tại (10 module — đã hoàn thành Phase 3)

> Tất cả label trong sidebar đồng bộ **tiếng Anh**.

---

### Module 1 — pm · Projects `#2563EB`

| Group | Feature | Route |
|---|---|---|
| **Work** | Kanban Board | `/my-tasks` |
| | My Tasks | `/tasks` |
| | Timeline | `/timeline` |
| **Bugs & Issues** | My Bugs | `/my-bugs` |
| | Bug Management | `/bugs` |
| | Bug Dashboard | `/bugs/dashboard` |
| **Projects** | All Projects | `/projects` |
| | Cost | `/cost` |

Top item: **Dashboard** (`/`)

---

### Module 2 — bpm · Workflow `#7C3AED`

| Group | Feature | Route |
|---|---|---|
| **Workflow** | Inbox | `/processes/inbox` |
| | Processes | `/processes` |
| | Monitor | `/processes/instances` |

Top item: **Dashboard** (`/`)

---

### Module 3 — timesheet · Timesheet `#D97706`

| Group | Feature | Route |
|---|---|---|
| **Timesheet** | My Timesheet | `/timesheet` |
| | Approvals | `/timesheet/approvals` |
| | Project Log | `/timesheet/project` |
| | Attendance | `/timesheet/manager` |

Top item: **Dashboard** (`/`)

---

### Module 4 — reports · Reports `#0891B2`

| Group | Feature | Route |
|---|---|---|
| **Reports** | Summary | `/reports` |

Top item: **Dashboard** (`/`)

> Phase 2 bổ sung: Project analytics, Bug report, Timesheet export

---

### Module 5 — hr · HR `#059669`

| Group | Feature | Route |
|---|---|---|
| **Human Resources** | Employees | `/personnel` |
| | Org Chart | `/org-chart` |
| | Contracts | `/contracts` |
| | Leave Requests | `/leaves` |

Top item: **Dashboard** (`/`)

> Phase 2: Org Chart ✅, Contracts ✅, Leave ✅ · Onboarding workflow ✅

---

### Module 6 — finance · Finance `#0D9488`

| Group | Feature | Route |
|---|---|---|
| **Finance** | Payroll | `/payroll` |
| | Expenses | `/expenses` |
| | Budget | `/budget` |

Top item: **Dashboard** (`/`)

> Phase 2: Payroll ✅, Expenses ✅, Budget ✅ · BPM integration (expense-approval) ✅

---

### Module 7 — admin · Admin `#475569`

| Group | Feature | Route |
|---|---|---|
| **System** | Users | `/users` |
| | Alerts | `/alerts` |
| | Settings | `/settings` |
| | Permissions | `/permissions` |

---

## Prisma Models hiện có (27+ models)

| Group | Models |
|---|---|
| Core IAM | User, OrgUnit, Permission, RolePermission, UserPermission, ModuleRole, ModuleRolePermission, UserModuleRole |
| Project / Task | Project, Task, Allocation |
| Bug | Bug, BugTask, BugAttachment, BugComment, BugTag |
| HR | Employee, EmployeeRate |
| Timesheet | TimeLog, WorkStatus, TimeEntry, TimesheetRecord |
| BPM | ProcessDefinition, ProcessInstance, ProcessUserTask, ProcessActivityLog |
| Platform | Notification, PushToken, TelegramConfig, TelegramMessage, AlertConfig |
| Audit | AuditLog |

---

## Lộ trình 3 Phase

### Phase 1 — Ổn định nền tảng (0–3 tháng)

**✅ Menu / Navigation — Hoàn thành:**
- ✅ 7 module: pm / bpm / timesheet / reports / hr / finance / admin
- ✅ Toàn bộ label đồng bộ tiếng Anh
- ✅ Reports tách thành module riêng
- ✅ Bug & Issues gộp vào module pm (không tách riêng)
- ✅ Orphaned pages đã vào menu: `/timesheet`, `/timesheet/approvals`, `/users`, `/bugs/dashboard`

**✅ Infra / Platform — Hoàn thành:**
- ✅ Rate limiting — `@nestjs/throttler`, 100 req/60s global, 10 req/60s auth
- ✅ DB connection pool — `max=20`, `idleTimeout=30s`, `connTimeout=5s`
- ✅ Pagination — `PaginationDto` + `PaginatedResult` dùng chung
- ✅ AuditLog table + service (global module)
- ✅ StorageModule (generalized MinIO — dùng chung cho mọi domain)
- ✅ Helmet.js security headers

---

### Phase 2 — HR & Finance (3–9 tháng)

**Mở rộng module hr:**
- ✅ Org Chart — `/org-chart` (frontend + sơ đồ tổ chức)
- ✅ Contracts — backend CRUD + frontend quản lý hợp đồng
- ✅ Payroll — backend tính lương (EmployeeRate × workingDays), duyệt kỳ lương, frontend page
- ⬜ Onboarding workflow (qua BPM) — chưa xây

**Leave Management — module pm:**
- ✅ Backend: LeaveType, LeaveRequest, LeaveBalance, CRUD + approve/reject
- ✅ Frontend: LeavePage — tab My/All, balance widget, drawer submit
- ✅ BPM Integration: LeaveType gắn processDefinitionKey → auto-start process khi tạo đơn; duyệt qua BPM Inbox
- ✅ BPMN template seed: `leave-approval` (status ACTIVE, taskForm decision + rejectedReason)

**Budget — module pm:**
- ✅ Backend: BudgetPeriod/BudgetRecord (tận dụng cost API hiện có)
- ✅ Frontend: BudgetPage — cards tổng ngân sách, progress bar utilization

**Expense — module pm:**
- ✅ Backend: Expense, ExpenseItem, CRUD + approve/reject
- ✅ Frontend: ExpensePage — summary cards, expandable items, drawer submit
- ✅ BPM Integration: auto-start `expense-approval` process nếu definition ACTIVE
- ✅ BPMN template seed: `expense-approval`

**BPM Workflow Integration (cross-cutting):**
- ✅ `ProcessEventBus` — event bus dùng node:events (không cần package mới)
- ✅ `ProcessDefinition.key` — unique slug để reference từ domain entities
- ✅ `LeaveType.processDefinitionKey`, `LeaveRequest.processInstanceId`, `Expense.processInstanceId`

**Mở rộng module reports:**
- ✅ Project analytics — burndown chart, org summary, monthly hours trend
- ✅ Bug Statistics tab — theo status/severity/project/monthly trend
- ✅ HR Stats tab — leave theo loại, expense theo category + tổng tiền
- ✅ Timesheet Export Excel — 5 loại report: PROJECT_COST, PERSONNEL_ALLOCATION, TASK_PROGRESS, ALERT_HISTORY, TIMESHEET_SUMMARY

**Onboarding workflow:**
- ✅ BPMN template seed `employee-onboarding` (3 bước: IT Setup → Orientation → Confirmation)
- ✅ PersonnelPage: button "Start Onboarding" per nhân viên → auto-start process instance

---

### Phase 3 — CRM, Tuyển dụng, Tài sản & Finance+ ✅ HOÀN THÀNH

> Tổng quan: 3 module **mới** (crm / recruit / asset) + mở rộng 2 module hiện tại (finance / hr). **10 module tổng cộng — tất cả đã xây xong.**

---

#### Phase 3A ✅: CRM + Invoice

**Module mới: crm · CRM `#DC2626`**
- `gatePermission`: `crm:read`
- Top item: Dashboard (`/`)

| Group | Feature | Route |
|---|---|---|
| **Pipeline** | Leads | `/crm/leads` |
| | Deals | `/crm/deals` |
| | Contacts | `/crm/contacts` |
| **Customers** | Customers | `/crm/customers` |

Prisma models mới:
- `Contact` — tên, email, phone, gắn Customer
- `Customer` — code, tên, ngành, link tới Deals + Contracts
- `Lead` — tiêu đề, nguồn (`LeadSource`), trạng thái (`LeadStatus`), gắn Contact + assignee
- `Deal` — code, stage (`DealStage`), value, xác suất, ngày dự kiến close; khi `WON` → auto-tạo `Project` qua service interface; có `processInstanceId` (BPM deal approval tuỳ chọn)

Enums mới: `LeadSource` (WEBSITE / REFERRAL / SOCIAL / EVENT / COLD_OUTREACH / OTHER), `LeadStatus` (NEW / CONTACTED / QUALIFIED / CONVERTED / LOST), `DealStage` (QUALIFICATION / PROPOSAL / NEGOTIATION / WON / LOST)

Integration:
- Deal `WON` → `ProjectsService.createFromDeal(dealId)` — service interface, không Prisma cross-domain join
- `Customer` dùng chung với `Contract` (hr) qua `customerId` FK

---

**Mở rộng finance — Invoice**

Routes mới trong finance module:

| Group | Feature | Route |
|---|---|---|
| **Invoicing** | Invoices | `/invoices` |

Prisma models mới:
- `Invoice` — code, type (`SALES`/`PURCHASE`), link tới Customer/Project/Contract, issue date, due date, status (`InvoiceStatus`), currency, `processInstanceId`
- `InvoiceItem` — mô tả, quantity, unit price, amount

Enums mới: `InvoiceType` (SALES / PURCHASE), `InvoiceStatus` (DRAFT / SENT / PAID / OVERDUE / CANCELLED)

BPM integration: Invoice approval qua processDefinitionKey `invoice-approval`

---

#### Phase 3B ✅: Recruitment + Accounting

**Module mới: recruit · Recruitment `#0EA5E9`**
- `gatePermission`: `employees:create` (HR quản lý)
- Top item: Dashboard (`/`)

| Group | Feature | Route |
|---|---|---|
| **Recruitment** | Job Openings | `/recruit/jobs` |
| | Candidates | `/recruit/candidates` |
| | Interviews | `/recruit/interviews` |
| **Pipeline** | Kanban | `/recruit/pipeline` |

Prisma models mới:
- `JobOpening` — code, tiêu đề, orgUnitId, level (dùng `EmployeeLevel` hiện có), headcount, status (`JobStatus`), yêu cầu
- `Candidate` — tên, email, phone, cvUrl (MinIO), gắn JobOpening, stage (`CandidateStage`), assigneeId; khi hired → gắn `employeeId`; `processInstanceId` (BPM hiring workflow)
- `Interview` — type (`InterviewType`), scheduledAt, interviewers `String[]`, result (`InterviewResult`), notes

Enums mới: `JobStatus` (OPEN / ON_HOLD / CLOSED), `CandidateStage` (APPLIED / SCREENING / INTERVIEW / OFFER / HIRED / REJECTED), `InterviewType` (PHONE / TECHNICAL / HR / FINAL), `InterviewResult` (PASS / FAIL / PENDING)

Integration:
- CV upload qua `StorageModule` (MinIO đã có)
- Candidate `HIRED` → trigger `employee-onboarding` BPM process → tạo `Employee` record
- Interview scheduled → gửi Notification qua `NotificationDeliveryService`

---

**Mở rộng finance — Accounting (double-entry)**

Routes mới trong finance module:

| Group | Feature | Route |
|---|---|---|
| **Accounting** | Journal | `/accounting/journal` |
| | Chart of Accounts | `/accounting/accounts` |

Prisma models mới:
- `ChartOfAccount` — code (unique), tên, type (`AccountType`), parentCode, isActive
- `JournalEntry` — date, description, reference (Invoice/Expense/Payroll ID)
- `JournalLine` — FK JournalEntry, accountCode, debit, credit

Enums mới: `AccountType` (ASSET / LIABILITY / EQUITY / REVENUE / EXPENSE)

Auto-journal khi:
- Invoice `PAID` → DR 1111 (tiền mặt) / CR 5111 (doanh thu)
- Expense `APPROVED` → DR chi phí / CR 331 (phải trả)
- Payroll `APPROVED` → DR lương / CR 334 (phải trả NV)

---

#### Phase 3C ✅: Asset + HR+

**Module mới: asset · Assets `#B45309`**
- `gatePermission`: `admin:org`
- Top item: Dashboard (`/`)

| Group | Feature | Route |
|---|---|---|
| **Assets** | All Assets | `/assets` |
| | Assignments | `/assets/assignments` |
| | Maintenance | `/assets/maintenance` |

Prisma models mới:
- `Asset` — code, tên, category (`AssetCategory`), serialNumber, purchaseDate, purchasePrice, depreciationYears, status (`AssetStatus`), orgUnitId
- `AssetAssignment` — assetId, employeeId, assignedAt, returnedAt
- `AssetMaintenance` — assetId, type, performedAt, cost, notes

Enums mới: `AssetCategory` (LAPTOP / DESKTOP / PHONE / PERIPHERAL / SERVER / FURNITURE / SOFTWARE / OTHER), `AssetStatus` (AVAILABLE / ASSIGNED / UNDER_MAINTENANCE / RETIRED)

---

**Mở rộng hr — Training + Performance Review**

Routes mới trong hr module:

| Group | Feature | Route |
|---|---|---|
| **Development** | Training | `/hr/training` |
| | Performance | `/hr/performance` |

Prisma models mới:
- `TrainingProgram` — tiêu đề, type (internal/external), duration (hours)
- `TrainingRecord` — FK Employee + Program, startDate, endDate, status (`TrainingStatus`), score, certificate (MinIO)
- `PerformanceReview` — FK Employee + reviewer, period (e.g. `"2026-H1"`), score (1–5), strengths, improvements, goals, status (`ReviewStatus`), `processInstanceId` (BPM review approval)

Enums mới: `TrainingStatus` (SCHEDULED / IN_PROGRESS / COMPLETED / CANCELLED), `ReviewStatus` (DRAFT / SUBMITTED / APPROVED)

---

**Mở rộng reports — Phase 3 analytics ✅**

Đã thêm 3 tabs vào ReportsPage:
- ✅ **CRM** tab: funnel theo stage, deal value theo tháng, tỷ lệ win/lose
- ✅ **Recruitment** tab: time-to-hire, funnel stage, hired vs target headcount
- ✅ **Asset** tab: số lượng theo category, depreciation estimate

---

#### Tóm tắt Phase 3 — Models mới

| Module | Models mới | Enums mới |
|---|---|---|
| crm | Contact, Customer, Lead, Deal | LeadSource, LeadStatus, DealStage |
| recruit | JobOpening, Candidate, Interview | JobStatus, CandidateStage, InterviewType, InterviewResult |
| asset | Asset, AssetAssignment, AssetMaintenance | AssetCategory, AssetStatus |
| finance+ | Invoice, InvoiceItem, ChartOfAccount, JournalEntry, JournalLine | InvoiceType, InvoiceStatus, AccountType |
| hr+ | TrainingProgram, TrainingRecord, PerformanceReview | TrainingStatus, ReviewStatus |
| **Total** | **17 models mới** | **14 enums mới** |

---

#### Phase 3 — Cấu trúc 10 module khi hoàn thành

| # | Module | Color | Phase |
|---|---|---|---|
| 1 | pm · Projects | `#2563EB` | Phase 1 |
| 2 | bpm · Workflow | `#7C3AED` | Phase 1 |
| 3 | timesheet · Timesheet | `#D97706` | Phase 1 |
| 4 | reports · Reports | `#0891B2` | Phase 1+2 |
| 5 | hr · HR | `#059669` | Phase 2+3C |
| 6 | finance · Finance | `#0D9488` | Phase 2+3A+3B |
| 7 | admin · Admin | `#475569` | Phase 1 |
| 8 | crm · CRM | `#DC2626` | Phase 3A |
| 9 | recruit · Recruitment | `#0EA5E9` | Phase 3B |
| 10 | asset · Assets | `#B45309` | Phase 3C |

---

#### Quyết định kiến trúc Phase 3

**Deal → Project:** `CrmService` gọi `ProjectsService.createFromDeal()` — service interface, không join Prisma cross-domain. `Project.customerId` thêm FK optional.

**Auto Journal:** `FinanceEventBus` (cùng pattern `ProcessEventBus`) fire event khi Invoice/Expense/Payroll thay đổi trạng thái → `AccountingService` subscribe và tạo `JournalEntry`.

**CV Upload:** Dùng `StorageModule` bucket `loop-hr-files` (tách với `loop-bug-attachments`).

**Candidate → Employee:** Khi `Candidate.stage = HIRED`, `RecruitService` gọi `PersonnelService.createEmployee()` với data từ Candidate — service interface.

**Chart of Accounts:** Seed sẵn chuẩn VN (TT200) khi deploy — Admin có thể thêm nhưng không xóa account đã có journal entries.

---

## Quyết định kiến trúc đã chốt

**Schema strategy:** Single `schema.prisma` với domain section comments (Prisma 7 `defineConfig` không hỗ trợ directory path)

**Module communication:** Service interface (không join Prisma cross-domain)

**Bug & Issues:** Gộp vào pm module — thuộc vòng đời dự án, không tách riêng

**Label policy:** Toàn bộ sidebar label tiếng Anh — không mix tiếng Việt/Anh

---

> Xem quy tắc coding tại: `_bmad-output/planning-artifacts/coding-standards.md`
