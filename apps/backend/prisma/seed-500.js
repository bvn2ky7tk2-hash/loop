'use strict';
/**
 * seed-500.js — 500 nhân sự, 100 dự án, 1000 task, 1000 bug, 200 issues
 * Xoá hết data cũ (trừ org_units) rồi tạo lại toàn bộ.
 * Chạy: node prisma/seed-500.js
 */

require('dotenv/config');
const { Client } = require('pg');
const { randomUUID: uid } = require('crypto');
const bcrypt = require('bcrypt');

const DB_URL = process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db';
const db = new Client({ connectionString: DB_URL });

// ─── Utilities ────────────────────────────────────────────────────────────────
const pick  = a => a[Math.floor(Math.random() * a.length)];
const rand  = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const shuffle = a => [...a].sort(() => Math.random() - 0.5);

function fmtDate(d) { return (d instanceof Date ? d : new Date(d)).toISOString().split('T')[0]; }
function addDays(base, n) { const d = new Date(base); d.setDate(d.getDate() + n); return d; }
function addMonths(base, n) { const d = new Date(base); d.setMonth(d.getMonth() + n); return d; }
function randDate(from, to) {
  const s = new Date(from).getTime(), e = new Date(to).getTime();
  return new Date(s + Math.random() * (e - s));
}

async function bulk(table, cols, rows) {
  if (!rows.length) return;
  const BATCH = 150;
  for (let i = 0; i < rows.length; i += BATCH) {
    const sl = rows.slice(i, i + BATCH);
    const vals = sl.map((_, ri) => `(${cols.map((__, ci) => `$${ri * cols.length + ci + 1}`).join(',')})`).join(',');
    const params = sl.flatMap(r => cols.map(c => r[c] ?? null));
    await db.query(`INSERT INTO "${table}" (${cols.map(c=>`"${c}"`).join(',')}) VALUES ${vals} ON CONFLICT DO NOTHING`, params);
  }
}

// ─── Vietnamese names ─────────────────────────────────────────────────────────
const HO    = ['Nguyễn','Trần','Lê','Phạm','Hoàng','Phan','Vũ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý','Đinh','Trịnh','Cao','Hà','Vương','Tô'];
const DEM_M = ['Văn','Hữu','Minh','Đức','Quốc','Công','Trung','Thanh','Anh','Quang','Thành','Tiến','Phúc','Bảo','Gia','Ngọc','Chí','Trọng','Xuân'];
const DEM_F = ['Thị','Ngọc','Thúy','Thu','Mai','Hồng','Kim','Lan','Phương','Diễm','Khánh','Tuyết','Ánh','Mỹ','Bích','Yến','Tú','Lệ','Diệu'];
const TEN_M = ['An','Bình','Cường','Dũng','Đạt','Giang','Hải','Hùng','Khoa','Lâm','Long','Minh','Nam','Phong','Quân','Sơn','Tài','Thắng','Tuấn','Tùng','Vinh','Huy','Khôi','Duy','Hiếu','Linh','Nhân','Trí','Kiên','Quý','Phát','Thái','Tú'];
const TEN_F = ['Anh','Chi','Giang','Hà','Hương','Lan','Linh','Mai','Nga','Ngân','Nhung','Phương','Quỳnh','Tâm','Thảo','Thu','Trang','Vy','Xuân','Yến','Diễm','Hằng','Khánh','Oanh','Trinh','Châu','Nhi','Bảo','Lệ'];

function genName(idx) {
  const f = idx % 3 === 0;
  const h = HO[idx % HO.length];
  if (f) return `${h} ${DEM_F[idx % DEM_F.length]} ${TEN_F[Math.floor(idx/DEM_F.length) % TEN_F.length]}`;
  return `${h} ${DEM_M[idx % DEM_M.length]} ${TEN_M[Math.floor(idx/DEM_M.length) % TEN_M.length]}`;
}

// ─── Org Units ────────────────────────────────────────────────────────────────
const ORG_DEF = [
  { code:'ROOT',   name:'Loop.vn Technology',   parent:null,     level:0 },
  { code:'BOARD',  name:'Ban Giám Đốc',          parent:'ROOT',   level:1 },
  { code:'IT',     name:'Khối Kỹ Thuật',         parent:'ROOT',   level:1 },
  { code:'BIZ',    name:'Khối Kinh Doanh',       parent:'ROOT',   level:1 },
  { code:'DESIGN', name:'Khối Thiết Kế',         parent:'ROOT',   level:1 },
  { code:'DATA',   name:'Khối Dữ Liệu',          parent:'ROOT',   level:1 },
  { code:'INFRA',  name:'Hạ Tầng & DevOps',      parent:'ROOT',   level:1 },
  { code:'HRD',    name:'Phòng Nhân Sự',         parent:'ROOT',   level:1 },
  { code:'FIN',    name:'Phòng Tài Chính',       parent:'ROOT',   level:1 },
  { code:'BE',     name:'Backend Team',          parent:'IT',     level:2 },
  { code:'FE',     name:'Frontend Team',         parent:'IT',     level:2 },
  { code:'MOBILE', name:'Mobile Team',           parent:'IT',     level:2 },
  { code:'QA',     name:'QA & Testing',          parent:'IT',     level:2 },
  { code:'JAVA',   name:'Java Team',             parent:'IT',     level:2 },
  { code:'NET',    name:'.NET Team',             parent:'IT',     level:2 },
  { code:'PM_T',   name:'Project Management',   parent:'BIZ',    level:2 },
  { code:'BA',     name:'Business Analysis',    parent:'BIZ',    level:2 },
  { code:'SALES',  name:'Sales Team',           parent:'BIZ',    level:2 },
  { code:'UX',     name:'UX Research',          parent:'DESIGN', level:2 },
  { code:'UI',     name:'UI Design',            parent:'DESIGN', level:2 },
  { code:'DE',     name:'Data Engineering',     parent:'DATA',   level:2 },
  { code:'DS',     name:'Data Science',         parent:'DATA',   level:2 },
  { code:'DEVOPS', name:'DevOps & Cloud',       parent:'INFRA',  level:2 },
  { code:'SEC',    name:'Security Team',        parent:'INFRA',  level:2 },
];

// Leaf-level org codes for distributing employees
const LEAF_CODES = ['BE','FE','MOBILE','QA','JAVA','NET','PM_T','BA','SALES','UX','UI','DE','DS','DEVOPS','SEC','HRD','FIN'];

// ─── Permissions ──────────────────────────────────────────────────────────────
const ALL_PERMS = [
  { code:'projects:read',       module:'projects',   action:'read',       description:'Xem danh sách dự án' },
  { code:'projects:create',     module:'projects',   action:'create',     description:'Tạo dự án mới' },
  { code:'projects:update',     module:'projects',   action:'update',     description:'Cập nhật dự án' },
  { code:'projects:delete',     module:'projects',   action:'delete',     description:'Xóa dự án' },
  { code:'tasks:read',          module:'tasks',      action:'read',       description:'Xem task' },
  { code:'tasks:create',        module:'tasks',      action:'create',     description:'Tạo task' },
  { code:'tasks:update',        module:'tasks',      action:'update',     description:'Cập nhật task' },
  { code:'tasks:delete',        module:'tasks',      action:'delete',     description:'Xóa task' },
  { code:'tasks:approve',       module:'tasks',      action:'approve',    description:'Duyệt task' },
  { code:'employees:read',      module:'employees',  action:'read',       description:'Xem nhân sự' },
  { code:'employees:create',    module:'employees',  action:'create',     description:'Thêm nhân sự' },
  { code:'employees:update',    module:'employees',  action:'update',     description:'Cập nhật nhân sự' },
  { code:'employees:delete',    module:'employees',  action:'delete',     description:'Xóa nhân sự' },
  { code:'reports:read',        module:'reports',    action:'read',       description:'Xem báo cáo' },
  { code:'reports:export',      module:'reports',    action:'export',     description:'Xuất báo cáo' },
  { code:'timesheets:read',     module:'timesheets', action:'read',       description:'Xem timesheet' },
  { code:'timesheets:approve',  module:'timesheets', action:'approve',    description:'Duyệt timesheet' },
  { code:'timelogs:create',     module:'timelogs',   action:'create',     description:'Ghi giờ làm' },
  { code:'timelogs:update',     module:'timelogs',   action:'update',     description:'Sửa time log' },
  { code:'bugs:read',           module:'bugs',       action:'read',       description:'Xem bug' },
  { code:'bugs:create',         module:'bugs',       action:'create',     description:'Tạo bug' },
  { code:'bugs:update',         module:'bugs',       action:'update',     description:'Cập nhật bug' },
  { code:'bugs:assign',         module:'bugs',       action:'assign',     description:'Giao bug' },
  { code:'bugs:close',          module:'bugs',       action:'close',      description:'Đóng bug' },
  { code:'issues:read',         module:'issues',     action:'read',       description:'Xem issue' },
  { code:'issues:create',       module:'issues',     action:'create',     description:'Tạo issue' },
  { code:'issues:update',       module:'issues',     action:'update',     description:'Cập nhật issue' },
  { code:'issues:approve',      module:'issues',     action:'approve',    description:'Phê duyệt CR' },
  { code:'bpm:read',            module:'bpm',        action:'read',       description:'Xem quy trình' },
  { code:'bpm:manage',          module:'bpm',        action:'manage',     description:'Quản lý quy trình' },
  { code:'alerts:read',         module:'alerts',     action:'read',       description:'Xem cảnh báo' },
  { code:'alerts:configure',    module:'alerts',     action:'configure',  description:'Cấu hình cảnh báo' },
  { code:'dashboard:read',      module:'dashboard',  action:'read',       description:'Xem dashboard' },
  { code:'finance:read',        module:'finance',    action:'read',       description:'Xem tài chính' },
  { code:'finance:create',      module:'finance',    action:'create',     description:'Tạo phiếu tài chính' },
  { code:'finance:approve',     module:'finance',    action:'approve',    description:'Phê duyệt tài chính' },
  { code:'finance:manage',      module:'finance',    action:'manage',     description:'Quản lý tài chính' },
  { code:'finance:export',      module:'finance',    action:'export',     description:'Xuất báo cáo TC' },
  { code:'leaves:read',         module:'leaves',     action:'read',       description:'Xem nghỉ phép' },
  { code:'leaves:create',       module:'leaves',     action:'create',     description:'Đăng ký nghỉ phép' },
  { code:'leaves:approve',      module:'leaves',     action:'approve',    description:'Duyệt nghỉ phép' },
  { code:'contracts:read',      module:'contracts',  action:'read',       description:'Xem hợp đồng' },
  { code:'contracts:create',    module:'contracts',  action:'create',     description:'Tạo hợp đồng' },
  { code:'contracts:update',    module:'contracts',  action:'update',     description:'Cập nhật HĐ' },
  { code:'contracts:approve',   module:'contracts',  action:'approve',    description:'Duyệt hợp đồng' },
  { code:'admin:users',         module:'admin',      action:'users',      description:'Quản lý người dùng' },
  { code:'admin:org',           module:'admin',      action:'org',        description:'Quản lý cơ cấu' },
  { code:'admin:permissions',   module:'admin',      action:'permissions',description:'Quản lý phân quyền' },
  { code:'admin:settings',      module:'admin',      action:'settings',   description:'Cài đặt hệ thống' },
  { code:'crm:read',            module:'crm',        action:'read',       description:'Xem CRM' },
  { code:'crm:create',          module:'crm',        action:'create',     description:'Tạo CRM record' },
  { code:'crm:update',          module:'crm',        action:'update',     description:'Cập nhật CRM' },
  { code:'crm:delete',          module:'crm',        action:'delete',     description:'Xóa CRM' },
  { code:'crm:manage',          module:'crm',        action:'manage',     description:'Quản lý CRM' },
  { code:'recruit:read',        module:'recruit',    action:'read',       description:'Xem tuyển dụng' },
  { code:'recruit:create',      module:'recruit',    action:'create',     description:'Tạo JD' },
  { code:'recruit:update',      module:'recruit',    action:'update',     description:'Cập nhật tuyển dụng' },
  { code:'recruit:approve',     module:'recruit',    action:'approve',    description:'Duyệt tuyển dụng' },
  { code:'recruit:manage',      module:'recruit',    action:'manage',     description:'Quản lý tuyển dụng' },
  { code:'asset:read',          module:'asset',      action:'read',       description:'Xem tài sản' },
  { code:'asset:create',        module:'asset',      action:'create',     description:'Thêm tài sản' },
  { code:'asset:update',        module:'asset',      action:'update',     description:'Cập nhật tài sản' },
  { code:'asset:assign',        module:'asset',      action:'assign',     description:'Giao tài sản' },
  { code:'asset:manage',        module:'asset',      action:'manage',     description:'Quản lý tài sản' },
];

