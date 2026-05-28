---
title: "Loop — Hệ thống Quản lý Dự án Nội bộ"
status: final
created: 2026-05-25
updated: 2026-05-25
---

# Loop — Hệ thống Quản lý Dự án Nội bộ

## 1. Tổng quan

### 1.1 Vấn đề

Công ty hiện quản lý dự án và nhân sự bằng Excel. Phương thức này gây ra bốn vấn đề cốt lõi:

1. **Không theo dõi được task nhân sự** — khó biết ai đang làm gì, việc nào quá hạn.
2. **Tính chi phí thủ công** — rate nhân sự, effort thực tế và ngân sách không được liên kết tự động.
3. **Không có cảnh báo nguồn lực** — PM phát hiện muộn khi nhân sự overload hoặc sắp hết dự án.
4. **Không có cái nhìn tổng thể** — lãnh đạo không có dashboard để theo dõi trạng thái toàn bộ danh mục dự án.

### 1.2 Giải pháp

Loop là hệ thống quản lý dự án nội bộ, cung cấp cho PM công cụ để quản lý danh sách dự án, phân công nhân sự, theo dõi task và tiến độ, tính chi phí tự động, và cảnh báo sớm về các rủi ro. Lãnh đạo có dashboard và báo cáo để ra quyết định về danh mục dự án và nguồn lực.

### 1.3 Phạm vi

Internal tool. Không tích hợp hệ thống ngoài trong giai đoạn này. Nền tảng: Web + Mobile.

---

## 2. Cơ cấu Tổ chức & Phân quyền

### 2.1 Cơ cấu Tổ chức (Org Tree)

Loop quản lý cơ cấu tổ chức dạng cây (tree) với quan hệ cha–con không giới hạn số cấp. Admin tạo và duy trì cây này trong hệ thống.

```
Công ty
├── Phòng A
│   ├── Bộ phận A1
│   └── Bộ phận A2
└── Phòng B
    └── Bộ phận B1
```

**Nguyên tắc phân quyền theo org tree:**
- Mỗi dự án thuộc một đơn vị tổ chức (org unit).
- Mỗi nhân sự thuộc một org unit.
- Người dùng thấy dữ liệu của org unit mình và tất cả đơn vị con bên dưới (hierarchical visibility).
- Người ở cấp cao hơn thấy được dữ liệu tổng hợp của toàn bộ nhánh bên dưới.

### 2.2 Roles

| Role | Mô tả | Quyền cốt lõi |
|---|---|---|
| **Admin** | Quản trị hệ thống | CRUD org tree, CRUD nhân sự toàn hệ thống, quản lý rate history, cấu hình ngưỡng cảnh báo |
| **PM** | Quản lý dự án trong org unit của mình | CRUD dự án thuộc đơn vị, load/remove nhân sự, CRUD task, duyệt task Member, cấu hình ngưỡng cảnh báo trong phạm vi đơn vị |
| **Member** | Thành viên dự án | Xem task được giao, tự add task (chờ PM duyệt), cập nhật tiến độ task của mình |
| **Leadership** | Lãnh đạo một đơn vị | Xem dashboard & báo cáo trong phạm vi đơn vị và cấp dưới, export Excel — không chỉnh sửa |

Mỗi người dùng có một role duy nhất toàn hệ thống. Dự án chỉ do PM thuộc org unit sở hữu dự án quản lý — nhân sự từ đơn vị khác tham gia với tư cách Member.

---

## 3. Tính năng

### 3.0 Quản lý Cơ cấu Tổ chức (Admin)

**FR-001 — Quản lý Org Tree**
Admin tạo, sửa, xóa các đơn vị tổ chức dưới dạng cây cha–con. Mỗi đơn vị có: tên, mã, đơn vị cha (null nếu là root).

**FR-002 — Gán người dùng vào đơn vị**
Admin gán mỗi người dùng vào một org unit và một role. Thay đổi org unit của người dùng không ảnh hưởng đến lịch sử dữ liệu đã tạo.

**FR-003 — Gán dự án vào đơn vị**
Khi tạo dự án, PM gán dự án vào một org unit. Dự án có thể được reassign bởi Admin.

