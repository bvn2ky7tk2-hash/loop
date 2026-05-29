---
title: "Loop HR v4.0 — HRIS Nâng Cao: Từ HR Light đến HRIS Chuyên Nghiệp"
status: final
created: 2026-05-28
updated: 2026-05-29
epic: 23
roadmap_item: "v4.0 — HR HRIS Upgrade"
---

# PRD: Loop HR v4.0 — HRIS Nâng Cao

## 0. Mục đích tài liệu

PRD này dành cho PM, Tech Lead, UX Designer và các workflow owner (epics/stories) của dự án Loop ERP.
Tài liệu đặc tả yêu cầu cho **6 epic HR v4.0** — nâng cấp module Nhân sự từ HR cơ bản (danh sách nhân viên, hợp đồng, đơn nghỉ phép) lên HRIS chuyên nghiệp đủ phục vụ doanh nghiệp VN 50–500 người.

PRD này **xây trên** các artifact đã có:
- Payroll Compliance PRD (Epic 22) — đã cover tính lương, BHXH/TNCN calculation; HR v4.0 KHÔNG viết lại phần đó
- HR module hiện tại (Epic 1): `Employee`, `OrgUnit`, `Contract`, `LeaveRequest`, `TrainingRecord`, `PerformanceReview`
- Timesheet module (Epic 3): `TimesheetRecord`, `LeaveRequest`, `LeaveApproval`

Vocabulary chuẩn hóa trong §3 Glossary. FRs được đánh số toàn cục (FR-1…FR-N) và ổn định để downstream artifacts tham chiếu.

---

## 1. Vision

Loop HR v4.0 biến module Nhân sự từ một "danh bạ nhân viên có kèm đơn nghỉ phép" thành **HRIS đầy đủ** — nơi mọi sự kiện trong vòng đời nhân viên (tuyển dụng, điều chuyển, tăng lương, đào tạo, đánh giá, nghỉ việc) đều được ghi nhận tự động như một hồ sơ có audit trail, mọi quyết định nhân sự đều có workflow phê duyệt và xuất PDF chuẩn pháp lý, và mọi HR Staff đều có đủ công cụ thay thế Excel.

Với v4.0, CHRO của khách hàng có thể trả lời câu hỏi "Nhân viên A đang ở vị trí gì, được điều chuyển từ phòng nào, đang đóng BHXH ở mức nào, còn bao nhiêu ngày phép năm" chỉ trong 30 giây — không cần hỏi HR Staff, không cần mở file Excel.

Pain point cốt lõi cần giải quyết: **quy trình HR rời rạc** — mỗi sự kiện nhân sự (onboarding, transfer, tăng lương) đang được xử lý thủ công bằng email + Excel + Word, không có audit trail, dễ xảy ra sai sót và khó truy vết.

---

## 2. Target User

### 2.1 Personas chính

| Persona | Vai trò | Nhu cầu cốt lõi |
|---------|---------|----------------|
| **HR Manager / CHRO** | Quản lý chiến lược nhân sự | Dashboard tổng quan, báo cáo headcount, biến động nhân sự theo kỳ |
| **HR Staff (C&B)** | Tác nghiệp hàng ngày | Tạo quyết định nhanh, tính phép chính xác, quản lý BHXH |
| **Manager / Team Lead** | Quản lý trực tiếp | Approve quyết định, xem profile nhân viên trong team |
| **Nhân viên** | Self-service | Xem hồ sơ cá nhân, số ngày phép, lịch sử lương, phiếu BHXH |

### 2.2 Jobs To Be Done

**HR Manager:**
- Biết ngay headcount thực tế vs kế hoạch theo từng phòng ban
- Xem biến động nhân sự (vào/ra/chuyển) theo tháng/quý
- Xuất báo cáo nhân sự định kỳ mà không cần compile thủ công

**HR Staff:**
- Tạo quyết định nhân sự (điều chuyển, tăng lương) và gửi duyệt trong < 5 phút
- Quản lý danh sách BHXH: ai vừa vào, ai vừa ra, ai tăng/giảm mức đóng
- Tính số ngày phép còn lại chính xác cho từng nhân viên, kể cả các policy đặc biệt (> 12 ngày/năm)

**Manager:**
- Phê duyệt quyết định nhân sự liên quan đến team mình
- Xem "health" của team: ai đang đào tạo, ai sắp hết hợp đồng

**Nhân viên:**
- Tự xem thông tin cá nhân, lịch sử công tác, số ngày phép
- Biết rõ đang đóng BHXH thế nào (số sổ, mức đóng, từ khi nào)

### 2.3 Non-Users (v4.0)

- **Kế toán** — phần tính toán BHXH + thuế TNCN đã nằm trong Epic 22 (Payroll Compliance)
- **Khách hàng / đối tác bên ngoài** — không có customer portal trong HR module
- **Tuyển dụng** — pipeline ứng viên thuộc Recruitment module (đã có)

### 2.4 Key User Journeys

**UJ-1. HR Staff tạo quyết định điều chuyển nhân viên**
- **Persona + context:** Chị Lan — HR Staff, nhận email từ Ban Giám Đốc về việc điều chuyển anh Minh từ Phòng Kỹ Thuật sang Phòng Sản Phẩm từ 01/06/2026.
- **Entry state:** Đã đăng nhập, vào module HR > Quyết định nhân sự.
- **Path:** (1) Chọn "Tạo quyết định mới" → loại TRANSFER. (2) Tìm kiếm nhân viên Minh Nguyễn. (3) Chọn đơn vị mới (Phòng Sản Phẩm), vị trí mới, ngày hiệu lực 01/06/2026. (4) Hệ thống tự điền số quyết định theo format. (5) Submit → workflow gửi Ban Giám Đốc duyệt.
- **Climax:** Ban Giám Đốc approve → hệ thống tự cập nhật OrgUnit của Minh, ghi vào Work History timeline, xuất PDF quyết định có số, ngày, chữ ký.
- **Resolution:** Chị Lan download PDF và gửi cho Minh qua email tích hợp. Hồ sơ Minh hiển thị sự kiện mới trong timeline.
- **Edge case:** Nếu Minh đang có đơn nghỉ phép chưa xử lý, hệ thống cảnh báo nhưng không chặn.

