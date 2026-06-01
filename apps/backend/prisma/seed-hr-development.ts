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

const SKILL_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;
const TRAINING_STATUS = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED'] as const;
const REVIEW_STATUS = ['DRAFT', 'SUBMITTED', 'APPROVED', 'APPROVED'] as const;
const DEGREES = ['COLLEGE', 'BACHELOR', 'BACHELOR', 'BACHELOR', 'MASTER'] as const;

const SCHOOLS = [
  'ĐH Bách Khoa Hà Nội', 'ĐH Quốc gia Hà Nội', 'ĐH Công nghệ - ĐHQGHN',
  'ĐH FPT', 'ĐH Kinh tế Quốc dân', 'ĐH Bách Khoa TP.HCM', 'Học viện BCVT',
];
const MAJORS = [
  'Công nghệ thông tin', 'Khoa học máy tính', 'Kỹ thuật phần mềm',
  'Hệ thống thông tin', 'An toàn thông tin', 'Quản trị kinh doanh', 'Kế toán',
];
const STRENGTHS = [
  'Chủ động, trách nhiệm cao trong công việc',
  'Kỹ năng kỹ thuật vững, tiếp thu nhanh công nghệ mới',
  'Phối hợp nhóm tốt, hỗ trợ đồng nghiệp',
  'Tư duy giải quyết vấn đề tốt, chất lượng code cao',
];
const IMPROVEMENTS = [
  'Cần cải thiện kỹ năng quản lý thời gian',
  'Nên chủ động giao tiếp với các bên liên quan hơn',
  'Tăng cường viết tài liệu kỹ thuật',
  'Phát triển kỹ năng dẫn dắt nhóm nhỏ',
];

