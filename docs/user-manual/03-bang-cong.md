# Chương 3 — Bảng Công & Chấm Công

---

## 3.1 Bảng Công Cá Nhân *(Tất cả người dùng)*

### Xem bảng công của mình

1. Vào menu **Bảng công**
2. Chọn **Tháng** cần xem (mặc định là tháng hiện tại)
3. Dùng bộ lọc để hiển thị **Tất cả / Có mặt / Vắng**

### Thẻ KPI bảng công

| Thẻ | Ý nghĩa |
|-----|---------|
| **Ngày làm việc** | Số ngày có chấm công trong tháng |
| **Giờ OT** | Tổng giờ làm ngoài giờ |
| **Ngày nghỉ phép** | Số ngày nghỉ phép đã dùng |
| **Tỷ lệ chuyên cần** | % ngày có mặt / tổng ngày làm việc |
| **Trạng thái** | DRAFT / SUBMITTED / APPROVED / REJECTED |

### Chi tiết từng ngày

Bảng phía dưới hiển thị:
- **Ngày:** Thứ và ngày trong tháng
- **Giờ vào / Giờ ra:** Thời gian check-in/check-out
- **Số giờ làm:** Tổng giờ trong ngày
- **OT:** Số giờ ngoài giờ (nếu có)
- **Trạng thái:** Có mặt (xanh) / Vắng (đỏ) / Nghỉ phép / Công tác

### Tính lại bảng công

Nếu dữ liệu chưa cập nhật, nhấn **Tính lại** để hệ thống tái tính từ dữ liệu check-in/check-out.

### Nộp bảng công

Khi bảng công ở trạng thái **DRAFT** (chưa nộp) hoặc **REJECTED** (bị từ chối và cần nộp lại):

1. Kiểm tra lại thông tin các ngày
2. Nhấn **Nộp bảng công**
3. Trạng thái chuyển thành **SUBMITTED** — chờ PM/Admin duyệt

> **Lưu ý:** Bảng công bị **REJECTED** sẽ hiển thị lý do từ chối. Đọc kỹ lý do trước khi nộp lại.

---

## 3.2 Duyệt Bảng Công *(PM / ADMIN / LEADERSHIP)*

### Xem danh sách chờ duyệt

1. Vào menu **Duyệt bảng công**
2. Tìm kiếm nhân viên bằng ô **Tìm kiếm** phía trên

> **Cảnh báo:** Bảng công nộp quá **48 tiếng** chưa được duyệt sẽ có badge đỏ cảnh báo.

### Duyệt bảng công

1. Tìm dòng nhân viên cần duyệt
2. Nhấn nút **Duyệt** (✅)
3. Xác nhận trong hộp thoại → bảng công chuyển sang **APPROVED**
4. Nhân viên nhận được thông báo

### Từ chối bảng công

1. Nhấn nút **Từ chối** (❌)
2. Nhập **lý do từ chối** trong hộp thoại (bắt buộc)
3. Nhấn **Xác nhận** → bảng công chuyển sang **REJECTED**
4. Nhân viên nhận thông báo kèm lý do, có thể nộp lại

---

## 3.3 Báo Cáo Chấm Công Real-time *(PM / ADMIN / LEADERSHIP)*

### Xem tình hình hôm nay

1. Vào menu **Báo cáo chấm công**
2. Trang tự **cập nhật mỗi 60 giây**

### Thẻ KPI hôm nay

| Thẻ | Ý nghĩa |
|-----|---------|
| **Tổng thành viên** | Tổng nhân sự trong hệ thống |
| **Đã chấm công** | Số người đã check-in hôm nay |
| **WFH** | Đang làm việc tại nhà |
| **Chưa chấm công** | Chưa có dữ liệu check-in |
| **Tỷ lệ chuyên cần** | % có mặt / tổng |

### Bảng chi tiết

Xem trạng thái từng nhân viên:
- Lọc theo trạng thái: **WORKING / WFH / MEETING / BREAK / OFF / BUSINESS_TRIP**
- Xem giờ vào, giờ ra, thời gian làm việc

---

## 3.4 Vòng Đời Bảng Công

```
DRAFT
  │
  │ (nhân viên nộp)
  ▼
SUBMITTED
  │              │
  │ (PM duyệt)   │ (PM từ chối)
  ▼              ▼
APPROVED       REJECTED
                  │
                  │ (nhân viên nộp lại)
                  ▼
               SUBMITTED → ...
```

| Trạng thái | Màu | Hành động có thể làm |
|-----------|-----|---------------------|
| **DRAFT** | Xám | Nhân viên: Nộp bảng công |
| **SUBMITTED** | Vàng | PM: Duyệt hoặc Từ chối |
| **APPROVED** | Xanh lá | Không cần thao tác thêm |
| **REJECTED** | Đỏ | Nhân viên: Đọc lý do, nộp lại |
