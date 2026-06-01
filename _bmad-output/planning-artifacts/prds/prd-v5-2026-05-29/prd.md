# PRD — Loop v5.x: Inter-Module Business Logic & Deep Analytics

> **Tài liệu:** Product Requirements Document  
> **Phiên bản sản phẩm:** v5.0 → v5.5  
> **Ngày tạo:** 2026-05-29  
> **Tác giả:** Mary — Business Analyst (BMad)  
> **Trạng thái:** DRAFT — chờ kỹ thuật review

---

## Tổng quan chiến lược

Loop v5.x là chu kỳ **"Deepening"** — không mở rộng thêm module mới mà tập trung vào **liên thông nghiệp vụ** giữa các module đã có và bổ sung **Business Intelligence** chuyên sâu cho từng domain.

### Triết lý thiết kế v5

| Nguyên tắc | Mô tả |
|---|---|
| **BPM-First** | Mọi quy trình có approval/review BẮT BUỘC dùng BPMN ProcessDefinition — không tự build state machine |
| **EventBus Driven** | Liên thông giữa module qua EventBus (HrEventBus, ProjectEventBus, FinanceEventBus) — không Prisma join cross-domain |
| **Demo Data by Default** | Mỗi tính năng mới phải đi kèm seed data thực tế — TypeScript ≠ feature works |
| **Dashboard per Module** | Mỗi module có dashboard riêng với KPI chuyên sâu, không chỉ CRUD table |
| **Inherit First** | Trước khi tạo component/hook mới, phải kiểm tra bảng tra cứu CLAUDE.md |

### Phiên bản và Epic mapping

| Version | Tên | Epic | Thời gian ước tính |
|---|---|---|---|
| **v5.0** | Foundation: Payroll Completion | E16, E17 | 2–3 tuần |
| **v5.1** | HR Lifecycle Automation | E18, E19 | 3–4 tuần |
| **v5.2** | Project-Finance Pipeline | E20, E21 | 3–4 tuần |
| **v5.3** | CRM → Delivery Pipeline | E22 | 2–3 tuần |
| **v5.4** | Smart Workflow Engine | E23 | 3.5–4 tuần |
| **v5.5** | Business Intelligence Dashboards | E24 | 3–4 tuần |
| **v5.6** | End User Utilities | E25 | 2–3 tuần |
| **v5.7** | Platform & Admin Utilities | E26 | 3–4 tuần |

---

## v5.0 — Foundation: Payroll Completion

> **Mục tiêu:** Lấp 2 lỗ hổng nghiêm trọng trong PayrollEngine: OT chưa vào lương, Leave không lương chưa bị trừ. Đồng thời bổ sung Budget Module — nền tảng kiểm soát chi phí cho toàn hệ thống.

### Epic E16 — OT & Leave → Payroll Integration

**Mục tiêu Epic:** PayrollRecord phản ánh đầy đủ giờ làm thêm và ngày nghỉ không lương của nhân viên.

**Nguyên tắc BPM:**
- OvertimeRequest dùng ProcessDefinition hiện có (hoặc tạo key `overtime-approval-v1`)
- Khi `ProcessInstance COMPLETED + decision = APPROVED` → `OvertimeRequest.status = APPROVED` → feed PayrollRecord

---

#### Story E16.1 — Kết nối OvertimeRequest APPROVED → PayrollRecord

**As a** Kế toán lương,  
**I want** hệ thống tự động tính giờ OT đã duyệt vào phiếu lương,  
**So that** tôi không phải nhập tay từng dòng OT cho 50+ nhân viên mỗi tháng.

**Acceptance Criteria:**
- [ ] Khi run `PayrollEngineService.processPayrollPeriod(periodId)`, hệ thống query tất cả `OvertimeRequest` có `status = APPROVED` và `date` trong khoảng `period.startDate..period.endDate` cho từng employee
- [ ] Tổng `overtimeHours` = `sum(OvertimeRequest.hours)` theo loại ngày (thường/cuối tuần/lễ)
- [ ] `overtimePay` tính theo bội số BLLĐ 2019:
  - Ngày thường: `×1.5` trên lương giờ cơ bản
  - Thứ 7/CN: `×2.0`
  - Ngày lễ/tết: `×3.0`
- [ ] Lương giờ cơ bản = `Contract.salaryMonthly / (26 × 8)` (26 ngày công, 8h/ngày)
- [ ] `PayrollRecord.overtimePayBreakdown` lưu JSON chi tiết: `{ weekday: {hours, rate, amount}, weekend: {...}, holiday: {...} }`
- [ ] `PayrollRecord.grossSalary` tái tính có cộng `overtimePay`

**Schema changes:** Thêm `dayType` enum vào `OvertimeRequest` (`WEEKDAY | WEEKEND | HOLIDAY`)

**BPM dependency:** `OvertimeRequest.processInstanceId` phải được populate khi tạo request

**Demo data:**
- 5 OT requests APPROVED trong kỳ lương hiện tại (mix weekday/weekend)
- 2 request PENDING (không được tính)
- 1 nhân viên có OT ngày lễ (để test ×3.0)

---

#### Story E16.2 — Unpaid Leave Deduction trong PayrollRecord

**As a** Nhân viên,  
**I want** phiếu lương của tôi phản ánh chính xác những ngày nghỉ không lương đã được duyệt,  
**So that** tôi hiểu rõ cơ cấu lương và không có thắc mắc khi nhận lương.

**Acceptance Criteria:**
- [ ] Query `LeaveRequest` có `status = APPROVED`, `LeaveType.isPaid = false`, ngày nghỉ trong kỳ lương
- [ ] `PayrollRecord.unpaidLeaveDays` = số ngày nghỉ không lương (tính theo ngày làm việc, bỏ T7/CN/lễ)
- [ ] Deduction amount = `unpaidLeaveDays × (salaryMonthly / 26)`
- [ ] `PayrollRecord.deductions` tăng thêm deduction amount
- [ ] `PayrollRecord.netSalary` giảm tương ứng
- [ ] Payslip PDF hiển thị dòng "Nghỉ không lương: N ngày × Đơn giá = Số tiền khấu trừ"

**Ghi chú kỹ thuật:** `PayrollRecord` đã có `unpaidLeaveDays` field — chỉ cần bổ sung logic feed trong `payroll-engine.service.ts`

**Demo data:**
- Nhân viên A: 2 ngày nghỉ không lương trong tháng → bị trừ
- Nhân viên B: 3 ngày nghỉ có lương → KHÔNG trừ
- Nhân viên C: Không nghỉ

---

#### Story E16.3 — Year-End Leave Payout Calculation

**As a** HR Manager,  
**I want** hệ thống tự tính số ngày phép năm chưa dùng để thanh toán hoặc chuyển sang năm sau,  
**So that** tôi không phải tính tay cho từng nhân viên vào tháng 12.

**Acceptance Criteria:**
- [ ] Cron job chạy ngày 25/12 hàng năm: query `LeaveBalance` có `leaveType.isPaid = true`
- [ ] Với từng `LeaveBalance`: tính `carryOverDays = min(remainingDays, leaveType.maxCarryOver)`
- [ ] Tạo `EmployeeBonus` record loại `LEAVE_PAYOUT`: `amount = (remainingDays - carryOverDays) × dailyRate`
- [ ] Tạo `LeaveBalance` cho năm mới với `balance = carryOverDays + leaveType.annualDays`
- [ ] Gửi notification cho HR và từng nhân viên: tóm tắt phép năm + payout amount
- [ ] LeaveType có field mới: `maxCarryOver Int @default(0)` (0 = không cho chuyển)

**BPM:** Tạo ProcessDefinition `year-end-leave-closure-v1` với task "HR xác nhận danh sách payout" trước khi cron execute

**Demo data:**
- LeaveType "Phép năm" với `annualDays = 12, maxCarryOver = 5`
- 3 nhân viên với `remainingDays`: 8 ngày, 3 ngày, 0 ngày
- Chạy cron simulate → kiểm tra EmployeeBonus được tạo đúng

---

#### Story E16.4 — OT/Leave Summary Dashboard (Payroll module)

**As a** Kế toán trưởng,  
**I want** dashboard tổng hợp OT và Leave ảnh hưởng lương mỗi kỳ,  
**So that** tôi kiểm soát được chi phí nhân sự trước khi phê duyệt bảng lương.

**Acceptance Criteria:**
- [ ] Panel "OT kỳ này" trong Payroll Dashboard: tổng giờ OT, tổng tiền OT, breakdown weekday/weekend/holiday
- [ ] Panel "Nghỉ phép kỳ này": tổng ngày nghỉ có lương / không lương, top 5 phòng ban nhiều nghỉ nhất
- [ ] Biểu đồ bar: OT hours theo tuần trong kỳ
- [ ] Export Excel: danh sách chi tiết OT + Leave theo nhân viên

**Component:** Dùng `<SparklineCard>` cho summary numbers, `<StatCard>` cho totals

---

### Epic E17 — Budget Module

**Mục tiêu Epic:** Tạo module ngân sách làm nền tảng kiểm soát chi tiêu cho Expense, PurchaseOrder, và Project Cost.

**Mô hình dữ liệu mới:**

```
BudgetPlan {
  id, tenantId, name, fiscalYear Int, type (DEPARTMENT|PROJECT|COMPANY),
  orgUnitId?, projectId?, totalAmount Decimal, currency,
  status (DRAFT|ACTIVE|CLOSED), approvedAt?, approvedById?,
  processInstanceId?
}

BudgetLine {
  id, planId, category String (HR|OPERATION|MARKETING|IT|OTHER),
  description, allocatedAmount Decimal, usedAmount Decimal (readonly—computed),
  committedAmount Decimal (PO approved, not received yet),
  alertThreshold Int @default(80) // % để trigger alert
}

BudgetTransaction {
  id, lineId, sourceType (EXPENSE|PURCHASE_ORDER|PAYROLL|MANUAL),
  sourceId String, amount Decimal, type (COMMIT|ACTUAL|RELEASE),
  createdAt, note
}
```

---

#### Story E17.1 — Tạo và phê duyệt Budget Plan (BPM)

**As a** Phòng Tài chính,  
**I want** tạo kế hoạch ngân sách theo năm tài chính và trình duyệt qua quy trình phê duyệt,  
**So that** ban lãnh đạo nắm rõ và phê duyệt ngân sách trước khi bắt đầu năm.

**Acceptance Criteria:**
- [ ] CRUD BudgetPlan với các BudgetLine (category, allocatedAmount)
- [ ] Submit → BPM ProcessDefinition `budget-approval-v1` (tạo mới):
  - Task 1: Finance Manager review
  - Task 2: CFO/Director approve
  - Condition: totalAmount > 500M → required CFO
- [ ] Status flow: `DRAFT → PENDING_APPROVAL → ACTIVE | REJECTED`
- [ ] Khi ACTIVE: lock BudgetLine allocatedAmount (chỉ sửa được qua amendment flow)
- [ ] Validation: tổng allocatedAmount của các line = BudgetPlan.totalAmount

**Demo data:**
- Budget năm 2026: Công ty ABC Technology — tổng 2.4 tỷ VND
- 5 budget lines: HR (800M), IT (400M), Marketing (300M), Operation (600M), Training (300M)
- 1 plan đang ACTIVE, 1 plan DRAFT