---

### 3.1 Quản lý Nhân sự (Admin)

**FR-101 — Hồ sơ nhân sự**
Admin tạo và quản lý hồ sơ từng nhân sự với các trường:

| Trường | Ghi chú |
|---|---|
| Mã nhân sự | Unique, do Admin định nghĩa |
| Họ tên | |
| Ngày sinh | |
| Tech stack | Multi-value (ví dụ: Java, React, AWS) |
| Level | Junior / Mid / Senior / Expert |
| Số căn cước công dân | |
| Ngày cấp / Nơi cấp | |
| Lịch sử dự án | Tự động tổng hợp từ các lần được load vào dự án, read-only |

**FR-102 — Lịch sử Rate**
Mỗi nhân sự có danh sách rate theo thời gian (ngày hiệu lực, giá trị man-day). Rate mới không xóa rate cũ — hệ thống giữ toàn bộ lịch sử để tính chi phí chính xác theo từng giai đoạn. Rate gắn với level nhưng có thể cài đặt thủ công cho từng người.

---

### 3.2 Quản lý Dự án (PM)

**FR-201 — Danh sách dự án**
PM xem và quản lý các dự án thuộc org unit của mình. Admin xem toàn bộ danh sách. Leadership xem danh sách trong phạm vi org unit mình quản lý. Mỗi dự án lưu:

| Trường | Ghi chú |
|---|---|
| Mã dự án | Unique |
| Tên dự án | |
| Loại dự án | OSDC / Pkg |
| Khách hàng | |
| Ngân sách (VND/USD) | |
| Effort ngân sách | Tính bằng man-month |
| Ngày bắt đầu / Kết thúc | |
| Trạng thái | Planning / Active / On Hold / Closed |

**FR-202 — Load nhân sự vào dự án**
PM thêm nhân sự vào dự án với các thông tin:

| Trường | Ghi chú |
|---|---|
| Nhân sự | Chọn từ danh sách |
| Role trong dự án | Dev / QA / BA / ... (PM định nghĩa) |
| Level | Kéo từ hồ sơ, có thể override |
| % Allocation | Ví dụ: 50%, 100% |
| Ngày vào / Ngày ra | |
| Rate man-day | Kéo từ rate hiện tại của nhân sự, có thể override cho dự án này |

Hệ thống kiểm tra tổng allocation theo ngày làm việc thực tế: với mỗi ngày làm việc (không tính thứ 7, chủ nhật) trong khoảng ngày vào–ngày ra mới, tính tổng (% allocation × số ngày) của nhân sự đó trên tất cả dự án active có khoảng thời gian chồng nhau. Nếu tổng vượt 100% trên bất kỳ ngày nào, hiển thị cảnh báo kèm danh sách ngày và dự án bị xung đột, yêu cầu PM xác nhận trước khi lưu.

---

### 3.3 Quản lý Task & Tiến độ (PM + Member)

**FR-301 — Cấu trúc Task**
Task được tổ chức phân cấp tối đa 5 level (ví dụ: Epic → Feature → Story → Task → Sub-task). Mỗi task lưu:

| Trường | Ghi chú |
|---|---|
| Tiêu đề | |
| Mô tả | |
| Người thực hiện | Chọn từ nhân sự trong dự án |
| Deadline | |
| Trạng thái | To Do / In Progress / Done / Chờ duyệt / Trả lại / Đã huỷ |
| Estimate effort | Man-hour, tối đa theo cấu hình (mặc định 4h) |
| Effort thực tế | Man-hour, do Member/PM log |
| Task cha | Null nếu là root |

Trạng thái Chờ duyệt, Trả lại, Đã huỷ chỉ áp dụng cho task do Member tạo. Task do PM tạo bắt đầu ở To Do.

**FR-302 — Tạo & Duyệt Task**
PM tạo task trực tiếp, task vào trạng thái **To Do** ngay.

Member tự add task theo workflow sau:

