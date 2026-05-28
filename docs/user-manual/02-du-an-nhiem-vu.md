# Chương 2 — Quản Lý Dự Án & Nhiệm Vụ

---

## 2.1 Nhân Sự *(ADMIN / PM / LEADERSHIP)*

### Xem danh sách nhân sự

Vào menu **Nhân sự**. Trang gồm hai phần:
- **Bên trái:** Cây cơ cấu tổ chức (phòng ban, đơn vị)
- **Bên phải:** Danh sách nhân sự thuộc đơn vị đang chọn

**Lọc nhân sự:** Dùng thanh lọc phía trên bảng để lọc theo tên, cấp độ, tech stack, hoặc chỉ xem nhân sự đang rảnh (chưa phân bổ dự án).

### Tạo nhân sự mới *(ADMIN / PM)*

1. Nhấn **+ Thêm nhân sự**
2. Điền thông tin: Họ tên, Cấp độ, Phòng ban, Ngày vào làm, Tech stack, Email, CCCD
3. Nhấn **Lưu**

### Xem chi tiết nhân sự

Nhấn vào tên nhân sự để mở **Drawer chi tiết**, gồm 3 tab:
- **Thông tin:** Thông tin cá nhân, vị trí, liên lạc
- **Lịch sử lương:** Các mức lương theo thời gian
- **Dự án:** Danh sách dự án đang/đã tham gia

### Quản lý đơn vị tổ chức *(ADMIN)*

Nhấp phải vào đơn vị trong cây bên trái để **Tạo / Sửa / Xóa** đơn vị con.

---

## 2.2 Quản Lý Dự Án *(ADMIN / PM)*

### Xem danh sách dự án

Vào menu **Dự án**. Dùng thanh lọc để tìm theo tên/mã, trạng thái, hoặc loại dự án.

### Tạo dự án mới

1. Nhấn **+ Tạo dự án**
2. Điền thông tin bắt buộc:
   - **Mã dự án** (VD: PRJ-001)
   - **Tên dự án**
   - **Loại** (T&M, Fixed Price, Internal...)
   - **PM phụ trách**
   - **Khách hàng**
   - **Ngày bắt đầu / Kết thúc**
   - **Budget** (tùy chọn)
3. Nhấn **Tạo**

### Trạng thái dự án

| Trạng thái | Ý nghĩa |
|-----------|---------|
| **PLANNING** | Đang lên kế hoạch, chưa triển khai |
| **ACTIVE** | Đang triển khai |
| **ON_HOLD** | Tạm dừng |
| **CLOSED** | Đã kết thúc |

Nhấn vào **trạng thái** trong bảng để chuyển đổi.

### Thêm thành viên dự án

1. Nhấn vào tên dự án → chọn tab **Thành viên**
2. Nhấn **+ Thêm thành viên**
3. Chọn nhân sự, vai trò trong dự án, % phân bổ, ngày tham gia/kết thúc, đơn giá/ngày
4. Nhấn **Lưu**

> **Cảnh báo xung đột:** Nếu nhân sự đã được phân bổ 100% ở dự án khác trong cùng khoảng thời gian, hệ thống sẽ hiển thị cảnh báo xung đột.

---

## 2.3 Danh Sách Task *(ADMIN / PM / LEADERSHIP / MEMBER)*

### Xem task theo dự án

1. Vào menu **Công việc**
2. Chọn **Dự án** từ dropdown phía trên
3. Danh sách task hiển thị dạng **cây phân cấp** (task gốc → subtask)

**Mở rộng / Thu gọn:** Nhấn vào mũi tên bên trái để xem subtask.

### Trạng thái task

| Trạng thái | Màu | Ý nghĩa |
|-----------|-----|---------|
| **TODO** | Xanh dương | Chưa bắt đầu |
| **IN_PROGRESS** | Cam | Đang thực hiện |
| **PENDING_APPROVAL** | Vàng | Chờ PM duyệt |
| **RETURNED** | Đỏ | PM trả lại, cần sửa |
| **DONE** | Xanh lá | Hoàn thành |
| **CANCELLED** | Xám | Đã hủy |

