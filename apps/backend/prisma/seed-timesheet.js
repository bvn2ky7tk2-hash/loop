/**
 * seed-timesheet.js — Dữ liệu demo cho Timesheet Module (Epic 10)
 *
 * Tạo:
 *  • TimeEntry  : chấm công tháng 4 + tháng 5/2026 cho toàn bộ user
 *  • WorkStatus : trạng thái hiện tại của từng nhân sự
 *  • TimesheetRecord:
 *      – Tháng 4: APPROVED (admin, PM, leadership) | SUBMITTED (đang chờ) | REJECTED (1-2 người)
 *      – Tháng 5: DRAFT (mặc định) hoặc SUBMITTED
 *
 * Chạy: node apps/backend/prisma/seed-timesheet.js
 */

const { Client } = require('pg');
const { randomUUID } = require('crypto');

const db = new Client({
  host: 'localhost', port: 5432,
  user: 'loop', password: 'loop_password', database: 'loop_db',
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

/** ISO date string */
function ds(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** ISO weekday: Mon=1 … Sun=7 */
function isoWeekday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay();
  return day === 0 ? 7 : day;
}

/** All Mon–Fri in [start, end] */
function workdays(start, end) {
  const days = [];
  const cur = new Date(start + 'T00:00:00Z');
  const fin = new Date(end   + 'T00:00:00Z');
  while (cur <= fin) {
    const iso = cur.toISOString().slice(0, 10);
    if ([1, 2, 3, 4, 5].includes(isoWeekday(iso))) days.push(iso);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

/** Random check-in time: 7:45–9:15 */
function checkInTs(dateStr) {
  const h = rand(7, 9);
  const m = h === 7 ? rand(45, 59) : h === 9 ? rand(0, 15) : rand(0, 59);
  return `${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00+07:00`;
}

/** Random check-out time: depends on check-in, makes 7–10h */
function checkOutTs(dateStr, checkInTs) {
  const cin = new Date(checkInTs);
  const hoursWorked = randFloat(7, 10, 0.25);
  const cout = new Date(cin.getTime() + hoursWorked * 3_600_000);
  return cout.toISOString().replace('Z', '+00:00');
}

function randFloat(min, max, step) {
  const steps = Math.round((max - min) / step);
  return min + Math.round(Math.random() * steps) * step;
}

/** Compute workingDays + overtimeHours from a set of TimeEntry rows */
function computeSummary(entries) {
  let workingDays = 0;
  let overtimeHours = 0;
  for (const e of entries) {
    if (e.checkInAt && e.checkOutAt) {
      workingDays += 1;
      const hours = (new Date(e.checkOutAt) - new Date(e.checkInAt)) / 3_600_000;
      if (hours > 8) overtimeHours += hours - 8;
    }
  }
  return { workingDays, overtimeHours: +overtimeHours.toFixed(2) };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await db.connect();
  console.log('🔌 Kết nối DB thành công');

  // Clean existing timesheet data to allow re-run
  await db.query('DELETE FROM timesheet_records');
  await db.query('DELETE FROM time_entries');
  await db.query('DELETE FROM work_statuses');
  console.log('🧹 Đã xoá dữ liệu timesheet cũ');

  // Load all active users
  const { rows: users } = await db.query(
    `SELECT id, name, role, org_unit_id FROM users WHERE is_active = true ORDER BY created_at`
  );
  console.log(`👥 ${users.length} users đang hoạt động`);

  // Load admin/PM users for approver reference
  const { rows: managers } = await db.query(
    `SELECT id FROM users WHERE role IN ('ADMIN','PM','LEADERSHIP') AND is_active = true LIMIT 3`
  );
  const managerIds = managers.map(m => m.id);
  const approver = managerIds[0];

  // ── Periods ────────────────────────────────────────────────────────────────
  const APR_START = '2026-04-01';
  const APR_END   = '2026-04-30';
  const MAY_START = '2026-05-01';
  const MAY_END   = '2026-05-23'; // last workday before today (May 25 = Sunday)

  const aprWorkdays = workdays(APR_START, APR_END); // 22 ngày
  const mayWorkdays = workdays(MAY_START, MAY_END);  // 17 ngày

  console.log(`📅 Tháng 4: ${aprWorkdays.length} ngày công | Tháng 5: ${mayWorkdays.length} ngày công`);

  // ── Work Status distribution for current state ─────────────────────────────
  const STATUS_DIST = [
    'WORKING','WORKING','WORKING','WORKING','WORKING',
    'WFH','WFH','WFH',
    'MEETING','MEETING',
    'BREAK',
    'OFF',
    'BUSINESS_TRIP',
  ];

  // ── Per-user seed ──────────────────────────────────────────────────────────
  let totalEntries = 0;
  let totalRecords = 0;
  let totalStatuses = 0;

  for (let idx = 0; idx < users.length; idx++) {
    const user = users[idx];
    const isManager = ['ADMIN', 'PM', 'LEADERSHIP'].includes(user.role);

    // Absence probability: managers rarely absent, members ~15% chance per day
    const absenceChance = isManager ? 0.03 : 0.12;

    // ── April TimeEntries ────────────────────────────────────────────────────
    const aprEntries = [];
    for (const day of aprWorkdays) {
      if (Math.random() < absenceChance) continue; // absent
      const cin  = checkInTs(day);
      const cout = checkOutTs(day, cin);
      const entryId = randomUUID();
      await db.query(
        `INSERT INTO time_entries
           (id, user_id, date, check_in_at, check_out_at, check_in_method,
            is_manual_correction, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,'MANUAL',false,$4,$4)`,
        [entryId, user.id, day, cin, cout]
      );
      aprEntries.push({ checkInAt: cin, checkOutAt: cout });
      totalEntries++;
    }

    // ── May TimeEntries ──────────────────────────────────────────────────────
    const mayEntries = [];
    for (const day of mayWorkdays) {
      if (Math.random() < absenceChance) continue;
      const cin  = checkInTs(day);
      const cout = checkOutTs(day, cin);
      const entryId = randomUUID();
      await db.query(
        `INSERT INTO time_entries
           (id, user_id, date, check_in_at, check_out_at, check_in_method,
            is_manual_correction, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,'MANUAL',false,$4,$4)`,
        [entryId, user.id, day, cin, cout]
      );
      mayEntries.push({ checkInAt: cin, checkOutAt: cout });
      totalEntries++;
    }

    // ── April TimesheetRecord ────────────────────────────────────────────────
    const aprSummary = computeSummary(aprEntries);
    let aprStatus, aprSubmittedAt, aprApprovedAt, aprApprovedById, aprRejection, aprLockedAt;

    if (isManager) {
      // Managers: auto approved
      aprStatus = 'APPROVED';
      aprSubmittedAt = '2026-05-02T08:30:00+07:00';
      aprApprovedAt  = '2026-05-03T10:00:00+07:00';
      aprApprovedById = approver;
      aprLockedAt    = '2026-05-03T10:00:00+07:00';
      aprRejection   = null;
    } else if (idx % 15 === 3) {
      // 1 in 15: rejected
      aprStatus = 'REJECTED';
      aprSubmittedAt = '2026-05-02T09:00:00+07:00';
      aprApprovedAt  = null;
      aprApprovedById = null;
      aprLockedAt    = null;
      aprRejection   = 'Thiếu dữ liệu chấm công ngày 14/04 và 21/04. Vui lòng bổ sung và nộp lại.';
    } else if (idx % 8 === 0) {
      // 1 in 8: still submitted (pending)
      aprStatus = 'SUBMITTED';
      aprSubmittedAt = `2026-05-0${rand(1,5)}T0${rand(8,9)}:${rand(10,59)}:00+07:00`;
      aprApprovedAt  = null;
      aprApprovedById = null;
      aprLockedAt    = null;
      aprRejection   = null;
    } else {
      // Most: approved
      aprStatus = 'APPROVED';
      aprSubmittedAt = `2026-05-0${rand(1,5)}T0${rand(8,9)}:${rand(10,59)}:00+07:00`;
      aprApprovedAt  = `2026-05-0${rand(5,9)}T${rand(10,16)}:${rand(10,59)}:00+07:00`;
      aprApprovedById = approver;
      aprLockedAt    = aprApprovedAt;
      aprRejection   = null;
    }

    await db.query(
      `INSERT INTO timesheet_records
         (id, user_id, period_start, period_end,
          working_days, standard_days, overtime_hours, leave_days,
          status, submitted_at, approved_at, approved_by_id,
          rejection_reason, locked_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,0,$8,$9,$10,$11,$12,$13,NOW(),NOW())`,
      [
        randomUUID(), user.id, APR_START, APR_END,
        aprSummary.workingDays, aprWorkdays.length, aprSummary.overtimeHours,
        aprStatus, aprSubmittedAt, aprApprovedAt, aprApprovedById,
        aprRejection, aprLockedAt,
      ]
    );
    totalRecords++;

    // ── May TimesheetRecord ──────────────────────────────────────────────────
    const maySummary = computeSummary(mayEntries);
    let mayStatus = 'DRAFT';
    let maySubmittedAt = null;

    // ~30% have already submitted May
    if (idx % 10 < 3 && maySummary.workingDays > 0) {
      mayStatus = 'SUBMITTED';
      maySubmittedAt = `2026-05-${rand(20,23)}T0${rand(8,9)}:${rand(10,59)}:00+07:00`;
    }

    await db.query(
      `INSERT INTO timesheet_records
         (id, user_id, period_start, period_end,
          working_days, standard_days, overtime_hours, leave_days,
          status, submitted_at, approved_at, approved_by_id,
          rejection_reason, locked_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,0,$8,$9,NULL,NULL,NULL,NULL,NOW(),NOW())`,
      [
        randomUUID(), user.id, MAY_START, MAY_END,
        maySummary.workingDays, mayWorkdays.length, maySummary.overtimeHours,
        mayStatus, maySubmittedAt,
      ]
    );
    totalRecords++;

    // ── WorkStatus (current) ─────────────────────────────────────────────────
    const statusType = pick(STATUS_DIST);
    const sinceHour  = rand(7, 14);
    const sinceMin   = rand(0, 59);
    const sinceTs    = `2026-05-23T${String(sinceHour).padStart(2,'0')}:${String(sinceMin).padStart(2,'0')}:00+07:00`;

    await db.query(
      `INSERT INTO work_statuses (id, user_id, status_type, started_at, ended_at, created_at)
       VALUES ($1,$2,$3,$4,NULL,NOW())`,
      [randomUUID(), user.id, statusType, sinceTs]
    );
    totalStatuses++;
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n✅ Seed timesheet xong:`);
  console.log(`   📌 ${totalEntries}  time_entries (chấm công hàng ngày)`);
  console.log(`   📋 ${totalRecords} timesheet_records (bảng công kỳ)`);
  console.log(`   🟢 ${totalStatuses}  work_statuses (trạng thái hiện tại)`);

  const { rows: [stats] } = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='APPROVED')  AS approved,
      COUNT(*) FILTER (WHERE status='SUBMITTED') AS submitted,
      COUNT(*) FILTER (WHERE status='REJECTED')  AS rejected,
      COUNT(*) FILTER (WHERE status='DRAFT')     AS draft
    FROM timesheet_records
    WHERE period_start = '2026-04-01'
  `);
  console.log(`\n   Tháng 4/2026:`);
  console.log(`     ✅ APPROVED  : ${stats.approved}`);
  console.log(`     🔄 SUBMITTED : ${stats.submitted}`);
  console.log(`     ❌ REJECTED  : ${stats.rejected}`);

  const { rows: [stats5] } = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='SUBMITTED') AS submitted,
      COUNT(*) FILTER (WHERE status='DRAFT')     AS draft
    FROM timesheet_records
    WHERE period_start = '2026-05-01'
  `);
  console.log(`\n   Tháng 5/2026:`);
  console.log(`     🔄 SUBMITTED : ${stats5.submitted}`);
  console.log(`     📝 DRAFT     : ${stats5.draft}`);

  const { rows: statusStats } = await db.query(`
    SELECT status_type, COUNT(*) as cnt
    FROM work_statuses WHERE ended_at IS NULL
    GROUP BY status_type ORDER BY cnt DESC
  `);
  console.log('\n   Trạng thái hiện tại team:');
  for (const s of statusStats) {
    console.log(`     ${s.status_type.padEnd(14)}: ${s.cnt}`);
  }
}

main()
  .catch(err => { console.error('❌ Lỗi:', err.message); process.exit(1); })
  .finally(() => db.end());