**UJ-2. HR Manager xem hồ sơ 360° nhân viên**
- **Persona + context:** Anh Hùng — HR Manager, cần review hồ sơ của một nhân viên trước buổi họp đánh giá.
- **Entry state:** Vào Personnel List, click vào tên nhân viên.
- **Path:** (1) Tab Overview: avatar, vị trí, phòng ban, ngày vào, liên hệ, thông tin nhân thân. (2) Tab Công tác: timeline dọc từ ngày vào đến nay — tất cả quyết định nhân sự. (3) Tab Lương: lịch sử mức lương, biểu đồ xu hướng. (4) Tab BHXH: số sổ, mức đóng, trạng thái. (5) Tab Đào tạo / Đánh giá.
- **Climax:** Anh Hùng có toàn bộ bức tranh trong < 2 phút mà không cần hỏi HR Staff hay mở Excel.
- **Resolution:** Từ màn hình profile, anh có thể tạo quyết định mới hoặc export hồ sơ PDF.

**UJ-3. HR Staff đăng ký BHXH cho nhân viên mới**
- **Persona + context:** Chị Lan, nhân viên mới Tuấn vừa ký hợp đồng, cần đăng ký BHXH trước ngày 10 tháng.
- **Entry state:** Vào HR > Bảo hiểm xã hội > Danh sách tham gia.
- **Path:** (1) Click "Thêm nhân viên". (2) Chọn Tuấn, mức lương đóng BHXH tự lấy từ hợp đồng. (3) Nhập số sổ BHXH (nếu đã có) hoặc để trống (chưa có sổ). (4) Ngày bắt đầu đóng. (5) Lưu.
- **Climax:** Tuấn xuất hiện trong danh sách BHXH tháng này. Export danh sách D02 tự động bao gồm Tuấn.
- **Resolution:** Kỳ lương tháng tới, hệ thống Epic 22 tự tính BHXH cho Tuấn theo mức đã cấu hình.

**UJ-4. HR Staff thiết lập ca làm việc cho phòng ban mới**
- **Persona + context:** Anh Quân — HR Staff, công ty vừa thành lập bộ phận Hỗ Trợ Khách Hàng làm việc theo 2 ca.
- **Entry state:** Vào HR > Cấu hình chấm công > Ca làm việc.
- **Path:** (1) Tạo Ca Sáng: 07:00–15:30, nghỉ trưa 30 phút. (2) Tạo Ca Chiều: 13:00–21:30, nghỉ 30 phút. (3) Vào Lịch làm việc → tạo "Lịch 2 ca xoay tuần". (4) Gán lịch này cho phòng HTBT.
- **Climax:** Nhân viên HTBT tự động được gán lịch 2 ca. Bảng công tháng 6 hiển thị đúng ca cho từng người.
- **Resolution:** Chấm công của nhân viên HTBT được tính giờ theo ca, OT được highlight đúng.

**UJ-5. Nhân viên kiểm tra số ngày phép còn lại**
- **Persona + context:** Anh Bình — nhân viên 4 năm thâm niên, muốn đăng ký nghỉ phép hè nhưng không biết còn bao nhiêu ngày.
- **Entry state:** Vào Self-service > tab Phép của tôi.
- **Path:** (1) Xem số liệu phép năm: tổng phép năm (4 năm thâm niên, chưa đủ 5 năm = 12 ngày cơ bản), đã dùng (5 ngày), còn lại (7 ngày), carry-over từ năm trước (2 ngày). (2) Xem lịch sử từng lần đã nghỉ.
- **Climax:** Anh Bình biết rõ còn 7 + 2 = 9 ngày phép khả dụng.
- **Resolution:** Click "Xin nghỉ phép" ngay từ màn hình này.

---

## 3. Glossary

- **OrgUnit** — Đơn vị tổ chức (phòng/ban/team). Có cây cha/con, mỗi OrgUnit có đúng một `Manager` (Employee) phụ trách.
- **Position (Vị trí biên chế)** — Slot trong cơ cấu tổ chức: code, chức danh, OrgUnit, headcount. Một Position có thể trống hoặc có người.
- **JobTitle (Chức danh)** — Tên chức vụ tiêu chuẩn (Kỹ sư phần mềm, Trưởng phòng, Giám đốc...). Nhiều Position có thể dùng cùng một JobTitle.
- **Employee (Nhân viên)** — Người lao động có hợp đồng với công ty. Tại một thời điểm chỉ chiếm một Position, thuộc một OrgUnit.
- **HrDecision (Quyết định nhân sự)** — Văn bản quyết định nhân sự có số, ngày, loại (HIRE/TRANSFER/SALARY_CHANGE/COMMENDATION/DISCIPLINE/TERMINATION), người ký, ngày hiệu lực. Mỗi quyết định khi được duyệt tự động cập nhật hồ sơ Employee.
- **WorkHistory** — Timeline các sự kiện trong vòng đời nhân viên: tất cả HrDecision + sự kiện hệ thống (contract signed, probation ended...).
- **Dependent (Người phụ thuộc)** — Thành viên gia đình nhân viên đủ điều kiện giảm trừ thuế TNCN hoặc hưởng quyền lợi BHYT.
- **InsuranceEnrollment** — Hồ sơ tham gia BHXH/BHYT/BHTN của một nhân viên: số sổ, mức lương đóng BHXH, ngày bắt đầu, trạng thái.
- **InsuranceEvent** — Biến động BHXH: ENROLL (tham gia mới), TERMINATE (nghỉ), SALARY_CHANGE (điều chỉnh mức đóng), SUSPEND (tạm dừng).
- **Shift (Ca làm việc)** — Cấu hình một ca: giờ vào, giờ ra, thời gian nghỉ. Ví dụ: Ca Sáng 08:00–17:00.
- **WorkSchedule (Lịch làm việc)** — Template lịch tuần: ngày nào ca nào. Gán cho OrgUnit hoặc nhân viên cụ thể.
- **LeavePolicy (Chính sách phép)** — Cấu hình phép năm: số ngày cơ bản, bonus theo thâm niên, giới hạn carry-over, áp dụng cho nhóm nhân viên nào.
- **LeaveBalance (Số dư phép)** — Số ngày phép năm còn lại của nhân viên: phép năm hiện tại + carry-over - đã dùng.
- **AttendanceRecord** — Bản ghi chấm công một ngày của một nhân viên: giờ vào, giờ ra, tổng giờ làm, loại (normal/OT/leave).
- **MonthlyAttendance** — Tổng hợp chấm công tháng: ngày công, ngày nghỉ phép, OT hours, vắng mặt.
- **D02-LT** — Biểu mẫu khai tăng/giảm/thay đổi lao động BHXH nộp cho cơ quan BHXH (theo Quyết định 595/QĐ-BHXH 2017). Nộp qua cổng VssID/IVAN trong tháng phát sinh sự kiện.

