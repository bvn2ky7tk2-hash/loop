const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db';

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log('Seeding meeting rooms...');

  // Xóa dữ liệu cũ
  await client.query('DELETE FROM room_bookings');
  await client.query('DELETE FROM meeting_rooms');

  // Seed 4 phòng họp
  const rooms = [
    {
      id: '11111111-1111-1111-1111-000000000001',
      name: 'Phòng Hoa',
      floor: 'Tầng 2',
      capacity: 8,
      amenities: ['Máy chiếu', 'Bảng trắng', 'Điều hoà', 'TV'],
      status: 'ACTIVE',
    },
    {
      id: '11111111-1111-1111-1111-000000000002',
      name: 'Phòng Lan',
      floor: 'Tầng 3',
      capacity: 12,
      amenities: ['Màn hình lớn', 'Video Conference', 'Bảng trắng', 'Điều hoà'],
      status: 'ACTIVE',
    },
    {
      id: '11111111-1111-1111-1111-000000000003',
      name: 'Phòng A3.01',
      floor: 'Tầng 4',
      capacity: 20,
      amenities: ['Máy chiếu 4K', 'Micro không dây', 'Video Conference', 'Điều hoà', 'Bảng trắng'],
      status: 'ACTIVE',
    },
    {
      id: '11111111-1111-1111-1111-000000000004',
      name: 'Phòng Mini',
      floor: 'Tầng 2',
      capacity: 4,
      amenities: ['TV', 'Điều hoà'],
      status: 'ACTIVE',
    },
  ];

  for (const room of rooms) {
    await client.query(
      `INSERT INTO meeting_rooms (id, name, floor, capacity, amenities, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [room.id, room.name, room.floor, room.capacity, room.amenities, room.status],
    );
  }
  console.log(`✓ Seeded ${rooms.length} meeting rooms`);

  // Lấy user để dùng làm bookedBy
  const userResult = await client.query(`SELECT id FROM users ORDER BY created_at LIMIT 3`);
  if (userResult.rows.length === 0) {
    console.log('Không có user nào trong DB, bỏ qua seed bookings');
    await client.end();
    return;
  }

  const userId  = userResult.rows[0].id;
  const userId2 = (userResult.rows[1] ?? userResult.rows[0]).id;
  const userId3 = (userResult.rows[2] ?? userResult.rows[0]).id;

  const now     = new Date();
  const todayStr     = now.toISOString().slice(0, 10);
  const tomorrowStr  = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  const in2dStr      = new Date(now.getTime() + 2 * 86400000).toISOString().slice(0, 10);

  const t = (dateStr, hour, min = 0) =>
    new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`);

  // 10 bookings — trải rộng hôm qua / hôm nay / ngày mai / 2 ngày tới
  const bookings = [
    {
      id: '22222222-2222-2222-2222-000000000001',
      roomId: rooms[0].id, bookedById: userId,
      title: 'Daily Standup — Team Backend',
      startTime: t(todayStr, 8),    endTime: t(todayStr, 9),
      attendees: ['dev1@loop.vn', 'dev2@loop.vn'],
      status: 'CONFIRMED', note: null,
    },
    {
      id: '22222222-2222-2222-2222-000000000002',
      roomId: rooms[1].id, bookedById: userId2,
      title: 'Sprint Planning Q2',
      startTime: t(todayStr, 9),    endTime: t(todayStr, 10, 30),
      attendees: ['pm@loop.vn', 'dev1@loop.vn', 'dev2@loop.vn'],
      status: 'CONFIRMED', note: null,
    },
    {
      id: '22222222-2222-2222-2222-000000000003',
      roomId: rooms[2].id, bookedById: userId,
      title: 'Họp All-hands tháng 5',
      startTime: t(todayStr, 10),   endTime: t(todayStr, 11),
      attendees: ['all@loop.vn'],
      status: 'CONFIRMED', note: 'Toàn bộ nhân viên bắt buộc tham dự',
    },
    {
      id: '22222222-2222-2222-2222-000000000004',
      roomId: rooms[0].id, bookedById: userId3,
      title: 'Demo sản phẩm cho khách hàng',
      startTime: t(todayStr, 13),   endTime: t(todayStr, 15),
      attendees: ['pm@loop.vn', 'crm@loop.vn'],
      status: 'CONFIRMED', note: 'Chuẩn bị laptop và slide trước 12:45',
    },
    {
      id: '22222222-2222-2222-2222-000000000005',
      roomId: rooms[3].id, bookedById: userId2,
      title: '1:1 Review tháng — HR & Nhân viên',
      startTime: t(todayStr, 14),   endTime: t(todayStr, 15),
      attendees: [],
      status: 'CONFIRMED', note: null,
    },
    {
      id: '22222222-2222-2222-2222-000000000006',
      roomId: rooms[1].id, bookedById: userId,
      title: 'Kick-off dự án Loop Mobile',
      startTime: t(todayStr, 15, 30), endTime: t(todayStr, 17),
      attendees: ['pm@loop.vn', 'dev1@loop.vn', 'mobile@loop.vn'],
      status: 'CONFIRMED', note: null,
    },
    {
      id: '22222222-2222-2222-2222-000000000007',
      roomId: rooms[2].id, bookedById: userId3,
      title: 'Họp Board Q2 — Báo cáo tài chính',
      startTime: t(tomorrowStr, 9),  endTime: t(tomorrowStr, 11),
      attendees: ['cfo@loop.vn', 'ceo@loop.vn', 'cto@loop.vn'],
      status: 'CONFIRMED', note: 'Chuẩn bị báo cáo tài chính quý 2',
    },
    {
      id: '22222222-2222-2222-2222-000000000008',
      roomId: rooms[0].id, bookedById: userId2,
      title: 'Phỏng vấn Senior Backend Engineer',
      startTime: t(tomorrowStr, 14), endTime: t(tomorrowStr, 15, 30),
      attendees: ['hr@loop.vn', 'cto@loop.vn'],
      status: 'CONFIRMED', note: 'Ứng viên: Nguyễn Văn A',
    },
    {
      id: '22222222-2222-2222-2222-000000000009',
      roomId: rooms[1].id, bookedById: userId,
      title: 'Training nội bộ — Quy trình OKR mới',
      startTime: t(in2dStr, 13),     endTime: t(in2dStr, 16),
      attendees: ['hr@loop.vn', 'all-leads@loop.vn'],
      status: 'CONFIRMED', note: 'Toàn bộ team lead tham gia',
    },
    {
      id: '22222222-2222-2222-2222-000000000010',
      roomId: rooms[3].id, bookedById: userId3,
      title: 'Họp giao ban sáng thứ Hai',
      startTime: t(yesterdayStr, 8, 30), endTime: t(yesterdayStr, 9, 30),
      attendees: ['pm@loop.vn', 'dev1@loop.vn', 'hr@loop.vn'],
      status: 'CANCELLED', note: 'Hủy do PM nghỉ đột xuất',
    },
  ];

  for (const b of bookings) {
    await client.query(
      `INSERT INTO room_bookings (id, room_id, booked_by_id, title, start_time, end_time, attendees, status, note, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [b.id, b.roomId, b.bookedById, b.title, b.startTime, b.endTime, b.attendees, b.status, b.note],
    );
  }

  console.log(`✓ Seeded ${bookings.length} room bookings`);
  await client.end();
  console.log('✅ Seed phòng họp hoàn tất!');
}

main().catch((err) => {
  console.error('Seed lỗi:', err.message);
  process.exit(1);
});
