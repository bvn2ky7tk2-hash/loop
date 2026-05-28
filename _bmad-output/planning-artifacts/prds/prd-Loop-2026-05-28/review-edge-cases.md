# Edge Case & Compliance Review — Loop Payroll Compliance

## Overall assessment

The PRD has a solid configurable-first foundation and covers the main BHXH/TNCN flows correctly, but it is missing several legally mandatory edge cases (mid-month pro-ration, probation salary cap, overtime rate differentiation, unpaid-leave BHXH base, 13th-month salary) and has structural data-model gaps that will surface during annual tax finalization. Left unaddressed, these gaps will produce incorrect payslips and potentially trigger tax penalties for customers.

---

## Findings

### Critical

- **Không xử lý lương thử việc 85%** — Luật Lao động Điều 25 quy định mức lương thử việc không thấp hơn 85% mức lương chính thức. PRD không mô tả trạng thái `PROBATION` trên contract, không có cờ `isProbation` trên `PayrollRecord`, và FR-PR03 tính `grossSalary` thẳng từ `baseSalary` mà không cap 85%. Nếu HR cấu hình `baseSalary` = mức full nhưng nhân viên còn thử việc, hệ thống sẽ trả sai (hoặc ngược lại nếu đã chỉnh baseSalary thì không thể báo cáo đúng). *Fix:* Thêm trường `contractPhase: PROBATION | OFFICIAL` vào `Contract`; engine tự nhân `× 0.85` khi `PROBATION`, và ghi rõ trong payslip breakdown.

- **Thiếu YTD (Year-to-Date) tracking cho quyết toán thuế cuối năm** — FR-QT01–04 nói "tổng hợp TNCN trong năm" nhưng data model không có bảng/cột nào tích lũy `ytdTaxableIncome`, `ytdPitPaid`, `ytdGross` per nhân viên per năm. Nếu chỉ cộng `PayrollRecord.pitAmount` qua các tháng, sẽ sai khi: (a) kỳ bổ sung/adjustment period, (b) nhân viên có thu nhập từ nhiều nguồn, (c) hoàn thuế cuối năm (số thuế phải nộp năm ≠ tổng tháng do lũy tiến). *Fix:* Thêm model `EmployeeYearlyTaxSummary` lưu YTD amounts; engine cập nhật sau mỗi kỳ lương approved; FR-QT phải dựa vào bảng này, không join trực tiếp `PayrollRecord`.

- **bhxhBase tính sai khi có nghỉ không lương (unpaid leave)** — FR-PR04 dùng `bhxhBase = MIN(grossSalary, bhxhCeiling)`. Theo Điều 85 Luật BHXH 2014 và Công văn 3025/BHXH-QLT: tháng có ngày nghỉ không lương, mức đóng BHXH phải tính trên **lương hợp đồng đầy đủ** (không giảm theo ngày công thực tế) nếu số ngày nghỉ không lương < 14 ngày; nếu ≥ 14 ngày không đóng BHXH tháng đó. PRD không phân biệt `unpaidLeaveDays` vs `paidLeaveDays` trong sync từ Timesheet, và không có logic "≥ 14 ngày → skip BHXH". *Fix:* Thêm `unpaidLeaveDays` vào sync Timesheet; engine check: nếu `unpaidLeaveDays ≥ 14` → BHXH = 0 kỳ đó; ngược lại `bhxhBase` dùng lương hợp đồng, không dùng `grossSalary` thực tế.

- **Không có cơ chế điều chỉnh/correction period** — FR-PR10 cho phép tạo "kỳ bổ sung" nhưng không định nghĩa data model, workflow, hay cách kỳ bổ sung ảnh hưởng đến file quyết toán thuế. Nếu phát hiện sai sau khi APPROVED, HR không có con đường rõ ràng để sửa. *Fix:* Định nghĩa `PayrollPeriod.type: REGULAR | ADJUSTMENT`; `adjustmentForPeriodId` FK; engine cộng/trừ delta vào YTD; phiếu lương điều chỉnh có dòng "điều chỉnh kỳ T-1".

---

### High

- **Thuê/nghỉ việc giữa tháng — pro-ration ngày công** — FR-PR03 tính `baseSalary / standardWorkDays × workDays`. Nếu nhân viên gia nhập ngày 15 thì `workDays` đúng, nhưng `standardWorkDays` là toàn tháng → tỷ lệ có thể sai phần BHXH vì `bhxhBase` vẫn dùng `grossSalary` tỷ lệ ngày. Quan trọng hơn: tháng vào/ra, BHXH cần đóng cho **nguyên tháng** nếu làm từ ngày 1, hoặc tính theo ngày nếu giữa tháng — cần spec rõ. PRD không đề cập. *Fix:* Thêm `hireDate` / `terminationDate` vào engine logic; quy định rõ BHXH tháng đầu/cuối đóng đủ hay pro-rate.