---

#### Story E17.2 — Budget Check khi duyệt Expense

**As a** Nhân viên,  
**I want** biết ngay khi submit expense có vượt ngân sách phòng ban hay không,  
**So that** tôi không mất thời gian chờ rồi bị từ chối vì budget.

**Acceptance Criteria:**
- [ ] Khi `ExpenseService.create()`: tìm `BudgetLine` tương ứng (orgUnit + category + fiscalYear)
- [ ] Nếu `usedAmount + committedAmount + amount > allocatedAmount × (alertThreshold/100)`: warning UI (không block)
- [ ] Nếu `usedAmount + committedAmount + amount > allocatedAmount`: block submit, hiện lỗi rõ ràng
- [ ] Khi `Expense APPROVED`: `BudgetTransaction(type=ACTUAL, amount)` → update `BudgetLine.usedAmount`
- [ ] Khi `Expense REJECTED`: không tạo transaction

**Approver notification:** Khi expense gần đến threshold, email/push cho approver kèm % đã dùng

---

#### Story E17.3 — Budget Check khi duyệt Purchase Order

**As a** Trưởng phòng,  
**I want** PO không được duyệt nếu vượt ngân sách còn lại,  
**So that** kiểm soát tài chính không bị phá vỡ bởi mua sắm đột xuất.

**Acceptance Criteria:**
- [ ] Khi `PurchaseOrderService.approve()`: check BudgetLine
- [ ] `PO SUBMITTED` → `BudgetTransaction(type=COMMIT)` (committed không phải actual)
- [ ] `PO RECEIVED` → convert COMMIT → ACTUAL, release committed
- [ ] `PO CANCELLED` → release committed amount
- [ ] Trong BudgetLine dashboard: hiển thị tách biệt "Đã chi" vs "Đã cam kết"

---

#### Story E17.4 — Budget Dashboard

**As a** CFO,  
**I want** dashboard ngân sách real-time theo phòng ban và danh mục,  
**So that** tôi có thể ra quyết định tài chính dựa trên số liệu thực.

**Acceptance Criteria:**
- [ ] `<SparklineCard>` tổng: Tổng ngân sách / Đã dùng / Còn lại / % sử dụng
- [ ] Bảng breakdown theo BudgetLine: progress bar màu (xanh < 70%, vàng 70-90%, đỏ > 90%)
- [ ] Biểu đồ line: xu hướng chi tiêu theo tháng vs kế hoạch
- [ ] Drilldown: click vào line → xem danh sách Expense/PO thuộc line đó
- [ ] Export: báo cáo ngân sách Excel (theo chuẩn kế toán VN)
- [ ] Filter: fiscal year, orgUnit, category

---

---

## v5.1 — HR Lifecycle Automation

> **Mục tiêu:** Tự động hóa vòng đời nhân sự: hợp đồng tự gia hạn/kết thúc, đánh giá thành tích kết nối lương thưởng, quy trình offboarding chuẩn hóa.

### Epic E18 — Contract Lifecycle Automation

**Mục tiêu Epic:** Hợp đồng lao động được theo dõi tự động — alert trước khi hết hạn, tạo HrDecision suggestion, và trigger offboarding checklist khi kết thúc.

---

#### Story E18.1 — Contract Expiry Alert & Auto-Status

**As a** HR Manager,  
**I want** nhận cảnh báo trước khi hợp đồng nhân viên hết hạn và hợp đồng tự chuyển trạng thái đúng hạn,  
**So that** không có nhân viên nào tiếp tục làm việc với hợp đồng đã hết hạn mà không ai biết.

**Acceptance Criteria:**
- [ ] Cron chạy mỗi ngày 08:00: tìm Contract có `endDate` trong 60/30/15/7/3 ngày tới và `status = ACTIVE`
- [ ] Gửi Notification đến: HR Manager của orgUnit + Employee trực tiếp
- [ ] Template thông báo: "Hợp đồng [loại] của [tên NV] sẽ hết hạn vào [ngày] (còn [N] ngày)"
- [ ] Ngày `endDate + 1`: auto-update `Contract.status = EXPIRED`
- [ ] `Contract.status = EXPIRED` → tạo `HrDecision` DRAFT với `type = CONTRACT_REVIEW`
- [ ] HrDecision DRAFT được assign cho HR Manager tương ứng

**Schema changes:** Thêm vào `Contract`: `autoExpireHandled Boolean @default(false)`

---

#### Story E18.2 — Contract Renewal via BPM

**As a** HR,  
**I want** quy trình gia hạn hợp đồng qua phê duyệt 2 cấp trước khi tạo hợp đồng mới,  
**So that** việc gia hạn có audit trail đầy đủ và không bỏ sót chữ ký.

**BPM ProcessDefinition:** `contract-renewal-v1`
```
Start → [HR fill renewal form] → [Manager approve] → [Director approve (nếu salary tăng > 10%)]
      → [HR tạo Contract mới] → End
```

**Acceptance Criteria:**
- [ ] Từ HrDecision `CONTRACT_REVIEW`, HR có thể chọn: "Gia hạn" / "Không gia hạn" / "Chuyển INDEFINITE"
- [ ] Chọn "Gia hạn" → start BPM `contract-renewal-v1` với variables: `{employeeId, newType, newSalary, newEndDate}`
- [ ] BPM COMPLETED + APPROVED → auto-create Contract mới với `previousContractId = old.id`, `renewalCount += 1`
- [ ] BPM COMPLETED + REJECTED → HrDecision cập nhật `CLOSED`, ghi lý do
- [ ] Salary tăng > 10% → thêm Director approval task vào flow
- [ ] Email notification cho nhân viên khi hợp đồng mới được tạo

**Demo data:**
- 3 nhân viên có contract hết hạn trong 30 ngày
- 1 quy trình renewal đang pending approval
- 1 contract đã renewed (để test history)

---

#### Story E18.3 — Employee Offboarding Checklist

**As a** HR Manager,  
**I want** một checklist offboarding tự động khi nhân viên nghỉ việc,  
**So that** không có tài sản nào bị thất thoát và quyền truy cập được thu hồi đúng hạn.

**BPM ProcessDefinition:** `employee-offboarding-v1`
```
[HR Decision: TERMINATION] → Start Offboarding Process
  ├─ [IT: Thu hồi quyền truy cập hệ thống]
  ├─ [Asset: Liệt kê tài sản cần thu hồi]
  ├─ [Payroll: Tính lương cuối + payout phép năm]
  ├─ [Manager: Bàn giao công việc]
  └─ [HR: Làm thủ tục bảo hiểm + hồ sơ]
→ All tasks complete → Employee.isActive = false → User.isActive = false → End
```

**Acceptance Criteria:**
- [ ] `HrDecision.type = TERMINATION` APPROVED → auto-start BPM `employee-offboarding-v1`
- [ ] BPM tạo parallel tasks cho IT / HR / Payroll / Manager
- [ ] Task "Thu hồi tài sản": list `AssetAssignment` của nhân viên → HR đánh dấu từng asset đã thu
- [ ] Task "Lương cuối": trigger `PayrollEngineService` cho period đến ngày nghỉ + thêm leave payout
- [ ] Task "Thu hồi quyền": khi complete → `User.isActive = false`, revoke refresh tokens
- [ ] Dashboard offboarding: % hoàn thành, task nào đang chờ, ai đang phụ trách
- [ ] `Employee.terminationDate` được set khi toàn bộ task complete

**Demo data:**
- 1 nhân viên đang trong quy trình offboarding (50% hoàn thành)
- Các task ở trạng thái khác nhau (IT xong, Payroll đang xử lý, Manager chưa bắt đầu)

---

### Epic E19 — Performance → Compensation Integration

**Mục tiêu Epic:** Kết quả đánh giá thành tích tự động kích hoạt tính toán thưởng và đề xuất điều chỉnh lương.

---

#### Story E19.1 — PerformanceReview → Bonus Calculation

**As a** HR Manager,  
**I want** hệ thống tự tính bonus dựa trên kết quả đánh giá thành tích,  
**So that** quy trình thưởng minh bạch, nhất quán và không phụ thuộc vào tính toán thủ công.

**Schema mới:**
```
PerformanceBonus {
  id, reviewId, employeeId, 
  scoreRange String (EXCELLENT|GOOD|AVERAGE|BELOW),
  coefficient Decimal (e.g. 2.0 for EXCELLENT),
  baseAmount Decimal (từ SalaryColumn type=BONUS hoặc contract salary),
  bonusAmount Decimal (baseAmount × coefficient),
  status (DRAFT|APPROVED|PAID),
  periodId? (link vào PayrollPeriod khi PAID),
  approvedById?, approvedAt?
}

PerformanceBonusConfig {
  id, tenantId, scoreMin Decimal, scoreMax Decimal, 
  label String, coefficient Decimal
  -- vd: 9-10 → EXCELLENT → ×2.0, 7-8.9 → GOOD → ×1.5, ...
}
```

**Acceptance Criteria:**
- [ ] Admin cấu hình `PerformanceBonusConfig`: score range → coefficient (mặc định seeded)
- [ ] `PerformanceReview.status = APPROVED` → trigger `BonusCalculationService.calculateFromReview(reviewId)`
- [ ] Service tìm config phù hợp với `review.score`, tính `bonusAmount`
- [ ] Tạo `PerformanceBonus` record với `status = DRAFT`
- [ ] Gửi notification cho HR: "Đánh giá [tên NV] đã duyệt — Bonus gợi ý: [amount]"
- [ ] HR vào confirm → `PerformanceBonus.status = APPROVED`
- [ ] Khi run Payroll period: include `PerformanceBonus` APPROVED của kỳ vào `PayrollRecord.bonus`

**Demo data:**
- `PerformanceBonusConfig`: EXCELLENT (9-10) ×2.0, GOOD (7-8.9) ×1.5, AVERAGE (5-6.9) ×1.0, BELOW (0-4.9) ×0
- 5 reviews APPROVED với score khác nhau → 5 bonus records ở status khác nhau

---

#### Story E19.2 — Salary Review Suggestion sau đánh giá

**As a** HR,  
**I want** gợi ý điều chỉnh lương dựa trên kết quả đánh giá và vị trí trong band lương,  
**So that** các quyết định tăng lương có cơ sở dữ liệu rõ ràng.

**Schema mới:**
```
SalaryBand {
  id, positionId (hoặc gradeId), minSalary, midSalary, maxSalary, currency
}

SalaryReviewSuggestion {
  id, reviewId, employeeId, currentSalary, suggestedSalary,
  increasePercent, reason, status (PENDING|APPROVED|REJECTED|APPLIED),
  approvedById?, appliedAt?
}
```

**Acceptance Criteria:**
- [ ] Khi `PerformanceReview APPROVED` với score >= 8 (GOOD+): check vị trí lương trong `SalaryBand`
- [ ] Nếu `currentSalary < band.midSalary`: tạo `SalaryReviewSuggestion`
- [ ] Suggested increase: EXCELLENT → +10-15%, GOOD → +5-10% (config được)
- [ ] HR/Manager review và approve suggestion
- [ ] `SalaryReviewSuggestion APPROVED` → auto-create `Contract` mới (renewal flow) hoặc HR tạo thủ công
- [ ] Dashboard: phân tán biểu đồ (scatter plot) nhân viên trong band lương theo score

