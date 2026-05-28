# Phase 3 — Work Breakdown Structure

> Tạo 2026-05-27. Kỹ thuật chi tiết: `phase3-planning.md`. Tổng quan: `erp-roadmap.md`.
>
> **7 epics · 57 stories · ~95 dev-days**
>
> Quy ước size: S = 0.5d · M = 1d · L = 2d · XL = 3d

---

## Timeline

```
Phase 3A — Tháng 9–12  (16 tuần)
  Epic 17: CRM Module                11 stories · ~18d
  Epic 18: Invoicing                  6 stories · ~9d

Phase 3B — Tháng 12–15 (14 tuần)
  Epic 19: Recruitment               11 stories · ~17d
  Epic 20: Accounting                 7 stories · ~12d

Phase 3C — Tháng 15–18 (14 tuần)
  Epic 21: Asset Management           9 stories · ~12d
  Epic 22: HR Extensions              7 stories · ~11d
  Epic 23: Phase 3 Reports            6 stories · ~8d
```

---

## Epic 17: CRM Module

Đội sales có thể quản lý leads từ nguồn đầu vào đến khi chuyển thành deal, theo dõi pipeline deal theo stage, và khi deal thắng hệ thống tự động tạo Project tương ứng — tất cả dữ liệu khách hàng tập trung, không lưu rải rác trên spreadsheet.

**Modules.config:** `crm` · `#DC2626` · `gatePermission: 'crm:read'`

---

### Story 17.1: Prisma Migration — CRM Schema · M

Là developer, tôi muốn schema CRM được migrate lên PostgreSQL, để các service có thể sử dụng models Customer, Contact, Lead, Deal.

**Acceptance Criteria:**

**Given** migration `20260901_crm_module` chạy
**When** kiểm tra PostgreSQL
**Then** các bảng tồn tại: `customers`, `contacts`, `leads`, `deals`
**And** `customers.code` có UNIQUE constraint
**And** `deals.code` có UNIQUE constraint
**And** `deals.process_instance_id` là TEXT nullable (FK tới process_instances.id)
**And** indexes: `idx_leads_assignee_status`, `idx_deals_customer_stage`, `idx_deals_assignee`
**And** enums mới: `lead_source`, `lead_status`, `deal_stage` tồn tại trong PostgreSQL

---

### Story 17.2: Backend — Customer & Contact CRUD · M

Là admin/sales, tôi muốn quản lý danh sách khách hàng và người liên hệ, để có cơ sở dữ liệu khách hàng tập trung.

**Acceptance Criteria:**

**Given** `POST /api/v1/crm/customers` với payload hợp lệ
**When** request được gửi bởi user có quyền `crm:manage`
**Then** Customer được tạo, trả về `201` với `data: { id, code, name, ... }`
**And** `code` bắt buộc, unique — trả `409` nếu trùng

**Given** `GET /api/v1/crm/customers` với pagination
**When** request được gửi
**Then** trả về `PaginatedResult<Customer>` với `include: { contacts: true, deals: { select: { id, stage } } }`

**Given** `POST /api/v1/crm/contacts` với `customerId` hợp lệ
**When** contact được tạo
**Then** contact liên kết với customer đúng

**Given** `GET /api/v1/crm/customers/:id`
**When** id không tồn tại
**Then** trả `404 NotFoundException`

---

### Story 17.3: Backend — Lead CRUD + Conversion · L

Là sales, tôi muốn ghi nhận và quản lý leads theo vòng đời, và chuyển lead thành deal khi đủ điều kiện, để không bỏ sót cơ hội bán hàng.

**Acceptance Criteria:**

**Given** `POST /api/v1/crm/leads` với `title`, `source`, `assigneeId`
**When** tạo lead
**Then** `status = NEW`, `convertedDealId = null`

**Given** `PATCH /api/v1/crm/leads/:id` cập nhật `status`
**When** status hợp lệ (NEW → CONTACTED → QUALIFIED → CONVERTED/LOST)
**Then** trạng thái được cập nhật; không thể back từ CONVERTED

**Given** `POST /api/v1/crm/leads/:id/convert` với `{ customerId?, dealTitle, dealValue? }`
**When** lead ở trạng thái QUALIFIED
**Then** Deal mới được tạo với `stage = QUALIFICATION`
**And** Lead `status = CONVERTED`, `convertedDealId` set
**And** operation chạy trong Prisma transaction
**And** nếu lead không phải QUALIFIED → trả `422 UnprocessableEntityException`

---

### Story 17.4: Backend — Deal CRUD + Stage Transitions + WON Integration · XL

Là sales/PM, tôi muốn theo dõi deals theo stage pipeline, và khi deal thắng hệ thống tự động tạo project, để giảm việc nhập liệu trùng lặp.

**Acceptance Criteria:**

**Given** `POST /api/v1/crm/deals` với `customerId`, `title`, `assigneeId`
**When** deal được tạo
**Then** `stage = QUALIFICATION`, `wonAt = null`, `projectId = null`

**Given** `PATCH /api/v1/crm/deals/:id/stage` với `{ stage }`
**When** stage transition hợp lệ (QUALIFICATION → PROPOSAL → NEGOTIATION → WON/LOST)
**Then** deal stage được cập nhật
**And** transitions không hợp lệ (e.g. WON → PROPOSAL) trả `422`
**And** WON → LOST trả `422`

**Given** `POST /api/v1/crm/deals/:id/won` với `{ projectName?, projectType? }`
**When** deal ở NEGOTIATION hoặc PROPOSAL
**Then** trong Prisma transaction:
  - Deal `stage = WON`, `wonAt = now()`
  - `ProjectsService.createFromDeal(deal)` được gọi → tạo Project với `code = deal.code`, `name = projectName ?? deal.title`, `client = customer.name`, `status = PLANNING`
  - `deal.projectId` set về project vừa tạo
**And** nếu `ProjectsService` throw → transaction rollback, deal không đổi stage

**Given** `POST /api/v1/crm/deals/:id/lost` với `{ lostReason }`
**When** deal ở NEGOTIATION hoặc PROPOSAL
**Then** `stage = LOST`, `lostAt = now()`, `lostReason` được lưu

---

