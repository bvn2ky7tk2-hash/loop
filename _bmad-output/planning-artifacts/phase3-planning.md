# Phase 3 — Planning Artifact

> Tạo 2026-05-27. Đây là tài liệu kỹ thuật chi tiết cho Phase 3 (tháng 9–18).
> Tổng quan: xem `erp-roadmap.md`.

---

## Thứ tự implement được khuyến nghị

```
Phase 3A (tháng 9–12)
  1. CRM module (crm): Contact → Customer → Lead → Deal
  2. Invoice trong finance module

Phase 3B (tháng 12–15)
  3. Recruitment module (recruit): JobOpening → Candidate → Interview
  4. Accounting trong finance module (ChartOfAccount → JournalEntry)

Phase 3C (tháng 15–18)
  5. Asset module (asset)
  6. HR extensions: Training + Performance Review
  7. Reports Phase 3 tabs: CRM, Recruitment, Asset
```

---

## Prisma Schema — Toàn bộ models Phase 3

### CRM

```prisma
// ─── CRM ──────────────────────────────────────────────────────────────────────

model Contact {
  id         String    @id @default(cuid())
  name       String
  email      String?
  phone      String?
  title      String?   // chức danh
  customerId String?   @map("customer_id")
  customer   Customer? @relation(fields: [customerId], references: [id])
  leads      Lead[]
  createdAt  DateTime  @default(now()) @map("created_at")
  updatedAt  DateTime  @updatedAt      @map("updated_at")

  @@map("contacts")
  @@index([customerId])
}

model Customer {
  id         String     @id @default(cuid())
  code       String     @unique
  name       String
  industry   String?
  website    String?
  taxCode    String?    @map("tax_code")
  contacts   Contact[]
  deals      Deal[]
  invoices   Invoice[]
  contracts  Contract[] // back-relation — Contract.customerId mới thêm
  createdAt  DateTime   @default(now()) @map("created_at")
  updatedAt  DateTime   @updatedAt      @map("updated_at")

  @@map("customers")
}

model Lead {
  id              String     @id @default(cuid())
  title           String     @db.VarChar(200)
  contactId       String?    @map("contact_id")
  contact         Contact?   @relation(fields: [contactId], references: [id])
  source          LeadSource
  status          LeadStatus @default(NEW)
  estimatedValue  Decimal?   @db.Decimal(18, 2) @map("estimated_value")
  currency        String     @default("VND")
  assigneeId      String     @map("assignee_id")  // userId
  notes           String?    @db.Text
  convertedDealId String?    @map("converted_deal_id")
  convertedAt     DateTime?  @map("converted_at")
  createdAt       DateTime   @default(now()) @map("created_at")
  updatedAt       DateTime   @updatedAt      @map("updated_at")

  @@map("leads")
  @@index([assigneeId, status])
}

model Deal {
  id                String    @id @default(cuid())
  code              String    @unique
  title             String    @db.VarChar(200)
  customerId        String    @map("customer_id")
  customer          Customer  @relation(fields: [customerId], references: [id])
  stage             DealStage @default(QUALIFICATION)
  value             Decimal?  @db.Decimal(18, 2)
  currency          String    @default("VND")
  probability       Int?      // 0–100
  expectedCloseDate DateTime? @map("expected_close_date")
  assigneeId        String    @map("assignee_id")  // userId
  wonAt             DateTime? @map("won_at")
  lostAt            DateTime? @map("lost_at")
  lostReason        String?   @map("lost_reason")
  projectId         String?   @map("project_id")   // set khi WON → Project được tạo
  processInstanceId String?   @map("process_instance_id")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt      @map("updated_at")

  @@map("deals")
  @@index([customerId, stage])
  @@index([assigneeId])
}

enum LeadSource {
  WEBSITE
  REFERRAL
  SOCIAL
  EVENT
  COLD_OUTREACH
  OTHER
  @@map("lead_source")
}

enum LeadStatus {
  NEW
  CONTACTED
  QUALIFIED
  CONVERTED
  LOST
  @@map("lead_status")
}

enum DealStage {
  QUALIFICATION
  PROPOSAL
  NEGOTIATION
  WON
  LOST
  @@map("deal_stage")
}
```

