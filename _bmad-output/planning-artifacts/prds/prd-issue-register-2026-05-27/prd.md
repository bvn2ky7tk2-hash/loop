---
title: "Loop — Issue Register (Quản lý Issues Triển khai Dự án)"
status: final
created: 2026-05-27
updated: 2026-05-27
epic: 14
---

# Loop — Issue Register: Quản lý Issues Triển khai Dự án

## 1. Tổng quan

### 1.1 Vấn đề

Trong quá trình triển khai dự án cho khách hàng, PM và team thường nhận được hai loại phản hồi từ phía khách: *lỗi hệ thống* cần sửa (Bug) và *yêu cầu thay đổi/bổ sung* ngoài phạm vi ban đầu (Change Request — CR). Hiện tại, các phản hồi này được ghi qua email, chat hoặc Excel rời rạc, dẫn đến:

1. **Mất kiểm soát trạng thái xử lý** — không biết issue nào đang làm, ai làm, bao giờ xong.
2. **CR không có cơ chế kiểm soát** — team làm CR mà chưa có PM phê duyệt, gây scope creep và rủi ro hợp đồng.
3. **Không có dữ liệu tổng hợp** — PM và lãnh đạo không nắm được số lượng issues tổng thể, tỷ lệ xử lý, xu hướng theo thời gian.
4. **Thông tin phân tán** — requester (tên KH), deadline, estimate lưu ở nhiều nơi khác nhau.

### 1.2 Giải pháp

Module **Issue Register** là công cụ tập trung để PM/team ghi nhận, phân loại và theo dõi toàn bộ issues phát sinh trong giai đoạn triển khai. CR bắt buộc phải qua luồng phê duyệt của PM trước khi triển khai. Dashboard thống kê real-time giúp PM và lãnh đạo nắm toàn cảnh.

### 1.3 Phạm vi

- Nền tảng: Web (ưu tiên) + Mobile (xem và cập nhật trạng thái).
- Đối tượng sử dụng chính: PM (duyệt CR, theo dõi tổng thể), Member (log issue, xử lý được giao), Leadership (dashboard).
- Người yêu cầu (requester) là **bên ngoài hệ thống** (khách hàng), được nhập tay dạng text — không phải user hệ thống.
- Reporter và Assignee là **user trong hệ thống**.
- Tích hợp notification in-app và Telegram (tận dụng infrastructure Epic 7 + Epic 11).
- Export Excel/CSV để báo cáo định kỳ cho khách hàng.

---

## 2. Người dùng & Phân quyền

| Role | Quyền trên Issue Register |
|---|---|
| **Admin** | CRUD tất cả issues mọi project trong scope |
| **PM** | CRUD issues trong project của mình; duyệt/từ chối CR; xem dashboard toàn scope |
| **Member** | Tạo issue mới; cập nhật status issue được giao; xem issues trong project mình tham gia |
| **Leadership** | Xem dashboard và danh sách issues trong scope (read-only) |

Phân quyền tuân theo nguyên tắc org-scope đã thiết lập: mọi query filter theo `orgUnitIds[]` từ `OrgScopeInterceptor`.

---

## 3. Yêu cầu Chức năng

### 3.1 Data Model

#### Enums

**IssueType**
```
BUG  — Lỗi hệ thống cần sửa
CR   — Change Request, yêu cầu thay đổi/bổ sung ngoài phạm vi ban đầu
```

**IssueStatus**
```
OPEN            — Mới tạo, chưa phân tích
PENDING         — Đã ghi nhận, đang chờ phân công / khởi động
PENDING_REVIEW  — CR đang chờ PM phê duyệt (chỉ áp dụng cho CR)
APPROVED        — CR đã được PM duyệt, sẵn sàng triển khai
REJECTED        — CR bị PM từ chối (trạng thái cuối)
IN_PROGRESS     — Đang xử lý
RESOLVED        — Đã xử lý xong, chờ confirm
CLOSED          — Đã đóng (confirmed với khách hoặc PM)
CANCELLED       — Huỷ
```

