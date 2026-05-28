# Loop — Product Roadmap

> **Nguồn sự thật duy nhất** cho lộ trình sản phẩm từ v2.x đến v3.x  
> Cập nhật: 2026-05-28  
> Phase 1–3 (v1.0→v2.0): **HOÀN THÀNH** — 10 module, 44 Prisma models  
> Chi tiết lịch sử xây dựng: `erp-roadmap.md`

---

## Tổng quan các phiên bản

| Version | Trọng tâm | Trạng thái |
|---------|-----------|-----------|
| **v1.0** | Core Platform: PM, BPM, Timesheet, Reports, HR, Finance, Admin | ✅ Hoàn thành |
| **v2.0** | Mở rộng: CRM, Recruitment, Assets, Accounting, OKR, Skill Matrix | ✅ Hoàn thành |
| **v2.x** | Tiện ích vận hành — làm ngay sau go-live, không cần refactor navigation | 🔵 Tiếp theo |
| **v3.0** | Persona-driven Navigation + Dashboard + Collaboration + Workspace + Tiện ích triển khai | ⬜ Chờ v2.x xong |
| **v3.x** | Mobile PWA + Advanced Analytics + Multi-tenant + AI | ⬜ Tương lai |

---

## v2.x — Operational Utilities

> **Mục tiêu:** Tăng adoption và giảm effort vận hành sau khi go-live cho khách hàng đầu tiên.  
> Không thay đổi navigation, không refactor module structure — chỉ thêm tính năng mới.  
> **Thứ tự ưu tiên:** Làm từ trên xuống.

---

### v2.1 — Bulk Operations & Import/Export

**Mục tiêu:** Giải quyết pain lớn nhất khi onboard khách hàng mới — nhập dữ liệu hàng loạt.

#### Import Wizard (Admin > Import)
Wizard từng bước, có validation trước khi import, hiển thị preview số row sẽ tạo/lỗi.

| Template | Fields bắt buộc | Ghi chú |
|----------|----------------|---------|
| Employees | name, email, orgUnit, position, startDate | Link orgUnit theo tên hoặc code |
| OKR (Objectives) | title, ownerEmail, quarter, targetValue | Tạo hàng loạt cho toàn team |
| Asset List | code, name, category, serialNumber, purchaseDate | |
| Job Openings | title, orgUnit, level, headcount | |

Format hỗ trợ: Excel (.xlsx), CSV. Mỗi template có file mẫu download.

#### Bulk Actions (chọn nhiều row trong Table → action bar hiện ra)

| Module | Bulk Action |
|--------|------------|
| HR — Employees | Chuyển phòng ban, điều chỉnh lương (% hoặc số cố định), gia hạn hợp đồng |
| Finance — Expenses | Approve/Reject nhiều expense cùng lúc |
| Admin — Permissions | Gán role/permission cho cả phòng ban |
| PM — Tasks | Reassign nhiều task, đổi status hàng loạt |
| Recruit — Candidates | Chuyển stage, assign interviewer |

#### Export đồng bộ
Mọi trang có danh sách (Table) bổ sung nút **Export CSV/Excel** ở FilterBar.  
Format: cột theo columns đang hiển thị (tôn trọng ColumnToggle của user).

---

### v2.2 — Personal Notification Center

**Mục tiêu:** End user được nhắc đúng lúc → adoption tăng, HR bớt nhắc thủ công.

#### In-app Notification Center (bell icon trên Topbar)

Notification feed theo thời gian thực (WebSocket hoặc polling 30s):

| Trigger | Nội dung thông báo |
|---------|--------------------|
| Task assigned | "Bạn được giao task [X] trong project [Y]" |
| Bug assigned | "Bug #123 [Title] được assign cho bạn" |
| Leave approved/rejected | "Đơn nghỉ ngày [X] đã được [duyệt/từ chối]" |
| Expense approved/rejected | "Expense [X] đã được [duyệt/từ chối]" |
| BPM task pending | "Bạn có task cần xử lý: [Process Name]" |
| Contract expiring | "Hợp đồng của [Nhân viên] hết hạn trong 30 ngày" |
| Performance review due | "Đến kỳ đánh giá hiệu suất [Quarter]" |

Features:
- Mark as read / Mark all as read
- Filter: All / Unread / By module
- Click → navigate thẳng đến entity liên quan
- Badge số trên bell icon

#### Email Notifications (user tự chọn trong Profile Settings)
- **Realtime:** Nhận email ngay khi có notification
- **Daily digest:** Tổng hợp 1 email/ngày lúc 8h sáng

