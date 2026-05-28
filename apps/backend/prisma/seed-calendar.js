/**
 * seed-calendar.js — Demo data cho Company Meeting Calendar (v3.0-L)
 * Khoảng 15 sự kiện tháng 5–6/2026
 */

const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://loop:loop_password@localhost:5432/loop_db',
});

async function main() {
  await client.connect();
  console.log('✅ Connected to loop_db');

  // Lấy 1 user làm creator
  const { rows: users } = await client.query(
    "SELECT id FROM users WHERE is_active = true ORDER BY created_at LIMIT 1"
  );
  if (users.length === 0) {
    console.error('❌ Không tìm thấy user nào. Chạy seed chính trước.');
    process.exit(1);
  }
  const creatorId = users[0].id;
  console.log(`🙍 Creator: ${creatorId}`);

  // Xóa data cũ
  await client.query("DELETE FROM calendar_events");
  console.log('🗑  Cleared old calendar events');

  const events = [
    // ─── Ngày lễ tháng 5 ─────────────────────────────────────────────────────
    {
      title:       'Ngày Quốc tế Lao động 1/5',
      description: 'Nghỉ lễ toàn quốc — Ngày Quốc tế Lao động',
      event_type:  'HOLIDAY',
      start_time:  '2026-05-01 00:00:00',
      end_time:    '2026-05-01 23:59:59',
      is_all_day:  true,
      location:    null,
      color:       '#10B981',
      attendees:   '{}',
    },
    {
      title:       'Giỗ Tổ Hùng Vương (10/3 Âm lịch)',
      description: 'Nghỉ lễ Giỗ Tổ Hùng Vương — Quốc lễ',
      event_type:  'HOLIDAY',
      start_time:  '2026-04-29 00:00:00',
      end_time:    '2026-04-29 23:59:59',
      is_all_day:  true,
      location:    null,
      color:       '#10B981',
      attendees:   '{}',
    },
    {
      title:       'Ngày Giải phóng miền Nam 30/4',
      description: 'Nghỉ lễ Ngày Giải phóng miền Nam — Quốc lễ',
      event_type:  'HOLIDAY',
      start_time:  '2026-04-30 00:00:00',
      end_time:    '2026-04-30 23:59:59',
      is_all_day:  true,
      location:    null,
      color:       '#10B981',
      attendees:   '{}',
    },
    // ─── Daily Standup ────────────────────────────────────────────────────────
    {
      title:       'Daily Standup — Tuần 1 tháng 5',
      description: 'Standup hàng ngày team Dev — updates, blockers, plans',
      event_type:  'MEETING',
      start_time:  '2026-05-04 09:00:00',
      end_time:    '2026-05-04 09:15:00',
      is_all_day:  false,
      location:    'Zoom / Phòng họp A1',
      color:       '#3B82F6',
      attendees:   '{dev-team@loop.vn}',
    },
    {
      title:       'Daily Standup — Tuần 2 tháng 5',
      description: 'Standup hàng ngày team Dev',
      event_type:  'MEETING',
      start_time:  '2026-05-11 09:00:00',
      end_time:    '2026-05-11 09:15:00',
      is_all_day:  false,
      location:    'Zoom / Phòng họp A1',
      color:       '#3B82F6',
      attendees:   '{dev-team@loop.vn}',
    },
    // ─── Sprint events ────────────────────────────────────────────────────────
    {
      title:       'Sprint Planning — Sprint 24',
      description: 'Lên kế hoạch Sprint 24: phân tích story, ước lượng effort, assign task',
      event_type:  'MEETING',
      start_time:  '2026-05-04 10:00:00',
      end_time:    '2026-05-04 12:00:00',
      is_all_day:  false,
      location:    'Phòng họp B2 — Tầng 3',
      color:       '#3B82F6',
      attendees:   '{dev-team@loop.vn,pm@loop.vn,qa@loop.vn}',
    },
    {
      title:       'Sprint Review — Sprint 23',
      description: 'Demo kết quả Sprint 23 cho stakeholders, thu thập feedback',
      event_type:  'MEETING',
      start_time:  '2026-05-05 14:00:00',
      end_time:    '2026-05-05 15:30:00',
      is_all_day:  false,
      location:    'Phòng hội nghị lớn — Tầng 1',
      color:       '#3B82F6',
      attendees:   '{dev-team@loop.vn,pm@loop.vn,ceo@loop.vn}',
    },
    {
      title:       'Retrospective Sprint 23',
      description: 'Nhìn lại Sprint 23: what went well, what can improve',
      event_type:  'MEETING',
      start_time:  '2026-05-06 16:00:00',
      end_time:    '2026-05-06 17:00:00',
      is_all_day:  false,
      location:    'Phòng họp A1',
      color:       '#3B82F6',
      attendees:   '{dev-team@loop.vn,pm@loop.vn}',
    },
    // ─── All Hands ────────────────────────────────────────────────────────────
    {
      title:       'All-Hands Meeting — Tháng 5/2026',
      description: 'Họp toàn công ty: kết quả tháng 4, kế hoạch tháng 5, Q&A với leadership',
      event_type:  'MEETING',
      start_time:  '2026-05-08 09:00:00',
      end_time:    '2026-05-08 10:30:00',
      is_all_day:  false,
      location:    'Hội trường tầng 1',
      color:       '#3B82F6',
      attendees:   '{all@loop.vn}',
    },
    // ─── Training ─────────────────────────────────────────────────────────────
    {
      title:       'Workshop: NestJS Advanced Patterns',
      description: 'Đào tạo nội bộ về NestJS: CQRS, Event Sourcing, microservices patterns',
      event_type:  'TRAINING',
      start_time:  '2026-05-13 13:30:00',
      end_time:    '2026-05-13 17:00:00',
      is_all_day:  false,
      location:    'Phòng đào tạo — Tầng 4',
      color:       '#8B5CF6',
      attendees:   '{dev-team@loop.vn}',
    },
    {
      title:       'Onboarding: Nhân viên mới tháng 5',
      description: 'Buổi onboarding nhân viên mới: giới thiệu công ty, quy trình, hệ thống',
      event_type:  'TRAINING',
      start_time:  '2026-05-18 09:00:00',
      end_time:    '2026-05-18 11:00:00',
      is_all_day:  false,
      location:    'Phòng HR — Tầng 2',
      color:       '#8B5CF6',
      attendees:   '{hr@loop.vn,new-employees@loop.vn}',
    },
    // ─── Deadline ─────────────────────────────────────────────────────────────
    {
      title:       'Deadline: Submit Q2 Report',
      description: 'Hạn nộp báo cáo Q2/2026 cho ban lãnh đạo và kế toán',
      event_type:  'DEADLINE',
      start_time:  '2026-05-16 17:00:00',
      end_time:    '2026-05-16 17:00:00',
      is_all_day:  false,
      location:    null,
      color:       '#EF4444',
      attendees:   '{pm@loop.vn,finance@loop.vn}',
    },
    {
      title:       'Deadline: Loop v3.0 Feature Freeze',
      description: 'Ngày cuối cùng merge feature vào release branch cho Loop v3.0',
      event_type:  'DEADLINE',
      start_time:  '2026-05-22 18:00:00',
      end_time:    '2026-05-22 18:00:00',
      is_all_day:  false,
      location:    null,
      color:       '#EF4444',
      attendees:   '{dev-team@loop.vn,pm@loop.vn}',
    },
    // ─── Tháng 6 ──────────────────────────────────────────────────────────────
    {
      title:       'All-Hands Meeting — Tháng 6/2026',
      description: 'Họp toàn công ty đầu tháng 6: review Q2, kế hoạch H2',
      event_type:  'MEETING',
      start_time:  '2026-06-05 09:00:00',
      end_time:    '2026-06-05 10:30:00',
      is_all_day:  false,
      location:    'Hội trường tầng 1',
      color:       '#3B82F6',
      attendees:   '{all@loop.vn}',
    },
    {
      title:       'Workshop: React 19 & Performance',
      description: 'Đào tạo về React 19 features mới: concurrent rendering, use(), compiler',
      event_type:  'TRAINING',
      start_time:  '2026-06-10 14:00:00',
      end_time:    '2026-06-10 17:00:00',
      is_all_day:  false,
      location:    'Phòng đào tạo — Tầng 4',
      color:       '#8B5CF6',
      attendees:   '{frontend-team@loop.vn}',
    },
  ];

  let count = 0;
  for (const ev of events) {
    await client.query(
      `INSERT INTO calendar_events
        (id, title, description, event_type, start_time, end_time, is_all_day,
         location, color, created_by_id, attendees, created_at, updated_at)
       VALUES
        (gen_random_uuid(), $1, $2, $3::calendar_event_type, $4::timestamptz, $5::timestamptz,
         $6, $7, $8, $9, $10::text[], now(), now())`,
      [
        ev.title,
        ev.description,
        ev.event_type,
        ev.start_time,
        ev.end_time,
        ev.is_all_day,
        ev.location,
        ev.color,
        creatorId,
        ev.attendees,
      ]
    );
    count++;
    console.log(`  ✓ ${ev.title}`);
  }

  console.log(`\n✅ Seeded ${count} calendar events`);
  await client.end();
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
