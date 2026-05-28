'use strict';
/**
 * seed-okr.js — Seed demo data cho OKR & KPI
 * Chạy: node prisma/seed-okr.js
 */

require('dotenv/config');
const { Client } = require('pg');
const { randomUUID: uid } = require('crypto');

const db = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db',
});

// User IDs từ DB
const USERS = {
  admin:   'ce54ea7d-26b9-44f3-85d1-c1647548619b', // Phan Tuấn Anh - CEO
  binh:    'b97f94b3-92ef-4141-ae2b-f620bb02da62', // Trần Thị Bình
  nam:     '29940397-a6bc-4fce-bc87-639a05aab4dd', // Nguyễn Hữu Nam
  huong:   '540b8315-6151-476f-90a3-3f7f29c570f9', // Ngô Thị Hương
  hoa:     '60d6c58d-2582-4531-81ef-623fb269e435', // Lê Thị Hoa - HR
  tai:     '094653ee-af94-421a-89eb-67e51961b66d', // Phạm Văn Tài - Finance
  an:      'e3c4b016-1a88-4c65-8b1d-72730d443160', // Đinh Gia An - PM
  chi:     '05484b82-5564-4b38-9ca1-4c18d5fe7a36', // Trần Thúy Chi - PM
};

// ───────────────────────────────────────────────────────────
// OKR Objectives
// ───────────────────────────────────────────────────────────
const objectives = [
  {
    id: uid(),
    title: 'Tăng trưởng doanh thu 40% trong Q2 2026',
    description: 'Đẩy mạnh bán hàng và mở rộng tệp khách hàng mới tại thị trường miền Nam',
    cycle: 'Q2',
    year: 2026,
    ownerId: USERS.admin,
    status: 'ACTIVE',
    keyResults: [
      { title: 'Đạt doanh thu 8 tỷ VNĐ trong Q2', unit: 'tỷ VNĐ', startValue: 0, targetValue: 8, currentValue: 5.6 },
      { title: 'Ký mới 15 hợp đồng enterprise', unit: 'hợp đồng', startValue: 0, targetValue: 15, currentValue: 9 },
      { title: 'Tỷ lệ win-rate deals đạt 35%', unit: '%', startValue: 22, targetValue: 35, currentValue: 29 },
    ],
  },
  {
    id: uid(),
    title: 'Nâng cao chất lượng sản phẩm — giảm bug rate 60%',
    description: 'Xây dựng quy trình QA vững chắc, CI/CD tự động, code review nghiêm túc',
    cycle: 'H1',
    year: 2026,
    ownerId: USERS.an,
    status: 'ACTIVE',
    keyResults: [
      { title: 'Giảm số bug Critical/High xuống < 5 bug/sprint', unit: 'bugs', startValue: 18, targetValue: 5, currentValue: 8 },
      { title: 'Unit test coverage đạt 80%', unit: '%', startValue: 42, targetValue: 80, currentValue: 65 },
      { title: 'Thời gian deploy xuống dưới 10 phút', unit: 'phút', startValue: 35, targetValue: 10, currentValue: 14 },
      { title: 'NPS từ khách hàng đạt 60+', unit: 'điểm', startValue: 38, targetValue: 60, currentValue: 52 },
    ],
  },
  {
    id: uid(),
    title: 'Xây dựng team mạnh — tuyển 20 nhân sự chất lượng cao',
    description: 'Mở rộng đội ngũ kỹ thuật và sale để đáp ứng tốc độ tăng trưởng',
    cycle: 'Q2',
    year: 2026,
    ownerId: USERS.hoa,
    status: 'ACTIVE',
    keyResults: [
      { title: 'Tuyển dụng 12 kỹ sư Senior+', unit: 'người', startValue: 0, targetValue: 12, currentValue: 7 },
      { title: 'Tuyển 5 nhân viên sale B2B', unit: 'người', startValue: 0, targetValue: 5, currentValue: 3 },
      { title: 'Tỷ lệ nhân viên mới pass probation đạt 90%', unit: '%', startValue: 70, targetValue: 90, currentValue: 85 },
      { title: 'eNPS nội bộ đạt 50+', unit: 'điểm', startValue: 32, targetValue: 50, currentValue: 44 },
    ],
  },
  {
    id: uid(),
    title: 'Tối ưu chi phí vận hành — giảm 15% cost',
    description: 'Rà soát và cắt giảm chi phí không cần thiết, tăng hiệu suất hoạt động',
    cycle: 'H1',
    year: 2026,
    ownerId: USERS.tai,
    status: 'ACTIVE',
    keyResults: [
      { title: 'Giảm chi phí cloud infrastructure 20%', unit: '%', startValue: 0, targetValue: 20, currentValue: 12 },
      { title: 'Giảm chi phí SaaS tools xuống 50 triệu/tháng', unit: 'triệu VNĐ', startValue: 82, targetValue: 50, currentValue: 63 },
      { title: 'Tăng revenue per employee lên 350 triệu/năm', unit: 'triệu VNĐ', startValue: 280, targetValue: 350, currentValue: 310 },
    ],
  },
  {
    id: uid(),
    title: 'Đẩy mạnh marketing — tăng brand awareness 3x',
    description: 'Xây dựng thương hiệu Loop360 trên thị trường ERP Việt Nam',
    cycle: 'Q1',
    year: 2026,
    ownerId: USERS.chi,
    status: 'COMPLETED',
    keyResults: [
      { title: 'Tăng traffic website lên 50,000 visit/tháng', unit: 'visits', startValue: 12000, targetValue: 50000, currentValue: 54200 },
      { title: 'Đạt 5,000 follower LinkedIn', unit: 'followers', startValue: 800, targetValue: 5000, currentValue: 5240 },
      { title: 'Tổ chức 4 webinar với 100+ người tham dự mỗi lần', unit: 'webinars', startValue: 0, targetValue: 4, currentValue: 4 },
    ],
  },
  {
    id: uid(),
    title: 'Ra mắt Loop360 Mobile App phiên bản 1.0',
    description: 'Phát triển và launch mobile app cho iOS/Android với tính năng cốt lõi',
    cycle: 'Q3',
    year: 2026,
    ownerId: USERS.nam,
    status: 'DRAFT',
    keyResults: [
      { title: 'Hoàn thành 80% features roadmap mobile', unit: '%', startValue: 0, targetValue: 80, currentValue: 0 },
      { title: 'App rating App Store 4.5+ sao', unit: 'sao', startValue: 0, targetValue: 4.5, currentValue: 0 },
      { title: 'Đạt 1,000 downloads trong tháng đầu', unit: 'downloads', startValue: 0, targetValue: 1000, currentValue: 0 },
    ],
  },
];

