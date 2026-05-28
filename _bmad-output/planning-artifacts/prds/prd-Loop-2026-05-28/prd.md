---
title: "Loop — Payroll Compliance: Thuế TNCN & BHXH/BHYT/BHTN"
status: final
created: 2026-05-28
updated: 2026-05-28
epic: 22
roadmap_item: "v2.0 #1 — Bắt buộc pháp lý"
---

# Loop — Payroll Compliance: Thuế TNCN & BHXH/BHYT/BHTN

## 1. Tổng quan

Module **Payroll Compliance** nâng cấp engine tính lương hiện tại của Loop (đã có `PayrollPeriod`, `PayrollRecord` cơ bản) thành hệ thống tuân thủ pháp luật lao động Việt Nam đầy đủ — tính đúng BHXH/BHYT/BHTN cho cả người lao động và người sử dụng lao động, tính đúng thuế TNCN theo biểu lũy tiến, phát hành phiếu lương PDF cho nhân viên, và xuất file khai/quyết toán thuế nộp cho cơ quan thuế.

Module được thiết kế **configurable-first**: mọi tỷ lệ, ngưỡng, biểu thuế đều có `effective_date` và version history — không hardcode bất kỳ con số nào vào code — để Loop có thể đáp ứng thay đổi pháp luật (như biểu thuế 5 bậc từ 01/01/2026) và mở rộng sang SaaS multi-tenant trong tương lai.

Dữ liệu đầu vào **tự động đồng bộ** từ `TimesheetRecord` và `LeaveRequest` đã có trong hệ thống; HR chỉ review và override ngoại lệ trước khi chạy lương.

---

## 2. Mục tiêu & Chỉ số thành công

**Mục tiêu:**
- Loại bỏ hoàn toàn việc tính lương thủ công bằng Excel
- Đảm bảo tính đúng BHXH/BHYT/BHTN theo luật hiện hành tại thời điểm phát lương
- Đảm bảo tính đúng thuế TNCN; phiếu lương có đầy đủ breakdown để nhân viên tự kiểm tra
- Xuất được file khai quyết toán thuế nộp thẳng lên cổng thuế điện tử

**Chỉ số thành công:**
- Sai số tính lương = 0 VND so với tính thủ công (100 test cases)
- Thời gian HR hoàn thành kỳ lương (từ lúc mở kỳ đến khi phát phiếu lương) < 2 giờ thay vì 1–2 ngày
- 100% nhân viên nhận phiếu lương đúng kỳ qua email + in-app
- File 05-QTT-TNCN xuất ra tải lên được cổng thuế mà không có lỗi validate

**Counter-metrics (tránh):** Không để module trở nên quá phức tạp đến mức HR cần training > 1 buổi.

---

## 3. Personas

### HR Admin (người dùng chính)
Người thiết lập cấu hình, chạy lương hàng tháng, duyệt và phát phiếu. Quan tâm đến tốc độ, độ chính xác, và không bị lỗi phạt thuế.

### Nhân viên (người nhận)
Nhận phiếu lương qua email/app. Muốn biết lương thực nhận tính như thế nào, có thể kiểm tra lại. Cần xem lịch sử phiếu lương.

### Kế toán / Leadership (người đọc báo cáo)
Xem tổng chi phí lương (gross + employer BHXH) theo kỳ, theo phòng ban. Dùng số liệu để đối chiếu với kế toán.

### Admin hệ thống (cấu hình pháp lý)
Cập nhật biểu thuế, tỷ lệ BHXH, giảm trừ gia cảnh khi có thay đổi pháp luật. Thao tác ít nhưng critical.

---

## 4. User Journeys

### UJ-1: HR chạy lương tháng
HR mở kỳ lương → hệ thống tự sync ngày công từ Timesheet → HR review danh sách nhân viên, override ngoại lệ nếu có → chạy preview tính toán → kiểm tra từng dòng → approve kỳ lương → hệ thống phát phiếu lương qua email và in-app → kỳ lương bị lock, không chỉnh sửa được.

### UJ-2: Nhân viên xem phiếu lương
Nhân viên nhận notification "Phiếu lương tháng 5/2026 đã có" → mở app → vào mục Lương → xem breakdown chi tiết (gross, BHXH, BHYT, BHTN, thuế TNCN, net) → tải PDF nếu cần.

### UJ-3: Admin cập nhật biểu thuế
Admin nhận thông tin biểu thuế 5 bậc áp dụng từ 01/01/2026 → vào Cấu hình → Biểu thuế → Thêm biểu thuế mới với effective_date = 2026-01-01 → hệ thống tự dùng biểu mới cho các kỳ lương từ tháng 1/2026.

### UJ-4: HR xuất quyết toán thuế cuối năm (xem FR-QT01–05)
Cuối năm → HR vào mục Báo cáo Thuế → chọn năm → Export → nhận file Excel 05-QTT-TNCN (Thông tư 80/2021) → tải lên cổng HTKK.

---

## 5. Bối cảnh pháp lý (tham chiếu)

> Đây là snapshot tại thời điểm soạn PRD (2026-05-28). Mọi con số PHẢI được lưu trong config có effective_date, không hardcode.

### Thuế TNCN — Biểu lũy tiến (áp dụng đến 31/12/2025)