**IssuePriority**
```
CRITICAL | HIGH | MEDIUM | LOW
```

#### Valid Transitions

**BUG:**
```
OPEN        → PENDING, IN_PROGRESS, CANCELLED
PENDING     → IN_PROGRESS, CANCELLED
IN_PROGRESS → RESOLVED, CANCELLED
RESOLVED    → CLOSED, IN_PROGRESS   (reopen nếu chưa xong)
CLOSED      → (terminal)
CANCELLED   → (terminal)
```

**CR:**
```
OPEN            → PENDING_REVIEW, CANCELLED
PENDING_REVIEW  → APPROVED, REJECTED, CANCELLED
APPROVED        → IN_PROGRESS, CANCELLED
IN_PROGRESS     → RESOLVED, CANCELLED
RESOLVED        → CLOSED, IN_PROGRESS
CLOSED          → (terminal)
REJECTED        → (terminal)
CANCELLED       → (terminal)
```

#### Issue Model (Prisma)

```prisma
model Issue {
  id               String          @id @default(uuid())
  projectId        String          @map("project_id")
  type             IssueType
  title            String
  description      String?         @db.Text
  requesterName    String          @map("requester_name")   // tên KH, nhập tay
  priority         IssuePriority   @default(MEDIUM)
  status           IssueStatus     @default(OPEN)
  recordedAt       DateTime        @default(now()) @map("recorded_at")   // auto
  dueDate          DateTime?       @map("due_date")                       // deadline KH yêu cầu
  estimatedHours   Int?            @map("estimated_hours")                // ước lượng team
  resolvedAt       DateTime?       @map("resolved_at")                    // auto khi → RESOLVED
  closedAt         DateTime?       @map("closed_at")                      // auto khi → CLOSED
  affectedModule   String?         @map("affected_module")
  resolutionNote   String?         @db.Text @map("resolution_note")       // mô tả kết quả xử lý
  reporterId       String          @map("reporter_id")       // user hệ thống
  assigneeId       String?         @map("assignee_id")       // user hệ thống
  pmApproverId     String?         @map("pm_approver_id")    // PM duyệt CR
  approvalNote     String?         @db.Text @map("approval_note")
  approvedAt       DateTime?       @map("approved_at")
  createdAt        DateTime        @default(now()) @map("created_at")
  updatedAt        DateTime        @updatedAt @map("updated_at")

  project          Project         @relation(...)
  reporter         User            @relation("IssueReporter", ...)
  assignee         User?           @relation("IssueAssignee", ...)
  pmApprover       User?           @relation("IssuePMApprover", ...)
  tags             IssueTag[]
  attachments      IssueAttachment[]
  comments         IssueComment[]
  auditLogs        IssueAuditLog[]
  linkedTasks      IssueTask[]

  @@index([projectId, status])
  @@index([assigneeId, status])
  @@index([reporterId])
  @@index([type, status])
  @@index([dueDate])
  @@map("issues")
}

model IssueTag {
  issueId  String  @map("issue_id")
  tag      String
  issue    Issue   @relation(...)
  @@id([issueId, tag])
  @@map("issue_tags")
}

model IssueTask {
  issueId  String  @map("issue_id")
  taskId   String  @map("task_id")
  issue    Issue   @relation(...)
  task     Task    @relation(...)
  @@id([issueId, taskId])
  @@map("issue_tasks")
}

model IssueAttachment {
  id        String   @id @default(uuid())
  issueId   String   @map("issue_id")
  fileName  String   @map("file_name")
  fileKey   String   @map("file_key")   // MinIO object key
  fileSize  Int      @map("file_size")
  mimeType  String   @map("mime_type")
  createdAt DateTime @default(now()) @map("created_at")
  issue     Issue    @relation(...)
  @@map("issue_attachments")
}

model IssueComment {
  id        String   @id @default(uuid())
  issueId   String   @map("issue_id")
  authorId  String   @map("author_id")
  body      String   @db.Text
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  issue     Issue    @relation(...)
  author    User     @relation(...)
  @@index([issueId])
  @@map("issue_comments")
}

model IssueAuditLog {
  id         String    @id @default(uuid())
  issueId    String    @map("issue_id")
  actorId    String    @map("actor_id")
  action     String                        // e.g. "STATUS_CHANGED", "ASSIGNED", "APPROVED"
  fromValue  String?   @map("from_value")
  toValue    String?   @map("to_value")
  note       String?
  createdAt  DateTime  @default(now()) @map("created_at")
  issue      Issue     @relation(...)
  actor      User      @relation(...)
  @@index([issueId])
  @@map("issue_audit_logs")
}
```