const ROLE_PERMS = {
  ADMIN: ALL_PERMS.map(p => p.code),
  LEADERSHIP: ['dashboard:read','reports:read','reports:export','employees:read','projects:read','tasks:read','bugs:read','issues:read','timesheets:read','finance:read','leaves:read','contracts:read','crm:read','asset:read'],
  PM: ['dashboard:read','projects:read','projects:create','projects:update','tasks:read','tasks:create','tasks:update','tasks:approve','bugs:read','bugs:create','bugs:update','bugs:assign','issues:read','issues:create','issues:update','timelogs:create','timelogs:update','timesheets:read','alerts:read','reports:read','bpm:read','leaves:read','contracts:read','crm:read'],
  MEMBER: ['dashboard:read','projects:read','tasks:read','tasks:create','tasks:update','bugs:read','bugs:create','timelogs:create','timelogs:update','timesheets:read','leaves:read','leaves:create','issues:read'],
};

const MODULE_ROLES = [
  { code:'hr:manager',          name:'HR Manager',         domain:'hr',         description:'Quản lý nhân sự toàn diện',    isSystem:true },
  { code:'hr:recruiter',        name:'HR Recruiter',       domain:'hr',         description:'Phụ trách tuyển dụng',         isSystem:true },
  { code:'finance:accountant',  name:'Finance Accountant', domain:'finance',    description:'Kế toán',                      isSystem:true },
  { code:'finance:manager',     name:'Finance Manager',    domain:'finance',    description:'Quản lý tài chính',            isSystem:true },
  { code:'crm:sales',           name:'CRM Sales',          domain:'crm',        description:'Nhân viên kinh doanh',         isSystem:true },
  { code:'crm:manager',         name:'CRM Manager',        domain:'crm',        description:'Quản lý kinh doanh',           isSystem:true },
  { code:'operations:asset',    name:'Asset Officer',      domain:'operations', description:'Quản lý tài sản',              isSystem:true },
  { code:'operations:contract', name:'Contract Officer',   domain:'operations', description:'Quản lý hợp đồng KH',          isSystem:true },
];

const MODULE_ROLE_PERMS = {
  'hr:manager':          ['employees:read','employees:create','employees:update','employees:delete','timesheets:read','timesheets:approve','timelogs:create','timelogs:update','reports:read','reports:export','dashboard:read','leaves:read','leaves:approve','contracts:read','contracts:create','contracts:update','contracts:approve','recruit:read','recruit:manage'],
  'hr:recruiter':        ['employees:read','recruit:read','recruit:create','recruit:update','recruit:manage','timesheets:read','dashboard:read'],
  'finance:accountant':  ['finance:read','finance:create','finance:manage','reports:read','reports:export','timesheets:read','timesheets:approve','timelogs:create','timelogs:update','dashboard:read'],
  'finance:manager':     ['finance:read','finance:create','finance:approve','finance:manage','finance:export','reports:read','reports:export','timesheets:read','timesheets:approve','alerts:read','alerts:configure','dashboard:read'],
  'crm:sales':           ['crm:read','crm:create','crm:update','crm:manage','projects:read','tasks:read','tasks:create','tasks:update','dashboard:read'],
  'crm:manager':         ['crm:read','crm:create','crm:update','crm:delete','crm:manage','projects:read','tasks:read','tasks:create','tasks:update','tasks:approve','reports:read','reports:export','dashboard:read'],
  'operations:asset':    ['asset:read','asset:create','asset:update','asset:assign','asset:manage','projects:read','tasks:read','reports:read','dashboard:read'],
  'operations:contract': ['contracts:read','contracts:create','contracts:update','contracts:approve','projects:read','projects:create','projects:update','tasks:read','tasks:create','tasks:update','reports:read','reports:export','issues:read','issues:create','issues:update','issues:approve','dashboard:read'],
};

// ─── BPMN Process Definitions ─────────────────────────────────────────────────
const BPMN_LEAVE = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" id="leave-defs" targetNamespace="http://loop.vn/processes">
  <process id="leave-approval-process" name="Đăng Ký Nghỉ Phép" isExecutable="true">
    <startEvent id="start" name="Nhân viên nộp đơn"><outgoing>to-manager</outgoing></startEvent>
    <sequenceFlow id="to-manager" sourceRef="start" targetRef="manager-review"/>
    <userTask id="manager-review" name="Trưởng phòng duyệt"><incoming>to-manager</incoming><outgoing>to-hr</outgoing></userTask>
    <sequenceFlow id="to-hr" sourceRef="manager-review" targetRef="hr-confirm"/>
    <userTask id="hr-confirm" name="HR xác nhận &amp; cập nhật số phép"><incoming>to-hr</incoming><outgoing>to-end</outgoing></userTask>
    <sequenceFlow id="to-end" sourceRef="hr-confirm" targetRef="end"/>
    <endEvent id="end" name="Hoàn tất"><incoming>to-end</incoming></endEvent>
  </process>
</definitions>`;

const BPMN_OVERTIME = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" id="ot-defs" targetNamespace="http://loop.vn/processes">
  <process id="overtime-request-process" name="Đăng Ký Làm Thêm Giờ" isExecutable="true">
    <startEvent id="start" name="NV đăng ký OT"><outgoing>to-pm</outgoing></startEvent>
    <sequenceFlow id="to-pm" sourceRef="start" targetRef="pm-review"/>
    <userTask id="pm-review" name="PM / Trưởng phòng duyệt OT"><incoming>to-pm</incoming><outgoing>to-hr</outgoing></userTask>
    <sequenceFlow id="to-hr" sourceRef="pm-review" targetRef="hr-record"/>
    <userTask id="hr-record" name="HR ghi nhận giờ OT"><incoming>to-hr</incoming><outgoing>to-end</outgoing></userTask>
    <sequenceFlow id="to-end" sourceRef="hr-record" targetRef="end"/>
    <endEvent id="end" name="OT được duyệt"><incoming>to-end</incoming></endEvent>
  </process>
</definitions>`;

const BPMN_COMPETENCY = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" id="comp-defs" targetNamespace="http://loop.vn/processes">
  <process id="competency-review-process" name="Đánh Giá Năng Lực Nhân Sự" isExecutable="true">
    <startEvent id="start" name="Bắt đầu đánh giá định kỳ"><outgoing>to-self</outgoing></startEvent>
    <sequenceFlow id="to-self" sourceRef="start" targetRef="self-assessment"/>
    <userTask id="self-assessment" name="Nhân viên tự đánh giá"><incoming>to-self</incoming><outgoing>to-manager</outgoing></userTask>
    <sequenceFlow id="to-manager" sourceRef="self-assessment" targetRef="manager-review"/>
    <userTask id="manager-review" name="Trưởng phòng đánh giá"><incoming>to-manager</incoming><outgoing>to-hr</outgoing></userTask>
    <sequenceFlow id="to-hr" sourceRef="manager-review" targetRef="hr-review"/>
    <userTask id="hr-review" name="HR tổng hợp &amp; đề xuất thăng hạng"><incoming>to-hr</incoming><outgoing>to-director</outgoing></userTask>
    <sequenceFlow id="to-director" sourceRef="hr-review" targetRef="director-approve"/>
    <userTask id="director-approve" name="BGĐ phê duyệt kết quả"><incoming>to-director</incoming><outgoing>to-end</outgoing></userTask>
    <sequenceFlow id="to-end" sourceRef="director-approve" targetRef="end"/>
    <endEvent id="end" name="Đánh giá hoàn tất"><incoming>to-end</incoming></endEvent>
  </process>
</definitions>`;

const BPMN_PROBATION = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" id="prob-defs" targetNamespace="http://loop.vn/processes">
  <process id="probation-review-process" name="Đánh Giá Hết Hạn HĐTV" isExecutable="true">
    <startEvent id="start" name="HĐ thử việc sắp hết hạn"><outgoing>to-eval</outgoing></startEvent>
    <sequenceFlow id="to-eval" sourceRef="start" targetRef="manager-eval"/>
    <userTask id="manager-eval" name="Trưởng phòng đánh giá thử việc"><incoming>to-eval</incoming><outgoing>to-hr</outgoing></userTask>
    <sequenceFlow id="to-hr" sourceRef="manager-eval" targetRef="hr-decision"/>
    <userTask id="hr-decision" name="HR xem xét &amp; quyết định ký HĐLĐ"><incoming>to-hr</incoming><outgoing>to-notify</outgoing></userTask>
    <sequenceFlow id="to-notify" sourceRef="hr-decision" targetRef="notify-task"/>
    <userTask id="notify-task" name="Thông báo kết quả cho nhân viên"><incoming>to-notify</incoming><outgoing>to-end</outgoing></userTask>
    <sequenceFlow id="to-end" sourceRef="notify-task" targetRef="end"/>
    <endEvent id="end" name="Hoàn tất xử lý HĐTV"><incoming>to-end</incoming></endEvent>
  </process>
</definitions>`;

const BPMN_CONTRACT_RENEWAL = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" id="renewal-defs" targetNamespace="http://loop.vn/processes">
  <process id="labor-contract-renewal-process" name="Đánh Giá Hết Hạn HĐLĐ" isExecutable="true">
    <startEvent id="start" name="HĐLĐ sắp hết hạn 30 ngày"><outgoing>to-notify</outgoing></startEvent>
    <sequenceFlow id="to-notify" sourceRef="start" targetRef="hr-notify"/>
    <userTask id="hr-notify" name="HR thông báo nhân viên trước 30 ngày"><incoming>to-notify</incoming><outgoing>to-respond</outgoing></userTask>
    <sequenceFlow id="to-respond" sourceRef="hr-notify" targetRef="employee-respond"/>
    <userTask id="employee-respond" name="Nhân viên xác nhận ý kiến gia hạn"><incoming>to-respond</incoming><outgoing>to-manager</outgoing></userTask>
    <sequenceFlow id="to-manager" sourceRef="employee-respond" targetRef="manager-review"/>
    <userTask id="manager-review" name="Trưởng phòng quyết định gia hạn"><incoming>to-manager</incoming><outgoing>to-finalize</outgoing></userTask>
    <sequenceFlow id="to-finalize" sourceRef="manager-review" targetRef="hr-finalize"/>
    <userTask id="hr-finalize" name="HR hoàn tất thủ tục ký HĐLĐ mới"><incoming>to-finalize</incoming><outgoing>to-end</outgoing></userTask>
    <sequenceFlow id="to-end" sourceRef="hr-finalize" targetRef="end"/>
    <endEvent id="end" name="HĐLĐ mới đã ký"><incoming>to-end</incoming></endEvent>
  </process>
