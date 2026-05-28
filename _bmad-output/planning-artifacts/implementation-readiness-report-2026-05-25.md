---
stepsCompleted: ["step-01-document-discovery", "step-02-prd-analysis", "step-03-epic-coverage-validation", "step-04-ux-alignment", "step-05-epic-quality-review", "step-06-final-assessment"]
filesIncluded:
  prd: "_bmad-output/planning-artifacts/prds/prd-Loop-2026-05-25/prd.md"
  architecture: null
  epics: null
  ux: null
---

# Implementation Readiness Assessment Report

**Date:** 2026-05-25
**Project:** Loop

---

## Document Inventory

| Loại | File | Trạng thái |
|---|---|---|
| PRD | `prds/prd-Loop-2026-05-25/prd.md` | ✅ Có |
| Architecture | — | ❌ Chưa có |
| Epics & Stories | — | ❌ Chưa có |
| UX Design | — | ❌ Chưa có |

---

## PRD Analysis

### Functional Requirements (21 FRs)

| ID | Tên | Module |
|---|---|---|
| FR-001 | Quản lý Org Tree — Admin CRUD đơn vị tổ chức cha-con (tên, mã, đơn vị cha) | Org Tree |
| FR-002 | Gán người dùng vào đơn vị — Admin gán user vào org unit + role; thay đổi không ảnh hưởng lịch sử | Org Tree |
| FR-003 | Gán dự án vào đơn vị — PM gán khi tạo dự án; Admin có thể reassign | Org Tree |
| FR-101 | Hồ sơ nhân sự — mã, họ tên, ngày sinh, tech stack, level (Junior/Mid/Senior/Expert), CCCD, ngày/nơi cấp, lịch sử dự án (read-only) | Nhân sự |
| FR-102 | Lịch sử Rate — append-only theo ngày hiệu lực (man-day), gắn level, override được per person | Nhân sự |
| FR-201 | Danh sách dự án — mã, tên, loại (OSDC/Pkg), khách hàng, ngân sách (VND/USD), effort ngân sách (man-month), ngày bắt đầu/kết thúc, trạng thái (Planning/Active/On Hold/Closed) | Dự án |
| FR-202 | Load nhân sự vào dự án — role, level, % allocation, ngày vào/ra, rate man-day (kéo từ hồ sơ, override được); validation allocation theo ngày làm việc thực tế ≤ 100% | Dự án |
| FR-301 | Cấu trúc Task — phân cấp tối đa 5 level; trường: tiêu đề, mô tả, người thực hiện, deadline, trạng thái, estimate (MH, tối đa theo cấu hình), effort thực tế (MH), task cha | Task |
| FR-302 | Tạo & Duyệt Task — PM tạo → To Do ngay; Member tạo → Chờ duyệt → PM: Duyệt/Trả lại (Member sửa được)/Huỷ (không sửa được); thông báo hai chiều | Task |
| FR-303 | Tính tiến độ — task lá: % cập nhật trực tiếp; task cha: trung bình c�� trọng số theo estimate của con, roll-up đến root; tiến độ dự án = trung bình có trọng số tất cả task root | Task |
| FR-401 | Chi phí thực tế — Σ (effort thực tế × rate man-day theo giai đoạn); 1 MD = 8 MH; 1 MM = 21 MD = 168 MH; dùng rate đúng giai đoạn theo lịch sử | Chi phí |
| FR-402 | Tỷ lệ chi phí — hiển thị: chi phí thực tế / ngân sách (%); effort thực tế (MD) / effort ngân sách (MD, quy từ MM × 21) | Chi phí |
| FR-403 | Phạm vi tính chi phí — chỉ theo dõi thực tế; không có forecast trong v1 | Chi phí |
| FR-501 | Cấu hình ngưỡng cảnh báo — 5 tham số cấu hình độc lập: ngày sắp đến hạn task (mặc định 3), ngày sắp hết dự án (7), ngưỡng ngân sách % (80%), ngưỡng effort % (80%), giới hạn estimate task MH (4h) | Cảnh báo |
| FR-502 | Cảnh báo Task — quá hạn (deadline qua, chưa Done); đến hạn hôm nay; sắp đến hạn (N ngày cấu hình được) → PM + Member được giao | Cảnh báo |
| FR-503 | Cảnh báo Nguồn lực — overload allocation; sắp hết dự án (N ngày); effort vượt ngân sách; effort sắp chạm ngân sách (X%) | Cảnh báo |
| FR-504 | Cảnh báo Ngân sách — vượt ngân sách tiền; sắp chạm ngân sách (X%) | Cảnh báo |
| FR-505 | Kênh thông báo — in-app (web + mobile); push notification mobile; email | Cảnh báo |
| FR-601 | Dashboard Lãnh đạo — số dự án theo trạng thái; dự án over/near budget; nhân sự free; nhân sự < 100% allocation; nhân sự sắp hết dự án; tổng effort tiêu / ngân sách | Dashboard |
| FR-602 | Dashboard Dự án (PM) — tiến độ tổng thể; chi phí vs ngân sách; effort vs ngân sách; cảnh báo active; danh sách nhân sự + allocation + ngày hết hạn | Dashboard |
| FR-603 | Cấu hình tham số báo cáo — 4 báo cáo với tham số riêng; export Excel (.xlsx) | Báo cáo |