---

### 3.2 Functional Requirements

#### FR-IR01 — Tạo Issue
Bất kỳ Member/PM nào cũng có thể tạo issue mới với các trường:

| Trường | Required | Ghi chú |
|---|---|---|
| `type` | ✅ | BUG hoặc CR |
| `title` | ✅ | Tối đa 255 ký tự |
| `requesterName` | ✅ | Tên khách hàng/người yêu cầu, nhập tay tự do |
| `projectId` | ✅ | Project thuộc scope user |
| `description` | ❌ | Rich text (plain textarea) |
| `priority` | ✅ | Mặc định MEDIUM |
| `dueDate` | ❌ | Hạn xử lý theo yêu cầu KH |
| `estimatedHours` | ❌ | Ước lượng giờ làm của team |
| `affectedModule` | ❌ | Phần/module bị ảnh hưởng |
| `assigneeId` | ❌ | User hệ thống được giao |
| `taskIds[]` | ❌ | Task liên quan trong cùng project |
| `tags[]` | ❌ | Label tự do |

`recordedAt` tự động = `now()` khi tạo.

Khi tạo CR: `status` tự động set = `PENDING_REVIEW` (bỏ qua OPEN — CR cần PM duyệt ngay).
Khi tạo BUG: `status` = `OPEN`.

#### FR-IR02 — Xem & Filter Danh sách Issues (Global)
Trang `/issues` hiển thị tất cả issues trong org scope của user với filter:
- `type` (BUG / CR / All)
- `status` (multi-select)
- `priority` (multi-select)
- `projectId`
- `assigneeId`
- `reporterId`
- `requesterName` (text search, contains)
- `dateRange` (recordedAt)
- `overdue` (boolean toggle — dueDate < now và chưa RESOLVED/CLOSED)
- `tags[]`

Kết quả trả về dạng bảng, phân trang. Có thể sort theo: recordedAt, dueDate, priority, status.

Badge đếm theo loại: số BUG đang mở / số CR chờ duyệt — hiển thị ở header menu.

#### FR-IR03 — My Issues
Trang `/issues/my` — danh sách issue có `assigneeId = currentUser`. Filter theo type, status, priority. Nhóm theo priority (Critical trước).

#### FR-IR04 — Issue Detail
Mỗi issue có trang/drawer detail hiển thị đầy đủ:
- Thông tin chính (type, title, requesterName, description, priority, status, affectedModule)
- Timeline: recordedAt, dueDate, estimatedHours, resolvedAt, closedAt, cycle time (nếu đã RESOLVED)
- Assignee, reporter
- CR approval info: pmApprover, approvedAt, approvalNote (nếu là CR)
- Tags
- Task liên quan (link sang task detail)
- Attachments (xem/download)
- Comment thread
- Audit log (lịch sử thay đổi status, người thực hiện, thời gian)

#### FR-IR05 — Cập nhật Issue
PM/Member được giao có thể cập nhật: title, description, priority, dueDate, estimatedHours, affectedModule, assigneeId, taskIds, tags, resolutionNote. Mỗi thay đổi ghi vào `IssueAuditLog`.

#### FR-IR06 — Chuyển Trạng thái (Status Transition)
Chuyển trạng thái tuân theo bảng valid transitions ở mục 3.1. Hệ thống từ chối các transition không hợp lệ (HTTP 422 + message rõ ràng).