---

#### Story E19.3 — OKR Progress → Performance Review Seed

**As a** Manager,  
**I want** kết quả OKR tự động điền vào form đánh giá thành tích,  
**So that** tôi không phải tra cứu lại số liệu OKR khi làm đánh giá.

**Acceptance Criteria:**
- [ ] Khi tạo `PerformanceReview`: auto-populate `goals` field từ `OkrObjective` của employee trong cùng kỳ
- [ ] Tính trung bình `OkrKeyResult.progress` → gợi ý `score` (tham khảo, không bắt buộc)
- [ ] UI: accordion "OKR kỳ này" trong form đánh giá (hiển thị read-only)
- [ ] Link từ PerformanceReview sang các OkrObjective liên quan

---

---

## v5.2 — Project-Finance Pipeline

> **Mục tiêu:** Kết nối Project → Finance end-to-end: chi phí dự án real-time, tự động tạo invoice từ milestone, kế toán tự động khi thanh toán.

### Epic E20 — Project Cost Engine & Milestone → Invoice

---

#### Story E20.1 — TimeLog → Project Cost Engine

**As a** Project Manager,  
**I want** xem chi phí dự án thực tế theo thời gian real-time,  
**So that** tôi kiểm soát được margin dự án và không bị lỗ vào cuối dự án.

**Schema mới:**
```
ProjectCostSnapshot {
  id, projectId, snapshotDate Date, 
  totalLaborCost Decimal, totalExpenseCost Decimal,
  totalCost Decimal, billableHours Decimal, totalHours Decimal,
  utilizationRate Decimal
}

ProjectCostByEmployee {
  id, snapshotId, employeeId, hours Decimal, 
  ratePerHour Decimal, cost Decimal
}
```

**Logic:**
```
Daily cron 00:30:
  Với mỗi Project ACTIVE:
    laborCost = sum(
      TimeLog.hours × EmployeeRate[date] / 8  -- rate theo ngày, chia 8 ra giờ
    ) WHERE TimeLog.date in project.startDate..today

    expenseCost = sum(Expense.amount WHERE projectId = project.id AND status = APPROVED)
    
    Upsert ProjectCostSnapshot
```

**Acceptance Criteria:**
- [ ] Cron job `project-cost-snapshot` chạy 00:30 hàng ngày
- [ ] `EmployeeRate` dùng rate có hiệu lực tại `TimeLog.date` (time-windowed lookup)
- [ ] Project dashboard hiển thị: Budget vs Actual cost (nếu có BudgetLine), margin
- [ ] Alert khi `totalCost > project.estimatedBudget × 0.8` (nếu project có budget)
- [ ] API: `GET /projects/:id/cost-summary` trả về snapshot mới nhất + trend 30 ngày

**Demo data:**
- 3 projects ACTIVE với 30+ timelogs mỗi project
- Rate history nhân viên thay đổi giữa dự án (test time-windowed rate)
- 1 project sắp vượt budget (80%)

---

#### Story E20.2 — ContractMilestone → Invoice Auto-Draft

**As a** Account Manager,  
**I want** hệ thống tự tạo draft invoice khi milestone được đánh dấu hoàn thành,  
**So that** tôi không bỏ sót việc xuất hóa đơn cho khách hàng và rút ngắn thời gian thu tiền.

**Acceptance Criteria:**
- [ ] Khi `ContractMilestone.status → COMPLETED`:
  - Tìm `ClientContract` tương ứng → lấy `customerId`
  - Auto-create `Invoice` với `status = DRAFT`:
    - `type = MILESTONE`
    - `customerId` từ ClientContract
    - `projectId` từ Deal.projectId (nếu có)
    - `items[0]`: milestone.name, qty=1, unitPrice=milestone.amount
    - `dueDate = today + ClientContract.paymentTermsDays` (default 30)
- [ ] Notification đến Account Manager: "Milestone [tên] hoàn thành — Draft invoice đã tạo, cần review"
- [ ] Invoice draft hiển thị trong Invoice list với badge "Từ milestone"
- [ ] `ContractMilestone.invoiceId` được cập nhật sau khi tạo invoice

**Schema thêm:** `ContractMilestone.invoiceId String? @unique`

**Demo data:**
- 3 ClientContract với 2-4 milestones mỗi contract
- 1 milestone vừa COMPLETED → 1 invoice draft mới
- 1 milestone PAID với invoice đã tồn tại

---

#### Story E20.3 — Deal Won → Project Kickoff Wizard

**As a** Sales Manager,  
**I want** khi đánh dấu deal thắng, wizard dẫn tôi tạo ngay project, contract và portal khách hàng,  
**So that** delivery team không phải chờ setup thủ công và khách hàng được onboard nhanh.

**BPM ProcessDefinition:** `deal-to-project-kickoff-v1`
```
[Deal.stage = WON] → Start
  → Task: PM xác nhận nhận dự án + assign team
  → Task: Legal tạo ClientContract (nếu chưa có)
  → Task: IT cấp portal access cho khách hàng
→ End (Project.status = ACTIVE)
```

**Acceptance Criteria:**
- [ ] `Deal.stage` chuyển sang `WON` → popup wizard 3 bước:
  - Bước 1: Confirm project info (tên, PM, ngày bắt đầu, estimated budget)
  - Bước 2: Template tasks (dropdown: Dự án phần mềm / Tư vấn / Training)
  - Bước 3: Portal access (email khách hàng để invite)
- [ ] Wizard tạo: `Project`, `ClientContract` draft, `CustomerPortal` record
- [ ] `Deal.projectId` được cập nhật
- [ ] `Deal.wonAt = now()` được set
- [ ] Start BPM `deal-to-project-kickoff-v1` cho tasks phân công
- [ ] Skip wizard: nếu `Deal.projectId` đã tồn tại → chỉ update `wonAt`

**Demo data:**
- 2 deals WON với project đã được tạo
- 1 deal QUALIFICATION + 1 deal PROPOSAL để test wizard

---

### Epic E21 — Invoice → Journal Auto-posting

---

#### Story E21.1 — Invoice Paid → JournalEntry Auto-creation

**As a** Kế toán,  
**I want** khi invoice được đánh dấu PAID, bút toán kế toán tự động được tạo,  
**So that** tôi không phải nhập thủ công và đảm bảo sổ sách luôn cân.

**Schema mới:**
```
InvoiceAccountMapping {
  id, tenantId, invoiceType, 
  debitAccountId (ChartOfAccount), creditAccountId (ChartOfAccount),
  vatAccountId? (ChartOfAccount)
}
```

**Acceptance Criteria:**
- [ ] Admin cấu hình `InvoiceAccountMapping` theo invoiceType (MILESTONE, SERVICE, PRODUCT...)
- [ ] `Invoice.status → PAID` → `FinanceEventBus.emit('invoice.paid', {invoiceId})`
- [ ] `AccountingService` subscribe: lấy mapping → tạo `JournalEntry`:
  - Debit: `ChartOfAccount[CASH]` (hoặc Bank account, config được)
  - Credit: `ChartOfAccount[REVENUE]` theo invoiceType
  - Credit VAT: `ChartOfAccount[VAT_OUTPUT]` nếu `taxAmount > 0`
- [ ] `JournalEntry.reference = invoice.code`
- [ ] `Invoice.journalEntryId` được set sau khi tạo
- [ ] Nếu mapping chưa cấu hình: gửi notification cho kế toán, không block invoice status

**Demo data:**
- InvoiceAccountMapping cho 3 loại: MILESTONE (131→511), SERVICE (111→511→3331)
- 5 invoices ở trạng thái khác nhau: PAID (có journal), SENT (chưa có), DRAFT

---

#### Story E21.2 — PurchaseOrder Received → AP Journal

**Acceptance Criteria:**
- [ ] `PurchaseOrder.status → RECEIVED` → tạo JournalEntry:
  - Debit: Expense account (theo PO category → mapping)
  - Credit: `ChartOfAccount[AP_PAYABLE]`
- [ ] `PurchaseOrder.status → PAID` → tạo JournalEntry:
  - Debit: `AP_PAYABLE`
  - Credit: `CASH/BANK`
- [ ] Mọi auto-journal có note: "Auto-posted từ PO #{code}"

---

---

## v5.3 — CRM → Delivery Pipeline

> **Mục tiêu:** Đóng vòng lặp CRM→Project→Customer: deal thắng tự tạo dự án, ticket khách hàng tạo issue nội bộ, pipeline bán hàng feed vào KPI.

### Epic E22 — CRM Integration Layer

---

#### Story E22.1 — Customer Ticket → Internal Issue

**As a** Customer Success,  
**I want** ticket của khách hàng tự động tạo issue nội bộ để team phát triển xử lý,  
**So that** không có ticket nào bị bỏ quên và thời gian phản hồi được theo dõi.

**Schema thêm:** `CustomerTicket.issueId String? @unique`

**Acceptance Criteria:**
- [ ] Trong CustomerTicket detail: nút "Tạo Internal Issue" → mở form pre-filled:
  - Title = ticket.title
  - Description = ticket.description
  - Priority mapping: CRITICAL→CRITICAL, HIGH→HIGH, MEDIUM→MEDIUM, LOW→LOW
  - Tag tự động: "customer-ticket", portal.name
- [ ] Khi Issue được tạo: `CustomerTicket.issueId = issue.id`
- [ ] Khi `Issue.status → RESOLVED`: auto-update `CustomerTicket.status = RESOLVED`, `resolvedAt = now()`
- [ ] Portal khách hàng hiển thị "Đang xử lý / Đã giải quyết" (sync từ issue status)
- [ ] SLA tracking: `responseTime = firstActivity - createdAt`, `resolutionTime = resolvedAt - createdAt`

**BPM:** Không dùng BPM cho flow này — issue đã có workflow riêng

**Demo data:**
- CustomerPortal "Khách hàng ABC" với 5 tickets (mix status)
- 2 tickets đã link với internal issues
- 1 ticket CRITICAL chưa được xử lý (để test SLA alert)

---

#### Story E22.2 — Deal Pipeline → Revenue KPI Auto-feed

**As a** Giám đốc kinh doanh,  
**I want** KPI doanh thu được tự động cập nhật từ pipeline deal,  
**So that** tôi có view real-time về forecast doanh thu mà không phải nhập thủ công.

**Acceptance Criteria:**
- [ ] Cron daily: aggregate `Deal` pipeline → `KpiRecord`:
  - `weighted_pipeline = sum(deal.value × deal.probability / 100)` theo month
  - `win_rate = wonDeals.count / closedDeals.count × 100`
  - `avg_deal_size = sum(wonDeals.value) / wonDeals.count`
  - `avg_sales_cycle = avg(deal.wonAt - deal.createdAt)` (ngày)
- [ ] `KpiMetric` tương ứng được tạo nếu chưa có (key: `crm.weighted_pipeline`, etc.)
- [ ] CRM Dashboard hiển thị các KPI này realtime
- [ ] RevenueTarget comparison: pipeline vs target theo tháng

