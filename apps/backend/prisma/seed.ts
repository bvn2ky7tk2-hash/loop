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

async function seedTenant() {
  const count = await prisma.tenant.count();
  if (count > 0) return;
  await prisma.tenant.create({
    data: {
      name: 'Loop 360 Demo',
      slug: 'demo',
      primaryColor: '#6366F1',
      address: 'Hà Nội, Việt Nam',
      timezone: 'Asia/Ho_Chi_Minh',
      isDefault: true,
    },
  });
  console.log('✅ Tenant seeded');
}

async function main() {
  const hash     = await bcrypt.hash('admin', 12);
  const demoHash = await bcrypt.hash('Demo@1234', 12);

  const orgUnit = await prisma.orgUnit.findFirst({ where: { code: 'ROOT' } })
    ?? await prisma.orgUnit.create({ data: { name: 'Công ty', code: 'ROOT' } });

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

  console.log('Seeding tenant...');
  await seedTenant();
  console.log('Seeding permissions...');
  await seedPermissions();
  console.log('Seeding screens registry...');
  await seedScreens();
  console.log('Seeding permission demo data...');
  await seedPermissionDemo();
  console.log('Seeding user groups demo...');
  await seedUserGroupsDemo(orgUnit.id);

  console.log('Seeding Phase 2 demo data...');
  await seedPhase2Demo();

  console.log('Seeding BPM process definitions...');
  await seedProcessDefinitions(orgUnit.id);

  console.log('Seeding Phase 3A CRM demo data...');
  await seedCrmDemo();

  console.log('Seeding CRM Client Contracts demo data...');
  await seedClientContractsDemo();

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

  console.log('Seeding Bug & Issue demo data...');
  await seedBugsDemo();

  console.log('Seeding Accounting Chart of Accounts (TT200)...');
  await seedChartOfAccounts();

  console.log('Seeding HR Training & Performance demo data...');
  await seedHrExtDemo();

  console.log('Seeding Payroll Compliance config (BHXH, TNCN, giảm trừ, lương vùng)...');
  await seedPayrollComplianceConfig();

  console.log('Patching payroll records March/April 2026 (recalc BHXH/TNCN)...');
  await seedPayrollPatch();

  console.log('Seeding Skills & Employee Skill Matrix...');
  await seedSkillsDemo();

  console.log('Seeding OKR & KPI demo data...');
  await seedOkrDemo();

  console.log('Seeding Accounting journal entries demo...');
  await seedAccountingDemo();

  console.log('Seeding HR v4.0 demo data (JobTitles, Positions, LeavePolicies, Decisions, Insurance, Attendance)...');
  await seedHrV4Demo();

  console.log('Seeding HR v4.0 missing data (WorkHistory, Insurance, Attendance)...');
  await seedHrV4Missing();

  console.log('Seeding OT requests demo data...');
  await seedOvertimeRequestsDemo();

  console.log('Seeding Work Shifts demo data...');
  await seedWorkShifts();

  console.log('Seeding Work Schedules demo data...');
  await seedWorkSchedules();

  console.log('Seeding Feed posts...');
  await seedFeedPosts();
  console.log('Seeding Meeting rooms & bookings...');
  await seedMeetingRooms();
  console.log('Seeding Vehicles & requests...');
  await seedVehicles();
  console.log('Seeding Calendar events...');
  await seedCalendarEvents();
  console.log('Seeding Knowledge Base...');
  await seedKnowledgeBase();
  console.log('Seeding Vendors & Purchase Orders...');
  await seedVendors();
  console.log('Seeding Automation Rules...');
  await seedAutomationRules();
  console.log('Seeding Scheduled Reports...');
  await seedScheduledReports();

  console.log('✅ Seed xong: admin@loop.vn / admin | pm@loop.vn / admin | user.demo@loop.vn / Demo@1234');
}

async function seedPayrollPatch() {
  const rateMap: Record<string, number> = {
    EMP001: 2_500_000, EMP002: 2_000_000, EMP003: 1_500_000,
    EMP004: 1_800_000, EMP005: 1_600_000, EMP006: 1_900_000, EMP007: 1_400_000,
  };
  const targetPeriods = ['Tháng 3/2026', 'Tháng 4/2026'];

  for (const periodName of targetPeriods) {
    const pp = await prisma.payrollPeriod.findFirst({ where: { name: periodName } });
    if (!pp) continue;

    // Force recreate records với compliance đầy đủ
    await prisma.payrollRecord.deleteMany({ where: { periodId: pp.id } });

    const employees = await prisma.employee.findMany({
      where: { code: { in: Object.keys(rateMap) } },
      select: { id: true, code: true },
    });
    for (const emp of employees) {
      const rate = rateMap[emp.code];
      if (!rate) continue;
      const rec = calcPayrollCompliance({ dailyRate: rate, workDays: 22, overtimeHours: 4, dependentCount: 0 });
      await prisma.payrollRecord.create({ data: { periodId: pp.id, employeeId: emp.id, ...rec } });
    }
    console.log(`  ✓ ${periodName}: ${employees.length} records patched với BHXH/TNCN đầy đủ`);
  }
}

async function seedSkillsDemo() {
  try {
    const existing = await prisma.skill.count();
    if (existing > 0) {
      console.log(`  ⏭  ${existing} skills đã tồn tại, bỏ qua`);
      return;
    }

    const skillDefs: Array<{ name: string; category: string; description?: string }> = [
      // Technical
      { name: 'TypeScript',        category: 'TECHNICAL', description: 'Lập trình TypeScript / JavaScript' },
      { name: 'React',             category: 'TECHNICAL', description: 'Frontend framework React.js' },
      { name: 'NestJS',            category: 'TECHNICAL', description: 'Backend framework NestJS' },
      { name: 'Node.js',           category: 'TECHNICAL', description: 'Runtime Node.js' },
      { name: 'PostgreSQL',        category: 'TECHNICAL', description: 'Cơ sở dữ liệu quan hệ PostgreSQL' },
      { name: 'Prisma ORM',        category: 'TECHNICAL', description: 'ORM Prisma cho Node.js' },
      { name: 'Docker',            category: 'TECHNICAL', description: 'Container hóa với Docker' },
      { name: 'Git',               category: 'TECHNICAL', description: 'Quản lý phiên bản Git' },
      { name: 'Redis',             category: 'TECHNICAL', description: 'In-memory cache Redis' },
      { name: 'REST API',          category: 'TECHNICAL', description: 'Thiết kế và tích hợp REST API' },
      { name: 'GraphQL',           category: 'TECHNICAL', description: 'Query language GraphQL' },
      { name: 'React Native',      category: 'TECHNICAL', description: 'Mobile development React Native' },
      { name: 'Python',            category: 'TECHNICAL', description: 'Lập trình Python' },
      { name: 'Java / Spring Boot',category: 'TECHNICAL', description: 'Backend Java với Spring Boot' },
      { name: 'AWS',               category: 'TECHNICAL', description: 'Dịch vụ đám mây AWS' },
      { name: 'CI/CD',             category: 'TECHNICAL', description: 'Triển khai liên tục CI/CD pipelines' },
      { name: 'Figma',             category: 'TECHNICAL', description: 'Thiết kế UI/UX với Figma' },
      // Soft skills
      { name: 'Communication',     category: 'SOFT', description: 'Kỹ năng giao tiếp và trình bày' },
      { name: 'Problem Solving',   category: 'SOFT', description: 'Tư duy phân tích và giải quyết vấn đề' },
      { name: 'Teamwork',          category: 'SOFT', description: 'Làm việc nhóm hiệu quả' },
      { name: 'Leadership',        category: 'SOFT', description: 'Kỹ năng lãnh đạo và quản lý' },
      { name: 'Time Management',   category: 'SOFT', description: 'Quản lý thời gian và ưu tiên công việc' },
      // Domain
      { name: 'ERP Systems',       category: 'DOMAIN', description: 'Kinh nghiệm hệ thống ERP' },
      { name: 'Agile / Scrum',     category: 'DOMAIN', description: 'Phương pháp luận Agile và Scrum' },
      { name: 'System Design',     category: 'DOMAIN', description: 'Thiết kế kiến trúc hệ thống' },
      // Language
      { name: 'Tiếng Anh',         category: 'LANGUAGE', description: 'Đọc/viết/nói tiếng Anh' },
      { name: 'Tiếng Nhật',        category: 'LANGUAGE', description: 'Tiếng Nhật (JLPT N3+)' },
      // Certification
      { name: 'AWS Solutions Architect', category: 'CERTIFICATION', description: 'AWS Certified Solutions Architect' },
      { name: 'PMP',               category: 'CERTIFICATION', description: 'Project Management Professional' },
    ];

    const skills = await Promise.all(
      skillDefs.map(s => prisma.skill.create({ data: s as any }))
    );
    const skillMap = Object.fromEntries(skills.map(s => [s.name, s.id]));

    // Gán kỹ năng cho 7 demo employees
    const employees = await prisma.employee.findMany({
      where: { code: { in: ['EMP001','EMP002','EMP003','EMP004','EMP005','EMP006','EMP007'] } },
      select: { id: true, code: true },
    });

    const assignments: Array<{ code: string; skills: Array<{ name: string; level: string }> }> = [
      { code: 'EMP001', skills: [
        { name: 'TypeScript', level: 'EXPERT' }, { name: 'NestJS', level: 'EXPERT' },
        { name: 'System Design', level: 'ADVANCED' }, { name: 'Leadership', level: 'ADVANCED' },
        { name: 'Tiếng Anh', level: 'ADVANCED' }, { name: 'Agile / Scrum', level: 'ADVANCED' },
      ]},
      { code: 'EMP002', skills: [
        { name: 'Agile / Scrum', level: 'EXPERT' }, { name: 'Leadership', level: 'EXPERT' },
        { name: 'Communication', level: 'ADVANCED' }, { name: 'TypeScript', level: 'INTERMEDIATE' },
        { name: 'PMP', level: 'ADVANCED' }, { name: 'Tiếng Anh', level: 'EXPERT' },
      ]},
      { code: 'EMP003', skills: [
        { name: 'React', level: 'EXPERT' }, { name: 'TypeScript', level: 'ADVANCED' },
        { name: 'Figma', level: 'INTERMEDIATE' }, { name: 'React Native', level: 'INTERMEDIATE' },
        { name: 'Git', level: 'ADVANCED' },
      ]},
      { code: 'EMP004', skills: [
        { name: 'Communication', level: 'EXPERT' }, { name: 'ERP Systems', level: 'ADVANCED' },
        { name: 'Teamwork', level: 'ADVANCED' }, { name: 'Tiếng Anh', level: 'INTERMEDIATE' },
        { name: 'Time Management', level: 'ADVANCED' },
      ]},
      { code: 'EMP005', skills: [
        { name: 'PostgreSQL', level: 'EXPERT' }, { name: 'ERP Systems', level: 'ADVANCED' },
        { name: 'Python', level: 'INTERMEDIATE' }, { name: 'Problem Solving', level: 'ADVANCED' },
        { name: 'Tiếng Anh', level: 'INTERMEDIATE' },
      ]},
      { code: 'EMP006', skills: [
        { name: 'NestJS', level: 'ADVANCED' }, { name: 'Node.js', level: 'ADVANCED' },
        { name: 'Docker', level: 'INTERMEDIATE' }, { name: 'PostgreSQL', level: 'INTERMEDIATE' },
        { name: 'Git', level: 'ADVANCED' }, { name: 'CI/CD', level: 'BEGINNER' },
      ]},
      { code: 'EMP007', skills: [
        { name: 'React', level: 'ADVANCED' }, { name: 'TypeScript', level: 'INTERMEDIATE' },
        { name: 'Figma', level: 'BEGINNER' }, { name: 'Communication', level: 'INTERMEDIATE' },
        { name: 'Git', level: 'INTERMEDIATE' },
      ]},
    ];

    let empSkillCount = 0;
    for (const emp of employees) {
      const asgn = assignments.find(a => a.code === emp.code);
      if (!asgn) continue;
      for (const s of asgn.skills) {
        const skillId = skillMap[s.name];
        if (!skillId) continue;
        await prisma.employeeSkill.create({
          data: { employeeId: emp.id, skillId, level: s.level as any, certifiedAt: new Date('2026-01-01') },
        });
        empSkillCount++;
      }
    }
    console.log(`  ✓ ${skills.length} skills seeded, ${empSkillCount} employee-skill assignments`);
  } catch (err) {
    console.error('  ✗ seedSkillsDemo error:', err);
  }
}

async function seedOkrDemo() {
  try {
    const existing = await prisma.okrObjective.count();
    if (existing > 0) {
      console.log(`  ⏭  ${existing} OKR objectives đã tồn tại, bỏ qua`);
      return;
    }

    const uAdmin = await prisma.user.findUnique({ where: { email: 'admin@loop.vn' } });
    const uPm    = await prisma.user.findUnique({ where: { email: 'pm@loop.vn' } });
    const uHr    = await prisma.user.findUnique({ where: { email: 'hr@loop.vn' } });
    if (!uAdmin || !uPm) { console.log('  ⚠ Chưa có users, bỏ qua seed OKR'); return; }

    const orgDev = await prisma.orgUnit.findFirst({ where: { code: 'DEV' } });
    const orgHrd = await prisma.orgUnit.findFirst({ where: { code: 'HRD' } });

    // ── Objectives Q2/2026 ────────────────────────────────────────────────────
    const objectives = [
      {
        title: 'Nâng cao chất lượng sản phẩm và tốc độ giao hàng',
        description: 'Cải thiện quy trình dev để giảm bug rate và tăng tốc độ release trong Q2/2026',
        cycle: 'Q2', year: 2026, ownerId: uPm.id,
        orgUnitId: orgDev?.id ?? null, status: 'ACTIVE',
        krs: [
          { title: 'Giảm bug rate xuống dưới 2 bugs/sprint', targetValue: 2, unit: 'bugs/sprint', currentValue: 3.5, startValue: 5 },
          { title: 'Đạt 85% test coverage trên backend', targetValue: 85, unit: '%', currentValue: 72, startValue: 60 },
          { title: 'Rút ngắn thời gian từ code→production xuống <3 ngày', targetValue: 3, unit: 'ngày', currentValue: 4.5, startValue: 7 },
        ],
      },
      {
        title: 'Xây dựng đội ngũ kỹ sư mạnh, gắn kết lâu dài',
        description: 'Tập trung phát triển năng lực kỹ thuật và giữ chân nhân tài trong Q2/2026',
        cycle: 'Q2', year: 2026, ownerId: uHr?.id ?? uAdmin.id,
        orgUnitId: orgHrd?.id ?? null, status: 'ACTIVE',
        krs: [
          { title: 'Hoàn thành 100% kế hoạch đào tạo kỹ thuật Q2', targetValue: 100, unit: '%', currentValue: 65, startValue: 0 },
          { title: 'Giữ tỷ lệ nghỉ việc dưới 5% trong Q2', targetValue: 5, unit: '%', currentValue: 2, startValue: 0 },
          { title: 'Mỗi dev Senior/Expert mentor ít nhất 1 Junior', targetValue: 5, unit: 'cặp', currentValue: 3, startValue: 0 },
        ],
      },
      {
        title: 'Tăng doanh thu từ khách hàng hiện tại lên 20%',
        description: 'Upsell và gia hạn hợp đồng với top 5 khách hàng hiện tại trong H1/2026',
        cycle: 'H1', year: 2026, ownerId: uAdmin.id,
        orgUnitId: null, status: 'ACTIVE',
        krs: [
          { title: 'Ký gia hạn hợp đồng với FPT và Viettel', targetValue: 2, unit: 'hợp đồng', currentValue: 1, startValue: 0 },
          { title: 'Upsell thêm module mới cho 3 KH cũ', targetValue: 3, unit: 'KH', currentValue: 1, startValue: 0 },
          { title: 'Tăng ARR từ 1.4 tỷ lên 1.68 tỷ VNĐ', targetValue: 1_680_000_000, unit: 'VNĐ', currentValue: 1_500_000_000, startValue: 1_400_000_000 },
        ],
      },
      {
        title: 'Hoàn thiện hạ tầng kỹ thuật & DevOps cho scale',
        description: 'Setup CI/CD, monitoring, auto-scaling trước khi onboard khách hàng lớn Q3/2026',
        cycle: 'Q2', year: 2026, ownerId: uPm.id,
        orgUnitId: orgDev?.id ?? null, status: 'DRAFT',
        krs: [
          { title: 'Triển khai GitHub Actions CI/CD cho toàn bộ service', targetValue: 100, unit: '%', currentValue: 40, startValue: 0 },
          { title: 'P99 latency API < 200ms', targetValue: 200, unit: 'ms', currentValue: 380, startValue: 500 },
          { title: 'Uptime SLA 99.5% trong Q2', targetValue: 99.5, unit: '%', currentValue: 98.7, startValue: 97 },
        ],
      },
    ];

    let objCount = 0; let krCount = 0;
    for (const { krs, ...objData } of objectives) {
      const obj = await prisma.okrObjective.create({ data: { ...objData as any } });
      for (const kr of krs) {
        await prisma.okrKeyResult.create({ data: { objectiveId: obj.id, ...kr } });
        krCount++;
      }
      objCount++;
    }

    // ── KPI Metrics ───────────────────────────────────────────────────────────
    const kpiDefs = [
      { name: 'Doanh thu hàng tháng (MRR)', unit: 'VNĐ', targetValue: 140_000_000, frequency: 'MONTHLY' as const,
        records: [ { period: '2026-02', value: 118_000_000 }, { period: '2026-03', value: 125_000_000 }, { period: '2026-04', value: 132_000_000 }, { period: '2026-05', value: 138_000_000 } ] },
      { name: 'Số hợp đồng mới ký', unit: 'hợp đồng', targetValue: 3, frequency: 'MONTHLY' as const,
        records: [ { period: '2026-02', value: 1 }, { period: '2026-03', value: 2 }, { period: '2026-04', value: 1 }, { period: '2026-05', value: 2 } ] },
      { name: 'Bug rate (bugs/sprint)', unit: 'bugs', targetValue: 2, frequency: 'MONTHLY' as const,
        records: [ { period: '2026-02', value: 6 }, { period: '2026-03', value: 4.5 }, { period: '2026-04', value: 3.8 }, { period: '2026-05', value: 3.2 } ] },
      { name: 'Tỷ lệ nghỉ việc hàng quý', unit: '%', targetValue: 5, frequency: 'QUARTERLY' as const,
        records: [ { period: '2025-Q4', value: 8 }, { period: '2026-Q1', value: 5 }, { period: '2026-Q2', value: 2 } ] },
      { name: 'API Uptime', unit: '%', targetValue: 99.5, frequency: 'MONTHLY' as const,
        records: [ { period: '2026-02', value: 98.2 }, { period: '2026-03', value: 99.1 }, { period: '2026-04', value: 99.3 }, { period: '2026-05', value: 98.9 } ] },
    ];

    let kpiCount = 0;
    for (const { records, ...kpiData } of kpiDefs) {
      const metric = await prisma.kpiMetric.create({ data: { ...kpiData as any } });
      for (const rec of records) {
        await prisma.kpiRecord.create({ data: { metricId: metric.id, period: rec.period, value: rec.value } });
      }
      kpiCount++;
    }

    console.log(`  ✓ ${objCount} OKR objectives + ${krCount} key results seeded`);
    console.log(`  ✓ ${kpiCount} KPI metrics + ${kpiDefs.reduce((s, k) => s + k.records.length, 0)} records seeded`);
  } catch (err) {
    console.error('  ✗ seedOkrDemo error:', err);
  }
}

async function seedAccountingDemo() {
  try {
    const existing = await prisma.journalEntry.count();
    if (existing > 0) {
      console.log(`  ⏭  ${existing} journal entries đã tồn tại, bỏ qua`);
      return;
    }

    const admin = await prisma.user.findFirst({ where: { email: 'admin@loop.vn' }, select: { id: true } });
    if (!admin) { console.log('  ⚠ Chưa có admin user, bỏ qua seed accounting'); return; }

    // Tạo journal entry helper
    const je = async (date: string, description: string, lines: Array<{ code: string; debit?: number; credit?: number; note?: string }>) => {
      const entry = await prisma.journalEntry.create({
        data: { date: new Date(date), description, createdById: admin.id },
      });
      for (const l of lines) {
        await prisma.journalLine.create({
          data: {
            entryId: entry.id,
            accountCode: l.code,
            debit: l.debit ?? 0,
            credit: l.credit ?? 0,
            description: l.note,
          },
        });
      }
      return entry;
    };

    // ── Tháng 1/2026 ─────────────────────────────────────────────────────────
    await je('2026-01-05', 'Ghi nhận doanh thu dịch vụ T1/2026 — FPT + VNG', [
      { code: '131',  debit: 130_900_000 },
      { code: '5113', credit: 119_000_000 },
      { code: '3331', credit: 11_900_000 },
    ]);
    await je('2026-01-08', 'Thu tiền từ khách hàng T1/2026', [
      { code: '1121', debit: 130_900_000 },
      { code: '131',  credit: 130_900_000 },
    ]);
    await je('2026-01-25', 'Chi phí lương nhân viên T1/2026', [
      { code: '622',  debit: 180_000_000, note: 'Lương kỹ thuật' },
      { code: '6421', debit: 96_000_000,  note: 'Lương quản lý' },
      { code: '3341', credit: 276_000_000 },
    ]);
    await je('2026-01-25', 'BHXH/BHYT/BHTN chủ sử dụng lao động T1/2026', [
      { code: '622',  debit: 36_000_000, note: 'BHXH/BHYT NSDLĐ nhân sự kỹ thuật' },
      { code: '6421', debit: 19_200_000, note: 'BHXH/BHYT NSDLĐ nhân sự quản lý' },
      { code: '3383', credit: 42_840_000 },
      { code: '3384', credit: 12_360_000 },
    ]);
    await je('2026-01-28', 'Thanh toán lương T1/2026', [
      { code: '3341', debit: 276_000_000 },
      { code: '1121', credit: 276_000_000 },
    ]);
    await je('2026-01-31', 'Chi phí văn phòng + dịch vụ mua ngoài T1/2026', [
      { code: '6422', debit: 8_000_000,  note: 'Văn phòng phẩm, in ấn' },
      { code: '6423', debit: 22_000_000, note: 'Cloud AWS, phần mềm' },
      { code: '1121', credit: 30_000_000 },
    ]);
    await je('2026-01-31', 'Khấu hao TSCĐ T1/2026', [
      { code: '627',  debit: 5_000_000 },
      { code: '2141', credit: 5_000_000 },
    ]);

    // ── Tháng 2/2026 ─────────────────────────────────────────────────────────
    await je('2026-02-05', 'Ghi nhận doanh thu dịch vụ T2/2026', [
      { code: '131',  debit: 129_800_000 },
      { code: '5113', credit: 118_000_000 },
      { code: '3331', credit: 11_800_000 },
    ]);
    await je('2026-02-08', 'Thu tiền từ khách hàng T2/2026', [
      { code: '1121', debit: 129_800_000 },
      { code: '131',  credit: 129_800_000 },
    ]);
    await je('2026-02-25', 'Chi phí lương nhân viên T2/2026', [
      { code: '622',  debit: 180_000_000 },
      { code: '6421', debit: 96_000_000 },
      { code: '3341', credit: 276_000_000 },
    ]);
    await je('2026-02-25', 'BHXH/BHYT NSDLĐ T2/2026', [
      { code: '622',  debit: 36_000_000 },
      { code: '6421', debit: 19_200_000 },
      { code: '3383', credit: 42_840_000 },
      { code: '3384', credit: 12_360_000 },
    ]);
    await je('2026-02-28', 'Thanh toán lương + chi phí VP T2/2026', [
      { code: '3341', debit: 276_000_000 },
      { code: '6422', debit: 7_500_000 },
      { code: '6423', debit: 22_000_000 },
      { code: '1121', credit: 305_500_000 },
    ]);
    await je('2026-02-28', 'Khấu hao T2/2026', [
      { code: '627',  debit: 5_000_000 },
      { code: '2141', credit: 5_000_000 },
    ]);

    // ── Tháng 3/2026 ─────────────────────────────────────────────────────────
    await je('2026-03-05', 'Doanh thu dịch vụ T3/2026 — FPT milestone 2', [
      { code: '131',  debit: 275_000_000 },
      { code: '5113', credit: 250_000_000 },
      { code: '3331', credit: 25_000_000 },
    ]);
    await je('2026-03-08', 'Thu tiền FPT milestone T3', [
      { code: '1121', debit: 275_000_000 },
      { code: '131',  credit: 275_000_000 },
    ]);
    await je('2026-03-05', 'Doanh thu SLA Viettel Q1/2026', [
      { code: '131',  debit: 66_000_000 },
      { code: '5113', credit: 60_000_000 },
      { code: '3331', credit: 6_000_000 },
    ]);
    await je('2026-03-10', 'Thu tiền Viettel Q1', [
      { code: '1121', debit: 66_000_000 },
      { code: '131',  credit: 66_000_000 },
    ]);
    await je('2026-03-25', 'Chi phí lương T3/2026', [
      { code: '622',  debit: 189_000_000 },
      { code: '6421', debit: 100_800_000 },
      { code: '3341', credit: 289_800_000 },
    ]);
    await je('2026-03-25', 'BHXH/BHYT NSDLĐ T3/2026', [
      { code: '622',  debit: 37_800_000 },
      { code: '6421', debit: 20_160_000 },
      { code: '3383', credit: 44_982_000 },
      { code: '3384', credit: 12_978_000 },
    ]);
    await je('2026-03-28', 'Thanh toán lương + chi phí VP T3', [
      { code: '3341', debit: 289_800_000 },
      { code: '6422', debit: 9_000_000 },
      { code: '6423', debit: 25_000_000 },
      { code: '1121', credit: 323_800_000 },
    ]);
    await je('2026-03-31', 'Khấu hao T3/2026', [
      { code: '627',  debit: 5_000_000 },
      { code: '2141', credit: 5_000_000 },
    ]);

    // ── Tháng 4/2026 ─────────────────────────────────────────────────────────
    await je('2026-04-05', 'Doanh thu dịch vụ T4/2026', [
      { code: '131',  debit: 145_200_000 },
      { code: '5113', credit: 132_000_000 },
      { code: '3331', credit: 13_200_000 },
    ]);
    await je('2026-04-08', 'Thu tiền KH T4/2026', [
      { code: '1121', debit: 145_200_000 },
      { code: '131',  credit: 145_200_000 },
    ]);
    await je('2026-04-05', 'Tạm ứng hợp đồng FPT Mobile (CTR-2026-002)', [
      { code: '1121', debit: 40_700_000 },
      { code: '131',  credit: 40_700_000 },
    ]);
    await je('2026-04-25', 'Chi phí lương T4/2026', [
      { code: '622',  debit: 189_000_000 },
      { code: '6421', debit: 100_800_000 },
      { code: '3341', credit: 289_800_000 },
    ]);
    await je('2026-04-25', 'BHXH/BHYT NSDLĐ T4/2026', [
      { code: '622',  debit: 37_800_000 },
      { code: '6421', debit: 20_160_000 },
      { code: '3383', credit: 44_982_000 },
      { code: '3384', credit: 12_978_000 },
    ]);
    await je('2026-04-28', 'Thanh toán lương + chi phí T4', [
      { code: '3341', debit: 289_800_000 },
      { code: '6422', debit: 8_000_000 },
      { code: '6423', debit: 25_000_000 },
      { code: '1121', credit: 322_800_000 },
    ]);
    await je('2026-04-30', 'Khấu hao T4/2026', [
      { code: '627',  debit: 5_000_000 },
      { code: '2141', credit: 5_000_000 },
    ]);

    // ── Tháng 5/2026 ─────────────────────────────────────────────────────────
    await je('2026-05-05', 'Doanh thu dịch vụ T5/2026', [
      { code: '131',  debit: 151_800_000 },
      { code: '5113', credit: 138_000_000 },
      { code: '3331', credit: 13_800_000 },
    ]);
    await je('2026-05-08', 'Thu tiền KH T5/2026', [
      { code: '1121', debit: 151_800_000 },
      { code: '131',  credit: 151_800_000 },
    ]);
    await je('2026-05-25', 'Chi phí lương T5/2026', [
      { code: '622',  debit: 194_040_000 },
      { code: '6421', debit: 103_488_000 },
      { code: '3341', credit: 297_528_000 },
    ]);
    await je('2026-05-25', 'BHXH/BHYT NSDLĐ T5/2026', [
      { code: '622',  debit: 38_808_000 },
      { code: '6421', debit: 20_697_600 },
      { code: '3383', credit: 46_131_960 },
      { code: '3384', credit: 13_373_640 },
    ]);
    await je('2026-05-28', 'Thanh toán lương + chi phí T5', [
      { code: '3341', debit: 297_528_000 },
      { code: '6422', debit: 9_000_000 },
      { code: '6423', debit: 27_000_000 },
      { code: '1121', credit: 333_528_000 },
    ]);
    await je('2026-05-31', 'Khấu hao T5/2026', [
      { code: '627',  debit: 5_000_000 },
      { code: '2141', credit: 5_000_000 },
    ]);

    // ── Số dư đầu kỳ (01/01/2026) — vốn + tài sản ────────────────────────────
    await je('2026-01-01', 'Số dư đầu kỳ 2026 — vốn và tiền gửi', [
      { code: '1121', debit: 500_000_000, note: 'Tiền gửi ngân hàng đầu kỳ' },
      { code: '211',  debit: 120_000_000, note: 'TSCĐ — máy tính, thiết bị' },
      { code: '4111', credit: 620_000_000, note: 'Vốn góp chủ sở hữu' },
    ]);

    const total = await prisma.journalEntry.count();
    const lines = await prisma.journalLine.count();
    console.log(`  ✓ ${total} journal entries + ${lines} journal lines seeded (Jan–May 2026)`);
  } catch (err) {
    console.error('  ✗ seedAccountingDemo error:', err);
  }
}