Khi chuyển sang RESOLVED: `resolvedAt = now()` tự động.
Khi chuyển sang CLOSED: `closedAt = now()` tự động.
Mỗi transition ghi vào `IssueAuditLog`.

#### FR-IR07 — PM Phê duyệt CR
Chỉ PM của project (hoặc Admin) mới có thể phê duyệt/từ chối CR.

Endpoint `PATCH /api/v1/issues/:id/approve`:
- Body: `{ decision: 'APPROVED' | 'REJECTED', note?: string }`
- Khi APPROVED: `status → APPROVED`, `pmApproverId = currentUser.id`, `approvedAt = now()`, `approvalNote = note`
- Khi REJECTED: `status → REJECTED`, tương tự trên
- Ghi `IssueAuditLog`: action = "CR_APPROVED" hoặc "CR_REJECTED"

Sau khi APPROVED, PM hoặc assignee có thể chuyển tiếp sang `IN_PROGRESS`.

Nếu user không phải PM của project → HTTP 403.

#### FR-IR08 — Comments
Mọi user có quyền xem issue đều có thể comment. Author của comment có thể edit/delete comment của mình. Comment có `createdAt`, `updatedAt`.

#### FR-IR09 — File Đính kèm
- Tối đa 10 file per issue, mỗi file ≤ 20MB, chấp nhận: `image/*`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.*`, `text/plain`
- Lưu trên MinIO (tận dụng `BugAttachmentService` pattern)
- Xem preview inline cho ảnh; download link cho PDF/doc
- Có thể xóa file đính kèm (chỉ reporter hoặc PM)

#### FR-IR10 — Tags
Tag là text tự do, không cần pre-defined list. Hiển thị dạng chip/tag. Filter theo tag trong danh sách issues. Gợi ý autocomplete các tag đã dùng trong cùng project.

#### FR-IR11 — Link tới Task
Issue có thể được link với 1 hoặc nhiều Task trong cùng project. Hiển thị task title + status. Link sang task detail. Khi task DONE, không tự động đổi status issue (thủ công).

#### FR-IR12 — Đồng bộ trạng thái với Task
Khi task được link với issue và task chuyển sang `DONE`, hệ thống tạo notification gợi ý PM/assignee xem xét resolve issue. Không tự động thay đổi status issue.

#### FR-IR13 — Overdue Detection
Issue có `dueDate < now()` và `status NOT IN [RESOLVED, CLOSED, CANCELLED, REJECTED]` được đánh dấu `isOverdue = true` trong response. UI hiển thị badge đỏ "Quá hạn" trên row đó.

---

### 3.3 Dashboard

**FR-IR14 — Issue Dashboard** (`/issues/dashboard`)

Dashboard gồm 6 card:

**Card 1 — Tổng quan theo Status:**
Donut chart, 9 segment (theo IssueStatus). Center label: tổng số issue đang active (không tính CLOSED/CANCELLED/REJECTED). Legend với count.

**Card 2 — Phân bố theo Type:**
Pie chart hoặc 2 large metric card: BUG vs CR; hiển thị count + % tổng; có thể filter theo project.

**Card 3 — Phân bố theo Priority:**
Horizontal bar chart, 4 bars (CRITICAL → LOW), màu dùng severity token giống Epic 13 (UX-DR11). Mỗi bar có count label.

**Card 4 — CR đang chờ duyệt:**
Ant Design Table; columns: Title | Project | Requester | Ngày tạo | Overdue (dueDate); sorted by recordedAt ASC (cũ nhất lên trước); max 10 rows; row click → issue detail; chỉ hiển thị với PM và Admin.

**Card 5 — Top Project nhiều Issues:**
Table; columns: Dự án | BUG mở | CR chờ duyệt | Tổng active; sorted by total DESC; max 10 rows.

**Card 6 — Xu hướng 30 ngày:**
Line chart; 2 series: "Ghi nhận mới" (xanh) và "Resolved/Closed" (xanh lá); X-axis = date, Y-axis = count. Cho thấy backlog đang tăng hay giảm.

Filter toàn dashboard: `projectId` (optional), `dateRange`.

Dark mode: background `#141414`, grid lines `rgba(255,255,255,0.1)`, labels `rgba(255,255,255,0.85)` — nhất quán với Epic 8 pattern.