---

### Recruitment

```prisma
// ─── Recruitment ──────────────────────────────────────────────────────────────

model JobOpening {
  id           String     @id @default(cuid())
  code         String     @unique
  title        String     @db.VarChar(200)
  orgUnitId    String     @map("org_unit_id")
  level        EmployeeLevel
  headcount    Int        @default(1)
  status       JobStatus  @default(OPEN)
  requirements String?    @db.Text
  salaryFrom   Decimal?   @db.Decimal(18, 2) @map("salary_from")
  salaryTo     Decimal?   @db.Decimal(18, 2) @map("salary_to")
  closedAt     DateTime?  @map("closed_at")
  candidates   Candidate[]
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt      @map("updated_at")

  @@map("job_openings")
  @@index([orgUnitId, status])
}

model Candidate {
  id                String         @id @default(cuid())
  name              String
  email             String?
  phone             String?
  cvStoragePath     String?        @map("cv_storage_path")  // MinIO path
  jobOpeningId      String         @map("job_opening_id")
  jobOpening        JobOpening     @relation(fields: [jobOpeningId], references: [id])
  stage             CandidateStage @default(APPLIED)
  assigneeId        String?        @map("assignee_id")  // HR userId
  source            LeadSource?    // dùng lại enum từ CRM
  expectedSalary    Decimal?       @db.Decimal(18, 2) @map("expected_salary")
  interviews        Interview[]
  employeeId        String?        @unique @map("employee_id") // set khi hired
  processInstanceId String?        @map("process_instance_id")
  notes             String?        @db.Text
  createdAt         DateTime       @default(now()) @map("created_at")
  updatedAt         DateTime       @updatedAt      @map("updated_at")

  @@map("candidates")
  @@index([jobOpeningId, stage])
  @@index([assigneeId])
}

model Interview {
  id           String          @id @default(cuid())
  candidateId  String          @map("candidate_id")
  candidate    Candidate       @relation(fields: [candidateId], references: [id])
  type         InterviewType
  scheduledAt  DateTime        @map("scheduled_at")
  location     String?
  meetingUrl   String?         @map("meeting_url")
  interviewers String[]        // userId[]
  result       InterviewResult @default(PENDING)
  score        Int?            // 1–5
  notes        String?         @db.Text
  createdAt    DateTime        @default(now()) @map("created_at")
  updatedAt    DateTime        @updatedAt      @map("updated_at")

  @@map("interviews")
  @@index([candidateId])
}

enum JobStatus {
  OPEN
  ON_HOLD
  CLOSED
  @@map("job_status")
}

enum CandidateStage {
  APPLIED
  SCREENING
  INTERVIEW
  OFFER
  HIRED
  REJECTED
  @@map("candidate_stage")
}

enum InterviewType {
  PHONE
  TECHNICAL
  HR
  FINAL
  @@map("interview_type")
}

enum InterviewResult {
  PASS
  FAIL
  PENDING
  @@map("interview_result")
}
```

---

### Asset Management

