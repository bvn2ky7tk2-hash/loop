/* eslint-disable */
'use strict';
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

const DB = 'postgresql://loop:loop_password@localhost:5432/loop_db?schema=public';

// ─── helpers ────────────────────────────────────────────────────────────────
const uuid = () => randomUUID();
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randF = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);
const dateStr = (daysFromNow) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
};

// Vietnamese names
const HO = ['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Võ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý','Trịnh','Đinh','Lương','Tô'];
const TEN = ['Anh','Bình','Chi','Dũng','Em','Giang','Hà','Hùng','Khanh','Lan','Minh','Nam','Nga','Phúc','Quân','Sơn','Thảo','Tuấn','Uy','Vân','Xuân','Yến','An','Đức','Hải','Long','Ngọc','Quỳnh','Thái','Tú'];
const MIDDLE = ['Văn','Thị','Đức','Hoàng','Quang','Thanh','Trung','Hữu','Đình','Công','Xuân','Ngọc','Phương','Kim','Bảo'];

const viName = () => `${pick(HO)} ${pick(MIDDLE)} ${pick(TEN)}`;
const viEmail = (name, i) => {
  const clean = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/\s+/g,'.');
  return `${clean}${i}@loop.vn`;
};

const TECH_STACKS = [
  ['React','TypeScript','Node.js'],['Vue.js','JavaScript','MySQL'],
  ['Angular','Java','PostgreSQL'],['React Native','Flutter','Firebase'],
  ['Python','FastAPI','Redis'],['NestJS','TypeScript','MongoDB'],
  ['Spring Boot','Java','Oracle'],['Go','gRPC','Kafka'],
  ['DevOps','Docker','Kubernetes'],['QA','Selenium','Jira'],
  ['React','Redux','GraphQL'],['PHP','Laravel','MySQL'],
  ['.NET','C#','SQL Server'],['AWS','Terraform','CI/CD'],
];

const PROJECT_NAMES = [
  'Hệ thống quản lý nhân sự HRM','Cổng thông tin khách hàng','Ứng dụng mobile giao hàng',
  'Nền tảng thương mại điện tử','Hệ thống báo cáo tài chính','Dashboard phân tích dữ liệu',
  'Ứng dụng đặt lịch y tế','Hệ thống quản lý kho','CRM cho doanh nghiệp vừa và nhỏ',
  'Nền tảng học trực tuyến LMS','API Gateway microservices','Ứng dụng chat nội bộ',
  'Hệ thống tuyển dụng ATS','Cổng thanh toán điện tử','Ứng dụng quản lý dự án',
  'Hệ thống ERP module kế toán','Nền tảng IoT monitoring','Ứng dụng đặt phòng khách sạn',
  'Hệ thống xác thực SSO','Dashboard logistics realtime',
];

const TASK_TITLES = [
  'Thiết kế database schema','Cài đặt môi trường CI/CD','Phân tích yêu cầu nghiệp vụ',
  'Viết API endpoints','Thiết kế giao diện UI/UX','Viết unit tests','Code review sprint',
  'Deploy lên staging server','Fix bug màn hình login','Tối ưu query database',
  'Viết tài liệu API','Cấu hình monitoring','Tích hợp payment gateway','Testing regression',
  'Họp kickoff dự án','Báo cáo tiến độ tuần','Refactor module xác thực',
  'Thiết kế luồng nghiệp vụ','Cài đặt Redis cache','Xây dựng module báo cáo',
  'Viết migration script','Test performance load','Tích hợp third-party API',
  'Cập nhật tài liệu kỹ thuật','Xây dựng dashboard admin',
];