---

#### Story E22.3 — CRM Dashboard (module-level)

**As a** Sales Manager,  
**I want** dashboard CRM chuyên sâu với funnel, activity và forecast,  
**So that** tôi quản lý team sales hiệu quả và ra quyết định nhanh.

**Dashboard panels:**
1. **Funnel Chart**: số deal + value theo từng stage (Qualification→Proposal→Negotiation→Won/Lost)
2. **`<SparklineCard>`** x4: Tổng deals / Win rate / Avg deal size / Weighted pipeline value
3. **Leaderboard**: Top 5 sales theo won value (30 ngày qua)
4. **Recent Activities**: timeline `CrmActivity` mới nhất (call, email, meeting)
5. **Deals at risk**: deal > 30 ngày không có activity → highlight đỏ
6. **Forecast vs Target**: line chart theo tháng (actual won + weighted pipeline vs target)

---

---

## v5.4 — Smart Workflow Engine

> **Mục tiêu:** Nâng cấp khả năng workflow: delegation khi approver vắng mặt, automation rule có logic điều kiện, cải thiện UX approval.

### Epic E23 — Approval Delegation & Smart Automation

---

#### Story E23.1 — Approval Delegation Rules

**As a** Manager,  
**I want** ủy quyền duyệt cho đồng nghiệp khi tôi đi phép hoặc công tác,  
**So that** các request của nhân viên không bị kẹt chờ tôi về.

**Schema mới:**
```
DelegationRule {
  id, delegatorId (User), delegateId (User),
  moduleTypes String[] (LEAVE|EXPENSE|OVERTIME|CONTRACT|PURCHASE_ORDER|ALL),
  startDate Date, endDate Date, 
  isActive Boolean, note?,
  createdAt, tenantId
}
```

**Acceptance Criteria:**
- [ ] CRUD DelegationRule trong Settings > Ủy quyền
- [ ] Validation: delegateId phải có role tương đương hoặc cao hơn trong orgUnit
- [ ] Không được ủy quyền vòng tròn (A→B, B→A trong cùng thời gian)
- [ ] BPM middleware: khi `ProcessUserTask` được assign cho user đang có delegation active:
  - Tìm `DelegationRule` active + moduleType phù hợp
  - Duplicate task cho delegate (không xóa task gốc)
  - Ghi note: "Được ủy quyền từ [delegator]"
- [ ] Notification cho delegate: "Bạn được ủy quyền duyệt các request của [X] từ [start] đến [end]"
- [ ] Khi `DelegationRule.endDate` qua → `isActive = false` tự động

**Demo data:**
- 2 delegation rules active (1 leave, 1 all-types)
- 1 rule sắp hết hạn (2 ngày nữa) → test notification

---

#### Story E23.2 — AutomationRule — Conditional Trigger Engine

**As a** Admin,  
**I want** cấu hình các rule tự động "WHEN điều kiện → THEN hành động" mà không cần viết code,  
**So that** các quy trình lặp đi lặp lại được tự động hóa không cần developer.

**Upgrade AutomationRule schema:**
```
AutomationRule {
  -- existing fields --
  triggerType String (SCHEDULE|FIELD_CHANGE|RECORD_CREATE|RECORD_STATUS_CHANGE)
  entityType String? (CONTRACT|LEAVE_REQUEST|EXPENSE|OVERTIME_REQUEST|...)
  conditions Json? -- array of {field, operator, value}
  actions Json -- array of {type, params}
  lastError String?
  runCount Int @default(0)
}

AutomationRuleLog {
  id, ruleId, triggeredAt, entityId?, entityType?,
  status (SUCCESS|FAILED), message, durationMs
}
```

**Trigger types:**
- `SCHEDULE`: cronExpr như hiện tại
- `FIELD_CHANGE`: khi field của entity thay đổi (hook vào service events)
- `RECORD_STATUS_CHANGE`: khi status thay đổi sang giá trị cụ thể

**Action types:**
- `SEND_NOTIFICATION`: {userId, template, variables}
- `UPDATE_FIELD`: {entityType, entityId, field, value}
- `CREATE_RECORD`: {entityType, data template}
- `START_BPM_PROCESS`: {processDefinitionKey, variables}
- `CALL_WEBHOOK`: {webhookEndpointId}

**Acceptance Criteria:**
- [ ] UI: danh sách automation rules với toggle on/off
- [ ] Seeded rules mặc định:
  - "Contract 30 ngày hết hạn → Notify HR"
  - "Expense APPROVED → Update BudgetLine"
  - "Invoice OVERDUE → Notify Account Manager"
  - "OT APPROVED → Update PayrollRecord (next run)"
- [ ] Run history: xem log của từng lần chạy (AutomationRuleLog)
- [ ] Test mode: dry run không thực sự execute actions
- [ ] Error handling: nếu action fail → log error, gửi notification cho admin

---

#### Story E23.3 — Smart Approval UX (Mobile + Web)

**As a** Approver,  
**I want** phê duyệt nhiều request cùng lúc và thấy context đầy đủ ngay trong màn hình duyệt,  
**So that** tôi duyệt nhanh hơn và ít phải click qua lại giữa các màn hình.

**Acceptance Criteria:**
- [ ] "Approval Inbox": tổng hợp tất cả pending tasks từ mọi module (Leave, OT, Expense, PO, Contract...)
- [ ] Bulk approve: chọn nhiều items → duyệt hết một lần (với điều kiện cùng loại và không cần ghi chú bắt buộc)
- [ ] Trong mỗi item: hiển thị mini-context (balance phép còn lại, budget còn lại, lịch sử request gần đây)
- [ ] Quick action trên mobile: swipe right = approve, swipe left = reject
- [ ] Filter Approval Inbox: theo module, theo ngày, theo urgency
- [ ] Badge count notification: tổng pending trên mobile + web header

---

#### Story E23.4 — BPM Email Delivery

**As a** Nhân viên / Manager,  
**I want** nhận email khi có task BPM được giao hoặc khi task tôi giao được hoàn thành,  
**So that** tôi không bỏ lỡ action items khi không đang mở ứng dụng.

**Vấn đề hiện tại:** `BpmnEngineService.sendStepNotification` chỉ tạo in-app notification qua `NotificationsService`. `MailService` (nodemailer) đã có nhưng **không được gọi từ BPM engine**.

**Acceptance Criteria:**
- [ ] `BpmnEngineService.sendStepNotification` gọi `MailService.sendNotificationEmail` sau khi tạo in-app notification
- [ ] Email subject / body dùng `renderTemplate` (template engine đã có) — cùng template với in-app
- [ ] Chỉ gửi email nếu `user.email != null` và SMTP đã được cấu hình (`SMTP_HOST` env)
- [ ] Schema mới: `NotificationPreference { id, userId, channel: EMAIL|IN_APP|BOTH, moduleType?, isActive }` — user chọn kênh nhận thông báo trong Settings
- [ ] UI: Settings > Thông báo — toggle email/in-app per module type
- [ ] Admin có thể tắt email notification toàn tenant qua `TenantSettings.emailNotificationsEnabled`
- [ ] Fallback: nếu email fail, in-app notification vẫn được tạo (không throw)
- [ ] `NotificationPreference` default = BOTH cho user mới
- [ ] `.env.example` bổ sung: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

**Schema mới:**
```
NotificationPreference {
  id          String   @id @default(cuid())
  userId      String
  moduleType  String?  -- null = áp dụng tất cả
  channel     String   @default("BOTH") -- EMAIL | IN_APP | BOTH
  isActive    Boolean  @default(true)
  tenantId    String
  @@unique([userId, moduleType])
}
```

**Demo data:**
- 3 users có preference: user A (BOTH), user B (IN_APP only), user C (EMAIL only)
- 2 process instances tạo notifications → verify đúng channel theo preference

---

#### Story E23.5 — Process Lifecycle Notifications

**As a** Nhân viên (requester),  
**I want** nhận thông báo khi đơn được tiếp nhận và khi kết quả được trả về,  
**So that** tôi không phải liên tục check trạng thái thủ công.

**Vấn đề hiện tại:** `ProcessEventBus` chỉ có `emitCompleted`. Người submit không nhận notification khi process starts hoặc completes. `bpmn-engine.service.ts:checkCompletion` không notify requester.

**Acceptance Criteria:**
- [ ] `ProcessEventBus` bổ sung method `emitStarted(payload: ProcessStartedPayload)` và queue `process.started`
- [ ] `ProcessInstancesService.startInstance` → gửi in-app notification cho `startedBy`: `"Đơn [processName] đã được tiếp nhận và đang chờ xử lý"`
- [ ] `BpmnEngineService.checkCompletion` khi `executionState === 'idle'`:
  - Đọc `instance.variables.decision`:
    - `'approved'` → `"✅ Đơn [processName] đã được DUYỆT"`
    - `'rejected'` → `"❌ Đơn [processName] đã bị TỪ CHỐI"` + kèm `variables.rejectionReason` nếu có
    - Không có decision → `"✅ Quy trình [processName] đã hoàn thành"`
  - Notification `type = PROCESS_COMPLETED` với `link = /processes/instances/{id}`
- [ ] Email cũng gửi nếu user NotificationPreference = BOTH/EMAIL (dùng E23.4)
- [ ] `ProcessActivityLog` ghi thêm 2 event type: `PROCESS_STARTED`, `PROCESS_COMPLETED`
- [ ] `ProcessEventBus.emitCancelled` cũng được thêm (dùng cho E23.7)

**Demo data:**
- 5 process instances với outcomes: 2 approved, 1 rejected (có rejection reason), 1 completed, 1 running
- Mỗi instance có full notification chain (started + completed)

---

#### Story E23.6 — Task Escalation Engine

**As a** HR Admin / Process Owner,  
**I want** task quá hạn tự động được nhắc nhở và escalate theo cấp bậc,  
**So that** không có approval nào bị "treo" vô thời hạn mà không ai chịu trách nhiệm.

**Acceptance Criteria:**
- [ ] BullMQ cron `task-escalation` chạy mỗi 30 phút:
  - Query `ProcessUserTask` có `status IN (PENDING, IN_PROGRESS)` và `dueDate < now()`
  - Bỏ qua task đã được `lastEscalatedAt` trong vòng 24h (anti-spam)
- [ ] Phân cấp escalation:
  - **Ngày 1–2** (`overdue_1d`): Reminder cho `assignee` — `"⏰ Task [name] đã quá hạn [X] ngày"`
  - **Ngày 3–7** (`overdue_3d`): Reminder cho assignee + notify `requester` — `"Đơn [processName] chưa được xử lý"`
  - **>7 ngày** (`overdue_7d`): Escalate tới `requester_manager` (dùng `resolveAssignee('requester_manager')` pattern đã có)
- [ ] Schema: `ProcessUserTask.lastEscalatedAt DateTime?` — track lần escalate gần nhất
- [ ] `ProcessActivityLog` ghi event `ESCALATION` mỗi lần escalate
- [ ] Admin page `/processes/escalations`: bảng "Tasks đang bị kẹt" (overdue > 3 ngày), filter theo module/assignee
- [ ] Email gửi kèm in-app notification (dùng E23.4)