### Story 17.5: BPM Integration — Deal Approval Process · M

Là admin, tôi muốn cấu hình deal approval qua BPM, để deals lớn có thể qua quy trình duyệt trước khi gửi proposal.

**Acceptance Criteria:**

**Given** seed chạy
**When** kiểm tra `process_definitions`
**Then** tồn tại definition với `key = 'deal-approval'`, `status = ACTIVE`
**And** BPMN XML có 1 UserTask với taskFormFields: `decision` (APPROVED/REJECTED), `rejectedReason`

**Given** Deal `processInstanceId` được set
**When** process complete với `decision = APPROVED`
**Then** Deal `stage` không thay đổi tự động (deal approval chỉ unblock, không tự chuyển stage)
**And** Notification được gửi cho deal `assigneeId`

**Given** Deal `processInstanceId` được set
**When** process complete với `decision = REJECTED`
**Then** Notification được gửi với `rejectedReason`

---

### Story 17.6: Backend — Permission: crm:read, crm:manage · S

Là admin, tôi muốn cấu hình quyền CRM riêng, để không phải cấp full admin cho nhân viên sales.

**Acceptance Criteria:**

**Given** permission seed chạy
**When** kiểm tra `permissions` table
**Then** tồn tại: `crm:read` (xem khách hàng, leads, deals), `crm:manage` (CRUD đầy đủ)

**Given** `GET /api/v1/crm/customers` với user không có `crm:read`
**When** request được gửi
**Then** trả `403 ForbiddenException`

**Given** `ROUTE_PERMISSION_MAP` trong `modules.config.tsx`
**When** cập nhật
**Then** `/crm/leads` → `'crm:read'`, `/crm/deals` → `'crm:read'`, `/crm/customers` → `'crm:read'`, `/crm/contacts` → `'crm:read'`

---

### Story 17.7: Frontend — modules.config + Router wiring · S

Là developer, tôi muốn module CRM được thêm vào sidebar và router, để user có thể navigate tới các trang CRM.

**Acceptance Criteria:**

**Given** `modules.config.tsx` được cập nhật
**When** user có quyền `crm:read` đăng nhập
**Then** module CRM hiển thị trong ModuleSwitcherModal với icon `ShopOutlined`, color `#DC2626`
**And** sidebar hiển thị nhóm **Pipeline** (Leads, Deals, Contacts) và **Customers**

**Given** `router.tsx` được cập nhật với lazy imports
**When** user navigate tới `/crm/leads`
**Then** LeadsPage render đúng
**And** tương tự cho `/crm/deals`, `/crm/contacts`, `/crm/customers`

**Given** user KHÔNG có quyền `crm:read`
**When** kiểm tra module switcher
**Then** module CRM không hiển thị (canAccessModule returns false)

---

### Story 17.8: Frontend — CustomersPage + ContactsPage · M

Là sales, tôi muốn xem và quản lý danh sách khách hàng và người liên hệ trên web, để tra cứu nhanh khi liên lạc.

**Acceptance Criteria:**

**Given** CustomersPage tại `/crm/customers`
**When** page load
**Then** bảng hiển thị: code, tên, ngành, số contacts, số deals (count), ngày tạo
**And** search theo tên/code
**And** click row → drawer detail hiển thị contacts + deals tóm tắt
**And** nút "Thêm khách hàng" → inline form (code, tên, ngành, website, taxCode)

**Given** ContactsPage tại `/crm/contacts`
**When** page load
**Then** bảng hiển thị: tên, email, phone, chức danh, khách hàng (linked)
**And** filter theo customerId
**And** drawer tạo/sửa contact

---

### Story 17.9: Frontend — LeadsPage · M

Là sales, tôi muốn xem và cập nhật leads trên giao diện list + kanban, để quản lý trạng thái leads hàng ngày.

**Acceptance Criteria:**

**Given** LeadsPage tại `/crm/leads`
**When** page load
**Then** view mặc định là bảng với cột: tiêu đề, nguồn, trạng thái (StatusPill), assignee, giá trị ước tính, ngày tạo
**And** filter: status (multi-select), source, assigneeId
**And** nút "Tạo Lead" → drawer với các field bắt buộc
**And** action "Chuyển thành Deal" (chỉ hiện khi status = QUALIFIED) → confirm dialog → gọi `/leads/:id/convert`

**Given** lead được convert thành Deal
**When** API trả 200
**Then** Lead row hiển thị badge "Đã chuyển" + link tới Deal
**And** status không còn có thể chỉnh sửa

---

### Story 17.10: Frontend — DealsPage (Kanban Pipeline + List) · L

Là sales/PM, tôi muốn xem deals theo dạng kanban pipeline và list, để theo dõi trạng thái và giá trị từng deal.

**Acceptance Criteria:**

**Given** DealsPage tại `/crm/deals`
**When** page load (default view: Kanban)
**Then** 4 cột hiển thị: QUALIFICATION / PROPOSAL / NEGOTIATION / WON (LOST ẩn mặc định, toggle để hiện)
**And** mỗi card hiển thị: tiêu đề, khách hàng, giá trị, assignee avatar, xác suất %
**And** kéo thả card giữa các cột → gọi `PATCH /deals/:id/stage`
**And** tổng giá trị weighted (value × probability) hiển thị dưới mỗi cột header

**Given** tab "List" được chọn
**When** hiển thị
**Then** bảng với đầy đủ cột + sort + pagination

**Given** Deal ở stage NEGOTIATION hoặc PROPOSAL
**When** user click "Mark as Won"
**Then** confirm dialog hiển thị: "Deal này sẽ tạo Project tự động. Tiếp tục?"
**And** submit → gọi `POST /deals/:id/won` → redirect tới Project mới tạo

---

### Story 17.11: Demo Seed Data — CRM · S

Là developer/demo user, tôi muốn dữ liệu mẫu CRM sẵn sàng, để demo và test không cần nhập tay.

**Acceptance Criteria:**

**Given** `npx tsx prisma/seed.ts` chạy
**When** kiểm tra DB
**Then** tồn tại: 3 Customers (VNG Corp, FPT Software, Viettel Digital), 6 Contacts (2 per customer)
**And** 5 Leads (2 NEW, 1 CONTACTED, 1 QUALIFIED, 1 CONVERTED)
**And** 4 Deals: 1 QUALIFICATION, 1 PROPOSAL, 1 NEGOTIATION, 1 WON (đã có projectId)
**And** seed idempotent (chạy lại không tạo duplicate)

