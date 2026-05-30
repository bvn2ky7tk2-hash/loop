/**
 * Seed demo data cho E26: Platform Utilities
 * - SystemAnnouncement (3 bản ghi: INFO, WARNING, CRITICAL)
 * - EmailLog (20 bản ghi demo)
 * Chạy: node prisma/seed-e26-platform.js
 */
const { Client } = require('pg');
const { randomUUID } = require('crypto');

const db = new Client({
  host: 'localhost', port: 5432,
  user: 'loop', password: 'loop_password', database: 'loop_db',
});

const now = new Date();
const daysAgo  = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };
const daysFrom = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); };

async function main() {
  await db.connect();
  console.log('E26 Platform Utilities seed starting...\n');

  // ── SystemAnnouncement ────────────────────────────────────────────────────────

  const announcements = [
    {
      id: randomUUID(),
      message: 'Hệ thống Loop 360 sẽ bảo trì vào 02:00 - 04:00 ngày 01/06/2026. Vui lòng hoàn thành công việc trước thời gian này.',
      type: 'WARNING',
      start_at: daysAgo(1),
      end_at: daysFrom(2),
    },
    {
      id: randomUUID(),
      message: 'Phiên bản Loop 360 v5.0 đã ra mắt! Xem chi tiết tính năng mới tại trang Release Notes.',
      type: 'INFO',
      start_at: daysAgo(7),
      end_at: daysFrom(14),
    },
    {
      id: randomUUID(),
      message: 'LỖI KHẨN: Phát hiện sự cố thanh toán lương. Vui lòng liên hệ HR ngay.',
      type: 'CRITICAL',
      start_at: now.toISOString(),
      end_at: daysFrom(1),
    },
  ];

  for (const a of announcements) {
    await db.query(
      `INSERT INTO system_announcements (id, message, type, start_at, end_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [a.id, a.message, a.type, a.start_at, a.end_at],
    );
  }
  console.log(`SystemAnnouncement: ${announcements.length} records inserted`);

  // ── EmailLog ──────────────────────────────────────────────────────────────────

  const modules = ['notifications', 'payroll', 'hr', 'system'];
  const statuses = ['SENT', 'SENT', 'SENT', 'FAILED', 'SENT']; // 80% SENT

  const emails = [
    'nguyen.van.a@example.com',
    'tran.thi.b@example.com',
    'le.van.c@example.com',
    'pham.thi.d@example.com',
    'hoang.van.e@example.com',
  ];

  const subjects = [
    '[Loop 360] Phiếu lương tháng 5/2026 đã sẵn sàng',
    '[Loop 360] Yêu cầu nghỉ phép đã được duyệt',
    '[Loop 360] Nhắc nhở: nộp timesheet trước 31/05',
    '[Loop 360] Thông báo hệ thống: bảo trì định kỳ',
    '[Loop 360] OT đã được duyệt: 4 giờ ngày 28/05',
  ];

  for (let i = 0; i < 20; i++) {
    const status = statuses[i % statuses.length];
    await db.query(
      `INSERT INTO email_logs (id, to_email, subject, status, module, error, sent_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        randomUUID(),
        emails[i % emails.length],
        subjects[i % subjects.length],
        status,
        modules[i % modules.length],
        status === 'FAILED' ? 'Connection refused: SMTP server unavailable' : null,
        status === 'SENT' ? daysAgo(Math.floor(Math.random() * 7)) : null,
        daysAgo(Math.floor(Math.random() * 14)),
      ],
    );
  }
  console.log('EmailLog: 20 demo records inserted');

  await db.end();
  console.log('\nE26 seed completed!');
}

main().catch((e) => { console.error(e); process.exit(1); });
