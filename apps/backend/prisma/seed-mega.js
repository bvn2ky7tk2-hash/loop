'use strict';
/**
 * seed-mega.js — 100 dự án · 1000 nhân sự · 10 000 task
 * Tập trung tháng 5-7/2026, max 8h/ngày/người
 *
 * Chạy: node prisma/seed-mega.js
 */

const { Client } = require('pg');
const { randomUUID: uid } = require('crypto');
const bcrypt = require('bcrypt');
const { seedPermissions, seedPermissionDemo } = require('./seed-permissions');

const db = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'loop',
  password: process.env.DB_PASS || 'loop_password',
  database: process.env.DB_NAME || 'loop_db',
});

// ─── Tiện ích ─────────────────────────────────────────────────────────────────

const pick  = a => a[Math.floor(Math.random() * a.length)];
const rand  = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const rnd   = () => Math.random();
const shuffle = a => [...a].sort(() => rnd() - 0.5);

function fmtDate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toISOString().split('T')[0];
}

function addWorkDays(base, n) {
  if (n === 0) return new Date(base);
  const d = new Date(base);
  let count = 0;
  while (count < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) count++;
  }
  return d;
}

function randDateBetween(from, to) {
  const s = new Date(from).getTime();
  const e = new Date(to).getTime();
  return new Date(s + Math.random() * (e - s));
}

// Bulk INSERT helper — chia batch 200 row, tránh vượt giới hạn tham số PG
async function bulkInsert(table, cols, rows) {
  if (!rows.length) return;
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const values = slice.map(
      (r, ri) => `(${cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(',')})`
    ).join(',');
    const params = slice.flatMap(r => cols.map(c => r[c] ?? null));
    const colNames = cols.map(c => `"${c}"`).join(',');
    await db.query(`INSERT INTO "${table}" (${colNames}) VALUES ${values}`, params);
  }
}

// ─── Dữ liệu tên tiếng Việt ───────────────────────────────────────────────────

const HO  = ['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Phan','Vũ','Đặng','Bùi',
              'Đỗ','Hồ','Ngô','Dương','Lý','Đinh','Tô','Trịnh','Cao','Lưu','Hà','Vương'];
const DEM_M = ['Văn','Hữu','Minh','Đức','Quốc','Công','Trung','Thanh','Anh','Quang',
               'Thành','Xuân','Tiến','Phúc','Bảo','Gia','Khắc','Ngọc','Chí','Trọng'];
const DEM_F = ['Thị','Ngọc','Thúy','Thu','Mai','Hồng','Kim','Lan','Phương','Diễm',
               'Khánh','Tuyết','Ánh','Thanh','Mỹ','Bích','Yến','Lệ','Tú','Diệu'];
const TEN_M = ['An','Bình','Cường','Dũng','Đạt','Giang','Hải','Hùng','Khoa','Lâm',
               'Long','Minh','Nam','Phong','Quân','Sơn','Tài','Thắng','Toàn','Tuấn',
               'Tùng','Vinh','Huy','Khôi','Lực','Mạnh','Nghĩa','Phát','Thái','Thiện',
               'Trọng','Tú','Việt','Duy','Hiếu','Linh','Nhân','Trí','Kiên','Quý'];
const TEN_F = ['Anh','Chi','Giang','Hà','Hương','Lan','Linh','Mai','Nga','Ngân',
               'Nhung','Phương','Quỳnh','Tâm','Thảo','Thu','Trang','Vy','Xuân','Yến',
               'Bảo','Diễm','Hằng','Khánh','Liên','Nhi','Oanh','Thư','Trinh','Châu'];

function genFullName(idx) {
  const female = idx % 3 === 0;
  const h = HO[idx % HO.length];
  if (female) return `${h} ${DEM_F[idx % DEM_F.length]} ${TEN_F[Math.floor(idx / DEM_F.length) % TEN_F.length]}`;
  return `${h} ${DEM_M[idx % DEM_M.length]} ${TEN_M[Math.floor(idx / DEM_M.length) % TEN_M.length]}`;
}

// ─── Org units ────────────────────────────────────────────────────────────────

const ORG_DEF = [
  { code: 'ROOT',   name: 'VMO Technology',          parent: null,     level: 0 },
  { code: 'IT',     name: 'IT Division',              parent: 'ROOT',   level: 1 },
  { code: 'BIZ',    name: 'Business Division',        parent: 'ROOT',   level: 1 },
  { code: 'DESIGN', name: 'Design Division',          parent: 'ROOT',   level: 1 },
  { code: 'DATA',   name: 'Data Division',            parent: 'ROOT',   level: 1 },
  { code: 'INFRA',  name: 'Infrastructure Division',  parent: 'ROOT',   level: 1 },
  { code: 'BE',     name: 'Backend Team',             parent: 'IT',     level: 2 },
  { code: 'FE',     name: 'Frontend Team',            parent: 'IT',     level: 2 },
  { code: 'MOBILE', name: 'Mobile Team',              parent: 'IT',     level: 2 },
  { code: 'QA',     name: 'QA & Testing',             parent: 'IT',     level: 2 },
  { code: 'JAVA',   name: 'Java Team',                parent: 'IT',     level: 2 },
  { code: 'PM',     name: 'Project Management',       parent: 'BIZ',    level: 2 },
  { code: 'BA',     name: 'Business Analysis',        parent: 'BIZ',    level: 2 },
  { code: 'PROD',   name: 'Product Management',       parent: 'BIZ',    level: 2 },
  { code: 'UX',     name: 'UX Team',                  parent: 'DESIGN', level: 2 },
  { code: 'UI',     name: 'UI Team',                  parent: 'DESIGN', level: 2 },
  { code: 'DE',     name: 'Data Engineering',         parent: 'DATA',   level: 2 },
  { code: 'DS',     name: 'Data Science',             parent: 'DATA',   level: 2 },
  { code: 'DEVOPS', name: 'DevOps Team',              parent: 'INFRA',  level: 2 },
  { code: 'SEC',    name: 'Security Team',            parent: 'INFRA',  level: 2 },
];

