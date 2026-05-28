'use strict';
/**
 * seed-permissions.js
 * Seeds permission codes, role-permission mappings, and placeholder module roles.
 * Can be called with a pg Client or Pool that is already connected.
 * All inserts use ON CONFLICT DO NOTHING (idempotent).
 */

const ALL_PERMISSIONS = [
  { code: 'projects:read',   module: 'projects',   action: 'read',      description: 'Xem danh sách dự án' },
  { code: 'projects:create', module: 'projects',   action: 'create',    description: 'Tạo dự án mới' },
  { code: 'projects:update', module: 'projects',   action: 'update',    description: 'Cập nhật thông tin dự án' },
  { code: 'projects:delete', module: 'projects',   action: 'delete',    description: 'Xóa dự án' },
  { code: 'tasks:read',      module: 'tasks',      action: 'read',      description: 'Xem task' },
  { code: 'tasks:create',    module: 'tasks',      action: 'create',    description: 'Tạo task mới' },
  { code: 'tasks:update',    module: 'tasks',      action: 'update',    description: 'Cập nhật task' },
  { code: 'tasks:delete',    module: 'tasks',      action: 'delete',    description: 'Xóa task' },
  { code: 'tasks:approve',   module: 'tasks',      action: 'approve',   description: 'Duyệt/từ chối task' },
  { code: 'employees:read',   module: 'employees', action: 'read',      description: 'Xem danh sách nhân sự' },
  { code: 'employees:create', module: 'employees', action: 'create',    description: 'Thêm nhân sự mới' },
  { code: 'employees:update', module: 'employees', action: 'update',    description: 'Cập nhật hồ sơ nhân sự' },
  { code: 'employees:delete', module: 'employees', action: 'delete',    description: 'Xóa nhân sự' },
  { code: 'reports:read',    module: 'reports',    action: 'read',      description: 'Xem báo cáo' },
  { code: 'reports:export',  module: 'reports',    action: 'export',    description: 'Xuất báo cáo Excel' },
  { code: 'timesheets:read',    module: 'timesheets', action: 'read',    description: 'Xem timesheet' },
  { code: 'timesheets:approve', module: 'timesheets', action: 'approve', description: 'Duyệt timesheet' },
  { code: 'timelogs:create', module: 'timelogs',   action: 'create',    description: 'Ghi nhận giờ làm việc' },
  { code: 'timelogs:update', module: 'timelogs',   action: 'update',    description: 'Chỉnh sửa time log' },
  { code: 'bugs:read',   module: 'bugs', action: 'read',   description: 'Xem danh sách bug' },
  { code: 'bugs:create', module: 'bugs', action: 'create', description: 'Tạo bug mới' },
  { code: 'bugs:update', module: 'bugs', action: 'update', description: 'Cập nhật bug' },
  { code: 'bugs:assign', module: 'bugs', action: 'assign', description: 'Giao bug cho người xử lý' },
  { code: 'bugs:close',  module: 'bugs', action: 'close',  description: 'Đóng bug' },
  { code: 'issues:read',    module: 'issues', action: 'read',    description: 'Xem issue register' },
  { code: 'issues:create',  module: 'issues', action: 'create',  description: 'Tạo issue mới' },
  { code: 'issues:update',  module: 'issues', action: 'update',  description: 'Cập nhật issue' },
  { code: 'issues:approve', module: 'issues', action: 'approve', description: 'Phê duyệt CR' },
  { code: 'bpm:read',   module: 'bpm', action: 'read',   description: 'Xem quy trình BPM' },
  { code: 'bpm:manage', module: 'bpm', action: 'manage', description: 'Quản lý quy trình BPM' },
  { code: 'alerts:read',      module: 'alerts', action: 'read',      description: 'Xem cảnh báo' },
  { code: 'alerts:configure', module: 'alerts', action: 'configure', description: 'Cấu hình ngưỡng cảnh báo' },
  { code: 'dashboard:read',      module: 'dashboard', action: 'read',        description: 'Xem dashboard' },
  { code: 'admin:users',         module: 'admin',     action: 'users',       description: 'Quản lý người dùng' },
  { code: 'admin:org',           module: 'admin',     action: 'org',         description: 'Quản lý cây tổ chức' },
  { code: 'admin:permissions',   module: 'admin',     action: 'permissions', description: 'Quản lý phân quyền' },
];