---

## 4. Features

### 4.1 Org Structure Nâng Cao

**Mô tả:** Nâng cấp cây tổ chức hiện tại để mỗi OrgUnit có Manager được chỉ định rõ ràng, cây cha/con hỗ trợ nhiều cấp không giới hạn, và lịch sử thay đổi manager được lưu lại. Org chart hiển thị manager tại mỗi nút. Realizes UJ-2.

**Functional Requirements:**

#### FR-1: Gán Manager cho OrgUnit
HR Staff có thể gán một Employee làm Manager của một OrgUnit (quan hệ 1 OrgUnit ↔ 1 Manager tại một thời điểm).

**Consequences:**
- Hệ thống lưu `managerId` và `managerSince` (ngày bắt đầu) vào OrgUnit record.
- Khi thay đổi Manager, lịch sử Manager cũ (ai, từ ngày nào đến ngày nào) được giữ lại và có thể tra cứu.
- Org chart hiển thị tên + avatar Manager tại mỗi nút OrgUnit.

**Out of Scope:** Acting manager (quyền manager tạm thời) — defer v4.1.

#### FR-2: Cây OrgUnit nhiều cấp
HR Staff có thể tạo/sửa OrgUnit với parent-child relation không giới hạn số cấp.

**Consequences:**
- API trả về cây OrgUnit dạng nested JSON (breadth-first, tối đa 10 cấp).
- Breadcrumb hiển thị đường dẫn đầy đủ: `Công ty > Khối Kỹ Thuật > Phòng Backend > Team API`.
- Khi xóa OrgUnit, hệ thống kiểm tra không có Employee đang active trong unit hoặc con của unit; nếu có, trả lỗi 409 với danh sách nhân viên cần chuyển trước.

#### FR-3: Headcount thực tế vs kế hoạch
HR Manager có thể xem headcount thực tế (số Employee active) vs headcount kế hoạch (Position.headcount) cho từng OrgUnit.

**Consequences:**
- Dashboard OrgUnit hiển thị: kế hoạch X người, thực tế Y người, trống Z vị trí.
- Drilldown: click vào "Z vị trí trống" → danh sách Position chưa có người.

#### FR-4: Xuất sơ đồ tổ chức PDF/PNG
HR Manager có thể export org chart hiện tại ra PDF hoặc PNG.

**Consequences:**
- Export bao gồm: tên đơn vị, tên Manager, số nhân viên, breadcrumb.
- PNG có độ phân giải ≥ 150 DPI, dùng được in A3.

---

### 4.2 Chức Danh & Vị Trí Biên Chế

**Mô tả:** Tách bạch JobTitle (tên chức danh tiêu chuẩn) và Position (vị trí biên chế cụ thể trong org chart). HR Staff quản lý danh mục chức danh và gán chức danh vào từng vị trí. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-5: Quản lý danh mục JobTitle
HR Staff có thể tạo, sửa, deactivate JobTitle (code, name, level/band, mô tả yêu cầu).

**Consequences:**
- Danh mục JobTitle toàn công ty, có filter theo level/band.
- Deactivate không xóa — JobTitle đã deactivate không hiển thị trong dropdown khi tạo Position mới, nhưng Position cũ vẫn tham chiếu đúng.
- Code phải unique trong hệ thống.

#### FR-6: Quản lý Position (Vị trí biên chế)
HR Staff có thể tạo Position với: code, JobTitle (FK), OrgUnit (FK), headcount, mô tả, ngày tạo.

**Consequences:**
- Position hiển thị trong Org Chart tương ứng với OrgUnit.
- Trạng thái tự động: `FILLED` (có Employee active assign), `VACANT` (headcount > số Employee active), `OVER_CAPACITY` (số Employee > headcount).
- Khi headcount = 0, Position không thể assign Employee.

#### FR-7: Gán Employee vào Position
HrDecision (HIRE hoặc POSITION_CHANGE) tự động gán Employee vào Position mới và release Position cũ.

**Consequences:**
- Mỗi Employee chỉ có một Position active tại một thời điểm.
- Lịch sử Position (ai giữ vị trí nào từ ngày nào đến ngày nào) được giữ lại.
- Position history có thể xem từ cả Profile Employee và từ Position detail.

#### FR-8: Tìm kiếm theo chức danh
HR Staff có thể filter danh sách nhân viên theo JobTitle, Position, hoặc OrgUnit.

**Consequences:**
- Filter multi-select: chọn nhiều JobTitle cùng lúc.
- Kết quả hiển thị: tên NV, phòng ban, chức danh, ngày vào.
- Export kết quả ra Excel.

---

### 4.3 Quyết Định Nhân Sự

**Mô tả:** Hệ thống quản lý toàn bộ vòng đời quyết định nhân sự — từ tạo, phê duyệt BPM, đến xuất PDF và cập nhật hồ sơ tự động. Đây là tính năng có giá trị nghiệp vụ cao nhất trong v4.0. Realizes UJ-1.

**Loại quyết định hỗ trợ:**

