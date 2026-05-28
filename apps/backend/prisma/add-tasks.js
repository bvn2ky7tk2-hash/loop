/* eslint-disable */
'use strict';
const { Client } = require('pg');
const { randomUUID } = require('crypto');

const DB = 'postgresql://loop:loop_password@localhost:5432/loop_db?schema=public';

const uuid = () => randomUUID();
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randF = (min, max) => +(Math.random() * (max - min) + min).toFixed(1);
const dateStr = (daysFromNow) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
};

// Rich Vietnamese task title corpus
const TITLES_BY_PHASE = {
  analysis: [
    'Phân tích yêu cầu nghiệp vụ','Thu thập yêu cầu từ stakeholder','Vẽ sơ đồ luồng nghiệp vụ',
    'Xác định actor và use case','Phân tích rủi ro dự án','Xây dựng prototype ban đầu',
    'Đánh giá hệ thống hiện tại','Lập danh sách chức năng cần phát triển','Phân tích dữ liệu đầu vào/ra',
    'Xác định tiêu chí nghiệm thu','Lập tài liệu đặc tả kỹ thuật','Nghiên cứu giải pháp công nghệ',
  ],
  design: [
    'Thiết kế database schema','Thiết kế kiến trúc hệ thống','Thiết kế giao diện UI/UX',
    'Thiết kế API contract','Vẽ ERD diagram','Thiết kế luồng xác thực người dùng',
    'Xây dựng design system component','Thiết kế cấu trúc thư mục dự án','Thiết kế cơ chế phân quyền',
    'Lập wireframe các màn hình chính','Thiết kế notification flow','Thiết kế caching strategy',
  ],
  backend: [
    'Viết API endpoint danh sách','Viết API tạo mới','Viết API cập nhật','Viết API xoá',
    'Tích hợp xác thực JWT','Cài đặt middleware phân quyền','Xây dựng module gửi email',
    'Tích hợp payment gateway','Viết migration script database','Xây dựng job xử lý nền',
    'Tối ưu hoá query database','Cài đặt Redis cache','Xây dựng WebSocket module',
    'Tích hợp third-party API','Viết logic nghiệp vụ chính','Xây dựng service layer',
    'Cài đặt rate limiting','Viết API export báo cáo','Tích hợp file upload S3',
    'Xây dựng cơ chế retry','Xây dựng audit log','Cài đặt soft delete',
  ],
  frontend: [
    'Xây dựng màn hình đăng nhập','Xây dựng dashboard tổng quan','Xây dựng màn hình danh sách',
    'Xây dựng form tạo/sửa','Xây dựng bộ lọc tìm kiếm','Tích hợp API vào màn hình',
    'Xây dựng component bảng dữ liệu','Xây dựng biểu đồ thống kê','Xây dựng màn hình cài đặt',
    'Cài đặt state management','Xây dựng navigation menu','Tối ưu performance render',
    'Xây dựng màn hình thông báo','Cài đặt dark/light mode','Xây dựng form validation',
    'Xây dựng infinite scroll','Xây dựng drag and drop','Cài đặt i18n đa ngôn ngữ',
  ],
  devops: [
    'Cài đặt CI/CD pipeline','Cấu hình Docker container','Cài đặt Kubernetes cluster',
    'Cấu hình Nginx reverse proxy','Cài đặt monitoring Grafana','Cấu hình alerting Prometheus',
    'Tối ưu Docker image size','Cài đặt log aggregation ELK','Cấu hình auto scaling',
    'Backup database định kỳ','Cài đặt SSL certificate','Cấu hình CDN cho static files',
    'Cài đặt staging environment','Cấu hình secrets management','Kiểm tra bảo mật hệ thống',
  ],
  testing: [
    'Viết unit test cho service','Viết integration test API','Viết E2E test luồng chính',
    'Test performance tải cao','Test bảo mật XSS/SQL injection','Test mobile responsive',
    'Viết test case nghiệm thu','Kiểm tra bug màn hình login','Testing regression sau release',
    'Test cross-browser compatibility','Kiểm tra logic phân quyền','Test xử lý lỗi exception',
    'Viết smoke test môi trường staging','Test tích hợp payment','Performance benchmark API',
  ],
  management: [
    'Họp kickoff dự án','Báo cáo tiến độ tuần','Sprint planning session',
    'Sprint retrospective','Code review pull request','Demo chức năng cho khách hàng',
    'Cập nhật tài liệu kỹ thuật','Đào tạo team sử dụng tool','Họp giải quyết blocker',
    'Lập kế hoạch release','Viết release notes','Nghiệm thu sprint với PM',
    'Estimate task sprint mới','Phân công công việc team','Tổng hợp feedback khách hàng',
  ],
};

const ALL_TITLES = Object.values(TITLES_BY_PHASE).flat();

const STATUSES = ['TODO','TODO','TODO','IN_PROGRESS','IN_PROGRESS','DONE','DONE','PENDING_APPROVAL','RETURNED','CANCELLED'];

