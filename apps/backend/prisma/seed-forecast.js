'use strict';
/**
 * seed-forecast.js — Seed revenue targets cho Sales Forecasting
 * Chạy: node prisma/seed-forecast.js
 */

require('dotenv/config');
const { Client } = require('pg');
const { randomUUID: uid } = require('crypto');

const db = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db',
});

// Revenue targets tháng (VND)
const monthlyTargets = [
  { period: '2026-04', target: 15_000_000_000 },
  { period: '2026-05', target: 20_000_000_000 },
  { period: '2026-06', target: 25_000_000_000 },
  { period: '2026-07', target: 25_000_000_000 },
  { period: '2026-08', target: 30_000_000_000 },
  { period: '2026-09', target: 30_000_000_000 },
];

// Revenue targets quý
const quarterlyTargets = [
  { period: '2026-Q1', target: 30_000_000_000 },
  { period: '2026-Q2', target: 60_000_000_000 },
  { period: '2026-Q3', target: 85_000_000_000 },
  { period: '2026-Q4', target: 100_000_000_000 },
];

async function main() {
  await db.connect();

  let inserted = 0;
  for (const t of [...monthlyTargets, ...quarterlyTargets]) {
    const periodType = t.period.includes('Q') ? 'QUARTERLY' : 'MONTHLY';
    const exists = await db.query(
      `SELECT id FROM revenue_targets WHERE period = $1 AND period_type = $2`,
      [t.period, periodType],
    );
    if (exists.rows.length) {
      await db.query(
        `UPDATE revenue_targets SET target = $1 WHERE period = $2 AND period_type = $3`,
        [t.target, t.period, periodType],
      );
      continue;
    }
    await db.query(
      `INSERT INTO revenue_targets (id, period, period_type, target, currency, created_at, updated_at)
       VALUES ($1,$2,$3,$4,'VND',NOW(),NOW())`,
      [uid(), t.period, periodType, t.target],
    );
    inserted++;
  }

  console.log(`✓ ${inserted} revenue targets seeded (${monthlyTargets.length} monthly + ${quarterlyTargets.length} quarterly)`);
  await db.end();
}

main().catch(e => { console.error(e); process.exit(1); });