// Leaf org units nhân viên thường dùng (không kể ROOT và division level 1)
const LEAF_CODES = ['BE','FE','MOBILE','QA','JAVA','BA','PROD','UX','UI','DE','DS','DEVOPS','SEC'];

// ─── Tech stacks ──────────────────────────────────────────────────────────────

const STACKS = [
  ['Java','Spring Boot','PostgreSQL'],
  ['Node.js','NestJS','TypeScript'],
  ['Python','FastAPI','SQLAlchemy'],
  ['Go','Gin','MySQL'],
  ['React','TypeScript','Redux'],
  ['Vue.js','Nuxt.js','TypeScript'],
  ['React Native','TypeScript','Expo'],
  ['Flutter','Dart','Firebase'],
  ['DevOps','Docker','Kubernetes','Terraform'],
  ['Python','TensorFlow','scikit-learn'],
  ['.NET','C#','SQL Server'],
  ['Angular','TypeScript','RxJS'],
  ['Spark','Kafka','Airflow'],
  ['AWS','Lambda','DynamoDB'],
];

const LEVELS = ['JUNIOR','JUNIOR','JUNIOR','MID','MID','SENIOR','SENIOR','EXPERT'];

// ─── 100 dự án ───────────────────────────────────────────────────────────────

const PROJECT_DEFS = [
  // OSDC - Ngân hàng (7)
  { name:'Core Banking System',          customer:'Vietcombank',      type:'OSDC' },
  { name:'Mobile Banking App',           customer:'Techcombank',      type:'OSDC' },
  { name:'Internet Banking Portal',      customer:'MB Bank',          type:'OSDC' },
  { name:'Digital Wallet Platform',      customer:'BIDV',             type:'OSDC' },
  { name:'Risk Management System',       customer:'VPBank',           type:'OSDC' },
  { name:'Loan Origination System',      customer:'Agribank',         type:'OSDC' },
  { name:'Trade Finance Platform',       customer:'VietinBank',       type:'OSDC' },
  // OSDC - Enterprise (6)
  { name:'ERP Enterprise System',        customer:'VinGroup',         type:'OSDC' },
  { name:'Supply Chain Management',      customer:'Masan Group',      type:'OSDC' },
  { name:'Fleet Management System',      customer:'VinFast',          type:'OSDC' },
  { name:'HR & Payroll Platform',        customer:'TH True Milk',     type:'OSDC' },
  { name:'Warehouse Management',         customer:'Vinmart',          type:'OSDC' },
  { name:'Retail Analytics Platform',    customer:'Saigon Co.op',     type:'OSDC' },
  // OSDC - Viễn thông (4)
  { name:'Telecom Billing System',       customer:'Viettel',          type:'OSDC' },
  { name:'Customer Self-Service Portal', customer:'VNPT',             type:'OSDC' },
  { name:'CRM Platform',                 customer:'MobiFone',         type:'OSDC' },
  { name:'OSS/BSS Integration',          customer:'Vietnamobile',     type:'OSDC' },
  // OSDC - Chính phủ (6)
  { name:'Tax Administration System',    customer:'Bộ Tài Chính',     type:'OSDC' },
  { name:'Electronic Health Record',     customer:'Bộ Y Tế',          type:'OSDC' },
  { name:'National Education Portal',    customer:'Bộ GD&ĐT',         type:'OSDC' },
  { name:'E-Government Services',        customer:'UBND TP.HCM',      type:'OSDC' },
  { name:'Smart City Platform',          customer:'UBND Hà Nội',      type:'OSDC' },
  { name:'Land Registry System',         customer:'Bộ TN&MT',         type:'OSDC' },
  // OSDC - Y tế (4)
  { name:'Hospital Information System',  customer:'Vinmec',           type:'OSDC' },
  { name:'Laboratory Information System',customer:'Medlatec',         type:'OSDC' },
  { name:'Patient Portal & Telemedicine',customer:'FV Hospital',      type:'OSDC' },
  { name:'Pharmacy Management System',   customer:'Long Châu',        type:'OSDC' },
  // OSDC - Bảo hiểm (3)
  { name:'Insurance Policy Management',  customer:'Bảo Việt',         type:'OSDC' },
  { name:'Claims Processing System',     customer:'PVI Insurance',    type:'OSDC' },
  { name:'Insurance Agent Portal',       customer:'PTI Insurance',    type:'OSDC' },
  // OSDC - Bán lẻ (5)
  { name:'E-commerce Platform',          customer:'Tiki',             type:'OSDC' },
  { name:'Marketplace Infrastructure',   customer:'Shopee VN',        type:'OSDC' },
  { name:'POS & Retail System',          customer:'Lotte Mart',       type:'OSDC' },
  { name:'Loyalty Program Platform',     customer:'Aeon Mall',        type:'OSDC' },
  { name:'Inventory & ERP System',       customer:'BigC Vietnam',     type:'OSDC' },
  // OSDC - Fintech/Giáo dục (5)
  { name:'Online Learning Platform',     customer:'Topica Edtech',    type:'OSDC' },
  { name:'Payment Gateway Integration',  customer:'VNPay',            type:'OSDC' },
  { name:'P2P Lending Platform',         customer:'Timo',             type:'OSDC' },
  { name:'Stock Trading Application',    customer:'VPS Securities',   type:'OSDC' },
  { name:'Fund Management System',       customer:'Dragon Capital',   type:'OSDC' },
  // OSDC - Logistics (4)
  { name:'Transportation Management',    customer:'GHN Express',      type:'OSDC' },
  { name:'Last-Mile Delivery Tracking',  customer:'GHTK',             type:'OSDC' },
  { name:'Warehouse & Logistics System', customer:'ALS Logistics',    type:'OSDC' },
  { name:'Port Management System',       customer:'Cảng Sài Gòn',     type:'OSDC' },
  // OSDC - Media/BĐS/Sản xuất (6)
  { name:'Real Estate Portal',           customer:'Batdongsan.vn',    type:'OSDC' },
  { name:'Building Management System',   customer:'Vinhomes',         type:'OSDC' },
  { name:'Video Streaming Platform',     customer:'VTV Digital',      type:'OSDC' },
  { name:'News CMS Platform',            customer:'VnExpress',        type:'OSDC' },
  { name:'MES Manufacturing System',     customer:'Hòa Phát Steel',   type:'OSDC' },
  { name:'Quality Management System',    customer:'Samsung VN',       type:'OSDC' },
  // PKG products (50)
  { name:'Loop HR - Quản lý nhân sự',         customer:null, type:'PKG' },
  { name:'Loop Finance - Tài chính kế toán',   customer:null, type:'PKG' },
  { name:'Loop Analytics - Phân tích BI',      customer:null, type:'PKG' },
  { name:'Loop CRM - Quản lý khách hàng',      customer:null, type:'PKG' },
  { name:'Loop ERP - Hoạch định nguồn lực',    customer:null, type:'PKG' },
  { name:'Loop POS - Bán hàng tại quầy',       customer:null, type:'PKG' },
  { name:'Loop LMS - Đào tạo trực tuyến',      customer:null, type:'PKG' },
  { name:'Loop Asset - Quản lý tài sản',        customer:null, type:'PKG' },
  { name:'Loop Workflow - Tự động hóa',         customer:null, type:'PKG' },
  { name:'Loop Chat - Giao tiếp nội bộ',        customer:null, type:'PKG' },
  { name:'Loop Task - Quản lý công việc',       customer:null, type:'PKG' },
  { name:'Loop Docs - Quản lý tài liệu',        customer:null, type:'PKG' },
  { name:'Loop BI - Business Intelligence',     customer:null, type:'PKG' },
  { name:'Loop IAM - Quản lý danh tính',        customer:null, type:'PKG' },
  { name:'Loop API Gateway Platform',           customer:null, type:'PKG' },
  { name:'Loop Data Pipeline',                  customer:null, type:'PKG' },
  { name:'Loop MLOps Platform',                 customer:null, type:'PKG' },
  { name:'Loop DevOps CI/CD',                   customer:null, type:'PKG' },
  { name:'Loop Monitor - Giám sát hệ thống',   customer:null, type:'PKG' },
  { name:'Loop Security - Bảo mật',            customer:null, type:'PKG' },
  { name:'Loop Payroll - Tính lương',           customer:null, type:'PKG' },
  { name:'Loop Recruit - Tuyển dụng',           customer:null, type:'PKG' },
  { name:'Loop Leave - Quản lý nghỉ phép',      customer:null, type:'PKG' },
  { name:'Loop Expense - Quản lý chi phí',      customer:null, type:'PKG' },
  { name:'Loop Contract - Quản lý hợp đồng',    customer:null, type:'PKG' },
  { name:'Loop Procurement - Mua sắm',          customer:null, type:'PKG' },
  { name:'Loop Inventory - Quản lý kho',        customer:null, type:'PKG' },
  { name:'Loop Fleet - Quản lý xe',             customer:null, type:'PKG' },
  { name:'Loop Maintenance - Bảo trì',          customer:null, type:'PKG' },
  { name:'Loop Healthcare Platform',            customer:null, type:'PKG' },
  { name:'Loop Banking - Ngân hàng số',         customer:null, type:'PKG' },
  { name:'Loop Insurance Platform',             customer:null, type:'PKG' },
  { name:'Loop Retail Management',              customer:null, type:'PKG' },
  { name:'Loop Commerce - Thương mại điện tử',  customer:null, type:'PKG' },
  { name:'Loop School - Quản lý trường học',    customer:null, type:'PKG' },
  { name:'Loop Hotel Management',               customer:null, type:'PKG' },
  { name:'Loop Restaurant F&B',                 customer:null, type:'PKG' },
  { name:'Loop Clinic Management',              customer:null, type:'PKG' },
  { name:'Loop Pharmacy System',                customer:null, type:'PKG' },
  { name:'Loop Legal Management',               customer:null, type:'PKG' },
  { name:'Loop Tax Compliance',                 customer:null, type:'PKG' },
  { name:'Loop Audit Management',               customer:null, type:'PKG' },
  { name:'Loop Risk Management',                customer:null, type:'PKG' },
  { name:'Loop Compliance Platform',            customer:null, type:'PKG' },
  { name:'Loop Report Builder',                 customer:null, type:'PKG' },
  { name:'Loop Dashboard Studio',               customer:null, type:'PKG' },
  { name:'Loop Notification Center',            customer:null, type:'PKG' },
  { name:'Loop Mobile SDK',                     customer:null, type:'PKG' },
  { name:'Loop Developer Tools',                customer:null, type:'PKG' },
  { name:'Loop Core Platform',                  customer:null, type:'PKG' },
]; // 50 OSDC + 50 PKG = 100