### Tạo task mới *(ADMIN / PM)*

1. Nhấn **+ Tạo task**
2. Điền thông tin:
   - **Tên task** *(bắt buộc)*
   - **Mô tả**
   - **Người thực hiện**
   - **Task cha** (nếu là subtask)
   - **Ngày bắt đầu / Deadline**
   - **Giờ ước tính**
3. Nhấn **Tạo**

> **Quy tắc phân cấp:** Task có tối đa 5 cấp (task gốc → cấp 2 → ... → cấp 5). Task có subtask sẽ tính tiến độ tự động từ subtask.

### Cập nhật tiến độ task *(MEMBER / PM)*

1. Nhấn vào icon **%** hoặc thanh tiến độ trên task
2. Kéo slider từ 0 đến 100%
3. Khi đạt 100% và đã có deadline → task tự chuyển sang **PENDING_APPROVAL**

### Ghi giờ thực tế

1. Nhấn icon **đồng hồ** trên task
2. Nhập số giờ, ngày làm, ghi chú
3. Nhấn **Lưu**

### Duyệt / Trả lại task *(PM / ADMIN)*

Trong tab **Phê duyệt** (badge hiển thị số task đang chờ):
- **Duyệt:** Nhấn ✅ → task chuyển sang DONE
- **Trả lại:** Nhấn ↩️ → nhập lý do → task chuyển sang RETURNED, nhân viên được thông báo

---

## 2.4 Kanban Board — My Tasks *(Tất cả người dùng)*

Kanban là cách **trực quan** nhất để quản lý công việc hàng ngày.

### Cách sử dụng

1. Vào menu **Kanban**
2. Chọn **Dự án** (PM/Admin có thể chọn thêm nhân sự để xem)
3. Dùng các nút lọc nhanh: **Tất cả / Hôm nay / Chưa bắt đầu / Đang thực hiện / Hoàn thành / Đã hủy**

### Di chuyển task (Drag & Drop)

Kéo thả card task từ cột này sang cột khác để cập nhật trạng thái:

```
TODO → IN_PROGRESS → PENDING_APPROVAL → DONE
              ↑                ↓
           RETURNED ←──────────┘
```

> **Lưu ý:** Khi kéo task sang cột **DONE** mà chưa có deadline, hệ thống sẽ yêu cầu nhập deadline trước.

### Cập nhật trên card

- **Thanh tiến độ:** Nhấn vào để chỉnh %
- **Ngày deadline:** Nhấn vào ngày để chỉnh lịch

---

## 2.5 Gantt Chart — Timeline *(ADMIN / PM / LEADERSHIP)*

Gantt giúp theo dõi **timeline tổng thể** của dự án.

### Cách xem

1. Vào menu **Gantt**
2. Chọn **Dự án**
3. Chọn **Chế độ xem:** Ngày / Tuần / Tháng
4. Chọn **Khoảng thời gian** hiển thị
5. Chọn **Cấp hiển thị:** Level 1, 2, 3 hoặc Tất cả

### Đọc biểu đồ

| Màu thanh | Ý nghĩa |
|-----------|---------|
| Xanh lá | On track (đúng tiến độ) |
| Vàng | Behind (chậm hơn kế hoạch) |
| Đỏ | Overdue (quá hạn) |
| Xanh dương | Upcoming (chưa đến ngày) |
| Xám | Done (hoàn thành) |

- **Đường đỏ dọc:** Ngày hôm nay
- **Hình thoi ◆:** Mốc tiến độ kỳ vọng tính đến hôm nay
- **Hover chuột** vào thanh để xem chi tiết task

---

## 2.6 Chi Phí Dự Án *(ADMIN / PM)*

1. Vào menu **Chi phí**
2. Chọn **Dự án**
3. Xem **KPI:** Tổng chi phí thực tế, Giờ ước tính, Giờ thực tế, Budget
4. Bảng chi tiết chi phí từng nhân sự: đơn giá/ngày × số giờ thực tế
5. Có thể lọc theo khoảng ngày để xem chi phí từng tháng