| Bậc | Thu nhập tính thuế (triệu/tháng) | Thuế suất |
|-----|----------------------------------|-----------|
| 1 | ≤ 5 | 5% |
| 2 | 5 – 10 | 10% |
| 3 | 10 – 18 | 15% |
| 4 | 18 – 32 | 20% |
| 5 | 32 – 52 | 25% |
| 6 | 52 – 80 | 30% |
| 7 | > 80 | 35% |

> Từ 01/01/2026 (Luật 109/2025/QH15): rút còn 5 bậc, ngưỡng bậc cao nhất > 100 triệu/tháng — cần seed config mới.

### BHXH/BHYT/BHTN

| Quỹ | Người lao động | Người sử dụng lao động |
|-----|----------------|------------------------|
| BHXH | 8% | 17% (14% hưu trí/tử tuất + 3% ốm đau/thai sản) |
| BHYT | 1,5% | 3% |
| BHTN | 1% | 1% |
| TNLĐ-BNN | — | 0,5% |
| **Tổng** | **10,5%** | **21,5%** |

**Trần đóng BHXH:** 20 × lương cơ sở
- Đến 30/06/2026: 20 × 2.340.000 = **46.800.000 đ/tháng**
- Từ 01/07/2026: 20 × 2.530.000 = **50.600.000 đ/tháng**

### Giảm trừ gia cảnh

| | Đến 31/12/2025 | Từ 01/01/2026 |
|--|----------------|----------------|
| Bản thân | 11.000.000 đ/tháng | 15.500.000 đ/tháng |
| Người phụ thuộc | 4.400.000 đ/tháng/người | 6.200.000 đ/tháng/người |

---

## 6. Yêu cầu chức năng

### FR-SL: Cấu hình Bảng Lương (Salary Table)

> Bảng lương = tập hợp các **cột tính lương** (SalaryColumn) do Admin định nghĩa. Mỗi cột có tên, loại, và giá trị nguồn. Engine tổng hợp gross salary từ các cột này.

**FR-SL01** — Admin định nghĩa cột bảng lương qua UI (Payroll Settings → Cấu hình Bảng lương). Mỗi `SalaryColumn` gồm:
- `name`: tên hiển thị (vd: "Lương cơ bản", "Phụ cấp ăn ca", "Phụ cấp điện thoại", "Khấu trừ tạm ứng")
- `type`: `EARNING` (thu nhập) | `DEDUCTION` (khấu trừ)
- `source`: `CONTRACT_SALARY` | `ALLOWANCE_TYPE` (ref AllowanceType) | `FIXED_VALUE` | `FORMULA`
- `formula`: chuỗi công thức đơn giản khi source=FORMULA — hỗ trợ biến: `{contractSalary}`, `{workDays}`, `{standardDays}`, `{overtimeHours}` (không eval JS tùy ý)
- `isBhxhExempt`, `isPitExempt`, `pitExemptCeiling`: kế thừa từ AllowanceType nếu source=ALLOWANCE_TYPE
- `sortOrder`: thứ tự hiển thị trên phiếu lương
- `isActive`: ẩn/hiện cột mà không xóa

**FR-SL02** — Ví dụ cột seed sẵn khi deploy:
| Tên cột | Source | Type | isBhxhExempt | isPitExempt |
|---|---|---|---|---|
| Lương cơ bản | `CONTRACT_SALARY` | EARNING | false | false |
| Phụ cấp ăn ca | `ALLOWANCE_TYPE` (ăn ca) | EARNING | true | true (≤730k) |
| Phụ cấp điện thoại | `ALLOWANCE_TYPE` (điện thoại) | EARNING | true | true (theo thực tế) |
| Lương ngày công | `FORMULA`: `{contractSalary}/{standardDays}×{workDays}` | EARNING | false | false |
| OT ngày thường | `FORMULA`: `{contractSalary}/{standardDays}/8×1.5×{otWeekday}` | EARNING | false | false |

**FR-SL03** — Gross salary engine tổng hợp theo bảng: `grossSalary = Σ EARNING columns − Σ DEDUCTION columns`. Phiếu lương hiển thị từng dòng theo `sortOrder`.

**FR-SL04** — Thay đổi cấu hình bảng lương chỉ có hiệu lực từ kỳ lương mới (không hồi tố kỳ đã APPROVED). `configSnapshot` trong `PayrollRecord` lưu snapshot bảng lương tại thời điểm tính.

---

### FR-CF: Cấu hình Nghĩa vụ Bảo hiểm (UI động)

**FR-CF01** — Admin cấu hình tỷ lệ BHXH/BHYT/BHTN (NLĐ + NSDLĐ) **qua UI** tại Payroll Settings → Cấu hình Bảo hiểm. Form nhập: tỷ lệ từng loại + `effectiveDate`. Hệ thống seed sẵn mức hiện hành (2025–2026) khi deploy.

**FR-CF02** — Mỗi bản ghi `InsuranceConfig` là **immutable** sau khi có kỳ lương đã chạy theo nó. Admin chỉ thêm config mới với `effectiveDate` mới — không sửa config cũ.

**FR-CF03** — Trần đóng BHXH tự động tính = `wageBase × multiplier` (cả hai configurable). Admin có thể override giá trị tuyệt đối nếu cần.

**FR-CF04** — Admin cấu hình lương tối thiểu vùng (Vùng I–IV) với `effectiveDate` qua UI. Employee gắn `wageZone` để engine chọn đúng trần BHTN.

