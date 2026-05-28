---
stepsCompleted: [1, 2, 3, 4]
status: complete
completedAt: '2026-05-25'
inputDocuments:
  - "prds/prd-Loop-2026-05-25/prd.md"
  - "architecture.md"
  - "ux-design-specification.md"
amendments:
  - date: '2026-05-26'
    description: 'Epic 12 — BPM Module (BPMN 2.0 Engine, 8 stories)'
  - date: '2026-05-26'
    description: 'Epic 13 — Bug & Issue Tracking (MinIO attachments, severity, My Bugs, dashboard, 9 stories)'
  - date: '2026-05-27'
    description: 'Epic 14 — Issue Register (triển khai dự án: Bug/CR, CR approval, audit log, dashboard, export, 11 stories)'
  - date: '2026-05-27'
    description: 'Epic 15 — Authorization & Permission Management (Dual-Track RBAC: system roles + ERP module roles + org-scope, 9 stories)'
  - date: '2026-05-27'
    description: 'Epic 16 — UI/UX Polish & Finance Module (table header, sparkline sync, status pill, sign-out UX, change password, format số, search bar, quick BPM, Finance module, admin settings refactor, việt hóa — 20 stories)'
  - date: '2026-05-28'
    description: 'Epic 22 — Payroll Compliance: Thuế TNCN & BHXH/BHYT/BHTN (13 stories, configurable-first, biểu thuế 5 bậc 2026, YTD tracking)'
---

