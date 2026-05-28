/**
 * Seed script — Vehicle Booking demo data
 * Usage: node prisma/seed-vehicles.js
 */
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://loop:loop_password@localhost:5432/loop_db',
});

async function main() {
  await client.connect();
  console.log('Connected to loop_db');

  // Lấy user admin làm requester/approver
  const usersRes = await client.query(`
    SELECT id, name, role FROM users ORDER BY created_at LIMIT 10
  `);
  const users = usersRes.rows;

  if (users.length === 0) {
    console.error('Không tìm thấy user nào. Chạy seed chính trước.');
    process.exit(1);
  }

  const adminUser    = users.find((u) => u.role === 'ADMIN') ?? users[0];
  const memberUser   = users.find((u) => u.role === 'MEMBER') ?? users[1] ?? users[0];
  const leaderUser   = users.find((u) => u.role === 'LEADERSHIP') ?? users[2] ?? users[0];

  console.log(`Admin: ${adminUser.name}, Member: ${memberUser.name}`);

  // Xóa data cũ
  await client.query('DELETE FROM vehicle_requests');
  await client.query('DELETE FROM vehicles');
  console.log('Cleared old vehicle data');

  // Seed 5 xe
  const vehicles = [
    {
      id:           crypto.randomUUID(),
      name:         'Toyota Camry 2022',
      plate_number: '51A-123.45',
      type:         'Xe con',
      seats:        5,
      status:       'AVAILABLE',
      driver_id:    null,
    },
    {
      id:           crypto.randomUUID(),
      name:         'Ford Transit 16 chỗ',
      plate_number: '51C-678.90',
      type:         'Xe 16 chỗ',
      seats:        16,
      status:       'AVAILABLE',
      driver_id:    null,
    },
    {
      id:           crypto.randomUUID(),
      name:         'Honda City 2023',
      plate_number: '43A-456.78',
      type:         'Xe con',
      seats:        5,
      status:       'IN_USE',
      driver_id:    null,
    },
    {
      id:           crypto.randomUUID(),
      name:         'Hyundai HD120 Xe tải',
      plate_number: '51D-999.11',
      type:         'Xe tải',
      seats:        2,
      status:       'MAINTENANCE',
      driver_id:    null,
    },
    {
      id:           crypto.randomUUID(),
      name:         'Kia K5 2023',
      plate_number: '51G-333.22',
      type:         'Xe con',
      seats:        5,
      status:       'AVAILABLE',
      driver_id:    null,
    },
  ];

  for (const v of vehicles) {
    await client.query(
      `INSERT INTO vehicles (id, name, plate_number, type, seats, status, driver_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [v.id, v.name, v.plate_number, v.type, v.seats, v.status, v.driver_id]
    );
  }
  console.log(`Seeded ${vehicles.length} vehicles`);

  const now     = new Date();
  const today8  = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);
  const today10 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
  const today14 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
  const today17 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0);
  const tomorrow8  = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0, 0);
  const tomorrow17 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 17, 0, 0);
  const yesterday8 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 8, 0, 0);
  const yesterday17 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 17, 0, 0);

  // Seed 8 yêu cầu đặt xe
  const requests = [
    {
      id:             crypto.randomUUID(),
      vehicle_id:     vehicles[0].id, // Toyota Camry
      requested_by_id: memberUser.id,
      approved_by_id: adminUser.id,
      purpose:        'Gặp khách hàng VinGroup tại trụ sở',
      destination:    '72 Lê Thánh Tôn, Quận 1, TP.HCM',
      start_time:     today8,
      end_time:       today10,
      passenger_count: 2,
      status:         'APPROVED',
      rejection_reason: null,
      note:           'Cần đón thêm 1 đồng nghiệp ở Q.3',
    },
    {
      id:             crypto.randomUUID(),
      vehicle_id:     vehicles[1].id, // Ford Transit
      requested_by_id: memberUser.id,
      approved_by_id: null,
      purpose:        'Team building tháng 5 — di chuyển nhóm',
      destination:    'Vũng Tàu, Bà Rịa-Vũng Tàu',
      start_time:     tomorrow8,
      end_time:       tomorrow17,
      passenger_count: 15,
      status:         'PENDING',
      rejection_reason: null,
      note:           'Toàn bộ team 15 người',
    },
    {
      id:             crypto.randomUUID(),
      vehicle_id:     vehicles[2].id, // Honda City
      requested_by_id: memberUser.id,
      approved_by_id: adminUser.id,
      purpose:        'Họp đối tác tại văn phòng khách hàng',
      destination:    '123 Nguyễn Huệ, Quận 1',
      start_time:     today14,
      end_time:       today17,
      passenger_count: 1,
      status:         'IN_PROGRESS',
      rejection_reason: null,
      note:           null,
    },
    {
      id:             crypto.randomUUID(),
      vehicle_id:     vehicles[4].id, // Kia K5
      requested_by_id: memberUser.id,
      approved_by_id: null,
      purpose:        'Nộp hồ sơ tại Sở Kế hoạch Đầu tư',
      destination:    'Sở KH&ĐT TP.HCM — 32 Lê Thánh Tôn',
      start_time:     tomorrow8,
      end_time:       new Date(tomorrow8.getTime() + 2 * 3600000),
      passenger_count: 2,
      status:         'PENDING',
      rejection_reason: null,
      note:           null,
    },
    {
      id:             crypto.randomUUID(),
      vehicle_id:     vehicles[0].id, // Toyota Camry
      requested_by_id: memberUser.id,
      approved_by_id: adminUser.id,
      purpose:        'Đón đối tác từ sân bay Tân Sơn Nhất',
      destination:    'Sân bay Tân Sơn Nhất',
      start_time:     yesterday8,
      end_time:       new Date(yesterday8.getTime() + 2 * 3600000),
      passenger_count: 1,
      status:         'COMPLETED',
      rejection_reason: null,
      note:           'Đón chuyến bay VN123',
    },
    {
      id:             crypto.randomUUID(),
      vehicle_id:     vehicles[4].id, // Kia K5
      requested_by_id: memberUser.id,
      approved_by_id: adminUser.id,
      purpose:        'Giao tài liệu hợp đồng cho đối tác',
      destination:    'Bình Dương — KCN VSIP 2',
      start_time:     yesterday8,
      end_time:       yesterday17,
      status:         'REJECTED',
      rejection_reason: 'Xe đã có lịch sử dụng trong ngày, vui lòng đặt ngày khác',
      passenger_count: 1,
      note:           null,
    },
    {
      id:             crypto.randomUUID(),
      vehicle_id:     vehicles[1].id, // Ford Transit
      requested_by_id: memberUser.id,
      approved_by_id: null,
      purpose:        'Vận chuyển thiết bị triển lãm công nghệ',
      destination:    'Trung tâm Hội chợ Triển lãm Tân Bình',
      start_time:     new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 7, 0, 0),
      end_time:       new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 20, 0, 0),
      passenger_count: 5,
      status:         'PENDING',
      rejection_reason: null,
      note:           'Cần vận chuyển 3 pallet thiết bị, vui lòng bố trí thêm bốc vác',
    },
    {
      id:             crypto.randomUUID(),
      vehicle_id:     vehicles[0].id, // Toyota Camry
      requested_by_id: memberUser.id,
      approved_by_id: memberUser.id,
      purpose:        'Họp tổng kết quý 1 tại Hà Nội',
      destination:    'Hà Nội — Tòa nhà Vincom',
      start_time:     new Date(now.getFullYear(), now.getMonth() - 1, 15, 7, 0, 0),
      end_time:       new Date(now.getFullYear(), now.getMonth() - 1, 16, 20, 0, 0),
      passenger_count: 3,
      status:         'COMPLETED',
      rejection_reason: null,
      note:           null,
    },
  ];

  for (const r of requests) {
    await client.query(
      `INSERT INTO vehicle_requests
         (id, vehicle_id, requested_by_id, approved_by_id, purpose, destination,
          start_time, end_time, passenger_count, status, rejection_reason, note, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())`,
      [
        r.id, r.vehicle_id, r.requested_by_id, r.approved_by_id,
        r.purpose, r.destination, r.start_time, r.end_time,
        r.passenger_count, r.status, r.rejection_reason, r.note,
      ]
    );
  }
  console.log(`Seeded ${requests.length} vehicle requests`);

  await client.end();
  console.log('Done! Vehicle seed complete.');
}

main().catch((e) => {
  console.error(e);
  client.end();
  process.exit(1);
});
