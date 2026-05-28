// seed-scheduled-reports.js — Seed demo data cho ScheduledReport
const { Client } = require('pg');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://loop:loop_password@localhost:5432/loop_db';

const reports = [
  {
    name: 'Báo cáo lương tháng — Kế toán',
    template: 'payroll-summary',
    recipients: ['ketoan@loop.vn', 'giamdoc@loop.vn'],
    frequency: 'MONTHLY',
    day_of_week: null,
    day_of_month: 5,
    hour: 8,
    report_format: 'EXCEL',
    is_active: true,
    sent_count: 5,
  },
  {
    name: 'OKR Progress — Ban lãnh đạo',
    template: 'okr-progress',
    recipients: ['ceo@loop.vn', 'coo@loop.vn'],
    frequency: 'WEEKLY',
    day_of_week: 1,
    day_of_month: null,
    hour: 8,
    report_format: 'PDF',
    is_active: true,
    sent_count: 12,
  },
  {
    name: 'Headcount Report — HR',
    template: 'headcount',
    recipients: ['hr@loop.vn'],
    frequency: 'MONTHLY',
    day_of_week: null,
    day_of_month: 1,
    hour: 9,
    report_format: 'EXCEL',
    is_active: false,
    sent_count: 2,
  },
];

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  let inserted = 0;
  for (const r of reports) {
    await client.query(
      `INSERT INTO scheduled_reports (
        id, name, template, recipients, frequency,
        day_of_week, day_of_month, hour, report_format,
        is_active, sent_count, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, NOW(), NOW()
      )
      ON CONFLICT DO NOTHING`,
      [
        r.name, r.template, r.recipients, r.frequency,
        r.day_of_week, r.day_of_month, r.hour, r.report_format,
        r.is_active, r.sent_count,
      ],
    );
    inserted++;
  }

  await client.end();
  console.log(`✅ Seeded ${inserted} scheduled reports`);
}

main().catch((err) => {
  console.error('❌ Seed thất bại:', err.message);
  process.exit(1);
});