| Type | Tên VN | Trigger effect |
|------|--------|---------------|
| `HIRE` | Quyết định tuyển dụng | Tạo Employee, gán Position |
| `PROBATION_END` | Kết thúc thử việc | Cập nhật status Employee: PROBATION → ACTIVE |
| `TRANSFER` | Điều chuyển | Cập nhật OrgUnit + Position |
| `POSITION_CHANGE` | Thay đổi vị trí/chức danh | Cập nhật Position/JobTitle |
| `SALARY_CHANGE` | Điều chỉnh lương | Thêm SalaryRecord mới |
| `COMMENDATION` | Khen thưởng | Ghi nhận vào WorkHistory |
| `DISCIPLINE` | Kỷ luật | Ghi nhận vào WorkHistory, cập nhật DisciplineStatus nếu cần |
| `TERMINATION` | Chấm dứt hợp đồng | Deactivate Employee, release Position, kết thúc InsuranceEnrollment |
| `PROMOTION` | Thăng chức | Cập nhật JobTitle + Position + SalaryRecord (thường đi kèm) |
| `SECONDMENT` | Biệt phái | Cập nhật OrgUnit tạm thời, lưu OrgUnit gốc |

**Functional Requirements:**

#### FR-9: Tạo quyết định nhân sự
HR Staff có thể tạo HrDecision với các trường: loại, nhân viên liên quan, số quyết định, ngày ký, ngày hiệu lực, nội dung, người ký, ghi chú.

**Consequences:**
- Số quyết định auto-generate theo format: `QĐ-{TYPE_CODE}-{YYYY}-{SEQ}` (e.g., `QĐ-TC-2026-0042`). HR Staff có thể override nếu cần.
- Draft được lưu tự động mỗi 30 giây.
- Validation: ngày hiệu lực không được trước ngày ký.

#### FR-10: Workflow phê duyệt
Sau khi tạo, HR Staff submit quyết định vào BPM workflow.

**Consequences:**
- Mặc định sử dụng BPM process key `hr-decision-approval` (seed sẵn).
- **Approver matrix mặc định (configurable qua BPM):**

| Decision Type | Approver Level 1 | Approver Level 2 | Ghi chú |
|---|---|---|---|
| COMMENDATION | Manager trực tiếp | — | Chỉ 1 cấp |
| DISCIPLINE (khiển trách) | Manager trực tiếp | HR Manager | |
| DISCIPLINE (cách chức/sa thải) | Manager trực tiếp | HR Manager → CEO | 3 cấp |
| TRANSFER, POSITION_CHANGE | Manager trực tiếp | HR Manager | |
| SALARY_CHANGE, PROMOTION | Manager trực tiếp | HR Manager → CEO | 3 cấp nếu tăng >20% |
| HIRE, PROBATION_END | HR Staff (khởi tạo) | Manager trực tiếp | |
| TERMINATION | HR Staff (khởi tạo) | HR Manager → CEO | |
| SECONDMENT | Manager trực tiếp | HR Manager | |

- **Edge case:** Nếu nhân viên bị quyết định là người duy nhất trong approver chain (vd CEO quyết định về CEO) → hệ thống cảnh báo và yêu cầu chỉ định approver thay thế thủ công.
- **Timeout/Escalation:** Nếu approver không xử lý sau 3 ngày làm việc → tự động notify người quản lý cấp trên kế tiếp (cấu hình trong BPM).
- Khi approved: trigger effect tương ứng chạy tự động.
- Khi rejected: HR Staff nhận notification với lý do, quyết định trở về DRAFT.

#### FR-11: Xuất PDF quyết định
HR Staff và approver có thể xuất PDF của HrDecision đã được duyệt.

**Consequences:**
- PDF dùng template chuẩn VN: quốc hiệu, tiêu ngữ, tên công ty, số quyết định, ngày tháng năm, chức vụ người ký.
- Template khác nhau theo loại quyết định (TRANSFER khác COMMENDATION).
- [ASSUMPTION: Có thể customize template PDF theo từng tenant — chức năng template editor defer v4.2]
- PDF có watermark "CHÍNH THỨC" nếu đã approved, "BẢN NHÁP" nếu còn draft.

#### FR-12: Timeline quyết định trên hồ sơ nhân viên
Tất cả HrDecision đã approved của một Employee hiển thị dạng timeline trên trang Profile Employee, sắp xếp chronological.

**Consequences:**
- Mỗi item timeline: icon type, tên quyết định, ngày hiệu lực, tóm tắt (vd "Điều chuyển từ Phòng Kỹ Thuật → Phòng Sản Phẩm"), link xem chi tiết + tải PDF.
- Timeline bao gồm cả sự kiện hệ thống (contract signed, insurance enrolled...) không chỉ HrDecision.
- Filter timeline theo loại sự kiện.

#### FR-13: Tìm kiếm và lọc quyết định
HR Manager có thể tìm kiếm HrDecision theo nhân viên, loại, khoảng thời gian, trạng thái.

**Consequences:**
- Full-text search theo tên nhân viên, số quyết định.
- Filter: loại quyết định (multi-select), khoảng ngày hiệu lực, trạng thái (DRAFT/PENDING/APPROVED/REJECTED).
- Export danh sách ra Excel.

#### FR-14: Lịch sử lương tự động
Khi HrDecision loại SALARY_CHANGE hoặc PROMOTION được approve, hệ thống tự tạo SalaryRecord mới.

**Consequences:**
- SalaryRecord: employeeId, basicSalary, effectiveDate, source (HR_DECISION với decisionId), createdBy.
- Lịch sử lương hiển thị dạng bảng + biểu đồ line chart trên profile nhân viên.
- Epic 22 (Payroll) tự động dùng SalaryRecord có `effectiveDate` mới nhất ≤ ngày chạy lương.

---

### 4.4 Hồ Sơ Nhân Sự 360°

**Mô tả:** Trang profile nhân viên được redesign thành hub tập trung đầy đủ thông tin — cá nhân, công tác, lương, BHXH, đào tạo, đánh giá — tất cả trong một màn hình tabbed. Realizes UJ-2, UJ-5.

**Functional Requirements:**

#### FR-15: Thông tin cá nhân đầy đủ
Employee record mở rộng để lưu thông tin nhân thân đầy đủ theo yêu cầu pháp lý VN.

**Consequences:**
- Thêm fields: `idType` (CMND/CCCD/Passport), `idNumber`, `idIssueDate`, `idIssuePlace`, `permanentAddress`, `currentAddress`, `ethnicity`, `religion`, `nationality` (default VN), `bankAccount`, `bankName`.
- Validation: CCCD phải đúng 12 số; CMND 9 số.
- Sensitive fields (idNumber, bankAccount) chỉ HR Staff/Admin xem được; Employee tự xem thông tin mình.

