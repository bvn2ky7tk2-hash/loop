import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcrypt';
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  SEED_MODULE_ROLES,
} from '../src/permissions/permissions.constants';
import { SCREEN_REGISTRY } from '@loop/shared';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function seedPermissions() {
  // 1. Upsert all permission codes
  for (const perm of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { module: perm.module, action: perm.action, description: perm.description },
      create: perm,
    });
  }
  console.log(`  ✓ ${ALL_PERMISSIONS.length} permission codes upserted`);

  // 2. Upsert role → permission mappings
  for (const [role, codes] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    // Delete stale permissions no longer in the default set for this role
    const existing = await prisma.rolePermission.findMany({ where: { role: role as any } });
    const toDelete = existing.filter(e => !codes.includes(e.permissionCode));
    if (toDelete.length) {
      await prisma.rolePermission.deleteMany({
        where: { role: role as any, permissionCode: { in: toDelete.map(d => d.permissionCode) } },
      });
    }
    // Upsert current set
    for (const code of codes) {
      await prisma.rolePermission.upsert({
        where: { role_permissionCode: { role: role as any, permissionCode: code } },
        update: {},
        create: { role: role as any, permissionCode: code },
      });
    }
  }
  console.log(`  ✓ Role permissions seeded for ADMIN, LEADERSHIP, PM, MEMBER`);

  // 3. Upsert placeholder module roles (ERP-ready, permissions empty until module ships)
  for (const mr of SEED_MODULE_ROLES) {
    await prisma.moduleRole.upsert({
      where: { code: mr.code },
      update: { name: mr.name, domain: mr.domain, description: mr.description, isSystem: mr.isSystem },
      create: mr,
    });
  }
  console.log(`  ✓ ${SEED_MODULE_ROLES.length} placeholder module roles upserted`);
}

export async function seedScreens() {
  for (const s of SCREEN_REGISTRY) {
    await prisma.screen.upsert({
      where: { route: s.route },
      update: {
        module: s.module,
        label: s.label,
        icon: s.icon,
        permCode: s.permCode,
        sortOrder: s.sortOrder,
      },
      create: {
        module: s.module,
        route: s.route,
        label: s.label,
        icon: s.icon,
        permCode: s.permCode,
        sortOrder: s.sortOrder,
      },
    });
  }
  console.log(`  ✓ ${SCREEN_REGISTRY.length} screens synced`);
}

const MODULE_ROLE_PERMISSIONS: Record<string, string[]> = {
  'hr:manager':           ['employees:read','employees:create','employees:update','employees:delete','timesheets:read','timesheets:approve','timelogs:create','timelogs:update','reports:read','reports:export','dashboard:read'],
  'hr:recruiter':         ['employees:read','recruit:read','recruit:manage','timesheets:read','dashboard:read'],
  'finance:accountant':   ['finance:read','finance:manage','reports:read','reports:export','timesheets:read','timesheets:approve','timelogs:create','timelogs:update','dashboard:read'],
  'finance:manager':      ['finance:read','finance:manage','finance:export','reports:read','reports:export','timesheets:read','timesheets:approve','alerts:read','alerts:configure','dashboard:read'],
  'crm:sales':            ['crm:read','crm:manage','projects:read','tasks:read','tasks:create','tasks:update','dashboard:read'],
  'crm:manager':          ['crm:read','crm:manage','projects:read','tasks:read','tasks:create','tasks:update','tasks:approve','reports:read','reports:export','dashboard:read'],
  'operations:asset':     ['projects:read','tasks:read','tasks:create','tasks:update','reports:read','dashboard:read'],
  'operations:contract':  ['projects:read','projects:create','projects:update','tasks:read','tasks:create','tasks:update','reports:read','reports:export','issues:read','issues:create','issues:update','issues:approve','dashboard:read'],
};

async function seedPermissionDemo() {
  // 1. Module role permissions
  for (const [roleCode, codes] of Object.entries(MODULE_ROLE_PERMISSIONS)) {
    for (const permCode of codes) {
      await prisma.moduleRolePermission.upsert({
        where: { roleCode_permissionCode: { roleCode, permissionCode: permCode } },
        update: {},
        create: { roleCode, permissionCode: permCode },
      });
    }
  }
  console.log('  ✓ Module role permissions seeded');

  // 2. User module role assignments
  const admin = await prisma.user.findUnique({ where: { email: 'admin@loop.vn' } });
  const pm    = await prisma.user.findUnique({ where: { email: 'pm@loop.vn' } });

  const assignments: { email: string; roleCode: string }[] = [];
  if (admin) {
    for (const code of Object.keys(MODULE_ROLE_PERMISSIONS)) {
      assignments.push({ email: 'admin@loop.vn', roleCode: code });
    }
  }
  if (pm) {
    assignments.push({ email: 'pm@loop.vn', roleCode: 'finance:accountant' });
    assignments.push({ email: 'pm@loop.vn', roleCode: 'hr:manager' });
  }

  for (const { email, roleCode } of assignments) {
    const user = email === 'admin@loop.vn' ? admin : pm;
    if (!user) continue;
    await prisma.userModuleRole.upsert({
      where: { userId_roleCode: { userId: user.id, roleCode } },
      update: {},
      create: { userId: user.id, roleCode },
    });
  }
  console.log('  ✓ User module roles assigned');

  // 3. User permission overrides
  if (pm) {
    await prisma.userPermission.upsert({
      where: { userId_permissionCode: { userId: pm.id, permissionCode: 'projects:delete' } },
      update: { granted: false },
      create: { userId: pm.id, permissionCode: 'projects:delete', granted: false },
    });
    await prisma.userPermission.upsert({
      where: { userId_permissionCode: { userId: pm.id, permissionCode: 'admin:users' } },
      update: { granted: true },
      create: { userId: pm.id, permissionCode: 'admin:users', granted: true },
    });
  }
  console.log('  ✓ User permission overrides seeded');
}

// ── Demo UserGroups ────────────────────────────────────────────────────────────
const DEMO_GROUPS: {
  name: string;
  description: string;
  perms: string[];
  memberEmails: string[];
}[] = [
  {
    name: 'PM Team',
    description: 'Nhóm quản lý dự án — toàn quyền trên Projects & Tasks',
    perms: [
      'projects:read','projects:create','projects:update',
      'tasks:read','tasks:create','tasks:update','tasks:approve',
      'bugs:read','bugs:create','issues:read','issues:create',
      'dashboard:read',
    ],
    memberEmails: ['pm@loop.vn', 'user.demo@loop.vn'],
  },
  {
    name: 'HR Team',
    description: 'Nhóm nhân sự — quản lý nhân viên & chấm công',
    perms: [
      'employees:read','employees:create','employees:update','employees:delete',
      'timesheets:read','timesheets:approve',
      'reports:read','reports:export',
      'dashboard:read',
    ],
    memberEmails: ['admin@loop.vn'],
  },
  {
    name: 'Finance Team',
    description: 'Nhóm tài chính — báo cáo & duyệt chi',
    perms: [
      'reports:read','reports:export',
      'timesheets:read','timesheets:approve',
      'alerts:read','dashboard:read',
    ],
    memberEmails: ['admin@loop.vn', 'pm@loop.vn'],
  },
];

export async function seedUserGroupsDemo(orgUnitId: string) {
  for (const g of DEMO_GROUPS) {
    const group = await prisma.userGroup.upsert({
      where: { name: g.name },
      update: { description: g.description },
      create: { name: g.name, description: g.description },
    });

    // Permissions
    for (const permCode of g.perms) {
      await prisma.groupPermission.upsert({
        where: { groupId_permCode: { groupId: group.id, permCode } },
        update: {},
        create: { groupId: group.id, permCode },
      });
    }

    // Members
    for (const email of g.memberEmails) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) continue;
      await prisma.groupMembership.upsert({
        where: { userId_groupId: { userId: user.id, groupId: group.id } },
        update: {},
        create: { userId: user.id, groupId: group.id },
      });
    }

    // Org scope — ROOT với includeChildren
    await prisma.groupOrgAccess.upsert({
      where: { groupId_orgUnitId: { groupId: group.id, orgUnitId } },
      update: {},
      create: { groupId: group.id, orgUnitId, includeChildren: true },
    });

    console.log(`  ✓ Group "${g.name}" seeded (${g.perms.length} perms, ${g.memberEmails.length} members)`);
  }
}

async function main() {
  const hash     = await bcrypt.hash('admin', 12);
  const demoHash = await bcrypt.hash('Demo@1234', 12);

  const orgUnit = await prisma.orgUnit.upsert({
    where: { code: 'ROOT' },
    update: {},
    create: { name: 'Công ty', code: 'ROOT' },
  });

  await prisma.user.upsert({
    where: { email: 'admin@loop.vn' },
    update: { passwordHash: hash },
    create: {
      email: 'admin@loop.vn',
      passwordHash: hash,
      name: 'Admin',
      role: 'ADMIN',
      orgUnitId: orgUnit.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'pm@loop.vn' },
    update: { passwordHash: hash },
    create: {
      email: 'pm@loop.vn',
      passwordHash: hash,
      name: 'Project Manager',
      role: 'PM',
      orgUnitId: orgUnit.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'user.demo@loop.vn' },
    update: { passwordHash: demoHash },
    create: {
      email: 'user.demo@loop.vn',
      passwordHash: demoHash,
      name: 'Demo User',
      role: 'MEMBER',
      orgUnitId: orgUnit.id,
    },
  });

  console.log('Seeding permissions...');
  await seedPermissions();
  console.log('Seeding screens registry...');
  await seedScreens();
  console.log('Seeding permission demo data...');
  await seedPermissionDemo();
  console.log('Seeding user groups demo...');
  await seedUserGroupsDemo(orgUnit.id);

  console.log('Seeding BPM process definitions...');
  await seedProcessDefinitions(orgUnit.id);

  console.log('Seeding Phase 2 demo data...');
  await seedPhase2Demo();

  console.log('Seeding Phase 3A CRM demo data...');
  await seedCrmDemo();

  console.log('Seeding Phase 3A Invoice demo data...');
  await seedInvoiceDemo();

  console.log('Seeding Phase 3B Recruitment demo data...');
  await seedRecruitDemo();

  console.log('Seeding Epic 21 Assets demo data...');
  await seedAssetsDemo();

  console.log('Seeding Enriched demo data (Projects, Tasks, TimeLogs, Timesheets, Payroll history)...');
  await seedEnrichedDemo();

  console.log('Seeding Assets enriched demo data...');
  await seedAssetsEnriched();

  console.log('Seeding CRM enriched demo data...');
  await seedCrmEnriched();

  console.log('Seeding Recruitment enriched demo data...');
  await seedRecruitEnriched();

  console.log('Seeding Accounting Chart of Accounts (TT200)...');
  await seedChartOfAccounts();

  console.log('Seeding HR Training & Performance demo data...');
  await seedHrExtDemo();

  console.log('✅ Seed xong: admin@loop.vn / admin | pm@loop.vn / admin | user.demo@loop.vn / Demo@1234');
}