---

## Epic 18: Invoicing

Finance team có thể tạo và theo dõi hóa đơn bán hàng/mua hàng, gắn với Project và Contract, quản lý trạng thái từ DRAFT đến PAID, và có thể đưa qua quy trình duyệt BPM trước khi gửi.

---

### Story 18.1: Prisma Migration — Invoice Schema · M

**Acceptance Criteria:**

**Given** migration `20261001_invoices` chạy
**When** kiểm tra PostgreSQL
**Then** bảng `invoices` và `invoice_items` tồn tại với đủ columns
**And** `invoices.code` UNIQUE
**And** `invoice_items` có `onDelete: Cascade` với Invoice
**And** `invoices.process_instance_id` TEXT nullable
**And** enums `invoice_type`, `invoice_status` tồn tại
**And** index: `idx_invoices_status`, `idx_invoices_customer_id`, `idx_invoices_project_id`

---

### Story 18.2: Backend — Invoice CRUD + Line Items · L

Là finance/admin, tôi muốn tạo và quản lý hóa đơn với các dòng mục, để theo dõi doanh thu và chi phí chính xác.

**Acceptance Criteria:**

**Given** `POST /api/v1/invoices` với `{ type, issueDate, dueDate, items[] }`
**When** tạo invoice
**Then** `status = DRAFT`
**And** `subtotal = Σ item.amount`, `totalAmount = subtotal + taxAmount`
**And** `code` được auto-generate theo pattern `INV-YYYYMM-NNNN`

**Given** `PUT /api/v1/invoices/:id` chỉnh sửa items
**When** invoice ở DRAFT
**Then** items được thay thế hoàn toàn (delete old + insert new trong transaction)
**And** totals được recalculate

**Given** invoice ở trạng thái SENT hoặc PAID
**When** cố gắng PUT để sửa items
**Then** trả `422 UnprocessableEntityException`: "Không thể sửa hóa đơn đã gửi"

**Given** `GET /api/v1/invoices` với pagination + filter
**When** filter `status`, `type`, `customerId`, `projectId`, `dateRange`
**Then** trả đúng kết quả với `PaginatedResult`

---

### Story 18.3: Backend — Invoice Status Workflow · M

Là finance, tôi muốn chuyển trạng thái hóa đơn qua các bước, và hệ thống tự đánh dấu OVERDUE khi quá hạn, để không bỏ sót hóa đơn chưa thu.

**Acceptance Criteria:**

**Given** `PATCH /api/v1/invoices/:id/status` với `{ status }`
**When** transitions hợp lệ
**Then** DRAFT → SENT, SENT → PAID, SENT → CANCELLED, DRAFT → CANCELLED được chấp nhận
**And** khi → PAID: `paidAt = now()`
**And** invalid transitions trả `422`

**Given** BullMQ cron job chạy hàng ngày lúc 8:00
**When** kiểm tra invoices
**Then** invoices có `dueDate < now()` và `status = SENT` được update `status = OVERDUE`
**And** Notification được gửi cho người tạo invoice

---

### Story 18.4: BPM Integration — Invoice Approval · S

**Acceptance Criteria:**

**Given** seed chạy
**When** kiểm tra definitions
**Then** `key = 'invoice-approval'` tồn tại, ACTIVE
**And** BPMN có UserTask với `decision` (APPROVED/REJECTED) + `rejectedReason`

**Given** `POST /api/v1/invoices/:id/submit-for-approval`
**When** invoice ở DRAFT và definition `invoice-approval` ACTIVE
**Then** ProcessInstance được tạo, `invoice.processInstanceId` được set
**And** khi process complete APPROVED → Invoice `status = SENT` (auto-send)
**And** khi REJECTED → Notification cho invoice creator với rejectedReason

---

### Story 18.5: Frontend — InvoicesPage · L

Là finance, tôi muốn xem và quản lý hóa đơn trên giao diện web, để theo dõi công nợ một cách trực quan.

**Acceptance Criteria:**

**Given** InvoicesPage tại `/invoices`
**When** page load
**Then** bảng hiển thị: code, type badge (SALES=xanh/PURCHASE=cam), khách hàng, project, tổng tiền (VND format), trạng thái, ngày phát hành, ngày đến hạn
**And** status OVERDUE hiển thị màu đỏ với icon cảnh báo
**And** filter: type, status, dateRange
**And** 4 summary cards ở top: Tổng DRAFT, Tổng SENT (chưa thu), Tổng PAID tháng này, Tổng OVERDUE

**Given** nút "Tạo hóa đơn" được click
**When** drawer mở
**Then** form: type, customerId (autocomplete), projectId (optional), issueDate, dueDate, currency
**And** section Line Items: thêm/xóa dòng (description, quantity, unitPrice, taxRate)
**And** totals hiển thị real-time khi nhập

**Given** click row invoice
**When** drawer detail mở
**Then** hiển thị line items, link tới Customer/Project, history trạng thái, nút action phù hợp trạng thái hiện tại

---

### Story 18.6: Demo Seed Data — Invoices · S

**Acceptance Criteria:**

**Given** seed chạy
**When** kiểm tra DB
**Then** tồn tại: 5 Invoices (2 SALES PAID, 1 SALES SENT, 1 SALES DRAFT, 1 PURCHASE PAID)
**And** mỗi invoice có 2–4 InvoiceItems
**And** seed idempotent

---

## Epic 19: Recruitment Module

HR team có thể quản lý toàn bộ pipeline tuyển dụng từ đăng tin → ứng viên → phỏng vấn → offer; khi ứng viên được tuyển dụng, hệ thống tự động tạo hồ sơ Employee và kick off onboarding workflow.

**Modules.config:** `recruit` · `#0EA5E9` · `gatePermission: 'employees:create'`

---

### Story 19.1: Prisma Migration — Recruitment Schema · M

**Acceptance Criteria:**

