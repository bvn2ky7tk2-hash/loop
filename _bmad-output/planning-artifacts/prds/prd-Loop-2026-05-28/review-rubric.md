# PRD Quality Review — Loop Payroll Compliance

## Overall verdict
PRD này mạnh về nội dung thực chất: công thức tính lương cụ thể, data model đầy đủ, bối cảnh pháp lý chính xác với số liệu thực tế — hiếm thấy ở PRD nội bộ. Điểm yếu tập trung ở hai chỗ: done-ness clarity của một số FR chưa có acceptance criterion đo được, và scope honesty thiếu `[ASSUMPTION]` tag tường minh cho các phụ thuộc chéo module. Với một module compliance có risk phạt thuế, hai điểm này cần được vá trước khi bàn giao story.

---

## Decision-readiness — adequate

PRD nêu rõ 5 Open Questions và đã đóng tất cả với quyết định cụ thể (OQ-1 đến OQ-5). Workflow kỳ lương (`DRAFT → PROCESSING → REVIEWED → APPROVED → PAID`) được state tường minh tại FR-PR11. Trade-off quan trọng — không tích hợp iHTKK v1, chỉ export file — được ghi tại OQ-5 và §11.

Tuy nhiên, một số điểm quyết định thực sự bị giấu dưới dạng thiết kế kỹ thuật mà không có `[NOTE FOR PM]`:
- Việc `configSnapshot` lưu tỷ lệ tại thời điểm tính toán (§8, PayrollRecord) là quyết định audit có hệ quả pháp lý — không được nêu như quyết định.
- FR-PR11 đặt REVIEWED trước APPROVED nhưng không nói ai có quyền approve (Leadership/Kế toán được nhắc ở §3 nhưng không được map vào workflow một cách tường minh).
- §9 nói BPM trigger là "optional" — không giải thích khi nào thì bắt buộc, ai quyết định bật.

### Findings
- **medium** Vai trò trong workflow approval chưa được map (§4 UJ-1, FR-PR11) — "Leadership/Kế toán duyệt" ở FR-PR11 nhưng persona §3 gọi là "Kế toán / Leadership" và không có UJ riêng. *Fix:* Thêm dòng vào FR-PR11 nêu rõ `REVIEWED → APPROVED` do persona nào thực hiện, và thêm UJ-5 hoặc ghi chú vào UJ-1.
- **low** BPM integration "optional" không có điều kiện kích hoạt (§9) — *Fix:* Thêm `[NOTE FOR PM]: BPM payroll-approval chỉ active khi có ProcessDefinition key=payroll-approval tồn tại; mặc định skip`.

---

## Substance over theater — strong

Không có persona theater: 4 persona đều drive FR cụ thể (HR Admin → FR-PR/PS/QT, Admin → FR-CF/TX, Nhân viên → FR-PS06/UJ-2, Kế toán → FR-QT05). Biểu thuế và tỷ lệ BHXH ở §5 là số liệu thực tế tra được, không phải placeholder. NFR-PC01 (Decimal, làm tròn 100đ), NFR-PC04 (200 NV < 60s), NFR-PC05 (tenantId nullable) đều có ngưỡng cụ thể. Counter-metric tại §2 ("không để HR cần training > 1 buổi") là thực chất dù đo khó.

Không có innovation theater hoặc vision theater — §1 thẳng vào vấn đề mà không vẽ vời.

---

## Strategic coherence — strong

Thesis rõ: thay thế Excel bằng engine tính lương compliant với luật VN, configurable theo ngày hiệu lực, mở đường cho SaaS. Feature set phục vụ trực tiếp thesis:
- Config có `effectiveDate` + immutable sau khi dùng → compliance thesis
- `configSnapshot` trên PayrollRecord → audit/traceability thesis
- `tenantId nullable` → SaaS thesis

Success metrics tại §2 validate thesis (sai số = 0, thời gian < 2h, file thuế không lỗi). Counter-metric về complexity training cũng liên kết với thesis "dùng được thực tế".

MVP scope đúng loại "regulatory/compliance update" — FRs đều là constraint traceability, không phải UX-first.

---

## Done-ness clarity — thin

Đây là điểm yếu chính. Công thức tính toán tại FR-PR03–FR-PR08 rất cụ thể và là điểm mạnh. Tuy nhiên nhiều FR khác thiếu verifiable condition:

- **FR-PS02** mô tả layout payslip nhưng không có acceptance criterion: "payslip chính xác" là gì? Số liệu có khớp PayrollRecord không? Có test case cụ thể không?
- **FR-QT02/03/04** nói "theo đúng cấu trúc cột của Tổng cục Thuế" nhưng không dẫn link/version mẫu biểu. "Không có lỗi validate" ở §2 SM là criterion nhưng không được lặp lại tại FR.
- **FR-CF04** "audit log ghi lại ai thay đổi, khi nào, giá trị cũ/mới" — testable, nhưng không nói log ở đâu (table nào, API nào để đọc).
- **FR-PR09** "HR xem bảng full breakdown" — không có acceptance criterion về những cột/dòng nào bắt buộc.
- **FR-TE05/FR-TE06** không nói gì về UI (dropdown, inline edit, modal?) — "done" cho story writer là gì?

