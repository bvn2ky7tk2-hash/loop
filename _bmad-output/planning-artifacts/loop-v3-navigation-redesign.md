# Loop v3.0 — Persona-driven Navigation & Dashboard Redesign

> **Trạng thái:** Đã phê duyệt — chờ hoàn thành v2.0 để triển khai  
> **Phác thảo bởi:** Mary (BA) + Tuan Anh  
> **Ngày:** 2026-05-28

---

## Tầm nhìn

> "Người dùng không nghĩ theo domain kỹ thuật — họ nghĩ theo vai trò và luồng công việc của mình."

Thay vì nhóm theo loại dữ liệu (HR data, Finance data…), v3.0 nhóm theo câu hỏi: **"Ai mở ứng dụng lên và cần làm gì?"**

Kết quả: 10 module hiện tại → **8 module theo persona**. Mỗi module có dashboard riêng với KPI và báo cáo phù hợp với vai trò. Module "Reports" standalone bị giải thể — reports được nhúng trực tiếp vào module tương ứng.

---

## Kiến trúc 8 Module

| # | Module ID | Label | Màu | Persona chính |
|---|-----------|-------|-----|---------------|
| 1 | `work` | **Work** | `#2563EB` | Mọi nhân viên — làm việc hằng ngày |
| 2 | `people` | **People** | `#059669` | HR Manager, HR BP, Team Lead |
| 3 | `finance` | **Finance** | `#0D9488` | CFO, Kế toán, Payroll Admin |
| 4 | `crm` | **CRM** | `#DC2626` | Sales Manager, Account Executive |
| 5 | `ops` | **Operations** | `#7C3AED` | Ops Manager, Process Owner |
| 6 | `asset` | **Assets** | `#F97316` | IT Admin, Facility Manager |
| 7 | `me` | **Me** | `#0891B2` | Mọi nhân viên — self-service cá nhân |
| 8 | `admin` | **Admin** | `#475569` | System Admin |

---

## Chi tiết từng module & Dashboard

### 1. `work` — Work Hub

**Persona:** Developer, PM, mọi nhân viên — nơi làm việc hằng ngày.

#### Dashboard KPI
- My open tasks (task chưa xong của tôi)
- My bugs assigned (bug đang assign)
- Hours logged this week (giờ đã log tuần này)
- Pending approvals (BPM inbox chờ duyệt)

#### Dashboard Charts
- Task completion trend (7/14/30 ngày — line chart)
- Project progress (% hoàn thành các project — bar)
- Bug status breakdown (Open/In Progress/Closed — donut)
- My timesheet heatmap (calendar heatmap giờ log)

#### Menu
```
Dashboard
├── My Work
│   ├── Kanban Board        /my-tasks
│   ├── My Tasks            /tasks
│   └── Timeline            /timeline
├── Projects
│   └── All Projects        /projects
├── Bugs & Issues
│   ├── My Bugs             /my-bugs
│   ├── Bug Management      /bugs
│   └── Bug Dashboard       /bugs/dashboard
├── Timesheet
│   ├── My Timesheet        /timesheet
│   └── Project Log         /timesheet/project
├── Approvals
│   └── Inbox               /processes/inbox
└── Reports
    └── Summary             /reports
```

**Lưu ý:** BPM Inbox gộp vào Work (90% nhân viên chỉ dùng BPM để xem pending approval — không cần switch module).

---

### 2. `people` — People

**Persona:** HR Manager, HR BP, Team Lead.

#### Dashboard KPI
- Total headcount (nhân viên active)
- Open positions (vị trí đang tuyển)
- Leave requests pending (đơn nghỉ chờ duyệt)
- Contracts expiring soon (hợp đồng hết hạn trong 30 ngày)

#### Dashboard Charts
- Headcount by department (bar)
- Recruitment funnel (Lead→Interview→Offer→Hired)
- Leave usage by type (stacked bar)
- Skill coverage heatmap (team × skill — matrix)
- OKR completion rate (progress ring per department)

#### Reports (nhúng trong module)
- Headcount Report (filter by dept/period)
- Leave Balance Report (export Excel)
- Training Completion (per employee)
- OKR Progress Report (per team/quarter)

#### Menu
```
Dashboard
├── Human Resources
│   ├── Employees           /personnel
│   ├── Org Chart           /org-chart
│   ├── Contracts           /contracts
│   └── Leave Requests      /leaves
├── Talent Development
│   ├── Training            /hr/training
│   ├── Performance Review  /hr/performance
│   ├── Skill Matrix        /hr/skill-matrix
│   └── OKR & KPI           /hr/okr
├── Recruitment
│   ├── Pipeline            /recruit/pipeline
│   ├── Candidates          /recruit/candidates
│   ├── Interviews          /recruit/interviews
│   └── Job Openings        /recruit/jobs
└── Workforce
    ├── Attendance          /timesheet/manager
    └── Approvals           /timesheet/approvals
```