**FR-CF05** — Mọi thay đổi config ghi vào `AuditLog` (ai thay đổi, khi nào, giá trị cũ/mới). Xem được tại Admin → /admin/audit-logs filter theo entity=InsuranceConfig.

---

### FR-TX: Cấu hình Thuế TNCN (UI động)

**FR-TX01** — Admin cấu hình biểu thuế lũy tiến **qua UI** tại Payroll Settings → Biểu thuế TNCN. Form cho phép: đặt tên biểu, `effectiveFrom`, thêm/sửa N bậc (ngưỡng từ, ngưỡng đến, thuế suất %). Hệ thống seed sẵn biểu 7 bậc (2025) và biểu 5 bậc (2026) khi deploy.

**FR-TX02** — Mỗi `TaxBracket` config là **immutable** sau khi có kỳ lương chạy theo nó. Admin tạo biểu mới với `effectiveFrom` mới — không xóa/sửa biểu cũ. UI hiển thị lịch sử biểu thuế theo timeline.

**FR-TX03** — Admin cấu hình mức giảm trừ gia cảnh qua UI: bản thân + người phụ thuộc, `effectiveFrom`. Seed sẵn 2 mốc (11M/4.4M đến 31/12/2025 và 15.5M/6.2M từ 01/01/2026).

**FR-TX04** — Seed sẵn cả biểu thuế lẫn giảm trừ gia cảnh khi deploy:
- Biểu 7 bậc: `effectiveFrom = 2020-01-01` (hiện hành đến 31/12/2025)
- Biểu 5 bậc: `effectiveFrom = 2026-01-01` (Luật 109/2025/QH15, đã có hiệu lực)
- Giảm trừ 11M/4.4M: `effectiveFrom = 2020-01-01`
- Giảm trừ 15.5M/6.2M: `effectiveFrom = 2026-01-01`

**FR-TX05** — Khi tính lương kỳ T, hệ thống tự chọn biểu thuế và mức giảm trừ đang active tại ngày cuối kỳ.

---

### FR-TE: Hồ sơ Thuế Nhân viên

**FR-TE01** — HR nhập MST (mã số thuế cá nhân) cho từng nhân viên vào `EmployeeTaxProfile`.

**FR-TE02** — HR chọn trạng thái cư trú: **Cư dân** (áp biểu lũy tiến) hoặc **Không cư trú** (khấu trừ 20% cố định).

**FR-TE03** — HR đăng ký người phụ thuộc (NPT): họ tên, quan hệ, MST NPT, ngày bắt đầu tính giảm trừ. Có thể đăng ký nhiều NPT per employee.

**FR-TE04** — Kết thúc giảm trừ NPT: HR nhập `endDate` — hệ thống tự ngừng tính từ tháng tiếp theo. Lịch sử NPT không xóa.

**FR-TE05** — Định nghĩa loại phụ cấp miễn BHXH: Admin tạo danh sách `AllowanceType` (tên, mức mặc định, flag `isBhxhExempt`). Ví dụ: Ăn ca = 730.000đ, Xăng xe = 500.000đ, Điện thoại = 300.000đ.

**FR-TE06** — Override phụ cấp per nhân viên: HR có thể override mức phụ cấp cho từng nhân viên trong từng kỳ lương (ghi lý do). Nếu không override, dùng default của `AllowanceType`.

---

### FR-PR: Engine Tính Lương

**FR-PR01** — Khi HR mở kỳ lương, hệ thống tự sync từ `TimesheetRecord`:
- `workDays` = số ngày công thực tế trong kỳ
- `paidLeaveDays` = ngày nghỉ có lương (từ `LeaveRequest` APPROVED)
- `unpaidLeaveDays` = ngày nghỉ không lương (cần phân biệt để tính BHXH đúng — xem FR-PR04)
- `overtimeHours` theo từng `OvertimeCategory` (WEEKDAY/WEEKEND/HOLIDAY) từ `TimesheetRecord`

`[ASSUMPTION: TimesheetRecord của tháng T đã ở trạng thái APPROVED trước khi HR mở kỳ lương T; nếu chưa, hệ thống cảnh báo và chặn approve kỳ lương — xem FR-PR11]`

`[ASSUMPTION: LeaveRequest APPROVED đã được settle (balance deducted) trước thời điểm HR sync kỳ lương]`

`[ASSUMPTION: Mọi nhân viên trong kỳ lương đều có Contract active với salaryMonthly > 0; engine báo lỗi và loại nhân viên đó khỏi kỳ nếu không có Contract active]`

**FR-PR02** — HR có thể override `workDays`, `leaveDays`, `overtimeHours` trực tiếp trên bảng trước khi chạy tính toán. Override phải ghi lý do (required).

**FR-PR03** — Tính gross salary:
```
contractSalary = Contract.salaryMonthly (tại ngày đầu kỳ)
probationSalary = contractSalary × 0.85  (nếu Contract.type = PROBATION)
baseSalary = probationSalary nếu PROBATION, ngược lại = contractSalary

grossSalary = (baseSalary / standardWorkDays × workDays)
            + overtimePay
            + bonus
            + Σ allowances (tổng phụ cấp theo AllowanceType + override)
```
`standardWorkDays` = số ngày làm việc chuẩn trong tháng (Mon–Fri, trừ lễ).

`overtimePay` = tổng theo 3 mức pháp định:
- OT ngày thường: `giờ × (baseSalary / standardWorkDays / 8) × 1.5`
- OT cuối tuần: `giờ × (baseSalary / standardWorkDays / 8) × 2.0`
- OT lễ/Tết: `giờ × (baseSalary / standardWorkDays / 8) × 3.0`