**Given** migration `20261101_recruitment` chạy
**When** kiểm tra PostgreSQL
**Then** bảng `job_openings`, `candidates`, `interviews` tồn tại
**And** `job_openings.code` UNIQUE
**And** `candidates.employee_id` UNIQUE nullable (1-1 khi hired)
**And** `interviews.interviewers` là TEXT[] (PostgreSQL array)
**And** enums `job_status`, `candidate_stage`, `interview_type`, `interview_result` tồn tại
**And** indexes: `idx_job_openings_org_status`, `idx_candidates_job_stage`, `idx_interviews_candidate_id`

---

### Story 19.2: Backend — JobOpening CRUD · M

Là HR, tôi muốn tạo và quản lý vị trí tuyển dụng, để theo dõi nhu cầu nhân sự từng bộ phận.

**Acceptance Criteria:**

**Given** `POST /api/v1/recruit/jobs` với `code`, `title`, `orgUnitId`, `level`, `headcount`
**When** tạo job
**Then** `status = OPEN`
**And** `code` unique — trả `409` nếu trùng

**Given** `PATCH /api/v1/recruit/jobs/:id/close`
**When** gọi API
**Then** `status = CLOSED`, `closedAt = now()`
**And** `GET /api/v1/recruit/jobs` filter `status=OPEN` không còn trả job này

**Given** `GET /api/v1/recruit/jobs/:id`
**When** gọi
**Then** include `_count: { candidates: true }` để hiển thị số ứng viên

---

### Story 19.3: Backend — Candidate CRUD + Stage Transitions · L

Là HR, tôi muốn quản lý ứng viên và chuyển trạng thái qua pipeline, để biết ứng viên nào đang ở bước nào.

**Acceptance Criteria:**

**Given** `POST /api/v1/recruit/candidates` với `jobOpeningId`, `name`
**When** tạo candidate
**Then** `stage = APPLIED`

**Given** `PATCH /api/v1/recruit/candidates/:id/stage` với `{ stage }`
**When** transition hợp lệ: APPLIED → SCREENING → INTERVIEW → OFFER → HIRED/REJECTED
**Then** stage được cập nhật
**And** backward transitions trả `422` (HIRED không thể chuyển về)
**And** REJECTED terminal — không thể chuyển tiếp

**Given** OFFER → REJECTED với `{ reason }`
**When** cập nhật
**Then** `notes` được append với lý do từ chối + timestamp

---

### Story 19.4: Backend — Interview CRUD + Notifications · M

Là HR, tôi muốn lên lịch phỏng vấn và hệ thống tự thông báo cho interviewer, để không ai bỏ lỡ lịch phỏng vấn.

**Acceptance Criteria:**

**Given** `POST /api/v1/recruit/interviews` với `candidateId`, `type`, `scheduledAt`, `interviewers[]`
**When** tạo interview
**Then** mỗi userId trong `interviewers[]` nhận Notification: "Bạn được mời phỏng vấn [candidate.name] vào [scheduledAt]"
**And** nếu `scheduledAt` trong quá khứ → trả `400 BadRequestException`

**Given** `PATCH /api/v1/recruit/interviews/:id/result` với `{ result, score?, notes? }`
**When** set result
**Then** interview được cập nhật
**And** nếu PASS + tất cả interviews trước đó cũng PASS → tự động gợi ý (notification) HR chuyển candidate lên stage tiếp theo

---

### Story 19.5: Backend — CV Upload via StorageModule · M

Là HR, tôi muốn upload CV ứng viên và lưu trữ an toàn, để có thể xem lại bất cứ lúc nào.

**Acceptance Criteria:**

**Given** `POST /api/v1/recruit/candidates/:id/cv` với multipart file
**When** upload
**Then** validate: MIME type phải là `application/pdf` hoặc `application/msword` hoặc `application/vnd.openxmlformats-officedocument.wordprocessingml.document`; size ≤ 10MB
**And** file lưu vào MinIO bucket `loop-hr-files` với key `cv/{candidateId}/{uuid}.{ext}`
**And** `candidate.cvStoragePath` được update

**Given** `GET /api/v1/recruit/candidates/:id/cv-url`
**When** gọi
**Then** presigned GET URL (TTL 1h) được trả về

---

### Story 19.6: Backend — Candidate HIRED → Employee Creation · L

Là HR, tôi muốn khi ứng viên được nhận vào, hệ thống tự tạo hồ sơ nhân viên, để không cần nhập lại thông tin từ đầu.

**Acceptance Criteria:**

**Given** `POST /api/v1/recruit/candidates/:id/hire` với `{ employeeCode, startDate, ratePerDay, orgUnitId }`
**When** candidate ở stage OFFER
**Then** trong Prisma transaction:
  - `PersonnelService.createEmployee({ name: candidate.name, email: candidate.email, level: jobOpening.level, orgUnitId, ... })` được gọi
  - Employee và EmployeeRate được tạo
  - `candidate.employeeId` set, `candidate.stage = HIRED`
  - Process `employee-onboarding` tự động start nếu definition ACTIVE
**And** nếu `employeeCode` đã tồn tại → trả `409`
**And** nếu candidate không phải OFFER → trả `422`

---

### Story 19.7: BPM Integration — Hiring Approval Process · S

**Acceptance Criteria:**

**Given** seed chạy
**When** kiểm tra definitions
**Then** `key = 'hiring-approval'` tồn tại, ACTIVE
**And** BPMN có UserTask với `decision` (APPROVED/REJECTED), `offerSalary`, `startDate`

**Given** `POST /api/v1/recruit/candidates/:id/submit-offer`
**When** candidate ở INTERVIEW và definition ACTIVE
**Then** ProcessInstance được tạo
**And** khi APPROVED → `candidate.stage = OFFER`, Notification cho candidate assignee
**And** khi REJECTED → Notification với rejectedReason

---

### Story 19.8: Frontend — modules.config + Router + JobsPage · M

**Acceptance Criteria:**

**Given** modules.config.tsx cập nhật
**When** user có quyền `employees:create`
**Then** module "Recruitment" hiển thị với icon `SolutionOutlined`, color `#0EA5E9`
**And** routes `/recruit/jobs`, `/recruit/candidates`, `/recruit/interviews`, `/recruit/pipeline` được lazy load