```prisma
// ─── Asset Management ─────────────────────────────────────────────────────────

model Asset {
  id                 String      @id @default(cuid())
  code               String      @unique
  name               String
  category           AssetCategory
  brand              String?
  model              String?
  serialNumber       String?     @map("serial_number")
  purchaseDate       DateTime?   @map("purchase_date")
  purchasePrice      Decimal?    @db.Decimal(18, 2) @map("purchase_price")
  depreciationYears  Int?        @map("depreciation_years")
  status             AssetStatus @default(AVAILABLE)
  orgUnitId          String      @map("org_unit_id")
  notes              String?
  assignments        AssetAssignment[]
  maintenanceLogs    AssetMaintenance[]
  createdAt          DateTime    @default(now()) @map("created_at")
  updatedAt          DateTime    @updatedAt      @map("updated_at")

  @@map("assets")
  @@index([orgUnitId, status])
  @@index([category])
}

model AssetAssignment {
  id          String    @id @default(cuid())
  assetId     String    @map("asset_id")
  asset       Asset     @relation(fields: [assetId], references: [id])
  employeeId  String    @map("employee_id")
  assignedAt  DateTime  @default(now()) @map("assigned_at")
  returnedAt  DateTime? @map("returned_at")
  notes       String?
  createdAt   DateTime  @default(now()) @map("created_at")

  @@map("asset_assignments")
  @@index([assetId])
  @@index([employeeId])
}

model AssetMaintenance {
  id          String   @id @default(cuid())
  assetId     String   @map("asset_id")
  asset       Asset    @relation(fields: [assetId], references: [id])
  type        String   // "scheduled" | "repair" | "inspection"
  performedAt DateTime @map("performed_at")
  cost        Decimal? @db.Decimal(18, 2)
  performedBy String?  @map("performed_by")  // vendor hoặc internal user
  notes       String?
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("asset_maintenance")
  @@index([assetId])
}

enum AssetCategory {
  LAPTOP
  DESKTOP
  PHONE
  PERIPHERAL
  SERVER
  FURNITURE
  SOFTWARE
  OTHER
  @@map("asset_category")
}

enum AssetStatus {
  AVAILABLE
  ASSIGNED
  UNDER_MAINTENANCE
  RETIRED
  @@map("asset_status")
}
```

---

### Finance — Invoice + Accounting

```prisma
// ─── Finance — Invoice ────────────────────────────────────────────────────────

model Invoice {
  id                String        @id @default(cuid())
  code              String        @unique
  type              InvoiceType
  customerId        String?       @map("customer_id")   // FK → customers.id
  projectId         String?       @map("project_id")    // FK → projects.id
  contractId        String?       @map("contract_id")   // FK → contracts.id
  issueDate         DateTime      @map("issue_date")
  dueDate           DateTime      @map("due_date")
  status            InvoiceStatus @default(DRAFT)
  subtotal          Decimal       @db.Decimal(18, 2)
  taxAmount         Decimal       @db.Decimal(18, 2) @default(0) @map("tax_amount")
  totalAmount       Decimal       @db.Decimal(18, 2) @map("total_amount")
  currency          String        @default("VND")
  notes             String?
  paidAt            DateTime?     @map("paid_at")
  processInstanceId String?       @map("process_instance_id")
  items             InvoiceItem[]
  journalEntries    JournalEntry[] // back-relation qua reference
  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt      @map("updated_at")

  @@map("invoices")
  @@index([status])
  @@index([customerId])
  @@index([projectId])
}

model InvoiceItem {
  id          String   @id @default(cuid())
  invoiceId   String   @map("invoice_id")
  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  description String
  quantity    Decimal  @db.Decimal(10, 2)
  unitPrice   Decimal  @db.Decimal(18, 2) @map("unit_price")
  amount      Decimal  @db.Decimal(18, 2)
  taxRate     Decimal  @db.Decimal(5, 2)  @default(0) @map("tax_rate")  // %

  @@map("invoice_items")
  @@index([invoiceId])
}

enum InvoiceType {
  SALES
  PURCHASE
  @@map("invoice_type")
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  CANCELLED
  @@map("invoice_status")
}

// ─── Finance — Accounting (double-entry) ──────────────────────────────────────

model ChartOfAccount {
  id         String      @id @default(cuid())
  code       String      @unique
  name       String
  type       AccountType
  parentCode String?     @map("parent_code")
  isActive   Boolean     @default(true) @map("is_active")
  lines      JournalLine[]
  createdAt  DateTime    @default(now()) @map("created_at")

  @@map("chart_of_accounts")
  @@index([type])
}

model JournalEntry {
  id          String        @id @default(cuid())
  date        DateTime
  description String
  reference   String?       // "INV-001" | "EXP-xxx" | "PAY-xxx" — traceability
  referenceId String?       @map("reference_id")  // FK dạng string (cross-domain)
  lines       JournalLine[]
  createdAt   DateTime      @default(now()) @map("created_at")

  @@map("journal_entries")
  @@index([date])
  @@index([referenceId])
}

model JournalLine {
  id          String         @id @default(cuid())
  entryId     String         @map("entry_id")
  entry       JournalEntry   @relation(fields: [entryId], references: [id], onDelete: Cascade)
  accountCode String         @map("account_code")
  account     ChartOfAccount @relation(fields: [accountCode], references: [code])
  debit       Decimal        @db.Decimal(18, 2) @default(0)
  credit      Decimal        @db.Decimal(18, 2) @default(0)
  description String?

  @@map("journal_lines")
  @@index([entryId])
  @@index([accountCode])
}

enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  REVENUE
  EXPENSE
  @@map("account_type")
}
```

