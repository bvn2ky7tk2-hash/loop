import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../src/generated/prisma';
import dayjs from 'dayjs';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Tìm activityId của bước có field criteria_grid trong taskFormFields
function gridStep(taskFormFields: any): string | null {
  if (!taskFormFields) return null;
  for (const [activityId, fields] of Object.entries(taskFormFields)) {
    if (Array.isArray(fields) && (fields as any[]).some((f) => f.type === 'criteria_grid')) {
      return activityId;
    }
  }
  return null;
}

async function main() {
  console.log('🌱 Tạo task đánh giá (có bảng tiêu chí) gán admin...\n');

  const admin = await prisma.user.findFirst({ where: { email: 'admin@loop.vn' }, select: { id: true } });
  if (!admin) { console.log('❌ Không có admin@loop.vn'); return; }

  const EVAL_KEYS = ['performance-review', 'probation-evaluation', 'contract-renewal'];
  const defs = await prisma.processDefinition.findMany({
    where: { key: { in: EVAL_KEYS }, status: 'ACTIVE' },
    select: { id: true, key: true, name: true, formFields: true, taskFormFields: true },
  });
  const starters = await prisma.user.findMany({ select: { id: true }, take: 200 });

  let total = 0;
  for (const def of defs) {
    const step = gridStep(def.taskFormFields);
    if (!step) { console.log(`  ⚠ ${def.key}: không có bước criteria_grid, bỏ qua`); continue; }

    const formFields = (def.formFields as any[]) ?? [];
    for (let i = 0; i < 5; i++) {
      const starter = pick(starters);
      const startedAt = dayjs().subtract(rand(0, 10), 'day');
      const variables: Record<string, unknown> = {};
      formFields.forEach((f, idx) => {
        variables[f.name] =
          f.type === 'date' ? dayjs().add(rand(5, 60), 'day').format('YYYY-MM-DD') :
          f.type === 'number' ? rand(1, 36) :
          `${f.label ?? f.name} mẫu #${i + 1}`;
      });

      const inst = await prisma.processInstance.create({
        data: {
          definitionId: def.id, startedBy: starter.id, status: 'RUNNING',
          variables: variables as Prisma.InputJsonValue,
          tokenState: { current: step } as Prisma.InputJsonValue,
          startedAt: startedAt.toDate(),
        },
      });
      await prisma.processUserTask.create({
        data: {
          instanceId: inst.id, activityId: step,
          name: `Đánh giá: ${def.name}`,
          assigneeId: admin.id,
          candidateRoles: ['MANAGER', 'ADMIN'],
          status: 'PENDING',
          dueDate: startedAt.add(rand(2, 5), 'day').toDate(),
        },
      });
      await prisma.processActivityLog.create({
        data: {
          instanceId: inst.id, activityId: 'StartEvent_1', activityName: 'Bắt đầu',
          activityType: 'startEvent', performedBy: starter.id,
          startedAt: startedAt.toDate(), completedAt: startedAt.toDate(),
        },
      });
      total++;
    }
    console.log(`  ✓ ${def.key}: +5 task ở bước "${step}" (có bảng tiêu chí)`);
  }
  console.log(`\n✅ Tạo ${total} task đánh giá gán admin — mở trên Workspace/Hộp thư sẽ thấy bảng tiêu chí.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