Payslip breakdown phải ghi rõ mức lương PROBATION 85% (nếu áp dụng). Engine đọc `Contract.type` active tại ngày đầu kỳ lương — không đọc từ trường nào khác.

**FR-PR04** — Tính BHXH/BHYT/BHTN người lao động:

Quy tắc nghỉ không lương (Điều 85 Luật BHXH 2014 + Công văn 3025/BHXH-QLT):
- Nếu `unpaidLeaveDays ≥ 14` trong kỳ → BHXH/BHYT/BHTN NLĐ = 0 (không đóng tháng đó)
- Nếu `unpaidLeaveDays < 14` → `bhxhBase` dùng **lương hợp đồng đầy đủ** (`contractSalary`), không dùng `grossSalary` thực tế

```
if (unpaidLeaveDays >= 14):
    bhxhEmployee = bhytEmployee = bhtnEmployee = 0
else:
    bhxhBase = MIN(contractSalary, bhxhCeiling)
    bhxhEmployee = bhxhBase × bhxhEmployeeRate  [làm tròn lên 100đ]
    bhytEmployee = bhxhBase × bhytEmployeeRate  [làm tròn lên 100đ]
    bhtnBase = MIN(contractSalary, minWageZone × 20)
    bhtnEmployee = bhtnBase × bhtnEmployeeRate  [làm tròn lên 100đ]
```

Lưu ý làm tròn: BHXH/BHYT/BHTN làm tròn **lên 100đ** (Nghị định 115/2015). Thuế TNCN làm tròn **xuống đến đồng** (Thông tư 111/2013) — hai rule khác nhau.

**FR-PR05** — Tính BHXH/BHYT/BHTN người sử dụng lao động (cost cho công ty, hiển thị tham khảo, không trừ vào lương nhân viên):
```
bhxhEmployer = bhxhBase × bhxhEmployerRate
bhytEmployer = bhxhBase × bhytEmployerRate
bhtnEmployer = bhtnBase × bhtnEmployerRate
tnldEmployer = bhxhBase × tnldRate
```

**FR-PR06** — Tính thu nhập chịu thuế:
```
// Phần allowance miễn TNCN (theo AllowanceType.isPitExempt + pitExemptCeiling)
pitExemptAllowances = Σ MIN(allowanceAmount, allowanceType.pitExemptCeiling)

taxableIncome = grossSalary
              - pitExemptAllowances
              - bhxhEmployee - bhytEmployee - bhtnEmployee
              - selfDeduction
              - (dependentCount × dependentDeduction)
              - otherDeductions (chứng từ từ thiện, bảo hiểm nhân thọ…)
taxableIncome = MAX(taxableIncome, 0)
```

**FR-PR07** — Tính thuế TNCN theo biểu lũy tiến active:
- Áp dụng đúng biểu tại ngày cuối kỳ lương
- Với nhân viên không cư trú: `pitAmount = taxableIncome × 20%`
- Với nhân viên cư trú: tính từng bậc, cộng dồn

**FR-PR08** — Tính net salary:
```
netSalary = grossSalary
          - bhxhEmployee - bhytEmployee - bhtnEmployee
          - pitAmount
```

**FR-PR13** — YTD tracking: sau mỗi kỳ lương `APPROVED`, engine cập nhật `EmployeeYearlyTaxSummary` (ytdGross, ytdTaxableIncome, ytdPitPaid) cho năm tương ứng. FR-QT01–04 đọc từ bảng này, không join trực tiếp `PayrollRecord`.

**FR-PR12** — Hỗ trợ hợp đồng freelance (`ContractType = FREELANCE`):
- Không tính BHXH/BHYT/BHTN (cả NLĐ lẫn NSDLĐ = 0)
- Khấu trừ TNCN cố định 10% **chỉ khi** `grossSalary ≥ 2.000.000đ/kỳ` (Điều 25 TT111/2013); nếu dưới 2 triệu thì `pitAmount = 0`, payslip ghi chú nhân viên tự kê khai
- `pitAmount = grossSalary × 10%` (nếu ≥ 2 triệu)
- Engine tự nhận biết qua `ContractType` của nhân viên tại kỳ lương

**FR-PR09** — Preview tính toán: trước khi approve, HR xem bảng full breakdown từng dòng cho mọi nhân viên. Các cột bắt buộc hiển thị: Họ tên | Gross | BHXH NLĐ | BHYT NLĐ | BHTN NLĐ | Thu nhập tính thuế | Số NPT | Thuế TNCN | Net. Có thể expand từng dòng xem chi tiết phụ cấp và OT breakdown.

**FR-PR10** — Không cho phép chỉnh sửa kỳ lương sau khi status = `APPROVED`. Kỳ bổ sung (adjustment): `PayrollPeriod.type = ADJUSTMENT` với `adjustmentForPeriodId` trỏ về kỳ gốc — engine tính delta, cộng vào YTD, phát payslip điều chỉnh có ghi "Điều chỉnh kỳ {tháng}".

