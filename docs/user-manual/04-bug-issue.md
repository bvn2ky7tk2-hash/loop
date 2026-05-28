# Chương 4 — Bug & Issue Tracking

---

## 4.1 Khái Niệm

Loop tích hợp hệ thống theo dõi Bug và Issue trực tiếp trong quản lý dự án:

| Loại | Ý nghĩa |
|------|---------|
| **BUG** | Lỗi phần mềm/sản phẩm cần sửa |
| **ISSUE** | Vấn đề nghiệp vụ, yêu cầu hỗ trợ |
| **CR** (Change Request) | Yêu cầu thay đổi (đánh dấu thêm bằng flag CR) |

### Mức độ nghiêm trọng (Severity)

| Mức | Màu | Ý nghĩa |
|-----|-----|---------|
| **CRITICAL** | Đỏ đậm | Ảnh hưởng nghiêm trọng, cần xử lý ngay |
| **HIGH** | Đỏ | Ảnh hưởng lớn, ưu tiên cao |
| **MEDIUM** | Cam | Ảnh hưởng vừa, xử lý trong sprint |
| **LOW** | Xanh | Ảnh hưởng nhỏ, xử lý khi có thể |

### Trạng thái Bug

| Trạng thái | Ý nghĩa |
|-----------|---------|
| **OPEN** | Vừa tạo, chưa phân công |
| **IN_PROGRESS** | Đang được xử lý |
| **RESOLVED** | Đã xử lý, chờ xác nhận |
| **CLOSED** | Đã đóng/xác nhận xong |
| **REOPENED** | Mở lại do chưa fix đúng |

---

## 4.2 Danh Sách Bug *(Tất cả người dùng)*

### Xem danh sách

Vào menu **Bug & Issue → Danh sách Bug**.

Thanh tóm tắt phía trên hiển thị:
- **Tổng bug** đang mở
- **Đang xử lý**
- **Critical** (cần xử lý ngay)

### Lọc bug

Dùng các bộ lọc:
- **Loại:** Bug / Issue / CR
- **Dự án**
- **Trạng thái**
- **Mức độ (Severity)**
- **Người tạo / Người xử lý**
- **Khoảng ngày tạo**

### Tạo bug/issue mới

1. Nhấn **+ Tạo Bug/Issue** → mở Drawer bên phải
2. Điền thông tin:
   - **Tiêu đề** *(bắt buộc)*
   - **Loại:** Bug hoặc Issue
   - **Mức độ:** Critical / High / Medium / Low
   - **Dự án liên quan**
   - **Người yêu cầu** (ai phát hiện/yêu cầu)
   - **Người xử lý** (ai sẽ fix)
   - **Deadline**
   - **Mô tả chi tiết**
   - **Task liên kết** (nếu bug thuộc task cụ thể)
   - **Đánh dấu CR** (Change Request) nếu cần
3. Nhấn **Tạo**

### Xem chi tiết bug

Nhấn vào tên bug → mở **Drawer chi tiết** với:
- Thông tin đầy đủ
- **Lịch sử thay đổi**
- **Bình luận** (thêm comment để trao đổi)
- **File đính kèm** (ảnh chụp màn hình, log file)

---

## 4.3 Bug Của Tôi *(Tất cả người dùng)*

Vào menu **Bug & Issue → Bug của tôi** để xem danh sách bug đang được assign cho bạn.

Đây là shortcut để tập trung vào công việc cần làm mà không bị phân tâm bởi bug của người khác.

---

## 4.4 Dashboard Bug *(Tất cả người dùng)*

Vào menu **Bug & Issue → Dashboard** để xem phân tích tổng quan:

### Các biểu đồ

| Biểu đồ | Nội dung |
|---------|---------|
| **Donut chart** | Phân bổ bug theo trạng thái |
| **Bar chart mức độ** | Số bug theo severity (Critical/High/Medium/Low) |
| **Top dự án** | Dự án có nhiều bug nhất |
| **Task nhiều bug** | Task đang có nhiều vấn đề nhất |
| **Theo nhân sự** | Ai đang xử lý bao nhiêu bug |
| **Xu hướng 30 ngày** | Biểu đồ đường số bug tạo mới và đóng mỗi ngày |

### Lọc theo dự án

Chọn dự án cụ thể ở dropdown phía trên để xem dashboard riêng cho dự án đó.

---

## 4.5 Quy Trình Xử Lý Bug Điển Hình

```
1. Phát hiện bug
   └─ Tạo Bug/Issue với đầy đủ thông tin, severity phù hợp

2. PM/Lead phân công
   └─ Gán Người xử lý, đặt deadline

3. Dev xử lý
   └─ Cập nhật trạng thái → IN_PROGRESS
   └─ Comment tiến độ, đính kèm ảnh/log

4. Fix xong
   └─ Cập nhật → RESOLVED
   └─ Thêm comment mô tả cách fix

5. Xác nhận
   └─ Người yêu cầu kiểm tra → đóng → CLOSED
   └─ Nếu chưa đúng → REOPENED → quay lại bước 3
```
