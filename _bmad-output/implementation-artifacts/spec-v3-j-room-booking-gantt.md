---
title: 'v3.0-J — Room Booking + Gantt Calendar View'
type: 'feature'
created: '2026-05-28'
status: 'ready-for-dev'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Loop ERP chưa có tính năng đặt phòng họp — nhân viên không thể xem phòng trống theo khung giờ, dẫn đến xung đột lịch họp và lãng phí tài nguyên.

**Approach:** Thêm module Room Booking với Gantt Calendar View (trục X = giờ, trục Y = phòng) cho phép xem/đặt phòng theo ngày; quản lý phòng (CRUD) chỉ ADMIN.

## Boundaries & Constraints

**Always:**
- Tuân thủ toàn bộ coding standards và UI design guidelines (CLAUDE.md)
- Dùng `useThemePalette()`, `<PageHeader>`, `<StatCard>`, `<FilterBar>`, `confirmDelete()`
- Backend: PaginationDto + paginate() cho list, @Roles(ADMIN) cho admin endpoints
- Kiểm tra conflict booking trước khi tạo (cùng phòng, overlap giờ)
- Gantt dùng CSS positioning thuần (không thư viện Gantt bên ngoài)
- KHÔNG sửa `modules.config.tsx`, `screens.registry.ts`, `router.tsx`

**Ask First:**
- Nếu cần thêm permission code mới vào `permissions.constants.ts` thay vì dùng role-based guard

**Never:**
- Không dùng thư viện Gantt/calendar bên ngoài (react-big-calendar, dhtmlx, v.v.)
- Không tự khai báo palette màu (isDark, textPrimary, bgCard...) trong component
- Không dùng `components={{ header: { cell: ... }}}` override Table

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Đặt phòng thành công | Room available, startTime < endTime, không overlap | Booking CONFIRMED được tạo, Gantt bar xuất hiện | N/A |
| Conflict booking | Cùng phòng, giờ chồng chéo với booking đã có | HTTP 409 ConflictException | FE hiển thị message lỗi "Phòng đã có lịch trong khung giờ này" |
| Hủy booking | User là người đặt hoặc ADMIN | Booking status → CANCELLED, bar biến mất khỏi Gantt | Non-owner non-admin → 403 ForbiddenException |
| Xem phòng trống | Truyền startTime + endTime | Trả danh sách phòng không có booking CONFIRMED overlap | N/A |
| Gantt không có booking | Ngày được chọn không có booking | Grid rỗng, slot click vẫn mở form đặt | N/A |

</frozen-after-approval>

## Code Map

- `apps/backend/prisma/schema.prisma` -- thêm enum RoomStatus, BookingStatus, model MeetingRoom, RoomBooking; thêm roomBookings vào User
- `apps/backend/src/room-booking/` -- module mới (service, controller, DTOs, module)
- `apps/backend/src/app.module.ts` -- import RoomBookingModule
- `apps/backend/src/permissions/permissions.constants.ts` -- thêm ROOM_BOOKING permissions
- `apps/backend/prisma/seed-rooms.js` -- seed 4 phòng + bookings demo
- `apps/backend/package.json` -- thêm script seed:rooms
- `apps/web/src/api/room-booking.ts` -- types + TanStack Query hooks
- `apps/web/src/pages/assets/RoomBookingPage.tsx` -- page chính (Gantt tab + Quản lý phòng tab)

## Tasks & Acceptance

**Execution:**
- [ ] `apps/backend/prisma/schema.prisma` -- Thêm enum RoomStatus, BookingStatus, model MeetingRoom, RoomBooking, và relation roomBookings trên User -- DB schema cho module
- [ ] `apps/backend/src/room-booking/dto/create-room.dto.ts` -- DTO tạo phòng với validators đầy đủ -- Input validation
- [ ] `apps/backend/src/room-booking/dto/create-booking.dto.ts` -- DTO đặt phòng với validators đầy đủ -- Input validation
- [ ] `apps/backend/src/room-booking/room-booking.service.ts` -- Service: listRooms, createRoom, updateRoom, deleteRoom, listBookings, createBooking (conflict check), cancelBooking (auth check), getAvailableRooms, getGanttData -- Business logic
- [ ] `apps/backend/src/room-booking/room-booking.controller.ts` -- Controller với đúng routes, @Roles(ADMIN) cho admin endpoints, @Throttle -- API endpoints
- [ ] `apps/backend/src/room-booking/room-booking.module.ts` -- Module definition -- NestJS wiring
- [ ] `apps/backend/src/app.module.ts` -- Import RoomBookingModule -- Đăng ký module
- [ ] `apps/backend/src/permissions/permissions.constants.ts` -- Thêm ROOM_BOOKING_READ, ROOM_BOOKING_CREATE, ROOM_BOOKING_MANAGE permissions và seed vào ROLE_PERMISSIONS -- Phân quyền
- [ ] `apps/backend/prisma/seed-rooms.js` -- Seed 4 phòng + 5+ bookings hôm nay/ngày mai -- Demo data
- [ ] `apps/backend/package.json` -- Thêm "seed:rooms": "node prisma/seed-rooms.js" -- Script tiện lợi
- [ ] `apps/web/src/api/room-booking.ts` -- Types (MeetingRoom, RoomBooking, GanttData) + TanStack Query hooks -- API client layer
- [ ] `apps/web/src/pages/assets/RoomBookingPage.tsx` -- Page 2 tab: Gantt Calendar + Quản lý phòng (ADMIN only); Gantt dùng CSS grid positioning thuần -- UI hoàn chỉnh

**Acceptance Criteria:**
- Given người dùng chọn ngày trên Gantt, when API trả dữ liệu, then hiển thị booking bars đúng vị trí theo giờ (slotWidth=60px/30min)
- Given có 2 booking cùng phòng cùng giờ, when createBooking, then backend trả 409 và FE hiển thị error message
- Given non-owner user, when cancelBooking, then backend trả 403
- Given ADMIN, when mở tab "Quản lý phòng", then hiển thị bảng phòng với nút Edit/Delete
- Given click vào slot trống trên Gantt, when mở modal, then form pre-fill đúng phòng và giờ đã click
- Given npx tsc --noEmit, then 0 errors trên cả backend và frontend

## Design Notes

Gantt positioning formula:
```tsx
const HOUR_START = 8;        // 8:00
const SLOT_WIDTH = 60;       // px per 30-min slot
const startSlot = (startMinutes - HOUR_START * 60) / 30;
const durationSlots = (endMinutes - startMinutes) / 30;
// style={{ position: 'absolute', left: startSlot * SLOT_WIDTH, width: durationSlots * SLOT_WIDTH - 2 }}
```

Booking bar màu: hash userId → pick từ palette 8 màu sáng cố định (không dùng preset.primary).

StatCard summary trên Gantt tab:
- Tổng phòng (#6366F1), Đang dùng hôm nay (#F59E0B), Booking hôm nay (#3B82F6), Phòng trống (#10B981)

## Verification

**Commands:**
- `cd apps/backend && npx prisma db push` -- expected: Schema synchronized
- `cd apps/backend && npx prisma generate` -- expected: Client generated
- `cd apps/backend && node prisma/seed-rooms.js` -- expected: Seed thành công
- `cd apps/backend && npx tsc --noEmit` -- expected: 0 errors
- `cd apps/web && npx tsc --noEmit` -- expected: 0 errors