// ─── Template task theo 4 phase × 4 module × 5 task = 80 leaf task/dự án ────
// Tổng/dự án = 4 L1 + 16 L2 + 80 L3 = 100 task ✓

const PHASES = [
  {
    name: 'Phân tích & Khởi động',
    startOff: 0, endOff: 14,   // offset ngày làm việc từ project.start_date
    estOptions: [4, 4, 8, 8],
    modules: [
      { name: 'Thu thập yêu cầu', tasks: [
        'Phỏng vấn stakeholder chính',
        'Workshop yêu cầu nghiệp vụ',
        'Tổng hợp và viết tài liệu BRD',
        'Review và xác nhận yêu cầu',
        'Cập nhật product backlog',
      ]},
      { name: 'Phân tích nghiệp vụ', tasks: [
        'Vẽ sơ đồ quy trình nghiệp vụ (BPM)',
        'Phân tích use case chi tiết',
        'Xác định business rules',
        'Mapping data fields',
        'Viết tài liệu BRS',
      ]},
      { name: 'Phân tích kỹ thuật', tasks: [
        'Đánh giá kiến trúc hệ thống hiện tại',
        'Nghiên cứu công nghệ phù hợp',
        'Viết tài liệu SAD sơ bộ',
        'Review kỹ thuật với team lead',
        'Đề xuất tech stack và tooling',
      ]},
      { name: 'Lập kế hoạch dự án', tasks: [
        'Lập WBS chi tiết',
        'Ước tính effort cho từng hạng mục',
        'Phân bổ nguồn lực theo tuần',
        'Xây dựng lịch trình Gantt',
        'Tổ chức kick-off meeting với client',
      ]},
    ],
  },
  {
    name: 'Thiết kế hệ thống',
    startOff: 10, endOff: 30,
    estOptions: [8, 8, 16, 16],
    modules: [
      { name: 'Thiết kế kiến trúc', tasks: [
        'Thiết kế microservices architecture',
        'Vẽ sơ đồ component và sequence diagram',
        'Thiết kế message queue và event bus',
        'Thiết kế caching và CDN strategy',
        'Hoàn thiện tài liệu kiến trúc SAD',
      ]},
      { name: 'Thiết kế database', tasks: [
        'Thiết kế ERD chi tiết',
        'Tạo database migration scripts',
        'Viết DB coding conventions',
        'Review database design với DBA',
        'Tối ưu hóa indexes và partitioning',
      ]},
      { name: 'Thiết kế UI/UX', tasks: [
        'Wireframe các màn hình chính',
        'Tạo prototype tương tác (Figma)',
        'Xây dựng design system & component library',
        'Review UX flow với product owner',
        'Hoàn thiện style guide và design tokens',
      ]},
      { name: 'Thiết kế API', tasks: [
        'Định nghĩa REST API endpoints',
        'Viết OpenAPI 3.0 specification',
        'Thiết kế authentication & authorization',
        'Định nghĩa error codes và response format',
        'Review API design với frontend team',
      ]},
    ],
  },
  {
    name: 'Phát triển & Tích hợp',
    startOff: 20, endOff: 70,
    estOptions: [8, 16, 24, 32],
    modules: [
      { name: 'Backend Development', tasks: [
        'Setup project structure và CI/CD cơ bản',
        'Implement authentication & authorization module',
        'Develop core business logic modules',
        'Viết unit tests và integration tests',
        'Code review, refactoring và tối ưu performance',
      ]},
      { name: 'Frontend Development', tasks: [
        'Setup frontend project và build system',
        'Implement UI components theo design system',
        'State management và routing',
        'Responsive design và cross-browser testing',
        'Frontend unit tests và E2E tests',
      ]},
      { name: 'API & Integration', tasks: [
        'Tích hợp third-party APIs và SDKs',
        'Implement webhooks và event handlers',
        'Message queue và async processing',
        'Data sync và migration mechanisms',
        'Integration testing toàn hệ thống',
      ]},
      { name: 'DevOps & Hạ tầng', tasks: [
        'Setup CI/CD pipeline hoàn chỉnh',
        'Cấu hình Docker containers và registry',
        'Setup Kubernetes cluster và namespaces',
        'Cấu hình monitoring, alerting và logging',
        'Performance tuning và load testing',
      ]},
    ],
  },
  {
    name: 'Kiểm thử & Triển khai',
    startOff: 55, endOff: 90,
    estOptions: [4, 8, 8, 16],
    modules: [
      { name: 'Kiểm thử chức năng', tasks: [
        'Viết test cases theo BRD',
        'Kiểm thử manual theo test plan',
        'Automation testing với Selenium/Cypress',
        'Regression testing sau mỗi release',
        'Bug fixing và retest',
      ]},
      { name: 'Kiểm thử phi chức năng', tasks: [
        'Load & stress testing với JMeter',
        'Security penetration testing',
        'Performance profiling và optimization',
        'Compatibility testing trên các trình duyệt',
        'Vulnerability scanning và security audit',
      ]},
      { name: 'UAT & Nghiệm thu', tasks: [
        'Chuẩn bị UAT environment',
        'Hướng dẫn user thực hiện UAT',
        'Thu thập và xử lý feedback UAT',
        'Fix bugs UAT và retest',
        'Ký biên bản nghiệm thu chính thức',
      ]},
      { name: 'Triển khai & Vận hành', tasks: [
        'Deploy lên staging environment',
        'Go-live preparation checklist',
        'Production deployment và cutover',
        'Smoke testing sau production deploy',
        'Bàn giao tài liệu vận hành và training',
      ]},
    ],
  },
];
// 4 phase × (4 module × 5 task = 20) = 80 L3 leaf tasks/dự án ✓