#### FR-16: Quản lý người phụ thuộc
HR Staff và Employee (self) có thể thêm/sửa/xóa Dependent của Employee.

**Consequences:**
- Dependent: name, relationship (SPOUSE/CHILD/PARENT/SIBLING), dateOfBirth, idNumber (nếu có), taxReductionApplied (boolean), bhytBeneficiary (boolean).
- Danh sách Dependent tích hợp với Epic 22 (tính giảm trừ gia cảnh thuế TNCN: 4.4M/người/tháng).
- Cảnh báo nếu Dependent có `dateOfBirth` → tuổi > 18 và không phải học sinh/sinh viên (mất điều kiện giảm trừ).

#### FR-17: Tab Work History (Timeline công tác)
Profile Employee có tab "Công tác" hiển thị timeline đầy đủ tất cả sự kiện từ ngày vào đến nay.

**Consequences:**
- Nguồn sự kiện: tất cả HrDecision đã approved + contract events + insurance events + system events.
- Sắp xếp ngược thời gian (mới nhất trên đầu), có thể đảo ngược.
- Mỗi sự kiện: icon màu theo loại, tiêu đề, ngày, mô tả tóm tắt, link action (xem quyết định, tải PDF).
- Export timeline ra PDF "Tóm tắt quá trình công tác".

#### FR-18: Tab Salary History (Lịch sử lương)
Profile Employee có tab "Lương" hiển thị toàn bộ SalaryRecord.

**Consequences:**
- Bảng: ngày hiệu lực, mức lương cơ bản, % tăng so với lần trước, nguồn (quyết định số X).
- Line chart: biến động lương theo thời gian.
- Visible to: HR Staff, Manager trực tiếp (amount masked, chỉ thấy trend), Employee (own data).

#### FR-19: Tab Insurance History
Profile Employee có tab "Bảo hiểm" hiển thị InsuranceEnrollment và InsuranceEvent history.

**Consequences:**
- Hiển thị: số sổ BHXH, cơ quan cấp, ngày tham gia, mức lương đóng BHXH hiện tại, trạng thái.
- Timeline InsuranceEvent: tất cả biến động (enroll/adjust/terminate) với ngày và lý do.
- Link sang module BHXH để xem chi tiết hoặc tạo biến động mới.

#### FR-20: Xuất hồ sơ nhân viên PDF
HR Staff có thể export toàn bộ hồ sơ nhân viên ra PDF dạng "Lý lịch nhân sự".

**Consequences:**
- PDF bao gồm: thông tin cá nhân, quá trình công tác, quá trình lương, danh sách người phụ thuộc.
- Sensitive fields (idNumber, salary amount) có thể toggle ẩn/hiện trước khi export (dùng khi in nộp cơ quan vs in nội bộ).

---

### 4.5 Quản Lý Bảo Hiểm Xã Hội

**Mô tả:** Quản lý hồ sơ tham gia BHXH/BHYT/BHTN của toàn bộ lực lượng lao động — bao gồm đăng ký, biến động, sổ BHXH, và xuất danh sách D02 nộp cơ quan. Phần tính toán tỷ lệ đóng đã có trong Epic 22. Realizes UJ-3.

**Phân biệt scope với Epic 22:** Epic 22 tính *bao nhiêu tiền* cần đóng. HR-5 quản lý *ai đang đóng, từ khi nào, sổ số mấy, và xuất danh sách cho cơ quan BHXH.*

**Functional Requirements:**

#### FR-21: Đăng ký tham gia BHXH (Tăng lao động)
HR Staff có thể tạo InsuranceEnrollment mới cho Employee với loại ENROLL.

**Consequences:**
- Fields bắt buộc: employeeId, insuranceSalary (mức lương đóng BHXH), startDate, bhxhBookNumber (optional nếu chưa có sổ).
- Tự động tạo InsuranceEvent type=ENROLL với ngày tháng.
- Cảnh báo nếu startDate > ngày 10 của tháng (có thể trễ khai với cơ quan BHXH).
- Employee xuất hiện trong danh sách D02-LT tháng tương ứng.

#### FR-22: Điều chỉnh mức đóng BHXH
HR Staff có thể tạo InsuranceEvent type=SALARY_CHANGE để điều chỉnh insuranceSalary.

**Consequences:**
- Nhập: mức lương mới, ngày hiệu lực, lý do (SALARY_INCREASE / POSITION_CHANGE / OTHER).
- Nếu source là HrDecision SALARY_CHANGE, có thể link directly (auto-fill từ quyết định).
- Epic 22 tự động dùng insuranceSalary mới nhất khi tính BHXH cho kỳ lương tương ứng.

#### FR-23: Giảm lao động BHXH (Nghỉ việc)
Khi HrDecision TERMINATION được approve, hệ thống tự tạo InsuranceEvent type=TERMINATE.

**Consequences:**
- InsuranceEnrollment status → TERMINATED với `endDate` = ngày hiệu lực quyết định TERMINATION.
- HR Staff có thể tạo thủ công nếu cần (vd nghỉ không lương dài hạn).
- Employee bị terminate xuất hiện trong danh sách D02-LT giảm lao động tháng tương ứng.

#### FR-24: Quản lý sổ BHXH
HR Staff có thể ghi nhận thông tin sổ BHXH của Employee.

**Consequences:**
- SocialInsuranceBook: bookNumber, issueDate, issueAuthority, receivedByEmployee (boolean), receivedDate.
- Một Employee chỉ có một sổ BHXH active.
- Tra cứu theo bookNumber.
- Cảnh báo danh sách nhân viên active chưa có số sổ BHXH (cần làm thủ tục cấp sổ).

#### FR-25: Xuất danh sách D02-LT (Tờ khai tăng/giảm lao động)
HR Staff có thể xuất file Excel/CSV chuẩn D02-LT cho một tháng cụ thể.

**Consequences:**
- File bao gồm: danh sách tăng lao động (ENROLL), danh sách giảm lao động (TERMINATE), danh sách điều chỉnh mức đóng (SALARY_CHANGE) trong tháng.
- Format column theo mẫu D02-LT hiện hành (Quyết định 595/QĐ-BHXH 2017). Chi tiết format → addendum.md §A1.
- Preview danh sách trước khi export.
- Ghi log: ai export, lúc nào (audit trail).

