/**
 * seed-demo-roles.ts
 * Tạo bộ tài khoản demo đầy đủ cho 4 role:
 *   admin@loop.vn    / admin       → ADMIN      (Super Admin, xem full)
 *   lanhdao@loop.vn  / Demo@2024   → LEADERSHIP (Giám đốc điều hành)
 *   pm@loop.vn       / admin       → PM         (Quản lý dự án)
 *   hr@loop.vn       / Demo@2024   → MEMBER     (Trưởng phòng Nhân sự)
 *   manager@loop.vn  / Demo@2024   → MEMBER     (Trưởng phòng, phê duyệt trực tiếp)
 *
 * Cấu trúc phê duyệt:
 *   Dev team (5 nhân viên) → directManager = manager@loop.vn
 *   Pending: 5 đơn nghỉ + 3 OT + 3 chi phí chờ manager duyệt
 *   ProcessUserTask assigned to manager@loop.vn cho mỗi đơn pending
 *
 * Chạy độc lập: cd apps/backend && npx ts-node prisma/seed-demo-roles.ts
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../src/generated/prisma';
import bcrypt from 'bcrypt';
import dayjs from 'dayjs';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const HASH_ROUNDS = 10;
const DEMO_PASS = 'Demo@2024';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function upsertUser(data: {
  email: string; password: string; name: string; role: string; orgUnitId: string;
}) {
  const hash = await bcrypt.hash(data.password, HASH_ROUNDS);
  return prisma.user.upsert({
    where: { email: data.email },
    update: { name: data.name, role: data.role as any, orgUnitId: data.orgUnitId },
    create: {
      email: data.email,
      passwordHash: hash,
      name: data.name,
      role: data.role as any,
      orgUnitId: data.orgUnitId,
      isActive: true,
    },
  });
}

async function upsertEmployee(data: {
  code: string; fullName: string; gender: string; userId?: string;
  orgUnitId: string; jobTitleId?: string; startDate: Date; level: string;
  directManagerId?: string;
}) {
  const existing = await prisma.employee.findFirst({ where: { code: data.code } });
  if (existing) {
    return prisma.employee.update({
      where: { id: existing.id },
      data: {
        userId: data.userId,
        orgUnitId: data.orgUnitId,
        directManagerId: data.directManagerId ?? null,
        jobTitleId: data.jobTitleId,
        fullName: data.fullName,
      },
    });
  }
  return prisma.employee.create({
    data: {
      code: data.code,
      fullName: data.fullName,
      gender: data.gender as any,
      userId: data.userId,
      orgUnitId: data.orgUnitId,
      jobTitleId: data.jobTitleId,
      startDate: data.startDate,
      level: data.level as any,
      directManagerId: data.directManagerId ?? null,
      isActive: true,
      employeeStatus: 'ACTIVE',
    },
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function seedDemoRoles() {
  console.log('\n🎭 Seed Demo Roles — 4 role tài khoản + dữ liệu phê duyệt...\n');

  // ── 0. Hash mật khẩu demo ──────────────────────────────────────────────────
  const demoHash  = await bcrypt.hash(DEMO_PASS, HASH_ROUNDS);
  const adminHash = await bcrypt.hash('admin', HASH_ROUNDS);

  // ── 1. OrgUnit ─────────────────────────────────────────────────────────────
  const orgRoot = await prisma.orgUnit.findFirst({ where: { code: 'ROOT' } })
    ?? await prisma.orgUnit.create({ data: { name: 'Công ty Loop', code: 'ROOT', level: 0 } });

  const orgBGD = await prisma.orgUnit.findFirst({ where: { code: 'BGD' } })
    ?? await prisma.orgUnit.create({ data: { name: 'Ban Giám Đốc', code: 'BGD', parentId: orgRoot.id, level: 1 } });

  const orgTECH = await prisma.orgUnit.findFirst({ where: { code: { in: ['TECH', 'DEV'] } } })
    ?? await prisma.orgUnit.create({ data: { name: 'Phòng Công Nghệ', code: 'TECH', parentId: orgRoot.id, level: 1 } });

  const orgHRD = await prisma.orgUnit.findFirst({ where: { code: 'HRD' } })
    ?? await prisma.orgUnit.create({ data: { name: 'Phòng Nhân Sự', code: 'HRD', parentId: orgRoot.id, level: 1 } });

  const orgPROJ = await prisma.orgUnit.findFirst({ where: { code: { in: ['PROJ', 'PMO'] } } })
    ?? await prisma.orgUnit.create({ data: { name: 'Phòng Dự Án', code: 'PROJ', parentId: orgRoot.id, level: 1 } });

  console.log('  ✓ OrgUnits: BGD, TECH, HRD, PROJ');

  // ── 2. JobTitles ───────────────────────────────────────────────────────────
  const jtDefs = [
    { code: 'JT-CEO-DEMO',  name: 'Giám Đốc Điều Hành' },
    { code: 'JT-CTO-DEMO',  name: 'Giám Đốc Công Nghệ' },
    { code: 'JT-PM-DEMO',   name: 'Quản Lý Dự Án' },
    { code: 'JT-HRM-DEMO',  name: 'Trưởng Phòng Nhân Sự' },
    { code: 'JT-MGR-DEMO',  name: 'Trưởng Phòng Công Nghệ' },
    { code: 'JT-DEV-DEMO',  name: 'Kỹ Sư Phần Mềm' },
  ];
  const jt: Record<string, string> = {};
  for (const d of jtDefs) {
    const _e = await prisma.jobTitle.findFirst({ where: { code: d.code } });
    const rec = _e
      ? await prisma.jobTitle.update({ where: { id: _e.id }, data: { name: d.name } })
      : await prisma.jobTitle.create({ data: { code: d.code, name: d.name } });
    jt[d.code] = rec.id;
  }
  console.log('  ✓ JobTitles upserted');

  // ── 3. Users ───────────────────────────────────────────────────────────────
  const uAdmin = await upsertUser({
    email: 'admin@loop.vn', password: 'admin',
    name: 'Admin Hệ Thống', role: 'ADMIN', orgUnitId: orgRoot.id,
  });

  const uLanhDao = await prisma.user.upsert({
    where: { email: 'lanhdao@loop.vn' },
    update: { name: 'Nguyễn Văn An', role: 'LEADERSHIP', orgUnitId: orgBGD.id },
    create: {
      email: 'lanhdao@loop.vn', passwordHash: demoHash,
      name: 'Nguyễn Văn An', role: 'LEADERSHIP' as any,
      orgUnitId: orgBGD.id, isActive: true,
    },
  });

  const uPM = await upsertUser({
    email: 'pm@loop.vn', password: 'admin',
    name: 'Trần Thị Bình', role: 'PM', orgUnitId: orgPROJ.id,
  });

  const uHR = await prisma.user.upsert({
    where: { email: 'hr@loop.vn' },
    update: { name: 'Lê Thị Hoa', role: 'MEMBER', orgUnitId: orgHRD.id },
    create: {
      email: 'hr@loop.vn', passwordHash: demoHash,
      name: 'Lê Thị Hoa', role: 'MEMBER' as any,
      orgUnitId: orgHRD.id, isActive: true,
    },
  });

  const uManager = await prisma.user.upsert({
    where: { email: 'manager@loop.vn' },
    update: { name: 'Phạm Văn Tuấn', role: 'MEMBER', orgUnitId: orgTECH.id },
    create: {
      email: 'manager@loop.vn', passwordHash: demoHash,
      name: 'Phạm Văn Tuấn', role: 'MEMBER' as any,
      orgUnitId: orgTECH.id, isActive: true,
    },
  });

  // Dev team user accounts (để submit leave/OT/expense)
  const devUsers = await Promise.all([
    { email: 'dev1@loop.vn', name: 'Hoàng Đức Minh' },
    { email: 'dev2@loop.vn', name: 'Vũ Thị Lan' },
    { email: 'dev3@loop.vn', name: 'Đặng Văn Hùng' },
    { email: 'dev4@loop.vn', name: 'Bùi Thị Ngọc' },
    { email: 'dev5@loop.vn', name: 'Hồ Văn Phúc' },
  ].map(u => prisma.user.upsert({
    where: { email: u.email },
    update: { name: u.name, orgUnitId: orgTECH.id },
    create: {
      email: u.email, passwordHash: demoHash,
      name: u.name, role: 'MEMBER' as any,
      orgUnitId: orgTECH.id, isActive: true,
    },
  })));

  console.log(`  ✓ Users: admin, lanhdao, pm, hr, manager, dev1–5`);

  // ── 4. Employees ───────────────────────────────────────────────────────────
  const empCEO  = await upsertEmployee({ code: 'EMP-DEMO-CEO', fullName: 'Nguyễn Văn An', gender: 'MALE', userId: uLanhDao.id, orgUnitId: orgBGD.id,   jobTitleId: jt['JT-CEO-DEMO'],  startDate: new Date('2018-01-01'), level: 'EXPERT' });
  const empPM   = await upsertEmployee({ code: 'EMP-DEMO-PM',  fullName: 'Trần Thị Bình', gender: 'FEMALE', userId: uPM.id,      orgUnitId: orgPROJ.id, jobTitleId: jt['JT-PM-DEMO'],   startDate: new Date('2020-03-01'), level: 'SENIOR', directManagerId: empCEO.id });
  const empHR   = await upsertEmployee({ code: 'EMP-DEMO-HR',  fullName: 'Lê Thị Hoa',   gender: 'FEMALE', userId: uHR.id,      orgUnitId: orgHRD.id,  jobTitleId: jt['JT-HRM-DEMO'],  startDate: new Date('2019-06-01'), level: 'SENIOR', directManagerId: empCEO.id });
  const empMGR  = await upsertEmployee({ code: 'EMP-DEMO-MGR', fullName: 'Phạm Văn Tuấn', gender: 'MALE', userId: uManager.id,  orgUnitId: orgTECH.id, jobTitleId: jt['JT-MGR-DEMO'],  startDate: new Date('2019-01-01'), level: 'EXPERT', directManagerId: empCEO.id });

  // Dev team — directManager = manager
  const devEmpDefs = [
    { code: 'EMP-DEMO-DEV1', fullName: 'Hoàng Đức Minh', gender: 'MALE',   userId: devUsers[0].id, level: 'MID' },
    { code: 'EMP-DEMO-DEV2', fullName: 'Vũ Thị Lan',     gender: 'FEMALE', userId: devUsers[1].id, level: 'JUNIOR' },
    { code: 'EMP-DEMO-DEV3', fullName: 'Đặng Văn Hùng',  gender: 'MALE',   userId: devUsers[2].id, level: 'MID' },
    { code: 'EMP-DEMO-DEV4', fullName: 'Bùi Thị Ngọc',   gender: 'FEMALE', userId: devUsers[3].id, level: 'SENIOR' },
    { code: 'EMP-DEMO-DEV5', fullName: 'Hồ Văn Phúc',    gender: 'MALE',   userId: devUsers[4].id, level: 'JUNIOR' },
  ];
  const devEmps = await Promise.all(devEmpDefs.map(d => upsertEmployee({
    ...d, orgUnitId: orgTECH.id, jobTitleId: jt['JT-DEV-DEMO'],
    startDate: new Date('2022-01-01'), directManagerId: empMGR.id,
  })));

  console.log('  ✓ Employees: CEO, PM, HR, Manager, Dev1–5 + hierarchy');

  // ── 5. OrgUnit leader gán ──────────────────────────────────────────────────
  await prisma.orgUnit.update({ where: { id: orgTECH.id }, data: { leaderId: empMGR.id } });
  await prisma.orgUnit.update({ where: { id: orgHRD.id  }, data: { leaderId: empHR.id  } });
  await prisma.orgUnit.update({ where: { id: orgBGD.id  }, data: { leaderId: empCEO.id } });

  // ── 6. Projects — gán pm@loop.vn làm PM ───────────────────────────────────
  const existingProjects = await prisma.project.findMany({
    where: { pmId: { in: [uAdmin.id, uPM.id] } },
    take: 3,
    orderBy: { createdAt: 'desc' },
  });

  if (existingProjects.length === 0) {
    // Tạo project mẫu nếu chưa có
    for (const p of [
      { code: 'PRJ-DEMO-001', name: 'Dự Án ERP Nội Bộ',          status: 'ACTIVE', type: 'OSDC' },
      { code: 'PRJ-DEMO-002', name: 'Website Thương Mại Điện Tử', status: 'ACTIVE', type: 'PKG'  },
    ]) {
      const exists = await prisma.project.findFirst({ where: { code: p.code } });
      if (!exists) {
        await prisma.project.create({
          data: {
            code: p.code, name: p.name, status: p.status as any, type: p.type as any,
            pmId: uPM.id, orgUnitId: orgPROJ.id,
            startDate: new Date('2026-01-01'),
            endDate:   new Date('2026-12-31'),
          },
        });
      }
    }
    console.log('  ✓ 2 projects mẫu tạo với PM = pm@loop.vn');
  } else {
    // Gán PM cho project hiện có
    await Promise.all(existingProjects.slice(0, 3).map(p =>
      prisma.project.update({ where: { id: p.id }, data: { pmId: uPM.id } })
    ));
    console.log(`  ✓ Gán pm@loop.vn làm PM cho ${existingProjects.length} project`);
  }

  // ── 7. ModuleRole: hr:manager cho hr@loop.vn ──────────────────────────────
  const hrManagerRole = await prisma.moduleRole.findFirst({ where: { code: 'hr:manager' } });
  if (hrManagerRole) {
    await prisma.userModuleRole.upsert({
      where: { userId_roleCode: { userId: uHR.id, roleCode: hrManagerRole.code } },
      update: {},
      create: { userId: uHR.id, roleCode: hrManagerRole.code },
    });
    console.log('  ✓ hr@loop.vn gán moduleRole hr:manager');
  }

  // ── 8. LeaveType lấy để tạo đơn ──────────────────────────────────────────
  const annualLeave = await prisma.leaveType.findFirst({ where: { OR: [{ name: { contains: 'năm' } }, { name: { contains: 'Annual' } }] } });
  const sickLeave   = await prisma.leaveType.findFirst({ where: { OR: [{ name: { contains: 'ốm' } }, { name: { contains: 'Sick' } }] } });
  const ltAnnual = annualLeave?.id;
  const ltSick   = sickLeave?.id;
  const ltDefault = (await prisma.leaveType.findFirst())?.id;
  const lt1 = ltAnnual ?? ltDefault;
  const lt2 = ltSick   ?? ltDefault;

  if (!lt1) {
    console.log('  ⚠ Chưa có LeaveType — bỏ qua tạo đơn nghỉ. Chạy seed-leave-types-vi.ts trước.');
  }

  // ── 9. ProcessDefinition leave ─────────────────────────────────────────────
  const leaveDef = await prisma.processDefinition.findFirst({
    where: { key: { contains: 'leave' } },
    select: { id: true, key: true },
  });

  // ── 10. Pending Leave Requests + ProcessUserTask → manager@loop.vn ─────────
  const leaveDefs = [
    { emp: devEmps[0], ltId: lt1, start: '2026-06-10', end: '2026-06-12', days: 3, reason: 'Nghỉ du lịch gia đình' },
    { emp: devEmps[1], ltId: lt2, start: '2026-06-08', end: '2026-06-09', days: 2, reason: 'Sức khoẻ không tốt' },
    { emp: devEmps[2], ltId: lt1, start: '2026-06-15', end: '2026-06-15', days: 1, reason: 'Việc cá nhân' },
    { emp: devEmps[3], ltId: lt1, start: '2026-06-20', end: '2026-06-24', days: 5, reason: 'Nghỉ phép năm Q2' },
    { emp: devEmps[4], ltId: lt2, start: '2026-06-07', end: '2026-06-07', days: 1, reason: 'Ốm nhẹ' },
  ];

  let leaveCount = 0;
  for (const d of leaveDefs) {
    if (!d.ltId) continue;
    const exists = await prisma.leaveRequest.findFirst({
      where: { employeeId: d.emp.id, startDate: new Date(d.start), status: 'PENDING' },
    });
    if (exists) continue;

    // Tạo BPM instance
    let instId: string | undefined;
    if (leaveDef) {
      const inst = await prisma.processInstance.create({
        data: {
          definitionId: leaveDef.id,
          startedBy: d.emp.userId ?? uManager.id,
          status: 'RUNNING',
          variables: { employeeId: d.emp.id, reason: d.reason, days: d.days } as Prisma.InputJsonValue,
          tokenState: { current: 'ApproveTask' } as Prisma.InputJsonValue,
          startedAt: dayjs(d.start).subtract(2, 'day').toDate(),
        },
      });
      instId = inst.id;

      // UserTask gán cho manager@loop.vn
      await prisma.processUserTask.create({
        data: {
          instanceId: inst.id,
          activityId: 'ApproveTask',
          name: `Duyệt đơn nghỉ: ${d.emp.fullName}`,
          assigneeId: uManager.id,
          candidateRoles: ['MANAGER'],
          status: 'PENDING',
          dueDate: dayjs(d.start).subtract(1, 'day').toDate(),
          formData: Prisma.DbNull,
        },
      });
    }

    await prisma.leaveRequest.create({
      data: {
        employeeId: d.emp.id,
        leaveTypeId: d.ltId,
        startDate: new Date(d.start),
        endDate: new Date(d.end),
        days: d.days,
        status: 'PENDING',
        reason: d.reason,
        processInstanceId: instId,
      },
    });
    leaveCount++;
  }
  console.log(`  ✓ ${leaveCount} đơn nghỉ PENDING → manager@loop.vn phê duyệt`);

  // ── 11. Pending OT Requests ────────────────────────────────────────────────
  const otDefs = [
    { emp: devEmps[0], date: '2026-06-03', hours: 3, dayType: 'WEEKDAY', reason: 'Hoàn thiện tính năng sprint' },
    { emp: devEmps[1], date: '2026-06-03', hours: 4, dayType: 'WEEKDAY', reason: 'Fix bug production' },
    { emp: devEmps[2], date: '2026-05-31', hours: 8, dayType: 'WEEKEND', reason: 'Deploy hệ thống cuối tuần' },
  ];

  const otDef = await prisma.processDefinition.findFirst({ where: { key: { contains: 'overtime' } }, select: { id: true } });
  let otCount = 0;
  for (const d of otDefs) {
    const exists = await prisma.overtimeRequest.findFirst({
      where: { employeeId: d.emp.id, date: new Date(d.date), status: 'PENDING' },
    });
    if (exists) continue;

    let otInstId: string | undefined;
    if (otDef) {
      const inst = await prisma.processInstance.create({
        data: {
          definitionId: otDef.id,
          startedBy: d.emp.userId ?? uManager.id,
          status: 'RUNNING',
          variables: { employeeId: d.emp.id, hours: d.hours } as Prisma.InputJsonValue,
          tokenState: { current: 'ApproveOT' } as Prisma.InputJsonValue,
          startedAt: dayjs(d.date).subtract(1, 'day').toDate(),
        },
      });
      otInstId = inst.id;
      await prisma.processUserTask.create({
        data: {
          instanceId: inst.id,
          activityId: 'ApproveOT',
          name: `Duyệt OT: ${d.emp.fullName}`,
          assigneeId: uManager.id,
          candidateRoles: ['MANAGER'],
          status: 'PENDING',
          dueDate: new Date(d.date),
          formData: Prisma.DbNull,
        },
      });
    }

    await prisma.overtimeRequest.create({
      data: {
        employeeId: d.emp.id,
        date: new Date(d.date),
        hours: d.hours,
        dayType: d.dayType as any,
        reason: d.reason,
        status: 'PENDING',
        processInstanceId: otInstId,
      },
    });
    otCount++;
  }
  console.log(`  ✓ ${otCount} đơn OT PENDING → manager@loop.vn phê duyệt`);

  // ── 12. Pending Expense Requests ───────────────────────────────────────────
  const expDef = await prisma.processDefinition.findFirst({ where: { key: { contains: 'expense' } }, select: { id: true } });
  const expDefs = [
    { user: devUsers[0], emp: devEmps[0], title: 'Mua sách kỹ thuật backend',    cat: 'TRAINING',  amount: 500_000,  item: 'Clean Architecture - 500,000đ' },
    { user: devUsers[1], emp: devEmps[1], title: 'Phần mềm thiết kế Figma Pro',  cat: 'SOFTWARE',  amount: 1_200_000, item: 'Figma subscription 1 năm' },
    { user: devUsers[2], emp: devEmps[2], title: 'Thiết bị bàn làm việc đứng',   cat: 'EQUIPMENT', amount: 2_800_000, item: 'Standing desk converter' },
  ];

  let expCount = 0;
  for (const d of expDefs) {
    const exists = await prisma.expense.findFirst({
      where: { submittedById: d.user.id, title: d.title },
    });
    if (exists) continue;

    let expInstId: string | undefined;
    if (expDef) {
      const inst = await prisma.processInstance.create({
        data: {
          definitionId: expDef.id,
          startedBy: d.user.id,
          status: 'RUNNING',
          variables: { amount: d.amount, title: d.title } as Prisma.InputJsonValue,
          tokenState: { current: 'ManagerApprove' } as Prisma.InputJsonValue,
          startedAt: dayjs().subtract(3, 'day').toDate(),
        },
      });
      expInstId = inst.id;
      await prisma.processUserTask.create({
        data: {
          instanceId: inst.id,
          activityId: 'ManagerApprove',
          name: `Duyệt chi phí: ${d.title}`,
          assigneeId: uManager.id,
          candidateRoles: ['MANAGER'],
          status: 'PENDING',
          dueDate: dayjs().add(2, 'day').toDate(),
          formData: Prisma.DbNull,
        },
      });
    }

    await prisma.expense.create({
      data: {
        submittedById: d.user.id,
        employeeId: d.emp.id,
        title: d.title,
        category: d.cat as any,
        totalAmount: d.amount,
        status: 'PENDING',
        processInstanceId: expInstId,
        items: {
          create: [{ description: d.item, amount: d.amount }],
        },
      },
    });
    expCount++;
  }
  console.log(`  ✓ ${expCount} đề nghị thanh toán PENDING → manager@loop.vn phê duyệt`);

  // ── 13. LeaveBalance cho dev team ──────────────────────────────────────────
  if (ltAnnual) {
    const year = new Date().getFullYear();
    for (const [i, emp] of devEmps.entries()) {
      await prisma.leaveBalance.upsert({
        where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: ltAnnual, year } },
        update: {},
        create: { employeeId: emp.id, leaveTypeId: ltAnnual, year, totalDays: 12, usedDays: i * 2 },
      });
    }
    console.log('  ✓ LeaveBalance phép năm cho Dev team');
  }

  // ── Tổng kết ───────────────────────────────────────────────────────────────
  console.log('\n✅ Demo Roles seed hoàn tất!\n');
  console.log('  📋 Tài khoản demo:');
  console.log('  ┌─────────────────────────┬───────────────┬─────────────┬──────────────────────────────┐');
  console.log('  │ Email                   │ Mật khẩu      │ Role        │ Mô tả                        │');
  console.log('  ├─────────────────────────┼───────────────┼─────────────┼──────────────────────────────┤');
  console.log('  │ admin@loop.vn           │ admin         │ ADMIN       │ Super Admin, xem full        │');
  console.log('  │ lanhdao@loop.vn         │ Demo@2024     │ LEADERSHIP  │ Giám đốc điều hành           │');
  console.log('  │ pm@loop.vn              │ admin         │ PM          │ Quản lý dự án                │');
  console.log('  │ hr@loop.vn              │ Demo@2024     │ MEMBER      │ Trưởng phòng Nhân sự         │');
  console.log('  │ manager@loop.vn         │ Demo@2024     │ MEMBER      │ Trưởng phòng, phê duyệt      │');
  console.log('  │ dev1–5@loop.vn          │ Demo@2024     │ MEMBER      │ Nhân viên dev (đã gửi đơn)  │');
  console.log('  └─────────────────────────┴───────────────┴─────────────┴──────────────────────────────┘');
  console.log('\n  🔔 Hộp thư manager@loop.vn:');
  console.log(`     • ${leaveCount} đơn nghỉ phép chờ duyệt`);
  console.log(`     • ${otCount} đơn OT chờ duyệt`);
  console.log(`     • ${expCount} đề nghị thanh toán chờ duyệt`);
}

// ─── Entry point độc lập ──────────────────────────────────────────────────────
if (require.main === module) {
  seedDemoRoles()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { pool.end(); await prisma.$disconnect(); });
}