#### Telegram Integration (extend v2.0 Telegram bot đã có)
- Forward notification ra Telegram nếu user đã link Telegram account
- Reply "ok" trong Telegram → approve BPM task đơn giản (approve/reject)

---

### v2.3 — Automated Reminders & Escalation

**Mục tiêu:** Hệ thống tự nhắc — HR/Manager không cần follow-up thủ công.

#### Rule Engine (Admin > Automation)

Giao diện cấu hình rule dạng "IF ... THEN ... AFTER ...":

**Rules mặc định (seed sẵn, Admin có thể tắt):**

| Rule | Trigger | Action | Delay |
|------|---------|--------|-------|
| Timesheet reminder | Thứ 6 17h, nhân viên chưa nộp timesheet | Gửi notification + email | — |
| Leave escalation | Leave request chưa được duyệt | Notify manager cấp trên | 2 ngày |
| Contract expiry | Hợp đồng hết hạn | Notify HR + Manager | 30 ngày trước |
| OKR check-in | Chưa update OKR | Notify owner | 14 ngày |
| Performance review due | Đến kỳ review | Notify reviewer | 7 ngày trước |
| BPM escalation | Task BPM chưa xử lý | Notify manager | Theo SLA config |

**Custom rules:** Admin tự tạo rule mới theo dạng wizard.

Delivery channels: In-app + Email + Telegram (theo preference của user).

---

### v2.4 — Audit Log Viewer

**Mục tiêu:** Truy vết mọi thay đổi quan trọng — yêu cầu compliance của khách hàng doanh nghiệp.

> Backend AuditLog table và service đã có từ Phase 1. v2.4 xây frontend và mở rộng coverage.

#### Admin > Audit Log

| Filter | Mô tả |
|--------|-------|
| User | Ai thực hiện |
| Module | pm / hr / finance / crm / ... |
| Action | CREATE / UPDATE / DELETE / APPROVE / EXPORT / LOGIN |
| Date range | Từ ngày — đến ngày |
| Entity | Employees / Tasks / Contracts / ... |

Hiển thị:
- Timestamp, User, Action, Entity, Before value, After value (JSON diff)
- Export audit log → CSV

#### Coverage mở rộng (bổ sung AuditLog vào các entity chưa có)
- Salary changes (Payroll)
- Permission changes (Permissions)
- Contract sign/expire
- Leave approve/reject
- Export actions (ai export gì, lúc nào)

---

### v2.5 — Weekly Digest & Scheduled Reports

**Mục tiêu:** Manager/CEO nhận báo cáo tự động, không cần login.

#### Weekly Digest Email (mỗi thứ Hai 8h sáng)

Nội dung cá nhân hóa theo role:
- **Nhân viên:** Tasks due this week, Timesheets pending, Pending approvals
- **Manager:** Team tasks overdue, Headcount changes, Leave requests pending
- **HR:** Contracts expiring, Performance reviews due, Recruitment pipeline summary
- **Finance:** Outstanding invoices, Budget utilization, Payroll upcoming

#### Scheduled Reports (Admin > Reports > Schedule)

| Config | Options |
|--------|---------|
| Report template | Payroll Summary / Headcount / OKR Progress / CRM Pipeline / ... |
| Recipients | Email list (không cần có tài khoản Loop) |
| Frequency | Weekly / Monthly / Quarterly |
| Format | PDF hoặc Excel đính kèm email |
| Day/time | Tùy chọn |

---

## v3.0 — Persona-driven Navigation + Collaboration + Workspace + Integration