### Findings
- **high** FR-QT02/03/04 thiếu version/link mẫu biểu Tổng cục Thuế (§6 FR-QT) — "cấu trúc cột" sẽ thay đổi, dev không biết dùng template nào. *Fix:* Ghi rõ "Mẫu theo Thông tư 80/2021/TT-BTC, form 05-QTT-TNCN phiên bản hiện hành trên HTKK" hoặc đính kèm mẫu.
- **high** FR-PS02 không có acceptance criterion cho nội dung payslip (§6 FR-PS) — không biết phiếu lương "đúng" là gì nếu số liệu sai ở một ô. *Fix:* Thêm: "Mọi giá trị trên payslip khớp chính xác với các field tương ứng trong PayrollRecord tại thời điểm generate".
- **medium** FR-PR09 preview không liệt kê cột bắt buộc (§6 FR-PR) — *Fix:* Thêm danh sách cột tối thiểu: employee name, gross, BHXH/BHYT/BHTN NLĐ, PIT, net.
- **medium** FR-CF04 audit log không có API/UI access spec (§6 FR-CF) — *Fix:* Ghi "ghi vào `AuditLog` table hiện có; xem được qua Admin UI tại /admin/audit-logs".
- **low** FR-TE05/TE06 thiếu UX shape (§6 FR-TE) — *Fix:* Thêm một câu mô tả interaction dạng "inline table" hay "drawer".

---

## Scope honesty — adequate

§11 (Non-goals) liệt kê 5 mục rõ ràng: iHTKK API, e-signature, shift-based payroll, multi-currency, foreign employee. Đây là làm việc thực sự, không phải list trống.

OQ section đã đóng tất cả câu hỏi — không còn open blocker.

Tuy nhiên, một số assumption quan trọng không được tag tường minh:
- "Tự động sync từ TimesheetRecord" (FR-PR01) giả định TimesheetRecord đã có trạng thái FINALIZED hoặc tương đương cuối tháng — không được ghi.
- "Đọc `baseSalary` từ `Contract.salaryMonthly` hiện tại" (§9) giả định employee luôn có Contract active tại kỳ lương — không được ghi.
- "LeaveBalance trừ số ngày khi leave APPROVED — payroll đọc số dư đã xử lý" (§9) giả định Leave module đã xử lý xong trước khi payroll sync — race condition tiềm ẩn không được nêu.

### Findings
- **high** Giả định TimesheetRecord đã finalized khi sync (FR-PR01) — nếu chưa finalized thì workDays sai. *Fix:* Thêm `[ASSUMPTION: TimesheetRecord của tháng T được finalize trước khi HR mở kỳ lương T; nếu chưa finalize, payroll module báo lỗi và yêu cầu finalize trước]`.
- **medium** Race condition Leave → Payroll sync (§9) — *Fix:* Thêm `[ASSUMPTION: LeaveRequest APPROVED đã được settle (balance deducted) trước thời điểm HR sync kỳ lương]`.
- **medium** Employee không có Contract active (§9) — *Fix:* Thêm `[ASSUMPTION: Mọi employee trong kỳ lương đều có Contract active với salaryMonthly > 0; engine bỏ qua hoặc báo lỗi nếu thiếu]`.

---

## Downstream usability — adequate

PRD này rõ ràng là chain-top (feeds architecture → stories), vì vậy traceability quan trọng.

**Điểm tốt:**
- FR IDs nhất quán: FR-CF01–04, FR-TX01–04, FR-TE01–06, FR-PR01–12, FR-PS01–06, FR-QT01–05. Không gap.
- UJ-1 đến UJ-4 đều name persona từ §3 (HR Admin, Nhân viên, Admin, HR).
- Data model đầy đủ với tên field cụ thể — story writer có thể extract trực tiếp.
- §9 Integration table rõ ràng, dễ trích xuất.

**Điểm cần cải thiện:**
- Không có Glossary section. Thuật ngữ được dùng nhất quán trong bản này nhưng không có nguồn sự thật để downstream team tra cứu. Ví dụ: "kỳ lương" vs "PayrollPeriod", "phiếu lương" vs "Payslip" vs "PayslipPDF".
- FR-PR12 (FREELANCE) nằm giữa FR-PR09 về số thứ tự (12 sau 08 nhưng trước 09) — FR-PR09 đến FR-PR11 xuất hiện sau FR-PR12 trong document. Gây nhầm khi đọc.
- UJ-4 (HR xuất quyết toán) không link đến FR-QT tường minh.

### Findings
- **medium** Không có Glossary — tiếng Anh/tiếng Việt mixed (PayrollRecord, kỳ lương, phiếu lương, Payslip) không có mapping chuẩn. *Fix:* Thêm section Glossary ngắn cuối PRD.
- **low** FR-PR12 đặt sai thứ tự số (12 xuất hiện trước 09-11 trong document) — gây nhầm khi đọc. *Fix:* Sắp xếp lại hoặc đặt chú thích.

---

## Shape fit — strong

PRD là brownfield compliance update (có PayrollRecord/PayrollPeriod hiện hành, thêm engine mới). Shape fit tốt: PRD tập trung vào constraint traceability (tỷ lệ BHXH, biểu thuế, mẫu biểu thuế) hơn UX, phù hợp với loại sản phẩm regulatory. 4 personas đúng mức cần thiết — không thừa, không thiếu. UJs đủ để hiểu flow mà không bị overformalized. Data model section là load-bearing cho brownfield context — đây là quyết định đúng.

---

## Mechanical notes
- Không có Assumptions Index (inline assumptions không được tag `[ASSUMPTION]` tường minh và không có index cuối document).
- FR-PR12 nằm sai thứ tự số trong document: xuất hiện sau FR-PR08 nhưng trước FR-PR09/10/11.
- §10 "Tất cả câu hỏi đã được giải quyết" đúng nhưng không phân biệt quyết định nào do PM vs quyết định nào cần confirm với khách hàng.
- Không có cross-reference từ UJ-4 đến FR-QT — dễ sửa, thêm "(xem FR-QT01–05)" vào UJ-4.
- Không có section Glossary — xem Downstream usability.
- §5 note "Đây là snapshot" tốt, nhưng không có ngày review lại (ví dụ: "kiểm tra lại khi triển khai sau 01/07/2026").