---

### 3.4 Statistics API

**FR-IR15 — Stats Endpoint**
`GET /api/v1/issues/stats?projectId=&startDate=&endDate=`

Response:
```json
{
  "byStatus": { "OPEN": 5, "PENDING": 3, "PENDING_REVIEW": 2, ... },
  "byType": { "BUG": 12, "CR": 8 },
  "byPriority": { "CRITICAL": 2, "HIGH": 6, "MEDIUM": 8, "LOW": 4 },
  "pendingCRs": [...],           // top 10 CR chờ duyệt
  "topProjects": [...],          // top 10 project
  "trend30Days": [               // array 30 items
    { "date": "2026-04-28", "created": 2, "resolved": 1 },
    ...
  ],
  "overdueCount": 3,
  "avgCycleTimeHours": 48.5      // avg resolvedAt - recordedAt
}
```

---

### 3.5 Notifications

**FR-IR16 — Notifications**

| Trigger | Recipient | Nội dung |
|---|---|---|
| CR mới tạo (`PENDING_REVIEW`) | PM của project | "CR mới cần phê duyệt: [title] — [requesterName]" |
| Issue được assign | Assignee | "Issue mới được giao cho bạn: [title] — [type] [priority]" |
| CR được APPROVED | Reporter | "CR đã được PM phê duyệt: [title]" |
| CR bị REJECTED | Reporter | "CR bị từ chối: [title] — [approvalNote]" |
| Issue → RESOLVED | Reporter | "Issue đã được xử lý: [title]" |
| Issue → CLOSED | Reporter + Assignee | "Issue đã đóng: [title]" |
| CRITICAL issue tạo mới | PM của project | "Issue Critical mới: [title] — [requesterName]" |
| CRITICAL issue tạo mới + Telegram bật | Telegram channel | "🔴 Issue Critical\n*[title]*\nProject: [projectName]\nRequester: [requesterName]" |
| Issue quá hạn (dueDate qua, status chưa RESOLVED) | Assignee + PM | "Issue quá hạn: [title] — hạn [dueDate]" |

Overdue alert chạy **daily cron** lúc 8:00 sáng: scan tất cả issues overdue, gửi notification cho assignee và PM.

Notification hiển thị trong `NotificationBell` component (Epic 7). Tab mới **"Issues"** bổ sung bên cạnh Tab Task/Bug/Nguồn lực/Ngân sách.

---

### 3.6 Export

**FR-IR17 — Export Excel/CSV**

`GET /api/v1/issues/export?format=xlsx|csv&projectId=&startDate=&endDate=&type=&status=`

Columns export:
```
ID | Loại | Tiêu đề | Người yêu cầu | Dự án | Độ ưu tiên | Trạng thái
| Người log | Người xử lý | Ngày ghi nhận | Hạn xử lý | Ước lượng (giờ) | Ngày resolve
| Cycle time (giờ) | Module ảnh hưởng | Ghi chú xử lý | PM duyệt | Ngày duyệt
```

Export trigger từ button trên trang `/issues`. File được stream trực tiếp (không lưu server). Tận dụng `exceljs` (đã có trong project).

---

## 4. Non-Functional Requirements

| NFR | Yêu cầu |
|---|---|
| NFR-IR01 | Web + Mobile (iOS + Android); Mobile ưu tiên xem danh sách, update status, comment |
| NFR-IR02 | Tất cả query filter theo `orgUnitIds[]` — consistent với OrgScopeInterceptor |
| NFR-IR03 | Audit log bất biến: không xóa, không sửa sau khi ghi |
| NFR-IR04 | Export file ≤ 10.000 rows không timeout (stream response) |
| NFR-IR05 | MinIO file storage nhất quán với Epic 13 (bucket `issues`) |
| NFR-IR06 | Dark mode: dùng Ant Design `ConfigProvider` token override, nhất quán với project |
| NFR-IR07 | Table header dark mode: giữ token override giống pattern đã xác lập trong Epic 8 |