async function seedProcessDefinitions(orgUnitId: string) {
  // Lookup specialized org units (created in seedPhase2Demo, now runs before us)
  const orgHrd = await prisma.orgUnit.findFirst({ where: { code: 'HRD' } });
  const orgFin = await prisma.orgUnit.findFirst({ where: { code: 'FIN' } });
  const orgDev = await prisma.orgUnit.findFirst({ where: { code: 'DEV' } });
  const hrdId  = orgHrd?.id ?? orgUnitId;
  const finId  = orgFin?.id ?? orgUnitId;
  const devId  = orgDev?.id ?? orgUnitId;

  // ─── Shared notification templates ───────────────────────────────────────────
  const notifyAssignee = (processHint: string, taskHint: string) => ({
    enabled: true,
    recipients: ['assignee'],
    subject: `[Loop] {{process.name}} — Cần xử lý: {{task.name}}`,
    bodyTemplate:
      `Kính gửi {{recipient.name}},\n\n` +
      `${processHint}\n\n` +
      `Bước cần xử lý: {{task.name}}\n` +
      `${taskHint}\n\n` +
      `Vui lòng đăng nhập hệ thống Loop để xem xét và thực hiện.\n\n` +
      `Trân trọng,\nHệ thống Loop ERP`,
  });

  const notifyRequester = (doneHint: string) => ({
    enabled: true,
    recipients: ['requester'],
    subject: `[Loop] {{process.name}} — Bước "{{task.name}}" đã hoàn thành`,
    bodyTemplate:
      `Kính gửi {{recipient.name}},\n\n` +
      `${doneHint}\n\n` +
      `Người xử lý: {{assignee.name}}\n` +
      `Quy trình: {{process.name}}\n\n` +
      `Đăng nhập hệ thống Loop để xem kết quả chi tiết.\n\n` +
      `Trân trọng,\nHệ thống Loop ERP`,
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 1. NGHỈ PHÉP — leave-approval
  // ══════════════════════════════════════════════════════════════════════════════
  const leaveApprovalXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="leave-approval-defs" targetNamespace="http://loop.vn/processes">
  <process id="leave-approval-process" name="Phê duyệt Nghỉ phép" isExecutable="true">
    <startEvent id="start" name="Nộp đơn xin nghỉ">
      <outgoing>to-review</outgoing>
    </startEvent>
    <sequenceFlow id="to-review" sourceRef="start" targetRef="review-task"/>
    <userTask id="review-task" name="Trưởng phòng xét duyệt">
      <incoming>to-review</incoming>
      <outgoing>to-hr-update</outgoing>
    </userTask>
    <sequenceFlow id="to-hr-update" sourceRef="review-task" targetRef="hr-update-task"/>
    <userTask id="hr-update-task" name="HR cập nhật chấm công">
      <incoming>to-hr-update</incoming>
      <outgoing>to-end</outgoing>
    </userTask>
    <sequenceFlow id="to-end" sourceRef="hr-update-task" targetRef="end"/>
    <endEvent id="end" name="Hoàn tất"><incoming>to-end</incoming></endEvent>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_leave">
    <bpmndi:BPMNPlane id="BPMNPlane_leave" bpmnElement="leave-approval-process">
      <bpmndi:BPMNShape id="start_di" bpmnElement="start"><dc:Bounds x="150" y="182" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="review-task_di" bpmnElement="review-task"><dc:Bounds x="250" y="160" width="100" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="hr-update-task_di" bpmnElement="hr-update-task"><dc:Bounds x="420" y="160" width="100" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end_di" bpmnElement="end"><dc:Bounds x="590" y="182" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="to-review_di" bpmnElement="to-review">
        <di:waypoint x="186" y="200"/><di:waypoint x="250" y="200"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="to-hr-update_di" bpmnElement="to-hr-update">
        <di:waypoint x="350" y="200"/><di:waypoint x="420" y="200"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="to-end_di" bpmnElement="to-end">
        <di:waypoint x="520" y="200"/><di:waypoint x="590" y="200"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

  const leaveStepConfig = {
    'review-task': {
      assigneeConfig: { mode: 'requester_manager' },
      notificationConfig: {
        taskAssigned: notifyAssignee(
          '{{requester.name}} đã nộp đơn xin nghỉ phép và đang chờ bạn xét duyệt.',
          'Kiểm tra thông tin đơn và chọn Chấp thuận hoặc Từ chối.',
        ),
        taskCompleted: notifyRequester('Đơn nghỉ phép của bạn đã được trưởng phòng xem xét và xử lý.'),
      },
    },
    'hr-update-task': {
      assigneeConfig: { mode: 'orgunit', orgUnitId: hrdId },
      notificationConfig: {
        taskAssigned: notifyAssignee(
          'Đơn nghỉ phép của {{requester.name}} đã được trưởng phòng xét duyệt.',
          'Vui lòng cập nhật bảng chấm công tương ứng.',
        ),
      },
    },
  };

  const leaveTaskFormFields = {
    'review-task': [
      {
        name: 'decision',
        label: 'Quyết định',
        type: 'select',
        required: true,
        options: [
          { label: 'Chấp thuận', value: 'APPROVED' },
          { label: 'Từ chối',    value: 'REJECTED' },
        ],
      },
      { name: 'reviewNotes', label: 'Ghi chú xét duyệt', type: 'textarea', placeholder: 'Lý do từ chối hoặc ghi chú bổ sung...' },
    ],
    'hr-update-task': [
      {
        name: 'updateStatus',
        label: 'Xác nhận cập nhật',
        type: 'select',
        required: true,
        options: [
          { label: 'Đã cập nhật chấm công', value: 'DONE' },
          { label: 'Cần xem xét lại',       value: 'PENDING' },
        ],
      },
      { name: 'notes', label: 'Ghi chú', type: 'textarea' },
    ],
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // 2. CHI PHÍ — expense-approval
  // ══════════════════════════════════════════════════════════════════════════════
  const expenseApprovalXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="expense-approval-defs" targetNamespace="http://loop.vn/processes">
  <process id="expense-approval-process" name="Phê duyệt Chi phí" isExecutable="true">
    <startEvent id="start" name="Nộp phiếu chi">
      <outgoing>to-accountant</outgoing>
    </startEvent>
    <sequenceFlow id="to-accountant" sourceRef="start" targetRef="accountant-check"/>
    <userTask id="accountant-check" name="Kế toán kiểm tra chứng từ">
      <incoming>to-accountant</incoming>
      <outgoing>to-manager</outgoing>
    </userTask>
    <sequenceFlow id="to-manager" sourceRef="accountant-check" targetRef="manager-approve"/>
    <userTask id="manager-approve" name="Trưởng phòng phê duyệt">
      <incoming>to-manager</incoming>
      <outgoing>to-end</outgoing>
    </userTask>
    <sequenceFlow id="to-end" sourceRef="manager-approve" targetRef="end"/>
    <endEvent id="end" name="Hoàn tất"><incoming>to-end</incoming></endEvent>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_expense">
    <bpmndi:BPMNPlane id="BPMNPlane_expense" bpmnElement="expense-approval-process">
      <bpmndi:BPMNShape id="start_di" bpmnElement="start"><dc:Bounds x="150" y="182" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="accountant-check_di" bpmnElement="accountant-check"><dc:Bounds x="250" y="160" width="100" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="manager-approve_di" bpmnElement="manager-approve"><dc:Bounds x="420" y="160" width="100" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end_di" bpmnElement="end"><dc:Bounds x="590" y="182" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="to-accountant_di" bpmnElement="to-accountant">
        <di:waypoint x="186" y="200"/><di:waypoint x="250" y="200"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="to-manager_di" bpmnElement="to-manager">
        <di:waypoint x="350" y="200"/><di:waypoint x="420" y="200"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="to-end_di" bpmnElement="to-end">
        <di:waypoint x="520" y="200"/><di:waypoint x="590" y="200"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

  const expenseStepConfig = {
    'accountant-check': {
      assigneeConfig: { mode: 'orgunit', orgUnitId: finId },
      notificationConfig: {
        taskAssigned: notifyAssignee(
          '{{requester.name}} đã nộp phiếu chi phí và cần bạn kiểm tra chứng từ.',
          'Xem xét hóa đơn, chứng từ và xác nhận tính hợp lệ.',
        ),
        taskCompleted: notifyRequester('Kế toán đã kiểm tra chứng từ phiếu chi của bạn.'),
      },
    },
    'manager-approve': {
      assigneeConfig: { mode: 'requester_manager' },
      notificationConfig: {
        taskAssigned: notifyAssignee(
          'Phiếu chi của {{requester.name}} đã qua kiểm tra kế toán và đang chờ bạn phê duyệt.',
          'Phê duyệt hoặc từ chối phiếu chi này.',
        ),
        taskCompleted: notifyRequester('Phiếu chi phí của bạn đã được trưởng phòng phê duyệt.'),
      },
    },
  };

  const expenseTaskFormFields = {
    'accountant-check': [
      {
        name: 'voucherStatus',
        label: 'Tình trạng chứng từ',
        type: 'select',
        required: true,
        options: [
          { label: 'Hợp lệ, chuyển duyệt',        value: 'VALID' },
          { label: 'Cần bổ sung chứng từ',          value: 'NEED_MORE_DOCS' },
          { label: 'Không hợp lệ, trả về người nộp', value: 'INVALID' },
        ],
      },
      { name: 'accountantNotes', label: 'Ghi chú kế toán', type: 'textarea' },
    ],
    'manager-approve': [
      {
        name: 'decision',
        label: 'Quyết định',
        type: 'select',
        required: true,
        options: [
          { label: 'Phê duyệt', value: 'APPROVED' },
          { label: 'Từ chối',   value: 'REJECTED' },
        ],
      },
      { name: 'approveNotes', label: 'Ghi chú phê duyệt', type: 'textarea' },
    ],
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // 3. ONBOARDING — employee-onboarding
  // ══════════════════════════════════════════════════════════════════════════════
  const onboardingXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="onboarding-defs" targetNamespace="http://loop.vn/processes">
  <process id="employee-onboarding-process" name="Onboarding Nhân viên Mới" isExecutable="true">
    <startEvent id="start" name="Nhân viên gia nhập">
      <outgoing>to-it</outgoing>
    </startEvent>
    <sequenceFlow id="to-it" sourceRef="start" targetRef="it-setup"/>
    <userTask id="it-setup" name="IT thiết lập tài khoản &amp; thiết bị">
      <incoming>to-it</incoming>
      <outgoing>to-orientation</outgoing>
    </userTask>
    <sequenceFlow id="to-orientation" sourceRef="it-setup" targetRef="orientation"/>
    <userTask id="orientation" name="Đào tạo hội nhập &amp; văn hóa công ty">
      <incoming>to-orientation</incoming>
      <outgoing>to-confirm</outgoing>
    </userTask>
    <sequenceFlow id="to-confirm" sourceRef="orientation" targetRef="confirm-task"/>
    <userTask id="confirm-task" name="HR xác nhận hoàn tất onboarding">
      <incoming>to-confirm</incoming>
      <outgoing>to-end</outgoing>
    </userTask>
    <sequenceFlow id="to-end" sourceRef="confirm-task" targetRef="end"/>
    <endEvent id="end" name="Onboarding hoàn tất"><incoming>to-end</incoming></endEvent>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_onboarding">
    <bpmndi:BPMNPlane id="BPMNPlane_onboarding" bpmnElement="employee-onboarding-process">
      <bpmndi:BPMNShape id="start_di" bpmnElement="start"><dc:Bounds x="150" y="182" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="it-setup_di" bpmnElement="it-setup"><dc:Bounds x="250" y="160" width="100" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="orientation_di" bpmnElement="orientation"><dc:Bounds x="420" y="160" width="100" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="confirm-task_di" bpmnElement="confirm-task"><dc:Bounds x="590" y="160" width="100" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end_di" bpmnElement="end"><dc:Bounds x="760" y="182" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="to-it_di" bpmnElement="to-it">
        <di:waypoint x="186" y="200"/><di:waypoint x="250" y="200"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="to-orientation_di" bpmnElement="to-orientation">
        <di:waypoint x="350" y="200"/><di:waypoint x="420" y="200"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="to-confirm_di" bpmnElement="to-confirm">
        <di:waypoint x="520" y="200"/><di:waypoint x="590" y="200"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="to-end_di" bpmnElement="to-end">
        <di:waypoint x="690" y="200"/><di:waypoint x="760" y="200"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

  const onboardingStepConfig = {
    'it-setup': {
      assigneeConfig: { mode: 'orgunit', orgUnitId: devId },
      notificationConfig: {
        taskAssigned: notifyAssignee(
          'Nhân viên mới {{requester.name}} sắp gia nhập công ty.',
          'Vui lòng thiết lập tài khoản email, hệ thống, cấp thiết bị và hướng dẫn ban đầu.',
        ),
        taskCompleted: notifyRequester('IT đã hoàn tất thiết lập tài khoản và thiết bị cho bạn.'),
      },
    },
    'orientation': {
      assigneeConfig: { mode: 'orgunit', orgUnitId: hrdId },
      notificationConfig: {
        taskAssigned: notifyAssignee(
          'Nhân viên mới {{requester.name}} đã được IT thiết lập xong tài khoản.',
          'Vui lòng thực hiện buổi đào tạo hội nhập và giới thiệu văn hóa công ty.',
        ),
        taskCompleted: notifyRequester('HR đã hoàn tất buổi đào tạo hội nhập của bạn.'),
      },
    },
    'confirm-task': {
      assigneeConfig: { mode: 'orgunit', orgUnitId: hrdId },
      notificationConfig: {
        taskAssigned: notifyAssignee(
          '{{requester.name}} đã hoàn thành các bước onboarding.',
          'Vui lòng xác nhận và đánh dấu hoàn tất hồ sơ nhân viên mới.',
        ),
        taskCompleted: notifyRequester('Quá trình onboarding của bạn đã hoàn tất. Chào mừng đến với Loop!'),
      },
    },
  };

  const onboardingTaskFormFields = {
    'it-setup': [
      {
        name: 'accountCreated',
        label: 'Đã tạo tài khoản hệ thống',
        type: 'select',
        required: true,
        options: [
          { label: 'Đã tạo đủ (email, Loop, Slack...)', value: 'DONE' },
          { label: 'Chưa hoàn tất, cần theo dõi',       value: 'PARTIAL' },
        ],
      },
      {
        name: 'deviceAssigned',
        label: 'Thiết bị đã cấp',
        type: 'select',
        required: true,
        options: [
          { label: 'Đã cấp laptop & phụ kiện', value: 'DONE' },
          { label: 'Chưa có thiết bị',          value: 'PENDING' },
        ],
      },
      { name: 'itNotes', label: 'Ghi chú IT', type: 'textarea' },
    ],
    'orientation': [
      {
        name: 'orientationCompleted',
        label: 'Đào tạo hội nhập',
        type: 'select',
        required: true,
        options: [
          { label: 'Đã hoàn thành', value: 'DONE' },
          { label: 'Cần thêm thời gian', value: 'NEED_MORE' },
        ],
      },
      { name: 'orientationNotes', label: 'Nội dung đào tạo và ghi chú', type: 'textarea' },
    ],
    'confirm-task': [
      {
        name: 'onboardingStatus',
        label: 'Trạng thái onboarding',
        type: 'select',
        required: true,
        options: [
          { label: 'Hoàn tất, hồ sơ đầy đủ',   value: 'COMPLETED' },
          { label: 'Cần bổ sung hồ sơ',          value: 'NEED_DOCS' },
          { label: 'Cần theo dõi thêm 30 ngày',  value: 'FOLLOWUP' },
        ],
      },
      { name: 'hrNotes', label: 'Ghi chú HR', type: 'textarea' },
    ],
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // 4. TUYỂN DỤNG — recruitment
  // ══════════════════════════════════════════════════════════════════════════════
  const recruitmentXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="recruitment-defs" targetNamespace="http://loop.vn/processes">
  <process id="recruitment-process" name="Quy trình Tuyển dụng" isExecutable="true">
    <startEvent id="start" name="Tiếp nhận hồ sơ ứng viên">
      <outgoing>to-screen</outgoing>
    </startEvent>
    <sequenceFlow id="to-screen" sourceRef="start" targetRef="screen-cv"/>
    <userTask id="screen-cv" name="HR sàng lọc hồ sơ">
      <incoming>to-screen</incoming>
      <outgoing>to-tech</outgoing>
    </userTask>
    <sequenceFlow id="to-tech" sourceRef="screen-cv" targetRef="tech-interview"/>
    <userTask id="tech-interview" name="Phỏng vấn chuyên môn">
      <incoming>to-tech</incoming>
      <outgoing>to-bod</outgoing>
    </userTask>
    <sequenceFlow id="to-bod" sourceRef="tech-interview" targetRef="bod-interview"/>
    <userTask id="bod-interview" name="Phỏng vấn ban lãnh đạo &amp; phê duyệt">
      <incoming>to-bod</incoming>
      <outgoing>to-offer</outgoing>
    </userTask>
    <sequenceFlow id="to-offer" sourceRef="bod-interview" targetRef="send-offer"/>
    <userTask id="send-offer" name="HR gửi thư mời nhận việc">
      <incoming>to-offer</incoming>
      <outgoing>to-end</outgoing>
    </userTask>
    <sequenceFlow id="to-end" sourceRef="send-offer" targetRef="end"/>
    <endEvent id="end" name="Hoàn tất tuyển dụng"><incoming>to-end</incoming></endEvent>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_recruit">
    <bpmndi:BPMNPlane id="BPMNPlane_recruit" bpmnElement="recruitment-process">
      <bpmndi:BPMNShape id="start_di" bpmnElement="start"><dc:Bounds x="150" y="182" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="screen-cv_di" bpmnElement="screen-cv"><dc:Bounds x="250" y="160" width="100" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="tech-interview_di" bpmnElement="tech-interview"><dc:Bounds x="420" y="160" width="100" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="bod-interview_di" bpmnElement="bod-interview"><dc:Bounds x="590" y="160" width="100" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="send-offer_di" bpmnElement="send-offer"><dc:Bounds x="760" y="160" width="100" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end_di" bpmnElement="end"><dc:Bounds x="930" y="182" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="to-screen_di" bpmnElement="to-screen">
        <di:waypoint x="186" y="200"/><di:waypoint x="250" y="200"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="to-tech_di" bpmnElement="to-tech">
        <di:waypoint x="350" y="200"/><di:waypoint x="420" y="200"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="to-bod_di" bpmnElement="to-bod">
        <di:waypoint x="520" y="200"/><di:waypoint x="590" y="200"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="to-offer_di" bpmnElement="to-offer">
        <di:waypoint x="690" y="200"/><di:waypoint x="760" y="200"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="to-end_di" bpmnElement="to-end">
        <di:waypoint x="860" y="200"/><di:waypoint x="930" y="200"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

  const recruitmentStepConfig = {
    'screen-cv': {
      assigneeConfig: { mode: 'orgunit', orgUnitId: hrdId },
      notificationConfig: {
        taskAssigned: notifyAssignee(
          'Có hồ sơ ứng viên mới cần sàng lọc cho vị trí tuyển dụng.',
          'Xem xét CV, đánh giá sơ bộ và quyết định có tiến hành phỏng vấn hay không.',
        ),
        taskCompleted: notifyRequester('HR đã sàng lọc hồ sơ tuyển dụng của bạn.'),
      },
    },
    'tech-interview': {
      assigneeConfig: { mode: 'requester_manager' },
      notificationConfig: {
        taskAssigned: notifyAssignee(
          'Ứng viên đã qua sàng lọc hồ sơ và cần được phỏng vấn chuyên môn.',
          'Đánh giá năng lực chuyên môn và ghi nhận kết quả phỏng vấn.',
        ),
        taskCompleted: notifyRequester('Phỏng vấn chuyên môn đã hoàn tất.'),
      },
    },
    'bod-interview': {
      assigneeConfig: { mode: 'requester_manager' },
      notificationConfig: {
        taskAssigned: notifyAssignee(
          'Ứng viên đã vượt qua phỏng vấn chuyên môn và cần phỏng vấn ban lãnh đạo.',
          'Đánh giá sự phù hợp về văn hóa, định hướng và ra quyết định tuyển dụng.',
        ),
        taskCompleted: notifyRequester('Phỏng vấn ban lãnh đạo đã hoàn tất.'),
      },
    },
    'send-offer': {
      assigneeConfig: { mode: 'orgunit', orgUnitId: hrdId },
      notificationConfig: {
        taskAssigned: notifyAssignee(
          'Ứng viên đã được ban lãnh đạo chấp thuận tuyển dụng.',
          'Soạn và gửi thư mời nhận việc (offer letter) cho ứng viên.',
        ),
        taskCompleted: notifyRequester('Thư mời nhận việc đã được gửi đến ứng viên.'),
      },
    },
  };

  const recruitmentTaskFormFields = {
    'screen-cv': [
      {
        name: 'screenResult',
        label: 'Kết quả sàng lọc',
        type: 'select',
        required: true,
        options: [
          { label: 'Đạt — Mời phỏng vấn chuyên môn', value: 'PASS' },
          { label: 'Không đạt — Loại hồ sơ',          value: 'FAIL' },
          { label: 'Cần xem xét thêm',                 value: 'REVIEW' },
        ],
      },
      { name: 'position', label: 'Vị trí ứng tuyển', type: 'text', required: true },
      { name: 'screenNotes', label: 'Nhận xét về hồ sơ', type: 'textarea' },
    ],
    'tech-interview': [
      {
        name: 'techResult',
        label: 'Kết quả phỏng vấn',
        type: 'select',
        required: true,
        options: [
          { label: 'Xuất sắc (≥90đ)', value: 'EXCELLENT' },
          { label: 'Tốt (70–89đ)',    value: 'GOOD' },
          { label: 'Đạt (50–69đ)',    value: 'PASS' },
          { label: 'Không đạt (<50đ)', value: 'FAIL' },
        ],
      },
      { name: 'techScore', label: 'Điểm kỹ thuật (0–100)', type: 'number', min: 0, max: 100 },
      { name: 'techNotes', label: 'Nhận xét chuyên môn', type: 'textarea', required: true },
    ],
    'bod-interview': [
      {
        name: 'bodDecision',
        label: 'Quyết định tuyển dụng',
        type: 'select',
        required: true,
        options: [
          { label: 'Tuyển dụng',       value: 'HIRE' },
          { label: 'Không tuyển dụng', value: 'REJECT' },
          { label: 'Đưa vào pool dự phòng', value: 'WAITLIST' },
        ],
      },
      { name: 'proposedSalary', label: 'Mức lương đề xuất (VND)', type: 'number' },
      { name: 'startDate', label: 'Ngày dự kiến bắt đầu', type: 'date' },
      { name: 'bodNotes', label: 'Ghi chú ban lãnh đạo', type: 'textarea' },
    ],
    'send-offer': [
      {
        name: 'offerSent',
        label: 'Đã gửi offer letter',
        type: 'select',
        required: true,
        options: [
          { label: 'Đã gửi email', value: 'SENT' },
          { label: 'Ứng viên xác nhận nhận việc', value: 'ACCEPTED' },
          { label: 'Ứng viên từ chối offer', value: 'DECLINED' },
        ],
      },
      { name: 'offerNotes', label: 'Ghi chú offer', type: 'textarea' },
    ],
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // 5. ĐÁNH GIÁ HIỆU SUẤT — performance-review
  // ══════════════════════════════════════════════════════════════════════════════
  const performanceReviewXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="performance-review-defs" targetNamespace="http://loop.vn/processes">
  <process id="performance-review-process" name="Đánh giá Hiệu suất Nhân viên" isExecutable="true">
    <startEvent id="start" name="Kỳ đánh giá bắt đầu">
      <outgoing>to-self</outgoing>
    </startEvent>
    <sequenceFlow id="to-self" sourceRef="start" targetRef="self-review"/>
    <userTask id="self-review" name="Nhân viên tự đánh giá">
      <incoming>to-self</incoming>
      <outgoing>to-manager</outgoing>
    </userTask>
    <sequenceFlow id="to-manager" sourceRef="self-review" targetRef="manager-review"/>
    <userTask id="manager-review" name="Trưởng phòng đánh giá &amp; phê duyệt">
      <incoming>to-manager</incoming>
      <outgoing>to-hr</outgoing>
    </userTask>
    <sequenceFlow id="to-hr" sourceRef="manager-review" targetRef="hr-summary"/>
    <userTask id="hr-summary" name="HR tổng hợp &amp; lưu kết quả">
      <incoming>to-hr</incoming>
      <outgoing>to-end</outgoing>
    </userTask>
    <sequenceFlow id="to-end" sourceRef="hr-summary" targetRef="end"/>
    <endEvent id="end" name="Kết thúc chu kỳ đánh giá"><incoming>to-end</incoming></endEvent>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_perf">
    <bpmndi:BPMNPlane id="BPMNPlane_perf" bpmnElement="performance-review-process">
      <bpmndi:BPMNShape id="start_di" bpmnElement="start"><dc:Bounds x="150" y="182" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="self-review_di" bpmnElement="self-review"><dc:Bounds x="250" y="160" width="100" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="manager-review_di" bpmnElement="manager-review"><dc:Bounds x="420" y="160" width="100" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="hr-summary_di" bpmnElement="hr-summary"><dc:Bounds x="590" y="160" width="100" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end_di" bpmnElement="end"><dc:Bounds x="760" y="182" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="to-self_di" bpmnElement="to-self">
        <di:waypoint x="186" y="200"/><di:waypoint x="250" y="200"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="to-manager_di" bpmnElement="to-manager">
        <di:waypoint x="350" y="200"/><di:waypoint x="420" y="200"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="to-hr_di" bpmnElement="to-hr">
        <di:waypoint x="520" y="200"/><di:waypoint x="590" y="200"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="to-end_di" bpmnElement="to-end">
        <di:waypoint x="690" y="200"/><di:waypoint x="760" y="200"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

  const performanceStepConfig = {
    'self-review': {
      assigneeConfig: { mode: 'requester_manager' },
      notificationConfig: {
        taskAssigned: notifyAssignee(
          'Kỳ đánh giá hiệu suất mới đã bắt đầu. Bạn cần hoàn thành bản tự đánh giá.',
          'Điền đầy đủ các tiêu chí, mô tả thành tích và mục tiêu trong kỳ đánh giá.',
        ),
        taskCompleted: notifyRequester('Bạn đã hoàn thành bước tự đánh giá.'),
      },
    },
    'manager-review': {
      assigneeConfig: { mode: 'requester_manager' },
      notificationConfig: {
        taskAssigned: notifyAssignee(
          '{{requester.name}} đã hoàn thành tự đánh giá và đang chờ bạn nhận xét.',
          'Xem xét bản tự đánh giá, bổ sung nhận xét và xác nhận kết quả cuối kỳ.',
        ),
        taskCompleted: notifyRequester('Trưởng phòng đã hoàn tất đánh giá của bạn.'),
      },
    },
    'hr-summary': {
      assigneeConfig: { mode: 'orgunit', orgUnitId: hrdId },
      notificationConfig: {
        taskAssigned: notifyAssignee(
          '{{requester.name}} đã hoàn tất vòng đánh giá với trưởng phòng.',
          'Tổng hợp điểm, lưu kết quả vào hồ sơ nhân sự và thông báo cho nhân viên.',
        ),
        taskCompleted: notifyRequester('HR đã tổng hợp và lưu kết quả đánh giá của bạn trong kỳ này.'),
      },
    },
  };

  const performanceTaskFormFields = {
    'self-review': [
      {
        name: 'achievements',
        label: 'Thành tích nổi bật trong kỳ',
        type: 'textarea',
        required: true,
        placeholder: 'Mô tả các kết quả công việc, dự án, đóng góp nổi bật...',
      },
      {
        name: 'challenges',
        label: 'Khó khăn và bài học kinh nghiệm',
        type: 'textarea',
        placeholder: 'Những thách thức gặp phải và cách vượt qua...',
      },
      {
        name: 'nextGoals',
        label: 'Mục tiêu kỳ tiếp theo',
        type: 'textarea',
        required: true,
        placeholder: 'Liệt kê 3–5 mục tiêu cụ thể cho kỳ đánh giá tới...',
      },
      {
        name: 'selfScore',
        label: 'Tự chấm điểm (1–10)',
        type: 'number',
        min: 1,
        max: 10,
        required: true,
      },
    ],
    'manager-review': [
      {
        name: 'managerScore',
        label: 'Điểm đánh giá của trưởng phòng (1–10)',
        type: 'number',
        min: 1,
        max: 10,
        required: true,
      },
      {
        name: 'performanceLevel',
        label: 'Xếp loại hiệu suất',
        type: 'select',
        required: true,
        options: [
          { label: 'Xuất sắc (S)',    value: 'EXCELLENT' },
          { label: 'Tốt (A)',         value: 'GOOD' },
          { label: 'Đạt yêu cầu (B)', value: 'SATISFACTORY' },
          { label: 'Cần cải thiện (C)', value: 'NEEDS_IMPROVEMENT' },
          { label: 'Không đạt (D)',   value: 'UNSATISFACTORY' },
        ],
      },
      {
        name: 'managerComment',
        label: 'Nhận xét của trưởng phòng',
        type: 'textarea',
        required: true,
        placeholder: 'Đánh giá chi tiết về năng lực, thái độ, kết quả công việc...',
      },
      {
        name: 'developmentPlan',
        label: 'Kế hoạch phát triển đề xuất',
        type: 'textarea',
        placeholder: 'Đào tạo, thăng tiến, luân chuyển vị trí...',
      },
    ],
    'hr-summary': [
      {
        name: 'finalScore',
        label: 'Điểm tổng hợp cuối kỳ',
        type: 'number',
        min: 0,
        max: 10,
        required: true,
      },
      {
        name: 'salaryReview',
        label: 'Đề xuất điều chỉnh lương',
        type: 'select',
        required: true,
        options: [
          { label: 'Tăng lương theo đề xuất trưởng phòng', value: 'INCREASE' },
          { label: 'Giữ nguyên',                           value: 'NO_CHANGE' },
          { label: 'Cần xem xét thêm',                    value: 'REVIEW' },
        ],
      },
      { name: 'hrNotes', label: 'Ghi chú HR và tổng hợp', type: 'textarea' },
    ],
  };

  // ─── Upsert tất cả 5 process definitions ─────────────────────────────────────

  const upsertDef = async (def: {
    key: string;
    name: string;
    description: string;
    bpmnXml: string;
    stepConfig: object;
    taskFormFields: object;
    orgUnitId: string;
  }) => {
    const data = {
      name: def.name,
      description: def.description,
      bpmnXml: def.bpmnXml,
      key: def.key,
      orgUnitId: def.orgUnitId,
      version: 1,
      status: 'ACTIVE' as const,
      stepConfig: def.stepConfig as any,
      taskFormFields: def.taskFormFields as any,
    };
    await prisma.processDefinition.upsert({
      where: { key: def.key },
      update: {
        name: data.name,
        description: data.description,
        bpmnXml: data.bpmnXml,
        stepConfig: data.stepConfig,
        taskFormFields: data.taskFormFields,
      },
      create: data,
    });
    console.log(`  ✓ Process definition [${def.key}] seeded`);
  };

  await upsertDef({
    key: 'leave-approval',
    name: 'Phê duyệt Nghỉ phép',
    description: 'Quy trình nộp đơn, trưởng phòng xét duyệt và HR cập nhật chấm công',
    bpmnXml: leaveApprovalXml,
    stepConfig: leaveStepConfig,
    taskFormFields: leaveTaskFormFields,
    orgUnitId,
  });

  await upsertDef({
    key: 'expense-approval',
    name: 'Phê duyệt Chi phí',
    description: 'Quy trình phiếu chi: kế toán kiểm tra chứng từ → trưởng phòng phê duyệt',
    bpmnXml: expenseApprovalXml,
    stepConfig: expenseStepConfig,
    taskFormFields: expenseTaskFormFields,
    orgUnitId,
  });

  await upsertDef({
    key: 'employee-onboarding',
    name: 'Onboarding Nhân viên Mới',
    description: 'Quy trình tiếp nhận nhân viên: IT thiết lập → đào tạo hội nhập → HR xác nhận',
    bpmnXml: onboardingXml,
    stepConfig: onboardingStepConfig,
    taskFormFields: onboardingTaskFormFields,
    orgUnitId,
  });

  await upsertDef({
    key: 'recruitment',
    name: 'Quy trình Tuyển dụng',
    description: 'Từ tiếp nhận CV → sàng lọc → phỏng vấn chuyên môn → BOD → gửi offer',
    bpmnXml: recruitmentXml,
    stepConfig: recruitmentStepConfig,
    taskFormFields: recruitmentTaskFormFields,
    orgUnitId,
  });

  await upsertDef({
    key: 'performance-review',
    name: 'Đánh giá Hiệu suất Nhân viên',
    description: 'Tự đánh giá → trưởng phòng đánh giá → HR tổng hợp kết quả',
    bpmnXml: performanceReviewXml,
    stepConfig: performanceStepConfig,
    taskFormFields: performanceTaskFormFields,
    orgUnitId,
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 6. ĐĂNG KÝ OT — overtime-approval
  // ══════════════════════════════════════════════════════════════════════════════
  const overtimeApprovalXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="overtime-approval-defs" targetNamespace="http://loop.vn/processes">
  <process id="overtime-approval-process" name="Duyệt Đăng ký OT" isExecutable="true">
    <startEvent id="start" name="Nộp đăng ký OT">
      <outgoing>to-review</outgoing>
    </startEvent>
    <sequenceFlow id="to-review" sourceRef="start" targetRef="review-task"/>
    <userTask id="review-task" name="Trưởng phòng xét duyệt OT">
      <incoming>to-review</incoming>
      <outgoing>to-end</outgoing>
    </userTask>
    <sequenceFlow id="to-end" sourceRef="review-task" targetRef="end"/>
    <endEvent id="end" name="Hoàn tất"><incoming>to-end</incoming></endEvent>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_overtime">
    <bpmndi:BPMNPlane id="BPMNPlane_overtime" bpmnElement="overtime-approval-process">
      <bpmndi:BPMNShape id="start_di" bpmnElement="start"><dc:Bounds x="150" y="182" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="review-task_di" bpmnElement="review-task"><dc:Bounds x="250" y="160" width="100" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end_di" bpmnElement="end"><dc:Bounds x="420" y="182" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="to-review_di" bpmnElement="to-review">
        <di:waypoint x="186" y="200"/><di:waypoint x="250" y="200"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="to-end_di" bpmnElement="to-end">
        <di:waypoint x="350" y="200"/><di:waypoint x="420" y="200"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

  const overtimeStepConfig = {
    'review-task': {
      assigneeConfig: { mode: 'requester_manager' },
      notificationConfig: {
        taskAssigned: notifyAssignee(
          '{{requester.name}} đã nộp đăng ký tăng ca và đang chờ bạn xét duyệt.',
          'Kiểm tra thông tin đăng ký OT và chọn Chấp thuận hoặc Từ chối.',
        ),
        taskCompleted: notifyRequester('Đăng ký tăng ca của bạn đã được trưởng phòng xem xét và xử lý.'),
      },
    },
  };

  const overtimeTaskFormFields = {
    'review-task': [
      {
        name: 'decision',
        label: 'Quyết định',
        type: 'select',
        required: true,
        options: [
          { label: 'Chấp thuận', value: 'APPROVED' },
          { label: 'Từ chối',    value: 'REJECTED' },
        ],
      },
      {
        name: 'rejectedReason',
        label: 'Lý do từ chối',
        type: 'textarea',
        placeholder: 'Điền lý do nếu từ chối...',
      },
    ],
  };

  await upsertDef({
    key: 'overtime-approval',
    name: 'Duyệt Đăng ký OT',
    description: 'Quy trình duyệt đăng ký tăng ca: trưởng phòng xét duyệt một bước',
    bpmnXml: overtimeApprovalXml,
    stepConfig: overtimeStepConfig,
    taskFormFields: overtimeTaskFormFields,
    orgUnitId,
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 7. QUYẾT ĐỊNH NHÂN SỰ — hr-decision-approval
  // ══════════════════════════════════════════════════════════════════════════════
  const hrDecisionApprovalXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="hr-decision-approval-defs" targetNamespace="http://loop.vn/processes">
  <process id="hr-decision-approval-process" name="Duyệt Quyết định Nhân sự" isExecutable="true">
    <startEvent id="start" name="Nộp quyết định nhân sự">
      <outgoing>to-review</outgoing>
    </startEvent>
    <sequenceFlow id="to-review" sourceRef="start" targetRef="review-task"/>
    <userTask id="review-task" name="Ban Giám đốc ký duyệt">
      <incoming>to-review</incoming>
      <outgoing>to-end</outgoing>
    </userTask>
    <sequenceFlow id="to-end" sourceRef="review-task" targetRef="end"/>
    <endEvent id="end" name="Hoàn tất"><incoming>to-end</incoming></endEvent>
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_hrdecision">
    <bpmndi:BPMNPlane id="BPMNPlane_hrdecision" bpmnElement="hr-decision-approval-process">
      <bpmndi:BPMNShape id="start_di" bpmnElement="start"><dc:Bounds x="150" y="182" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="review-task_di" bpmnElement="review-task"><dc:Bounds x="250" y="160" width="100" height="80"/></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="end_di" bpmnElement="end"><dc:Bounds x="420" y="182" width="36" height="36"/></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="to-review_di" bpmnElement="to-review">
        <di:waypoint x="186" y="200"/><di:waypoint x="250" y="200"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="to-end_di" bpmnElement="to-end">
        <di:waypoint x="350" y="200"/><di:waypoint x="420" y="200"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

  const hrDecisionStepConfig = {
    'review-task': {
      assigneeConfig: { mode: 'orgunit', orgUnitId: hrdId },
      notificationConfig: {
        taskAssigned: notifyAssignee(
          'Có quyết định nhân sự mới cần Ban Giám đốc xem xét và ký duyệt.',
          'Kiểm tra nội dung quyết định và chọn Phê duyệt hoặc Từ chối.',
        ),
        taskCompleted: notifyRequester('Quyết định nhân sự đã được Ban Giám đốc xem xét và xử lý.'),
      },
    },
  };

  const hrDecisionTaskFormFields = {
    'review-task': [
      {
        name: 'decision',
        label: 'Quyết định',
        type: 'select',
        required: true,
        options: [
          { label: 'Phê duyệt', value: 'APPROVED' },
          { label: 'Từ chối',   value: 'REJECTED' },
        ],
      },
      {
        name: 'rejectedReason',
        label: 'Lý do từ chối',
        type: 'textarea',
        placeholder: 'Điền lý do nếu từ chối...',
      },
    ],
  };

  await upsertDef({
    key: 'hr-decision-approval',
    name: 'Duyệt Quyết định Nhân sự',
    description: 'Quy trình ký duyệt quyết định nhân sự: Ban Giám đốc phê duyệt một bước',
    bpmnXml: hrDecisionApprovalXml,
    stepConfig: hrDecisionStepConfig,
    taskFormFields: hrDecisionTaskFormFields,
    orgUnitId,
  });
}

async function seedPhase2Demo() {
  try {
    // ── 1. OrgUnit hierarchy ────────────────────────────────────────────────
    const orgRoot = await prisma.orgUnit.findFirst({ where: { code: 'ROOT' } })
      ?? await prisma.orgUnit.create({ data: { name: 'Công ty', code: 'ROOT', level: 0 } });

    const orgDev = await prisma.orgUnit.findFirst({ where: { code: 'DEV' } })
      ?? await prisma.orgUnit.create({ data: { name: 'Phòng Kỹ thuật', code: 'DEV', parentId: orgRoot.id, level: 1 } });

    const orgHrd = await prisma.orgUnit.findFirst({ where: { code: 'HRD' } })
      ?? await prisma.orgUnit.create({ data: { name: 'Phòng Nhân sự', code: 'HRD', parentId: orgRoot.id, level: 1 } });

    const orgFin = await prisma.orgUnit.findFirst({ where: { code: 'FIN' } })
      ?? await prisma.orgUnit.create({ data: { name: 'Phòng Tài chính', code: 'FIN', parentId: orgRoot.id, level: 1 } });

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
      const emp = await prisma.employee.findFirst({ where: { code: def.code } })
        ?? await prisma.employee.create({
          data: {
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

    // Xóa records cũ (có thể có compliance=0) rồi tạo lại đúng
    await prisma.payrollRecord.deleteMany({ where: { periodId: payrollPeriod.id } });
    for (const pr of payrollDefs) {
      const emp  = employees[pr.empCode];
      const rate = rateMap[pr.empCode];
      const rec = calcPayrollCompliance({ dailyRate: rate, workDays: pr.workDays, overtimeHours: pr.overtimeHours });
      await prisma.payrollRecord.create({ data: { periodId: payrollPeriod.id, employeeId: emp.id, ...rec } });
    }

    console.log('  ✓ Payroll period "Tháng 5/2026" + 7 payroll records seeded (BHXH/TNCN đầy đủ)');

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
      const existing = await prisma.customer.findFirst({ where: { code: c.code } });
      const cust = existing
        ? await prisma.customer.update({ where: { id: existing.id }, data: c })
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
      const exists = await prisma.deal.findFirst({ where: { code: d.code } });
      if (!exists) await prisma.deal.create({ data: d });
    }
    console.log('  ✓ 4 deals seeded (1 WON)');

  } catch (err) {
    console.error('  ✗ seedCrmDemo error:', err);
  }
}

async function seedClientContractsDemo() {
  try {
    const customers = await prisma.customer.findMany({ select: { id: true, code: true } });
    const custMap: Record<string, string> = Object.fromEntries(customers.map(c => [c.code, c.id]));
    if (!custMap['VNG'] || !custMap['FPT'] || !custMap['VTEL']) {
      console.log('  ⚠ Chưa có customers, bỏ qua seed ClientContracts');
      return;
    }

    const contracts = [
      {
        contractNo: 'CTR-2025-001',
        title: 'Hợp đồng triển khai Portal nội bộ VNG',
        customerId: custMap['VNG'],
        type: 'SERVICE' as const,
        value: 320_000_000,
        currency: 'VND',
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-09-30'),
        signedAt: new Date('2025-02-20'),
        status: 'COMPLETED' as const,
        milestones: [
          { name: 'Kickoff & Analysis', dueDate: new Date('2025-03-31'), amount: 64_000_000,  status: 'PAID' as const, paidAt: new Date('2025-04-05') },
          { name: 'Design & Prototype', dueDate: new Date('2025-05-31'), amount: 96_000_000,  status: 'PAID' as const, paidAt: new Date('2025-06-02') },
          { name: 'Development Phase 1', dueDate: new Date('2025-07-31'), amount: 96_000_000, status: 'PAID' as const, paidAt: new Date('2025-08-01') },
          { name: 'UAT & Go-live',      dueDate: new Date('2025-09-30'), amount: 64_000_000,  status: 'PAID' as const, paidAt: new Date('2025-10-05') },
        ],
      },
      {
        contractNo: 'CTR-2025-002',
        title: 'Dịch vụ ERP Phase 1 — FPT Software',
        customerId: custMap['FPT'],
        type: 'SERVICE' as const,
        value: 580_000_000,
        currency: 'VND',
        startDate: new Date('2025-06-01'),
        endDate: new Date('2026-05-31'),
        signedAt: new Date('2025-05-25'),
        status: 'ACTIVE' as const,
        milestones: [
          { name: 'Tạm ứng ký hợp đồng', dueDate: new Date('2025-06-05'), amount: 116_000_000, status: 'PAID' as const, paidAt: new Date('2025-06-07') },
          { name: 'Hoàn thành phân tích',  dueDate: new Date('2025-08-31'), amount: 145_000_000, status: 'PAID' as const, paidAt: new Date('2025-09-03') },
          { name: 'Hoàn thành dev core',   dueDate: new Date('2026-01-31'), amount: 174_000_000, status: 'INVOICED' as const },
          { name: 'Go-live & bảo hành',    dueDate: new Date('2026-05-31'), amount: 145_000_000, status: 'PENDING' as const },
        ],
      },
      {
        contractNo: 'CTR-2026-001',
        title: 'SLA Support — Viettel Data Platform',
        customerId: custMap['VTEL'],
        type: 'SLA' as const,
        value: 240_000_000,
        currency: 'VND',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        signedAt: new Date('2025-12-20'),
        status: 'ACTIVE' as const,
        milestones: [
          { name: 'Q1/2026', dueDate: new Date('2026-03-31'), amount: 60_000_000, status: 'PAID' as const, paidAt: new Date('2026-04-05') },
          { name: 'Q2/2026', dueDate: new Date('2026-06-30'), amount: 60_000_000, status: 'INVOICED' as const },
          { name: 'Q3/2026', dueDate: new Date('2026-09-30'), amount: 60_000_000, status: 'PENDING' as const },
          { name: 'Q4/2026', dueDate: new Date('2026-12-31'), amount: 60_000_000, status: 'PENDING' as const },
        ],
      },
      {
        contractNo: 'CTR-2026-002',
        title: 'Phát triển Mobile App — FPT Mobile Suite',
        customerId: custMap['FPT'],
        type: 'PRODUCT' as const,
        value: 185_000_000,
        currency: 'VND',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-10-31'),
        signedAt: new Date('2026-03-28'),
        status: 'ACTIVE' as const,
        milestones: [
          { name: 'Tạm ứng',           dueDate: new Date('2026-04-05'), amount: 37_000_000,  status: 'PAID' as const, paidAt: new Date('2026-04-06') },
          { name: 'Hoàn thành thiết kế', dueDate: new Date('2026-06-15'), amount: 55_500_000, status: 'PENDING' as const },
          { name: 'Beta release',        dueDate: new Date('2026-09-15'), amount: 55_500_000, status: 'PENDING' as const },
          { name: 'Go-live',             dueDate: new Date('2026-10-31'), amount: 37_000_000,  status: 'PENDING' as const },
        ],
      },
      {
        contractNo: 'CTR-2026-003',
        title: 'Tư vấn chuyển đổi số — VNG',
        customerId: custMap['VNG'],
        type: 'SUPPORT' as const,
        value: 90_000_000,
        currency: 'VND',
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-07-31'),
        status: 'DRAFT' as const,
        milestones: [
          { name: 'Khảo sát & báo cáo hiện trạng', dueDate: new Date('2026-05-31'), amount: 30_000_000, status: 'PENDING' as const },
          { name: 'Roadmap chuyển đổi số',          dueDate: new Date('2026-06-30'), amount: 35_000_000, status: 'PENDING' as const },
          { name: 'Bàn giao tài liệu',              dueDate: new Date('2026-07-31'), amount: 25_000_000, status: 'PENDING' as const },
        ],
      },
    ];

    let created = 0;
    for (const { milestones, ...contractData } of contracts) {
      const existing = await (prisma as any).clientContract.findFirst({ where: { contractNo: contractData.contractNo } });
      if (existing) continue;
      const contract = await (prisma as any).clientContract.create({ data: contractData });
      for (const m of milestones) {
        await (prisma as any).contractMilestone.create({ data: { contractId: contract.id, ...m } });
      }
      created++;
    }
    console.log(`  ✓ ${created} client contracts seeded`);
  } catch (err) {
    console.error('  ✗ seedClientContractsDemo error:', err);
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
      const existing = await prisma.invoice.findFirst({ where: { code: def.code } });
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
      const existing = await prisma.jobOpening.findFirst({ where: { code: def.code } });
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
    const orgUnit = await prisma.orgUnit.findFirst({ where: { code: 'ROOT' } });

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

// ─── Payroll compliance calculator (dùng chung cho seed) ─────────────────────

function calcPayrollCompliance(opts: {
  dailyRate: number;
  workDays: number;
  overtimeHours?: number;
  allowances?: number;
  bonus?: number;
  dependentCount?: number;
}) {
  const BHXH_CEILING  = 20 * 2_340_000; // 46,800,000
  const SELF_DEDUCT   = 11_000_000;
  const DEP_DEDUCT    = 4_400_000;
  const BRACKETS      = [
    { from: 0,          to: 5_000_000,  rate: 0.05 },
    { from: 5_000_000,  to: 10_000_000, rate: 0.10 },
    { from: 10_000_000, to: 18_000_000, rate: 0.15 },
    { from: 18_000_000, to: 32_000_000, rate: 0.20 },
    { from: 32_000_000, to: 52_000_000, rate: 0.25 },
    { from: 52_000_000, to: 80_000_000, rate: 0.30 },
    { from: 80_000_000, to: null,       rate: 0.35 },
  ];

  const { dailyRate, workDays, overtimeHours = 0, allowances = 0, bonus = 0, dependentCount = 0 } = opts;
  const baseSalary  = Math.round(dailyRate * workDays);
  const overtimePay = Math.round((dailyRate / 8) * 1.5 * overtimeHours);
  const grossSalary = baseSalary + overtimePay + allowances + bonus;

  const bhBase         = Math.min(grossSalary, BHXH_CEILING);
  const bhxhEmployee   = Math.round(bhBase * 0.08);
  const bhytEmployee   = Math.round(bhBase * 0.015);
  const bhtnEmployee   = Math.round(bhBase * 0.01);
  const bhxhEmployer   = Math.round(bhBase * 0.17);
  const bhytEmployer   = Math.round(bhBase * 0.03);
  const bhtnEmployer   = Math.round(bhBase * 0.01);
  const tnldEmployer   = Math.round(bhBase * 0.005);

  const selfDeduction      = SELF_DEDUCT;
  const dependentDeduction = DEP_DEDUCT * dependentCount;
  const taxableIncome = Math.max(0,
    grossSalary - bhxhEmployee - bhytEmployee - bhtnEmployee - selfDeduction - dependentDeduction,
  );

  let pitAmount = 0;
  for (const b of BRACKETS) {
    if (taxableIncome <= b.from) break;
    const upper = b.to === null ? taxableIncome : Math.min(taxableIncome, b.to);
    pitAmount += Math.round((upper - b.from) * b.rate);
  }

  const netSalary     = grossSalary - bhxhEmployee - bhytEmployee - bhtnEmployee - pitAmount;
  const totalLaborCost = grossSalary + bhxhEmployer + bhytEmployer + bhtnEmployer + tnldEmployer;

  return {
    workDays, leaveDays: Math.max(0, 22 - workDays),
    paidLeaveDays: 0, unpaidLeaveDays: 0,
    overtimeHours,
    baseSalary, overtimePay, allowances, bonus, deductions: 0,
    grossSalary, bhxhEmployee, bhytEmployee, bhtnEmployee,
    bhxhEmployer, bhytEmployer, bhtnEmployer, tnldEmployer,
    selfDeduction, dependentDeduction, dependentCount,
    taxableIncome, pitAmount,
    netSalary, totalLaborCost,
  };
}

// ─── Enriched Demo — Projects, Tasks, TimeLogs, Timesheets, Payroll history, Recruitment ──

async function seedEnrichedDemo() {
  try {
    const existing = await prisma.project.findFirst({ where: { code: 'PROJ-FPT-001' } });
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

    const empAdmin   = await prisma.employee.findFirstOrThrow({ where: { code: 'EMP001' } });
    const empPm      = await prisma.employee.findFirstOrThrow({ where: { code: 'EMP002' } });
    const empDemo    = await prisma.employee.findFirstOrThrow({ where: { code: 'EMP003' } });
    const empHr      = await prisma.employee.findFirstOrThrow({ where: { code: 'EMP004' } });
    const empFinance = await prisma.employee.findFirstOrThrow({ where: { code: 'EMP005' } });
    const empDev1    = await prisma.employee.findFirstOrThrow({ where: { code: 'EMP006' } });
    const empDev2    = await prisma.employee.findFirstOrThrow({ where: { code: 'EMP007' } });

    const orgDev = await prisma.orgUnit.findFirstOrThrow({ where: { code: 'DEV' } });
    const orgHrd = await prisma.orgUnit.findFirstOrThrow({ where: { code: 'HRD' } });

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
      // Xóa records cũ (có thể có compliance=0) rồi tạo lại đúng
      await prisma.payrollRecord.deleteMany({ where: { periodId: pp.id } });
      for (const e of empList) {
        const rate = rateMap[e.code];
        const rec  = calcPayrollCompliance({ dailyRate: rate, workDays: 22, overtimeHours: 4, dependentCount: 0 });
        await prisma.payrollRecord.create({ data: { periodId: pp.id, employeeId: e.empId, ...rec } });
      }
    }
    console.log('  ✓ Payroll periods March + April 2026 seeded với đầy đủ trường compliance');

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
      const binhEmp = await prisma.employee.findFirst({ where: { code: 'EMP008' } })
        ?? await prisma.employee.create({ data: { code: 'EMP008', userId: binhUser.id, fullName: 'Trần Thị Bình', level: 'SENIOR', orgUnitId: orgDev.id, startDate: new Date('2026-06-01') } });
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
    const check = await prisma.asset.findFirst({ where: { code: 'LAPTOP-004' } });
    if (check) {
      console.log('  ✓ Assets enriched demo already seeded, skipping');
      return;
    }

    // ── Lấy orgUnits & employees ──────────────────────────────────────────────
    const orgRoot = await prisma.orgUnit.findFirstOrThrow({ where: { code: 'ROOT' } });
    const orgDev  = await prisma.orgUnit.findFirstOrThrow({ where: { code: 'DEV' } });
    const orgHrd  = await prisma.orgUnit.findFirstOrThrow({ where: { code: 'HRD' } });
    const orgFin  = await prisma.orgUnit.findFirstOrThrow({ where: { code: 'FIN' } });

    const empHr      = await prisma.employee.findFirstOrThrow({ where: { code: 'EMP004' } });
    const empFinance = await prisma.employee.findFirstOrThrow({ where: { code: 'EMP005' } });
    const empDev1    = await prisma.employee.findFirstOrThrow({ where: { code: 'EMP006' } });
    const empDev2    = await prisma.employee.findFirstOrThrow({ where: { code: 'EMP007' } });
    // EMP008 có thể chưa tồn tại nếu seedEnrichedDemo chưa chạy
    const empNewHire = await prisma.employee.findFirst({ where: { code: 'EMP008' } });

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
    const check = await prisma.customer.findFirst({ where: { code: 'MOMO' } });
    if (check) { console.log('  ✓ CRM enriched demo already seeded, skipping'); return; }

    const uAdmin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@loop.vn' } });
    const uPm    = await prisma.user.findUniqueOrThrow({ where: { email: 'pm@loop.vn' } });

    // Lấy project IDs để link deal → project
    const projFpt  = await prisma.project.findFirst({ where: { code: 'PROJ-FPT-001'  } });
    const projVtel = await prisma.project.findFirst({ where: { code: 'PROJ-VTEL-001' } });

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
      const row = await prisma.customer.findFirst({ where: { code } });
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
      const exists = await prisma.deal.findFirst({ where: { code: d.code } });
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
    const invExists = await prisma.invoice.findFirst({ where: { code: 'INV-VG-001' } });
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
    const invMomo = await prisma.invoice.findFirst({ where: { code: 'INV-MOMO-001' } });
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
    const check = await prisma.jobOpening.findFirst({ where: { code: 'JOB-2026-005' } });
    if (check) { console.log('  ✓ Recruit enriched demo already seeded, skipping'); return; }

    const uAdmin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@loop.vn' } });
    const uHr    = await prisma.user.findUniqueOrThrow({ where: { email: 'hr@loop.vn' } });
    const demoHash = await (await import('bcrypt')).hash('Demo@1234', 12);

    const orgDev = await prisma.orgUnit.findFirstOrThrow({ where: { code: 'DEV' } });
    const orgHrd = await prisma.orgUnit.findFirstOrThrow({ where: { code: 'HRD' } });
    const orgRoot = await prisma.orgUnit.findFirstOrThrow({ where: { code: 'ROOT' } });

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
    const namEmp = await prisma.employee.findFirst({ where: { code: 'EMP009' } })
      ?? await prisma.employee.create({ data: { code: 'EMP009', userId: namUser.id, fullName: 'Nguyễn Hữu Nam', level: 'JUNIOR', orgUnitId: orgDev.id, startDate: new Date('2026-05-01') } });
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
    const huongEmp = await prisma.employee.findFirst({ where: { code: 'EMP010' } })
      ?? await prisma.employee.create({ data: { code: 'EMP010', userId: huongUser.id, fullName: 'Ngô Thị Hương', level: 'JUNIOR', orgUnitId: orgDev.id, startDate: new Date('2026-05-15') } });
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

async function seedBugsDemo() {
  try {
    const uAdmin = await prisma.user.findUnique({ where: { email: 'admin@loop.vn' } });
    const uPm    = await prisma.user.findUnique({ where: { email: 'pm@loop.vn' } });
    const uDev1  = await prisma.user.findUnique({ where: { email: 'dev1@loop.vn' } });
    const uDev2  = await prisma.user.findUnique({ where: { email: 'dev2@loop.vn' } });
    const uDemo  = await prisma.user.findUnique({ where: { email: 'user.demo@loop.vn' } });

    if (!uAdmin || !uPm) { console.log('  ⚠ Thiếu users để seed bugs'); return; }

    const projFpt  = await prisma.project.findFirst({ where: { code: 'PROJ-FPT-001' } });
    const projVng  = await prisma.project.findFirst({ where: { code: 'PROJ-VNG-001' } });
    const projVtel = await prisma.project.findFirst({ where: { code: 'PROJ-VTEL-001' } });

    if (!projFpt || !projVng || !projVtel) { console.log('  ⚠ Thiếu projects để seed bugs'); return; }

    const existing = await prisma.bug.count();
    if (existing > 0) { console.log(`  ⏭  ${existing} bugs đã tồn tại, bỏ qua seed`); return; }

    const bugDefs = [
      // FPT ERP bugs
      {
        projectId: projFpt.id, reporterId: uPm.id, assigneeId: uDev1?.id,
        title: '[FPT] API /employees trả sai dữ liệu phân trang',
        description: 'Endpoint GET /employees?page=2 trả về cùng dữ liệu với page=1. Tái hiện 100% trên môi trường staging.',
        severity: 'HIGH', status: 'IN_PROGRESS', itemType: 'BUG', isCR: false,
        affectedModule: 'HR',
      },
      {
        projectId: projFpt.id, reporterId: uPm.id, assigneeId: uDev2?.id,
        title: '[FPT] Dark mode: header bảng nhân viên bị tối',
        description: 'Trên theme Dark, header cột bảng Personnel hiển thị màu #0F172A gần như đen — chữ không đọc được.',
        severity: 'MEDIUM', status: 'OPEN', itemType: 'BUG', isCR: false,
        affectedModule: 'UI',
      },
      {
        projectId: projFpt.id, reporterId: uAdmin.id, assigneeId: uDev1?.id,
        title: '[FPT] CR: Thêm export Excel cho bảng chấm công',
        description: 'Yêu cầu thêm nút Export Excel trên trang Attendance Manager, export 1 tháng data.',
        severity: 'LOW', status: 'PENDING_REVIEW', itemType: 'ISSUE', isCR: true,
        requesterName: 'Nguyễn Văn Khách', affectedModule: 'Timesheet',
      },
      {
        projectId: projFpt.id, reporterId: uDev1?.id ?? uPm.id, assigneeId: undefined,
        title: '[FPT] Login timeout không redirect về /login',
        description: 'Sau khi JWT hết hạn và refresh thất bại, app không redirect về /login mà bị trắng màn hình.',
        severity: 'CRITICAL', status: 'OPEN', itemType: 'BUG', isCR: false,
        affectedModule: 'Auth',
      },
      // VNG Portal bugs
      {
        projectId: projVng.id, reporterId: uAdmin.id, assigneeId: uDev2?.id,
        title: '[VNG] Org Chart không load khi có >50 nhân viên',
        description: 'Trang /org-chart bị treo spinner vô hạn khi tổ chức có nhiều hơn 50 nhân viên. Performance issue.',
        severity: 'HIGH', status: 'OPEN', itemType: 'BUG', isCR: false,
        affectedModule: 'HR',
      },
      {
        projectId: projVng.id, reporterId: uAdmin.id, assigneeId: uDev2?.id,
        title: '[VNG] CR: Thêm tab "Lịch sử" vào chi tiết hợp đồng',
        description: 'Client yêu cầu xem lịch sử thay đổi (audit log) khi xem chi tiết hợp đồng.',
        severity: 'MEDIUM', status: 'APPROVED', itemType: 'ISSUE', isCR: true,
        requesterName: 'Trần Thị Khách VNG', affectedModule: 'Contracts',
        pmApproverId: uAdmin.id,
      },
      {
        projectId: projVng.id, reporterId: uPm.id, assigneeId: uDev1?.id,
        title: '[VNG] Budget widget hiển thị NaN khi budgetCost = 0',
        description: 'Trang /budget hiển thị "NaN%" trong progress bar khi project có budgetCost = 0.',
        severity: 'MEDIUM', status: 'RESOLVED', itemType: 'BUG', isCR: false,
        affectedModule: 'Finance',
      },
      // Viettel bugs
      {
        projectId: projVtel.id, reporterId: uPm.id, assigneeId: uDemo?.id,
        title: '[VTEL] Kanban card bị mất khi kéo nhanh sang cột khác',
        description: 'Kéo task nhanh từ TODO sang DONE đôi khi card biến mất khỏi board. Xảy ra ~20% thao tác.',
        severity: 'HIGH', status: 'OPEN', itemType: 'BUG', isCR: false,
        affectedModule: 'PM',
      },
      {
        projectId: projVtel.id, reporterId: uAdmin.id, assigneeId: uDev1?.id,
        title: '[VTEL] Timeline không hiển thị task có startDate = endDate',
        description: 'Task chỉ có 1 ngày (startDate = dueDate) không hiển thị trên timeline Gantt.',
        severity: 'LOW', status: 'RESOLVED', itemType: 'BUG', isCR: false,
        affectedModule: 'Timeline',
      },
      {
        projectId: projVtel.id, reporterId: uPm.id, assigneeId: undefined,
        title: '[VTEL] CR: Thêm field "Ưu tiên" vào task',
        description: 'Request bổ sung trường Priority (Low/Medium/High/Critical) vào Task. Cần cả backend lẫn Kanban card UI.',
        severity: 'MEDIUM', status: 'PENDING_REVIEW', itemType: 'ISSUE', isCR: true,
        requesterName: 'PM Viettel', affectedModule: 'PM',
      },
    ];

    let count = 0;
    for (const def of bugDefs) {
      await prisma.bug.create({
        data: {
          projectId:      def.projectId,
          reporterId:     def.reporterId,
          assigneeId:     def.assigneeId,
          title:          def.title,
          description:    def.description,
          severity:       def.severity as any,
          status:         def.status as any,
          itemType:       def.itemType as any,
          isCR:           def.isCR,
          requesterName:  (def as any).requesterName,
          affectedModule: (def as any).affectedModule,
          pmApproverId:   (def as any).pmApproverId,
          approvedAt:     (def as any).pmApproverId ? new Date() : undefined,
          dueDate:        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });
      count++;
    }
    console.log(`  ✓ ${count} bugs & issues seeded`);
  } catch (err) {
    console.error('  ✗ seedBugsDemo error:', err);
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

async function seedPayrollComplianceConfig() {
  try {
    // Helper: createIfNotExists tránh lỗi upsert với tenantId nullable
    async function createIfAbsent(model: any, where: object, data: object) {
      const existing = await model.findFirst({ where });
      if (!existing) await model.create({ data });
    }

    // 1. InsuranceConfig — tỷ lệ BHXH/BHYT/BHTN từ 2020 (vẫn áp dụng 2026)
    await createIfAbsent((prisma as any).insuranceConfig,
      { tenantId: null, effectiveFrom: new Date('2020-01-01') },
      {
        tenantId:            null,
        effectiveFrom:       new Date('2020-01-01'),
        bhxhEmployeeRate:    0.08,
        bhytEmployeeRate:    0.015,
        bhtnEmployeeRate:    0.01,
        bhxhEmployerRate:    0.17,
        bhytEmployerRate:    0.03,
        bhtnEmployerRate:    0.01,
        tnldRate:            0.005,
        bhxhCeilingMultiple: 20,
        wageBase:            2340000,
      }
    );
    console.log('  ✓ InsuranceConfig seeded (BHXH 8%/17%, BHYT 1.5%/3%, BHTN 1%/1%, lương cơ sở 2.34tr)');

    // 2. TaxBracket 7 bậc (hiện hành đến 31/12/2025)
    await createIfAbsent((prisma as any).taxBracket,
      { tenantId: null, effectiveFrom: new Date('2013-07-01') },
      {
        tenantId:      null,
        name:          'Biểu thuế TNCN lũy tiến 7 bậc (TT111/2013)',
        effectiveFrom: new Date('2013-07-01'),
        brackets: [
          { min: 0,           max: 5_000_000,   rate: 0.05 },
          { min: 5_000_000,   max: 10_000_000,  rate: 0.10 },
          { min: 10_000_000,  max: 18_000_000,  rate: 0.15 },
          { min: 18_000_000,  max: 32_000_000,  rate: 0.20 },
          { min: 32_000_000,  max: 52_000_000,  rate: 0.25 },
          { min: 52_000_000,  max: 80_000_000,  rate: 0.30 },
          { min: 80_000_000,  max: null,         rate: 0.35 },
        ],
      }
    );

    // 3. TaxBracket 5 bậc áp dụng từ 1/1/2026
    await createIfAbsent((prisma as any).taxBracket,
      { tenantId: null, effectiveFrom: new Date('2026-01-01') },
      {
        tenantId:      null,
        name:          'Biểu thuế TNCN lũy tiến 5 bậc (dự kiến 2026)',
        effectiveFrom: new Date('2026-01-01'),
        brackets: [
          { min: 0,            max: 10_000_000,  rate: 0.05 },
          { min: 10_000_000,   max: 30_000_000,  rate: 0.15 },
          { min: 30_000_000,   max: 60_000_000,  rate: 0.25 },
          { min: 60_000_000,   max: 120_000_000, rate: 0.30 },
          { min: 120_000_000,  max: null,         rate: 0.35 },
        ],
      }
    );
    console.log('  ✓ TaxBracket seeded (7 bậc 2013 + 5 bậc 2026)');

    // 4. TaxDeductionConfig — giảm trừ gia cảnh từ 7/2020
    await createIfAbsent((prisma as any).taxDeductionConfig,
      { tenantId: null, effectiveFrom: new Date('2020-07-01') },
      {
        tenantId:           null,
        effectiveFrom:      new Date('2020-07-01'),
        selfDeduction:      11_000_000,
        dependentDeduction:  4_400_000,
      }
    );
    console.log('  ✓ TaxDeductionConfig seeded (bản thân 11tr, phụ thuộc 4.4tr)');

    // 5. WageZoneConfig — lương tối thiểu vùng từ 7/2024
    await createIfAbsent((prisma as any).wageZoneConfig,
      { tenantId: null, effectiveFrom: new Date('2024-07-01') },
      {
        tenantId:      null,
        effectiveFrom: new Date('2024-07-01'),
        zone1:         4_960_000,
        zone2:         4_410_000,
        zone3:         3_860_000,
        zone4:         3_450_000,
      }
    );
    console.log('  ✓ WageZoneConfig seeded (vùng 1: 4.96tr, vùng 2: 4.41tr, vùng 3: 3.86tr, vùng 4: 3.45tr)');

  } catch (err) {
    console.error('  ✗ seedPayrollComplianceConfig error:', err);
  }
}

// ─── HR v4.0 Demo Data ────────────────────────────────────────────────────────

async function seedHrV4Demo() {
  try {
    const existing = await prisma.jobTitle.count();
    if (existing > 0) {
      console.log(`  ⏭  ${existing} job titles đã tồn tại, bỏ qua HR v4.0 seed`);
      return;
    }

    // ── Org Units (đã tồn tại từ seedPhase2Demo) ──────────────────────────────
    const orgRoot = await prisma.orgUnit.findFirstOrThrow({ where: { code: 'ROOT' } });
    const orgDev  = await prisma.orgUnit.findFirst({ where: { code: 'DEV' } });
    const orgHrd  = await prisma.orgUnit.findFirst({ where: { code: 'HRD' } });
    const orgFin  = await prisma.orgUnit.findFirst({ where: { code: 'FIN' } });

    // ── 1. JobTitles ─────────────────────────────────────────────────────────
    const jobTitleDefs = [
      { code: 'JT-CEO',    name: 'Giám đốc điều hành',        band: 'E',  description: 'Chief Executive Officer' },
      { code: 'JT-CTO',    name: 'Giám đốc công nghệ',        band: 'E',  description: 'Chief Technology Officer' },
      { code: 'JT-PM',     name: 'Quản lý dự án',             band: 'M',  description: 'Project Manager / Technical Lead' },
      { code: 'JT-HRM',    name: 'Trưởng phòng nhân sự',      band: 'M',  description: 'HR Manager' },
      { code: 'JT-FIM',    name: 'Trưởng phòng tài chính',    band: 'M',  description: 'Finance Manager' },
      { code: 'JT-SWE',    name: 'Kỹ sư phần mềm',            band: 'IC', description: 'Software Engineer' },
      { code: 'JT-SRE',    name: 'Kỹ sư cao cấp',             band: 'IC', description: 'Senior Software Engineer' },
      { code: 'JT-QA',     name: 'Kỹ sư kiểm thử',            band: 'IC', description: 'QA Engineer' },
      { code: 'JT-DEV',    name: 'Lập trình viên',             band: 'IC', description: 'Developer' },
      { code: 'JT-HR',     name: 'Chuyên viên nhân sự',        band: 'IC', description: 'HR Specialist' },
      { code: 'JT-ACC',    name: 'Kế toán viên',               band: 'IC', description: 'Accountant' },
      { code: 'JT-INTERN', name: 'Thực tập sinh',              band: 'J',  description: 'Intern / Trainee' },
    ];

    const jobTitles: Record<string, string> = {};
    for (const jt of jobTitleDefs) {
      const rec = await prisma.jobTitle.create({ data: jt });
      jobTitles[jt.code] = rec.id;
    }
    console.log(`  ✓ ${jobTitleDefs.length} JobTitles seeded`);

    // ── 2. Positions ──────────────────────────────────────────────────────────
    const positionDefs = [
      { code: 'POS-CEO',   jobTitleId: jobTitles['JT-CEO']!,    orgUnitId: orgRoot.id,                headcount: 1, description: 'CEO — Toàn công ty' },
      { code: 'POS-CTO',   jobTitleId: jobTitles['JT-CTO']!,    orgUnitId: orgRoot.id,                headcount: 1, description: 'CTO — Toàn công ty' },
      { code: 'POS-PM1',   jobTitleId: jobTitles['JT-PM']!,     orgUnitId: orgDev?.id ?? orgRoot.id,  headcount: 2, description: 'PM phụ trách dev team' },
      { code: 'POS-HRM1',  jobTitleId: jobTitles['JT-HRM']!,    orgUnitId: orgHrd?.id ?? orgRoot.id,  headcount: 1, description: 'Trưởng phòng HR' },
      { code: 'POS-FIM1',  jobTitleId: jobTitles['JT-FIM']!,    orgUnitId: orgFin?.id ?? orgRoot.id,  headcount: 1, description: 'Trưởng phòng tài chính' },
      { code: 'POS-SRE1',  jobTitleId: jobTitles['JT-SRE']!,    orgUnitId: orgDev?.id ?? orgRoot.id,  headcount: 3, description: 'Senior Engineer — Backend' },
      { code: 'POS-DEV1',  jobTitleId: jobTitles['JT-DEV']!,    orgUnitId: orgDev?.id ?? orgRoot.id,  headcount: 5, description: 'Developer — Frontend/Fullstack' },
      { code: 'POS-HR1',   jobTitleId: jobTitles['JT-HR']!,     orgUnitId: orgHrd?.id ?? orgRoot.id,  headcount: 2, description: 'Chuyên viên nhân sự' },
      { code: 'POS-ACC1',  jobTitleId: jobTitles['JT-ACC']!,    orgUnitId: orgFin?.id ?? orgRoot.id,  headcount: 2, description: 'Kế toán' },
    ];

    const positions: Record<string, string> = {};
    for (const pos of positionDefs) {
      const rec = await prisma.position.create({ data: pos });
      positions[pos.code] = rec.id;
    }
    console.log(`  ✓ ${positionDefs.length} Positions seeded`);

    // ── 3. LeavePolicies ─────────────────────────────────────────────────────
    const lpVanPhong = await prisma.leavePolicy.create({
      data: {
        name: 'Chính sách phép văn phòng (tiêu chuẩn)',
        baseAnnualDays: 12,
        seniorityBonus: [
          { yearsFrom: 5,  bonusDays: 1 },
          { yearsFrom: 10, bonusDays: 2 },
        ],
        maxCarryOver: 5,
        carryOverExpiry: '03-31',
        carryOverExpiryAction: 'CLEAR',
        probationPolicy: { probationDays: 60, prorateLeave: true },
        isActive: true,
      },
    });

    await prisma.leavePolicy.create({
      data: {
        name: 'Chính sách phép lao động nặng nhọc',
        baseAnnualDays: 14,
        seniorityBonus: [
          { yearsFrom: 5,  bonusDays: 1 },
          { yearsFrom: 10, bonusDays: 2 },
        ],
        maxCarryOver: 3,
        carryOverExpiry: '03-31',
        carryOverExpiryAction: 'CLEAR',
        probationPolicy: { probationDays: 60, prorateLeave: true },
        isActive: true,
      },
    });

    await prisma.leavePolicy.create({
      data: {
        name: 'Chính sách phép quản lý cấp cao',
        baseAnnualDays: 15,
        seniorityBonus: [
          { yearsFrom: 3,  bonusDays: 1 },
          { yearsFrom: 7,  bonusDays: 2 },
          { yearsFrom: 12, bonusDays: 3 },
        ],
        maxCarryOver: 10,
        carryOverExpiry: '06-30',
        carryOverExpiryAction: 'PAY_OUT',
        probationPolicy: { probationDays: 60, prorateLeave: false },
        isActive: true,
      },
    });
    console.log('  ✓ 3 LeavePolicies seeded (văn phòng / nặng nhọc / quản lý)');

    // ── 4. HolidayCalendar 2026 (Việt Nam) ───────────────────────────────────
    const vn2026: Array<{ date: string; name: string; type: string }> = [
      { date: '2026-01-01', name: 'Tết Dương lịch',                    type: 'NATIONAL_HOLIDAY' },
      { date: '2026-01-27', name: 'Tết Nguyên đán (26 tháng Chạp)',   type: 'NATIONAL_HOLIDAY' },
      { date: '2026-01-28', name: 'Tết Nguyên đán (27 tháng Chạp)',   type: 'NATIONAL_HOLIDAY' },
      { date: '2026-01-29', name: 'Tết Nguyên đán (28 tháng Chạp)',   type: 'NATIONAL_HOLIDAY' },
      { date: '2026-01-30', name: 'Tết Nguyên đán (Mồng 1 Tết)',      type: 'NATIONAL_HOLIDAY' },
      { date: '2026-01-31', name: 'Tết Nguyên đán (Mồng 2 Tết)',      type: 'NATIONAL_HOLIDAY' },
      { date: '2026-02-01', name: 'Tết Nguyên đán (Mồng 3 Tết)',      type: 'NATIONAL_HOLIDAY' },
      { date: '2026-04-30', name: 'Ngày Giải phóng miền Nam',         type: 'NATIONAL_HOLIDAY' },
      { date: '2026-05-01', name: 'Ngày Quốc tế Lao động',            type: 'NATIONAL_HOLIDAY' },
      { date: '2026-09-02', name: 'Ngày Quốc khánh',                  type: 'NATIONAL_HOLIDAY' },
      { date: '2026-09-03', name: 'Ngày Quốc khánh (bù)',             type: 'COMPENSATORY_DAY' },
      // Giỗ Tổ Hùng Vương (10/3 Âm lịch ≈ 28/4/2026)
      { date: '2026-04-28', name: 'Giỗ Tổ Hùng Vương',               type: 'NATIONAL_HOLIDAY' },
    ];

    let holidayCount = 0;
    for (const h of vn2026) {
      await prisma.holidayCalendar.upsert({
        where: { date: new Date(h.date) },
        update: {},
        create: { year: 2026, date: new Date(h.date), name: h.name, type: h.type as any },
      });
      holidayCount++;
    }
    console.log(`  ✓ ${holidayCount} ngày lễ 2026 seeded`);

    // ── 5. Lấy danh sách employees ────────────────────────────────────────────
    const empList = await prisma.employee.findMany({
      where: { code: { in: ['EMP001','EMP002','EMP003','EMP004','EMP005','EMP006','EMP007'] } },
      select: { id: true, code: true, startDate: true },
    });
    const empMap: Record<string, { id: string; startDate: Date }> = {};
    for (const e of empList) empMap[e.code] = { id: e.id, startDate: e.startDate };

    // ── 6. Assign LeavePolicies & Positions to employees ─────────────────────
    const empPolicyMap: Record<string, string> = {
      EMP001: lpVanPhong.id, EMP002: lpVanPhong.id, EMP003: lpVanPhong.id,
      EMP004: lpVanPhong.id, EMP005: lpVanPhong.id, EMP006: lpVanPhong.id,
      EMP007: lpVanPhong.id,
    };
    const empPositionMap: Record<string, string> = {
      EMP001: positions['POS-CTO']!,   EMP002: positions['POS-PM1']!,
      EMP003: positions['POS-DEV1']!,  EMP004: positions['POS-HRM1']!,
      EMP005: positions['POS-ACC1']!,  EMP006: positions['POS-SRE1']!,
      EMP007: positions['POS-DEV1']!,
    };

    for (const [code, empData] of Object.entries(empMap)) {
      await prisma.employee.update({
        where: { id: empData.id },
        data: {
          leavePolicyId: empPolicyMap[code],
          positionId:    empPositionMap[code],
        },
      });
    }
    console.log('  ✓ LeavePolicy + Position gán cho 7 employees');

    // ── 7. SalaryRecords (lịch sử lương) ─────────────────────────────────────
    const salaryHistory: Array<{ code: string; salary: number; date: string; note: string }> = [
      // EMP001 — CTO, join 2023
      { code: 'EMP001', salary: 45_000_000, date: '2023-01-01', note: 'Mức lương khởi đầu khi gia nhập' },
      { code: 'EMP001', salary: 50_000_000, date: '2024-01-01', note: 'Tăng lương năm 2024' },
      { code: 'EMP001', salary: 55_000_000, date: '2025-07-01', note: 'Tăng lương giữa năm 2025' },
      // EMP002 — PM, join 2023
      { code: 'EMP002', salary: 35_000_000, date: '2023-01-01', note: 'Mức lương khởi đầu khi gia nhập' },
      { code: 'EMP002', salary: 38_000_000, date: '2024-01-01', note: 'Tăng lương năm 2024' },
      { code: 'EMP002', salary: 42_000_000, date: '2025-01-01', note: 'Tăng lương năm 2025' },
      // EMP003 — Dev, join 2024-06
      { code: 'EMP003', salary: 20_000_000, date: '2024-06-01', note: 'Mức lương khởi đầu' },
      { code: 'EMP003', salary: 23_000_000, date: '2025-06-01', note: 'Review 1 năm' },
      // EMP004 — HR Manager, join 2023
      { code: 'EMP004', salary: 28_000_000, date: '2023-01-01', note: 'Mức lương khởi đầu' },
      { code: 'EMP004', salary: 32_000_000, date: '2024-07-01', note: 'Thăng chức Trưởng phòng HR' },
      // EMP005 — Accountant, join 2024-06
      { code: 'EMP005', salary: 18_000_000, date: '2024-06-01', note: 'Mức lương khởi đầu' },
      { code: 'EMP005', salary: 20_000_000, date: '2025-06-01', note: 'Review 1 năm' },
      // EMP006 — Senior Dev, join 2023
      { code: 'EMP006', salary: 32_000_000, date: '2023-01-01', note: 'Mức lương khởi đầu' },
      { code: 'EMP006', salary: 36_000_000, date: '2024-04-01', note: 'Tăng lương theo thị trường' },
      { code: 'EMP006', salary: 40_000_000, date: '2025-04-01', note: 'Senior promotion' },
      // EMP007 — Dev, join 2024-06
      { code: 'EMP007', salary: 16_000_000, date: '2024-06-01', note: 'Mức lương khởi đầu' },
      { code: 'EMP007', salary: 18_500_000, date: '2025-06-01', note: 'Review 1 năm' },
    ];

    for (const s of salaryHistory) {
      const emp = empMap[s.code];
      if (!emp) continue;
      await prisma.salaryRecord.create({
        data: {
          employeeId:   emp.id,
          basicSalary:  s.salary,
          effectiveDate: new Date(s.date),
          source:       'MANUAL',
          note:         s.note,
        },
      });
    }
    console.log(`  ✓ ${salaryHistory.length} SalaryRecords seeded`);

    // ── 8. HrDecisions ───────────────────────────────────────────────────────
    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@loop.vn' }, select: { id: true } });

    const decisionDefs = [
      // HIRE decisions (2023)
      { empCode: 'EMP001', type: 'HIRE',          num: 'QD-2023-001', signed: '2022-12-28', effective: '2023-01-01',
        content: 'Quyết định tuyển dụng và bổ nhiệm vào vị trí Giám đốc Công nghệ (CTO)',
        toSalary: 45_000_000, status: 'APPROVED' },
      { empCode: 'EMP002', type: 'HIRE',          num: 'QD-2023-002', signed: '2022-12-28', effective: '2023-01-01',
        content: 'Quyết định tuyển dụng vào vị trí Quản lý Dự án',
        toSalary: 35_000_000, status: 'APPROVED' },
      { empCode: 'EMP004', type: 'HIRE',          num: 'QD-2023-003', signed: '2022-12-28', effective: '2023-01-01',
        content: 'Quyết định tuyển dụng vào vị trí Chuyên viên Nhân sự',
        toSalary: 28_000_000, status: 'APPROVED' },
      { empCode: 'EMP006', type: 'HIRE',          num: 'QD-2023-004', signed: '2022-12-28', effective: '2023-01-01',
        content: 'Quyết định tuyển dụng vào vị trí Kỹ sư phần mềm Senior',
        toSalary: 32_000_000, status: 'APPROVED' },
      // HIRE decisions (2024 mid-year batch)
      { empCode: 'EMP003', type: 'HIRE',          num: 'QD-2024-010', signed: '2024-05-28', effective: '2024-06-01',
        content: 'Quyết định tuyển dụng vào vị trí Lập trình viên',
        toSalary: 20_000_000, status: 'APPROVED' },
      { empCode: 'EMP005', type: 'HIRE',          num: 'QD-2024-011', signed: '2024-05-28', effective: '2024-06-01',
        content: 'Quyết định tuyển dụng vào vị trí Kế toán viên',
        toSalary: 18_000_000, status: 'APPROVED' },
      { empCode: 'EMP007', type: 'HIRE',          num: 'QD-2024-012', signed: '2024-05-28', effective: '2024-06-01',
        content: 'Quyết định tuyển dụng vào vị trí Lập trình viên',
        toSalary: 16_000_000, status: 'APPROVED' },
      // PROMOTION
      { empCode: 'EMP004', type: 'PROMOTION',     num: 'QD-2024-025', signed: '2024-06-28', effective: '2024-07-01',
        content: 'Quyết định bổ nhiệm Trưởng phòng Nhân sự kiêm phụ trách công tác tuyển dụng và đào tạo',
        fromSalary: 28_000_000, toSalary: 32_000_000, status: 'APPROVED' },
      { empCode: 'EMP006', type: 'PROMOTION',     num: 'QD-2025-008', signed: '2025-03-28', effective: '2025-04-01',
        content: 'Quyết định nâng bậc từ Kỹ sư phần mềm lên Senior Engineer, phụ trách kỹ thuật nhóm Backend',
        fromSalary: 36_000_000, toSalary: 40_000_000, status: 'APPROVED' },
      // SALARY_CHANGE
      { empCode: 'EMP001', type: 'SALARY_CHANGE', num: 'QD-2024-001', signed: '2023-12-28', effective: '2024-01-01',
        content: 'Điều chỉnh lương năm 2024 theo kết quả đánh giá hiệu suất cuối năm (đạt KPI 95%)',
        fromSalary: 45_000_000, toSalary: 50_000_000, status: 'APPROVED' },
      { empCode: 'EMP002', type: 'SALARY_CHANGE', num: 'QD-2025-001', signed: '2024-12-28', effective: '2025-01-01',
        content: 'Điều chỉnh lương năm 2025',
        fromSalary: 38_000_000, toSalary: 42_000_000, status: 'APPROVED' },
      // DRAFT decision (chưa duyệt)
      { empCode: 'EMP003', type: 'SALARY_CHANGE', num: 'QD-2026-003', signed: null, effective: '2026-06-01',
        content: 'Đề xuất tăng lương sau 2 năm gắn bó, đạt hiệu suất tốt trong Q1/2026',
        fromSalary: 23_000_000, toSalary: 26_000_000, status: 'DRAFT' },
      // REWARD
      { empCode: 'EMP002', type: 'COMMENDATION',   num: 'QD-2026-001', signed: '2026-01-05', effective: '2026-01-05',
        content: 'Khen thưởng hoàn thành xuất sắc dự án FPT ERP Q4/2025 — thưởng 2 tháng lương',
        status: 'APPROVED' },
    ];

    let decisionCount = 0;
    const decisionIdMap: Record<string, string> = {};
    for (const d of decisionDefs) {
      const emp = empMap[d.empCode];
      if (!emp) continue;
      const dec = await prisma.hrDecision.create({
        data: {
          decisionNumber: d.num,
          type:           d.type as any,
          employeeId:     emp.id,
          signedDate:     d.signed ? new Date(d.signed) : null,
          effectiveDate:  new Date(d.effective),
          content:        d.content,
          signedBy:       'Ban Giám đốc Loop.vn',
          status:         d.status as any,
          fromSalary:     (d as any).fromSalary ?? null,
          toSalary:       (d as any).toSalary ?? null,
          createdById:    adminUser?.id ?? null,
        },
      });
      decisionIdMap[d.num] = dec.id;
      decisionCount++;
    }
    console.log(`  ✓ ${decisionCount} HrDecisions seeded`);

    // ── 9. WorkHistory (từ decisions) ─────────────────────────────────────────
    const workHistoryDefs = [
      { code: 'EMP001', event: 'HR_DECISION', date: '2023-01-01', title: 'Gia nhập công ty — CTO',            decNum: 'QD-2023-001' },
      { code: 'EMP002', event: 'HR_DECISION', date: '2023-01-01', title: 'Gia nhập công ty — PM',             decNum: 'QD-2023-002' },
      { code: 'EMP004', event: 'HR_DECISION', date: '2023-01-01', title: 'Gia nhập công ty — HR Specialist',  decNum: 'QD-2023-003' },
      { code: 'EMP006', event: 'HR_DECISION', date: '2023-01-01', title: 'Gia nhập công ty — Senior Dev',     decNum: 'QD-2023-004' },
      { code: 'EMP003', event: 'HR_DECISION', date: '2024-06-01', title: 'Gia nhập công ty — Developer',      decNum: 'QD-2024-010' },
      { code: 'EMP005', event: 'HR_DECISION', date: '2024-06-01', title: 'Gia nhập công ty — Accountant',     decNum: 'QD-2024-011' },
      { code: 'EMP007', event: 'HR_DECISION', date: '2024-06-01', title: 'Gia nhập công ty — Developer',      decNum: 'QD-2024-012' },
      { code: 'EMP004', event: 'HR_DECISION', date: '2024-07-01', title: 'Bổ nhiệm Trưởng phòng Nhân sự',    decNum: 'QD-2024-025' },
      { code: 'EMP006', event: 'HR_DECISION', date: '2025-04-01', title: 'Thăng cấp Senior Engineer',         decNum: 'QD-2025-008' },
      { code: 'EMP001', event: 'HR_DECISION', date: '2024-01-01', title: 'Điều chỉnh lương 2024',             decNum: 'QD-2024-001' },
      { code: 'EMP002', event: 'HR_DECISION', date: '2025-01-01', title: 'Điều chỉnh lương 2025',             decNum: 'QD-2025-001' },
    ];

    for (const wh of workHistoryDefs) {
      const emp = empMap[wh.code];
      if (!emp) continue;
      await prisma.workHistory.create({
        data: {
          employeeId:  emp.id,
          eventType:   wh.event as any,
          eventDate:   new Date(wh.date),
          title:       wh.title,
          hrDecisionId: decisionIdMap[wh.decNum] ?? null,
        },
      });
    }
    console.log(`  ✓ ${workHistoryDefs.length} WorkHistory events seeded`);

    // ── 10. InsuranceEnrollments + SocialInsuranceBooks ───────────────────────
    const insuranceDefs = [
      { code: 'EMP001', bhxhBook: 'VN-2301-0001', salary: 46_800_000, start: '2023-01-01' },
      { code: 'EMP002', bhxhBook: 'VN-2301-0002', salary: 36_400_000, start: '2023-01-01' },
      { code: 'EMP004', bhxhBook: 'VN-2301-0004', salary: 29_120_000, start: '2023-01-01' },
      { code: 'EMP006', bhxhBook: 'VN-2301-0006', salary: 33_280_000, start: '2023-01-01' },
      { code: 'EMP003', bhxhBook: 'VN-2406-0003', salary: 20_800_000, start: '2024-06-01' },
      { code: 'EMP005', bhxhBook: 'VN-2406-0005', salary: 18_720_000, start: '2024-06-01' },
      { code: 'EMP007', bhxhBook: 'VN-2406-0007', salary: 16_640_000, start: '2024-06-01' },
    ];

    for (const ins of insuranceDefs) {
      const emp = empMap[ins.code];
      if (!emp) continue;

      const enrollment = await prisma.insuranceEnrollment.create({
        data: {
          employeeId:     emp.id,
          bhxhBookNumber: ins.bhxhBook,
          insuranceSalary: ins.salary,
          startDate:      new Date(ins.start),
          status:         'ACTIVE',
        },
      });

      // SocialInsuranceBook
      await prisma.socialInsuranceBook.create({
        data: {
          employeeId:         emp.id,
          enrollmentId:       enrollment.id,
          bookNumber:         ins.bhxhBook,
          issueDate:          new Date(ins.start),
          issueAuthority:     'Bảo hiểm xã hội TP. Hà Nội',
          receivedByEmployee: true,
          receivedDate:       new Date(ins.start),
        },
      });

      // Sự kiện ENROLL ban đầu
      await prisma.insuranceEvent.create({
        data: {
          enrollmentId:   enrollment.id,
          eventType:      'ENROLL',
          insuranceSalary: ins.salary,
          effectiveDate:  new Date(ins.start),
          reason:         'Tham gia BHXH khi ký HĐLĐ',
        },
      });
    }

    // Salary change events for EMP004 (promoted → insurance salary updated)
    const enr004 = await prisma.insuranceEnrollment.findFirst({
      where: { employee: { code: 'EMP004' } },
    });
    if (enr004) {
      await prisma.insuranceEvent.create({
        data: {
          enrollmentId:   enr004.id,
          eventType:      'SALARY_CHANGE',
          insuranceSalary: 33_280_000,
          effectiveDate:  new Date('2024-07-01'),
          reason:         'Điều chỉnh mức đóng BHXH sau khi thăng chức Trưởng phòng',
          hrDecisionId:   decisionIdMap['QD-2024-025'] ?? null,
        },
      });
    }
    console.log('  ✓ 7 InsuranceEnrollments + SocialInsuranceBooks + events seeded');

    // ── 11. MonthlyAttendance (Mar–May 2026) ──────────────────────────────────
    const monthlyAttDefs = [
      // March 2026 (22 working days)
      { code: 'EMP001', year: 2026, month: 3, workDays: 22,   paidLeave: 0,   unpaidLeave: 0, otHours: 8,  absent: 0, holiday: 0, status: 'LOCKED' },
      { code: 'EMP002', year: 2026, month: 3, workDays: 21.5, paidLeave: 0.5, unpaidLeave: 0, otHours: 4,  absent: 0, holiday: 0, status: 'LOCKED' },
      { code: 'EMP003', year: 2026, month: 3, workDays: 22,   paidLeave: 0,   unpaidLeave: 0, otHours: 0,  absent: 0, holiday: 0, status: 'LOCKED' },
      { code: 'EMP004', year: 2026, month: 3, workDays: 21,   paidLeave: 1,   unpaidLeave: 0, otHours: 0,  absent: 0, holiday: 0, status: 'LOCKED' },
      { code: 'EMP005', year: 2026, month: 3, workDays: 22,   paidLeave: 0,   unpaidLeave: 0, otHours: 0,  absent: 0, holiday: 0, status: 'LOCKED' },
      { code: 'EMP006', year: 2026, month: 3, workDays: 22,   paidLeave: 0,   unpaidLeave: 0, otHours: 16, absent: 0, holiday: 0, status: 'LOCKED' },
      { code: 'EMP007', year: 2026, month: 3, workDays: 21,   paidLeave: 0,   unpaidLeave: 1, otHours: 0,  absent: 0, holiday: 0, status: 'LOCKED' },
      // April 2026 (21 working days — 30/4 nghỉ lễ)
      { code: 'EMP001', year: 2026, month: 4, workDays: 21,   paidLeave: 0,   unpaidLeave: 0, otHours: 4,  absent: 0, holiday: 1, status: 'LOCKED' },
      { code: 'EMP002', year: 2026, month: 4, workDays: 21,   paidLeave: 0,   unpaidLeave: 0, otHours: 0,  absent: 0, holiday: 1, status: 'LOCKED' },
      { code: 'EMP003', year: 2026, month: 4, workDays: 20,   paidLeave: 1,   unpaidLeave: 0, otHours: 0,  absent: 0, holiday: 1, status: 'LOCKED' },
      { code: 'EMP004', year: 2026, month: 4, workDays: 21,   paidLeave: 0,   unpaidLeave: 0, otHours: 0,  absent: 0, holiday: 1, status: 'LOCKED' },
      { code: 'EMP005', year: 2026, month: 4, workDays: 21,   paidLeave: 0,   unpaidLeave: 0, otHours: 0,  absent: 0, holiday: 1, status: 'LOCKED' },
      { code: 'EMP006', year: 2026, month: 4, workDays: 21,   paidLeave: 0,   unpaidLeave: 0, otHours: 12, absent: 0, holiday: 1, status: 'LOCKED' },
      { code: 'EMP007', year: 2026, month: 4, workDays: 21,   paidLeave: 0,   unpaidLeave: 0, otHours: 0,  absent: 0, holiday: 1, status: 'LOCKED' },
      // May 2026 (19 working days đã qua — chưa lock)
      { code: 'EMP001', year: 2026, month: 5, workDays: 19,   paidLeave: 0,   unpaidLeave: 0, otHours: 4,  absent: 0, holiday: 2, status: 'OPEN' },
      { code: 'EMP002', year: 2026, month: 5, workDays: 19,   paidLeave: 0,   unpaidLeave: 0, otHours: 0,  absent: 0, holiday: 2, status: 'OPEN' },
      { code: 'EMP003', year: 2026, month: 5, workDays: 18,   paidLeave: 1,   unpaidLeave: 0, otHours: 0,  absent: 0, holiday: 2, status: 'OPEN' },
      { code: 'EMP004', year: 2026, month: 5, workDays: 18.5, paidLeave: 0.5, unpaidLeave: 0, otHours: 0,  absent: 0, holiday: 2, status: 'OPEN' },
      { code: 'EMP005', year: 2026, month: 5, workDays: 19,   paidLeave: 0,   unpaidLeave: 0, otHours: 0,  absent: 0, holiday: 2, status: 'OPEN' },
      { code: 'EMP006', year: 2026, month: 5, workDays: 19,   paidLeave: 0,   unpaidLeave: 0, otHours: 8,  absent: 0, holiday: 2, status: 'OPEN' },
      { code: 'EMP007', year: 2026, month: 5, workDays: 17,   paidLeave: 0,   unpaidLeave: 2, otHours: 0,  absent: 0, holiday: 2, status: 'OPEN' },
    ];

    for (const ma of monthlyAttDefs) {
      const emp = empMap[ma.code];
      if (!emp) continue;
      await prisma.monthlyAttendance.upsert({
        where: { employeeId_year_month: { employeeId: emp.id, year: ma.year, month: ma.month } },
        update: {},
        create: {
          employeeId:     emp.id,
          year:           ma.year,
          month:          ma.month,
          workDays:       ma.workDays,
          paidLeaveDays:  ma.paidLeave,
          unpaidLeaveDays: ma.unpaidLeave,
          otHours:        ma.otHours,
          absentDays:     ma.absent,
          holidayDays:    ma.holiday,
          status:         ma.status as any,
          lockedAt:       ma.status === 'LOCKED' ? new Date(`2026-0${ma.month + 1}-05`) : null,
        },
      });
    }
    console.log(`  ✓ ${monthlyAttDefs.length} MonthlyAttendance records seeded (Mar–May 2026)`);

    // ── 12. Một số AttendanceRecord ngày trong tháng 5/2026 ───────────────────
    const today = new Date('2026-05-29');
    const checkDates = ['2026-05-26', '2026-05-27', '2026-05-28', '2026-05-29'];
    let attCount = 0;
    for (const dateStr of checkDates) {
      const d = new Date(dateStr);
      if (d > today) continue;
      for (const [code, empData] of Object.entries(empMap)) {
        // EMP007 nghỉ phép không lương 27, 28
        if (code === 'EMP007' && (dateStr === '2026-05-27' || dateStr === '2026-05-28')) {
          await prisma.attendanceRecord.upsert({
            where: { employeeId_date: { employeeId: empData.id, date: d } },
            update: {},
            create: {
              employeeId: empData.id,
              date:       d,
              status:     'LEAVE',
              leaveType:  'Nghỉ không lương',
              isManual:   true,
              note:       'Nghỉ phép không lương',
            },
          });
        } else {
          const checkIn  = new Date(`${dateStr}T08:${15 + attCount % 10}:00.000Z`);
          const checkOut = new Date(`${dateStr}T17:${30 + attCount % 20}:00.000Z`);
          const totalHours = 8.5 + (code === 'EMP006' && dateStr === '2026-05-29' ? 2 : 0);
          await prisma.attendanceRecord.upsert({
            where: { employeeId_date: { employeeId: empData.id, date: d } },
            update: {},
            create: {
              employeeId: empData.id,
              date:       d,
              checkIn,
              checkOut,
              totalHours,
              status:     'PRESENT',
              isManual:   false,
            },
          });
        }
        attCount++;
      }
    }
    console.log(`  ✓ ${attCount} AttendanceRecord ngày cuối tháng 5/2026 seeded`);

    console.log('✅ HR v4.0 demo data hoàn tất!');
  } catch (err) {
    console.error('  ✗ seedHrV4Demo error:', err);
    throw err;
  }
}

async function seedHrV4Missing() {
  try {
    // Kiểm tra từng phần còn thiếu
    const whCount  = await prisma.workHistory.count();
    const insCount = await prisma.insuranceEnrollment.count();
    const maCount  = await prisma.monthlyAttendance.count();

    if (whCount > 0 && insCount > 0 && maCount > 0) {
      console.log(`  ⏭  WorkHistory/Insurance/Attendance đã đủ, bỏ qua`);
      return;
    }

    const empList = await prisma.employee.findMany({
      where: { code: { in: ['EMP001','EMP002','EMP003','EMP004','EMP005','EMP006','EMP007'] } },
      select: { id: true, code: true },
    });
    const empMap: Record<string, string> = {};
    for (const e of empList) empMap[e.code] = e.id;

    // Lấy decision IDs từ DB
    const decisions = await prisma.hrDecision.findMany({
      where: { decisionNumber: { not: null } },
      select: { id: true, decisionNumber: true },
    });
    const decMap: Record<string, string> = {};
    for (const d of decisions) {
      if (d.decisionNumber) decMap[d.decisionNumber] = d.id;
    }

    // ── WorkHistory ───────────────────────────────────────────────────────────
    if (whCount === 0) {
      const workHistoryDefs = [
        { code: 'EMP001', event: 'HR_DECISION', date: '2023-01-01', title: 'Gia nhập công ty — CTO',           decNum: 'QD-2023-001' },
        { code: 'EMP002', event: 'HR_DECISION', date: '2023-01-01', title: 'Gia nhập công ty — PM',            decNum: 'QD-2023-002' },
        { code: 'EMP004', event: 'HR_DECISION', date: '2023-01-01', title: 'Gia nhập công ty — HR Specialist', decNum: 'QD-2023-003' },
        { code: 'EMP006', event: 'HR_DECISION', date: '2023-01-01', title: 'Gia nhập công ty — Senior Dev',    decNum: 'QD-2023-004' },
        { code: 'EMP003', event: 'HR_DECISION', date: '2024-06-01', title: 'Gia nhập công ty — Developer',     decNum: 'QD-2024-010' },
        { code: 'EMP005', event: 'HR_DECISION', date: '2024-06-01', title: 'Gia nhập công ty — Accountant',    decNum: 'QD-2024-011' },
        { code: 'EMP007', event: 'HR_DECISION', date: '2024-06-01', title: 'Gia nhập công ty — Developer',     decNum: 'QD-2024-012' },
        { code: 'EMP004', event: 'HR_DECISION', date: '2024-07-01', title: 'Bổ nhiệm Trưởng phòng Nhân sự',   decNum: 'QD-2024-025' },
        { code: 'EMP006', event: 'HR_DECISION', date: '2025-04-01', title: 'Thăng cấp Senior Engineer',        decNum: 'QD-2025-008' },
        { code: 'EMP001', event: 'HR_DECISION', date: '2024-01-01', title: 'Điều chỉnh lương 2024',           decNum: 'QD-2024-001' },
        { code: 'EMP002', event: 'HR_DECISION', date: '2025-01-01', title: 'Điều chỉnh lương 2025',           decNum: 'QD-2025-001' },
      ];
      for (const wh of workHistoryDefs) {
        const empId = empMap[wh.code];
        if (!empId) continue;
        await prisma.workHistory.create({
          data: {
            employeeId:   empId,
            eventType:    wh.event as any,
            eventDate:    new Date(wh.date),
            title:        wh.title,
            hrDecisionId: decMap[wh.decNum] ?? null,
          },
        });
      }
      console.log(`  ✓ ${workHistoryDefs.length} WorkHistory events seeded`);
    }

    // ── InsuranceEnrollments + SocialInsuranceBooks + InsuranceEvents ─────────
    if (insCount === 0) {
      const insuranceDefs = [
        { code: 'EMP001', bhxhBook: 'VN-2301-0001', salary: 46_800_000, start: '2023-01-01' },
        { code: 'EMP002', bhxhBook: 'VN-2301-0002', salary: 36_400_000, start: '2023-01-01' },
        { code: 'EMP004', bhxhBook: 'VN-2301-0004', salary: 29_120_000, start: '2023-01-01' },
        { code: 'EMP006', bhxhBook: 'VN-2301-0006', salary: 33_280_000, start: '2023-01-01' },
        { code: 'EMP003', bhxhBook: 'VN-2406-0003', salary: 20_800_000, start: '2024-06-01' },
        { code: 'EMP005', bhxhBook: 'VN-2406-0005', salary: 18_720_000, start: '2024-06-01' },
        { code: 'EMP007', bhxhBook: 'VN-2406-0007', salary: 16_640_000, start: '2024-06-01' },
      ];

      for (const ins of insuranceDefs) {
        const empId = empMap[ins.code];
        if (!empId) continue;
        const enrollment = await prisma.insuranceEnrollment.create({
          data: {
            employeeId:      empId,
            bhxhBookNumber:  ins.bhxhBook,
            insuranceSalary: ins.salary,
            startDate:       new Date(ins.start),
            status:          'ACTIVE',
          },
        });
        await prisma.socialInsuranceBook.create({
          data: {
            employeeId:         empId,
            enrollmentId:       enrollment.id,
            bookNumber:         ins.bhxhBook,
            issueDate:          new Date(ins.start),
            issueAuthority:     'Bảo hiểm xã hội TP. Hà Nội',
            receivedByEmployee: true,
            receivedDate:       new Date(ins.start),
          },
        });
        await prisma.insuranceEvent.create({
          data: {
            enrollmentId:    enrollment.id,
            eventType:       'ENROLL',
            insuranceSalary: ins.salary,
            effectiveDate:   new Date(ins.start),
            reason:          'Tham gia BHXH khi ký HĐLĐ',
          },
        });
      }

      // Salary change event cho EMP004 sau thăng chức
      const enr004 = await prisma.insuranceEnrollment.findFirst({
        where: { employee: { code: 'EMP004' } },
      });
      if (enr004) {
        await prisma.insuranceEvent.create({
          data: {
            enrollmentId:    enr004.id,
            eventType:       'SALARY_CHANGE',
            insuranceSalary: 33_280_000,
            effectiveDate:   new Date('2024-07-01'),
            reason:          'Điều chỉnh mức đóng BHXH sau khi thăng chức Trưởng phòng',
            hrDecisionId:    decMap['QD-2024-025'] ?? null,
          },
        });
      }
      console.log('  ✓ 7 InsuranceEnrollments + SocialInsuranceBooks + events seeded');
    }

    // ── MonthlyAttendance (Mar–May 2026) ──────────────────────────────────────
    if (maCount === 0) {
      const monthlyAttDefs = [
        { code: 'EMP001', year: 2026, month: 3, workDays: 22,   paidLeave: 0,   unpaidLeave: 0, otHours: 8,  holiday: 0, status: 'LOCKED' },
        { code: 'EMP002', year: 2026, month: 3, workDays: 21.5, paidLeave: 0.5, unpaidLeave: 0, otHours: 4,  holiday: 0, status: 'LOCKED' },
        { code: 'EMP003', year: 2026, month: 3, workDays: 22,   paidLeave: 0,   unpaidLeave: 0, otHours: 0,  holiday: 0, status: 'LOCKED' },
        { code: 'EMP004', year: 2026, month: 3, workDays: 21,   paidLeave: 1,   unpaidLeave: 0, otHours: 0,  holiday: 0, status: 'LOCKED' },
        { code: 'EMP005', year: 2026, month: 3, workDays: 22,   paidLeave: 0,   unpaidLeave: 0, otHours: 0,  holiday: 0, status: 'LOCKED' },
        { code: 'EMP006', year: 2026, month: 3, workDays: 22,   paidLeave: 0,   unpaidLeave: 0, otHours: 16, holiday: 0, status: 'LOCKED' },
        { code: 'EMP007', year: 2026, month: 3, workDays: 21,   paidLeave: 0,   unpaidLeave: 1, otHours: 0,  holiday: 0, status: 'LOCKED' },
        { code: 'EMP001', year: 2026, month: 4, workDays: 21,   paidLeave: 0,   unpaidLeave: 0, otHours: 4,  holiday: 1, status: 'LOCKED' },
        { code: 'EMP002', year: 2026, month: 4, workDays: 21,   paidLeave: 0,   unpaidLeave: 0, otHours: 0,  holiday: 1, status: 'LOCKED' },
        { code: 'EMP003', year: 2026, month: 4, workDays: 20,   paidLeave: 1,   unpaidLeave: 0, otHours: 0,  holiday: 1, status: 'LOCKED' },
        { code: 'EMP004', year: 2026, month: 4, workDays: 21,   paidLeave: 0,   unpaidLeave: 0, otHours: 0,  holiday: 1, status: 'LOCKED' },
        { code: 'EMP005', year: 2026, month: 4, workDays: 21,   paidLeave: 0,   unpaidLeave: 0, otHours: 0,  holiday: 1, status: 'LOCKED' },
        { code: 'EMP006', year: 2026, month: 4, workDays: 21,   paidLeave: 0,   unpaidLeave: 0, otHours: 12, holiday: 1, status: 'LOCKED' },
        { code: 'EMP007', year: 2026, month: 4, workDays: 21,   paidLeave: 0,   unpaidLeave: 0, otHours: 0,  holiday: 1, status: 'LOCKED' },
        { code: 'EMP001', year: 2026, month: 5, workDays: 19,   paidLeave: 0,   unpaidLeave: 0, otHours: 4,  holiday: 2, status: 'OPEN' },
        { code: 'EMP002', year: 2026, month: 5, workDays: 19,   paidLeave: 0,   unpaidLeave: 0, otHours: 0,  holiday: 2, status: 'OPEN' },
        { code: 'EMP003', year: 2026, month: 5, workDays: 18,   paidLeave: 1,   unpaidLeave: 0, otHours: 0,  holiday: 2, status: 'OPEN' },
        { code: 'EMP004', year: 2026, month: 5, workDays: 18.5, paidLeave: 0.5, unpaidLeave: 0, otHours: 0,  holiday: 2, status: 'OPEN' },
        { code: 'EMP005', year: 2026, month: 5, workDays: 19,   paidLeave: 0,   unpaidLeave: 0, otHours: 0,  holiday: 2, status: 'OPEN' },
        { code: 'EMP006', year: 2026, month: 5, workDays: 19,   paidLeave: 0,   unpaidLeave: 0, otHours: 8,  holiday: 2, status: 'OPEN' },
        { code: 'EMP007', year: 2026, month: 5, workDays: 17,   paidLeave: 0,   unpaidLeave: 2, otHours: 0,  holiday: 2, status: 'OPEN' },
      ];

      for (const ma of monthlyAttDefs) {
        const empId = empMap[ma.code];
        if (!empId) continue;
        await prisma.monthlyAttendance.upsert({
          where: { employeeId_year_month: { employeeId: empId, year: ma.year, month: ma.month } },
          update: {},
          create: {
            employeeId:      empId,
            year:            ma.year,
            month:           ma.month,
            workDays:        ma.workDays,
            paidLeaveDays:   ma.paidLeave,
            unpaidLeaveDays: ma.unpaidLeave,
            otHours:         ma.otHours,
            absentDays:      0,
            holidayDays:     ma.holiday,
            status:          ma.status as any,
            lockedAt:        ma.status === 'LOCKED' ? new Date(`2026-0${ma.month + 1}-05`) : null,
          },
        });
      }
      console.log(`  ✓ ${monthlyAttDefs.length} MonthlyAttendance records seeded (Mar–May 2026)`);

      // Một số AttendanceRecord ngày cuối tháng 5/2026
      const checkDates = ['2026-05-26', '2026-05-27', '2026-05-28', '2026-05-29'];
      let attCount = 0;
      for (const dateStr of checkDates) {
        const d = new Date(dateStr);
        for (const [code, empId] of Object.entries(empMap)) {
          if (code === 'EMP007' && (dateStr === '2026-05-27' || dateStr === '2026-05-28')) {
            await prisma.attendanceRecord.upsert({
              where: { employeeId_date: { employeeId: empId, date: d } },
              update: {},
              create: {
                employeeId: empId,
                date:       d,
                status:     'LEAVE',
                leaveType:  'Nghỉ không lương',
                isManual:   true,
                note:       'Nghỉ phép không lương',
              },
            });
          } else {
            const checkIn  = new Date(`${dateStr}T01:15:00.000Z`);
            const checkOut = new Date(`${dateStr}T10:30:00.000Z`);
            const totalHours = code === 'EMP006' && dateStr === '2026-05-29' ? 10.5 : 8.25;
            await prisma.attendanceRecord.upsert({
              where: { employeeId_date: { employeeId: empId, date: d } },
              update: {},
              create: {
                employeeId: empId,
                date:       d,
                checkIn,
                checkOut,
                totalHours,
                status:     'PRESENT',
                isManual:   false,
              },
            });
          }
          attCount++;
        }
      }
      console.log(`  ✓ ${attCount} AttendanceRecords seeded (26–29 May 2026)`);
    }

  } catch (err) {
    console.error('  ✗ seedHrV4Missing error:', err);
  }
}

async function seedOvertimeRequestsDemo() {
  const existing = await prisma.overtimeRequest.count();
  if (existing >= 5) {
    console.log(`  ⏭  ${existing} OT requests đã tồn tại, bỏ qua`);
    return;
  }

  const employees = await prisma.employee.findMany({ take: 8, orderBy: { createdAt: 'asc' } });
  if (employees.length === 0) {
    console.log('  ⏭  Không có nhân viên, bỏ qua OT seed');
    return;
  }

  const otData = [
    { idx: 0, date: new Date('2026-05-05'), fromTime: '18:00', toTime: '21:00', hours: 3, reason: 'Hoàn thiện báo cáo quý 1', status: 'APPROVED' as const },
    { idx: 1, date: new Date('2026-05-08'), fromTime: '18:00', toTime: '20:00', hours: 2, reason: 'Triển khai tính năng mới theo yêu cầu khách hàng', status: 'APPROVED' as const },
    { idx: 2, date: new Date('2026-05-12'), fromTime: '18:30', toTime: '21:30', hours: 3, reason: 'Sửa lỗi khẩn cấp production', status: 'APPROVED' as const },
    { idx: 0, date: new Date('2026-05-15'), fromTime: '18:00', toTime: '22:00', hours: 4, reason: 'Chuẩn bị demo sản phẩm cho đối tác', status: 'PENDING' as const },
    { idx: 3, date: new Date('2026-05-16'), fromTime: '18:00', toTime: '20:00', hours: 2, reason: 'Họp online với đối tác nước ngoài (múi giờ lệch)', status: 'PENDING' as const },
    { idx: 1, date: new Date('2026-05-19'), fromTime: '18:00', toTime: '21:00', hours: 3, reason: 'Hoàn tất tài liệu kỹ thuật cho sprint', status: 'REJECTED' as const },
    { idx: 2, date: new Date('2026-05-22'), fromTime: '18:00', toTime: '20:00', hours: 2, reason: 'Kiểm thử hệ thống trước khi go-live', status: 'PENDING' as const },
    { idx: 4, date: new Date('2026-05-23'), fromTime: '18:00', toTime: '21:00', hours: 3, reason: 'Backup và migration dữ liệu khách hàng', status: 'APPROVED' as const },
    { idx: 3, date: new Date('2026-05-26'), fromTime: '18:00', toTime: '22:00', hours: 4, reason: 'Sprint review & retrospective + planning tháng 6', status: 'PENDING' as const },
    { idx: 5, date: new Date('2026-05-27'), fromTime: '18:00', toTime: '20:00', hours: 2, reason: 'Cập nhật dashboard analytics theo yêu cầu BGĐ', status: 'PENDING' as const },
  ];

  let count = 0;
  for (const ot of otData) {
    const emp = employees[ot.idx % employees.length];
    try {
      await prisma.overtimeRequest.upsert({
        where: { employeeId_date: { employeeId: emp.id, date: ot.date } },
        update: {},
        create: {
          employeeId: emp.id,
          date: ot.date,
          fromTime: ot.fromTime,
          toTime: ot.toTime,
          hours: ot.hours,
          reason: ot.reason,
          status: ot.status,
          ...(ot.status === 'REJECTED' ? { rejectedReason: 'Không đủ cơ sở phê duyệt, vui lòng liên hệ quản lý trực tiếp' } : {}),
        },
      });
      count++;
    } catch { /* skip conflict */ }
  }
  console.log(`  ✓ ${count} OT requests seeded`);
}

async function seedWorkShifts() {
  const count = await prisma.workShift.count();
  if (count >= 3) { console.log('  ⏭  WorkShifts đã tồn tại'); return; }

  const shifts = [
    { name: 'Ca hành chính', code: 'HC', type: 'HANH_CHINH' as const, startTime: '08:00', endTime: '17:00', breakMinutes: 60, description: 'Ca làm việc hành chính tiêu chuẩn' },
    { name: 'Ca sáng', code: 'CS', type: 'CA_SANG' as const, startTime: '06:00', endTime: '14:00', breakMinutes: 30, description: 'Ca sáng sản xuất' },
    { name: 'Ca chiều', code: 'CC', type: 'CA_CHIEU' as const, startTime: '14:00', endTime: '22:00', breakMinutes: 30, description: 'Ca chiều sản xuất' },
    { name: 'Ca đêm', code: 'CD', type: 'CA_DEM' as const, startTime: '22:00', endTime: '06:00', breakMinutes: 30, description: 'Ca đêm sản xuất' },
    { name: 'Linh hoạt', code: 'LH', type: 'LINH_HOAT' as const, startTime: '09:00', endTime: '18:00', breakMinutes: 60, description: 'Linh hoạt thời gian (core hours 10h-16h)' },
  ];

  for (const s of shifts) {
    await prisma.workShift.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
  }

  // Gán ca HC mặc định cho 5 nhân viên đầu tiên
  const hcShift = await prisma.workShift.findFirst({ where: { code: 'HC' } });
  const employees = await prisma.employee.findMany({ take: 5, orderBy: { createdAt: 'asc' } });
  if (hcShift) {
    for (const emp of employees) {
      const existing = await prisma.shiftAssignment.findFirst({
        where: { employeeId: emp.id, effectiveTo: null },
      });
      if (!existing) {
        await prisma.shiftAssignment.create({
          data: {
            employeeId: emp.id,
            shiftId: hcShift.id,
            effectiveFrom: new Date('2026-01-01'),
            note: 'Ca mặc định',
          },
        });
      }
    }
  }
  console.log(`  ✓ ${shifts.length} WorkShifts seeded`);
}

async function seedWorkSchedules() {
  const count = await prisma.workSchedule.count();
  if (count >= 3) { console.log('  ⏭  WorkSchedules đã tồn tại'); return; }

  const employees = await prisma.employee.findMany({ take: 6, orderBy: { createdAt: 'asc' } });
  if (employees.length < 3) { console.log('  ⚠  Không đủ nhân viên để seed WorkSchedules'); return; }

  const shiftHC = await prisma.workShift.findFirst({ where: { code: 'HC' } });
  const shiftCS = await prisma.workShift.findFirst({ where: { code: 'CS' } });
  const shiftCC = await prisma.workShift.findFirst({ where: { code: 'CC' } });
  const shiftCD = await prisma.workShift.findFirst({ where: { code: 'CD' } });

  if (!shiftHC || !shiftCS || !shiftCC || !shiftCD) {
    console.log('  ⚠  Chưa có WorkShifts — chạy seedWorkShifts trước'); return;
  }

  // Template 1: Hành chính (dành cho văn phòng)
  const tpl1 = await prisma.workSchedule.create({
    data: {
      name: 'Lịch hành chính chuẩn',
      description: 'Ca hành chính 8h-17h, áp dụng cho nhân viên văn phòng',
      repeatType: 'MONTHLY',
      isActive: true,
      phases: { create: [{ shiftId: shiftHC.id, phaseOrder: 0 }] },
    },
  });

  // Template 2: Xoay ca sáng-chiều theo tuần (nhà máy)
  const tpl2 = await prisma.workSchedule.create({
    data: {
      name: 'Xoay ca sáng-chiều theo tuần',
      description: 'Tuần 1 ca sáng, tuần 2 ca chiều, lặp lại',
      repeatType: 'WEEKLY',
      isActive: true,
      phases: {
        create: [
          { shiftId: shiftCS.id, phaseOrder: 0 },
          { shiftId: shiftCC.id, phaseOrder: 1 },
        ],
      },
    },
  });

  // Template 3: Xoay 3 ca theo ngày (sản xuất liên tục)
  const tpl3 = await prisma.workSchedule.create({
    data: {
      name: 'Xoay 3 ca liên tục (ngày)',
      description: 'Ca sáng → Ca chiều → Ca đêm, xoay mỗi ngày',
      repeatType: 'DAILY',
      isActive: true,
      phases: {
        create: [
          { shiftId: shiftCS.id, phaseOrder: 0 },
          { shiftId: shiftCC.id, phaseOrder: 1 },
          { shiftId: shiftCD.id, phaseOrder: 2 },
        ],
      },
    },
  });

  // Gán nhân viên vào các lịch
  const effectiveFrom = new Date('2026-01-01');

  // Template 1 (hành chính): nhân viên 1-2
  await prisma.workScheduleEnrollment.createMany({
    data: [
      { scheduleId: tpl1.id, employeeId: employees[0].id, effectiveFrom },
      { scheduleId: tpl1.id, employeeId: employees[1].id, effectiveFrom },
    ],
    skipDuplicates: true,
  });

  // Template 2 (xoay tuần): nhân viên 3-4
  await prisma.workScheduleEnrollment.createMany({
    data: [
      { scheduleId: tpl2.id, employeeId: employees[2].id, effectiveFrom },
      { scheduleId: tpl2.id, employeeId: employees[3].id, effectiveFrom },
    ],
    skipDuplicates: true,
  });

  // Template 3 (xoay ngày): nhân viên 5-6
  await prisma.workScheduleEnrollment.createMany({
    data: [
      { scheduleId: tpl3.id, employeeId: employees[4].id, effectiveFrom },
      ...(employees[5] ? [{ scheduleId: tpl3.id, employeeId: employees[5].id, effectiveFrom }] : []),
    ],
    skipDuplicates: true,
  });

  console.log('  ✓ 3 WorkSchedule templates + enrollments seeded');
}

// ─── FEED POSTS ────────────────────────────────────────────────────────────────
async function seedFeedPosts() {
  const count = await prisma.feedPost.count();
  if (count > 0) {
    console.log('  ✓ FeedPost đã có dữ liệu, bỏ qua');
    return;
  }

  const users = await prisma.user.findMany({ take: 5 });
  if (users.length === 0) {
    console.log('  ⚠ Không tìm thấy user, bỏ qua seedFeedPosts');
    return;
  }

  const u = (i: number) => users[i % users.length].id;

  const posts = await prisma.$transaction([
    // ANNOUNCEMENT 1 — pinned
    prisma.feedPost.create({
      data: {
        type: 'ANNOUNCEMENT',
        authorId: u(0),
        title: 'Cập nhật chính sách làm việc từ xa Q3/2026',
        content:
          'Kể từ ngày 01/07/2026, công ty áp dụng chính sách Hybrid Work: tối đa 2 ngày/tuần làm việc tại nhà. Nhân viên cần đăng ký lịch remote trước 17:00 thứ Sáu hàng tuần qua hệ thống Loop. Vui lòng đọc kỹ tài liệu đính kèm và liên hệ HR nếu có thắc mắc.',
        isPinned: true,
      },
    }),
    // ANNOUNCEMENT 2
    prisma.feedPost.create({
      data: {
        type: 'ANNOUNCEMENT',
        authorId: u(0),
        title: 'Lịch nghỉ lễ Quốc khánh 2/9/2026',
        content:
          'Thông báo lịch nghỉ lễ Quốc khánh 2/9: Công ty nghỉ từ thứ Tư 02/09 đến hết thứ Sáu 04/09/2026 (3 ngày). Nhân viên có lịch làm bù vui lòng đăng ký với quản lý trực tiếp trước ngày 28/08. Chúc toàn thể CBNV kỳ nghỉ vui vẻ!',
        isPinned: false,
      },
    }),
    // KUDOS 1
    prisma.feedPost.create({
      data: {
        type: 'KUDOS',
        authorId: u(1),
        title: 'Kudos cho team Backend! 🎉',
        content:
          'Xin chúc mừng và cảm ơn toàn bộ team Backend đã hoàn thành migration hệ thống lên PostgreSQL 16 trước deadline 3 ngày! Đặc biệt cảm ơn anh Minh và chị Lan đã làm thêm cuối tuần để đảm bảo hệ thống ổn định. Các bạn thật tuyệt vời! 💪',
        isPinned: false,
      },
    }),
    // KUDOS 2
    prisma.feedPost.create({
      data: {
        type: 'KUDOS',
        authorId: u(2),
        title: 'Cảm ơn team Kinh doanh tháng 5!',
        content:
          'Team Kinh doanh đã vượt chỉ tiêu doanh thu tháng 5 lên đến 127%! Đặc biệt chào mừng deal mới với đối tác FPT và Viettel. Sự nỗ lực của các bạn là nguồn cảm hứng cho toàn công ty. Xứng đáng được nghỉ một ngày bù! 🏆',
        isPinned: false,
      },
    }),
    // BIRTHDAY 1
    prisma.feedPost.create({
      data: {
        type: 'BIRTHDAY',
        authorId: u(0),
        title: 'Chúc mừng sinh nhật Nguyễn Thị Hương! 🎂',
        content:
          'Hôm nay là sinh nhật của chị Nguyễn Thị Hương — Trưởng phòng Nhân sự. Chúc chị một ngày thật vui, tràn đầy niềm vui và sức khỏe dồi dào! Cả công ty gửi lời chúc mừng tốt đẹp nhất đến chị! 🥳🎉',
        isPinned: false,
      },
    }),
    // BIRTHDAY 2
    prisma.feedPost.create({
      data: {
        type: 'BIRTHDAY',
        authorId: u(0),
        title: 'Happy Birthday Trần Văn Đức! 🎂',
        content:
          'Chúc mừng sinh nhật anh Trần Văn Đức — Senior Developer của team Backend! Cảm ơn anh đã đóng góp rất nhiều cho hệ thống trong suốt thời gian qua. Chúc anh sinh nhật vui vẻ, luôn mạnh khỏe và tiếp tục phát huy! 🚀',
        isPinned: false,
      },
    }),
    // DOCUMENT 1
    prisma.feedPost.create({
      data: {
        type: 'DOCUMENT',
        authorId: u(3),
        title: 'Tài liệu: Quy trình onboarding nhân viên mới 2026',
        content:
          'Phòng HR vừa cập nhật tài liệu hướng dẫn onboarding nhân viên mới cho năm 2026. Tài liệu bao gồm: checklist ngày đầu tiên, danh sách tài khoản cần tạo, quy trình bàn giao thiết bị, và lịch đào tạo hội nhập 2 tuần đầu. Mọi quản lý vui lòng đọc và áp dụng cho nhân viên mới.',
        isPinned: false,
      },
    }),
    // DOCUMENT 2
    prisma.feedPost.create({
      data: {
        type: 'DOCUMENT',
        authorId: u(4),
        title: 'Hướng dẫn sử dụng hệ thống Loop ERP v3.0',
        content:
          'Loop ERP v3.0 đã được ra mắt với nhiều tính năng mới: quản lý xe cộ, đặt phòng họp, lịch sự kiện công ty và bảng tin nội bộ. Tài liệu hướng dẫn sử dụng đã được đăng tải trên cổng thông tin nội bộ. Mọi thắc mắc vui lòng liên hệ team IT qua email it-support@loop.vn.',
        isPinned: false,
      },
    }),
  ]);

  // Thêm reactions cho một số post
  await prisma.feedReaction.createMany({
    data: [
      { postId: posts[0].id, userId: u(1), emoji: '👍' },
      { postId: posts[0].id, userId: u(2), emoji: '✅' },
      { postId: posts[0].id, userId: u(3), emoji: '👍' },
      { postId: posts[2].id, userId: u(0), emoji: '👍' },
      { postId: posts[2].id, userId: u(3), emoji: '👍' },
      { postId: posts[3].id, userId: u(1), emoji: '✅' },
      { postId: posts[3].id, userId: u(4), emoji: '👀' },
      { postId: posts[6].id, userId: u(2), emoji: '👀' },
    ],
    skipDuplicates: true,
  });

  console.log('  ✓ 8 FeedPost + reactions seeded');
}

// ─── MEETING ROOMS & BOOKINGS ───────────────────────────────────────────────
async function seedMeetingRooms() {
  const count = await prisma.meetingRoom.count();
  if (count > 0) {
    console.log('  ✓ MeetingRoom đã có dữ liệu, bỏ qua');
    return;
  }

  const users = await prisma.user.findMany({ take: 5 });
  if (users.length === 0) {
    console.log('  ⚠ Không tìm thấy user, bỏ qua seedMeetingRooms');
    return;
  }

  const u = (i: number) => users[i % users.length].id;

  const rooms = await prisma.$transaction([
    prisma.meetingRoom.create({
      data: {
        name: 'Phòng họp A101',
        floor: '1',
        capacity: 8,
        amenities: ['Máy chiếu', 'Bảng trắng', 'Điều hòa'],
        status: 'ACTIVE',
      },
    }),
    prisma.meetingRoom.create({
      data: {
        name: 'Phòng họp B201',
        floor: '2',
        capacity: 12,
        amenities: ['Màn hình lớn', 'Video call', 'Điều hòa'],
        status: 'ACTIVE',
      },
    }),
    prisma.meetingRoom.create({
      data: {
        name: 'Phòng hội thảo C301',
        floor: '3',
        capacity: 30,
        amenities: ['Sân khấu', 'Hệ thống âm thanh', 'Điều hòa'],
        status: 'ACTIVE',
      },
    }),
    prisma.meetingRoom.create({
      data: {
        name: 'Phòng họp nhỏ D102',
        floor: '1',
        capacity: 4,
        amenities: ['TV', 'Bảng trắng'],
        status: 'ACTIVE',
      },
    }),
    prisma.meetingRoom.create({
      data: {
        name: 'Phòng đào tạo E401',
        floor: '4',
        capacity: 20,
        amenities: ['Máy chiếu', 'Laptop', 'Wifi riêng'],
        status: 'MAINTENANCE',
      },
    }),
  ]);

  // Bookings: 3 hôm nay (2026-05-29), 3 ngày mai + tuần này
  const today = new Date('2026-05-29');
  const tomorrow = new Date('2026-05-30');
  const day3 = new Date('2026-05-31');

  const mkTime = (base: Date, h: number, m = 0) => {
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d;
  };

  await prisma.roomBooking.createMany({
    data: [
      // Hôm nay
      {
        roomId: rooms[0].id,
        bookedById: u(0),
        title: 'Họp weekly team Product',
        startTime: mkTime(today, 9, 0),
        endTime: mkTime(today, 10, 0),
        attendees: ['pm@loop.vn', 'dev@loop.vn'],
        status: 'CONFIRMED',
        note: 'Review sprint backlog tuần này',
      },
      {
        roomId: rooms[1].id,
        bookedById: u(1),
        title: 'Demo sản phẩm cho khách hàng FPT',
        startTime: mkTime(today, 14, 0),
        endTime: mkTime(today, 15, 30),
        attendees: ['sales@loop.vn', 'cto@loop.vn'],
        status: 'CONFIRMED',
        note: 'Chuẩn bị slide và demo môi trường staging',
      },
      {
        roomId: rooms[3].id,
        bookedById: u(2),
        title: 'Phỏng vấn ứng viên Senior Dev',
        startTime: mkTime(today, 16, 0),
        endTime: mkTime(today, 17, 0),
        attendees: ['hr@loop.vn', 'tech-lead@loop.vn'],
        status: 'CONFIRMED',
      },
      // Ngày mai
      {
        roomId: rooms[0].id,
        bookedById: u(3),
        title: 'Họp review OKR tháng 6',
        startTime: mkTime(tomorrow, 9, 30),
        endTime: mkTime(tomorrow, 11, 0),
        attendees: ['ceo@loop.vn', 'coo@loop.vn'],
        status: 'CONFIRMED',
        note: 'Chuẩn bị báo cáo kết quả tháng 5',
      },
      {
        roomId: rooms[2].id,
        bookedById: u(4),
        title: 'All-hands meeting tháng 5/2026',
        startTime: mkTime(tomorrow, 14, 0),
        endTime: mkTime(tomorrow, 16, 0),
        attendees: ['all-staff@loop.vn'],
        status: 'CONFIRMED',
        note: 'Toàn thể nhân viên tham dự',
      },
      {
        roomId: rooms[1].id,
        bookedById: u(0),
        title: 'Đào tạo kỹ năng thuyết trình',
        startTime: mkTime(day3, 9, 0),
        endTime: mkTime(day3, 12, 0),
        attendees: ['hr@loop.vn'],
        status: 'CONFIRMED',
        note: 'Trainer: Nguyễn Thanh Hùng từ VTC Academy',
      },
    ],
    skipDuplicates: true,
  });

  console.log('  ✓ 5 MeetingRoom + 6 RoomBooking seeded');
}

// ─── VEHICLES & REQUESTS ────────────────────────────────────────────────────
async function seedVehicles() {
  const count = await prisma.vehicle.count();
  if (count > 0) {
    console.log('  ✓ Vehicle đã có dữ liệu, bỏ qua');
    return;
  }

  const users = await prisma.user.findMany({ take: 5 });
  if (users.length === 0) {
    console.log('  ⚠ Không tìm thấy user, bỏ qua seedVehicles');
    return;
  }

  const u = (i: number) => users[i % users.length].id;

  const vehicles = await prisma.$transaction([
    prisma.vehicle.create({
      data: {
        name: 'Toyota Innova',
        plateNumber: '51A-12345',
        type: 'MPV',
        seats: 7,
        status: 'AVAILABLE',
      },
    }),
    prisma.vehicle.create({
      data: {
        name: 'Ford Transit',
        plateNumber: '51B-67890',
        type: 'Van',
        seats: 16,
        status: 'AVAILABLE',
      },
    }),
    prisma.vehicle.create({
      data: {
        name: 'Toyota Camry',
        plateNumber: '51C-11111',
        type: 'Sedan',
        seats: 4,
        status: 'IN_USE',
        driverId: u(0),
      },
    }),
    prisma.vehicle.create({
      data: {
        name: 'Honda City',
        plateNumber: '51D-22222',
        type: 'Sedan',
        seats: 4,
        status: 'AVAILABLE',
      },
    }),
    prisma.vehicle.create({
      data: {
        name: 'Hyundai County',
        plateNumber: '51E-33333',
        type: 'Bus',
        seats: 29,
        status: 'MAINTENANCE',
      },
    }),
  ]);

  const today = new Date('2026-05-29');
  const yesterday = new Date('2026-05-28');
  const tomorrow = new Date('2026-05-30');
  const nextWeek1 = new Date('2026-06-02');
  const nextWeek2 = new Date('2026-06-03');

  const mkTime = (base: Date, h: number, m = 0) => {
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d;
  };

  await prisma.vehicleRequest.createMany({
    data: [
      // PENDING — ngày mai
      {
        vehicleId: vehicles[0].id,
        requestedById: u(1),
        purpose: 'Đưa đón khách hàng FPT từ sân bay Tân Sơn Nhất về văn phòng',
        destination: 'Sân bay Tân Sơn Nhất → 285 Cách Mạng Tháng 8, Q.10, TP.HCM',
        startTime: mkTime(tomorrow, 8, 0),
        endTime: mkTime(tomorrow, 12, 0),
        passengerCount: 4,
        status: 'PENDING',
        note: 'Khách hàng VIP, cần xe sạch và tài xế lịch sự',
      },
      {
        vehicleId: vehicles[1].id,
        requestedById: u(2),
        purpose: 'Vận chuyển thiết bị đến chi nhánh Hà Nội',
        destination: 'Kho Q.Bình Chánh → 12 Láng Hạ, Ba Đình, Hà Nội',
        startTime: mkTime(tomorrow, 6, 0),
        endTime: mkTime(tomorrow, 20, 0),
        passengerCount: 3,
        status: 'PENDING',
      },
      // APPROVED — tuần sau
      {
        vehicleId: vehicles[3].id,
        requestedById: u(3),
        approvedById: u(0),
        purpose: 'Họp đối tác Viettel tại Hà Nội',
        destination: '1 Giang Văn Minh, Ba Đình, Hà Nội (Tập đoàn Viettel)',
        startTime: mkTime(nextWeek1, 7, 0),
        endTime: mkTime(nextWeek1, 18, 0),
        passengerCount: 2,
        status: 'APPROVED',
        note: 'Mang theo hợp đồng ký kết',
      },
      {
        vehicleId: vehicles[0].id,
        requestedById: u(4),
        approvedById: u(0),
        purpose: 'Đưa ban lãnh đạo đi tham quan nhà máy đối tác',
        destination: 'KCN Biên Hòa 2, Đồng Nai',
        startTime: mkTime(nextWeek2, 8, 0),
        endTime: mkTime(nextWeek2, 17, 0),
        passengerCount: 6,
        status: 'APPROVED',
      },
      // IN_PROGRESS — hôm nay
      {
        vehicleId: vehicles[2].id,
        requestedById: u(1),
        approvedById: u(0),
        purpose: 'Đưa đón Ban Giám đốc họp với nhà đầu tư',
        destination: 'Sofitel Saigon Plaza, 17 Lê Duẩn, Q.1, TP.HCM',
        startTime: mkTime(today, 9, 0),
        endTime: mkTime(today, 17, 0),
        passengerCount: 2,
        status: 'IN_PROGRESS',
        note: 'Tài xế chờ tại bãi đậu xe khách sạn',
      },
      {
        vehicleId: vehicles[1].id,
        requestedById: u(2),
        approvedById: u(0),
        purpose: 'Đưa đón nhân viên đi team building',
        destination: 'Khu du lịch Suối Tiên, Q.9, TP.HCM',
        startTime: mkTime(today, 7, 30),
        endTime: mkTime(today, 18, 0),
        passengerCount: 15,
        status: 'IN_PROGRESS',
      },
      // COMPLETED — hôm qua
      {
        vehicleId: vehicles[3].id,
        requestedById: u(3),
        approvedById: u(0),
        purpose: 'Giao tài liệu và hợp đồng cho đối tác',
        destination: 'Tòa nhà Bitexco, 2 Hải Triều, Q.1, TP.HCM',
        startTime: mkTime(yesterday, 10, 0),
        endTime: mkTime(yesterday, 12, 0),
        passengerCount: 1,
        status: 'COMPLETED',
      },
      // REJECTED
      {
        vehicleId: vehicles[4].id,
        requestedById: u(4),
        approvedById: u(0),
        purpose: 'Thuê xe đi du lịch cá nhân cuối tuần',
        destination: 'Vũng Tàu, Bà Rịa - Vũng Tàu',
        startTime: mkTime(tomorrow, 6, 0),
        endTime: mkTime(tomorrow, 22, 0),
        passengerCount: 10,
        status: 'REJECTED',
        rejectionReason: 'Xe không được sử dụng cho mục đích cá nhân. Chỉ phục vụ công việc của công ty.',
      },
    ],
    skipDuplicates: true,
  });

  console.log('  ✓ 5 Vehicle + 8 VehicleRequest seeded');
}

// ─── CALENDAR EVENTS ────────────────────────────────────────────────────────
async function seedCalendarEvents() {
  const count = await prisma.calendarEvent.count();
  if (count > 0) {
    console.log('  ✓ CalendarEvent đã có dữ liệu, bỏ qua');
    return;
  }

  const users = await prisma.user.findMany({ take: 5 });
  if (users.length === 0) {
    console.log('  ⚠ Không tìm thấy user, bỏ qua seedCalendarEvents');
    return;
  }

  const u = (i: number) => users[i % users.length].id;

  const mkDt = (dateStr: string, h: number, m = 0) => {
    const d = new Date(dateStr);
    d.setHours(h, m, 0, 0);
    return d;
  };

  await prisma.calendarEvent.createMany({
    data: [
      // MEETING — 3 cuộc họp
      {
        title: 'Họp weekly team — tuần 22/2026',
        eventType: 'MEETING',
        startTime: mkDt('2026-05-29', 9, 0),
        endTime: mkDt('2026-05-29', 10, 0),
        isAllDay: false,
        location: 'Phòng họp A101',
        color: '#3B82F6',
        createdById: u(0),
        attendees: ['pm@loop.vn', 'dev@loop.vn', 'design@loop.vn'],
        description: 'Review sprint, cập nhật tiến độ và phân công công việc tuần tới',
      },
      {
        title: 'Daily standup — Backend team',
        eventType: 'MEETING',
        startTime: mkDt('2026-05-30', 9, 0),
        endTime: mkDt('2026-05-30', 9, 15),
        isAllDay: false,
        location: 'Phòng họp nhỏ D102 / Google Meet',
        color: '#3B82F6',
        createdById: u(1),
        attendees: ['backend@loop.vn'],
        description: 'Standup 15 phút: done/doing/blocker',
      },
      {
        title: 'Sprint Review & Retrospective — Sprint 14',
        eventType: 'MEETING',
        startTime: mkDt('2026-06-05', 14, 0),
        endTime: mkDt('2026-06-05', 16, 30),
        isAllDay: false,
        location: 'Phòng hội thảo C301',
        color: '#3B82F6',
        createdById: u(0),
        attendees: ['all-dev@loop.vn', 'pm@loop.vn'],
        description: 'Demo tính năng hoàn thành sprint 14, retrospective và planning sprint 15',
      },
      // HOLIDAY — 2 ngày nghỉ lễ
      {
        title: 'Nghỉ lễ Quốc khánh 2/9/2026',
        eventType: 'HOLIDAY',
        startTime: new Date('2026-09-02T00:00:00.000Z'),
        endTime: new Date('2026-09-04T23:59:59.000Z'),
        isAllDay: true,
        color: '#EF4444',
        createdById: u(0),
        attendees: [],
        description: 'Nghỉ lễ Quốc khánh 2/9 — nghỉ 3 ngày từ 02/09 đến 04/09/2026',
      },
      {
        title: 'Nghỉ Giỗ Tổ Hùng Vương (10/3 âm lịch)',
        eventType: 'HOLIDAY',
        startTime: new Date('2026-04-27T00:00:00.000Z'),
        endTime: new Date('2026-04-27T23:59:59.000Z'),
        isAllDay: true,
        color: '#EF4444',
        createdById: u(0),
        attendees: [],
        description: 'Ngày Giỗ Tổ Hùng Vương — nghỉ 1 ngày theo quy định nhà nước',
      },
      // TRAINING — 2 buổi đào tạo
      {
        title: 'Đào tạo kỹ năng thuyết trình & trình bày',
        eventType: 'TRAINING',
        startTime: mkDt('2026-05-31', 9, 0),
        endTime: mkDt('2026-05-31', 12, 0),
        isAllDay: false,
        location: 'Phòng họp B201',
        color: '#8B5CF6',
        createdById: u(3),
        attendees: ['all-staff@loop.vn'],
        description: 'Trainer: Nguyễn Thanh Hùng — VTC Academy. Đối tượng: nhân viên dưới 2 năm kinh nghiệm',
      },
      {
        title: 'Workshop: Clean Code & Code Review Best Practices',
        eventType: 'TRAINING',
        startTime: mkDt('2026-06-10', 14, 0),
        endTime: mkDt('2026-06-10', 17, 0),
        isAllDay: false,
        location: 'Phòng đào tạo E401',
        color: '#8B5CF6',
        createdById: u(1),
        attendees: ['backend@loop.vn', 'frontend@loop.vn'],
        description: 'Workshop nội bộ do team Senior Dev tổ chức. Nội dung: SOLID principles, PR review checklist',
      },
      // DEADLINE — 2 deadline dự án
      {
        title: 'Deadline: Bàn giao Module Quản lý Xe — v1.0',
        eventType: 'DEADLINE',
        startTime: mkDt('2026-06-15', 17, 0),
        endTime: mkDt('2026-06-15', 18, 0),
        isAllDay: false,
        color: '#F59E0B',
        createdById: u(0),
        attendees: ['backend@loop.vn', 'frontend@loop.vn', 'pm@loop.vn'],
        description: 'Deadline bàn giao toàn bộ module Vehicle Management v1.0 cho khách hàng',
      },
      {
        title: 'Deadline: Báo cáo tài chính Q2/2026',
        eventType: 'DEADLINE',
        startTime: mkDt('2026-06-30', 17, 0),
        endTime: mkDt('2026-06-30', 18, 0),
        isAllDay: false,
        color: '#F59E0B',
        createdById: u(4),
        attendees: ['finance@loop.vn', 'cfo@loop.vn'],
        description: 'Hạn nộp báo cáo tài chính quý 2 lên Ban Giám đốc và Hội đồng Quản trị',
      },
      // OTHER — 3 sự kiện khác
      {
        title: 'Kỷ niệm 5 năm thành lập Loop.vn',
        eventType: 'OTHER',
        startTime: new Date('2026-06-20T00:00:00.000Z'),
        endTime: new Date('2026-06-20T23:59:59.000Z'),
        isAllDay: true,
        location: 'Nhà hàng Bến Thuyền, Q.1, TP.HCM',
        color: '#10B981',
        createdById: u(0),
        attendees: ['all-staff@loop.vn'],
        description: 'Tiệc kỷ niệm 5 năm thành lập công ty. Tất cả nhân viên tham dự. Dress code: Smart Casual',
      },
      {
        title: 'Team Building Q2 — Suối Tiên',
        eventType: 'OTHER',
        startTime: new Date('2026-06-27T00:00:00.000Z'),
        endTime: new Date('2026-06-28T23:59:59.000Z'),
        isAllDay: true,
        location: 'Khu du lịch Suối Tiên, Q.9, TP.HCM',
        color: '#10B981',
        createdById: u(2),
        attendees: ['all-staff@loop.vn'],
        description: 'Team building 2 ngày 1 đêm. Bao gồm: các hoạt động nhóm, gala dinner, và tổng kết H1/2026',
      },
      {
        title: 'Hội thảo chuyển đổi số doanh nghiệp 2026',
        eventType: 'OTHER',
        startTime: mkDt('2026-07-05', 8, 0),
        endTime: mkDt('2026-07-05', 17, 0),
        isAllDay: false,
        location: 'GEM Center, 8 Nguyễn Bỉnh Khiêm, Q.1, TP.HCM',
        color: '#6366F1',
        createdById: u(3),
        attendees: ['ceo@loop.vn', 'cto@loop.vn', 'pm@loop.vn'],
        description: 'Hội thảo quốc gia về chuyển đổi số. Loop.vn tham dự với tư cách exhibitor và speaker',
      },
    ],
    skipDuplicates: true,
  });

  console.log('  ✓ 12 CalendarEvent seeded');
}

// ─────────────────────────────────────────────────────────────
// KNOWLEDGE BASE
// ─────────────────────────────────────────────────────────────
async function seedKnowledgeBase() {
  const catCount = await prisma.kbCategory.count();
  if (catCount > 0) {
    console.log('  ⚠ KbCategory đã có dữ liệu, bỏ qua');
    return;
  }

  const users = await prisma.user.findMany({ take: 3 });
  if (users.length === 0) {
    console.log('  ⚠ Không tìm thấy user, bỏ qua seedKnowledgeBase');
    return;
  }

  const author = users[0];

  const catQT = await prisma.kbCategory.create({
    data: { name: 'Quy trình nội bộ', icon: '📋', color: '#6366F1', sortOrder: 0 },
  });
  const catIT = await prisma.kbCategory.create({
    data: { name: 'Kỹ thuật & IT', icon: '💻', color: '#3B82F6', sortOrder: 1 },
  });
  const catHR = await prisma.kbCategory.create({
    data: { name: 'HR & Nhân sự', icon: '👥', color: '#8B5CF6', sortOrder: 2 },
  });

  const now = new Date();

  await prisma.kbArticle.createMany({
    data: [
      {
        title: 'Quy trình xin nghỉ phép',
        slug: 'quy-trinh-xin-nghi-phep',
        content: `## Quy trình xin nghỉ phép

Để đảm bảo hoạt động của công ty không bị gián đoạn, nhân viên cần tuân thủ quy trình xin nghỉ phép như sau:

### 1. Đăng ký trước thời gian
- Nghỉ từ 1–2 ngày: đăng ký trước tối thiểu **3 ngày làm việc**
- Nghỉ từ 3–5 ngày: đăng ký trước tối thiểu **1 tuần**
- Nghỉ trên 5 ngày: đăng ký trước tối thiểu **2 tuần**

### 2. Cách đăng ký
1. Đăng nhập vào hệ thống Loop ERP → module **HR → Nghỉ phép**
2. Nhấn **Tạo đơn nghỉ**, điền thông tin ngày bắt đầu, ngày kết thúc, lý do
3. Chọn loại nghỉ: Phép năm / Nghỉ ốm / Nghỉ cá nhân / Nghỉ không lương
4. Nhấn **Gửi duyệt** — hệ thống tự động thông báo cho Quản lý trực tiếp

### 3. Phê duyệt
- Quản lý trực tiếp duyệt trong vòng **1 ngày làm việc**
- Kết quả (Duyệt / Từ chối) được thông báo qua email và hệ thống

### 4. Trường hợp khẩn cấp
Liên hệ trực tiếp Quản lý qua điện thoại, sau đó hoàn thiện đơn trên hệ thống trong ngày làm việc tiếp theo.

### 5. Số ngày phép
Nhân viên xem số ngày phép còn lại tại **HR → Bảng lương → Ngày phép**. Phép năm được cộng dồn mỗi tháng theo hợp đồng lao động.`,
        summary: 'Hướng dẫn chi tiết quy trình xin nghỉ phép, thời gian đăng ký và cách phê duyệt trên hệ thống Loop ERP.',
        categoryId: catQT.id,
        authorId: author.id,
        status: 'PUBLISHED',
        tags: ['HR', 'nghỉ phép'],
        viewCount: 142,
        isPinned: false,
        publishedAt: now,
      },
      {
        title: 'Quy trình thanh toán chi phí công tác',
        slug: 'quy-trinh-thanh-toan-chi-phi-cong-tac',
        content: `## Quy trình thanh toán chi phí công tác

### 1. Trước khi đi công tác
- Lập **Đề nghị tạm ứng** trên hệ thống Finance → Thanh toán
- Đính kèm lịch trình, mục đích công tác
- Tạm ứng được duyệt trong vòng **1 ngày làm việc**

### 2. Trong quá trình công tác
Giữ lại toàn bộ hóa đơn, biên lai gốc cho:
- Vé máy bay / tàu xe
- Phòng khách sạn
- Ăn uống (theo mức quy định)
- Chi phí di chuyển nội địa

### 3. Sau khi công tác
Trong vòng **5 ngày làm việc** sau khi trở về:
1. Vào Finance → Thanh toán → Tạo quyết toán công tác
2. Điền đầy đủ danh mục chi phí thực tế
3. Scan/chụp và đính kèm toàn bộ hóa đơn gốc
4. Gửi hóa đơn gốc về phòng Kế toán

### 4. Mức thanh toán
| Loại chi phí | Mức tối đa/ngày |
|---|---|
| Ăn uống (trong nước) | 200.000 đ |
| Khách sạn (tỉnh thành) | 800.000 đ |
| Khách sạn (Hà Nội/TP.HCM) | 1.200.000 đ |

Chi phí vượt mức phải được Giám đốc phê duyệt trước.`,
        summary: 'Quy trình tạm ứng, quyết toán và mức chi phí công tác theo chính sách công ty.',
        categoryId: catQT.id,
        authorId: author.id,
        status: 'PUBLISHED',
        tags: ['tài chính', 'công tác', 'thanh toán'],
        viewCount: 98,
        isPinned: true,
        publishedAt: now,
      },
      {
        title: 'Hướng dẫn sử dụng hệ thống chấm công',
        slug: 'huong-dan-su-dung-he-thong-cham-cong',
        content: `## Hướng dẫn sử dụng hệ thống chấm công Loop ERP

### 1. Check-in / Check-out
- **Check-in**: Thực hiện trước hoặc ngay khi bắt đầu giờ làm (8:00 SA)
- **Check-out**: Thực hiện ngay sau khi kết thúc giờ làm (17:30 CH)
- Truy cập: **Timesheet → Check-in/out** hoặc dùng app mobile Loop

### 2. Sửa giờ công
Nếu quên check-in hoặc check-out:
1. Vào **Timesheet → Lịch sử chấm công**
2. Nhấn **Yêu cầu điều chỉnh** bên cạnh ngày cần sửa
3. Điền lý do và giờ thực tế
4. Quản lý duyệt trong vòng 1 ngày

### 3. Xem báo cáo cá nhân
- **Timesheet → Tổng hợp tháng**: xem tổng giờ làm, giờ OT, ngày vắng
- Dữ liệu cập nhật real-time sau mỗi lần check-in/out

### 4. Lưu ý quan trọng
- Không được nhờ người khác check-in thay
- Check-in muộn/sớm quá 15 phút bị ghi nhận là đi muộn/về sớm
- 3 lần đi muộn trong tháng = 1 ngày phép bị trừ`,
        summary: 'Hướng dẫn check-in, check-out, điều chỉnh giờ công và xem báo cáo chấm công trên hệ thống.',
        categoryId: catQT.id,
        authorId: author.id,
        status: 'PUBLISHED',
        tags: ['chấm công', 'timesheet', 'HR'],
        viewCount: 203,
        isPinned: false,
        publishedAt: now,
      },
      {
        title: 'Cài đặt môi trường dev Loop ERP',
        slug: 'cai-dat-moi-truong-dev-loop-erp',
        content: `## Cài đặt môi trường phát triển Loop ERP

### Yêu cầu hệ thống
- Node.js >= 20.x
- pnpm >= 9.x
- Docker Desktop
- PostgreSQL 16 (qua Docker)

### 1. Clone repo
\`\`\`bash
git clone https://github.com/loop-vn/loop-erp.git
cd loop-erp
pnpm install
\`\`\`

### 2. Khởi động services
\`\`\`bash
docker-compose up -d   # PostgreSQL + Redis + MinIO
\`\`\`

### 3. Cấu hình env
\`\`\`bash
cp apps/backend/.env.example apps/backend/.env
# Điền DATABASE_URL, JWT_SECRET, MINIO_* vào .env
\`\`\`

### 4. Migrate & Seed
\`\`\`bash
cd apps/backend
npx prisma migrate dev
npx tsx prisma/seed.ts
\`\`\`

### 5. Chạy dev server
\`\`\`bash
# Terminal 1 — Backend
pnpm --filter backend dev

# Terminal 2 — Frontend
pnpm --filter web dev
\`\`\`

Backend: http://localhost:3000
Frontend: http://localhost:5173
MinIO Console: http://localhost:9001`,
        summary: 'Hướng dẫn cài đặt môi trường phát triển Loop ERP từ đầu: Node, Docker, Prisma migrate, seed.',
        categoryId: catIT.id,
        authorId: author.id,
        status: 'PUBLISHED',
        tags: ['dev', 'setup', 'NestJS', 'React'],
        viewCount: 87,
        isPinned: false,
        publishedAt: now,
      },
      {
        title: 'Hướng dẫn debug backend NestJS',
        slug: 'huong-dan-debug-backend-nestjs',
        content: `## Debug Backend NestJS trong Loop ERP

### 1. Debug với VS Code
Thêm vào \`.vscode/launch.json\`:
\`\`\`json
{
  "type": "node",
  "request": "attach",
  "name": "Attach NestJS",
  "port": 9229,
  "restart": true,
  "sourceMaps": true
}
\`\`\`
Khởi động backend với: \`pnpm dev:debug\`

### 2. Xem logs Prisma
\`\`\`ts
// prisma.service.ts — bật query log khi cần
this.prisma.$on('query', (e) => console.log(e.query, e.params));
\`\`\`

### 3. Test API với HTTPie
\`\`\`bash
http POST :3000/auth/login email=admin@loop.vn password=admin
http GET :3000/bugs Authorization:"Bearer <token>"
\`\`\`

### 4. Lỗi thường gặp
| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| P2002 | Unique constraint | Kiểm tra dữ liệu trùng |
| P2025 | Record not found | Kiểm tra ID tồn tại |
| 401 Unauthorized | Token hết hạn | Re-login lấy token mới |
| 403 Forbidden | Sai role | Kiểm tra @Roles decorator |`,
        summary: 'Hướng dẫn debug backend NestJS: VS Code debugger, Prisma query log, test API và xử lý lỗi phổ biến.',
        categoryId: catIT.id,
        authorId: author.id,
        status: 'DRAFT',
        tags: ['debug', 'NestJS', 'backend'],
        viewCount: 34,
        isPinned: false,
        publishedAt: null,
      },
      {
        title: 'Quy chuẩn code frontend React',
        slug: 'quy-chuan-code-frontend-react',
        content: `## Quy chuẩn code Frontend React — Loop ERP

### 1. Cấu trúc file
\`\`\`
components/
  ui/           # Shared UI components (PageHeader, StatCard...)
  [module]/     # Components theo module
hooks/          # Custom hooks
pages/          # Page components (route-level)
store/          # Zustand stores
utils/          # Helper functions
\`\`\`

### 2. Bắt buộc dùng hook/component chung
- **Màu sắc**: \`useThemePalette()\` — KHÔNG tự khai báo màu
- **Header trang**: \`<PageHeader>\` — KHÔNG tự làm div
- **Stat card**: \`<StatCard>\` — KHÔNG tự làm Statistic
- **Xóa item**: \`confirmDelete()\` — KHÔNG dùng Modal.confirm inline

### 3. Column Table
\`\`\`tsx
// ✅ Đúng — wrap trong Text với color tường minh
render: (v) => <Text style={{ color: textPrimary }}>{v}</Text>

// ❌ Sai — plain string
render: (v) => v ?? '—'
\`\`\`

### 4. Naming convention
- Component: PascalCase (\`BugDetailDrawer\`)
- Hook: camelCase bắt đầu bằng \`use\` (\`useThemePalette\`)
- Constant: UPPER_SNAKE_CASE
- File: kebab-case hoặc PascalCase theo loại

### 5. API calls
Mọi request qua \`apiClient\` (axios instance) — không gọi \`fetch\` trực tiếp.`,
        summary: 'Chuẩn code frontend React: cấu trúc thư mục, component chung bắt buộc, naming convention và API pattern.',
        categoryId: catIT.id,
        authorId: author.id,
        status: 'PUBLISHED',
        tags: ['React', 'frontend', 'coding standards'],
        viewCount: 156,
        isPinned: false,
        publishedAt: now,
      },
      {
        title: 'Chính sách lương thưởng 2026',
        slug: 'chinh-sach-luong-thuong-2026',
        content: `## Chính sách lương thưởng năm 2026

### 1. Cơ cấu lương
- **Lương cơ bản**: theo hợp đồng lao động, trả ngày 10 hàng tháng
- **Phụ cấp**: ăn trưa (30.000đ/ngày), xăng xe (500.000đ/tháng), điện thoại (theo chức danh)
- **Lương OT**: x1.5 ngày thường, x2.0 cuối tuần, x3.0 lễ tết

### 2. Thưởng hiệu suất (KPI)
Đánh giá hàng quý dựa trên điểm KPI cá nhân:
| Điểm KPI | Thưởng |
|---|---|
| ≥ 95 | 1.5 tháng lương |
| 80–94 | 1.0 tháng lương |
| 65–79 | 0.5 tháng lương |
| < 65 | Không thưởng |

### 3. Thưởng Tết
- Nhân viên đủ 12 tháng: tối thiểu 1 tháng lương
- 6–12 tháng: tính theo tỷ lệ tháng công tác
- < 6 tháng: thưởng theo quy định Giám đốc

### 4. Chính sách nâng lương
- Review lương hàng năm vào tháng 4
- Mức tăng trung bình: 8–12% theo hiệu suất và thị trường
- Thăng chức đi kèm điều chỉnh lương ngay lập tức

### 5. Phúc lợi bổ sung
- Bảo hiểm sức khỏe PVI cho nhân viên và 1 thành viên gia đình
- Khám sức khỏe định kỳ hàng năm
- Du lịch công ty 1 lần/năm`,
        summary: 'Chính sách lương cơ bản, phụ cấp, thưởng KPI hàng quý, thưởng Tết và phúc lợi năm 2026.',
        categoryId: catHR.id,
        authorId: author.id,
        status: 'PUBLISHED',
        tags: ['lương', 'thưởng', 'phúc lợi', 'HR'],
        viewCount: 312,
        isPinned: true,
        publishedAt: now,
      },
      {
        title: 'Quy định làm việc từ xa (Remote Work)',
        slug: 'quy-dinh-lam-viec-tu-xa-remote-work',
        content: `## Quy định làm việc từ xa (Remote Work)

### 1. Đối tượng áp dụng
Nhân viên có xếp loại hiệu suất từ "Đạt" trở lên, đã qua thử việc, được Quản lý phê duyệt.

### 2. Số ngày remote tối đa
| Cấp độ | Ngày remote/tuần |
|---|---|
| Staff | 2 ngày |
| Senior / Specialist | 3 ngày |
| Manager trở lên | Linh hoạt theo thỏa thuận |

### 3. Yêu cầu khi làm remote
- **Giờ làm việc**: đảm bảo online 8:00–17:30, phản hồi tin nhắn trong 15 phút
- **Check-in**: bắt buộc check-in hệ thống Loop ERP trước 8:15
- **Daily standup**: tham gia đầy đủ cuộc họp sáng (nếu có)
- **Kết nối**: mạng internet tốc độ ≥ 50 Mbps, tai nghe có micro

### 4. Đăng ký remote
1. Vào **HR → Nghỉ phép → Đăng ký Remote**
2. Chọn ngày, lý do
3. Quản lý duyệt trong vòng 1 ngày làm việc

### 5. Vi phạm
- Check-in muộn khi remote: ghi nhận đi muộn
- Không phản hồi trong giờ làm: cảnh báo lần 1, thu hồi quyền remote lần 2`,
        summary: 'Chính sách làm việc từ xa: đối tượng áp dụng, số ngày tối đa, yêu cầu khi remote và cách đăng ký.',
        categoryId: catHR.id,
        authorId: author.id,
        status: 'PUBLISHED',
        tags: ['remote work', 'HR', 'chính sách'],
        viewCount: 178,
        isPinned: false,
        publishedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  console.log('  ✓ 3 KbCategory + 8 KbArticle seeded');
}

// ─────────────────────────────────────────────────────────────
// VENDORS & PURCHASE ORDERS
// ─────────────────────────────────────────────────────────────
async function seedVendors() {
  const vendorCount = await prisma.vendor.count();
  if (vendorCount > 0) {
    console.log('  ⚠ Vendor đã có dữ liệu, bỏ qua');
    return;
  }

  const users = await prisma.user.findMany({ take: 3 });
  if (users.length === 0) {
    console.log('  ⚠ Không tìm thấy user, bỏ qua seedVendors');
    return;
  }

  const requester = users[0];
  const approver = users[1] ?? users[0];

  // ── Vendors ──────────────────────────────────────────────
  const v1 = await prisma.vendor.create({
    data: {
      code: 'V001',
      name: 'Công ty TNHH Thiết bị văn phòng Minh Phát',
      category: 'Thiết bị văn phòng',
      contactName: 'Nguyễn Văn Minh',
      phone: '0901234567',
      email: 'minhphat@gmail.com',
      taxCode: '0101234567',
      bankName: 'Vietcombank',
      bankAccount: '1234567890',
      rating: 4,
      status: 'ACTIVE',
      notes: 'Nhà cung cấp thiết bị văn phòng uy tín, giao hàng đúng hẹn.',
    },
  });

  const v2 = await prisma.vendor.create({
    data: {
      code: 'V002',
      name: 'CTCP Dịch vụ vệ sinh Green Clean',
      category: 'Dịch vụ',
      contactName: 'Trần Thị Hoa',
      phone: '0912345678',
      email: 'greenclean@gmail.com',
      rating: 5,
      status: 'ACTIVE',
      notes: 'Dịch vụ vệ sinh chuyên nghiệp, đã hợp tác 3 năm.',
    },
  });

  const v3 = await prisma.vendor.create({
    data: {
      code: 'V003',
      name: 'Công ty TNHH In ấn Đại Phát',
      category: 'In ấn quảng cáo',
      contactName: 'Lê Văn Đại',
      phone: '0923456789',
      email: 'daiphat.print@gmail.com',
      rating: 3,
      status: 'ACTIVE',
      notes: 'In ấn tài liệu marketing, banner, brochure.',
    },
  });

  const v4 = await prisma.vendor.create({
    data: {
      code: 'V004',
      name: 'CTCP Phần mềm FPT',
      category: 'Phần mềm',
      contactName: 'Phạm Văn Hùng',
      phone: '0934567890',
      email: 'fpt.software@fpt.com',
      taxCode: '0100686209',
      bankName: 'Techcombank',
      bankAccount: '9876543210',
      rating: 5,
      status: 'ACTIVE',
      notes: 'Cung cấp license phần mềm và giải pháp CNTT doanh nghiệp.',
    },
  });

  await prisma.vendor.create({
    data: {
      code: 'V005',
      name: 'Công ty Bảo vệ Việt Hưng',
      category: 'Dịch vụ bảo vệ',
      contactName: 'Hoàng Văn Bảo',
      phone: '0945678901',
      rating: 2,
      status: 'INACTIVE',
      notes: 'Tạm ngừng hợp tác do chất lượng dịch vụ không đảm bảo.',
    },
  });

  // ── Purchase Orders ───────────────────────────────────────
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-001',
      vendorId: v1.id,
      requesterId: requester.id,
      approverId: approver.id,
      status: 'APPROVED',
      currency: 'VND',
      totalAmount: 25000000,
      taxAmount: 2272727,
      notes: 'Mua 8 bộ máy tính xách tay phục vụ nhân viên mới Q2/2026.',
      deliveryDate: nextWeek,
      approvedAt: new Date('2026-05-20T10:00:00Z'),
      items: {
        create: [
          {
            description: 'Máy tính xách tay Dell Latitude 5540',
            unit: 'Bộ',
            quantity: 8,
            unitPrice: 2840000,
            totalPrice: 22720000,
            receivedQty: 0,
            status: 'PENDING',
          },
          {
            description: 'Chuột không dây Logitech MX Anywhere 3',
            unit: 'Cái',
            quantity: 8,
            unitPrice: 285000,
            totalPrice: 2280000,
            receivedQty: 0,
            status: 'PENDING',
          },
        ],
      },
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-002',
      vendorId: v2.id,
      requesterId: requester.id,
      approverId: approver.id,
      status: 'RECEIVED',
      currency: 'VND',
      totalAmount: 5000000,
      taxAmount: 454545,
      notes: 'Dịch vụ vệ sinh văn phòng tháng 5/2026.',
      deliveryDate: new Date('2026-05-31'),
      approvedAt: new Date('2026-05-01T09:00:00Z'),
      receivedAt: new Date('2026-05-15T17:00:00Z'),
      items: {
        create: [
          {
            description: 'Dịch vụ vệ sinh văn phòng tháng 5 (4 lầu)',
            unit: 'Tháng',
            quantity: 1,
            unitPrice: 5000000,
            totalPrice: 5000000,
            receivedQty: 1,
            status: 'RECEIVED',
          },
        ],
      },
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-003',
      vendorId: v4.id,
      requesterId: requester.id,
      status: 'SUBMITTED',
      currency: 'VND',
      totalAmount: 120000000,
      taxAmount: 12000000,
      notes: 'Mua license phần mềm ERP và dịch vụ triển khai 12 tháng.',
      deliveryDate: new Date('2026-06-30'),
      items: {
        create: [
          {
            description: 'License phần mềm ERP Cloud — gói 50 users/năm',
            unit: 'License',
            quantity: 1,
            unitPrice: 96000000,
            totalPrice: 96000000,
            receivedQty: 0,
            status: 'PENDING',
          },
          {
            description: 'Dịch vụ tư vấn triển khai và đào tạo',
            unit: 'Gói',
            quantity: 1,
            unitPrice: 12000000,
            totalPrice: 12000000,
            receivedQty: 0,
            status: 'PENDING',
          },
        ],
      },
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-004',
      vendorId: v1.id,
      requesterId: requester.id,
      status: 'DRAFT',
      currency: 'VND',
      totalAmount: 8000000,
      taxAmount: 727272,
      notes: 'Mua văn phòng phẩm định kỳ tháng 6.',
      items: {
        create: [
          {
            description: 'Mực in HP LaserJet 85A (hộp 12 cái)',
            unit: 'Hộp',
            quantity: 12,
            unitPrice: 320000,
            totalPrice: 3840000,
            receivedQty: 0,
            status: 'PENDING',
          },
          {
            description: 'Giấy A4 IK Color 80gsm (thùng 5 ram)',
            unit: 'Thùng',
            quantity: 20,
            unitPrice: 208000,
            totalPrice: 4160000,
            receivedQty: 0,
            status: 'PENDING',
          },
        ],
      },
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-005',
      vendorId: v3.id,
      requesterId: requester.id,
      approverId: approver.id,
      status: 'ORDERED',
      currency: 'VND',
      totalAmount: 15000000,
      taxAmount: 1363636,
      notes: 'In tài liệu marketing Q3/2026: brochure, banner, standee.',
      deliveryDate: new Date('2026-06-15'),
      approvedAt: new Date('2026-05-22T14:00:00Z'),
      items: {
        create: [
          {
            description: 'Brochure A4 in 4 màu, 500 tờ',
            unit: 'Bộ',
            quantity: 500,
            unitPrice: 8000,
            totalPrice: 4000000,
            receivedQty: 0,
            status: 'PENDING',
          },
          {
            description: 'Banner hiflex 80x180cm, in UV',
            unit: 'Cái',
            quantity: 20,
            unitPrice: 250000,
            totalPrice: 5000000,
            receivedQty: 0,
            status: 'PENDING',
          },
          {
            description: 'Standee khung nhôm 60x160cm + in decal',
            unit: 'Cái',
            quantity: 10,
            unitPrice: 600000,
            totalPrice: 6000000,
            receivedQty: 0,
            status: 'PENDING',
          },
        ],
      },
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-006',
      vendorId: v2.id,
      requesterId: requester.id,
      approverId: approver.id,
      status: 'APPROVED',
      currency: 'VND',
      totalAmount: 5500000,
      taxAmount: 500000,
      notes: 'Dịch vụ vệ sinh văn phòng tháng 6/2026.',
      deliveryDate: new Date('2026-06-30'),
      approvedAt: new Date('2026-05-28T10:00:00Z'),
      items: {
        create: [
          {
            description: 'Dịch vụ vệ sinh văn phòng tháng 6 (4 lầu + tổng vệ sinh)',
            unit: 'Tháng',
            quantity: 1,
            unitPrice: 5500000,
            totalPrice: 5500000,
            receivedQty: 0,
            status: 'PENDING',
          },
        ],
      },
    },
  });

  console.log('  ✓ 5 Vendor + 6 PurchaseOrder seeded');
}

// ─────────────────────────────────────────────────────────────
// AUTOMATION RULES
// ─────────────────────────────────────────────────────────────
async function seedAutomationRules() {
  const count = await prisma.automationRule.count();
  if (count > 0) {
    console.log('  ⚠ AutomationRule đã có dữ liệu, bỏ qua');
    return;
  }

  await prisma.automationRule.createMany({
    data: [
      {
        key: 'birthday_kudos',
        name: 'Tự động chúc sinh nhật nhân viên',
        description: 'Gửi tin nhắn chúc mừng sinh nhật qua Telegram và email cho nhân viên có sinh nhật hôm nay lúc 8:00 sáng.',
        cronExpr: '0 8 * * *',
        isActive: true,
        lastRunAt: new Date('2026-05-29T08:00:00Z'),
        runCount: 28,
      },
      {
        key: 'weekly_timesheet_reminder',
        name: 'Nhắc nộp timesheet cuối tuần',
        description: 'Nhắc nhở nhân viên chưa hoàn thành timesheet tuần gửi vào 17:00 thứ Sáu hàng tuần.',
        cronExpr: '0 17 * * 5',
        isActive: true,
        lastRunAt: new Date('2026-05-23T17:00:00Z'),
        runCount: 12,
      },
      {
        key: 'leave_balance_sync',
        name: 'Đồng bộ số ngày phép tháng mới',
        description: 'Cộng dồn số ngày phép năm theo hợp đồng vào đầu mỗi tháng (ngày 1 lúc 00:00).',
        cronExpr: '0 0 1 * *',
        isActive: true,
        lastRunAt: new Date('2026-05-01T00:00:00Z'),
        runCount: 5,
      },
      {
        key: 'overdue_invoice_alert',
        name: 'Cảnh báo hóa đơn quá hạn',
        description: 'Quét hóa đơn quá hạn thanh toán, gửi cảnh báo cho kế toán và quản lý mỗi thứ Hai lúc 9:00.',
        cronExpr: '0 9 * * 1',
        isActive: true,
        lastRunAt: new Date('2026-05-26T09:00:00Z'),
        runCount: 20,
      },
      {
        key: 'daily_attendance_report',
        name: 'Báo cáo chấm công hằng ngày',
        description: 'Tổng hợp danh sách đi muộn, vắng mặt không phép trong ngày, gửi HR lúc 7:00 các ngày làm việc.',
        cronExpr: '0 7 * * 1-5',
        isActive: false,
        runCount: 0,
      },
    ],
    skipDuplicates: true,
  });

  console.log('  ✓ 5 AutomationRule seeded');
}

// ─────────────────────────────────────────────────────────────
// SCHEDULED REPORTS
// ─────────────────────────────────────────────────────────────
async function seedScheduledReports() {
  const count = await prisma.scheduledReport.count();
  if (count > 0) {
    console.log('  ⚠ ScheduledReport đã có dữ liệu, bỏ qua');
    return;
  }

  await prisma.scheduledReport.createMany({
    data: [
      {
        name: 'Báo cáo nhân sự hàng tuần',
        template: 'hr_weekly',
        recipients: ['admin@loop.vn'],
        frequency: 'WEEKLY',
        dayOfWeek: 1,
        hour: 8,
        format: 'EXCEL',
        isActive: true,
        lastSentAt: new Date('2026-05-26T08:00:00Z'),
        sentCount: 8,
      },
      {
        name: 'Báo cáo tài chính tháng',
        template: 'finance_monthly',
        recipients: ['admin@loop.vn', 'hr@loop.vn'],
        frequency: 'MONTHLY',
        dayOfMonth: 1,
        hour: 9,
        format: 'PDF',
        isActive: true,
        lastSentAt: new Date('2026-05-01T09:00:00Z'),
        sentCount: 5,
      },
      {
        name: 'Tổng kết kế hoạch quý',
        template: 'okr_quarterly',
        recipients: ['admin@loop.vn'],
        frequency: 'QUARTERLY',
        dayOfMonth: 1,
        hour: 8,
        format: 'EXCEL',
        isActive: true,
        lastSentAt: new Date('2026-04-01T08:00:00Z'),
        sentCount: 1,
      },
      {
        name: 'Báo cáo chấm công hàng tuần',
        template: 'attendance_weekly',
        recipients: ['admin@loop.vn'],
        frequency: 'WEEKLY',
        dayOfWeek: 2,
        hour: 8,
        format: 'EXCEL',
        isActive: false,
        sentCount: 0,
      },
    ],
    skipDuplicates: true,
  });

  console.log('  ✓ 4 ScheduledReport seeded');
}

main().finally(() => prisma.$disconnect());