**Given** JobsPage tại `/recruit/jobs`
**When** page load
**Then** bảng: code, tiêu đề, bộ phận, level, headcount, số ứng viên (count), status badge
**And** filter: status, orgUnitId, level
**And** drawer tạo/sửa job với đầy đủ field

---

### Story 19.9: Frontend — CandidatesPage + RecruitPipelinePage · L

Là HR, tôi muốn xem ứng viên theo dạng list và kanban pipeline, để nắm nhanh tình trạng tuyển dụng.

**Acceptance Criteria:**

**Given** CandidatesPage tại `/recruit/candidates`
**When** page load
**Then** bảng: tên, email, vị trí apply, stage badge, assignee, ngày nộp
**And** filter theo jobOpeningId, stage
**And** drawer detail: thông tin ứng viên, link CV (download), interviews list, action buttons theo stage

**Given** RecruitPipelinePage tại `/recruit/pipeline`
**When** page load
**Then** kanban 6 cột: APPLIED / SCREENING / INTERVIEW / OFFER / HIRED / REJECTED
**And** card hiển thị: tên ứng viên, vị trí, ngày ở stage hiện tại
**And** kéo thả card → stage transition với confirm nếu backward

---

### Story 19.10: Frontend — InterviewsPage · M

**Acceptance Criteria:**

**Given** InterviewsPage tại `/recruit/interviews`
**When** page load
**Then** bảng: ứng viên, vị trí, type badge, lịch phỏng vấn, interviewers (avatars), result badge
**And** filter: type, result, dateRange
**And** nút "Lên lịch phỏng vấn" → drawer: chọn candidate, type, scheduledAt, interviewers (multi-select users), location/meetingUrl
**And** sau khi lưu: interviewers nhận notification real-time (refetch)

---

### Story 19.11: Demo Seed Data — Recruitment · S

**Acceptance Criteria:**

**Given** seed chạy
**When** kiểm tra DB
**Then** 2 JobOpenings (1 OPEN Backend Senior, 1 OPEN Frontend Mid)
**And** 8 Candidates (spread across stages: 2 APPLIED, 2 SCREENING, 2 INTERVIEW, 1 OFFER, 1 HIRED)
**And** 4 Interviews (mix PASS/FAIL/PENDING results)
**And** seed idempotent

---

## Epic 20: Accounting

Finance team có thể xem journal entries (tự động từ Invoice/Expense/Payroll và manual), quản lý chart of accounts, và xem trial balance để đối chiếu sổ sách — phù hợp chuẩn VN TT200.

---

### Story 20.1: Prisma Migration + Chart of Accounts Seed · L

**Acceptance Criteria:**

**Given** migration `20261201_accounting` chạy
**When** kiểm tra PostgreSQL
**Then** bảng `chart_of_accounts`, `journal_entries`, `journal_lines` tồn tại
**And** `chart_of_accounts.code` UNIQUE
**And** `journal_lines` có FK tới cả `journal_entries` (cascade) và `chart_of_accounts`
**And** index: `idx_journal_entries_date`, `idx_journal_lines_account_code`

**Given** seed chạy
**When** kiểm tra `chart_of_accounts`
**Then** tồn tại ~50 accounts chuẩn VN TT200 gồm:
  - 1111 Tiền mặt (ASSET), 1121 Tiền gửi NH (ASSET)
  - 131 Phải thu KH (ASSET), 331 Phải trả NCC (LIABILITY)
  - 334 Phải trả NV (LIABILITY)
  - 511 Doanh thu (REVENUE), 5111 Doanh thu dịch vụ (REVENUE)
  - 641 Chi phí bán hàng (EXPENSE), 642 CPQLDN (EXPENSE), 622 Lương NV (EXPENSE)
  - ...và các account phổ biến khác
**And** accounts có cấu trúc parentCode (cha-con)

---

### Story 20.2: Backend — Journal Entry CRUD + Validation · M

Là kế toán, tôi muốn tạo bút toán thủ công và hệ thống validate cân bằng DR/CR, để đảm bảo sổ sách luôn cân bằng.

**Acceptance Criteria:**

**Given** `POST /api/v1/accounting/journal` với `{ date, description, lines[] }`
**When** `Σ lines.debit ≠ Σ lines.credit`
**Then** trả `400 BadRequestException`: "Bút toán không cân bằng: DR=X, CR=Y"

**Given** bút toán cân bằng (DR = CR)
**When** POST
**Then** JournalEntry và JournalLines được tạo trong transaction
**And** nếu bất kỳ `accountCode` không tồn tại trong ChartOfAccount → trả `404`
**And** nếu account `isActive = false` → trả `422`

**Given** `GET /api/v1/accounting/journal` với pagination
**When** filter `dateFrom`, `dateTo`, `accountCode`
**Then** trả PaginatedResult với `include: { lines: { include: { account: true } } }`

---

### Story 20.3: Backend — FinanceEventBus + Auto Journal · XL

Là hệ thống, tôi muốn tự động tạo bút toán kế toán khi Invoice/Expense/Payroll thay đổi trạng thái, để kế toán không cần nhập tay từ các module khác.

**Acceptance Criteria:**

**Given** `FinanceEventBus` được tạo (cùng pattern `ProcessEventBus` — dùng `node:events`)
**When** Invoice `status → PAID`
**Then** Auto JournalEntry được tạo:
  - DR 1121 (Tiền gửi NH) = `invoice.totalAmount` (SALES)
  - CR 5111 (Doanh thu) = `invoice.totalAmount`
  - reference: `invoice.code`, referenceId: `invoice.id`

**Given** Expense `status → APPROVED`
**When** event fired
**Then** Auto JournalEntry:
  - DR account chi phí theo `expense.category` (mapping cấu hình: TRAVEL→641, OFFICE→642, etc.)
  - CR 331 (Phải trả NCC) = `expense.totalAmount`

**Given** PayrollPeriod `status → APPROVED`
**When** event fired
**Then** Auto JournalEntry:
  - DR 622 (Lương nhân viên) = Σ `payrollRecord.netSalary`
  - CR 334 (Phải trả nhân viên) = Σ net salary