async function main() {
  const client = new Client({ connectionString: DB });
  await client.connect();
  console.log('✅ Connected to database');

  // Load existing data
  const projects = (await client.query(`SELECT id, code, status FROM projects ORDER BY created_at`)).rows;
  const employees = (await client.query(`SELECT id, code, full_name, user_id FROM employees`)).rows;
  const allUsers = (await client.query(`SELECT id FROM users`)).rows;
  const allocations = (await client.query(
    `SELECT project_id, employee_id FROM allocations`
  )).rows;

  // Build project → allocated employees map
  const projAllocMap = {};
  for (const a of allocations) {
    if (!projAllocMap[a.project_id]) projAllocMap[a.project_id] = [];
    projAllocMap[a.project_id].push(a.employee_id);
  }

  console.log(`📊 Loaded: ${projects.length} projects, ${employees.length} employees, ${allocations.length} allocations`);

  // Weight projects: ACTIVE gets more tasks, PLANNING gets some, others get few
  const weightedProjects = [];
  for (const p of projects) {
    const weight = p.status === 'ACTIVE' ? 8 : p.status === 'PLANNING' ? 4 : p.status === 'ON_HOLD' ? 2 : 1;
    for (let i = 0; i < weight; i++) weightedProjects.push(p);
  }

  // Track tasks per project for parent assignment
  const tasksByProject = {}; // projectId -> [{id, level}]

  let taskCount = 0;
  const taskRecords = [];
  const TARGET = 1000;

  console.log(`\n🔨 Creating ${TARGET} tasks...`);

  while (taskCount < TARGET) {
    const proj = pick(weightedProjects);
    const projId = proj.id;

    if (!tasksByProject[projId]) tasksByProject[projId] = [];

    const existing = tasksByProject[projId];

    // Decide parent (30% chance of subtask if there are candidates at level < 5)
    let parentId = null;
    let level = 1;
    const parentCandidates = existing.filter(t => t.level < 5);
    if (parentCandidates.length > 0 && Math.random() < 0.30) {
      const parent = pick(parentCandidates);
      // Avoid too deep: prefer level 2-3
      if (parent.level <= 3 || Math.random() < 0.3) {
        parentId = parent.id;
        level = parent.level + 1;
      }
    }

    const id = uuid();
    const status = pick(STATUSES);
    const phase = pick(Object.keys(TITLES_BY_PHASE));
    const titleBase = pick(TITLES_BY_PHASE[phase]);
    const suffix = ` [${existing.length + 1}]`;
    const title = titleBase + suffix;

    const est = rand(2, 40);
    const actual = status === 'DONE' ? rand(Math.max(1, est - 10), est + 10)
                 : status === 'IN_PROGRESS' ? rand(1, est)
                 : 0;
    const progress = status === 'DONE' ? 100
                   : status === 'IN_PROGRESS' ? rand(10, 90)
                   : status === 'CANCELLED' ? 0
                   : 0;

    const daysOffset = status === 'DONE' ? rand(-90, -1) : rand(-30, 90);
    const dueDate = dateStr(daysOffset);
    const startDate = dateStr(daysOffset - rand(7, 30));

    // Pick assignee from project allocations, fallback to any employee
    const allocatedEmps = projAllocMap[projId] || [];
    const assigneeId = allocatedEmps.length > 0 ? pick(allocatedEmps) : pick(employees).id;

    // Approver: random user (PM/admin preferred)
    const approverId = pick(allUsers).id;

    await client.query(
      `INSERT INTO tasks(id,project_id,parent_id,level,title,status,progress,estimate_hours,actual_hours,
        assignee_id,approver_id,start_date,due_date,position,created_at,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())`,
      [id, projId, parentId, level, title, status, progress, est, actual,
       assigneeId, approverId, startDate, dueDate, existing.length]
    );

    tasksByProject[projId].push({ id, level });
    taskRecords.push({ id, projectId: projId, status, actualHours: actual, assigneeId });
    taskCount++;

    if (taskCount % 100 === 0) process.stdout.write(`  ${taskCount}/${TARGET}\r`);
  }
  console.log(`\n  ✓ ${taskCount} tasks created`);

  // Add time logs for DONE and IN_PROGRESS tasks
  console.log('⏱ Seeding time logs...');
  const loggableTasks = taskRecords.filter(t => ['DONE','IN_PROGRESS'].includes(t.status) && t.actualHours > 0);
  let logCount = 0;

  for (const task of loggableTasks) {
    const numLogs = rand(1, 4);
    const hoursPerLog = +(task.actualHours / numLogs).toFixed(1);
    for (let l = 0; l < numLogs; l++) {
      const userId = Math.random() < 0.8
        ? (employees.find(e => e.id === task.assigneeId)?.user_id || pick(allUsers).id)
        : pick(allUsers).id;
      if (!userId) continue;
      await client.query(
        `INSERT INTO time_logs(id,task_id,user_id,hours,log_date,created_at)
         VALUES($1,$2,$3,$4,$5,NOW())`,
        [uuid(), task.id, userId, Math.max(0.5, hoursPerLog), dateStr(-rand(0, 60))]
      );
      logCount++;
    }
  }
  console.log(`  ✓ ${logCount} time logs created`);

  // Summary
  const tables = ['tasks','time_logs'];
  console.log('\n📊 Updated counts:');
  for (const t of tables) {
    const r = await client.query('SELECT COUNT(*) FROM ' + t);
    console.log(`  ${t}: ${r.rows[0].count}`);
  }

  // Per-project breakdown (top 10)
  const breakdown = await client.query(
    `SELECT p.code, p.status, COUNT(t.id) as task_count
     FROM projects p LEFT JOIN tasks t ON t.project_id = p.id
     GROUP BY p.id, p.code, p.status
     ORDER BY task_count DESC LIMIT 10`
  );
  console.log('\nTop 10 projects by task count:');
  for (const row of breakdown.rows) {
    console.log(`  ${row.code} (${row.status}): ${row.task_count} tasks`);
  }

  await client.end();
  console.log('\n✅ Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
