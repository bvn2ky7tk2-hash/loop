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

const YEAR = 2026;

async function main() {
  console.log('🌱 Seed HR hồ sơ & đãi ngộ...\n');

  const employees = await prisma.employee.findMany({
    where: { deletedAt: null },
    select: { id: true, startDate: true, positionId: true, fullName: true },
    orderBy: { code: 'asc' },
  });
  const leaveTypes = await prisma.leaveType.findMany({ select: { id: true } });
  const shifts = await prisma.workShift.findMany({ select: { id: true } });
  const bonusTypes = await prisma.bonusType.findMany({ select: { id: true } });
  const payrollRecords = await prisma.payrollRecord.findMany({ select: { id: true } });
  const reviews = await prisma.performanceReview.findMany({
    where: { score: { not: null } },
    select: { id: true, employeeId: true, score: true },
  });
  if (employees.length === 0) { console.log('❌ Chưa có nhân sự.'); return; }

  // ── 1. LEAVE BALANCES (số dư phép) ─────────────────────────────────────────
  console.log('🏖️  Số dư phép...');
  if (leaveTypes.length === 0) { console.log('   ⚠ Chưa có loại phép.'); }
  else {
    const lt = leaveTypes.slice(0, 3);
    const rows: Prisma.LeaveBalanceCreateManyInput[] = [];
    for (const e of employees) {
      for (const t of lt) {
        const total = pick([12, 12, 14, 30]);
        rows.push({
          employeeId: e.id, leaveTypeId: t.id, year: YEAR,
          totalDays: new Decimal(total),
          usedDays: new Decimal(rand(0, total)),
          entitlementDays: new Decimal(total),
        });
      }
    }
    const r = await prisma.leaveBalance.createMany({ data: rows, skipDuplicates: true });
    console.log(`   ✓ ${r.count} số dư phép`);
  }

  // ── 2. WORK HISTORY (lịch sử công tác) ─────────────────────────────────────
  console.log('📜 Lịch sử công tác...');
  if (await prisma.workHistory.count() > 0) console.log('   ⏭  Đã có, bỏ qua.');
  else {
    const rows: Prisma.WorkHistoryCreateManyInput[] = [];
    for (const e of employees) {
      const base = e.startDate ? dayjs(e.startDate) : dayjs().subtract(2, 'year');
      rows.push({
        employeeId: e.id, eventType: 'PROBATION_ENDED',
        eventDate: base.add(2, 'month').toDate(),
        title: 'Kết thúc thử việc, chuyển chính thức',
      });
      if (Math.random() > 0.6) rows.push({
        employeeId: e.id, eventType: 'HR_DECISION',
        eventDate: base.add(rand(13, 30), 'month').toDate(),
        title: 'Điều chỉnh lương định kỳ',
      });
    }
    const r = await prisma.workHistory.createMany({ data: rows });
    console.log(`   ✓ ${r.count} sự kiện công tác`);
  }

  // ── 3. POSITION HISTORIES (lịch sử vị trí) ─────────────────────────────────
  console.log('🪑 Lịch sử vị trí...');
  if (await prisma.positionHistory.count() > 0) console.log('   ⏭  Đã có, bỏ qua.');
  else {
    const rows: Prisma.PositionHistoryCreateManyInput[] = [];
    for (const e of employees) {
      if (!e.positionId) continue;
      rows.push({
        positionId: e.positionId, employeeId: e.id,
        startDate: e.startDate ?? dayjs().subtract(2, 'year').toDate(),
        endDate: null,
      });
    }
    const r = await prisma.positionHistory.createMany({ data: rows });
    console.log(`   ✓ ${r.count} lịch sử vị trí`);
  }

  // ── 4. FAMILY MEMBERS (thân nhân) ──────────────────────────────────────────
  console.log('👨‍👩‍👧 Thân nhân...');
  if (await prisma.familyMember.count() > 0) console.log('   ⏭  Đã có, bỏ qua.');
  else {
    const rels = ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING'] as const;
    const names = ['Nguyễn Văn B', 'Trần Thị C', 'Lê Văn D', 'Phạm Thị E', 'Hoàng Văn F'];
    const rows: Prisma.FamilyMemberCreateManyInput[] = [];
    for (const e of employees.slice(0, 600)) {
      const n = rand(1, 3);
      for (let i = 0; i < n; i++) {
        rows.push({
          employeeId: e.id,
          relationship: pick([...rels]) as Prisma.FamilyMemberCreateManyInput['relationship'],
          fullName: pick(names),
          birthdate: dayjs().subtract(rand(1, 60), 'year').toDate(),
          occupation: pick(['Tự do', 'Học sinh', 'Giáo viên', 'Kinh doanh', 'Hưu trí']),
          phoneNumber: `09${rand(10000000, 99999999)}`,
        });
      }
    }
    const r = await prisma.familyMember.createMany({ data: rows });
    console.log(`   ✓ ${r.count} thân nhân`);
  }

  // ── 5. PREVIOUS WORK EXPERIENCES (kinh nghiệm trước đây) ────────────────────
  console.log('💼 Kinh nghiệm làm việc trước...');
  if (await prisma.previousWorkExperience.count() > 0) console.log('   ⏭  Đã có, bỏ qua.');
  else {
    const companies = ['FPT Software', 'Viettel', 'VNG', 'CMC', 'TMA Solutions', 'NashTech', 'Axon Active'];
    const titles = ['Developer', 'Senior Developer', 'Team Lead', 'QA Engineer', 'Business Analyst'];
    const rows: Prisma.PreviousWorkExperienceCreateManyInput[] = [];
    for (const e of employees.slice(0, 600)) {
      const n = rand(0, 2);
      for (let i = 0; i < n; i++) {
        const end = dayjs().subtract(rand(1, 5), 'year');
        rows.push({
          employeeId: e.id, companyName: pick(companies), position: pick(titles),
          startDate: end.subtract(rand(1, 4), 'year').toDate(), endDate: end.toDate(),
          description: 'Tham gia phát triển và bảo trì sản phẩm phần mềm.',
        });
      }
    }
    const r = await prisma.previousWorkExperience.createMany({ data: rows });
    console.log(`   ✓ ${r.count} kinh nghiệm`);
  }

  // ── 6. PERFORMANCE BONUS (thưởng hiệu suất) ────────────────────────────────
  console.log('🏆 Thưởng hiệu suất...');
  {
    const rows: Prisma.PerformanceBonusCreateManyInput[] = [];
    for (const rv of reviews.slice(0, 400)) {
      const score = Number(rv.score);
      const base = rand(12, 40) * 1_000_000;
      const coef = score >= 9 ? 2 : score >= 8 ? 1.5 : score >= 7 ? 1 : 0.5;
      rows.push({
        employeeId: rv.employeeId, reviewId: rv.id,
        score: new Decimal(rv.score as Prisma.Decimal),
        baseSalary: new Decimal(base), coefficient: new Decimal(coef),
        bonusAmount: new Decimal(Math.round(base * coef)),
        status: pick(['DRAFT', 'APPROVED', 'PAID']) as Prisma.PerformanceBonusCreateManyInput['status'],
      });
    }
    const r = await prisma.performanceBonus.createMany({ data: rows, skipDuplicates: true });
    console.log(`   ✓ ${r.count} thưởng hiệu suất`);
  }

  // ── 7. SALARY REVIEW SUGGESTIONS (đề xuất điều chỉnh lương) ─────────────────
  console.log('💹 Đề xuất điều chỉnh lương...');
  if (await prisma.salaryReviewSuggestion.count() > 0) console.log('   ⏭  Đã có, bỏ qua.');
  else {
    const rows: Prisma.SalaryReviewSuggestionCreateManyInput[] = [];
    for (const rv of reviews.slice(0, 200)) {
      const cur = rand(12, 35) * 1_000_000;
      const inc = pick([5, 8, 10, 12, 15]);
      rows.push({
        reviewId: rv.id, employeeId: rv.employeeId,
        currentSalary: new Decimal(cur),
        suggestedSalary: new Decimal(Math.round(cur * (1 + inc / 100))),
        increasePercent: new Decimal(inc),
        reason: 'Hiệu suất tốt, đề xuất tăng lương theo kỳ đánh giá.',
        status: pick(['PENDING', 'APPROVED', 'APPLIED']) as Prisma.SalaryReviewSuggestionCreateManyInput['status'],
      });
    }
    const r = await prisma.salaryReviewSuggestion.createMany({ data: rows, skipDuplicates: true });
    console.log(`   ✓ ${r.count} đề xuất lương`);
  }

  // ── 8. EMPLOYEE BONUSES (thưởng trong kỳ lương) ────────────────────────────
  console.log('💰 Thưởng theo kỳ lương...');
  if (bonusTypes.length === 0 || payrollRecords.length === 0) console.log('   ⚠ Thiếu bonus type / payroll record.');
  else {
    const rows: Prisma.EmployeeBonusCreateManyInput[] = [];
    for (const pr of payrollRecords) {
      const n = rand(0, 2);
      const chosen = new Set<string>();
      for (let i = 0; i < n; i++) {
        const bt = pick(bonusTypes);
        if (chosen.has(bt.id)) continue;
        chosen.add(bt.id);
        rows.push({ payrollRecordId: pr.id, bonusTypeId: bt.id, amount: new Decimal(rand(1, 10) * 1_000_000), note: 'Thưởng kỳ lương' });
      }
    }
    const r = await prisma.employeeBonus.createMany({ data: rows, skipDuplicates: true });
    console.log(`   ✓ ${r.count} thưởng kỳ lương`);
  }

  // ── 9. SOCIAL INSURANCE BOOKS (sổ BHXH) ────────────────────────────────────
  console.log('📕 Sổ BHXH...');
  if (await prisma.socialInsuranceBook.count() > 0) console.log('   ⏭  Đã có, bỏ qua.');
  else {
    const rows: Prisma.SocialInsuranceBookCreateManyInput[] = employees.map((e, i) => ({
      employeeId: e.id,
      bookNumber: `SI-${YEAR}-${String(i + 1).padStart(5, '0')}`,
      issueDate: dayjs().subtract(rand(1, 5), 'year').toDate(),
      issueAuthority: 'BHXH TP. Hà Nội',
      receivedByEmployee: Math.random() > 0.5,
    }));
    const r = await prisma.socialInsuranceBook.createMany({ data: rows, skipDuplicates: true });
    console.log(`   ✓ ${r.count} sổ BHXH`);
  }

  // ── 10. SHIFT ASSIGNMENTS (phân ca) ────────────────────────────────────────
  console.log('🕐 Phân ca làm việc...');
  if (shifts.length === 0) console.log('   ⚠ Chưa có ca làm việc.');
  else if (await prisma.shiftAssignment.count() > 0) console.log('   ⏭  Đã có, bỏ qua.');
  else {
    const rows: Prisma.ShiftAssignmentCreateManyInput[] = employees.map((e) => ({
      employeeId: e.id, shiftId: pick(shifts).id,
      effectiveFrom: e.startDate ?? dayjs().subtract(1, 'year').toDate(),
    }));
    const r = await prisma.shiftAssignment.createMany({ data: rows });
    console.log(`   ✓ ${r.count} phân ca`);
  }

  console.log('\n✅ Hoàn tất seed HR hồ sơ & đãi ngộ!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