**Given** auto journal được tạo
**When** kiểm tra entry
**Then** `reference` chứa code, `referenceId` chứa ID entity nguồn
**And** entry không thể DELETE hoặc PUT (auto-generated entries là immutable)

---

### Story 20.4: Backend — Trial Balance API · M

Là kế toán, tôi muốn xem trial balance theo kỳ, để đối chiếu sổ sách cuối tháng/quý.

**Acceptance Criteria:**

**Given** `GET /api/v1/accounting/trial-balance?from=2026-01-01&to=2026-03-31`
**When** gọi API
**Then** trả danh sách accounts với: `code`, `name`, `type`, `totalDebit`, `totalCredit`, `balance` (debit - credit)
**And** chỉ trả accounts có ít nhất 1 journal line trong kỳ
**And** footer summary: `grandTotalDebit`, `grandTotalCredit` — phải bằng nhau nếu accounting đúng

---

### Story 20.5: Frontend — ChartOfAccountsPage · M

**Acceptance Criteria:**

**Given** `/accounting/accounts`
**When** page load
**Then** bảng hiển thị theo cấu trúc cây (parentCode): code, tên, type badge, isActive toggle
**And** Admin có thể thêm account mới (không thể sửa code sau khi tạo)
**And** Account đã có JournalLines → không thể deactivate (hiển thị tooltip lý do)

---

### Story 20.6: Frontend — JournalPage · M

**Acceptance Criteria:**

**Given** `/accounting/journal`
**When** page load
**Then** bảng: ngày, mô tả, reference, số dòng, DR tổng, CR tổng
**And** expand row → hiển thị từng JournalLine (accountCode, tên account, debit, credit)
**And** filter: dateRange, accountCode, reference
**And** badge phân biệt "Auto" (từ system) vs "Manual" (từ user)
**And** nút "Tạo bút toán" → form với dynamic line items, real-time DR/CR sum display

---

### Story 20.7: Frontend — Trial Balance View · M

**Acceptance Criteria:**

**Given** tab "Trial Balance" trong finance module (hoặc page riêng `/accounting/trial-balance`)
**When** page load với period selector (từ / đến)
**Then** bảng hiển thị accounts + DR + CR + Balance
**And** type grouping: ASSET / LIABILITY / EQUITY / REVENUE / EXPENSE
**And** footer row: Total với DR = CR validation (màu đỏ nếu không cân bằng)
**And** export Excel button

---

## Epic 21: Asset Management

Admin và HR có thể quản lý toàn bộ tài sản công ty — từ nhập kho, cấp phát cho nhân viên, đến lịch bảo trì — để biết chính xác ai đang giữ tài sản gì và tình trạng thiết bị.

**Modules.config:** `asset` · `#B45309` · `gatePermission: 'admin:org'`

---

### Story 21.1: Prisma Migration — Asset Schema · M

**Acceptance Criteria:**

**Given** migration `20270101_assets` chạy
**When** kiểm tra PostgreSQL
**Then** bảng `assets`, `asset_assignments`, `asset_maintenance` tồn tại
**And** `assets.code` UNIQUE
**And** enums `asset_category`, `asset_status` tồn tại
**And** indexes: `idx_assets_org_status`, `idx_asset_assignments_asset_id`, `idx_asset_assignments_employee_id`

---

### Story 21.2: Backend — Asset CRUD · M

**Acceptance Criteria:**

**Given** `POST /api/v1/assets` với `code`, `name`, `category`, `orgUnitId`
**When** tạo asset
**Then** `status = AVAILABLE`
**And** code unique — trả `409` nếu trùng

**Given** `GET /api/v1/assets` với filter `category`, `status`, `orgUnitId`
**When** gọi
**Then** trả PaginatedResult với current assignment info (tên nhân viên đang giữ nếu ASSIGNED)

---

### Story 21.3: Backend — Assignment Flow · M

Là admin, tôi muốn cấp phát và thu hồi tài sản, để biết tài sản đang ở đâu bất cứ lúc nào.

**Acceptance Criteria:**

**Given** `POST /api/v1/assets/:id/assign` với `{ employeeId }`
**When** asset `status = AVAILABLE`
**Then** AssetAssignment được tạo, `asset.status = ASSIGNED`
**And** nếu asset không AVAILABLE → trả `422`
**And** employee không tồn tại → trả `404`

**Given** `PATCH /api/v1/assets/:id/return` với `{ notes? }`
**When** asset ASSIGNED
**Then** active AssetAssignment `returnedAt = now()`, `asset.status = AVAILABLE`
**And** `GET /api/v1/assets/:id/assignments` trả lịch sử tất cả assignments (bao gồm đã trả)

---

### Story 21.4: Backend — Maintenance Log + Depreciation · M

**Acceptance Criteria:**

**Given** `POST /api/v1/assets/:id/maintenance` với `{ type, performedAt, cost?, performedBy?, notes }`
**When** tạo log
**Then** AssetMaintenance được tạo
**And** `asset.status = UNDER_MAINTENANCE` khi `type = "repair"` và `returnedAt = null` trong AssetAssignment

**Given** `GET /api/v1/assets/:id/depreciation`
**When** asset có `purchasePrice` và `depreciationYears`
**Then** trả: `annualDepreciation`, `accumulatedDepreciation` (theo năm hiện tại), `bookValue` (purchasePrice - accumulated)
**And** nếu thiếu purchasePrice hoặc depreciationYears → trả `{ error: 'Insufficient data' }`

---

### Story 21.5: Frontend — modules.config + Router · S

**Acceptance Criteria:**

**Given** modules.config.tsx cập nhật
**When** user có quyền `admin:org`
**Then** module "Assets" hiển thị với icon `LaptopOutlined`, color `#B45309`
**And** routes `/assets`, `/assets/assignments`, `/assets/maintenance` lazy loaded

---

### Story 21.6: Frontend — AssetsPage · M

**Acceptance Criteria:**

**Given** `/assets`
**When** page load
**Then** bảng: code, tên, category badge, brand/model, serial, status badge, nhân viên đang giữ (nếu ASSIGNED), ngày mua, giá mua
**And** filter: category, status, orgUnitId
**And** drawer tạo/sửa asset với đầy đủ field
**And** action "Cấp phát" (khi AVAILABLE) → modal chọn nhân viên
**And** action "Thu hồi" (khi ASSIGNED) → confirm dialog