**Tổng FRs: 21**

---

### Non-Functional Requirements (4 NFRs)

| ID | Nội dung |
|---|---|
| NFR-01 | Nền tảng: Web (browser) + Mobile (iOS + Android). Mobile ưu tiên Member (task) và PM (cảnh báo). |
| NFR-02 | Phân quyền theo Org Tree: visibility hierarchical; CCCD chỉ Admin; Rate/lịch sử rate: Admin (toàn hệ), PM (đơn vị mình), Leadership (phạm vi đơn vị); Chi phí: Admin, PM (dự án mình), Leadership (phạm vi). |
| NFR-03 | Toàn vẹn Allocation: không vượt 100% trên bất kỳ ngày làm việc nào (bỏ T7/CN) khi thời gian chồng nhau; validation tại save; hiển thị ngày và dự án xung đột. |
| NFR-04 | Lịch sử & Audit: rate history append-only; chi phí tính lại theo lịch sử khi cần. |

**Tổng NFRs: 4**

---

### Ràng buộc & Câu hỏi Mở

**Ràng buộc đã xác nhận:**
- Không tích hợp hệ thống ngoài trong v1
- Không có forecast chi phí trong v1
- 1 man-day = 8 man-hour; 1 man-month = 21 man-day

**Câu hỏi mở (chưa chặn thiết kế):**
- OQ-09: SMTP email — địa chỉ gửi, dịch vụ email
- OQ-15: Format cột/sheet Excel export

---

## Epic Coverage Validation

### Coverage Matrix

| FR | Tên ngắn | Epic Coverage | Trạng thái |
|---|---|---|---|
| FR-001 | Quản lý Org Tree | Chưa có epics | ❌ CHƯA CÓ |
| FR-002 | Gán người dùng vào đơn vị | Chưa có epics | ❌ CHƯA CÓ |
| FR-003 | Gán dự án vào đơn vị | Chưa có epics | ❌ CHƯA CÓ |
| FR-101 | Hồ sơ nhân sự | Chưa có epics | ❌ CHƯA CÓ |
| FR-102 | Lịch sử Rate | Chưa có epics | ❌ CHƯA CÓ |
| FR-201 | Danh sách dự án | Chưa có epics | ❌ CHƯA CÓ |
| FR-202 | Load nhân sự + allocation validation | Chưa có epics | ❌ CHƯA CÓ |
| FR-301 | Cấu trúc Task 5 levels | Chưa có epics | ❌ CHƯA CÓ |
| FR-302 | Tạo & Duyệt Task workflow | Chưa có epics | ❌ CHƯA CÓ |
| FR-303 | Tính tiến đ�� roll-up | Chưa có epics | ❌ CHƯA CÓ |
| FR-401 | Chi phí thực tế | Chưa có epics | ❌ CHƯA CÓ |
| FR-402 | Tỷ lệ chi phí | Chưa có epics | ❌ CHƯA CÓ |
| FR-403 | Phạm vi tính chi phí | Chưa có epics | ❌ CHƯA CÓ |
| FR-501 | Cấu hình ngưỡng cảnh báo | Chưa có epics | ❌ CHƯA CÓ |
| FR-502 | Cảnh báo Task | Chưa có epics | ❌ CHƯA CÓ |
| FR-503 | Cảnh báo Nguồn lực | Chưa có epics | ❌ CHƯA CÓ |
| FR-504 | Cảnh báo Ngân sách | Chưa có epics | ❌ CHƯA CÓ |
| FR-505 | Kênh thông báo | Chưa có epics | ❌ CHƯA CÓ |
| FR-601 | Dashboard Lãnh đạo | Chưa có epics | ❌ CHƯA CÓ |
| FR-602 | Dashboard Dự án PM | Chưa có epics | ❌ CHƯA CÓ |
| FR-603 | Báo cáo & Export Excel | Chưa có epics | ❌ CHƯA CÓ |

