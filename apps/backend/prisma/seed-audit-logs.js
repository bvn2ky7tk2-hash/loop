/**
 * seed-audit-logs.js — Seed demo data cho bảng audit_logs
 * Chạy: node prisma/seed-audit-logs.js
 */
const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db';

const MODULES = ['pm', 'hr', 'finance', 'crm', 'admin', 'bpm', 'timesheet', 'recruit', 'asset'];
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT', 'LOGIN'];

const ENTITIES_BY_MODULE = {
  pm:        ['Task', 'Project', 'Bug'],
  hr:        ['Employee', 'Leave', 'Contract', 'PayrollRecord'],
  finance:   ['Expense', 'Payroll', 'Invoice', 'Budget'],
  crm:       ['Lead', 'Deal', 'Contact', 'Customer'],
  admin:     ['User', 'Permission', 'Setting'],
  bpm:       ['ProcessDefinition', 'ProcessInstance'],
  timesheet: ['TimesheetRecord', 'TimeEntry'],
  recruit:   ['JobOpening', 'Candidate', 'Interview'],
  asset:     ['Asset', 'AssetAssignment'],
};

const SAMPLE_DETAILS = [
  { oldValues: { status: 'PENDING' }, newValues: { status: 'APPROVED' } },
  { oldValues: { name: 'Task cũ' }, newValues: { name: 'Task mới đã cập nhật' } },
  { oldValues: null, newValues: { title: 'Bug mới', severity: 'HIGH', status: 'OPEN' } },
  { oldValues: { salary: 15000000 }, newValues: { salary: 18000000, note: 'Tăng lương Q4' } },
  { oldValues: { status: 'ACTIVE' }, newValues: { status: 'INACTIVE' } },
  { oldValues: null, newValues: { permissionCode: 'finance:read', granted: true } },
  { oldValues: null, newValues: { email: 'employee@loop.vn', role: 'MEMBER' } },
  { oldValues: { days: 5 }, newValues: { status: 'APPROVED', approvedAt: new Date().toISOString() } },
  { oldValues: null, newValues: { category: 'TRAVEL', amount: 2500000 } },
  { oldValues: { stage: 'CONTACT' }, newValues: { stage: 'QUALIFIED', notes: 'Đã có buổi meeting' } },
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(Math.floor(Math.random() * 9) + 8, Math.floor(Math.random() * 60));
  return d;
}

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log('✅ Đã kết nối PostgreSQL');

  // Lấy danh sách user hiện có
  const { rows: users } = await client.query(
    `SELECT id, name FROM users WHERE is_active = true ORDER BY created_at LIMIT 20`
  );

  if (!users.length) {
    console.log('⚠️  Không tìm thấy user nào. Hãy chạy seed chính trước.');
    await client.end();
    return;
  }

  console.log(`📋 Tìm thấy ${users.length} user: ${users.map(u => u.name).join(', ')}`);

  const logs = [];

  // Tạo 40 audit log records đa dạng
  for (let i = 0; i < 40; i++) {
    const module = randomItem(MODULES);
    const entities = ENTITIES_BY_MODULE[module] || ['Entity'];
    const entity = randomItem(entities);
    const action = randomItem(ACTIONS);
    const user = randomItem(users);
    const detail = randomItem(SAMPLE_DETAILS);
    const createdAt = randomDate(60);

    logs.push({
      id:         generateId(),
      userId:     user.id,
      action,
      module,
      entity,
      entityId:   generateId(),
      oldValues:  detail.oldValues ? JSON.stringify(detail.oldValues) : null,
      newValues:  detail.newValues ? JSON.stringify(detail.newValues) : null,
      ipAddress:  `192.168.1.${Math.floor(Math.random() * 100) + 1}`,
      userAgent:  'Loop-Web/2.4.0 (Seed)',
      createdAt:  createdAt.toISOString(),
    });
  }

  // Thêm một số log LOGIN cho các user
  for (const user of users.slice(0, 5)) {
    logs.push({
      id:         generateId(),
      userId:     user.id,
      action:     'LOGIN',
      module:     'admin',
      entity:     'User',
      entityId:   user.id,
      oldValues:  null,
      newValues:  JSON.stringify({ success: true }),
      ipAddress:  `10.0.0.${Math.floor(Math.random() * 50) + 1}`,
      userAgent:  'Mozilla/5.0 (Loop ERP)',
      createdAt:  randomDate(7).toISOString(),
    });
  }

  // Sort by createdAt giảm dần
  logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  let inserted = 0;
  for (const log of logs) {
    await client.query(
      `INSERT INTO audit_logs (id, user_id, action, module, entity, entity_id, old_values, new_values, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [
        log.id, log.userId, log.action, log.module, log.entity, log.entityId,
        log.oldValues, log.newValues, log.ipAddress, log.userAgent, log.createdAt,
      ]
    );
    inserted++;
  }

  console.log(`✅ Đã seed ${inserted} audit log records thành công!`);
  await client.end();
}

main().catch((err) => {
  console.error('❌ Lỗi seed:', err.message);
  process.exit(1);
});