# Loop - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Loop, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-001: Admin CRUD các đơn vị tổ chức dạng cây cha–con (tên, mã, đơn vị cha); không giới hạn số cấp
FR-002: Admin gán mỗi người dùng vào một org unit + một role; thay đổi không ảnh hưởng lịch sử dữ liệu
FR-003: PM gán dự án vào org unit khi tạo; Admin có thể reassign sau đó
FR-101: Admin CRUD hồ sơ nhân sự (mã, họ tên, ngày sinh, tech stack, level Junior/Mid/Senior/Expert, CCCD, ngày/nơi cấp, lịch sử dự án read-only)
FR-102: Rate history append-only (ngày hiệu lực, giá trị man-day); gắn với level; override được per person; không xóa/sửa record cũ
FR-201: PM CRUD danh sách dự án (mã, tên, loại OSDC/Pkg, khách hàng, ngân sách VND/USD, effort ngân sách man-month, ngày bắt đầu/kết thúc, trạng thái Planning/Active/On Hold/Closed)
FR-202: PM load nhân sự vào dự án (role, level, % allocation, ngày vào/ra, rate man-day); hệ thống validate tổng allocation ≤ 100% trên từng ngày làm việc (Mon–Fri) trong khoảng thời gian chồng nhau; cảnh báo kèm ngày + dự án xung đột; yêu cầu PM xác nhận trước khi lưu override
FR-301: Task phân cấp tối đa 5 level; mỗi task có: tiêu đề, mô tả, người thực hiện, deadline, trạng thái (To Do/In Progress/Done/Chờ duyệt/Trả lại/Đã huỷ), estimate effort (MH, tối đa theo cấu hình), effort thực tế (MH), task cha
FR-302: PM tạo task → To Do ngay; Member tạo task → Chờ duyệt → PM: Duyệt (→ To Do) / Trả lại kèm lý do (→ Trả lại, Member sửa được) / Huỷ (→ Đã huỷ, không sửa được); thông báo hai chiều
FR-303: Task lá: Member/PM cập nhật % trực tiếp (0–100%); task cha: trung bình có trọng số theo estimate của task con trực tiếp; roll-up từ level thấp nhất đến root; tiến độ dự án = trung bình có trọng số tất cả task root
FR-401: Chi phí thực tế = Σ (effort thực tế × rate man-day tương ứng giai đoạn); 1 MD = 8 MH; 1 MM = 21 MD; dùng rate đúng giai đoạn theo lịch sử
FR-402: Hiển thị chi phí thực tế / ngân sách (%) và effort thực tế (MD) / effort ngân sách (MD, quy từ MM × 21)
FR-403: Chỉ theo dõi chi phí thực tế; không forecast trong v1
FR-501: Cấu hình 5 ngưỡng cảnh báo độc lập (ngày sắp đến hạn task: mặc định 3, ngày sắp hết dự án: 7, ngưỡng ngân sách %: 80%, ngưỡng effort %: 80%, giới hạn estimate task: 4h)
FR-502: Cảnh báo Task: quá hạn (deadline qua, chưa Done); đến hạn hôm nay; sắp đến hạn (N ngày cấu hình được) → gửi cho PM + Member được giao
FR-503: Cảnh báo Nguồn lực: overload allocation khi load vào dự án mới; sắp hết dự án (N ngày); effort vượt ngân sách; effort sắp chạm ngân sách (X%)
FR-504: Cảnh báo Ngân sách: vượt ngân sách tiền; sắp chạm ngân sách (X%)
FR-505: Kênh thông báo: in-app (web + mobile); push notification mobile (FCM); email (Nodemailer + SMTP)
FR-601: Dashboard Lãnh đạo: số dự án theo trạng thái; dự án over/near budget; nhân sự free; nhân sự < 100% allocation; nhân sự sắp hết dự án; tổng effort tiêu / ngân sách
FR-602: Dashboard Dự án (PM): tiến độ tổng thể; chi phí vs ngân sách; effort vs ngân sách; cảnh báo active; danh sách nhân sự + allocation + ngày hết hạn
FR-603: Cấu hình tham số báo cáo (4 báo cáo với tham số riêng: khoảng thời gian, dự án, nhân sự...); export Excel (.xlsx)
FR-BUG01: Bất kỳ user nào (mọi role) đều có thể tạo bug; bắt buộc chọn project + ≥1 task + title + severity; mô tả và ảnh đính kèm là optional
FR-BUG02: Bug lifecycle: Open → In Progress → Resolved → Closed; có thể chuyển sang Cancelled từ bất kỳ trạng thái nào (trừ Closed)
FR-BUG03: Bug thuộc 1 project; có thể linked tới 1 hoặc nhiều task trong cùng project đó
FR-BUG04: Severity 4 cấp: Critical / High / Medium / Low; có thể thay đổi sau khi tạo
FR-BUG05: Đính kèm ảnh vào bug — tối đa 5 file, mỗi file ≤ 10MB, chỉ nhận image/*; xem/download inline trong detail; lưu trên MinIO (self-hosted S3)
FR-BUG06: "My Bugs" — danh sách bug có assignee = user hiện tại; filter theo severity và status; nhóm theo severity
FR-BUG07: Global Bug Management — bảng tất cả bug trong phạm vi org, filter theo project/severity/status/assignee/reporter/date range; badge count per severity ở header
FR-BUG08: Bug Dashboard — thống kê: bug theo status (per project), bug theo severity (donut chart), top project nhiều bug nhất, top task nhiều bug nhất, trend tạo mới vs resolved 30 ngày
FR-BUG09: Notification khi: (1) bug được assign → notify assignee; (2) bug chuyển Resolved/Closed/Cancelled → notify reporter; (3) bug Critical tạo mới → notify PM của project; (4) bug Critical tạo mới → push Telegram channel (tận dụng Epic 11 infra)
FR-IR01: Tạo issue với type (BUG/CR), title, requesterName (text tự do — tên KH bên ngoài), projectId, description?, priority (mặc định MEDIUM), dueDate?, estimatedHours?, affectedModule?, assigneeId (user hệ thống)?, taskIds[]?, tags[]; recordedAt tự động = server time; CR tạo ra với status PENDING_REVIEW, BUG với status OPEN
FR-IR02: Danh sách issues filter theo: type, status (multi), priority (multi), projectId, assigneeId, reporterId, requesterName (contains), dateRange (recordedAt), overdue toggle, tags[]; phân trang + sort; scoped theo orgUnitIds; badge count BUG đang mở / CR chờ duyệt ở header
FR-IR03: My Issues — issues có assigneeId = currentUser; filter type/status/priority; nhóm theo priority (CRITICAL trước)
FR-IR04: Issue Detail đầy đủ: thông tin chính, timeline (recordedAt/dueDate/estimatedHours/resolvedAt/closedAt/cycle time), assignee/reporter, CR approval info, tags, task liên quan, attachments, comment thread, audit log
FR-IR05: Cập nhật issue: title, description, priority, dueDate, estimatedHours, affectedModule, assigneeId, taskIds, tags, resolutionNote; mỗi thay đổi ghi IssueAuditLog
FR-IR06: Status transitions BUG: OPEN→PENDING→IN_PROGRESS→RESOLVED→CLOSED; CANCELLED từ bất kỳ trạng thái nào trừ CLOSED; transitions không hợp lệ trả HTTP 422
FR-IR07: Status transitions CR: OPEN→PENDING_REVIEW→APPROVED/REJECTED→IN_PROGRESS→RESOLVED→CLOSED; chỉ PM của project mới gọi được /approve; non-PM trả 403
FR-IR08: Comments: mọi user có quyền xem issue đều comment được; author edit/delete comment của mình
FR-IR09: File đính kèm: tối đa 10 file/issue, ≤20MB/file, chấp nhận image/*, pdf, doc/docx, txt; lưu MinIO bucket "issues"; preview inline ảnh; download PDF/doc
FR-IR10: Tags tự do (text), autocomplete gợi ý tag đã dùng trong project, filter theo tag
FR-IR11: Link issue → task(s) trong cùng project; hiển thị task title + status; link sang task detail
FR-IR12: Khi task được link với issue và task chuyển DONE → tạo notification gợi ý PM/assignee xem xét resolve issue (không tự đổi status issue)
FR-IR13: isOverdue = true khi dueDate < now() và status NOT IN [RESOLVED, CLOSED, CANCELLED, REJECTED]; badge đỏ "Quá hạn" trên row; daily cron 8:00 sáng gửi overdue alert cho assignee + PM
FR-IR14: Issue Dashboard /issues/dashboard — 6 card: (1) donut trạng thái, (2) BUG vs CR split, (3) priority bar chart, (4) CR chờ duyệt table (PM/Admin only), (5) top project, (6) trend 30 ngày; filter projectId + dateRange
FR-IR15: Stats API GET /api/v1/issues/stats — trả byStatus, byType, byPriority, pendingCRs[], topProjects[], trend30Days[], overdueCount, avgCycleTimeHours
FR-IR16: Notifications: (1) CR mới → notify PM; (2) assign → notify assignee; (3) CR APPROVED/REJECTED → notify reporter; (4) RESOLVED/CLOSED → notify reporter; (5) CRITICAL → notify PM; (6) CRITICAL → Telegram; (7) overdue daily cron → notify assignee+PM; Tab "Issues" bổ sung vào NotificationBell
FR-IR17: Export Excel/CSV: GET /api/v1/issues/export?format=xlsx|csv&...; 20 columns; stream response; tên file issues-[project]-[date].xlsx; ≤10.000 rows

### NonFunctional Requirements

NFR-01: Nền tảng Web (browser) + Mobile (iOS + Android); Mobile ưu tiên Member (task updates) và PM (cảnh báo); không cần offline mode
NFR-02: Phân quyền theo Org Tree — hierarchical visibility; CCCD chỉ Admin; Rate/lịch sử rate: Admin (toàn hệ), PM (đơn vị mình), Leadership (phạm vi đơn vị); Chi phí: Admin, PM (dự án mình), Leadership (phạm vi)
NFR-03: Toàn vẹn Allocation — tổng không vượt 100% trên bất kỳ ngày làm việc nào (bỏ T7/CN) khi thời gian chồng nhau; validation tại save; hiển thị ngày + dự án xung đột
NFR-04: Lịch sử & Audit — rate history append-only (chỉ INSERT, không UPDATE/DELETE); chi phí tính lại theo lịch sử khi cần

### Additional Requirements

ARCH-001: Turborepo monorepo khởi tạo bằng `npx create-turbo@latest loop` — phải là Story đầu tiên (Story 1.1)
ARCH-002: Docker Compose 5 topology: Nginx (80/443) → backend:3000 + web:5173; PostgreSQL 18 (internal 5432); Redis 7 (internal 6379); Mobile build riêng qua Expo
ARCH-003: NestJS OrgScopeGuard + OrgScopeInterceptor inject `orgUnitIds[]` vào mọi request — phải hoàn thành trước khi implement bất kỳ domain module nào
ARCH-004: JWT auth: access token 15 phút + refresh token 7 ngày; Web: httpOnly cookies; Mobile: Expo SecureStore; bcrypt cost factor 12
ARCH-005: Prisma 7.8 migrations — version-controlled schema; 8 domain modules: auth → org-units → personnel → projects → tasks → costs → alerts → reports
ARCH-006: BullMQ + Redis worker setup — cron job kiểm tra alert mỗi giờ; phải hoàn thành trước notification delivery
ARCH-007: Firebase Cloud Messaging (FCM) integration cho push notification mobile
ARCH-008: Nodemailer + SMTP email — cấu hình qua env var
ARCH-009: TanStack Query v5 config trong packages/shared — phải setup trước web + mobile dùng API
ARCH-010: Pino v9 structured logging — JSON to stdout, Docker captures
ARCH-011: GlobalExceptionFilter + standardized error format `{ statusCode, message, errors[] }`
ARCH-012: Swagger UI tự động qua @nestjs/swagger tại `/api/docs`
ARCH-013: packages/shared WORK_CONSTANTS (HOURS_PER_DAY=8, DAYS_PER_MONTH=21, WORK_DAYS=[1-5])
ARCH-014: Redis cache cho progress calculation (key `progress:{projectId}`); invalidate khi task update
ARCH-015: Ant Design v5 ConfigProvider + darkAlgorithm; Zustand v5 stores; React Router v7 lazy loading
ARCH-016: Expo Router v4 setup; Bottom tab navigation; React Native Paper theme
ARCH-017: pg_dump daily backup script trong PostgreSQL container
ARCH-018: Nginx self-signed certificate (local network); CORS restricted to configured origins
ARCH-019: MinIO object storage — Docker Compose service `minio` (image minio/minio); bucket `loop-bug-attachments`; presigned URL TTL 1h; accessible only from backend service (internal network)

### UX Design Requirements

UX-DR1: Dark mode — Ant Design v5 `darkAlgorithm` trong ConfigProvider; lưu preference `localStorage('loop-theme')`; sync `prefers-color-scheme` lần load đầu; Mobile: `MD3DarkTheme` + `useColorScheme()` hook
UX-DR2: Component `TaskTreeView` — collapsible tree 5 level; progress roll-up animation; status badges; `role="treegrid"` keyboard navigation (arrow keys/Space); 3 variants: compact/comfortable/mobile
UX-DR3: Component `AllocationConflictModal` — bảng ngày xung đột (ngày | dự án hiện tại | dự án mới | tổng %); highlight ô > 100% màu `#FF4D4F`; actions: Điều chỉnh / Vẫn lưu + second confirm / Huỷ
UX-DR4: Component `CostBreakdownTooltip` — popover 320px: breakdown chi phí theo từng nhân sự (avatar, tên, level, effort MD × rate = chi phí); trigger hover/long-press
UX-DR5: Component `NotificationBell` — count badge (ẩn khi = 0); dropdown (web) / Bottom Sheet (mobile); tabs: Tất cả | Task | Nguồn lực | Ngân sách; deep link vào task/project
UX-DR6: Responsive layout web — sidebar 220px collapsed về 64px icon-only tại < 992px; banner "Dùng app mobile" khi viewport < 576px; table ẩn secondary columns tại breakpoint md
UX-DR7: WCAG AA accessibility — focus indicator `outline: 2px solid #1B4F9C`; skip link; ARIA labels tiếng Việt; `role="alert"` cho error messages; `aria-busy` cho loading; axe-core scan trong CI
UX-DR8: Status color tokens — To Do `#8C8C8C`, In Progress `#1677FF`, Done `#52C41A`, Chờ duyệt `#FA8C16`, Trả lại `#FF4D4F`, Đã huỷ `#D9D9D9`; dùng icon + màu (không chỉ màu đơn)
UX-DR9: Mobile touch — targets ≥ 44×44px; swipe actions có alternative button; Bottom Sheet thay Modal; optimistic update + offline banner
UX-DR10: Form patterns — `onBlur` validation; dirty-form warning khi navigate away; 2-cột layout form lớn trên web; sticky Save button; destructive actions yêu cầu confirm dialog
UX-DR11: Bug severity color tokens — Critical `#FF4D4F` (đỏ), High `#FA8C16` (cam), Medium `#FADB14` (vàng), Low `#52C41A` (xanh lá); dùng icon + màu + label (không chỉ màu đơn); áp dụng nhất quán ở badge, filter chip, và form selector

### FR Coverage Map

| FR | Epic |
|---|---|
| FR-001, FR-002, FR-003 | Epic 2 — Org Tree & Access Control |
| FR-101, FR-102 | Epic 3 — Personnel & Rate Management |
| FR-201, FR-202 | Epic 4 — Project Management & Allocation |
| FR-301, FR-302, FR-303 | Epic 5 — Task Management & Progress |
| FR-401, FR-402, FR-403 | Epic 6 — Cost Tracking |
| FR-501, FR-502, FR-503, FR-504, FR-505 | Epic 7 — Alerts & Notifications |
| FR-601, FR-602, FR-603 | Epic 8 — Dashboards & Reports |
| NFR-01 (mobile) | Epic 9 — Mobile App |
| NFR-02 | Epic 1–2 (OrgScopeGuard + Org Tree) |
| NFR-03 | Epic 4 (Allocation validation) |
| NFR-04 | Epic 3 (Rate history append-only) |
| FR-BPM01 – FR-BPM08 | Epic 12 — BPM Module |
| FR-BUG01 – FR-BUG09 | Epic 13 — Bug & Issue Tracking |
| ARCH-019 | Epic 13 — Bug & Issue Tracking (MinIO) |
| FR-IR01 – FR-IR17 | Epic 14 — Issue Register |

## Epic List

### Epic 1: Foundation & Infrastructure
Người dùng có thể đăng nhập vào hệ thống; team dev có thể chạy toàn bộ stack bằng 1 lệnh `docker-compose up`; web app hiển thị đúng với design system, dark mode, và responsive layout.
**FRs covered:** (foundation — unblocks all FRs)
**ARCH covered:** ARCH-001 – ARCH-018
**UX covered:** UX-DR1, UX-DR6, UX-DR7, UX-DR8

### Epic 2: Organization Tree & Access Control
Admin có thể xây dựng cây tổ chức phòng ban, gán người dùng + roles vào từng đơn vị; mỗi người dùng chỉ thấy dữ liệu thuộc phạm vi org unit của mình và cấp dưới.
**FRs covered:** FR-001, FR-002, FR-003
**NFRs covered:** NFR-02

### Epic 3: Personnel & Rate Management
Admin có thể quản lý hồ sơ nhân sự đầy đủ và duy trì lịch sử rate append-only theo thời gian — nền tảng để tính chi phí chính xác.
**FRs covered:** FR-101, FR-102
**NFRs covered:** NFR-04

### Epic 4: Project Management & Resource Allocation
PM có thể tạo và quản lý dự án, load nhân sự vào dự án; hệ thống tự phát hiện và hiển thị xung đột allocation theo từng ngày làm việc thực tế.
**FRs covered:** FR-201, FR-202
**NFRs covered:** NFR-03
**UX covered:** UX-DR3

### Epic 5: Task Management & Progress Tracking
PM và Member có thể tổ chức công việc trong cây task 5 cấp, quản lý workflow duyệt/trả lại/huỷ, log effort, và theo dõi tiến độ roll-up tự động có trọng số.
**FRs covered:** FR-301, FR-302, FR-303
**UX covered:** UX-DR2, UX-DR10

### Epic 6: Cost Tracking
PM và Leadership có thể xem chi phí thực tế so với ngân sách, được tính chính xác theo lịch sử rate từng giai đoạn của từng nhân sự.
**FRs covered:** FR-401, FR-402, FR-403
**UX covered:** UX-DR4

### Epic 7: Alerts & Notifications
Hệ thống chủ động phát hiện và thông báo PM + Member về rủi ro task, nguồn lực, ngân sách qua 3 kênh (in-app, push mobile, email) với ngưỡng cấu hình được.
**FRs covered:** FR-501, FR-502, FR-503, FR-504, FR-505
**ARCH covered:** ARCH-006, ARCH-007, ARCH-008
**UX covered:** UX-DR5

### Epic 8: Dashboards & Reports
Leadership có dashboard tổng quan portfolio; PM có dashboard chi tiết dự án; cả hai có thể xuất báo cáo Excel với tham số linh hoạt theo nhu cầu.
**FRs covered:** FR-601, FR-602, FR-603

### Epic 9: Mobile App
Member có thể xem task, cập nhật tiến độ, log effort, và nhận push notification trên điện thoại (iOS/Android); PM có thể xem cảnh báo khi không ở máy tính.
**FRs covered:** NFR-01 (mobile platform)
**ARCH covered:** ARCH-016
**UX covered:** UX-DR9

### Epic 10: Timesheet & Attendance Management
Nhân sự có thể cập nhật trạng thái công việc 1-tap trên mobile và web; HR/Manager theo dõi chấm công real-time; hệ thống tổng hợp bảng công tự động và hỗ trợ quy trình phê duyệt có escalation.
**FRs covered:** FR-T01 – FR-T06 (Timesheet module mới — xem Epic 10 chi tiết)
**Research basis:** Market Research 2026-05-25

### Epic 11: Telegram Integration (v2)
Team nhận thông báo task mới và cảnh báo deadline trực tiếp trong Telegram group; thành viên có thể cập nhật trạng thái task bằng nút inline mà không cần mở Loop — hoạt động hoàn toàn trên mạng nội bộ (on-premise) nhờ cơ chế long-polling.
**FRs covered:** FR-TG01 – FR-TG04 (Telegram Integration module mới)
**Architecture basis:** v2 External Integration Decision — architecture.md

### Epic 12: BPM — Business Process Management
Admin có thể thiết kế quy trình nghiệp vụ dạng BPMN 2.0 bằng visual modeler kéo thả; PM có thể khởi động process instance, theo dõi tiến độ từng bước qua token overlay, và xem user tasks cần xử lý — toàn bộ chạy trong NestJS monorepo hiện tại, không thêm service mới.
**FRs covered:** FR-BPM01 – FR-BPM08 (BPM Module mới)
**Architecture basis:** Amendment 2026-05-26 — architecture.md

### Epic 13: Bug & Issue Tracking
Bất kỳ thành viên nào cũng có thể log bug với đầy đủ context (project, task(s) liên quan, severity, ảnh đính kèm); PM và assignee theo dõi và xử lý qua workflow đơn giản; toàn bộ bug của hệ thống hiển thị trong view tập trung có filter, "My Bugs" cá nhân, và dashboard thống kê.
**FRs covered:** FR-BUG01 – FR-BUG09
**ARCH covered:** ARCH-019 (MinIO)
**UX covered:** UX-DR11

### Epic 14: Issue Register (Triển khai Dự án)
PM và team ghi nhận, phân loại và theo dõi toàn bộ issues phát sinh trong giai đoạn triển khai dự án cho khách hàng — bao gồm Bug (lỗi cần sửa) và CR (yêu cầu thay đổi); CR bắt buộc qua luồng phê duyệt PM trước khi triển khai; audit log bất biến ghi nhận mọi thay đổi; dashboard 6 card real-time; export Excel báo cáo định kỳ.
**FRs covered:** FR-IR01 – FR-IR17

### Epic 15: Authorization & Permission Management
Admin có thể quản lý chi tiết quyền hạn của từng role và override cho từng user cụ thể; mọi API endpoint được bảo vệ bằng function-level permission check; mọi query trả data đều tự động filter theo phạm vi org tree của người dùng (org-scoped row-level security); frontend ẩn/hiện UI element dựa trên effective permissions của user.
**ARCH covered:** ARCH-020 – ARCH-024

---

## Epic 1: Foundation & Infrastructure

Người dùng có thể đăng nhập vào hệ thống; team dev có thể chạy toàn bộ stack bằng 1 lệnh `docker-compose up`; web app hiển thị đúng với design system, dark mode, và responsive layout.

### Story 1.1: Turborepo Monorepo & Docker Compose Setup

As a developer,
I want the project initialized as a Turborepo monorepo with Docker Compose,
So that the entire stack can be started with a single command on any machine.

**Acceptance Criteria:**

**Given** a fresh developer machine with Docker and Node installed
**When** the developer runs `npx create-turbo@latest loop` then applies the monorepo structure
**Then** the repository contains `apps/backend` (NestJS), `apps/web` (React+Vite), `apps/mobile` (Expo), `packages/shared`
**And** `docker-compose.yml` defines services: `nginx` (80/443), `backend` (3000), `web` (5173), `postgres` (PostgreSQL 18, internal 5432), `redis` (Redis 7, internal 6379)

**Given** the Docker Compose file is correctly configured
**When** the developer runs `docker-compose up`
**Then** all 5 services start without errors
**And** `http://localhost` serves the web app via Nginx
**And** `http://localhost/api` routes to the backend
**And** PostgreSQL and Redis are accessible only from internal services

**Given** the infrastructure is running
**When** the developer checks Nginx config
**Then** `/api/*` proxies to `backend:3000`
**And** `/*` serves `web:5173`
**And** Nginx is configured with a self-signed certificate for HTTPS on port 443

**Given** the monorepo structure
**When** the developer runs `turbo build` from root
**Then** all apps build successfully
**And** `packages/shared` is built before apps that depend on it

---

### Story 1.2: packages/shared — Constants, Types & TanStack Query Config

As a developer,
I want shared constants, TypeScript types, and TanStack Query config in `packages/shared`,
So that all apps use consistent business logic constants and API client configuration.

**Acceptance Criteria:**

**Given** the `packages/shared` package is set up
**When** any app imports from `@loop/shared`
**Then** `WORK_CONSTANTS` is available: `{ HOURS_PER_DAY: 8, DAYS_PER_MONTH: 21, WORK_DAYS: [1,2,3,4,5] }`
**And** `Role` enum is available: `ADMIN | PM | MEMBER | LEADERSHIP`
**And** `TaskStatus` enum: `TODO | IN_PROGRESS | DONE | PENDING_APPROVAL | RETURNED | CANCELLED`
**And** `ProjectStatus` enum: `PLANNING | ACTIVE | ON_HOLD | CLOSED`
**And** `EmployeeLevel` enum: `JUNIOR | MID | SENIOR | EXPERT`

**Given** `packages/shared` exports TanStack Query config
**When** apps/web and apps/mobile initialize TanStack Query
**Then** they use the shared `QueryClient` config with `staleTime: 60000` (60s)
**And** the config includes global error handler for 401 responses (trigger logout)

**Given** `packages/shared` is a TypeScript project
**When** the developer runs `tsc` in the package
**Then** no TypeScript errors occur
**And** the package exports type-safe interfaces for all shared DTOs

---

### Story 1.3: Backend Auth Module — JWT Authentication

As a user,
I want to log in with my email and password and stay authenticated,
So that I can access the system securely without logging in on every page load.

**Acceptance Criteria:**

**Given** the Prisma schema includes `User` model (id, email, password_hash, name, role, org_unit_id, refresh_token, created_at)
**When** Prisma migrations run
**Then** the `users` table is created in PostgreSQL with correct columns and constraints

**Given** a valid email and password
**When** the user calls `POST /api/v1/auth/login`
**Then** the response sets an `access_token` httpOnly cookie (expires 15 min)
**And** sets a `refresh_token` httpOnly cookie (expires 7 days)
**And** returns `{ data: { id, email, name, role, orgUnitId } }`

**Given** an invalid email or wrong password
**When** the user calls `POST /api/v1/auth/login`
**Then** the response returns `{ statusCode: 401, message: "Email hoặc mật khẩu không đúng" }`

**Given** an expired access token but valid refresh token in cookie
**When** the user calls `POST /api/v1/auth/refresh`
**Then** a new `access_token` cookie is set with a fresh 15-minute expiry
**And** the old refresh token is invalidated

**Given** a logged-in user
**When** the user calls `POST /api/v1/auth/logout`
**Then** both cookies are cleared
**And** the `refresh_token` field is nulled in the database

**Given** passwords are stored
**When** the developer inspects the database
**Then** all passwords are hashed with bcrypt cost factor 12 (no plaintext)

---

### Story 1.4: Backend Common Infrastructure — Guards, Filters & Observability

As a developer,
I want cross-cutting infrastructure (OrgScopeGuard, error handling, logging, Swagger) in place,
So that all future domain modules inherit consistent security and observability automatically.

**Acceptance Criteria:**

**Given** a protected endpoint decorated with `@OrgScoped()`
**When** a request arrives with a valid JWT
**Then** `OrgScopeInterceptor` computes `orgUnitIds[]` (the user's org unit and all descendants via recursive CTE) and attaches it to the request context
**And** the endpoint's service receives `orgUnitIds` for filtering

**Given** a request to a protected endpoint without a valid JWT
**When** `JwtAuthGuard` processes the request
**Then** the response is `{ statusCode: 401, message: "Unauthorized" }`

**Given** an endpoint decorated with `@Roles(Role.ADMIN)`
**When** a user with role `PM` calls it
**Then** the response is `{ statusCode: 403, message: "Forbidden" }`

**Given** any unhandled exception in the backend
**When** `GlobalExceptionFilter` catches it
**Then** the response follows the standard format: `{ statusCode, message, errors[] }`
**And** the stack trace is NOT included in the response body

**Given** the backend is running
**When** the developer opens `http://localhost/api/docs`
**Then** the Swagger UI lists all endpoints with their DTOs and auth requirements

**Given** any request is processed
**When** Pino v9 logs the event
**Then** logs are written to stdout in JSON format with `{ level, time, method, url, statusCode, durationMs }`

**Given** the pg_dump backup script is configured
**When** the daily cron runs inside the PostgreSQL container
**Then** a `.sql` dump is written to `/backups/loop-{YYYY-MM-DD}.sql`

---

### Story 1.5: React Web App Shell — Layout, Design System & Dark Mode

As a user,
I want a consistent, responsive web interface with dark mode support,
So that I can use Loop comfortably on any screen size and in my preferred theme.

**Acceptance Criteria:**

**Given** the web app is loaded for the first time
**When** the user's OS is set to dark mode (`prefers-color-scheme: dark`)
**Then** the app initializes in dark mode automatically

**Given** the user clicks the theme toggle button in the topbar
**When** the toggle fires
**Then** the app switches between light and dark mode instantly
**And** the preference is saved to `localStorage('loop-theme')`
**And** on next load, the saved preference is applied

**Given** Ant Design v5 ConfigProvider is set up
**When** dark mode is active
**Then** `darkAlgorithm` is applied, overriding all default component tokens
**And** status color tokens are defined: To Do `#8C8C8C`, In Progress `#1677FF`, Done `#52C41A`, Chờ duyệt `#FA8C16`, Trả lại `#FF4D4F`, Đã huỷ `#D9D9D9`

**Given** the app layout is rendered on a ≥ 992px viewport
**When** the user views any page
**Then** the sidebar (220px) is expanded with labels visible
**And** the topbar (64px) shows logo, page title, notification bell, and theme toggle

**Given** the viewport is < 992px
**When** the user views any page
**Then** the sidebar collapses to 64px icon-only mode
**And** all navigation items show icons only (no text labels)

**Given** the viewport is < 576px
**When** the user accesses the web app
**Then** a banner displays: "Vui lòng dùng ứng dụng Loop trên điện thoại"

**Given** the user navigates via keyboard (Tab key)
**When** focus moves to any interactive element
**Then** a visible focus ring `outline: 2px solid #1B4F9C` is displayed (WCAG AA)
**And** a skip link "Bỏ qua điều hướng" appears when the page first receives Tab focus

**Given** React Router v7 is configured
**When** the user navigates between routes
**Then** each page component is lazy-loaded (code splitting)
**And** the URL updates correctly and browser back/forward works

---

## Epic 2: Organization Tree & Access Control

Admin có thể xây dựng cây tổ chức phòng ban, gán người dùng + roles vào từng đơn vị; mỗi người dùng chỉ thấy dữ liệu thuộc phạm vi org unit của mình và cấp dưới.

### Story 2.1: Backend — Org Unit CRUD API

As an admin,
I want to create, read, update, and delete organizational units in a tree structure,
So that the company hierarchy is accurately represented in the system.

**Acceptance Criteria:**

**Given** the Prisma schema includes `OrgUnit` model (id, name, code, parent_id, created_at)
**When** Prisma migrations run
**Then** the `org_units` table is created with a self-referencing `parent_id` foreign key

**Given** a valid admin JWT
**When** the admin calls `POST /api/v1/org-units` with `{ name, code, parentId }`
**Then** a new org unit is created
**And** `parentId: null` creates a root unit

**Given** the org tree has units at multiple levels
**When** the admin calls `GET /api/v1/org-units`
**Then** the response returns the full tree structure as nested objects using a PostgreSQL recursive CTE
**And** each node includes `{ id, name, code, parentId, children[] }`

**Given** a valid admin JWT
**When** the admin calls `PUT /api/v1/org-units/:id` with updated `name` or `code`
**Then** the unit is updated
**And** `parentId` changes are also accepted (moving a subtree)

**Given** an org unit has child units or assigned users
**When** the admin tries to `DELETE /api/v1/org-units/:id`
**Then** the response returns `{ statusCode: 400, message: "Không thể xoá đơn vị đang có đơn vị con hoặc người dùng" }`

**Given** a non-admin user
**When** they call any write endpoint for org-units
**Then** the response is `{ statusCode: 403, message: "Forbidden" }`

---

### Story 2.2: Backend — User Management API

As an admin,
I want to create users and assign them to org units with roles,
So that each team member can log in with appropriate access scope.

**Acceptance Criteria:**

**Given** a valid admin JWT
**When** the admin calls `POST /api/v1/users` with `{ email, name, password, role, orgUnitId }`
**Then** a new user is created with the hashed password
**And** the user can immediately log in with the provided credentials

**Given** a valid admin JWT
**When** the admin calls `GET /api/v1/users`
**Then** all users in the system are returned (admin sees all)
**And** each user record includes `{ id, email, name, role, orgUnitId, orgUnitName }`

**Given** a PM calling `GET /api/v1/users`
**When** OrgScopeGuard processes the request
**Then** only users within the PM's org unit and descendant units are returned

**Given** a valid admin JWT
**When** the admin calls `PUT /api/v1/users/:id` with `{ role, orgUnitId }`
**Then** the user's role and org assignment are updated
**And** no historical data (projects, tasks) is affected by this change

**Given** changing a user's password
**When** the admin calls `PUT /api/v1/users/:id/password` with `{ newPassword }`
**Then** the new password is hashed with bcrypt and stored
**And** existing refresh tokens for that user are invalidated

---

### Story 2.3: Web UI — Org Tree & User Management Pages

As an admin,
I want a visual interface to manage the org tree and assign users,
So that I can maintain the company structure without using the API directly.

**Acceptance Criteria:**

**Given** the admin navigates to Settings → Cơ cấu tổ chức
**When** the page loads
**Then** the org tree is displayed as an interactive expandable/collapsible tree using Ant Design `Tree` component
**And** each node shows: unit name, code, and user count

**Given** the admin clicks "Thêm đơn vị"
**When** the form is submitted with valid name, code, and parent selection
**Then** the new unit appears in the tree immediately (optimistic update)
**And** a success toast "Đã tạo đơn vị" is shown

**Given** the admin clicks on an org unit node
**When** the detail panel opens
**Then** the panel shows all users assigned to that unit in a table (name, email, role)

**Given** the admin navigates to Settings → Người dùng
**When** the page loads
**Then** a table of all users is displayed with columns: tên, email, role, đơn vị tổ chức
**And** an "Thêm người dùng" button is visible

**Given** the admin opens the "Thêm người dùng" form
**When** all required fields are filled and submitted
**Then** the user is created and appears in the table
**And** the user's org unit assignment is reflected in the tree view

**Given** an org unit delete is attempted for a unit with children
**When** the delete confirmation dialog appears
**Then** a warning is shown: "Đơn vị này có X đơn vị con và Y người dùng"
**And** the delete button is disabled until children are reassigned

---

## Epic 3: Personnel & Rate Management

Admin có thể quản lý hồ sơ nhân sự đầy đủ và duy trì lịch sử rate append-only theo thời gian.

### Story 3.1: Backend — Employee Profile CRUD API

As an admin,
I want to create and manage employee profiles with all required fields,
So that personnel data is centralized and accessible to authorized users.

**Acceptance Criteria:**

**Given** the Prisma schema includes `Employee` model (id, code, full_name, birthdate, tech_stack[], level, cccd, cccd_issue_date, cccd_issue_place, org_unit_id, created_at)
**When** Prisma migrations run
**Then** the `employees` table is created with correct columns and constraints

**Given** a valid admin JWT
**When** the admin calls `POST /api/v1/employees` with all required fields
**Then** a new employee record is created
**And** `code` must be unique; duplicate code returns `{ statusCode: 400, message: "Mã nhân sự đã tồn tại" }`

**Given** a PM calling `GET /api/v1/employees`
**When** OrgScopeGuard processes the request
**Then** only employees in the PM's org unit scope are returned
**And** `cccd`, `cccd_issue_date`, `cccd_issue_place` fields are NOT included in the response

**Given** an Admin calling `GET /api/v1/employees/:id`
**When** the request is processed
**Then** all fields including CCCD are returned

**Given** an employee has been assigned to projects
**When** any role calls `GET /api/v1/employees/:id/project-history`
**Then** the response returns read-only project history: `[{ projectId, projectName, role, startDate, endDate }]` aggregated from ProjectMember records

---

### Story 3.2: Backend — Rate History API (Append-Only)

As an admin,
I want to add new rate entries for employees without modifying historical rates,
So that cost calculations always use the correct rate for each time period.

**Acceptance Criteria:**

**Given** the Prisma schema includes `EmployeeRate` model (id, employee_id, effective_date, rate_per_day, created_at)
**When** Prisma migrations run
**Then** the `employee_rates` table is created with a unique constraint on `(employee_id, effective_date)`

**Given** a valid admin JWT
**When** the admin calls `POST /api/v1/employees/:id/rates` with `{ effectiveDate, ratePerDay }`
**Then** a new rate record is INSERTed
**And** no existing rate record is ever modified or deleted

**Given** a rate entry already exists for the same `(employee_id, effective_date)`
**When** the admin tries to add a duplicate
**Then** the response returns `{ statusCode: 400, message: "Đã có rate hiệu lực vào ngày này" }`

**Given** an employee has multiple rate records
**When** a service queries the effective rate at date T
**Then** the query uses `WHERE effective_date <= T ORDER BY effective_date DESC LIMIT 1`
**And** the correct historical rate is returned for any given date

**Given** a valid PM JWT
**When** the PM calls `GET /api/v1/employees/:id/rates`
**Then** the rate history for employees in their org scope is returned (read-only for PM)

---

### Story 3.3: Web UI — Personnel Management Pages

As an admin,
I want a complete interface to manage employee profiles and rate history,
So that I can maintain all personnel data through the web application.

**Acceptance Criteria:**

**Given** the admin navigates to Nhân sự
**When** the page loads
**Then** a table of employees is displayed: mã, họ tên, level, tech stack, đơn vị tổ chức, rate hiện tại
**And** a search input filters by name or code (debounce 300ms)
**And** a filter dropdown filters by level and org unit

**Given** the admin clicks "Thêm nhân sự"
**When** the form is submitted with all required fields
**Then** the employee is created and appears in the table
**And** CCCD fields (số CCCD, ngày/nơi cấp) are visible only to Admin users

**Given** the admin opens an employee's detail page
**When** the page loads
**Then** the profile form shows all fields with edit capability
**And** a "Lịch sử Rate" section shows all rate entries in a table (effective_date, rate_per_day, created_at) — read-only
**And** an "Thêm rate mới" form allows adding a new entry (no edit/delete buttons)

**Given** a PM views the personnel list
**When** the page loads
**Then** CCCD, ngày cấp, nơi cấp fields are not visible or accessible
**And** rate history is visible but the "Thêm rate mới" button is hidden

**Given** any user views the project history tab on an employee profile
**When** the tab is selected
**Then** the read-only list of projects shows: tên dự án, role, ngày vào, ngày ra

---

## Epic 4: Project Management & Resource Allocation

PM có thể tạo và quản lý dự án, load nhân sự vào dự án; hệ thống tự phát hiện và hiển thị xung đột allocation theo từng ngày làm việc.

### Story 4.1: Backend — Project CRUD API

As a PM,
I want to create and manage projects with all required attributes,
So that each project has a complete record for tracking and reporting.

**Acceptance Criteria:**

**Given** the Prisma schema includes `Project` model (id, code, name, type, customer, budget_amount, budget_currency, budget_effort_mm, start_date, end_date, status, org_unit_id, created_at)
**When** Prisma migrations run
**Then** the `projects` table is created with all required columns

**Given** a valid PM JWT
**When** the PM calls `POST /api/v1/projects` with all required fields
**Then** the project is created and assigned to the PM's org unit
**And** `type` must be `OSDC` or `PKG`; `status` defaults to `PLANNING`

**Given** a PM calling `GET /api/v1/projects`
**When** OrgScopeGuard processes the request
**Then** only projects belonging to the PM's org unit scope are returned

**Given** a Leadership user calling `GET /api/v1/projects`
**When** OrgScopeGuard processes the request
**Then** projects across the leadership's entire org scope are returned

**Given** a valid PM JWT
**When** the PM calls `PUT /api/v1/projects/:id/status` with `{ status: "ACTIVE" }`
**Then** the project status is updated
**And** only the PM who owns the project (same org unit) can update it

---

### Story 4.2: Backend — Project Member API

As a PM,
I want to add employees to a project with their role, allocation, and rate,
So that project staffing is tracked alongside allocation and cost data.

**Acceptance Criteria:**

**Given** the Prisma schema includes `ProjectMember` model (id, project_id, employee_id, role, level, allocation_pct, start_date, end_date, rate_per_day, created_at)
**When** Prisma migrations run
**Then** the `project_members` table is created

**Given** a valid PM JWT
**When** the PM calls `POST /api/v1/projects/:id/members` with `{ employeeId, role, level, allocationPct, startDate, endDate, ratePerDay }`
**Then** `ratePerDay` defaults to the employee's current rate if not provided (pulled from EmployeeRate history)
**And** `level` defaults to the employee's current level if not provided

**Given** a valid PM JWT
**When** the PM calls `GET /api/v1/projects/:id/members`
**Then** all members are returned with their full assignment details
**And** each member includes `{ employeeId, name, role, level, allocationPct, startDate, endDate, ratePerDay }`

**Given** a PM updates a member's allocation or dates
**When** `PUT /api/v1/projects/:id/members/:memberId` is called
**Then** the record is updated and the allocation validation check is re-triggered

---

### Story 4.3: Backend — Allocation Validation Engine

As a PM,
I want the system to detect and report allocation conflicts before I save a member assignment,
So that no employee is accidentally overallocated across multiple projects.

**Acceptance Criteria:**

**Given** a new ProjectMember record is about to be saved
**When** the allocation validation runs
**Then** for each Mon–Fri working day in `[startDate, endDate]`, the system sums `allocationPct` for the employee across all active ProjectMember records with overlapping date ranges
**And** if any day's total exceeds 100%, the save is blocked and a conflict report is returned

**Given** an allocation conflict is detected
**When** the PM receives the response
**Then** the response body includes `{ hasConflict: true, conflicts: [{ date, existingProjects: [{ name, pct }], newPct, totalPct }] }`
**And** `statusCode` is `409`

**Given** the PM has received a conflict report and explicitly sends `{ forceOverride: true }`
**When** `POST /api/v1/projects/:id/members` is called
**Then** the member is saved despite the conflict
**And** the conflict is logged for alert processing

**Given** an employee is fully available (no other projects in the period)
**When** the allocation validation runs
**Then** `{ hasConflict: false }` is returned and the record is saved immediately

**Given** weekends (Saturday, Sunday)
**When** the allocation engine iterates over dates
**Then** Saturday and Sunday are skipped (not included in conflict calculation)

---

### Story 4.4: Web UI — Project List & Project Detail Shell

As a PM,
I want a clear project list and a project detail page with tab navigation,
So that I can manage all aspects of a project from one place.

**Acceptance Criteria:**

**Given** the PM navigates to Dự án
**When** the page loads
**Then** a table displays all projects in scope: mã, tên, loại, khách hàng, ngân sách, trạng thái, ngày bắt đầu/kết thúc
**And** status is shown as a colored `Tag` (Planning=grey, Active=blue, On Hold=orange, Closed=default)
**And** a search input filters by name or code

**Given** the PM clicks "Tạo dự án"
**When** the form modal opens
**Then** all required fields are present: mã, tên, loại (select OSDC/PKG), khách hàng, ngân sách (amount + currency), effort ngân sách (MM), ngày bắt đầu, ngày kết thúc
**And** the form validates required fields on submit

**Given** the PM clicks on a project name
**When** the project detail page loads
**Then** tab navigation is shown: Overview | Nhân sự | Tasks | Chi phí | Cảnh báo
**And** breadcrumb shows: Dự án > [Project Name]

---

### Story 4.5: Web UI — Project Members + AllocationConflictModal

As a PM,
I want to manage project team members and see clear conflict details when allocation overlaps occur,
So that I can make informed decisions about resource assignment.

**Acceptance Criteria:**

**Given** the PM is on the project detail page, Nhân sự tab
**When** the tab loads
**Then** a table shows all current members: tên, role, level, % allocation, ngày vào, ngày ra, rate man-day

**Given** the PM clicks "Thêm nhân sự"
**When** the form drawer opens
**Then** fields are: nhân sự (searchable select), role (text), level (select with default from employee), % allocation (number 1–100), ngày vào, ngày ra, rate man-day (pre-filled from employee's current rate, editable)

**Given** the PM fills the form and the backend returns a conflict (409)
**When** the AllocationConflictModal appears
**Then** a table shows each conflicted date: Ngày | Dự án hiện tại: X% | Dự án mới: Y% | Tổng: Z%
**And** cells where tổng > 100% are highlighted in `#FF4D4F`
**And** a suggestion text shows the maximum safe allocation percentage

**Given** the AllocationConflictModal is open
**When** the PM clicks "Điều chỉnh"
**Then** the modal closes and focus returns to the % allocation field in the form

**Given** the PM clicks "Vẫn lưu"
**When** a second confirm dialog appears ("Hành động này sẽ tạo xung đột allocation. Xác nhận?")
**Then** clicking "Xác nhận" saves the record with `forceOverride: true`

---

## Epic 5: Task Management & Progress Tracking

PM và Member có thể tổ chức công việc trong cây task 5 cấp, quản lý workflow duyệt/trả lại/huỷ, log effort, và theo dõi tiến độ roll-up tự động có trọng số.

### Story 5.1: Backend — Task CRUD API (5-Level Hierarchy)

As a PM,
I want to create tasks organized in a 5-level hierarchy within a project,
So that work can be structured from epics down to individual sub-tasks.

**Acceptance Criteria:**

**Given** the Prisma schema includes `Task` model (id, project_id, title, description, assignee_id, deadline, status, estimate_hours, actual_hours, progress_pct, parent_task_id, created_by, created_at)
**When** Prisma migrations run
**Then** the `tasks` table is created with a self-referencing `parent_task_id`

**Given** a valid PM JWT
**When** the PM calls `POST /api/v1/projects/:id/tasks` with `{ title, description, assigneeId, deadline, estimateHours, parentTaskId }`
**Then** the task is created with `status: TODO`
**And** `estimateHours` must be ≤ configured max (default 4h); if exceeded, a warning is included in the response but the task is still created

**Given** a task is being created with a parentTaskId
**When** the backend validates the hierarchy depth
**Then** if the parent is already at level 5, the request returns `{ statusCode: 400, message: "Đã đạt giới hạn 5 cấp" }`

**Given** a GET request for project tasks
**When** `GET /api/v1/projects/:id/tasks` is called
**Then** the response returns the full task tree using a recursive CTE, with each node containing its children array

**Given** a valid PM or Member JWT
**When** `GET /api/v1/tasks/:id` is called
**Then** the task detail is returned including `{ parentTask, children[], assignee }` populated

---

### Story 5.2: Backend — Task Approval Workflow

As a PM,
I want to approve, return, or cancel tasks created by Members,
So that only validated tasks enter the active workflow.

**Acceptance Criteria:**

**Given** a Member JWT
**When** the Member calls `POST /api/v1/projects/:id/tasks` (creates a task)
**Then** the task `status` is set to `PENDING_APPROVAL` (not `TODO`)

**Given** a PM JWT and a task with `status: PENDING_APPROVAL`
**When** the PM calls `POST /api/v1/tasks/:id/approve`
**Then** the task status transitions to `TODO`
**And** a Notification record is created for the task's creator: "Task [title] đã được duyệt"

**Given** a PM JWT
**When** the PM calls `POST /api/v1/tasks/:id/return` with `{ reason: "..." }`
**Then** the task status transitions to `RETURNED`
**And** a Notification is created for the creator including the rejection reason

**Given** a task with `status: RETURNED`
**When** the Member (creator) calls `PUT /api/v1/tasks/:id` with updated content and re-submits via `POST /api/v1/tasks/:id/resubmit`
**Then** the task status transitions back to `PENDING_APPROVAL`

**Given** a PM JWT
**When** the PM calls `POST /api/v1/tasks/:id/cancel`
**Then** the task status transitions to `CANCELLED`
**And** the task cannot be edited by anyone after cancellation
**And** a Notification is created for the creator: "Task [title] đã bị huỷ"

**Given** a Member attempts to approve, return, or cancel a task
**When** the request is processed
**Then** the response returns `{ statusCode: 403, message: "Forbidden" }`

---

### Story 5.3: Backend — Progress Calculation Engine & Effort Logging

As a PM or Member,
I want to log actual effort and update task progress, with automatic roll-up to parent tasks,
So that project progress is always accurate without manual calculation.

**Acceptance Criteria:**

**Given** a task has no children (leaf task)
**When** `PUT /api/v1/tasks/:id/progress` is called with `{ progressPct: 75 }`
**Then** the task's `progress_pct` is updated to 75
**And** the parent task's progress is recalculated as weighted average of all children's `progress_pct` weighted by `estimate_hours`
**And** roll-up continues recursively to the root task

**Given** a task has children
**When** any child's progress changes
**Then** the parent's `progress_pct` is auto-calculated (not directly settable)
**And** the project's overall progress = weighted average of all root tasks' `progress_pct` by their `estimate_hours`

**Given** a valid PM or assigned Member JWT
**When** `POST /api/v1/tasks/:id/log-effort` is called with `{ hoursLogged: 2 }`
**Then** `actual_hours` is incremented by 2
**And** the response includes the updated task with new `actual_hours`

**Given** any task progress update
**When** the service saves the update
**Then** the Redis key `progress:{projectId}` is invalidated

**Given** a task is marked as `Done`
**When** `progress_pct` is set to 100
**Then** the status automatically transitions to `DONE` if it was `IN_PROGRESS`

---

### Story 5.4: Web UI — TaskTreeView Component

As a PM or Member,
I want to see all project tasks in a hierarchical tree with visual progress and status indicators,
So that the current state of work is immediately clear at all levels.

**Acceptance Criteria:**

**Given** the PM opens the Tasks tab of a project
**When** the TaskTreeView component loads
**Then** the tree displays all tasks in their hierarchy (up to 5 levels)
**And** each row shows: expand/collapse icon, status badge (colored Tag), title, assignee avatar, progress bar (%), deadline

**Given** a task has children
**When** the user clicks the expand icon
**Then** child tasks are revealed with proper indentation (level × 16px)
**And** the parent's progress % reflects the weighted average of children

**Given** a parent task's child progress changes
**When** the tree re-renders after a save
**Then** the parent's progress bar animates to the new value

**Given** the user presses arrow keys while the tree is focused (`role="treegrid"`)
**When** arrow keys are pressed
**Then** Up/Down navigate between rows; Right expands; Left collapses
**And** Space toggles expand/collapse on the focused node

**Given** the `compact` variant is used
**When** the tree is rendered
**Then** row height is reduced and secondary info (deadline, assignee) is hidden

**Given** the `mobile` variant is used
**When** the tree is rendered
**Then** a flat list is shown instead of tree structure (simplified for small screens)

---

### Story 5.5: Web UI — Task Detail Drawer, Approval Queue & Effort Log

As a PM or Member,
I want to view task details, approve or return tasks, and log effort from the web interface,
So that I can manage all task-related actions without leaving the project page.

**Acceptance Criteria:**

**Given** the user clicks on a task row in TaskTreeView
**When** the Task Detail Drawer opens (480px from right)
**Then** it shows: tiêu đề, mô tả, người thực hiện, deadline, trạng thái, estimate, effort thực tế, task cha (link)
**And** the background list remains visible

**Given** the user is a PM and opens a task with `status: PENDING_APPROVAL`
**When** the drawer is open
**Then** three action buttons are shown: Duyệt (primary), Trả lại (secondary), Huỷ (danger)

**Given** the PM clicks "Trả lại"
**When** a reason input modal appears
**Then** the PM must enter a reason (required)
**And** clicking "Xác nhận" submits the rejection and closes the drawer

**Given** the user is the task assignee and the task is In Progress
**When** the drawer is open
**Then** a progress slider (0–100%) is shown
**And** an effort log input "+ X giờ hôm nay" is shown
**And** a "Đánh dấu Done" button is visible

**Given** the PM navigates to the project's Approval Queue (filtered view of PENDING_APPROVAL tasks)
**When** the queue loads
**Then** all pending tasks are listed with: tiêu đề, người tạo, thời gian tạo, deadline
**And** inline Duyệt / Trả lại buttons for quick action without opening the drawer

---

## Epic 6: Cost Tracking

PM và Leadership có thể xem chi phí thực tế so với ngân sách, được tính chính xác theo lịch sử rate từng giai đoạn.

### Story 6.1: Backend — Cost Calculation Engine

As a PM,
I want the system to automatically calculate actual project costs using historical employee rates,
So that cost tracking is always accurate even when rates change mid-project.

**Acceptance Criteria:**

**Given** an employee has multiple rate records (e.g., rate changed on 2026-03-01)
**When** the cost calculation service runs for a project
**Then** effort hours logged before 2026-03-01 use the rate effective on those dates
**And** effort hours logged on or after 2026-03-01 use the new rate
**And** the total cost = Σ (effort_hours ÷ HOURS_PER_DAY × rate_per_day) per period

**Given** `GET /api/v1/projects/:id/cost` is called
**When** the service computes the cost
**Then** the response returns `{ actualCost, budgetAmount, budgetCurrency, costRatioPct, actualEffortMd, budgetEffortMd, effortRatioPct }`
**And** `budgetEffortMd = budgetEffortMm × DAYS_PER_MONTH`

**Given** a project has member cost data
**When** the breakdown is requested via `GET /api/v1/projects/:id/cost/breakdown`
**Then** the response includes per-member breakdown: `[{ employeeId, name, level, effortMd, ratePerDay, cost }]`

**Given** any task effort is logged (`actual_hours` changes)
**When** the cost cache is invalidated
**Then** the next `GET /api/v1/projects/:id/cost` recalculates from source data

---

### Story 6.2: Web UI — Cost Display & CostBreakdownTooltip

As a PM or Leadership,
I want to see project costs vs budget with a drill-down breakdown,
So that I can quickly assess financial health and identify cost drivers.

**Acceptance Criteria:**

**Given** the PM opens a project's Chi phí tab
**When** the tab loads
**Then** a summary section shows: Chi phí thực tế (formatted VND/USD), Ngân sách (formatted), Tỷ lệ (%)
**And** a progress bar shows cost ratio with color: green < 60%, yellow 60–80%, red > 80%

**Given** the PM hovers over the "Chi phí thực tế" metric card
**When** the CostBreakdownTooltip appears (popover, 320px)
**Then** it shows a table: Avatar | Tên | Level | Effort (MD) | Rate (MD) | Chi phí
**And** the footer shows: Total cost / Budget (%)

**Given** the cost ratio exceeds 80% (configurable threshold)
**When** the cost card is displayed
**Then** a warning icon ⚠️ is shown next to the value

**Given** the cost ratio exceeds 100%
**When** the card is rendered
**Then** the progress bar and text turn red `#FF4D4F`
**And** the label changes to "Vượt ngân sách"

---

## Epic 7: Alerts & Notifications

Hệ thống chủ động phát hiện và thông báo PM + Member về rủi ro task, nguồn lực, ngân sách qua 3 kênh với ngưỡng cấu hình được.

### Story 7.1: Backend — Alert Configuration API

As a PM or Admin,
I want to configure alert thresholds for my org unit,
So that notifications are triggered at meaningful thresholds for my team.

**Acceptance Criteria:**

**Given** the Prisma schema includes `AlertConfig` model (id, org_unit_id, task_due_days, project_end_days, budget_threshold_pct, effort_threshold_pct, max_estimate_hours, updated_at)
**When** Prisma migrations run
**Then** the `alert_configs` table is created

**Given** no AlertConfig exists for an org unit
**When** any alert engine queries the config for that unit
**Then** default values are used: `{ taskDueDays: 3, projectEndDays: 7, budgetThresholdPct: 80, effortThresholdPct: 80, maxEstimateHours: 4 }`

**Given** a valid PM JWT
**When** the PM calls `PUT /api/v1/alert-config` with updated values
**Then** the config for the PM's org unit is upserted
**And** only the 5 configurable fields are accepted

**Given** a valid PM JWT calling `GET /api/v1/alert-config`
**When** the request is processed
**Then** the current config for the PM's org unit is returned (defaults if not yet configured)

---

### Story 7.2: Backend — Notification Schema & In-App Delivery

As a user,
I want to receive in-app notifications for events relevant to me,
So that I am always aware of tasks and alerts requiring my attention.

**Acceptance Criteria:**

**Given** the Prisma schema includes `Notification` model (id, user_id, type, title, body, entity_type, entity_id, is_read, created_at)
**When** Prisma migrations run
**Then** the `notifications` table is created with an index on `(user_id, is_read, created_at)`

**Given** a valid JWT
**When** the user calls `GET /api/v1/notifications`
**Then** the response returns notifications for that user only, sorted by `created_at DESC`
**And** pagination is applied (`?page=1&pageSize=20`)
**And** unread count is included: `{ data: [...], meta: { total, unreadCount } }`

**Given** a notification exists with `is_read: false`
**When** `POST /api/v1/notifications/:id/read` is called
**Then** `is_read` is set to `true`

**Given** `POST /api/v1/notifications/read-all` is called
**When** processed
**Then** all unread notifications for the calling user are marked as read

---

### Story 7.3: Backend — BullMQ Alert Worker & Scheduler

As a system,
I want a scheduled background job to detect alert conditions every hour,
So that notifications are delivered proactively without polling from the frontend.

**Acceptance Criteria:**

**Given** BullMQ is configured with Redis as the queue backend
**When** the NestJS application starts
**Then** the BullMQ alert queue is initialized
**And** a cron job fires every hour to enqueue `CHECK_ALL_ALERTS` jobs

**Given** a `CHECK_ALL_ALERTS` job is enqueued
**When** the worker processes the job
**Then** it enqueues separate jobs for: `CHECK_TASK_ALERTS`, `CHECK_RESOURCE_ALERTS`, `CHECK_BUDGET_ALERTS`
**And** each sub-job is scoped to all active projects

**Given** a job fails (e.g., database error)
**When** BullMQ retries
**Then** the job is retried up to 3 times with exponential backoff
**And** failed jobs after 3 attempts are moved to the dead-letter queue

**Given** the alert worker runs
**When** a notification is to be sent
**Then** the worker creates a `Notification` record in the database (in-app)
**And** enqueues email and push delivery jobs

---

### Story 7.4: Backend — Task Alert Detection

As a PM and Member,
I want to receive notifications when tasks are overdue, due today, or approaching their deadline,
So that I can take action before work falls behind.

**Acceptance Criteria:**

**Given** a task's `deadline` is before today and `status` is not `DONE` or `CANCELLED`
**When** `CHECK_TASK_ALERTS` job runs
**Then** an "Overdue" notification is created for both the PM and the assigned Member

**Given** a task's `deadline` equals today
**When** the alert job runs
**Then** a "Due Today" notification is created for PM and assigned Member

**Given** a task's deadline is within `taskDueDays` (config) days from today
**When** the alert job runs
**Then** a "Due Soon" notification is created for PM and assigned Member

**Given** a task has already triggered a "Due Soon" alert today
**When** the job runs again within the same day
**Then** no duplicate notification is created (deduplicate by entity_id + type + date)

---

### Story 7.5: Backend — Resource & Budget Alert Detection

As a PM,
I want to receive alerts when project resources or budgets are at risk,
So that I can address issues before they become critical.

**Acceptance Criteria:**

**Given** a ProjectMember's `end_date` is within `projectEndDays` (config) days
**When** `CHECK_RESOURCE_ALERTS` runs
**Then** an alert notification is created for the PM: "[Tên nhân sự] sắp kết thúc dự án trong X ngày"

**Given** a project's `actualEffortMd` exceeds `effortThresholdPct`% of `budgetEffortMd`
**When** the resource alert job runs
**Then** an "Effort Near Budget" notification is created for the PM

**Given** a project's `actualEffortMd` exceeds `budgetEffortMd`
**When** the alert job runs
**Then** an "Effort Over Budget" notification is created for the PM

**Given** a project's `actualCost` exceeds `budgetThresholdPct`% of `budgetAmount`
**When** `CHECK_BUDGET_ALERTS` runs
**Then** a "Budget Near Limit" notification is created for the PM

**Given** a project's `actualCost` exceeds `budgetAmount`
**When** the alert job runs
**Then** a "Budget Exceeded" notification is created for the PM and Admin

---

### Story 7.6: Backend — Email & Push Notification Delivery

As a user,
I want to receive push notifications on my phone and email for important alerts,
So that I am notified even when the app is not open.

**Acceptance Criteria:**

**Given** Nodemailer is configured with SMTP credentials from environment variables
**When** an email delivery job is processed
**Then** an email is sent to the user's address with the alert title and body
**And** the email includes a deep link to the relevant entity

**Given** FCM is configured with a service account key from environment variables
**When** a push delivery job is processed for a user with a registered device token
**Then** a push notification is sent via FCM with title and body
**And** failed FCM deliveries (invalid token) remove the stale token from the database

**Given** a user's mobile app starts
**When** the app calls `POST /api/v1/notifications/register-token` with `{ deviceToken, platform: "ios"|"android" }`
**Then** the token is saved/upserted for that user in `device_tokens` table

**Given** a user logs out
**When** `POST /api/v1/auth/logout` is called
**Then** the user's device token is removed from the database

---

### Story 7.7: Web UI — NotificationBell & Settings Page

As a PM or Member,
I want a notification bell in the header showing unread alerts, and a settings page to configure thresholds,
So that I can see alerts at a glance and customize when I get notified.

**Acceptance Criteria:**

**Given** the user is logged in
**When** any page loads
**Then** the topbar shows a bell icon with an unread count badge (hidden when 0)
**And** the count updates every 60 seconds via polling

**Given** the user clicks the bell icon
**When** the dropdown opens
**Then** notifications are grouped in tabs: Tất cả | Task | Nguồn lực | Ngân sách
**And** each notification shows: icon (by type), tiêu đề, thời gian (e.g., "5 phút trước"), unread dot

**Given** the user clicks a notification item
**When** the click is handled
**Then** the notification is marked as read
**And** the user is navigated to the relevant entity (task or project page)

**Given** the PM navigates to Settings → Cảnh báo
**When** the page loads
**Then** a form shows all 5 configurable thresholds with current values and input fields
**And** a Save button persists the configuration

---

## Epic 8: Dashboards & Reports

Leadership có dashboard tổng quan portfolio; PM có dashboard chi tiết dự án; cả hai có thể xuất báo cáo Excel.

### Story 8.1: Backend — Leadership Dashboard API

As a Leadership user,
I want a single API endpoint providing a portfolio-level overview,
So that dashboards can show real-time status across all projects in my scope.

**Acceptance Criteria:**

**Given** a Leadership JWT
**When** `GET /api/v1/dashboard/leadership` is called
**Then** the response includes (all scoped to orgUnitIds):
- `projectCountsByStatus`: `{ planning: N, active: N, onHold: N, closed: N }`
- `overBudgetProjects`: `[{ id, name, costRatioPct }]` (where costRatioPct > 100%)
- `nearBudgetProjects`: `[{ id, name, costRatioPct }]` (threshold from AlertConfig)
- `freeEmployees`: `[{ id, name }]` (no active project memberships)
- `underAllocatedEmployees`: `[{ id, name, totalAllocationPct }]` (< 100% across all active projects)
- `expiringMemberships`: `[{ employeeId, name, projectName, endDate }]` (within projectEndDays)
- `totalEffortSummary`: `{ actualMd, budgetMd, ratioPct }`

**Given** the Leadership's org scope spans multiple units
**When** the API response is computed
**Then** all aggregations are filtered by `orgUnitIds` (descendants included)

---

### Story 8.2: Backend — PM Project Dashboard API

As a PM,
I want a project-level dashboard API with all key metrics in one call,
So that the project dashboard page loads efficiently.

**Acceptance Criteria:**

**Given** a PM JWT
**When** `GET /api/v1/dashboard/project/:id` is called
**Then** the response includes:
- `progressPct`: project overall progress (from Redis cache `progress:{projectId}`)
- `costSummary`: `{ actualCost, budgetAmount, costRatioPct, budgetCurrency }`
- `effortSummary`: `{ actualEffortMd, budgetEffortMd, effortRatioPct }`
- `activeAlerts`: `[{ type, title, createdAt }]` (unread notifications for this project)
- `members`: `[{ name, allocationPct, endDate, daysUntilEnd }]`

**Given** a non-PM user attempts to access another PM's project dashboard
**When** `OrgScopeGuard` processes the request
**Then** `{ statusCode: 403 }` is returned if the project is outside the user's scope

---

### Story 8.3: Backend — Reports API & Excel Export

As a Leadership or PM,
I want to generate parameterized reports and export them as Excel files,
So that I can share project performance data with stakeholders.

**Acceptance Criteria:**

**Given** `POST /api/v1/reports/generate` is called with `{ reportType, startDate, endDate, projectIds?, employeeIds? }`
**When** `reportType` is `PROJECT_COST`
**Then** an `.xlsx` file is returned with columns: Dự án, Khách hàng, Loại, Ngân sách, Chi phí thực tế, Tỷ lệ %, Effort ngân sách (MD), Effort thực tế (MD)

**Given** `reportType` is `PERSONNEL_ALLOCATION`
**When** the report is generated
**Then** columns include: Nhân sự, Level, Dự án, % Allocation, Ngày vào, Ngày ra, Rate

**Given** `reportType` is `TASK_PROGRESS`
**When** the report is generated
**Then** columns include: Dự án, Task, Cấp, Người thực hiện, Trạng thái, Tiến độ %, Deadline, Estimate (MH), Effort thực tế (MH)

**Given** `reportType` is `ALERT_HISTORY`
**When** the report is generated
**Then** columns include: Loại cảnh báo, Tiêu đề, Dự án, Ngày phát sinh, Đã đọc

**Given** the report is generated successfully
**When** the response is returned
**Then** `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
**And** `Content-Disposition: attachment; filename="loop-report-{type}-{date}.xlsx"`

---

### Story 8.4: Web UI — Leadership Dashboard Page

As a Leadership user,
I want a visual dashboard showing the health of all projects and personnel in my scope,
So that I can make informed decisions about the portfolio without drilling into each project.

**Acceptance Criteria:**

**Given** Leadership navigates to Dashboard
**When** the page loads
**Then** a card grid (3 columns on desktop, 2 on tablet) shows key metrics: Tổng dự án (by status), Dự án vượt/sắp vượt ngân sách, Nhân sự rảnh, Nhân sự sắp hết dự án

**Given** the "Dự án vượt ngân sách" card
**When** the user clicks it
**Then** a drawer or expanded panel shows the list of over-budget projects with links

**Given** charts are rendered (Ant Design Charts / AntV G2)
**When** the dashboard loads in dark mode
**Then** chart colors use the dark theme palette (not hardcoded light colors)

**Given** a filter dropdown for org unit scope
**When** Leadership selects a specific sub-unit
**Then** all dashboard metrics update to reflect only that sub-unit's data

---

### Story 8.5: Web UI — PM Project Dashboard & Reports Page

As a PM,
I want a dashboard showing my project's key metrics and a reports page for exports,
So that I have complete visibility and can share data with leadership.

**Acceptance Criteria:**

**Given** the PM opens the project Overview tab
**When** the page loads
**Then** the dashboard shows: tiến độ tổng thể (progress ring), chi phí vs ngân sách (bar/gauge), effort vs ngân sách, active alerts count

**Given** the project overview is rendered
**When** there are active alerts
**Then** an alert strip below the metrics shows the top 3 alerts with type icons and titles

**Given** the PM navigates to Báo cáo
**When** the page loads
**Then** 4 report cards are shown (Project Cost, Personnel Allocation, Task Progress, Alert History)
**And** each card has a "Tạo báo cáo" button

**Given** the PM clicks "Tạo báo cáo" for any report type
**When** a parameter form appears
**Then** relevant params are shown (date range, project selector, employee selector)
**And** clicking "Export Excel" triggers a file download

---

## Epic 9: Mobile App

Member có thể xem task, cập nhật tiến độ, log effort, và nhận push notification trên điện thoại; PM có thể xem cảnh báo khi không ở máy tính.

### Story 9.1: Expo App Shell — Navigation, Auth & Theme

As a mobile user,
I want to log in and navigate the Loop mobile app with a consistent theme,
So that I can access my work from my phone with the same account as the web app.

**Acceptance Criteria:**

**Given** the Expo app is opened for the first time
**When** the app loads
**Then** a login screen is shown with email and password fields
**And** submitting calls `POST /api/v1/auth/login` and stores tokens in Expo SecureStore

**Given** a successful login
**When** the home screen loads
**Then** bottom tab navigation shows: Home | My Tasks | Thông báo | Hồ sơ
**And** each tab icon has the correct label

**Given** the user's OS is set to dark mode
**When** the app initializes
**Then** `useColorScheme()` detects dark mode and applies `MD3DarkTheme` from React Native Paper
**And** status color tokens from UX-DR8 are applied to Chip and Badge components

**Given** an expired access token
**When** any API call returns 401
**Then** the app attempts to refresh using the stored refresh token
**And** if refresh fails, the user is redirected to the login screen and SecureStore tokens are cleared

**Given** TanStack Query is configured (from packages/shared)
**When** the app fetches data
**Then** queries use the shared QueryClient with `staleTime: 60000`

---

### Story 9.2: Mobile — My Tasks Screen

As a Member,
I want to see all my assigned tasks organized by urgency on my phone,
So that I always know what needs attention today.

**Acceptance Criteria:**

**Given** the Member is on the My Tasks tab
**When** the screen loads
**Then** tasks are sorted by deadline (soonest first)
**And** three filter tabs are shown at top: Hôm nay | Quá hạn | Tất cả

**Given** the "Quá hạn" tab is selected
**When** tasks are displayed
**Then** only tasks where `deadline < today` and `status != DONE` are shown
**And** each overdue task has a red badge

**Given** any task in the list
**When** displayed
**Then** each list item shows: tiêu đề, deadline, trạng thái (Chip with color from UX-DR8), dự án tên
**And** all touch targets are ≥ 44×44px

**Given** no tasks exist for the selected filter
**When** the screen renders
**Then** an empty state shows: icon + "Không có task nào" (no CTA since Member cannot create from this screen directly)

---

### Story 9.3: Mobile — Task Detail & Progress Update

As a Member,
I want to update my task progress and log effort in under 3 taps on my phone,
So that keeping task status current doesn't interrupt my work.

**Acceptance Criteria:**

**Given** the Member taps a task in the list
**When** the Task Detail screen opens
**Then** it shows: tiêu đề, mô tả, deadline, trạng thái (Chip), estimate, effort thực tế, task cha (if any)

**Given** the task is a leaf task (no children) and status is TODO or IN_PROGRESS
**When** the detail screen is open
**Then** a progress slider (0–100%, height ≥ 44px, thumb ≥ 24px diameter with expanded hitbox) is shown
**And** an effort input "+X giờ hôm nay" with a numeric keyboard is shown

**Given** the Member adjusts the slider and taps "Lưu"
**When** the save action fires
**Then** TanStack Query optimistic update immediately reflects the new progress in the UI
**And** the API call `PUT /api/v1/tasks/:id/progress` runs in the background
**And** if the API call fails, the UI rolls back with a Snackbar error

**Given** the Member taps "Đánh dấu Done"
**When** the action fires
**Then** `progress_pct` is set to 100 and status transitions to DONE
**And** the task disappears from the "Hôm nay" and "Quá hạn" filter tabs

**Given** the device has no network connection
**When** the screen loads
**Then** a banner "Không có kết nối — dữ liệu có thể chưa cập nhật" is shown at the top

---

### Story 9.4: Mobile — Task Creation (Member, Approval Flow)

As a Member,
I want to create a new task from my phone,
So that I can add work items that need PM approval while on the go.

**Acceptance Criteria:**

**Given** the Member is on My Tasks screen
**When** the FAB (floating action button) is tapped
**Then** a Create Task form sheet opens with fields: tiêu đề (required), mô tả, deadline (date picker), estimate (numeric, max per config), task cha (optional select)

**Given** the form is submitted with valid data
**When** the API call succeeds
**Then** the task is created with `status: PENDING_APPROVAL`
**And** a Snackbar shows: "Task đã gửi cho PM duyệt ✓"
**And** the form closes

**Given** `estimateHours` entered exceeds the configured max (default 4h)
**When** the form is validated on submit
**Then** a warning dialog appears: "Task này ước tính > 4h — bạn có muốn chia nhỏ không?"
**And** two options: "Chia nhỏ" (dismiss form) | "Vẫn gửi" (submit anyway)

---

### Story 9.5: Mobile — Notifications & Push Alerts

As a Member or PM,
I want to receive push notifications on my phone and see all notifications in the app,
So that I am alerted to important events even when the app is closed.

**Acceptance Criteria:**

**Given** the user opens the Thông báo tab
**When** the screen loads
**Then** notifications are listed: icon (by type), tiêu đề, body, thời gian (relative)
**And** unread notifications have a blue dot indicator

**Given** the user taps a notification
**When** the tap is handled
**Then** the notification is marked as read via API
**And** the user navigates to the relevant screen (task detail or project overview)

**Given** the app is opened and the user is logged in
**When** the app registers for push notifications
**Then** `POST /api/v1/notifications/register-token` is called with the Expo push token
**And** the token is stored in `device_tokens` table

**Given** a push notification is sent via FCM while the app is closed
**When** the user taps the notification in the OS notification tray
**Then** the app opens and navigates directly to the relevant entity (deep link)

**Given** the user logs out
**When** logout is processed
**Then** `POST /api/v1/auth/logout` removes the device token from the server

---

## Epic 10: Timesheet & Attendance Management

Nhân sự có thể cập nhật trạng thái công việc chỉ với 1 thao tác trên cả mobile và web; HR/Manager có thể theo dõi chấm công real-time; hệ thống tự động tổng hợp bảng công theo kỳ và hỗ trợ quy trình phê duyệt có escalation tự động.

**FRs covered:** FR-T01 – FR-T06 (Timesheet module mới)
**Research basis:** Market Research 2026-05-25 — Loop Timesheet differentiation strategy
**Key differentiators:** Quick Status Widget (1-tap), Task-linked time entry, Offline-first mobile

---

### Story 10.1: Backend — Timesheet & WorkStatus Schema

As a developer,
I want the Prisma schema to include all timesheet domain models,
So that check-in/out, work status, and timesheet period data are persisted correctly.

**Acceptance Criteria:**

**Given** the Prisma schema is extended for Epic 10
**When** migrations run
**Then** the following models exist:

`WorkStatusType` enum: `WORKING | WFH | MEETING | BREAK | OFF | BUSINESS_TRIP`

`WorkStatus` model (id, userId, statusType, startedAt, endedAt, note, createdAt)
- Index on `(userId, startedAt DESC)` for fast current-status queries

`TimeEntry` model (id, userId, date `@db.Date`, checkInAt, checkOutAt, checkInLat, checkInLng, checkOutLat, checkOutLng, checkInMethod `MANUAL|GPS|WIFI`, isManualCorrection, correctionReason, createdAt)
- Unique constraint on `(userId, date)`

`TimesheetRecord` model (id, userId, periodStart `@db.Date`, periodEnd `@db.Date`, workingDays Decimal, standardDays Decimal, overtimeHours Decimal, leaveDays Decimal, status `DRAFT|SUBMITTED|APPROVED|REJECTED`, submittedAt, approvedAt, approvedById, rejectionReason, lockedAt, createdAt)
- Index on `(userId, periodStart)`

**Given** the `User` model
**When** the migration runs
**Then** `User` has relations to `WorkStatus[]`, `TimeEntry[]`, `TimesheetRecord[]`

**Given** the `Task` model
**When** the migration runs
**Then** `Task` has an optional `timesheetLinked Boolean @default(false)` field

---

### Story 10.2: Backend — Check-in/out & Quick Status API

As an employee,
I want to clock in/out and update my work status quickly via API,
So that my attendance is recorded in real time without friction.

**Acceptance Criteria:**

**Given** a valid JWT
**When** `POST /api/v1/timesheets/checkin` is called with `{ method, lat?, lng?, note? }`
**Then** a `TimeEntry` record is created for today's date with `checkInAt = now()`
**And** if a TimeEntry already exists for today, return `{ statusCode: 409, message: "Đã chấm công vào hôm nay" }`

**Given** a valid JWT with an existing TimeEntry for today (no checkOutAt)
**When** `POST /api/v1/timesheets/checkout` is called with `{ lat?, lng? }`
**Then** `checkOutAt = now()` is set on today's TimeEntry
**And** working hours = `checkOutAt - checkInAt` (in hours, 2 decimal places)

**Given** a valid JWT
**When** `PUT /api/v1/timesheets/status` is called with `{ statusType, note? }`
**Then** the current active `WorkStatus` (no endedAt) is ended: `endedAt = now()`
**And** a new `WorkStatus` record is created with `startedAt = now()` and the requested `statusType`
**And** the response returns `{ currentStatus: WorkStatusType, since: DateTime }`

**Given** a Manager or Leadership JWT
**When** `GET /api/v1/timesheets/team-status` is called
**Then** the response returns real-time status for all users in the caller's org scope: `[{ userId, name, avatarUrl, currentStatus, since, todayCheckIn, todayCheckOut }]`
**And** results are filtered by `orgUnitIds` from OrgScopeInterceptor

**Given** `GET /api/v1/timesheets/me/today`
**When** called with a valid JWT
**Then** returns `{ checkIn, checkOut, currentStatus, workingHours, timeEntries[] }` for today

---

### Story 10.3: Backend — Timesheet Period Calculation Engine

As an HR/C&B staff,
I want the system to automatically calculate working days, overtime, and leave for each period,
So that payroll processing is accurate without manual spreadsheet work.

**Acceptance Criteria:**

**Given** `POST /api/v1/timesheets/period/generate` is called by HR with `{ userId?, periodStart, periodEnd }`
**When** the engine runs
**Then** it iterates Mon–Fri working days in the period (using `WORK_DAYS` from `@loop/shared`)
**And** for each working day: checks TimeEntry (check-in exists = present), checks approved leave (from future LeaveRequest integration — v1 uses manual override), calculates `overtimeHours = max(0, workHours - 8)` per day
**And** creates/upserts a `TimesheetRecord` with `status: DRAFT` for the employee

**Given** `GET /api/v1/timesheets/:userId/period?start=YYYY-MM-DD&end=YYYY-MM-DD`
**When** called
**Then** returns the `TimesheetRecord` with daily breakdown: `[{ date, checkIn, checkOut, workHours, overtimeHours, status: "present"|"absent"|"leave" }]`

**Given** the period includes public holidays (future: holiday calendar config)
**When** the engine calculates `standardDays`
**Then** `standardDays` = total Mon–Fri days in period (v1 — no holiday calendar yet, noted as future enhancement)

**Given** a `TimesheetRecord` has `status: APPROVED`
**When** any TimeEntry in that period is attempted to be modified
**Then** `{ statusCode: 423, message: "Bảng công đã được phê duyệt và khoá" }` is returned

---

### Story 10.4: Backend — Timesheet Approval Workflow & Auto-Escalation

As a Manager,
I want to review and approve employee timesheets, with automatic escalation if I don't act in time,
So that payroll is never delayed due to bottlenecks.

**Acceptance Criteria:**

**Given** an employee calls `POST /api/v1/timesheets/:id/submit`
**When** the `TimesheetRecord` is in `DRAFT` status
**Then** status transitions to `SUBMITTED` and `submittedAt = now()`
**And** a Notification is created for the direct manager: "Nhân viên [tên] đã nộp bảng công tháng [MM/YYYY]"

**Given** a Manager JWT
**When** `POST /api/v1/timesheets/:id/approve` is called
**Then** status transitions to `APPROVED`, `approvedAt = now()`, `approvedById = callerId`
**And** `lockedAt = now()` is set (no further edits allowed)
**And** a Notification is sent to the employee: "Bảng công của bạn đã được phê duyệt"

**Given** a Manager JWT
**When** `POST /api/v1/timesheets/:id/reject` is called with `{ reason }`
**Then** status transitions to `REJECTED` with `rejectionReason` saved
**And** a Notification is sent to the employee including the reason

**Given** a `TimesheetRecord` has been `SUBMITTED` for more than 48 hours without action
**When** the hourly BullMQ alert worker runs
**Then** a reminder Notification is sent to the manager
**And** if the record has been pending for more than 72 hours, an escalation Notification is sent to the manager's manager (one level up in org tree)

**Given** HR calls `GET /api/v1/timesheets/pending-approval`
**When** scoped by orgUnitIds
**Then** returns all `SUBMITTED` records with `{ userId, name, periodStart, periodEnd, submittedAt, hoursAgo }`
**And** records pending > 48h have `isOverdue: true` flag

---

### Story 10.5: Web UI — Quick Status Widget

As an employee,
I want a persistent status button in the app header so I can update my work status in 1 click,
So that my manager always knows what I'm doing without me sending messages.

**Acceptance Criteria:**

**Given** any page is loaded while the user is logged in
**When** the topbar renders
**Then** a `StatusPill` component is visible showing: colored dot + current status label (e.g., "🟢 Đang làm việc")
**And** the pill is positioned between the notification bell and theme toggle

**Given** the user clicks the `StatusPill`
**When** the dropdown opens
**Then** 6 status options are shown as a list with colored icons: Đang làm việc (green), WFH (blue), Họp (orange), Nghỉ trưa (yellow), Công tác (purple), Vắng mặt (grey)
**And** the current active status has a checkmark

**Given** the user selects a new status from the dropdown
**When** `PUT /api/v1/timesheets/status` succeeds
**Then** the `StatusPill` updates immediately (optimistic update)
**And** the dropdown closes
**And** a subtle toast "Đã cập nhật: [status]" appears for 2 seconds (non-blocking)

**Given** the user has not checked in today
**When** the `StatusPill` is clicked
**Then** a "Chấm công vào" option appears at the top of the dropdown as a primary CTA
**And** selecting it calls `POST /api/v1/timesheets/checkin`

**Given** the Manager or Leadership role views the `StatusPill` area
**When** they click "Xem team"
**Then** a popover/drawer shows a mini team-status grid: `[avatar | tên | status badge | since]` for all direct reports
**And** the data refreshes every 60 seconds (same polling interval as notifications)

---

### Story 10.6: Web UI — Employee Timesheet Page

As an employee,
I want to see my attendance calendar and submit my timesheet for approval at end of period,
So that I have full visibility of my work record and can initiate the payroll process.

**Acceptance Criteria:**

**Given** the employee navigates to Chấm công
**When** the page loads
**Then** a monthly calendar view shows each day with: check-in time, check-out time, total hours, and a status badge (Present/Absent/Leave)
**And** days with overtime are highlighted with a distinct color (amber `#FA8C16`)
**And** weekends are shown but greyed out

**Given** the employee clicks on a day in the calendar
**When** a day detail panel opens
**Then** it shows: check-in time, check-out time, work hours, overtime hours, status history (status changes throughout the day)
**And** if the day has no TimeEntry and is in the past (before today), a "Yêu cầu chỉnh sửa" button is shown

**Given** the employee clicks "Yêu cầu chỉnh sửa" on a past day
**When** a form opens with fields: check-in time, check-out time, reason (required)
**Then** submitting sets `isManualCorrection: true` and `correctionReason` on the TimeEntry
**And** the correction is flagged for HR review (status: `DRAFT` again if already submitted)

**Given** the end of period
**When** the employee clicks "Nộp bảng công tháng [MM/YYYY]"
**Then** `POST /api/v1/timesheets/:id/submit` is called
**And** a confirmation dialog summarizes: tổng ngày công, tổng OT, so sánh với chuẩn
**And** after confirmation, the period is locked from employee edits

**Given** the timesheet status is `APPROVED`
**When** the employee views the period
**Then** an approval badge is shown with approver name and date
**And** all fields are read-only

---

### Story 10.7: Web UI — HR/Manager Timesheet Dashboard

As an HR manager or team manager,
I want a dashboard to see all employee timesheets and approve them efficiently,
So that I can process payroll without chasing down individual employees.

**Acceptance Criteria:**

**Given** an HR or Manager navigates to Chấm công → Quản lý
**When** the page loads
**Then** a table shows all employees in scope: tên, tháng, ngày công, OT, trạng thái bảng công (Draft/Submitted/Approved/Rejected)
**And** a filter bar allows: filter by status, filter by period (month picker), search by name

**Given** the manager views the table
**When** there are `SUBMITTED` records pending > 48h
**Then** those rows are highlighted with an amber background and an "⚠ Quá hạn duyệt" badge

**Given** the manager clicks "Duyệt" on a submitted timesheet row
**When** a confirm dialog appears: "Xác nhận duyệt bảng công của [tên] tháng [MM/YYYY]?"
**Then** clicking "Xác nhận" calls `POST /api/v1/timesheets/:id/approve`
**And** the row status updates immediately (optimistic update)

**Given** the manager selects multiple rows (checkboxes)
**When** clicking "Duyệt hàng loạt"
**Then** all selected `SUBMITTED` timesheets are approved in a single batch call
**And** a toast shows: "Đã duyệt X bảng công"

**Given** HR navigates to "Báo cáo chấm công"
**When** selecting month + export
**Then** an Excel file is generated with columns: Mã NV, Họ tên, Phòng ban, Tổng ngày công, Ngày chuẩn, OT (giờ), Ngày nghỉ phép, Trạng thái
**And** the export uses the same xlsx infrastructure as Story 8.3

---

### Story 10.8: Mobile — Quick Status Update (1-Tap)

As an employee on mobile,
I want to update my work status and check in/out with a single tap,
So that keeping my status current takes less than 10 seconds even when I'm on the go.

**Acceptance Criteria:**

**Given** the employee opens the mobile app
**When** any tab is active
**Then** a floating `StatusFAB` (Floating Action Button) is visible at bottom-right
**And** it shows the current status as a colored icon (no label to save space)
**And** the FAB size is ≥ 56×56px (WCAG touch target)

**Given** the employee taps the `StatusFAB`
**When** a Bottom Sheet opens
**Then** 6 status options are shown as large tappable rows (height ≥ 56px each): icon + label + time since last change
**And** the current status has a filled highlight background
**And** the Bottom Sheet can be dismissed by swipe-down or tapping outside

**Given** the employee selects a status from the Bottom Sheet
**When** the API call to `PUT /api/v1/timesheets/status` is made
**Then** an optimistic update immediately changes the FAB icon color
**And** a Snackbar confirms: "Đã cập nhật: [status]"
**And** if the employee hasn't checked in yet, selecting "Đang làm việc" also triggers check-in automatically

**Given** the employee has not checked in today
**When** the Bottom Sheet opens
**Then** a prominent "Chấm công vào" row appears at the TOP of the list (above status options) with a clock icon
**And** tapping it calls `POST /api/v1/timesheets/checkin` with GPS coordinates if permission is granted

**Given** the device location permission is denied
**When** check-in is triggered
**Then** check-in proceeds with `method: MANUAL` (no GPS) without blocking the flow
**And** a non-blocking note: "Không lấy được vị trí — chấm công thủ công" appears

---

### Story 10.9: Mobile — Attendance View & Offline Mode

As an employee on mobile,
I want to view my attendance history and check in/out even without network connection,
So that working at client sites or areas with poor signal doesn't prevent me from tracking attendance.

**Acceptance Criteria:**

**Given** the employee navigates to the Chấm công tab (new bottom tab added after Thông báo)
**When** the screen loads
**Then** a weekly strip calendar shows the current week with: date number, day of week, colored dot (present=green, absent=red, partial=yellow)
**And** a "Hôm nay" summary card shows: check-in time, current status, hours worked so far

**Given** the employee swipes left/right on the weekly strip
**When** weeks change
**Then** previous/next week data loads (cached by TanStack Query)

**Given** the device has no network connection
**When** the employee taps "Chấm công vào" from the StatusFAB Bottom Sheet
**Then** the check-in is saved locally in AsyncStorage with timestamp and GPS (if available)
**And** the StatusFAB updates to show "Đang làm việc" immediately (offline optimistic)
**And** a banner "Ngoại tuyến — dữ liệu sẽ đồng bộ khi có mạng" appears

**Given** the device reconnects to the network
**When** the app detects connectivity change
**Then** all pending offline actions are flushed to the API in chronological order
**And** the banner disappears
**And** a toast "Đã đồng bộ X hành động" confirms success

**Given** the employee taps on any day in the weekly strip
**When** a bottom sheet opens for that day
**Then** it shows: check-in, check-out, work hours, status timeline (list of status changes with times)
**And** if the day is in the past and has no check-in, a "Báo thiếu chấm công" button submits a correction request

---

## Epic 11: Telegram Integration (v2)

Team nhận thông báo task mới và cảnh báo deadline trực tiếp trong Telegram group; thành viên có thể cập nhật trạng thái task bằng nút inline mà không cần mở Loop — hoạt động hoàn toàn trên mạng nội bộ (on-premise) nhờ cơ chế long-polling.

**Điều kiện tiên quyết (Prerequisites):**
- Epic 5 (Task Management) phải hoàn thành — Telegram gọi `TasksService.updateStatus()`
- Epic 7 (Alerts) phải hoàn thành — Telegram mở rộng `AlertSchedulerService`
- Epic 1 (Infrastructure) phải hoàn thành — Redis/BullMQ đã có

**Quyết định kiến trúc chốt:**
- Cơ chế: Long-polling (`getUpdates?timeout=30`) — không cần public IP, hoạt động on-premise
- Module độc lập: `src/modules/integrations/telegram/` — không sửa v1 modules, chỉ hook vào
- Auth model: Telegram group là trusted internal channel; update được log với attribution "via Telegram"
- Callback format: `task:{action}:{taskId}` (ví dụ: `task:done:clx123abc`)

---

### Story 11.1: Backend — Telegram Bot Module & Configuration API

As a system administrator,
I want to configure a Telegram bot token and chat ID through the Loop admin interface,
So that the integration can be enabled per org unit without code changes or server restarts.

**Acceptance Criteria:**

**Given** the Prisma `AlertConfig` model is extended
**When** migrations run
**Then** the `alert_configs` table gains three new nullable columns:
- `telegram_bot_token String?`
- `telegram_chat_id String?`
- `telegram_enabled Boolean @default(false)`

**Given** the NestJS application structure
**When** Epic 11 is implemented
**Then** a new module exists at `src/modules/integrations/telegram/` containing:
- `telegram.module.ts`
- `telegram.service.ts` — HTTP wrapper around Telegram Bot API
- `telegram-poller.service.ts` — long-poll loop
- `telegram-card.builder.ts` — builds MarkdownV2 card + InlineKeyboard

**Given** `TelegramService` is initialized
**When** `sendMessage(chatId, text, replyMarkup?)` is called
**Then** it calls `POST https://api.telegram.org/bot{token}/sendMessage` with `parse_mode: MarkdownV2`
**And** if the call fails (network error or invalid token), the error is caught and logged via Pino — it does NOT throw and does NOT break the caller flow

**Given** a valid PM or Admin JWT
**When** `PUT /api/v1/alert-config/telegram` is called with `{ telegramBotToken, telegramChatId, telegramEnabled }`
**Then** the `AlertConfig` for the caller's org unit is upserted with the new Telegram fields
**And** the response returns the updated config (with `telegramBotToken` masked as `"***"` after the first 8 chars)

**Given** a valid PM JWT
**When** `POST /api/v1/alert-config/telegram/test` is called
**Then** `TelegramService` sends a test message to the configured chat: `"✅ Loop đã kết nối thành công với Telegram\! Org: {orgUnitName}"`
**And** the response returns `{ success: true, message: "Tin nhắn thử nghiệm đã được gửi" }`
**And** if the token or chat ID is invalid, `{ success: false, error: "..." }` is returned (no 5xx)

**Given** `telegramEnabled: false` in `AlertConfig`
**When** any Telegram delivery method is called
**Then** the method returns early without making any API call (feature flag respected)

---

### Story 11.2: Backend — Push Notification on Task Created & Deadline Alert

As a team member,
I want to receive a Telegram message with task details and action buttons when a new task is assigned to me or when my task deadline is approaching,
So that I am notified in the tool I already use without opening the Loop web app.

**Acceptance Criteria:**

**Given** `TelegramCardBuilder` is implemented
**When** `buildTaskCard(task, event)` is called with event type `NEW_TASK` or `DEADLINE_ALERT`
**Then** the card text is formatted in Telegram MarkdownV2:
```
📌 *\[LOOP\]* Task mới được tạo
*TSK\-{taskId\_short}* — {task\.title\_escaped}
👤 Thực hiện: {assignee\.name\_escaped}
📅 Hạn: {deadline\_formatted} \({daysLeft} ngày\)
📊 Tiến độ: {progress}% \| Dự án: {project\.name\_escaped}
```
**And** an `InlineKeyboardMarkup` is attached with 3 buttons in one row:
- `[✅ Hoàn thành]` → callback_data: `task:done:{taskId}`
- `[🔄 Đang làm]` → callback_data: `task:inprogress:{taskId}`
- `[↩️ Trả lại]` → callback_data: `task:return:{taskId}`

**Given** a PM creates a task via `POST /api/v1/projects/:id/tasks`
**When** `TasksService.create()` completes successfully and the task has an `assigneeId`
**Then** `TelegramService.sendTaskCard(task, 'NEW_TASK')` is called asynchronously (non-blocking, fire-and-forget)
**And** if `telegramEnabled: false`, the call is skipped

**Given** the `AlertSchedulerService` BullMQ worker runs the `CHECK_TASK_ALERTS` job
**When** a task is detected as "sắp đến hạn" (within `taskDueDays` config) or "quá hạn"
**Then** alongside the existing in-app + email + FCM delivery, `TelegramService.sendTaskCard(task, 'DEADLINE_ALERT')` is called
**And** the Telegram delivery is fire-and-forget (failure does not affect other channels)
**And** deduplication applies: if a Telegram alert for the same `(taskId, alertType, date)` was already sent today, skip

**Given** a task has no assignee (`assigneeId: null`)
**When** task creation completes
**Then** the Telegram push is skipped (no card sent — nothing to route to)

**Given** the configured `telegramChatId` is a Telegram group/channel
**When** a task card is sent
**Then** all messages go to that single configured chat ID (group broadcast model, not DM per user)

---

### Story 11.3: Backend — Telegram Long-Polling Worker & Status Update Handler

As a team member,
I want to tap an action button in the Telegram task card and have Loop update the task status automatically,
So that I can update task progress without switching apps.

**Acceptance Criteria:**

**Given** `TelegramPollerService` is a NestJS provider with `OnModuleInit`
**When** the NestJS application starts and `telegramEnabled: true` for any org unit
**Then** the poller starts a long-poll loop: `GET https://api.telegram.org/bot{token}/getUpdates?timeout=30&offset={lastUpdateId+1}`
**And** the loop runs continuously: when a response arrives (or times out), it immediately starts the next request
**And** `lastUpdateId` is tracked in-memory (reset to 0 on restart — acceptable for this use case)

**Given** the poller receives a response from `getUpdates`
**When** the `updates` array contains a `callback_query`
**Then** the callback data is parsed: `task:{action}:{taskId}` where action is `done | inprogress | return`
**And** `taskId` is extracted and validated (cuid format check)

**Given** a valid `task:done:{taskId}` callback is received
**When** `TasksService.updateStatus(taskId, TaskStatus.DONE, { source: 'telegram' })` is called
**Then** the task status is updated in the database
**And** `TelegramService.answerCallbackQuery(callbackQueryId, "✅ Task đã được đánh dấu Hoàn thành")` is called within 10 seconds (Telegram timeout)
**And** the original card message is edited: the 3 action buttons are removed and a ✅ status line is appended: `_Cập nhật: Hoàn thành — {timestamp}_`

**Given** a valid `task:inprogress:{taskId}` callback
**When** processed
**Then** task status updates to `IN_PROGRESS`
**And** callback answer: `"🔄 Task đã chuyển sang Đang làm"`
**And** card message edited accordingly

**Given** a valid `task:return:{taskId}` callback
**When** processed
**Then** task status updates to `RETURNED` with `returnReason: "Trả lại qua Telegram"`
**And** callback answer: `"↩️ Task đã được Trả lại"`
**And** card message edited accordingly

**Given** a `taskId` in the callback that does not exist in the database
**When** lookup fails
**Then** `answerCallbackQuery(id, "❌ Không tìm thấy task này")` is called
**And** no database write occurs

**Given** a callback_query callback is received for a task already in `DONE` or `CANCELLED` status
**When** any action is attempted
**Then** `answerCallbackQuery(id, "ℹ️ Task này đã ở trạng thái {currentStatus}")` is called
**And** no status change is made

**Given** the application has multiple org units with different Telegram configurations
**When** the poller starts
**Then** one poller instance runs per unique `telegramBotToken` found in enabled `AlertConfig` records
**And** each poller instance handles callbacks only for tasks belonging to its org unit's scope

**Given** a network error or Telegram API timeout during polling
**When** the error occurs
**Then** the poller waits 5 seconds (backoff) then restarts the loop
**And** the error is logged via Pino at `warn` level (not `error` — transient network issues are expected)

---

### Story 11.4: Web UI — Telegram Integration Settings Section

As a PM or Admin,
I want to configure and test the Telegram integration from the Loop settings page,
So that I can set up the bot without needing to edit server config files or restart services.

**Acceptance Criteria:**

**Given** the PM or Admin navigates to Settings → Cảnh báo
**When** the page loads (extending Story 7.7's settings page)
**Then** a new "Tích hợp Telegram" section is visible below the alert threshold form
**And** the section contains:
- Toggle: "Bật thông báo Telegram" (switch, default off)
- Input: "Bot Token" (password-type input, masked; placeholder: `123456789:ABCdef...`)
- Input: "Chat ID" (text input; placeholder: `-100123456789`)
- Info text: "Tạo bot tại @BotFather · Lấy Chat ID bằng cách thêm @userinfobot vào group"
- Button: "Gửi tin thử nghiệm" (disabled until both token and chat ID are filled)
- Button: "Lưu cấu hình" (primary)

**Given** the PM fills in a valid Bot Token and Chat ID and clicks "Gửi tin thử nghiệm"
**When** `POST /api/v1/alert-config/telegram/test` returns `{ success: true }`
**Then** a success alert shows: `"✅ Tin nhắn thử nghiệm đã được gửi — kiểm tra Telegram group của bạn"`

**Given** `POST /api/v1/alert-config/telegram/test` returns `{ success: false, error: "..." }`
**When** the response arrives
**Then** an error alert shows: `"❌ Không thể gửi tin — kiểm tra lại Bot Token và Chat ID"`

**Given** the PM clicks "Lưu cấu hình"
**When** `PUT /api/v1/alert-config/telegram` succeeds
**Then** a success toast "Đã lưu cấu hình Telegram" appears
**And** the Bot Token field re-masks to show only first 8 characters + `"***"`

**Given** the Telegram toggle is turned off and saved
**When** the settings are persisted
**Then** `telegramEnabled: false` is saved for the org unit
**And** the Bot Token and Chat ID fields become greyed out (disabled) but their values are preserved

**Given** a non-Admin, non-PM role navigates to the settings page
**When** the page renders
**Then** the Telegram section is not visible (hidden, not just disabled)

---

## Epic 12: BPM — Business Process Management

Admin có thể thiết kế quy trình nghiệp vụ dạng BPMN 2.0 bằng visual modeler kéo thả; PM có thể khởi động process instance, theo dõi tiến độ từng bước qua token overlay, và xem user tasks cần xử lý — toàn bộ chạy trong NestJS monorepo hiện tại, không thêm service mới.

**Dependency:** Epic 1 (Foundation), Epic 2 (OrgScopeGuard), Epic 7 (Notification delivery)

---

### Story 12.1: BPM Dependencies & Prisma Migration

As a developer,
I want the BPM module dependencies installed and database schema migrated,
So that all subsequent BPM stories have a stable foundation to build on.

**Acceptance Criteria:**

**Given** `apps/backend/package.json`
**When** `pnpm install` runs after adding the dependency
**Then** `bpmn-engine` is listed as a dependency and resolvable at runtime

**Given** `apps/web/package.json`
**When** `pnpm install` runs after adding the dependencies
**Then** `bpmn-js` and `@bpmn-io/properties-panel` are listed and resolvable

**Given** the Prisma schema has been extended with BPM models
**When** `npx prisma migrate dev` runs
**Then** four new tables are created: `process_definitions`, `process_instances`, `process_user_tasks`, `process_activity_logs`
**And** three new enums are created: `DefinitionStatus`, `InstanceStatus`, `UserTaskStatus`
**And** all foreign keys and indexes specified in the architecture are present

**Given** the migration has run
**When** the developer inspects `process_definitions`
**Then** the table has columns: `id`, `name`, `description`, `version`, `bpmn_xml` (TEXT), `org_unit_id`, `status`, `created_at`, `updated_at`

**Given** the migration has run
**When** the developer inspects `process_instances`
**Then** the table has columns: `id`, `definition_id`, `project_id` (nullable), `started_by`, `status`, `variables` (JSONB), `token_state` (JSONB), `started_at`, `completed_at`

**Given** all BPM tables exist
**When** the developer runs `npx prisma validate`
**Then** no schema errors are reported

---

### Story 12.2: Process Definitions CRUD & Versioning

As an Admin,
I want to create, edit, and publish BPMN process definitions,
So that I can design standard workflows that PMs can later instantiate.

**Acceptance Criteria:**

**Given** an Admin authenticated user
**When** `POST /api/v1/processes/definitions` is called with `{ name, description, bpmnXml, orgUnitId }`
**Then** a new `ProcessDefinition` is created with `status: DRAFT`, `version: 1`
**And** the response returns `{ data: { id, name, version, status, orgUnitId, createdAt } }`

**Given** an existing DRAFT definition
**When** `PUT /api/v1/processes/definitions/:id` is called with updated `bpmnXml`
**Then** the definition's `bpmnXml` and `updatedAt` are updated in place (DRAFT can be edited)
**And** `version` remains unchanged

**Given** an existing DRAFT definition
**When** `PATCH /api/v1/processes/definitions/:id/status` is called with `{ status: "ACTIVE" }`
**Then** the definition transitions to `ACTIVE`
**And** the definition can no longer be edited in place (subsequent edits create a new version)

**Given** an existing ACTIVE definition
**When** `PUT /api/v1/processes/definitions/:id` is called
**Then** a new `ProcessDefinition` record is created with `version: (current + 1)`, `status: DRAFT`
**And** the original ACTIVE definition transitions to `DEPRECATED`
**And** the response returns the new draft's `{ id, version, status }`

**Given** `GET /api/v1/processes/definitions` is called
**When** the OrgScopeGuard resolves `orgUnitIds[]`
**Then** only definitions where `orgUnitId IN (orgUnitIds)` are returned
**And** results are paginated using the standard `{ data: [...], meta: { total, page, pageSize } }` format

**Given** a non-Admin user
**When** `POST /api/v1/processes/definitions` is called
**Then** the response is `{ statusCode: 403, message: "Forbidden" }`

---

### Story 12.3: BPMN Engine Service — Execution & State Persistence

As a developer,
I want a `BpmnEngineService` that wraps `bpmn-engine` with mandatory state persistence,
So that process instances survive server restarts and their execution can be resumed accurately.

**Acceptance Criteria:**

**Given** a valid BPMN 2.0 XML string
**When** `BpmnEngineService.start(bpmnXml, variables)` is called
**Then** `bpmn-engine` parses the XML and begins execution
**And** the initial `tokenState` is serialized to JSON immediately after the first token placement
**And** the serialized state is returned to the caller for persistence in `ProcessInstance.tokenState`

**Given** a `ProcessInstance` with a saved `tokenState`
**When** the server restarts and `BpmnEngineService.resume(tokenState, bpmnXml)` is called
**Then** execution resumes from exactly the saved token position
**And** pending User Tasks and Timer Events are re-registered correctly

**Given** an execution reaches a User Task element
**When** the engine emits a `wait` event for the User Task
**Then** `BpmnEngineService` captures `{ activityId, name, assigneeId?, candidateRoles? }` from the BPMN element's extension attributes
**And** a `ProcessUserTask` record is created with `status: PENDING`
**And** the `tokenState` is serialized and persisted before returning control

**Given** an execution reaches an Exclusive Gateway (XOR)
**When** the engine evaluates the outgoing sequence flow conditions
**Then** the condition expression is evaluated against `ProcessInstance.variables`
**And** exactly one outgoing path is taken
**And** `tokenState` is persisted after the gateway resolves

**Given** `BpmnEngineService` encounters an unsupported BPMN element (e.g. sub-process)
**When** execution reaches that element
**Then** the `ProcessInstance.status` is set to `ERROR`
**And** the error is logged via Pino at `error` level with `{ instanceId, activityId, reason: "Unsupported element type" }`

**Given** a Parallel Gateway (AND split)
**When** the engine splits into multiple parallel paths
**Then** all active tokens are included in the serialized `tokenState`
**And** all resulting parallel User Tasks are created simultaneously as separate `ProcessUserTask` records

---

### Story 12.4: Process Instance Lifecycle

As a PM,
I want to start, monitor, and cancel process instances linked to projects,
So that I can track the execution of standard workflows associated with my projects.

**Acceptance Criteria:**

**Given** an ACTIVE `ProcessDefinition`
**When** `POST /api/v1/processes/instances` is called with `{ definitionId, projectId?, variables? }`
**Then** a `ProcessInstance` is created with `status: RUNNING`, `startedBy: currentUser.id`
**And** `BpmnEngineService.start()` is called with a snapshot of the definition's `bpmnXml`
**And** the initial `tokenState` is persisted to the new instance record
**And** the response returns `{ data: { id, definitionId, status, startedAt, projectId? } }`

**Given** a RUNNING `ProcessInstance`
**When** `GET /api/v1/processes/instances/:id` is called
**Then** the response includes `{ id, status, variables, tokenState, startedAt, definition: { name, version } }`
**And** `tokenState` includes the list of currently active `activityIds` for the frontend overlay

**Given** a RUNNING `ProcessInstance`
**When** `PATCH /api/v1/processes/instances/:id/cancel` is called by the PM who started it (or an Admin)
**Then** the instance `status` is set to `CANCELLED` and `completedAt` is set to now
**And** all PENDING `ProcessUserTask` records for the instance are set to `SKIPPED`
**And** the BullMQ timer jobs for the instance are removed from the queue

**Given** all activities in a `ProcessInstance` have completed
**When** the engine emits an `end` event
**Then** `ProcessInstance.status` is set to `COMPLETED` and `completedAt` is set to now

**Given** `GET /api/v1/processes/instances` is called with optional `?status=RUNNING&definitionId=xxx`
**When** the OrgScopeGuard resolves `orgUnitIds[]`
**Then** only instances whose `definition.orgUnitId IN (orgUnitIds)` are returned
**And** filter params are applied correctly

**Given** a DRAFT or DEPRECATED `ProcessDefinition`
**When** `POST /api/v1/processes/instances` is called with that `definitionId`
**Then** the response is `{ statusCode: 422, message: "Chỉ có thể khởi động process từ definition đang ACTIVE" }`

---

### Story 12.5: User Tasks — Assignment, Claim & Completion

As a Member or PM,
I want to see tasks assigned to me from running processes, claim unassigned tasks, and complete them with form data,
So that I can participate in structured workflows without needing to know the full process design.

**Acceptance Criteria:**

**Given** a `ProcessUserTask` with `assigneeId = currentUser.id`
**When** `GET /api/v1/processes/user-tasks` is called
**Then** the response includes that task with `{ id, name, instanceId, status, dueDate?, assigneeId }`

**Given** a `ProcessUserTask` with `candidateRoles: ["PM"]` and no `assigneeId`
**When** `GET /api/v1/processes/user-tasks` is called by a PM user
**Then** the unassigned task appears in the response (visible to all PMs in the org scope)

**Given** an unassigned User Task with matching `candidateRoles`
**When** `PATCH /api/v1/processes/user-tasks/:id/claim` is called
**Then** `assigneeId` is set to `currentUser.id` and `status` is set to `IN_PROGRESS`
**And** the task no longer appears in other users' candidate task lists

**Given** an IN_PROGRESS User Task assigned to the current user
**When** `POST /api/v1/processes/user-tasks/:id/complete` is called with `{ formData: {...} }`
**Then** `ProcessUserTask.formData` is saved, `status` set to `COMPLETED`, `completedAt` set to now
**And** `formData` values are merged into `ProcessInstance.variables`
**And** `BpmnEngineService` is notified to continue execution from that activity
**And** the updated `tokenState` is persisted immediately after continuation

**Given** a User Task that is already `COMPLETED`
**When** `POST /api/v1/processes/user-tasks/:id/complete` is called again
**Then** the response is `{ statusCode: 422, message: "Task này đã được hoàn thành" }`

**Given** a User Task assigned to `currentUser` in `IN_PROGRESS`
**When** `POST /api/v1/processes/user-tasks/:id/return` is called
**Then** `assigneeId` is cleared, `status` reverts to `PENDING`, `candidateRoles` is preserved
**And** the task reappears in the candidate queue for eligible users

**Given** a new `ProcessUserTask` is created for an `assigneeId`
**When** the task record is inserted
**Then** `NotificationDeliveryService.sendInApp()` is called with `{ userId: assigneeId, type: "PROCESS_TASK_ASSIGNED", message: "Bạn có một task mới trong quy trình: {taskName}" }`

---

### Story 12.6: Timer Events & Notification Integration

As a system,
I want timer boundary events to fire automatically via BullMQ and user task assignments to trigger in-app notifications,
So that processes advance on schedule without manual intervention.

**Acceptance Criteria:**

**Given** a BPMN Timer Boundary Event on a User Task with `timeDuration: PT48H` (48 hours)
**When** the User Task enters `PENDING` status
**Then** `TimerEventService` enqueues a BullMQ job in the `process-timers` queue with `delay: 172800000` (ms)
**And** the job payload contains `{ instanceId, activityId, timerType: "boundary" }`

**Given** the BullMQ timer job fires after the specified delay
**When** the `process-timers` worker processes the job
**Then** `BpmnEngineService` triggers the boundary event for the specified activity
**And** the cancelled User Task's `status` is set to `SKIPPED`
**And** the `tokenState` is persisted after the boundary event transition

**Given** a process instance is cancelled while a timer job is pending
**When** `PATCH /instances/:id/cancel` completes
**Then** all BullMQ jobs with `instanceId` matching the cancelled instance are removed from `process-timers` queue

**Given** `process-timers` is a dedicated BullMQ queue
**When** `processes.module.ts` registers the queue
**Then** it uses queue name `"process-timers"` (distinct from `"alert-queue"` used by Epic 7)
**And** the queue has `removeOnComplete: true` and `removeOnFail: false` settings

**Given** a new `ProcessUserTask` is created with a non-null `assigneeId`
**When** the task is persisted to the database
**Then** `NotificationDeliveryService` (from Epic 7) is called to send an in-app notification to the assignee
**And** the notification `type` is `"PROCESS_TASK_ASSIGNED"`
**And** no email or push notification is sent at this stage (in-app only for v1)

---

### Story 12.7: Frontend — BPMN Modeler (Admin)

As an Admin,
I want a visual BPMN modeler in the web app where I can design, save, and publish process definitions,
So that I can create and manage workflows without writing XML manually.

**Acceptance Criteria:**

**Given** the Admin navigates to `/processes`
**When** the page loads
**Then** a list of `ProcessDefinition` records (scoped to Admin's org unit) is displayed in an Ant Design Table
**And** each row shows: Name, Version, Status badge, Created date, and actions (Edit / Start Instance / Deprecate)
**And** a "Tạo quy trình mới" primary button is visible

**Given** the Admin clicks "Tạo quy trình mới" or "Edit" on an existing DRAFT
**When** `/processes/modeler/:id` loads (or `/processes/modeler/new` for new)
**Then** the `BpmnModeler.tsx` component renders a full-width, min-600px-height BPMN canvas using `bpmn-js`
**And** the canvas is pre-loaded with the existing `bpmnXml` if editing, or a default blank BPMN template if new
**And** a properties panel is visible on the right side

**Given** the Admin edits the BPMN diagram (adds tasks, gateways, etc.)
**When** the Admin clicks "Lưu bản nháp"
**Then** `bpmn-js` exports the current diagram as BPMN XML via `modeler.saveXML()`
**And** `PUT /api/v1/processes/definitions/:id` (or `POST` for new) is called with the XML string
**And** a success toast "Đã lưu bản nháp" appears

**Given** a saved DRAFT definition on the modeler page
**When** the Admin clicks "Xuất bản (Publish)"
**Then** a confirm dialog appears: "Sau khi xuất bản, định nghĩa này không thể chỉnh sửa trực tiếp. Tiếp tục?"
**And** on confirm, `PATCH /api/v1/processes/definitions/:id/status` is called with `{ status: "ACTIVE" }`
**And** the page redirects to `/processes` with a success toast "Quy trình đã được xuất bản"

**Given** `BpmnModeler.tsx` wraps `bpmn-js`
**When** the component mounts
**Then** it initializes `BpmnModeler` from `bpmn-js` in a `useEffect` with a `containerRef`
**And** it exposes a `onSave(bpmnXml: string)` callback prop called when saving
**And** the canvas background matches the Ant Design dark theme (`#141414`)

**Given** the Admin opens the modeler for an ACTIVE or DEPRECATED definition
**When** the canvas renders
**Then** it uses the read-only `BpmnViewer` (not `BpmnModeler`) — no editing allowed
**And** a banner shows "Định nghĩa này đang ACTIVE — tạo phiên bản mới để chỉnh sửa"

---

### Story 12.8: Frontend — Process Monitoring & User Task Inbox

As a PM,
I want to start process instances, monitor their live status on the BPMN diagram, and manage my user task inbox,
So that I can oversee workflow execution and act on tasks assigned to me without switching tools.

**Acceptance Criteria:**

**Given** the PM navigates to `/processes` and selects an ACTIVE definition
**When** the PM clicks "Khởi động instance mới"
**Then** a modal opens with fields: "Gắn với dự án" (optional Project selector, org-scoped), "Biến khởi động" (optional JSON textarea)
**And** on submit, `POST /api/v1/processes/instances` is called
**And** on success the modal closes and the PM is redirected to `/processes/instances/:newId`

**Given** the PM navigates to `/processes/instances/:id`
**When** the page loads
**Then** `BpmnViewer.tsx` renders the instance's definition BPMN diagram in read-only mode
**And** active BPMN elements (from `instance.tokenState.activeActivityIds`) are highlighted with a blue overlay (`#1677FF` fill, 0.3 opacity) via `bpmn-js` overlays API
**And** the page auto-refreshes the instance data every 10 seconds via TanStack Query `refetchInterval: 10000`

**Given** the instance data refreshes
**When** `tokenState.activeActivityIds` changes (a step completed)
**Then** the overlay highlights update to reflect the new active activities
**And** the previous highlights are removed

**Given** the PM navigates to `/processes/instances`
**When** the page loads
**Then** a table lists all instances scoped to the PM's org unit
**And** columns show: Process Name, Version, Status badge, Started by, Started at, Linked Project
**And** filters for Status and Definition are available

**Given** any authenticated user navigates to `/processes/user-tasks` (or a "Hộp thư task" inbox section)
**When** the page loads
**Then** `GET /api/v1/processes/user-tasks` is called and the response is displayed
**And** tasks assigned to `currentUser` (status IN_PROGRESS or PENDING) are shown
**And** candidate tasks (matching user's role, no assignee) are shown in a separate "Có thể nhận" section

**Given** the user clicks a User Task row
**When** the task detail panel opens
**Then** it shows: Task name, Instance link, Due date (if set), current Status
**And** action buttons: "Nhận task" (if unassigned) or "Hoàn thành" + "Trả lại" (if assigned to current user)

**Given** the user clicks "Hoàn thành" on an assigned task
**When** the completion form submits
**Then** `POST /api/v1/processes/user-tasks/:id/complete` is called with any `formData`
**And** on success a toast "Task đã hoàn thành — quy trình tiếp tục" appears
**And** the task list refreshes to reflect the updated status

---

## Epic 13: Bug & Issue Tracking

Bất kỳ thành viên nào cũng có thể log bug với đầy đủ context (project, task(s) liên quan, severity, ảnh đính kèm); PM và assignee theo dõi và xử lý qua workflow đơn giản; toàn bộ bug của hệ thống hiển thị trong view tập trung có filter, "My Bugs" cá nhân, và dashboard thống kê.

### Story 13.1: Backend — Bug Schema & Prisma Migration

As a developer,
I want the Prisma schema to include all Bug domain models,
So that bugs, their task links, and file attachments are persisted correctly.

**Acceptance Criteria:**

**Given** the Prisma schema is extended for Epic 13
**When** migrations run
**Then** the following models exist:

`BugSeverity` enum: `CRITICAL | HIGH | MEDIUM | LOW`

`BugStatus` enum: `OPEN | IN_PROGRESS | RESOLVED | CLOSED | CANCELLED`

`Bug` model (id, projectId, title, description?, severity `BugSeverity`, status `BugStatus @default(OPEN)`, reporterId, assigneeId?, resolvedAt?, closedAt?, createdAt, updatedAt)
- Index on `(projectId, status)`
- Index on `(assigneeId, status)`

`BugTask` join table (bugId, taskId) — composite primary key `(bugId, taskId)`

`BugAttachment` model (id, bugId, fileName, fileSize, mimeType, storagePath, uploadedById, createdAt)
- Index on `(bugId)`

**Given** the `Bug` model
**When** migration runs
**Then** `Bug` has foreign keys to `Project`, `User` (reporter), `User` (assignee optional), and relations `tasks BugTask[]`, `attachments BugAttachment[]`

**Given** `BugTask`
**When** a task is deleted
**Then** cascading delete removes all `BugTask` records referencing that task

---

### Story 13.2: Backend — Bug CRUD & Lifecycle API

As any authenticated user,
I want to create, read, update, and transition bugs through their lifecycle,
So that bugs are tracked from discovery to resolution.

**Acceptance Criteria:**

**Given** a valid JWT (any role)
**When** `POST /api/v1/bugs` is called with `{ projectId, taskIds[], title, severity, description?, assigneeId? }`
**Then** a `Bug` record is created with `status: OPEN`, `reporterId = caller.id`
**And** `taskIds` must all belong to `projectId`; any invalid taskId returns `{ statusCode: 400, message: "Task không thuộc dự án này" }`
**And** `BugTask` records are created for each taskId

**Given** a valid JWT
**When** `GET /api/v1/bugs` is called with optional filters `?projectId=&status=&severity=&assigneeId=&reporterId=&taskId=&dateFrom=&dateTo=&page=&pageSize=`
**Then** results are scoped by `orgUnitIds` (OrgScopeInterceptor)
**And** pagination metadata `{ total, page, pageSize }` is included

**Given** a valid JWT
**When** `GET /api/v1/bugs/my` is called
**Then** only bugs where `assigneeId = caller.id` are returned
**And** results are sorted by severity (CRITICAL first), then `createdAt DESC`

**Given** a valid JWT
**When** `GET /api/v1/bugs/:id` is called
**Then** the response includes `{ ...bug, tasks[], attachments[], reporter, assignee }`

**Given** a valid PM or reporter JWT
**When** `PUT /api/v1/bugs/:id` is called with `{ title?, description?, severity?, assigneeId? }`
**Then** only `OPEN` or `IN_PROGRESS` bugs can be updated; `CLOSED` or `CANCELLED` bugs return `{ statusCode: 422, message: "Bug đã đóng, không thể chỉnh sửa" }`

**Given** a valid JWT
**When** `POST /api/v1/bugs/:id/transition` is called with `{ toStatus }`
**Then** valid transitions are enforced:
- `OPEN → IN_PROGRESS` (assignee or PM)
- `IN_PROGRESS → RESOLVED` (assignee or PM)
- `RESOLVED → CLOSED` (reporter or PM)
- `RESOLVED → OPEN` (reporter re-opens, if not satisfied)
- Any non-CLOSED status → `CANCELLED` (PM only)
**And** invalid transitions return `{ statusCode: 422, message: "Chuyển trạng thái không hợp lệ" }`
**And** `resolvedAt` is set when transitioning to `RESOLVED`; `closedAt` when transitioning to `CLOSED`

**Given** a valid PM JWT
**When** `PUT /api/v1/bugs/:id/assign` is called with `{ assigneeId }`
**Then** the bug's `assigneeId` is updated
**And** a notification is triggered for the new assignee (see Story 13.9)

**Given** a valid JWT
**When** `POST /api/v1/bugs/:id/tasks` is called with `{ taskId }`
**Then** a `BugTask` record is created if not already linked
**And** the task must belong to the same project; otherwise `{ statusCode: 400 }`

**Given** a valid JWT
**When** `DELETE /api/v1/bugs/:id/tasks/:taskId` is called
**Then** the `BugTask` record is deleted
**And** at least 1 task must remain linked; deleting the last task returns `{ statusCode: 400, message: "Bug phải có ít nhất 1 task liên kết" }`

---

### Story 13.3: Backend — File Attachment Service (MinIO)

As a developer,
I want MinIO integrated as the object storage backend for bug attachments,
So that screenshots and images are stored reliably on-premise without external dependencies.

**Acceptance Criteria:**

**Given** the Docker Compose file is updated
**When** `docker-compose up` runs
**Then** a `minio` service starts using image `minio/minio`
**And** MinIO is accessible only from internal services (no public port exposed)
**And** a `loop-bug-attachments` bucket is auto-created on first startup via init script
**And** MinIO credentials are configured via environment variables `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`

**Given** a valid JWT
**When** `POST /api/v1/bugs/:id/attachments` is called with a multipart file upload
**Then** the file mime type is validated against `image/*`; non-image files return `{ statusCode: 400, message: "Chỉ chấp nhận file ảnh" }`
**And** file size is validated ≤ 10MB; oversized files return `{ statusCode: 400, message: "File không được vượt quá 10MB" }`
**And** if the bug already has 5 attachments, return `{ statusCode: 400, message: "Tối đa 5 ảnh đính kèm mỗi bug" }`
**And** the file is uploaded to MinIO bucket `loop-bug-attachments` with key `{bugId}/{uuid}.{ext}`
**And** a `BugAttachment` record is created with `storagePath`, `fileName`, `fileSize`, `mimeType`, `uploadedById`

**Given** a valid JWT
**When** `GET /api/v1/bugs/:id/attachments/:attachmentId/url` is called
**Then** a MinIO presigned GET URL is returned with TTL 1 hour
**And** the response is `{ url: "...", expiresAt: "ISO8601" }`

**Given** a valid JWT (uploader or PM)
**When** `DELETE /api/v1/bugs/:id/attachments/:attachmentId` is called
**Then** the file is deleted from MinIO
**And** the `BugAttachment` record is deleted from the database

**Given** a bug is deleted (future soft-delete)
**When** the deletion is processed
**Then** all associated MinIO objects are also removed (cleanup job)

---

### Story 13.4: Backend — Bug Statistics API

As a PM or Leadership,
I want a bug statistics API,
So that the dashboard can display aggregated bug metrics without multiple round trips.

**Acceptance Criteria:**

**Given** a valid JWT (PM, Leadership, or Admin)
**When** `GET /api/v1/bugs/stats` is called with optional `?projectId=&dateFrom=&dateTo=`
**Then** the response includes (all values scoped by orgUnitIds):

```json
{
  "byStatus": { "open": N, "inProgress": N, "resolved": N, "closed": N, "cancelled": N },
  "bySeverity": { "critical": N, "high": N, "medium": N, "low": N },
  "openByProject": [{ "projectId", "projectName", "open", "critical" }],
  "openByTask": [{ "taskId", "taskTitle", "projectName", "count" }],
  "trend": [{ "date", "created", "resolved" }]
}
```

**Given** the `trend` field
**When** no `dateFrom`/`dateTo` is provided
**Then** trend defaults to the last 30 days, one entry per calendar day

**Given** `projectId` filter is applied
**When** `openByTask` is returned
**Then** only tasks belonging to the filtered project are included

**Given** the `openByProject` list
**When** sorted
**Then** projects are ordered by `open` count descending, top 10 only

---

### Story 13.5: Web UI — Bug Create & Detail Form

As any authenticated user,
I want to create bugs and view/edit bug details in a drawer,
So that I can log issues and track their resolution without navigating away from my current page.

**Acceptance Criteria:**

**Given** the user clicks "Tạo bug" (from any page that exposes the button)
**When** the Bug Create Drawer opens (width 560px, from right)
**Then** the following fields are present:
- **Dự án** — searchable Select (org-scoped, required)
- **Task(s)** — multi-select (loaded based on selected project, required, ≥1)
- **Tiêu đề** — text input (required, max 200 chars)
- **Mức độ (Severity)** — Radio.Group: Critical (🔴) | High (🟠) | Medium (🟡) | Low (🟢); default Medium
- **Mô tả** — Textarea (optional)
- **Người xử lý** — Select member in project (optional)
- **Đính kèm ảnh** — Ant Design Upload dragger; preview thumbnails inline; limit 5 files, 10MB each, image/* only

**Given** the form is submitted with valid data
**When** the API call succeeds
**Then** the bug is created, the drawer closes, and a success toast "Bug đã được tạo" appears
**And** the bug list (if visible behind the drawer) refreshes via TanStack Query invalidation

**Given** the user opens a bug detail (click from list)
**When** the Bug Detail Drawer opens
**Then** the header shows: bug title + severity badge (color from UX-DR11) + status Tag
**And** action buttons adapt by role and status:
  - Any role, OPEN: "Nhận xử lý" (assign to self) — visible if no assignee
  - Assignee or PM, IN_PROGRESS: "Đánh dấu Resolved"
  - Reporter or PM, RESOLVED: "Đóng bug" | "Mở lại"
  - PM only: "Huỷ" (any non-CLOSED status) + "Assign cho..."
**And** the body shows: mô tả, linked tasks (chips with link to task detail), attachment gallery (thumbnails, click to open presigned URL in new tab)
**And** the sidebar shows: Reporter avatar+name, Assignee avatar+name (or "Chưa assign"), Severity, Project, Created date, Resolved/Closed date (if applicable)

**Given** the user edits severity or description on the detail drawer
**When** the "Lưu" button is clicked
**Then** `PUT /api/v1/bugs/:id` is called and the drawer refreshes with new data

**Given** a dirty form (unsaved changes)
**When** the user tries to close the drawer
**Then** a confirm dialog appears: "Bạn có thay đổi chưa lưu. Đóng không?" (UX-DR10 pattern)

---

### Story 13.6: Web UI — Global Bug Management Page

As a PM, Leadership, or Admin,
I want a centralized bug management page with filtering,
So that I can see all bugs across projects in my scope and act on them quickly.

**Acceptance Criteria:**

**Given** the user navigates to `/bugs`
**When** the page loads
**Then** a summary bar at the top shows badge counts: 🔴 X Critical | 🟠 Y High | 🟡 Z Medium | 🟢 W Low (scoped to current filters)

**Given** the bug list is displayed
**When** the table renders
**Then** columns are: Severity badge | Tiêu đề | Dự án | Task(s) (chips, max 2 shown + "+N more") | Người xử lý | Người báo | Trạng thái | Ngày tạo
**And** the table is sorted by severity (CRITICAL first) then `createdAt DESC` by default
**And** secondary columns (Reporter, Created) are hidden at breakpoint `md` (UX-DR6)

**Given** the filter bar
**When** filters are applied
**Then** available filters: Dự án (multi-select), Trạng thái (multi-select), Mức độ (multi-select), Người xử lý (select), Người báo (select), Ngày tạo (date range)
**And** active filter count badge shows on the "Bộ lọc" button
**And** a "Xóa bộ lọc" link appears when any filter is active

**Given** the user clicks any bug row
**When** the action fires
**Then** the Bug Detail Drawer (Story 13.5) opens for that bug — no full-page navigation

**Given** a "Tạo bug" button in the page header
**When** clicked
**Then** the Bug Create Drawer (Story 13.5) opens

---

### Story 13.7: Web UI — My Bugs Page

As any authenticated user,
I want a personal "My Bugs" page showing all bugs assigned to me,
So that I can focus on my own work without filtering the global list.

**Acceptance Criteria:**

**Given** the user navigates to `/my-bugs` (sidebar link, similar to `/my-tasks`)
**When** the page loads
**Then** `GET /api/v1/bugs/my` is called and bugs are displayed

**Given** bugs are returned
**When** the list renders
**Then** bugs are grouped by severity: Critical section → High → Medium → Low
**And** each group header shows the severity icon + label + count badge
**And** each item shows: tiêu đề, project name, linked task count (e.g., "2 tasks"), status Tag, created date
**And** all touch targets ≥ 44×44px (UX-DR9)

**Given** filter tabs at the top of the page
**When** a tab is selected
**Then** tabs filter by status: Tất cả | Open | In Progress | Resolved
**And** tab labels include count (e.g., "Open (3)")

**Given** the user clicks a bug item
**When** the action fires
**Then** the Bug Detail Drawer opens (same pattern as Story 13.6)

**Given** no bugs exist for the selected filter
**When** the list renders
**Then** empty state shows: ✅ icon + "Không có bug nào được giao cho bạn"

---

### Story 13.8: Web UI — Bug Dashboard

As a PM or Leadership,
I want a bug statistics dashboard,
So that I can assess bug health across projects and identify hotspots at a glance.

**Acceptance Criteria:**

**Given** the user navigates to `/bugs/dashboard`
**When** the page loads
**Then** a project filter dropdown (org-scoped, "Tất cả dự án" default) is shown at the top
**And** all charts update when the filter changes (TanStack Query with filter as query key)

**Given** the dashboard renders
**When** all data is loaded
**Then** the following cards/charts are visible:

**Card 1 — Trạng thái tổng quan:** Donut chart with 5 segments (Open/In Progress/Resolved/Closed/Cancelled); center label shows total bug count; legend with count per status

**Card 2 — Phân bố mức độ:** Horizontal bar chart; 4 bars (Critical/High/Medium/Low); bars colored per UX-DR11 severity tokens; each bar shows count label

**Card 3 — Top dự án nhiều bug nhất:** Ant Design Table; columns: Dự án | Open | Critical | Tổng; sorted by Open DESC; max 10 rows; project name is a link to `/bugs?projectId=X`

**Card 4 — Task nhiều bug nhất:** Ant Design Table; columns: Task | Dự án | Bug đang mở; sorted by bug count DESC; max 10 rows; task name is a link to task detail

**Card 5 — Xu hướng 30 ngày:** Line chart with 2 series: "Tạo mới" (red) and "Resolved" (green); X-axis = date, Y-axis = count; shows intersection point when resolved > created

**Given** the dashboard is viewed in dark mode
**When** charts render
**Then** chart backgrounds use `#141414`, grid lines use `rgba(255,255,255,0.1)`, labels use `rgba(255,255,255,0.85)` (consistent with Epic 8 dashboard pattern)

---

### Story 13.9: Backend/Web — Bug Notifications & Telegram Integration

As a user,
I want to receive notifications when bugs are assigned to me or their status changes,
So that I am informed of events relevant to me without checking the system constantly.

**Acceptance Criteria:**

**Given** a bug's `assigneeId` is set or changed (via create or `PUT /api/v1/bugs/:id/assign`)
**When** the save completes
**Then** a `Notification` record is created for the new assignee: `{ type: "BUG_ASSIGNED", title: "Bug mới được giao cho bạn", body: "[title] — [severity] — [projectName]", entityType: "BUG", entityId: bugId }`
**And** the notification is delivered via `NotificationDeliveryService` (in-app, same as Epic 7)

**Given** a bug transitions to `RESOLVED`, `CLOSED`, or `CANCELLED`
**When** the status change is saved
**Then** a `Notification` record is created for the reporter: `{ type: "BUG_STATUS_CHANGED", title: "Bug đã được [resolved/đóng/huỷ]", body: "[title]", entityType: "BUG", entityId: bugId }`
**And** the notification is delivered in-app

**Given** a new bug is created with `severity: CRITICAL`
**When** the bug record is saved
**Then** a `Notification` record is created for the PM of the project: `{ type: "BUG_CRITICAL", title: "Bug Critical mới trong [projectName]", body: "[title] — báo cáo bởi [reporterName]", entityType: "BUG", entityId: bugId }`

**Given** a new bug is created with `severity: CRITICAL` and Telegram integration is enabled (Epic 11 TelegramModule is active)
**When** the bug record is saved
**Then** `TelegramService.sendMessage()` is called with the configured project channel
**And** the message format is: `🔴 Bug Critical mới\n*[title]*\nDự án: [projectName]\nBáo cáo: [reporterName]\n🔗 [deep link to /bugs/:id]`
**And** if Telegram is not configured for the project, this step is silently skipped (no error)

**Given** the `NotificationBell` component (Epic 7 UX-DR5)
**When** a bug notification arrives
**Then** it appears in the existing "Tất cả" tab
**And** a new **"Bugs"** tab is added to the NotificationBell dropdown alongside Task | Nguồn lực | Ngân sách
**And** clicking a bug notification navigates to `/bugs` with the bug detail drawer auto-opened


---

## Epic 14: Issue Register (Triển khai Dự án)

PM và team ghi nhận, phân loại và theo dõi toàn bộ issues phát sinh trong giai đoạn triển khai dự án cho khách hàng — Bug (lỗi cần sửa) và CR (yêu cầu thay đổi); CR bắt buộc qua luồng phê duyệt PM; audit log bất biến; dashboard 6 card; export Excel báo cáo định kỳ.

---

### Story 14.1: Backend — Issue Schema & Prisma Migration

As a developer,
I want the Prisma schema to include all Issue Register domain models,
So that issues, their related data, audit logs, and file attachments are persisted correctly.

**Acceptance Criteria:**

**Given** the Prisma schema is extended for Epic 14
**When** migrations run
**Then** the following enums exist:

`IssueType` enum: `BUG | CR`

`IssueStatus` enum: `OPEN | PENDING | PENDING_REVIEW | APPROVED | REJECTED | IN_PROGRESS | RESOLVED | CLOSED | CANCELLED`

`IssuePriority` enum: `CRITICAL | HIGH | MEDIUM | LOW`

**Given** the enums above
**When** migration runs
**Then** the following models exist:

`Issue` model fields:
- `id` UUID PK
- `projectId` FK → Project (cascade delete)
- `type` IssueType (not null)
- `title` String (not null, max 255)
- `description` Text nullable
- `requesterName` String (not null) — tên KH nhập tay
- `priority` IssuePriority default MEDIUM
- `status` IssueStatus default OPEN
- `recordedAt` DateTime default now()
- `dueDate` DateTime nullable
- `estimatedHours` Int nullable
- `resolvedAt` DateTime nullable
- `closedAt` DateTime nullable
- `affectedModule` String nullable
- `resolutionNote` Text nullable
- `reporterId` FK → User (not null)
- `assigneeId` FK → User nullable
- `pmApproverId` FK → User nullable
- `approvalNote` Text nullable
- `approvedAt` DateTime nullable
- `createdAt` DateTime default now()
- `updatedAt` DateTime updatedAt
- Indexes: `(projectId, status)`, `(assigneeId, status)`, `(reporterId)`, `(type, status)`, `(dueDate)`

`IssueTag` join model: `(issueId, tag)` composite PK

`IssueTask` join model: `(issueId, taskId)` composite PK; cascade delete when task deleted

`IssueAttachment` model: `id`, `issueId` FK, `fileName`, `fileKey` (MinIO object key), `fileSize`, `mimeType`, `createdAt`; index on `(issueId)`

`IssueComment` model: `id`, `issueId` FK, `authorId` FK → User, `body` Text, `createdAt`, `updatedAt`; index on `(issueId)`

`IssueAuditLog` model: `id`, `issueId` FK, `actorId` FK → User, `action` String (e.g. STATUS_CHANGED, ASSIGNED, CR_APPROVED, CR_REJECTED, FIELD_UPDATED), `fromValue` String nullable, `toValue` String nullable, `note` String nullable, `createdAt` DateTime default now(); index on `(issueId)`; **no updatedAt — immutable**

**Given** the `IssueAuditLog` model
**When** any UPDATE is attempted on an existing audit log record
**Then** the operation is rejected at the application layer (service throws BadRequestException before reaching DB)

---

### Story 14.2: Backend — Issue CRUD & Status Transition API

As any authenticated user,
I want to create, read, update, and transition issues through their lifecycle,
So that issues are tracked from discovery to resolution with full state control.

**Acceptance Criteria:**

**Given** a valid JWT (any role)
**When** `POST /api/v1/issues` is called with `{ type, title, requesterName, projectId, description?, priority?, dueDate?, estimatedHours?, affectedModule?, assigneeId?, taskIds[]?, tags[]? }`
**Then** a new `Issue` record is created
**And** if `type = BUG`: `status = OPEN`; if `type = CR`: `status = PENDING_REVIEW`
**And** `recordedAt = server now()` (ignored if provided in body)
**And** `reporterId = caller.id`
**And** `taskIds` must all belong to `projectId`; any invalid taskId returns `{ statusCode: 400, message: "Task không thuộc dự án này" }`
**And** an `IssueAuditLog` record is created: `{ action: "CREATED", toValue: status, actorId: caller.id }`

**Given** a valid JWT
**When** `GET /api/v1/issues` is called with optional filters `?type=&status=&priority=&projectId=&assigneeId=&reporterId=&requesterName=&dateFrom=&dateTo=&overdue=&tags=&page=&pageSize=&sortBy=&sortOrder=`
**Then** results are scoped by `orgUnitIds` (OrgScopeInterceptor)
**And** `overdue=true` filter returns issues where `dueDate < now() AND status NOT IN [RESOLVED, CLOSED, CANCELLED, REJECTED]`
**And** each item includes computed field `isOverdue: boolean`
**And** pagination metadata `{ total, page, pageSize }` is included
**And** response header includes `X-Issue-Open-Bugs: <count>` and `X-Issue-Pending-CRs: <count>` for badge rendering

**Given** a valid JWT
**When** `GET /api/v1/issues/my` is called
**Then** only issues where `assigneeId = caller.id` are returned, sorted by priority (CRITICAL first) then `recordedAt DESC`

**Given** a valid JWT
**When** `GET /api/v1/issues/:id` is called
**Then** response includes full issue object: `{ ...issue, reporter, assignee, pmApprover, project, tags[], tasks[], attachments[], comments[], auditLogs[], isOverdue }`

**Given** a valid JWT (PM or reporter)
**When** `PATCH /api/v1/issues/:id` is called with updatable fields `{ title?, description?, priority?, dueDate?, estimatedHours?, affectedModule?, assigneeId?, taskIds?, tags?, resolutionNote? }`
**Then** CLOSED, CANCELLED, REJECTED issues return `{ statusCode: 422, message: "Issue đã đóng, không thể chỉnh sửa" }`
**And** each changed field creates an `IssueAuditLog` record: `{ action: "FIELD_UPDATED", fromValue, toValue, actorId }`

**Given** a valid JWT
**When** `PATCH /api/v1/issues/:id/status` is called with `{ toStatus, note? }`
**Then** valid transitions are enforced per type:

BUG valid transitions:
- `OPEN → PENDING` (any authenticated user in project)
- `OPEN → IN_PROGRESS` (assignee or PM)
- `PENDING → IN_PROGRESS` (assignee or PM)
- `IN_PROGRESS → RESOLVED` (assignee or PM)
- `RESOLVED → CLOSED` (reporter or PM)
- `RESOLVED → IN_PROGRESS` (reporter or PM — re-open if not satisfied)
- Any non-CLOSED/non-CANCELLED → `CANCELLED` (PM only)

CR valid transitions (after approval):
- `OPEN → PENDING_REVIEW` (any — auto on create, or manual re-submit)
- `APPROVED → IN_PROGRESS` (assignee or PM)
- `IN_PROGRESS → RESOLVED` (assignee or PM)
- `RESOLVED → CLOSED` (reporter or PM)
- `RESOLVED → IN_PROGRESS` (re-open)
- Any non-CLOSED/non-REJECTED/non-CANCELLED → `CANCELLED` (PM only)

**And** invalid transitions return `{ statusCode: 422, message: "Chuyển trạng thái không hợp lệ: [from] → [to]" }`
**And** `resolvedAt = now()` set automatically when transitioning to `RESOLVED`
**And** `closedAt = now()` set automatically when transitioning to `CLOSED`
**And** `IssueAuditLog` created: `{ action: "STATUS_CHANGED", fromValue: oldStatus, toValue: newStatus, note, actorId }`

**Given** a valid PM JWT
**When** `PUT /api/v1/issues/:id/assign` is called with `{ assigneeId }`
**Then** `assigneeId` is updated; `IssueAuditLog` created `{ action: "ASSIGNED", toValue: assigneeId }`
**And** notification triggered for new assignee (Story 14.3)

**Given** a valid PM or Admin JWT
**When** `DELETE /api/v1/issues/:id` is called
**Then** issue and all related records (tags, tasks, attachments, comments, audit logs) are deleted via cascade
**And** if issue `status = CLOSED`: return `{ statusCode: 422, message: "Không thể xóa issue đã đóng" }`

---

### Story 14.3: Backend — CR Approval Flow + Notifications + Overdue Cron

As a PM,
I want to approve or reject CR issues and receive relevant notifications,
So that no Change Request is implemented without my explicit sign-off.

**Acceptance Criteria:**

**Given** a CR issue with `status = PENDING_REVIEW`
**When** `PATCH /api/v1/issues/:id/approve` is called with `{ decision: 'APPROVED' | 'REJECTED', note?: string }`
**Then** if `caller.role !== 'PM'` or caller is not PM of the issue's project → return `{ statusCode: 403, message: "Chỉ PM của dự án mới có thể phê duyệt CR" }`
**And** if `decision = 'APPROVED'`: `status → APPROVED`, `pmApproverId = caller.id`, `approvedAt = now()`, `approvalNote = note`
**And** if `decision = 'REJECTED'` and `note` is empty: return `{ statusCode: 400, message: "Lý do từ chối là bắt buộc" }`
**And** if `decision = 'REJECTED'`: `status → REJECTED`, `pmApproverId = caller.id`, `approvedAt = now()`, `approvalNote = note`
**And** `IssueAuditLog` created: `{ action: "CR_APPROVED" | "CR_REJECTED", fromValue: "PENDING_REVIEW", toValue: "APPROVED"|"REJECTED", note, actorId: caller.id }`
**And** if issue `status ≠ PENDING_REVIEW`: return `{ statusCode: 422, message: "Chỉ có thể duyệt CR đang ở trạng thái PENDING_REVIEW" }`

**Notifications triggered:**

| Event | Recipient | Type | Title | Body |
|---|---|---|---|---|
| Issue created (CR) | PM of project | ISSUE_CR_PENDING | "CR mới cần phê duyệt" | "[title] — [requesterName] — [projectName]" |
| Issue assigned | New assignee | ISSUE_ASSIGNED | "Issue mới được giao cho bạn" | "[title] — [type] [priority] — [projectName]" |
| CR APPROVED | Reporter | ISSUE_CR_APPROVED | "CR đã được PM phê duyệt" | "[title] — [approvalNote nếu có]" |
| CR REJECTED | Reporter | ISSUE_CR_REJECTED | "CR bị từ chối" | "[title] — [approvalNote]" |
| Status → RESOLVED | Reporter | ISSUE_RESOLVED | "Issue đã được xử lý" | "[title] — [resolutionNote nếu có]" |
| Status → CLOSED | Reporter + Assignee | ISSUE_CLOSED | "Issue đã đóng" | "[title]" |
| CRITICAL issue created | PM of project | ISSUE_CRITICAL | "Issue Critical mới: [projectName]" | "[title] — Requester: [requesterName]" |
| CRITICAL issue created (Telegram on) | Telegram channel | — | — | `🔴 Issue Critical\n*[title]*\nProject: [projectName]\nRequester: [requesterName]\n🔗 /issues/[id]` |

**Given** a daily cron job scheduled at 08:00 server time (BullMQ + Redis, ARCH-006)
**When** the cron fires
**Then** all issues where `dueDate < now() AND status NOT IN [RESOLVED, CLOSED, CANCELLED, REJECTED]` are fetched
**And** for each overdue issue, one `Notification` record is created for the `assignee` (if set): `{ type: "ISSUE_OVERDUE", title: "Issue quá hạn", body: "[title] — hạn [dueDate]", entityType: "ISSUE", entityId: issueId }`
**And** one `Notification` record is created for the PM of the project
**And** if the same issue was already flagged overdue yesterday (check by `IssueAuditLog` action "OVERDUE_NOTIFIED" with `createdAt > yesterday 08:00`), skip to avoid duplicate
**And** an `IssueAuditLog` record is created: `{ action: "OVERDUE_NOTIFIED", actorId: "SYSTEM", note: "dueDate: [dueDate]" }`

**Given** the `NotificationBell` component (Epic 7 UX-DR5)
**When** an issue notification arrives
**Then** a new **"Issues"** tab is added to the dropdown alongside Task | Bugs | Nguồn lực | Ngân sách
**And** clicking an issue notification navigates to `/issues` with the issue detail drawer auto-opened via `?issueId=[id]` query param

---

### Story 14.4: Backend — Statistics API + Export Excel/CSV

As a PM or Leadership user,
I want a statistics API and export capability for issues,
So that I can generate dashboard data and produce client-facing reports.

**Acceptance Criteria:**

**Given** a valid JWT
**When** `GET /api/v1/issues/stats` is called with optional `?projectId=&startDate=&endDate=`
**Then** response is scoped by `orgUnitIds`
**And** response body:
```json
{
  "byStatus": { "OPEN": 0, "PENDING": 0, "PENDING_REVIEW": 0, "APPROVED": 0, "REJECTED": 0, "IN_PROGRESS": 0, "RESOLVED": 0, "CLOSED": 0, "CANCELLED": 0 },
  "byType": { "BUG": 0, "CR": 0 },
  "byPriority": { "CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0 },
  "pendingCRs": [{ "id", "title", "projectName", "requesterName", "recordedAt", "dueDate", "isOverdue" }],
  "topProjects": [{ "projectId", "projectName", "openBugs", "pendingCRs", "totalActive" }],
  "trend30Days": [{ "date": "YYYY-MM-DD", "created": 0, "resolved": 0 }],
  "overdueCount": 0,
  "avgCycleTimeHours": 0.0
}
```
**And** `pendingCRs` returns max 10 items sorted by `recordedAt ASC`
**And** `topProjects` returns max 10 items sorted by `totalActive DESC`
**And** `trend30Days` always returns exactly 30 items (fill 0 for days with no data)
**And** `avgCycleTimeHours` = average of `(resolvedAt - recordedAt)` in hours for all RESOLVED/CLOSED issues in scope+filter; null if no data

**Given** a valid JWT
**When** `GET /api/v1/issues/export` is called with `?format=xlsx|csv&projectId=&startDate=&endDate=&type=&status=`
**Then** response is scoped by `orgUnitIds`
**And** `Content-Disposition: attachment; filename="issues-[projectName|all]-[YYYY-MM-DD].xlsx"` header is set
**And** file is streamed directly (no temp file on disk); uses `exceljs` streaming workbook
**And** columns (in order): ID | Loại | Tiêu đề | Người yêu cầu | Dự án | Độ ưu tiên | Trạng thái | Người log | Người xử lý | Ngày ghi nhận | Hạn xử lý | Ước lượng (giờ) | Ngày resolve | Cycle time (giờ) | Module ảnh hưởng | Ghi chú xử lý | PM duyệt | Ngày duyệt | Lý do từ chối | Tags
**And** date columns formatted as `DD/MM/YYYY HH:mm`
**And** max 10.000 rows exported per request; if `total > 10000` response header `X-Export-Truncated: true` is added
**And** `format=csv` returns `Content-Type: text/csv; charset=utf-8` with UTF-8 BOM for Excel compatibility

---

### Story 14.5: Backend — Comments + File Attachments (MinIO)

As any authenticated user,
I want to comment on issues and attach files,
So that discussions and supporting documents are centralized with each issue.

**Acceptance Criteria:**

**Given** a valid JWT with access to the issue's project
**When** `POST /api/v1/issues/:id/comments` is called with `{ body: string }`
**Then** an `IssueComment` record is created with `authorId = caller.id`
**And** empty `body` returns `{ statusCode: 400, message: "Nội dung comment không được để trống" }`

**Given** a valid JWT and the comment's `authorId = caller.id`
**When** `PATCH /api/v1/issues/:id/comments/:cid` is called with `{ body }`
**Then** the comment's `body` and `updatedAt` are updated
**And** non-author callers return `{ statusCode: 403, message: "Bạn không có quyền sửa comment này" }`

**Given** a valid JWT (author or PM)
**When** `DELETE /api/v1/issues/:id/comments/:cid` is called
**Then** the comment is deleted
**And** non-author non-PM callers return `{ statusCode: 403 }`

**Given** MinIO is configured (tận dụng `MINIO_*` env vars từ Epic 13)
**When** `POST /api/v1/issues/:id/attachments` is called with multipart file upload
**Then** accepted MIME types: `image/*`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `text/plain`
**And** file size ≤ 20MB; oversized returns `{ statusCode: 400, message: "File không được vượt quá 20MB" }`
**And** max 10 attachments per issue; exceeded returns `{ statusCode: 400, message: "Tối đa 10 file đính kèm mỗi issue" }`
**And** file uploaded to MinIO bucket `loop-issues` with key `{issueId}/{uuid}.{ext}`
**And** `IssueAttachment` record created with `fileName`, `fileKey`, `fileSize`, `mimeType`

**Given** a valid JWT
**When** `GET /api/v1/issues/:id/attachments/:aid/url` is called
**Then** a presigned MinIO URL valid for 15 minutes is returned `{ url: string, expiresAt: ISO8601 }`

**Given** a valid JWT (reporter or PM)
**When** `DELETE /api/v1/issues/:id/attachments/:aid` is called
**Then** the file is deleted from MinIO and `IssueAttachment` record is removed
**And** non-reporter non-PM callers return `{ statusCode: 403 }`

**Given** the MinIO bucket `loop-issues` does not exist
**When** the `IssueAttachmentService` initializes
**Then** the bucket is auto-created (same pattern as Epic 13 `loop-bug-attachments`)

---

### Story 14.6: Web UI — Global Issue List + My Issues

As any authenticated user,
I want a centralized issue list with powerful filters and a personal "My Issues" view,
So that I can find and manage issues relevant to me quickly.

**Acceptance Criteria:**

**Given** the user navigates to `/issues`
**When** the page loads
**Then** a data table is displayed with columns: Type (icon+badge) | Title | Requester | Project | Priority | Status | Assignee | Recorded At | Due Date | Actions
**And** overdue rows have background tint `rgba(255,77,79,0.06)` (light) / `rgba(255,77,79,0.08)` (dark) and a red "Quá hạn" tag next to dueDate
**And** Type column shows: BUG icon `BugOutlined` red / CR icon `FormOutlined` blue
**And** Priority column uses color chips per priority token (CRITICAL=#FF4D4F, HIGH=#FA8C16, MEDIUM=#FADB14, LOW=#52C41A) with icon + label

**Given** the filter panel at top of `/issues`
**When** user sets any filter combination
**Then** table updates without full page reload (TanStack Query refetch)
**And** filter state persists in URL query params (sharable link)
**And** available filters: Type toggle (All/BUG/CR) | Status multi-select | Priority multi-select | Project dropdown | Assignee dropdown | Reporter dropdown | Requester name text search | Date range (recordedAt) | Overdue toggle | Tags multi-select

**Given** the sidebar navigation
**When** the user has `X` open BUGs + `Y` pending CRs in scope
**Then** the "Issues" menu item shows a badge with total count `X+Y`
**And** on hover/expand: sub-badges "BUG [X]" and "CR [Y]" are visible separately

**Given** the user navigates to `/issues/my`
**When** the page loads
**Then** only issues where `assigneeId = currentUser.id` are shown
**And** issues are grouped by priority section headers (CRITICAL → HIGH → MEDIUM → LOW)
**And** filter controls available: Type, Status, Priority

**Given** the user is PM or Admin on `/issues`
**When** clicking the column header "Type"
**Then** table sorts by type (BUG/CR) alphabetically

**Given** the user on `/issues`
**When** clicking any row
**Then** the Issue Detail Drawer (Story 14.7) slides in from the right (no navigation)

---

### Story 14.7: Web UI — Issue Create/Edit Form + Detail Drawer

As any authenticated user,
I want to create new issues and view/edit their full details in a drawer,
So that issue management is fast and context-preserving (no page navigation needed).

**Acceptance Criteria:**

**Given** the user clicks "+ Tạo Issue" button on `/issues`
**When** the Create Issue modal opens
**Then** form fields: Type (BUG/CR toggle — required) | Title (required, max 255) | Requester Name (required, free text) | Project (dropdown, scoped) | Description (textarea) | Priority (select, default MEDIUM) | Due Date (date picker) | Estimated Hours (number input, min 0) | Affected Module (text) | Assignee (user search dropdown) | Linked Tasks (multi-select, filtered by selected project) | Tags (input with autocomplete)
**And** on submit: `POST /api/v1/issues`; on success: toast "Issue đã được tạo", table refreshes, modal closes
**And** if type = CR: info banner shown "CR sẽ cần PM phê duyệt trước khi triển khai"

**Given** the Issue Detail Drawer is open for any issue
**When** the drawer renders
**Then** it shows all issue fields in read mode with "Sửa" button for editable fields
**And** Status badge is shown prominently with a "Chuyển trạng thái" dropdown of valid next states
**And** Timeline section shows: Ngày ghi nhận | Hạn xử lý (+ overdue badge if applicable) | Ước lượng | Ngày resolve | Ngày đóng | Cycle time (computed, shown as "Xử lý trong X giờ / Y ngày")
**And** if issue is CR: Approval section shows `pmApprover.name`, `approvedAt`, `approvalNote`; if `status = PENDING_REVIEW` and caller is PM: shows [Phê duyệt] [Từ chối] buttons (Story 14.8)
**And** Tags section: tag chips, PM/reporter can add/remove
**And** Linked Tasks section: task title + status chips, with "+ Thêm task" button
**And** File Attachments section: thumbnail grid for images, file list for docs; "+ Đính kèm" button
**And** Comment Thread: comment list (author avatar, body, timestamp, edit/delete own); "Thêm comment" input at bottom
**And** Audit Log: collapsible timeline at bottom showing all `IssueAuditLog` entries with actor name, action label, from→to values, timestamp

**Given** the user edits any field inline (e.g., clicks assignee name to change)
**When** saving
**Then** `PATCH /api/v1/issues/:id` is called; success toast "Đã cập nhật"; drawer data refreshes

**Given** the "Chuyển trạng thái" dropdown
**When** opened
**Then** only valid next states for the current issue type + current status are shown
**And** selecting a state opens a small confirm popover with optional "Ghi chú" textarea
**And** on confirm: `PATCH /api/v1/issues/:id/status` is called; status badge updates immediately (optimistic)

---

### Story 14.8: Web UI — CR Approval Modal + Audit Log Timeline

As a PM,
I want a clear approval interface for pending CRs and a readable audit trail,
So that I can act on CRs quickly and any user can trace the full history of an issue.

**Acceptance Criteria:**

**Given** the user is a PM and opens an Issue Detail Drawer for a CR with `status = PENDING_REVIEW`
**When** the drawer renders
**Then** a highlighted blue banner "CR đang chờ phê duyệt" is shown at the top
**And** two action buttons are shown: `[✓ Phê duyệt]` (primary, type=primary) and `[✗ Từ chối]` (type=danger)

**Given** PM clicks "[✓ Phê duyệt]"
**When** the approval modal opens
**Then** modal title "Phê duyệt CR" + issue title
**And** optional textarea "Ghi chú phê duyệt" (placeholder: "Ghi chú cho team (không bắt buộc)")
**And** [Xác nhận phê duyệt] button calls `PATCH /api/v1/issues/:id/approve` with `{ decision: 'APPROVED', note }`
**And** on success: banner changes to green "CR đã được phê duyệt", buttons disappear, audit log updates, toast "Đã phê duyệt CR"

**Given** PM clicks "[✗ Từ chối]"
**When** the rejection modal opens
**Then** modal title "Từ chối CR" + issue title
**And** required textarea "Lý do từ chối" (required validation: "Lý do từ chối là bắt buộc")
**And** [Xác nhận từ chối] button calls `PATCH /api/v1/issues/:id/approve` with `{ decision: 'REJECTED', note }`
**And** on success: status badge changes to red "REJECTED", buttons disappear, toast "Đã từ chối CR"

**Given** a non-PM user opens the same CR drawer
**When** viewing
**Then** the approval buttons are NOT rendered (hidden, not just disabled)
**And** instead a read-only info text "Đang chờ PM [projectPmName] phê duyệt" is shown

**Given** the Audit Log section at the bottom of any Issue Detail Drawer
**When** rendered
**Then** it shows a vertical timeline (Ant Design `Timeline` component)
**And** each `IssueAuditLog` entry shows: actor avatar + name | action label (human-readable Vietnamese) | from→to values (e.g., "OPEN → IN_PROGRESS") | timestamp (relative + absolute on hover)
**And** action labels mapping: STATUS_CHANGED → "Đổi trạng thái", ASSIGNED → "Giao cho", CR_APPROVED → "PM phê duyệt", CR_REJECTED → "PM từ chối", FIELD_UPDATED → "Cập nhật [fieldName]", CREATED → "Tạo issue", OVERDUE_NOTIFIED → "Cảnh báo quá hạn"
**And** CR_APPROVED entries have green dot; CR_REJECTED have red dot; STATUS_CHANGED have blue dot; CREATED have grey dot

---

### Story 14.9: Web UI — Issue Dashboard

As a PM or Leadership user,
I want a dashboard with 6 charts/tables showing real-time issue statistics,
So that I can monitor project health and identify bottlenecks at a glance.

**Acceptance Criteria:**

**Given** the user navigates to `/issues/dashboard`
**When** the page loads
**Then** a filter bar at top shows: Project dropdown (optional, default All) | Date range (optional, default last 30 days)
**And** all 6 cards update when filter changes (debounced 300ms, calls `GET /api/v1/issues/stats`)

**Card 1 — Tổng quan Trạng thái:**
**Given** data from `stats.byStatus`
**When** rendered
**Then** Ant Design Donut chart with 9 segments (one per IssueStatus)
**And** center label shows total active count (all statuses except CLOSED + CANCELLED + REJECTED)
**And** legend below with count per status
**And** clicking a segment filters the issue list at `/issues?status=[clicked]`

**Card 2 — BUG vs CR:**
**Given** data from `stats.byType`
**When** rendered
**Then** two large Statistic cards side by side: BUG (red `#FF4D4F`) and CR (blue `#1677FF`)
**And** each shows count + percentage of total
**And** clicking navigates to `/issues?type=[BUG|CR]`

**Card 3 — Phân bố Độ ưu tiên:**
**Given** data from `stats.byPriority`
**When** rendered
**Then** horizontal bar chart (AntV/G2), 4 bars top-to-bottom: CRITICAL → LOW
**And** bar colors use priority tokens: CRITICAL=#FF4D4F, HIGH=#FA8C16, MEDIUM=#FADB14, LOW=#52C41A
**And** each bar shows count label at right end

**Card 4 — CR Chờ Duyệt:**
**Given** data from `stats.pendingCRs`
**When** rendered
**Then** Ant Design Table: Title | Project | Requester | Ngày tạo | Hạn xử lý
**And** overdue CRs have red "Quá hạn" tag in Hạn xử lý column
**And** max 10 rows, sorted by recordedAt ASC (oldest first)
**And** each row clickable → opens Issue Detail Drawer
**And** if `caller.role` is not PM or Admin: this card shows "Bạn không có quyền xem thông tin này" placeholder

**Card 5 — Top Dự án nhiều Issues:**
**Given** data from `stats.topProjects`
**When** rendered
**Then** Ant Design Table: Dự án | BUG mở | CR chờ duyệt | Tổng active
**And** max 10 rows, sorted by totalActive DESC
**And** project name is a link to `/issues?projectId=[id]`

**Card 6 — Xu hướng 30 ngày:**
**Given** data from `stats.trend30Days`
**When** rendered
**Then** AntV/G2 Line chart with 2 series: "Ghi nhận mới" (blue) and "Resolved/Closed" (green)
**And** X-axis = date (format DD/MM), Y-axis = count
**And** tooltip shows exact counts on hover
**And** overdueCount shown as a small alert banner above the chart: "⚠ [overdueCount] issues đang quá hạn" (red, hidden if 0)

**Given** dark mode is active
**When** charts render
**Then** chart backgrounds use `#141414`, grid lines use `rgba(255,255,255,0.1)`, labels use `rgba(255,255,255,0.85)` — consistent with Epic 8 dashboard

---

### Story 14.10: Web UI — Export + Overdue Indicators + Notification Tab

As a PM,
I want to export issue data to Excel and receive issue notifications in the notification bell,
So that I can produce client reports and stay updated on issue activity.

**Acceptance Criteria:**

**Given** the user is on `/issues` page
**When** clicking the "Xuất Excel" button (top-right, near "+ Tạo Issue")
**Then** an export options drawer opens with: Format (XLSX/CSV radio), Project filter, Date range, Type filter, Status filter
**And** clicking "Tải về" calls `GET /api/v1/issues/export` with selected params
**And** browser downloads the file with correct filename `issues-[project|all]-[YYYY-MM-DD].xlsx`
**And** if `X-Export-Truncated: true` response header is present: toast warning "Kết quả bị giới hạn 10.000 dòng. Hãy lọc kỹ hơn để xuất đầy đủ."
**And** loading spinner shown on button during download

**Given** any issue row in the table where `isOverdue = true`
**When** rendered
**Then** the Due Date cell shows: date value + red `<Tag color="error">Quá hạn</Tag>` badge
**And** the full row has background tint (light: `rgba(255,77,79,0.06)`, dark: `rgba(255,77,79,0.08)`)
**And** in the sidebar menu badge, overdue issues are counted separately with a `!` icon indicator

**Given** the `NotificationBell` dropdown (Epic 7 component)
**When** an issue notification arrives (`entityType = "ISSUE"`)
**Then** a new **"Issues"** tab is visible in the dropdown alongside "Task" | "Bugs" | "Nguồn lực" | "Ngân sách"
**And** the tab badge shows unread issue notification count
**And** each notification item shows: issue type icon (BUG=red/CR=blue) | title | project name | timestamp
**And** clicking a notification item: marks as read + navigates to `/issues?issueId=[entityId]`
**And** `/issues` page auto-opens the Issue Detail Drawer for that `issueId` on load (if `issueId` query param present)

**Given** the user on `/issues/dashboard` with `overdueCount > 0`
**When** the dashboard renders
**Then** a dismissible alert bar at top of page: `⚠ Có [N] issue đang quá hạn. <Xem ngay>` links to `/issues?overdue=true`

---

### Story 14.11: Mobile — Issue List, Detail, Status Update & Comment

As a PM or Member on mobile,
I want to view issues, update status, and add comments from my phone,
So that I can manage deployment issues without needing a desktop.

**Acceptance Criteria:**

**Given** the mobile user is authenticated
**When** navigating to the Issues tab (bottom tab bar)
**Then** the Issue List screen shows: Type icon | Title | Priority chip | Status badge | Requester | Due Date (+ red "Quá hạn" if overdue)
**And** list is filterable by Type toggle (All/BUG/CR) and Status multi-select (bottom sheet filter)
**And** pull-to-refresh triggers re-fetch
**And** "My Issues" toggle button at top switches between all-in-scope and assigneeId=me

**Given** the user taps an issue row
**When** the Issue Detail screen opens
**Then** it shows: title, type badge, priority chip, status badge, requester name, project name, due date, estimated hours, affected module, reporter, assignee, tags
**And** if CR and status = PENDING_REVIEW and user is PM: "Phê duyệt / Từ chối" action buttons shown
**And** Linked Tasks section lists task title + status
**And** Comments section shows comment list + "Thêm comment" input at bottom

**Given** the PM taps "Phê duyệt" or "Từ chối" on a CR
**When** a bottom sheet confirmation opens
**Then** "Phê duyệt": optional note textarea → confirm → `PATCH /api/v1/issues/:id/approve { decision: APPROVED }`
**And** "Từ chối": required note textarea → confirm → `PATCH /api/v1/issues/:id/approve { decision: REJECTED }`
**And** on success: status badge updates, toast shown

**Given** the user taps "Chuyển trạng thái" button
**When** a bottom sheet opens
**Then** only valid next states for the current type+status are shown as selectable options
**And** selecting a state shows optional note input
**And** confirming calls `PATCH /api/v1/issues/:id/status`; status badge updates on success

**Given** the user taps "Thêm comment" and types a message
**When** submitting
**Then** `POST /api/v1/issues/:id/comments` is called
**And** new comment appears at bottom of list immediately (optimistic update)

**Given** a push notification arrives for an issue event (in-app notification via Epic 7 FCM)
**When** the user taps the notification
**Then** app deep-links directly to the Issue Detail screen for that issue


---

## Epic 15: Authorization & Permission Management

Admin có thể quản lý chi tiết quyền hạn của từng role và override cho từng user cụ thể; mọi API endpoint được bảo vệ bằng function-level permission check; mọi query trả data đều tự động filter theo phạm vi org tree của người dùng (org-scoped row-level security); frontend ẩn/hiện UI element dựa trên effective permissions của user.

**ARCH covered:** ARCH-020, ARCH-021, ARCH-022, ARCH-023, ARCH-024

---

### Story 15.1: Prisma Schema — Permission Tables + Seed Data (ERP-Ready)

As a system administrator,
I want the database to store permission codes, system role mappings, module roles, user-module role assignments, and user-level overrides,
So that the permission system supports both current simple RBAC and future ERP module-specific roles without breaking changes.

**Acceptance Criteria:**

**Given** the Prisma migration runs successfully
**When** the database schema is applied
**Then** six new tables exist: `permissions`, `role_permissions`, `user_permissions`, `module_roles`, `module_role_permissions`, `user_module_roles`
**And** `permissions` table has columns: `code` (PK string), `module`, `action`, `description`, `created_at`
**And** `role_permissions` table has composite PK `(role, permission_code)` linking enum Role → permission
**And** `user_permissions` table has PK `(user_id, permission_code)`, column `granted boolean default true`
**And** `module_roles` table has: `code` (PK), `name`, `domain`, `description`, `is_system boolean`
**And** `module_role_permissions` table has composite PK `(role_code, permission_code)` linking ModuleRole → permission
**And** `user_module_roles` table has composite PK `(user_id, role_code)` linking User → ModuleRole
**And** `users` table has new relations: `userPermissions UserPermission[]`, `moduleRoles UserModuleRole[]`

**Given** the migration ran
**When** the seed script `prisma/seed.ts` runs
**Then** all 35 current-module permission codes are inserted into `permissions` table using upsert
**And** default system role→permission mappings seeded for all 4 roles (ADMIN, LEADERSHIP, PM, MEMBER)
**And** ADMIN role has all 35 current permission codes assigned
**And** `module_roles` table is seeded with placeholder domain rows marked `isSystem: true` for future ERP modules: `{ code: "hr:manager", domain: "hr", isSystem: true }`, `{ code: "finance:accountant", domain: "finance", isSystem: true }` — permissions empty until module ships
**And** `user_permissions` and `user_module_roles` tables start empty

**Given** an existing user with role ADMIN
**When** I query `role_permissions WHERE role = 'ADMIN'`
**Then** 35 rows are returned (one per current permission code)

**Given** an existing user with role MEMBER
**When** I query `role_permissions WHERE role = 'MEMBER'`
**Then** only member-appropriate permissions are returned: `projects:read`, `tasks:read`, `tasks:create`, `tasks:update`, `employees:read`, `timesheets:read`, `timelogs:create`, `timelogs:update`, `bugs:read`, `bugs:create`, `bugs:update`, `issues:read`, `issues:create`, `dashboard:read`

**Given** the seed runs on an already-seeded database
**When** it runs again
**Then** it completes without error (upsert — no duplicates)

---

### Story 15.2: OrgScopeService — Org-Tree-Scoped Data Access

As a developer,
I want a shared OrgScopeService that computes which org units a user can see,
So that every service can apply consistent org-scoped filtering to its queries with zero duplication.

**Acceptance Criteria:**

**Given** the OrgScopeService is registered in CommonModule
**When** any NestJS service injects OrgScopeService
**Then** it can call `getVisibleOrgUnitIds(user: User): Promise<string[] | null>`

**Given** the user has role ADMIN
**When** `getVisibleOrgUnitIds(user)` is called
**Then** it returns `null` (no filter — ADMIN sees everything)

**Given** the user has role LEADERSHIP with orgUnitId = "dept-a"
**When** `getVisibleOrgUnitIds(user)` is called
**Then** it returns an array containing "dept-a" plus IDs of all descendant org units recursively
**And** the result uses a PostgreSQL recursive CTE via `prisma.$queryRaw`

**Given** the user has role PM with orgUnitId = "team-b"
**When** `getVisibleOrgUnitIds(user)` is called
**Then** it returns an array containing "team-b" plus all descendant unit IDs (same subtree rule as LEADERSHIP)

**Given** the user has role MEMBER with orgUnitId = "team-c"
**When** `getVisibleOrgUnitIds(user)` is called
**Then** it returns `["team-c"]` — only their own unit, no descendants

**Given** the service is called for the same userId twice within 10 minutes
**When** the second call is made
**Then** the result is served from Redis cache (key `orgscope:{userId}`, TTL 600s)
**And** no database query is executed on the second call

**Given** an org unit's parent is changed (org tree restructure)
**When** `OrgScopeService.invalidateAll()` is called
**Then** all `orgscope:*` Redis keys are deleted

**Given** a user's orgUnitId is updated
**When** `OrgScopeService.invalidateUser(userId)` is called
**Then** the `orgscope:{userId}` Redis key is deleted

**Given** a user has no orgUnitId (null)
**When** `getVisibleOrgUnitIds(user)` is called for a non-ADMIN user
**Then** it returns `[]` (empty array — sees nothing, cannot access any org-scoped data)

---

### Story 15.3: PermissionsService — Effective Permissions with 3-Source Computation + Cache

As a developer,
I want a PermissionsService that computes a user's effective permissions from 3 sources (system role + module roles + user overrides),
So that permission checks are consistent, cached, and ready for ERP module expansion without code changes.

**Acceptance Criteria:**

**Given** PermissionsService is registered in PermissionsModule exported globally
**When** any service or guard calls `permissionsService.userHasPermission(userId, role, code)`
**Then** it returns `true` if the user has the permission, `false` otherwise

**Given** a user with role PM, no module roles, no user overrides
**When** `userHasPermission(userId, 'PM', 'tasks:approve')` is called
**Then** it returns `true` (PM system role has tasks:approve — Source 1)

**Given** a user with role MEMBER, no module roles, no user overrides
**When** `userHasPermission(userId, 'MEMBER', 'tasks:approve')` is called
**Then** it returns `false` (MEMBER system role does not have tasks:approve)

**Given** a user with role MEMBER assigned module role `hr:manager` (which has `hr_employee:read`)
**When** `userHasPermission(userId, 'MEMBER', 'hr_employee:read')` is called
**Then** it returns `true` (Source 2: module role grants it)

**Given** a user with role MEMBER and a UserPermission row `{granted: true, permissionCode: 'tasks:approve'}`
**When** `userHasPermission(userId, 'MEMBER', 'tasks:approve')` is called
**Then** it returns `true` (Source 3: user-level override grants it)

**Given** a user with role PM and a UserPermission row `{granted: false, permissionCode: 'tasks:approve'}`
**When** `userHasPermission(userId, 'PM', 'tasks:approve')` is called
**Then** it returns `false` (Source 3: user-level override revokes it — last wins)

**Given** `getEffectivePermissions(userId, role)` is called
**When** the result is returned
**Then** it returns `string[]` — union of all 3 sources after applying overrides
**And** the signature is `getEffectivePermissions(userId: string, role: Role): Promise<string[]>`

**Given** `userHasPermission` is called for the same user twice within 5 minutes
**When** the second call occurs
**Then** the effective permissions list is served from Redis cache (key `perm:{userId}`, TTL 300s)
**And** no database query is executed on the second call

**Given** any of the following changes occur for a user:
- user's `role` field is updated
- a `UserPermission` row is created/updated/deleted for the user
- a `UserModuleRole` row is created/deleted for the user
**When** the change is saved to the database
**Then** the Redis key `perm:{userId}` is immediately deleted

**Given** a `RolePermission` record is updated (system role permissions change)
**When** the change is saved
**Then** all `perm:*` Redis keys for users with that role are deleted

**Given** a `ModuleRolePermission` record is updated (module role permissions change)
**When** the change is saved
**Then** all `perm:*` Redis keys for users assigned that module role are deleted

---

### Story 15.4: PermissionGuard + @RequirePermission Decorator

As a developer,
I want a PermissionGuard and @RequirePermission decorator I can apply to any controller endpoint,
So that function-level access control is enforced at the HTTP layer with a single-line annotation.

**Acceptance Criteria:**

**Given** a controller method decorated with `@RequirePermission('reports:export')`
**When** a user with the `reports:export` permission calls that endpoint
**Then** the request proceeds normally (HTTP 200)

**Given** a controller method decorated with `@RequirePermission('reports:export')`
**When** a user WITHOUT the `reports:export` permission calls that endpoint
**Then** the response is HTTP 403 with body `{ statusCode: 403, message: "Không có quyền thực hiện thao tác này" }`

**Given** a controller method with NO `@RequirePermission` decorator
**When** any authenticated user calls that endpoint
**Then** PermissionGuard passes through (no permission check, just auth)

**Given** PermissionGuard is registered globally in AppModule after JwtAuthGuard
**When** an unauthenticated request hits a protected endpoint
**Then** JwtAuthGuard returns 401 first (PermissionGuard never fires)

**Given** `@Public()` is applied to an endpoint
**When** any request hits that endpoint
**Then** neither JwtAuthGuard nor PermissionGuard blocks it

**Given** both `@Roles(Role.ADMIN)` and `@RequirePermission('admin:permissions')` are on a controller
**When** a non-ADMIN user with user-level grant of `admin:permissions` calls it
**Then** RolesGuard returns 403 (Roles check is more restrictive and fires first)
**Note:** Existing `@Roles()` decorator is kept for backward compatibility; new code prefers `@RequirePermission()`

**Given** the guard is used
**When** unit tests run for PermissionGuard
**Then** tests pass covering: user-has-permission → allow, user-lacks-permission → throw ForbiddenException, no-decorator → allow, user-with-override → correct result

---

### Story 15.5: Retrofit Existing API Endpoints — Permission Checks + OrgScope Filters

As a developer,
I want all existing API endpoints to be protected by PermissionGuard and all list/find queries to apply OrgScope filtering,
So that NFR-02 (org-scoped row-level security) is enforced consistently across the entire system.

**Acceptance Criteria:**

**Given** all existing modules (projects, tasks, employees, timesheets, time-logs, reports, alerts, bugs, issues, bpm, dashboard)
**When** `@RequirePermission` decorators are applied to their controllers
**Then** every mutating endpoint (POST/PUT/PATCH/DELETE) has at minimum a `:read` guard on GET and a specific permission for mutations

**Given** the following permission mapping is applied to controllers:
- `ProjectsController`: GET→`projects:read`, POST→`projects:create`, PATCH→`projects:update`, DELETE→`projects:delete`
- `TasksController`: GET→`tasks:read`, POST→`tasks:create`, PATCH→`tasks:update`, DELETE→`tasks:delete`
- `TasksController PATCH /approve`: `tasks:approve`
- `EmployeesController`: GET→`employees:read`, POST→`employees:create`, PATCH→`employees:update`, DELETE→`employees:delete`
- `ReportsController`: GET→`reports:read`, GET /export→`reports:export`
- `TimesheetsController PATCH /approve`: `timesheets:approve`
- `BugsController`: GET→`bugs:read`, POST→`bugs:create`, PATCH→`bugs:update`, PATCH /assign→`bugs:assign`, PATCH /close→`bugs:close`
- `IssuesController`: GET→`issues:read`, POST→`issues:create`, PATCH→`issues:update`, POST /approve→`issues:approve`
- `ProcessesController`: GET→`bpm:read`, POST/PUT→`bpm:manage`
- `AlertsController`: GET→`alerts:read`, POST/PATCH→`alerts:configure`
- `DashboardController`: GET→`dashboard:read`
**Then** all listed endpoints enforce these permission checks

**Given** a service method that returns a list of entities (e.g. `projectsService.findAll`)
**When** the method is updated to accept `user: User` parameter and call `orgScopeService.getVisibleOrgUnitIds(user)`
**Then** the returned list only contains entities whose `orgUnitId` is in the visible set
**And** ADMIN user receives all entities (orgIds = null → no WHERE clause)

**Given** OrgScope is applied to the following services:
- `ProjectsService.findAll` → filter by `project.orgUnitId`
- `TasksService.findAll` → filter by `task.project.orgUnitId` (via join)
- `EmployeesService.findAll` → filter by `employee.user.orgUnitId`
- `BugsService.findAll` → filter by `bug.project.orgUnitId`
- `IssuesService.findAll` → filter by `issue.project.orgUnitId`
- `DashboardService` all aggregations → filter by org scope
- `ReportsService` all reports → filter by org scope
**Then** all listed services apply org scope filtering

**Given** a LEADERSHIP user at "Division A" makes a GET /projects request
**When** the response is returned
**Then** only projects belonging to "Division A" and its sub-units are returned
**And** projects from other divisions are not included

**Given** a MEMBER user makes a GET /projects request
**When** the response is returned
**Then** only projects belonging to the member's exact org unit are returned

**Given** `OrgUnitsController` POST/PATCH/DELETE endpoints make structural changes
**When** the request is processed
**Then** `OrgScopeService.invalidateAll()` is called after the mutation (Redis cache cleared)

**Given** `UsersController PATCH /:id` updates a user's `orgUnitId`
**When** the request is processed
**Then** `OrgScopeService.invalidateUser(userId)` is called after the update

---

### Story 15.6: Permissions Admin API — System Role, Module Role & User Permission CRUD

As an admin user,
I want REST API endpoints to manage system role permissions, module roles, and user-level assignments/overrides,
So that the permission system is fully configurable via UI without touching the database.

**Acceptance Criteria:**

**— System Role Permissions (Track 1) —**

**Given** an ADMIN user calls `GET /api/v1/permissions`
**When** the response is returned
**Then** it returns all permission codes grouped by module/domain with the structure:
```json
{ "data": { "tasks": ["tasks:read", "tasks:approve", ...], "projects": [...], ... } }
```

**Given** an ADMIN user calls `GET /api/v1/permissions/system-roles/:role` (role = ADMIN|LEADERSHIP|PM|MEMBER)
**When** the response is returned
**Then** it returns `{ data: { role: "PM", permissions: ["projects:read", ...] } }`

**Given** an ADMIN user calls `PUT /api/v1/permissions/system-roles/:role` with body `{ "permissions": [...] }`
**When** the request is processed
**Then** `role_permissions` for that role is replaced with the new set (delete old + insert new in transaction)
**And** Redis keys `perm:*` for all users with that role are invalidated
**And** response: `{ data: { role: "PM", permissions: [...] } }`

**Given** a non-ADMIN user calls `PUT /api/v1/permissions/system-roles/:role`
**When** the request is processed
**Then** HTTP 403 is returned

**— Module Roles (Track 2) —**

**Given** an ADMIN user calls `GET /api/v1/permissions/module-roles`
**When** the response is returned
**Then** it returns all module roles grouped by domain:
```json
{
  "data": {
    "hr": [{ "code": "hr:manager", "name": "HR Manager", "permissions": ["hr_employee:read", ...] }],
    "finance": [{ "code": "finance:accountant", ... }]
  }
}
```

**Given** an ADMIN user calls `PUT /api/v1/permissions/module-roles/:code` with body `{ "permissions": ["hr_employee:read", "hr_payroll:view"] }`
**When** the request is processed
**Then** `module_role_permissions` for that role is replaced with the new set
**And** Redis keys `perm:*` for all users assigned that module role are invalidated
**And** response: `{ data: { code: "hr:manager", permissions: [...] } }`

**Given** an ADMIN user calls `DELETE /api/v1/permissions/module-roles/:code`
**When** the module role has `isSystem: true`
**Then** HTTP 400 is returned: `{ message: "Không thể xóa system module role" }`

**When** the module role has `isSystem: false`
**Then** the module role, its permissions, and all user assignments are deleted (cascade)

**— User Assignments (both tracks) —**

**Given** an ADMIN user calls `GET /api/v1/permissions/users/:id`
**When** the response is returned
**Then** it returns:
```json
{
  "data": {
    "userId": "...",
    "systemRole": "MEMBER",
    "moduleRoles": ["hr:manager"],
    "effectivePermissions": ["projects:read", "hr_employee:read", ...],
    "overrides": [{ "code": "tasks:approve", "granted": true }]
  }
}
```

**Given** an ADMIN user calls `POST /api/v1/permissions/users/:id/module-roles` with body `{ "roleCode": "hr:manager" }`
**When** the request is processed
**Then** a `user_module_roles` row is created
**And** Redis key `perm:{userId}` is deleted
**And** response: HTTP 201

**Given** an ADMIN user calls `DELETE /api/v1/permissions/users/:id/module-roles/hr:manager`
**When** the request is processed
**Then** the `user_module_roles` row is deleted
**And** Redis key `perm:{userId}` is deleted
**And** response: HTTP 200

**Given** an ADMIN user calls `POST /api/v1/permissions/users/:id/overrides` with body `{ "code": "tasks:approve", "granted": true }`
**When** the request is processed
**Then** a `user_permissions` row is upserted
**And** Redis key `perm:{userId}` is deleted
**And** response: HTTP 201

**Given** an ADMIN user calls `DELETE /api/v1/permissions/users/:id/overrides/tasks:approve`
**When** the request is processed
**Then** the `user_permissions` row is deleted and Redis key invalidated
**And** response: HTTP 200

**Given** an invalid permission code or module role code is submitted
**When** the request is processed
**Then** HTTP 400 with descriptive error message

**Given** a non-ADMIN user calls any write endpoint in this controller
**When** the request is processed
**Then** HTTP 403 (requires `admin:permissions`)

---

### Story 15.7: Admin UI — Permission Management Page (3 Tabs)

As an admin user,
I want a UI page with 3 tabs to manage system role permissions, module roles, and individual user assignments/overrides,
So that I can configure the full dual-track permission system without touching the database.

**Acceptance Criteria:**

**Given** the admin navigates to `/settings/permissions`
**When** the page loads
**Then** the page title is "Quản lý Phân quyền" with breadcrumb Settings > Phân quyền
**And** the page has three tabs: "Quyền hệ thống", "Module Roles (ERP)", "Phân quyền Người dùng"

**— Tab 1: "Quyền hệ thống" (System Role permissions) —**

**Given** the user is on tab "Quyền hệ thống"
**When** the tab renders
**Then** a matrix table is displayed: columns = system roles (ADMIN, LEADERSHIP, PM, MEMBER), rows = permission codes grouped by domain/module
**And** each cell is a Checkbox (checked = role has this permission)
**And** ADMIN column: all checkboxes checked and disabled (cannot be edited)
**And** for LEADERSHIP, PM, MEMBER columns: checkboxes are editable
**And** each module group row has a "Chọn tất cả / Bỏ tất cả" group header action

**Given** admin changes any checkbox on a non-ADMIN role column
**When** "Lưu thay đổi" button (sticky bottom) is clicked
**Then** `PUT /api/v1/permissions/system-roles/:role` is called for each changed role
**And** on success: toast "Cập nhật quyền cho [Role] thành công"
**And** unsaved changes indicator shown while edits are pending

**— Tab 2: "Module Roles (ERP)" —**

**Given** the user is on tab "Module Roles (ERP)"
**When** the tab renders
**Then** module roles are listed grouped by domain as collapsible sections (hr, finance, crm, operations)
**And** each row shows: role code, name, domain badge, isSystem indicator, assigned permission count, action buttons
**And** system roles have a lock icon and no Delete button

**Given** the admin clicks on a module role row
**When** a right-side drawer opens
**Then** it shows: role name, domain, description, and a permission checklist grouped by module
**And** only permissions relevant to that domain's codes are pre-filtered (all codes still accessible via search)
**And** clicking "Lưu" calls `PUT /api/v1/permissions/module-roles/:code`

**Given** the admin clicks "Tạo Module Role"
**When** a drawer opens
**Then** it shows fields: code (format hint: "domain:name"), name, domain (select), description
**And** after saving: `POST /api/v1/permissions/module-roles` is called and the list refreshes

**— Tab 3: "Phân quyền Người dùng" —**

**Given** the user is on tab "Phân quyền Người dùng"
**When** the tab renders
**Then** a user search Select with autocomplete is shown at the top (search by name/email)

**Given** a user is selected
**When** `GET /api/v1/permissions/users/:id` responds
**Then** the panel shows 3 sections:
  1. **System Role**: current system role badge (read-only, change via User settings)
  2. **Module Roles**: list of assigned module roles as removable Tags, "+" button to add more
  3. **Overrides**: list of user-level grant/revoke overrides as table rows

**Given** admin clicks "+" in Module Roles section
**When** a dropdown appears
**Then** it lists all available module roles (with domain grouping)
**And** selecting one calls `POST /api/v1/permissions/users/:id/module-roles`
**And** the tag appears immediately (optimistic update)

**Given** admin clicks X on a module role tag
**When** a popconfirm asks "Xóa module role này?"
**Then** confirming calls `DELETE /api/v1/permissions/users/:id/module-roles/:code`

**Given** admin clicks "Thêm Override" in Overrides section
**When** a modal opens
**Then** it shows: permission code selector (full list with search), Cấp / Thu hồi toggle
**And** clicking Lưu calls `POST /api/v1/permissions/users/:id/overrides`

**Given** admin clicks Delete on an override row
**When** popconfirm is confirmed
**Then** `DELETE /api/v1/permissions/users/:id/overrides/:code` is called

**— Common —**

**Given** a non-ADMIN user navigates to `/settings/permissions`
**When** the page loads
**Then** the page shows "Bạn không có quyền truy cập trang này"

**Given** the page uses dark mode
**When** rendered
**Then** table header uses ConfigProvider token override: `colorBgContainer` (không tối dark mode)

---

### Story 15.8: Frontend Permission Gate — usePermissions Hook + CanDo Component

As a frontend developer,
I want a usePermissions hook and CanDo component to gate UI elements based on the current user's effective permissions,
So that unauthorized users never see buttons or menus they can't use.

**Acceptance Criteria:**

**Given** the user logs in or refreshes the page
**When** `GET /api/v1/auth/me` is called
**Then** the response now includes a `permissions: string[]` field containing the user's effective permission codes
**And** the `useQuery(['me'])` cache in TanStack Query stores this data

**Given** the `usePermissions()` hook is used in any component
**When** the hook is called
**Then** it returns `{ can: (code: string) => boolean, permissions: string[] }`
**And** `can('tasks:approve')` returns `true` if the code is in the user's permissions list
**And** if the user data is still loading, `can()` returns `false` (safe default — hide until confirmed)

**Given** a component wraps content with `<CanDo permission="tasks:approve"><Button>Duyệt</Button></CanDo>`
**When** the current user has `tasks:approve`
**Then** the Button renders normally

**Given** the same `<CanDo permission="tasks:approve">` wrapper
**When** the current user does NOT have `tasks:approve`
**Then** nothing renders (null — component is completely hidden, not disabled)

**Given** `<CanDo permission="tasks:approve" fallback={<Tooltip>Không có quyền</Tooltip>}>`
**When** the current user does NOT have the permission
**Then** the fallback renders instead

**Given** the following UI elements are gated by permissions
**When** the user does not have the required permission
**Then** those elements are hidden:
- Task list "Duyệt" button → `tasks:approve`
- Reports page "Xuất Excel" button → `reports:export`
- Timesheets "Duyệt" button → `timesheets:approve`
- Bugs "Đóng bug" button → `bugs:close`
- Issues "Phê duyệt CR" button → `issues:approve`
- Settings nav item "Phân quyền" → `admin:permissions`
- Sidebar menu "Nhân sự" → `employees:read`
- Dashboard "Leadership" section → visible only if `dashboard:read` AND role is LEADERSHIP or ADMIN

**Given** the user's permissions change (admin updates role permissions or user override)
**When** the user refreshes the page or re-authenticates
**Then** `GET /api/v1/auth/me` returns the updated permissions list
**And** UI elements appear/disappear accordingly

**Given** the `usePermissions` hook is implemented in `packages/shared`
**When** it is imported in both `apps/web` and `apps/mobile`
**Then** both apps share the same permission-checking logic

**Given** unit tests for `usePermissions` and `CanDo`
**When** tests run
**Then** tests cover: user-has-permission renders children, user-lacks-permission renders null, fallback renders when provided, loading state returns false


---

### Story 15.9: /auth/me — Expose Full Permission Context (ERP-Ready)

As a frontend developer,
I want the `/auth/me` endpoint to return both system role, module roles, and effective permissions,
So that the frontend can gate UI correctly including future ERP module features without additional API calls.

**Acceptance Criteria:**

**Given** an authenticated user calls `GET /api/v1/auth/me`
**When** the response is returned
**Then** the response now includes:
```json
{
  "data": {
    "id": "...",
    "email": "...",
    "name": "...",
    "role": "MEMBER",
    "orgUnitId": "...",
    "moduleRoles": ["hr:manager"],
    "permissions": ["projects:read", "tasks:read", "hr_employee:read", ...]
  }
}
```
**And** `permissions` is the full effective list (system role + module roles + overrides)
**And** `moduleRoles` is the list of module role codes assigned to this user

**Given** a MEMBER user with no module roles
**When** `GET /api/v1/auth/me` responds
**Then** `moduleRoles: []` and `permissions` contains only MEMBER default permissions

**Given** a MEMBER user assigned `hr:manager` module role
**When** `GET /api/v1/auth/me` responds
**Then** `moduleRoles: ["hr:manager"]` and `permissions` includes both MEMBER perms AND hr:manager perms

**Given** the `usePermissions()` hook in `apps/web`
**When** the user data is loaded
**Then** `can('hr_employee:read')` returns `true` for a user with `hr:manager` module role
**And** `can('hr_employee:read')` returns `false` for a plain MEMBER user

**Given** the `CanDo` component wraps HR-specific UI elements in a future HR module page
**When** rendered for a MEMBER user without `hr:manager` role
**Then** those elements are hidden (null render)

**Given** `packages/shared/src/permissions.ts` exports module role constants
**When** any app imports from `@loop/shared`
**Then** it can use `MODULE_ROLES.HR_MANAGER` (= `"hr:manager"`) and `MODULE_ROLES.FINANCE_ACCOUNTANT` (= `"finance:accountant"`) as type-safe constants

**Given** the auth module caches `GET /auth/me` response in React Query
**When** an admin assigns or removes a module role from the current user
**Then** `queryClient.invalidateQueries(['me'])` is called on the Permissions page after save
**And** the user's effective permissions refresh without page reload

---

## Epic 22: Payroll Compliance — Thuế TNCN & BHXH/BHYT/BHTN

**Mục tiêu:** Nâng cấp engine tính lương thành hệ thống tuân thủ pháp lý Việt Nam hoàn chỉnh: BHXH/BHYT/BHTN đúng luật, thuế TNCN biểu lũy tiến configurable, phiếu lương PDF, và file khai/quyết toán thuế. Toàn bộ cấu hình (biểu thuế, tỷ lệ BH, bảng lương) có `effectiveDate` và quản lý qua UI.

---

### Story 22.1: Data Foundation — Prisma Schema, Migration & Seed Data

As a developer,
I want all payroll compliance models created in the database with correct relationships and seed data,
So that all other payroll stories have a stable, legally-compliant data foundation to build on.

**Acceptance Criteria:**

**Given** the Prisma migration is run on an existing Loop database
**When** `prisma migrate deploy` executes
**Then** the following new models are created without errors: `InsuranceConfig`, `TaxBracket`, `TaxDeductionConfig`, `WageZoneConfig`, `EmployeeTaxProfile`, `Dependent`, `AllowanceType`, `BonusType`, `EmployeeBonus`, `EmployeeYearlyTaxSummary`, `EmployeeAllowance`, `SalaryColumn`
**And** `PayrollRecord` is extended with the following new nullable/defaulted columns: `grossSalary`, `overtimePay`, `allowances`, `bhxhEmployee`, `bhytEmployee`, `bhtnEmployee`, `bhxhEmployer`, `bhytEmployer`, `bhtnEmployer`, `tnldEmployer`, `taxableIncome`, `selfDeduction`, `dependentDeduction`, `dependentCount`, `pitAmount`, `totalLaborCost`, `unpaidLeaveDays`, `paidLeaveDays`, `overtimePayBreakdown`, `payslipPath`, `configSnapshot`, `overrideNote`, `periodType`
**And** composite indexes `@@index([employeeId, periodId])` and `@@index([periodId])` are added to `PayrollRecord`
**And** existing `PayrollRecord` rows are not affected (all new columns have defaults)

**Given** the seed script runs after migration
**When** `prisma db seed` executes
**Then** the following seed data exists in the database:
- 1 `InsuranceConfig` record: BHXH NLĐ=8%, BHYT NLĐ=1.5%, BHTN NLĐ=1%, BHXH NLĐ SD=17%, BHYT NLĐ SD=3%, BHTN NLĐ SD=1%, TNLĐ=0.5%, `effectiveFrom=2020-01-01`
- 1 `TaxBracket` record: biểu 7 bậc `effectiveFrom=2020-01-01` với JSON brackets đúng tỷ lệ pháp định
- 1 `TaxBracket` record: biểu 5 bậc `effectiveFrom=2026-01-01` (Luật 109/2025/QH15)
- 1 `TaxDeductionConfig`: bản thân=11M, NPT=4.4M, `effectiveFrom=2020-01-01`
- 1 `TaxDeductionConfig`: bản thân=15.5M, NPT=6.2M, `effectiveFrom=2026-01-01`
- 1 `WageZoneConfig`: Vùng I=4.96M, Vùng II=4.41M, Vùng III=3.86M, Vùng IV=3.45M, `effectiveFrom=2024-07-01`
- Default `AllowanceType` records: Ăn ca (730k, isBhxhExempt=true, isPitExempt=true, pitExemptCeiling=730000), Điện thoại (300k, isBhxhExempt=true, isPitExempt=true, pitExemptCeiling=null), Xăng xe (500k, isBhxhExempt=true, isPitExempt=false)
- Default `SalaryColumn` records: Lương cơ bản (source=CONTRACT_SALARY, EARNING, sortOrder=1), Lương ngày công (source=FORMULA `{contractSalary}/{standardDays}*{workDays}`, EARNING, sortOrder=2), OT ngày thường (FORMULA, EARNING, sortOrder=5), OT cuối tuần (FORMULA, EARNING, sortOrder=6), OT lễ/Tết (FORMULA, EARNING, sortOrder=7)

**Given** a developer runs `npm run test` in apps/backend
**When** unit tests for payroll models execute
**Then** all model relations resolve correctly (EmployeeTaxProfile → Dependent, PayrollRecord → EmployeeAllowance → AllowanceType, PayrollRecord → EmployeeBonus → BonusType)

---

### Story 22.2: Insurance Configuration API (FR-CF01–FR-CF05)

As an Admin,
I want to manage BHXH/BHYT/BHTN rate configurations via a versioned API with effective dates,
So that insurance calculations always use the legally correct rates and historical configs are preserved for audit.

**Acceptance Criteria:**

**Given** an authenticated Admin user with `PAYROLL_MANAGE` permission
**When** `GET /api/v1/payroll/insurance-configs` is called
**Then** the response returns a paginated list of all `InsuranceConfig` records ordered by `effectiveFrom` DESC
**And** each record includes all rate fields, wageBase, bhxhCeilingMultiple, effectiveFrom, createdAt, and a computed `bhxhCeiling` = `wageBase × bhxhCeilingMultiple`

**Given** an Admin with `PAYROLL_MANAGE` permission
**When** `POST /api/v1/payroll/insurance-configs` is called with valid rate fields and a new effectiveFrom
**Then** a new `InsuranceConfig` is created
**And** `AuditLog` records the creation with actor, timestamp, and all field values

**Given** an Admin attempts to POST a new InsuranceConfig
**When** the effectiveFrom date duplicates an existing config for the same tenantId
**Then** the API returns `409 Conflict`

**Given** a PayrollRecord has been processed using an InsuranceConfig
**When** an Admin calls `DELETE /api/v1/payroll/insurance-configs/:id`
**Then** the API returns `409 Conflict` with message "Config đã được dùng trong kỳ lương, không thể xóa"
**And** the config remains unchanged

**Given** any authenticated user without `PAYROLL_MANAGE`
**When** they call POST/DELETE on insurance config endpoints
**Then** the API returns `403 Forbidden`

**Given** `GET /api/v1/payroll/insurance-configs/active?date=2026-07-01`
**When** called
**Then** returns the InsuranceConfig with the highest effectiveFrom that is ≤ 2026-07-01

---

### Story 22.3: Tax Bracket & Deduction Config API (FR-TX01–FR-TX05)

As an Admin,
I want to manage progressive income tax brackets and personal deduction limits via API with effective dates,
So that PIT calculations automatically use the correct rates when laws change.

**Acceptance Criteria:**

**Given** an Admin with `PAYROLL_MANAGE` permission
**When** `GET /api/v1/payroll/tax-brackets` is called
**Then** returns all TaxBracket records ordered by effectiveFrom DESC
**And** each record includes id, name, effectiveFrom, brackets JSON (array of {from, to, rate}), and a `isInUse` flag

**Given** an Admin
**When** `POST /api/v1/payroll/tax-brackets` is called with name="Biểu 5 bậc 2026", effectiveFrom="2026-01-01", and a valid brackets array
**Then** a new TaxBracket is created
**And** brackets are validated: rates sum to ≤ 100%, `from` of each bracket = `to` of previous bracket

**Given** a TaxBracket has `isInUse = true` (used by an APPROVED PayrollRecord)
**When** Admin attempts to modify or delete it
**Then** API returns `409 Conflict`

**Given** `GET /api/v1/payroll/tax-brackets/active?date=2025-12-01`
**When** called
**Then** returns the TaxBracket with effectiveFrom ≤ 2025-12-01 and the latest date (the 7-bracket version)

**Given** `GET /api/v1/payroll/tax-brackets/active?date=2026-01-15`
**When** called
**Then** returns the 5-bracket TaxBracket (effectiveFrom=2026-01-01)

**Given** an Admin with `PAYROLL_MANAGE`
**When** `GET /api/v1/payroll/tax-deductions` is called
**Then** returns all TaxDeductionConfig records ordered by effectiveFrom DESC

**When** `POST /api/v1/payroll/tax-deductions` is called with selfDeduction=15500000, dependentDeduction=6200000, effectiveFrom=2026-01-01
**Then** a new TaxDeductionConfig is created and AuditLog records the change

---

### Story 22.4: Salary Column Configuration API (FR-SL01–FR-SL04)

As an Admin,
I want to define and manage salary table columns with sources and formulas via API,
So that the gross salary calculation is configurable without code changes.

**Acceptance Criteria:**

**Given** an Admin with `PAYROLL_MANAGE`
**When** `GET /api/v1/payroll/salary-columns` is called
**Then** returns all SalaryColumn records ordered by sortOrder ASC, including both active and inactive

**Given** an Admin
**When** `POST /api/v1/payroll/salary-columns` is called with:
  - name="OT ngày thường", type=EARNING, source=FORMULA, formula="{contractSalary}/{standardDays}/8*1.5*{otWeekday}", isBhxhExempt=false, isPitExempt=false, sortOrder=5
**Then** a new SalaryColumn is created

**Given** `source = FORMULA`
**When** the formula contains a variable not in the allowed set (`{contractSalary}`, `{workDays}`, `{standardDays}`, `{overtimeHours}`, `{otWeekday}`, `{otWeekend}`, `{otHoliday}`)
**Then** API returns `400 Bad Request` with message "Biến không hợp lệ trong công thức"

**Given** `source = ALLOWANCE_TYPE`
**When** POST is called without an `allowanceTypeId`
**Then** API returns `400 Bad Request`

**Given** a SalaryColumn exists
**When** `PATCH /api/v1/payroll/salary-columns/:id` is called with `isActive=false`
**Then** the column is deactivated (not deleted)
**And** existing PayrollRecords are not affected (configSnapshot preserves the historical state)

**Given** a new PayrollPeriod is processed after a SalaryColumn config change
**When** the engine runs
**Then** it uses the current active SalaryColumns
**And** `PayrollRecord.configSnapshot` stores a snapshot with `snapshotVersion=1` and the full column list used

---

### Story 22.5: Employee Tax Profile & Allowance Management (FR-TE01–FR-TE06)

As an HR Admin,
I want to manage each employee's tax profile, MST, dependents, and allowance overrides,
So that personal income tax is calculated correctly for each individual.

**Acceptance Criteria:**

**Given** an HR Admin with `PAYROLL_MANAGE`
**When** `GET /api/v1/payroll/employees/:employeeId/tax-profile` is called
**Then** returns the EmployeeTaxProfile (or 404 with suggestion to create one)
**And** includes taxId, residencyStatus, wageZone, and a list of active Dependent records

**When** `PUT /api/v1/payroll/employees/:employeeId/tax-profile` is called with taxId="123456789", residencyStatus=RESIDENT, wageZone=1
**Then** the profile is created or updated (upsert)
**And** AuditLog records the change

**Given** an HR Admin
**When** `POST /api/v1/payroll/employees/:employeeId/dependents` is called with name, relationship, registeredFrom="2026-03-01"
**Then** a new Dependent is created
**And** from the next payroll period with endDate ≥ 2026-03-01, the dependent deduction applies

**When** `PATCH /api/v1/payroll/employees/:employeeId/dependents/:dependentId` is called with registeredTo="2026-12-31"
**Then** the NPT is terminated from January 2027 onwards (registeredTo is set, not deleted)

**Given** an Admin
**When** `GET /api/v1/payroll/allowance-types` is called
**Then** returns all AllowanceType records with isBhxhExempt, isPitExempt, pitExemptCeiling flags

**When** `POST /api/v1/payroll/allowance-types` is called with name="Ăn ca", defaultAmount=730000, isBhxhExempt=true, isPitExempt=true, pitExemptCeiling=730000
**Then** a new AllowanceType is created

**Given** an employee with no EmployeeAllowance override for the current period
**When** the payroll engine runs
**Then** the AllowanceType.defaultAmount is used for that employee's allowance

**Given** an HR Admin creates an EmployeeAllowance override via `POST /api/v1/payroll/records/:recordId/allowances`
**When** amount=500000 and overrideNote="Giảm do nghỉ nửa tháng" are provided
**Then** the engine uses 500000 instead of the AllowanceType default for that employee that period

---

### Story 22.6: Payroll Engine — Core Calculation (FR-PR01–FR-PR08, FR-PR12, FR-PR13)

As an HR Admin,
I want the payroll engine to automatically calculate gross, BHXH/BHYT/BHTN, PIT, and net salary in compliance with Vietnamese law when I trigger processing,
So that I no longer need to manually calculate using Excel.

**Acceptance Criteria:**

**Given** a PayrollPeriod in DRAFT status with all employees having APPROVED TimesheetRecords
**When** HR triggers `POST /api/v1/payroll/periods/:id/process`
**Then** for each employee in the period, the engine syncs: `workDays` (actual working days), `paidLeaveDays` (APPROVED LeaveRequests marked as paid), `unpaidLeaveDays` (APPROVED LeaveRequests marked as unpaid), `overtimeHours` broken down by OvertimeCategory (WEEKDAY/WEEKEND/HOLIDAY)

**Given** an employee with `Contract.type = PROBATION`
**When** the engine calculates gross salary
**Then** `baseSalary = Contract.salaryMonthly × 0.85`
**And** the payslip breakdown shows "Lương thử việc (85% mức chính thức): [amount]"

**Given** the SalaryColumn config contains FORMULA columns
**When** the engine evaluates each column
**Then** variables `{contractSalary}`, `{workDays}`, `{standardDays}`, `{otWeekday}`, `{otWeekend}`, `{otHoliday}` are resolved correctly
**And** `grossSalary = Σ EARNING columns − Σ DEDUCTION columns`

**Given** an employee with `unpaidLeaveDays = 14` or more in the period
**When** BHXH/BHYT/BHTN is calculated
**Then** `bhxhEmployee = bhytEmployee = bhtnEmployee = bhxhEmployer = bhytEmployer = bhtnEmployer = 0`

**Given** an employee with `unpaidLeaveDays < 14`
**When** BHXH is calculated
**Then** `bhxhBase = MIN(Contract.salaryMonthly, InsuranceConfig.wageBase × InsuranceConfig.bhxhCeilingMultiple)`
**And** NOT based on grossSalary
**And** all BHXH/BHYT/BHTN amounts are rounded up to the nearest 100đ (Nghị định 115/2015)

**Given** an employee is a resident (`residencyStatus = RESIDENT`)
**When** PIT is calculated
**Then** `taxableIncome = grossSalary - pitExemptAllowances - bhxhEmployee - bhytEmployee - bhtnEmployee - selfDeduction - (dependentCount × dependentDeduction)`
**And** the engine applies the TaxBracket active at the last day of the period
**And** `pitAmount` is calculated progressively across brackets and rounded down to the nearest đồng (Thông tư 111/2013)

**Given** an employee with `Contract.type = FREELANCE`
**When** gross salary is calculated
**Then** bhxhEmployee = bhytEmployee = bhtnEmployee = bhxhEmployer = bhytEmployer = bhtnEmployer = 0
**And** if `grossSalary >= 2000000`: `pitAmount = grossSalary × 0.10`
**And** if `grossSalary < 2000000`: `pitAmount = 0` and a note is added "Dưới ngưỡng khấu trừ — NV tự kê khai"

**Given** a PayrollPeriod transitions to `APPROVED`
**When** the engine finalizes
**Then** `EmployeeYearlyTaxSummary` for each employee is updated: `ytdGross += grossSalary`, `ytdTaxableIncome += taxableIncome`, `ytdPitPaid += pitAmount`, `ytdBhxhEmployee += bhxhEmployee`
**And** if no record exists for that year, one is created

**Given** a test case: employee with contractSalary=20,000,000, no NPT, resident, no unpaid leave, wageZone=1, 22 workDays out of 22 standardDays, period = March 2026 (biểu 5 bậc applies)
**When** calculation runs
**Then** BHXH NLĐ = 20,000,000 × 8% = 1,600,000 (rounded to 100đ)
**And** taxableIncome = 20,000,000 − 1,600,000 − 1.5%×20M − 1%×20M − 15,500,000 = 20M − 1.6M − 300k − 200k − 15.5M = 2,400,000
**And** pitAmount (2.4M is in bracket 1 at 5%) = 120,000 (rounded down to đồng)
**And** netSalary = 20,000,000 − 1,600,000 − 300,000 − 200,000 − 120,000 = 17,780,000

---

### Story 22.7: Payroll Period Workflow & Preview (FR-PR09–FR-PR11)

As an HR Admin,
I want full control over the payroll period state machine with a detailed preview before approval,
So that I can review, re-run, and approve payroll with confidence.

**Acceptance Criteria:**

**Given** an HR Admin with `PAYROLL_MANAGE`
**When** `POST /api/v1/payroll/periods` is called with startDate, endDate, type=REGULAR
**Then** a new PayrollPeriod with status=DRAFT is created
**And** startDate must be the 1st of a month and endDate must be the last day of the same month (validation error otherwise)

**When** `POST /api/v1/payroll/periods/:id/process` is called
**Then** the system checks: all employees in the period have a finalized TimesheetRecord
**And** if any employee is missing a TimesheetRecord, the API returns a list of blocking employee names and does NOT start processing
**And** HR can manually mark employees as "override" (với lý do bắt buộc) to unblock
**And** status transitions DRAFT → PROCESSING → REVIEWED

**When** `GET /api/v1/payroll/periods/:id/preview` is called
**Then** returns a paginated list of PayrollRecord breakdowns with required columns: employeeName, contractSalary, grossSalary, bhxhEmployee, bhytEmployee, bhtnEmployee, taxableIncome, dependentCount, pitAmount, netSalary
**And** supports expand query param to include overtimePayBreakdown and allowance detail per employee

**Given** a period in REVIEWED status
**When** `POST /api/v1/payroll/periods/:id/revert-to-draft` is called by an HR Admin
**Then** status changes REVIEWED → DRAFT
**And** AuditLog records actor, timestamp, and reason
**And** all PayrollRecords for the period are reset to recalculation state

**Given** a period in REVIEWED status
**When** `POST /api/v1/payroll/periods/:id/approve` is called by a user with `PAYROLL_APPROVE`
**Then** status changes REVIEWED → APPROVED
**And** YTD summaries are updated (FR-PR13)
**And** payslip generation is queued in BullMQ

**Given** a user without `PAYROLL_APPROVE`
**When** they call the approve endpoint
**Then** API returns `403 Forbidden`

**Given** an APPROVED period
**When** any edit is attempted on its PayrollRecords
**Then** the API returns `409 Conflict` with "Kỳ lương đã được duyệt, không thể chỉnh sửa"

**Given** `POST /api/v1/payroll/periods` with type=ADJUSTMENT, adjustmentForPeriodId pointing to an existing APPROVED period
**When** the adjustment period is processed
**Then** a delta payslip is generated with line "Điều chỉnh kỳ {tháng/năm}"
**And** YTD is updated with the delta

---

### Story 22.8: Payslip PDF Generation & Delivery (FR-PS01–FR-PS06)

As an employee,
I want to automatically receive my payslip as a PDF after each payroll approval and be able to view it in the app,
So that I can verify my salary breakdown at any time.

**Acceptance Criteria:**

**Given** a PayrollPeriod transitions to APPROVED status
**When** BullMQ processes the `generate-payslips` job
**Then** for each PayrollRecord in the period, a PDF is generated with:
  - Header: company name "Loop.vn", kỳ lương (tháng/năm), employee name, MST, department
  - Thu nhập section: breakdown by SalaryColumn (name, amount per column), gross total
  - Khấu trừ section: BHXH NLĐ, BHYT NLĐ, BHTN NLĐ, thuế TNCN, tổng khấu trừ
  - Tham khảo NSDLĐ section: BHXH/BHYT/BHTN/TNLĐ employer contribution (hiển thị tham khảo)
  - Footer: net salary, payment date, HR manager signature line
  - If PROBATION: explicit line "Lương thử việc (85% mức chính thức)"
  - If FREELANCE with pitAmount=0: note "Dưới ngưỡng khấu trừ — NV tự kê khai"

**Given** the PDF is generated
**When** it is stored
**Then** it is saved to MinIO bucket `loop-hr-files` at path `payslips/{year}/{month}/{employeeId}.pdf`
**And** `PayrollRecord.payslipPath` is updated with the storage path (NOT a presigned URL)

**Given** all PDFs for a period are generated
**When** the job completes
**Then** for each employee: a `PAYSLIP_ISSUED` in-app notification is created
**And** an email is sent via Nodemailer with:
  - Subject: `[Loop] Phiếu lương tháng {M}/{YYYY}`
  - Body: employee name, net salary amount, and a deep link to `/payroll/my-payslips/{recordId}` (NOT a presigned URL)

**Given** an employee calls `GET /api/v1/payroll/my-payslips`
**When** they have `PAYROLL_VIEW_OWN` permission
**Then** returns a list of their PayrollRecords ordered by period.endDate DESC (paginated)
**And** the filter is enforced server-side: `employeeId = caller.employeeId`

**Given** an employee calls `GET /api/v1/payroll/my-payslips/:recordId/download`
**When** the payslipPath exists
**Then** the server generates a presigned MinIO URL on-demand (valid 15 minutes)
**And** the presigned URL is returned in the response (not stored)
**And** if the employee tries to access another employee's record, 403 Forbidden is returned

**Given** any value on the payslip PDF
**When** verified against the corresponding PayrollRecord fields
**Then** every monetary value matches exactly (0 discrepancy) — this must be covered by a unit test asserting PDF template renders PayrollRecord values correctly

**Given** 200 employees in a period
**When** BullMQ generates all PDFs
**Then** the entire batch completes in under 60 seconds (NFR-PC04)

---

### Story 22.9: Tax Reports & Export (FR-QT01–FR-QT05)

As an HR Admin,
I want to export official Vietnamese tax report files (05-QTT-TNCN, 05-1/BK, 05-KK-TNCN, and labor cost),
So that I can submit them to the tax authority without manual data entry.

**Acceptance Criteria:**

**Given** an HR Admin with `PAYROLL_VIEW_ALL`
**When** `GET /api/v1/payroll/reports/tax-finalization?year=2026` is called
**Then** returns an Excel file download (Content-Disposition: attachment; filename=05-QTT-TNCN-2026.xlsx)
**And** the file follows the structure of Mẫu 05-QTT-TNCN (Thông tư 80/2021/TT-BTC, form HTKK hiện hành)
**And** data is read from `EmployeeYearlyTaxSummary` for year=2026 (NOT from joining PayrollRecord directly)
**And** includes all required columns per the official form

**When** `GET /api/v1/payroll/reports/tax-finalization-annex?year=2026` is called
**Then** returns an Excel file: Phụ lục 05-1/BK-QTT-TNCN — danh sách cá nhân có thu nhập từ tiền lương
**And** each row contains: employeeId, name, taxId, ytdGross, ytdTaxableIncome, ytdPitPaid, ytdBhxhEmployee

**When** `GET /api/v1/payroll/reports/tax-monthly?month=2026-05` is called
**Then** returns an Excel file: Mẫu 05-KK-TNCN — tổng hợp TNCN đã khấu trừ trong tháng 5/2026
**And** data is aggregated from PayrollRecords with periodType=REGULAR AND period month = 2026-05

**When** `GET /api/v1/payroll/reports/labor-cost?from=2026-01-01&to=2026-05-31` is called
**Then** returns an Excel file with columns: Kỳ lương | Tổng Gross | Tổng BHXH/BHYT/BHTN/TNLĐ NSDLĐ | Tổng chi phí nhân sự
**And** supports optional `departmentId` filter

**Given** any of the above reports
**When** called by a user without `PAYROLL_VIEW_ALL`
**Then** API returns `403 Forbidden`

---

### Story 22.10: Payroll Settings Frontend (FR-CF, FR-TX, FR-SL UI)

As an Admin,
I want a Payroll Settings page with tabs for insurance rates, tax brackets, and salary columns,
So that I can manage all payroll configurations in one place without using the API directly.

**Acceptance Criteria:**

**Given** an Admin navigates to `/payroll/settings`
**When** the page loads
**Then** a tab-based layout renders with 3 tabs: "Bảo hiểm xã hội" | "Biểu thuế TNCN" | "Bảng lương"

**Given** the "Bảo hiểm xã hội" tab is active
**When** displayed
**Then** shows a table of all InsuranceConfig records ordered by effectiveFrom DESC
**And** each row shows: effectiveDate, BHXH NLĐ%, BHYT NLĐ%, BHTN NLĐ%, BHXH NSDLĐ%, BHYT NSDLĐ%, BHTN NSDLĐ%, TNLĐ%, wageBase, bhxhCeiling (computed), action buttons
**And** a "Thêm cấu hình mới" button opens a form drawer to POST new config

**Given** the "Biểu thuế TNCN" tab is active
**When** displayed
**Then** shows a timeline-style list of TaxBracket records
**And** each bracket card shows: name, effectiveFrom, a table of brackets (ngưỡng từ | ngưỡng đến | thuế suất), isInUse badge
**And** "Thêm biểu thuế" button opens a drawer where Admin can add/remove bracket rows dynamically

**Given** the "Bảng lương" tab is active
**When** displayed
**Then** shows a sortable list of SalaryColumn records with drag-to-reorder (updates sortOrder)
**And** each column shows: name, type (EARNING/DEDUCTION badge), source, formula (if applicable), isBhxhExempt, isPitExempt flags, active toggle
**And** "Thêm cột" button opens a form drawer with: name, type selector, source selector, formula input (shown only if FORMULA), allowanceType selector (shown only if ALLOWANCE_TYPE)

**Given** all UI components on this page
**When** rendered in dark mode or with any theme preset
**Then** all colors use `useThemePalette()` (no hardcoded colors)
**And** EARNING columns use green tag style, DEDUCTION columns use red tag style (with explicit isDark style override per CLAUDE.md Nguyên tắc #6)
**And** Table columns use `<Text style={{ color: textPrimary }}>` wrappers (no plain strings per Nguyên tắc #5)
**And** StatCards if used must use the StatCard component from components/ui/StatCard.tsx

**Given** a user without `PAYROLL_MANAGE` navigates to `/payroll/settings`
**When** the page renders
**Then** all form drawers and action buttons are hidden or disabled

---

### Story 22.11: Payroll Management Frontend (HR Period & Approval UI)

As an HR Admin,
I want a Payroll Management page to create periods, review breakdowns, override values, and approve payroll,
So that I can complete the monthly payroll cycle entirely within the Loop app.

**Acceptance Criteria:**

**Given** an HR Admin navigates to `/payroll/periods`
**When** the page loads
**Then** shows a list of PayrollPeriod records with: kỳ lương, status badge (DRAFT/PROCESSING/REVIEWED/APPROVED/PAID with appropriate colors), total gross, total net, employee count
**And** a StatCard header row shows: Tổng Gross (color #6366F1), Tổng Net (color #10B981), Tổng BHXH NLĐ (color #3B82F6), Tổng Chi phí NLĐ (color #F97316)

**Given** HR Admin opens a PayrollPeriod in REVIEWED status
**When** the detail page `/payroll/periods/:id` loads
**Then** shows a table with columns: Họ tên | Gross | BHXH NLĐ | BHYT NLĐ | BHTN NLĐ | Thu nhập tính thuế | Số NPT | Thuế TNCN | Net
**And** each row has an expand icon to show per-allowance and OT breakdown (WEEKDAY/WEEKEND/HOLIDAY hours + amounts)

**Given** a PayrollRecord row in the preview
**When** HR Admin clicks the edit icon for an employee
**Then** an override modal opens with editable fields: workDays, overtimeHours (by category), overrideNote (required)
**And** on save, `PATCH /api/v1/payroll/records/:id/override` is called
**And** the row is re-highlighted to indicate manual override

**Given** the period is in REVIEWED status and the user has `PAYROLL_APPROVE`
**When** the Approve button is clicked
**Then** a confirmation modal shows: "Xác nhận duyệt kỳ lương {tháng}? Sau khi duyệt sẽ phát phiếu lương tự động."
**And** on confirm, the period status changes to APPROVED

**Given** the period is in REVIEWED status
**When** the "Chạy lại" button is clicked
**Then** a modal requests a reason
**And** on confirm, the period reverts to DRAFT for recalculation

**Given** an employee in the period has no finalized Timesheet
**When** the Process button is triggered
**Then** a warning banner shows the list of employees missing Timesheet
**And** each employee row has a "Override (ghi lý do)" button to manually unblock

**Given** all UI components on this page
**When** rendered in dark mode
**Then** all colors use `useThemePalette()`, StatCard uses the StatCard component, no hardcoded colors
**And** Table column renders return `<Text style={{ color: textPrimary/textMuted }}>` — no plain strings
**And** Status badges use explicit isDark Tag styles (DRAFT=gray, PROCESSING=blue, REVIEWED=amber, APPROVED=green, PAID=green+bold)

---

### Story 22.12: Employee Self-Service Payslip Frontend (FR-PS06)

As an employee,
I want to view my payslip history and download PDFs from the Loop app,
So that I can check my salary breakdown at any time without contacting HR.

**Acceptance Criteria:**

**Given** an authenticated employee navigates to `/payroll/my-payslips`
**When** the page loads with `PAYROLL_VIEW_OWN` permission
**Then** shows a list of their payslips ordered by date DESC
**And** each card shows: kỳ lương, gross salary, net salary, status, date
**And** a download icon on each card

**Given** an employee clicks a payslip card
**When** the detail view opens
**Then** shows the full breakdown: thu nhập (SalaryColumn breakdown), khấu trừ (BHXH/BHYT/BHTN/PIT), và lương thực lĩnh
**And** shows NPT count and giảm trừ amounts
**And** all monetary values formatted as "1.234.567 đ" (vi-VN locale)

**Given** an employee clicks the PDF download button
**When** `GET /api/v1/payroll/my-payslips/:id/download` is called
**Then** a presigned MinIO URL (15-minute TTL) is returned
**And** the browser opens the PDF in a new tab

**Given** any user tries to access another employee's payslip via `/payroll/my-payslips/:id`
**When** the ID belongs to a different employee
**Then** the backend returns `403 Forbidden`
**And** the frontend shows a 403 error page

**Given** no payslips exist for the employee
**When** the page loads
**Then** an empty state with message "Chưa có phiếu lương nào. Phiếu lương sẽ xuất hiện sau khi kỳ lương được duyệt." is shown

**Given** all UI components on this page
**When** rendered in dark mode or with any theme preset
**Then** all colors use `useThemePalette()`, monetary values formatted as vi-VN

---

### Story 22.13: Permission Integration, Security & Sidebar Navigation

As a system administrator,
I want all payroll endpoints protected by proper permission codes and payroll navigation visible to authorized users in the sidebar,
So that sensitive salary data is never accessible to unauthorized users.

**Acceptance Criteria:**

**Given** the `ROUTE_PERMISSION_MAP` in the frontend permission system
**When** the app initializes
**Then** the following entries exist:
  - `/payroll` → `PAYROLL_VIEW_ALL` (HR Admin, Leadership)
  - `/payroll/my-payslips` → `PAYROLL_VIEW_OWN` (any authenticated employee)
  - `/payroll/settings` → `PAYROLL_MANAGE` (Admin)
  - `/payroll/periods` → `PAYROLL_VIEW_ALL`

**Given** the `ICON_MAP` for sidebar navigation
**When** the payroll module is rendered
**Then** `/payroll` uses `BankOutlined` (or similar financial icon)

**Given** a MEMBER user without any payroll permissions
**When** they navigate to the sidebar
**Then** the Payroll section is not shown

**Given** an employee with only `PAYROLL_VIEW_OWN`
**When** they navigate to the sidebar
**Then** only "Phiếu lương của tôi" link is shown, not the period management or settings

**Given** all payroll API endpoints
**When** a request is made without the required permission
**Then** the backend returns `403 Forbidden`
**And** no payroll data (salaries, tax IDs, benefit amounts) is included in any error response
**And** salary data is never logged to stdout/stderr

**Given** `GET /api/v1/payroll/records` is called by an HR Admin with `PAYROLL_VIEW_ALL`
**When** a valid period filter is provided
**Then** all employees' records are returned

**Given** `GET /api/v1/payroll/records` is called by a regular employee
**When** processed
**Then** only records where `employeeId = caller.employeeId` are returned (row-level filter enforced)

**Given** the role assignment UI in Admin module
**When** an Admin assigns `PAYROLL_APPROVE` to a Kế toán user
**Then** that user can access the approve button on period detail pages
**And** `POST /api/v1/payroll/periods/:id/approve` returns 200 for that user