**FR-PR11** — Workflow kỳ lương: `DRAFT` → `PROCESSING` → `REVIEWED` → `APPROVED` → `PAID`.
- `REVIEWED → DRAFT` được phép (re-run) nếu HR phát hiện cấu hình sai; ghi audit log.
- `REVIEWED → APPROVED`: do **Kế toán / Leadership** thực hiện (permission `PAYROLL_APPROVE`).
- Không cho phép approve khi còn nhân viên trong kỳ chưa có `TimesheetRecord` finalized — hệ thống hiển thị danh sách chặn và cho phép HR override từng người (ghi lý do).

---

### FR-PS: Phiếu Lương (Payslip)

**FR-PS01** — Sau khi kỳ lương APPROVED, hệ thống tự generate payslip PDF per employee.

**FR-PS02** — Layout payslip bao gồm. *Acceptance criterion: mọi giá trị số trên payslip khớp chính xác với field tương ứng trong `PayrollRecord` và `EmployeeAllowance` tại thời điểm generate; kiểm chứng bằng unit test so sánh từng field.*

Layout:
- Header: tên công ty, kỳ lương, thông tin nhân viên (tên, MST, phòng ban)
- Bảng thu nhập: lương cơ bản, lương thực tế (theo ngày công), phụ cấp, OT, bonus, gross
- Bảng khấu trừ: BHXH, BHYT, BHTN (NLĐ), thuế TNCN, tổng khấu trừ
- Bảng tham khảo: BHXH/BHYT/BHTN NSDLĐ (tổng cost công ty), số NPT, giảm trừ gia cảnh áp dụng
- Footer: lương thực lĩnh (net), ngày phát lương, chữ ký HR manager

**FR-PS03** — Payslip PDF lưu trên MinIO bucket `loop-hr-files/payslips/`. HR xem/download từ payroll management. Nhân viên xem/download từ self-service (Profile → Lương).

**FR-PS04** — Gửi email payslip: Nodemailer gửi email có **deep link vào app** (không dùng presigned URL trực tiếp trong email — tránh link hết hạn trước khi nhân viên đọc). Subject: `[Loop] Phiếu lương tháng {M}/{YYYY}`. App generate presigned URL on-demand khi nhân viên click download (chỉ lưu `payslipPath`, không lưu URL).

**FR-PS05** — In-app notification: `NotificationType` mới `PAYSLIP_ISSUED` → notification cho nhân viên khi phiếu có sẵn.

**FR-PS06** — Nhân viên xem lịch sử phiếu lương: danh sách theo tháng, xem online hoặc tải PDF.

---

### FR-QT: Báo cáo & Khai Thuế

**FR-QT01** — Tổng hợp TNCN trong năm cho từng nhân viên: tổng thu nhập, tổng khấu trừ, tổng thuế đã nộp — dùng cho quyết toán cuối năm.

**FR-QT02** — Export **Mẫu 05-QTT-TNCN** (Quyết toán thuế TNCN hàng năm): file Excel theo cấu trúc Thông tư 80/2021/TT-BTC, form 05-QTT-TNCN phiên bản HTKK hiện hành (kiểm tra tại htkk.gdt.gov.vn trước khi release). Dữ liệu đọc từ `EmployeeYearlyTaxSummary`. Lọc theo năm tài chính.

**FR-QT03** — Export **Phụ lục 05-1/BK-QTT-TNCN**: danh sách cá nhân có thu nhập từ tiền lương.

**FR-QT04** — Export **Mẫu 05-KK-TNCN** (Khai thuế tháng/quý): tổng hợp TNCN đã khấu trừ theo kỳ khai báo.

**FR-QT05** — Báo cáo chi phí lương toàn công ty: gross salary + tổng employer BHXH/BHYT/BHTN/TNLĐ = total labor cost — theo tháng, theo phòng ban, export Excel.

---

## 7. Yêu cầu phi chức năng

**NFR-PC01** — Độ chính xác: tất cả phép tính dùng `Decimal` (không float); kết quả làm tròn theo đúng quy định (BHXH: làm tròn lên 100đ; TNCN: làm tròn lên 100đ).

**NFR-PC02** — Audit trail: mọi thay đổi trên `PayrollRecord` (override ngày công, điều chỉnh bonus) đều ghi `AuditLog`.

**NFR-PC03** — Bảo mật & phân quyền: Permission codes bổ sung vào ROUTE_PERMISSION_MAP (theo chuẩn Epic 15):
- `PAYROLL_VIEW_ALL` — HR Admin, Leadership: xem toàn bộ kỳ lương và PayrollRecord
- `PAYROLL_VIEW_OWN` — Nhân viên: chỉ xem PayrollRecord của `employeeId = caller.employeeId`
- `PAYROLL_MANAGE` — HR Admin: tạo/edit kỳ lương, sync, override
- `PAYROLL_APPROVE` — Kế toán / Leadership: chuyển `REVIEWED → APPROVED`

PM chỉ xem cost tổng dự án (không có permission xem lương cá nhân). TNCN là dữ liệu nhạy cảm — không log ra stdout, không trả về trong API không có permission.

**NFR-PC04** — Performance: generate toàn bộ payslip PDF cho 200 nhân viên < 60 giây (BullMQ worker, parallel).

**NFR-PC05** — SaaS readiness: mọi config (InsuranceConfig, TaxBracket, TaxDeductionConfig) có `tenantId` nullable — null = global default, non-null = tenant override. Single-tenant dùng null toàn bộ.

---

## 8. Thay đổi Data Model

### Models mới