const ROLE_PERMISSIONS = {
  ADMIN: ALL_PERMISSIONS.map(p => p.code),
  LEADERSHIP: [
    'projects:read',
    'tasks:read', 'tasks:approve',
    'employees:read',
    'reports:read', 'reports:export',
    'timesheets:read', 'timesheets:approve',
    'timelogs:create', 'timelogs:update',
    'bugs:read', 'bugs:update', 'bugs:assign', 'bugs:close',
    'issues:read', 'issues:update', 'issues:approve',
    'bpm:read',
    'alerts:read', 'alerts:configure',
    'dashboard:read',
  ],
  PM: [
    'projects:read', 'projects:create', 'projects:update',
    'tasks:read', 'tasks:create', 'tasks:update', 'tasks:delete', 'tasks:approve',
    'employees:read',
    'reports:read', 'reports:export',
    'timesheets:read', 'timesheets:approve',
    'timelogs:create', 'timelogs:update',
    'bugs:read', 'bugs:create', 'bugs:update', 'bugs:assign', 'bugs:close',
    'issues:read', 'issues:create', 'issues:update', 'issues:approve',
    'bpm:read', 'bpm:manage',
    'alerts:read', 'alerts:configure',
    'dashboard:read',
  ],
  MEMBER: [
    'projects:read',
    'tasks:read', 'tasks:create', 'tasks:update',
    'employees:read',
    'timesheets:read',
    'timelogs:create', 'timelogs:update',
    'bugs:read', 'bugs:create', 'bugs:update',
    'issues:read', 'issues:create',
    'dashboard:read',
  ],
};

const MODULE_ROLES = [
  { code: 'hr:manager',          name: 'HR Manager',      domain: 'hr',         description: 'Quản lý HR',             is_system: true },
  { code: 'hr:recruiter',        name: 'HR Recruiter',     domain: 'hr',         description: 'Tuyển dụng',             is_system: true },
  { code: 'finance:accountant',  name: 'Accountant',       domain: 'finance',    description: 'Kế toán',                is_system: true },
  { code: 'finance:manager',     name: 'Finance Manager',  domain: 'finance',    description: 'Quản lý tài chính',      is_system: true },
  { code: 'crm:sales',           name: 'Sales Rep',        domain: 'crm',        description: 'Sales',                  is_system: true },
  { code: 'crm:manager',         name: 'CRM Manager',      domain: 'crm',        description: 'Quản lý CRM',            is_system: true },
  { code: 'operations:asset',    name: 'Asset Manager',    domain: 'operations', description: 'Quản lý tài sản',        is_system: true },
  { code: 'operations:contract', name: 'Contract Manager', domain: 'operations', description: 'Quản lý hợp đồng',      is_system: true },
];

async function seedPermissions(db) {
  // 1. Insert permission codes
  for (const p of ALL_PERMISSIONS) {
    await db.query(
      `INSERT INTO permissions (code, module, action, description, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (code) DO UPDATE SET module=$2, action=$3, description=$4`,
      [p.code, p.module, p.action, p.description ?? null]
    );
  }
  console.log(`  ✓ ${ALL_PERMISSIONS.length} permission codes upserted`);

  // 2. Insert role → permission mappings
  for (const [role, codes] of Object.entries(ROLE_PERMISSIONS)) {
    for (const code of codes) {
      await db.query(
        `INSERT INTO role_permissions (role, permission_code, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (role, permission_code) DO NOTHING`,
        [role, code]
      );
    }
  }
  const total = Object.values(ROLE_PERMISSIONS).reduce((s, a) => s + a.length, 0);
  console.log(`  ✓ ${total} role-permission rows upserted`);

  // 3. Insert placeholder module roles
  for (const mr of MODULE_ROLES) {
    await db.query(
      `INSERT INTO module_roles (code, name, domain, description, is_system, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (code) DO UPDATE SET name=$2, domain=$3, description=$4, is_system=$5`,
      [mr.code, mr.name, mr.domain, mr.description, mr.is_system]
    );
  }
  console.log(`  ✓ ${MODULE_ROLES.length} placeholder module roles upserted`);
}

