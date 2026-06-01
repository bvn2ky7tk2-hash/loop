/**
 * Select chuẩn cho thông tin nhân sự: Mã, Họ tên, Phòng ban, Chức danh, Vị trí
 * Dùng trong mọi include.employee.select để đảm bảo nhất quán.
 */
export const EMPLOYEE_INFO_SELECT = {
  id:       true,
  fullName: true,
  code:     true,
  userId:   true,
  orgUnit:  { select: { id: true, name: true, code: true } },
  position: { include: { jobTitle: { select: { id: true, name: true } } } },
} as const;
