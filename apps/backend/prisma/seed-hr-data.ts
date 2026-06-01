/**
 * seed-hr-data.ts
 * Seed dữ liệu HR: HrDecision, TrainingRecord, PerformanceReview,
 * PerformanceBonus, KpiMetric, KpiRecord, OkrObjective, OkrKeyResult,
 * ProcessInstance (leave/expense/OT)
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';
import { randomUUID } from 'crypto';

const pool = new Pool({
  connectionString: process.env['DATABASE_URL'] || 'postgresql://loop:loop_password@localhost:5432/loop_db',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

function dateOnly(d: Date): Date {
  return new Date(d.toISOString().split('T')[0] + 'T00:00:00.000Z');
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding HR data (Decisions, Training, Performance, KPI, OKR, BPM)...\n');

  // ── lấy dữ liệu nền ──────────────────────────────────────────────────────
  const employees = await prisma.employee.findMany({
    where: { isActive: true, deletedAt: null },
    include: { orgUnit: true, position: true },
    take: 100,
  });

  if (employees.length < 5) {
    console.error('❌ Không đủ nhân viên trong DB (cần ít nhất 5). Hãy chạy seed-hr-structure.js trước.');
    process.exit(1);
  }

  const users = await prisma.user.findMany({ take: 50 });
  const orgUnits = await prisma.orgUnit.findMany({ take: 20 });
  const positions = await prisma.position.findMany({ take: 20 });

  console.log(`  Tìm thấy ${employees.length} nhân viên, ${users.length} users, ${orgUnits.length} org units`);

  const managerEmployees = employees.slice(0, Math.min(8, Math.floor(employees.length / 4)));
  const regularEmployees = employees.slice(managerEmployees.length);

  // ── 1. HrDecision (60 bản ghi) ──────────────────────────────────────────

  console.log('\n📋 Tạo HrDecision...');

  const decisionTypes: Array<{
    type: string;
    count: number;
    eventType: string;
    titleFn: (emp: typeof employees[0], idx: number) => string;
    contentFn: (emp: typeof employees[0]) => string;
  }> = [
    {
      type: 'HIRE',
      count: 20,
      eventType: 'HR_DECISION',
      titleFn: (emp) => `Quyết định tuyển dụng nhân sự: ${emp.fullName}`,
      contentFn: (emp) =>
        `Căn cứ nhu cầu nhân sự của đơn vị ${emp.orgUnit.name}, quyết định tuyển dụng ${emp.fullName} vào vị trí Nhân viên với thời gian thử việc 2 tháng.`,
    },
    {
      type: 'TRANSFER',
      count: 15,
      eventType: 'HR_DECISION',
      titleFn: (emp) => `Quyết định điều chuyển: ${emp.fullName}`,
      contentFn: (emp) =>
        `Điều chuyển ${emp.fullName} từ phòng ban hiện tại sang đơn vị mới theo nhu cầu tổ chức và năng lực phù hợp.`,
    },
    {
      type: 'SALARY_CHANGE',
      count: 10,
      eventType: 'HR_DECISION',
      titleFn: (emp) => `Quyết định điều chỉnh lương: ${emp.fullName}`,
      contentFn: (emp) =>
        `Điều chỉnh mức lương cơ bản cho ${emp.fullName} dựa trên kết quả đánh giá hiệu suất và mức đóng góp thực tế.`,
    },
    {
      type: 'PROMOTION',
      count: 8,
      eventType: 'HR_DECISION',
      titleFn: (emp) => `Quyết định thăng chức: ${emp.fullName}`,
      contentFn: (emp) =>
        `Bổ nhiệm ${emp.fullName} lên vị trí cao hơn ghi nhận thành tích xuất sắc và đóng góp liên tục cho tổ chức.`,
    },
    {
      type: 'PROBATION_END',
      count: 5,
      eventType: 'HR_DECISION',
      titleFn: (emp) => `Quyết định kết thúc thử việc: ${emp.fullName}`,
      contentFn: (emp) =>
        `Xác nhận hoàn thành giai đoạn thử việc và chuyển sang hợp đồng chính thức cho ${emp.fullName}.`,
    },
    {
      type: 'TERMINATION',
      count: 2,
      eventType: 'HR_DECISION',
      titleFn: (emp) => `Quyết định chấm dứt hợp đồng: ${emp.fullName}`,
      contentFn: (emp) =>
        `Chấm dứt hợp đồng lao động với ${emp.fullName} theo thỏa thuận hai bên, thực hiện đầy đủ nghĩa vụ theo quy định pháp luật.`,
    },
  ];

  let decisionCounter = 1;
  let totalDecisions = 0;

  for (const def of decisionTypes) {
    const pool2 = def.type === 'HIRE' ? regularEmployees : employees;
    const targets = pickN(pool2, Math.min(def.count, pool2.length));

    for (let i = 0; i < def.count; i++) {
      const emp = targets[i % targets.length];
      const daysBack = Math.floor(Math.random() * 180) + 1; // 6 tháng gần nhất
      const effectiveDate = dateOnly(daysAgo(daysBack));
      const signedDate = dateOnly(daysAgo(daysBack + 3));
      const decisionNum = `QD-${def.type.slice(0, 3)}-2026-${String(decisionCounter).padStart(4, '0')}`;

      // Tạo salary values cho SALARY_CHANGE
      const fromSalary = def.type === 'SALARY_CHANGE' || def.type === 'PROMOTION'
        ? (8_000_000 + Math.floor(Math.random() * 12_000_000))
        : null;
      const toSalary = fromSalary
        ? fromSalary * (1 + 0.1 + Math.random() * 0.2)
        : null;

      // Chọn orgUnit chuyển đến (cho TRANSFER)
      const fromOrgUnit = emp.orgUnit;
      const toOrgUnit = def.type === 'TRANSFER'
        ? pick(orgUnits.filter((o) => o.id !== fromOrgUnit.id))
        : null;

      // Tạo fromPosition / toPosition cho PROMOTION
      const fromPosition = positions.length > 0 ? pick(positions) : null;
      const toPosition = def.type === 'PROMOTION' && positions.length > 1
        ? pick(positions.filter((p) => p.id !== fromPosition?.id))
        : null;

      let decision: { id: string } | null = null;
      try {
        decision = await prisma.hrDecision.create({
          data: {
            decisionNumber: decisionNum,
            type: def.type as any,
            employeeId: emp.id,
            effectiveDate,
            signedDate,
            content: def.contentFn(emp),
            signedBy: `Giám đốc Nhân sự`,
            status: 'APPROVED',
            fromOrgUnitId: toOrgUnit ? fromOrgUnit.id : null,
            toOrgUnitId: toOrgUnit?.id ?? null,
            fromPositionId: fromPosition?.id ?? null,
            toPositionId: toPosition?.id ?? null,
            fromSalary: fromSalary ?? null,
            toSalary: toSalary ?? null,
          },
        });

        // Tạo WorkHistory liên kết
        await prisma.workHistory.create({
          data: {
            employeeId: emp.id,
            eventType: 'HR_DECISION',
            eventDate: effectiveDate,
            title: def.titleFn(emp, i),
            description: def.contentFn(emp),
            hrDecisionId: decision.id,
          },
        });

        // Tạo SalaryRecord cho SALARY_CHANGE / PROMOTION
        if (toSalary && decision) {
          await prisma.salaryRecord.create({
            data: {
              employeeId: emp.id,
              basicSalary: toSalary,
              effectiveDate,
              source: 'HR_DECISION',
              note: `Điều chỉnh theo ${decisionNum}`,
              hrDecisionId: decision.id,
            },
          });
        }

        decisionCounter++;
        totalDecisions++;
      } catch (e: any) {
        // skip duplicate decisionNumber
        if (e.code !== 'P2002') console.warn('  ⚠ HrDecision skip:', e.message?.slice(0, 80));
      }
    }
    console.log(`  ✓ ${def.type}: ${def.count} bản ghi`);
  }
  console.log(`  Tổng HrDecision: ${totalDecisions}`);

  // ── 2. TrainingProgram + TrainingRecord (60 bản ghi) ─────────────────────

  console.log('\n📚 Tạo TrainingRecord...');

  const trainingTopics = [
    { title: 'AWS Cloud Practitioner', type: 'TECHNICAL', hours: 40 },
    { title: 'Scrum & Agile Foundation', type: 'MANAGEMENT', hours: 16 },
    { title: 'Leadership Skills for Managers', type: 'SOFT_SKILLS', hours: 24 },
    { title: 'Sales Excellence & CRM', type: 'SALES', hours: 20 },
    { title: 'Design Thinking Workshop', type: 'INNOVATION', hours: 12 },
  ];

  const trainingPrograms: { id: string; durationHours: number }[] = [];

  for (const topic of trainingTopics) {
    const existing = await prisma.trainingProgram.findFirst({ where: { title: topic.title } });
    if (existing) {
      trainingPrograms.push(existing);
    } else {
      const created = await prisma.trainingProgram.create({
        data: {
          title: topic.title,
          type: topic.type,
          durationHours: topic.hours,
          description: `Chương trình đào tạo về ${topic.title}`,
        },
      });
      trainingPrograms.push(created);
    }
  }

  let totalTraining = 0;
  const trainingStatuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'IN_PROGRESS', 'IN_PROGRESS'];

  for (let i = 0; i < 60; i++) {
    const emp = employees[i % employees.length];
    const prog = trainingPrograms[i % trainingPrograms.length];
    const status = pick(trainingStatuses);
    const startDate = dateOnly(daysAgo(Math.floor(Math.random() * 150) + 10));
    const endDate = status === 'COMPLETED'
      ? dateOnly(new Date(startDate.getTime() + prog.durationHours * 3600 * 1000 * 0.5))
      : null;

    try {
      await prisma.trainingRecord.create({
        data: {
          programId: prog.id,
          employeeId: emp.id,
          startDate,
          endDate,
          status: status as any,
          score: status === 'COMPLETED' ? Math.round((70 + Math.random() * 30) * 10) / 10 : null,
          certificate: status === 'COMPLETED' ? `CERT-${prog.id.slice(0, 8).toUpperCase()}-${i}` : null,
          notes: status === 'IN_PROGRESS' ? 'Đang trong quá trình hoàn thành' : null,
        },
      });
      totalTraining++;
    } catch (e: any) {
      // skip
    }
  }
  console.log(`  ✓ TrainingRecord: ${totalTraining} bản ghi`);

  // ── 3. PerformanceReview + PerformanceBonus ────────────────────────────

  console.log('\n⭐ Tạo PerformanceReview + PerformanceBonus...');

  const period = '2026-Q1';
  let totalReviews = 0;
  let totalBonuses = 0;

  const reviewedPairs = new Set<string>();

  for (let i = 0; i < 60; i++) {
    const subject = employees[i % employees.length];
    // Reviewer là manager hoặc nhân viên cấp cao hơn
    const reviewer = managerEmployees[i % managerEmployees.length];

    if (subject.id === reviewer.id) continue;

    const pairKey = `${subject.id}-${period}`;
    if (reviewedPairs.has(pairKey)) continue;
    reviewedPairs.add(pairKey);

    const isCompleted = i < 40; // 40 COMPLETED, 20 PENDING
    const score = isCompleted ? Math.round((3 + Math.random() * 2) * 10) / 10 : null; // 3.0–5.0

    try {
      const review = await prisma.performanceReview.create({
        data: {
          employeeId: subject.id,
          reviewerId: reviewer.id,
          period,
          score,
          status: isCompleted ? 'APPROVED' : 'DRAFT',
          strengths: isCompleted
            ? `Hoàn thành ${Math.floor(80 + Math.random() * 20)}% mục tiêu quý. Kỹ năng giao tiếp tốt, chủ động trong công việc.`
            : null,
          improvements: isCompleted
            ? `Cần cải thiện kỹ năng quản lý thời gian và tài liệu hóa công việc.`
            : null,
          goals: isCompleted
            ? `Q2/2026: Nâng cao năng lực kỹ thuật, hoàn thành ít nhất 2 khóa đào tạo.`
            : null,
          submittedAt: isCompleted ? daysAgo(Math.floor(Math.random() * 45) + 5) : null,
          approvedAt: isCompleted ? daysAgo(Math.floor(Math.random() * 30) + 2) : null,
        },
      });

      totalReviews++;

      // Tạo PerformanceBonus cho reviews score >= 4.0 (20 bản ghi)
      if (isCompleted && score !== null && score >= 4.0 && totalBonuses < 20) {
        const baseSalary = 10_000_000 + Math.floor(Math.random() * 15_000_000);
        const coefficient = score >= 4.5 ? 1.5 : 1.2;
        const bonusAmount = baseSalary * coefficient;

        try {
          await prisma.performanceBonus.create({
            data: {
              employeeId: subject.id,
              reviewId: review.id,
              score,
              baseSalary,
              coefficient,
              bonusAmount,
              status: 'APPROVED',
              approvedById: reviewer.id,
              approvedAt: daysAgo(Math.floor(Math.random() * 20) + 1),
              note: `Thưởng hiệu suất Q1/2026 — Hệ số ${coefficient}x`,
            },
          });
          totalBonuses++;
        } catch (e: any) {
          // skip duplicate
        }
      }
    } catch (e: any) {
      // skip duplicate unique constraint
    }
  }
  console.log(`  ✓ PerformanceReview: ${totalReviews} bản ghi (${totalReviews - totalBonuses} PENDING)`);
  console.log(`  ✓ PerformanceBonus: ${totalBonuses} bản ghi APPROVED`);

  // ── 4. KpiMetric + KpiRecord ──────────────────────────────────────────────

  console.log('\n📊 Tạo KpiMetric + KpiRecord...');

  const kpiMetricDefs = [
    { name: 'Doanh thu tháng', unit: 'VNĐ (triệu)', targetValue: 500, frequency: 'MONTHLY' },
    { name: 'Tỷ lệ hoàn thành dự án', unit: '%', targetValue: 85, frequency: 'MONTHLY' },
    { name: 'Điểm hài lòng khách hàng (CSAT)', unit: 'điểm (1-10)', targetValue: 8.5, frequency: 'MONTHLY' },
    { name: 'Tỷ lệ sửa lỗi (Bug Fix Rate)', unit: '%', targetValue: 95, frequency: 'MONTHLY' },
    { name: 'Tỷ lệ giữ chân nhân viên', unit: '%', targetValue: 90, frequency: 'QUARTERLY' },
    { name: 'Thời gian phản hồi khách hàng', unit: 'giờ', targetValue: 4, frequency: 'MONTHLY' },
    { name: 'Doanh thu trên đầu nhân viên', unit: 'VNĐ (triệu)', targetValue: 30, frequency: 'QUARTERLY' },
    { name: 'Chi phí tuyển dụng trung bình', unit: 'VNĐ (triệu)', targetValue: 5, frequency: 'QUARTERLY' },
    { name: 'NPS (Net Promoter Score)', unit: 'điểm', targetValue: 50, frequency: 'QUARTERLY' },
    { name: 'Tỷ lệ on-time delivery', unit: '%', targetValue: 90, frequency: 'MONTHLY' },
  ];

  const kpiMetrics: { id: string; frequency: string }[] = [];
  let totalKpiMetrics = 0;

  for (const def of kpiMetricDefs.slice(0, 10)) {
    const existing = await prisma.kpiMetric.findFirst({ where: { name: def.name } });
    if (existing) {
      kpiMetrics.push(existing);
    } else {
      const created = await prisma.kpiMetric.create({
        data: {
          name: def.name,
          description: `KPI theo dõi ${def.name.toLowerCase()}`,
          unit: def.unit,
          targetValue: def.targetValue,
          frequency: def.frequency as any,
          isActive: true,
        },
      });
      kpiMetrics.push(created);
      totalKpiMetrics++;
    }
  }
  console.log(`  ✓ KpiMetric: ${kpiMetrics.length} metrics (${totalKpiMetrics} mới)`);

  // KpiRecord — 3 tháng gần nhất (Jan, Feb, Mar 2026)
  const kpiPeriods = ['2026-01', '2026-02', '2026-03'];
  let totalKpiRecords = 0;

  for (const metric of kpiMetrics) {
    const periods = metric.frequency === 'MONTHLY' ? kpiPeriods : ['2026-Q1'];
    for (const period2 of periods) {
      try {
        await prisma.kpiRecord.upsert({
          where: { metricId_period: { metricId: metric.id, period: period2 } },
          update: {},
          create: {
            metricId: metric.id,
            period: period2,
            value: Math.round((0.7 + Math.random() * 0.4) * 100) / 100 * 100, // 70-110% of target
            notes: `Dữ liệu thực tế kỳ ${period2}`,
          },
        });
        totalKpiRecords++;
      } catch (e: any) {
        // skip
      }
    }
  }
  console.log(`  ✓ KpiRecord: ${totalKpiRecords} bản ghi (3 tháng)`);

  // ── 5. OkrObjective + OkrKeyResult ────────────────────────────────────────

  console.log('\n🎯 Tạo OkrObjective + OkrKeyResult...');

  const okrObjectiveDefs = [
    // Q1 2026
    {
      title: 'Tăng trưởng doanh thu B2B lên 30% trong Q1',
      description: 'Mở rộng thị trường B2B, tăng số lượng khách hàng doanh nghiệp mới.',
      cycle: 'Q1' as const,
      year: 2026,
      status: 'COMPLETED' as const,
      keyResults: [
        { title: 'Ký thêm 15 hợp đồng B2B mới', unit: 'hợp đồng', target: 15, current: 17 },
        { title: 'Đạt doanh thu B2B 1.5 tỷ VNĐ', unit: 'VNĐ (triệu)', target: 1500, current: 1620 },
        { title: 'Tỷ lệ chuyển đổi lead B2B đạt 25%', unit: '%', target: 25, current: 28 },
      ],
    },
    {
      title: 'Nâng cao chất lượng sản phẩm — Zero Critical Bug',
      description: 'Giảm thiểu lỗi nghiêm trọng, cải thiện trải nghiệm người dùng.',
      cycle: 'Q1' as const,
      year: 2026,
      status: 'COMPLETED' as const,
      keyResults: [
        { title: 'Giảm critical bug xuống 0', unit: 'bug', target: 0, current: 0 },
        { title: 'Tỷ lệ test coverage đạt 80%', unit: '%', target: 80, current: 83 },
        { title: 'CSAT score trung bình 8.5/10', unit: 'điểm', target: 8.5, current: 8.7 },
      ],
    },
    {
      title: 'Xây dựng văn hóa học tập liên tục',
      description: 'Mỗi nhân viên hoàn thành ít nhất 2 khóa đào tạo trong quý.',
      cycle: 'Q1' as const,
      year: 2026,
      status: 'COMPLETED' as const,
      keyResults: [
        { title: '80% nhân viên hoàn thành ít nhất 1 khóa', unit: '%', target: 80, current: 85 },
        { title: 'Tổng số giờ đào tạo đạt 500 giờ', unit: 'giờ', target: 500, current: 540 },
        { title: 'NPS nội bộ về chương trình đào tạo ≥ 70', unit: 'điểm', target: 70, current: 74 },
      ],
    },
    {
      title: 'Tối ưu hóa chi phí vận hành Q1',
      description: 'Giảm chi phí vận hành 15% so với Q4/2025.',
      cycle: 'Q1' as const,
      year: 2026,
      status: 'ACTIVE' as const,
      keyResults: [
        { title: 'Giảm chi phí cloud infrastructure 20%', unit: '%', target: 20, current: 15 },
        { title: 'Tự động hóa 3 quy trình thủ công', unit: 'quy trình', target: 3, current: 2 },
        { title: 'ROI trên mỗi công cụ SaaS > 3x', unit: 'x', target: 3, current: 2.5 },
      ],
    },
    {
      title: 'Mở rộng đội ngũ kỹ thuật — Tuyển 10 Senior Dev',
      description: 'Bổ sung nhân lực kỹ thuật chất lượng cao phục vụ roadmap sản phẩm.',
      cycle: 'Q1' as const,
      year: 2026,
      status: 'COMPLETED' as const,
      keyResults: [
        { title: 'Tuyển dụng 10 Senior Developer', unit: 'người', target: 10, current: 12 },
        { title: 'Time-to-hire trung bình ≤ 30 ngày', unit: 'ngày', target: 30, current: 25 },
        { title: 'Tỷ lệ offer acceptance ≥ 80%', unit: '%', target: 80, current: 91 },
      ],
    },
    {
      title: 'Tăng tỷ lệ chuyển đổi từ trial sang paid lên 40%',
      description: 'Cải thiện onboarding và tính năng để chuyển đổi người dùng thử nghiệm.',
      cycle: 'Q1' as const,
      year: 2026,
      status: 'COMPLETED' as const,
      keyResults: [
        { title: 'Tỷ lệ chuyển đổi trial → paid đạt 40%', unit: '%', target: 40, current: 43 },
        { title: 'Giảm thời gian onboarding xuống < 10 phút', unit: 'phút', target: 10, current: 8 },
        { title: 'Churn rate < 5%/tháng', unit: '%', target: 5, current: 3.2 },
      ],
    },
    {
      title: 'Ra mắt Module HR mới đúng deadline Q1',
      description: 'Hoàn thành và deploy module HR v5 cho toàn bộ khách hàng Enterprise.',
      cycle: 'Q1' as const,
      year: 2026,
      status: 'COMPLETED' as const,
      keyResults: [
        { title: 'Hoàn thành 100% epic HR v5', unit: '%', target: 100, current: 100 },
        { title: 'Deploy cho 20 khách hàng Enterprise', unit: 'khách hàng', target: 20, current: 22 },
        { title: 'Zero rollback sau go-live 30 ngày', unit: 'rollback', target: 0, current: 0 },
      ],
    },
    {
      title: 'Cải thiện hệ thống bảo mật — SOC2 Readiness',
      description: 'Chuẩn bị nền tảng cho chứng nhận SOC2 Type II.',
      cycle: 'Q1' as const,
      year: 2026,
      status: 'ACTIVE' as const,
      keyResults: [
        { title: 'Hoàn thành gap analysis SOC2', unit: '%', target: 100, current: 75 },
        { title: 'Implement 50 security controls', unit: 'controls', target: 50, current: 32 },
        { title: 'Zero high-severity vulnerability', unit: 'lỗ hổng', target: 0, current: 0 },
      ],
    },
    // Q2 2026
    {
      title: 'Mở rộng thị trường sang khu vực Đông Nam Á',
      description: 'Thâm nhập thị trường Singapore, Malaysia, Thailand với sản phẩm Loop ERP.',
      cycle: 'Q2' as const,
      year: 2026,
      status: 'ACTIVE' as const,
      keyResults: [
        { title: 'Ký 5 hợp đồng tại Singapore', unit: 'hợp đồng', target: 5, current: 2 },
        { title: 'Thiết lập partnership tại Malaysia', unit: 'đối tác', target: 2, current: 1 },
        { title: 'Doanh thu SEA đạt 200M VNĐ', unit: 'VNĐ (triệu)', target: 200, current: 45 },
      ],
    },
    {
      title: 'Nâng cấp hạ tầng — 99.99% Uptime SLA',
      description: 'Cải thiện độ tin cậy hệ thống để đáp ứng cam kết Enterprise SLA.',
      cycle: 'Q2' as const,
      year: 2026,
      status: 'ACTIVE' as const,
      keyResults: [
        { title: 'Uptime ≥ 99.99% mỗi tháng', unit: '%', target: 99.99, current: 99.95 },
        { title: 'MTTR < 15 phút cho critical incident', unit: 'phút', target: 15, current: 22 },
        { title: 'Deploy CI/CD cho tất cả services', unit: '%', target: 100, current: 70 },
      ],
    },
    {
      title: 'Phát triển chương trình Partner & Reseller',
      description: 'Xây dựng hệ sinh thái đối tác giúp tăng trưởng doanh thu gián tiếp.',
      cycle: 'Q2' as const,
      year: 2026,
      status: 'DRAFT' as const,
      keyResults: [
        { title: 'Onboard 10 reseller partner mới', unit: 'đối tác', target: 10, current: 0 },
        { title: 'Doanh thu qua kênh partner đạt 15%', unit: '%', target: 15, current: 0 },
        { title: 'Xây dựng Partner Portal đầy đủ tính năng', unit: '%', target: 100, current: 20 },
      ],
    },
    {
      title: 'Tăng cường năng lực AI trong sản phẩm',
      description: 'Tích hợp AI features vào Loop ERP để tạo differentiation.',
      cycle: 'Q2' as const,
      year: 2026,
      status: 'ACTIVE' as const,
      keyResults: [
        { title: 'Ra mắt 3 AI features mới (SmartSearch, AutoFill, Insights)', unit: 'features', target: 3, current: 1 },
        { title: '50% user sử dụng ít nhất 1 AI feature', unit: '%', target: 50, current: 12 },
        { title: 'AI-driven tasks tiết kiệm 2 giờ/tuần/user', unit: 'giờ', target: 2, current: 0.5 },
      ],
    },
  ];

  let totalOkrObjectives = 0;
  let totalKeyResults = 0;

  for (const def of okrObjectiveDefs) {
    const owner = users[totalOkrObjectives % users.length];
    const orgUnit = orgUnits[totalOkrObjectives % orgUnits.length];

    try {
      const existing = await prisma.okrObjective.findFirst({
        where: { title: def.title, year: def.year, cycle: def.cycle },
      });

      let objId: string;
      if (existing) {
        objId = existing.id;
      } else {
        const obj = await prisma.okrObjective.create({
          data: {
            title: def.title,
            description: def.description,
            cycle: def.cycle,
            year: def.year,
            ownerId: owner.id,
            orgUnitId: orgUnit.id,
            status: def.status,
          },
        });
        objId = obj.id;
        totalOkrObjectives++;

        // Tạo KeyResults
        for (const kr of def.keyResults) {
          await prisma.okrKeyResult.create({
            data: {
              objectiveId: objId,
              title: kr.title,
              unit: kr.unit,
              startValue: 0,
              targetValue: kr.target,
              currentValue: kr.current,
            },
          });
          totalKeyResults++;
        }
      }
    } catch (e: any) {
      console.warn('  ⚠ OKR skip:', e.message?.slice(0, 60));
    }
  }
  console.log(`  ✓ OkrObjective: ${totalOkrObjectives} objectives (Q1+Q2/2026)`);
  console.log(`  ✓ OkrKeyResult: ${totalKeyResults} key results`);

  // ── 6. ProcessInstance (BPM) ─────────────────────────────────────────────

  console.log('\n⚙️  Tạo ProcessInstance (BPM)...');

  // Lấy ProcessDefinition có sẵn — dùng raw SQL tránh lỗi schema version mismatch
  const processDefsRaw = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
    `SELECT id, name FROM process_definitions WHERE status = 'ACTIVE' LIMIT 10`,
  );
  const processDefs = processDefsRaw;

  if (processDefs.length === 0) {
    console.log('  ⚠ Không tìm thấy ProcessDefinition ACTIVE, bỏ qua seed ProcessInstance.');
  } else {
    const processTypes = [
      { key: 'leave', label: 'Xin nghỉ phép' },
      { key: 'expense', label: 'Thanh toán chi phí' },
      { key: 'overtime', label: 'Tăng ca' },
    ];

    const statusDist = [
      ...Array(50).fill('COMPLETED'),
      ...Array(20).fill('RUNNING'),
      ...Array(10).fill('CANCELLED'),
    ];

    let totalInstances = 0;

    for (let i = 0; i < 80; i++) {
      const def = processDefs[i % processDefs.length];
      const user = users[i % users.length];
      const targetStatus = statusDist[i % statusDist.length];
      const startedAt = daysAgo(Math.floor(Math.random() * 90) + 1);
      const completedAt =
        targetStatus === 'COMPLETED' ? new Date(startedAt.getTime() + Math.random() * 72 * 3600 * 1000) : null;

      const typeInfo = processTypes[i % processTypes.length];
      const variables = {
        type: typeInfo.key,
        label: typeInfo.label,
        reason: `Lý do ${typeInfo.label.toLowerCase()} số ${i + 1}`,
        requestedBy: user.id,
        amount: typeInfo.key === 'expense' ? Math.floor(Math.random() * 5_000_000) + 200_000 : undefined,
        startDate: typeInfo.key !== 'expense' ? daysAgo(Math.floor(Math.random() * 30)).toISOString() : undefined,
        endDate: typeInfo.key !== 'expense' ? daysAgo(Math.floor(Math.random() * 10)).toISOString() : undefined,
      };

      try {
        // Dùng raw INSERT để tránh lỗi schema mismatch (tenant_id column có thể chưa migrate)
        await prisma.$executeRawUnsafe(
          `INSERT INTO process_instances (id, definition_id, started_by, status, variables, token_state, started_at, completed_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)
           ON CONFLICT DO NOTHING`,
          randomUUID(),
          def.id,
          user.id,
          targetStatus,
          JSON.stringify(variables),
          JSON.stringify(targetStatus === 'COMPLETED' ? { currentStep: 'End', completed: true } : { currentStep: 'ManagerApprove' }),
          startedAt.toISOString(),
          completedAt ? completedAt.toISOString() : null,
        );
        totalInstances++;
      } catch (e: any) {
        // skip
      }
    }

    const completedCount = Math.min(50, totalInstances);
    const runningCount = Math.min(20, Math.max(0, totalInstances - 50));
    const cancelledCount = Math.max(0, totalInstances - completedCount - runningCount);
    console.log(`  ✓ ProcessInstance: ${totalInstances} bản ghi`);
    console.log(`    - COMPLETED: ~${completedCount}`);
    console.log(`    - RUNNING: ~${runningCount}`);
    console.log(`    - CANCELLED: ~${cancelledCount}`);
  }

  // ── Báo cáo tổng kết ─────────────────────────────────────────────────────

  console.log('\n✅ Seed HR data hoàn tất!\n');
  console.log('📈 Tổng kết:');

  const counts = await Promise.all([
    prisma.hrDecision.count(),
    prisma.workHistory.count(),
    prisma.trainingRecord.count(),
    prisma.performanceReview.count(),
    prisma.performanceBonus.count(),
    prisma.kpiMetric.count(),
    prisma.kpiRecord.count(),
    prisma.okrObjective.count(),
    prisma.okrKeyResult.count(),
    prisma.processInstance.count(),
  ]);

  const labels = [
    'HrDecision',
    'WorkHistory',
    'TrainingRecord',
    'PerformanceReview',
    'PerformanceBonus',
    'KpiMetric',
    'KpiRecord',
    'OkrObjective',
    'OkrKeyResult',
    'ProcessInstance',
  ];

  labels.forEach((label, i) => {
    console.log(`  ${label}: ${counts[i]}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Seed thất bại:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
