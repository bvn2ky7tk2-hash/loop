# Chương 5 — Quy Trình BPMN, Báo Cáo & Cài Đặt

---

## 5.1 Quy Trình BPMN

Loop tích hợp engine BPMN để tự động hóa các quy trình nghiệp vụ (phê duyệt, onboarding, v.v.).

### Vai trò trong Quy trình

| Vai trò | Quyền |
|---------|-------|
| **ADMIN** | Tạo, sửa, kích hoạt, khởi động quy trình |
| **PM** | Xem danh sách instance đang chạy |
| **Tất cả** | Xử lý task trong **Hộp thư đến** |

---

### 5.1.1 Quản Lý Định Nghĩa Quy Trình *(ADMIN)*

Vào menu **Quy trình → Định nghĩa**.

#### Tạo quy trình mới

1. Nhấn **+ Tạo quy trình**
2. Nhập tên và mô tả
3. Nhấn **Tạo** → quy trình ở trạng thái **DRAFT**

#### Thiết kế sơ đồ BPMN

1. Nhấn vào **tên quy trình** → mở **BPMN Modeler**
2. Kéo thả các phần tử (Start Event, Task, Gateway, End Event...) để vẽ luồng
3. Nhấn **Lưu** khi xong

#### Cấu hình trường nhập liệu

Trong drawer chi tiết quy trình, tab **Trường nhập liệu:**
- Thêm các trường dữ liệu người dùng cần điền khi khởi động quy trình
- Ví dụ: Tên dự án, Lý do, Ngân sách...

#### Kích hoạt / Hủy kích hoạt

- Nhấn **Kích hoạt** → quy trình chuyển sang **ACTIVE**, có thể khởi động instance
- Nhấn **Hủy kích hoạt** → chuyển về **DRAFT** (các instance đang chạy không bị ảnh hưởng)

#### Khởi động instance mới

1. Nhấn **▶ Chạy** trên quy trình ACTIVE
2. Điền các biến đầu vào (theo cấu hình trường)
3. Nhấn **Khởi động**

---

### 5.1.2 Theo Dõi Instance *(ADMIN / PM)*

Vào menu **Quy trình → Đang chạy** để xem tất cả instance.

Nhấn vào một instance để mở **Monitor**, xem:
- Vị trí hiện tại trong sơ đồ BPMN (bước nào đang chạy)
- Lịch sử các bước đã hoàn thành
- Biến dữ liệu hiện tại

---

### 5.1.3 Hộp Thư Đến *(Tất cả người dùng)*

Vào menu **Quy trình → Hộp thư đến** để xem các **task quy trình** đang chờ bạn xử lý.

Đây là nơi bạn nhận và xử lý các bước được giao trong luồng BPMN — ví dụ: phê duyệt đơn, điền form, xác nhận thông tin.

Với mỗi task:
1. Xem mô tả và dữ liệu đầu vào
2. Điền form (nếu có)
3. Nhấn **Hoàn thành** → luồng tiếp tục chạy bước tiếp theo

---

## 5.2 Báo Cáo *(ADMIN / PM / LEADERSHIP)*

Vào menu **Báo cáo** — gồm 3 tab:

### Tab 1: Giờ Làm Việc

- **Biểu đồ cột (Bar):** Top 10 nhân sự làm nhiều giờ nhất
- **Biểu đồ đường (Line):** Giờ làm theo tháng trong 6 tháng gần nhất
- **Bảng:** Chi tiết tổng giờ từng nhân sự

### Tab 2: Tiến Độ Dự Án

1. Chọn **Dự án** từ dropdown
2. Xem **KPI:** Giờ ước tính / Thực tế / Hoàn thành / Tiến độ %
3. **Biểu đồ Burndown:** Lũy kế giờ làm thực tế vs kế hoạch theo thời gian

### Tab 3: Theo Đơn Vị

- Biểu đồ cột so sánh số nhân sự và dự án giữa các phòng ban
- Bảng chi tiết nhân sự, dự án theo từng đơn vị

### Export báo cáo (.xlsx)