// ───────────────────────────────────────────────────────────
// KPI Metrics
// ───────────────────────────────────────────────────────────
const kpiMetrics = [
  {
    id: uid(),
    name: 'Monthly Recurring Revenue (MRR)',
    description: 'Doanh thu định kỳ hàng tháng từ khách hàng subscription',
    unit: 'triệu VNĐ',
    targetValue: 1500,
    frequency: 'MONTHLY',
    isActive: true,
    records: [
      { period: '2025-11', value: 780 },
      { period: '2025-12', value: 850 },
      { period: '2026-01', value: 920 },
      { period: '2026-02', value: 1050 },
      { period: '2026-03', value: 1180 },
      { period: '2026-04', value: 1280 },
      { period: '2026-05', value: 1350 },
    ],
  },
  {
    id: uid(),
    name: 'Tỷ lệ giữ chân khách hàng (Retention Rate)',
    description: 'Phần trăm khách hàng tiếp tục gia hạn hợp đồng',
    unit: '%',
    targetValue: 95,
    frequency: 'MONTHLY',
    isActive: true,
    records: [
      { period: '2025-11', value: 88 },
      { period: '2025-12', value: 89 },
      { period: '2026-01', value: 90 },
      { period: '2026-02', value: 91 },
      { period: '2026-03', value: 92 },
      { period: '2026-04', value: 93 },
      { period: '2026-05', value: 93.5 },
    ],
  },
  {
    id: uid(),
    name: 'Headcount tổng',
    description: 'Tổng số nhân viên toàn công ty (full-time)',
    unit: 'người',
    targetValue: 120,
    frequency: 'MONTHLY',
    isActive: true,
    records: [
      { period: '2025-11', value: 78 },
      { period: '2025-12', value: 82 },
      { period: '2026-01', value: 87 },
      { period: '2026-02', value: 91 },
      { period: '2026-03', value: 96 },
      { period: '2026-04', value: 101 },
      { period: '2026-05', value: 107 },
    ],
  },
  {
    id: uid(),
    name: 'Tỷ lệ bug Critical còn tồn đọng',
    description: 'Số bug Critical chưa được fix tính đến cuối tháng',
    unit: 'bugs',
    targetValue: 0,
    frequency: 'MONTHLY',
    isActive: true,
    records: [
      { period: '2025-11', value: 12 },
      { period: '2025-12', value: 9 },
      { period: '2026-01', value: 7 },
      { period: '2026-02', value: 5 },
      { period: '2026-03', value: 4 },
      { period: '2026-04', value: 2 },
      { period: '2026-05', value: 1 },
    ],
  },
  {
    id: uid(),
    name: 'Customer Satisfaction Score (CSAT)',
    description: 'Điểm hài lòng khách hàng sau support ticket',
    unit: '/10',
    targetValue: 9,
    frequency: 'MONTHLY',
    isActive: true,
    records: [
      { period: '2025-11', value: 7.2 },
      { period: '2025-12', value: 7.5 },
      { period: '2026-01', value: 7.8 },
      { period: '2026-02', value: 8.1 },
      { period: '2026-03', value: 8.3 },
      { period: '2026-04', value: 8.5 },
      { period: '2026-05', value: 8.7 },
    ],
  },
  {
    id: uid(),
    name: 'Tỷ lệ hoàn thành dự án đúng hạn',
    description: 'Phần trăm milestone/deliverable hoàn thành đúng deadline',
    unit: '%',
    targetValue: 90,
    frequency: 'MONTHLY',
    isActive: true,
    records: [
      { period: '2025-11', value: 72 },
      { period: '2025-12', value: 74 },
      { period: '2026-01', value: 76 },
      { period: '2026-02', value: 79 },
      { period: '2026-03', value: 81 },
      { period: '2026-04', value: 84 },
      { period: '2026-05', value: 86 },
    ],
  },
  {
    id: uid(),
    name: 'Revenue Q2 2026',
    description: 'Tổng doanh thu Quý 2/2026 (tích lũy)',
    unit: 'tỷ VNĐ',
    targetValue: 8,
    frequency: 'QUARTERLY',
    isActive: true,
    records: [
      { period: '2025-Q4', value: 5.2 },
      { period: '2026-Q1', value: 6.1 },
    ],
  },
];