```
Member tạo → [Chờ duyệt]
                 ├── PM Duyệt    → [To Do]          (task hoạt động bình thường)
                 ├── PM Trả lại  → [Trả lại]         (Member chỉnh sửa rồi submit lại → về [Chờ duyệt])
                 └── PM Huỷ     → [Đã huỷ]          (Member không thể chỉnh sửa)
```

PM nhận in-app notification và email khi có task mới chờ duyệt. Member nhận thông báo khi task được duyệt, trả lại (kèm lý do), hoặc huỷ.

**FR-303 — Tính tiến độ**
% hoàn thành của task cha = trung bình có trọng số theo estimate của các task con trực tiếp. Roll-up từ level thấp nhất lên đến root. Task lá (không có con): Member hoặc PM cập nhật % trực tiếp (0–100%).

Tiến độ tổng thể dự án = % hoàn thành của tất cả task root, trung bình có trọng số theo estimate.

---

### 3.4 Tính Chi phí Dự án

**FR-401 — Chi phí thực tế**
Chi phí thực tế = Σ (effort thực tế của nhân sự × rate man-day tương ứng từng giai đoạn).

Quy đổi: 1 man-day = 8 man-hour. 1 man-month = 21 man-day = 168 man-hour.

Khi rate nhân sự thay đổi trong thời gian dự án, hệ thống dùng rate đúng với từng giai đoạn (theo lịch sử rate).

**FR-402 — Tỷ lệ chi phí**
Hiển thị: Chi phí thực tế / Ngân sách dự án (%) và Effort thực tế (man-day) / Effort ngân sách (man-day, quy đổi từ man-month × 21).

**FR-403 — Phạm vi tính chi phí**
Giai đoạn này chỉ theo dõi chi phí thực tế đã tiêu. Tính chi phí dự kiến (forecast) sẽ được xây dựng ở giai đoạn sau.

---

### 3.5 Cảnh báo & Thông báo

**FR-501 — Cấu hình Ngưỡng Cảnh báo**
Admin hoặc PM cấu hình các ngưỡng cảnh báo tại trang Settings. Mỗi ngưỡng có thể điều chỉnh độc lập:

| Tham số | Mô tả | Giá trị mặc định |
|---|---|---|
| Ngày sắp đến hạn task | Số ngày trước deadline để kích hoạt cảnh báo | 3 ngày |
| Ngày sắp hết dự án | Số ngày trước ngày ra của nhân sự | 7 ngày |
| Ngưỡng ngân sách (%) | % ngân sách đã tiêu để kích hoạt cảnh báo "sắp chạm" | 80% |
| Ngưỡng effort (%) | % effort ngân sách đã tiêu để kích hoạt cảnh báo | 80% |
| Giới hạn estimate task | Số giờ tối đa cho một task (man-hour) | 4 giờ |

**FR-502 — Cảnh báo Task**

| Loại | Điều kiện | Đối tượng nhận |
|---|---|---|
| Task quá hạn | Deadline đã qua, trạng thái chưa Done | PM + Member được giao |
| Task đến hạn hôm nay | Deadline = ngày hiện tại | PM + Member được giao |
| Task sắp đến hạn | Deadline trong N ngày tới (N cấu hình được) | PM + Member được giao |

**FR-503 — Cảnh báo Nguồn lực**

| Loại | Điều kiện |
|---|---|
| Overload nhân sự | Tổng allocation > 100% khi PM load vào dự án mới |
| Nhân sự sắp hết dự án | Ngày ra còn ≤ N ngày (N cấu hình được) |
| Effort vượt ngân sách | Effort thực tế > effort ngân sách dự án |
| Effort sắp chạm ngân sách | Effort thực tế > X% effort ngân sách (X cấu hình được) |

**FR-504 — Cảnh báo Ngân sách**

| Loại | Điều kiện |
|---|---|
| Vượt ngân sách | Chi phí thực tế > ngân sách dự án |
| Sắp chạm ngân sách | Chi phí thực tế > X% ngân sách (X cấu hình được) |

**FR-505 — Kênh thông báo**
Khi cảnh báo được kích hoạt, hệ thống gửi thông báo qua:
- In-app notification (bell icon) trên cả web và mobile
- Push notification đến thiết bị mobile
- Email đến người liên quan

