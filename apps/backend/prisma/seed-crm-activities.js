'use strict';
/**
 * seed-crm-activities.js — Seed demo data cho CRM Activity Logging
 * Chạy: node prisma/seed-crm-activities.js
 */

require('dotenv/config');
const { Client } = require('pg');
const { randomUUID: uid } = require('crypto');

const db = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db',
});

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

async function main() {
  await db.connect();

  const custRes = await db.query(`SELECT id, code FROM customers WHERE code IN ('VNG','FPT','VTEL')`);
  const custMap = Object.fromEntries(custRes.rows.map(r => [r.code, r.id]));

  const adminRes = await db.query(`SELECT id FROM users WHERE email = 'admin@loop.vn' LIMIT 1`);
  const pmRes    = await db.query(`SELECT id FROM users WHERE email = 'pm@loop.vn' LIMIT 1`);

  if (!adminRes.rows.length || !custMap['VNG']) {
    console.log('⚠ Chưa có users/customers, bỏ qua seed activities');
    await db.end();
    return;
  }

  const adminId = adminRes.rows[0].id;
  const pmId    = pmRes.rows[0]?.id ?? adminId;

  const activities = [
    // VNG activities
    {
      id: uid(), type: 'CALL', subject: 'Gọi điện giới thiệu dịch vụ ERP',
      content: 'Đã liên hệ với CTO VNG. Họ đang tìm giải pháp ERP thay thế SAP B1.',
      customerId: custMap['VNG'], duration: 25,
      outcome: 'Khách hàng có interest. Yêu cầu gửi brochure và case study.',
      nextAction: 'Gửi brochure + 2 case study trong ngành Technology',
      nextActionDueAt: daysFromNow(2),
      scheduledAt: daysAgo(15), completedAt: daysAgo(15),
      createdById: pmId, createdAt: daysAgo(15),
    },
    {
      id: uid(), type: 'EMAIL', subject: 'Gửi proposal triển khai Portal nội bộ',
      content: 'Đã gửi proposal chi tiết cho dự án Portal nội bộ trị giá 320M. Bao gồm timeline 7 tháng và team setup.',
      customerId: custMap['VNG'],
      outcome: 'Proposal đã gửi thành công. Chờ feedback từ Procurement team.',
      nextAction: 'Follow-up nếu không nhận phản hồi sau 3 ngày',
      nextActionDueAt: daysFromNow(1),
      scheduledAt: daysAgo(10), completedAt: daysAgo(10),
      createdById: adminId, createdAt: daysAgo(10),
    },
    {
      id: uid(), type: 'MEETING', subject: 'Demo hệ thống với team VNG',
      content: 'Demo trực tiếp tại văn phòng VNG. Tham dự: CTO, IT Manager, Procurement Lead (3 người).\nĐã demo module HR, Project Management và reporting.',
      customerId: custMap['VNG'], duration: 120,
      outcome: 'Demo ấn tượng. IT Manager muốn xem thêm tính năng BPM và workflow approval.',
      nextAction: 'Chuẩn bị demo BPM/workflow lần 2, mời thêm CFO tham dự',
      nextActionDueAt: daysFromNow(5),
      scheduledAt: daysAgo(5), completedAt: daysAgo(5),
      createdById: adminId, createdAt: daysAgo(5),
    },
    {
      id: uid(), type: 'NOTE', subject: 'Ghi chú: VNG đang so sánh với Odoo',
      content: 'Thông tin từ contact nội bộ: VNG đang song song xem xét Odoo Community. Budget họ có là ~400M.\nĐiểm mạnh cần nhấn: support tiếng Việt, tích hợp tốt hơn, team local.',
      customerId: custMap['VNG'],
      nextAction: 'Chuẩn bị battle card so sánh Loop vs Odoo',
      nextActionDueAt: daysFromNow(3),
      createdById: pmId, createdAt: daysAgo(3),
    },
    // FPT activities
    {
      id: uid(), type: 'CALL', subject: 'Follow-up sau ký hợp đồng ERP Phase 1',
      content: 'Gọi điện cho Project Lead FPT. Kickoff meeting dự kiến tuần tới.',
      customerId: custMap['FPT'], duration: 15,
      outcome: 'Đã confirm lịch kickoff: 09/06/2026. Họ sẽ chuẩn bị danh sách requirements.',
      nextAction: 'Gửi meeting agenda + checklist chuẩn bị kickoff',
      nextActionDueAt: daysFromNow(1),
      scheduledAt: daysAgo(2), completedAt: daysAgo(2),
      createdById: adminId, createdAt: daysAgo(2),
    },
    {
      id: uid(), type: 'MEETING', subject: 'Kickoff meeting dự án ERP FPT Phase 1',
      content: 'Meeting kickoff chính thức. Tham dự: PM Loop (2 người) + FPT team (5 người).\nĐã thống nhất: phạm vi, timeline, communication plan, escalation path.',
      customerId: custMap['FPT'], duration: 90,
      outcome: 'Kickoff thành công. FPT đánh giá cao tài liệu chuẩn bị. Tinh thần team tốt.',
      nextAction: 'Gửi MOM (Minutes of Meeting) cho FPT trong hôm nay',
      nextActionDueAt: daysFromNow(0),
      scheduledAt: daysAgo(1), completedAt: daysAgo(1),
      createdById: adminId, createdAt: daysAgo(1),
    },
    {
      id: uid(), type: 'EMAIL', subject: 'Gửi MOM Kickoff + Project Charter',
      content: 'Đã gửi:\n- Minutes of Meeting kickoff\n- Project Charter v1.0\n- Communication Matrix\n- Risk Register ban đầu',
      customerId: custMap['FPT'],
      outcome: 'Email đã gửi. FPT xác nhận nhận được.',
      nextAction: 'Chờ FPT sign-off Project Charter',
      nextActionDueAt: daysFromNow(3),
      createdById: adminId, createdAt: daysAgo(0),
    },
    // Viettel activities
    {
      id: uid(), type: 'CALL', subject: 'Tư vấn mở rộng SLA sang module khác',
      content: 'CIO Viettel Digital hỏi về khả năng mở rộng SLA để cover thêm module HR và Payroll.',
      customerId: custMap['VTEL'], duration: 30,
      outcome: 'Có potential upsell. Họ đang budgeting cho H2/2026.',
      nextAction: 'Chuẩn bị quotation gói SLA mở rộng HR+Payroll',
      nextActionDueAt: daysFromNow(7),
      scheduledAt: daysAgo(7), completedAt: daysAgo(7),
      createdById: pmId, createdAt: daysAgo(7),
    },
    {
      id: uid(), type: 'NOTE', subject: 'Q2 review: Viettel hài lòng với SLA response time',
      content: 'Feedback từ quarterly review:\n- Response time: 98.5% đúng SLA\n- Satisfaction score: 4.2/5\n- 1 issue về performance báo cáo đã được fix\nKhách hàng muốn thêm custom dashboard.',
      customerId: custMap['VTEL'],
      nextAction: 'Báo giá custom dashboard cho Viettel',
      nextActionDueAt: daysFromNow(10),
      createdById: pmId, createdAt: daysAgo(14),
    },
  ];

  let inserted = 0;
  for (const act of activities) {
    const { createdAt, ...rest } = act;
    const exists = await db.query(`SELECT id FROM crm_activities WHERE subject = $1 AND customer_id = $2`, [act.subject, act.customerId]);
    if (exists.rows.length) continue;

    await db.query(
      `INSERT INTO crm_activities
        (id, type, subject, content, customer_id, duration, outcome, next_action, next_action_due_at,
         scheduled_at, completed_at, created_by_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())`,
      [
        rest.id, rest.type, rest.subject, rest.content ?? null, rest.customerId,
        rest.duration ?? null, rest.outcome ?? null, rest.nextAction ?? null,
        rest.nextActionDueAt ?? null, rest.scheduledAt ?? null, rest.completedAt ?? null,
        rest.createdById, createdAt,
      ],
    );
    inserted++;
  }

  console.log(`✓ ${inserted} CRM activities seeded`);
  await db.end();
}

main().catch(e => { console.error(e); process.exit(1); });
