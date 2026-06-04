import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Tháng cần seed (mặc định tháng hiện tại). Có thể override qua env SEED_YEAR/SEED_MONTH.
const YEAR = Number(process.env['SEED_YEAR'] ?? 2026);
const MONTH = Number(process.env['SEED_MONTH'] ?? 6); // 1-based

const toMin = (t: string) => {
  const [h, m] = (t ?? '').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function main() {
  console.log(`🌱 Seeding Attendance Punches cho ${MONTH}/${YEAR}...\n`);

  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  if (employees.length === 0) {
    console.log('❌ Không có nhân viên. Chạy seed:mega trước.');
    return;
  }

  const endOfMonth = new Date(YEAR, MONTH, 0);
  const lastDay = endOfMonth.getDate();

  // Map employee → ca làm việc (assignment mới nhất phủ tháng)
  const assignments = await prisma.shiftAssignment.findMany({
    where: { effectiveFrom: { lte: endOfMonth }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date(YEAR, MONTH - 1, 1) } }] },
    orderBy: { effectiveFrom: 'desc' },
    include: { shift: true },
  });
  const shiftByEmp = new Map<string, (typeof assignments)[number]['shift']>();
  for (const a of assignments) if (!shiftByEmp.has(a.employeeId)) shiftByEmp.set(a.employeeId, a.shift);

  // Xóa punch cũ của tháng để seed lại sạch
  await prisma.attendancePunch.deleteMany({
    where: { punchedAt: { gte: new Date(YEAR, MONTH - 1, 1), lte: new Date(YEAR, MONTH, 0, 23, 59, 59) } },
  });

  const batch: { employeeId: string; punchedAt: Date; source: 'IMPORT'; rawCode: string }[] = [];
  let stats = { normal: 0, late: 0, missing: 0, absent: 0, night: 0 };

  for (const emp of employees) {
    const shift = shiftByEmp.get(emp.id);
    if (!shift || shift.type === 'CA_OFF') continue;

    const startMin = toMin(shift.startTime);
    const endMin = toMin(shift.endTime);
    const overnight = endMin <= startMin;
    const workingDays: number[] = shift.workingDays?.length ? shift.workingDays : [1, 2, 3, 4, 5];

    for (let day = 1; day <= lastDay; day++) {
      const d = new Date(YEAR, MONTH - 1, day);
      const isoDow = d.getDay() === 0 ? 7 : d.getDay(); // 1=T2..7=CN
      if (!workingDays.includes(isoDow)) continue;

      const roll = Math.random();
      if (roll < 0.05) { stats.absent++; continue; } // vắng — không quẹt

      // Giờ vào: phần lớn đúng giờ (±10p), ~10% đi muộn (20-50p)
      let inOffset: number;
      if (roll < 0.15) { inOffset = rand(20, 50); stats.late++; }
      else { inOffset = rand(-10, 5); stats.normal++; }
      const inMin = startMin + inOffset;
      const inH = Math.floor(inMin / 60), inM = inMin % 60;
      batch.push({ employeeId: emp.id, punchedAt: new Date(YEAR, MONTH - 1, day, inH, inM, rand(0, 59)), source: 'IMPORT', rawCode: emp.id.slice(0, 8) });

      // ~5% quên quẹt ra → chỉ 1 lần quẹt (MISSING_CHECKOUT)
      if (roll >= 0.95) { stats.missing++; continue; }

      // Giờ ra: end + (0..40p, đôi khi OT)
      const outOffset = Math.random() < 0.2 ? rand(30, 120) : rand(-5, 20);
      const outMinRaw = endMin + outOffset;
      const outDay = overnight ? day + 1 : day + (outMinRaw >= 1440 ? 1 : 0);
      const outMinNorm = outMinRaw % 1440;
      const outH = Math.floor(outMinNorm / 60), outM = outMinNorm % 60;
      batch.push({ employeeId: emp.id, punchedAt: new Date(YEAR, MONTH - 1, outDay, outH, outM, rand(0, 59)), source: 'IMPORT', rawCode: emp.id.slice(0, 8) });
      if (overnight) stats.night++;
    }
  }

  // Ghi theo lô
  const CHUNK = 2000;
  let written = 0;
  for (let i = 0; i < batch.length; i += CHUNK) {
    const res = await prisma.attendancePunch.createMany({ data: batch.slice(i, i + CHUNK), skipDuplicates: true });
    written += res.count;
  }

  console.log(`   ✓ Đã tạo ${written} lần quẹt`);
  console.log(`   📊 normal=${stats.normal} late=${stats.late} missing_checkout=${stats.missing} absent_days=${stats.absent} night_outs=${stats.night}`);
  console.log('\n✅ Xong. Vào Bảng công → "Tổng hợp tháng" để dựng bảng công từ giờ quẹt.\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