> **Mục tiêu:** Tái cấu trúc toàn bộ navigation và dashboard theo vai trò người dùng. Bổ sung Collaboration, Workspace booking, và Integration Hub (gộp từ v2 #12).  
> **Prerequisite:** v2.x hoàn thành ✅  
> **Tài liệu chi tiết navigation:** `loop-v3-navigation-redesign.md`
>
> **Ghi chú merge:** v2 #11 (Báo cáo Tài chính VN) → gộp vào v3.0-C. v2 #12 (Integration Hub) → v3.0-M mới.

---

### v3.0-A — Persona-driven Navigation (Phase A)

**Cơ sở hạ tầng navigation mới — 10 module → 8 module:**

| Module cũ | Module v3.0 |
|-----------|-------------|
| pm | `work` |
| bpm (Inbox) | → `work` |
| bpm (Design/Monitor) | → `ops` (module mới) |
| timesheet (My/Project Log) | → `work` |
| timesheet (Attendance/Approval) | → `people` |
| reports | → giải thể, content vào `work` + Global Dashboard |
| hr | → `people` |
| recruit | → `people` (gộp) |
| finance | → `finance` (cơ cấu lại 3 nhóm) |
| crm | → `crm` |
| asset | → `asset` |
| admin | → `admin` |
| (new) | `me` — self-service |
| (new) | `ops` — BPM design + monitor |

**Checklist triển khai:**
- [ ] Refactor `SCREEN_REGISTRY` — cập nhật `module` field toàn bộ
- [ ] Cập nhật `modules.config.tsx` — 8 module definition mới
- [ ] Tạo `me` và `ops` module
- [ ] Cập nhật `MODULE_LABELS`, `PERM_DOMAIN_MODULE`, `ICON_MAP`
- [ ] Cập nhật `ModuleSwitcherModal` — 8 tile mới
- [ ] Fix: `/payroll/my-payslips` vào menu `me`
- [ ] Fix: `/self-service` vào menu `me`
- [ ] Fix: `/payroll/settings` vào `SCREEN_REGISTRY`

---

### v3.0-B — Persona Dashboards (Phase B)

Thay thế dashboard chung bằng dashboard riêng cho từng module.  
Chi tiết KPI và chart từng dashboard: xem `loop-v3-navigation-redesign.md`.

| Dashboard | KPI Cards | Charts chính |
|-----------|-----------|-------------|
| Global Executive (`/`) | 5 cross-module KPIs | 6 SparklineCard (1 per module) |
| Work | My tasks, Bugs, Hours, Pending approvals | Task trend, Project progress, Bug donut, Timesheet heatmap |
| People | Headcount, Open positions, Leave pending, Contracts expiring | Headcount by dept, Recruitment funnel, Leave by type, Skill heatmap |
| Finance | Payroll, Outstanding invoices, Budget %, Pending expenses | Revenue vs Expense 12m, Budget vs Actual, Cash flow waterfall |
| CRM | Pipeline value, Deals closed, New leads, Activities due | Sales funnel, Deal velocity, Win rate trend |
| Ops | Active instances, SLA breached, Avg time, Queue size | Volume by process, Completion trend, Bottleneck heatmap |
| Asset | Total, Assigned, In maintenance, Due soon | By category donut, Assignment timeline, Maintenance calendar |
| Me | Leave balance, Hours this month, OKR score, Payslip date | My tasks, My approvals, My payslip, My leave history |

---

### v3.0-C — Reports Tích hợp trong Module (Phase C)

Module `reports` standalone bị giải thể. Báo cáo nhúng trực tiếp vào module tương ứng.  
**Gộp từ v2 #11:** Báo cáo Tài chính VN chuẩn (P&L + Balance Sheet + Cash Flow chuẩn thông tư 200/TT-BTC) vào `finance`.

| Module | Reports section |
|--------|----------------|
| `people` | Headcount Report, Leave Balance, Training Completion, OKR Progress |
| `finance` | **P&L Statement (TT200), Balance Sheet (TT200), Cash Flow**, Payroll Summary, Expense Report, Invoice Aging |
| `crm` | Sales Performance, Pipeline Snapshot, Customer Activity |
| `ops` | Process Performance, SLA Compliance |

Mỗi report có: filter, preview trên web, export Excel/PDF.

---

### v3.0-D — Quick Action Bar (Cmd+K)

Command palette global, gắn liền với persona-driven navigation.

```
Cmd+K → mở Quick Action
├── Tạo mới:   "New task", "New bug", "New leave request", "Log hours"
├── Tìm kiếm:  "Find employee [name]", "Find project [name]"
├── Navigate:  "Go to Finance", "Go to My Payslip"
└── Actions:   "My pending approvals", "Submit timesheet"
```

Phím tắt: `Cmd+K` (Mac), `Ctrl+K` (Windows).  
Kết quả tìm kiếm real-time qua API, scope theo permission của user.

---

### v3.0-E — Module Toggle & Feature Flags

**Mục tiêu:** Bán nhiều gói giá khác nhau (Starter / Pro / Enterprise).

#### Admin > Modules (Super Admin only)

```
Module Management
├── [✓] Work        — Core (bắt buộc, không tắt được)
├── [✓] People      — HR & Recruitment
├── [✓] Finance     — Payroll & Accounting
├── [✗] CRM         — Tắt nếu gói không bao gồm
├── [✗] Operations  — Tắt nếu gói không bao gồm
├── [✓] Assets      — IT & Facility
├── [✓] Me          — Self-service (bắt buộc)
└── [✓] Admin       — System (bắt buộc)
```

Module bị tắt:
- Không hiện trong ModuleSwitcherModal
- Routes trả về 403 Forbidden
- Không xuất hiện trong Permission matrix

---

### v3.0-F — Tenant Onboarding Wizard

**Mục tiêu:** Giảm thời gian onboard khách hàng mới từ 2-3 ngày xuống 4-8 tiếng.

#### Setup Wizard (chạy lần đầu sau tạo tenant)

```
Step 1: Company Info
  → Tên công ty, logo, timezone (Asia/Ho_Chi_Minh default), currency (VND default)

Step 2: Org Structure
  → Import departments từ Excel, hoặc tạo thủ công (tree view)
  → Import positions/job titles

Step 3: Import Employees
  → Dùng Import Wizard (v2.1), template chuẩn
  → Preview trước khi import

Step 4: Workflow Templates
  → Chọn template có sẵn: Leave Approval, Expense Approval, Performance Review
  → Tùy chỉnh người phê duyệt

Step 5: Module Configuration
  → Bật/tắt module theo gói mua (v3.0-E)
  → Cấu hình basic settings từng module

Step 6: Invite Users & Roles
  → Gửi email mời hàng loạt
  → Gán role mặc định theo phòng ban

Step 7: Launch Checklist
  → Checklist 10 mục xác nhận setup xong
  → "Go Live" button → bật notification Welcome cho toàn bộ nhân viên
```

---

### v3.0-G — Demo Mode & Sandbox

**Mục tiêu:** Team sales demo sản phẩm cho khách không cần chuẩn bị lâu.

#### Demo Tenant (tách hoàn toàn khỏi production)
- Có sẵn data seed phong phú: 50 nhân viên, 20 dự án, 3 tháng timesheet, pipeline CRM đầy đủ
- "Reset Demo Data" button → seed lại toàn bộ trong 30 giây
- Watermark "DEMO" trên mọi file export (PDF, Excel)
- Auto-reset hằng đêm lúc 0h

---

### v3.0-H — Health Dashboard

**Mục tiêu:** Support team theo dõi hệ thống sau go-live mà không cần SSH vào server.

#### Admin > System Health (Super Admin only)

| Metric | Mô tả |
|--------|-------|
| API response time | avg / p95 / p99 — 24h gần nhất |
| Error rate | % request lỗi — theo module |
| Queue health | BullMQ jobs: active / waiting / failed |
| DB pool | connections active / idle / max |
| Storage | MinIO usage (GB) |
| Active sessions | Users đang online real-time |
| Recent errors | 20 lỗi gần nhất có stack trace (ẩn với non-admin) |

---

### v3.0-I — Contextual Comments & Company Feed

> **Quyết định chiến lược:** Không xây real-time chat (không thể cạnh tranh Zalo/Teams).  
> Thay vào đó: comment gắn với nghiệp vụ + company feed cho HR announcements.

#### Contextual Comments (mở rộng từ Bug Comments đã có)

Bổ sung comment thread vào toàn bộ entity chính:

| Entity | Comment thread | @mention | Notification |
|--------|---------------|----------|-------------|
| Task | ✓ | ✓ | → assignee + @mentioned |
| Bug | ✓ (đã có) | ✓ | → assignee + @mentioned |
| OKR Check-in | ✓ | ✓ | → owner + @mentioned |
| Leave Request | ✓ | ✓ | → requester + approver |
| Expense | ✓ | ✓ | → requester + approver |
| Performance Review | ✓ | ✓ | → reviewee + reviewer |
| Deal (CRM) | ✓ | ✓ | → owner + @mentioned |
| Candidate (Recruit) | ✓ | ✓ | → recruiter + @mentioned |

Features:
- @mention → auto-notify người được tag
- Reaction emoji (👍 ✅ 👀) — không cần reply "ок" vô nghĩa
- Attach file (dùng StorageModule MinIO đã có)
- Edit / Delete comment trong vòng 15 phút

#### Company Feed (module People — tab mới)

Social feed nhẹ, HR-owned, không phải chat tự do:

```
Company Feed
├── 📢 [HR Announcement]   Chính sách WFH mới từ 01/06/2026
│      👍 12  💬 3 comments
├── 🏆 [Kudos]             @manager gửi kudos cho @linh.tran — xuất sắc Q2!
│      👍 24  ❤️ 8
├── 🎂 [System — Auto]     Hôm nay sinh nhật @minh.le 🎂 Chúc mừng!
│      👍 31
├── 📋 [HR Document]       Nội quy công ty v2.3 — xem tại đây
└── 🎉 [System — Auto]     Welcome @new.employee — thành viên mới team Engineering!
```

Post types:
- **HR Announcement** — HR tạo, hiển thị cho toàn công ty hoặc theo phòng ban
- **Kudos** — Manager/peer gửi lời khen công khai cho đồng nghiệp
- **System Auto-post** — Birthday, work anniversary, welcome new member (từ HR data)
- **HR Document** — Link đến policy, handbook, quy trình mới

Phân quyền:
- Tạo Announcement / Document: chỉ HR Manager
- Gửi Kudos: mọi nhân viên (tùy cấu hình)
- Like / Comment: mọi nhân viên

**Prerequisite:** v2.2 (Notification Center) — Feed cần push notification để có adoption.

---

### v3.0-J — Room Booking (Đặt phòng họp)

**Mục tiêu:** Thay thế hoàn toàn việc đặt phòng qua Zalo group / whiteboard.  
Nằm trong module `asset` (phòng họp là tài sản công ty).

#### Quản lý phòng họp (Admin)

| Field | Mô tả |
|-------|-------|
| Tên phòng | "Phòng Hoa", "Phòng A3.01" |
| Tầng / Khu vực | Tầng 3, Tòa A |
| Sức chứa | Số người tối đa |
| Tiện nghi | TV, Webcam, Whiteboard, Projector, Phone |
| Ảnh phòng | Upload ảnh minh họa |
| Trạng thái | Active / Inactive / Bảo trì |

#### Đặt phòng

- Chọn ngày + khung giờ → hệ thống lọc và hiển thị chỉ phòng còn trống
- Điền: tiêu đề cuộc họp, mục đích, người tham dự (search by name)
- Recurrence: lặp lại hằng tuần (cho standing meetings)
- Conflict detection: tự động block — không cho phép double-booking
- Hủy đặt: trả phòng về trống, notify người liên quan

#### Calendar Gantt View

```
          08:00   09:00   10:00   11:00   14:00   15:00   16:00
Phòng Hoa  [===Sprint Planning===]         [===1:1===]
Phòng Lan          [=Demo Q2==========]
Phòng A301                 [==Training===========]
```

- Trục X: giờ trong ngày (hoặc ngày trong tuần)
- Trục Y: từng phòng
- Slot trống → click → mở form đặt ngay
- Tooltip hover → xem chi tiết booking (ai đặt, mục đích)

#### Notifications
- Nhắc trước 15 phút: in-app + Telegram
- Khi phòng bị hủy: notify toàn bộ người tham dự

**Prisma models mới:** `MeetingRoom`, `RoomBooking`

---

### v3.0-K — Vehicle Booking (Đặt xe công ty)

**Mục tiêu:** Quản lý lịch xe công ty minh bạch, có approval flow.  
Nằm trong module `asset`.

#### Quản lý xe (Admin)

| Field | Mô tả |
|-------|-------|
| Biển số | 51A-123.45 |
| Hãng / Model | Toyota Innova |
| Loại | Sedan / Van / Truck / Motorbike |
| Sức chứa | Số hành khách |
| Lái xe mặc định | FK Employee |
| Trạng thái | Available / On Trip / Bảo trì |

#### Đặt xe

1. Nhân viên tạo yêu cầu: mục đích, điểm đến, thời gian đi/về, số người
2. Hệ thống lọc xe còn trống trong khung giờ đó
3. **Approval flow qua BPM** (tận dụng BPMN engine đã có) — manager duyệt
4. Khi approved: lái xe nhận notification, xác nhận nhận xe
5. Kết thúc chuyến: check-in km, ghi chú nhiên liệu (optional)

#### Lịch sử & tracking

| Thông tin | Mô tả |
|-----------|-------|
| Ai đặt xe | Employee + phòng ban |
| Xe nào | Biển số, model |
| Thời gian | Đi / về thực tế |
| Điểm đến | Địa chỉ |
| Số km | Ghi nhận khi trả xe |
| Status | Pending / Approved / In Use / Completed / Cancelled |

**Tích hợp BPM:** ProcessDefinition key `vehicle-booking-approval` — seed sẵn template.

**Prisma models mới:** `Vehicle`, `VehicleBooking`

---

### v3.0-L — Meeting Calendar

**Mục tiêu:** Lịch họp tập trung, tích hợp với Room Booking — thay thế Google Calendar riêng lẻ.  
Nằm trong module `work`.

#### Company Calendar (shared)

Tổng hợp toàn bộ sự kiện của công ty:
- Cuộc họp có đặt phòng (từ Room Booking)
- Sự kiện HR (sinh nhật, kỷ niệm làm việc, deadline nộp timesheet)
- Deadline dự án quan trọng (từ PM module)
- Holiday / Ngày nghỉ lễ (từ Leave module)

#### My Calendar (cá nhân)

- Cuộc họp tôi tạo hoặc được mời
- Leave requests của tôi
- My task deadlines (từ PM)
- Overlay lên Company Calendar

#### Tạo meeting

```
New Meeting
├── Tiêu đề + mô tả
├── Ngày + giờ bắt đầu / kết thúc
├── Mời người tham dự (search by name/team)
├── Book phòng họp (tích hợp Room Booking — hiển thị phòng trống cùng khung giờ)
├── Link cuộc họp online: Zoom / Google Meet / Teams (nhập tay)
└── Recurrence: không / hằng tuần / hằng tháng
```

#### Notifications

- Mời tham dự → notification + email với option Accept / Decline
- Nhắc trước 15 phút
- Cập nhật / hủy meeting → notify toàn bộ attendees

**Scope giới hạn:** Không sync 2 chiều với Google Calendar (đưa vào v3.x nếu khách hàng yêu cầu).

**Prisma models mới:** `Meeting`, `MeetingAttendee`

---

### v3.0-M — Integration Hub *(gộp từ v2 #12)*

**Mục tiêu:** Kết nối Loop với các công cụ bên ngoài — tự động hóa workflow liên hệ thống.

#### Outbound Webhooks (Admin > Integrations > Webhooks)

| Event | Payload |
|-------|---------|
| Task created / status changed | projectId, taskId, assignee, status |
| Leave approved / rejected | employeeId, dates, approver |
| Expense approved | amount, category, submittedBy |
| Bug status changed | bugId, severity, assignee, status |
| BPM task completed | instanceId, processKey, completedBy |

Config: URL endpoint, secret header, retry 3 lần, log lịch sử gửi.

#### Slack / Microsoft Teams Integration

| Tính năng | Mô tả |
|-----------|-------|
| Slash command `/loop task` | Tạo task nhanh từ Slack/Teams |
| Notification forward | Loop notification → DM hoặc channel theo config |
| Approval từ Slack | Reply "approve" / "reject" → xử lý BPM task |
| Daily digest | Tóm tắt pending items → channel HR/Finance mỗi sáng |

#### Zapier / Make (no-code)

Expose Loop như một Zapier App:
- Trigger: New Employee, Task Updated, Leave Approved, Bug Opened
- Action: Create Task, Submit Leave Request, Add Note to Deal

**Backend:** Webhook delivery queue (BullMQ đã có), signature HMAC-SHA256, retry với exponential backoff.  
**Prisma models mới:** `WebhookEndpoint`, `WebhookLog`, `IntegrationToken`

---

## Kế hoạch chạy song song — v3.0

> Dev team có thể chia **5 luồng độc lập**, chạy đồng thời tối đa 3–4 luồng.

```
Sprint 1-2          Sprint 3-4          Sprint 5-6
─────────────────────────────────────────────────────────────────
LUỒNG 1 — Navigation (blocking cho J/K/L)
[A: Nav Refactor] → [B: Persona Dashboards] → [C: Reports + TT200]

LUỒNG 2 — UX Enhancement (độc lập)
                   [D: Cmd+K Quick Action]

LUỒNG 3 — Platform / Deployment (hoàn toàn độc lập)
[E: Module Toggle + F: Onboarding Wizard] → [G: Demo Mode + H: Health Dashboard]

LUỒNG 4 — Collaboration (chỉ cần v2.2 xong ✅)
[I: Comments + Company Feed]

LUỒNG 5 — Integration (hoàn toàn độc lập)
[M: Integration Hub — Webhook + Slack + Zapier]

─── Sau khi Luồng 1 xong (Sprint 4+) ──────────────────────────
LUỒNG 6 — Workspace (depends Luồng 1)
[J: Room Booking] → [K: Vehicle Booking + L: Meeting Calendar]
```

### Ma trận dependency & ưu tiên

| Mục | Depends | Ưu tiên | Effort | Có thể song song với |
|-----|---------|---------|--------|---------------------|
| **A** Navigation refactor | — | 🔴 Critical | L | E, F, G, H, I, M |
| **B** Persona Dashboards | A | 🔴 High | L | D, E, F, I, M |
| **C** Reports + TT200 | A, B | 🟠 High | M | D, G, H, I, M |
| **D** Cmd+K | — | 🟡 Medium | S | Tất cả |
| **E** Module Toggle | — | 🟠 High | M | A, B, C, D, I, M |
| **F** Onboarding Wizard | E | 🟠 High | L | A, B, C, D, I, M |
| **G** Demo Mode | — | 🟡 Medium | S | Tất cả |
| **H** Health Dashboard | — | 🟡 Medium | M | Tất cả |
| **I** Comments + Feed | v2.2 ✅ | 🟡 Medium | L | Tất cả |
| **J** Room Booking | A | 🟡 Medium | M | K, L sau khi A xong |
| **K** Vehicle Booking | A, BPM ✅ | 🟡 Medium | M | J, L |
| **L** Meeting Calendar | J | 🟡 Medium | M | K |
| **M** Integration Hub | — | 🟠 High | L | A, B, C, D, E, I |

> Effort: S = 1 sprint, M = 2 sprint, L = 3+ sprint

### Gợi ý phân team (nếu có 3 dev)

| Dev | Sprint 1–2 | Sprint 3–4 | Sprint 5–6 |
|-----|-----------|-----------|-----------|
| **Dev 1** | A — Navigation refactor | B — Persona Dashboards | C — Reports + TT200 |
| **Dev 2** | E — Module Toggle | F — Onboarding Wizard | J — Room Booking |
| **Dev 3** | M — Integration Hub | I — Comments + Feed | K/L — Vehicle + Calendar |
| *(shared)* | D — Cmd+K (2–3 ngày) | G/H — Demo + Health (1 sprint) | |

---

## v3.x — Future Capabilities

> Chưa có kế hoạch cụ thể — liệt kê để định hướng, không phải cam kết.

### v3.1 — Mobile PWA

**Quick Log App** — Progressive Web App, không cần app store:
- Check-in / Check-out (GPS timestamp)
- Quick timesheet log
- View payslip + leave balance
- Approve BPM task từ mobile
- Offline mode cho timesheet log

### v3.2 — Advanced Analytics & BI

- Custom Dashboard Builder (kéo thả widget)
- Cross-module Analytics (correlate HR data với Project performance)
- Predictive: dự báo budget overrun, attrition risk
- Public Dashboard Link (read-only, token-based, không cần login)
- Embed dashboard vào Google Slides / Notion

### v3.3 — Multi-tenant & White Label

- Tenant isolation hoàn chỉnh (schema-per-tenant hoặc row-level security)
- White label: tùy chỉnh logo, màu, domain theo từng khách hàng
- Billing integration: gói Starter / Pro / Enterprise tự động
- Tenant admin portal: quản lý subscription, users, storage

### v3.4 — AI Features

- AI Task Suggestion: gợi ý người phù hợp nhất để assign task (dựa trên skill matrix + workload)
- AI OKR Check-in: tóm tắt tiến độ OKR từ timesheet và task data
- AI Report Narrative: tự động viết nhận xét cho báo cáo tài chính/HR
- Smart Search: tìm kiếm ngôn ngữ tự nhiên ("show me overdue tasks in Q2")

---

## Ma trận tổng hợp — Toàn bộ tính năng theo phiên bản

| Tính năng | v2.x ✅ | v3.0-A | v3.0-B | v3.0-C | v3.0-D | v3.0-E/F | v3.0-G/H | v3.0-I | v3.0-J/K/L | v3.0-M | v3.x |
|-----------|--------|--------|--------|--------|--------|---------|---------|--------|-----------|--------|------|
| **— Đã xong (v2.x) —** | | | | | | | | | | | |
| Import Wizard + Bulk + Export | ✅ | | | | | | | | | | |
| Notification Center (in-app + email) | ✅ | | | | | | | | | | |
| Automation Rules + Escalation | ✅ | | | | | | | | | | |
| Audit Log Viewer | ✅ | | | | | | | | | | |
| Weekly Digest + Scheduled Reports | ✅ | | | | | | | | | | |
| **— v3.0 Navigation & Dashboard —** | | | | | | | | | | | |
| Automated Reminders (timesheet, leave…) | | | ✓ | | | | |
| Escalation rules (BPM, contract…) | | | ✓ | | | | |
| Audit Log Viewer (frontend) | | | | ✓ | | | |
| Audit coverage mở rộng (salary, export…) | | | | ✓ | | | |
| Weekly Digest Email | | | | | ✓ | | |
| Scheduled Reports (PDF/Excel qua email) | | | | | ✓ | | |
| **— Navigation & Dashboard —** | | | | | | | |
| Persona-driven Navigation (8 module) | | | | | | A | |
| Persona Dashboards (8 dashboard) | | | | | | B | |
| Reports tích hợp trong module | | | | | | C | |
| Quick Action Bar (Cmd+K) | | | | | | D | |
| **— Deployment Utilities —** | | | | | | | |
| Module Toggle (feature flags) | | | | | | E | |
| Tenant Onboarding Wizard | | | | | | F | |
| Demo Mode & Sandbox | | | | | | G | |
| Health Dashboard | | | | | | H | |
| **— Collaboration —** | | | | | | | |
| Contextual Comments (Task/OKR/Leave…) | | | | | | I | |
| @mention + Reaction emoji | | | | | | I | |
| Company Feed (Announcements + Kudos) | | | | | | I | |
| Birthday / Work anniversary auto-post | | | | | | I | |
| **— Workspace (Resource Booking) —** | | | | | | | |
| Room Booking + Calendar Gantt View | | | | | | J | |
| Vehicle Booking + BPM Approval | | | | | | K | |
| Meeting Calendar (Company + Personal) | | | | | | L | |
| Room attach trong Meeting | | | | | | L | |
| **— Future —** | | | | | | | |
| Mobile PWA (Check-in, Timesheet, Payslip) | | | | | | | ✓ |
| Google Calendar / Outlook sync | | | | | | | ✓ |
| Advanced BI & Custom Dashboard Builder | | | | | | | ✓ |
| Multi-tenant & White Label | | | | | | | ✓ |
| AI Task Suggestion & Smart Search | | | | | | | ✓ |

---

## Dependencies & Thứ tự triển khai

```
── v2.x ─────────────────────────────────────────────────────────────
v2.1 (Import/Bulk/Export)
  → Không dependency mới, dùng hạ tầng hiện có

v2.2 (Notifications)
  → Cần WebSocket hoặc polling 30s
  → Extend NotificationDeliveryService đã có

v2.3 (Automated Reminders)
  → Depends: v2.2 (delivery channel)
  → BullMQ cron jobs đã có sẵn

v2.4 (Audit Log)
  → AuditLog table + service đã có từ Phase 1
  → Chỉ cần frontend + mở rộng coverage

v2.5 (Scheduled Reports)
  → Depends: v2.2 (email service)
  → BullMQ cron jobs

── v3.0 ─────────────────────────────────────────────────────────────
v3.0-A (Navigation refactor)
  → Prerequisite: v2.x hoàn thành
  → Breaking change: SCREEN_REGISTRY + modules.config

v3.0-B (Persona Dashboards)
  → Depends: v3.0-A
  → Backend API mới: aggregated KPI endpoints

v3.0-C (Reports tích hợp)
  → Depends: v3.0-A + v3.0-B

v3.0-D (Cmd+K)
  → Có thể làm song song với v3.0-A
  → Cần Global Search API (đã có v2.0)

v3.0-E/F/G/H (Deployment utilities)
  → Độc lập, làm song song với v3.0-A→D

v3.0-I (Contextual Comments + Company Feed)
  → Depends: v2.2 (Notification để @mention hoạt động)
  → Có thể làm song song với v3.0-A→D

v3.0-J (Room Booking)
  → Depends: v3.0-A (cần asset module mới)
  → Độc lập về backend

v3.0-K (Vehicle Booking)
  → Depends: v3.0-A (asset module)
  → Depends: BPM engine (đã có)

v3.0-L (Meeting Calendar)
  → Depends: v3.0-J (Room Booking — để attach phòng)
  → Độc lập về Calendar engine

── v3.x ─────────────────────────────────────────────────────────────
v3.1 (Mobile PWA)
  → Depends: v2.2 (push notification)
  → Depends: v3.0-L (Meeting Calendar — view on mobile)

v3.x (Google Calendar sync)
  → Depends: v3.0-L (Meeting Calendar)

v3.x (Advanced BI)
  → Depends: v3.0-B (Dashboard infrastructure)

v3.x (Multi-tenant)
  → Major architecture change — plan separately
```