---

### HR — Training + Performance Review

```prisma
// ─── HR Extensions ────────────────────────────────────────────────────────────

model TrainingProgram {
  id          String          @id @default(cuid())
  title       String
  type        String          // "internal" | "external"
  provider    String?         // tên đơn vị đào tạo nếu external
  durationHours Int           @map("duration_hours")
  description String?
  records     TrainingRecord[]
  createdAt   DateTime        @default(now()) @map("created_at")
  updatedAt   DateTime        @updatedAt      @map("updated_at")

  @@map("training_programs")
}

model TrainingRecord {
  id            String          @id @default(cuid())
  programId     String          @map("program_id")
  program       TrainingProgram @relation(fields: [programId], references: [id])
  employeeId    String          @map("employee_id")
  startDate     DateTime        @map("start_date")
  endDate       DateTime?       @map("end_date")
  status        TrainingStatus  @default(SCHEDULED)
  score         Int?            // 0–100
  certificatePath String?       @map("certificate_path")  // MinIO
  notes         String?
  createdAt     DateTime        @default(now()) @map("created_at")
  updatedAt     DateTime        @updatedAt      @map("updated_at")

  @@map("training_records")
  @@index([employeeId])
  @@index([programId])
}

model PerformanceReview {
  id                String       @id @default(cuid())
  employeeId        String       @map("employee_id")
  reviewerId        String       @map("reviewer_id")   // userId
  period            String       // "2026-Q1" | "2026-H1" | "2026"
  score             Int          // 1–5
  strengths         String?      @db.Text
  improvements      String?      @db.Text
  goals             String?      @db.Text
  status            ReviewStatus @default(DRAFT)
  processInstanceId String?      @map("process_instance_id")
  submittedAt       DateTime?    @map("submitted_at")
  approvedAt        DateTime?    @map("approved_at")
  createdAt         DateTime     @default(now()) @map("created_at")
  updatedAt         DateTime     @updatedAt      @map("updated_at")

  @@map("performance_reviews")
  @@unique([employeeId, period])
  @@index([reviewerId])
}

enum TrainingStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  @@map("training_status")
}

enum ReviewStatus {
  DRAFT
  SUBMITTED
  APPROVED
  @@map("review_status")
}
```

---

## Backend Module Structure

### crm module
```
apps/backend/src/crm/
├── crm.module.ts
├── contacts/
│   ├── contacts.controller.ts
│   ├── contacts.service.ts
│   └── dto/
├── customers/
│   ├── customers.controller.ts
│   ├── customers.service.ts
│   └── dto/
├── leads/
│   ├── leads.controller.ts
│   ├── leads.service.ts
│   └── dto/
└── deals/
    ├── deals.controller.ts
    ├── deals.service.ts   ← deal WON → ProjectsService.createFromDeal()
    └── dto/
```

### recruit module
```
apps/backend/src/recruit/
├── recruit.module.ts
├── jobs/
│   ├── jobs.controller.ts
│   ├── jobs.service.ts
│   └── dto/
├── candidates/
│   ├── candidates.controller.ts
│   ├── candidates.service.ts   ← HIRED → PersonnelService.createEmployee()
│   └── dto/
└── interviews/
    ├── interviews.controller.ts
    ├── interviews.service.ts   ← scheduled → NotificationDeliveryService
    └── dto/
```