- **Overtime 3 mức (150%/200%/300%) không được spec trong data model** — FR-PR03 đề cập `overtimeMultiplier` nhưng không định nghĩa enum hay config cho 3 mức pháp định: ngày thường (150%), cuối tuần (200%), lễ/Tết (300%). Không có trường nào trong `TimesheetRecord` hay `PayrollRecord` phân loại loại OT. Nếu lấy một `overtimeMultiplier` duy nhất, sẽ tính sai. *Fix:* Thêm `OvertimeCategory: WEEKDAY | WEEKEND | HOLIDAY` vào `TimesheetRecord`; `PayrollRecord` lưu `overtimePayBreakdown: Json`; engine tổng hợp theo từng loại.

- **13th-month salary / thưởng Tết không được đề cập** — Đây là nghĩa vụ phổ biến (thường bằng 1 tháng lương, phát tháng 1 hoặc tháng 12). Về pháp lý: thưởng Tết phải cộng vào thu nhập chịu thuế TNCN của tháng phát thưởng, nhưng không đóng BHXH. PRD không có FR nào cho bonus policy hay `BonusType`. `PayrollRecord.bonus` là một con số đơn, không phân loại → không thể tách đúng: bonus nào chịu BHXH, bonus nào chỉ chịu TNCN. *Fix:* Thêm `BonusType` model với cờ `isBhxhExempt` (tương tự `AllowanceType`); engine xử lý riêng từng loại bonus.

- **Phụ cấp miễn thuế TNCN chưa được phân biệt với miễn BHXH** — `AllowanceType` chỉ có flag `isBhxhExempt`. Nhưng theo Thông tư 111/2013/TT-BTC, nhiều phụ cấp (ăn ca ≤ 730k, điện thoại, xăng xe theo mức thực tế…) vừa miễn BHXH vừa **miễn TNCN** (trong giới hạn). Nếu chỉ có 1 flag, engine sẽ đưa toàn bộ allowance vào `taxableIncome` kể cả phần được miễn TNCN. *Fix:* Thêm `isPitExempt: Boolean` + `pitExemptCeiling: Decimal` vào `AllowanceType`; FR-PR06 trừ phần miễn trước khi tính `taxableIncome`.

- **Access control salary data chưa có row-level spec** — NFR-PC03 nói "HR Admin và Leadership xem toàn bộ, PM chỉ xem cost tổng dự án, nhân viên chỉ xem của mình" nhưng không map sang role/permission codes như phần còn lại của hệ thống (Epic 15 RBAC). Không có FR cho API permission guard, không có spec về việc `GET /payroll/records` lọc thế nào theo caller. *Fix:* Thêm permission codes (`PAYROLL_VIEW_ALL`, `PAYROLL_VIEW_OWN`, `PAYROLL_APPROVE`) vào ROUTE_PERMISSION_MAP; backend guard kiểm tra `employeeId = caller.employeeId` cho non-admin.

---

### Medium

- **Decimal precision cho lũy tiến cộng dồn** — `PayrollRecord.pitAmount` dùng `Decimal(15,2)` — đủ cho từng tháng. Nhưng `EmployeeYearlyTaxSummary` (nếu được thêm) tích lũy 12 tháng × tính bậc thuế lũy tiến có thể sinh số thập phân dài khi làm tròn từng bước. Theo Thông tư 111: "làm tròn đến đồng". PRD chỉ nói "làm tròn lên 100đ" (NFR-PC01) — mâu thuẫn với quy định. *Fix:* Xác nhận lại quy tắc làm tròn: BHXH làm tròn lên 100đ (đúng per Nghị định 115/2015), TNCN làm tròn xuống đến đồng (Thông tư 111/2013); tách rõ 2 rule trong engine.

- **Kỳ lương span 2 mốc effective_date** — Nếu kỳ lương từ 01/07 đến 31/07 mà lương cơ sở tăng từ 01/07 (ví dụ: trần BHXH tăng từ 46.8M → 50.6M), FR-TX04 chọn config tại "ngày cuối kỳ" → đúng. Nhưng nếu kỳ lương mở từ ngày 20/6 đến 20/7 (kỳ không chuẩn), sẽ áp sai config. PRD không ràng buộc `PayrollPeriod` phải là tháng dương lịch. *Fix:* Thêm validation: `period.startDate` phải là ngày 1 tháng, `period.endDate` là ngày cuối tháng; hoặc nếu cho phép kỳ tùy chỉnh, engine phải split và áp config theo từng đoạn.

