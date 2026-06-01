---
name: project-demo-seed-v5
description: Yêu cầu seed demo data toàn hệ thống sau khi v5 hoàn thành — 500 NV, 50 dự án, tất cả module min 50 records
metadata:
  type: project
---

Thực hiện SAU KHI v5 hoàn thành (sau wccs8jl6i + merge + TS clean).

**Bước 1:** Xóa toàn bộ data cũ (truncate tables, giữ nguyên schema + config hệ thống)
**Bước 2:** Seed fresh data toàn bộ hệ thống theo yêu cầu bên dưới
**Bước 3:** QA + fix các màn hình lỗi (không vào được / không thêm được)

---

## Yêu cầu seed data

### Cơ cấu tổ chức — Tập đoàn
- Tên: **Loop Holdings** (hoặc tên phù hợp)
- Admin: **Phan Tuấn Anh** — Tổng Giám đốc (role=ADMIN)
- Cơ cấu 5 cấp: Tập đoàn > Công ty thành viên > Khối > Phòng ban > Tổ/Team
- Ít nhất 4 công ty thành viên (Công nghệ, Dịch vụ, Đầu tư, Vận hành)
- Mỗi công ty: CEO riêng + Ban giám đốc + các phòng ban

### Nhân sự — 500 người
- 1 Tổng Giám đốc: Phan Tuấn Anh (admin@loop.vn)
- ~10 C-Level (CFO, CTO, CHRO, CMO, COO, ...)
- ~30 Director/Manager các phòng
- ~60 Team Lead / Senior
- ~400 nhân viên thông thường
- Mix hợp đồng: INDEFINITE, FIXED_TERM, PROBATION, PART_TIME
- Có đầy đủ: thông tin cá nhân, địa chỉ, bằng cấp, ngày sinh, CCCD
- Lương: 8M–100M/tháng (theo cấp bậc)
- BHXH enrollment cho tất cả (trừ PART_TIME)
- Leave balance năm 2026

### 50 Dự án
- Mix loại: OSDC, TIME_MATERIAL, FIXED_PRICE, INTERNAL
- Status mix: PLANNING(5), ACTIVE(30), ON_HOLD(5), COMPLETED(10)
- Mỗi dự án có:
  - 3–8 task gốc, mỗi task có 2–5 subtask
  - 5–15 bug (mix severity/status)
  - 2–3 milestone
  - 3–5 member allocations
  - TimeLogs cho 3 tháng gần nhất
  - ProjectCostSnapshot
  - Ít nhất 1 Issue Register entry

### BPM — Khởi tạo đầy đủ
Process Definitions cần có BPMN XML và status=ACTIVE:
- leave-request-v1 (Leave Request)
- expense-claim-v1 (Expense Claim)
- overtime-approval-v1 (OT Request)
- contract-renewal-v1 (Contract Renewal)
- employee-offboarding-v1 (Offboarding)
- hr-decision-approval-v1 (HR Decision)
- budget-approval-v1 (Budget Plan)
- deal-to-project-kickoff-v1 (Deal→Project)
- salary-review-v1 (Salary Review)
- attendance-explanation-v1 (Attendance Explanation)
- performance-review-v1 (Performance Review)

Dữ liệu BPM:
- 50+ ProcessInstance đã COMPLETED (mix leave/expense/OT)
- 20+ ProcessInstance RUNNING (cần action)
- 10+ ProcessInstance REJECTED

### Bảng công + Lương
- AttendanceRecord: 3 tháng gần nhất cho tất cả nhân viên active
- TimesheetRecord: 3 kỳ gần nhất
- MonthlyAttendance: 3 tháng gần nhất
- PayrollPeriod: 3 kỳ lương APPROVED + 1 kỳ DRAFT
- PayrollRecord: đầy đủ cho 3 kỳ đã APPROVED
- Phiếu lương tháng 13: 1 kỳ PAID

### Các module — min 50 records mỗi loại
| Module | Min records |
|---|---|
| LeaveRequest | 50 (mix APPROVED/REJECTED/PENDING) |
| OvertimeRequest | 50 (mix statuses) |
| Expense | 60 (mix categories + statuses) |
| Task | 500+ (across 50 projects) |
| Bug | 200+ (across projects) |
| CrmActivity | 100+ (CALL/EMAIL/MEETING/SURVEY) |
| Lead | 100 (mix statuses, 30 CONVERTED) |
| Deal | 50 (mix stages, 15 WON) |
| Customer | 50 |
| Contact | 100 |
| Invoice | 60 (mix DRAFT/SENT/PAID/OVERDUE) |
| PurchaseOrder | 40 |
| HrDecision | 50 (HIRE/TRANSFER/SALARY_CHANGE/PROMOTION) |
| TrainingRecord | 60 |
| PerformanceReview | 60 |
| KpiMetric + KpiRecord | 50+ |
| KbArticle | 50 |
| Asset | 60 |
| BudgetPlan + BudgetLine | 10 plans, 50 lines |
| ProjectJournal | 100+ (across projects) |
| FeedPost | 50 (ANNOUNCEMENT/KUDOS/BIRTHDAY/ANNIVERSARY) |
| Notification | 200+ |
| AuditLog | 100+ |

### Data có logic đúng
- Leave balance đủ cho người xin nghỉ
- Contract.salaryMonthly khớp PayrollRecord
- Project dates hợp lý (startDate < endDate)
- Bug linked với Task
- Invoice linked với Customer + Project/Deal
- HrDecision → WorkHistory → PositionHistory/SalaryRecord chain đúng
- BPM ProcessInstance variables đúng format

### QA sau seed — Kiểm tra và fix
Sau khi seed xong, chạy QA pass để kiểm tra:
1. Tất cả list pages load được (không crash)
2. Create/Edit form mở được và submit được
3. BPM flow chạy được end-to-end
4. Dashboard/Analytics có data hiển thị
5. Export Excel/PDF hoạt động

**Why:** User phát hiện một số màn hình không vào được và không thêm mới được — cần seed + QA để reproduce và fix.

**How to apply:** Khi bắt đầu seed, chạy theo thứ tự: truncate → org structure → users → contracts → payroll config → projects → tasks/bugs → CRM → Finance → BPM → seed data cho các module nhỏ → verify counts.
