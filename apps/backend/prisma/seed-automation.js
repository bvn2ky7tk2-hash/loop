const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db';

const RULES = [
  {
    key: 'timesheet-reminder',
    name: 'Nhắc nộp Timesheet',
    description: 'Gửi thông báo cho nhân viên chưa nộp timesheet tuần này vào mỗi thứ 6 lúc 17h.',
    cron_expr: '0 17 * * 5',
    is_active: true,
  },
  {
    key: 'contract-expiry',
    name: 'Cảnh báo Hợp đồng hết hạn',
    description: 'Thông báo cho HR khi có hợp đồng sắp hết hạn trong 30 ngày tới.',
    cron_expr: '0 9 * * *',
    is_active: true,
  },
  {
    key: 'leave-escalation',
    name: 'Đơn nghỉ phép tồn đọng',
    description: 'Nhắc manager xử lý các đơn nghỉ phép đã chờ quá 2 ngày.',
    cron_expr: '0 10 * * *',
    is_active: true,
  },
  {
    key: 'okr-checkin-reminder',
    name: 'Nhắc Check-in OKR',
    description: 'Nhắc nhân viên cập nhật tiến độ OKR chưa được cập nhật trong 14 ngày.',
    cron_expr: '0 9 * * 1',
    is_active: true,
  },
];

async function seed() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  try {
    for (const rule of RULES) {
      await client.query(
        `INSERT INTO automation_rules (id, key, name, description, cron_expr, is_active, run_count, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 0, NOW(), NOW())
         ON CONFLICT (key) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           cron_expr = EXCLUDED.cron_expr,
           is_active = EXCLUDED.is_active,
           updated_at = NOW()`,
        [rule.key, rule.name, rule.description, rule.cron_expr, rule.is_active],
      );
      console.log(`✓ ${rule.key}`);
    }
    console.log('Seed automation_rules hoàn tất!');
  } finally {
    await client.end();
  }
}

seed().catch(err => { console.error(err); process.exit(1); });
