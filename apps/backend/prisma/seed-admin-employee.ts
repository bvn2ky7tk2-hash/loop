import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../src/generated/prisma';
import dayjs from 'dayjs';

const Decimal = Prisma.Decimal;
const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  console.log('🌱 Gán hồ sơ nhân sự cho admin + bồi data "của tôi"...\n');

  const admin = await prisma.user.findFirst({ where: { email: 'admin@loop.vn' }, select: { id: true } });
  if (!admin) { console.log('❌ Không tìm thấy admin@loop.vn'); return; }

  // Đã có employee?
  let emp = await prisma.employee.findFirst({ where: { userId: admin.id }, select: { id: true, code: true } });
  if (!emp) {
    // Chọn 1 nhân sự giàu dữ liệu (có kỹ năng + payroll) rồi gán cho admin
    const rich = await prisma.employee.findFirst({
      where: { deletedAt: null, skills: { some: {} }, payrollRecords: { some: {} } },
      select: { id: true, code: true },
      orderBy: { code: 'asc' },
    });
    if (!rich) { console.log('❌ Không tìm thấy nhân sự giàu dữ liệu.'); return; }
    emp = await prisma.employee.update({
      where: { id: rich.id },
      data: { userId: admin.id },
      select: { id: true, code: true },
    });
    console.log(`   ✓ Đã gán admin → nhân sự ${emp.code}`);
  } else {
    console.log(`   ✓ Admin đã có hồ sơ nhân sự ${emp.code}`);
  }
  const empId = emp.id;

  // ── Payroll records cho mọi kỳ lương (skipDuplicates) ──────────────────────
  const periods = await prisma.payrollPeriod.findMany({ select: { id: true } });
  const prRows: Prisma.PayrollRecordCreateManyInput[] = periods.map((p) => {
    const gross = rand(15, 30) * 1_000_000;
    return {
      periodId: p.id, employeeId: empId,
      workDays: new Decimal(22),
      grossSalary: new Decimal(gross),
      netSalary: new Decimal(Math.round(gross * 0.85)),
    };
  });
  const pr = await prisma.payrollRecord.createMany({ data: prRows, skipDuplicates: true });
  console.log(`   ✓ +${pr.count} phiếu lương (tổng ${periods.length} kỳ)`);

  // ── OT requests (đảm bảo ≥5) ───────────────────────────────────────────────
  const otHave = await prisma.overtimeRequest.count({ where: { employeeId: empId } });
  if (otHave < 5) {
    const need = 5 - otHave;
    const rows: Prisma.OvertimeRequestCreateManyInput[] = Array.from({ length: need }, () => {
      const h = rand(1, 6);
      return {
        employeeId: empId,
        date: dayjs().subtract(rand(1, 60), 'days').toDate(),
        hours: new Decimal(h),
        fromTime: '18:00', toTime: `${18 + h}:00`,
        reason: pick(['Hoàn thành sprint', 'Hỗ trợ release', 'Xử lý sự cố production']),
        status: pick(['PENDING', 'APPROVED', 'APPROVED', 'REJECTED']) as Prisma.OvertimeRequestCreateManyInput['status'],
      };
    });
    const r = await prisma.overtimeRequest.createMany({ data: rows });
    console.log(`   ✓ +${r.count} đơn OT (đã có ${otHave})`);
  } else console.log(`   ⏭  Đã có ${otHave} đơn OT`);

  // ── Leave requests (đảm bảo ≥3) ────────────────────────────────────────────
  const leaveTypes = await prisma.leaveType.findMany({ select: { id: true }, take: 3 });
  const lvHave = await prisma.leaveRequest.count({ where: { employeeId: empId } });
  if (lvHave < 3 && leaveTypes.length > 0) {
    const need = 3 - lvHave;
    const rows: Prisma.LeaveRequestCreateManyInput[] = Array.from({ length: need }, () => {
      const start = dayjs().subtract(rand(1, 90), 'days');
      const days = rand(1, 3);
      return {
        employeeId: empId, leaveTypeId: pick(leaveTypes).id,
        startDate: start.toDate(), endDate: start.add(days - 1, 'day').toDate(),
        days: new Decimal(days),
        reason: pick(['Nghỉ phép cá nhân', 'Việc gia đình', 'Khám sức khỏe']),
        status: pick(['PENDING', 'APPROVED', 'APPROVED']) as Prisma.LeaveRequestCreateManyInput['status'],
      };
    });
    const r = await prisma.leaveRequest.createMany({ data: rows });
    console.log(`   ✓ +${r.count} đơn nghỉ phép (đã có ${lvHave})`);
  } else console.log(`   ⏭  Đã có ${lvHave} đơn nghỉ phép`);

  console.log('\n✅ Hoàn tất! Đăng nhập admin@loop.vn để xem Phiếu lương / OT / Nghỉ phép / Chấm công.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