#### FR-26: Dashboard BHXH tổng quan
HR Staff có thể xem tổng quan trạng thái BHXH toàn công ty.

**Consequences:**
- StatCards: tổng đang đóng BHXH, tháng này có bao nhiêu tăng/giảm/điều chỉnh.
- Cảnh báo: nhân viên active không có InsuranceEnrollment (chưa đăng ký), sổ chưa trả nhân viên.
- Filter theo OrgUnit.

---

### 4.6 Chấm Công Nâng Cao

**Mô tả:** Nâng cấp hệ thống chấm công — phần HR v4.0 sở hữu là **chính sách phép năm, LeaveBalance, bảng công, và ngày lễ**. Cấu hình ca/lịch làm việc (Shift, WorkSchedule) nằm trong **Timesheet module** (theo D-009); HR v4.0 đọc config đó qua service interface. Realizes UJ-4, UJ-5.

**Functional Requirements:**

#### FR-27: Tích hợp Shift/WorkSchedule từ Timesheet module `[BLOCKED_DEPENDENCY: Timesheet Enhancement Epic]`
HR v4.0 đọc cấu hình ca và lịch làm việc từ Timesheet module; HR Staff có thể gán WorkSchedule cho nhân viên qua HR Profile. **Không thể implement FR-27 trước khi Timesheet module bổ sung các API: `GET /timesheet/shifts`, `GET /timesheet/work-schedules`, `POST /timesheet/employees/{id}/work-schedule`.**

**Consequences (HR v4.0 side):**
- HR module hiển thị danh sách ca/lịch làm việc (read-only, fetch từ Timesheet service).
- Gán WorkSchedule cho nhân viên: thao tác qua HR Profile → gọi Timesheet service API để persist.
- Timesheet module cần bổ sung (Timesheet epic scope, không phải HR v4.0): `GET /shifts`, `GET /work-schedules`, `POST /employees/{id}/work-schedule`.

**Out of Scope HR v4.0:**
- Tạo/sửa Shift definition (Timesheet module)
- Tạo/sửa WorkSchedule template (Timesheet module)

#### FR-28: Cấu hình chính sách phép năm (LeavePolicy)
HR Manager có thể tạo/sửa LeavePolicy với các tham số linh hoạt.

**Consequences:**
- LeavePolicy fields:
  - `baseAnnualDays`: số ngày phép cơ bản/năm. Hỗ trợ 12/14/16 theo loại công việc (BLLĐ 2019 Điều 113).
  - `seniorityBonus`: array — vd `[{yearsFrom: 5, bonus: 1}, {yearsFrom: 10, bonus: 2}]`
  - `maxCarryOver`: số ngày tối đa carry-over sang năm mới (default 0)
  - `carryOverExpiry`: ngày hết hạn carry-over (vd 31/03 năm sau)
  - `carryOverExpiryAction`: CLEAR (xóa trắng, không thanh toán) | PAY_OUT (tự động tạo một khoản thanh toán pending cho HR xử lý) — default CLEAR
  - `probationPolicy`: phép trong thời gian thử việc (default: không có)
- Một Employee thuộc đúng một LeavePolicy (resolve theo OrgUnit, employee-level override ưu tiên hơn).
- Ví dụ: nhân viên 7 năm, baseAnnualDays=12, seniorityBonus=[{5,+1}] → 13 ngày/năm.

#### FR-29: Tính và hiển thị LeaveBalance
Hệ thống tự động tính LeaveBalance cho mỗi Employee theo LeavePolicy.

**Consequences:**
- LeaveBalance fields: currentYearEntitlement, usedDays, carryOverFromPrev, carryOverExpiry, remainingDays.

**Quy tắc tính (deterministic — không có ambiguity):**

1. **Entitlement năm mới:** `baseAnnualDays + seniorityBonus(floor(yearsOfService / 5))`. Accrual chạy vào 01/01 hàng năm.
2. **Nhân viên mới vào năm (pro-rata):** `ceil(entitlement * monthsRemainingInYear / 12)`. Tháng vào tính nếu vào trước ngày 16; không tính nếu từ ngày 16 trở đi.
3. **Carry-over từ năm trước:** Lấy min(`remainingDays cuối năm trước`, `maxCarryOver`). Carry-over = 0 nếu `maxCarryOver` = 0.
4. **Expiry enforcement:** Vào ngày `carryOverExpiry`: nếu `carryOverAction = CLEAR` → set carryOverFromPrev = 0; nếu `PAY_OUT` → tạo PayoutRequest pending (HR Staff xử lý thủ công).
5. **Khi LeaveRequest approved:** `usedDays += request.days`. `remainingDays = currentYearEntitlement + carryOverFromPrev - usedDays`.
6. **Khi LeavePolicy thay đổi cho một Employee/OrgUnit:** Tính lại entitlement từ 01/01 năm hiện tại; không hồi tố cho các năm trước.

**Ví dụ worked (nhân viên 7 năm, policy: baseAnnualDays=12, seniorityBonus=[{5,+1}], maxCarryOver=3, carryOverExpiry=31/03):**
- Entitlement 2026: 12 + 1 = 13 ngày
- Carry-over từ 2025: còn 4 ngày → min(4, 3) = 3 ngày. Hết hạn 31/03/2026.
- Đã dùng 5 ngày, tất cả trong tháng 2
- Tại 01/04/2026 (sau expiry): nếu carry-over còn 1 ngày chưa dùng → CLEAR → carryOverFromPrev = 0
- Remaining (từ 01/04): 13 - 5 = 8 ngày phép năm thực tế

- Self-service: nhân viên thấy breakdown rõ ràng theo ví dụ trên (UJ-5).

#### FR-30: Bảng công ngày (Daily AttendanceRecord) `[DEPENDENCY: Timesheet sync API — A-6]`
Hệ thống ghi AttendanceRecord hàng ngày cho mỗi Employee.

**Consequences:**
- Source chính: sync từ Timesheet check-in/check-out (hiện có). HR manual entry là fallback. [ASSUMPTION A-6: integration point cần confirm với Tech Lead]
- AttendanceRecord: employeeId, date, shiftId, checkIn, checkOut, totalHours, status (PRESENT/ABSENT/LEAVE/HOLIDAY/OT), leaveType.
- Hiển thị dạng calendar month view: mỗi ngày một ô màu (xanh=đi làm, vàng=phép, đỏ=vắng, xám=nghỉ lễ).

