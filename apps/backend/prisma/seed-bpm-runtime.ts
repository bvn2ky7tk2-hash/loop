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

// Activity của 2 BPMN trong seed-processes.js
const FLOW: Record<string, { taskId: string; taskName: string }> = {
  'leave-approval': { taskId: 'ManagerApproveTask', taskName: 'Manager duyệt đơn nghỉ phép' },
  'overtime-approval': { taskId: 'ApproveOTTask', taskName: 'Manager duyệt đăng ký OT' },
};

async function main() {
  console.log('🌱 Seed BPM runtime (instances, tasks, logs, delegation)...\n');

  const definitions = await prisma.processDefinition.findMany({ select: { id: true, key: true } });
  const users = await prisma.user.findMany({ select: { id: true, role: true }, take: 100 });
  if (definitions.length === 0 || users.length === 0) {
    console.log('❌ Cần process_definitions (chạy seed:processes) và users.');
    return;
  }
  const managers = users.filter((u) => u.role === 'ADMIN' || u.role === 'PM' || u.role === 'LEADERSHIP');
  const approverPool = managers.length > 0 ? managers : users;

  // ── Instances + user tasks + activity logs ─────────────────────────────────
  if (await prisma.processInstance.count() > 0) {
    console.log('⏭  Đã có process instances, bỏ qua.');
  } else {
    let instCount = 0, taskCount = 0, logCount = 0;
    for (const def of definitions) {
      const flow = FLOW[def.key ?? ''] ?? { taskId: 'ApproveTask', taskName: 'Phê duyệt' };
      for (let i = 0; i < 25; i++) {
        const starter = pick(users);
        const approver = pick(approverPool);
        const startedAt = dayjs().subtract(rand(1, 90), 'days');
        // 60% hoàn thành, 40% đang chạy chờ duyệt
        const completed = Math.random() < 0.6;
        const variables = def.key === 'leave-approval'
          ? { startDate: startedAt.format('YYYY-MM-DD'), endDate: startedAt.add(rand(1, 5), 'day').format('YYYY-MM-DD'), days: rand(1, 5), reason: 'Nghỉ phép cá nhân' }
          : { date: startedAt.format('YYYY-MM-DD'), hours: rand(1, 8), reason: 'Làm thêm hoàn thành sprint' };

        const inst = await prisma.processInstance.create({
          data: {
            definitionId: def.id,
            startedBy: starter.id,
            status: completed ? 'COMPLETED' : 'RUNNING',
            variables: variables as Prisma.InputJsonValue,
            tokenState: (completed ? {} : { current: flow.taskId }) as Prisma.InputJsonValue,
            startedAt: startedAt.toDate(),
            completedAt: completed ? startedAt.add(rand(1, 4), 'day').toDate() : null,
          },
        });
        instCount++;

        // User task
        await prisma.processUserTask.create({
          data: {
            instanceId: inst.id,
            activityId: flow.taskId,
            name: flow.taskName,
            assigneeId: approver.id,
            candidateRoles: ['MANAGER', 'ADMIN'],
            formData: completed ? ({ decision: pick(['APPROVED', 'REJECTED']) } as Prisma.InputJsonValue) : Prisma.DbNull,
            status: completed ? 'COMPLETED' : 'PENDING',
            dueDate: startedAt.add(2, 'day').toDate(),
            completedAt: completed ? startedAt.add(rand(1, 3), 'day').toDate() : null,
          },
        });
        taskCount++;

        // Activity logs
        const logs: Prisma.ProcessActivityLogCreateManyInput[] = [
          { instanceId: inst.id, activityId: 'StartEvent_1', activityName: 'Bắt đầu', activityType: 'startEvent', performedBy: starter.id, startedAt: startedAt.toDate(), completedAt: startedAt.toDate() },
        ];
        if (completed) {
          logs.push({ instanceId: inst.id, activityId: flow.taskId, activityName: flow.taskName, activityType: 'userTask', performedBy: approver.id, startedAt: startedAt.toDate(), completedAt: startedAt.add(rand(1, 3), 'day').toDate() });
          logs.push({ instanceId: inst.id, activityId: 'EndEvent_1', activityName: 'Kết thúc', activityType: 'endEvent', performedBy: approver.id, startedAt: startedAt.add(rand(1, 4), 'day').toDate(), completedAt: startedAt.add(rand(1, 4), 'day').toDate() });
        } else {
          logs.push({ instanceId: inst.id, activityId: flow.taskId, activityName: flow.taskName, activityType: 'userTask', performedBy: null, startedAt: startedAt.toDate(), completedAt: null });
        }
        const r = await prisma.processActivityLog.createMany({ data: logs });
        logCount += r.count;
      }
    }
    console.log(`   ✓ ${instCount} instances, ${taskCount} user tasks, ${logCount} activity logs`);
  }

  // ── Delegation rules ───────────────────────────────────────────────────────
  console.log('🔁 Delegation rules...');
  if (await prisma.delegationRule.count() > 0) {
    console.log('   ⏭  Đã có, bỏ qua.');
  } else {
    const rows: Prisma.DelegationRuleCreateManyInput[] = [];
    const pool2 = approverPool.length >= 2 ? approverPool : users;
    for (let i = 0; i < Math.min(10, pool2.length - 1); i++) {
      const delegator = pool2[i];
      const delegate = pool2[(i + 1) % pool2.length];
      if (delegator.id === delegate.id) continue;
      const start = dayjs().subtract(rand(0, 20), 'days');
      rows.push({
        delegatorId: delegator.id, delegateId: delegate.id,
        moduleTypes: pick([['LEAVE'], ['OVERTIME'], ['LEAVE', 'OVERTIME'], ['EXPENSE']]),
        startDate: start.toDate(), endDate: start.add(rand(7, 30), 'day').toDate(),
        isActive: Math.random() > 0.3,
        note: 'Uỷ quyền phê duyệt khi đi vắng',
      });
    }
    const r = await prisma.delegationRule.createMany({ data: rows });
    console.log(`   ✓ ${r.count} delegation rules`);
  }

  console.log('\n✅ Hoàn tất seed BPM runtime!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