### Coverage Statistics

- Tổng PRD FRs: **21**
- FRs có trong epics: **0**
- Coverage: **0%** — Tài liệu Epics & Stories chưa được tạo

---

## UX Alignment Assessment

### UX Document Status

❌ **Không tìm thấy** tài liệu UX Design

### Đánh giá UX có cần thiết không

PRD rõ ràng yêu cầu UI người dùng:
- NFR-01: Web (browser) + Mobile (iOS + Android)
- 4 nhóm người dùng với màn hình riêng (Admin, PM, Member, Leadership)
- Dashboard, task management, báo cáo — tất cả đều là UI-heavy flows

→ **UX documentation là cần thiết** cho sản phẩm này.

### Warnings

⚠️ **WARNING — UX chưa được tạo:** Loop là ứng dụng Web + Mobile với 4 nhóm người dùng và nhiều flow phức tạp (task approval workflow, allocation validation, dashboard). Thiếu UX spec sẽ dẫn đến rủi ro về trải nghiệm người dùng và tốn chi phí làm lại sau khi dev xong.

**Các màn hình/flow quan trọng cần UX trước khi dev:**
- Flow task approval (Chờ duyệt → Trả lại → Duyệt/Huỷ)
- Allocation validation warning UI (hiển thị ngày xung đột)
- Dashboard lãnh đạo (layout các widget)
- Mobile experience cho Member (task view, cập nhật tiến độ)

---

## Epic Quality Review

❌ **Không thể thực hiện** — Tài liệu Epics & Stories chưa được tạo.

Không có epic nào để review. Toàn bộ 21 FRs cần được tổ chức thành epics và stories trước khi có thể đánh giá chất lượng.

---

## Summary and Recommendations

### Overall Readiness Status

## 🔴 NOT READY — Thiếu 3/4 tài liệu bắt buộc

| Artifact | Trạng thái | Chất lượng |
|---|---|---|
| PRD | ✅ Hoàn thành | Tốt — 21 FRs rõ ràng, logic chặt chẽ |
| Architecture | ❌ Chưa có | — |
| UX Design | ❌ Chưa có | — |
| Epics & Stories | ❌ Chưa có | — |

---

### Điểm mạnh của PRD hiện tại

PRD Loop đã được xây dựng tốt và sẵn sàng để làm nền tảng cho các bước tiếp theo:
- Logic allocation validation theo ngày làm việc thực tế rõ ràng và chính xác
- Cost calculation với rate history append-only được thiết kế đúng
- Org tree permission model được mô tả đầy đủ
- Task approval workflow có 3 nhánh rõ ràng
- Tất cả ngưỡng cảnh báo đều cấu hình được

---

### Critical Issues Requiring Immediate Action

**1. 🔴 Architecture chưa được tạo**
21 FRs cần được dịch sang quyết định kỹ thuật trước khi dev bắt đầu. Các vấn đề kiến trúc cần giải quyết:
- Stack công nghệ (Web + Mobile)
- Data model cho org tree, rate history, task hierarchy
- Allocation validation engine (xử lý theo ngày)
- Cost calculation với rate theo giai đoạn
- Notification system (in-app + push + email)

**2. 🔴 Epics & Stories chưa được tạo**
0/21 FRs được coverage. Không thể bắt đầu implementation mà không có stories.

**3. ⚠️ UX Design chưa được tạo**
4 flows quan trọng cần UX spec trước khi dev:
- Task approval workflow
- Allocation conflict warning
- Dashboard layout (Leadership + PM)
- Mobile task view (Member)

---

### Recommended Next Steps

1. **Tạo Architecture** — Gọi Winston: `bmad-create-architecture` với PRD này làm input
2. **Tạo UX Design** — Gọi `bmad-create-ux-design` cho các flows ưu tiên cao
3. **Tạo Epics & Stories** — Gọi `bmad-create-epics-and-stories` sau khi có Architecture
4. **Chạy lại Implementation Readiness** — Sau khi 3 bước trên hoàn thành

---

### Final Note

Assessment này xác định **3 vấn đề** thuộc **3 nhóm artifact**. PRD đã hoàn chỉnh và chất lượng tốt — đây là nền tảng vững chắc. Bước tiếp theo có độ ưu tiên cao nhất là **Architecture**, vì nó unblocks cả UX và Epics & Stories.

*Assessor: Winston — System Architect | 2026-05-25*
