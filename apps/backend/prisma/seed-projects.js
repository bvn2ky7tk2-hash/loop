'use strict';
/**
 * seed-projects.js — Seed 50 Projects + Tasks + Bugs + Milestones
 * Chạy: node prisma/seed-projects.js
 */

require('dotenv/config');
const { Client } = require('pg');
const { randomUUID } = require('crypto');

const db = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db',
});

const uid = () => randomUUID();
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
};
const rng = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};
const daysFrom = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};
const daysFromDate = (base, n) => {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

// ─── Dữ liệu tĩnh ────────────────────────────────────────────────────────────

const PROJECT_NAMES = {
  PLANNING: [
    'Nền tảng thương mại điện tử B2B',
    'Hệ thống quản lý chuỗi cung ứng SCM',
    'Portal tự phục vụ nhân viên ESS',
    'Ứng dụng CRM Mobile cho sales',
    'Dự án AI chatbot hỗ trợ khách hàng',
  ],
  ACTIVE: [
    'ERP Core — Module Tài chính & Kế toán',
    'Hệ thống báo cáo BI & Analytics',
    'Nâng cấp hạ tầng Cloud AWS Migration',
    'Portal quản lý đại lý phân phối',
    'App Mobile HRM cho iOS & Android',
    'Tích hợp thanh toán VNPAY & MoMo',
    'Hệ thống quản lý tài sản doanh nghiệp',
    'Digital Transformation Phase 1',
    'Nền tảng học tập trực tuyến LMS',
    'API Gateway & Microservices Migration',
    'Hệ thống quản lý kho WMS',
    'Phát triển website thương mại điện tử',
    'Ứng dụng quản lý dự án nội bộ',
    'Tích hợp ERP với hệ thống kế toán',
    'Hệ thống chấm công & tính lương tự động',
    'Portal khách hàng & self-service',
    'Nền tảng ký số điện tử eSign',
    'Hệ thống quản lý hợp đồng CLM',
    'Phát triển module procurement',
    'Nâng cấp hệ thống bảo mật & SIEM',
    'Triển khai DevOps & CI/CD Pipeline',
    'Hệ thống quản lý chất lượng QMS',
    'App đặt xe & logistics nội bộ',
    'Dashboard executive & KPI tracking',
    'Tích hợp IoT cho nhà máy sản xuất',
    'Nền tảng thanh toán nội bộ interbank',
    'Hệ thống quản lý dịch vụ ITSM',
    'Phát triển API công khai OpenAPI',
    'Ứng dụng quản lý bán hàng POS',
    'Hệ thống phân tích rủi ro & compliance',
  ],
  ON_HOLD: [
    'Dự án blockchain supply chain',
    'Nền tảng NFT marketplace nội bộ',
    'Hệ thống ERP cho chi nhánh quốc tế',
    'Triển khai AI dự báo nhu cầu',
    'Dự án metaverse onboarding',
  ],
  CLOSED: [
    'Website tái thiết kế thương hiệu 2024',
    'Hệ thống ticketing nội bộ v1',
    'Migration dữ liệu từ Oracle sang PostgreSQL',
    'Dự án ISO 27001 certification',
    'App mobile v1 — legacy',
    'Tích hợp Salesforce CRM',
    'Phát triển API cho đối tác v1',
    'Hệ thống backup & disaster recovery',
    'Audit & compliance 2024',
    'Infrastructure upgrade Q1/2025',
  ],
};

const CUSTOMER_DATA = [
  { code: 'VNG', name: 'VNG Corporation', industry: 'Technology' },
  { code: 'FPT', name: 'FPT Software', industry: 'Technology' },
  { code: 'VTEL', name: 'Viettel Solutions', industry: 'Telecommunications' },
  { code: 'VNPT', name: 'VNPT Technology', industry: 'Telecommunications' },
  { code: 'MOMO', name: 'MoMo Fintech', industry: 'Fintech' },
  { code: 'BIDV', name: 'BIDV Technology', industry: 'Banking' },
  { code: 'THACO', name: 'Thaco Group', industry: 'Manufacturing' },
  { code: 'VINCOM', name: 'Vincom Retail', industry: 'Retail' },
  { code: 'MSN', name: 'Masan Group', industry: 'FMCG' },
  { code: 'TCB', name: 'Techcombank Digital', industry: 'Banking' },
];

const EPIC_TEMPLATES = [
  {
    title: 'Phân tích & Thiết kế hệ thống',
    subtasks: [
      'Thu thập yêu cầu từ stakeholders',
      'Phân tích quy trình nghiệp vụ hiện tại',
      'Thiết kế kiến trúc hệ thống',
      'Lập tài liệu đặc tả chức năng SRS',
      'Review & sign-off tài liệu thiết kế',
    ],
  },
  {
    title: 'Phát triển Frontend UI/UX',
    subtasks: [
      'Thiết kế wireframe & prototype',
      'Phát triển component library',
      'Xây dựng trang danh sách & filter',
      'Xây dựng form nhập liệu & validation',
      'Tích hợp API & xử lý state management',
    ],
  },
  {
    title: 'Phát triển Backend & API',
    subtasks: [
      'Thiết kế schema database',
      'Xây dựng RESTful API endpoints',
      'Tích hợp authentication & authorization',
      'Viết unit tests & integration tests',
      'Tối ưu query & caching strategy',
    ],
  },
  {
    title: 'Tích hợp hệ thống bên thứ ba',
    subtasks: [
      'Phân tích API tài liệu đối tác',
      'Xây dựng adapter & connector',
      'Test tích hợp với môi trường sandbox',
      'Xử lý error & retry logic',
    ],
  },
  {
    title: 'Kiểm thử & QA',
    subtasks: [
      'Lập kế hoạch kiểm thử',
      'Thực hiện functional testing',
      'Performance & load testing',
      'User acceptance testing (UAT)',
      'Sửa lỗi & regression testing',
    ],
  },
  {
    title: 'Triển khai & DevOps',
    subtasks: [
      'Cấu hình môi trường staging',
      'Thiết lập CI/CD pipeline',
      'Triển khai production',
      'Cấu hình monitoring & alerting',
    ],
  },
  {
    title: 'Tài liệu & Đào tạo',
    subtasks: [
      'Viết tài liệu hướng dẫn sử dụng',
      'Lập tài liệu kỹ thuật API',
      'Chuẩn bị tài liệu đào tạo',
      'Tổ chức buổi đào tạo người dùng',
    ],
  },
  {
    title: 'Bảo trì & Hỗ trợ sau go-live',
    subtasks: [
      'Thiết lập quy trình hỗ trợ L1/L2',
      'Cấu hình log & error tracking',
      'Backup & disaster recovery plan',
      'SLA monitoring & reporting',
    ],
  },
];

const BUG_TITLES = [
  'Lỗi hiển thị dữ liệu khi filter ngày tháng',
  'API trả về 500 khi payload rỗng',
  'Phân trang không hoạt động trên trang thứ 2+',
  'Lỗi timezone khi lưu timestamp',
  'Button submit bị double-click gây duplicate',
  'Form validation không bắt trường bắt buộc',
  'Lỗi permission — user thường thấy data admin',
  'Session hết hạn không redirect về login',
  'Export Excel bị lỗi ký tự đặc biệt',
  'Dropdown không load option khi search',
  'Lỗi CORS khi gọi API từ subdomain',
  'Memory leak trong component infinite scroll',
  'Sort cột bảng không hoạt động đúng',
  'Upload file lớn hơn 10MB bị timeout',
  'Notification badge không cập nhật realtime',
  'Dark mode chuyển đổi bị flickering',
  'Mobile responsive bị vỡ layout ở 375px',
  'Cache không invalidate sau khi update',
  'Widget thống kê hiển thị số âm không hợp lệ',
  'Dropdown menu bị ẩn dưới modal overlay',
  'Không thể xóa record có liên kết FK',
  'Lỗi load ảnh từ S3/MinIO presigned URL',
  'Token refresh loop gây vòng lặp vô tận',
  'Lỗi validation email không bắt ký tự đặc biệt',
  'Dashboard chart không render trên Safari',
  'Lỗi lưu form khi có trường optional null',
  'Search full-text không tìm thấy kết quả đúng',
  'Không thể tải xuống file PDF lớn trên mobile',
  'Tooltip bị crop khi ở cạnh màn hình',
  'Realtime sync bị delay > 5 giây',
];

const MODULES = [
  'Auth & Permissions',
  'Dashboard',
  'Task Management',
  'User Interface',
  'API Gateway',
  'Database',
  'File Upload',
  'Notifications',
  'Reports',
  'Integrations',
];

const MILESTONE_NAMES = [
  ['Tạm ứng ký hợp đồng', 'Hoàn thành phân tích & thiết kế', 'Nghiệm thu & bàn giao'],
  ['Kickoff & Analysis', 'Development & Testing', 'Go-live & Acceptance'],
  ['Giai đoạn 1: Phân tích', 'Giai đoạn 2: Phát triển', 'Giai đoạn 3: Nghiệm thu'],
];

async function main() {
  await db.connect();
  console.log('Đang seed 50 Projects + Tasks + Bugs + Milestones...\n');

  // ── Lấy dữ liệu tham chiếu ──────────────────────────────────────────────
  const { rows: pmUsers }    = await db.query(`SELECT id, name FROM users WHERE role = 'PM' LIMIT 20`);
  const { rows: allUsers }   = await db.query(`SELECT id, name FROM users WHERE role IN ('PM','MEMBER','ADMIN') LIMIT 50`);
  const { rows: employees }  = await db.query(`SELECT id, full_name, user_id FROM employees LIMIT 30`);
  const { rows: orgUnits }   = await db.query(`SELECT id, code FROM org_units LIMIT 10`);
  const { rows: adminRows }  = await db.query(`SELECT id FROM users WHERE email = 'admin@loop.vn' LIMIT 1`);

  if (!pmUsers.length) throw new Error('Không có PM users trong DB — hãy chạy seed.ts trước');
  if (!orgUnits.length) throw new Error('Không có org_units trong DB — hãy chạy seed.ts trước');

  const adminId = adminRows[0]?.id ?? allUsers[0].id;

  // ── Seed Customers ───────────────────────────────────────────────────────
  console.log('1. Tạo/kiểm tra customers...');
  const customerIds = {};
  for (const c of CUSTOMER_DATA) {
    const { rows: ex } = await db.query(`SELECT id FROM customers WHERE code = $1 LIMIT 1`, [c.code]);
    if (ex.length) {
      customerIds[c.code] = ex[0].id;
    } else {
      const cid = uid();
      await db.query(
        `INSERT INTO customers (id, code, name, industry, created_at, updated_at) VALUES ($1,$2,$3,$4,NOW(),NOW())`,
        [cid, c.code, c.name, c.industry]
      );
      customerIds[c.code] = cid;
    }
  }
  const allCustomerIds = Object.values(customerIds);
  console.log(`   ${allCustomerIds.length} customers sẵn sàng`);

  // ── Xóa dữ liệu project cũ ───────────────────────────────────────────────
  console.log('2. Xóa dữ liệu PRJ-* cũ (nếu có)...');
  const { rows: oldProjects } = await db.query(`SELECT id FROM projects WHERE code LIKE 'PRJ-%'`);
  if (oldProjects.length) {
    const oldPids = oldProjects.map(r => r.id);
    const pidList = oldPids.map((_, i) => `$${i + 1}`).join(',');
    const { rows: oldTasks } = await db.query(`SELECT id FROM tasks WHERE project_id IN (${pidList})`, oldPids);
    if (oldTasks.length) {
      const oldTids = oldTasks.map(r => r.id);
      const tidList = oldTids.map((_, i) => `$${i + 1}`).join(',');
      await db.query(`DELETE FROM time_logs WHERE task_id IN (${tidList})`, oldTids);
    }
    // Bugs
    const { rows: oldBugs } = await db.query(`SELECT id FROM bugs WHERE project_id IN (${pidList})`, oldPids);
    if (oldBugs.length) {
      const oldBids = oldBugs.map(r => r.id);
      const bidList = oldBids.map((_, i) => `$${i + 1}`).join(',');
      await db.query(`DELETE FROM bug_tasks WHERE bug_id IN (${bidList})`, oldBids);
      await db.query(`DELETE FROM bug_tags WHERE bug_id IN (${bidList})`, oldBids);
      await db.query(`DELETE FROM bug_comments WHERE bug_id IN (${bidList})`, oldBids);
    }
    await db.query(`DELETE FROM bugs WHERE project_id IN (${pidList})`, oldPids);
    await db.query(`DELETE FROM tasks WHERE project_id IN (${pidList})`, oldPids);
    await db.query(`DELETE FROM allocations WHERE project_id IN (${pidList})`, oldPids);
    await db.query(`DELETE FROM projects WHERE id IN (${pidList})`, oldPids);
    console.log(`   Đã xóa ${oldProjects.length} projects cũ`);
  }

  // Xóa milestones từ contracts cũ
  await db.query(`
    DELETE FROM contract_milestones WHERE contract_id IN (
      SELECT id FROM client_contracts WHERE contract_no LIKE 'SEED-PRJ-%'
    )
  `);
  await db.query(`DELETE FROM client_contracts WHERE contract_no LIKE 'SEED-PRJ-%'`);

  // ── Tạo Projects ─────────────────────────────────────────────────────────
  console.log('3. Tạo 50 projects...');
  const projectIds = [];
  const projectMeta = {}; // id -> { code, status, startDate, endDate, progress, customerId }
  let projectCounter = 1;

  const createProject = async (status, name, type, startDate, endDate, progress, budgetHours, budgetCost, customerId) => {
    const pid = uid();
    const code = `PRJ-${String(projectCounter).padStart(3, '0')}`;
    projectCounter++;
    const pmId = pick(pmUsers).id;
    const ouId = pick(orgUnits).id;

    await db.query(
      `INSERT INTO projects (
        id, name, code, type, status, pm_id, org_unit_id,
        start_date, end_date, progress,
        budget_hours, budget_cost, currency,
        customer_id, description, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'VND',$13,$14,NOW(),NOW())`,
      [
        pid, name, code, type, status, pmId, ouId,
        startDate, endDate, progress,
        budgetHours, budgetCost,
        customerId,
        `Dự án ${name}. Loại dự án: ${type}. Khởi động ${startDate}.`,
      ]
    );
    projectIds.push(pid);
    projectMeta[pid] = { code, status, startDate, endDate, progress, customerId };
    return pid;
  };

  // 5 PLANNING
  for (let i = 0; i < 5; i++) {
    await createProject(
      'PLANNING',
      PROJECT_NAMES.PLANNING[i],
      i % 2 === 0 ? 'OSDC' : 'PKG',
      daysFrom(rng(10, 60)),
      daysFrom(rng(180, 365)),
      0,
      rng(500, 2000),
      rng(300, 1500) * 1_000_000,
      pick(allCustomerIds)
    );
  }

  // 30 ACTIVE
  for (let i = 0; i < 30; i++) {
    await createProject(
      'ACTIVE',
      PROJECT_NAMES.ACTIVE[i],
      i % 3 === 0 ? 'PKG' : 'OSDC',
      daysAgo(rng(30, 180)),
      daysFrom(rng(30, 300)),
      rng(5, 85),
      rng(200, 3000),
      rng(200, 3000) * 1_000_000,
      pick(allCustomerIds)
    );
  }

  // 5 ON_HOLD
  for (let i = 0; i < 5; i++) {
    await createProject(
      'ON_HOLD',
      PROJECT_NAMES.ON_HOLD[i],
      i % 2 === 0 ? 'OSDC' : 'PKG',
      daysAgo(rng(60, 200)),
      daysFrom(rng(60, 200)),
      rng(10, 50),
      rng(300, 1000),
      rng(200, 800) * 1_000_000,
      pick(allCustomerIds)
    );
  }

  // 10 CLOSED
  for (let i = 0; i < 10; i++) {
    await createProject(
      'CLOSED',
      PROJECT_NAMES.CLOSED[i],
      i % 2 === 0 ? 'OSDC' : 'PKG',
      daysAgo(rng(180, 540)),
      daysAgo(rng(10, 90)),
      100,
      rng(500, 2000),
      rng(300, 2000) * 1_000_000,
      pick(allCustomerIds)
    );
  }

  console.log(`   ${projectIds.length} projects đã tạo`);

  // ── Tạo Tasks cho ACTIVE projects (index 5..34) ──────────────────────────
  console.log('4. Tạo tasks + bugs + milestones cho 30 ACTIVE projects...');

  const activeProjectIds = projectIds.slice(5, 35);
  let totalTasks = 0;
  let totalBugs = 0;
  let totalMilestones = 0;
  let totalTimeLogs = 0;
  let totalAllocs = 0;

  for (const projectId of activeProjectIds) {
    const meta = projectMeta[projectId];
    const projProgress = meta.progress;
    const projStartDate = meta.startDate;
    const projEndDate = meta.endDate;

    // 4-6 epics
    const numEpics = rng(4, 6);
    const epics = pickN(EPIC_TEMPLATES, numEpics);
    let epicPos = 0;

    for (const epic of epics) {
      const epicId = uid();
      const epicProg = projProgress > 0 ? rng(Math.max(0, projProgress - 25), Math.min(100, projProgress + 25)) : 0;
      const epicStatus = epicProg === 100 ? 'DONE' : epicProg > 0 ? 'IN_PROGRESS' : 'TODO';
      const epicEstHours = rng(40, 120);
      const epicActHours = Math.round(epicEstHours * (epicProg / 100) * (0.8 + Math.random() * 0.4));

      await db.query(
        `INSERT INTO tasks (id, project_id, parent_id, level, title, status, progress, position,
          estimate_hours, actual_hours, start_date, due_date, created_at, updated_at)
         VALUES ($1,$2,NULL,1,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
        [epicId, projectId, epic.title, epicStatus, epicProg, epicPos,
         epicEstHours, epicActHours, projStartDate, projEndDate]
      );
      epicPos++;
      totalTasks++;

      // 3-5 stories per epic
      const numStories = rng(3, 5);
      const stories = pickN(epic.subtasks, numStories);
      let storyPos = 0;

      for (const storyTitle of stories) {
        const storyId = uid();
        const storyProg = epicProg > 0 ? rng(Math.max(0, epicProg - 20), Math.min(100, epicProg + 20)) : 0;
        const storyStatus = storyProg === 100 ? 'DONE' : storyProg > 0 ? 'IN_PROGRESS' : 'TODO';
        const storyEstHours = rng(8, 40);
        const storyActHours = Math.round(storyEstHours * (storyProg / 100) * (0.8 + Math.random() * 0.4));
        const assigneeId = employees.length > 0 ? pick(employees).id : null;

        await db.query(
          `INSERT INTO tasks (id, project_id, parent_id, level, title, status, progress, position,
            assignee_id, estimate_hours, actual_hours, start_date, due_date, created_at, updated_at)
           VALUES ($1,$2,$3,2,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())`,
          [storyId, projectId, epicId, storyTitle, storyStatus, storyProg, storyPos,
           assigneeId, storyEstHours, storyActHours, projStartDate, projEndDate]
        );
        storyPos++;
        totalTasks++;

        // 1-3 leaf tasks per story
        const numLeafs = rng(1, 3);
        for (let l = 0; l < numLeafs; l++) {
          const leafId = uid();
          const leafProg = rng(0, 100);
          const leafStatus = leafProg === 100 ? 'DONE' : leafProg > 0 ? 'IN_PROGRESS' : 'TODO';
          const leafAssigneeId = employees.length > 0 ? pick(employees).id : null;
          const leafEstHours = rng(2, 16);
          const leafActHours = Math.round(leafEstHours * (leafProg / 100) * (0.7 + Math.random() * 0.5));

          await db.query(
            `INSERT INTO tasks (id, project_id, parent_id, level, title, status, progress, position,
              assignee_id, estimate_hours, actual_hours, start_date, due_date, created_at, updated_at)
             VALUES ($1,$2,$3,3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())`,
            [leafId, projectId, storyId,
             `${storyTitle.slice(0, 40)} — subtask ${l + 1}`,
             leafStatus, leafProg, l,
             leafAssigneeId, leafEstHours, leafActHours, projStartDate, projEndDate]
          );
          totalTasks++;

          // TimeLogs: 2-8 logs cho 3 tháng qua
          const numLogs = rng(2, 8);
          for (let tl = 0; tl < numLogs; tl++) {
            const logUser = pick(allUsers);
            const logDate = daysAgo(rng(0, 90));
            try {
              await db.query(
                `INSERT INTO time_logs (id, task_id, user_id, log_date, hours, note, created_at)
                 VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
                [uid(), leafId, logUser.id, logDate,
                 (rng(2, 16) * 0.5).toFixed(1),
                 `Ghi nhận công việc ${logDate}`]
              );
              totalTimeLogs++;
            } catch (_) {
              // Bỏ qua duplicate log_date constraints
            }
          }
        }
      }
    }

    // ── Bugs (5-15 per active project) ──────────────────────────────────────
    const numBugs = rng(5, 15);
    const bugStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    const bugSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

    for (let b = 0; b < numBugs; b++) {
      const bugStatus = pick(bugStatuses);
      const severity = pick(bugSeverities);
      const reporterId = pick(allUsers).id;
      const assigneeId = Math.random() > 0.3 ? pick(allUsers).id : null;
      const daysOffset = rng(0, 60);
      const resolvedAt = (bugStatus === 'RESOLVED' || bugStatus === 'CLOSED')
        ? `NOW() - '${rng(1, daysOffset)} days'::interval` : 'NULL';
      const closedAt = bugStatus === 'CLOSED'
        ? `NOW() - '${rng(0, 5)} days'::interval` : 'NULL';

      await db.query(
        `INSERT INTO bugs (
          id, project_id, reporter_id, assignee_id,
          title, description, severity, status,
          item_type, is_cr, affected_module,
          due_date, estimated_hours,
          created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'BUG',false,$9,$10,$11,
          NOW() - ($12 || ' days')::interval,
          NOW() - ($13 || ' days')::interval + interval '2 hours'
        )`,
        [
          uid(), projectId, reporterId, assigneeId,
          pick(BUG_TITLES),
          `Chi tiết lỗi: ${pick(MODULES)} module bị ảnh hưởng. Severity: ${severity}.`,
          severity, bugStatus,
          pick(MODULES),
          daysFrom(rng(5, 30)),
          rng(2, 16),
          daysOffset,
          Math.max(0, daysOffset - 1),
        ]
      );
      totalBugs++;
    }

    // ── Allocations (3-5 members) ────────────────────────────────────────────
    const numAllocs = rng(3, 5);
    const allocEmps = pickN(employees.length > 0 ? employees : allUsers, numAllocs);
    const allocRoles = ['PM', 'TECH_LEAD', 'DEVELOPER', 'QA_ENGINEER', 'BUSINESS_ANALYST'];

    for (let a = 0; a < allocEmps.length; a++) {
      const emp = allocEmps[a];
      const empId = emp.id; // employee.id (not user id)
      try {
        await db.query(
          `INSERT INTO allocations (
            id, project_id, employee_id, role, level,
            allocation_pct, rate_per_day,
            start_date, end_date, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,'MID',$5,$6,$7,$8,NOW(),NOW())
          ON CONFLICT (project_id, employee_id, start_date) DO NOTHING`,
          [
            uid(), projectId, empId,
            allocRoles[a % allocRoles.length],
            rng(50, 100),
            rng(500, 1500) * 1000,
            projStartDate, projEndDate,
          ]
        );
        totalAllocs++;
      } catch (_) {
        // Bỏ qua conflict
      }
    }

    // ── ClientContract + ContractMilestones ──────────────────────────────────
    if (meta.customerId) {
      const contractValue = rng(300, 2000) * 1_000_000;
      const contractId = uid();
      const contractNo = `SEED-${meta.code}`;
      const numMilestones = rng(2, 3);
      const msTemplate = pick(MILESTONE_NAMES);

      try {
        await db.query(
          `INSERT INTO client_contracts (
            id, contract_no, title, customer_id,
            type, value, currency,
            start_date, end_date, status,
            created_at, updated_at
          ) VALUES ($1,$2,$3,$4,'SERVICE',$5,'VND',$6,$7,'ACTIVE',NOW(),NOW())`,
          [
            contractId, contractNo,
            `Hợp đồng dịch vụ — ${PROJECT_NAMES.ACTIVE[activeProjectIds.indexOf(projectId)] || meta.code}`,
            meta.customerId, contractValue,
            projStartDate, projEndDate,
          ]
        );

        // Milestones
        const pcts = numMilestones === 2 ? [0.4, 0.6] : [0.3, 0.4, 0.3];
        const msStatusChoices = ['PENDING', 'COMPLETED', 'INVOICED', 'PAID'];
        for (let m = 0; m < numMilestones; m++) {
          const msAmount = Math.round(contractValue * pcts[m] / 1_000_000) * 1_000_000;
          const offsetDays = Math.round((m + 1) * 90 / (numMilestones + 1));
          const msDueDate = daysFromDate(projStartDate, offsetDays);
          // Milestone đã qua → có thể PAID/COMPLETED, chưa qua → PENDING
          const isPast = new Date(msDueDate) < new Date();
          const msStatus = isPast
            ? pick(['PAID', 'COMPLETED', 'INVOICED'])
            : 'PENDING';

          await db.query(
            `INSERT INTO contract_milestones (id, contract_id, name, due_date, amount, status, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
            [uid(), contractId, msTemplate[m] || `Milestone ${m + 1}`, msDueDate, msAmount, msStatus]
          );
          totalMilestones++;
        }
      } catch (e) {
        console.log(`  Bỏ qua contract ${contractNo}: ${e.message.slice(0, 80)}`);
      }
    }
  }

  // ── Tasks đơn giản cho CLOSED projects (index 40-49) ────────────────────
  console.log('5. Tạo tasks + bugs cho 10 CLOSED projects...');

  const closedProjectIds = projectIds.slice(40, 50);
  let closedTaskCount = 0;
  let closedBugCount = 0;

  for (const projectId of closedProjectIds) {
    const meta = projectMeta[projectId];
    const numEpics = rng(2, 4);
    const epics = pickN(EPIC_TEMPLATES, numEpics);
    let pos = 0;

    for (const epic of epics) {
      const epicId = uid();
      await db.query(
        `INSERT INTO tasks (id, project_id, parent_id, level, title, status, progress, position,
          estimate_hours, actual_hours, created_at, updated_at)
         VALUES ($1,$2,NULL,1,$3,'DONE',100,$4,$5,$6,NOW(),NOW())`,
        [epicId, projectId, epic.title, pos, rng(40, 100), rng(40, 120)]
      );
      pos++;
      closedTaskCount++;

      const numStories = rng(2, 4);
      const stories = pickN(epic.subtasks, numStories);
      let sp = 0;
      for (const storyTitle of stories) {
        const storyId = uid();
        const estH = rng(8, 30);
        await db.query(
          `INSERT INTO tasks (id, project_id, parent_id, level, title, status, progress, position,
            estimate_hours, actual_hours, created_at, updated_at)
           VALUES ($1,$2,$3,2,$4,'DONE',100,$5,$6,$7,NOW(),NOW())`,
          [storyId, projectId, epicId, storyTitle, sp, estH, estH + rng(-5, 10)]
        );
        sp++;
        closedTaskCount++;

        // Leaf tasks
        const numLeafs = rng(1, 2);
        for (let l = 0; l < numLeafs; l++) {
          const leafEstH = rng(2, 12);
          await db.query(
            `INSERT INTO tasks (id, project_id, parent_id, level, title, status, progress, position,
              estimate_hours, actual_hours, created_at, updated_at)
             VALUES ($1,$2,$3,3,$4,'DONE',100,$5,$6,$7,NOW(),NOW())`,
            [uid(), projectId, storyId,
             `${storyTitle.slice(0, 40)} — subtask ${l + 1}`,
             l, leafEstH, leafEstH + rng(-2, 5)]
          );
          closedTaskCount++;
        }
      }
    }

    // Bugs đã CLOSED
    const numBugs = rng(3, 8);
    for (let b = 0; b < numBugs; b++) {
      const reporterId = pick(allUsers).id;
      const daysOffset = rng(30, 300);
      await db.query(
        `INSERT INTO bugs (
          id, project_id, reporter_id,
          title, severity, status, item_type, is_cr,
          created_at, updated_at, closed_at
        ) VALUES ($1,$2,$3,$4,$5,'CLOSED','BUG',false,
          NOW() - ($6 || ' days')::interval,
          NOW() - ($6 || ' days')::interval + interval '3 hours',
          NOW() - ($7 || ' days')::interval
        )`,
        [
          uid(), projectId, reporterId,
          pick(BUG_TITLES),
          pick(['HIGH', 'MEDIUM', 'LOW']),
          daysOffset, Math.max(1, daysOffset - rng(5, 20)),
        ]
      );
      closedBugCount++;
    }
  }

  totalTasks += closedTaskCount;
  totalBugs += closedBugCount;

  // ── Tổng kết ─────────────────────────────────────────────────────────────
  const { rows: [pCount] }   = await db.query(`SELECT COUNT(*) FROM projects WHERE code LIKE 'PRJ-%'`);
  const { rows: [tCount] }   = await db.query(`SELECT COUNT(*) FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE code LIKE 'PRJ-%')`);
  const { rows: [bCount] }   = await db.query(`SELECT COUNT(*) FROM bugs WHERE project_id IN (SELECT id FROM projects WHERE code LIKE 'PRJ-%')`);
  const { rows: [msCount] }  = await db.query(`SELECT COUNT(*) FROM contract_milestones WHERE contract_id IN (SELECT id FROM client_contracts WHERE contract_no LIKE 'SEED-PRJ-%')`);
  const { rows: [allocCnt] } = await db.query(`SELECT COUNT(*) FROM allocations WHERE project_id IN (SELECT id FROM projects WHERE code LIKE 'PRJ-%')`);
  const { rows: [tlCount] }  = await db.query(`SELECT COUNT(*) FROM time_logs WHERE task_id IN (SELECT id FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE code LIKE 'PRJ-%'))`);

  console.log('\n=== KẾT QUẢ SEED PROJECTS ===');
  console.log(`Projects tổng:        ${pCount.count}`);
  console.log(`  PLANNING:           5`);
  console.log(`  ACTIVE:             30`);
  console.log(`  ON_HOLD:            5`);
  console.log(`  CLOSED:             10`);
  console.log(`Tasks (all levels):   ${tCount.count}`);
  console.log(`Bugs:                 ${bCount.count}`);
  console.log(`ContractMilestones:   ${msCount.count}`);
  console.log(`Allocations:          ${allocCnt.count}`);
  console.log(`TimeLogs:             ${tlCount.count}`);
  console.log('=============================\n');

  await db.end();
}

main().catch(e => {
  console.error('Lỗi seed:', e);
  process.exit(1);
});
