/**
 * Seed dữ liệu ca làm việc:
 * 1. Ca Hành chính (08:00-17:00, off T7/CN)
 * 2. Ca Off (CA_OFF — ca nghỉ)
 * 3. Lịch Công nhân: 6 ngày làm + 1 ngày CA_OFF (xoay hàng ngày)
 */

import 'dotenv/config';
import { Client } from 'pg';

const DB_URL = process.env['DATABASE_URL'] || 'postgresql://loop:loop_password@localhost:5432/loop_db';

// Minimal upsert helpers using raw SQL
async function upsertShift(client: Client, data: {
  code: string; name: string; type: string; startTime: string; endTime: string;
  breakMinutes: number; description?: string;
}): Promise<string> {
  const res = await client.query(
    `INSERT INTO work_shifts (id, code, name, type, start_time, end_time, break_minutes, is_active, description, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, $7, now(), now())
     ON CONFLICT (code) DO UPDATE SET name=$2, type=$3, start_time=$4, end_time=$5, break_minutes=$6, description=$7, updated_at=now()
     RETURNING id`,
    [data.code, data.name, data.type, data.startTime, data.endTime, data.breakMinutes, data.description ?? null],
  );
  return res.rows[0].id as string;
}

async function upsertSchedule(client: Client, id: string, name: string, desc: string, repeatType: string): Promise<void> {
  await client.query(
    `INSERT INTO work_schedules (id, name, description, repeat_type, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, true, now(), now())
     ON CONFLICT (id) DO UPDATE SET name=$2, is_active=true, updated_at=now()`,
    [id, name, desc, repeatType],
  );
}

async function seedPhases(client: Client, scheduleId: string, phases: Array<{ order: number; shiftId: string }>): Promise<void> {
  // Delete existing phases for this schedule then recreate
  await client.query('DELETE FROM work_schedule_phases WHERE work_schedule_id=$1', [scheduleId]);
  for (const p of phases) {
    await client.query(
      `INSERT INTO work_schedule_phases (id, work_schedule_id, shift_id, phase_order, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, now())`,
      [scheduleId, p.shiftId, p.order],
    );
  }
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  console.log('🔧 Seeding work shifts...');

  const hcId    = await upsertShift(client, { code: 'HC-T2-T6',  name: 'Hành chính (T2-T6)',     type: 'HANH_CHINH', startTime: '08:00', endTime: '17:00', breakMinutes: 60, description: 'Ca hành chính T2-T6, nghỉ T7/CN' });
  const sangId  = await upsertShift(client, { code: 'CA-SANG',   name: 'Ca sáng (06:00-14:00)',   type: 'CA_SANG',    startTime: '06:00', endTime: '14:00', breakMinutes: 30, description: 'Ca sáng công nhân sản xuất' });
  const chieuId = await upsertShift(client, { code: 'CA-CHIEU',  name: 'Ca chiều (14:00-22:00)',  type: 'CA_CHIEU',   startTime: '14:00', endTime: '22:00', breakMinutes: 30, description: 'Ca chiều công nhân sản xuất' });
  const offId   = await upsertShift(client, { code: 'CA-OFF',    name: 'Ca Nghỉ',                 type: 'CA_OFF',     startTime: '00:00', endTime: '00:00', breakMinutes: 0,  description: 'Ngày nghỉ — không tính công, không lỗi chấm công' });

  console.log('  ✓ Ca Hành chính:', hcId);
  console.log('  ✓ Ca Sáng:      ', sangId);
  console.log('  ✓ Ca Chiều:     ', chieuId);
  console.log('  ✓ Ca Nghỉ:      ', offId);

  console.log('\n🔧 Seeding work schedules...');

  // Lịch Hành chính: 5 ngày làm + 2 ngày off (T7/CN)
  await upsertSchedule(client, 'schedule-hanh-chinh', 'Lịch Hành chính (T2-T6)', 'T2-T6 làm việc, T7-CN nghỉ', 'WEEKLY');
  await seedPhases(client, 'schedule-hanh-chinh', [
    { order: 1, shiftId: hcId }, { order: 2, shiftId: hcId }, { order: 3, shiftId: hcId },
    { order: 4, shiftId: hcId }, { order: 5, shiftId: hcId },
    { order: 6, shiftId: offId }, { order: 7, shiftId: offId }, // T7, CN
  ]);
  console.log('  ✓ Lịch Hành chính (7 phases/tuần)');

  // Lịch Công nhân Ca sáng 6/1: 6 ngày ca sáng + 1 ngày nghỉ, xoay hàng ngày
  await upsertSchedule(client, 'schedule-cn-sang-6-1', 'Lịch Công nhân 6/1 (Ca sáng)', 'Làm 6 ngày ca sáng, nghỉ 1 ngày, lặp lại', 'DAILY');
  await seedPhases(client, 'schedule-cn-sang-6-1', [
    { order: 1, shiftId: sangId }, { order: 2, shiftId: sangId }, { order: 3, shiftId: sangId },
    { order: 4, shiftId: sangId }, { order: 5, shiftId: sangId }, { order: 6, shiftId: sangId },
    { order: 7, shiftId: offId },
  ]);
  console.log('  ✓ Lịch Công nhân Ca sáng 6/1 (7 phases/vòng)');

  // Lịch Công nhân Ca chiều 6/1
  await upsertSchedule(client, 'schedule-cn-chieu-6-1', 'Lịch Công nhân 6/1 (Ca chiều)', 'Làm 6 ngày ca chiều, nghỉ 1 ngày, lặp lại', 'DAILY');
  await seedPhases(client, 'schedule-cn-chieu-6-1', [
    { order: 1, shiftId: chieuId }, { order: 2, shiftId: chieuId }, { order: 3, shiftId: chieuId },
    { order: 4, shiftId: chieuId }, { order: 5, shiftId: chieuId }, { order: 6, shiftId: chieuId },
    { order: 7, shiftId: offId },
  ]);
  console.log('  ✓ Lịch Công nhân Ca chiều 6/1 (7 phases/vòng)');

  await client.end();

  console.log('\n✅ Seed ca làm việc hoàn tất!');
  console.log('\n📋 Tóm tắt:');
  console.log('  • Ca Hành chính (HC-T2-T6): 08:00-17:00 · 1h nghỉ trưa');
  console.log('  • Ca Sáng (CA-SANG):        06:00-14:00 · 30p nghỉ');
  console.log('  • Ca Chiều (CA-CHIEU):      14:00-22:00 · 30p nghỉ');
  console.log('  • Ca Nghỉ (CA-OFF):         không tính công, không lỗi');
  console.log('  • Lịch Hành chính:          T2-T6 HC + T7-CN OFF (7 phases/tuần)');
  console.log('  • Lịch Công nhân Ca sáng:   6 ngày sáng + 1 ngày OFF (xoay hàng ngày)');
  console.log('  • Lịch Công nhân Ca chiều:  6 ngày chiều + 1 ngày OFF (xoay hàng ngày)');
}

main().catch(console.error);