#### FR-31: Tổng hợp bảng công tháng (MonthlyAttendance)
Hệ thống tổng hợp MonthlyAttendance cho mỗi Employee hàng tháng.

**Consequences:**
- MonthlyAttendance: workDays, paidLeaveDays, unpaidLeaveDays, otHours, absentDays, holidayDays.
- HR Staff xem bảng công tổng hợp theo OrgUnit: mỗi nhân viên 1 dòng.
- Export Excel bảng công theo tháng (input cho payroll).
- Lock bảng công tháng: sau khi lock, không thể chỉnh sửa — audit trail ghi rõ ai lock lúc nào.

#### FR-32: Ngày lễ & ngày nghỉ bù
HR Admin cấu hình danh sách ngày lễ quốc gia và ngày nghỉ bù cho từng năm.

**Consequences:**
- HolidayCalendar: năm, date, name, type (NATIONAL_HOLIDAY/COMPENSATORY_DAY).
- Ngày lễ tự động đánh dấu trong bảng công.
- Seed sẵn ngày lễ quốc gia VN 2026–2027.

---

### 4.7 Import Lịch Sử Quyết Định Nhân Sự

**Mô tả:** Import tool cho phép HR Staff nhập lịch sử quyết định nhân sự (trước go-live) từ Excel vào hệ thống. Enables UJ-2 (Work History đầy đủ từ đầu). Realizes quyết định D-010.

**Functional Requirements:**

#### FR-33: Import lịch sử HrDecision từ Excel
HR Staff (Admin) có thể upload file Excel chứa lịch sử quyết định nhân sự.

**Consequences:**
- Template Excel có các cột: employeeCode, decisionType, decisionNumber, effectiveDate, fromOrgUnit, toOrgUnit, fromSalary, toSalary, notes.
- Validation trước import: kiểm tra employeeCode tồn tại, decisionType hợp lệ, ngày không xung đột.
- Preview: hiển thị N rows sẽ import, N rows lỗi (với lý do) trước khi confirm.
- Import lịch sử: status tự động set APPROVED (bypass workflow — đây là data migration), createdBy = admin user.
- Ghi AuditLog: ai import, khi nào, file hash, số records.
- [ASSUMPTION: Lịch sử import không trigger side effects (không tạo SalaryRecord retroactive trừ khi admin chọn)]

---

## 5. Non-Goals (Explicit)

- **Tính lương (Payroll):** Tính toán lương, BHXH, thuế TNCN đã có trong Epic 22. HR v4.0 KHÔNG thay đổi logic tính lương.
- **Recruitment pipeline:** Quản lý ứng viên, phỏng vấn thuộc Recruitment module (đã có). HR v4.0 không duplicate.
- **Biometric / chấm công máy chấm:** Tích hợp máy chấm công vật lý, fingerprint, face recognition — defer.
- **Mobile app HR:** App mobile riêng cho HR staff — defer v4.x mobile.
- **Template editor PDF:** Tùy chỉnh template PDF quyết định nhân sự qua UI — defer v4.2.
- **Acting Manager:** Manager tạm quyền khi manager chính vắng — defer v4.1.
- **Multi-site / địa điểm làm việc nhiều chi nhánh:** Chấm công theo địa điểm địa lý — defer.
- **Self-service xin nghỉ phép (Leave Request):** Đã có trong HR v1.0 (Epic 1). HR v4.0 chỉ bổ sung LeaveBalance/LeavePolicy, KHÔNG viết lại luồng xin nghỉ.

---

## 6. MVP Scope

### 6.1 In Scope (v4.0)

- FR-1 đến FR-33 (7 feature groups bao gồm Import lịch sử)
- Timesheet module enhancement (separate epic): Shift definition CRUD, WorkSchedule CRUD — cần triển khai song song với HR v4.0
- Seed data: ngày lễ quốc gia VN 2026–2027, 3 LeavePolicy mẫu (văn phòng 12 ngày, nặng nhọc 14 ngày, senior >5 năm 13 ngày), 10 leave types (addendum §A4)
- BPM workflow seed: `hr-decision-approval` với 2 cấp duyệt mặc định
- Migration script: Employee data hiện có → thêm fields nhân thân (optional, không breaking)
- Import tool: lịch sử HrDecision từ Excel (FR-33)
- Permission codes: bổ sung vào Epic 15 RBAC (addendum §A3)

### 6.2 Out of Scope for MVP

- Template editor PDF quyết định *(defer v4.2)*
- Acting Manager *(defer v4.1)*
- Tích hợp máy chấm công vật lý *(defer)*
- Export D02-LT format XML nộp trực tuyến *(defer v4.1 — Excel đủ cho pilot)*
- Mobile HR app *(defer)*
- Multi-site attendance theo địa lý *(defer)*
- `[NOTE FOR PM]` D02-LT XML là priority nếu khách hàng >200 NV cần nộp BHXH trực tuyến — revisit sau pilot

---

## 7. Success Metrics

**Primary**

- **SM-1:** HR Staff tạo và hoàn thành một quyết định điều chuyển (TRANSFER) trong < 5 phút (từ lúc mở form đến khi submit workflow). Validates FR-9, FR-10.
- **SM-2:** 100% Employee active có LeaveBalance được tính chính xác (sai số = 0 ngày) so với tính thủ công trên 30 test cases. Validates FR-30, FR-31.
- **SM-3:** Export D02-LT tháng hoàn thành trong < 30 giây cho tập dữ liệu ≤ 500 nhân viên. Validates FR-25.

**Secondary**

- **SM-4:** Tỷ lệ HR Staff dùng module Quyết định nhân sự ≥ 80% các quyết định nhân sự thực tế (thay vì làm Excel/Word bên ngoài) sau 3 tháng go-live.
- **SM-5:** Hồ sơ nhân viên 360° (FR-17 timeline) được xem ít nhất 1 lần/tháng/nhân viên bởi HR Staff hoặc Manager.
- **SM-6:** Bảng công tháng được lock bởi HR trước ngày 5 tháng sau (chỉ số adoption của FR-33).

