# Addendum — PRD: Loop HR v4.0

> Chứa nội dung nghiên cứu, context pháp lý, và quyết định thiết kế chi tiết không đặt trong PRD chính.

---

## A1. Nghiên cứu Pháp Lý VN — HR Module

*Nguồn: Bộ Luật Lao Động 2019 + Nghị định hướng dẫn + Quyết định BHXH*

### Quyết định nhân sự — Yêu cầu pháp lý

| Loại QĐ | Nội dung bắt buộc pháp lý |
|---------|--------------------------|
| Tuyển dụng / Ký HĐLĐ | Họ tên, CCCD, chức danh, bộ phận, mức lương, ngày bắt đầu, loại HĐLĐ (có/không xác định thời hạn), chữ ký 2 bên |
| Điều chuyển công tác | Lý do, vị trí cũ/mới, ngày hiệu lực. **Lưu ý:** nếu điều chuyển >60 ngày/năm phải thỏa thuận lại lương (Điều 29 BLLĐ 2019) |
| Nâng/điều chỉnh lương | Mức lương cũ, mới, ngày hiệu lực, căn cứ (đánh giá KPI / quy chế); lưu vào hồ sơ BHXH |
| Kỷ luật | Hình thức (khiển trách/kéo dài nâng lương/cách chức/sa thải), hành vi, biên bản họp, chữ ký NLĐ; **thời hiệu:** 6 tháng, vi phạm tài chính 12 tháng (Điều 123) |
| Chấm dứt HĐLĐ | Lý do (Điều 34–38–39), ngày chốt, trợ cấp thôi việc/mất việc, xác nhận thời gian làm để chốt BHXH |

---

### BHXH — Sự kiện và biểu mẫu

> **Correction:** Form đúng là **D02-LT** (không phải D02-TS như được ghi nhầm trong Assumption A-2 ban đầu).

**Sự kiện tăng lao động (mẫu D02-LT):**
- Ký HĐLĐ lần đầu / ký lại
- Chuyển từ thử việc sang chính thức
- Tiếp nhận từ đơn vị khác

**Sự kiện giảm lao động (mẫu D02-LT):**
- Nghỉ việc / chấm dứt HĐLĐ
- Nghỉ thai sản (tạm dừng đóng BHXH)
- Nghỉ ốm dài ngày ≥14 ngày liên tục

**Sự kiện thay đổi (mẫu D02-LT):**
- Điều chỉnh lương đóng BHXH
- Thay đổi chức danh ảnh hưởng mức đóng

**Thời hạn:** trong tháng phát sinh sự kiện; nộp qua cổng BHXH điện tử (VssID/IVAN).

---

### Phép năm — Quy định chi tiết (Điều 113 BLLĐ 2019)

| Loại | Ngày phép/năm |
|------|---------------|
| Điều kiện bình thường | 12 ngày |
| Công việc nặng nhọc / nguy hiểm | 14 ngày |
| Đặc biệt nặng nhọc / nguy hiểm, người khuyết tật | 16 ngày |
| Cộng thâm niên | +1 ngày / 5 năm thâm niên |

**Nghỉ có lương theo sự kiện (Điều 115) — KHÔNG trừ vào phép năm:**

| Sự kiện | Số ngày |
|---------|---------|
| Bản thân kết hôn | 3 ngày |
| Con kết hôn | 1 ngày |
| Cha/mẹ/vợ/chồng/con ruột mất | 3 ngày |
| Anh/chị/em ruột, ông/bà nội ngoại mất | 1 ngày |

**Nghỉ ốm (chế độ BHXH — không phải lương NSDLĐ):**
- Đóng BH < 15 năm: 30 ngày/năm
- 15–30 năm: 40 ngày/năm
- >30 năm: 60 ngày/năm
- Bệnh nặng (danh mục BYT): tối đa 180 ngày/năm
- Hưởng 75% lương đóng BHXH

**Thai sản:** 6 tháng (+ 1 tháng nếu sinh đôi trở lên); 100% lương bình quân BHXH 6 tháng trước.

---

### Ca làm việc — Quy định pháp lý (Điều 105–107 BLLĐ 2019)