**Lưu ý:** Recruit gộp vào People — HR Manager quản lý cả tuyển dụng lẫn nhân sự hiện tại. `recruit` module standalone bị giải thể.

---

### 3. `finance` — Finance

**Persona:** CFO, Kế toán trưởng, Payroll Admin.

#### Dashboard KPI
- Payroll this month (tổng lương tháng hiện tại)
- Outstanding invoices (tiền chưa thu)
- Budget utilization (% ngân sách đã dùng)
- Pending expenses (expense reports chờ duyệt)

#### Dashboard Charts
- Revenue vs Expense (line chart 12 tháng)
- Budget vs Actual (bar chart by category)
- Cash flow forecast (waterfall 90 ngày)
- Payroll cost trend (by department — stacked area)

#### Reports (nhúng trong module)
- P&L Statement → /accounting/financial-reports
- Payroll Summary (export Excel/PDF)
- Expense Report (by project/dept/period)
- Invoice Aging Report (AR tracking)

#### Menu
```
Dashboard
├── Payroll & Compensation
│   ├── Payroll             /payroll
│   ├── Payroll Settings    /payroll/settings
│   └── Payslips            /payroll/my-payslips
├── Operations
│   ├── Expenses            /expenses
│   ├── Budget              /budget
│   ├── Cost                /cost
│   └── Invoices            /invoices
└── Accounting
    ├── Chart of Accounts   /accounting/accounts
    ├── Journal             /accounting/journal
    └── Financial Reports   /accounting/financial-reports
```

---

### 4. `crm` — CRM (giữ nguyên cấu trúc)

**Persona:** Sales Manager, Account Executive.

#### Dashboard KPI
- Pipeline value (tổng giá trị deals open)
- Deals closed this month
- New leads this week
- Activities due today

#### Dashboard Charts
- Sales pipeline funnel (Lead→Qual→Proposal→Closed)
- Deal velocity (avg days per stage)
- Win rate trend (% closed won — 6 tháng)
- Revenue by customer (top 10 — horizontal bar)

#### Reports (nhúng trong module)
- Sales Performance (by rep/period)
- Pipeline Report (snapshot + forecast)
- Customer Activity Log (per account)

#### Menu
```
Dashboard
├── Pipeline
│   ├── Leads               /crm/leads
│   ├── Deals               /crm/deals
│   └── Contacts            /crm/contacts
├── Activities
│   └── Activity Log        /crm/activities
└── Customers
    ├── All Customers       /crm/customers
    └── Client Contracts    /crm/client-contracts
```

---

### 5. `ops` — Operations

**Persona:** Ops Manager, Process Owner — người *thiết kế* quy trình, không phải người *chạy*.

#### Dashboard KPI
- Active process instances
- SLA breached (quá hạn)
- Avg completion time (trung bình xử lý/process)
- Tasks pending in queue

#### Dashboard Charts
- Instance volume by process (bar)
- Completion time trend (line — SLA performance)
- Bottleneck analysis (heatmap step × avg wait time)

#### Reports (nhúng trong module)
- Process Performance Report (by process/period)
- SLA Compliance Report (export)

#### Menu
```
Dashboard
└── Workflow Management
    ├── Process Definitions /processes
    └── Instance Monitor    /processes/instances
```

**Lưu ý:** BPM Inbox (/processes/inbox) di chuyển sang Work module. Ops chỉ còn phần Design & Monitor dành cho process owner.

---

### 6. `asset` — Assets (giữ nguyên)

**Persona:** IT Admin, Facility Manager.

#### Dashboard KPI
- Total assets
- Assigned (đang cấp phát)
- In maintenance
- Maintenance due soon (30 ngày)

#### Dashboard Charts
- Asset by category (donut)
- Assignment timeline (Gantt-style)
- Maintenance schedule (calendar view)

#### Menu
```
Dashboard
└── Asset Management
    ├── All Assets          /assets
    ├── Assignments         /assets/assignments
    └── Maintenance         /assets/maintenance
```

---

### 7. `me` — Me (Self-Service) — Module mới

**Persona:** Mọi nhân viên — xem thông tin cá nhân của mình.

#### Dashboard KPI
- Leave balance (ngày phép còn lại)
- Hours this month (giờ đã log)
- My OKR score (% hoàn thành)
- Next payslip date

#### Dashboard Widgets
- My upcoming tasks (deadline gần nhất)
- My pending approvals (BPM inbox cá nhân)
- My latest payslip (preview + download)
- My leave history (12 tháng)

#### Menu
```
My Dashboard             /self-service
├── My Payslips          /payroll/my-payslips
├── My Timesheet         /timesheet
└── My Leave             /leaves  (filter cá nhân)
```

---

### 8. `admin` — Admin (giữ nguyên)