**Schema thay đổi:**
```
ProcessUserTask thêm: lastEscalatedAt DateTime?
```

**Demo data:**
- 3 tasks overdue: 1 task (2 ngày), 1 task (5 ngày), 1 task (9 ngày)
- Cron đã chạy → 3 escalation logs tương ứng

---

#### Story E23.7 — Process Cancellation by Requester

**As a** Nhân viên (requester),  
**I want** hủy đơn của mình khi chưa được duyệt xong,  
**So that** approver không phải xử lý đơn đã lỗi thời và tôi không cần nhờ admin.

**Acceptance Criteria:**
- [ ] `PATCH /api/process-instances/:id/cancel` với body `{ reason?: string }`:
  - Chỉ `startedBy` của instance mới được cancel
  - Chỉ cancel khi `status = RUNNING`
  - Từ chối nếu có task đang `IN_PROGRESS` (trả `409 Conflict` với message: "Đơn đang được xem xét, không thể hủy")
- [ ] Khi cancel thành công:
  - `ProcessInstance.status → CANCELLED`
  - Tất cả `ProcessUserTask` có status `PENDING` → `SKIPPED`
  - Notify mỗi assignee có task bị SKIPPED: `"Đơn [processName] đã bị hủy bởi người gửi"`
  - Ghi `ProcessActivityLog`: type `CANCELLED`, `performedBy = userId`, `note = reason`
  - `ProcessEventBus.emitCancelled({ instanceId, cancelledBy, reason })` (từ E23.5)
- [ ] Subscribe `process.cancelled`: Leave/OT/Expense service nhận event → revert entity `status → DRAFT`
- [ ] FE: Process Inbox + instance detail hiện nút `"Hủy đơn"` chỉ khi:
  - User là requester của instance
  - `instance.status = RUNNING`
  - Không có task `IN_PROGRESS`
- [ ] Cancel dialog: nhập lý do (optional, max 200 chars)

**Demo data:**
- 2 process instances bị cancel (1 có reason, 1 không)
- Verify Leave/OT entity tương ứng đã revert về DRAFT

---

> **Hotfix kèm theo (không phải story — fix ngay):**  
> `bpmn-engine.service.ts:180` — thay `setTimeout(800ms)` bằng `Promise.race([waitEvent, endEvent, errorEvent])` để tránh race condition khi server tải cao.

---

---

## v5.5 — Business Intelligence Dashboards

> **Mục tiêu:** Mỗi module có dashboard chuyên sâu với KPI thực sự có giá trị, không chỉ summary counts. Cross-module analytics cho ban lãnh đạo.

### Epic E24 — Deep Analytics per Module & Executive Dashboard

---

#### Story E24.1 — HR Analytics Dashboard

**URL:** `/hr/analytics`

**As a** CHRO,  
**I want** dashboard HR với các chỉ số thực sự ảnh hưởng đến quyết định nhân sự,  
**So that** tôi không phải export Excel và pivot thủ công mỗi tháng.

**KPI Panels (`<StatCard>`):**
1. Tổng headcount (active employees)
2. Headcount tháng này vs tháng trước (delta %)
3. Tỷ lệ nghỉ việc YTD (attrition rate %)
4. Số hợp đồng hết hạn trong 60 ngày
5. Số vị trí đang tuyển dụng
6. Chi phí lương/người trung bình

**Charts:**
- **Headcount trend**: line chart 12 tháng (hire vs resign vs transfer)
- **Attrition by department**: bar chart so sánh tỷ lệ nghỉ theo phòng ban
- **Salary distribution**: histogram lương theo grade/band
- **Leave utilization**: heatmap ngày nghỉ theo tháng × phòng ban
- **Contract expiry timeline**: gantt-style view 90 ngày tới
- **Headcount by org unit**: treemap

**Drilldowns:**
- Click department → xem nhân sự của department đó
- Click "nghỉ việc" → xem danh sách với lý do
- Click contract expiry → shortcut đến Contract list filtered

**Demo data:**
- 50+ employees với lịch sử hire/resign trong 12 tháng
- Mix contract types và expiry dates

---

#### Story E24.2 — Payroll Analytics Dashboard

**URL:** `/payroll/analytics`

**KPI Panels:**
1. Tổng chi phí lương tháng hiện tại
2. Tổng chi phí lao động (lương + BHXH employer)
3. OT cost tháng này vs tháng trước
4. Số phiếu lương đã phát / tổng

**Charts:**
- **Salary trend**: stacked area chart (baseSalary / allowances / bonus / OT / deductions) theo 12 tháng
- **PIT breakdown**: tổng thuế TNCN theo tháng + avg per employee
- **Insurance cost**: line chart BHXH/BHYT/BHTN employer contribution theo tháng
- **OT hours by department**: grouped bar theo tháng
- **Payroll status tracker**: donut chart (DRAFT/PROCESSING/APPROVED/PAID per kỳ)
- **Top earners**: bar chart top 10 (gross salary)

---

#### Story E24.3 — Project Analytics Dashboard

**URL:** `/projects/analytics`

**KPI Panels:**
1. Số dự án ACTIVE / COMPLETED / ON_HOLD
2. Tổng revenue (Invoice PAID trong năm)
3. Tổng cost (ProjectCostSnapshot.totalCost all projects)
4. Gross margin % (revenue - cost / revenue)
5. Avg project utilization rate
6. Overdue tasks count

**Charts:**
- **Project portfolio**: bubble chart (x=duration, y=margin, size=revenue)
- **Utilization rate per employee**: horizontal bar (billable hours / total)
- **Revenue vs Cost timeline**: dual-line theo tháng
- **Task completion rate**: line chart rolling 30 ngày
- **Burn rate per project**: multiple lines, one per active project
- **Bug/Issue rate**: tỷ lệ bug per 100 task-hours theo project

---

#### Story E24.4 — Finance Analytics Dashboard

**URL:** `/finance/analytics`

**KPI Panels:**
1. Total Revenue YTD (Invoice PAID)
2. Total AR Outstanding (Invoice SENT + OVERDUE)
3. Total AP Outstanding (PO RECEIVED not PAID)
4. Cash collection rate % (PAID / (PAID + OUTSTANDING))
5. Avg days to payment (invoice date → paid date)
6. Budget utilization %

**Charts:**
- **AR Aging**: grouped bar (0-30 / 31-60 / 61-90 / 90+ ngày quá hạn)
- **Revenue breakdown**: donut by invoice type
- **Monthly P&L**: revenue - cost bar chart với net margin line
- **Cash flow forecast**: bar chart 6 tháng tới (expected invoices - expected POs)
- **Budget vs Actual**: horizontal progress bars theo BudgetLine
- **Journal activity**: area chart entries per day (30 ngày)

---

#### Story E24.5 — CRM Analytics Dashboard (nâng cấp E22.3)

**URL:** `/crm/analytics`

*(Đã định nghĩa trong E22.3 — bổ sung thêm:)*

**Thêm:**
- **Win/Loss analysis**: scatter plot (deal size vs sales cycle, màu = won/lost)
- **Activity heatmap**: ngày trong tuần × giờ trong ngày của CrmActivity
- **Pipeline velocity**: thời gian trung bình ở mỗi stage
- **Lost deals by reason**: donut chart lý do thua

---

#### Story E24.6 — Executive Command Center (C-Suite Dashboard)

**URL:** `/dashboard/executive`  
**Access:** Role DIRECTOR/ADMIN only

**As a** CEO/CFO,  
**I want** một dashboard tổng hợp toàn bộ business từ mọi module,  
**So that** tôi có thể nắm tình hình toàn công ty trong 30 giây.

**Layout:** 3 columns × 3 rows

**Row 1 — Business Performance:**
- Revenue YTD vs Target (`<SparklineCard>`)
- Gross Margin % (`<SparklineCard>`)
- Pipeline Value (`<SparklineCard>`)
- Budget Utilization % (`<SparklineCard>`)

**Row 2 — Operations:**
- Headcount & Attrition (line chart)
- Project Portfolio status (donut)
- AR Aging summary (stacked bar)
- OT & Leave cost trend (line)

**Row 3 — Risks & Actions:**
- Contracts expiring 60 days (list + count)
- Overdue invoices (list + amount)
- Pending approvals across modules (count by type)
- Budget lines at risk (>80% used) (list)

**Interaction:**
- Click any panel → navigate đến module dashboard tương ứng
- Date range filter áp dụng cho tất cả panels
- Export: "Báo cáo tháng" → PDF tự động (dùng puppeteer)

**Demo data:** Cần đủ data từ tất cả module để dashboard meaningful

---

#### Story E24.7 — Report Builder (Self-service)

**URL:** `/reports/builder`

**As a** Manager,  
**I want** tự tạo báo cáo theo ý muốn mà không cần yêu cầu IT,  
**So that** tôi có data phù hợp với cách tôi đưa ra quyết định.

**Acceptance Criteria:**
- [ ] Chọn entity: Employee / Project / Invoice / Leave / Payroll / Expense
- [ ] Chọn columns muốn hiển thị (checkbox list)
- [ ] Thêm filters (field + operator + value)
- [ ] Chọn group by field (nếu muốn aggregate)
- [ ] Preview 20 rows trước khi save
- [ ] Save as named report → ScheduledReport có thể dùng
- [ ] Export: Excel / CSV
- [ ] Share link với user khác (read-only view)

---

---

## Yêu cầu kỹ thuật chung cho v5

---

## v5.6 — End User Utilities

> **Mục tiêu:** Nâng cao trải nghiệm hàng ngày cho người dùng cuối — giảm thao tác lặp lại, tăng khả năng cá nhân hóa, giữ người dùng trong flow làm việc.

### Epic E25 — End User Experience Utilities

---

#### Story E25.1 — "My Work" Personal Dashboard

**As a** Nhân viên / Manager,  
**I want** một trang tổng hợp toàn bộ việc cần làm hôm nay,  
**So that** tôi không phải vào 4–5 module khác nhau để biết mình cần làm gì.

**URL:** `/my-work` — đặt làm trang mặc định sau login (thay thế hoặc bổ sung cho home dashboard)

**Acceptance Criteria:**
- [ ] **StatCards hàng đầu:**
  - Pending approvals (ProcessUserTask PENDING của tôi)
  - Active tasks (Task OPEN assigned to me)
  - Leave days remaining (LeaveBalance tháng hiện tại)
  - Hours logged today (TimeLog today)
- [ ] **Widget "Cần duyệt":** danh sách tối đa 5 ProcessUserTask PENDING — tên đơn, người gửi, hạn xử lý — click → mở Approval Inbox
- [ ] **Widget "Việc đang làm":** tối đa 5 Task OPEN/IN_PROGRESS assigned to me — click → mở task detail
- [ ] **Widget "Đơn đang chờ của tôi":** các ProcessInstance tôi đã start với status RUNNING — tên quy trình, ngày gửi, trạng thái bước hiện tại
- [ ] **Widget "Chấm công hôm nay":** hiển thị check-in/out hôm nay, tổng giờ, cảnh báo nếu chưa check-in
- [ ] **Widget "Sắp đến hạn":** OT/Leave request sắp hết hạn trong 3 ngày, tasks due soon
- [ ] Responsive — hiển thị tốt trên mobile
- [ ] Dữ liệu refresh mỗi 5 phút (React Query `staleTime: 5 * 60 * 1000`)
- [ ] Dùng `<StatCard>`, `<SparklineCard>` theo chuẩn — không tự làm widget mới

