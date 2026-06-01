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

async function main() {
  console.log('🌱 Seed instance BPM cho các quy trình chưa có dữ liệu...\n');

  const defs = await prisma.processDefinition.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, key: true, name: true, stepConfig: true },
  });
  const users = await prisma.user.findMany({ select: { id: true, role: true }, take: 100 });
  const approvers = users.filter((u) => u.role === 'ADMIN' || u.role === 'PM' || u.role === 'LEADERSHIP');
  const pool2 = approvers.length ? approvers : users;
  if (users.length === 0) { console.log('❌ Cần users.'); return; }

  let totalInst = 0;
  for (const def of defs) {
    const have = await prisma.processInstance.count({ where: { definitionId: def.id } });
    if (have > 0) continue; // bỏ qua quy trình đã có instance (nghỉ phép/OT)

    const steps = Object.keys((def.stepConfig as Record<string, unknown>) ?? {});
    const firstTask = steps[0] ?? 'ApproveTask';
    const taskName = `Phê duyệt: ${def.name}`;

    for (let i = 0; i < rand(5, 9); i++) {
      const starter = pick(users);
      const approver = pick(pool2);
      const startedAt = dayjs().subtract(rand(1, 80), 'days');
      const completed = Math.random() < 0.55;

      const inst = await prisma.processInstance.create({
        data: {
          definitionId: def.id,
          startedBy: starter.id,
          status: completed ? 'COMPLETED' : 'RUNNING',
          variables: { note: `Yêu cầu ${def.name}` } as Prisma.InputJsonValue,
          tokenState: (completed ? {} : { current: firstTask }) as Prisma.InputJsonValue,
          startedAt: startedAt.toDate(),
          completedAt: completed ? startedAt.add(rand(1, 4), 'day').toDate() : null,
        },
      });
      totalInst++;

      await prisma.processUserTask.create({
        data: {
          instanceId: inst.id,
          activityId: firstTask,
          name: taskName,
          assigneeId: approver.id,
          candidateRoles: ['MANAGER', 'ADMIN'],
          status: completed ? 'COMPLETED' : 'PENDING',
          dueDate: startedAt.add(2, 'day').toDate(),
          completedAt: completed ? startedAt.add(rand(1, 3), 'day').toDate() : null,
          formData: completed ? ({ decision: pick(['APPROVED', 'REJECTED']) } as Prisma.InputJsonValue) : Prisma.DbNull,
        },
      });

      const logs: Prisma.ProcessActivityLogCreateManyInput[] = [
        { instanceId: inst.id, activityId: 'StartEvent_1', activityName: 'Bắt đầu', activityType: 'startEvent', performedBy: starter.id, startedAt: startedAt.toDate(), completedAt: startedAt.toDate() },
        { instanceId: inst.id, activityId: firstTask, activityName: taskName, activityType: 'userTask', performedBy: completed ? approver.id : null, startedAt: startedAt.toDate(), completedAt: completed ? startedAt.add(rand(1, 3), 'day').toDate() : null },
      ];
      if (completed) logs.push({ instanceId: inst.id, activityId: 'EndEvent_1', activityName: 'Kết thúc', activityType: 'endEvent', performedBy: approver.id, startedAt: startedAt.add(rand(1, 4), 'day').toDate(), completedAt: startedAt.add(rand(1, 4), 'day').toDate() });
      await prisma.processActivityLog.createMany({ data: logs });
    }
    console.log(`  ✓ ${def.key}: tạo instance`);
  }
  console.log(`\n✅ Tạo ${totalInst} instance mẫu cho quy trình mới.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