// ───────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────
async function main() {
  await db.connect();

  // Insert objectives + key results
  let objInserted = 0;
  let krInserted = 0;

  for (const obj of objectives) {
    const exists = await db.query(
      `SELECT id FROM okr_objectives WHERE title = $1 AND year = $2 AND cycle = $3`,
      [obj.title, obj.year, obj.cycle],
    );
    if (exists.rows.length) {
      console.log(`  skip objective: ${obj.title.substring(0, 50)}...`);
      continue;
    }

    await db.query(
      `INSERT INTO okr_objectives (id, title, description, cycle, year, owner_id, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
      [obj.id, obj.title, obj.description, obj.cycle, obj.year, obj.ownerId, obj.status],
    );
    objInserted++;

    for (const kr of obj.keyResults) {
      const krId = uid();
      await db.query(
        `INSERT INTO okr_key_results (id, objective_id, title, unit, start_value, target_value, current_value, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
        [krId, obj.id, kr.title, kr.unit, kr.startValue, kr.targetValue, kr.currentValue],
      );
      krInserted++;
    }
  }

  console.log(`✓ ${objInserted} objectives, ${krInserted} key results seeded`);

  // Insert KPI metrics + records
  let metricInserted = 0;
  let recordInserted = 0;

  for (const m of kpiMetrics) {
    const exists = await db.query(`SELECT id FROM kpi_metrics WHERE name = $1`, [m.name]);
    let metricId = m.id;

    if (exists.rows.length) {
      metricId = exists.rows[0].id;
      console.log(`  skip metric: ${m.name}`);
    } else {
      await db.query(
        `INSERT INTO kpi_metrics (id, name, description, unit, target_value, frequency, is_active, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
        [m.id, m.name, m.description, m.unit, m.targetValue, m.frequency, m.isActive],
      );
      metricInserted++;
    }

    for (const rec of m.records) {
      const recExists = await db.query(
        `SELECT id FROM kpi_records WHERE metric_id = $1 AND period = $2`,
        [metricId, rec.period],
      );
      if (recExists.rows.length) continue;

      await db.query(
        `INSERT INTO kpi_records (id, metric_id, period, value, created_at)
         VALUES ($1,$2,$3,$4,NOW())`,
        [uid(), metricId, rec.period, rec.value],
      );
      recordInserted++;
    }
  }

  console.log(`✓ ${metricInserted} KPI metrics, ${recordInserted} records seeded`);

  await db.end();
}

main().catch(e => { console.error(e); process.exit(1); });