**Demo data:**
- User có 3 pending approvals, 4 active tasks, 2 running process instances
- Check-in hôm nay đã có, 6.5h logged

---

#### Story E25.2 — Notification Preferences UI

**As a** Người dùng,  
**I want** chọn kênh nhận thông báo (email / in-app / cả hai) theo từng module,  
**So that** tôi không bị spam email nhưng vẫn thấy thông báo quan trọng trong app.

> **Dependency:** E23.4 đã tạo `NotificationPreference` schema.

**URL:** `/settings` → tab "Thông báo"

**Acceptance Criteria:**
- [ ] Bảng preferences theo module: HR · Tài chính · Dự án · CRM · Quy trình · Hệ thống
- [ ] Mỗi dòng: toggle Email / In-App (có thể bật cả hai hoặc chỉ một)
- [ ] "Áp dụng cho tất cả" quick-action ở đầu bảng
- [ ] Save → `PATCH /api/notification-preferences/bulk` cập nhật nhiều records cùng lúc
- [ ] Default khi chưa cấu hình: BOTH (email + in-app)
- [ ] Nếu SMTP chưa được cấu hình → toggle Email disabled + tooltip "Admin chưa cấu hình SMTP"
- [ ] Admin có thể xem + override preference của user trong `/admin/users/:id`

**Demo data:**
- 3 users với preference khác nhau đã được seed (từ E23.4)

---

#### Story E25.3 — Saved Filter Presets

**As a** Người dùng thường xuyên dùng các bộ lọc phức tạp,  
**I want** lưu và tái sử dụng bộ lọc với một click,  
**So that** tôi không phải set lại filter từ đầu mỗi lần vào trang.

**Schema mới:**
```
SavedFilterPreset {
  id        String  @id @default(cuid())
  userId    String
  pageKey   String  -- e.g. "leave-list", "expense-list", "task-list"
  name      String  @db.VarChar(100)
  filters   Json    -- serialized filter state
  isDefault Boolean @default(false)
  tenantId  String
  createdAt DateTime @default(now())
  @@unique([userId, pageKey, name])
}
```

**Acceptance Criteria:**
- [ ] `<FilterBar>` component bổ sung icon "💾 Lưu bộ lọc" khi filter state khác empty
- [ ] Click → popup nhập tên preset (max 50 chars) + checkbox "Đặt làm mặc định"
- [ ] Dropdown "Bộ lọc đã lưu" trong FilterBar: load các preset của user cho pageKey hiện tại
- [ ] Áp dụng preset: click → filter state được set → danh sách reload
- [ ] Xóa preset: icon trash trong dropdown → confirm xóa
- [ ] Tối đa 10 preset / user / page (validate BE)
- [ ] Default preset: tự động áp dụng khi vào trang (không cần click)
- [ ] API: `GET /api/filter-presets?pageKey=X`, `POST`, `DELETE /api/filter-presets/:id`

**Demo data:**
- 3 presets cho leave-list (VD: "Nghỉ phép tháng này", "Pending approvals", "Đã duyệt Q1")

---

#### Story E25.4 — @mention trong CommentThread

**As a** Người dùng,  
**I want** tag đồng nghiệp trong comment bằng @tên,  
**So that** họ nhận được thông báo và không bỏ lỡ nội dung liên quan.

**Acceptance Criteria:**
- [ ] Trong `<CommentThread>` input: gõ `@` → dropdown gợi ý user (search realtime, debounce 300ms)
- [ ] Chọn user → text hiển thị `@Tên` (highlight), data lưu `@[userId:Tên]` trong content
- [ ] Khi comment được tạo: parse tất cả `@[userId:Tên]` → tạo notification cho mỗi mentioned user
  - Type: `COMMENT_MENTION`
  - Message: `"[AuthorName] đã nhắc đến bạn trong [entityType] #[entityId]"`
  - Link: URL đến entity có comment
- [ ] Email gửi kèm nếu NotificationPreference = BOTH/EMAIL (dùng E23.4)
- [ ] API mention: `POST /api/comments` — BE tự parse và tạo mention notifications
- [ ] Render: `@Tên` hiển thị màu `linkColor` trong comment, hover → tooltip email
- [ ] Không thể mention user không active hoặc không thuộc tenant

**Demo data:**
- 5 comments có @mention trên các entity khác nhau (Task, Issue, Expense, Leave)

---

#### Story E25.5 — In-app Changelog

**As a** Người dùng,  
**I want** biết những tính năng mới khi hệ thống được cập nhật,  
**So that** tôi tận dụng được tính năng mới mà không cần hỏi IT.

**Schema mới:**
```
AppChangelog {
  id          String   @id @default(cuid())
  version     String   -- "v5.1", "v5.2"...
  title       String   -- "Nâng cấp BPM & HR"
  items       Json     -- [{type: 'new'|'improved'|'fixed', text: string}]
  publishedAt DateTime
  tenantId    String?  -- null = tất cả tenant
}
```

**Acceptance Criteria:**
- [ ] Admin có thể tạo/sửa/xóa changelog entry tại `/admin/changelog`
- [ ] Khi user đăng nhập lần đầu sau khi có changelog mới: modal "🎉 Có gì mới trong [version]" tự động popup
- [ ] Items hiển thị theo type: 🆕 Mới · ✨ Cải tiến · 🐛 Đã sửa
- [ ] Nút "Xem lại lịch sử cập nhật" trong User Menu → drawer full changelog history
- [ ] Track "đã xem": localStorage `loop_seen_changelog_v5.1` (không cần DB)
- [ ] Dismiss modal → không hiện lại cho version đó
- [ ] API: `GET /api/changelog/latest` (trả version mới nhất chưa seed seen), `GET /api/changelog` (full history)

**Demo data:**
- 3 changelog entries (v5.0, v5.1, v5.2) với 5–7 items mỗi entry

---

---

## v5.7 — Platform & Admin Utilities

> **Mục tiêu:** Trang bị cho đội triển khai các công cụ vận hành, giám sát và kiểm soát hệ thống mà không cần SSH vào server.

### Epic E26 — Platform & Admin Utilities

---

#### Story E26.1 — System Announcement Banner

**As a** Admin,  
**I want** broadcast thông báo hệ thống đến toàn bộ người dùng,  
**So that** tôi thông báo maintenance window, downtime, hoặc thông tin quan trọng mà không cần email.

**Schema mới:**
```
SystemAnnouncement {
  id          String   @id @default(cuid())
  message     String   @db.VarChar(500)
  type        String   -- INFO | WARNING | MAINTENANCE | SUCCESS
  targetRole  String?  -- null = tất cả; hoặc ADMIN | EMPLOYEE | ...
  startAt     DateTime
  endAt       DateTime
  isActive    Boolean  @default(true)
  createdBy   String
  tenantId    String
}
```

**Acceptance Criteria:**
- [ ] Admin page `/admin/announcements`: CRUD announcements với preview
- [ ] Banner hiển thị ở trên cùng layout (dưới topbar) khi có announcement active trong thời gian `startAt..endAt`
- [ ] Màu banner theo type: INFO=Blue · WARNING=Amber · MAINTENANCE=Orange · SUCCESS=Green
- [ ] User dismiss (X button) → ẩn cho session đó (localStorage key `dismissed_ann_{id}`)
- [ ] Hỗ trợ multiple announcements active cùng lúc (stack banner hoặc hiện cái ưu tiên nhất)
- [ ] `targetRole` filter: nhân viên không thấy announcement dành cho ADMIN và ngược lại
- [ ] API: `GET /api/announcements/active` — public (không cần auth, chỉ cần tenantId)

**Demo data:**
- 1 WARNING announcement đang active "Hệ thống sẽ bảo trì lúc 22h tối nay"
- 1 INFO announcement đã hết hạn (endAt < now)

---

#### Story E26.2 — Permission Audit Report

**As a** Admin / Compliance,  
**I want** xem report ai có quyền gì trong hệ thống,  
**So that** tôi kiểm soát được access control và đáp ứng yêu cầu audit nội bộ.

**URL:** `/admin/permissions/audit`

**Acceptance Criteria:**
- [ ] **View 1 — User → Permissions:** chọn user → hiển thị role + tất cả function permissions + module access của user đó
- [ ] **View 2 — Permission → Users:** nhập/chọn permission code (search autocomplete) → danh sách users có quyền đó
- [ ] **View 3 — Matrix Overview:** bảng users × roles (Y × X), ô có tick = user được gán role đó; paginated
- [ ] Filter: theo orgUnit, theo role, theo module
- [ ] Export CSV: `permission-audit-{date}.csv` với columns: userId, name, email, role, permissions[]
- [ ] Timestamp "Dữ liệu tại" + nút Refresh
- [ ] Không cache: luôn query fresh từ DB (dữ liệu nhạy cảm)
- [ ] Chỉ ADMIN role được truy cập (guard `@Roles(Role.ADMIN)`)

**Demo data:**
- Đã có từ existing permission setup (không cần seed thêm)

---

#### Story E26.3 — Bulk Import mở rộng

**As a** Admin triển khai,  
**I want** import nhiều loại dữ liệu hơn qua Excel,  
**So that** tôi setup tenant mới nhanh chóng mà không cần nhập thủ công từng record.

> **Bổ sung vào ImportPage hiện tại** — thêm 4 template mới bên cạnh employees/assets/jobs đã có.

**Template mới:**

| Template | Columns | Validation |
|---|---|---|
| **LeaveBalance** | employeeCode, leaveType, year, balance, used | employeeCode tồn tại, year = current/next, balance ≥ 0 |
| **SalaryBand** | grade, title, minSalary, maxSalary, currency | min < max, grade unique |
| **ChartOfAccounts** | code, name, type (ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE), parentCode? | code unique, parentCode tồn tại nếu có |
| **CustomersLeads** | companyName, contactName, email, phone, type (CUSTOMER/LEAD), stage? | email valid format |

**Acceptance Criteria:**
- [ ] Mỗi template: nút "Tải mẫu Excel" → download file `.xlsx` với header + 3 dòng ví dụ
- [ ] Upload → Dry Run: hiển thị preview 10 dòng đầu + validation errors (row number + message)
- [ ] Nếu > 0 errors → block import, show errors, không import gì
- [ ] Confirm import → progress bar → kết quả: X thành công / Y lỗi
- [ ] Import LeaveBalance: `upsert` theo (employeeId, leaveTypeId, year) — không tạo duplicate
- [ ] Import ChartOfAccounts: tự động resolve `parentCode` → `parentId`
- [ ] Max 1000 rows / lần import (validate file size)

**Demo data:**
- Không cần (feature này dùng để seed data thực tế)

---

#### Story E26.4 — Email Delivery Dashboard

**As a** Admin,  
**I want** xem trạng thái emails hệ thống đã gửi,  
**So that** tôi biết email có thực sự tới tay người dùng không và debug khi có sự cố.

> **Dependency:** E23.4 bổ sung MailService logging.