---

## 5. UX Specifications

### 5.1 Color Tokens (Priority)

Tái sử dụng severity color tokens từ UX-DR11 (Epic 13):
- CRITICAL: `#FF4D4F` (đỏ)
- HIGH: `#FA8C16` (cam)
- MEDIUM: `#FADB14` (vàng)
- LOW: `#52C41A` (xanh lá)

Dùng icon + màu + label (không chỉ màu) cho accessibility.

### 5.2 Type Tokens

- BUG: icon `BugOutlined`, màu `#FF4D4F`, label "BUG"
- CR: icon `FormOutlined`, màu `#1677FF`, label "CR"

### 5.3 Status Badge Colors

| Status | Màu (Ant Tag) |
|---|---|
| OPEN | default (xám) |
| PENDING | gold |
| PENDING_REVIEW | orange |
| APPROVED | cyan |
| REJECTED | red |
| IN_PROGRESS | processing (xanh nhấp nháy) |
| RESOLVED | green |
| CLOSED | success |
| CANCELLED | default (xám nhạt, strikethrough) |

### 5.4 Navigation

- `/issues` — Global Issue List
- `/issues/my` — My Issues
- `/issues/dashboard` — Dashboard
- `/issues/:id` — Issue Detail (hoặc drawer từ list)

Menu sidebar: "Issues" với badge count (số issue đang open + pending trong scope). Sub-menu: Tất cả | Của tôi | Dashboard.

### 5.5 CR Approval Flow (Web)

Trong Issue Detail của CR có `status = PENDING_REVIEW`, PM thấy 2 button nổi bật:
- `[✓ Phê duyệt]` (primary, màu xanh)
- `[✗ Từ chối]` (danger)

Click mở Modal confirm với textarea `approvalNote` (required khi từ chối, optional khi duyệt). Submit gọi `PATCH /issues/:id/approve`.

### 5.6 Overdue Indicator

Row trong bảng có `isOverdue = true`:
- Badge đỏ `Quá hạn` bên cạnh giá trị dueDate
- Row background nhạt `#fff1f0` (light mode) / `rgba(255,77,79,0.08)` (dark mode)

---

## 6. API Endpoints

```
POST   /api/v1/issues                        — Tạo issue
GET    /api/v1/issues                        — Danh sách (filter, paginate)
GET    /api/v1/issues/my                     — My issues
GET    /api/v1/issues/stats                  — Statistics for dashboard
GET    /api/v1/issues/export                 — Export Excel/CSV
GET    /api/v1/issues/:id                    — Issue detail
PATCH  /api/v1/issues/:id                    — Cập nhật thông tin
DELETE /api/v1/issues/:id                    — Xóa (Admin/PM only)
PATCH  /api/v1/issues/:id/status             — Chuyển trạng thái
PATCH  /api/v1/issues/:id/approve            — PM duyệt/từ chối CR
PUT    /api/v1/issues/:id/assign             — Giao issue cho user

POST   /api/v1/issues/:id/comments           — Thêm comment
PATCH  /api/v1/issues/:id/comments/:cid      — Sửa comment
DELETE /api/v1/issues/:id/comments/:cid      — Xóa comment

POST   /api/v1/issues/:id/attachments        — Upload file
GET    /api/v1/issues/:id/attachments/:aid/url — Presigned URL
DELETE /api/v1/issues/:id/attachments/:aid   — Xóa file

GET    /api/v1/issues/:id/audit-logs         — Audit trail
```

---

## 7. Acceptance Criteria (Top-level)

**FR-IR01 — Tạo Issue:**
- Tạo BUG: status = OPEN
- Tạo CR: status = PENDING_REVIEW (tự động)
- `requesterName` là text tự do, không validate format
- `recordedAt` auto = server time, không cho user nhập