---

### Story 21.7: Frontend — AssignmentsPage + MaintenancePage · M

**Acceptance Criteria:**

**Given** `/assets/assignments`
**When** page load
**Then** bảng: tài sản, nhân viên, ngày cấp phát, ngày trả (null nếu đang giữ), trạng thái
**And** filter: employeeId, assetId, status (active/returned)

**Given** `/assets/maintenance`
**When** page load
**Then** bảng: tài sản, type, ngày thực hiện, chi phí, người thực hiện, ghi chú
**And** nút "Log bảo trì" → drawer tạo maintenance record
**And** filter: assetId, type, dateRange

---

### Story 21.8: Demo Seed Data — Assets · S

**Acceptance Criteria:**

**Given** seed chạy
**When** kiểm tra DB
**Then** 10 Assets (3 LAPTOP, 2 PHONE, 2 DESKTOP, 1 SERVER, 1 PERIPHERAL, 1 SOFTWARE)
**And** 5 AssetAssignments (3 active ASSIGNED, 2 đã RETURNED)
**And** 3 AssetMaintenance logs
**And** seed idempotent

---

### Story 21.9: Asset Reports — Summary Cards · S

**Acceptance Criteria:**

**Given** AssetsPage header
**When** load
**Then** 4 summary cards: Tổng tài sản, Đang cấp phát, Đang bảo trì, Tổng giá trị mua
**And** chart nhỏ (Pie): phân bổ theo category

---

## Epic 22: HR Extensions — Training & Performance

HR và manager có thể theo dõi chương trình đào tạo của nhân viên và thực hiện đánh giá hiệu suất định kỳ qua quy trình BPM, để có cơ sở rõ ràng cho quyết định thăng tiến và tăng lương.

---

### Story 22.1: Prisma Migration — HR Extensions Schema · M

**Acceptance Criteria:**

**Given** migration `20270201_hr_extensions` chạy
**When** kiểm tra PostgreSQL
**Then** bảng `training_programs`, `training_records`, `performance_reviews` tồn tại
**And** `performance_reviews` có `@@unique([employeeId, period])` — 1 review per employee per period
**And** `performance_reviews.process_instance_id` TEXT nullable
**And** enums `training_status`, `review_status` tồn tại

---

### Story 22.2: Backend — Training Program + Record CRUD · M

Là HR, tôi muốn quản lý chương trình đào tạo và hồ sơ tham gia, để biết nhân viên nào đã học gì và kết quả ra sao.

**Acceptance Criteria:**

**Given** `POST /api/v1/hr/training/programs` với `title`, `type`, `durationHours`
**When** tạo program
**Then** program được tạo

**Given** `POST /api/v1/hr/training/records` với `programId`, `employeeId`, `startDate`
**When** tạo record
**Then** `status = SCHEDULED`

**Given** `PATCH /api/v1/hr/training/records/:id/status` với `{ status, score?, certificatePath? }`
**When** SCHEDULED → IN_PROGRESS → COMPLETED
**Then** trạng thái được cập nhật
**And** COMPLETED yêu cầu `score` (0–100) — nếu thiếu → trả `400`

**Given** `GET /api/v1/hr/training/records?employeeId=xxx`
**When** gọi
**Then** trả training history của nhân viên đó với program info

---

### Story 22.3: Backend — Certificate Upload · S

**Acceptance Criteria:**

**Given** `POST /api/v1/hr/training/records/:id/certificate` với PDF file
**When** upload
**Then** validate: MIME = PDF, size ≤ 5MB
**And** lưu vào `loop-hr-files` bucket với key `training/{recordId}/cert.pdf`
**And** `record.certificatePath` updated

**Given** `GET /api/v1/hr/training/records/:id/certificate-url`
**When** gọi
**Then** presigned URL (TTL 1h) được trả

---

### Story 22.4: Backend — Performance Review CRUD + BPM · L

Là manager, tôi muốn tạo và submit đánh giá hiệu suất nhân viên qua quy trình duyệt, để đảm bảo tính khách quan và minh bạch.

**Acceptance Criteria:**

**Given** `POST /api/v1/hr/performance/reviews` với `employeeId`, `reviewerId`, `period`, `score`, `strengths`, `improvements`, `goals`
**When** tạo review
**Then** `status = DRAFT`
**And** nếu đã có review cho `(employeeId, period)` → trả `409`

**Given** `PATCH /api/v1/hr/performance/reviews/:id/submit`
**When** review ở DRAFT
**Then** `status = SUBMITTED`, `submittedAt = now()`
**And** nếu definition `performance-approval` ACTIVE → ProcessInstance được tạo, `review.processInstanceId` set
**And** khi process APPROVED → `status = APPROVED`, `approvedAt = now()`, Notification cho reviewerId
**And** khi process REJECTED → status quay về DRAFT, Notification với rejectedReason

**Given** seed chạy
**When** kiểm tra definitions
**Then** `key = 'performance-approval'` tồn tại, ACTIVE
**And** BPMN có UserTask với `decision`, `finalScore` (có thể điều chỉnh), `comment`

---

### Story 22.5: Frontend — TrainingPage · M

**Acceptance Criteria:**

**Given** `/hr/training`
**When** page load
**Then** 2 tabs: "Chương trình" (programs list) và "Hồ sơ đào tạo" (records list)
**And** Programs tab: bảng programs với tên, type, duration, số người đã hoàn thành
**And** Records tab: bảng records với nhân viên, chương trình, status badge, điểm, ngày bắt đầu/kết thúc
**And** filter records theo employeeId, programId, status
**And** drawer tạo training record + upload certificate khi COMPLETED

---

### Story 22.6: Frontend — PerformancePage · M

**Acceptance Criteria:**

**Given** `/hr/performance`
**When** page load
**Then** bảng: nhân viên, period (e.g. "2026-H1"), reviewer, score (1–5 stars), status badge, ngày submit
**And** filter: period, employeeId, reviewerId, status
**And** drawer tạo review với form: chọn nhân viên + period, score slider (1–5), textarea strengths/improvements/goals
**And** action "Submit để duyệt" chỉ hiện khi status = DRAFT
**And** status IN_PROCESS (đang duyệt) hiển thị link "Xem quy trình" → BPM process monitor