</definitions>`;

// ─── Task Form Fields ─────────────────────────────────────────────────────────
const FORM_LEAVE = {
  'manager-review': [
    { name:'decision',     label:'Quyết định',        type:'select',   required:true, options:[{label:'Đồng ý',value:'APPROVED'},{label:'Từ chối',value:'REJECTED'}] },
    { name:'note',         label:'Ghi chú',            type:'textarea', required:false },
  ],
  'hr-confirm': [
    { name:'confirmed',    label:'Đã cập nhật số phép', type:'select', required:true, options:[{label:'Đã cập nhật',value:'YES'},{label:'Chưa',value:'NO'}] },
    { name:'notes',        label:'Ghi chú',             type:'textarea', required:false },
  ],
};

const FORM_OT = {
  'pm-review': [
    { name:'decision',   label:'Quyết định',     type:'select',   required:true, options:[{label:'Đồng ý',value:'APPROVED'},{label:'Từ chối',value:'REJECTED'}] },
    { name:'maxHours',   label:'Số giờ OT tối đa', type:'number', required:false },
    { name:'note',       label:'Ghi chú',         type:'textarea', required:false },
  ],
  'hr-record': [
    { name:'recorded',   label:'Đã ghi nhận hệ thống', type:'select', required:true, options:[{label:'Đã ghi',value:'YES'},{label:'Chưa',value:'NO'}] },
    { name:'notes',      label:'Ghi chú',               type:'textarea', required:false },
  ],
};

const FORM_COMPETENCY = {
  'self-assessment': [
    { name:'achievements', label:'Thành tích nổi bật',    type:'textarea', required:true },
    { name:'strengths',    label:'Điểm mạnh',             type:'textarea', required:true },
    { name:'improvements', label:'Điểm cần cải thiện',    type:'textarea', required:false },
    { name:'requestLevel', label:'Đề xuất xếp hạng',     type:'select',  required:true, options:[{label:'JUNIOR',value:'JUNIOR'},{label:'MID',value:'MID'},{label:'SENIOR',value:'SENIOR'},{label:'EXPERT',value:'EXPERT'}] },
  ],
  'manager-review': [
    { name:'rating',          label:'Điểm đánh giá (1-10)', type:'number',  required:true },
    { name:'recommendation',  label:'Đề xuất',              type:'select',  required:true, options:[{label:'Thăng hạng',value:'PROMOTE'},{label:'Giữ nguyên',value:'MAINTAIN'},{label:'Cần cải thiện',value:'IMPROVE'}] },
    { name:'comment',         label:'Nhận xét',             type:'textarea', required:false },
  ],
  'hr-review': [
    { name:'finalRec',   label:'Đề xuất cuối',   type:'select',   required:true, options:[{label:'Thăng hạng',value:'PROMOTE'},{label:'Giữ nguyên',value:'MAINTAIN'},{label:'Lên kế hoạch',value:'PLAN'}] },
    { name:'notes',      label:'Ghi chú tổng hợp', type:'textarea', required:false },
  ],
  'director-approve': [
    { name:'decision',   label:'Phê duyệt',       type:'select',   required:true, options:[{label:'Đồng ý',value:'APPROVED'},{label:'Chờ xem xét',value:'PENDING'},{label:'Từ chối',value:'REJECTED'}] },
    { name:'notes',      label:'Chỉ đạo của BGĐ', type:'textarea', required:false },
  ],
};

const FORM_PROBATION = {
  'manager-eval': [
    { name:'performance',    label:'Chất lượng công việc', type:'select', required:true, options:[{label:'Xuất sắc',value:'EXCELLENT'},{label:'Tốt',value:'GOOD'},{label:'Đạt yêu cầu',value:'ACCEPTABLE'},{label:'Chưa đạt',value:'POOR'}] },
    { name:'attitude',       label:'Thái độ làm việc (1-10)', type:'number', required:true },
    { name:'recommendation', label:'Đề xuất',              type:'select', required:true, options:[{label:'Ký HĐLĐ',value:'PASS'},{label:'Gia hạn TV',value:'EXTEND'},{label:'Chấm dứt',value:'TERMINATE'}] },
    { name:'comment',        label:'Nhận xét',             type:'textarea', required:false },
  ],
  'hr-decision': [
    { name:'finalDecision',  label:'Quyết định HR',        type:'select', required:true, options:[{label:'Ký HĐLĐ chính thức',value:'CONFIRM_FULL_TIME'},{label:'Gia hạn thử việc',value:'EXTEND_PROBATION'},{label:'Chấm dứt hợp đồng',value:'TERMINATE'}] },
    { name:'startDate',      label:'Ngày bắt đầu HĐLĐ',   type:'date',   required:false },
    { name:'notes',          label:'Ghi chú',              type:'textarea', required:false },
  ],
  'notify-task': [
    { name:'notified',       label:'Đã thông báo NV',     type:'select', required:true, options:[{label:'Đã thông báo',value:'YES'}] },
    { name:'notes',          label:'Nội dung thông báo',  type:'textarea', required:false },
  ],
};

const FORM_RENEWAL = {
  'hr-notify': [
    { name:'notifyDate',     label:'Ngày thông báo',       type:'date',   required:true },
    { name:'expiryDate',     label:'Ngày hết hạn HĐLĐ',   type:'date',   required:true },
    { name:'notes',          label:'Ghi chú',              type:'textarea', required:false },
  ],
  'employee-respond': [
    { name:'intention',      label:'Ý kiến gia hạn',      type:'select', required:true, options:[{label:'Muốn gia hạn',value:'RENEW'},{label:'Không gia hạn',value:'NOT_RENEW'}] },
    { name:'expectedSalary', label:'Mức lương kỳ vọng',   type:'number', required:false },
    { name:'notes',          label:'Ghi chú',             type:'textarea', required:false },
  ],
  'manager-review': [
    { name:'decision',       label:'Quyết định',           type:'select', required:true, options:[{label:'Gia hạn',value:'RENEW'},{label:'Không gia hạn',value:'NOT_RENEW'}] },
    { name:'newSalary',      label:'Mức lương mới',        type:'number', required:false },
    { name:'comment',        label:'Nhận xét',             type:'textarea', required:false },
  ],
  'hr-finalize': [
    { name:'contractType',   label:'Loại hợp đồng',       type:'select', required:true, options:[{label:'Toàn thời gian',value:'FULL_TIME'},{label:'Bán thời gian',value:'PART_TIME'}] },
    { name:'duration',       label:'Thời hạn HĐ',         type:'select', required:true, options:[{label:'1 năm',value:'1_YEAR'},{label:'2 năm',value:'2_YEAR'},{label:'Không xác định thời hạn',value:'INDEFINITE'}] },
    { name:'actualStart',    label:'Ngày ký HĐ mới',      type:'date',   required:true },
    { name:'notes',          label:'Ghi chú',             type:'textarea', required:false },
  ],
};

// ─── Project definitions (100 projects) ──────────────────────────────────────
const PROJECT_DEFS = [
  {name:'Core Banking System',customer:'Vietcombank',type:'OSDC'},{name:'Mobile Banking App',customer:'Techcombank',type:'OSDC'},
  {name:'Internet Banking Portal',customer:'MB Bank',type:'OSDC'},{name:'Digital Wallet Platform',customer:'BIDV',type:'OSDC'},
  {name:'Risk Management System',customer:'VPBank',type:'OSDC'},{name:'Loan Origination System',customer:'Agribank',type:'OSDC'},
  {name:'Trade Finance Platform',customer:'VietinBank',type:'OSDC'},{name:'ERP Enterprise System',customer:'VinGroup',type:'OSDC'},
  {name:'Supply Chain Management',customer:'Masan Group',type:'OSDC'},{name:'Fleet Management System',customer:'VinFast',type:'OSDC'},
  {name:'HR & Payroll Platform',customer:'TH True Milk',type:'OSDC'},{name:'Warehouse Management',customer:'Vinmart',type:'OSDC'},
  {name:'Retail Analytics Platform',customer:'Saigon Co.op',type:'OSDC'},{name:'Telecom Billing System',customer:'Viettel',type:'OSDC'},
  {name:'Customer Self-Service Portal',customer:'VNPT',type:'OSDC'},{name:'CRM Platform',customer:'MobiFone',type:'OSDC'},
  {name:'OSS/BSS Integration',customer:'Vietnamobile',type:'OSDC'},{name:'Tax Administration System',customer:'Bộ Tài Chính',type:'OSDC'},
  {name:'Electronic Health Record',customer:'Bộ Y Tế',type:'OSDC'},{name:'National Education Portal',customer:'Bộ GD&ĐT',type:'OSDC'},
  {name:'E-Government Services',customer:'UBND TP.HCM',type:'OSDC'},{name:'Smart City Platform',customer:'UBND Hà Nội',type:'OSDC'},
  {name:'Land Registry System',customer:'Bộ TN&MT',type:'OSDC'},{name:'Hospital Information System',customer:'Vinmec',type:'OSDC'},
  {name:'Laboratory Information System',customer:'Medlatec',type:'OSDC'},{name:'Patient Portal & Telemedicine',customer:'FV Hospital',type:'OSDC'},
  {name:'Pharmacy Management System',customer:'Long Châu',type:'OSDC'},{name:'Insurance Policy Management',customer:'Bảo Việt',type:'OSDC'},
  {name:'Claims Processing System',customer:'PVI Insurance',type:'OSDC'},{name:'Insurance Agent Portal',customer:'PTI Insurance',type:'OSDC'},
  {name:'E-commerce Platform',customer:'Tiki',type:'OSDC'},{name:'Marketplace Infrastructure',customer:'Shopee VN',type:'OSDC'},
  {name:'POS & Retail System',customer:'Lotte Mart',type:'OSDC'},{name:'Loyalty Program Platform',customer:'Aeon Mall',type:'OSDC'},
  {name:'Inventory & ERP System',customer:'BigC Vietnam',type:'OSDC'},{name:'Online Learning Platform',customer:'Topica Edtech',type:'OSDC'},
  {name:'Payment Gateway Integration',customer:'VNPay',type:'OSDC'},{name:'P2P Lending Platform',customer:'Timo',type:'OSDC'},
  {name:'Stock Trading Application',customer:'VPS Securities',type:'OSDC'},{name:'Fund Management System',customer:'Dragon Capital',type:'OSDC'},
  {name:'Transportation Management',customer:'GHN Express',type:'OSDC'},{name:'Last-Mile Delivery Tracking',customer:'GHTK',type:'OSDC'},
  {name:'Warehouse & Logistics System',customer:'ALS Logistics',type:'OSDC'},{name:'Port Management System',customer:'Cảng Sài Gòn',type:'OSDC'},
  {name:'Real Estate Portal',customer:'Batdongsan.vn',type:'OSDC'},{name:'Building Management System',customer:'Vinhomes',type:'OSDC'},
  {name:'Video Streaming Platform',customer:'VTV Digital',type:'OSDC'},{name:'News CMS Platform',customer:'VnExpress',type:'OSDC'},
  {name:'MES Manufacturing System',customer:'Hòa Phát Steel',type:'OSDC'},{name:'Quality Management System',customer:'Coats Vietnam',type:'OSDC'},
  // PKG products
  {name:'Loop ERP Core',customer:null,type:'PKG'},{name:'Loop HR Module',customer:null,type:'PKG'},
  {name:'Loop Finance Module',customer:null,type:'PKG'},{name:'Loop CRM Module',customer:null,type:'PKG'},
  {name:'Loop BPM Engine',customer:null,type:'PKG'},{name:'Loop Mobile App',customer:null,type:'PKG'},
  {name:'Loop Analytics Dashboard',customer:null,type:'PKG'},{name:'Loop Asset Management',customer:null,type:'PKG'},
  {name:'Loop Recruitment Module',customer:null,type:'PKG'},{name:'Loop API Gateway',customer:null,type:'PKG'},
  // More OSDC
  {name:'Digital Transformation Platform',customer:'FPT Software',type:'OSDC'},{name:'AI Document Processing',customer:'VNG Cloud',type:'OSDC'},
  {name:'Blockchain Land Records',customer:'Bộ TN&MT II',type:'OSDC'},{name:'IoT Smart Factory',customer:'Samsung Vietnam',type:'OSDC'},
  {name:'Data Lake Platform',customer:'Viettel Group',type:'OSDC'},{name:'Chatbot Customer Service',customer:'MB Bank II',type:'OSDC'},
  {name:'DevOps CI/CD Pipeline',customer:'VNG Corporation',type:'OSDC'},{name:'Multi-Cloud Architecture',customer:'Techcombank II',type:'OSDC'},
  {name:'API Management Platform',customer:'BIDV II',type:'OSDC'},{name:'Security Operations Center',customer:'VPBank II',type:'OSDC'},
  {name:'Digital Onboarding System',customer:'HDBank',type:'OSDC'},{name:'Card Management System',customer:'Sacombank',type:'OSDC'},
  {name:'ATM Monitoring System',customer:'OCB Bank',type:'OSDC'},{name:'Open Banking Platform',customer:'MSB Bank',type:'OSDC'},
  {name:'Core Insurance Platform',customer:'AIA Vietnam',type:'OSDC'},{name:'Life Insurance Portal',customer:'Prudential VN',type:'OSDC'},
  {name:'Medical Imaging System',customer:'Thu Cuc Hospital',type:'OSDC'},{name:'Dental Chain Management',customer:'Nha Khoa Kim',type:'OSDC'},
  {name:'Fitness App Platform',customer:'California Fitness',type:'OSDC'},{name:'Food Delivery Backend',customer:'Baemin VN',type:'OSDC'},
  {name:'Hotel PMS System',customer:'Marriott Vietnam',type:'OSDC'},{name:'Tourism Booking Platform',customer:'Vietravel',type:'OSDC'},
  {name:'Event Management System',customer:'VMO Events',type:'OSDC'},{name:'Construction ERP',customer:'Coteccons',type:'OSDC'},
  {name:'Energy Management System',customer:'EVN',type:'OSDC'},{name:'Water Utility System',customer:'SAWACO',type:'OSDC'},
  {name:'Fleet Telematics Platform',customer:'Mai Linh Taxi',type:'OSDC'},{name:'Aviation Ground System',customer:'Vietnam Airlines',type:'OSDC'},
  {name:'Port Cargo Tracking',customer:'Tân Cảng SG',type:'OSDC'},{name:'Customs Declaration System',customer:'Bộ Tài Chính II',type:'OSDC'},
  {name:'Trade Compliance Platform',customer:'VCCI',type:'OSDC'},{name:'Intellectual Property System',customer:'NOIP Vietnam',type:'OSDC'},
  {name:'Agricultural Supply Chain',customer:'Lộc Trời Group',type:'OSDC'},{name:'Fishery Management System',customer:'VASEP',type:'OSDC'},
  {name:'Coffee Chain Management',customer:'Highlands Coffee',type:'OSDC'},{name:'Convenience Store System',customer:'VinMart+',type:'OSDC'},
  {name:'Electric Vehicle Platform',customer:'VinFast EV',type:'OSDC'},{name:'Autonomous Vehicle Backend',customer:'VinAI',type:'OSDC'},
];

const TASK_TITLES = [
  'Phân tích yêu cầu nghiệp vụ','Thiết kế kiến trúc hệ thống','Thiết kế database schema',
  'Xây dựng API backend','Phát triển giao diện người dùng','Viết unit test',
  'Kiểm thử tích hợp','Triển khai CI/CD pipeline','Viết tài liệu kỹ thuật',
  'Code review và refactor','Tối ưu hóa hiệu năng','Xử lý bảo mật',
  'Setup môi trường staging','UAT với khách hàng','Deployment production',
  'Monitoring và alerting','Phân tích dữ liệu','Thiết kế UI/UX mockup',
  'Sprint planning','Retrospective meeting','Kick-off dự án',
  'Họp review tiến độ tuần','Cập nhật tài liệu yêu cầu','Xử lý bug critical',
  'Nâng cấp dependencies','Migrate database','Load testing',
];

const BUG_TITLES = [
  'Login không hoạt động trên Safari','Trang load chậm hơn 5 giây','Data không sync real-time',
  'Memory leak trong background task','SQL injection vulnerability','XSS trong form input',
  'Race condition khi concurrent request','Deadlock trong database transaction','API trả về 500 error',
  'File upload lỗi khi file > 10MB','Session timeout quá nhanh','Token refresh không hoạt động',
  'Pagination hiển thị sai tổng record','Filter không lọc đúng kết quả','Sort bị đảo ngược',
  'Export Excel thiếu dữ liệu','Email notification không gửi','Push notification delay',
  'Date format sai timezone','Số tiền làm tròn sai','Tính toán overtime sai',
  'Báo cáo tháng thiếu dữ liệu cuối tháng','Dashboard chart không cập nhật','Graph hiển thị âm',
  'Mobile layout bị vỡ trên iOS','Responsive design lỗi tablet','Dark mode màu sai',
  'Button submit bị disabled sai','Dropdown không hiển thị options','Modal không đóng được',
  'Form validation bỏ qua required field','Required field không báo lỗi','Upload ảnh không preview',
  'Quyền truy cập không chính xác','Admin xem được dữ liệu của user khác','CORS error từ frontend',
];

const ISSUE_TITLES = [
  'Yêu cầu thay đổi logic tính lương','CR: Thêm trường dữ liệu mới','CR: Thay đổi flow phê duyệt',
  'Rủi ro chậm tiến độ do thiếu resource','Phụ thuộc vào API bên thứ ba chưa sẵn sàng',
  'Yêu cầu nâng cấp server production','CR: Thay đổi thiết kế giao diện','Vấn đề tương thích browser cũ',
  'CR: Bổ sung tính năng export PDF','Rủi ro bảo mật cần xử lý ngay','CR: Thêm 2FA authentication',
  'Issue hiệu năng hệ thống giờ cao điểm','Yêu cầu tích hợp với hệ thống cũ','CR: Thêm audit log',
  'Vấn đề license third-party library','CR: Thay đổi cấu trúc API','Rủi ro data migration',
  'Yêu cầu backup tự động','CR: Cải thiện search performance','Issue GDPR compliance',
  'Yêu cầu hỗ trợ đa ngôn ngữ','CR: Thêm module báo cáo nâng cao',
];

const TECH_STACKS = [
  ['Java','Spring Boot','PostgreSQL'],['Node.js','NestJS','TypeScript'],['Python','FastAPI','Redis'],
  ['Go','Gin','MySQL'],['React','TypeScript','Redux'],['Vue.js','Nuxt.js','TypeScript'],
  ['React Native','TypeScript','Expo'],['Flutter','Dart','Firebase'],
  ['DevOps','Docker','Kubernetes'],['Python','TensorFlow','PyTorch'],
  ['.NET','C#','SQL Server'],['Angular','TypeScript','RxJS'],
  ['Spark','Kafka','Airflow'],['AWS','Lambda','DynamoDB'],['Scala','Akka','Cassandra'],
];

const LEVELS = ['JUNIOR','JUNIOR','JUNIOR','MID','MID','MID','SENIOR','SENIOR','EXPERT'];

// ─── Customers (CRM) ─────────────────────────────────────────────────────────
const CRM_CUSTOMERS = [
  {code:'CUST-001',name:'Vietcombank',industry:'Banking',website:'www.vietcombank.vn',taxCode:'0100112437'},
  {code:'CUST-002',name:'Techcombank',industry:'Banking',website:'www.techcombank.com.vn',taxCode:'0100230588'},
  {code:'CUST-003',name:'VinGroup',industry:'Conglomerate',website:'www.vingroup.net',taxCode:'0101245486'},
  {code:'CUST-004',name:'Viettel Group',industry:'Telecom',website:'www.viettel.vn',taxCode:'0100109106'},
  {code:'CUST-005',name:'FPT Software',industry:'IT Services',website:'www.fpt-software.com',taxCode:'0101245500'},
  {code:'CUST-006',name:'Tiki Corporation',industry:'E-commerce',website:'www.tiki.vn',taxCode:'0312600386'},
  {code:'CUST-007',name:'VNG Corporation',industry:'Technology',website:'www.vng.com.vn',taxCode:'0302472904'},
  {code:'CUST-008',name:'Masan Group',industry:'FMCG',website:'www.masangroup.com',taxCode:'0301116908'},
  {code:'CUST-009',name:'Bảo Việt Group',industry:'Insurance',website:'www.baoviet.com.vn',taxCode:'0100111761'},
  {code:'CUST-010',name:'Vinmec Healthcare',industry:'Healthcare',website:'www.vinmec.com',taxCode:'0101553485'},
  {code:'CUST-011',name:'BIDV',industry:'Banking',website:'www.bidv.com.vn',taxCode:'0100150619'},
  {code:'CUST-012',name:'Sacombank',industry:'Banking',website:'www.sacombank.com',taxCode:'0301103894'},
  {code:'CUST-013',name:'Long Châu Pharmacy',industry:'Retail Pharmacy',website:'www.nhathuoclongchau.com',taxCode:'0314158743'},
  {code:'CUST-014',name:'GHN Express',industry:'Logistics',website:'www.ghn.vn',taxCode:'0312572800'},
  {code:'CUST-015',name:'VNPT Group',industry:'Telecom',website:'www.vnpt.vn',taxCode:'0100686209'},
  {code:'CUST-016',name:'Vietnam Airlines',industry:'Aviation',website:'www.vietnamairlines.com',taxCode:'0100107518'},
  {code:'CUST-017',name:'Highlands Coffee',industry:'F&B',website:'www.highlandscoffee.com.vn',taxCode:'0300594946'},
  {code:'CUST-018',name:'Coteccons Group',industry:'Construction',website:'www.coteccons.vn',taxCode:'0303540684'},
  {code:'CUST-019',name:'Dragon Capital',industry:'Finance',website:'www.dragoncapital.com',taxCode:'0302100553'},
  {code:'CUST-020',name:'VPS Securities',industry:'Finance',website:'www.vps.com.vn',taxCode:'0100783903'},
];

const JOB_OPENINGS_DEF = [
  {code:'JOB-001',title:'Senior Backend Engineer (Java)',level:'SENIOR',headcount:3,req:'5+ năm Java/Spring, microservices, PostgreSQL'},
  {code:'JOB-002',title:'Frontend Engineer (React/TypeScript)',level:'MID',headcount:5,req:'3+ năm React, TypeScript, Ant Design'},
  {code:'JOB-003',title:'Mobile Developer (React Native)',level:'MID',headcount:2,req:'2+ năm React Native, iOS/Android'},
  {code:'JOB-004',title:'DevOps Engineer (Kubernetes)',level:'SENIOR',headcount:2,req:'5+ năm DevOps, K8s, Terraform, AWS/GCP'},
  {code:'JOB-005',title:'Data Engineer (Spark/Kafka)',level:'SENIOR',headcount:2,req:'5+ năm Big Data, Spark, Kafka, Airflow'},
  {code:'JOB-006',title:'QA Engineer (Automation)',level:'MID',headcount:4,req:'3+ năm Selenium/Playwright, CI/CD integration'},
  {code:'JOB-007',title:'Business Analyst',level:'MID',headcount:3,req:'3+ năm BA, BPMN, SQL, finance/banking domain'},
  {code:'JOB-008',title:'Project Manager (PMP)',level:'SENIOR',headcount:2,req:'5+ năm PM, PMP certified, Agile/Scrum'},
  {code:'JOB-009',title:'UX Designer',level:'MID',headcount:2,req:'3+ năm UX Research, Figma, usability testing'},
  {code:'JOB-010',title:'Security Engineer',level:'SENIOR',headcount:1,req:'5+ năm security, OWASP, penetration testing'},
  {code:'JOB-011',title:'Full Stack Developer (.NET)',level:'MID',headcount:4,req:'3+ năm .NET Core, React, SQL Server'},
  {code:'JOB-012',title:'Python AI/ML Engineer',level:'SENIOR',headcount:2,req:'4+ năm Python, TensorFlow/PyTorch, MLOps'},
  {code:'JOB-013',title:'Solution Architect',level:'EXPERT',headcount:1,req:'8+ năm kiến trúc enterprise, cloud native'},
  {code:'JOB-014',title:'HR Business Partner',level:'MID',headcount:1,req:'3+ năm HRBP, talent management'},
  {code:'JOB-015',title:'Financial Controller',level:'SENIOR',headcount:1,req:'5+ năm finance, CPA/ACCA, IFRS'},
];

const ASSET_DEFS = [
  {prefix:'LAPTOP',   category:'LAPTOP',   brand:'Dell',     model:'XPS 15',          depYears:3},
  {prefix:'LAPTOP',   category:'LAPTOP',   brand:'MacBook',  model:'Pro M3',          depYears:3},
  {prefix:'LAPTOP',   category:'LAPTOP',   brand:'Lenovo',   model:'ThinkPad X1',     depYears:3},
  {prefix:'DESKTOP',  category:'DESKTOP',  brand:'HP',       model:'EliteDesk 800',   depYears:4},
  {prefix:'PHONE',    category:'PHONE',    brand:'iPhone',   model:'15 Pro',          depYears:2},
  {prefix:'PHONE',    category:'PHONE',    brand:'Samsung',  model:'Galaxy S24',      depYears:2},
  {prefix:'MONITOR',  category:'PERIPHERAL',brand:'LG',      model:'27UK850',         depYears:5},
  {prefix:'MONITOR',  category:'PERIPHERAL',brand:'Dell',    model:'U2722D',          depYears:5},
  {prefix:'SERVER',   category:'SERVER',   brand:'Dell',     model:'PowerEdge R750',  depYears:5},
  {prefix:'SERVER',   category:'SERVER',   brand:'HP',       model:'ProLiant DL380',  depYears:5},
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  await db.connect();
  console.log('✅ Connected to database');

  // ── 1. Clear all data except org_units (disable FK to avoid constraint issues) ───────────────────
  console.log('🗑  Clearing old data...');
  // Disable FK constraints, truncate all tables, re-enable
  try {
    await db.query('SET session_replication_role = replica');
    const result = await db.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname='public' AND tablename != 'org_units'
      ORDER BY tablename
    `);
    for (const row of result.rows) {
      await db.query(`DELETE FROM "${row.tablename}"`);
    }
    await db.query('SET session_replication_role = default');
  } catch (err) {
    console.warn('  ⚠ FK constraint bypass attempt failed, using explicit order...');
    const CLEAR_ORDER = [
      'audit_logs', 'telegram_messages', 'time_logs',
      'bug_tasks', 'bug_tags', 'bug_comments', 'bug_attachments',
      'notifications', 'push_tokens', 'work_statuses', 'time_entries', 'timesheet_records',
      'alert_configs', 'asset_maintenance', 'asset_assignments', 'assets',
      'interviews', 'candidates', 'job_openings',
      'invoice_items', 'invoices',
      'expense_items', 'leave_balances', 'leave_requests',
      'payroll_records', 'payroll_periods',
      'position_histories', 'work_histories',
      'bugs', 'expenses',
      'deals', 'leads', 'contacts',
      'client_contracts', 'customer_portals', 'customers',
      'contracts', 'employee_rates', 'allocations',
      'tasks', 'processes',
      'process_activity_logs', 'process_user_tasks', 'process_instances', 'process_definitions',
      'leave_types', 'employees', 'projects',
      'group_org_access', 'group_memberships', 'group_permissions', 'user_groups',
      'module_role_permissions', 'user_module_roles', 'module_roles',
      'user_permissions', 'role_permissions', 'screens', 'permissions', 'users',
    ];
    for (const t of CLEAR_ORDER) {
      try { await db.query(`DELETE FROM "${t}"`); } catch (e) { console.warn(`  ⚠ Could not clear ${t}`); }
    }
  }
  console.log('  ✓ All tables cleared (org_units preserved)');

  // ── 2. Upsert org_units ─────────────────────────────────────────────────────
  console.log('🏢 Seeding org units...');
  const orgMap = {}; // code → id
  for (const o of ORG_DEF) {
    const parentId = o.parent ? orgMap[o.parent] : null;
    // org_units được preserve qua bước clear → SELECT-or-INSERT theo code
    // (unique constraint là (tenant_id, code) nên không dùng ON CONFLICT (code) được)
    const existing = await db.query(`SELECT id FROM org_units WHERE code = $1 LIMIT 1`, [o.code]);
    let res;
    if (existing.rows.length > 0) {
      res = await db.query(
        `UPDATE org_units SET name=$2, parent_id=$3, level=$4, updated_at=NOW() WHERE id=$1 RETURNING id`,
        [existing.rows[0].id, o.name, parentId, o.level]
      );
    } else {
      res = await db.query(
        `INSERT INTO org_units (id, name, code, parent_id, level, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,NOW(),NOW()) RETURNING id`,
        [uid(), o.name, o.code, parentId, o.level]
      );
    }
    orgMap[o.code] = res.rows[0].id;
  }
  console.log(`  ✓ ${ORG_DEF.length} org units upserted`);

  // ── 3. Seed permissions ─────────────────────────────────────────────────────
  console.log('🔑 Seeding permissions...');
  await bulk('permissions', ['code','module','action','description','created_at'],
    ALL_PERMS.map(p => ({ code:p.code, module:p.module, action:p.action, description:p.description, created_at:new Date() }))
  );

  for (const [role, codes] of Object.entries(ROLE_PERMS)) {
    await bulk('role_permissions', ['role','permission_code','created_at'],
      codes.map(c => ({ role, permission_code:c, created_at:new Date() }))
    );
  }

  for (const mr of MODULE_ROLES) {
    await db.query(
      `INSERT INTO module_roles (code,name,domain,description,is_system,created_at) VALUES ($1,$2,$3,$4,$5,NOW()) ON CONFLICT DO NOTHING`,
      [mr.code, mr.name, mr.domain, mr.description, mr.isSystem]
    );
  }
  for (const [rc, codes] of Object.entries(MODULE_ROLE_PERMS)) {
    await bulk('module_role_permissions', ['role_code','permission_code','created_at'],
      codes.map(c => ({ role_code:rc, permission_code:c, created_at:new Date() }))
    );
  }
  console.log(`  ✓ ${ALL_PERMS.length} permissions, role mappings, ${MODULE_ROLES.length} module roles`);

  // ── 4. Hash passwords ───────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin', 12);
  const demoHash  = await bcrypt.hash('Demo@1234', 12);

  // ── 5. System users ─────────────────────────────────────────────────────────
  console.log('👤 Creating system users...');
  const SYS_USERS = [
    { email:'admin@loop.vn',    name:'Nguyễn Văn Admin',  role:'ADMIN',      org:'ROOT',  hash:adminHash },
    { email:'pm@loop.vn',       name:'Trần Thị PM',        role:'PM',         org:'PM_T',  hash:adminHash },
    { email:'hr@loop.vn',       name:'Lê Thị Hoa',         role:'MEMBER',     org:'HRD',   hash:demoHash  },
    { email:'finance@loop.vn',  name:'Phạm Văn Tài',       role:'MEMBER',     org:'FIN',   hash:demoHash  },
    { email:'user.demo@loop.vn',name:'Demo User',           role:'MEMBER',     org:'BE',    hash:demoHash  },
  ];
  // 10 PMs
  for (let i = 2; i <= 10; i++) SYS_USERS.push({ email:`pm${i}@loop.vn`, name:genName(i*7), role:'PM', org:'PM_T', hash:demoHash });
  // 3 HR
  for (let i = 2; i <= 4; i++) SYS_USERS.push({ email:`hr${i}@loop.vn`, name:genName(i*11), role:'MEMBER', org:'HRD', hash:demoHash });
  // 2 Finance
  for (let i = 2; i <= 3; i++) SYS_USERS.push({ email:`finance${i}@loop.vn`, name:genName(i*13), role:'MEMBER', org:'FIN', hash:demoHash });
  // 30 developers
  for (let i = 1; i <= 30; i++) {
    const orgCodes = ['BE','FE','MOBILE','QA','JAVA','NET'];
    SYS_USERS.push({ email:`dev${i}@loop.vn`, name:genName(i*3+20), role:'MEMBER', org:orgCodes[i % orgCodes.length], hash:demoHash });
  }

  const userIdMap = {}; // email → id
  const userRows = SYS_USERS.map(u => ({
    id:uid(), email:u.email, password_hash:u.hash, name:u.name,
    role:u.role, org_unit_id:orgMap[u.org], is_active:true,
    created_at:new Date(), updated_at:new Date(),
  }));
  await bulk('users', ['id','email','password_hash','name','role','org_unit_id','is_active','created_at','updated_at'], userRows);
  for (let i = 0; i < SYS_USERS.length; i++) userIdMap[SYS_USERS[i].email] = userRows[i].id;
  console.log(`  ✓ ${SYS_USERS.length} system users created`);

  // ── 6. 500 Employees (EMP001-EMP500) ────────────────────────────────────────
  console.log('👥 Creating 500 employees...');
  const leafOrgIds = LEAF_CODES.map(c => orgMap[c]).filter(Boolean);
  const allEmpRows = [];
  const empIdByCode = {};
  const empHasUser = {}; // empCode → userId

  // First 50: linked to system users
  const linkedUsers = SYS_USERS.slice(0, 50);
  for (let i = 0; i < linkedUsers.length; i++) {
    const u = linkedUsers[i];
    const code = `EMP${String(i+1).padStart(3,'0')}`;
    const empId = uid();
    empIdByCode[code] = empId;
    empHasUser[code] = userIdMap[u.email];
    allEmpRows.push({
      id:empId, code, user_id:userIdMap[u.email], full_name:u.name,
      level:LEVELS[i % LEVELS.length],
      org_unit_id: orgMap[u.org] || leafOrgIds[i % leafOrgIds.length],
      start_date: fmtDate(randDate('2019-01-01','2024-06-01')),
      is_active: true, created_at:new Date(), updated_at:new Date(),
      tech_stack: pick(TECH_STACKS),
    });
  }

  // EMP051-EMP500: employee only (no user account)
  for (let i = 50; i < 500; i++) {
    const code = `EMP${String(i+1).padStart(3,'0')}`;
    const empId = uid();
    empIdByCode[code] = empId;
    const orgId = leafOrgIds[i % leafOrgIds.length];
    const joinDate = randDate('2018-01-01','2025-01-01');
    allEmpRows.push({
      id:empId, code, user_id:null, full_name:genName(i),
      level:LEVELS[i % LEVELS.length],
      org_unit_id:orgId,
      start_date: fmtDate(joinDate),
      is_active: i < 480, // 20 đã nghỉ
      created_at:new Date(), updated_at:new Date(),
      tech_stack: pick(TECH_STACKS),
    });
  }

  await bulk('employees',
    ['id','code','user_id','full_name','level','org_unit_id','start_date','is_active','created_at','updated_at','tech_stack'],
    allEmpRows
  );
  console.log(`  ✓ 500 employees created (${linkedUsers.length} with user accounts)`);

  // ── 7. Employee Rates ────────────────────────────────────────────────────────
  console.log('💰 Creating employee rates...');
  const RATE_BY_LEVEL = { JUNIOR:800_000, MID:1_200_000, SENIOR:1_800_000, EXPERT:2_500_000 };
  const rateRows = allEmpRows.map(e => ({
    id:uid(), employee_id:e.id,
    rate_per_day: RATE_BY_LEVEL[e.level] || 1_000_000,
    currency:'VND',
    effective_date: fmtDate(addMonths(new Date(e.start_date), 3)),
    created_at: new Date(),
  }));
  await bulk('employee_rates', ['id','employee_id','rate_per_day','currency','effective_date','created_at'], rateRows);
  console.log(`  ✓ ${rateRows.length} employee rates created`);

  // ── 8. Contracts ─────────────────────────────────────────────────────────────
  console.log('📝 Creating contracts...');
  const SALARY_BY_LEVEL = { JUNIOR:12_000_000, MID:20_000_000, SENIOR:35_000_000, EXPERT:55_000_000 };
  const contractRows = [];
  for (const e of allEmpRows) {
    const base = SALARY_BY_LEVEL[e.level] || 15_000_000;
    const salary = base + rand(-2_000_000, 5_000_000);
    const startDate = new Date(e.start_date);
    // Probation contract (2 tháng)
    const probEnd = addMonths(startDate, 2);
    contractRows.push({
      id:uid(), employee_id:e.id, type:'PROBATION', status:'EXPIRED',
      start_date: fmtDate(startDate), end_date: fmtDate(probEnd),
      salary_monthly: salary * 0.85, currency:'VND',
      signed_at: fmtDate(startDate),
      created_at:new Date(), updated_at:new Date(),
    });
    // Full-time contract
    const ftStart = addDays(probEnd, 1);
    const ftEnd   = addMonths(ftStart, rand(12, 24));
    const isActive = ftEnd > new Date() && e.is_active;
    contractRows.push({
      id:uid(), employee_id:e.id, type:'FULL_TIME',
      status: isActive ? 'ACTIVE' : (e.is_active ? 'ACTIVE' : 'EXPIRED'),
      start_date: fmtDate(ftStart), end_date: fmtDate(ftEnd),
      salary_monthly: salary, currency:'VND',
      signed_at: fmtDate(ftStart),
      created_at:new Date(), updated_at:new Date(),
    });
  }
  await bulk('contracts',
    ['id','employee_id','type','status','start_date','end_date','salary_monthly','currency','signed_at','created_at','updated_at'],
    contractRows
  );
  console.log(`  ✓ ${contractRows.length} contracts created`);

  // ── 9. 100 Projects ──────────────────────────────────────────────────────────
  console.log('📦 Creating 100 projects...');
  const pmUserIds = SYS_USERS.filter(u => u.role === 'PM').map(u => userIdMap[u.email]);
  const projStatuses = ['PLANNING','PLANNING','ACTIVE','ACTIVE','ACTIVE','ACTIVE','ON_HOLD','CLOSED'];
  const projRows = [];
  for (let i = 0; i < 100; i++) {
    const def = PROJECT_DEFS[i] || { name:`Project ${i+1}`, customer:`Customer ${i}`, type:'OSDC' };
    const start = randDate('2023-01-01','2025-06-01');
    const end   = addMonths(start, rand(6, 24));
    const orgId = leafOrgIds[i % leafOrgIds.length];
    projRows.push({
      id: uid(),
      name: def.name, code: `PRJ-${String(i+1).padStart(3,'0')}`,
      type: def.type, status: pick(projStatuses),
      pm_id: pmUserIds[i % pmUserIds.length],
      org_unit_id: orgId,
      start_date: fmtDate(start), end_date: fmtDate(end),
      customer: def.customer || null,
      budget_hours: rand(500, 5000),
      budget_cost: rand(500_000_000, 5_000_000_000),
      budget_effort_mm: rand(10, 100),
      currency: 'VND', progress: rand(0, 100),
      description: `Dự án ${def.name} — ${def.customer || 'nội bộ'}`,
      created_at:new Date(), updated_at:new Date(),
    });
  }
  await bulk('projects',
    ['id','name','code','type','status','pm_id','org_unit_id','start_date','end_date','customer','budget_hours','budget_cost','budget_effort_mm','currency','progress','description','created_at','updated_at'],
    projRows
  );
  console.log(`  ✓ ${projRows.length} projects created`);

  // ── 10. Allocations (5–8 members per project) ────────────────────────────────
  console.log('🔗 Creating allocations...');
  const allocRows = [];
  const empIds = allEmpRows.map(e => e.id);
  for (const p of projRows) {
    const memberCount = rand(4, 9);
    const chosen = shuffle(empIds).slice(0, memberCount);
    for (const eId of chosen) {
      const emp = allEmpRows.find(e => e.id === eId);
      allocRows.push({
        id:uid(), project_id:p.id, employee_id:eId, role:'MEMBER',
        level: emp ? emp.level : 'MID',
        allocation_pct: pick([50,75,100]),
        rate_per_day: RATE_BY_LEVEL[emp?.level || 'MID'],
        start_date: p.start_date, end_date: p.end_date,
        created_at:new Date(), updated_at:new Date(),
      });
    }
  }
  await bulk('allocations',
    ['id','project_id','employee_id','role','level','allocation_pct','rate_per_day','start_date','end_date','created_at','updated_at'],
    allocRows
  );
  console.log(`  ✓ ${allocRows.length} allocations created`);

  // ── 11. 1000 Tasks ────────────────────────────────────────────────────────────
  console.log('✅ Creating 1000 tasks...');
  const taskStatuses = ['TODO','TODO','IN_PROGRESS','IN_PROGRESS','DONE','DONE','PENDING_APPROVAL','RETURNED','CANCELLED'];
  const taskRows = [];
  const parentTaskIds = [];

  // 100 parent tasks (1 per project)
  for (const p of projRows) {
    const tId = uid();
    parentTaskIds.push({ id:tId, projectId:p.id });
    const emp = pick(allEmpRows.filter(e => e.is_active));
    taskRows.push({
      id:tId, project_id:p.id, parent_id:null, level:1,
      title: `[${p.code}] ${pick(TASK_TITLES)}`,
      description: 'Epic task chính của dự án',
      status: pick(taskStatuses),
      assignee_id: emp.id,
      approver_id: null,
      start_date: p.start_date,
      due_date: fmtDate(addMonths(new Date(p.start_date), rand(1,3))),
      estimate_hours: rand(40, 200), actual_hours: rand(0, 180),
      progress: rand(0,100), position:0,
      created_at:new Date(), updated_at:new Date(),
    });
  }

  // 900 child tasks (9 per project)
  let taskPos = 0;
  for (const parent of parentTaskIds) {
    for (let i = 0; i < 9; i++) {
      const emp = pick(allEmpRows.filter(e => e.is_active));
      const proj = projRows.find(p => p.id === parent.projectId);
      taskRows.push({
        id:uid(), project_id:parent.projectId, parent_id:parent.id, level:2,
        title: pick(TASK_TITLES),
        description: null,
        status: pick(taskStatuses),
        assignee_id: emp.id,
        approver_id: null,
        start_date: proj ? proj.start_date : fmtDate(new Date('2025-01-01')),
        due_date: fmtDate(addDays(new Date(), rand(-30,90))),
        estimate_hours: rand(4, 40), actual_hours: rand(0, 35),
        progress: rand(0,100), position: i+1,
        created_at:new Date(), updated_at:new Date(),
      });
    }
  }
  await bulk('tasks',
    ['id','project_id','parent_id','level','title','description','status','assignee_id','approver_id','start_date','due_date','estimate_hours','actual_hours','progress','position','created_at','updated_at'],
    taskRows
  );
  console.log(`  ✓ ${taskRows.length} tasks created`);

  // ── 12. 1000 Bugs + 200 Issues ────────────────────────────────────────────────
  console.log('🐛 Creating 1000 bugs + 200 issues...');
  const bugStatuses = ['OPEN','OPEN','IN_PROGRESS','IN_PROGRESS','RESOLVED','CLOSED','PENDING_REVIEW','APPROVED','REJECTED','CANCELLED'];
  const severities  = ['CRITICAL','HIGH','HIGH','MEDIUM','MEDIUM','MEDIUM','LOW','LOW'];
  const modules     = ['Frontend','Backend','API','Database','Mobile','Security','Payment','Auth','Notification','Report'];
  const bugRows     = [];
  const activeUsers = SYS_USERS.map(u => userIdMap[u.email]);

  for (let i = 0; i < 1200; i++) {
    const isIssue  = i >= 1000;
    const proj     = pick(projRows);
    const reporter = pick(activeUsers);
    const assignee = pick(activeUsers);
    const status   = pick(bugStatuses);
    const now      = new Date();
    bugRows.push({
      id:uid(), project_id:proj.id,
      reporter_id:reporter, assignee_id:assignee,
      title: isIssue ? pick(ISSUE_TITLES) : pick(BUG_TITLES),
      description: isIssue ? 'Issue / Change Request cần xử lý' : 'Bug cần fix',
      severity: pick(severities),
      status,
      item_type: isIssue ? 'ISSUE' : 'BUG',
      affected_module: pick(modules),
      is_cr: isIssue && Math.random() > 0.5,
      due_date: fmtDate(addDays(now, rand(-10, 60))),
      estimated_hours: rand(1, 16),
      resolved_at: status === 'RESOLVED' || status === 'CLOSED' ? fmtDate(addDays(now,-rand(1,30))) : null,
      closed_at:   status === 'CLOSED'   ? fmtDate(addDays(now,-rand(1,20))) : null,
      approved_at: status === 'APPROVED' ? fmtDate(addDays(now,-rand(1,10))) : null,
      resolution_note: status === 'RESOLVED' || status === 'CLOSED' ? 'Đã fix và deploy' : null,
      created_at:now, updated_at:now,
    });
  }
  await bulk('bugs',
    ['id','project_id','reporter_id','assignee_id','title','description','severity','status','item_type','affected_module','is_cr','due_date','estimated_hours','resolved_at','closed_at','approved_at','resolution_note','created_at','updated_at'],
    bugRows
  );
  console.log(`  ✓ 1000 bugs + 200 issues created`);

  // ── 13. Leave Types + Balances + Requests ─────────────────────────────────────
  console.log('🏖  Creating leave data...');
  const leaveTypes = [
    { id:uid(), name:'Nghỉ phép năm',    maxDays:12, isPaid:true,  color:'#2563EB', processKey:'leave-approval' },
    { id:uid(), name:'Nghỉ bệnh',        maxDays:10, isPaid:true,  color:'#DC2626', processKey:'leave-approval' },
    { id:uid(), name:'Nghỉ thai sản',    maxDays:180,isPaid:true,  color:'#7C3AED', processKey:'leave-approval' },
    { id:uid(), name:'Nghỉ không lương', maxDays:30, isPaid:false, color:'#64748B', processKey:'leave-approval' },
    { id:uid(), name:'Nghỉ lễ bổ sung',  maxDays:3,  isPaid:true,  color:'#16A34A', processKey:null },
  ];
  await bulk('leave_types',
    ['id','name','max_days_per_year','is_paid','color','is_active','process_definition_key','created_at'],
    leaveTypes.map(l => ({ id:l.id, name:l.name, max_days_per_year:l.maxDays, is_paid:l.isPaid, color:l.color, is_active:true, process_definition_key:l.processKey, created_at:new Date() }))
  );

  // Leave balances: 200 active employees, all 5 types, year 2026
  const balanceRows = [];
  const activeEmps = allEmpRows.filter(e => e.is_active).slice(0, 200);
  for (const e of activeEmps) {
    for (const lt of leaveTypes) {
      balanceRows.push({
        id:uid(), employee_id:e.id, leave_type_id:lt.id, year:2026,
        total_days: lt.maxDays, used_days: rand(0, Math.min(lt.maxDays, 5)),
      });
    }
  }
  await bulk('leave_balances', ['id','employee_id','leave_type_id','year','total_days','used_days'], balanceRows);

  // Leave requests: 300 requests
  const leaveReqRows = [];
  for (let i = 0; i < 300; i++) {
    const emp  = pick(activeEmps);
    const lt   = pick(leaveTypes);
    const hrId = userIdMap['hr@loop.vn'];
    const start= randDate('2026-01-01','2026-12-31');
    const end  = addDays(start, rand(0, 5));
    const st   = pick(['PENDING','PENDING','APPROVED','APPROVED','REJECTED','CANCELLED']);
    leaveReqRows.push({
      id:uid(), employee_id:emp.id, leave_type_id:lt.id,
      start_date:fmtDate(start), end_date:fmtDate(end),
      days: Math.min(rand(1,5), lt.maxDays),
      reason:'Lý do cá nhân', status:st,
      approved_by_id: st==='APPROVED'||st==='REJECTED' ? hrId : null,
      approved_at:    st==='APPROVED' ? fmtDate(addDays(start,-1)) : null,
      rejected_reason:st==='REJECTED' ? 'Thiếu nhân lực trong thời gian này' : null,
      created_at:new Date(), updated_at:new Date(),
    });
  }
  await bulk('leave_requests',
    ['id','employee_id','leave_type_id','start_date','end_date','days','reason','status','approved_by_id','approved_at','rejected_reason','created_at','updated_at'],
    leaveReqRows
  );
  console.log(`  ✓ ${leaveTypes.length} leave types, ${balanceRows.length} balances, ${leaveReqRows.length} requests`);

  // ── 14. Payroll ───────────────────────────────────────────────────────────────
  console.log('💵 Creating payroll data...');
  const adminId = userIdMap['admin@loop.vn'];
  const payPeriods = [
    { name:'Tháng 11/2025', start:'2025-11-01', end:'2025-11-30', status:'PAID' },
    { name:'Tháng 12/2025', start:'2025-12-01', end:'2025-12-31', status:'PAID' },
    { name:'Tháng 1/2026',  start:'2026-01-01', end:'2026-01-31', status:'PAID' },
    { name:'Tháng 2/2026',  start:'2026-02-01', end:'2026-02-28', status:'PAID' },
    { name:'Tháng 3/2026',  start:'2026-03-01', end:'2026-03-31', status:'APPROVED' },
    { name:'Tháng 4/2026',  start:'2026-04-01', end:'2026-04-30', status:'APPROVED' },
    { name:'Tháng 5/2026',  start:'2026-05-01', end:'2026-05-31', status:'PROCESSING' },
  ];
  const ppIds = [];
  for (const pp of payPeriods) {
    const id = uid();
    ppIds.push({ id, ...pp });
    await db.query(
      `INSERT INTO payroll_periods (id,name,start_date,end_date,status,processed_by_id,processed_at,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()) ON CONFLICT DO NOTHING`,
      [id, pp.name, pp.start, pp.end, pp.status, adminId, new Date()]
    );
  }

  // Payroll records: 500 employees × 7 months = 3500 records (batch)
  const payrollRows = [];
  for (const period of ppIds) {
    for (const e of allEmpRows.filter(e => e.is_active)) {
      const rate = RATE_BY_LEVEL[e.level] || 1_000_000;
      const workDays = rand(19, 22);
      const leaveDays = rand(0, 2);
      const ot = rand(0, 20);
      const base = workDays * rate;
      const bonus = Math.random() > 0.7 ? rand(500_000, 3_000_000) : 0;
      const deductions = Math.floor(base * 0.105); // BHXH ~10.5%
      payrollRows.push({
        id:uid(), period_id:period.id, employee_id:e.id,
        work_days: workDays, leave_days: leaveDays,
        overtime_hours: ot, base_salary: base,
        deductions, bonus, net_salary: base + bonus - deductions,
      });
    }
  }
  await bulk('payroll_records',
    ['id','period_id','employee_id','work_days','leave_days','overtime_hours','base_salary','deductions','bonus','net_salary'],
    payrollRows
  );
  console.log(`  ✓ ${ppIds.length} payroll periods, ${payrollRows.length} records`);

  // ── 15. Timesheet Records ────────────────────────────────────────────────────
  console.log('📅 Creating timesheet records...');
  const tsMonths = [
    { start:'2026-03-01', end:'2026-03-31' },
    { start:'2026-04-01', end:'2026-04-30' },
    { start:'2026-05-01', end:'2026-05-31' },
  ];
  const tsStatuses = ['APPROVED','APPROVED','SUBMITTED','DRAFT'];
  const tsRows = [];
  const tsUsers = SYS_USERS.map(u => userIdMap[u.email]);
  for (const m of tsMonths) {
    for (const uId of tsUsers) {
      const st = pick(tsStatuses);
      tsRows.push({
        id:uid(), user_id:uId,
        period_start:m.start, period_end:m.end,
        working_days: rand(19,22), standard_days: 22,
        overtime_hours: rand(0,16), leave_days: rand(0,3),
        status: st,
        submitted_at: st!=='DRAFT' ? fmtDate(new Date(m.end)) : null,
        approved_at:  st==='APPROVED' ? fmtDate(addDays(new Date(m.end),3)) : null,
        approved_by_id: st==='APPROVED' ? adminId : null,
        created_at:new Date(), updated_at:new Date(),
      });
    }
  }
  await bulk('timesheet_records',
    ['id','user_id','period_start','period_end','working_days','standard_days','overtime_hours','leave_days','status','submitted_at','approved_at','approved_by_id','created_at','updated_at'],
    tsRows
  );
  console.log(`  ✓ ${tsRows.length} timesheet records`);

  // ── 16. Expenses ─────────────────────────────────────────────────────────────
  console.log('🧾 Creating expenses...');
  const expCategories = ['TRAVEL','MEALS','EQUIPMENT','SOFTWARE','TRAINING','OTHER'];
  const expStatuses   = ['PENDING','APPROVED','APPROVED','REJECTED','PAID'];
  const expRows = [];
  const expItemRows = [];
  for (let i = 0; i < 150; i++) {
    const proj = Math.random() > 0.3 ? pick(projRows) : null;
    const uid_ = pick(activeUsers);
    const st   = pick(expStatuses);
    const total = rand(500_000, 20_000_000);
    const expId = uid();
    expRows.push({
      id:expId, project_id:proj?.id||null, submitted_by_id:uid_,
      title:`Chi phí ${pick(['xuất công tác','mua thiết bị','đào tạo','họp khách hàng'])} tháng ${rand(1,12)}/2026`,
      category:pick(expCategories), total_amount:total, currency:'VND', status:st,
      approved_by_id: st==='APPROVED'||st==='PAID' ? adminId : null,
      approved_at:    st==='APPROVED'||st==='PAID' ? fmtDate(new Date()) : null,
      created_at:new Date(), updated_at:new Date(),
    });
    const itemCount = rand(1,4);
    for (let j = 0; j < itemCount; j++) {
      expItemRows.push({
        id:uid(), expense_id:expId,
        description:pick(['Vé máy bay','Khách sạn','Ăn uống','Taxi','Mua phần mềm','Khóa học']),
        amount: Math.floor(total / itemCount),
      });
    }
  }
  await bulk('expenses', ['id','project_id','submitted_by_id','title','category','total_amount','currency','status','approved_by_id','approved_at','created_at','updated_at'], expRows);
  await bulk('expense_items', ['id','expense_id','description','amount'], expItemRows);
  console.log(`  ✓ ${expRows.length} expenses, ${expItemRows.length} items`);

  // ── 17. CRM: Customers, Contacts, Leads, Deals ───────────────────────────────
  console.log('💼 Creating CRM data...');
  const custIds = [];
  const custRows = CRM_CUSTOMERS.map(c => {
    const id = uid();
    custIds.push(id);
    return { id, code:c.code, name:c.name, industry:c.industry, website:c.website, tax_code:c.taxCode, created_at:new Date(), updated_at:new Date() };
  });
  await bulk('customers', ['id','code','name','industry','website','tax_code','created_at','updated_at'], custRows);

  const contactRows = [];
  const contactIds  = [];
  for (let i = 0; i < 60; i++) {
    const id = uid();
    contactIds.push(id);
    contactRows.push({
      id, name:genName(i+600), email:`contact${i+1}@${['gmail.com','yahoo.com','work.vn'][i%3]}`,
      phone:`09${String(rand(10000000,99999999))}`, title:pick(['CTO','CEO','IT Manager','PM','BA Lead']),
      customer_id:pick(custIds), created_at:new Date(), updated_at:new Date(),
    });
  }
  await bulk('contacts', ['id','name','email','phone','title','customer_id','created_at','updated_at'], contactRows);

  const leadSrcs   = ['WEBSITE','REFERRAL','SOCIAL','EVENT','COLD_OUTREACH','OTHER'];
  const leadSts    = ['NEW','CONTACTED','CONTACTED','QUALIFIED','CONVERTED','LOST'];
  const salesUsers = SYS_USERS.filter(u=>u.role==='PM'||u.role==='MEMBER').map(u=>userIdMap[u.email]);
  const leadRows   = [];
  for (let i = 0; i < 120; i++) {
    leadRows.push({
      id:uid(), title:`Lead: ${pick(['ERP','Mobile App','Cloud Migration','Digital Transformation','AI Solution'])} cho ${genName(i+700)}`,
      contact_id:contactIds[i%contactIds.length],
      source:pick(leadSrcs), status:pick(leadSts),
      estimated_value:rand(100_000_000,5_000_000_000),
      currency:'VND', assignee_id:pick(salesUsers),
      notes:'Khách hàng tiềm năng', created_at:new Date(), updated_at:new Date(),
    });
  }
  await bulk('leads', ['id','title','contact_id','source','status','estimated_value','currency','assignee_id','notes','created_at','updated_at'], leadRows);

  const dealStages  = ['QUALIFICATION','PROPOSAL','NEGOTIATION','WON','WON','LOST'];
  const dealRows    = [];
  for (let i = 0; i < 80; i++) {
    const st  = pick(dealStages);
    const now = new Date();
    dealRows.push({
      id:uid(), code:`DEAL-${String(i+1).padStart(3,'0')}`,
      title:`Deal: ${pick(['Core System','Mobile App','Data Platform','ERP Implementation','Cloud Setup'])}`,
      customer_id:pick(custIds), stage:st, value:rand(200_000_000,10_000_000_000), currency:'VND',
      probability:pick([20,40,60,80,90,100]),
      expected_close_date:fmtDate(addDays(now, rand(-30,90))),
      assignee_id:pick(salesUsers),
      won_at:  st==='WON'  ? fmtDate(addDays(now,-rand(1,60))) : null,
      lost_at: st==='LOST' ? fmtDate(addDays(now,-rand(1,60))) : null,
      lost_reason: st==='LOST' ? pick(['Giá cao','Đối thủ cạnh tranh','KH hủy dự án']) : null,
      created_at:now, updated_at:now,
    });
  }
  await bulk('deals', ['id','code','title','customer_id','stage','value','currency','probability','expected_close_date','assignee_id','won_at','lost_at','lost_reason','created_at','updated_at'], dealRows);
  console.log(`  ✓ ${custRows.length} customers, ${contactRows.length} contacts, ${leadRows.length} leads, ${dealRows.length} deals`);

  // ── 18. Invoices ─────────────────────────────────────────────────────────────
  console.log('🧾 Creating invoices...');
  const invStatuses = ['DRAFT','SENT','SENT','PAID','PAID','OVERDUE'];
  const invRows  = [];
  const invItems = [];
  for (let i = 0; i < 80; i++) {
    const now    = new Date();
    const issue  = randDate('2025-06-01','2026-05-01');
    const due    = addDays(issue, rand(30,90));
    const st     = pick(invStatuses);
    const sub    = rand(10_000_000,500_000_000);
    const tax    = Math.floor(sub * 0.1);
    const invId  = uid();
    invRows.push({
      id:invId, code:`INV-${String(i+1).padStart(4,'0')}`,
      type: i % 5 === 0 ? 'PURCHASE' : 'SALES',
      customer_id:pick(custIds),
      project_id: Math.random()>0.4 ? pick(projRows).id : null,
      issue_date:fmtDate(issue), due_date:fmtDate(due), status:st,
      subtotal:sub, tax_amount:tax, total_amount:sub+tax, currency:'VND',
      notes:'', paid_at:st==='PAID'?fmtDate(addDays(due,-rand(1,10))):null,
      created_by_id:adminId, created_at:now, updated_at:now,
    });
    for (let j = 0; j < rand(1,4); j++) {
      const qty = rand(1,10);
      const up  = Math.floor(sub/rand(1,4)/qty);
      invItems.push({ id:uid(), invoice_id:invId, description:pick(['Development Service','Consulting','License','Maintenance','Training']), quantity:qty, unit_price:up, amount:qty*up, tax_rate:10 });
    }
  }
  await bulk('invoices', ['id','code','type','customer_id','project_id','issue_date','due_date','status','subtotal','tax_amount','total_amount','currency','notes','paid_at','created_by_id','created_at','updated_at'], invRows);
  await bulk('invoice_items', ['id','invoice_id','description','quantity','unit_price','amount','tax_rate'], invItems);
  console.log(`  ✓ ${invRows.length} invoices, ${invItems.length} items`);

  // ── 19. Recruitment ───────────────────────────────────────────────────────────
  console.log('🎯 Creating recruitment data...');
  const jobRows = JOB_OPENINGS_DEF.map(j => ({
    id:uid(), code:j.code, title:j.title,
    org_unit_id:pick(leafOrgIds), level:j.level,
    headcount:j.headcount, status:pick(['OPEN','OPEN','ON_HOLD','CLOSED']),
    requirements:j.req,
    salary_from: SALARY_BY_LEVEL[j.level]*0.8,
    salary_to:   SALARY_BY_LEVEL[j.level]*1.5,
    created_at:new Date(), updated_at:new Date(),
  }));
  await bulk('job_openings', ['id','code','title','org_unit_id','level','headcount','status','requirements','salary_from','salary_to','created_at','updated_at'], jobRows);

  const candStages  = ['APPLIED','SCREENING','INTERVIEW','OFFER','HIRED','REJECTED'];
  const candRows    = [];
  const ivRows      = [];
  const ivTypes     = ['PHONE','TECHNICAL','HR','FINAL'];
  for (let i = 0; i < 80; i++) {
    const job   = pick(jobRows);
    const stage = pick(candStages);
    const cId   = uid();
    candRows.push({
      id:cId, name:genName(i+800),
      email:`candidate${i+1}@gmail.com`,
      phone:`0${rand(300000000,999999999)}`,
      job_opening_id:job.id, stage,
      assignee_id:pick(activeUsers),
      source:pick(['WEBSITE','REFERRAL','SOCIAL','OTHER']),
      expected_salary:rand(SALARY_BY_LEVEL[job.level]*0.8,SALARY_BY_LEVEL[job.level]*1.3),
      notes:'Ứng viên tiềm năng',
      created_at:new Date(), updated_at:new Date(),
    });
    const roundCount = candStages.indexOf(stage)+1;
    for (let r = 0; r < Math.min(roundCount, 4); r++) {
      const res = r < roundCount-1 ? 'PASS' : (stage==='REJECTED'?'FAIL':stage==='HIRED'?'PASS':'PENDING');
      ivRows.push({
        id:uid(), candidate_id:cId, type:ivTypes[r],
        scheduled_at: new Date(randDate('2025-09-01','2026-06-01')),
        location:'Văn phòng Loop.vn',
        interviewers:[pick(activeUsers)],
        result:res, score:res==='PASS'?rand(70,98):res==='FAIL'?rand(30,60):null,
        notes:res==='PASS'?'Ứng viên phù hợp':res==='FAIL'?'Không đáp ứng yêu cầu':null,
        created_at:new Date(), updated_at:new Date(),
      });
    }
  }
  await bulk('candidates', ['id','name','email','phone','job_opening_id','stage','assignee_id','source','expected_salary','notes','created_at','updated_at'], candRows);
  await bulk('interviews', ['id','candidate_id','type','scheduled_at','location','interviewers','result','score','notes','created_at','updated_at'], ivRows);
  console.log(`  ✓ ${jobRows.length} job openings, ${candRows.length} candidates, ${ivRows.length} interviews`);

  // ── 20. Assets ────────────────────────────────────────────────────────────────
  console.log('💻 Creating assets...');
  const assetRows      = [];
  const assetAssRows   = [];
  const assetMaintRows = [];
  let assetSeq = 1;
  for (let i = 0; i < 200; i++) {
    const def    = ASSET_DEFS[i % ASSET_DEFS.length];
    const aId    = uid();
    const status = pick(['AVAILABLE','AVAILABLE','ASSIGNED','ASSIGNED','UNDER_MAINTENANCE','RETIRED']);
    const pDate  = randDate('2021-01-01','2025-01-01');
    assetRows.push({
      id:aId, code:`${def.prefix}-${String(assetSeq++).padStart(4,'0')}`,
      name:`${def.brand} ${def.model}`, category:def.category,
      brand:def.brand, model:def.model,
      serial_number:`SN${rand(100000,999999)}`,
      org_unit_id:pick(leafOrgIds), status,
      purchase_date:fmtDate(pDate),
      purchase_price:rand(5_000_000,80_000_000),
      depreciation_years:def.depYears,
      notes:'', created_at:new Date(), updated_at:new Date(),
    });
    if (status === 'ASSIGNED') {
      const emp = pick(allEmpRows.filter(e=>e.is_active));
      assetAssRows.push({
        id:uid(), asset_id:aId, employee_id:emp.id,
        assigned_at:new Date(pDate), returned_at:null,
        notes:'Cấp phát theo yêu cầu', created_at:new Date(),
      });
    }
    if (status === 'UNDER_MAINTENANCE' || Math.random() > 0.7) {
      assetMaintRows.push({
        id:uid(), asset_id:aId, type:pick(['Bảo trì định kỳ','Sửa chữa','Nâng cấp','Vệ sinh']),
        performed_at:fmtDate(randDate('2025-01-01','2026-05-01')),
        cost:rand(200_000,5_000_000), performed_by:'Kỹ thuật nội bộ',
        notes:'', created_at:new Date(),
      });
    }
  }
  await bulk('assets', ['id','code','name','category','brand','model','serial_number','org_unit_id','status','purchase_date','purchase_price','depreciation_years','notes','created_at','updated_at'], assetRows);
  await bulk('asset_assignments', ['id','asset_id','employee_id','assigned_at','returned_at','notes','created_at'], assetAssRows);
  await bulk('asset_maintenance', ['id','asset_id','type','performed_at','cost','performed_by','notes','created_at'], assetMaintRows);
  console.log(`  ✓ ${assetRows.length} assets, ${assetAssRows.length} assignments, ${assetMaintRows.length} maintenance logs`);

  // ── 21. BPM Process Definitions ──────────────────────────────────────────────
  console.log('⚙️  Creating BPM process definitions...');
  const rootOrgId = orgMap['ROOT'];
  const procDefs = [
    { key:'leave-approval',          name:'Đăng Ký Nghỉ Phép',           bpmnXml:BPMN_LEAVE,           form:FORM_LEAVE },
    { key:'overtime-request',        name:'Đăng Ký Làm Thêm Giờ',        bpmnXml:BPMN_OVERTIME,        form:FORM_OT },
    { key:'competency-review',       name:'Đánh Giá Năng Lực Nhân Sự',   bpmnXml:BPMN_COMPETENCY,     form:FORM_COMPETENCY },
    { key:'probation-review',        name:'Đánh Giá Hết Hạn HĐTV',       bpmnXml:BPMN_PROBATION,      form:FORM_PROBATION },
    { key:'labor-contract-renewal',  name:'Đánh Giá Hết Hạn HĐLĐ',       bpmnXml:BPMN_CONTRACT_RENEWAL,form:FORM_RENEWAL },
  ];
  const procDefIds = {};
  for (const pd of procDefs) {
    const id = uid();
    procDefIds[pd.key] = id;
    await db.query(
      `INSERT INTO process_definitions (id,key,name,description,version,bpmn_xml,org_unit_id,status,task_form_fields,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'ACTIVE',$8,NOW(),NOW()) ON CONFLICT (key) DO UPDATE SET
       name=EXCLUDED.name, bpmn_xml=EXCLUDED.bpmn_xml, task_form_fields=EXCLUDED.task_form_fields, status='ACTIVE', updated_at=NOW()
       RETURNING id`,
      [id, pd.key, pd.name, `Quy trình: ${pd.name}`, 1, pd.bpmnXml, rootOrgId, JSON.stringify(pd.form)]
    );
  }
  console.log(`  ✓ ${procDefs.length} process definitions created`);

  // ── 22. Sample Process Instances ─────────────────────────────────────────────
  console.log('🔄 Creating sample process instances...');
  const piRows  = [];
  const putRows = [];

  // 30 leave instances
  for (let i = 0; i < 30; i++) {
    const emp     = pick(activeEmps);
    const starter = emp.user_id || pick(activeUsers);
    const status  = pick(['RUNNING','RUNNING','COMPLETED','COMPLETED','CANCELLED']);
    const piId    = uid();
    piRows.push({
      id:piId, definition_id:procDefIds['leave-approval'], project_id:null,
      started_by:starter, status,
      variables:JSON.stringify({ employeeId:emp.id, leaveType:'Nghỉ phép năm', days:rand(1,5) }),
      token_state:JSON.stringify({}),
      started_at:new Date(randDate('2026-01-01','2026-05-28')),
      completed_at:status==='COMPLETED'?new Date():null,
    });
    if (status === 'RUNNING') {
      putRows.push({
        id:uid(), instance_id:piId, activity_id:'manager-review',
        name:'Trưởng phòng duyệt', assignee_id:userIdMap['pm@loop.vn'],
        candidate_roles:['PM'],
        status:'PENDING', due_date:fmtDate(addDays(new Date(),3)),
      });
    }
  }

  // 20 overtime instances
  for (let i = 0; i < 20; i++) {
    const starter = pick(activeUsers);
    const status  = pick(['RUNNING','COMPLETED','COMPLETED']);
    const piId    = uid();
    piRows.push({
      id:piId, definition_id:procDefIds['overtime-request'], project_id:pick(projRows).id,
      started_by:starter, status,
      variables:JSON.stringify({ hours:rand(2,8), date:fmtDate(new Date()), reason:'Deadline dự án' }),
      token_state:JSON.stringify({}),
      started_at:new Date(randDate('2026-03-01','2026-05-28')),
      completed_at:status==='COMPLETED'?new Date():null,
    });
    if (status === 'RUNNING') {
      putRows.push({
        id:uid(), instance_id:piId, activity_id:'pm-review',
        name:'PM / Trưởng phòng duyệt OT', assignee_id:userIdMap['pm@loop.vn'],
        candidate_roles:['PM'],
        status:'PENDING', due_date:fmtDate(addDays(new Date(),1)),
      });
    }
  }

  // 15 competency review instances
  for (let i = 0; i < 15; i++) {
    const emp    = pick(activeEmps);
    const starter = emp.user_id || pick(activeUsers);
    const piId   = uid();
    piRows.push({
      id:piId, definition_id:procDefIds['competency-review'], project_id:null,
      started_by:starter, status:'RUNNING',
      variables:JSON.stringify({ employeeId:emp.id, cycle:'Q2/2026' }),
      token_state:JSON.stringify({}),
      started_at:new Date(randDate('2026-04-01','2026-05-15')),
      completed_at:null,
    });
    putRows.push({
      id:uid(), instance_id:piId, activity_id:'self-assessment',
      name:'Nhân viên tự đánh giá', assignee_id:starter,
      candidate_roles:[],
      status:'PENDING', due_date:fmtDate(addDays(new Date(),7)),
    });
  }

  // 10 probation review instances
  for (let i = 0; i < 10; i++) {
    const emp    = allEmpRows[i + 470]; // nhân viên mới
    const starter = userIdMap['hr@loop.vn'];
    const piId   = uid();
    piRows.push({
      id:piId, definition_id:procDefIds['probation-review'], project_id:null,
      started_by:starter, status:pick(['RUNNING','COMPLETED']),
      variables:JSON.stringify({ employeeId:emp.id, probationEnd:fmtDate(addDays(new Date(),rand(-5,30))) }),
      token_state:JSON.stringify({}),
      started_at:new Date(randDate('2026-04-15','2026-05-20')),
      completed_at:null,
    });
  }

  // 8 contract renewal instances
  for (let i = 0; i < 8; i++) {
    const emp    = allEmpRows[i + 10];
    const starter = userIdMap['hr@loop.vn'];
    const piId   = uid();
    piRows.push({
      id:piId, definition_id:procDefIds['labor-contract-renewal'], project_id:null,
      started_by:starter, status:pick(['RUNNING','COMPLETED']),
      variables:JSON.stringify({ employeeId:emp.id, contractExpiry:fmtDate(addDays(new Date(),rand(5,45))) }),
      token_state:JSON.stringify({}),
      started_at:new Date(randDate('2026-05-01','2026-05-25')),
      completed_at:null,
    });
    putRows.push({
      id:uid(), instance_id:piId, activity_id:'hr-notify',
      name:'HR thông báo nhân viên trước 30 ngày', assignee_id:starter,
      candidate_roles:['hr:manager'],
      status:'IN_PROGRESS', due_date:fmtDate(addDays(new Date(),2)),
    });
  }

  await bulk('process_instances',
    ['id','definition_id','project_id','started_by','status','variables','token_state','started_at','completed_at'],
    piRows
  );
  await bulk('process_user_tasks',
    ['id','instance_id','activity_id','name','assignee_id','candidate_roles','status','due_date'],
    putRows
  );
  console.log(`  ✓ ${piRows.length} process instances, ${putRows.length} user tasks`);

  // ── 23. User Groups ───────────────────────────────────────────────────────────
  console.log('👥 Creating user groups...');
  const groups = [
    { name:'PM Team',      desc:'Quản lý dự án',       perms:['projects:read','projects:create','projects:update','tasks:read','tasks:create','tasks:update','tasks:approve','bugs:read','issues:read','dashboard:read'],
      members:['pm@loop.vn','pm2@loop.vn','pm3@loop.vn'] },
    { name:'HR Team',      desc:'Nhân sự & chấm công',  perms:['employees:read','employees:create','employees:update','timesheets:read','timesheets:approve','leaves:read','leaves:approve','contracts:read','contracts:create','reports:read','dashboard:read'],
      members:['hr@loop.vn','hr2@loop.vn','hr3@loop.vn'] },
    { name:'Finance Team', desc:'Tài chính & kế toán',  perms:['finance:read','finance:create','finance:approve','finance:manage','reports:read','reports:export','timesheets:read','dashboard:read'],
      members:['finance@loop.vn','finance2@loop.vn'] },
    { name:'Tech Lead',    desc:'Kỹ thuật & kiến trúc', perms:['projects:read','tasks:read','tasks:create','tasks:update','tasks:approve','bugs:read','bugs:create','bugs:update','bugs:assign','reports:read','dashboard:read','bpm:read'],
      members:['dev1@loop.vn','dev2@loop.vn','dev3@loop.vn','dev4@loop.vn','dev5@loop.vn'] },
  ];
  for (const g of groups) {
    const gId = uid();
    await db.query(`INSERT INTO user_groups (id,name,description,is_default,created_at,updated_at) VALUES ($1,$2,$3,false,NOW(),NOW()) ON CONFLICT (name) DO UPDATE SET description=EXCLUDED.description`, [gId, g.name, g.desc]);
    const gRow = await db.query(`SELECT id FROM user_groups WHERE name=$1`, [g.name]);
    const groupId = gRow.rows[0].id;
    await bulk('group_permissions', ['group_id','perm_code'], g.perms.map(p => ({ group_id:groupId, perm_code:p })));
    await bulk('group_org_access', ['group_id','org_unit_id','include_children'], [{ group_id:groupId, org_unit_id:rootOrgId, include_children:true }]);
    for (const email of g.members) {
      const uId = userIdMap[email];
      if (uId) await db.query(`INSERT INTO group_memberships (user_id,group_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [uId, groupId]);
    }
  }
  console.log(`  ✓ ${groups.length} user groups with permissions and members`);

  // ── 24. User Module Roles ─────────────────────────────────────────────────────
  console.log('🔐 Assigning module roles...');
  const mrAssignments = [
    { email:'admin@loop.vn', roles:['hr:manager','hr:recruiter','finance:accountant','finance:manager','crm:sales','crm:manager','operations:asset','operations:contract'] },
    { email:'hr@loop.vn',    roles:['hr:manager','hr:recruiter'] },
    { email:'hr2@loop.vn',   roles:['hr:manager'] },
    { email:'finance@loop.vn', roles:['finance:accountant'] },
    { email:'finance2@loop.vn',roles:['finance:manager'] },
    { email:'pm@loop.vn',    roles:['crm:sales','operations:contract'] },
  ];
  for (const a of mrAssignments) {
    const uId = userIdMap[a.email];
    if (!uId) continue;
    for (const rc of a.roles) {
      await db.query(`INSERT INTO user_module_roles (user_id,role_code,created_at) VALUES ($1,$2,NOW()) ON CONFLICT DO NOTHING`, [uId, rc]);
    }
  }
  console.log(`  ✓ Module roles assigned`);

  // ── 25. Summary ──────────────────────────────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ SEED HOÀN TẤT!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 Tóm tắt dữ liệu đã tạo:');
  console.log(`   • Org Units:    ${ORG_DEF.length} đơn vị`);
  console.log(`   • Users:        ${SYS_USERS.length} tài khoản`);
  console.log(`   • Employees:    500 nhân viên (EMP001–EMP500)`);
  console.log(`   • Projects:     100 dự án`);
  console.log(`   • Tasks:        1000 công việc`);
  console.log(`   • Bugs:         1000 bugs`);
  console.log(`   • Issues:       200 issues/CR`);
  console.log(`   • Leave Types:  ${leaveTypes.length} loại phép`);
  console.log(`   • Leave Req:    ${leaveReqRows.length} đơn nghỉ phép`);
  console.log(`   • Payroll:      ${ppIds.length} kỳ lương`);
  console.log(`   • Expenses:     ${expRows.length} phiếu chi`);
  console.log(`   • Customers:    ${custRows.length}`);
  console.log(`   • Deals:        ${dealRows.length}`);
  console.log(`   • Invoices:     ${invRows.length}`);
  console.log(`   • Job Openings: ${jobRows.length}`);
  console.log(`   • Candidates:   ${candRows.length}`);
  console.log(`   • Assets:       ${assetRows.length}`);
  console.log(`   • BPM Quy trình: ${procDefs.length}`);
  console.log('');
  console.log('🔑 Tài khoản đăng nhập:');
  console.log('   admin@loop.vn     / admin');
  console.log('   pm@loop.vn        / admin');
  console.log('   hr@loop.vn        / Demo@1234');
  console.log('   finance@loop.vn   / Demo@1234');
  console.log('   user.demo@loop.vn / Demo@1234');
  console.log('   dev1@loop.vn      / Demo@1234');
  console.log('═══════════════════════════════════════════════════════');

  await db.end();
}

main().catch(err => {
  console.error('❌ Seed thất bại:', err.message);
  console.error(err.stack);
  db.end();
  process.exit(1);
});