async function main() {
  const client = new Client({ connectionString: DB });
  await client.connect();
  console.log('✅ Connected to database');

  const hash = await bcrypt.hash('admin', 10);

  // ── 1. Org Units ──────────────────────────────────────────────────────────
  console.log('📦 Seeding org units...');
  const rootId = (await client.query(`SELECT id FROM org_units WHERE code='ROOT' LIMIT 1`)).rows[0]?.id || uuid();
  const orgUnits = [
    { id: rootId, name: 'Công ty TNHH Loop', code: 'ROOT', parent: null },
    { id: uuid(), name: 'Phòng Công nghệ thông tin', code: 'IT', parent: 'ROOT' },
    { id: uuid(), name: 'Phòng Quản lý Dự án', code: 'PMO', parent: 'ROOT' },
    { id: uuid(), name: 'Phòng Nhân sự', code: 'HR', parent: 'ROOT' },
    { id: uuid(), name: 'Phòng Tài chính', code: 'FIN', parent: 'ROOT' },
    { id: uuid(), name: 'Phòng Kinh doanh', code: 'SALES', parent: 'ROOT' },
    { id: uuid(), name: 'Nhóm Phát triển Backend', code: 'BE', parent: 'IT' },
    { id: uuid(), name: 'Nhóm Phát triển Frontend', code: 'FE', parent: 'IT' },
    { id: uuid(), name: 'Nhóm Kiểm thử QA', code: 'QA', parent: 'IT' },
    { id: uuid(), name: 'Nhóm DevOps & Cloud', code: 'DEVOPS', parent: 'IT' },
    { id: uuid(), name: 'Nhóm Thiết kế UI/UX', code: 'DESIGN', parent: 'IT' },
    { id: uuid(), name: 'Nhóm Phân tích nghiệp vụ BA', code: 'BA', parent: 'PMO' },
  ];
  const orgMap = {}; // code -> id
  for (const o of orgUnits) orgMap[o.code] = o.id;

  // Upsert org units — clear dependents first to avoid FK violations
  await client.query(`DELETE FROM notifications`);
  await client.query(`DELETE FROM alert_configs`);
  await client.query(`DELETE FROM time_logs`);
  await client.query(`DELETE FROM tasks`);
  await client.query(`DELETE FROM allocations`);
  await client.query(`DELETE FROM projects`);
  await client.query(`DELETE FROM employee_rates`);
  await client.query(`DELETE FROM employees`);
  await client.query(`DELETE FROM users WHERE email NOT IN ('admin@loop.vn')`);
  await client.query(`DELETE FROM org_units WHERE code != 'ROOT'`);
  for (const o of orgUnits) {
    const parentId = o.parent ? orgMap[o.parent] : null;
    await client.query(
      `INSERT INTO org_units(id,name,code,parent_id,created_at,updated_at)
       VALUES($1,$2,$3,$4,NOW(),NOW())
       ON CONFLICT(code) DO UPDATE SET name=$2, parent_id=$4, updated_at=NOW()`,
      [o.id, o.name, o.code, parentId]
    );
  }
  console.log(`  ✓ ${orgUnits.length} org units`);

  // ── 2. Users ──────────────────────────────────────────────────────────────
  console.log('👤 Seeding users...');
  // Keep admin + pm, add 48 more
  const existingEmails = new Set(
    (await client.query(`SELECT email FROM users`)).rows.map(r => r.email)
  );
  const roles = ['MEMBER','MEMBER','MEMBER','MEMBER','PM','PM','LEADERSHIP'];
  const orgCodes = ['IT','PMO','HR','FIN','SALES','BE','FE','QA','DEVOPS','DESIGN','BA'];
  const userIds = [];
  const userRecords = [];
  // collect existing user ids
  const existingUsers = (await client.query(`SELECT id,email FROM users`)).rows;
  for (const u of existingUsers) userIds.push(u.id);

  for (let i = 1; i <= 48; i++) {
    const name = viName();
    const email = viEmail(name, i);
    if (existingEmails.has(email)) continue;
    const id = uuid();
    const orgCode = pick(orgCodes);
    const role = pick(roles);
    await client.query(
      `INSERT INTO users(id,email,password_hash,name,role,org_unit_id,is_active,created_at,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,true,NOW(),NOW()) ON CONFLICT(email) DO NOTHING`,
      [id, email, hash, name, role, orgMap[orgCode]]
    );
    userIds.push(id);
    userRecords.push({ id, name, email, orgCode });
  }
  const allUsers = (await client.query(`SELECT id,name,email FROM users`)).rows;
  console.log(`  ✓ ${allUsers.length} users total`);

  // ── 3. Employees ──────────────────────────────────────────────────────────
  console.log('👷 Seeding employees...');
  await client.query(`DELETE FROM employee_rates`);
  await client.query(`DELETE FROM employees`);
  const levels = ['JUNIOR','JUNIOR','MID','MID','MID','SENIOR','SENIOR','EXPERT'];
  const employeeIds = [];
  const employeeData = [];
  for (let i = 1; i <= 50; i++) {
    const id = uuid();
    const name = viName();
    const code = `EMP${String(i).padStart(3,'0')}`;
    const level = pick(levels);
    const orgCode = pick(['BE','FE','QA','DEVOPS','DESIGN','BA','PMO']);
    const techStack = pick(TECH_STACKS);
    const startDate = dateStr(-rand(30, 1000));
    const userId = i <= allUsers.length ? allUsers[i - 1]?.id || null : null;
    await client.query(
      `INSERT INTO employees(id,code,full_name,level,tech_stack,org_unit_id,start_date,user_id,is_active,created_at,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,NOW(),NOW())`,
      [id, code, name, level, techStack, orgMap[orgCode], startDate, userId]
    );
    employeeIds.push(id);
    employeeData.push({ id, name, code, level, userId });

    // 1-2 rate records per employee
    const numRates = rand(1,2);
    for (let r = 0; r < numRates; r++) {
      const ratePerDay = level === 'EXPERT' ? rand(1200,2000) : level === 'SENIOR' ? rand(800,1200) : level === 'MID' ? rand(500,800) : rand(300,500);
      await client.query(
        `INSERT INTO employee_rates(id,employee_id,rate_per_day,currency,effective_date,created_at)
         VALUES($1,$2,$3,'VND',$4,NOW())`,
        [uuid(), id, ratePerDay * 1000, dateStr(-(numRates - r) * 180)]
      );
    }
  }
  console.log(`  ✓ 50 employees + rates`);

  // ── 4. Projects ──────────────────────────────────────────────────────────
  console.log('📋 Seeding projects...');
  await client.query(`DELETE FROM time_logs`);
  await client.query(`DELETE FROM tasks`);
  await client.query(`DELETE FROM alert_configs`);
  await client.query(`DELETE FROM allocations`);
  await client.query(`DELETE FROM projects`);

  const statuses = ['PLANNING','PLANNING','ACTIVE','ACTIVE','ACTIVE','ACTIVE','ON_HOLD','CLOSED'];
  const pmUserIds = (await client.query(`SELECT id FROM users WHERE role IN ('ADMIN','PM') LIMIT 10`)).rows.map(r => r.id);
  const orgUnitsForProj = (await client.query(`SELECT id FROM org_units`)).rows.map(r => r.id);

  const projectIds = [];
  for (let i = 0; i < 50; i++) {
    const id = uuid();
    const code = `PRJ${String(i+1).padStart(3,'0')}`;
    const name = PROJECT_NAMES[i % PROJECT_NAMES.length] + (i >= PROJECT_NAMES.length ? ` ${Math.floor(i/PROJECT_NAMES.length)+1}` : '');
    const status = pick(statuses);
    const type = pick(['OSDC','OSDC','PKG']);
    const startDate = dateStr(-rand(30, 300));
    const endDate = dateStr(rand(30, 365));
    const pmId = pick(pmUserIds);
    const orgUnitId = pick(orgUnitsForProj);
    const progress = status === 'CLOSED' ? 100 : status === 'ACTIVE' ? rand(10,80) : rand(0,20);
    await client.query(
      `INSERT INTO projects(id,code,name,type,status,pm_id,org_unit_id,start_date,end_date,progress,budget_effort_mm,created_at,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
      [id, code, name, type, status, pmId, orgUnitId, startDate, endDate, progress, rand(3,24)]
    );
    projectIds.push(id);
  }
  console.log(`  ✓ 50 projects`);

  // ── 5. Allocations ───────────────────────────────────────────────────────
  console.log('🔗 Seeding allocations...');
  const memberRoles = ['MEMBER','MEMBER','LEAD','QA','BA','DevOps','Designer'];
  let allocCount = 0;
  for (const projId of projectIds) {
    const numMembers = rand(2, 5);
    const usedEmps = new Set();
    for (let m = 0; m < numMembers; m++) {
      let empId;
      do { empId = pick(employeeIds); } while (usedEmps.has(empId));
      usedEmps.add(empId);
      const emp = employeeData.find(e => e.id === empId);
      await client.query(
        `INSERT INTO allocations(id,project_id,employee_id,role,level,allocation_pct,rate_per_day,start_date,end_date,created_at,updated_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
        [uuid(), projId, empId, pick(memberRoles), emp?.level || 'MID', rand(50,100), rand(500,1500)*1000, dateStr(-rand(10,90)), dateStr(rand(30,180))]
      );
      allocCount++;
    }
  }
  console.log(`  ✓ ${allocCount} allocations`);

  // ── 6. Tasks ──────────────────────────────────────────────────────────────
  console.log('✅ Seeding tasks...');
  const taskStatuses = ['TODO','TODO','IN_PROGRESS','IN_PROGRESS','DONE','DONE','PENDING_APPROVAL','CANCELLED'];
  let taskCount = 0;
  const taskRecords = []; // {id, projectId, status}
  for (const projId of projectIds) {
    const numTasks = rand(4, 8);
    const projTaskIds = [];
    for (let t = 0; t < numTasks; t++) {
      const id = uuid();
      const status = pick(taskStatuses);
      const parentId = projTaskIds.length > 1 && Math.random() > 0.6 ? pick(projTaskIds) : null;
      const est = rand(4, 40);
      const actual = status === 'DONE' ? rand(Math.max(1, est - 8), est + 8) : status === 'IN_PROGRESS' ? rand(1, est) : 0;
      const progress = status === 'DONE' ? 100 : status === 'IN_PROGRESS' ? rand(10, 90) : status === 'PENDING_APPROVAL' ? rand(90, 100) : 0;
      const dueDate = dateStr(rand(-30, 60));
      const assigneeId = Math.random() > 0.3 ? pick(employeeIds) : null;
      await client.query(
        `INSERT INTO tasks(id,project_id,parent_id,title,status,progress,estimate_hours,actual_hours,assignee_id,due_date,created_at,updated_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
        [id, projId, parentId, pick(TASK_TITLES) + ` [${projTaskIds.length+1}]`, status, progress, est, actual, assigneeId, dueDate]
      );
      projTaskIds.push(id);
      taskRecords.push({ id, projectId: projId, status, actualHours: actual });
      taskCount++;
    }
  }
  console.log(`  ✓ ${taskCount} tasks`);

  // ── 6b. Dedicated PENDING_APPROVAL tasks cho demo phê duyệt ─────────────
  console.log('📋 Seeding pending approval tasks...');
  const PENDING_TITLES = [
    'Implement OAuth2 đăng nhập Google',
    'Thiết kế màn hình dashboard v2.0',
    'Viết API tích hợp thanh toán MoMo',
    'Fix bug export báo cáo Excel',
    'Tối ưu performance trang chủ mobile',
    'Cài đặt push notification cho app',
    'Viết unit test module thanh toán',
    'Deploy hotfix lên production server',
    'Refactor module phân quyền người dùng',
    'Tích hợp SMS OTP verification',
    'Thiết kế ERD module quản lý kho',
    'Implement real-time chat với WebSocket',
    'Cập nhật tài liệu API v2.1',
    'Kiểm thử bảo mật penetration testing',
    'Xây dựng báo cáo tổng hợp tháng',
    'Migrate database lên PostgreSQL 16',
    'Cấu hình CI/CD pipeline mới',
    'Viết tài liệu hướng dẫn sử dụng',
    'Tối ưu query N+1 trong module đơn hàng',
    'Hoàn thiện màn hình quản lý phân quyền',
  ];
  let pendingCount = 0;
  for (let i = 0; i < PENDING_TITLES.length; i++) {
    const projId = projectIds[i % projectIds.length];
    const empId  = employeeIds[i % employeeIds.length];
    const est    = rand(4, 24);
    const actual = rand(Math.max(1, est - 4), est + 2);
    const daysAgo = rand(1, 7); // nộp 1-7 ngày trước
    await client.query(
      `INSERT INTO tasks(id,project_id,title,status,progress,estimate_hours,actual_hours,assignee_id,due_date,created_at,updated_at)
       VALUES($1,$2,$3,'PENDING_APPROVAL',$4,$5,$6,$7,$8,NOW()-($9 || ' days')::interval,NOW())`,
      [uuid(), projId, PENDING_TITLES[i], rand(90, 100), est, actual, empId, dateStr(rand(-5, 10)), daysAgo]
    );
    pendingCount++;
  }
  console.log(`  ✓ ${pendingCount} pending approval tasks`);

  // ── 7. Time Logs ──────────────────────────────────────────────────────────
  console.log('⏱ Seeding time logs...');
  let logCount = 0;
  const doneTasks = taskRecords.filter(t => ['DONE','IN_PROGRESS'].includes(t.status));
  for (let i = 0; i < 50 && i < doneTasks.length; i++) {
    const t = doneTasks[i];
    const userId = pick(allUsers).id;
    const numLogs = rand(1, 3);
    for (let l = 0; l < numLogs; l++) {
      await client.query(
        `INSERT INTO time_logs(id,task_id,user_id,hours,log_date,created_at)
         VALUES($1,$2,$3,$4,$5,NOW())`,
        [uuid(), t.id, userId, randF(0.5, 8), dateStr(-rand(0, 30))]
      );
      logCount++;
    }
  }
  console.log(`  ✓ ${logCount} time logs`);

  // ── 8. Alert Configs ──────────────────────────────────────────────────────
  console.log('🔔 Seeding alert configs...');
  const alertTypes = ['TASK_OVERDUE','TASK_DUE_SOON','BUDGET_EXCEEDED'];
  let alertCount = 0;
  for (let i = 0; i < Math.min(50, projectIds.length); i++) {
    const projId = projectIds[i];
    const type = alertTypes[i % alertTypes.length];
    try {
      await client.query(
        `INSERT INTO alert_configs(id,project_id,type,threshold,days_before_due,is_active,created_at,updated_at)
         VALUES($1,$2,$3,$4,$5,true,NOW(),NOW())
         ON CONFLICT(project_id,type) DO NOTHING`,
        [uuid(), projId, type, type === 'BUDGET_EXCEEDED' ? 80 : null, type === 'TASK_DUE_SOON' ? 3 : null]
      );
      alertCount++;
    } catch (e) { /* skip conflict */ }
  }
  console.log(`  ✓ ${alertCount} alert configs`);

  // ── 9. Notifications ──────────────────────────────────────────────────────
  console.log('📬 Seeding notifications...');
  const notifTypes = ['TASK_OVERDUE','TASK_DUE_SOON','TASK_APPROVED','TASK_RETURNED'];
  const notifTitles = {
    TASK_OVERDUE: 'Task đã quá hạn',
    TASK_DUE_SOON: 'Task sắp đến hạn',
    TASK_APPROVED: 'Task đã được duyệt',
    TASK_RETURNED: 'Task bị trả lại',
  };
  let notifCount = 0;
  for (let i = 0; i < 50; i++) {
    const userId = pick(allUsers).id;
    const type = pick(notifTypes);
    const taskTitle = pick(TASK_TITLES);
    await client.query(
      `INSERT INTO notifications(id,user_id,type,title,body,is_read,created_at)
       VALUES($1,$2,$3,$4,$5,$6,NOW())`,
      [uuid(), userId, type, notifTitles[type], `"${taskTitle}" cần được xử lý`, Math.random() > 0.4]
    );
    notifCount++;
  }
  console.log(`  ✓ ${notifCount} notifications`);

  await client.end();

  // Summary
  const c2 = new Client({ connectionString: DB });
  await c2.connect();
  const tables = ['org_units','users','employees','employee_rates','projects','allocations','tasks','time_logs','alert_configs','notifications'];
  console.log('\n📊 Final counts:');
  for (const t of tables) {
    const r = await c2.query('SELECT COUNT(*) FROM ' + t);
    console.log(`  ${t}: ${r.rows[0].count}`);
  }
  await c2.end();
  console.log('\n✅ Seed hoàn tất!');
}

main().catch(err => { console.error(err); process.exit(1); });