---

### Story 22.7: Demo Seed Data — HR Extensions · S

**Acceptance Criteria:**

**Given** seed chạy
**When** kiểm tra DB
**Then** 2 TrainingPrograms (1 internal "NestJS Advanced", 1 external "AWS Solutions Architect")
**And** 6 TrainingRecords (mix SCHEDULED/IN_PROGRESS/COMPLETED)
**And** 5 PerformanceReviews period "2026-H1" (2 DRAFT, 2 SUBMITTED, 1 APPROVED)
**And** seed idempotent

---

## Epic 23: Phase 3 Reports & Analytics

Leadership và management có thể xem analytics tổng hợp cho CRM, Recruitment, và Assets ngay trong module Reports hiện tại, để có cái nhìn toàn diện về hiệu quả kinh doanh và vận hành.

---

### Story 23.1: Backend — CRM Stats API · M

**Acceptance Criteria:**

**Given** `GET /api/v1/reports/crm-stats`
**When** gọi
**Then** trả:
  - `pipeline`: count + totalValue per DealStage
  - `monthlyDealValue`: 6 tháng gần nhất — `{ month, wonValue, lostValue }`
  - `winRate`: tỷ lệ WON / (WON + LOST) trong 90 ngày
  - `topAssignees`: top 5 sales theo deal value WON
  - `leadConversionRate`: CONVERTED / total leads

---

### Story 23.2: Backend — Recruitment Stats API · M

**Acceptance Criteria:**

**Given** `GET /api/v1/reports/recruit-stats`
**When** gọi
**Then** trả:
  - `funnel`: count per CandidateStage (tất cả active jobs)
  - `timeToHire`: avg ngày từ APPLIED → HIRED (trong 90 ngày)
  - `openPositions`: tổng headcount cần tuyển còn thiếu (headcount - hired count per job)
  - `byDepartment`: `{ orgUnitName, openCount, hiredCount }[]`

---

### Story 23.3: Backend — Asset Stats API · S

**Acceptance Criteria:**

**Given** `GET /api/v1/reports/asset-stats`
**When** gọi
**Then** trả:
  - `byCategory`: count + totalValue per AssetCategory
  - `byStatus`: count per AssetStatus
  - `totalBookValue`: Σ bookValue tất cả active assets (sau khấu hao)
  - `maintenanceCostLast12m`: tổng chi phí bảo trì 12 tháng

---

### Story 23.4: Frontend — CRM Tab trong ReportsPage · M

**Acceptance Criteria:**

**Given** tab "CRM" được thêm vào ReportsPage
**When** user có quyền `crm:read` click tab
**Then** hiển thị:
  - 3 SparklineCards: Tổng deals active, Tổng giá trị pipeline, Win Rate %
  - Funnel chart theo DealStage (horizontal bar)
  - Line chart: Deal value WON vs LOST theo tháng (6 tháng)
  - Table: Top 5 sales với deal count + total value

---

### Story 23.5: Frontend — Recruitment Tab trong ReportsPage · M

**Acceptance Criteria:**

**Given** tab "Recruitment" được thêm vào ReportsPage
**When** user có quyền `employees:create` click tab
**Then** hiển thị:
  - 3 SparklineCards: Vị trí đang mở, Tổng ứng viên, Avg time-to-hire (ngày)
  - Funnel chart: Candidate pipeline theo stage
  - Bar chart: Hired vs Target headcount theo bộ phận

---

### Story 23.6: Frontend — Asset Tab trong ReportsPage · S

**Acceptance Criteria:**

**Given** tab "Assets" được thêm vào ReportsPage (chỉ hiển thị khi user có quyền `admin:org`)
**When** click tab
**Then** hiển thị:
  - 3 SparklineCards: Tổng tài sản, Tổng nguyên giá, Tổng giá trị còn lại (book value)
  - Pie chart: Phân bổ theo AssetCategory (count)
  - Bar chart: Top 5 category theo tổng nguyên giá

---

## Tóm tắt WBS

| Epic | Tên | Stories | Est. Days | Phase |
|---|---|---|---|---|
| 17 | CRM Module | 11 | 18 | 3A |
| 18 | Invoicing | 6 | 9 | 3A |
| 19 | Recruitment | 11 | 17 | 3B |
| 20 | Accounting | 7 | 12 | 3B |
| 21 | Asset Management | 9 | 12 | 3C |
| 22 | HR Extensions | 7 | 11 | 3C |
| 23 | Phase 3 Reports | 6 | 8 | 3C |
| **Total** | | **57** | **~87** | |

---

## Dependencies

```
Epic 17 (CRM)      → cần Project model đã có ✅ (Phase 1)
Epic 18 (Invoice)  → cần Customer từ Epic 17 (nếu dùng customerId)
Epic 19 (Recruit)  → cần Employee/PersonnelService ✅ + StorageModule ✅
Epic 20 (Account)  → cần Invoice từ Epic 18 + Expense ✅ + Payroll ✅
Epic 21 (Asset)    → cần Employee ✅ + OrgUnit ✅ — độc lập nhất
Epic 22 (HR+)      → cần Employee ✅ + BPM ✅ + StorageModule ✅
Epic 23 (Reports)  → cần Epic 17 + 19 + 21 hoàn thành
```

---

## Constraints & Architecture Notes

- **Không tạo package mới**: Dùng `node:events` cho `FinanceEventBus` (cùng pattern `ProcessEventBus`)
- **Cross-domain**: Mọi service call qua interface method, không Prisma join cross-domain
- **MinIO bucket mới**: `loop-hr-files` (CV, certificate) — add vào `minio-init` Docker Compose
- **Chart of Accounts seed**: Phải run trước khi bất kỳ auto-journal nào được tạo — order trong `seed.ts`: CoA → Invoice/Expense/Payroll data
- **Color hardcode trong seed**: Dùng `#DC2626` cho CRM module trong seed config tương ứng nếu có
- **gatePermission mới**: `crm:read`, `crm:manage` cần được seed vào `permissions` table và RBAC system (Epic 15)
