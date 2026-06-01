# Loop 360 — QA + UI Polish Checklist

> **Mục tiêu:** Hệ thống hoạt động 100% + UI đồng nhất → sẵn sàng V6  
> **Cập nhật:** 2026-06-01  
> **Trạng thái:** 🔄 Đang chạy — D20 UI Audit ✅ DONE, QA chức năng đang tiến hành

---

## Definition of Done — áp dụng cho TỪNG màn hình

Mỗi màn hình chỉ được tick ✅ khi pass toàn bộ:

### Chức năng
- [ ] List page load được, có data, không crash
- [ ] Create form mở + submit thành công
- [ ] Edit form load đúng data + submit thành công
- [ ] Delete dùng `confirmDelete()`, hoạt động đúng
- [ ] Filter / Search hoạt động
- [ ] Pagination hoạt động (nếu có)
- [ ] BPM flow end-to-end (nếu module có approval)
- [ ] Export Excel / PDF (nếu có)

### UI/UX chuẩn
- [ ] Palette: dùng `useThemePalette()` — không tự khai báo màu
- [ ] Header: dùng `<PageHeader>` — không tự làm div inline
- [ ] Stat cards: dùng `<StatCard>` đúng màu bảng chuẩn
- [ ] Table column render: không trả plain string — wrap `<Text style={{ color }}>`
- [ ] Tag entity-name: explicit isDark style
- [ ] Link / accent text: dùng `linkColor`
- [ ] Không dùng `components={{ header: { cell }}}` trên Table
- [ ] Dark mode: toàn bộ text đọc được, không có vùng tối
- [ ] Light mode: đẹp, tương phản đủ

---

## Stream A — HR & Nhân sự

**Người phụ trách:** ___________  
**BPM cần test:** `leave-request-v1` · `overtime-approval-v1` · `hr-decision-approval-v1` · `salary-review-v1` · `performance-review-v1` · `attendance-explanation-v1` · `contract-renewal-v1` · `employee-offboarding-v1`

| # | Màn hình | Folder | BPM? | QA | UI | Done |
|---|---|---|---|---|---|---|
| A1 | Hồ sơ nhân viên (list + detail) | `/personnel` | — | ⬜ | ⬜ | ⬜ |
| A2 | Tạo / Sửa nhân viên | `/personnel` | — | ⬜ | ⬜ | ⬜ |
| A3 | Cơ cấu tổ chức (Org chart) | `/org` | — | ⬜ | ⬜ | ⬜ |
| A4 | Chấm công / Bảng công | `/timesheet` | ✅ explanation | ⬜ | ⬜ | ⬜ |
| A5 | Nghỉ phép — Danh sách | `/leaves` | ✅ | ⬜ | ⬜ | ⬜ |
| A6 | Nghỉ phép — Tạo đơn + Duyệt | `/leaves` | ✅ | ⬜ | ⬜ | ⬜ |
| A7 | Tăng ca (OT) — Tạo + Duyệt | `/hr` | ✅ | ⬜ | ⬜ | ⬜ |
| A8 | Bảng lương (list + chi tiết kỳ) | `/payroll` | — | ⬜ | ⬜ | ⬜ |
| A9 | Payslip nhân viên | `/payroll` | — | ⬜ | ⬜ | ⬜ |
| A10 | Self-service (My Leave, My Payslip, My OT) | `/self-service` | — | ⬜ | ⬜ | ⬜ |
| A11 | Quyết định nhân sự (HR Decision) | `/hr` | ✅ | ⬜ | ⬜ | ⬜ |
| A12 | Đánh giá hiệu suất (Performance Review) | `/hr` | ✅ | ⬜ | ⬜ | ⬜ |
| A13 | Đào tạo (Training) | `/hr` | — | ⬜ | ⬜ | ⬜ |
| A14 | Hợp đồng lao động | `/contracts` | ✅ renewal | ⬜ | ⬜ | ⬜ |
| A15 | HR Analytics Dashboard | `/hr` | — | ⬜ | ⬜ | ⬜ |

**Bugs phát hiện Stream A:**
> _(ghi vào đây khi tìm thấy: màn hình · mô tả lỗi · severity)_

---

## Stream B — Projects & Workspace

**Người phụ trách:** ___________