async function main() {
  console.log('🌱 Seed Đào tạo & Phát triển nhân sự...\n');

  const employees = await prisma.employee.findMany({
    where: { deletedAt: null },
    select: { id: true, level: true, orgUnitId: true },
    orderBy: { code: 'asc' },
  });
  const skills = await prisma.skill.findMany({ select: { id: true } });
  const programs = await prisma.trainingProgram.findMany({ select: { id: true, durationHours: true } });
  const users = await prisma.user.findMany({ select: { id: true, orgUnitId: true }, take: 200 });

  if (employees.length === 0 || users.length === 0) {
    console.log('❌ Chưa có nhân sự/người dùng. Chạy seed:mega trước.');
    return;
  }

  // ── 1. EMPLOYEE SKILLS (ma trận kỹ năng) ──────────────────────────────────
  console.log('🧩 Ma trận kỹ năng...');
  if (skills.length === 0) {
    console.log('   ⚠ Chưa có skill master, bỏ qua.');
  } else {
    const skillRows: Prisma.EmployeeSkillCreateManyInput[] = [];
    for (const e of employees.slice(0, 500)) {
      const n = rand(3, 6);
      const chosen = new Set<string>();
      for (let i = 0; i < n; i++) {
        const s = pick(skills);
        if (chosen.has(s.id)) continue;
        chosen.add(s.id);
        skillRows.push({
          employeeId: e.id,
          skillId: s.id,
          level: pick([...SKILL_LEVELS]) as Prisma.EmployeeSkillCreateManyInput['level'],
          yearsExp: rand(1, 8),
        });
      }
    }
    const r = await prisma.employeeSkill.createMany({ data: skillRows, skipDuplicates: true });
    console.log(`   ✓ ${r.count} gán kỹ năng`);
  }

  // ── 2. TRAINING RECORDS (khóa đào tạo) ─────────────────────────────────────
  console.log('🎓 Bản ghi đào tạo...');
  const existingTr = await prisma.trainingRecord.count();
  if (programs.length === 0) {
    console.log('   ⚠ Chưa có chương trình đào tạo, bỏ qua.');
  } else if (existingTr > 0) {
    console.log(`   ⏭  Đã có ${existingTr} bản ghi, bỏ qua.`);
  } else {
    const trRows: Prisma.TrainingRecordCreateManyInput[] = [];
    for (const e of employees.slice(0, 350)) {
      const n = rand(1, 3);
      for (let i = 0; i < n; i++) {
        const prog = pick(programs);
        const status = pick([...TRAINING_STATUS]);
        const start = dayjs().subtract(rand(10, 400), 'days');
        const done = status === 'COMPLETED';
        trRows.push({
          programId: prog.id,
          employeeId: e.id,
          startDate: start.toDate(),
          endDate: done ? start.add(rand(1, 10), 'days').toDate() : null,
          status: status as Prisma.TrainingRecordCreateManyInput['status'],
          score: done ? new Decimal(rand(60, 98)) : null,
          certificate: done && Math.random() > 0.4 ? `CERT-${rand(10000, 99999)}` : null,
        });
      }
    }
    const r = await prisma.trainingRecord.createMany({ data: trRows });
    console.log(`   ✓ ${r.count} bản ghi đào tạo`);
  }

  // ── 3. PERFORMANCE REVIEWS (đánh giá hiệu suất) ────────────────────────────
  console.log('📊 Đánh giá hiệu suất...');
  const reviewRows: Prisma.PerformanceReviewCreateManyInput[] = [];
  const periods = ['2025-H1', '2025-H2'];
  const subjects = employees.slice(0, 300);
  for (let i = 0; i < subjects.length; i++) {
    const e = subjects[i];
    // Reviewer = nhân sự khác trong danh sách (không tự đánh giá)
    const reviewer = employees[(i + 7) % employees.length];
    if (reviewer.id === e.id) continue;
    for (const period of periods) {
      const status = pick([...REVIEW_STATUS]);
      const submitted = status !== 'DRAFT';
      reviewRows.push({
        employeeId: e.id,
        reviewerId: reviewer.id,
        period,
        score: submitted ? new Decimal((rand(60, 95) / 10).toFixed(1)) : null,
        strengths: pick(STRENGTHS),
        improvements: pick(IMPROVEMENTS),
        goals: 'Hoàn thành mục tiêu quý, nâng cao 1 kỹ năng chuyên môn.',
        status: status as Prisma.PerformanceReviewCreateManyInput['status'],
        submittedAt: submitted ? dayjs().subtract(rand(10, 200), 'days').toDate() : null,
        approvedAt: status === 'APPROVED' ? dayjs().subtract(rand(1, 30), 'days').toDate() : null,
      });
    }
  }
  const rv = await prisma.performanceReview.createMany({ data: reviewRows, skipDuplicates: true });
  console.log(`   ✓ ${rv.count} đánh giá hiệu suất`);

  // ── 4. OKR (mục tiêu + kết quả then chốt) ──────────────────────────────────
  console.log('🎯 OKR...');
  const existingOkr = await prisma.okrObjective.count();
  if (existingOkr > 0) {
    console.log(`   ⏭  Đã có ${existingOkr} objective, bỏ qua.`);
  } else {
    const objectiveTitles = [
      'Nâng cao chất lượng sản phẩm', 'Tăng tốc độ giao hàng dự án',
      'Phát triển năng lực đội ngũ', 'Cải thiện sự hài lòng khách hàng',
      'Tối ưu chi phí vận hành', 'Mở rộng thị phần khách hàng mới',
      'Chuẩn hóa quy trình kỹ thuật', 'Tăng độ phủ kiểm thử tự động',
    ];
    let krCount = 0;
    for (let i = 0; i < 20; i++) {
      const owner = pick(users); // ownerId BẮT BUỘC trỏ tới User
      const obj = await prisma.okrObjective.create({
        data: {
          title: `${pick(objectiveTitles)} (Q${rand(1, 4)})`,
          description: 'Mục tiêu trọng tâm của kỳ.',
          cycle: pick(['Q1', 'Q2', 'Q3', 'Q4', 'ANNUAL']) as Prisma.OkrObjectiveCreateInput['cycle'],
          year: 2026,
          ownerId: owner.id,
          orgUnitId: owner.orgUnitId ?? null,
          status: pick(['ACTIVE', 'ACTIVE', 'COMPLETED', 'DRAFT']) as Prisma.OkrObjectiveCreateInput['status'],
          keyResults: {
            create: Array.from({ length: rand(2, 4) }, (_, k) => {
              const target = rand(50, 100);
              return {
                title: `Kết quả then chốt ${k + 1}`,
                unit: pick(['%', 'điểm', 'dự án', 'khách hàng']),
                startValue: new Decimal(0),
                targetValue: new Decimal(target),
                currentValue: new Decimal(rand(0, target)),
              };
            }),
          },
        },
        include: { keyResults: true },
      });
      krCount += obj.keyResults.length;
    }
    console.log(`   ✓ 20 objective + ${krCount} key result`);
  }

  // ── 5. EDUCATION RECORDS (học vấn) ─────────────────────────────────────────
  console.log('🏫 Học vấn...');
  const existingEdu = await prisma.educationRecord.count();
  if (existingEdu > 0) {
    console.log(`   ⏭  Đã có ${existingEdu} bản ghi, bỏ qua.`);
  } else {
    const eduRows: Prisma.EducationRecordCreateManyInput[] = [];
    for (const e of employees.slice(0, 500)) {
      const endYear = rand(2008, 2022);
      eduRows.push({
        employeeId: e.id,
        degreeLevel: pick([...DEGREES]) as Prisma.EducationRecordCreateManyInput['degreeLevel'],
        schoolName: pick(SCHOOLS),
        major: pick(MAJORS),
        startYear: endYear - 4,
        endYear,
        graduationYear: endYear,
        result: pick(['Giỏi', 'Khá', 'Khá', 'Xuất sắc', 'Trung bình khá']),
        isMainDegree: true,
      });
    }
    const r = await prisma.educationRecord.createMany({ data: eduRows });
    console.log(`   ✓ ${r.count} bản ghi học vấn`);
  }

  console.log('\n✅ Hoàn tất seed Đào tạo & Phát triển!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