**FR-IR06 & FR-IR07 — Transitions:**
- BUG: OPEN → IN_PROGRESS ✓; OPEN → CLOSED ✗ (invalid)
- CR: APPROVED → IN_PROGRESS ✓; PENDING_REVIEW → IN_PROGRESS ✗ (chưa duyệt)
- Member không phải PM không thể gọi `/approve` → 403

**FR-IR14 — Dashboard:**
- Số liệu trên dashboard khớp với tổng count trong danh sách (với cùng filter)
- Card 4 (CR chờ duyệt) chỉ hiển thị với PM/Admin; Member thấy card khác thay thế

**FR-IR17 — Export:**
- File download thành công với ≤ 5000 rows trong < 10s
- Tên file: `issues-[projectName]-[date].xlsx`

---

## 8. Dependencies

| Module | Sử dụng |
|---|---|
| Epic 7 — Notifications | `NotificationsService.createAndDeliver()`, `NotificationBell` component |
| Epic 11 — Telegram | `TelegramService.sendMessage()` cho CRITICAL issue và overdue |
| Epic 13 — Bug Tracking | Tái sử dụng MinIO pattern (`BugAttachmentService`), severity color tokens |
| Epic 8 — Dashboard | Dark mode pattern, `ConfigProvider` token override |
| Epic 5 — Projects | `projectId` foreign key, PM role lookup |

---

## 9. Epic Breakdown (Phân rã Stories)

Module này được phát triển trong **Epic 14 — Issue Register**. Các stories chính:

| Story | Mô tả | Backend | Web | Mobile |
|---|---|---|---|---|
| 14.1 | Prisma schema + migrations (Issue, IssueTag, IssueTask, IssueAttachment, IssueComment, IssueAuditLog) | ✅ | - | - |
| 14.2 | Backend CRUD + Status Transitions + Audit Log | ✅ | - | - |
| 14.3 | Backend CR Approval Flow + Notifications | ✅ | - | - |
| 14.4 | Backend Stats API + Export Excel/CSV | ✅ | - | - |
| 14.5 | Backend Comments + Attachments (MinIO) | ✅ | - | - |
| 14.6 | Web — Global Issue List + Filters + My Issues | - | ✅ | - |
| 14.7 | Web — Issue Create/Edit Form + Detail Drawer | - | ✅ | - |
| 14.8 | Web — CR Approval Modal + Audit Log Timeline | - | ✅ | - |
| 14.9 | Web — Dashboard (6 cards + charts) | - | ✅ | - |
| 14.10 | Web — Export + Overdue Indicators + Notification Tab | - | ✅ | - |
| 14.11 | Mobile — Issue List, Detail, Status Update, Comment | - | - | ✅ |

---

## 10. FR Coverage Map

| FR | Story |
|---|---|
| FR-IR01 (Tạo issue) | 14.1, 14.2, 14.7 |
| FR-IR02 (Filter list) | 14.2, 14.6 |
| FR-IR03 (My Issues) | 14.2, 14.6 |
| FR-IR04 (Detail) | 14.2, 14.7 |
| FR-IR05 (Cập nhật) | 14.2, 14.7 |
| FR-IR06 (Transitions) | 14.2, 14.7 |
| FR-IR07 (PM duyệt CR) | 14.3, 14.8 |
| FR-IR08 (Comments) | 14.5, 14.7 |
| FR-IR09 (Attachments) | 14.5, 14.7 |
| FR-IR10 (Tags) | 14.2, 14.7 |
| FR-IR11 (Link task) | 14.2, 14.7 |
| FR-IR12 (Sync task) | 14.3 |
| FR-IR13 (Overdue) | 14.2, 14.10 |
| FR-IR14 (Dashboard) | 14.4, 14.9 |
| FR-IR15 (Stats API) | 14.4 |
| FR-IR16 (Notifications) | 14.3, 14.10 |
| FR-IR17 (Export) | 14.4, 14.10 |