| # | Màn hình | Folder | BPM? | QA | UI | Done |
|---|---|---|---|---|---|---|
| B1 | Danh sách dự án | `/projects` | — | ⬜ | ⬜ | ⬜ |
| B2 | Chi tiết dự án + Milestone | `/projects` | — | ⬜ | ⬜ | ⬜ |
| B3 | Task board (Kanban + List) | `/tasks` | — | ⬜ | ⬜ | ⬜ |
| B4 | Task detail + subtask 5 cấp | `/tasks` | — | ⬜ | ⬜ | ⬜ |
| B5 | Bug & Issue tracking | `/bugs` | — | ⬜ | ⬜ | ⬜ |
| B6 | Gantt chart | `/gantt` | — | ⬜ | ⬜ | ⬜ |
| B7 | My Tasks (personal view) | `/my-tasks` | — | ⬜ | ⬜ | ⬜ |
| B8 | Time log (ghi giờ làm) | `/timesheet` | — | ⬜ | ⬜ | ⬜ |
| B9 | Project Cost snapshot | `/cost` | — | ⬜ | ⬜ | ⬜ |
| B10 | OKR / KPI | `/hr` | — | ⬜ | ⬜ | ⬜ |
| B11 | Knowledge Base | `/knowledge-base` | — | ⬜ | ⬜ | ⬜ |
| B12 | Calendar + Room booking | `/calendar` | — | ⬜ | ⬜ | ⬜ |
| B13 | Feed / Newsfeed | `/feed` | — | ⬜ | ⬜ | ⬜ |
| B14 | Vehicle Booking | `/calendar` | — | ⬜ | ⬜ | ⬜ |

**Bugs phát hiện Stream B:**
> _(ghi vào đây khi tìm thấy)_

---

## Stream C — Finance & CRM

**Người phụ trách:** ___________  
**BPM cần test:** `expense-claim-v1` · `budget-approval-v1` · `deal-to-project-kickoff-v1`

| # | Màn hình | Folder | BPM? | QA | UI | Done |
|---|---|---|---|---|---|---|
| C1 | CRM — Lead pipeline | `/crm` | — | ⬜ | ⬜ | ⬜ |
| C2 | CRM — Deal (Cơ hội kinh doanh) | `/crm` | ✅ deal→project | ⬜ | ⬜ | ⬜ |
| C3 | CRM — Khách hàng + Liên hệ | `/crm` | — | ⬜ | ⬜ | ⬜ |
| C4 | CRM — Hoạt động (Activity log) | `/crm` | — | ⬜ | ⬜ | ⬜ |
| C5 | CRM Analytics Dashboard | `/crm` | — | ⬜ | ⬜ | ⬜ |
| C6 | Hóa đơn (Invoice) | `/invoices` | — | ⬜ | ⬜ | ⬜ |
| C7 | Purchase Order | `/procurement` | — | ⬜ | ⬜ | ⬜ |
| C8 | Chi phí (Expense) | `/expenses` | ✅ | ⬜ | ⬜ | ⬜ |
| C9 | Budget Plan + Duyệt | `/budget` | ✅ | ⬜ | ⬜ | ⬜ |
| C10 | Kế toán — Chart of Accounts | `/accounting` | — | ⬜ | ⬜ | ⬜ |
| C11 | Kế toán — Journal Entry | `/accounting` | — | ⬜ | ⬜ | ⬜ |
| C12 | Finance Analytics (P&L, AR aging) | `/finance` | — | ⬜ | ⬜ | ⬜ |
| C13 | Customer Portal | `/portal` | — | ⬜ | ⬜ | ⬜ |
| C14 | Hợp đồng khách hàng (Client Contract) | `/contracts` | — | ⬜ | ⬜ | ⬜ |

**Bugs phát hiện Stream C:**
> _(ghi vào đây khi tìm thấy)_

---

## Stream D — Platform, Admin & UX

**Người phụ trách:** ___________