// Permissions granted to each module role
const MODULE_ROLE_PERMISSIONS = {
  'hr:manager': [
    'employees:read', 'employees:create', 'employees:update', 'employees:delete',
    'timesheets:read', 'timesheets:approve',
    'timelogs:create', 'timelogs:update',
    'reports:read', 'reports:export',
    'dashboard:read',
  ],
  'hr:recruiter': [
    'employees:read', 'employees:create', 'employees:update',
    'timesheets:read',
    'dashboard:read',
  ],
  'finance:accountant': [
    'reports:read', 'reports:export',
    'timesheets:read', 'timesheets:approve',
    'timelogs:create', 'timelogs:update',
    'dashboard:read',
  ],
  'finance:manager': [
    'reports:read', 'reports:export',
    'timesheets:read', 'timesheets:approve',
    'alerts:read', 'alerts:configure',
    'dashboard:read',
  ],
  'crm:sales': [
    'projects:read',
    'tasks:read', 'tasks:create', 'tasks:update',
    'bugs:read', 'bugs:create',
    'issues:read', 'issues:create',
    'dashboard:read',
  ],
  'crm:manager': [
    'projects:read', 'projects:create', 'projects:update',
    'tasks:read', 'tasks:create', 'tasks:update', 'tasks:approve',
    'bugs:read', 'bugs:create', 'bugs:update', 'bugs:assign', 'bugs:close',
    'issues:read', 'issues:create', 'issues:update', 'issues:approve',
    'reports:read', 'reports:export',
    'dashboard:read',
  ],
  'operations:asset': [
    'projects:read',
    'tasks:read', 'tasks:create', 'tasks:update',
    'reports:read',
    'dashboard:read',
  ],
  'operations:contract': [
    'projects:read', 'projects:create', 'projects:update',
    'tasks:read', 'tasks:create', 'tasks:update',
    'reports:read', 'reports:export',
    'issues:read', 'issues:create', 'issues:update', 'issues:approve',
    'dashboard:read',
  ],
};

/**
 * Seeds demo data: module role permissions, user module role assignments, user permission overrides.
 * Requires that seedPermissions() has already been called.
 * Idempotent — uses ON CONFLICT DO NOTHING.
 */