- **Timesheet không nộp — hành vi không được định nghĩa** — FR-PR01 sync từ `TimesheetRecord` nhưng không nói rõ: nếu nhân viên chưa nộp timesheet, `workDays` = 0 hay = `standardWorkDays` hay block kỳ lương? Nếu mặc định = 0, nhân viên nhận lương 0; nếu mặc định = đủ ngày, có thể trả lương sai. *Fix:* Thêm FR cho trạng thái "timesheet missing": hệ thống cảnh báo HR, không cho approve kỳ lương khi còn nhân viên chưa có timesheet (hoặc HR phải override thủ công và ghi lý do).

- **Người phụ thuộc đăng ký giữa tháng** — `Dependent.registeredFrom` là Date nhưng giảm trừ NPT theo Thông tư 111 áp dụng từ **tháng đăng ký** (không pro-rate theo ngày). PRD không định nghĩa engine xử lý thế nào nếu `registeredFrom` = 15/07 trong kỳ lương tháng 7. *Fix:* Spec rõ: nếu `registeredFrom` trong kỳ lương hiện tại → tính đủ tháng; engine check `registeredFrom ≤ period.endDate AND (registeredTo IS NULL OR registeredTo ≥ period.startDate)`.

- **configSnapshot không có schema cố định** — `PayrollRecord.configSnapshot: Json` lưu rates tại thời điểm tính toán — tốt cho audit. Nhưng không có schema validate, nên nếu code thay đổi format, replay/recalculation sẽ fail lặng lẽ. *Fix:* Định nghĩa TypeScript interface `PayrollConfigSnapshot` và validate khi đọc; versioned với field `snapshotVersion`.

---

### Low

- **Freelance 10% tax — ngưỡng 2 triệu chưa xét** — Theo Điều 25 Thông tư 111/2013: khấu trừ 10% chỉ áp khi chi trả **từ 2.000.000đ/lần trở lên**; nếu dưới 2 triệu thì không khấu trừ (trừ khi cộng dồn). FR-PR12 áp 10% flat mọi trường hợp → sai với freelancer thu nhập thấp. *Fix:* Thêm threshold check; nếu `grossSalary < 2.000.000` → `pitAmount = 0` (và note cho nhân viên tự kê khai).

- **Email payslip — presigned URL 7 ngày có thể hết hạn trước khi nhân viên đọc** — FR-PS04: presigned URL MinIO 7 ngày. Nếu nhân viên nghỉ phép hoặc bỏ lỡ email, link hết hạn và không lấy lại được từ app (FR-PS06 chỉ nói "xem online hoặc tải PDF" — không rõ link trong app là permanent hay presigned). *Fix:* Trong-app download nên generate presigned URL on-demand (không lưu URL, chỉ lưu `payslipPath`); email dùng link đến app, không dùng presigned URL trực tiếp.

- **WageZoneConfig thiếu tenantId** — Tất cả config khác có `tenantId` nullable để hỗ trợ SaaS multi-tenant (NFR-PC05), nhưng `WageZoneConfig` không có `tenantId`. Một tenant có thể cần override lương tối thiểu vùng khác (ví dụ: công ty ở Khu Công nghiệp có quy định riêng). *Fix:* Thêm `tenantId String?` vào `WageZoneConfig`; `@@unique([tenantId, effectiveFrom])`.

- **Thiếu index trên PayrollRecord cho queries thường gặp** — `PayrollRecord` sẽ được query theo `(employeeId, periodId)`, `(periodId, status)` rất thường xuyên. PRD chỉ extend model, không định nghĩa index mới. Với 200+ nhân viên × 12 tháng × nhiều năm, full scan sẽ chậm. *Fix:* Thêm `@@index([employeeId, periodId])` và `@@index([periodId, status])` vào migration.

- **Không có spec cho re-run tính toán** — Nếu HR phát hiện cấu hình sai sau khi đã ở trạng thái `REVIEWED` (chưa APPROVED), có thể "chạy lại" không? PRD không định nghĩa transition `REVIEWED → DRAFT` hay `REVIEWED → PROCESSING`. Nếu không cho phép, HR phải xóa kỳ và tạo lại — mất toàn bộ override đã nhập. *Fix:* Thêm transition `REVIEWED → DRAFT` (với audit log) cho phép re-run trước khi approve.