**Counter-metrics (tránh)**

- **SM-C1:** Thời gian onboarding HR Staff mới với module ≤ 1 buổi training (4h). Nếu > 1 buổi → UX cần simplify. Counterbalances SM-1.
- **SM-C2:** Số lượng "override manual" (HR tự nhập AttendanceRecord thay vì sync từ Timesheet) không vượt quá 5% tổng record/tháng. Quá nhiều override = tích hợp Timesheet bị lỗi.

---

## 8. Open Questions

*Tất cả open questions đã được giải quyết trong session 2026-05-28. Xem chi tiết tại decision log.*

| # | Câu hỏi | Quyết định | Decision Log |
|---|---------|-----------|--------------|
| OQ-1 | Architecture Shift/WorkSchedule | Option B — Timesheet module sở hữu | D-009 |
| OQ-2 | Phép năm độc hại/nặng nhọc | LeavePolicy hỗ trợ 12/14/16 ngày | D-007 |
| OQ-3 | Import lịch sử HrDecision | Có, xây import tool (FR-33) | D-010 |
| OQ-4 | D02-LT format | Excel đủ cho pilot, XML defer v4.1 | D-011 |
| OQ-5 | Permission codes | 16 codes đề xuất trong addendum §A3 | D-012 |
| OQ-6 | Carry-over expiry thanh toán | Configurable: CLEAR hoặc PAY_OUT | D-013 |

**Remaining open items (technical, cần Tech Lead):**
- Timesheet module enhancement epic cần được tạo song song với HR v4.0 (FR-27 dependency)
- [ASSUMPTION A-6] confirm integration point AttendanceRecord ← Timesheet với Tech Lead

---

## 9. Assumptions Index

- **[ASSUMPTION A-1]** Template PDF quyết định nhân sự dùng format chuẩn VN (quốc hiệu, tiêu ngữ) nhưng không customizable qua UI trong v4.0. — từ FR-11.
- **[ASSUMPTION A-2]** D02-LT format theo Quyết định 595/QĐ-BHXH 2017. Cần verify thường xuyên khi pháp luật thay đổi. Chi tiết → addendum.md §A1.
- **[ASSUMPTION A-3]** Quy định ca: luật không giới hạn ca ≤12h tuyệt đối, nhưng giờ làm >8h là OT và chịu giới hạn OT 200h/năm (300h đặc biệt). Ca đêm 22h–6h có phụ cấp ≥30%. Xem addendum §A1 để tham khảo đầy đủ.
- **[ASSUMPTION A-4]** BPM workflow `hr-decision-approval` được seed sẵn với 2 cấp duyệt mặc định. Khách hàng có thể customize số cấp trong BPM module. — từ FR-10.
- **[ASSUMPTION A-5]** LeavePolicy carry-over: mặc định 0 (không carry-over). Công ty có thể cấu hình > 0 theo chính sách nội bộ. — từ FR-30.
- **[ASSUMPTION A-6]** AttendanceRecord source chính là Timesheet check-in/check-out hiện có. HR manual entry là fallback. Cần verify integration point với Timesheet module với Tech Lead. — từ FR-32.

---

## 10. Cross-Cutting NFRs

### Bảo mật & Phân quyền
- Employee profile đầy đủ (idNumber, salary, BHXH info): chỉ HR Staff và Admin đọc được. Manager chỉ đọc thông tin cấp dưới trực tiếp, salary bị mask.
- Employee chỉ đọc thông tin của chính mình qua Self-service.
- Mọi action thay đổi dữ liệu HR (tạo quyết định, cập nhật lương, thay đổi BHXH) ghi vào AuditLog.
- Export D02-LT ghi vào AuditLog: ai export, khi nào, file hash.

### Hiệu năng
- Danh sách nhân viên (up to 1000 người): load < 1.5s với pagination 50 records.
- Org chart render với 200 nodes: < 2s.
- Export Excel D02-LT 500 nhân viên: < 30s.
- API list endpoints: luôn có `page` + `limit` (theo coding standards hiện tại).

### Tích hợp nội bộ

| HR v4.0 | Connects to | Cách |
|---------|-------------|------|
| HrDecision SALARY_CHANGE | Epic 22 Payroll | Tạo SalaryRecord → Epic 22 đọc khi tính lương |
| InsuranceEnrollment | Epic 22 Payroll | insuranceSalary field → Epic 22 tính mức đóng |
| Dependent | Epic 22 Payroll | Số người phụ thuộc → Epic 22 tính giảm trừ TNCN |
| AttendanceRecord | Timesheet module | Timesheet record → source cho AttendanceRecord |
| HrDecision workflow | BPM module | Process key `hr-decision-approval` |
| HrDecision TERMINATION | Recruitment module | Không trigger tự động — HR xử lý thủ công |
| LeaveBalance | Leave Request (Epic 1) | LeaveRequest approved → trừ LeaveBalance |

### Compliance pháp lý VN
- Bộ Luật Lao Động 2019: phép năm tối thiểu 12 ngày, các loại nghỉ có hưởng lương (lễ, ốm, thai sản) không trừ vào phép năm.
- Dữ liệu nhân viên lưu tối thiểu 5 năm sau khi nghỉ việc (data retention).
- [ASSUMPTION A-2] D02-LT format theo QĐ 595/QĐ-BHXH — cần verify với legal thường xuyên.

---

## 11. Integration & Dependencies

| Phụ thuộc | Loại | Ghi chú |
|-----------|------|---------|
| Epic 22 (Payroll Compliance) | Upstream | Đã có SalaryRecord, InsuranceRate; HR v4.0 cần tạo SalaryRecord đúng cấu trúc |
| Epic 15 (RBAC) | Upstream | Cần thêm permission codes mới vào registry trước khi backend |
| BPM module (Epic 12) | Upstream | Cần seed `hr-decision-approval` workflow |
| Timesheet module (Epic 3) | Bidirectional | FR-32 AttendanceRecord ← Timesheet; FR-30 LeavePolicy → Leave Request |
| MinIO | Infrastructure | PDF quyết định lưu MinIO; certificate đào tạo đã lưu MinIO (giữ nguyên) |

---