```
Dashboard
└── System
    ├── Users             /users
    ├── Permissions       /permissions
    ├── Alerts            /alerts
    ├── Menu Config       /settings
    └── Integrations      /integrations
```

---

## Global Executive Dashboard (`/`)

**Ai xem:** CEO, C-level — landing page sau khi login.

```
Cross-module KPI strip
├── Headcount | Open Positions | Payroll Cost | Pipeline Value | Active Projects

Module health cards (6 SparklineCard)
├── Work    — task completion rate + sparkline 7 ngày
├── People  — headcount growth + sparkline
├── Finance — revenue trend + sparkline
├── CRM     — pipeline value + sparkline
├── Ops     — process throughput + sparkline
└── Asset   — utilization rate + sparkline

→ Click card → vào dashboard của module đó
```

---

## Thay đổi so với v2.0

### Module bị giải thể
- `reports` → nội dung di chuyển vào Work + Global Dashboard
- `recruit` → gộp vào `people`
- `bpm` → tách: Inbox → `work`, Design/Monitor → `ops`
- `timesheet` → tách: My Timesheet/Project Log → `work`, Attendance/Approvals → `people`

### Module mới
- `me` — self-service (tách từ HR)
- `ops` — operations/BPM design (tách từ bpm)

### Module giữ nguyên
- `crm`, `asset`, `admin`, `finance` (cơ cấu lại nội dung bên trong)

---

## Mapping Routes — Trước và Sau

| Route | Module v2.0 | Module v3.0 |
|-------|-------------|-------------|
| `/` | pm | global (executive dashboard) |
| `/my-tasks` | pm | work |
| `/tasks` | pm | work |
| `/timeline` | pm | work |
| `/projects` | pm | work |
| `/my-bugs` | pm | work |
| `/bugs` | pm | work |
| `/bugs/dashboard` | pm | work |
| `/processes/inbox` | bpm | work |
| `/timesheet` | timesheet | work + me |
| `/timesheet/project` | timesheet | work |
| `/reports` | reports | work (giải thể module) |
| `/processes` | bpm | ops |
| `/processes/instances` | bpm | ops |
| `/personnel` | hr | people |
| `/org-chart` | hr | people |
| `/contracts` | hr | people |
| `/leaves` | hr | people |
| `/timesheet/approvals` | timesheet | people |
| `/timesheet/manager` | timesheet | people |
| `/hr/training` | hr | people |
| `/hr/performance` | hr | people |
| `/hr/skill-matrix` | hr | people |
| `/hr/okr` | hr | people |
| `/recruit/*` | recruit | people |
| `/self-service` | hr | me |
| `/payroll/my-payslips` | finance | me |
| `/payroll` | finance | finance |
| `/payroll/settings` | finance | finance |
| `/expenses` | finance | finance |
| `/budget` | finance | finance |
| `/cost` | finance | finance |
| `/invoices` | finance | finance |
| `/accounting/*` | finance | finance |
| `/crm/*` | crm | crm |
| `/assets/*` | asset | asset |
| `/users` | admin | admin |
| `/permissions` | admin | admin |
| `/alerts` | admin | admin |
| `/settings` | admin | admin |
| `/integrations` | admin | admin |

---

## Danh sách việc cần làm khi triển khai

### Phase A — Cơ sở hạ tầng
- [ ] Refactor `SCREEN_REGISTRY` — cập nhật `module` field theo bảng mapping trên
- [ ] Cập nhật `modules.config.tsx` — định nghĩa lại 8 module với groups mới
- [ ] Tạo `me` module definition
- [ ] Tạo `ops` module definition
- [ ] Cập nhật `MODULE_LABELS` và permission maps

### Phase B — Dashboard
- [ ] Xây dựng Executive Dashboard (`/`) — SparklineCard cross-module
- [ ] Work Dashboard — KPI + Charts (Task, Bug, Timesheet)
- [ ] People Dashboard — KPI + Charts (Headcount, Funnel, Leave)
- [ ] Finance Dashboard — KPI + Charts (Revenue, Budget, Payroll)
- [ ] CRM Dashboard — KPI + Charts (Pipeline, Win rate)
- [ ] Ops Dashboard — KPI + Charts (Process instances, SLA)
- [ ] Asset Dashboard — KPI + Charts
- [ ] Me Dashboard — Personal widgets

### Phase C — Reports tích hợp
- [ ] Nhúng Reports section vào People module
- [ ] Nhúng Reports section vào Finance module
- [ ] Nhúng Reports section vào CRM module
- [ ] Nhúng Reports section vào Ops module
- [ ] Giải thể `/reports` standalone hoặc redirect

### Phase D — UX
- [ ] Cập nhật ModuleSwitcherModal — hiển thị 8 module mới
- [ ] Cập nhật GlobalSearch — scope theo module mới
- [ ] Test permission gates theo module mới
- [ ] Cập nhật seed data permissions cho module mới