**Schema mới:**
```
EmailLog {
  id         String   @id @default(cuid())
  toEmail    String
  toUserId   String?
  subject    String
  status     String   -- SENT | FAILED | SKIPPED
  error      String?
  module     String?  -- BPM | NOTIFICATION | PAYSLIP | SYSTEM
  sentAt     DateTime @default(now())
  tenantId   String
}
```

**Acceptance Criteria:**
- [ ] `MailService` bổ sung ghi `EmailLog` sau mỗi lần gửi (thành công lẫn thất bại)
- [ ] Admin page `/admin/email-log`:
  - Bảng: thời gian · đến · subject · module · status (tag màu) · error (tooltip nếu FAILED)
  - Filter: status, module, date range, email address
  - Pagination 50/page
- [ ] StatCards: tổng hôm nay / SENT / FAILED / SKIPPED
- [ ] Nút "Gửi lại" cho email FAILED (re-trigger `MailService.sendHtml` với data gốc)
- [ ] Tự động xóa log > 90 ngày (cron hàng tuần)
- [ ] SKIPPED = user opt-out email hoặc SMTP chưa config (ghi log nhưng không gửi)

**Demo data:**
- 20 EmailLog records: mix SENT/FAILED/SKIPPED từ nhiều module

---

#### Story E26.5 — BullMQ Job Browser

**As a** Admin,  
**I want** xem và quản lý các background jobs trong hệ thống,  
**So that** tôi debug được khi job bị fail và không phải SSH vào Redis.

> **Bổ sung HealthPage** — upgrade từ summary counts thành job browser đầy đủ.

**Acceptance Criteria:**
- [ ] `/admin/health` upgrade: sidebar chọn queue → bảng jobs trong queue đó
- [ ] Tabs per queue: Waiting · Active · Completed · Failed · Delayed
- [ ] Mỗi job row: jobId, name, data preview (JSON collapse), attemptsMade, timestamp, error (nếu FAILED)
- [ ] Actions:
  - FAILED job: nút "Retry" → `job.retry()`
  - Bất kỳ job: nút "Xem JSON" → modal full job data + result
  - FAILED jobs: "Retry tất cả" bulk action
- [ ] Completed/Failed jobs: xóa sau 24h tự động (đã config `removeOnComplete/removeOnFail`)
- [ ] API: `GET /admin/queues/:name/jobs?status=failed&page=1` — chỉ ADMIN
- [ ] Số lượng failed jobs hiển thị badge đỏ trên menu Admin nếu > 0

**Demo data:**
- 2 failed jobs trong queue automation (để test retry)

---

#### Story E26.6 — Webhook Health Monitor

**As a** Admin,  
**I want** xem lịch sử và trạng thái các webhook đã được gọi,  
**So that** tôi biết integration với hệ thống ngoài có hoạt động không.

> **Dependency:** E23.2 AutomationRule có action `CALL_WEBHOOK`.

**Schema mới:**
```
WebhookLog {
  id           String   @id @default(cuid())
  endpointUrl  String
  ruleId       String?  -- AutomationRule trigger
  triggeredAt  DateTime @default(now())
  status       String   -- SUCCESS | FAILED | TIMEOUT
  responseCode Int?
  responseBody String?  @db.Text
  error        String?
  durationMs   Int?
  tenantId     String
}
```

**Acceptance Criteria:**
- [ ] `automation.service.ts` ghi `WebhookLog` sau mỗi lần gọi webhook
- [ ] Admin page `/admin/integrations` (đã có) bổ sung tab "Webhook Logs":
  - Bảng: endpoint · rule name · thời gian · status · response code · duration
  - Filter: status, endpoint, date range
- [ ] StatCards: tổng 7 ngày / Success rate % / Avg response time
- [ ] Click row → modal: full request data + response body
- [ ] "Re-trigger" cho FAILED webhooks (gọi lại với cùng payload)
- [ ] Alert: nếu endpoint có > 3 failures liên tiếp → notification cho admin

**Demo data:**
- 10 WebhookLog records (mix SUCCESS/FAILED) từ một automation rule mẫu

---

#### Story E26.7 — Environment Variable Validation on Startup

**As a** DevOps / Admin triển khai,  
**I want** hệ thống tự kiểm tra config khi khởi động và báo lỗi rõ ràng,  
**So that** tôi phát hiện cấu hình sai trước khi production bị ảnh hưởng.

**Acceptance Criteria:**
- [ ] NestJS `OnApplicationBootstrap` hook: chạy env validation check
- [ ] Phân loại:
  - **CRITICAL** (throw nếu thiếu): `DATABASE_URL`, `JWT_SECRET`, `REDIS_HOST`
  - **WARNING** (log warn, không throw): `SMTP_HOST`, `MINIO_ENDPOINT`, `APP_URL`
  - **INFO** (log info): `SMTP_PORT`, `REDIS_PORT`, `MINIO_PORT`
- [ ] Nếu thiếu CRITICAL → `Logger.error` rõ ràng: `"❌ Missing required env: DATABASE_URL"` → process exit
- [ ] Startup log summary: `"✅ Env check passed (3 warnings)"` hoặc `"✅ Env check passed (all configured)"`
- [ ] Admin HealthPage bổ sung section "Environment":
  - Bảng: variable name · status (✅/⚠️/❌) · note
  - Không hiển thị giá trị thực của biến (security)
- [ ] `.env.example` đồng bộ với danh sách validated vars (CI check)
- [ ] API: `GET /admin/health/env` — trả env check results (chỉ ADMIN, không expose values)

**Demo data:**
- Không cần (feature kiểm tra config runtime)

---

#### Story E26.8 — SMTP Configuration UI

**As a** Admin triển khai,  
**I want** cấu hình SMTP email server ngay trong giao diện quản trị,  
**So that** tôi không cần SSH vào server hay sửa file `.env` mỗi khi setup khách mới hoặc đổi email provider.

**Vấn đề hiện tại:** `MailService` chỉ đọc từ env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) — không có UI, mỗi tenant không tự cấu hình được.

**Schema mới:**
```
TenantSmtpConfig {
  id         String  @id @default(cuid())
  tenantId   String  @unique
  host       String
  port       Int     @default(587)
  user       String
  pass       String  -- encrypted at rest (AES-256)
  fromEmail  String
  fromName   String  @default("Loop 360")
  secure     Boolean @default(false)  -- true = port 465
  isActive   Boolean @default(true)
  updatedAt  DateTime @updatedAt
}
```

**Acceptance Criteria:**
- [ ] Tab "Email (SMTP)" mới trong `IntegrationsPage` (cạnh Telegram và Webhooks)
- [ ] Form fields: Host · Port · Username · Password (masked) · From Email · From Name · Secure (SSL toggle)
- [ ] Nút **"Gửi email test"**: nhập địa chỉ test → gửi email xác nhận → hiển thị kết quả success/error ngay trên UI
- [ ] `pass` được encrypt trước khi lưu vào DB (`AES-256` dùng `APP_ENCRYPTION_KEY` từ env — không lưu plaintext)
- [ ] `MailService` ưu tiên đọc `TenantSmtpConfig` từ DB; fallback về env vars nếu không có DB config
- [ ] Khi xóa/disable config: MailService fallback về env vars (không break hệ thống)
- [ ] Hiển thị trạng thái hiện tại: "✅ SMTP đang hoạt động" / "⚠️ Chưa cấu hình" / "❌ Lỗi kết nối"
- [ ] API: `GET/PUT /api/admin/smtp-config`, `POST /api/admin/smtp-config/test`
- [ ] Chỉ ADMIN mới xem/sửa được (password field không bao giờ trả về trong GET response)
- [ ] `.env.example` bổ sung: `APP_ENCRYPTION_KEY=32-char-secret`

**Demo data:**
- 1 SMTP config (dùng Mailtrap hoặc smtp4dev cho dev environment)

---

#### Story E26.9 — API Key Management

**As a** Admin,  
**I want** tạo và quản lý API keys cho hệ thống bên ngoài tích hợp với Loop,  
**So that** đối tác hoặc tool nội bộ gọi API Loop mà không cần dùng tài khoản user thật.

**Schema mới:**
```
ApiKey {
  id          String   @id @default(cuid())
  tenantId    String
  name        String   @db.VarChar(100)   -- "CRM Import Bot", "Zapier Connector"
  keyHash     String   @unique            -- SHA-256 hash của key thật
  keyPrefix   String   @db.VarChar(8)     -- 8 ký tự đầu để nhận dạng (vd: "lp_abc123")
  scopes      String[] -- ["read:employees", "write:tasks", "read:reports"]
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  isActive    Boolean  @default(true)
  createdBy   String
  createdAt   DateTime @default(now())
  tenantId    String
}
```

**Acceptance Criteria:**
- [ ] Admin page `/admin/api-keys` (hoặc tab trong IntegrationsPage):
  - Danh sách keys: name · prefix · scopes · last used · status · expiry
  - Tạo key mới: nhập name, chọn scopes, chọn expiry (không hết hạn / 30/90/365 ngày)
  - **Key chỉ hiển thị 1 lần** khi tạo (copy-to-clipboard) — sau đó chỉ lưu hash
- [ ] Scopes có sẵn:
  - `read:employees` `read:timesheets` `read:payroll` `read:reports`
  - `write:tasks` `write:timelogs` `write:expenses`
  - `admin:all` (full access — cảnh báo khi chọn)
- [ ] `JwtAuthGuard` bổ sung: nhận `Authorization: Bearer lp_...` → validate hash → inject virtual user với scopes
- [ ] Rate limit riêng cho API key: 1000 req/60s (khác với user 100/60s)
- [ ] Revoke key: xóa mềm (`isActive = false`) — không xóa cứng để giữ audit trail
- [ ] `lastUsedAt` tự động update mỗi lần key được dùng
- [ ] Swagger docs bổ sung security scheme: `ApiKeyAuth`

**Demo data:**
- 2 API keys: 1 read-only (đã dùng), 1 write tasks (chưa dùng)

---

#### Story E26.10 — Notification Template Editor

**As a** Admin,  
**I want** chỉnh nội dung email thông báo theo thương hiệu công ty,  
**So that** email gửi ra mang logo và giọng điệu của doanh nghiệp, không phải template mặc định của Loop.

**Vấn đề hiện tại:** Toàn bộ email template hardcode trong `MailService.ts` và `BpmnEngineService.ts` — mỗi khách muốn thay đổi phải sửa code.

**Schema mới:**
```
NotificationTemplate {
  id          String  @id @default(cuid())
  tenantId    String
  key         String  -- "bpm.task_assigned" | "bpm.process_completed" | "payslip" | "leave.approved" | ...
  subject     String  -- supports {{variables}}
  bodyHtml    String  @db.Text  -- HTML template với {{variables}}
  isActive    Boolean @default(true)
  updatedAt   DateTime @updatedAt
  @@unique([tenantId, key])
}
```

**Acceptance Criteria:**
- [ ] Admin page `/admin/notification-templates`:
  - Danh sách template keys với mô tả (vd: "BPM — Task được giao", "Phiếu lương", "Nghỉ phép được duyệt")
  - Click edit → drawer/page với 2 tabs: **Subject** và **Body (HTML)**
  - Live preview: render HTML với sample data ngay bên phải
  - Nút "Khôi phục mặc định" — reset về template gốc của hệ thống
