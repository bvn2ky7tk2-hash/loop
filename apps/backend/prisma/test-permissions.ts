/**
 * test-permissions.ts — Story 15.1 comprehensive verification
 * Chạy: npx tsx prisma/test-permissions.ts
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma';
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  SEED_MODULE_ROLES,
  PERMISSIONS,
  MODULE_ROLES,
} from '../src/permissions/permissions.constants';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

let passed = 0;
let failed = 0;

function ok(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function cleanup(userId?: string) {
  if (userId) {
    await prisma.userPermission.deleteMany({ where: { userId } });
    await prisma.userModuleRole.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  }
}

async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log(' Story 15.1 — Permission Schema & Seed Data Tests');
  console.log('══════════════════════════════════════════════════════\n');

  // ── AC1: Kiểm tra 6 bảng tồn tại ─────────────────────────────────────────
  console.log('【AC1】 6 bảng mới phải tồn tại:');
  const tables = ['permissions', 'role_permissions', 'user_permissions',
                  'module_roles', 'module_role_permissions', 'user_module_roles'];
  for (const t of tables) {
    const res = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${t}
      ) as exists
    `;
    ok(`Bảng '${t}' tồn tại`, res[0].exists === true);
  }

  // ── AC2: Kiểm tra cấu trúc bảng permissions ──────────────────────────────
  console.log('\n【AC2】 Cấu trúc bảng permissions:');
  const cols = await prisma.$queryRaw<{ column_name: string; data_type: string; is_nullable: string }[]>`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'permissions' AND table_schema = 'public'
    ORDER BY ordinal_position
  `;
  const colMap = Object.fromEntries(cols.map(c => [c.column_name, c]));
  ok('permissions.code là PK text', colMap['code']?.data_type === 'text');
  ok('permissions.module tồn tại', !!colMap['module']);
  ok('permissions.action tồn tại', !!colMap['action']);
  ok('permissions.description nullable', colMap['description']?.is_nullable === 'YES');
  ok('permissions.created_at tồn tại', !!colMap['created_at']);

  // ── AC3: Kiểm tra cấu trúc user_permissions ──────────────────────────────
  console.log('\n【AC3】 Cấu trúc bảng user_permissions:');
  const upCols = await prisma.$queryRaw<{ column_name: string; column_default: string | null }[]>`
    SELECT column_name, column_default
    FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND table_schema = 'public'
  `;
  const upMap = Object.fromEntries(upCols.map(c => [c.column_name, c]));
  ok('user_permissions.user_id tồn tại', !!upMap['user_id']);
  ok('user_permissions.permission_code tồn tại', !!upMap['permission_code']);
  ok('user_permissions.granted có default true', upMap['granted']?.column_default === 'true');

  // ── AC4: Kiểm tra cấu trúc module_roles ──────────────────────────────────
  console.log('\n【AC4】 Cấu trúc bảng module_roles:');
  const mrCols = await prisma.$queryRaw<{ column_name: string; column_default: string | null }[]>`
    SELECT column_name, column_default
    FROM information_schema.columns
    WHERE table_name = 'module_roles' AND table_schema = 'public'
  `;
  const mrMap = Object.fromEntries(mrCols.map(c => [c.column_name, c]));
  ok('module_roles.code (PK) tồn tại', !!mrMap['code']);
  ok('module_roles.name tồn tại', !!mrMap['name']);
  ok('module_roles.domain tồn tại', !!mrMap['domain']);
  ok('module_roles.is_system có default false', mrMap['is_system']?.column_default === 'false');

  // ── AC5: Số lượng permission codes ───────────────────────────────────────
  console.log('\n【AC5】 Permission codes đã seed:');
  const permCount = await prisma.permission.count();
  ok(`Có ${permCount} permission codes (≥35)`, permCount >= 35, `actual: ${permCount}`);
  ok('ALL_PERMISSIONS có 36 codes', ALL_PERMISSIONS.length === 36, `actual: ${ALL_PERMISSIONS.length}`);

  // Verify mỗi code là duy nhất
  const allCodes = ALL_PERMISSIONS.map(p => p.code);
  const uniqueCodes = new Set(allCodes);
  ok('Không có code trùng trong constants', uniqueCodes.size === allCodes.length);

  // Verify format convention {module}:{action}
  const badFormat = allCodes.filter(c => !c.match(/^[a-z_]+:[a-z_]+$/));
  ok('Tất cả codes đúng format {module}:{action}', badFormat.length === 0,
     badFormat.length > 0 ? `bad: ${badFormat.join(', ')}` : undefined);

  // ── AC6: ADMIN có tất cả permissions ─────────────────────────────────────
  console.log('\n【AC6】 ADMIN role permissions:');
  const adminPerms = await prisma.rolePermission.count({ where: { role: Role.ADMIN } });
  ok(`ADMIN có ${adminPerms} permissions = tất cả`, adminPerms === permCount,
     `expected: ${permCount}, actual: ${adminPerms}`);

  // ── AC7: MEMBER có đúng 14 permissions ───────────────────────────────────
  console.log('\n【AC7】 MEMBER role permissions:');
  const memberPerms = await prisma.rolePermission.findMany({
    where: { role: Role.MEMBER },
    select: { permissionCode: true },
  });
  const memberCodes = memberPerms.map(p => p.permissionCode).sort();
  const expectedMemberCodes = [
    'bugs:create', 'bugs:read', 'bugs:update',
    'dashboard:read',
    'employees:read',
    'issues:create', 'issues:read',
    'projects:read',
    'tasks:create', 'tasks:read', 'tasks:update',
    'timelogs:create', 'timelogs:update',
    'timesheets:read',
  ].sort();
  ok(`MEMBER có ${memberCodes.length} permissions`, memberCodes.length === 14,
     `actual: ${memberCodes.length}`);
  ok('MEMBER codes đúng danh sách', JSON.stringify(memberCodes) === JSON.stringify(expectedMemberCodes),
     `diff: ${memberCodes.filter(c => !expectedMemberCodes.includes(c)).join(',')}`);

  // ── AC8: LEADERSHIP permissions ───────────────────────────────────────────
  console.log('\n【AC8】 LEADERSHIP role permissions:');
  const leadershipCount = await prisma.rolePermission.count({ where: { role: Role.LEADERSHIP } });
  ok(`LEADERSHIP có ${leadershipCount} permissions`, leadershipCount > 0);
  const leadershipApprove = await prisma.rolePermission.findFirst({
    where: { role: Role.LEADERSHIP, permissionCode: 'tasks:approve' },
  });
  ok('LEADERSHIP có tasks:approve', !!leadershipApprove);
  const leadershipAdminUsers = await prisma.rolePermission.findFirst({
    where: { role: Role.LEADERSHIP, permissionCode: 'admin:users' },
  });
  ok('LEADERSHIP KHÔNG có admin:users', !leadershipAdminUsers);

  // ── AC9: PM permissions ───────────────────────────────────────────────────
  console.log('\n【AC9】 PM role permissions:');
  const pmCount = await prisma.rolePermission.count({ where: { role: Role.PM } });
  ok(`PM có ${pmCount} permissions`, pmCount > 0);
  const pmProjectsCreate = await prisma.rolePermission.findFirst({
    where: { role: Role.PM, permissionCode: 'projects:create' },
  });
  ok('PM có projects:create', !!pmProjectsCreate);
  const pmAdminPerms = await prisma.rolePermission.findFirst({
    where: { role: Role.PM, permissionCode: 'admin:permissions' },
  });
  ok('PM KHÔNG có admin:permissions', !pmAdminPerms);

  // ── AC10: Module roles ────────────────────────────────────────────────────
  console.log('\n【AC10】 Placeholder module roles:');
  const moduleRoleCount = await prisma.moduleRole.count();
  ok(`Có ${moduleRoleCount} module roles`, moduleRoleCount === SEED_MODULE_ROLES.length,
     `expected: ${SEED_MODULE_ROLES.length}`);
  const hrManager = await prisma.moduleRole.findUnique({ where: { code: MODULE_ROLES.HR_MANAGER } });
  ok('hr:manager tồn tại với isSystem=true', !!hrManager && hrManager.isSystem === true);
  const financeAccountant = await prisma.moduleRole.findUnique({ where: { code: MODULE_ROLES.FINANCE_ACCOUNTANT } });
  ok('finance:accountant tồn tại', !!financeAccountant);
  ok('finance:accountant domain=finance', financeAccountant?.domain === 'finance');

  // Module roles có permissions rỗng (chưa ship ERP module)
  const moduleRolePermsCount = await prisma.moduleRolePermission.count();
  ok('module_role_permissions rỗng (ERP chưa ship)', moduleRolePermsCount === 0,
     `actual: ${moduleRolePermsCount}`);

  // ── AC11: user_permissions và user_module_roles rỗng ban đầu ─────────────
  console.log('\n【AC11】 Override tables ban đầu rỗng:');
  const userPermCount = await prisma.userPermission.count();
  const userModuleRoleCount = await prisma.userModuleRole.count();
  ok('user_permissions rỗng sau seed', userPermCount === 0);
  ok('user_module_roles rỗng sau seed', userModuleRoleCount === 0);

  // ── AC12: Foreign Key constraints hoạt động ──────────────────────────────
  console.log('\n【AC12】 Foreign Key constraints:');

  // Tạo test user tạm
  const testUser = await prisma.user.create({
    data: {
      email: `test-perm-${Date.now()}@loop.vn`,
      passwordHash: 'hash',
      name: 'Test Permission User',
      role: Role.MEMBER,
    },
  });

  try {
    // FK: user_permissions → users (cascade delete)
    await prisma.userPermission.create({
      data: { userId: testUser.id, permissionCode: PERMISSIONS.TASKS_READ, granted: true },
    });
    await prisma.userPermission.create({
      data: { userId: testUser.id, permissionCode: PERMISSIONS.PROJECTS_READ, granted: false },
    });
    const upAfterCreate = await prisma.userPermission.count({ where: { userId: testUser.id } });
    ok('UserPermission: tạo 2 overrides thành công', upAfterCreate === 2);

    // FK: user_module_roles → users
    await prisma.userModuleRole.create({
      data: { userId: testUser.id, roleCode: MODULE_ROLES.HR_MANAGER },
    });
    const umrAfterCreate = await prisma.userModuleRole.count({ where: { userId: testUser.id } });
    ok('UserModuleRole: assign hr:manager thành công', umrAfterCreate === 1);

    // Test cascade delete: xóa user → xóa cả user_permissions và user_module_roles
    await prisma.user.delete({ where: { id: testUser.id } });
    const upAfterDelete = await prisma.userPermission.count({ where: { userId: testUser.id } });
    const umrAfterDelete = await prisma.userModuleRole.count({ where: { userId: testUser.id } });
    ok('Cascade delete: user_permissions bị xóa theo user', upAfterDelete === 0);
    ok('Cascade delete: user_module_roles bị xóa theo user', umrAfterDelete === 0);

    // FK violation: tạo user_permission với permission code không tồn tại
    let fkViolated = false;
    try {
      await prisma.userPermission.create({
        data: { userId: testUser.id, permissionCode: 'nonexistent:code', granted: true },
      });
    } catch {
      fkViolated = true;
    }
    ok('FK violation: insert permission code không tồn tại bị reject', fkViolated);

  } finally {
    await cleanup(testUser.id);
  }

  // ── AC13: Idempotency — seed chạy lại không lỗi và không duplicate ────────
  console.log('\n【AC13】 Idempotency:');
  // Gọi seedPermissions trực tiếp từ seed.ts
  const permsBefore = await prisma.permission.count();
  const rolePermsBefore = await prisma.rolePermission.count();
  const moduleRolesBefore = await prisma.moduleRole.count();

  // Import và chạy lại seedPermissions
  const seedModule = await import('./seed.js');
  await seedModule.seedPermissions();

  const permsAfter = await prisma.permission.count();
  const rolePermsAfter = await prisma.rolePermission.count();
  const moduleRolesAfter = await prisma.moduleRole.count();

  ok('Idempotent: số permissions không thay đổi', permsAfter === permsBefore,
     `before: ${permsBefore}, after: ${permsAfter}`);
  ok('Idempotent: số role_permissions không thay đổi', rolePermsAfter === rolePermsBefore);
  ok('Idempotent: số module_roles không thay đổi', moduleRolesAfter === moduleRolesBefore);

  // ── AC14: Test grant/revoke pattern (preview của Story 15.3) ─────────────
  console.log('\n【AC14】 Grant/Revoke pattern (UserPermission):');
  const testUser2 = await prisma.user.create({
    data: {
      email: `test-perm2-${Date.now()}@loop.vn`,
      passwordHash: 'hash',
      name: 'Test Permission User 2',
      role: Role.MEMBER,
    },
  });

  try {
    // Grant: MEMBER thêm tasks:approve
    await prisma.userPermission.create({
      data: { userId: testUser2.id, permissionCode: PERMISSIONS.TASKS_APPROVE, granted: true },
    });
    const grantRow = await prisma.userPermission.findUnique({
      where: { userId_permissionCode: { userId: testUser2.id, permissionCode: PERMISSIONS.TASKS_APPROVE } },
    });
    ok('Grant: MEMBER được cấp tasks:approve (granted=true)', grantRow?.granted === true);

    // Revoke: MEMBER mất projects:read (revoke từ default)
    await prisma.userPermission.create({
      data: { userId: testUser2.id, permissionCode: PERMISSIONS.PROJECTS_READ, granted: false },
    });
    const revokeRow = await prisma.userPermission.findUnique({
      where: { userId_permissionCode: { userId: testUser2.id, permissionCode: PERMISSIONS.PROJECTS_READ } },
    });
    ok('Revoke: MEMBER mất projects:read (granted=false)', revokeRow?.granted === false);

    // Upsert: cập nhật từ revoke → grant
    await prisma.userPermission.upsert({
      where: { userId_permissionCode: { userId: testUser2.id, permissionCode: PERMISSIONS.PROJECTS_READ } },
      update: { granted: true },
      create: { userId: testUser2.id, permissionCode: PERMISSIONS.PROJECTS_READ, granted: true },
    });
    const upsertRow = await prisma.userPermission.findUnique({
      where: { userId_permissionCode: { userId: testUser2.id, permissionCode: PERMISSIONS.PROJECTS_READ } },
    });
    ok('Upsert: revoke → grant hoạt động đúng', upsertRow?.granted === true);

    // Composite unique: không thể tạo 2 rows cùng (userId, permissionCode)
    let dupError = false;
    try {
      await prisma.userPermission.create({
        data: { userId: testUser2.id, permissionCode: PERMISSIONS.TASKS_APPROVE, granted: false },
      });
    } catch {
      dupError = true;
    }
    ok('Composite PK: không cho duplicate (userId, permissionCode)', dupError);

  } finally {
    await cleanup(testUser2.id);
  }

  // ── AC15: Multi-role user (Dual-Track) ────────────────────────────────────
  console.log('\n【AC15】 Dual-Track: user có cả system role lẫn module roles:');
  const testUser3 = await prisma.user.create({
    data: {
      email: `test-dualtrack-${Date.now()}@loop.vn`,
      passwordHash: 'hash',
      name: 'Dual Track User',
      role: Role.MEMBER,
    },
  });

  try {
    // Assign nhiều module roles
    await prisma.userModuleRole.createMany({
      data: [
        { userId: testUser3.id, roleCode: MODULE_ROLES.HR_MANAGER },
        { userId: testUser3.id, roleCode: MODULE_ROLES.FINANCE_ACCOUNTANT },
      ],
    });

    const roles = await prisma.userModuleRole.findMany({
      where: { userId: testUser3.id },
      include: { role: true },
    });
    ok('Dual-Track: user có 2 module roles', roles.length === 2);
    ok('Dual-Track: system role vẫn là MEMBER', testUser3.role === Role.MEMBER);

    const roleNames = roles.map(r => r.role.name).sort();
    ok('Module roles đúng: HR Manager + Accountant',
       roleNames.includes('HR Manager') && roleNames.includes('Accountant'));

    // Xóa 1 module role
    await prisma.userModuleRole.delete({
      where: { userId_roleCode: { userId: testUser3.id, roleCode: MODULE_ROLES.HR_MANAGER } },
    });
    const remainingRoles = await prisma.userModuleRole.count({ where: { userId: testUser3.id } });
    ok('Xóa 1 module role: còn lại 1', remainingRoles === 1);

  } finally {
    await cleanup(testUser3.id);
  }

  // ── AC16: Tất cả domains trong PERMISSIONS constants ──────────────────────
  console.log('\n【AC16】 Permission constants type-safety:');
  ok('PERMISSIONS.TASKS_APPROVE = "tasks:approve"', PERMISSIONS.TASKS_APPROVE === 'tasks:approve');
  ok('PERMISSIONS.ADMIN_PERMISSIONS = "admin:permissions"', PERMISSIONS.ADMIN_PERMISSIONS === 'admin:permissions');
  ok('MODULE_ROLES.HR_MANAGER = "hr:manager"', MODULE_ROLES.HR_MANAGER === 'hr:manager');
  ok('MODULE_ROLES.FINANCE_ACCOUNTANT = "finance:accountant"', MODULE_ROLES.FINANCE_ACCOUNTANT === 'finance:accountant');

  // Domains trong SEED_MODULE_ROLES
  const domains = [...new Set(SEED_MODULE_ROLES.map(r => r.domain))].sort();
  ok('4 domains: crm, finance, hr, operations', JSON.stringify(domains) === JSON.stringify(['crm', 'finance', 'hr', 'operations']));

  // ── AC17: UserGroups demo đã được seed ─────────────────────────────────────
  console.log('\n【AC17】 UserGroups demo data:');
  const groupNames = ['PM Team', 'HR Team', 'Finance Team'];
  for (const name of groupNames) {
    const g = await prisma.userGroup.findUnique({ where: { name } });
    ok(`Group "${name}" tồn tại`, !!g);
    if (g) {
      const permCount2 = await prisma.groupPermission.count({ where: { groupId: g.id } });
      ok(`Group "${name}" có permissions (>0)`, permCount2 > 0, `actual: ${permCount2}`);
      const memberCount = await prisma.groupMembership.count({ where: { groupId: g.id } });
      ok(`Group "${name}" có members (>0)`, memberCount > 0, `actual: ${memberCount}`);
      const orgAccess = await prisma.groupOrgAccess.findFirst({ where: { groupId: g.id } });
      ok(`Group "${name}" có org scope (ROOT)`, !!orgAccess);
      ok(`Group "${name}" orgAccess.includeChildren = true`, orgAccess?.includeChildren === true);
    }
  }

  // ── AC18: user.demo@loop.vn ────────────────────────────────────────────────
  console.log('\n【AC18】 Demo user (user.demo@loop.vn):');
  const demoUser = await prisma.user.findUnique({ where: { email: 'user.demo@loop.vn' } });
  ok('user.demo@loop.vn tồn tại', !!demoUser);
  ok('Demo user role = MEMBER', demoUser?.role === Role.MEMBER);
  ok('Demo user name = "Demo User"', demoUser?.name === 'Demo User');
  if (demoUser) {
    const inPmTeam = await prisma.groupMembership.findFirst({
      where: { userId: demoUser.id },
      include: { group: true },
    });
    ok('Demo user là thành viên ít nhất 1 group', !!inPmTeam);
    ok('Demo user thuộc "PM Team"', inPmTeam?.group.name === 'PM Team');
  }

  // ── AC19: GroupPermission idempotency ─────────────────────────────────────
  console.log('\n【AC19】 UserGroup idempotency:');
  const pmGroupBefore = await prisma.userGroup.findUnique({ where: { name: 'PM Team' } });
  const pmPermsBefore = pmGroupBefore
    ? await prisma.groupPermission.count({ where: { groupId: pmGroupBefore.id } })
    : 0;

  // Chạy lại seedUserGroupsDemo — không được tạo duplicate
  const seedModule2 = await import('./seed.js');
  const orgUnitForTest = await prisma.orgUnit.findFirst({ where: { code: 'ROOT' } });
  if (orgUnitForTest && (seedModule2 as any).seedUserGroupsDemo) {
    await (seedModule2 as any).seedUserGroupsDemo(orgUnitForTest.id);
  }

  const pmGroupAfter = await prisma.userGroup.findUnique({ where: { name: 'PM Team' } });
  const pmPermsAfter = pmGroupAfter
    ? await prisma.groupPermission.count({ where: { groupId: pmGroupAfter.id } })
    : 0;
  ok('UserGroup idempotent: permissions không tăng khi seed lại', pmPermsAfter === pmPermsBefore,
     `before: ${pmPermsBefore}, after: ${pmPermsAfter}`);

  // ── AC20: 4 bảng UserGroup tồn tại ────────────────────────────────────────
  console.log('\n【AC20】 4 bảng UserGroup tồn tại trong DB:');
  const ugTables = ['user_groups', 'group_permissions', 'group_memberships', 'group_org_access'];
  for (const t of ugTables) {
    const res = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${t}
      ) as exists
    `;
    ok(`Bảng '${t}' tồn tại`, res[0].exists === true);
  }

  // ── Kết quả ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  const total = passed + failed;
  console.log(` Kết quả: ${passed}/${total} tests passed`);
  if (failed > 0) {
    console.error(` ❌ ${failed} tests FAILED`);
  } else {
    console.log(' ✅ Tất cả tests PASSED');
  }
  console.log('══════════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

main().finally(() => prisma.$disconnect().then(() => pool.end()));
