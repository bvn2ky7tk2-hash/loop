'use strict';
/**
 * seed-client-contracts.js — Seed demo data cho Client Contracts
 * Chạy: node prisma/seed-client-contracts.js
 */

require('dotenv/config');
const { Client } = require('pg');
const { randomUUID: uid } = require('crypto');

const db = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db',
});

async function main() {
  await db.connect();

  // Lấy customers đã seed
  const custRes = await db.query(`SELECT id, code FROM customers WHERE code IN ('VNG','FPT','VTEL')`);
  const custMap = Object.fromEntries(custRes.rows.map(r => [r.code, r.id]));

  if (!custMap['VNG'] || !custMap['FPT'] || !custMap['VTEL']) {
    console.log('⚠ Chưa có customers, bỏ qua seed client contracts');
    await db.end();
    return;
  }

  const contracts = [
    {
      id: uid(), contractNo: 'CTR-2025-001',
      title: 'Hợp đồng triển khai Portal nội bộ VNG',
      customerId: custMap['VNG'], type: 'SERVICE', value: 320_000_000, currency: 'VND',
      startDate: '2025-03-01', endDate: '2025-09-30', signedAt: '2025-02-20', status: 'COMPLETED',
    },
    {
      id: uid(), contractNo: 'CTR-2025-002',
      title: 'Dịch vụ ERP Phase 1 — FPT Software',
      customerId: custMap['FPT'], type: 'SERVICE', value: 580_000_000, currency: 'VND',
      startDate: '2025-06-01', endDate: '2026-05-31', signedAt: '2025-05-25', status: 'ACTIVE',
    },
    {
      id: uid(), contractNo: 'CTR-2026-001',
      title: 'SLA Support — Viettel Data Platform',
      customerId: custMap['VTEL'], type: 'SLA', value: 240_000_000, currency: 'VND',
      startDate: '2026-01-01', endDate: '2026-12-31', signedAt: '2025-12-20', status: 'ACTIVE',
    },
    {
      id: uid(), contractNo: 'CTR-2026-002',
      title: 'Phát triển Mobile App — FPT Mobile Suite',
      customerId: custMap['FPT'], type: 'PRODUCT', value: 185_000_000, currency: 'VND',
      startDate: '2026-04-01', endDate: '2026-10-31', signedAt: '2026-03-28', status: 'ACTIVE',
    },
    {
      id: uid(), contractNo: 'CTR-2026-003',
      title: 'Tư vấn chuyển đổi số — VNG',
      customerId: custMap['VNG'], type: 'SUPPORT', value: 90_000_000, currency: 'VND',
      startDate: '2026-05-01', endDate: '2026-07-31', signedAt: null, status: 'DRAFT',
    },
  ];

  const milestonesByContractNo = {
    'CTR-2025-001': [
      { name: 'Kickoff & Analysis',   dueDate: '2025-03-31', amount: 64_000_000,  status: 'PAID',     paidAt: '2025-04-05' },
      { name: 'Design & Prototype',   dueDate: '2025-05-31', amount: 96_000_000,  status: 'PAID',     paidAt: '2025-06-02' },
      { name: 'Development Phase 1',  dueDate: '2025-07-31', amount: 96_000_000,  status: 'PAID',     paidAt: '2025-08-01' },
      { name: 'UAT & Go-live',        dueDate: '2025-09-30', amount: 64_000_000,  status: 'PAID',     paidAt: '2025-10-05' },
    ],
    'CTR-2025-002': [
      { name: 'Tạm ứng ký hợp đồng', dueDate: '2025-06-05', amount: 116_000_000, status: 'PAID',     paidAt: '2025-06-07' },
      { name: 'Hoàn thành phân tích', dueDate: '2025-08-31', amount: 145_000_000, status: 'PAID',     paidAt: '2025-09-03' },
      { name: 'Hoàn thành dev core',  dueDate: '2026-01-31', amount: 174_000_000, status: 'INVOICED', paidAt: null },
      { name: 'Go-live & bảo hành',   dueDate: '2026-05-31', amount: 145_000_000, status: 'PENDING',  paidAt: null },
    ],
    'CTR-2026-001': [
      { name: 'Q1/2026', dueDate: '2026-03-31', amount: 60_000_000, status: 'PAID',     paidAt: '2026-04-05' },
      { name: 'Q2/2026', dueDate: '2026-06-30', amount: 60_000_000, status: 'INVOICED', paidAt: null },
      { name: 'Q3/2026', dueDate: '2026-09-30', amount: 60_000_000, status: 'PENDING',  paidAt: null },
      { name: 'Q4/2026', dueDate: '2026-12-31', amount: 60_000_000, status: 'PENDING',  paidAt: null },
    ],
    'CTR-2026-002': [
      { name: 'Tạm ứng',             dueDate: '2026-04-05', amount: 37_000_000,  status: 'PAID',    paidAt: '2026-04-06' },
      { name: 'Hoàn thành thiết kế', dueDate: '2026-06-15', amount: 55_500_000,  status: 'PENDING', paidAt: null },
      { name: 'Beta release',         dueDate: '2026-09-15', amount: 55_500_000,  status: 'PENDING', paidAt: null },
      { name: 'Go-live',              dueDate: '2026-10-31', amount: 37_000_000,  status: 'PENDING', paidAt: null },
    ],
    'CTR-2026-003': [
      { name: 'Khảo sát & báo cáo hiện trạng', dueDate: '2026-05-31', amount: 30_000_000, status: 'PENDING', paidAt: null },
      { name: 'Roadmap chuyển đổi số',          dueDate: '2026-06-30', amount: 35_000_000, status: 'PENDING', paidAt: null },
      { name: 'Bàn giao tài liệu',              dueDate: '2026-07-31', amount: 25_000_000, status: 'PENDING', paidAt: null },
    ],
  };

  let inserted = 0;
  for (const c of contracts) {
    const exists = await db.query(`SELECT id FROM client_contracts WHERE contract_no = $1`, [c.contractNo]);
    if (exists.rows.length > 0) continue;

    await db.query(
      `INSERT INTO client_contracts (id, contract_no, title, customer_id, type, value, currency, start_date, end_date, signed_at, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
      [c.id, c.contractNo, c.title, c.customerId, c.type, c.value, c.currency,
       c.startDate, c.endDate, c.signedAt, c.status],
    );

    const milestones = milestonesByContractNo[c.contractNo] || [];
    for (const m of milestones) {
      await db.query(
        `INSERT INTO contract_milestones (id, contract_id, name, due_date, amount, status, paid_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [uid(), c.id, m.name, m.dueDate, m.amount, m.status, m.paidAt],
      );
    }
    inserted++;
  }

  console.log(`✓ ${inserted} client contracts seeded`);
  await db.end();
}

main().catch(e => { console.error(e); process.exit(1); });
