/**
 * seed-notifications.js — Insert demo in-app notifications cho user đầu tiên
 * Chạy: node prisma/seed-notifications.js
 */
const { Client } = require('pg');

const DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://loop:loop_password@localhost:5432/loop_db';

const TYPES = [
  'TASK_ASSIGNED',
  'TASK_APPROVED',
  'TASK_RETURNED',
  'BUG_ASSIGNED',
  'BUG_STATUS_CHANGED',
  'BUG_CRITICAL',
  'LEAVE_APPROVED',
  'LEAVE_REJECTED',
  'EXPENSE_APPROVED',
  'EXPENSE_REJECTED',
  'PROCESS_TASK_ASSIGNED',
  'ISSUE_CR_APPROVED',
];

const NOTIFICATIONS = [
  {
    type: 'TASK_ASSIGNED',
    title: 'Bạn được giao task mới',
    body: 'Thiết kế màn hình đăng nhập v2 trong dự án Loop ERP',
    link: '/tasks',
    entity_type: 'TASK',
    is_read: false,
  },
  {
    type: 'BUG_ASSIGNED',
    title: 'Bug mới được giao cho bạn',
    body: 'BUG-042 Lỗi hiển thị badge thông báo trên mobile — HIGH — Loop ERP',
    link: '/bugs',
    entity_type: 'BUG',
    is_read: false,
  },
  {
    type: 'TASK_APPROVED',
    title: 'Task đã được duyệt',
    body: 'Phân tích yêu cầu module HR đã được PM chấp thuận',
    link: '/tasks',
    entity_type: 'TASK',
    is_read: false,
  },
  {
    type: 'LEAVE_APPROVED',
    title: 'Đơn nghỉ phép đã được duyệt',
    body: 'Đơn nghỉ phép năm (2 ngày) đã được phê duyệt',
    link: '/hr/leaves',
    entity_type: 'LEAVE',
    is_read: false,
  },
  {
    type: 'BUG_CRITICAL',
    title: 'Bug Critical mới trong Loop ERP',
    body: 'Lỗi crash khi xuất báo cáo PDF — báo cáo bởi admin',
    link: '/bugs',
    entity_type: 'BUG',
    is_read: false,
  },
  {
    type: 'EXPENSE_APPROVED',
    title: 'Phiếu chi đã được duyệt',
    body: 'Phiếu chi "Chi phí đi lại tháng 5" đã được phê duyệt',
    link: '/finance/expenses',
    entity_type: 'EXPENSE',
    is_read: false,
  },
  {
    type: 'PROCESS_TASK_ASSIGNED',
    title: 'Bạn có user task mới trong quy trình',
    body: 'Quy trình "Duyệt nghỉ phép" đang chờ bạn xử lý',
    link: '/processes/inbox',
    entity_type: null,
    is_read: true,
  },
  {
    type: 'TASK_RETURNED',
    title: 'Task bị trả lại',
    body: 'Viết tài liệu API specification bị trả lại: Cần bổ sung ví dụ response',
    link: '/tasks',
    entity_type: 'TASK',
    is_read: true,
  },
  {
    type: 'LEAVE_REJECTED',
    title: 'Đơn nghỉ phép bị từ chối',
    body: 'Đơn nghỉ phép bị từ chối: Thiếu nhân sự trong giai đoạn này',
    link: '/hr/leaves',
    entity_type: 'LEAVE',
    is_read: true,
  },
  {
    type: 'BUG_STATUS_CHANGED',
    title: 'Bug đã được resolved',
    body: 'BUG-031 Lỗi sort bảng dữ liệu',
    link: '/bugs',
    entity_type: 'BUG',
    is_read: true,
  },
  {
    type: 'EXPENSE_REJECTED',
    title: 'Phiếu chi bị từ chối',
    body: 'Phiếu chi "Mua sắm thiết bị văn phòng" bị từ chối: Vượt ngân sách quý',
    link: '/finance/expenses',
    entity_type: 'EXPENSE',
    is_read: true,
  },
  {
    type: 'ISSUE_CR_APPROVED',
    title: 'CR đã được PM phê duyệt',
    body: 'Change Request: Thêm tính năng export Excel cho báo cáo tổng hợp',
    link: '/bugs',
    entity_type: 'BUG',
    is_read: true,
  },
];

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  // Lấy user đầu tiên
  const userRes = await client.query(
    `SELECT id FROM users ORDER BY created_at ASC LIMIT 1`,
  );

  if (userRes.rowCount === 0) {
    console.error('Không tìm thấy user nào trong DB. Hãy seed users trước.');
    await client.end();
    process.exit(1);
  }

  const userId = userRes.rows[0].id;
  console.log(`Seeding notifications cho user: ${userId}`);

  // Xóa notification demo cũ (tránh trùng lặp)
  await client.query(
    `DELETE FROM notifications WHERE user_id = $1 AND link IS NOT NULL`,
    [userId],
  );

  const now = new Date();
  let inserted = 0;

  for (let i = 0; i < NOTIFICATIONS.length; i++) {
    const n = NOTIFICATIONS[i];
    // Rải đều trong 7 ngày gần nhất
    const createdAt = new Date(now.getTime() - (i * 14 + Math.random() * 12) * 3600 * 1000);
    const entityId = n.entity_type ? `demo-${n.type.toLowerCase()}-${i + 1}` : null;

    await client.query(
      `INSERT INTO notifications (id, user_id, type, title, body, is_read, link, entity_type, entity_id, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        n.type,
        n.title,
        n.body,
        n.is_read,
        n.link,
        n.entity_type,
        entityId,
        createdAt,
      ],
    );
    inserted++;
  }

  console.log(`✅ Đã insert ${inserted} notifications demo cho user ${userId}`);
  await client.end();
}

main().catch((e) => {
  console.error('Lỗi seed:', e.message);
  process.exit(1);
});