---

### 3.6 Dashboard & Báo cáo (Leadership + PM)

**FR-601 — Dashboard Lãnh đạo**
Tổng quan toàn bộ danh mục dự án:

- Số dự án theo trạng thái (Active / Planning / On Hold / Closed)
- Danh sách dự án vượt ngân sách hoặc sắp chạm ngân sách
- Danh sách nhân sự chưa được load vào dự án nào (free)
- Danh sách nhân sự có tổng allocation < 100% (có dư capacity)
- Danh sách nhân sự sắp hết hạn trong dự án
- Tổng effort tiêu tốn toàn công ty / tổng ngân sách effort

**FR-602 — Dashboard Dự án (PM)**
Trong từng dự án:

- Tiến độ tổng thể (%)
- Chi phí thực tế vs ngân sách (số tiền + %)
- Effort thực tế vs effort ngân sách
- Danh sách cảnh báo đang active
- Danh sách nhân sự trong dự án + allocation + ngày hết hạn

**FR-603 — Cấu hình Tham số Báo cáo**
Mỗi báo cáo có bộ tham số riêng được hiển thị trước khi xem hoặc export. Người dùng điền tham số → hệ thống render báo cáo → export ra Excel.

Các báo cáo và tham số tương ứng:

| Báo cáo | Tham số đầu vào |
|---|---|
| Danh sách dự án & trạng thái ngân sách | Khoảng thời gian, trạng thái dự án, loại dự án (OSDC/Pkg) |
| Chi phí nhân sự theo dự án | Dự án, khoảng thời gian |
| Allocation nhân sự | Khoảng thời gian, phòng ban, level |
| Nhân sự sắp hết dự án | Số ngày cảnh báo, dự án |

Tất cả báo cáo đều export được ra file Excel (.xlsx).

---

## 4. Yêu cầu Phi chức năng

**NFR-01 — Nền tảng**
Hệ thống chạy trên Web (browser) và Mobile (iOS + Android). Trải nghiệm mobile ưu tiên cho Member (xem task, cập nhật tiến độ) và PM (xem cảnh báo nhanh).

**NFR-02 — Phân quyền theo Org Tree**
Mọi truy vấn dữ liệu được lọc theo org unit của người dùng — chỉ thấy dữ liệu thuộc đơn vị mình và các đơn vị con.

Phân quyền xem dữ liệu nhạy cảm:

| Dữ liệu | Admin | PM | Member | Leadership |
|---|---|---|---|---|
| Số CCCD nhân sự | ✓ | ✗ | ✗ | ✗ |
| Rate & lịch sử rate | ✓ (toàn hệ thống) | ✓ (dự án đơn vị mình) | ✗ | ✓ (trong phạm vi đơn vị) |
| Chi phí dự án | ✓ | ✓ (dự án của mình) | ✗ | ✓ (trong phạm vi đơn vị) |

**NFR-03 — Tính toàn vẹn dữ liệu Allocation**
Hệ thống kiểm tra allocation theo ngày làm việc thực tế (bỏ thứ 7, chủ nhật). Không cho phép tổng % allocation của một nhân sự vượt 100% trên bất kỳ ngày làm việc nào có khoảng thời gian dự án chồng nhau. Validation xảy ra khi PM lưu thay đổi; nếu vi phạm, hiển thị chi tiết ngày và dự án xung đột.

**NFR-04 — Lịch sử & Audit**
Thay đổi rate nhân sự không ghi đè dữ liệu cũ — append-only. Chi phí tính lại theo lịch sử rate khi cần.

---

## 5. Câu hỏi Mở

| ID | Câu hỏi | Mức độ | Owner |
|---|---|---|---|
| OQ-09 | Email cảnh báo gửi từ địa chỉ nào? Cần tích hợp SMTP riêng hay dùng dịch vụ email có sẵn? | Trung bình | Tech |
| OQ-15 | Format cột/sheet trong file Excel export — cần spec chi tiết trước khi dev báo cáo. | Trung bình | PM |