```prisma
// Cấu hình tỷ lệ BHXH/BHYT/BHTN — version theo effective date
model InsuranceConfig {
  id                  String   @id @default(uuid())
  tenantId            String?  @map("tenant_id")
  effectiveFrom       DateTime @map("effective_from") @db.Date
  bhxhEmployeeRate    Decimal  @map("bhxh_employee_rate") @db.Decimal(5, 4)
  bhytEmployeeRate    Decimal  @map("bhyt_employee_rate") @db.Decimal(5, 4)
  bhtnEmployeeRate    Decimal  @map("bhtn_employee_rate") @db.Decimal(5, 4)
  bhxhEmployerRate    Decimal  @map("bhxh_employer_rate") @db.Decimal(5, 4)
  bhytEmployerRate    Decimal  @map("bhyt_employer_rate") @db.Decimal(5, 4)
  bhtnEmployerRate    Decimal  @map("bhtn_employer_rate") @db.Decimal(5, 4)
  tnldRate            Decimal  @map("tnld_rate") @db.Decimal(5, 4)
  bhxhCeilingMultiple Int      @default(20) @map("bhxh_ceiling_multiple")
  wageBase            Decimal  @map("wage_base") @db.Decimal(12, 2)
  createdAt           DateTime @default(now()) @map("created_at")

  @@unique([tenantId, effectiveFrom])
  @@map("insurance_configs")
}

// Biểu thuế TNCN lũy tiến — version theo effective date
model TaxBracket {
  id            String   @id @default(uuid())
  tenantId      String?  @map("tenant_id")
  name          String
  effectiveFrom DateTime @map("effective_from") @db.Date
  brackets      Json     // [{from: 0, to: 5000000, rate: 0.05}, ...]
  createdAt     DateTime @default(now()) @map("created_at")

  @@unique([tenantId, effectiveFrom])
  @@map("tax_brackets")
}

// Cấu hình giảm trừ gia cảnh
model TaxDeductionConfig {
  id                   String   @id @default(uuid())
  tenantId             String?  @map("tenant_id")
  effectiveFrom        DateTime @map("effective_from") @db.Date
  selfDeduction        Decimal  @map("self_deduction") @db.Decimal(15, 2)
  dependentDeduction   Decimal  @map("dependent_deduction") @db.Decimal(15, 2)
  createdAt            DateTime @default(now()) @map("created_at")

  @@unique([tenantId, effectiveFrom])
  @@map("tax_deduction_configs")
}

// Lương tối thiểu vùng
model WageZoneConfig {
  id            String   @id @default(uuid())
  effectiveFrom DateTime @map("effective_from") @db.Date
  zone1         Decimal  @db.Decimal(12, 2)
  zone2         Decimal  @db.Decimal(12, 2)
  zone3         Decimal  @db.Decimal(12, 2)
  zone4         Decimal  @db.Decimal(12, 2)
  createdAt     DateTime @default(now()) @map("created_at")

  tenantId      String?  @map("tenant_id")
  @@unique([tenantId, effectiveFrom])
  @@map("wage_zone_configs")
}

// Hồ sơ thuế cá nhân
model EmployeeTaxProfile {
  employeeId      String          @id @map("employee_id")
  taxId           String?         @map("tax_id")
  residencyStatus ResidencyStatus @default(RESIDENT) @map("residency_status")
  wageZone        Int             @default(1) @map("wage_zone")
  updatedAt       DateTime        @updatedAt @map("updated_at")
  employee        Employee        @relation(fields: [employeeId], references: [id])
  dependents      Dependent[]

  @@map("employee_tax_profiles")
}

// Người phụ thuộc
model Dependent {
  id             String              @id @default(uuid())
  employeeId     String              @map("employee_id")
  name           String
  relationship   String
  taxId          String?             @map("tax_id")
  registeredFrom DateTime            @map("registered_from") @db.Date
  registeredTo   DateTime?           @map("registered_to") @db.Date
  createdAt      DateTime            @default(now()) @map("created_at")
  taxProfile     EmployeeTaxProfile  @relation(fields: [employeeId], references: [employeeId])

  @@index([employeeId])
  @@map("dependents")
}

enum ResidencyStatus {
  RESIDENT
  NON_RESIDENT

  @@map("residency_status")
}
```

### Models mới (tiếp)

```prisma
// Cột bảng lương do Admin định nghĩa qua UI
model SalaryColumn {
  id               String   @id @default(uuid())
  tenantId         String?  @map("tenant_id")
  name             String                        // VD: "Lương cơ bản", "Phụ cấp ăn ca"
  type             SalaryColumnType              // EARNING | DEDUCTION
  source           SalaryColumnSource            // CONTRACT_SALARY | ALLOWANCE_TYPE | FIXED_VALUE | FORMULA
  allowanceTypeId  String?  @map("allowance_type_id")
  fixedValue       Decimal? @map("fixed_value") @db.Decimal(15, 2)
  formula          String?                       // VD: "{contractSalary}/{standardDays}*{workDays}"
  isBhxhExempt     Boolean  @default(false) @map("is_bhxh_exempt")
  isPitExempt      Boolean  @default(false) @map("is_pit_exempt")
  pitExemptCeiling Decimal? @map("pit_exempt_ceiling") @db.Decimal(12, 2)
  sortOrder        Int      @default(0) @map("sort_order")
  isActive         Boolean  @default(true) @map("is_active")
  createdAt        DateTime @default(now()) @map("created_at")
  allowanceType    AllowanceType? @relation(fields: [allowanceTypeId], references: [id])

  @@index([tenantId, isActive])
  @@map("salary_columns")
}

enum SalaryColumnType {
  EARNING
  DEDUCTION
  @@map("salary_column_type")
}

enum SalaryColumnSource {
  CONTRACT_SALARY
  ALLOWANCE_TYPE
  FIXED_VALUE
  FORMULA
  @@map("salary_column_source")
}
```

