/**
 * E20.1 — Demo data cho Project Cost Engine
 * Tạo ProjectCostSnapshot và ProjectCostByEmployee cho 3 project ACTIVE gần nhất.
 * Mô phỏng 5 ngày snapshot để có trend data trên dashboard.
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log('[seed-project-cost] Bắt đầu seed demo data chi phí dự án...');

  // Lấy tối đa 3 project ACTIVE
  const projects = await prisma.project.findMany({
    where: { status: 'ACTIVE', deletedAt: null },
    select: {
      id: true,
      name: true,
      budgetCost: true,
      members: {
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              contracts: {
                where: { status: 'ACTIVE', deletedAt: null },
                select: { salaryMonthly: true },
                orderBy: { startDate: 'desc' },
                take: 1,
              },
            },
          },
        },
        take: 5,
      },
    },
    take: 3,
  });

  if (projects.length === 0) {
    console.log('[seed-project-cost] Không tìm thấy project ACTIVE nào. Bỏ qua.');
    return;
  }

  console.log(`[seed-project-cost] Tạo snapshot cho ${projects.length} project: ${projects.map(p => p.name).join(', ')}`);

  const WORK_DAYS_PER_MONTH = 26;
  const HOURS_PER_DAY = 8;

  // Tạo snapshot cho 5 ngày gần nhất (0–4 ngày trước) để có trend
  const snapshotDays = [4, 3, 2, 1, 0];

  for (const project of projects) {
    const budgetCost = project.budgetCost ? Number(project.budgetCost) : 200_000_000;

    for (let i = 0; i < snapshotDays.length; i++) {
      const daysOffset = snapshotDays[i];
      const snapshotDate = daysAgo(daysOffset);

      // Tăng dần chi phí theo ngày để tạo trend tăng tự nhiên
      const growthFactor = 0.6 + i * 0.08; // 0.60 → 0.92
      const totalLaborCost = Math.round(budgetCost * growthFactor * 0.7);
      const totalExpenseCost = Math.round(budgetCost * growthFactor * 0.1);
      const totalCost = totalLaborCost + totalExpenseCost;
      const utilizationRate = budgetCost > 0 ? totalCost / budgetCost : 0;

      // Upsert snapshot
      const snapshot = await prisma.projectCostSnapshot.upsert({
        where: {
          projectId_snapshotDate: {
            projectId: project.id,
            snapshotDate,
          },
        },
        update: {
          totalLaborCost,
          totalExpenseCost,
          totalCost,
          utilizationRate,
        },
        create: {
          projectId: project.id,
          snapshotDate,
          totalLaborCost,
          totalExpenseCost,
          totalCost,
          utilizationRate,
        },
      });

      // Tạo ProjectCostByEmployee cho từng thành viên
      for (const member of project.members) {
        const emp = member.employee;
        if (!emp) continue;

        const salary = emp.contracts[0]?.salaryMonthly
          ? Number(emp.contracts[0].salaryMonthly)
          : 15_000_000;
        const ratePerHour = salary / (WORK_DAYS_PER_MONTH * HOURS_PER_DAY);
        const totalHours = Math.round(60 * growthFactor); // 36–55 giờ
        const laborCost = Math.round(totalHours * ratePerHour);

        const existingCostByEmp = await prisma.projectCostByEmployee.findFirst({
          where: { snapshotId: snapshot.id, employeeId: emp.id },
          select: { id: true },
        });
        if (existingCostByEmp) {
          await prisma.projectCostByEmployee.update({
            where: { id: existingCostByEmp.id },
            data: { hours: totalHours, ratePerHour, cost: laborCost },
          });
        } else {
          await prisma.projectCostByEmployee.create({
            data: {
              snapshotId: snapshot.id,
              employeeId: emp.id,
              hours: totalHours,
              ratePerHour,
              cost: laborCost,
            },
          });
        }
      }

      console.log(
        `  [${project.name}] ${snapshotDate.toISOString().split('T')[0]}: laborCost=${totalLaborCost.toLocaleString('vi-VN')}đ util=${(utilizationRate * 100).toFixed(1)}%`,
      );
    }
  }

  console.log('[seed-project-cost] Hoàn tất!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