1. Nhấn **Export** ở góc trên
2. Chọn **Loại báo cáo:**
   - Chi phí dự án
   - Phân bổ nhân sự
   - Tiến độ task
   - Tổng hợp bảng công
   - Lịch sử cảnh báo
3. Chọn **Kỳ báo cáo** (khoảng ngày)
4. Nhấn **Tải xuống** → file .xlsx được tải về máy

---

## 5.3 Cảnh Báo *(ADMIN)*

Vào menu **Cảnh báo** — gồm 2 tab:

### Tab 1: Cấu Hình Cảnh Báo

Tạo cảnh báo tự động để không bỏ sót sự kiện quan trọng:

1. Chọn **Dự án**
2. Nhấn **+ Tạo cảnh báo**
3. Chọn **Loại cảnh báo:**

| Loại | Khi nào gửi |
|------|-------------|
| TASK_OVERDUE | Task đã quá deadline |
| TASK_DUE_TODAY | Task đến hạn hôm nay |
| TASK_DUE_SOON | Task sắp đến hạn (N ngày trước) |
| TASK_APPROVED | Task được duyệt |
| TASK_RETURNED | Task bị trả lại |
| TASK_CANCELLED | Task bị hủy |
| BUDGET_EXCEEDED | Chi phí vượt budget |
| ALLOCATION_CONFLICT | Xung đột phân bổ nhân sự |

4. Thiết lập ngưỡng (ví dụ: cảnh báo trước 2 ngày)
5. Bật/tắt bằng switch **Kích hoạt**

### Tab 2: Thông Báo

Xem toàn bộ thông báo đã nhận, đánh dấu đã đọc.

---

## 5.4 Cài Đặt Hệ Thống *(ADMIN)*

Vào menu **Cài đặt** — gồm 3 tab:

### Tab 1: Người Dùng

Quản lý tài khoản đăng nhập:
- **Tạo người dùng:** Link với nhân sự, nhập email, mật khẩu, vai trò, đơn vị
- **Sửa:** Cập nhật thông tin, đổi vai trò
- **Đổi mật khẩu:** Modal nhập mật khẩu mới
- **Khóa/Mở khóa:** Dùng switch để tạm khóa tài khoản

### Tab 2: Cấu Hình Cảnh Báo

Quản lý cảnh báo (tương tự trang Cảnh báo).

### Tab 3: Tích Hợp *(ADMIN / PM)*

Cấu hình tích hợp Telegram để nhận thông báo qua bot:
1. Nhập **Bot Token** từ BotFather
2. Nhập **Chat ID** (nhóm hoặc người dùng nhận thông báo)
3. Nhấn **Lưu**

Sau khi cấu hình, các sự kiện (task mới, deadline, v.v.) sẽ được đẩy tự động qua Telegram.

---

## 5.5 Tóm Tắt Theo Vai Trò

### Nhân viên (MEMBER) — Việc hàng ngày

1. Vào **Kanban** → kéo task sang IN_PROGRESS khi bắt đầu
2. Cập nhật **tiến độ %** thường xuyên
3. Khi xong → kéo sang **PENDING_APPROVAL** (chờ PM duyệt)
4. Cuối tháng → vào **Bảng công** kiểm tra và **Nộp bảng công**
5. Khi có bug giao → vào **Bug của tôi** để xử lý
6. Kiểm tra **Hộp thư đến** (Quy trình) nếu có task cần phê duyệt

### PM — Việc hàng ngày

1. Vào **Dashboard** xem tổng quan dự án
2. Tab **Phê duyệt** trong Công việc → duyệt task chờ
3. **Duyệt bảng công** nhân viên trong team
4. Theo dõi **Gantt** để phát hiện rủi ro timeline
5. Xem **Chi phí** so với budget

### ADMIN — Việc định kỳ

1. Quản lý **Người dùng** và **Nhân sự**
2. Tạo/cập nhật **Quy trình BPMN** khi có quy trình mới
3. Cấu hình **Cảnh báo** cho từng dự án
4. Export **Báo cáo** theo yêu cầu ban lãnh đạo