| # | Màn hình | Folder | BPM? | QA | UI | Done |
|---|---|---|---|---|---|---|
| D1 | Executive Dashboard | `/dashboard` | — | ⬜ | ⬜ | ⬜ |
| D2 | My Work (pending approvals, tasks hôm nay) | `/dashboard` | — | ⬜ | ⬜ | ⬜ |
| D3 | BPM Inbox (Approvals) | `/approvals` | — | ⬜ | ⬜ | ⬜ |
| D4 | BPM Process List + Detail | `/processes` | — | ⬜ | ⬜ | ⬜ |
| D5 | Recruitment — Jobs + Candidates | `/recruit` | — | ⬜ | ⬜ | ⬜ |
| D6 | Recruitment — Interview scheduling | `/recruit` | — | ⬜ | ⬜ | ⬜ |
| D7 | Tài sản (Asset) | `/assets` | ✅ disposal | ⬜ | ⬜ | ⬜ |
| D8 | Quản lý Users | `/users` | — | ⬜ | ⬜ | ⬜ |
| D9 | Phân quyền (Roles + Permissions) | `/permissions` | — | ⬜ | ⬜ | ⬜ |
| D10 | Analytics / Report Builder | `/analytics` `/reports` | — | ⬜ | ⬜ | ⬜ |
| D11 | Audit Log | `/audit-log` | — | ⬜ | ⬜ | ⬜ |
| D12 | Admin — SMTP Config + Test email | `/settings` | — | ⬜ | ⬜ | ⬜ |
| D13 | Admin — API Keys | `/settings` | — | ⬜ | ⬜ | ⬜ |
| D14 | Admin — BullMQ Job Browser | `/admin` | — | ⬜ | ⬜ | ⬜ |
| D15 | Admin — Webhook Monitor | `/admin` | — | ⬜ | ⬜ | ⬜ |
| D16 | Admin — Email Log + retry | `/admin` | — | ⬜ | ⬜ | ⬜ |
| D17 | Notification Preferences | `/settings` | — | ⬜ | ⬜ | ⬜ |
| D18 | Tenant Settings (Branding) | `/settings` | — | ⬜ | ⬜ | ⬜ |
| D19 | Alerts | `/alerts` | — | ⬜ | ⬜ | ⬜ |

**Bugs phát hiện Stream D:**
> _(ghi vào đây khi tìm thấy)_

---

## D20 — UI Audit Toàn hệ thống ✅ HOÀN THÀNH (2026-06-01)

> **Kết quả:** 76 files đã sửa — TypeScript 0 errors

### Kết quả audit

| Vi phạm | Trước | Sau | Ghi chú |
|---|---|---|---|
| `Modal.confirm` inline (xóa) | 18 | 0 | → `confirmDelete()` |
| Hardcode màu cấm (true) | 94 | 2 | 2 còn = false positive (guarded/placeholder) |
| `preset.primary` làm text/link | 17 | 2 | 2 còn = Rule #3 active state (OK) |
| Tự khai báo palette | ~15 | 0 | → `useThemePalette()` |
| Plain string renders Table | ~30 | 0 | → `<Text style={{ color }}>` |

### Trạng thái UI Audit
- [x] Chạy grep, liệt kê toàn bộ vi phạm theo file
- [x] Fix hàng loạt 76 files
- [x] TypeScript verify — 0 errors

---

## Thống kê tiến độ

> Cập nhật thủ công hoặc chạy: `grep -c "✅" .claude/qa-checklist.md`

| Stream | Tổng màn hình | QA Done | UI Done | Fully Done |
|---|---|---|---|---|
| A — HR | 15 | 0 | 0 | 0 |
| B — Projects | 14 | 0 | 0 | 0 |
| C — Finance/CRM | 14 | 0 | 0 | 0 |
| D — Platform | 19 | 0 | 0 | 0 |
| **TỔNG** | **62** | **0** | **0** | **0** |

---

## Lịch trình gợi ý

| Giai đoạn | Việc | Trạng thái |
|---|---|---|
| D20 UI Audit | Fix 8 nguyên tắc design, 76 files, 0 TS errors | ✅ DONE 2026-06-01 |
| Stream A+B QA | Test HR, Projects, Workspace (29 màn hình) | ⏳ Chờ team |
| Stream C QA | Test Finance, CRM (14 màn hình) | ⏳ Chờ team |
| Stream D QA | Test Platform, Admin (19 màn hình) | ⏳ Chờ team |
| BPM Integration | 8 flow end-to-end test | ⏳ Sau QA |
| v5.9 UX Redesign | Navigation 8 module, WCAG AA | ⏳ Sau QA |
| → V6 Sprint | tenantId migration + TenantAware 14 services | ⏳ Planned |