### asset module
```
apps/backend/src/assets/
├── assets.module.ts
├── assets.controller.ts
├── assets.service.ts
└── dto/
```

### finance extensions (thêm vào `src/finance/`)
```
apps/backend/src/finance/
├── finance.module.ts   ← cập nhật import
├── payroll/            ← đã có
├── expenses/           ← đã có
├── budget/             ← đã có
├── invoices/
│   ├── invoices.controller.ts
│   ├── invoices.service.ts   ← PAID → FinanceEventBus.emitPaid()
│   └── dto/
└── accounting/
    ├── accounting.controller.ts
    ├── accounting.service.ts   ← subscribe FinanceEventBus → auto journal
    ├── chart-of-accounts.service.ts
    └── dto/
```

### hr extensions (thêm vào `src/hr/`)
```
apps/backend/src/hr/
├── ...existing...
├── training/
│   ├── training.controller.ts
│   ├── training.service.ts
│   └── dto/
└── performance/
    ├── performance.controller.ts
    ├── performance.service.ts
    └── dto/
```

---

## Frontend Routes & Pages

```
apps/web/src/pages/crm/
├── LeadsPage.tsx           /crm/leads
├── DealsPage.tsx           /crm/deals
├── ContactsPage.tsx        /crm/contacts
└── CustomersPage.tsx       /crm/customers

apps/web/src/pages/recruit/
├── JobsPage.tsx            /recruit/jobs
├── CandidatesPage.tsx      /recruit/candidates
├── InterviewsPage.tsx      /recruit/interviews
└── RecruitPipelinePage.tsx /recruit/pipeline   ← Kanban view

apps/web/src/pages/assets/
├── AssetsPage.tsx          /assets
├── AssignmentsPage.tsx     /assets/assignments
└── MaintenancePage.tsx     /assets/maintenance

apps/web/src/pages/finance/
├── ...existing...
├── InvoicesPage.tsx        /invoices
├── JournalPage.tsx         /accounting/journal
└── ChartOfAccountsPage.tsx /accounting/accounts

apps/web/src/pages/hr/
├── ...existing...
├── TrainingPage.tsx        /hr/training
└── PerformancePage.tsx     /hr/performance
```

---

## API Endpoints — Tóm tắt

### CRM
```
GET/POST   /api/v1/crm/contacts
GET/PUT    /api/v1/crm/contacts/:id

GET/POST   /api/v1/crm/customers
GET/PUT    /api/v1/crm/customers/:id

GET/POST   /api/v1/crm/leads
GET/PUT    /api/v1/crm/leads/:id
PATCH      /api/v1/crm/leads/:id/convert  ← Lead → Deal

GET/POST   /api/v1/crm/deals
GET/PUT    /api/v1/crm/deals/:id
PATCH      /api/v1/crm/deals/:id/stage    ← { stage: DealStage }
POST       /api/v1/crm/deals/:id/won      ← mark won + auto-create project
```

### Recruitment
```
GET/POST   /api/v1/recruit/jobs
GET/PUT/PATCH /api/v1/recruit/jobs/:id

GET/POST   /api/v1/recruit/candidates
GET/PUT    /api/v1/recruit/candidates/:id
PATCH      /api/v1/recruit/candidates/:id/stage
POST       /api/v1/recruit/candidates/:id/hire  ← → Employee

GET/POST   /api/v1/recruit/interviews
GET/PUT    /api/v1/recruit/interviews/:id
PATCH      /api/v1/recruit/interviews/:id/result
```

### Assets
```
GET/POST   /api/v1/assets
GET/PUT    /api/v1/assets/:id
POST       /api/v1/assets/:id/assign      ← { employeeId }
PATCH      /api/v1/assets/:id/return
POST       /api/v1/assets/:id/maintenance ← log maintenance
```