async function seedPermissionDemo(db) {
  // ── 1. Assign permissions to module roles ─────────────────────────────────
  let mrpCount = 0;
  for (const [roleCode, codes] of Object.entries(MODULE_ROLE_PERMISSIONS)) {
    for (const permCode of codes) {
      await db.query(
        `INSERT INTO module_role_permissions (role_code, permission_code, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (role_code, permission_code) DO NOTHING`,
        [roleCode, permCode]
      );
      mrpCount++;
    }
  }
  console.log(`  ✓ ${mrpCount} module role permissions assigned`);

  // ── 2. Resolve demo user IDs by email ─────────────────────────────────────
  const emails = [
    'admin@loop.vn',
    ...Array.from({ length: 10 }, (_, i) => `pm${String(i + 1).padStart(3, '0')}@loop.vn`),
    ...Array.from({ length: 10 }, (_, i) => `emp${String(i + 1).padStart(4, '0')}@loop.vn`),
  ];
  const { rows: userRows } = await db.query(
    `SELECT id, email FROM users WHERE email = ANY($1)`,
    [emails]
  );
  const byEmail = {};
  for (const row of userRows) byEmail[row.email] = row.id;

  const adminId   = byEmail['admin@loop.vn'];
  const pmEmail   = (n) => `pm${String(n).padStart(3, '0')}@loop.vn`;
  const empEmail  = (n) => `emp${String(n).padStart(4, '0')}@loop.vn`;

  // ── 3. Assign module roles to users ───────────────────────────────────────
  // admin gets all 8 module roles (demo: show full ERP role list)
  const allModuleRoleCodes = MODULE_ROLES.map(r => r.code);
  const userModuleAssignments = [];

  if (adminId) {
    for (const code of allModuleRoleCodes) {
      userModuleAssignments.push([adminId, code]);
    }
  }

  // pm001–pm003: finance:accountant (can run cost reports)
  for (let i = 1; i <= 3; i++) {
    const uid = byEmail[pmEmail(i)];
    if (uid) userModuleAssignments.push([uid, 'finance:accountant']);
  }

  // pm004–pm006: finance:manager (can approve timesheets + configure alerts)
  for (let i = 4; i <= 6; i++) {
    const uid = byEmail[pmEmail(i)];
    if (uid) userModuleAssignments.push([uid, 'finance:manager']);
  }

  // pm007–pm008: hr:manager (can manage employees)
  for (let i = 7; i <= 8; i++) {
    const uid = byEmail[pmEmail(i)];
    if (uid) userModuleAssignments.push([uid, 'hr:manager']);
  }

  // pm009: operations:contract
  const pm9 = byEmail[pmEmail(9)];
  if (pm9) userModuleAssignments.push([pm9, 'operations:contract']);

  // pm010: crm:manager
  const pm10 = byEmail[pmEmail(10)];
  if (pm10) userModuleAssignments.push([pm10, 'crm:manager']);

  // emp0001–emp0005: crm:sales
  for (let i = 1; i <= 5; i++) {
    const uid = byEmail[empEmail(i)];
    if (uid) userModuleAssignments.push([uid, 'crm:sales']);
  }

  // emp0006–emp0007: hr:recruiter
  for (let i = 6; i <= 7; i++) {
    const uid = byEmail[empEmail(i)];
    if (uid) userModuleAssignments.push([uid, 'hr:recruiter']);
  }

  // emp0008–emp0010: operations:asset
  for (let i = 8; i <= 10; i++) {
    const uid = byEmail[empEmail(i)];
    if (uid) userModuleAssignments.push([uid, 'operations:asset']);
  }

  let umrCount = 0;
  for (const [userId, roleCode] of userModuleAssignments) {
    await db.query(
      `INSERT INTO user_module_roles (user_id, role_code, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, role_code) DO NOTHING`,
      [userId, roleCode]
    );
    umrCount++;
  }
  console.log(`  ✓ ${umrCount} user module role assignments inserted`);

  // ── 4. User permission overrides (demo variety) ───────────────────────────
  const overrides = [];

  // emp0001: granted bugs:assign (MEMBER normally can't assign bugs)
  const emp1 = byEmail[empEmail(1)];
  if (emp1) overrides.push([emp1, 'bugs:assign', true]);

  // emp0002: granted bugs:close (trusted resolver)
  const emp2 = byEmail[empEmail(2)];
  if (emp2) overrides.push([emp2, 'bugs:close', true]);

  // emp0003: granted tasks:approve (trusted senior)
  const emp3 = byEmail[empEmail(3)];
  if (emp3) overrides.push([emp3, 'tasks:approve', true]);

  // pm001: revoked projects:delete (safety measure)
  const pm1 = byEmail[pmEmail(1)];
  if (pm1) overrides.push([pm1, 'projects:delete', false]);

  // pm002: granted admin:users (temporary delegation)
  const pm2 = byEmail[pmEmail(2)];
  if (pm2) overrides.push([pm2, 'admin:users', true]);

  // emp0004: revoked timelogs:update (fixed-rate contractor, no edits)
  const emp4 = byEmail[empEmail(4)];
  if (emp4) overrides.push([emp4, 'timelogs:update', false]);

  let upCount = 0;
  for (const [userId, permCode, granted] of overrides) {
    await db.query(
      `INSERT INTO user_permissions (user_id, permission_code, granted, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, permission_code) DO UPDATE SET granted=$3`,
      [userId, permCode, granted]
    );
    upCount++;
  }
  console.log(`  ✓ ${upCount} user permission overrides seeded`);
}

module.exports = { seedPermissions, seedPermissionDemo };