- [ ] Template variables tài liệu hóa bên dưới editor: `{{recipient.name}}`, `{{task.name}}`, `{{process.name}}`, `{{variables.X}}`
- [ ] `MailService` + `BpmnEngineService`: khi gửi email, query `NotificationTemplate` theo `(tenantId, key)` trước; fallback về hardcoded template nếu không có custom template
- [ ] Nút "Gửi test": render template với sample data → gửi tới email admin ngay lập tức
- [ ] Template keys có sẵn (seed mặc định):
  - `bpm.task_assigned` · `bpm.task_completed` · `bpm.process_completed` · `bpm.process_rejected`
  - `payslip.published` · `leave.approved` · `leave.rejected` · `expense.approved`
  - `system.welcome` (email chào mừng user mới)

**Demo data:**
- 2 templates đã được customize (subject và body khác default)
- 1 template với logo công ty trong HTML

---

#### Story E26.11 — Asset Module Enhancements

**As a** Admin / Kế toán / IT Manager,  
**I want** quản lý tài sản đầy đủ hơn với khấu hao tự động, chuyển giao, thanh lý và cảnh báo bảo hành,  
**So that** sổ sách tài sản chính xác và không cần theo dõi thủ công trên Excel.

**Schema thay đổi:**
```
Asset thêm:
  warrantyExpiry      DateTime?   @map("warranty_expiry") @db.Date
  insuranceExpiry     DateTime?   @map("insurance_expiry") @db.Date
  insuranceProvider   String?     @map("insurance_provider") @db.VarChar(200)
  currentBookValue    Decimal?    @map("current_book_value") @db.Decimal(18, 2)  -- tính tự động

AssetTransfer {
  id            String   @id @default(cuid())
  assetId       String
  fromOrgUnitId String?
  toOrgUnitId   String
  transferredAt DateTime @default(now())
  reason        String?  @db.VarChar(500)
  approvedBy    String?
  tenantId      String
}

AssetDisposal {
  id            String   @id @default(cuid())
  assetId       String   @unique
  disposalDate  DateTime @db.Date
  disposalValue Decimal? @db.Decimal(18, 2)
  method        String   -- SELL | SCRAP | DONATE | LOST
  reason        String?  @db.Text
  approvedBy    String?
  processInstanceId String?  -- BPM duyệt thanh lý
  tenantId      String
}

AssetCategory (model thay thế enum):
  id       String @id @default(cuid())
  name     String @unique
  code     String @unique
  tenantId String?  -- null = system default
```

**Acceptance Criteria:**

**A1 — Khấu hao tự động:**
- [ ] Cron monthly (ngày 1 hàng tháng): với mỗi Asset có `purchasePrice` + `depreciationYears` + `status != RETIRED`:
  - `monthlyDepreciation = purchasePrice / (depreciationYears × 12)`
  - `currentBookValue -= monthlyDepreciation` (không xuống dưới 0)
- [ ] Asset detail hiển thị: giá mua · khấu hao/tháng · giá trị còn lại hiện tại · % đã khấu hao
- [ ] Khi `currentBookValue = 0`: notification cho Admin "Tài sản [name] đã khấu hao hết — cần xem xét thanh lý"

**A2 — Chuyển tài sản giữa phòng ban:**
- [ ] Nút "Chuyển phòng ban" trong Asset detail (khi status = AVAILABLE hoặc ASSIGNED)
- [ ] Form: phòng ban nhận, lý do, ngày chuyển
- [ ] Tạo `AssetTransfer` record + cập nhật `Asset.orgUnitId`
- [ ] Tab "Lịch sử chuyển" trong Asset detail — hiển thị toàn bộ AssetTransfer timeline

**A3 — Thanh lý / Xuất loại:**
- [ ] Nút "Thanh lý" trong Asset detail (chỉ ADMIN/ASSET_MANAGER)
- [ ] Form: ngày thanh lý, phương thức (Bán/Hủy/Tặng/Mất), giá trị thanh lý, lý do
- [ ] Start BPM `asset-disposal-v1` (tạo seed): approval 1 cấp (Manager duyệt)
- [ ] Khi BPM APPROVED: `Asset.status → RETIRED`, tạo `AssetDisposal` record
- [ ] Asset RETIRED không hiển thị trong danh sách mặc định (filter `status != RETIRED`)

**A4 — Warranty & Bảo hiểm:**
- [ ] Form tạo/sửa tài sản bổ sung fields: Ngày hết hạn bảo hành · Ngày hết hạn bảo hiểm · Nhà cung cấp bảo hiểm
- [ ] Cron weekly: tài sản hết hạn bảo hành/bảo hiểm trong 30 ngày → notification cho IT Manager/Admin
- [ ] Asset list: badge "⚠️ Hết hạn BH" khi `warrantyExpiry < now() + 30d`
- [ ] Dashboard: StatCard "Sắp hết hạn bảo hành (30 ngày)" + "Sắp hết hạn bảo hiểm (30 ngày)"

**A5 — Danh mục tài sản tùy chỉnh:**
- [ ] Admin page `/admin/asset-categories`: CRUD danh mục (tên + mã)
- [ ] System defaults seed sẵn (LAPTOP, DESKTOP, PHONE, SERVER, PERIPHERAL, SOFTWARE, FURNITURE, VEHICLE, OTHER)
- [ ] Tenant có thể thêm danh mục riêng (vd: "Thiết bị y tế", "Dụng cụ sản xuất")
- [ ] Asset form: dropdown danh mục từ DB thay vì enum cứng
- [ ] Migration: chuyển enum `AssetCategory` → foreign key sang bảng `AssetCategory`

**Demo data:**
- 20 tài sản với mix categories, một số đã gần hết khấu hao
- 3 tài sản có warranty sắp hết hạn (trong 30 ngày)
- 2 AssetTransfer records (lịch sử chuyển phòng ban)
- 1 tài sản đang trong quy trình thanh lý (BPM đang chờ duyệt)

---

### Pattern bắt buộc

#### 1. EventBus Architecture (mở rộng từ FinanceEventBus)

```typescript
// apps/backend/src/common/events/

// HrEventBus — dùng cho: ContractExpiry, PerformanceApproved, OffboardingStart
HrEventBus {
  emit('contract.expiring', { contractId, daysLeft })
  emit('performance.approved', { reviewId, employeeId, score })
  emit('offboarding.started', { employeeId, terminationDate })
  onEvent(eventName, handler)
}

// ProjectEventBus — dùng cho: MilestoneCompleted, CostThresholdReached
ProjectEventBus {
  emit('milestone.completed', { milestoneId, contractId, amount })
  emit('cost.threshold', { projectId, utilization, totalCost })
}
```

#### 2. BPM ProcessDefinition keys cần tạo mới

| Key | Module | Mô tả |
|---|---|---|
| `overtime-approval-v1` | HR | Duyệt OT 2 cấp |
| `budget-approval-v1` | Finance | Duyệt kế hoạch ngân sách |
| `contract-renewal-v1` | HR | Gia hạn hợp đồng |
| `employee-offboarding-v1` | HR | Quy trình offboarding |
| `deal-to-project-kickoff-v1` | CRM | Kickoff dự án từ deal thắng |
| `salary-review-v1` | HR | Đề xuất điều chỉnh lương |
| `year-end-leave-closure-v1` | HR | Chốt phép năm |

#### 3. Dashboard component pattern

Mọi dashboard analytics PHẢI dùng:
- `<SparklineCard>` cho KPI numbers có trend
- `<StatCard>` cho KPI số đơn giản
- Recharts cho charts (đã có trong project)
- `useThemePalette()` cho màu sắc — KHÔNG hardcode
- Filter bar bằng `<FilterBar>` + date range picker
- Export button consistent (ExcelJS pattern đã có)

#### 4. Demo Data Seed requirements

Mỗi Epic PHẢI đi kèm seed script tại:
`apps/backend/src/prisma/seeds/v5/`

Format:
```
seeds/v5/
  seed-e16-payroll.ts     -- OT + Leave data
  seed-e17-budget.ts      -- BudgetPlan + BudgetLine
  seed-e18-contract.ts    -- Expiring contracts + offboarding
  seed-e19-performance.ts -- Reviews + bonus configs
  seed-e20-project-cost.ts
  seed-e21-invoices.ts
  seed-e22-crm.ts
  seed-e23-automation.ts    -- DelegationRules + NotificationPreference + escalation demo
  seed-e24-analytics.ts   -- Full cross-module data
  seed-e25-ux-utils.ts    -- SavedFilterPresets + AppChangelog + CommentMentions
  seed-e26-admin.ts       -- SystemAnnouncements + EmailLog + WebhookLog + ApiKeys + AssetEnhancements
  index.ts                -- orchestrate all v5 seeds
```

Mỗi seed phải tạo dữ liệu phản ánh **tình huống thực tế**:
- Có mix trạng thái (DRAFT/PENDING/APPROVED/REJECTED)
- Có edge cases (nhân viên không có contract, project không có budget...)
- Có dữ liệu lịch sử 12 tháng cho charts

---

## Dependency Map

```
v5.0 (E16, E17) — INDEPENDENT, làm trước
    │
    ├─► v5.1 (E18, E19) — phụ thuộc E17 (Budget), E16 (Payroll fixes)
    │       │
    │       └─► v5.2 (E20, E21) — phụ thuộc E17 (Budget Check), E19 (Performance)
    │               │
    │               └─► v5.3 (E22) — phụ thuộc E20 (Deal→Project cost)
    │
    ├─► v5.4 (E23) — PARALLEL với v5.1, chỉ phụ thuộc BPM infrastructure
    │
    ├─► v5.5 (E24) — phụ thuộc TẤT CẢ (cần data từ mọi module)
    │
    ├─► v5.6 (E25) — PARALLEL với v5.4/v5.5, phụ thuộc E23.4 (NotificationPreference schema)
    │
    └─► v5.7 (E26) — PARALLEL với v5.6, chỉ phụ thuộc E23.4 (EmailLog) và E23.2 (WebhookLog)
```

---

## Acceptance Criteria chung (Definition of Done)

Mỗi Story được coi là DONE khi:
- [ ] Backend API hoạt động, có swagger docs
- [ ] Frontend UI render đúng dark/light mode
- [ ] BPM process (nếu có) test end-to-end
- [ ] Seed data chạy thành công → dashboard có data thực tế
- [ ] TypeScript build clean (0 errors, 0 warnings)
- [ ] Không hardcode màu — dùng `useThemePalette()`
- [ ] Table columns có explicit color render (Nguyên tắc #5 CLAUDE.md)
- [ ] StatCard dùng màu chuẩn (Nguyên tắc #8 CLAUDE.md)
- [ ] API list endpoint có pagination (PaginatedResult)
- [ ] Sensitive actions có `@Roles` guard đúng

---

*Tài liệu này là nguồn sự thật cho v5.x. Cập nhật mỗi khi có thay đổi scope.*  
*Lần cập nhật cuối: 2026-05-30 — Mary, Business Analyst (bổ sung E23.4–E23.7 + E25 End User + E26.1–E26.11 Platform/Admin/Asset — scope đầy đủ v5)*
