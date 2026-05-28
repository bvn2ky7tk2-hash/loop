# Hướng Dẫn Sử Dụng Loop.vn

> **Phiên bản:** 1.0 — Cập nhật: 2026-05-27  
> **Dành cho:** Tất cả người dùng hệ thống Loop.vn

---

## Mục Lục

| Chương | Nội dung |
|--------|----------|
| [Chương 1](01-bat-dau.md) | Bắt đầu — Đăng nhập, Dashboard, Vai trò |
| [Chương 2](02-du-an-nhiem-vu.md) | Quản lý Dự án & Nhiệm vụ |
| [Chương 3](03-bang-cong.md) | Bảng công & Chấm công |
| [Chương 4](04-bug-issue.md) | Bug & Issue Tracking |
| [Chương 5](05-quy-trinh-baocao.md) | Quy trình BPMN, Báo cáo & Cài đặt |

---

## Loop.vn là gì?

**Loop.vn** là hệ thống quản lý dự án và nguồn lực nội bộ, giúp doanh nghiệp:

- Theo dõi tiến độ dự án theo thời gian thực
- Phân công và giám sát công việc cho từng nhân viên
- Chấm công, duyệt bảng công tự động
- Theo dõi chi phí và phân bổ nhân sự
- Quản lý bug, issue và quy trình nghiệp vụ

---

## Vai Trò & Quyền Truy Cập

Loop sử dụng 4 vai trò. Mỗi vai trò có quyền truy cập khác nhau:

| Vai trò | Mô tả | Quyền chính |
|---------|-------|-------------|
| **ADMIN** | Quản trị viên hệ thống | Toàn quyền: tạo người dùng, cài đặt, quản lý mọi module |
| **PM** | Quản lý dự án | Quản lý dự án, task, nhân sự, chi phí, duyệt bảng công |
| **LEADERSHIP** | Ban lãnh đạo | Xem báo cáo, duyệt bảng công, theo dõi toàn bộ |
| **MEMBER** | Nhân viên | Làm task, nộp bảng công, xem bug giao cho mình |

### Bảng quyền chi tiết theo trang

| Trang | ADMIN | PM | LEADERSHIP | MEMBER |
|-------|:-----:|:--:|:----------:|:------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Nhân sự | ✅ | ✅ | Xem | ❌ |
| Dự án | ✅ | ✅ | Xem | ❌ |
| Danh sách Task | ✅ | ✅ | ✅ | Task của mình |
| Kanban (My Tasks) | ✅ | ✅ | ✅ | ✅ |
| Gantt | ✅ | ✅ | ✅ | ❌ |
| Chi phí | ✅ | ✅ | ❌ | ❌ |
| Bảng công (cá nhân) | ✅ | ✅ | ✅ | ✅ |
| Duyệt bảng công | ✅ | ✅ | ✅ | ❌ |
| Chấm công manager | ✅ | ✅ | ✅ | ❌ |
| Bug & Issue | ✅ | ✅ | ✅ | ✅ |
| Quy trình BPMN | ✅ | Xem | ❌ | Inbox |
| Báo cáo | ✅ | ✅ | ✅ | ❌ |
| Cài đặt | ✅ | Tích hợp | ❌ | ❌ |
| Cảnh báo | ✅ | Xem | ❌ | ❌ |

---

## Yêu Cầu Hệ Thống

- **Trình duyệt:** Chrome 100+, Edge 100+, Safari 15+ (khuyến nghị Chrome)
- **Màn hình:** Tối thiểu 1280×768
- **Kết nối:** Internet ổn định
- **Ứng dụng di động:** Xem app Loop trên iOS/Android (tính năng cơ bản)