// ─── Trạng thái task theo ngày và trạng thái dự án ────────────────────────────

const TODAY = new Date('2026-05-26');

function leafStatus(startDate, dueDate, projStatus) {
  if (projStatus === 'PLANNING')  return 'TODO';
  if (projStatus === 'CLOSED') {
    return rnd() < 0.88 ? 'DONE' : (rnd() < 0.5 ? 'PENDING_APPROVAL' : 'CANCELLED');
  }
  if (projStatus === 'ON_HOLD') {
    return rnd() < 0.45 ? 'DONE' : (rnd() < 0.4 ? 'IN_PROGRESS' : 'TODO');
  }
  // ACTIVE
  if (new Date(dueDate) < TODAY) {
    const r = rnd();
    if (r < 0.60) return 'DONE';
    if (r < 0.75) return 'IN_PROGRESS';
    if (r < 0.88) return 'PENDING_APPROVAL';
    if (r < 0.95) return 'RETURNED';
    return 'CANCELLED';
  }
  if (new Date(startDate) <= TODAY) {
    return rnd() < 0.35 ? 'IN_PROGRESS' : 'TODO';
  }
  return 'TODO';
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  await db.connect();
  const now = new Date();

  // ── 0. Xóa toàn bộ data ──────────────────────────────────────────────────
  console.log('🧹  Xóa dữ liệu cũ...');
  await db.query(`
    TRUNCATE TABLE push_tokens, notifications, alert_configs, time_logs, tasks,
      allocations, projects, employee_rates, employees,
      timesheet_records, time_entries, work_statuses,
      users, org_units
    RESTART IDENTITY CASCADE
  `);

  // ── 1. Org units ──────────────────────────────────────────────────────────
  console.log('🏢  Tạo org units...');
  const orgIdByCode = {};
  for (const o of ORG_DEF) orgIdByCode[o.code] = uid();

  const orgRows = ORG_DEF.map(o => ({
    id:         orgIdByCode[o.code],
    name:       o.name,
    code:       o.code,
    parent_id:  o.parent ? orgIdByCode[o.parent] : null,
    level:      o.level,
    created_at: now,
    updated_at: now,
  }));
  await bulkInsert('org_units',
    ['id','name','code','parent_id','level','created_at','updated_at'], orgRows);

  // ── 2. Users ──────────────────────────────────────────────────────────────
  console.log('👤  Tạo 1 admin + 100 PM + 1000 member users...');
  const passwordHash = await bcrypt.hash('admin', 10);

  // Admin
  const adminId = uid();
  const adminRow = {
    id: adminId, email: 'admin@loop.vn', password_hash: passwordHash,
    name: 'Super Admin', role: 'ADMIN',
    org_unit_id: orgIdByCode['ROOT'],
    is_active: true, created_at: now, updated_at: now,
  };

  // 100 PM users
  const pmIds = Array.from({ length: 100 }, () => uid());
  const pmRows = pmIds.map((id, i) => ({
    id, email: `pm${String(i + 1).padStart(3, '0')}@loop.vn`,
    password_hash: passwordHash,
    name: genFullName(1000 + i),
    role: 'PM',
    org_unit_id: orgIdByCode['PM'],
    is_active: true, created_at: now, updated_at: now,
  }));

  // 1000 member users
  const memberIds = Array.from({ length: 1000 }, () => uid());
  const memberRows = memberIds.map((id, i) => ({
    id, email: `emp${String(i + 1).padStart(4, '0')}@loop.vn`,
    password_hash: passwordHash,
    name: genFullName(i),
    role: 'MEMBER',
    org_unit_id: orgIdByCode[LEAF_CODES[i % LEAF_CODES.length]],
    is_active: true, created_at: now, updated_at: now,
  }));

  const userCols = ['id','email','password_hash','name','role','org_unit_id','is_active','created_at','updated_at'];
  await bulkInsert('users', userCols, [adminRow]);
  await bulkInsert('users', userCols, pmRows);
  await bulkInsert('users', userCols, memberRows);

  // ── 3. Employees (1000) ───────────────────────────────────────────────────
  console.log('👥  Tạo 1000 nhân viên...');
  const empIds = Array.from({ length: 1000 }, () => uid());
  const empRows = empIds.map((id, i) => ({
    id,
    code:        `EMP-${String(i + 1).padStart(4, '0')}`,
    user_id:     memberIds[i],
    org_unit_id: orgIdByCode[LEAF_CODES[i % LEAF_CODES.length]],
    full_name:   memberRows[i].name,
    tech_stack:  `{${STACKS[i % STACKS.length].join(',')}}`,
    level:       LEVELS[i % LEVELS.length],
    email:       memberRows[i].email,
    start_date:  fmtDate(randDateBetween('2020-01-01', '2025-06-01')),
    is_active:   true,
    created_at:  now,
    updated_at:  now,
  }));
  await bulkInsert('employees',
    ['id','code','user_id','org_unit_id','full_name','tech_stack','level','email','start_date','is_active','created_at','updated_at'],
    empRows);

  // ── 4. Employee rates ─────────────────────────────────────────────────────
  console.log('💰  Tạo employee rates...');
  const RATE_BY_LEVEL = {
    JUNIOR: [500000, 750000],
    MID:    [800000, 1100000],
    SENIOR: [1200000, 1800000],
    EXPERT: [2000000, 3000000],
  };
  const rateRows = empRows.map(e => {
    const [lo, hi] = RATE_BY_LEVEL[e.level];
    return {
      id:             uid(),
      employee_id:    e.id,
      rate_per_day:   rand(lo, hi),
      currency:       'VND',
      effective_date: fmtDate(new Date(e.start_date)),
      created_at:     now,
    };
  });
  await bulkInsert('employee_rates',
    ['id','employee_id','rate_per_day','currency','effective_date','created_at'], rateRows);

  // ── 5. Projects (100) ─────────────────────────────────────────────────────
  console.log('📁  Tạo 100 dự án...');
  // Status distribution: 70 ACTIVE, 15 PLANNING, 10 ON_HOLD, 5 CLOSED
  const statusDist = [
    ...Array(70).fill('ACTIVE'),
    ...Array(15).fill('PLANNING'),
    ...Array(10).fill('ON_HOLD'),
    ...Array(5).fill('CLOSED'),
  ];
  shuffle(statusDist); // trộn ngẫu nhiên

  const projIds = Array.from({ length: 100 }, () => uid());
  const projects = PROJECT_DEFS.map((def, i) => {
    const status = statusDist[i];
    let startDate, endDate;
    // Tùy theo trạng thái, chọn khoảng thời gian để task tập trung tháng 5-7
    if (status === 'ACTIVE') {
      startDate = randDateBetween('2026-02-02', '2026-04-01');
      endDate   = randDateBetween('2026-08-01', '2026-10-31');
    } else if (status === 'PLANNING') {
      startDate = randDateBetween('2026-06-15', '2026-08-01');
      endDate   = randDateBetween('2026-12-01', '2027-03-31');
    } else if (status === 'ON_HOLD') {
      startDate = randDateBetween('2025-10-01', '2026-01-31');
      endDate   = randDateBetween('2026-07-01', '2026-09-30');
    } else { // CLOSED
      startDate = randDateBetween('2025-06-01', '2025-10-31');
      endDate   = randDateBetween('2026-01-01', '2026-04-15');
    }

    const budgetHours = rand(500, 5000);
    const budgetCost  = rand(500, 5000) * 1_000_000;

    return {
      id:               projIds[i],
      name:             def.name,
      code:             `PRJ-${String(i + 1).padStart(3, '0')}`,
      type:             def.type,
      status,
      pm_id:            pmIds[i],
      org_unit_id:      orgIdByCode['IT'],
      start_date:       fmtDate(startDate),
      end_date:         fmtDate(endDate),
      customer:         def.customer,
      budget_hours:     budgetHours,
      budget_cost:      budgetCost,
      budget_effort_mm: (budgetHours / 160).toFixed(2),
      currency:         'VND',
      progress:         status === 'CLOSED' ? 100 : status === 'ACTIVE' ? rand(20, 75) : rand(0, 20),
      created_at:       now,
      updated_at:       now,
    };
  });

  await bulkInsert('projects', [
    'id','name','code','type','status','pm_id','org_unit_id',
    'start_date','end_date','customer',
    'budget_hours','budget_cost','budget_effort_mm','currency',
    'progress','created_at','updated_at',
  ], projects);

  // ── 6. Allocations ────────────────────────────────────────────────────────
  // Mỗi dự án: 8-12 nhân viên. Mỗi nhân viên tối đa 2 dự án.
  console.log('🔗  Phân bổ nhân viên vào dự án...');
  const empProjectCount = new Array(1000).fill(0);
  const projEmpMap = {}; // projIdx -> [empIdx]
  const allocRows = [];

  for (let pi = 0; pi < 100; pi++) {
    const proj = projects[pi];
    const targetCount = rand(8, 12);
    // Ưu tiên nhân viên chưa có dự án nào
    const candidates = shuffle(
      empRows
        .map((_, ei) => ei)
        .filter(ei => empProjectCount[ei] < 2)
    ).slice(0, targetCount);

    projEmpMap[pi] = candidates;
    const seen = new Set();
    for (const ei of candidates) {
      if (seen.has(ei)) continue;
      seen.add(ei);
      empProjectCount[ei]++;
      const emp = empRows[ei];
      allocRows.push({
        id:             uid(),
        project_id:     proj.id,
        employee_id:    emp.id,
        role:           emp.level === 'SENIOR' || emp.level === 'EXPERT' ? 'LEAD' : 'MEMBER',
        level:          emp.level,
        allocation_pct: pick([50, 75, 100]),
        rate_per_day:   rateRows[ei].rate_per_day,
        start_date:     proj.start_date,
        end_date:       proj.end_date,
        created_at:     now,
        updated_at:     now,
      });
    }
  }

  await bulkInsert('allocations', [
    'id','project_id','employee_id','role','level',
    'allocation_pct','rate_per_day','start_date','end_date','created_at','updated_at',
  ], allocRows);
  console.log(`   → ${allocRows.length} allocations`);

  // ── 7. Tasks (10 000) ─────────────────────────────────────────────────────
  // Mỗi dự án: 4 L1 + 16 L2 + 80 L3 = 100 task → 100 × 100 = 10 000
  console.log('📋  Tạo 10 000 task...');

  const allTasks   = [];
  const doneTasks  = []; // { taskId, userId } cho time log

  for (let pi = 0; pi < 100; pi++) {
    const proj        = projects[pi];
    const projStart   = new Date(proj.start_date);
    const allocEmps   = (projEmpMap[pi] || []).map(ei => ({
      empId:  empRows[ei].id,
      userId: memberIds[ei],
    }));
    if (allocEmps.length === 0) continue;

    const pmUserId = pmIds[pi];
    let pos = 0;
    let empRR = 0; // round-robin index

    for (let phaseIdx = 0; phaseIdx < PHASES.length; phaseIdx++) {
      const phase  = PHASES[phaseIdx];
      const l1Id   = uid();
      const l1Start = addWorkDays(projStart, phase.startOff);
      const l1End   = addWorkDays(projStart, phase.endOff);

      const l1Status = leafStatus(fmtDate(l1Start), fmtDate(l1End), proj.status);

      allTasks.push({
        id:             l1Id,
        project_id:     proj.id,
        parent_id:      null,
        level:          1,
        title:          phase.name,
        status:         l1Status,
        assignee_id:    null,
        approver_id:    null,
        start_date:     fmtDate(l1Start),
        due_date:       fmtDate(l1End),
        estimate_hours: 0,
        actual_hours:   0,
        progress:       0,
        position:       pos++,
        created_at:     now,
        updated_at:     now,
      });

      const phaseLen = phase.endOff - phase.startOff;

      for (let mi = 0; mi < phase.modules.length; mi++) {
        const mod   = phase.modules[mi];
        const l2Id  = uid();
        const segLen = Math.floor(phaseLen / phase.modules.length);
        const l2StartOff = phase.startOff + mi * segLen;
        const l2EndOff   = phase.startOff + (mi + 1) * segLen;
        const l2Start    = addWorkDays(projStart, l2StartOff);
        const l2End      = addWorkDays(projStart, l2EndOff);

        const l2Status = leafStatus(fmtDate(l2Start), fmtDate(l2End), proj.status);

        allTasks.push({
          id:             l2Id,
          project_id:     proj.id,
          parent_id:      l1Id,
          level:          2,
          title:          mod.name,
          status:         l2Status,
          assignee_id:    null,
          approver_id:    null,
          start_date:     fmtDate(l2Start),
          due_date:       fmtDate(l2End),
          estimate_hours: 0,
          actual_hours:   0,
          progress:       0,
          position:       pos++,
          created_at:     now,
          updated_at:     now,
        });

        const taskSlot = Math.max(1, Math.floor(segLen / mod.tasks.length));

        for (let ti = 0; ti < mod.tasks.length; ti++) {
          const est          = pick(phase.estOptions);
          const durationDays = Math.max(1, Math.ceil(est / 8));
          const taskStartOff = l2StartOff + ti * taskSlot;
          const taskStart    = addWorkDays(projStart, taskStartOff);
          const taskDue      = addWorkDays(taskStart, durationDays);

          const st     = leafStatus(fmtDate(taskStart), fmtDate(taskDue), proj.status);
          const isDone = st === 'DONE' || st === 'PENDING_APPROVAL';
          const isWip  = st === 'IN_PROGRESS' || st === 'RETURNED';
          const actual = isDone ? est : isWip ? +(est * (rnd() * 0.4 + 0.3)).toFixed(2) : 0;
          const pct    = isDone ? 100 : isWip ? rand(20, 70) : 0;

          const assignee = allocEmps[empRR % allocEmps.length];
          empRR++;

          const taskId = uid();
          allTasks.push({
            id:             taskId,
            project_id:     proj.id,
            parent_id:      l2Id,
            level:          3,
            title:          mod.tasks[ti],
            status:         st,
            assignee_id:    assignee.empId,
            approver_id:    pmUserId,
            start_date:     fmtDate(taskStart),
            due_date:       fmtDate(taskDue),
            estimate_hours: est,
            actual_hours:   actual,
            progress:       pct,
            position:       pos++,
            created_at:     now,
            updated_at:     now,
          });

          if (isDone || isWip) {
            doneTasks.push({ taskId, userId: assignee.userId, taskStart, taskDue, est, isDone });
          }
        }
      }
    }
  }

  console.log(`   → ${allTasks.length} tasks`);
  await bulkInsert('tasks', [
    'id','project_id','parent_id','level','title','status',
    'assignee_id','approver_id',
    'start_date','due_date','estimate_hours','actual_hours','progress',
    'position','created_at','updated_at',
  ], allTasks);

  // ── 8. Time logs ──────────────────────────────────────────────────────────
  // Tạo time log cho ~60% task DONE/IN_PROGRESS (tối đa 2 bản ghi mỗi task)
  console.log('⏱   Tạo time logs...');
  const timeLogRows = [];
  const sampleDone = doneTasks.filter(() => rnd() < 0.60);

  for (const { taskId, userId, taskStart, taskDue, est, isDone } of sampleDone) {
    const logCount = isDone ? (rnd() < 0.5 ? 2 : 1) : 1;
    const totalH   = isDone ? est : est * (rnd() * 0.4 + 0.2);
    for (let li = 0; li < logCount; li++) {
      const logDate = randDateBetween(taskStart, taskDue < TODAY ? taskDue : TODAY);
      if (logDate.getDay() === 0 || logDate.getDay() === 6) continue;
      const hours = +(totalH / logCount).toFixed(2);
      timeLogRows.push({
        id:         uid(),
        task_id:    taskId,
        user_id:    userId,
        log_date:   fmtDate(logDate),
        hours:      hours > 8 ? 8 : hours,
        created_at: now,
      });
    }
  }
  console.log(`   → ${timeLogRows.length} time logs`);
  await bulkInsert('time_logs',
    ['id','task_id','user_id','log_date','hours','created_at'], timeLogRows);

  // ── 9. Alert configs ──────────────────────────────────────────────────────
  console.log('🔔  Tạo alert configs...');
  const alertTypes = ['EFFORT_NEAR_BUDGET','BUDGET_NEAR_LIMIT','TASK_OVERDUE','RESOURCE_OVERLOAD'];
  const alertRows = [];
  for (const proj of projects.filter(p => p.status === 'ACTIVE')) {
    for (const type of alertTypes) {
      alertRows.push({
        id:           uid(),
        project_id:   proj.id,
        type,
        threshold:    type.includes('BUDGET') ? 80 : type.includes('EFFORT') ? 85 : null,
        days_before_due: type === 'TASK_OVERDUE' ? 3 : null,
        is_active:    true,
        created_at:   now,
        updated_at:   now,
      });
    }
  }
  await bulkInsert('alert_configs',
    ['id','project_id','type','threshold','days_before_due','is_active','created_at','updated_at'],
    alertRows);

  // ── 10. Timesheet records (tháng 5, 6, 7) ────────────────────────────────
  console.log('📅  Tạo timesheet records...');
  const MONTHS = [
    { start: '2026-05-01', end: '2026-05-31', stdDays: 23 },
    { start: '2026-06-01', end: '2026-06-30', stdDays: 22 },
    { start: '2026-07-01', end: '2026-07-31', stdDays: 23 },
  ];
  const tsRows = [];
  for (const uid_val of memberIds) {
    for (const m of MONTHS) {
      const isPast   = new Date(m.end) < TODAY;
      const isCur    = new Date(m.start) <= TODAY && TODAY <= new Date(m.end);
      const leave    = rnd() < 0.2 ? rand(1, 3) : 0;
      const workDays = Math.max(0, m.stdDays - leave);
      const overtime = rnd() < 0.3 ? +(rand(1, 16) / 2).toFixed(1) : 0;

      let status, submittedAt = null, approvedAt = null;
      if (isPast) {
        const r = rnd();
        if (r < 0.70) { status = 'APPROVED'; submittedAt = now; approvedAt = now; }
        else if (r < 0.85) { status = 'SUBMITTED'; submittedAt = now; }
        else if (r < 0.92) { status = 'REJECTED'; submittedAt = now; }
        else status = 'DRAFT';
      } else if (isCur) {
        status = rnd() < 0.35 ? 'SUBMITTED' : 'DRAFT';
        if (status === 'SUBMITTED') submittedAt = now;
      } else {
        status = 'DRAFT';
      }

      tsRows.push({
        id:            uid(),
        user_id:       uid_val,
        period_start:  m.start,
        period_end:    m.end,
        working_days:  workDays,
        standard_days: m.stdDays,
        overtime_hours: overtime,
        leave_days:    leave,
        status,
        submitted_at:  submittedAt,
        approved_at:   approvedAt,
        approved_by_id: approvedAt ? adminId : null,
        created_at:    now,
        updated_at:    now,
      });
    }
  }
  console.log(`   → ${tsRows.length} timesheet records`);
  await bulkInsert('timesheet_records', [
    'id','user_id','period_start','period_end',
    'working_days','standard_days','overtime_hours','leave_days',
    'status','submitted_at','approved_at','approved_by_id',
    'created_at','updated_at',
  ], tsRows);

  // ── Tóm tắt ───────────────────────────────────────────────────────────────
  console.log('\n✅  Seed hoàn tất!');
  console.log(`   Org units      : ${ORG_DEF.length}`);
  console.log(`   Users          : ${1 + 100 + 1000}`);
  console.log(`   Employees      : 1000`);
  console.log(`   Projects       : 100  (70 ACTIVE · 15 PLANNING · 10 ON_HOLD · 5 CLOSED)`);
  console.log(`   Allocations    : ${allocRows.length}`);
  console.log(`   Tasks          : ${allTasks.length}  (L1=${allTasks.filter(t=>t.level===1).length} · L2=${allTasks.filter(t=>t.level===2).length} · L3=${allTasks.filter(t=>t.level===3).length})`);
  console.log(`   Time logs      : ${timeLogRows.length}`);
  console.log(`   Alert configs  : ${alertRows.length}`);
  console.log(`   Timesheets     : ${tsRows.length}`);
  console.log(`\n   🔑 Tài khoản: admin@loop.vn / pm001@loop.vn → pm100@loop.vn`);
  console.log(`      emp0001@loop.vn → emp1000@loop.vn | Mật khẩu: admin`);

  console.log('\nSeeding permissions...');
  await seedPermissions(db);
  console.log('\nSeeding permission demo data...');
  await seedPermissionDemo(db);
}

main()
  .catch(err => { console.error('❌ Lỗi:', err); process.exit(1); })
  .finally(() => db.end());