### Finance+
```
GET/POST   /api/v1/invoices
GET/PUT    /api/v1/invoices/:id
PATCH      /api/v1/invoices/:id/status    ← DRAFT→SENT→PAID

GET        /api/v1/accounting/journal     ← paginated entries
POST       /api/v1/accounting/journal     ← manual entry
GET        /api/v1/accounting/accounts    ← chart of accounts
GET        /api/v1/accounting/trial-balance ← DR/CR totals per account
```

### HR+
```
GET/POST   /api/v1/hr/training/programs
GET/POST   /api/v1/hr/training/records
PATCH      /api/v1/hr/training/records/:id/status

GET/POST   /api/v1/hr/performance/reviews
PATCH      /api/v1/hr/performance/reviews/:id/submit
```

---

## Integration Map

| Trigger | Source | Action | Target |
|---|---|---|---|
| Deal WON | `DealsService` | `ProjectsService.createFromDeal()` | pm module |
| Candidate HIRED | `CandidatesService` | `PersonnelService.createEmployee()` | hr module |
| Invoice PAID | `FinanceEventBus` | tạo `JournalEntry` DR/CR | accounting |
| Expense APPROVED | `FinanceEventBus` | tạo `JournalEntry` chi phí | accounting |
| Payroll APPROVED | `FinanceEventBus` | tạo `JournalEntry` lương | accounting |
| Interview scheduled | `InterviewsService` | `NotificationDeliveryService.send()` | platform |
| PerformanceReview | BPM `review-approval` | update status APPROVED | hr |

---

## BPM Workflow Templates cần seed (Phase 3)

| Key | Mô tả | Form Fields |
|---|---|---|
| `deal-approval` | Duyệt deal trước khi gửi proposal | `decision` (APPROVED/REJECTED), `rejectedReason` |
| `invoice-approval` | Duyệt invoice trước khi gửi | `decision`, `rejectedReason` |
| `hiring-approval` | Duyệt offer cho candidate | `decision`, `offerSalary`, `startDate` |
| `performance-approval` | Duyệt performance review | `decision`, `finalScore`, `comment` |

---

## Seed Data Phase 3 (demo)

Khi implement từng module, bổ sung vào `prisma/seed.ts`:
- 3 Customers + 6 Contacts
- 5 Leads (mixed statuses) + 4 Deals (1 WON có Project được tạo)
- 2 JobOpenings + 8 Candidates (mixed stages) + 4 Interviews
- 10 Assets (mix categories) + 5 Assignments
- 5 Invoices (mix SALES/PURCHASE, mix statuses)
- ChartOfAccount seed: chuẩn VN TT200 (~50 accounts cơ bản)
- 2 TrainingPrograms + 6 TrainingRecords
- 5 PerformanceReviews (DRAFT/SUBMITTED/APPROVED)

---

## Màu module + gatePermission

| Module | Color | gatePermission |
|---|---|---|
| crm | `#DC2626` | `crm:read` |
| recruit | `#0EA5E9` | `employees:create` |
| asset | `#B45309` | `admin:org` |

**Cần thêm vào permission system (Epic 15):**
- `crm:read`, `crm:manage`
- Các route mới vào `ROUTE_PERMISSION_MAP` trong `modules.config.tsx`
- Các icon mới vào `ICON_MAP`

Recommended icons (Ant Design):
- `/crm/leads` → `FunnelPlotOutlined`
- `/crm/deals` → `TrophyOutlined`
- `/crm/contacts` → `ContactsOutlined`
- `/crm/customers` → `BankOutlined` (hoặc `ShopOutlined`)
- `/recruit/jobs` → `SolutionOutlined`
- `/recruit/candidates` → `UserAddOutlined`
- `/recruit/interviews` → `TeamOutlined`
- `/recruit/pipeline` → `AppstoreOutlined`
- `/assets` → `LaptopOutlined`
- `/assets/assignments` → `SendOutlined`
- `/assets/maintenance` → `ToolOutlined`
- `/invoices` → `FileTextOutlined`
- `/accounting/journal` → `BookOutlined`
- `/accounting/accounts` → `AccountBookOutlined`
- `/hr/training` → `ReadOutlined`
- `/hr/performance` → `StarOutlined`