async function seedProcessDefinitions(orgUnitId: string) {
  const taskFormFields = {
    'review-task': [
      {
        name: 'decision',
        label: 'Decision',
        type: 'select',
        required: true,
        options: [
          { label: 'Approve', value: 'APPROVED' },
          { label: 'Reject', value: 'REJECTED' },
        ],
      },
      {
        name: 'rejectedReason',
        label: 'Rejection Reason',
        type: 'textarea',
        required: false,
      },
    ],
  };

  const leaveApprovalXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" id="leave-approval-defs" targetNamespace="http://loop.vn/processes">
  <process id="leave-approval-process" name="Leave Approval" isExecutable="true">
    <startEvent id="start" name="Leave Submitted"><outgoing>to-review</outgoing></startEvent>
    <sequenceFlow id="to-review" sourceRef="start" targetRef="review-task"/>
    <userTask id="review-task" name="Review Leave Request"><incoming>to-review</incoming><outgoing>to-end</outgoing></userTask>
    <sequenceFlow id="to-end" sourceRef="review-task" targetRef="end"/>
    <endEvent id="end" name="Completed"><incoming>to-end</incoming></endEvent>
  </process>
</definitions>`;

  const expenseApprovalXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" id="expense-approval-defs" targetNamespace="http://loop.vn/processes">
  <process id="expense-approval-process" name="Expense Approval" isExecutable="true">
    <startEvent id="start" name="Expense Submitted"><outgoing>to-review</outgoing></startEvent>
    <sequenceFlow id="to-review" sourceRef="start" targetRef="review-task"/>
    <userTask id="review-task" name="Review Expense Request"><incoming>to-review</incoming><outgoing>to-end</outgoing></userTask>
    <sequenceFlow id="to-end" sourceRef="review-task" targetRef="end"/>
    <endEvent id="end" name="Completed"><incoming>to-end</incoming></endEvent>
  </process>
</definitions>`;

  await prisma.processDefinition.upsert({
    where: { key: 'leave-approval' },
    update: {},
    create: {
      name: 'Leave Approval',
      description: 'Quy trình phê duyệt đơn nghỉ phép',
      bpmnXml: leaveApprovalXml,
      key: 'leave-approval',
      orgUnitId,
      version: 1,
      status: 'ACTIVE',
      taskFormFields: taskFormFields as any,
    },
  });
  console.log('  ✓ Process definition leave-approval seeded');

  await prisma.processDefinition.upsert({
    where: { key: 'expense-approval' },
    update: {},
    create: {
      name: 'Expense Approval',
      description: 'Quy trình phê duyệt phiếu chi',
      bpmnXml: expenseApprovalXml,
      key: 'expense-approval',
      orgUnitId,
      version: 1,
      status: 'ACTIVE',
      taskFormFields: taskFormFields as any,
    },
  });
  console.log('  ✓ Process definition expense-approval seeded');

  const onboardingXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" id="onboarding-defs" targetNamespace="http://loop.vn/processes">
  <process id="employee-onboarding-process" name="Employee Onboarding" isExecutable="true">
    <startEvent id="start" name="Employee Joined"><outgoing>to-it</outgoing></startEvent>
    <sequenceFlow id="to-it" sourceRef="start" targetRef="it-setup"/>
    <userTask id="it-setup" name="IT Setup &amp; Account Creation"><incoming>to-it</incoming><outgoing>to-training</outgoing></userTask>
    <sequenceFlow id="to-training" sourceRef="it-setup" targetRef="orientation"/>
    <userTask id="orientation" name="Orientation &amp; Training"><incoming>to-training</incoming><outgoing>to-complete</outgoing></userTask>
    <sequenceFlow id="to-complete" sourceRef="orientation" targetRef="confirm-task"/>
    <userTask id="confirm-task" name="Onboarding Complete Confirmation"><incoming>to-complete</incoming><outgoing>to-end</outgoing></userTask>
    <sequenceFlow id="to-end" sourceRef="confirm-task" targetRef="end"/>
    <endEvent id="end" name="Onboarding Done"><incoming>to-end</incoming></endEvent>
  </process>
</definitions>`;

  const onboardingFormFields = {
    'it-setup': [
      {
        name: 'accountCreated',
        label: 'Account Created',
        type: 'select',
        required: true,
        options: [
          { label: 'Done', value: 'DONE' },
          { label: 'Pending', value: 'PENDING' },
        ],
      },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    'orientation': [
      {
        name: 'completed',
        label: 'Training Completed',
        type: 'select',
        required: true,
        options: [
          { label: 'Yes', value: 'YES' },
          { label: 'No', value: 'NO' },
        ],
      },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    'confirm-task': [
      {
        name: 'status',
        label: 'Final Status',
        type: 'select',
        required: true,
        options: [
          { label: 'Completed', value: 'COMPLETED' },
          { label: 'Needs Follow-up', value: 'FOLLOWUP' },
        ],
      },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  };

  await prisma.processDefinition.upsert({
    where: { key: 'employee-onboarding' },
    update: {},
    create: {
      name: 'Employee Onboarding',
      description: 'Quy trình onboarding nhân viên mới',
      bpmnXml: onboardingXml,
      key: 'employee-onboarding',
      orgUnitId,
      version: 1,
      status: 'ACTIVE',
      taskFormFields: onboardingFormFields as any,
    },
  });
  console.log('  ✓ Process definition employee-onboarding seeded');
}

async function seedPhase2Demo() {
  try {
    // ── 1. OrgUnit hierarchy ────────────────────────────────────────────────
    const orgRoot = await prisma.orgUnit.upsert({
      where: { code: 'ROOT' },
      update: {},
      create: { name: 'Công ty', code: 'ROOT', level: 0 },
    });

    const orgDev = await prisma.orgUnit.upsert({
      where: { code: 'DEV' },
      update: {},
      create: { name: 'Phòng Kỹ thuật', code: 'DEV', parentId: orgRoot.id, level: 1 },
    });

    const orgHrd = await prisma.orgUnit.upsert({
      where: { code: 'HRD' },
      update: {},
      create: { name: 'Phòng Nhân sự', code: 'HRD', parentId: orgRoot.id, level: 1 },
    });

    const orgFin = await prisma.orgUnit.upsert({
      where: { code: 'FIN' },
      update: {},
      create: { name: 'Phòng Tài chính', code: 'FIN', parentId: orgRoot.id, level: 1 },
    });

    console.log('  ✓ OrgUnit hierarchy seeded (ROOT, DEV, HRD, FIN)');

    // ── 2. Thêm Users demo ──────────────────────────────────────────────────
    const demoHash = await (await import('bcrypt')).hash('Demo@1234', 12);

    await prisma.user.upsert({
      where: { email: 'hr@loop.vn' },
      update: {},
      create: { email: 'hr@loop.vn', passwordHash: demoHash, name: 'Lê Thị Hoa', role: 'MEMBER' as any, orgUnitId: orgHrd.id },
    });

    await prisma.user.upsert({
      where: { email: 'finance@loop.vn' },
      update: {},
      create: { email: 'finance@loop.vn', passwordHash: demoHash, name: 'Trần Văn Nam', role: 'MEMBER' as any, orgUnitId: orgFin.id },
    });

    await prisma.user.upsert({
      where: { email: 'dev1@loop.vn' },
      update: {},
      create: { email: 'dev1@loop.vn', passwordHash: demoHash, name: 'Nguyễn Minh Tuấn', role: 'MEMBER' as any, orgUnitId: orgDev.id },
    });

    await prisma.user.upsert({
      where: { email: 'dev2@loop.vn' },
      update: {},
      create: { email: 'dev2@loop.vn', passwordHash: demoHash, name: 'Phạm Thị Lan', role: 'MEMBER' as any, orgUnitId: orgDev.id },
    });

    console.log('  ✓ 4 demo users seeded (hr, finance, dev1, dev2)');

    // ── 3. Fetch all user references ────────────────────────────────────────
    const uAdmin   = await prisma.user.findUnique({ where: { email: 'admin@loop.vn' } });
    const uPm      = await prisma.user.findUnique({ where: { email: 'pm@loop.vn' } });
    const uDemo    = await prisma.user.findUnique({ where: { email: 'user.demo@loop.vn' } });
    const uHr      = await prisma.user.findUnique({ where: { email: 'hr@loop.vn' } });
    const uFinance = await prisma.user.findUnique({ where: { email: 'finance@loop.vn' } });
    const uDev1    = await prisma.user.findUnique({ where: { email: 'dev1@loop.vn' } });
    const uDev2    = await prisma.user.findUnique({ where: { email: 'dev2@loop.vn' } });

    if (!uAdmin || !uPm || !uDemo || !uHr || !uFinance || !uDev1 || !uDev2) {
      throw new Error('Không tìm thấy đủ users để seed Phase 2');
    }

    // ── 4. Employees ────────────────────────────────────────────────────────
    const seniorJoin = new Date('2023-01-01');
    const midJoin    = new Date('2024-06-01');

    const empDefs = [
      { code: 'EMP001', userId: uAdmin.id,   fullName: 'Nguyễn Văn Admin',  level: 'EXPERT' as any, orgUnitId: orgRoot.id, startDate: seniorJoin },
      { code: 'EMP002', userId: uPm.id,      fullName: 'Trần Thị PM',       level: 'SENIOR' as any, orgUnitId: orgDev.id,  startDate: seniorJoin },
      { code: 'EMP003', userId: uDemo.id,    fullName: 'Lê Văn Demo',        level: 'MID'    as any, orgUnitId: orgDev.id,  startDate: midJoin    },
      { code: 'EMP004', userId: uHr.id,      fullName: 'Lê Thị Hoa',         level: 'SENIOR' as any, orgUnitId: orgHrd.id,  startDate: seniorJoin },
      { code: 'EMP005', userId: uFinance.id, fullName: 'Trần Văn Nam',        level: 'MID'    as any, orgUnitId: orgFin.id,  startDate: midJoin    },
      { code: 'EMP006', userId: uDev1.id,    fullName: 'Nguyễn Minh Tuấn',   level: 'SENIOR' as any, orgUnitId: orgDev.id,  startDate: seniorJoin },
      { code: 'EMP007', userId: uDev2.id,    fullName: 'Phạm Thị Lan',        level: 'MID'    as any, orgUnitId: orgDev.id,  startDate: midJoin    },
    ];

    const employees: Record<string, { id: string; startDate: Date; level: string }> = {};

    for (const def of empDefs) {
      const emp = await prisma.employee.upsert({
        where: { code: def.code },
        update: {},
        create: {
          code:      def.code,
          userId:    def.userId,
          fullName:  def.fullName,
          level:     def.level,
          orgUnitId: def.orgUnitId,
          startDate: def.startDate,
        },
      });
      employees[def.code] = { id: emp.id, startDate: def.startDate, level: def.level };
    }

    console.log('  ✓ 7 employees seeded (EMP001–EMP007)');

    // ── 5. EmployeeRates ─────────────────────────────────────────────────────
    const rateMap: Record<string, number> = {
      EMP001: 2_500_000,
      EMP002: 2_000_000,
      EMP003: 1_500_000,
      EMP004: 1_800_000,
      EMP005: 1_600_000,
      EMP006: 1_900_000,
      EMP007: 1_400_000,
    };

    const rateEffective = new Date('2024-01-01');

    for (const [code, rate] of Object.entries(rateMap)) {
      const emp = employees[code];
      await prisma.employeeRate.upsert({
        where: { employeeId_effectiveDate: { employeeId: emp.id, effectiveDate: rateEffective } },
        update: {},
        create: { employeeId: emp.id, ratePerDay: rate, effectiveDate: rateEffective },
      });
    }

    console.log('  ✓ Employee rates seeded');

    // ── 6. LeaveTypes ────────────────────────────────────────────────────────
    const leaveTypeDefs = [
      { name: 'Annual Leave',    maxDaysPerYear: 12,  isPaid: true,  color: '#2563EB', processDefinitionKey: 'leave-approval' },
      { name: 'Sick Leave',      maxDaysPerYear: 6,   isPaid: true,  color: '#DC2626', processDefinitionKey: 'leave-approval' },
      { name: 'Unpaid Leave',    maxDaysPerYear: 5,   isPaid: false, color: '#6B7280', processDefinitionKey: null },
      { name: 'Maternity Leave', maxDaysPerYear: 180, isPaid: true,  color: '#DB2777', processDefinitionKey: null },
      { name: 'Paternity Leave', maxDaysPerYear: 5,   isPaid: true,  color: '#7C3AED', processDefinitionKey: null },
    ];

    const leaveTypes: Record<string, string> = {};

    for (const lt of leaveTypeDefs) {
      const created = await prisma.leaveType.upsert({
        where: { name: lt.name },
        update: {},
        create: {
          name:                 lt.name,
          maxDaysPerYear:       lt.maxDaysPerYear,
          isPaid:               lt.isPaid,
          color:                lt.color,
          processDefinitionKey: lt.processDefinitionKey ?? undefined,
        },
      });
      leaveTypes[lt.name] = created.id;
    }

    console.log('  ✓ 5 leave types seeded');

    // ── 7. LeaveBalances ─────────────────────────────────────────────────────
    const balanceYear = 2026;
    const paidLeaveNames = ['Annual Leave', 'Sick Leave'];

    // usedDays patterns: alternate 2/3 for Annual, 0/1 for Sick
    const annualUsed = [2, 3, 2, 3, 2, 3, 2];
    const sickUsed   = [0, 1, 0, 1, 0, 1, 0];
    const empCodes   = ['EMP001','EMP002','EMP003','EMP004','EMP005','EMP006','EMP007'];

    for (let i = 0; i < empCodes.length; i++) {
      const emp = employees[empCodes[i]];

      // Annual Leave
      const annualLtId = leaveTypes['Annual Leave'];
      await prisma.leaveBalance.upsert({
        where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: annualLtId, year: balanceYear } },
        update: {},
        create: { employeeId: emp.id, leaveTypeId: annualLtId, year: balanceYear, totalDays: 12, usedDays: annualUsed[i] },
      });

      // Sick Leave
      const sickLtId = leaveTypes['Sick Leave'];
      await prisma.leaveBalance.upsert({
        where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: sickLtId, year: balanceYear } },
        update: {},
        create: { employeeId: emp.id, leaveTypeId: sickLtId, year: balanceYear, totalDays: 6, usedDays: sickUsed[i] },
      });
    }

    console.log('  ✓ Leave balances seeded (7 employees × 2 leave types)');

    // ── 8. LeaveRequests ─────────────────────────────────────────────────────
    // approvedAt = createdAt + 1 day (approximately)
    const approvedAt = new Date();
    approvedAt.setDate(approvedAt.getDate() - 1);

    const leaveRequestDefs = [
      {
        empCode: 'EMP003', ltName: 'Annual Leave',
        startDate: '2026-06-02', endDate: '2026-06-06', days: 5,
        status: 'PENDING', reason: 'Family trip',
      },
      {
        empCode: 'EMP006', ltName: 'Annual Leave',
        startDate: '2026-06-09', endDate: '2026-06-13', days: 5,
        status: 'PENDING', reason: 'Personal matters',
      },
      {
        empCode: 'EMP007', ltName: 'Sick Leave',
        startDate: '2026-05-20', endDate: '2026-05-21', days: 2,
        status: 'APPROVED', reason: 'Medical appointment',
      },
      {
        empCode: 'EMP004', ltName: 'Annual Leave',
        startDate: '2026-05-05', endDate: '2026-05-09', days: 5,
        status: 'APPROVED', reason: 'Vacation',
      },
      {
        empCode: 'EMP005', ltName: 'Sick Leave',
        startDate: '2026-05-12', endDate: '2026-05-12', days: 1,
        status: 'APPROVED', reason: 'Fever',
      },
      {
        empCode: 'EMP003', ltName: 'Unpaid Leave',
        startDate: '2026-04-28', endDate: '2026-04-30', days: 3,
        status: 'REJECTED', reason: undefined,
      },
      {
        empCode: 'EMP002', ltName: 'Annual Leave',
        startDate: '2026-07-01', endDate: '2026-07-04', days: 4,
        status: 'PENDING', reason: 'Conference',
      },
      {
        empCode: 'EMP006', ltName: 'Sick Leave',
        startDate: '2026-05-26', endDate: '2026-05-27', days: 2,
        status: 'APPROVED', reason: undefined,
      },
    ];

    for (const lr of leaveRequestDefs) {
      const emp       = employees[lr.empCode];
      const ltId      = leaveTypes[lr.ltName];
      const startDate = new Date(lr.startDate);
      const endDate   = new Date(lr.endDate);

      const existing = await prisma.leaveRequest.findFirst({
        where: { employeeId: emp.id, leaveTypeId: ltId, startDate, endDate },
      });
      if (existing) continue;

      await prisma.leaveRequest.create({
        data: {
          employeeId:   emp.id,
          leaveTypeId:  ltId,
          startDate,
          endDate,
          days:         lr.days,
          reason:       lr.reason ?? null,
          status:       lr.status as any,
          approvedById: lr.status === 'APPROVED' ? uAdmin.id : null,
          approvedAt:   lr.status === 'APPROVED' ? approvedAt : null,
        },
      });
    }

    console.log('  ✓ 8 leave requests seeded');

    // ── 9. PayrollPeriod + PayrollRecords ────────────────────────────────────
    let payrollPeriod = await prisma.payrollPeriod.findFirst({
      where: { name: 'Tháng 5/2026' },
    });

    if (!payrollPeriod) {
      payrollPeriod = await prisma.payrollPeriod.create({
        data: {
          name:      'Tháng 5/2026',
          startDate: new Date('2026-05-01'),
          endDate:   new Date('2026-05-31'),
          status:    'PROCESSING' as any,
        },
      });
    }

    const payrollDefs = [
      { empCode: 'EMP001', workDays: 22, leaveDays: 1, overtimeHours: 8  },
      { empCode: 'EMP002', workDays: 22, leaveDays: 2, overtimeHours: 4  },
      { empCode: 'EMP003', workDays: 21, leaveDays: 1, overtimeHours: 8  },
      { empCode: 'EMP004', workDays: 22, leaveDays: 2, overtimeHours: 4  },
      { empCode: 'EMP005', workDays: 21, leaveDays: 1, overtimeHours: 4  },
      { empCode: 'EMP006', workDays: 22, leaveDays: 1, overtimeHours: 8  },
      { empCode: 'EMP007', workDays: 21, leaveDays: 2, overtimeHours: 4  },
    ];

    for (const pr of payrollDefs) {
      const emp      = employees[pr.empCode];
      const rate     = rateMap[pr.empCode];
      const base     = pr.workDays * rate;

      const existing = await prisma.payrollRecord.findFirst({
        where: { periodId: payrollPeriod.id, employeeId: emp.id },
      });
      if (existing) continue;

      await prisma.payrollRecord.create({
        data: {
          periodId:     payrollPeriod.id,
          employeeId:   emp.id,
          workDays:     pr.workDays,
          leaveDays:    pr.leaveDays,
          overtimeHours: pr.overtimeHours,
          baseSalary:   base,
          bonus:        0,
          deductions:   0,
          netSalary:    base,
        },
      });
    }

    console.log('  ✓ Payroll period "Tháng 5/2026" + 7 payroll records seeded');

    // ── 10. Contracts ────────────────────────────────────────────────────────
    for (const [code, emp] of Object.entries(employees)) {
      const existing = await prisma.contract.findFirst({
        where: { employeeId: emp.id, status: 'ACTIVE' as any },
      });
      if (existing) continue;

      const isMid      = emp.level === 'MID';
      const startDate  = emp.startDate;
      const endDate    = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + (isMid ? 2 : 1));

      const rate           = rateMap[code];
      const salaryMonthly  = rate * 26;

      await prisma.contract.create({
        data: {
          employeeId:    emp.id,
          type:          'FULL_TIME' as any,
          status:        'ACTIVE' as any,
          startDate,
          endDate,
          salaryMonthly,
        },
      });
    }

    console.log('  ✓ 7 contracts seeded (1 ACTIVE per employee)');

    // ── 11. Expenses + ExpenseItems ──────────────────────────────────────────
    const nowMinus7 = new Date();
    nowMinus7.setDate(nowMinus7.getDate() - 7);

    const expenseDefs: {
      empCode:    string;
      userId:     string;
      title:      string;
      category:   string;
      totalAmount: number;
      status:     string;
      items:      { description: string; amount: number }[];
      rejectedReason?: string;
    }[] = [
      {
        empCode: 'EMP003', userId: uDemo.id,
        title: 'Team lunch Q2', category: 'MEALS', totalAmount: 1_500_000, status: 'APPROVED',
        items: [{ description: 'Team lunch', amount: 1_500_000 }],
      },
      {
        empCode: 'EMP002', userId: uPm.id,
        title: 'Business trip to HN', category: 'TRAVEL', totalAmount: 4_200_000, status: 'APPROVED',
        items: [
          { description: 'Flight ticket', amount: 2_400_000 },
          { description: 'Hotel 2 nights', amount: 1_800_000 },
        ],
      },
      {
        empCode: 'EMP006', userId: uDev1.id,
        title: 'MacBook accessories', category: 'EQUIPMENT', totalAmount: 2_800_000, status: 'PENDING',
        items: [
          { description: 'Mechanical keyboard', amount: 1_200_000 },
          { description: 'Wireless mouse',      amount: 800_000   },
          { description: 'USB-C hub',           amount: 800_000   },
        ],
      },
      {
        empCode: 'EMP007', userId: uDev2.id,
        title: 'Figma subscription', category: 'SOFTWARE', totalAmount: 1_200_000, status: 'PENDING',
        items: [{ description: 'Figma Pro annual', amount: 1_200_000 }],
      },
      {
        empCode: 'EMP004', userId: uHr.id,
        title: 'HR training course', category: 'TRAINING', totalAmount: 3_500_000, status: 'PENDING',
        items: [{ description: 'Course fee', amount: 3_500_000 }],
      },
      {
        empCode: 'EMP005', userId: uFinance.id,
        title: 'Department dinner', category: 'MEALS', totalAmount: 2_100_000, status: 'REJECTED',
        items: [{ description: 'Team dinner', amount: 2_100_000 }],
        rejectedReason: 'Exceeds budget limit for this period',
      },
      {
        empCode: 'EMP001', userId: uAdmin.id,
        title: 'Conference ticket', category: 'TRAINING', totalAmount: 5_000_000, status: 'APPROVED',
        items: [{ description: 'Conference registration', amount: 5_000_000 }],
      },
      {
        empCode: 'EMP003', userId: uDemo.id,
        title: 'Office supplies', category: 'OTHER', totalAmount: 450_000, status: 'PENDING',
        items: [
          { description: 'Notebooks', amount: 150_000 },
          { description: 'Pens',      amount: 300_000 },
        ],
      },
    ];

    for (const exp of expenseDefs) {
      const existing = await prisma.expense.findFirst({
        where: { submittedById: exp.userId, title: exp.title },
      });
      if (existing) continue;

      await prisma.expense.create({
        data: {
          submittedById:  exp.userId,
          title:          exp.title,
          category:       exp.category as any,
          totalAmount:    exp.totalAmount,
          status:         exp.status as any,
          approvedById:   exp.status === 'APPROVED' ? uAdmin.id : null,
          approvedAt:     exp.status === 'APPROVED' ? nowMinus7 : null,
          rejectedReason: exp.rejectedReason ?? null,
          items: {
            create: exp.items,
          },
        },
      });
    }

    console.log('  ✓ 8 expenses + expense items seeded');

  } catch (err) {
    console.error('  ✗ seedPhase2Demo error:', err);
  }
}

async function seedCrmDemo() {
  try {
    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: 'admin@loop.vn' } });
    const pmUser    = await prisma.user.findFirstOrThrow({ where: { email: 'pm@loop.vn' } });

    // ── Customers ──────────────────────────────────────────────────────────
    const customers = [
      { code: 'VNG',  name: 'VNG Corporation',   industry: 'Technology',    website: 'https://vng.com.vn',    taxCode: '0300416693' },
      { code: 'FPT',  name: 'FPT Software',       industry: 'IT Services',   website: 'https://www.fpt-software.com', taxCode: '0101248141' },
      { code: 'VTEL', name: 'Viettel Digital',    industry: 'Telecom / IT',  website: 'https://digital.viettel.vn',  taxCode: '0100109106' },
    ];
    const custMap: Record<string, string> = {};
    for (const c of customers) {
      const existing = await prisma.customer.findUnique({ where: { code: c.code } });
      const cust = existing
        ? await prisma.customer.update({ where: { code: c.code }, data: c })
        : await prisma.customer.create({ data: c });
      custMap[c.code] = cust.id;
    }
    console.log('  ✓ 3 customers seeded');

    // ── Contacts ───────────────────────────────────────────────────────────
    const contacts = [
      { name: 'Nguyen Van A', email: 'vana@vng.com.vn',  phone: '0901234501', title: 'CTO',           customerId: custMap['VNG'] },
      { name: 'Le Thi B',     email: 'thib@vng.com.vn',  phone: '0901234502', title: 'Procurement',   customerId: custMap['VNG'] },
      { name: 'Tran Van C',   email: 'vanc@fpt.com.vn',  phone: '0901234503', title: 'Head of IT',    customerId: custMap['FPT'] },
      { name: 'Pham Thi D',   email: 'thid@fpt.com.vn',  phone: '0901234504', title: 'Project Lead',  customerId: custMap['FPT'] },
      { name: 'Hoang Van E',  email: 'vane@viettel.vn',  phone: '0901234505', title: 'CIO',           customerId: custMap['VTEL'] },
      { name: 'Nguyen Thi F', email: 'thif@viettel.vn',  phone: '0901234506', title: 'IT Director',   customerId: custMap['VTEL'] },
    ];
    const contactMap: Record<string, string> = {};
    for (const ct of contacts) {
      const existing = await prisma.contact.findFirst({ where: { email: ct.email } });
      const saved = existing
        ? await prisma.contact.update({ where: { id: existing.id }, data: ct })
        : await prisma.contact.create({ data: ct });
      contactMap[ct.email] = saved.id;
    }
    console.log('  ✓ 6 contacts seeded');

    // ── Leads ──────────────────────────────────────────────────────────────
    const leadsData = [
      { title: 'Website Redesign — VNG',      source: 'REFERRAL'     as const, status: 'NEW'       as const, estimatedValue: 150_000_000, assigneeId: pmUser.id,    contactId: contactMap['vana@vng.com.vn'] },
      { title: 'ERP Integration — FPT',       source: 'EVENT'        as const, status: 'CONTACTED'  as const, estimatedValue: 500_000_000, assigneeId: adminUser.id, contactId: contactMap['vanc@fpt.com.vn'] },
      { title: 'Mobile App — VNG Gaming',     source: 'COLD_OUTREACH'as const, status: 'QUALIFIED'  as const, estimatedValue: 300_000_000, assigneeId: pmUser.id,    contactId: contactMap['thib@vng.com.vn'] },
      { title: 'Cloud Migration — Viettel',   source: 'WEBSITE'      as const, status: 'NEW'        as const, estimatedValue: 800_000_000, assigneeId: adminUser.id, contactId: contactMap['vane@viettel.vn'] },
      { title: 'DevOps Consulting — FPT',     source: 'REFERRAL'     as const, status: 'LOST'       as const, estimatedValue:  80_000_000, assigneeId: pmUser.id,    contactId: contactMap['thid@fpt.com.vn'] },
    ];
    for (const l of leadsData) {
      const exists = await prisma.lead.findFirst({ where: { title: l.title } });
      if (!exists) await prisma.lead.create({ data: l });
    }
    console.log('  ✓ 5 leads seeded');

    // ── Deals ──────────────────────────────────────────────────────────────
    const dealsData = [
      { code: 'DEAL-001', title: 'VNG Portal Upgrade',       customerId: custMap['VNG'],  stage: 'QUALIFICATION' as const, value: 250_000_000, probability: 30, assigneeId: pmUser.id },
      { code: 'DEAL-002', title: 'FPT ERP Phase 1',          customerId: custMap['FPT'],  stage: 'PROPOSAL'      as const, value: 500_000_000, probability: 60, assigneeId: adminUser.id },
      { code: 'DEAL-003', title: 'Viettel Data Platform',    customerId: custMap['VTEL'], stage: 'NEGOTIATION'   as const, value: 800_000_000, probability: 80, assigneeId: pmUser.id },
      { code: 'DEAL-004', title: 'FPT Mobile App Suite',     customerId: custMap['FPT'],  stage: 'WON'           as const, value: 320_000_000, probability: 100, assigneeId: adminUser.id, wonAt: new Date() },
    ];
    for (const d of dealsData) {
      const exists = await prisma.deal.findUnique({ where: { code: d.code } });
      if (!exists) await prisma.deal.create({ data: d });
    }
    console.log('  ✓ 4 deals seeded (1 WON)');

  } catch (err) {
    console.error('  ✗ seedCrmDemo error:', err);
  }
}

async function seedInvoiceDemo() {
  try {
    // Lấy admin user để làm createdById
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
    if (!adminUser) { console.log('  ⚠ Không tìm thấy admin user, bỏ qua seed Invoice'); return; }

    // Lấy customers đã seed
    const customers = await prisma.customer.findMany({ select: { id: true, name: true } });
    const c0 = customers[0];
    const c1 = customers[1];

    // Lấy project đầu tiên nếu có
    const project = await prisma.project.findFirst({ select: { id: true } });

    const now = new Date();
    const dueNext30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);
    const duePast15 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 15);
    const issueLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);

    const invoiceDefs = [
      {
        code:       'INV-DEMO-0001',
        type:       'SALES'    as const,
        customerId: c0?.id,
        projectId:  project?.id,
        issueDate:  new Date(now.getFullYear(), now.getMonth(), 1),
        dueDate:    dueNext30,
        status:     'DRAFT'    as const,
        currency:   'VND',
        notes:      'Hóa đơn triển khai giai đoạn 1',
        items: [
          { description: 'Phát triển phần mềm - tháng 1', quantity: 1, unitPrice: 50_000_000, taxRate: 10 },
          { description: 'Hosting & DevOps setup',         quantity: 1, unitPrice:  5_000_000, taxRate: 10 },
        ],
      },
      {
        code:       'INV-DEMO-0002',
        type:       'SALES'    as const,
        customerId: c1?.id,
        issueDate:  new Date(now.getFullYear(), now.getMonth(), 5),
        dueDate:    dueNext30,
        status:     'SENT'     as const,
        currency:   'VND',
        notes:      'Dịch vụ tư vấn Q2',
        items: [
          { description: 'Tư vấn triển khai ERP - 10 ngày', quantity: 10, unitPrice: 8_000_000, taxRate: 10 },
        ],
      },
      {
        code:       'INV-DEMO-0003',
        type:       'SALES'    as const,
        customerId: c0?.id,
        issueDate:  issueLastMonth,
        dueDate:    duePast15,
        status:     'OVERDUE'  as const,
        currency:   'VND',
        notes:      'Hóa đơn quá hạn tháng trước',
        items: [
          { description: 'Maintenance phần mềm tháng 4', quantity: 1, unitPrice: 15_000_000, taxRate: 10 },
        ],
      },
      {
        code:       'INV-DEMO-0004',
        type:       'SALES'    as const,
        customerId: c1?.id,
        issueDate:  issueLastMonth,
        dueDate:    new Date(now.getFullYear(), now.getMonth() - 1, 28),
        status:     'PAID'     as const,
        currency:   'VND',
        notes:      'Đã thanh toán',
        items: [
          { description: 'Phát triển module HR', quantity: 1, unitPrice: 80_000_000, taxRate: 10 },
          { description: 'Training 2 ngày',      quantity: 2, unitPrice:  3_000_000, taxRate:  0 },
        ],
      },
      {
        code:       'INV-DEMO-0005',
        type:       'PURCHASE' as const,
        issueDate:  new Date(now.getFullYear(), now.getMonth(), 10),
        dueDate:    dueNext30,
        status:     'DRAFT'    as const,
        currency:   'VND',
        notes:      'Mua license phần mềm',
        items: [
          { description: 'GitHub Enterprise - 1 năm', quantity: 1, unitPrice: 25_000_000, taxRate: 10 },
          { description: 'Jira license 20 users',     quantity: 1, unitPrice:  8_000_000, taxRate: 10 },
        ],
      },
    ];

    for (const def of invoiceDefs) {
      const existing = await prisma.invoice.findUnique({ where: { code: def.code } });
      if (existing) continue;

      const subtotal  = def.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const taxAmount = def.items.reduce((s, i) => s + i.quantity * i.unitPrice * (i.taxRate / 100), 0);

      await prisma.invoice.create({
        data: {
          code:        def.code,
          type:        def.type,
          customerId:  def.customerId ?? null,
          projectId:   (def as { projectId?: string }).projectId ?? null,
          issueDate:   def.issueDate,
          dueDate:     def.dueDate,
          status:      def.status,
          currency:    def.currency,
          notes:       def.notes,
          subtotal,
          taxAmount,
          totalAmount: subtotal + taxAmount,
          createdById: adminUser.id,
          ...(def.status === 'PAID' ? { paidAt: new Date() } : {}),
          items: {
            create: def.items.map(i => ({
              description: i.description,
              quantity:    i.quantity,
              unitPrice:   i.unitPrice,
              amount:      i.quantity * i.unitPrice,
              taxRate:     i.taxRate,
            })),
          },
        },
      });
    }

    console.log(`  ✓ ${invoiceDefs.length} invoices seeded (DRAFT/SENT/OVERDUE/PAID/PURCHASE)`);
  } catch (err) {
    console.error('  ✗ seedInvoiceDemo error:', err);
  }
}

async function seedRecruitDemo() {
  try {
    // Lấy org unit đầu tiên làm mặc định
    const orgUnit = await prisma.orgUnit.findFirst({ select: { id: true } });
    if (!orgUnit) { console.log('  ⚠ Không tìm thấy OrgUnit, bỏ qua seed Recruit'); return; }

    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });

    // Job Openings
    const jobDefs = [
      { code: 'JOB-2026-001', title: 'Senior Frontend Engineer', level: 'SENIOR' as const, headcount: 2, status: 'OPEN' as const, requirements: 'React, TypeScript, 3+ years experience', salaryFrom: 40_000_000, salaryTo: 60_000_000 },
      { code: 'JOB-2026-002', title: 'Backend NestJS Developer',  level: 'MID'    as const, headcount: 3, status: 'OPEN' as const, requirements: 'NestJS, PostgreSQL, Docker', salaryFrom: 25_000_000, salaryTo: 40_000_000 },
      { code: 'JOB-2026-003', title: 'DevOps Engineer',           level: 'SENIOR' as const, headcount: 1, status: 'ON_HOLD' as const, requirements: 'Kubernetes, CI/CD, AWS', salaryFrom: 45_000_000, salaryTo: 70_000_000 },
      { code: 'JOB-2026-004', title: 'Junior QA Engineer',        level: 'JUNIOR' as const, headcount: 2, status: 'OPEN' as const, requirements: 'Manual testing, Selenium basics', salaryFrom: 12_000_000, salaryTo: 18_000_000 },
    ];

    const jobs: { id: string; code: string }[] = [];
    for (const def of jobDefs) {
      const existing = await prisma.jobOpening.findUnique({ where: { code: def.code } });
      if (existing) { jobs.push({ id: existing.id, code: existing.code }); continue; }

      const job = await prisma.jobOpening.create({
        data: {
          code:         def.code,
          title:        def.title,
          orgUnitId:    orgUnit.id,
          level:        def.level,
          headcount:    def.headcount,
          status:       def.status,
          requirements: def.requirements,
          salaryFrom:   def.salaryFrom,
          salaryTo:     def.salaryTo,
        },
        select: { id: true, code: true },
      });
      jobs.push(job);
    }
    console.log(`  ✓ ${jobDefs.length} job openings seeded`);

    // Candidates — 2 per job, spread across stages
    const candidateDefs = [
      // JOB-2026-001 — Senior Frontend
      { jobCode: 'JOB-2026-001', name: 'Nguyễn Văn An',    email: 'an.nguyen@gmail.com',    phone: '0901111001', stage: 'INTERVIEW' as const, source: 'REFERRAL' as const,    expectedSalary: 50_000_000 },
      { jobCode: 'JOB-2026-001', name: 'Trần Thị Bình',    email: 'binh.tran@gmail.com',     phone: '0901111002', stage: 'OFFER'     as const, source: 'WEBSITE'  as const,    expectedSalary: 55_000_000 },
      // JOB-2026-002 — Backend NestJS
      { jobCode: 'JOB-2026-002', name: 'Lê Quang Cường',   email: 'cuong.le@gmail.com',      phone: '0901111003', stage: 'SCREENING' as const, source: 'SOCIAL'   as const,    expectedSalary: 32_000_000 },
      { jobCode: 'JOB-2026-002', name: 'Phạm Thị Dung',    email: 'dung.pham@gmail.com',     phone: '0901111004', stage: 'APPLIED'   as const, source: 'WEBSITE'  as const,    expectedSalary: 30_000_000 },
      { jobCode: 'JOB-2026-002', name: 'Hoàng Minh Đức',   email: 'duc.hoang@gmail.com',     phone: '0901111005', stage: 'REJECTED'  as const, source: 'REFERRAL' as const,    expectedSalary: 35_000_000 },
      // JOB-2026-003 — DevOps
      { jobCode: 'JOB-2026-003', name: 'Vũ Thị Giang',     email: 'giang.vu@gmail.com',      phone: '0901111006', stage: 'INTERVIEW' as const, source: 'EVENT'    as const,    expectedSalary: 60_000_000 },
      // JOB-2026-004 — Junior QA
      { jobCode: 'JOB-2026-004', name: 'Đỗ Hải Hà',        email: 'ha.do@gmail.com',         phone: '0901111007', stage: 'APPLIED'   as const, source: 'WEBSITE'  as const,    expectedSalary: 14_000_000 },
      { jobCode: 'JOB-2026-004', name: 'Ngô Thị Hương',    email: 'huong.ngo@gmail.com',     phone: '0901111008', stage: 'SCREENING' as const, source: 'REFERRAL' as const,    expectedSalary: 15_000_000 },
    ];

    for (const def of candidateDefs) {
      const existing = await prisma.candidate.findFirst({ where: { email: def.email } });
      if (existing) continue;

      const job = jobs.find(j => j.code === def.jobCode);
      if (!job) continue;

      await prisma.candidate.create({
        data: {
          name:           def.name,
          email:          def.email,
          phone:          def.phone,
          jobOpeningId:   job.id,
          stage:          def.stage,
          source:         def.source,
          expectedSalary: def.expectedSalary,
          assigneeId:     adminUser?.id,
        },
      });
    }
    console.log(`  ✓ ${candidateDefs.length} candidates seeded`);

    // Interviews cho candidates ở INTERVIEW stage
    const interviewCandidates = await prisma.candidate.findMany({
      where: { stage: 'INTERVIEW', email: { in: candidateDefs.filter(c => c.stage === 'INTERVIEW').map(c => c.email) } },
      select: { id: true, name: true },
    });

    for (const candidate of interviewCandidates) {
      const existing = await prisma.interview.findFirst({ where: { candidateId: candidate.id } });
      if (existing) continue;

      const future = new Date();
      future.setDate(future.getDate() + 3);

      await prisma.interview.create({
        data: {
          candidateId:  candidate.id,
          type:         'TECHNICAL',
          scheduledAt:  future,
          location:     'Meeting Room A',
          interviewers: adminUser ? [adminUser.id] : [],
          result:       'PENDING',
        },
      });
    }
    console.log(`  ✓ ${interviewCandidates.length} interviews seeded`);

  } catch (err) {
    console.error('  ✗ seedRecruitDemo error:', err);
  }
}

// ─── Epic 21: Asset Management Demo ──────────────────────────────────────────

async function seedAssetsDemo() {
  try {
    // Idempotent check
    const existing = await prisma.asset.findFirst({ where: { code: 'LAPTOP-001' } });
    if (existing) {
      console.log('  ✓ Assets demo already seeded, skipping');
      return;
    }

    // Lấy orgUnit ROOT
    const orgUnit = await prisma.orgUnit.findUnique({ where: { code: 'ROOT' } });

    // Lấy 3 employees đầu tiên để assign
    const employees = await prisma.employee.findMany({ take: 3, orderBy: { createdAt: 'asc' } });

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // ── 10 assets ────────────────────────────────────────────────────────────
    const assetDefs = [
      { code: 'LAPTOP-001', name: 'MacBook Pro 14" M3',  category: 'LAPTOP',     brand: 'Apple',  model: 'MacBook Pro 14 M3',  serialNumber: 'C02XY1234',  purchasePrice: 45000000, depreciationYears: 3 },
      { code: 'LAPTOP-002', name: 'ThinkPad X1 Carbon',  category: 'LAPTOP',     brand: 'Lenovo', model: 'X1 Carbon Gen 11',   serialNumber: 'LNV8876543', purchasePrice: 32000000, depreciationYears: 3 },
      { code: 'LAPTOP-003', name: 'Dell XPS 15',          category: 'LAPTOP',     brand: 'Dell',   model: 'XPS 15 9530',        serialNumber: 'DLL5432190', purchasePrice: 38000000, depreciationYears: 3 },
      { code: 'PHONE-001',  name: 'iPhone 15 Pro',        category: 'PHONE',      brand: 'Apple',  model: 'iPhone 15 Pro',      serialNumber: 'IP15P00111', purchasePrice: 28000000, depreciationYears: 2 },
      { code: 'PHONE-002',  name: 'Samsung Galaxy S24',   category: 'PHONE',      brand: 'Samsung',model: 'Galaxy S24',         serialNumber: 'SAM2400222', purchasePrice: 22000000, depreciationYears: 2 },
      { code: 'DESKTOP-001',name: 'iMac 24" M3',          category: 'DESKTOP',    brand: 'Apple',  model: 'iMac 24 M3',         serialNumber: 'IMAC240001', purchasePrice: 40000000, depreciationYears: 4 },
      { code: 'DESKTOP-002',name: 'Dell OptiPlex 7000',   category: 'DESKTOP',    brand: 'Dell',   model: 'OptiPlex 7000',      serialNumber: 'DLL7000002', purchasePrice: 18000000, depreciationYears: 4 },
      { code: 'SERVER-001', name: 'Dell PowerEdge R750',  category: 'SERVER',     brand: 'Dell',   model: 'PowerEdge R750',     serialNumber: 'SRVR75001',  purchasePrice: 120000000, depreciationYears: 5 },
      { code: 'PERIPH-001', name: 'Bộ màn hình Dell 27"', category: 'PERIPHERAL', brand: 'Dell',   model: 'UltraSharp U2722D',  serialNumber: 'MON2722001', purchasePrice: 12000000, depreciationYears: 4 },
      { code: 'SW-001',     name: 'Microsoft Office 365', category: 'SOFTWARE',   brand: 'Microsoft', model: 'Office 365 Business', serialNumber: undefined, purchasePrice: 5000000, depreciationYears: 1 },
    ];

    const createdAssets: Record<string, any> = {};
    for (const def of assetDefs) {
      const asset = await prisma.asset.create({
        data: {
          code:              def.code,
          name:              def.name,
          category:          def.category as any,
          brand:             def.brand,
          model:             def.model,
          serialNumber:      def.serialNumber ?? undefined,
          orgUnitId:         orgUnit?.id,
          status:            'AVAILABLE',
          purchaseDate:      new Date('2024-01-15'),
          purchasePrice:     def.purchasePrice,
          depreciationYears: def.depreciationYears,
        },
      });
      createdAssets[def.code] = asset;
    }
    console.log(`  ✓ 10 assets created`);

    // ── Assignments ──────────────────────────────────────────────────────────
    // LAPTOP-001, LAPTOP-002, PHONE-001: active assignments
    // LAPTOP-003, PHONE-002: returned assignments (7 ngày trước)

    const activeAssignments = [
      { assetCode: 'LAPTOP-001', empIdx: 0 },
      { assetCode: 'LAPTOP-002', empIdx: 1 },
      { assetCode: 'PHONE-001',  empIdx: 2 },
    ];

    const returnedAssignments = [
      { assetCode: 'LAPTOP-003', empIdx: 0 },
      { assetCode: 'PHONE-002',  empIdx: 1 },
    ];

    for (const a of activeAssignments) {
      if (!employees[a.empIdx]) continue;
      const asset = createdAssets[a.assetCode];
      await prisma.assetAssignment.create({
        data: {
          assetId:    asset.id,
          employeeId: employees[a.empIdx].id,
          assignedAt: new Date(),
          notes:      'Cấp phát thiết bị làm việc',
        },
      });
      await prisma.asset.update({ where: { id: asset.id }, data: { status: 'ASSIGNED' } });
    }

    for (const a of returnedAssignments) {
      if (!employees[a.empIdx]) continue;
      const asset = createdAssets[a.assetCode];
      await prisma.assetAssignment.create({
        data: {
          assetId:    asset.id,
          employeeId: employees[a.empIdx].id,
          assignedAt: sevenDaysAgo,
          returnedAt: now,
          notes:      'Thiết bị đã được trả lại',
        },
      });
      // Status vẫn AVAILABLE (đã returned)
    }
    console.log(`  ✓ 5 assignments seeded (3 active, 2 returned)`);

    // ── Maintenance logs ─────────────────────────────────────────────────────
    await prisma.assetMaintenance.create({
      data: {
        assetId:     createdAssets['SERVER-001'].id,
        type:        'repair',
        performedAt: new Date('2025-12-01'),
        cost:        5000000,
        performedBy: 'IT Department',
        notes:       'Thay PSU dự phòng, kiểm tra RAID',
      },
    });
    await prisma.asset.update({ where: { id: createdAssets['SERVER-001'].id }, data: { status: 'UNDER_MAINTENANCE' } });

    await prisma.assetMaintenance.create({
      data: {
        assetId:     createdAssets['LAPTOP-001'].id,
        type:        'inspection',
        performedAt: new Date('2026-01-10'),
        cost:        0,
        performedBy: 'IT Department',
        notes:       'Kiểm tra định kỳ quý I/2026',
      },
    });

    await prisma.assetMaintenance.create({
      data: {
        assetId:     createdAssets['LAPTOP-002'].id,
        type:        'inspection',
        performedAt: new Date('2026-01-10'),
        cost:        0,
        performedBy: 'IT Department',
        notes:       'Kiểm tra định kỳ quý I/2026',
      },
    });
    console.log(`  ✓ 3 maintenance logs seeded`);

  } catch (err) {
    console.error('  ✗ seedAssetsDemo error:', err);
  }
}

// ─── Enriched Demo — Projects, Tasks, TimeLogs, Timesheets, Payroll history, Recruitment ──

async function seedEnrichedDemo() {
  try {
    const existing = await prisma.project.findUnique({ where: { code: 'PROJ-FPT-001' } });
    if (existing) {
      console.log('  ✓ Enriched demo already seeded, skipping');
      return;
    }

    // ── Users ─────────────────────────────────────────────────────────────────
    const uAdmin   = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@loop.vn' } });
    const uPm      = await prisma.user.findUniqueOrThrow({ where: { email: 'pm@loop.vn' } });
    const uDev1    = await prisma.user.findUniqueOrThrow({ where: { email: 'dev1@loop.vn' } });
    const uDev2    = await prisma.user.findUniqueOrThrow({ where: { email: 'dev2@loop.vn' } });
    const uDemo    = await prisma.user.findUniqueOrThrow({ where: { email: 'user.demo@loop.vn' } });
    const uHr      = await prisma.user.findUniqueOrThrow({ where: { email: 'hr@loop.vn' } });
    const uFinance = await prisma.user.findUniqueOrThrow({ where: { email: 'finance@loop.vn' } });

    const empAdmin   = await prisma.employee.findUniqueOrThrow({ where: { code: 'EMP001' } });
    const empPm      = await prisma.employee.findUniqueOrThrow({ where: { code: 'EMP002' } });
    const empDemo    = await prisma.employee.findUniqueOrThrow({ where: { code: 'EMP003' } });
    const empHr      = await prisma.employee.findUniqueOrThrow({ where: { code: 'EMP004' } });
    const empFinance = await prisma.employee.findUniqueOrThrow({ where: { code: 'EMP005' } });
    const empDev1    = await prisma.employee.findUniqueOrThrow({ where: { code: 'EMP006' } });
    const empDev2    = await prisma.employee.findUniqueOrThrow({ where: { code: 'EMP007' } });

    const orgDev = await prisma.orgUnit.findUniqueOrThrow({ where: { code: 'DEV' } });
    const orgHrd = await prisma.orgUnit.findUniqueOrThrow({ where: { code: 'HRD' } });

    // ── 1. Projects ────────────────────────────────────────────────────────────
    // Kết nối với CRM deals: FPT ERP → DEAL-002, Viettel Data → DEAL-003

    const projFpt = await prisma.project.create({
      data: {
        code:        'PROJ-FPT-001',
        name:        'FPT ERP Platform',
        type:        'OSDC',
        status:      'ACTIVE',
        pmId:        uPm.id,
        orgUnitId:   orgDev.id,
        startDate:   new Date('2026-03-01'),
        endDate:     new Date('2026-11-30'),
        customer:    'FPT Software',
        budgetCost:  500_000_000,
        budgetHours: 4000,
        currency:    'VND',
        progress:    35,
        description: 'Triển khai nền tảng ERP cho FPT Software — Phase 1. Bắt nguồn từ deal DEAL-002.',
      },
    });

    const projVng = await prisma.project.create({
      data: {
        code:        'PROJ-VNG-001',
        name:        'VNG Portal v2',
        type:        'PKG',
        status:      'PLANNING',
        pmId:        uAdmin.id,
        orgUnitId:   orgDev.id,
        startDate:   new Date('2026-06-01'),
        endDate:     new Date('2026-12-31'),
        customer:    'VNG Corporation',
        budgetCost:  250_000_000,
        budgetHours: 2000,
        currency:    'VND',
        progress:    10,
        description: 'Nâng cấp cổng thông tin nội bộ VNG — discovery và proposal phase.',
      },
    });

    const projVtel = await prisma.project.create({
      data: {
        code:        'PROJ-VTEL-001',
        name:        'Viettel Data Platform',
        type:        'OSDC',
        status:      'ACTIVE',
        pmId:        uPm.id,
        orgUnitId:   orgDev.id,
        startDate:   new Date('2026-04-01'),
        endDate:     new Date('2027-03-31'),
        customer:    'Viettel Digital',
        budgetCost:  800_000_000,
        budgetHours: 7000,
        currency:    'VND',
        progress:    18,
        description: 'Xây dựng Data Platform cho Viettel — deal DEAL-003 đang ở giai đoạn NEGOTIATION 80%.',
      },
    });

    console.log('  ✓ 3 projects seeded (FPT ERP, VNG Portal, Viettel Data Platform)');

    // ── 2. Allocations ────────────────────────────────────────────────────────
    const allocDefs = [
      // FPT ERP
      { proj: projFpt, emp: empPm,    role: 'PM',     pct: 20, rate: 2_000_000, start: '2026-03-01', end: '2026-11-30' },
      { proj: projFpt, emp: empDev1,  role: 'DEV',    pct: 100, rate: 1_900_000, start: '2026-03-01', end: '2026-11-30' },
      { proj: projFpt, emp: empDev2,  role: 'DEV',    pct: 80,  rate: 1_400_000, start: '2026-03-01', end: '2026-11-30' },
      // VNG Portal
      { proj: projVng, emp: empAdmin, role: 'PM',     pct: 10,  rate: 2_500_000, start: '2026-06-01', end: '2026-12-31' },
      { proj: projVng, emp: empDev2,  role: 'DEV',    pct: 20,  rate: 1_400_000, start: '2026-06-01', end: '2026-12-31' },
      // Viettel
      { proj: projVtel, emp: empPm,   role: 'PM',     pct: 30,  rate: 2_000_000, start: '2026-04-01', end: '2027-03-31' },
      { proj: projVtel, emp: empDev1, role: 'LEAD',   pct: 100, rate: 1_900_000, start: '2026-04-01', end: '2027-03-31' },
      { proj: projVtel, emp: empDemo, role: 'DEV',    pct: 50,  rate: 1_500_000, start: '2026-04-01', end: '2027-03-31' },
    ];

    for (const a of allocDefs) {
      await prisma.allocation.upsert({
        where: { projectId_employeeId_startDate: { projectId: a.proj.id, employeeId: a.emp.id, startDate: new Date(a.start) } },
        update: {},
        create: {
          projectId:     a.proj.id,
          employeeId:    a.emp.id,
          role:          a.role,
          allocationPct: a.pct,
          ratePerDay:    a.rate,
          startDate:     new Date(a.start),
          endDate:       new Date(a.end),
        },
      });
    }
    console.log('  ✓ 8 allocations seeded');

    // ── 3. Tasks ──────────────────────────────────────────────────────────────
    const taskDefs = [
      // FPT ERP tasks
      { proj: projFpt, code: 'T-FPT-01', title: 'Backend API Design & Setup',        status: 'IN_PROGRESS', assigneeId: empDev1.id, est: 80,  actual: 32, progress: 40, start: '2026-03-10', due: '2026-05-31' },
      { proj: projFpt, code: 'T-FPT-02', title: 'Frontend Module — HR & Payroll',    status: 'IN_PROGRESS', assigneeId: empDev2.id, est: 120, actual: 40, progress: 33, start: '2026-04-01', due: '2026-07-31' },
      { proj: projFpt, code: 'T-FPT-03', title: 'Integration Testing & QA',          status: 'TODO',        assigneeId: empDev1.id, est: 40,  actual: 0,  progress: 0,  start: '2026-07-01', due: '2026-08-31' },
      { proj: projFpt, code: 'T-FPT-04', title: 'UAT Support & Go-live',             status: 'TODO',        assigneeId: empPm.id,   est: 24,  actual: 0,  progress: 0,  start: '2026-09-01', due: '2026-11-30' },
      // VNG Portal tasks
      { proj: projVng, code: 'T-VNG-01', title: 'Discovery & Requirements Analysis', status: 'IN_PROGRESS', assigneeId: empAdmin.id, est: 40, actual: 12, progress: 30, start: '2026-06-01', due: '2026-06-30' },
      { proj: projVng, code: 'T-VNG-02', title: 'UX Design & Prototype',             status: 'TODO',        assigneeId: empDev2.id,  est: 80, actual: 0,  progress: 0,  start: '2026-07-01', due: '2026-08-31' },
      // Viettel tasks
      { proj: projVtel, code: 'T-VTEL-01', title: 'Solution Architecture Design',    status: 'DONE',        assigneeId: empDev1.id,  est: 80,  actual: 75, progress: 100, start: '2026-04-01', due: '2026-05-15' },
      { proj: projVtel, code: 'T-VTEL-02', title: 'Data Ingestion Pipeline',         status: 'IN_PROGRESS', assigneeId: empDev1.id,  est: 200, actual: 48, progress: 24,  start: '2026-05-01', due: '2026-09-30' },
      { proj: projVtel, code: 'T-VTEL-03', title: 'Analytics Dashboard & Reporting', status: 'TODO',        assigneeId: empDemo.id,  est: 160, actual: 0,  progress: 0,   start: '2026-08-01', due: '2026-12-31' },
    ];

    const taskMap: Record<string, string> = {};
    for (const t of taskDefs) {
      const task = await prisma.task.create({
        data: {
          projectId:     t.proj.id,
          title:         t.title,
          status:        t.status as any,
          assigneeId:    t.assigneeId,
          estimateHours: t.est,
          actualHours:   t.actual,
          progress:      t.progress,
          startDate:     new Date(t.start),
          dueDate:       new Date(t.due),
        },
        select: { id: true },
      });
      taskMap[t.code] = task.id;
    }
    console.log('  ✓ 9 tasks seeded (FPT ×4, VNG ×2, Viettel ×3)');

    // ── 4. TimeLogs — 10 ngày làm việc gần nhất ───────────────────────────────
    // Pattern: dev1 on T-FPT-01 + T-VTEL-01(done)/T-VTEL-02; dev2 on T-FPT-02
    const today   = new Date();
    today.setHours(0, 0, 0, 0);

    // Tạo ngày làm việc gần đây (bỏ cuối tuần)
    function workingDaysBefore(n: number): Date[] {
      const days: Date[] = [];
      const d = new Date(today);
      while (days.length < n) {
        d.setDate(d.getDate() - 1);
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) days.push(new Date(d));
      }
      return days.reverse();
    }

    const last10Days = workingDaysBefore(10);

    const timeLogDefs: { taskCode: string; userId: string; days: Date[]; hours: number; note?: string }[] = [
      { taskCode: 'T-FPT-01',  userId: uDev1.id,  days: last10Days.slice(5), hours: 8, note: 'Backend API development' },
      { taskCode: 'T-FPT-02',  userId: uDev2.id,  days: last10Days.slice(5), hours: 8, note: 'Frontend HR module' },
      { taskCode: 'T-VTEL-02', userId: uDev1.id,  days: last10Days.slice(0, 5), hours: 8, note: 'Data ingestion pipeline' },
      { taskCode: 'T-VTEL-01', userId: uDev1.id,  days: last10Days.slice(0, 3), hours: 6, note: 'Architecture docs finalized' },
      { taskCode: 'T-FPT-02',  userId: uDev2.id,  days: last10Days.slice(0, 5), hours: 7, note: 'Payroll module UI' },
    ];

    let totalLogs = 0;
    for (const tl of timeLogDefs) {
      const taskId = taskMap[tl.taskCode];
      if (!taskId) continue;
      for (const day of tl.days) {
        const existing = await prisma.timeLog.findFirst({
          where: { taskId, userId: tl.userId, logDate: day },
        });
        if (!existing) {
          await prisma.timeLog.create({
            data: { taskId, userId: tl.userId, logDate: day, hours: tl.hours, note: tl.note },
          });
          totalLogs++;
        }
      }
    }
    console.log(`  ✓ ${totalLogs} time logs seeded`);

    // ── 5. TimeEntries (check-in/out) ─────────────────────────────────────────
    // Tạo check-in/out cho dev1, dev2, demo trong 5 ngày làm việc gần nhất
    const last5Days = workingDaysBefore(5);
    const checkInUsers = [uDev1, uDev2, uDemo, uPm, uAdmin];

    for (const u of checkInUsers) {
      for (const day of last5Days) {
        const existing = await prisma.timeEntry.findUnique({
          where: { userId_date: { userId: u.id, date: day } },
        });
        if (existing) continue;

        const isAdmin = u.id === uAdmin.id;
        const inHour  = isAdmin ? 8 : 8 + Math.floor(Math.random() * 2); // 8–9h
        const outHour = 17 + Math.floor(Math.random() * 2);               // 17–18h

        const checkIn  = new Date(day); checkIn.setHours(inHour, 30, 0, 0);
        const checkOut = new Date(day); checkOut.setHours(outHour, 30, 0, 0);

        await prisma.timeEntry.create({
          data: { userId: u.id, date: day, checkInAt: checkIn, checkOutAt: checkOut, checkInMethod: 'MANUAL' },
        });
      }
    }
    console.log(`  ✓ Time entries seeded (5 users × 5 days)`);

    // ── 6. TimesheetRecords — tháng 4 & 5/2026 ───────────────────────────────
    const allUsers = [
      { user: uAdmin,   workDays: 22, ot: 0,  leaveDays: 0, status: 'APPROVED' },
      { user: uPm,      workDays: 22, ot: 4,  leaveDays: 2, status: 'APPROVED' },
      { user: uDev1,    workDays: 22, ot: 8,  leaveDays: 1, status: 'APPROVED' },
      { user: uDev2,    workDays: 21, ot: 4,  leaveDays: 2, status: 'SUBMITTED' },
      { user: uDemo,    workDays: 21, ot: 0,  leaveDays: 1, status: 'DRAFT' },
      { user: uHr,      workDays: 22, ot: 0,  leaveDays: 2, status: 'APPROVED' },
      { user: uFinance, workDays: 21, ot: 0,  leaveDays: 1, status: 'SUBMITTED' },
    ];

    const aprilStart = new Date('2026-04-01');
    const aprilEnd   = new Date('2026-04-30');
    const mayStart   = new Date('2026-05-01');
    const mayEnd     = new Date('2026-05-31');
    const approvedAt = new Date('2026-05-05');
    const mayApprovedAt = new Date('2026-06-01');

    for (const u of allUsers) {
      // April — tất cả APPROVED (đã qua)
      await prisma.timesheetRecord.upsert({
        where: { userId_periodStart: { userId: u.user.id, periodStart: aprilStart } },
        update: {},
        create: {
          userId: u.user.id, periodStart: aprilStart, periodEnd: aprilEnd,
          workingDays: u.workDays, standardDays: 22, overtimeHours: u.ot, leaveDays: u.leaveDays,
          status: 'APPROVED',
          submittedAt: new Date('2026-04-30'), approvedAt,
          approvedById: uAdmin.id,
        },
      });

      // May — theo trạng thái của mỗi user
      const isApproved  = u.status === 'APPROVED';
      const isSubmitted = u.status === 'SUBMITTED';
      await prisma.timesheetRecord.upsert({
        where: { userId_periodStart: { userId: u.user.id, periodStart: mayStart } },
        update: {},
        create: {
          userId: u.user.id, periodStart: mayStart, periodEnd: mayEnd,
          workingDays: u.workDays, standardDays: 22, overtimeHours: u.ot, leaveDays: u.leaveDays,
          status: u.status as any,
          submittedAt: isApproved || isSubmitted ? new Date('2026-05-31') : null,
          approvedAt:  isApproved ? mayApprovedAt : null,
          approvedById: isApproved ? uAdmin.id : null,
        },
      });
    }
    console.log('  ✓ Timesheet records seeded (April + May 2026, 7 users)');

    // ── 7. Payroll periods bổ sung — March & April 2026 ──────────────────────
    const rateMap: Record<string, number> = {
      EMP001: 2_500_000, EMP002: 2_000_000, EMP003: 1_500_000,
      EMP004: 1_800_000, EMP005: 1_600_000, EMP006: 1_900_000, EMP007: 1_400_000,
    };
    const empList = [
      { code: 'EMP001', empId: empAdmin.id },   { code: 'EMP002', empId: empPm.id },
      { code: 'EMP003', empId: empDemo.id },    { code: 'EMP004', empId: empHr.id },
      { code: 'EMP005', empId: empFinance.id }, { code: 'EMP006', empId: empDev1.id },
      { code: 'EMP007', empId: empDev2.id },
    ];
    const extraPeriods = [
      { name: 'Tháng 3/2026', start: '2026-03-01', end: '2026-03-31', status: 'PAID',       processedById: uAdmin.id },
      { name: 'Tháng 4/2026', start: '2026-04-01', end: '2026-04-30', status: 'APPROVED',   processedById: uAdmin.id },
    ];

    for (const period of extraPeriods) {
      let pp = await prisma.payrollPeriod.findFirst({ where: { name: period.name } });
      if (!pp) {
        pp = await prisma.payrollPeriod.create({
          data: { name: period.name, startDate: new Date(period.start), endDate: new Date(period.end),
            status: period.status as any, processedById: period.processedById },
        });
      }
      for (const e of empList) {
        const exists = await prisma.payrollRecord.findFirst({ where: { periodId: pp.id, employeeId: e.empId } });
        if (exists) continue;
        const rate = rateMap[e.code];
        await prisma.payrollRecord.create({
          data: { periodId: pp.id, employeeId: e.empId,
            workDays: 22, leaveDays: 1, overtimeHours: 4,
            baseSalary: 22 * rate, bonus: 0, deductions: 0, netSalary: 22 * rate },
        });
      }
    }
    console.log('  ✓ Payroll periods March + April 2026 seeded (tổng 3 tháng có dữ liệu)');

    // ── 8. Recruitment — enrich interview history ────────────────────────────
    // Trần Thị Bình (OFFER) — 4 vòng PASS → HIRED → Employee EMP008
    const binhCandidate = await prisma.candidate.findFirst({ where: { email: 'binh.tran@gmail.com' } });
    if (binhCandidate) {
      const binhInterviews = [
        { type: 'PHONE',     scheduledAt: '2026-04-25T10:00:00', result: 'PASS', score: 90, notes: 'Giao tiếp tốt, kinh nghiệm phù hợp' },
        { type: 'TECHNICAL', scheduledAt: '2026-05-05T14:00:00', result: 'PASS', score: 88, notes: 'Xử lý tốt bài toán thuật toán, React 5/5' },
        { type: 'HR',        scheduledAt: '2026-05-12T10:30:00', result: 'PASS', score: 92, notes: 'Phù hợp văn hóa công ty, mong đợi lương 55M' },
        { type: 'FINAL',     scheduledAt: '2026-05-20T09:00:00', result: 'PASS', score: 95, notes: 'CEO confirm — offer 57M gross' },
      ];
      for (const iv of binhInterviews) {
        const exists = await prisma.interview.findFirst({
          where: { candidateId: binhCandidate.id, type: iv.type as any },
        });
        if (!exists) {
          await prisma.interview.create({
            data: {
              candidateId: binhCandidate.id, type: iv.type as any,
              scheduledAt: new Date(iv.scheduledAt), result: iv.result as any,
              score: iv.score, notes: iv.notes,
              interviewers: [uAdmin.id],
            },
          });
        }
      }

      // Hire: tạo user + employee EMP008
      const demoHash = await (await import('bcrypt')).hash('Demo@1234', 12);
      const binhUser = await prisma.user.upsert({
        where: { email: 'binh.tran@loop.vn' },
        update: {},
        create: { email: 'binh.tran@loop.vn', passwordHash: demoHash, name: 'Trần Thị Bình', role: 'MEMBER', orgUnitId: orgDev.id },
      });
      const binhEmp = await prisma.employee.upsert({
        where: { code: 'EMP008' },
        update: {},
        create: { code: 'EMP008', userId: binhUser.id, fullName: 'Trần Thị Bình', level: 'SENIOR', orgUnitId: orgDev.id, startDate: new Date('2026-06-01') },
      });
      await prisma.candidate.update({
        where: { id: binhCandidate.id },
        data: { stage: 'HIRED', employeeId: binhEmp.id },
      });
      // Contract cho employee mới
      const binhContractExists = await prisma.contract.findFirst({ where: { employeeId: binhEmp.id } });
      if (!binhContractExists) {
        await prisma.contract.create({
          data: { employeeId: binhEmp.id, type: 'FULL_TIME', status: 'ACTIVE',
            startDate: new Date('2026-06-01'), endDate: new Date('2027-05-31'),
            salaryMonthly: 57_000_000 },
        });
      }
      console.log('  ✓ Trần Thị Bình: 4 vòng phỏng vấn PASS → HIRED → EMP008 + Contract');
    }

    // Nguyễn Văn An (INTERVIEW) — 2 vòng PASS, 1 vòng PENDING
    const anCandidate = await prisma.candidate.findFirst({ where: { email: 'an.nguyen@gmail.com' } });
    if (anCandidate) {
      const anInterviews = [
        { type: 'PHONE',     scheduledAt: '2026-05-01T10:00:00', result: 'PASS',    score: 85, notes: 'Ứng viên có kinh nghiệm React, TypeScript tốt' },
        { type: 'TECHNICAL', scheduledAt: '2026-05-10T14:00:00', result: 'PASS',    score: 78, notes: 'Qua vòng kỹ thuật, cần cải thiện system design' },
        { type: 'HR',        scheduledAt: '2026-06-03T10:00:00', result: 'PENDING', score: null, notes: null },
      ];
      for (const iv of anInterviews) {
        const exists = await prisma.interview.findFirst({
          where: { candidateId: anCandidate.id, type: iv.type as any },
        });
        if (!exists) {
          await prisma.interview.create({
            data: {
              candidateId: anCandidate.id, type: iv.type as any,
              scheduledAt: new Date(iv.scheduledAt), result: iv.result as any,
              score: iv.score ?? undefined, notes: iv.notes ?? undefined,
              interviewers: [uAdmin.id],
            },
          });
        }
      }
      console.log('  ✓ Nguyễn Văn An: 2 vòng PASS + HR interview lên lịch');
    }

    // Vũ Thị Giang (INTERVIEW → REJECTED) — 2 vòng: PHONE PASS, TECHNICAL FAIL
    const giangCandidate = await prisma.candidate.findFirst({ where: { email: 'giang.vu@gmail.com' } });
    if (giangCandidate) {
      const giangInterviews = [
        { type: 'PHONE',     scheduledAt: '2026-05-03T10:00:00', result: 'PASS', score: 88, notes: 'Kinh nghiệm Kubernetes 3 năm, phong thái tốt' },
        { type: 'TECHNICAL', scheduledAt: '2026-05-15T14:00:00', result: 'FAIL', score: 45, notes: 'Yếu ở CI/CD pipeline và security practices' },
      ];
      for (const iv of giangInterviews) {
        const exists = await prisma.interview.findFirst({
          where: { candidateId: giangCandidate.id, type: iv.type as any },
        });
        if (!exists) {
          await prisma.interview.create({
            data: {
              candidateId: giangCandidate.id, type: iv.type as any,
              scheduledAt: new Date(iv.scheduledAt), result: iv.result as any,
              score: iv.score, notes: iv.notes, interviewers: [uAdmin.id],
            },
          });
        }
      }
      await prisma.candidate.update({
        where: { id: giangCandidate.id }, data: { stage: 'REJECTED' },
      });
      console.log('  ✓ Vũ Thị Giang: PHONE PASS → TECHNICAL FAIL → REJECTED');
    }

    // Lê Quang Cường (SCREENING → INTERVIEW) — PHONE PASS
    const cuongCandidate = await prisma.candidate.findFirst({ where: { email: 'cuong.le@gmail.com' } });
    if (cuongCandidate) {
      const cuongExists = await prisma.interview.findFirst({ where: { candidateId: cuongCandidate.id } });
      if (!cuongExists) {
        await prisma.interview.create({
          data: {
            candidateId: cuongCandidate.id, type: 'PHONE',
            scheduledAt: new Date('2026-05-25T10:00:00'), result: 'PASS',
            score: 80, notes: 'NestJS, Prisma vững — cho vào technical round',
            interviewers: [uAdmin.id],
          },
        });
        await prisma.candidate.update({
          where: { id: cuongCandidate.id }, data: { stage: 'INTERVIEW' },
        });
        console.log('  ✓ Lê Quang Cường: PHONE PASS → chuyển sang INTERVIEW');
      }
    }

    // ── 9. AlertConfig cho projects ──────────────────────────────────────────
    const alertDefs = [
      { project: projFpt,  type: 'TASK_OVERDUE'               as const, daysBeforeDue: 7 },
      { project: projFpt,  type: 'TIMESHEET_APPROVAL_OVERDUE'  as const, daysBeforeDue: 3 },
      { project: projVtel, type: 'TASK_OVERDUE'               as const, daysBeforeDue: 7 },
    ];
    for (const a of alertDefs) {
      const exists = await prisma.alertConfig.findFirst({
        where: { projectId: a.project.id, type: a.type },
      });
      if (!exists) {
        await prisma.alertConfig.create({
          data: { projectId: a.project.id, type: a.type, daysBeforeDue: a.daysBeforeDue },
        });
      }
    }
    console.log('  ✓ 3 alert configs seeded');

    // ── 10. WorkStatus hiện tại của team ─────────────────────────────────────
    const workStatusDefs = [
      { user: uDev1,  type: 'WORKING'      as const, note: 'Đang làm task T-FPT-01' },
      { user: uDev2,  type: 'WFH'          as const, note: 'Work from home hôm nay' },
      { user: uDemo,  type: 'MEETING'      as const, note: 'Sprint Planning' },
      { user: uPm,    type: 'WORKING'      as const, note: null },
      { user: uAdmin, type: 'BUSINESS_TRIP' as const, note: 'Gặp khách hàng FPT' },
    ];
    for (const ws of workStatusDefs) {
      const now = new Date();
      const startOfDay = new Date(now); startOfDay.setHours(8, 0, 0, 0);
      await prisma.workStatus.create({
        data: { userId: ws.user.id, statusType: ws.type, startedAt: startOfDay, note: ws.note },
      });
    }
    console.log('  ✓ Work statuses seeded cho team');

  } catch (err) {
    console.error('  ✗ seedEnrichedDemo error:', err);
  }
}

// ─── Asset Enriched Demo ──────────────────────────────────────────────────────

async function seedAssetsEnriched() {
  try {
    const check = await prisma.asset.findUnique({ where: { code: 'LAPTOP-004' } });
    if (check) {
      console.log('  ✓ Assets enriched demo already seeded, skipping');
      return;
    }

    // ── Lấy orgUnits & employees ──────────────────────────────────────────────
    const orgRoot = await prisma.orgUnit.findUniqueOrThrow({ where: { code: 'ROOT' } });
    const orgDev  = await prisma.orgUnit.findUniqueOrThrow({ where: { code: 'DEV' } });
    const orgHrd  = await prisma.orgUnit.findUniqueOrThrow({ where: { code: 'HRD' } });
    const orgFin  = await prisma.orgUnit.findUniqueOrThrow({ where: { code: 'FIN' } });

    const empHr      = await prisma.employee.findUniqueOrThrow({ where: { code: 'EMP004' } });
    const empFinance = await prisma.employee.findUniqueOrThrow({ where: { code: 'EMP005' } });
    const empDev1    = await prisma.employee.findUniqueOrThrow({ where: { code: 'EMP006' } });
    const empDev2    = await prisma.employee.findUniqueOrThrow({ where: { code: 'EMP007' } });
    // EMP008 có thể chưa tồn tại nếu seedEnrichedDemo chưa chạy
    const empNewHire = await prisma.employee.findUnique({ where: { code: 'EMP008' } });

    // ── 1. Thêm assets theo từng danh mục ────────────────────────────────────
    const purchaseQ1 = new Date('2025-01-15');
    const purchaseQ2 = new Date('2025-06-01');
    const purchaseQ3 = new Date('2025-09-01');
    const purchaseNew = new Date('2026-01-01');

    type AssetDef = {
      code: string; name: string; category: string; brand?: string; model?: string;
      serialNumber?: string; orgUnitId: string; status: string;
      purchaseDate: Date; purchasePrice: number; depreciationYears: number; notes?: string;
    };

    const newAssets: AssetDef[] = [
      // ── Laptops cho nhân viên còn thiếu ────────────────────────────────────
      {
        code: 'LAPTOP-004', name: 'HP EliteBook 840 G10',
        category: 'LAPTOP', brand: 'HP', model: 'EliteBook 840 G10', serialNumber: 'HPE840G1001',
        orgUnitId: orgFin.id, status: 'ASSIGNED',
        purchaseDate: purchaseQ2, purchasePrice: 28_000_000, depreciationYears: 3,
        notes: 'Laptop kế toán',
      },
      {
        code: 'LAPTOP-005', name: 'MacBook Air M2 15"',
        category: 'LAPTOP', brand: 'Apple', model: 'MacBook Air M2 15"', serialNumber: 'MBA2M200101',
        orgUnitId: orgDev.id, status: 'ASSIGNED',
        purchaseDate: purchaseQ3, purchasePrice: 35_000_000, depreciationYears: 3,
        notes: 'Máy phát triển phần mềm — dev1',
      },
      {
        code: 'LAPTOP-006', name: 'MacBook Pro 14" M3 Pro',
        category: 'LAPTOP', brand: 'Apple', model: 'MacBook Pro 14 M3 Pro', serialNumber: 'MBP14M3P001',
        orgUnitId: orgDev.id, status: 'ASSIGNED',
        purchaseDate: purchaseQ3, purchasePrice: 52_000_000, depreciationYears: 3,
        notes: 'Máy phát triển phần mềm — dev2, cấu hình cao',
      },
      {
        code: 'LAPTOP-007', name: 'MacBook Air M3 13"',
        category: 'LAPTOP', brand: 'Apple', model: 'MacBook Air M3 13"', serialNumber: 'MBA3M300001',
        orgUnitId: orgDev.id, status: empNewHire ? 'ASSIGNED' : 'AVAILABLE',
        purchaseDate: purchaseNew, purchasePrice: 32_000_000, depreciationYears: 3,
        notes: 'Cấp phát cho nhân viên mới EMP008 — Trần Thị Bình (onboard 2026-06-01)',
      },
      {
        code: 'LAPTOP-008', name: 'Dell Latitude 5540',
        category: 'LAPTOP', brand: 'Dell', model: 'Latitude 5540', serialNumber: 'DLAT554001',
        orgUnitId: orgHrd.id, status: 'ASSIGNED',
        purchaseDate: purchaseQ1, purchasePrice: 24_000_000, depreciationYears: 3,
        notes: 'Laptop phòng nhân sự',
      },
      // ── Laptops đã nghỉ hưu (lifecycle) ─────────────────────────────────────
      {
        code: 'LAPTOP-RETIRED-01', name: 'MacBook Pro 2020 (Intel)',
        category: 'LAPTOP', brand: 'Apple', model: 'MacBook Pro 13 Intel', serialNumber: 'MBP13I2020X',
        orgUnitId: orgDev.id, status: 'RETIRED',
        purchaseDate: new Date('2020-06-01'), purchasePrice: 38_000_000, depreciationYears: 3,
        notes: 'Hết khấu hao, hiệu năng thấp — đã thanh lý tháng 1/2026',
      },
      // ── Màn hình ─────────────────────────────────────────────────────────────
      {
        code: 'PERIPH-002', name: 'LG UltraWide 34" QHD',
        category: 'PERIPHERAL', brand: 'LG', model: 'UltraWide 34WQ650', serialNumber: 'LG34UW001',
        orgUnitId: orgDev.id, status: 'ASSIGNED',
        purchaseDate: purchaseQ1, purchasePrice: 14_000_000, depreciationYears: 4,
        notes: 'Màn hình dev1 — dual setup với PERIPH-001',
      },
      {
        code: 'PERIPH-003', name: 'Dell UltraSharp 27" 4K',
        category: 'PERIPHERAL', brand: 'Dell', model: 'UltraSharp U2723QE', serialNumber: 'DU2723001',
        orgUnitId: orgDev.id, status: 'ASSIGNED',
        purchaseDate: purchaseQ2, purchasePrice: 16_000_000, depreciationYears: 4,
        notes: 'Màn hình dev2',
      },
      {
        code: 'PERIPH-004', name: 'Webcam Logitech Brio 4K',
        category: 'PERIPHERAL', brand: 'Logitech', model: 'Brio 4K', serialNumber: 'LOGBRIO001',
        orgUnitId: orgRoot.id, status: 'AVAILABLE',
        purchaseDate: purchaseQ2, purchasePrice: 3_500_000, depreciationYears: 3,
        notes: 'Dùng cho phòng họp A',
      },
      {
        code: 'PERIPH-005', name: 'Logitech MX Keys + MX Master 3',
        category: 'PERIPHERAL', brand: 'Logitech', model: 'MX Keys + MX Master 3 Set', serialNumber: undefined,
        orgUnitId: orgDev.id, status: 'ASSIGNED',
        purchaseDate: purchaseQ3, purchasePrice: 4_200_000, depreciationYears: 3,
        notes: 'Bộ bàn phím chuột không dây cho dev1',
      },
      // ── Phần mềm bản quyền ────────────────────────────────────────────────
      {
        code: 'SW-002', name: 'JetBrains All Products Pack',
        category: 'SOFTWARE', brand: 'JetBrains', model: 'All Products Annual (5 seats)', serialNumber: 'JB-2026-5S',
        orgUnitId: orgDev.id, status: 'AVAILABLE',
        purchaseDate: new Date('2026-01-01'), purchasePrice: 18_000_000, depreciationYears: 1,
        notes: '5 licenses — IntelliJ, WebStorm, DataGrip. Gia hạn hàng năm.',
      },
      {
        code: 'SW-003', name: 'Figma Organization Plan',
        category: 'SOFTWARE', brand: 'Figma', model: 'Organization — 3 editors', serialNumber: 'FIGMA-ORG-2026',
        orgUnitId: orgDev.id, status: 'AVAILABLE',
        purchaseDate: new Date('2026-03-01'), purchasePrice: 6_500_000, depreciationYears: 1,
        notes: '3 editor seats. Dùng cho team design + dev2.',
      },
      {
        code: 'SW-004', name: 'GitHub Enterprise Cloud',
        category: 'SOFTWARE', brand: 'GitHub', model: 'Enterprise Cloud — 20 seats', serialNumber: 'GH-ENT-2026',
        orgUnitId: orgDev.id, status: 'AVAILABLE',
        purchaseDate: new Date('2026-01-01'), purchasePrice: 25_000_000, depreciationYears: 1,
        notes: '20 developer seats. Source control toàn công ty.',
      },
      {
        code: 'SW-005', name: 'Slack Pro Plan',
        category: 'SOFTWARE', brand: 'Slack', model: 'Pro — unlimited', serialNumber: 'SLACK-PRO-2026',
        orgUnitId: orgRoot.id, status: 'AVAILABLE',
        purchaseDate: new Date('2026-01-01'), purchasePrice: 9_000_000, depreciationYears: 1,
        notes: 'Toàn công ty. Tích hợp với Loop notification system.',
      },
      // ── Nội thất (FURNITURE) ──────────────────────────────────────────────
      {
        code: 'FURN-001', name: 'Bộ bàn đứng điều chỉnh chiều cao FlexiSpot',
        category: 'FURNITURE', brand: 'FlexiSpot', model: 'E7 Pro',
        serialNumber: undefined, orgUnitId: orgDev.id, status: 'AVAILABLE',
        purchaseDate: new Date('2025-03-01'), purchasePrice: 12_000_000, depreciationYears: 7,
        notes: 'Khu vực ngồi dev — 3 bàn',
      },
      {
        code: 'FURN-002', name: 'Bàn họp phòng họp A (8 chỗ)',
        category: 'FURNITURE', brand: 'Hòa Phát', model: 'HP-CONF-8',
        serialNumber: undefined, orgUnitId: orgRoot.id, status: 'AVAILABLE',
        purchaseDate: new Date('2023-01-01'), purchasePrice: 25_000_000, depreciationYears: 10,
        notes: 'Phòng họp chính tầng 3',
      },
      {
        code: 'FURN-003', name: 'Ghế công thái học Herman Miller Aeron',
        category: 'FURNITURE', brand: 'Herman Miller', model: 'Aeron Chair',
        serialNumber: undefined, orgUnitId: orgDev.id, status: 'AVAILABLE',
        purchaseDate: new Date('2025-06-01'), purchasePrice: 32_000_000, depreciationYears: 10,
        notes: '3 ghế — dành cho team dev, giảm nguy cơ đau lưng',
      },
      // ── Phương tiện (VEHICLE) ─────────────────────────────────────────────
      {
        code: 'VEH-001', name: 'Toyota Camry 2.5Q',
        category: 'VEHICLE', brand: 'Toyota', model: 'Camry 2.5Q 2024', serialNumber: 'CAMRY2024001',
        orgUnitId: orgRoot.id, status: 'AVAILABLE',
        purchaseDate: new Date('2024-03-15'), purchasePrice: 1_250_000_000, depreciationYears: 8,
        notes: 'Xe công ty — đưa đón khách hàng và công tác',
      },
      // ── Thiết bị server/network bổ sung ──────────────────────────────────
      {
        code: 'SERVER-002', name: 'NAS Synology DS1823xs+',
        category: 'SERVER', brand: 'Synology', model: 'DS1823xs+', serialNumber: 'SYN1823001',
        orgUnitId: orgDev.id, status: 'AVAILABLE',
        purchaseDate: new Date('2025-02-01'), purchasePrice: 65_000_000, depreciationYears: 5,
        notes: 'Backup server & file sharing nội bộ. 32TB usable.',
      },
    ];

    const assetMap: Record<string, string> = {};
    for (const def of newAssets) {
      const asset = await prisma.asset.create({
        data: {
          code: def.code, name: def.name, category: def.category as any,
          brand: def.brand, model: def.model, serialNumber: def.serialNumber ?? undefined,
          orgUnitId: def.orgUnitId, status: def.status as any,
          purchaseDate: def.purchaseDate, purchasePrice: def.purchasePrice,
          depreciationYears: def.depreciationYears, notes: def.notes,
        },
        select: { id: true },
      });
      assetMap[def.code] = asset.id;
    }
    console.log(`  ✓ ${newAssets.length} assets bổ sung (laptop, peripheral, software, furniture, vehicle, server)`);

    // ── 2. Assignments — phân bổ thiết bị cho nhân viên ──────────────────────
    const assignmentDefs: { assetCode: string; emp: typeof empHr; assignedAt: Date; notes: string }[] = [
      { assetCode: 'LAPTOP-004', emp: empFinance, assignedAt: purchaseQ2,  notes: 'Cấp phát thiết bị cho nhân viên tài chính' },
      { assetCode: 'LAPTOP-005', emp: empDev1,    assignedAt: purchaseQ3,  notes: 'Laptop chính cho lập trình viên Nguyễn Minh Tuấn' },
      { assetCode: 'LAPTOP-006', emp: empDev2,    assignedAt: purchaseQ3,  notes: 'Laptop cấu hình cao cho lập trình viên Phạm Thị Lan' },
      { assetCode: 'LAPTOP-008', emp: empHr,      assignedAt: purchaseQ1,  notes: 'Laptop phòng nhân sự — Lê Thị Hoa' },
      { assetCode: 'PERIPH-002', emp: empDev1,    assignedAt: purchaseQ1,  notes: 'Màn hình phụ cho dev1' },
      { assetCode: 'PERIPH-003', emp: empDev2,    assignedAt: purchaseQ2,  notes: 'Màn hình 4K cho dev2' },
      { assetCode: 'PERIPH-005', emp: empDev1,    assignedAt: purchaseQ3,  notes: 'Bộ bàn phím chuột không dây' },
    ];

    for (const a of assignmentDefs) {
      await prisma.assetAssignment.create({
        data: {
          assetId: assetMap[a.assetCode], employeeId: a.emp.id,
          assignedAt: a.assignedAt, notes: a.notes,
        },
      });
    }

    // EMP008 (new hire) — nếu đã tồn tại thì assign LAPTOP-007
    if (empNewHire) {
      await prisma.assetAssignment.create({
        data: {
          assetId: assetMap['LAPTOP-007'], employeeId: empNewHire.id,
          assignedAt: new Date('2026-06-01'),
          notes: 'Cấp phát thiết bị onboard cho Trần Thị Bình (EMP008)',
        },
      });
    }

    // Lịch sử: LAPTOP-RETIRED-01 — từng cấp phát cho dev2 rồi thu hồi khi nghỉ hưu
    await prisma.assetAssignment.create({
      data: {
        assetId: assetMap['LAPTOP-RETIRED-01'], employeeId: empDev2.id,
        assignedAt: new Date('2020-06-15'), returnedAt: new Date('2026-01-10'),
        notes: 'Máy Intel đã nghỉ hưu, thu hồi để thanh lý',
      },
    });

    console.log(`  ✓ Assignments seeded: 7 nhân viên × thiết bị + lịch sử RETIRED`);

    // ── 3. Maintenance history phong phú ─────────────────────────────────────
    const maintenanceDefs = [
      // Laptop-006 thay pin
      { assetCode: 'LAPTOP-006', type: 'repair',     performedAt: '2026-02-20', cost: 2_800_000, by: 'Apple Service Center', notes: 'Thay battery cycle 95% — bảo hành chính hãng còn hiệu lực' },
      // Server-002 setup
      { assetCode: 'SERVER-002', type: 'inspection', performedAt: '2025-02-15', cost: 0,         by: 'IT Department',        notes: 'Kiểm tra cài đặt ban đầu, cấu hình RAID-6, test backup' },
      // Vehicle bảo dưỡng định kỳ
      { assetCode: 'VEH-001',    type: 'scheduled',  performedAt: '2025-06-15', cost: 3_500_000, by: 'Toyota Authorized',     notes: 'Bảo dưỡng 20.000km — thay dầu, lọc, kiểm tra phanh' },
      { assetCode: 'VEH-001',    type: 'scheduled',  performedAt: '2025-12-20', cost: 4_200_000, by: 'Toyota Authorized',     notes: 'Bảo dưỡng 40.000km — thay lọc nhiên liệu, kiểm tra hệ thống điện' },
      // Laptop-005 inspection Q1
      { assetCode: 'LAPTOP-005', type: 'inspection', performedAt: '2026-01-10', cost: 0,         by: 'IT Department',        notes: 'Kiểm tra định kỳ quý I/2026 — tình trạng tốt' },
      // Server-001 lên lịch bảo dưỡng tới
      { assetCode: 'SERVER-002', type: 'scheduled',  performedAt: '2026-04-01', cost: 0,         by: 'IT Department',        notes: 'Kiểm tra disk health, update firmware DSM 7.2' },
      // Màn hình PERIPH-003 vệ sinh
      { assetCode: 'PERIPH-003', type: 'inspection', performedAt: '2026-03-15', cost: 0,         by: 'IT Department',        notes: 'Vệ sinh panel, kiểm tra cổng kết nối' },
    ];

    for (const m of maintenanceDefs) {
      const assetId = assetMap[m.assetCode];
      if (!assetId) continue;
      await prisma.assetMaintenance.create({
        data: {
          assetId, type: m.type, performedAt: new Date(m.performedAt),
          cost: m.cost || undefined, performedBy: m.by, notes: m.notes,
        },
      });
    }
    console.log(`  ✓ ${maintenanceDefs.length} maintenance logs bổ sung`);

    // Tổng kết
    const totalAssets = await prisma.asset.count();
    const totalAssigned = await prisma.asset.count({ where: { status: 'ASSIGNED' } });
    const totalRetired = await prisma.asset.count({ where: { status: 'RETIRED' } });
    const totalMaint = await prisma.asset.count({ where: { status: 'UNDER_MAINTENANCE' } });
    console.log(`  ✓ Asset summary: ${totalAssets} total | ${totalAssigned} assigned | ${totalMaint} maintenance | ${totalRetired} retired`);

  } catch (err) {
    console.error('  ✗ seedAssetsEnriched error:', err);
  }
}

// ─── CRM Enriched Demo ───────────────────────────────────────────────────────

async function seedCrmEnriched() {
  try {
    const check = await prisma.customer.findUnique({ where: { code: 'MOMO' } });
    if (check) { console.log('  ✓ CRM enriched demo already seeded, skipping'); return; }

    const uAdmin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@loop.vn' } });
    const uPm    = await prisma.user.findUniqueOrThrow({ where: { email: 'pm@loop.vn' } });

    // Lấy project IDs để link deal → project
    const projFpt  = await prisma.project.findUnique({ where: { code: 'PROJ-FPT-001'  } });
    const projVtel = await prisma.project.findUnique({ where: { code: 'PROJ-VTEL-001' } });

    // ── 1. Customers mới ──────────────────────────────────────────────────────
    const newCustomers = [
      { code: 'MOMO',       name: 'MoMo (M_Service)',         industry: 'Fintech',      website: 'https://momo.vn',           taxCode: '0312887586' },
      { code: 'VINGROUP',   name: 'Vingroup JSC',             industry: 'Conglomerate', website: 'https://vingroup.net',       taxCode: '0101245486' },
      { code: 'TECHCOM',    name: 'Techcombank',              industry: 'Banking',       website: 'https://techcombank.com.vn', taxCode: '0100230800' },
      { code: 'TIKI',       name: 'Tiki Corporation',         industry: 'E-Commerce',   website: 'https://tiki.vn',            taxCode: '0309532909' },
      { code: 'VNPAY',      name: 'VNPAY',                    industry: 'Fintech',       website: 'https://vnpay.vn',           taxCode: '0103705924' },
    ];
    const custMap: Record<string, string> = {};
    for (const c of newCustomers) {
      const row = await prisma.customer.create({ data: c, select: { id: true, code: true } });
      custMap[c.code] = row.id;
    }
    // Load existing customers
    for (const code of ['VNG', 'FPT', 'VTEL']) {
      const row = await prisma.customer.findUnique({ where: { code } });
      if (row) custMap[code] = row.id;
    }
    console.log(`  ✓ 5 customers mới (MoMo, Vingroup, Techcombank, Tiki, VNPAY)`);

    // ── 2. Contacts ───────────────────────────────────────────────────────────
    const newContacts = [
      // MoMo
      { name: 'Nguyễn Đức Tài',  email: 'tai.nd@momo.vn',        phone: '0912345601', title: 'CTO',              customerId: custMap['MOMO'] },
      { name: 'Lê Thu Hà',       email: 'ha.lt@momo.vn',          phone: '0912345602', title: 'Head of Platform', customerId: custMap['MOMO'] },
      // Vingroup
      { name: 'Phạm Nhật Nam',   email: 'nam.pn@vingroup.net',    phone: '0912345603', title: 'VP Technology',    customerId: custMap['VINGROUP'] },
      { name: 'Trần Hoàng Yến',  email: 'yen.th@vingroup.net',    phone: '0912345604', title: 'Digital Director', customerId: custMap['VINGROUP'] },
      // Techcombank
      { name: 'Vũ Minh Quân',    email: 'quan.vm@techcombank.com.vn', phone: '0912345605', title: 'CISO',          customerId: custMap['TECHCOM'] },
      { name: 'Đỗ Thị Phương',   email: 'phuong.dt@techcombank.com.vn', phone: '0912345606', title: 'IT Director', customerId: custMap['TECHCOM'] },
      // Tiki
      { name: 'Lưu Tuấn Anh',    email: 'anh.lt@tiki.vn',         phone: '0912345607', title: 'Head of Engineering', customerId: custMap['TIKI'] },
      { name: 'Bùi Thị Ngọc',    email: 'ngoc.bt@tiki.vn',        phone: '0912345608', title: 'Product Manager',  customerId: custMap['TIKI'] },
      // VNPAY
      { name: 'Hoàng Văn Dũng',  email: 'dung.hv@vnpay.vn',       phone: '0912345609', title: 'CTO',              customerId: custMap['VNPAY'] },
      // Standalone contacts (không gắn customer — lead từ event)
      { name: 'Trương Thị Lan',  email: 'lan.tt.event@gmail.com', phone: '0912345610', title: 'IT Manager @ Startup', customerId: undefined },
      { name: 'Bùi Quốc Hùng',  email: 'hung.bq.refer@gmail.com',phone: '0912345611', title: 'CTO @ Startup',    customerId: undefined },
    ];
    const contactMap: Record<string, string> = {};
    for (const ct of newContacts) {
      const row = await prisma.contact.create({
        data: { name: ct.name, email: ct.email, phone: ct.phone, title: ct.title, customerId: ct.customerId ?? null },
        select: { id: true },
      });
      if (ct.email) contactMap[ct.email] = row.id;
    }
    console.log(`  ✓ 11 contacts mới`);

    // ── 3. Leads ──────────────────────────────────────────────────────────────
    const leadDefs = [
      // MoMo
      { title: 'Payment SDK Integration — MoMo',      source: 'EVENT'         as const, status: 'QUALIFIED'  as const, value: 320_000_000, assignee: uPm.id,    contact: 'tai.nd@momo.vn',             notes: 'Gặp tại Vietnam Mobile Summit. Cần SDK tích hợp thanh toán vào app third-party.' },
      { title: 'Data Analytics Dashboard — MoMo',     source: 'REFERRAL'      as const, status: 'CONTACTED'  as const, value: 180_000_000, assignee: uAdmin.id, contact: 'ha.lt@momo.vn',              notes: 'Giới thiệu từ FPT. Cần dashboard real-time transaction analytics.' },
      // Vingroup
      { title: 'Smart Building IoT Platform — VG',    source: 'COLD_OUTREACH' as const, status: 'CONVERTED'  as const, value: 1_200_000_000, assignee: uAdmin.id, contact: 'nam.pn@vingroup.net',      notes: 'Đã convert thành DEAL-006. Vingroup triển khai IoT cho 5 toà nhà văn phòng.' },
      { title: 'HR Management System — Vingroup',     source: 'REFERRAL'      as const, status: 'QUALIFIED'  as const, value: 450_000_000, assignee: uPm.id,    contact: 'yen.th@vingroup.net',         notes: 'Sau khi demo IoT platform, khách yêu cầu thêm module HRM cho 3000 nhân viên.' },
      // Techcombank
      { title: 'Core Banking API Modernisation',      source: 'WEBSITE'       as const, status: 'NEW'        as const, value: 600_000_000, assignee: uPm.id,    contact: 'quan.vm@techcombank.com.vn', notes: 'Liên hệ qua website. Đang đánh giá 3 vendor.' },
      { title: 'Mobile Banking UX Overhaul',          source: 'EVENT'         as const, status: 'QUALIFIED'  as const, value: 400_000_000, assignee: uAdmin.id, contact: 'phuong.dt@techcombank.com.vn', notes: 'Techcombank muốn redesign app iOS/Android. Timeline Q3/2026.' },
      // Tiki
      { title: 'Tiki Seller Portal Upgrade',          source: 'SOCIAL'        as const, status: 'CONTACTED'  as const, value: 250_000_000, assignee: uPm.id,    contact: 'anh.lt@tiki.vn',             notes: 'LinkedIn outreach. Tiki cần nâng cấp seller onboarding flow.' },
      { title: 'Tiki Warehouse Management System',    source: 'COLD_OUTREACH' as const, status: 'NEW'        as const, value: 500_000_000, assignee: uAdmin.id, contact: 'ngoc.bt@tiki.vn',            notes: undefined },
      // VNPAY
      { title: 'VNPAY QR Gateway Integration',        source: 'REFERRAL'      as const, status: 'QUALIFIED'  as const, value: 280_000_000, assignee: uPm.id,    contact: 'dung.hv@vnpay.vn',           notes: 'Giới thiệu từ Viettel team. VNPAY muốn tích hợp QR gateway vào platform.' },
      // Standalone leads từ event
      { title: 'ERP Consulting — Startup A',          source: 'EVENT'         as const, status: 'CONTACTED'  as const, value:  80_000_000, assignee: uAdmin.id, contact: 'lan.tt.event@gmail.com',     notes: 'Startup ~50 nhân viên, cần tư vấn chọn ERP. Budget nhỏ.' },
      { title: 'Custom CRM — Startup B',              source: 'REFERRAL'      as const, status: 'LOST'       as const, value: 120_000_000, assignee: uPm.id,    contact: 'hung.bq.refer@gmail.com',    notes: 'Quyết định tự build in-house. Mất deal do budget constraint.' },
    ];

    let leadCount = 0;
    for (const l of leadDefs) {
      const exists = await prisma.lead.findFirst({ where: { title: l.title } });
      if (exists) continue;
      await prisma.lead.create({
        data: {
          title: l.title, source: l.source, status: l.status,
          estimatedValue: l.value, assigneeId: l.assignee,
          contactId: l.contact ? contactMap[l.contact] : undefined,
          notes: l.notes,
          convertedAt: l.status === 'CONVERTED' ? new Date('2026-04-01') : undefined,
        },
      });
      leadCount++;
    }
    console.log(`  ✓ ${leadCount} leads mới (NEW/CONTACTED/QUALIFIED/CONVERTED/LOST)`);

    // ── 4. Deals mới ─────────────────────────────────────────────────────────
    const dealDefs = [
      {
        code: 'DEAL-005', title: 'MoMo Payment SDK Integration',
        custCode: 'MOMO', stage: 'PROPOSAL' as const, value: 320_000_000, probability: 55,
        assignee: uPm.id, expectedClose: '2026-08-31',
        notes: undefined, projectId: undefined,
      },
      {
        code: 'DEAL-006', title: 'Vingroup Smart Building IoT',
        custCode: 'VINGROUP', stage: 'NEGOTIATION' as const, value: 1_200_000_000, probability: 75,
        assignee: uAdmin.id, expectedClose: '2026-07-15',
        notes: undefined, projectId: undefined,
      },
      {
        code: 'DEAL-007', title: 'Techcombank Mobile Banking',
        custCode: 'TECHCOM', stage: 'QUALIFICATION' as const, value: 600_000_000, probability: 30,
        assignee: uPm.id, expectedClose: '2026-10-31',
        notes: undefined, projectId: undefined,
      },
      {
        code: 'DEAL-008', title: 'VNG Analytics Platform v2',
        custCode: 'VNG', stage: 'PROPOSAL' as const, value: 180_000_000, probability: 45,
        assignee: uAdmin.id, expectedClose: '2026-09-30',
        notes: undefined, projectId: undefined,
      },
      {
        code: 'DEAL-009', title: 'FPT DevOps Consulting',
        custCode: 'FPT', stage: 'LOST' as const, value: 95_000_000, probability: 0,
        assignee: uPm.id, expectedClose: '2026-03-31',
        lostReason: 'Khách chọn đối thủ cạnh tranh với giá thấp hơn 20%. Cần review pricing strategy.',
        projectId: undefined,
      },
      {
        code: 'DEAL-010', title: 'Vingroup HR Management System',
        custCode: 'VINGROUP', stage: 'WON' as const, value: 450_000_000, probability: 100,
        assignee: uAdmin.id, expectedClose: '2026-05-01',
        notes: undefined, projectId: undefined, wonAt: new Date('2026-05-01'),
      },
      {
        code: 'DEAL-011', title: 'VNPAY QR Gateway Integration',
        custCode: 'VNPAY', stage: 'NEGOTIATION' as const, value: 280_000_000, probability: 70,
        assignee: uPm.id, expectedClose: '2026-08-15',
        notes: undefined, projectId: undefined,
      },
      {
        code: 'DEAL-012', title: 'Tiki Seller Portal Upgrade',
        custCode: 'TIKI', stage: 'QUALIFICATION' as const, value: 250_000_000, probability: 20,
        assignee: uPm.id, expectedClose: '2026-11-30',
        notes: undefined, projectId: undefined,
      },
    ];

    for (const d of dealDefs) {
      const exists = await prisma.deal.findUnique({ where: { code: d.code } });
      if (exists) continue;
      await prisma.deal.create({
        data: {
          code: d.code, title: d.title, customerId: custMap[d.custCode],
          stage: d.stage, value: d.value, probability: d.probability,
          assigneeId: d.assignee,
          expectedCloseDate: new Date(d.expectedClose),
          projectId: d.projectId ?? null,
          lostReason: (d as any).lostReason ?? null,
          lostAt: d.stage === 'LOST' ? new Date('2026-03-31') : null,
          wonAt: (d as any).wonAt ?? null,
        },
      });
    }
    console.log(`  ✓ ${dealDefs.length} deals mới (PROPOSAL/NEGOTIATION/QUALIFICATION/WON/LOST)`);

    // ── 5. Link existing deals → projects ─────────────────────────────────────
    if (projFpt) {
      await prisma.deal.updateMany({ where: { code: 'DEAL-002' }, data: { projectId: projFpt.id, stage: 'WON', probability: 100, wonAt: new Date('2026-02-28') } });
    }
    if (projVtel) {
      await prisma.deal.updateMany({ where: { code: 'DEAL-003' }, data: { projectId: projVtel.id } });
    }
    console.log('  ✓ DEAL-002 (FPT ERP) → PROJ-FPT-001, DEAL-003 (Viettel) → PROJ-VTEL-001');

    // ── 6. Invoices liên kết với deal WON DEAL-010 (Vingroup HRM) ────────────
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@loop.vn' } });
    const vingroupId = custMap['VINGROUP'];
    const invExists = await prisma.invoice.findUnique({ where: { code: 'INV-VG-001' } });
    if (!invExists) {
      await prisma.invoice.create({
        data: {
          code: 'INV-VG-001', type: 'SALES', customerId: vingroupId,
          issueDate: new Date('2026-05-10'), dueDate: new Date('2026-06-10'),
          status: 'SENT', currency: 'VND',
          notes: 'Hóa đơn giai đoạn 1 — Vingroup HR Management System (DEAL-010)',
          subtotal: 150_000_000, taxAmount: 15_000_000, totalAmount: 165_000_000,
          createdById: adminUser.id,
          items: { create: [
            { description: 'Phân tích yêu cầu & thiết kế hệ thống', quantity: 1, unitPrice: 80_000_000, amount: 80_000_000, taxRate: 10 },
            { description: 'License phần mềm HR Module — năm đầu',  quantity: 1, unitPrice: 70_000_000, amount: 70_000_000, taxRate: 10 },
          ]},
        },
      });
      console.log('  ✓ INV-VG-001 (Vingroup HRM Phase 1, SENT 165M)');
    }

    const momoId = custMap['MOMO'];
    const invMomo = await prisma.invoice.findUnique({ where: { code: 'INV-MOMO-001' } });
    if (!invMomo) {
      await prisma.invoice.create({
        data: {
          code: 'INV-MOMO-001', type: 'SALES', customerId: momoId,
          issueDate: new Date('2026-04-01'), dueDate: new Date('2026-04-30'),
          status: 'PAID', currency: 'VND', paidAt: new Date('2026-04-28'),
          notes: 'Phí tư vấn khả thi & Proof of Concept — MoMo Payment SDK',
          subtotal: 50_000_000, taxAmount: 5_000_000, totalAmount: 55_000_000,
          createdById: adminUser.id,
          items: { create: [
            { description: 'Tư vấn & PoC Payment SDK Integration', quantity: 1, unitPrice: 50_000_000, amount: 50_000_000, taxRate: 10 },
          ]},
        },
      });
      console.log('  ✓ INV-MOMO-001 (MoMo PoC, PAID 55M)');
    }

  } catch (err) {
    console.error('  ✗ seedCrmEnriched error:', err);
  }
}

// ─── Recruitment Enriched Demo ────────────────────────────────────────────────

async function seedRecruitEnriched() {
  try {
    const check = await prisma.jobOpening.findUnique({ where: { code: 'JOB-2026-005' } });
    if (check) { console.log('  ✓ Recruit enriched demo already seeded, skipping'); return; }

    const uAdmin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@loop.vn' } });
    const uHr    = await prisma.user.findUniqueOrThrow({ where: { email: 'hr@loop.vn' } });
    const demoHash = await (await import('bcrypt')).hash('Demo@1234', 12);

    const orgDev = await prisma.orgUnit.findUniqueOrThrow({ where: { code: 'DEV' } });
    const orgHrd = await prisma.orgUnit.findUniqueOrThrow({ where: { code: 'HRD' } });
    const orgRoot = await prisma.orgUnit.findUniqueOrThrow({ where: { code: 'ROOT' } });

    // ── 1. Đóng JOB-2026-004 (Junior QA đã tuyển đủ) ────────────────────────
    await prisma.jobOpening.updateMany({
      where: { code: 'JOB-2026-004' },
      data: { status: 'CLOSED', closedAt: new Date('2026-05-15') },
    });
    console.log('  ✓ JOB-2026-004 (Junior QA) → CLOSED');

    // ── 2. Job Openings mới ───────────────────────────────────────────────────
    type JobDef = {
      code: string; title: string; orgUnitId: string; level: string;
      headcount: number; status: string; requirements: string;
      salaryFrom: number; salaryTo: number;
    };
    const newJobs: JobDef[] = [
      {
        code: 'JOB-2026-005', title: 'Product Manager — ERP Platform',
        orgUnitId: orgDev.id, level: 'SENIOR', headcount: 1, status: 'OPEN',
        requirements: '5+ years PM experience, SaaS/ERP background, agile methodologies, stakeholder management.',
        salaryFrom: 50_000_000, salaryTo: 80_000_000,
      },
      {
        code: 'JOB-2026-006', title: 'Data Engineer / Analytics',
        orgUnitId: orgDev.id, level: 'MID', headcount: 2, status: 'OPEN',
        requirements: 'Python, Apache Spark, Airflow, PostgreSQL/ClickHouse, 2+ years data pipeline experience.',
        salaryFrom: 30_000_000, salaryTo: 50_000_000,
      },
      {
        code: 'JOB-2026-007', title: 'HR Specialist — C&B',
        orgUnitId: orgHrd.id, level: 'MID', headcount: 1, status: 'OPEN',
        requirements: 'Compensation & Benefits, HRIS systems, labour law, 2+ years HR experience.',
        salaryFrom: 18_000_000, salaryTo: 28_000_000,
      },
      {
        code: 'JOB-2026-008', title: 'Business Development Manager',
        orgUnitId: orgRoot.id, level: 'SENIOR', headcount: 1, status: 'OPEN',
        requirements: 'IT/Software sales, B2B enterprise deals, 5+ years BDM, negotiation skills.',
        salaryFrom: 40_000_000, salaryTo: 70_000_000,
      },
      {
        code: 'JOB-2026-009', title: 'Mobile Developer (React Native)',
        orgUnitId: orgDev.id, level: 'MID', headcount: 2, status: 'OPEN',
        requirements: 'React Native, TypeScript, REST APIs, iOS/Android publish experience.',
        salaryFrom: 28_000_000, salaryTo: 45_000_000,
      },
      {
        code: 'JOB-2026-010', title: 'UX/UI Designer',
        orgUnitId: orgDev.id, level: 'MID', headcount: 1, status: 'ON_HOLD',
        requirements: 'Figma, Design Systems, user research, B2B SaaS product design portfolio.',
        salaryFrom: 20_000_000, salaryTo: 35_000_000,
      },
    ];

    const jobMap: Record<string, string> = {};
    for (const j of newJobs) {
      const row = await prisma.jobOpening.create({
        data: {
          code: j.code, title: j.title, orgUnitId: j.orgUnitId,
          level: j.level as any, headcount: j.headcount, status: j.status as any,
          requirements: j.requirements, salaryFrom: j.salaryFrom, salaryTo: j.salaryTo,
        },
        select: { id: true, code: true },
      });
      jobMap[j.code] = row.id;
    }
    // Load existing jobs
    for (const code of ['JOB-2026-001','JOB-2026-002','JOB-2026-003','JOB-2026-004']) {
      const row = await prisma.jobOpening.findUnique({ where: { code } });
      if (row) jobMap[code] = row.id;
    }
    console.log(`  ✓ ${newJobs.length} job openings mới`);

    // ── 3. HIRED candidates cho JOB-2026-004 (QA đã đóng) ────────────────────
    // EMP009 — Nguyễn Hữu Nam (QA 1)
    const namUser = await prisma.user.upsert({
      where: { email: 'nam.nh@loop.vn' },
      update: {},
      create: { email: 'nam.nh@loop.vn', passwordHash: demoHash, name: 'Nguyễn Hữu Nam', role: 'MEMBER', orgUnitId: orgDev.id },
    });
    const namEmp = await prisma.employee.upsert({
      where: { code: 'EMP009' }, update: {},
      create: { code: 'EMP009', userId: namUser.id, fullName: 'Nguyễn Hữu Nam', level: 'JUNIOR', orgUnitId: orgDev.id, startDate: new Date('2026-05-01') },
    });
    const namCand = await prisma.candidate.findFirst({ where: { email: 'ha.do@gmail.com' } });
    if (namCand && !namCand.employeeId) {
      await prisma.candidate.update({ where: { id: namCand.id }, data: { stage: 'HIRED', employeeId: namEmp.id } });
    }

    // EMP010 — Ngô Thị Hương (QA 2)
    const huongUser = await prisma.user.upsert({
      where: { email: 'huong.nt@loop.vn' },
      update: {},
      create: { email: 'huong.nt@loop.vn', passwordHash: demoHash, name: 'Ngô Thị Hương', role: 'MEMBER', orgUnitId: orgDev.id },
    });
    const huongEmp = await prisma.employee.upsert({
      where: { code: 'EMP010' }, update: {},
      create: { code: 'EMP010', userId: huongUser.id, fullName: 'Ngô Thị Hương', level: 'JUNIOR', orgUnitId: orgDev.id, startDate: new Date('2026-05-15') },
    });
    const huongCand = await prisma.candidate.findFirst({ where: { email: 'huong.ngo@gmail.com' } });
    if (huongCand && !huongCand.employeeId) {
      await prisma.candidate.update({ where: { id: huongCand.id }, data: { stage: 'HIRED', employeeId: huongEmp.id } });
    }
    // Interviews cho 2 QA được tuyển
    for (const { cand } of [{ cand: namCand }, { cand: huongCand }]) {
      if (!cand) continue;
      const ivExists = await prisma.interview.findFirst({ where: { candidateId: cand.id, type: 'PHONE' } });
      if (!ivExists) {
        await prisma.interview.create({ data: { candidateId: cand.id, type: 'PHONE',     scheduledAt: new Date('2026-04-20T10:00:00'), result: 'PASS', score: 82, notes: 'Junior level — phù hợp', interviewers: [uAdmin.id] } });
        await prisma.interview.create({ data: { candidateId: cand.id, type: 'TECHNICAL', scheduledAt: new Date('2026-04-28T14:00:00'), result: 'PASS', score: 78, notes: 'Selenium, test case design đạt yêu cầu', interviewers: [uAdmin.id] } });
      }
    }
    // Contracts
    for (const { emp, salary } of [{ emp: namEmp, salary: 16_000_000 }, { emp: huongEmp, salary: 15_000_000 }]) {
      const ct = await prisma.contract.findFirst({ where: { employeeId: emp.id } });
      if (!ct) await prisma.contract.create({ data: { employeeId: emp.id, type: 'FULL_TIME', status: 'ACTIVE', startDate: emp.startDate, endDate: new Date('2027-04-30'), salaryMonthly: salary } });
    }
    console.log('  ✓ EMP009 (Nguyễn Hữu Nam) + EMP010 (Ngô Thị Hương) → QA team, HIRED + contracts');

    // ── 4. Candidates mới ─────────────────────────────────────────────────────
    type CandDef = {
      jobCode: string; name: string; email: string; phone: string;
      stage: string; source: string; salary: number; notes?: string;
    };
    const newCandidates: CandDef[] = [
      // JOB-2026-005 — Product Manager
      { jobCode: 'JOB-2026-005', name: 'Nguyễn Thanh Minh',  email: 'minh.nt.pm@gmail.com',    phone: '0921001001', stage: 'SCREENING', source: 'REFERRAL',     salary: 70_000_000, notes: 'Giới thiệu bởi PM cũ của FPT project. 6 năm PM B2B SaaS.' },
      { jobCode: 'JOB-2026-005', name: 'Lý Thị Thu',         email: 'thu.lt.pm@gmail.com',     phone: '0921001002', stage: 'INTERVIEW', source: 'LINKEDIN'  as any, salary: 65_000_000, notes: 'Profile LinkedIn ấn tượng. ERP PM 4 năm tại SAP partner.' },
      { jobCode: 'JOB-2026-005', name: 'Cao Minh Trí',       email: 'tri.cm.pm@gmail.com',     phone: '0921001003', stage: 'APPLIED',   source: 'WEBSITE',      salary: 75_000_000 },
      // JOB-2026-006 — Data Engineer
      { jobCode: 'JOB-2026-006', name: 'Đặng Văn Hùng',      email: 'hung.dv.de@gmail.com',    phone: '0921001004', stage: 'OFFER',     source: 'REFERRAL',     salary: 45_000_000, notes: 'Offer đã gửi 50M gross. Đang chờ phản hồi trong tuần này.' },
      { jobCode: 'JOB-2026-006', name: 'Bùi Thị Loan',       email: 'loan.bt.de@gmail.com',    phone: '0921001005', stage: 'INTERVIEW', source: 'SOCIAL',       salary: 40_000_000, notes: 'Spark + Airflow proficient. Cần check Python skill thêm.' },
      { jobCode: 'JOB-2026-006', name: 'Tạ Quang Vinh',      email: 'vinh.tq.de@gmail.com',    phone: '0921001006', stage: 'SCREENING', source: 'WEBSITE',      salary: 38_000_000 },
      { jobCode: 'JOB-2026-006', name: 'Ngô Thị Kim Anh',    email: 'anh.ntk.de@gmail.com',    phone: '0921001007', stage: 'APPLIED',   source: 'EVENT',        salary: 42_000_000 },
      // JOB-2026-002 — Backend NestJS (còn 2 headcount cần tuyển)
      { jobCode: 'JOB-2026-002', name: 'Trịnh Minh Khoa',    email: 'khoa.tm.be@gmail.com',    phone: '0921001008', stage: 'OFFER',     source: 'REFERRAL',     salary: 38_000_000, notes: 'Offer 40M gross. NestJS + PostgreSQL solid.' },
      { jobCode: 'JOB-2026-002', name: 'Phan Thị Mai',       email: 'mai.pt.be@gmail.com',     phone: '0921001009', stage: 'SCREENING', source: 'WEBSITE',      salary: 32_000_000 },
      { jobCode: 'JOB-2026-002', name: 'Đinh Văn Sơn',       email: 'son.dv.be@gmail.com',     phone: '0921001010', stage: 'APPLIED',   source: 'SOCIAL',       salary: 35_000_000 },
      // JOB-2026-007 — HR Specialist
      { jobCode: 'JOB-2026-007', name: 'Lê Ngọc Ánh',        email: 'anh.ln.hr@gmail.com',     phone: '0921001011', stage: 'INTERVIEW', source: 'REFERRAL',     salary: 25_000_000, notes: 'HR 3 năm, thành thạo C&B và luật lao động.' },
      { jobCode: 'JOB-2026-007', name: 'Phạm Thu Trang',     email: 'trang.pt.hr@gmail.com',   phone: '0921001012', stage: 'APPLIED',   source: 'WEBSITE',      salary: 22_000_000 },
      // JOB-2026-008 — BDM
      { jobCode: 'JOB-2026-008', name: 'Vũ Hoàng Long',      email: 'long.vh.bdm@gmail.com',   phone: '0921001013', stage: 'INTERVIEW', source: 'REFERRAL',     salary: 65_000_000, notes: 'BDM 6 năm IT sector. Network rộng ở fintech.' },
      { jobCode: 'JOB-2026-008', name: 'Trần Khánh Linh',    email: 'linh.tk.bdm@gmail.com',   phone: '0921001014', stage: 'SCREENING', source: 'LINKEDIN' as any, salary: 60_000_000 },
      { jobCode: 'JOB-2026-008', name: 'Nguyễn Bảo Châu',    email: 'chau.nb.bdm@gmail.com',   phone: '0921001015', stage: 'APPLIED',   source: 'COLD_OUTREACH' as any, salary: 55_000_000 },
      // JOB-2026-009 — Mobile
      { jobCode: 'JOB-2026-009', name: 'Hoàng Đức Anh',      email: 'anh.hd.mob@gmail.com',    phone: '0921001016', stage: 'SCREENING', source: 'SOCIAL',       salary: 40_000_000 },
      { jobCode: 'JOB-2026-009', name: 'Lê Thị Cẩm Vân',    email: 'van.ltc.mob@gmail.com',   phone: '0921001017', stage: 'APPLIED',   source: 'WEBSITE',      salary: 38_000_000 },
      { jobCode: 'JOB-2026-009', name: 'Bùi Minh Hiếu',      email: 'hieu.bm.mob@gmail.com',   phone: '0921001018', stage: 'INTERVIEW', source: 'EVENT',        salary: 42_000_000, notes: 'React Native 3 năm, đã publish 2 app production.' },
    ];

    let candCount = 0;
    for (const def of newCandidates) {
      const exists = await prisma.candidate.findFirst({ where: { email: def.email } });
      if (exists) continue;
      const jobId = jobMap[def.jobCode];
      if (!jobId) continue;
      await prisma.candidate.create({
        data: {
          name: def.name, email: def.email, phone: def.phone,
          jobOpeningId: jobId, stage: def.stage as any, source: def.source as any,
          expectedSalary: def.salary, notes: def.notes ?? null, assigneeId: uHr.id,
        },
      });
      candCount++;
    }
    console.log(`  ✓ ${candCount} candidates mới trải đều 6 job openings`);

    // ── 5. Interviews cho candidates ở INTERVIEW / OFFER stage ───────────────
    const interviewSetups = [
      // PM — Lý Thị Thu (INTERVIEW)
      { email: 'thu.lt.pm@gmail.com',   ivs: [
        { type: 'PHONE',     at: '2026-05-20T10:00:00', result: 'PASS',    score: 88, note: 'Kinh nghiệm ERP, giao tiếp xuất sắc' },
        { type: 'TECHNICAL', at: '2026-05-28T14:00:00', result: 'PENDING', score: null, note: null },
      ]},
      // Data Engineer — Đặng Văn Hùng (OFFER)
      { email: 'hung.dv.de@gmail.com',  ivs: [
        { type: 'PHONE',     at: '2026-05-05T10:00:00', result: 'PASS',    score: 90, note: 'Python, Spark vững' },
        { type: 'TECHNICAL', at: '2026-05-12T14:00:00', result: 'PASS',    score: 86, note: 'Bài test Airflow DAG đạt 86/100' },
        { type: 'HR',        at: '2026-05-19T10:00:00', result: 'PASS',    score: 92, note: 'Phù hợp văn hóa, kỳ vọng lương 45M' },
      ]},
      // Data Engineer — Bùi Thị Loan (INTERVIEW)
      { email: 'loan.bt.de@gmail.com',  ivs: [
        { type: 'PHONE',     at: '2026-05-22T10:00:00', result: 'PASS',    score: 82, note: 'Data pipeline background OK' },
        { type: 'TECHNICAL', at: '2026-06-02T14:00:00', result: 'PENDING', score: null, note: null },
      ]},
      // Backend — Trịnh Minh Khoa (OFFER)
      { email: 'khoa.tm.be@gmail.com',  ivs: [
        { type: 'PHONE',     at: '2026-05-08T10:00:00', result: 'PASS',    score: 85, note: 'NestJS, PostgreSQL proficient' },
        { type: 'TECHNICAL', at: '2026-05-16T14:00:00', result: 'PASS',    score: 82, note: 'Code challenge score 82/100' },
        { type: 'HR',        at: '2026-05-23T10:00:00', result: 'PASS',    score: 88, note: 'Team fit tốt, lương 40M gross agreed' },
      ]},
      // HR Specialist — Lê Ngọc Ánh (INTERVIEW)
      { email: 'anh.ln.hr@gmail.com',   ivs: [
        { type: 'PHONE',     at: '2026-05-21T10:00:00', result: 'PASS',    score: 87, note: 'Luật lao động, C&B nắm vững' },
        { type: 'HR',        at: '2026-05-29T10:00:00', result: 'PENDING', score: null, note: null },
      ]},
      // BDM — Vũ Hoàng Long (INTERVIEW)
      { email: 'long.vh.bdm@gmail.com', ivs: [
        { type: 'PHONE',     at: '2026-05-18T10:00:00', result: 'PASS',    score: 91, note: 'Network mạnh fintech, target 65M' },
        { type: 'TECHNICAL', at: '2026-05-26T14:00:00', result: 'PASS',    score: 89, note: 'Case study deal closing đạt' },
        { type: 'FINAL',     at: '2026-06-04T09:00:00', result: 'PENDING', score: null, note: null },
      ]},
      // Mobile — Bùi Minh Hiếu (INTERVIEW)
      { email: 'hieu.bm.mob@gmail.com', ivs: [
        { type: 'PHONE',     at: '2026-05-24T10:00:00', result: 'PASS',    score: 84, note: 'React Native experience verified' },
        { type: 'TECHNICAL', at: '2026-06-03T14:00:00', result: 'PENDING', score: null, note: null },
      ]},
    ];

    let ivCount = 0;
    for (const setup of interviewSetups) {
      const cand = await prisma.candidate.findFirst({ where: { email: setup.email } });
      if (!cand) continue;
      for (const iv of setup.ivs) {
        const exists = await prisma.interview.findFirst({ where: { candidateId: cand.id, type: iv.type as any } });
        if (exists) continue;
        await prisma.interview.create({
          data: {
            candidateId: cand.id, type: iv.type as any,
            scheduledAt: new Date(iv.at), result: iv.result as any,
            score: iv.score ?? undefined, notes: iv.note ?? undefined,
            interviewers: [uAdmin.id], location: 'Meeting Room B',
          },
        });
        ivCount++;
      }
    }
    console.log(`  ✓ ${ivCount} interviews seeded cho candidates mới`);

  } catch (err) {
    console.error('  ✗ seedRecruitEnriched error:', err);
  }
}

async function seedChartOfAccounts() {
  try {
    const accounts = [
      // Loại 1 — Tài sản ngắn hạn
      { code: '111',  name: 'Tiền mặt',                              type: 'ASSET',     parentCode: null },
      { code: '1111', name: 'Tiền Việt Nam',                         type: 'ASSET',     parentCode: '111' },
      { code: '1112', name: 'Ngoại tệ',                              type: 'ASSET',     parentCode: '111' },
      { code: '112',  name: 'Tiền gửi ngân hàng',                    type: 'ASSET',     parentCode: null },
      { code: '1121', name: 'Tiền gửi ngân hàng VND',                type: 'ASSET',     parentCode: '112' },
      { code: '1122', name: 'Tiền gửi ngân hàng ngoại tệ',           type: 'ASSET',     parentCode: '112' },
      { code: '131',  name: 'Phải thu của khách hàng',               type: 'ASSET',     parentCode: null },
      { code: '133',  name: 'Thuế GTGT được khấu trừ',               type: 'ASSET',     parentCode: null },
      { code: '1331', name: 'Thuế GTGT hàng hóa dịch vụ',            type: 'ASSET',     parentCode: '133' },
      { code: '141',  name: 'Tạm ứng',                               type: 'ASSET',     parentCode: null },
      { code: '152',  name: 'Nguyên liệu, vật liệu',                 type: 'ASSET',     parentCode: null },
      { code: '153',  name: 'Công cụ, dụng cụ',                      type: 'ASSET',     parentCode: null },
      { code: '156',  name: 'Hàng hóa',                              type: 'ASSET',     parentCode: null },
      // Loại 2 — Tài sản dài hạn
      { code: '211',  name: 'Tài sản cố định hữu hình',              type: 'ASSET',     parentCode: null },
      { code: '2141', name: 'Hao mòn TSCĐ hữu hình',                 type: 'ASSET',     parentCode: null },
      { code: '242',  name: 'Chi phí trả trước dài hạn',             type: 'ASSET',     parentCode: null },
      // Loại 3 — Nợ phải trả
      { code: '311',  name: 'Vay và nợ thuê tài chính ngắn hạn',     type: 'LIABILITY', parentCode: null },
      { code: '331',  name: 'Phải trả cho người bán',                 type: 'LIABILITY', parentCode: null },
      { code: '3311', name: 'Phải trả người bán trong nước',          type: 'LIABILITY', parentCode: '331' },
      { code: '333',  name: 'Thuế và các khoản phải nộp nhà nước',   type: 'LIABILITY', parentCode: null },
      { code: '3331', name: 'Thuế GTGT phải nộp',                    type: 'LIABILITY', parentCode: '333' },
      { code: '3334', name: 'Thuế thu nhập doanh nghiệp',             type: 'LIABILITY', parentCode: '333' },
      { code: '334',  name: 'Phải trả người lao động',               type: 'LIABILITY', parentCode: null },
      { code: '3341', name: 'Phải trả công nhân viên',               type: 'LIABILITY', parentCode: '334' },
      { code: '335',  name: 'Chi phí phải trả ngắn hạn',             type: 'LIABILITY', parentCode: null },
      { code: '338',  name: 'Phải trả, phải nộp khác',               type: 'LIABILITY', parentCode: null },
      { code: '3382', name: 'Kinh phí công đoàn',                    type: 'LIABILITY', parentCode: '338' },
      { code: '3383', name: 'Bảo hiểm xã hội',                       type: 'LIABILITY', parentCode: '338' },
      { code: '3384', name: 'Bảo hiểm y tế',                         type: 'LIABILITY', parentCode: '338' },
      // Loại 4 — Vốn chủ sở hữu
      { code: '411',  name: 'Vốn đầu tư của chủ sở hữu',            type: 'EQUITY',    parentCode: null },
      { code: '4111', name: 'Vốn góp của chủ sở hữu',               type: 'EQUITY',    parentCode: '411' },
      { code: '421',  name: 'Lợi nhuận sau thuế chưa phân phối',     type: 'EQUITY',    parentCode: null },
      { code: '4211', name: 'LNST chưa PP năm trước',                type: 'EQUITY',    parentCode: '421' },
      { code: '4212', name: 'LNST chưa PP năm nay',                  type: 'EQUITY',    parentCode: '421' },
      // Loại 5 — Doanh thu
      { code: '511',  name: 'Doanh thu bán hàng và cung cấp dịch vụ', type: 'REVENUE',  parentCode: null },
      { code: '5111', name: 'Doanh thu bán hàng hóa',                type: 'REVENUE',   parentCode: '511' },
      { code: '5113', name: 'Doanh thu cung cấp dịch vụ',            type: 'REVENUE',   parentCode: '511' },
      { code: '515',  name: 'Doanh thu hoạt động tài chính',         type: 'REVENUE',   parentCode: null },
      // Loại 6 — Chi phí sản xuất kinh doanh
      { code: '621',  name: 'Chi phí nguyên liệu, vật liệu trực tiếp', type: 'EXPENSE', parentCode: null },
      { code: '622',  name: 'Chi phí nhân công trực tiếp',           type: 'EXPENSE',   parentCode: null },
      { code: '627',  name: 'Chi phí sản xuất chung',                type: 'EXPENSE',   parentCode: null },
      { code: '641',  name: 'Chi phí bán hàng',                      type: 'EXPENSE',   parentCode: null },
      { code: '6411', name: 'Chi phí nhân viên bán hàng',            type: 'EXPENSE',   parentCode: '641' },
      { code: '642',  name: 'Chi phí quản lý doanh nghiệp',          type: 'EXPENSE',   parentCode: null },
      { code: '6421', name: 'Chi phí nhân viên quản lý',             type: 'EXPENSE',   parentCode: '642' },
      { code: '6422', name: 'Chi phí vật liệu văn phòng',            type: 'EXPENSE',   parentCode: '642' },
      { code: '6423', name: 'Chi phí dịch vụ mua ngoài',             type: 'EXPENSE',   parentCode: '642' },
      { code: '635',  name: 'Chi phí tài chính',                     type: 'EXPENSE',   parentCode: null },
    ];

    let count = 0;
    for (const acc of accounts) {
      await (prisma as any).chartOfAccount.upsert({
        where: { code: acc.code },
        update: { name: acc.name, type: acc.type as any, parentCode: acc.parentCode, isActive: true },
        create: { code: acc.code, name: acc.name, type: acc.type as any, parentCode: acc.parentCode, isActive: true },
      });
      count++;
    }
    console.log(`  ✓ ${count} tài khoản kế toán TT200 đã seed`);
  } catch (err) {
    console.error('  ✗ seedChartOfAccounts error:', err);
  }
}

async function seedHrExtDemo() {
  try {
    const employees = await prisma.employee.findMany({ take: 6, orderBy: { createdAt: 'asc' } });
    if (employees.length < 2) { console.log('  ⚠ Không đủ nhân viên để seed HR ext demo'); return; }

    // Training programs
    const programs = [
      { title: 'Kỹ năng lãnh đạo cơ bản', type: 'internal' as const, durationHours: 16, description: 'Chương trình nội bộ phát triển kỹ năng quản lý nhóm' },
      { title: 'Chứng chỉ PMP', type: 'external' as const, durationHours: 40, description: 'Chứng chỉ quản lý dự án quốc tế PMI' },
      { title: 'AWS Cloud Practitioner', type: 'external' as const, durationHours: 24, description: 'Nền tảng điện toán đám mây Amazon Web Services' },
      { title: 'Quy trình nội bộ Loop ERP', type: 'internal' as const, durationHours: 8, description: 'Hướng dẫn sử dụng hệ thống Loop ERP cho nhân viên mới' },
    ];

    const createdPrograms: any[] = [];
    for (const p of programs) {
      const existing = await (prisma as any).trainingProgram.findFirst({ where: { title: p.title } });
      if (existing) { createdPrograms.push(existing); continue; }
      const created = await (prisma as any).trainingProgram.create({ data: p });
      createdPrograms.push(created);
    }
    console.log(`  ✓ ${createdPrograms.length} training programs seeded`);

    // Training records
    const statuses = ['COMPLETED', 'IN_PROGRESS', 'SCHEDULED', 'COMPLETED'];
    let recCount = 0;
    for (let i = 0; i < Math.min(employees.length, 4); i++) {
      const emp = employees[i];
      const prog = createdPrograms[i % createdPrograms.length];
      const existing = await (prisma as any).trainingRecord.findFirst({ where: { employeeId: emp.id, programId: prog.id } });
      if (existing) continue;
      await (prisma as any).trainingRecord.create({
        data: {
          employeeId: emp.id,
          programId: prog.id,
          startDate: new Date('2026-01-15'),
          endDate: statuses[i] === 'COMPLETED' ? new Date('2026-02-28') : null,
          status: statuses[i],
          score: statuses[i] === 'COMPLETED' ? 85 + i * 3 : null,
        },
      });
      recCount++;
    }
    console.log(`  ✓ ${recCount} training records seeded`);

    // Performance reviews
    const reviewer = employees[0];
    const periods = ['2025-H2', '2026-H1'];
    let revCount = 0;
    for (let i = 1; i < Math.min(employees.length, 5); i++) {
      const emp = employees[i];
      const period = periods[i % 2];
      const existing = await (prisma as any).performanceReview.findFirst({ where: { employeeId: emp.id, period } });
      if (existing) continue;
      const score = 3 + (i % 3) * 0.5;
      await (prisma as any).performanceReview.create({
        data: {
          employeeId: emp.id,
          reviewerId: reviewer.id,
          period,
          score,
          strengths: 'Chủ động, hoàn thành đúng tiến độ, giao tiếp tốt với team.',
          improvements: 'Cần cải thiện kỹ năng báo cáo và quản lý thời gian.',
          goals: 'Đạt chứng chỉ chuyên môn, lead 1 dự án trong kỳ tiếp theo.',
          status: i < 3 ? 'APPROVED' : 'SUBMITTED',
          submittedAt: new Date('2026-01-10'),
          approvedAt: i < 3 ? new Date('2026-01-20') : null,
        },
      });
      revCount++;
    }
    console.log(`  ✓ ${revCount} performance reviews seeded`);
  } catch (err) {
    console.error('  ✗ seedHrExtDemo error:', err);
  }
}

main().finally(() => prisma.$disconnect());