```prisma
// Loại phụ cấp — có thể miễn BHXH và/hoặc miễn TNCN (trong giới hạn)
model AllowanceType {
  id               String              @id @default(uuid())
  name             String              @unique
  defaultAmount    Decimal             @map("default_amount") @db.Decimal(12, 2)
  isBhxhExempt     Boolean             @default(true) @map("is_bhxh_exempt")
  isPitExempt      Boolean             @default(false) @map("is_pit_exempt")
  pitExemptCeiling Decimal?            @map("pit_exempt_ceiling") @db.Decimal(12, 2) // null = miễn toàn bộ
  isActive         Boolean             @default(true) @map("is_active")
  createdAt        DateTime            @default(now()) @map("created_at")
  employeeAllowances EmployeeAllowance[]

  @@map("allowance_types")
}

// Loại thưởng — phân biệt tính BHXH hay không
model BonusType {
  id           String   @id @default(uuid())
  name         String   @unique           // VD: "Thưởng Tết", "Thưởng dự án", "Thưởng KPI"
  isBhxhExempt Boolean  @default(true) @map("is_bhxh_exempt")
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")

  @@map("bonus_types")
}

// Thưởng per nhân viên per kỳ (thay thế PayrollRecord.bonus đơn)
model EmployeeBonus {
  id              String      @id @default(uuid())
  payrollRecordId String      @map("payroll_record_id")
  bonusTypeId     String      @map("bonus_type_id")
  amount          Decimal     @db.Decimal(15, 2)
  note            String?
  payrollRecord   PayrollRecord @relation(fields: [payrollRecordId], references: [id], onDelete: Cascade)
  bonusType       BonusType   @relation(fields: [bonusTypeId], references: [id])

  @@unique([payrollRecordId, bonusTypeId])
  @@map("employee_bonuses")
}

// YTD tracking cho quyết toán thuế cuối năm
model EmployeeYearlyTaxSummary {
  id               String   @id @default(uuid())
  employeeId       String   @map("employee_id")
  year             Int
  ytdGross         Decimal  @default(0) @map("ytd_gross") @db.Decimal(15, 2)
  ytdTaxableIncome Decimal  @default(0) @map("ytd_taxable_income") @db.Decimal(15, 2)
  ytdPitPaid       Decimal  @default(0) @map("ytd_pit_paid") @db.Decimal(15, 2)
  ytdBhxhEmployee  Decimal  @default(0) @map("ytd_bhxh_employee") @db.Decimal(15, 2)
  updatedAt        DateTime @updatedAt @map("updated_at")
  employee         Employee @relation(fields: [employeeId], references: [id])

  @@unique([employeeId, year])
  @@index([employeeId, year])
  @@map("employee_yearly_tax_summaries")
}

// Override phụ cấp per nhân viên per kỳ
model EmployeeAllowance {
  id              String         @id @default(uuid())
  payrollRecordId String         @map("payroll_record_id")
  allowanceTypeId String         @map("allowance_type_id")
  amount          Decimal        @db.Decimal(12, 2)
  overrideNote    String?        @map("override_note")
  payrollRecord   PayrollRecord  @relation(fields: [payrollRecordId], references: [id], onDelete: Cascade)
  allowanceType   AllowanceType  @relation(fields: [allowanceTypeId], references: [id])

  @@unique([payrollRecordId, allowanceTypeId])
  @@map("employee_allowances")
}
```

### Extend `PayrollRecord` (migration — thêm cột mới, giữ nguyên cột cũ)

```prisma
// Thêm vào model PayrollRecord hiện có:
grossSalary        Decimal  @default(0) @map("gross_salary") @db.Decimal(15, 2)
overtimePay        Decimal  @default(0) @map("overtime_pay") @db.Decimal(15, 2)
allowances         Decimal  @default(0) @db.Decimal(15, 2)
bhxhEmployee       Decimal  @default(0) @map("bhxh_employee") @db.Decimal(15, 2)
bhytEmployee       Decimal  @default(0) @map("bhyt_employee") @db.Decimal(15, 2)
bhtnEmployee       Decimal  @default(0) @map("bhtn_employee") @db.Decimal(15, 2)
bhxhEmployer       Decimal  @default(0) @map("bhxh_employer") @db.Decimal(15, 2)
bhytEmployer       Decimal  @default(0) @map("bhyt_employer") @db.Decimal(15, 2)
bhtnEmployer       Decimal  @default(0) @map("bhtn_employer") @db.Decimal(15, 2)
tnldEmployer       Decimal  @default(0) @map("tnld_employer") @db.Decimal(15, 2)
taxableIncome      Decimal  @default(0) @map("taxable_income") @db.Decimal(15, 2)
selfDeduction      Decimal  @default(0) @map("self_deduction") @db.Decimal(15, 2)
dependentDeduction Decimal  @default(0) @map("dependent_deduction") @db.Decimal(15, 2)
dependentCount     Int      @default(0) @map("dependent_count")
pitAmount          Decimal  @default(0) @map("pit_amount") @db.Decimal(15, 2)
totalLaborCost     Decimal  @default(0) @map("total_labor_cost") @db.Decimal(15, 2)
unpaidLeaveDays    Decimal  @default(0) @map("unpaid_leave_days") @db.Decimal(5, 1)
paidLeaveDays      Decimal  @default(0) @map("paid_leave_days") @db.Decimal(5, 1)
overtimePayBreakdown Json?  @map("overtime_pay_breakdown") // {weekday: x, weekend: x, holiday: x}
payslipPath        String?  @map("payslip_path")
configSnapshot     Json?    @map("config_snapshot") // {snapshotVersion: 1, rates: {...}}
overrideNote       String?  @map("override_note")
periodType         String   @default("REGULAR") @map("period_type") // REGULAR | ADJUSTMENT

// Relations
employeeAllowances EmployeeAllowance[]
employeeBonuses    EmployeeBonus[]

@@index([employeeId, periodId])
@@index([periodId])
```

