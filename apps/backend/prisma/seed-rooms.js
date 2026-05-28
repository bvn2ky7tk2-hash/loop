const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db';

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  console.log('🌱 Seeding meeting rooms...');

  // Xóa dữ liệu cũ nếu có
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
      [room.id, room.name, room.floor, room.capacity, room.amenities, room.status]
    );
  }

  console.log(`✅ Seeded ${rooms.length} meeting rooms`);

  // Lấy user đầu tiên để dùng làm bookedBy
  const userResult = await client.query(`SELECT id FROM users LIMIT 1`);
  if (userResult.rows.length === 0) {
    console.log('⚠️  Không có user nào trong DB, bỏ qua seed bookings');
    await client.end();
    return;
  }

  const userId = userResult.rows[0].id;

  // Seed bookings cho hôm nay và ngày mai
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const makeTime = (dateStr, hour, minute = 0) => {
    return new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
  };

  const bookings = [
    {
      id: '22222222-2222-2222-2222-000000000001',
      roomId: rooms[0].id,
      title: 'Daily Standup — Team Backend',
      startTime: makeTime(todayStr, 8, 0),
      endTime:   makeTime(todayStr, 9, 0),
      attendees: ['dev1@loop.vn', 'dev2@loop.vn'],
    },
    {
      id: '22222222-2222-2222-2222-000000000002',
      roomId: rooms[1].id,
      title: 'Sprint Planning Q2',
      startTime: makeTime(todayStr, 9, 0),
      endTime:   makeTime(todayStr, 10, 30),
      attendees: ['pm@loop.vn', 'dev1@loop.vn', 'dev2@loop.vn'],
    },
    {
      id: '22222222-2222-2222-2222-000000000003',
      roomId: rooms[2].id,
      title: 'Họp All-hands tháng 5',
      startTime: makeTime(todayStr, 10, 0),
      endTime:   makeTime(todayStr, 11, 0),
      attendees: ['all@loop.vn'],
    },
    {
      id: '22222222-2222-2222-2222-000000000004',
      roomId: rooms[0].id,
      title: 'Demo sản phẩm cho khách hàng',
      startTime: makeTime(todayStr, 13, 0),
      endTime:   makeTime(todayStr, 15, 0),
      attendees: ['pm@loop.vn', 'crm@loop.vn'],
    },
    {
      id: '22222222-2222-2222-2222-000000000005',
      roomId: rooms[3].id,
      title: '1:1 Review tháng',
      startTime: makeTime(todayStr, 14, 0),
      endTime:   makeTime(todayStr, 15, 0),
      attendees: [],
    },
    {
      id: '22222222-2222-2222-2222-000000000006',
      roomId: rooms[1].id,
      title: 'Kick-off dự án mới',
      startTime: makeTime(todayStr, 15, 30),
      endTime:   makeTime(todayStr, 17, 0),
      attendees: ['pm@loop.vn', 'dev1@loop.vn'],
    },
  ];

  for (const booking of bookings) {
    await client.query(
      `INSERT INTO room_bookings (id, room_id, booked_by_id, title, start_time, end_time, attendees, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'CONFIRMED', NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [booking.id, booking.roomId, userId, booking.title, booking.startTime, booking.endTime, booking.attendees]
    );
  }

  console.log(`✅ Seeded ${bookings.length} room bookings`);
  await client.end();
  console.log('🎉 Seed phòng họp hoàn tất!');
}

main().catch((err) => {
  console.error('❌ Seed lỗi:', err.message);
  process.exit(1);
});
