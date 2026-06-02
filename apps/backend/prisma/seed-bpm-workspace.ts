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

// Sinh giá trị mẫu cho 1 field theo type
function sampleValue(f: any, idx: number): unknown {
  const opts = f.options as { value: string }[] | undefined;
  switch (f.type) {
    case 'number': return rand(f.min ?? 1, f.max ?? 5_000_000);
    case 'date': return dayjs().add(rand(1, 30), 'day').format('YYYY-MM-DD');
    case 'select': return opts?.length ? pick(opts).value : 'OPTION';
    case 'textarea': return `Nội dung chi tiết #${idx + 1} — dữ liệu mẫu để xử lý trên Workspace.`;
    default: return `Mẫu ${f.label ?? f.name} #${idx + 1}`;
  }
}

async function main() {
  console.log('🌱 Seed instance BPM cho Workspace (task PENDING gán admin + chưa gán)...\n');

  const admin = await prisma.user.findFirst({ where: { email: 'admin@loop.vn' }, select: { id: true } });
  if (!admin) { console.log('❌ Không tìm thấy admin@loop.vn'); return; }

  const defs = await prisma.processDefinition.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, key: true, name: true, stepConfig: true, formFields: true },
  });
  const users = await prisma.user.findMany({ select: { id: true, role: true }, take: 200 });
  const starters = users; // người tạo yêu cầu
  const approvers = users.filter((u) => ['ADMIN', 'PM', 'LEADERSHIP'].includes(u.role as string));
  const approverPool = approvers.length ? approvers : users;

  let totalInst = 0;
  let adminTasks = 0;
  let unassignedTasks = 0;

  for (const def of defs) {
    const steps = Object.keys((def.stepConfig as Record<string, unknown>) ?? {});
    const firstTask = steps[0] ?? 'ApproveTask';
    const formFields = (def.formFields as any[]) ?? [];

    // 8 instance/quy trình: 4 gán admin, 2 chưa gán (claim), 2 gán approver khác
    const PLAN: ('admin' | 'unassigned' | 'other')[] = [
      'admin', 'admin', 'admin', 'admin', 'unassigned', 'unassigned', 'other', 'other',
    ];

    for (let i = 0; i < PLAN.length; i++) {
      const mode = PLAN[i];
      const starter = pick(starters);
      const startedAt = dayjs().subtract(rand(0, 20), 'day');

      // Build variables từ formFields để form duyệt có dữ liệu
      const variables: Record<string, unknown> = {};
      formFields.forEach((f, idx) => { variables[f.name] = sampleValue(f, idx); });
      variables['_label'] = `${def.name} #${i + 1}`;

      const inst = await prisma.processInstance.create({
        data: {
          definitionId: def.id,
          startedBy: starter.id,
          status: 'RUNNING',
          variables: variables as Prisma.InputJsonValue,
          tokenState: { current: firstTask } as Prisma.InputJsonValue,
          startedAt: startedAt.toDate(),
        },
      });
      totalInst++;

      const assigneeId =
        mode === 'admin' ? admin.id :
        mode === 'unassigned' ? null :
        pick(approverPool).id;
      if (mode === 'admin') adminTasks++;
      if (mode === 'unassigned') unassignedTasks++;

      await prisma.processUserTask.create({
        data: {
          instanceId: inst.id,
          activityId: firstTask,
          name: `Phê duyệt: ${def.name}`,
          assigneeId,
          candidateRoles: ['MANAGER', 'ADMIN', 'PM'],
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
    }
    console.log(`  ✓ ${def.key}: +${PLAN.length} instance`);
  }

  console.log(`\n✅ Tạo ${totalInst} instance RUNNING.`);
  console.log(`   • Task PENDING gán admin (hiện ở "Việc của tôi"): ${adminTasks}`);
  console.log(`   • Task PENDING chưa gán (claim được trên Workspace): ${unassignedTasks}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