---

## 9. Tích hợp với module hiện có

| Module | Tích hợp |
|--------|----------|
| Timesheet | Tự động sync `workDays`, `paidLeaveDays`, `unpaidLeaveDays`, `overtimeHours` (theo OvertimeCategory) từ `TimesheetRecord` APPROVED khi mở kỳ lương |
| Leave | `LeaveBalance` trừ số ngày khi leave APPROVED — payroll đọc số dư đã xử lý |
| HR (Employee) | Đọc `baseSalary` từ `Contract.salaryMonthly` hiện tại; `wageZone` từ `EmployeeTaxProfile` |
| BPM | Kỳ lương REVIEWED → trigger BPM process `payroll-approval` nếu có definition ACTIVE (optional) |
| Finance (Accounting) | Khi kỳ lương APPROVED → `FinanceEventBus` fire `PAYROLL_APPROVED` → `AccountingService` tạo journal entry: DR 642 (Chi phí lương) / CR 334 (Phải trả NV) + DR 642 / CR 338 (Phải trả BHXH NSDLĐ) |
| Notification | Phát `PAYSLIP_ISSUED` notification khi payslip đã generate xong |
| MinIO | Lưu payslip PDF tại bucket `loop-hr-files`, path `payslips/{year}/{month}/{employeeId}.pdf` |

---

## 10. Open Questions

> Tất cả câu hỏi đã được giải quyết — không còn blocker.

| # | Câu hỏi | Quyết định | Ngày |
|----|---------|-----------|------|
| OQ-1 | Phụ cấp miễn BHXH — per loại hay per NV? | **Cả hai**: `AllowanceType` định nghĩa default toàn công ty + `EmployeeAllowance` override per NV per kỳ | 2026-05-28 |
| OQ-2 | Biểu thuế 5 bậc có hiệu lực khi nào? | **Seed ngay** `effectiveFrom = 2026-01-01` (Luật 109/2025/QH15 đã xác nhận) | 2026-05-28 |
| OQ-3 | Hỗ trợ freelance không? | **Có** — `ContractType = FREELANCE`: không BHXH, khấu trừ 10% TNCN flat (FR-PR12) | 2026-05-28 |
| OQ-4 | Payslip template tùy chỉnh? | **Template chuẩn Loop** cho v1; custom logo/màu để SaaS v2 | 2026-05-28 |
| OQ-5 | Tích hợp iHTKK? | **Không** trong v1 — chỉ export file Excel/XML, HR tự tải lên cổng thuế | 2026-05-28 |

---

## 11. Glossary

| Thuật ngữ | Định nghĩa |
|---|---|
| **Kỳ lương** / PayrollPeriod | Một chu kỳ tính lương (thường = 1 tháng dương lịch). Có type REGULAR hoặc ADJUSTMENT |
| **Phiếu lương** / Payslip | File PDF phát cho nhân viên sau khi kỳ lương APPROVED |
| **PayrollRecord** | Bản ghi chi tiết lương của 1 nhân viên trong 1 kỳ |
| **Lương hợp đồng** / contractSalary | `Contract.salaryMonthly` — mức lương ghi trong hợp đồng, dùng làm `bhxhBase` |
| **Lương thực tế** / grossSalary | Lương sau tính theo ngày công + phụ cấp + OT + thưởng |
| **Thu nhập tính thuế** / taxableIncome | Gross − bhxh NLĐ − giảm trừ cá nhân − giảm trừ NPT |
| **Lương thực lĩnh** / netSalary | Gross − bhxh NLĐ − thuế TNCN |
| **YTD** | Year-to-Date — tổng lũy kế từ đầu năm đến kỳ hiện tại |
| **NPT** / Người phụ thuộc | Người được đăng ký giảm trừ gia cảnh cho nhân viên |
| **BHXH/BHYT/BHTN** | Bảo hiểm xã hội / y tế / thất nghiệp |
| **TNCN / PIT** | Thuế thu nhập cá nhân (Personal Income Tax) |
| **NLĐ** | Người lao động (employee) |
| **NSDLĐ** | Người sử dụng lao động (employer) |

---

## 12. Phạm vi ngoài v1 (để sau)

- Tích hợp API nộp thuế điện tử iHTKK (chỉ export file trong v1)
- E-signature trên payslip PDF
- Tính lương theo ca / theo giờ (hiện chỉ hỗ trợ theo ngày công)
- Multi-currency payroll
- Payroll cho nhân viên nước ngoài (khác biệt BHXH treaty)