| Quy định | Giá trị |
|----------|---------|
| Giờ làm bình thường | ≤8h/ngày, ≤48h/tuần |
| Nghỉ giữa ca (ban ngày) | ≥30 phút |
| Nghỉ giữa ca (ban đêm 22h–6h) | ≥45 phút |
| Nghỉ giữa 2 ca liên tiếp | ≥**12 giờ** |
| Làm thêm tối đa | 40h/tháng; 200h/năm (300h đặc biệt — Điều 107) |
| Hệ số lương OT | Ngày thường ≥150%; ngày nghỉ tuần ≥200%; ngày lễ/tết ≥300% |
| Phụ cấp ca đêm | +30% đơn giá tiền lương ban ngày |

---

## A2. Quyết định thiết kế — Chờ xác nhận

### Architecture Decision: HR-6 Chấm công vs Timesheet — **RESOLVED: Option B**

> **Quyết định D-009 (2026-05-28):** Option B được chọn — Timesheet module sở hữu Shift và WorkSchedule.

| Option | Pros | Cons |
|--------|------|------|
| A: HR module quản lý config, Timesheet consume | Rõ ràng domain boundary | Cross-module API call |
| **B: Merge config ca vào Timesheet module ✅ CHOSEN** | Single source of truth cho timesheet logic; internal simplicity | HR Staff phải dùng API cross-module khi gán lịch |

**Quyết định:** Option B. Timesheet module là nguồn sự thật duy nhất cho Shift, WorkSchedule, WorkScheduleAssignment.
**HR v4.0 scope:** Đọc config qua Timesheet API; FR-27 là integration adapter, không phải feature builder.
**Phụ thuộc bắt buộc:** Cần tạo "Timesheet Enhancement Epic" song song để build `GET /shifts`, `GET /work-schedules`, `POST /employees/{id}/work-schedule` trước khi FR-27 có thể implement.

---

## A3. Permission Codes cần bổ sung (Epic 15)

Danh sách đề xuất permission codes cho HR v4.0 — cần review với team trước khi implement backend:

```
hr:org:read           — Xem org chart, danh sách OrgUnit
hr:org:manage         — Tạo/sửa/xóa OrgUnit, gán manager
hr:positions:read     — Xem danh mục chức danh, position
hr:positions:manage   — Tạo/sửa position, gán employee
hr:decisions:read     — Xem quyết định nhân sự
hr:decisions:create   — Tạo quyết định nhân sự mới
hr:decisions:approve  — Phê duyệt quyết định (thường qua BPM, không trực tiếp)
hr:profile:read       — Xem hồ sơ nhân viên cơ bản (public info)
hr:profile:full       — Xem đầy đủ hồ sơ nhân viên (idNumber, salary, BHXH)
hr:dependents:manage  — Thêm/sửa/xóa người phụ thuộc
hr:insurance:read     — Xem thông tin BHXH
hr:insurance:manage   — Tạo enrollment, biến động BHXH
hr:insurance:export   — Export D02-LT
hr:attendance:config  — Cấu hình ca, lịch làm việc, chính sách phép
hr:attendance:read    — Xem bảng công
hr:attendance:manage  — Sửa AttendanceRecord, lock bảng công tháng
hr:leave-policy:manage — Tạo/sửa LeavePolicy
```

---

## A4. Leave Types cần seed (ngoài phép năm)

Dựa trên Điều 115 BLLĐ 2019, cần seed các loại nghỉ có lương (không trừ phép năm):

| Code | Tên | Số ngày | Ghi chú |
|------|-----|---------|---------|
| `ANNUAL` | Nghỉ phép năm | Theo LeavePolicy | Trừ vào LeaveBalance |
| `MARRIAGE_SELF` | Kết hôn (bản thân) | 3 | Theo luật, không trừ phép năm |
| `MARRIAGE_CHILD` | Con kết hôn | 1 | |
| `BEREAVEMENT_IMMEDIATE` | Tang ma (thân nhân trực tiếp) | 3 | Cha/mẹ/vợ/chồng/con |
| `BEREAVEMENT_EXTENDED` | Tang ma (thân nhân mở rộng) | 1 | Anh/chị/em, ông/bà |
| `SICK_SELF` | Nghỉ ốm (BHXH) | Theo chế độ BHXH | BHXH chi trả |
| `MATERNITY` | Thai sản | 6 tháng | BHXH chi trả |
| `PATERNITY` | Nghỉ của chồng khi vợ sinh | 5–14 ngày | Theo luật BHXH |
| `UNPAID` | Nghỉ không lương | Thỏa thuận | |
| `COMPENSATORY` | Nghỉ bù | Tương đương OT | Khi không nhận tiền OT |
