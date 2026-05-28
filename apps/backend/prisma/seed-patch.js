'use strict';
/**
 * seed-patch.js — Patch BPMN visual diagrams + bổ sung dữ liệu demo cho từng module
 * KHÔNG xóa dữ liệu hiện có — chỉ INSERT/UPDATE.
 * Chạy: node prisma/seed-patch.js
 */

require('dotenv/config');
const { Client } = require('pg');
const { randomUUID: uid } = require('crypto');

const db = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db' });

const pick  = a => a[Math.floor(Math.random() * a.length)];
const rand  = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
function fmtDate(d) { return (d instanceof Date ? d : new Date(d)).toISOString().split('T')[0]; }
function addDays(base, n) { const d = new Date(base); d.setDate(d.getDate() + n); return d; }
function addMonths(base, n) { const d = new Date(base); d.setMonth(d.getMonth() + n); return d; }

async function bulk(table, cols, rows) {
  if (!rows.length) return;
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const sl = rows.slice(i, i + BATCH);
    const vals = sl.map((_, ri) => `(${cols.map((__, ci) => `$${ri * cols.length + ci + 1}`).join(',')})`).join(',');
    const params = sl.flatMap(r => cols.map(c => r[c] ?? null));
    await db.query(`INSERT INTO "${table}" (${cols.map(c=>`"${c}"`).join(',')}) VALUES ${vals} ON CONFLICT DO NOTHING`, params);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PHẦN 1 — BPMN XMLs với BPMNDI (visual diagram)
// ═══════════════════════════════════════════════════════════════════════════

// Helper: tạo BPMN shape cho StartEvent
const startShape = (id, x, y) =>
  `<bpmndi:BPMNShape id="${id}_di" bpmnElement="${id}" isMarkerVisible="true">
        <dc:Bounds x="${x}" y="${y}" width="36" height="36"/>
        <bpmndi:BPMNLabel><dc:Bounds x="${x-20}" y="${y+46}" width="80" height="14"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>`;

const endShape = (id, x, y) =>
  `<bpmndi:BPMNShape id="${id}_di" bpmnElement="${id}">
        <dc:Bounds x="${x}" y="${y}" width="36" height="36"/>
        <bpmndi:BPMNLabel><dc:Bounds x="${x-20}" y="${y+46}" width="80" height="14"/></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>`;

const taskShape = (id, x, y, w=180, h=80) =>
  `<bpmndi:BPMNShape id="${id}_di" bpmnElement="${id}">
        <dc:Bounds x="${x}" y="${y}" width="${w}" height="${h}"/>
        <bpmndi:BPMNLabel/>
      </bpmndi:BPMNShape>`;

const edge = (id, flowId, wx1, wy1, wx2, wy2) =>
  `<bpmndi:BPMNEdge id="${id}_di" bpmnElement="${flowId}">
        <di:waypoint x="${wx1}" y="${wy1}"/>
        <di:waypoint x="${wx2}" y="${wy2}"/>
      </bpmndi:BPMNEdge>`;

function makeDiagram(processId, shapes, edges) {
  return `  <bpmndi:BPMNDiagram id="BPMNDiagram_${processId}">
    <bpmndi:BPMNPlane id="BPMNPlane_${processId}" bpmnElement="${processId}">
      ${shapes.join('\n      ')}
      ${edges.join('\n      ')}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>`;
}

// ── 1. Đăng Ký Nghỉ Phép ─────────────────────────────────────────────────────
// start → manager-review → hr-confirm → end  (3 bước)
const BPMN_LEAVE = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             id="leave-defs" targetNamespace="http://loop.vn/processes">
  <process id="leave-approval-process" name="Đăng Ký Nghỉ Phép" isExecutable="true">
    <startEvent id="start" name="NV nộp đơn xin phép">
      <outgoing>to-manager</outgoing>
    </startEvent>
    <sequenceFlow id="to-manager" sourceRef="start" targetRef="manager-review"/>
    <userTask id="manager-review" name="Trưởng phòng&#10;duyệt đơn">
      <documentation>Trưởng phòng xem xét lý do và xác nhận đơn nghỉ phép</documentation>
      <incoming>to-manager</incoming>
      <outgoing>to-hr</outgoing>
    </userTask>
    <sequenceFlow id="to-hr" sourceRef="manager-review" targetRef="hr-confirm"/>
    <userTask id="hr-confirm" name="HR xác nhận&#10;và cập nhật số phép">
      <documentation>HR cập nhật số ngày phép, ghi nhận vào hệ thống chấm công</documentation>
      <incoming>to-hr</incoming>
      <outgoing>to-end</outgoing>
    </userTask>
    <sequenceFlow id="to-end" sourceRef="hr-confirm" targetRef="end"/>
    <endEvent id="end" name="Nghỉ phép được duyệt">
      <incoming>to-end</incoming>
    </endEvent>
  </process>
  ${makeDiagram('leave-approval-process', [
    startShape('start', 162, 182),
    taskShape('manager-review', 258, 160),
    taskShape('hr-confirm', 498, 160),
    endShape('end', 740, 182),
  ], [
    edge('to-manager','to-manager', 198,200, 258,200),
    edge('to-hr',     'to-hr',      438,200, 498,200),
    edge('to-end',    'to-end',     678,200, 740,200),
  ])}
</definitions>`;

// ── 2. Đăng Ký Làm Thêm Giờ ──────────────────────────────────────────────────
// start → pm-review → hr-record → end
const BPMN_OVERTIME = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             id="ot-defs" targetNamespace="http://loop.vn/processes">
  <process id="overtime-request-process" name="Đăng Ký Làm Thêm Giờ" isExecutable="true">
    <startEvent id="start" name="NV đăng ký OT">
      <outgoing>to-pm</outgoing>
    </startEvent>
    <sequenceFlow id="to-pm" sourceRef="start" targetRef="pm-review"/>
    <userTask id="pm-review" name="PM / Trưởng phòng&#10;phê duyệt OT">
      <documentation>Quản lý duyệt yêu cầu làm thêm giờ: số giờ, ngày, lý do</documentation>
      <incoming>to-pm</incoming>
      <outgoing>to-hr</outgoing>
    </userTask>
    <sequenceFlow id="to-hr" sourceRef="pm-review" targetRef="hr-record"/>
    <userTask id="hr-record" name="HR ghi nhận&#10;giờ OT vào hệ thống">
      <documentation>HR cập nhật giờ OT vào bảng chấm công, tính lương tháng</documentation>
      <incoming>to-hr</incoming>
      <outgoing>to-end</outgoing>
    </userTask>
    <sequenceFlow id="to-end" sourceRef="hr-record" targetRef="end"/>
    <endEvent id="end" name="OT được duyệt">
      <incoming>to-end</incoming>
    </endEvent>
  </process>
  ${makeDiagram('overtime-request-process', [
    startShape('start', 162, 182),
    taskShape('pm-review', 258, 160),
    taskShape('hr-record', 498, 160),
    endShape('end', 740, 182),
  ], [
    edge('to-pm', 'to-pm', 198,200, 258,200),
    edge('to-hr', 'to-hr', 438,200, 498,200),
    edge('to-end','to-end', 678,200, 740,200),
  ])}
</definitions>`;

// ── 3. Đánh Giá Năng Lực Nhân Sự ─────────────────────────────────────────────
// start → self-assessment → manager-review → hr-review → director-approve → end
const BPMN_COMPETENCY = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             id="comp-defs" targetNamespace="http://loop.vn/processes">
  <process id="competency-review-process" name="Đánh Giá Năng Lực Nhân Sự" isExecutable="true">
    <startEvent id="start" name="Bắt đầu chu kỳ&#10;đánh giá định kỳ">
      <outgoing>to-self</outgoing>
    </startEvent>
    <sequenceFlow id="to-self" sourceRef="start" targetRef="self-assessment"/>
    <userTask id="self-assessment" name="Nhân viên&#10;tự đánh giá">
      <documentation>NV điền form tự đánh giá: thành tích, điểm mạnh, kế hoạch phát triển</documentation>
      <incoming>to-self</incoming>
      <outgoing>to-manager</outgoing>
    </userTask>
    <sequenceFlow id="to-manager" sourceRef="self-assessment" targetRef="manager-review"/>
    <userTask id="manager-review" name="Trưởng phòng&#10;đánh giá trực tiếp">
      <documentation>Manager chấm điểm, nhận xét năng lực và đề xuất thăng hạng/tăng lương</documentation>
      <incoming>to-manager</incoming>
      <outgoing>to-hr</outgoing>
    </userTask>
    <sequenceFlow id="to-hr" sourceRef="manager-review" targetRef="hr-review"/>
    <userTask id="hr-review" name="HR tổng hợp&#10;và đề xuất">
      <documentation>HR tổng hợp toàn bộ đánh giá, so sánh benchmark, đề xuất lên BGĐ</documentation>
      <incoming>to-hr</incoming>
      <outgoing>to-director</outgoing>
    </userTask>
    <sequenceFlow id="to-director" sourceRef="hr-review" targetRef="director-approve"/>
    <userTask id="director-approve" name="BGĐ phê duyệt&#10;kết quả đánh giá">
      <documentation>Ban Giám đốc xem xét và phê duyệt quyết định thăng hạng/điều chỉnh lương</documentation>
      <incoming>to-director</incoming>
      <outgoing>to-end</outgoing>
    </userTask>
    <sequenceFlow id="to-end" sourceRef="director-approve" targetRef="end"/>
    <endEvent id="end" name="Đánh giá hoàn tất&#10;và lưu hồ sơ">
      <incoming>to-end</incoming>
    </endEvent>
  </process>
  ${makeDiagram('competency-review-process', [
    startShape('start', 112, 182),
    taskShape('self-assessment',  208, 160),
    taskShape('manager-review',   448, 160),
    taskShape('hr-review',        688, 160),
    taskShape('director-approve', 928, 160),
    endShape('end', 1170, 182),
  ], [
    edge('to-self',     'to-self',     148,200, 208,200),
    edge('to-manager',  'to-manager',  388,200, 448,200),
    edge('to-hr',       'to-hr',       628,200, 688,200),
    edge('to-director', 'to-director', 868,200, 928,200),
    edge('to-end',      'to-end',     1108,200,1170,200),
  ])}
</definitions>`;

// ── 4. Đánh Giá Hết Hạn HĐTV (Hợp đồng Thử Việc) ────────────────────────────
// start → manager-eval → hr-decision → notify-task → end
const BPMN_PROBATION = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             id="prob-defs" targetNamespace="http://loop.vn/processes">
  <process id="probation-review-process" name="Đánh Giá Hết Hạn HĐTV" isExecutable="true">
    <startEvent id="start" name="HĐTV sắp hết hạn&#10;(cảnh báo 14 ngày)">
      <outgoing>to-eval</outgoing>
    </startEvent>
    <sequenceFlow id="to-eval" sourceRef="start" targetRef="manager-eval"/>
    <userTask id="manager-eval" name="Trưởng phòng&#10;đánh giá kết quả TV">
      <documentation>Đánh giá NV sau thời gian thử việc: năng lực, thái độ, tiến độ hòa nhập</documentation>
      <incoming>to-eval</incoming>
      <outgoing>to-hr</outgoing>
    </userTask>
    <sequenceFlow id="to-hr" sourceRef="manager-eval" targetRef="hr-decision"/>
    <userTask id="hr-decision" name="HR xem xét và&#10;quyết định ký HĐLĐ">
      <documentation>HR xem xét đánh giá, quyết định: Ký HĐLĐ / Gia hạn TV / Chấm dứt</documentation>
      <incoming>to-hr</incoming>
      <outgoing>to-notify</outgoing>
    </userTask>
    <sequenceFlow id="to-notify" sourceRef="hr-decision" targetRef="notify-task"/>
    <userTask id="notify-task" name="Thông báo kết quả&#10;cho nhân viên">
      <documentation>HR thông báo quyết định chính thức và hướng dẫn các bước tiếp theo</documentation>
      <incoming>to-notify</incoming>
      <outgoing>to-end</outgoing>
    </userTask>
    <sequenceFlow id="to-end" sourceRef="notify-task" targetRef="end"/>
    <endEvent id="end" name="Xử lý HĐTV&#10;hoàn tất">
      <incoming>to-end</incoming>
    </endEvent>
  </process>
  ${makeDiagram('probation-review-process', [
    startShape('start', 142, 182),
    taskShape('manager-eval', 238, 160),
    taskShape('hr-decision',  478, 160),
    taskShape('notify-task',  718, 160),
    endShape('end', 960, 182),
  ], [
    edge('to-eval',   'to-eval',   178,200, 238,200),
    edge('to-hr',     'to-hr',     418,200, 478,200),
    edge('to-notify', 'to-notify', 658,200, 718,200),
    edge('to-end',    'to-end',    898,200, 960,200),
  ])}
</definitions>`;

// ── 5. Đánh Giá Hết Hạn HĐLĐ (Hợp đồng Lao Động) ────────────────────────────
// start → hr-notify → employee-respond → manager-review → hr-finalize → end
const BPMN_RENEWAL = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
             xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
             xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
             id="renewal-defs" targetNamespace="http://loop.vn/processes">
  <process id="labor-contract-renewal-process" name="Đánh Giá Hết Hạn HĐLĐ" isExecutable="true">
    <startEvent id="start" name="HĐLĐ sắp hết hạn&#10;(cảnh báo 30 ngày)">
      <outgoing>to-notify</outgoing>
    </startEvent>
    <sequenceFlow id="to-notify" sourceRef="start" targetRef="hr-notify"/>
    <userTask id="hr-notify" name="HR thông báo NV&#10;trước 30 ngày">
      <documentation>HR gửi thông báo chính thức đến NV về ngày hết hạn hợp đồng</documentation>
      <incoming>to-notify</incoming>
      <outgoing>to-respond</outgoing>
    </userTask>
    <sequenceFlow id="to-respond" sourceRef="hr-notify" targetRef="employee-respond"/>
    <userTask id="employee-respond" name="Nhân viên xác nhận&#10;nguyện vọng gia hạn">
      <documentation>NV phản hồi: muốn gia hạn hay không, mức lương kỳ vọng</documentation>
      <incoming>to-respond</incoming>
      <outgoing>to-manager</outgoing>
    </userTask>
    <sequenceFlow id="to-manager" sourceRef="employee-respond" targetRef="manager-review"/>
    <userTask id="manager-review" name="Trưởng phòng&#10;quyết định gia hạn">
      <documentation>Manager xem xét hiệu suất NV và quyết định có gia hạn hay không</documentation>
      <incoming>to-manager</incoming>
      <outgoing>to-finalize</outgoing>
    </userTask>
    <sequenceFlow id="to-finalize" sourceRef="manager-review" targetRef="hr-finalize"/>
    <userTask id="hr-finalize" name="HR hoàn tất&#10;thủ tục ký HĐ mới">
      <documentation>HR soạn thảo, ký kết hợp đồng lao động mới, cập nhật hệ thống</documentation>
      <incoming>to-finalize</incoming>
      <outgoing>to-end</outgoing>
    </userTask>
    <sequenceFlow id="to-end" sourceRef="hr-finalize" targetRef="end"/>
    <endEvent id="end" name="Hợp đồng mới&#10;đã ký kết">
      <incoming>to-end</incoming>
    </endEvent>
  </process>
  ${makeDiagram('labor-contract-renewal-process', [
    startShape('start', 112, 182),
    taskShape('hr-notify',        208, 160),
    taskShape('employee-respond', 448, 160),
    taskShape('manager-review',   688, 160),
    taskShape('hr-finalize',      928, 160),
    endShape('end', 1170, 182),
  ], [
    edge('to-notify',   'to-notify',   148,200, 208,200),
    edge('to-respond',  'to-respond',  388,200, 448,200),
    edge('to-manager',  'to-manager',  628,200, 688,200),
    edge('to-finalize', 'to-finalize', 868,200, 928,200),
    edge('to-end',      'to-end',     1108,200,1170,200),
  ])}
</definitions>`;

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  await db.connect();
  console.log('✅ Connected');

  // ── Load references từ DB ─────────────────────────────────────────────────
  const adminUser  = (await db.query(`SELECT id FROM users WHERE email='admin@loop.vn'`)).rows[0];
  const hrUser     = (await db.query(`SELECT id FROM users WHERE email='hr@loop.vn'`)).rows[0];
  const pmUser     = (await db.query(`SELECT id FROM users WHERE email='pm@loop.vn'`)).rows[0];
  const finUser    = (await db.query(`SELECT id FROM users WHERE email='finance@loop.vn'`)).rows[0];
  if (!adminUser) throw new Error('admin@loop.vn không tồn tại — chạy seed-500.js trước');

  const adminId = adminUser.id;
  const hrId    = hrUser?.id || adminId;
  const pmId    = pmUser?.id || adminId;
  const finId   = finUser?.id || adminId;

  const orgRows  = (await db.query(`SELECT id, code FROM org_units`)).rows;
  const orgMap   = Object.fromEntries(orgRows.map(r => [r.code, r.id]));
  const rootOrgId = orgMap['ROOT'] || orgRows[0]?.id;

  const projRows = (await db.query(`SELECT id, code FROM projects LIMIT 100`)).rows;
  const empRows  = (await db.query(`SELECT id, level FROM employees WHERE is_active=true LIMIT 100`)).rows;
  const custRows = (await db.query(`SELECT id FROM customers`)).rows;
  const custIds  = custRows.map(r => r.id);

  const allUserRows = (await db.query(`SELECT id FROM users`)).rows;
  const allUserIds  = allUserRows.map(r => r.id);

  // ══════════════════════════════════════════════════════════════════════════
  // PHẦN 1 — Cập nhật BPMN với visual diagram đầy đủ
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n⚙️  Cập nhật BPMN visual diagrams...');
  const bpmnUpdates = [
    { key:'leave-approval',         xml:BPMN_LEAVE,      name:'Đăng Ký Nghỉ Phép' },
    { key:'overtime-request',       xml:BPMN_OVERTIME,   name:'Đăng Ký Làm Thêm Giờ' },
    { key:'competency-review',      xml:BPMN_COMPETENCY, name:'Đánh Giá Năng Lực Nhân Sự' },
    { key:'probation-review',       xml:BPMN_PROBATION,  name:'Đánh Giá Hết Hạn HĐTV' },
    { key:'labor-contract-renewal', xml:BPMN_RENEWAL,    name:'Đánh Giá Hết Hạn HĐLĐ' },
  ];
  for (const u of bpmnUpdates) {
    const res = await db.query(
      `UPDATE process_definitions SET bpmn_xml=$1, name=$2, status='ACTIVE', updated_at=NOW() WHERE key=$3 RETURNING id`,
      [u.xml, u.name, u.key]
    );
    if (res.rowCount === 0) {
      // Insert nếu chưa có
      await db.query(
        `INSERT INTO process_definitions (id,key,name,description,version,bpmn_xml,org_unit_id,status,created_at,updated_at)
         VALUES ($1,$2,$3,$4,1,$5,$6,'ACTIVE',NOW(),NOW())`,
        [uid(), u.key, u.name, `Quy trình: ${u.name}`, u.xml, rootOrgId]
      );
      console.log(`  + Inserted: ${u.name}`);
    } else {
      console.log(`  ✓ Updated:  ${u.name}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHẦN 2 — Process Instances mẫu đầy đủ hơn
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n🔄 Thêm process instances demo...');

  // Lấy definition IDs
  const defRows = (await db.query(`SELECT id, key FROM process_definitions`)).rows;
  const defMap  = Object.fromEntries(defRows.map(r => [r.key, r.id]));

  const piRows  = [];
  const putRows = [];

  // 10 leave instances COMPLETED (để thấy lịch sử)
  for (let i = 0; i < 10; i++) {
    const emp    = empRows[i % empRows.length];
    const piId   = uid();
    const startAt = new Date(`2026-0${rand(1,4)}-${String(rand(1,28)).padStart(2,'0')}T08:00:00`);
    piRows.push({
      id:piId, definition_id:defMap['leave-approval'],
      project_id:null, started_by:allUserIds[i % allUserIds.length], status:'COMPLETED',
      variables:JSON.stringify({ employeeId:emp.id, leaveType:'Nghỉ phép năm', days:rand(1,3), reason:'Việc gia đình' }),
      token_state:JSON.stringify({ current:'end' }),
      started_at:startAt, completed_at:addDays(startAt, rand(1,3)),
    });
  }

  // 8 overtime instances — 5 COMPLETED, 3 RUNNING
  for (let i = 0; i < 8; i++) {
    const piId    = uid();
    const running = i >= 5;
    const proj    = projRows[i % projRows.length];
    const startAt = new Date('2026-05-' + String(rand(1,25)).padStart(2,'0') + 'T09:00:00');
    piRows.push({
      id:piId, definition_id:defMap['overtime-request'],
      project_id:proj.id, started_by:allUserIds[i % allUserIds.length],
      status: running ? 'RUNNING' : 'COMPLETED',
      variables:JSON.stringify({ hours:rand(2,8), date:fmtDate(startAt), project:proj.code, reason:'Deadline sprint' }),
      token_state:JSON.stringify({ current: running ? 'pm-review' : 'end' }),
      started_at:startAt, completed_at: running ? null : addDays(startAt,1),
    });
    if (running) {
      putRows.push({
        id:uid(), instance_id:piId, activity_id:'pm-review',
        name:'PM / Trưởng phòng phê duyệt OT',
        assignee_id:pmId, candidate_roles:['PM'],
        status:'PENDING', due_date:fmtDate(addDays(new Date(),1)),
      });
    }
  }

  // 5 competency review RUNNING — đang ở bước self-assessment
  for (let i = 0; i < 5; i++) {
    const emp    = empRows[(i+10) % empRows.length];
    const piId   = uid();
    const startAt = new Date('2026-05-15T08:00:00');
    piRows.push({
      id:piId, definition_id:defMap['competency-review'],
      project_id:null, started_by:hrId, status:'RUNNING',
      variables:JSON.stringify({ employeeId:emp.id, cycle:'Q2/2026', reviewYear:2026 }),
      token_state:JSON.stringify({ current:'self-assessment' }),
      started_at:startAt, completed_at:null,
    });
    putRows.push({
      id:uid(), instance_id:piId, activity_id:'self-assessment',
      name:'Nhân viên tự đánh giá',
      assignee_id:allUserIds[i % allUserIds.length], candidate_roles:[],
      status:'IN_PROGRESS', due_date:fmtDate(addDays(new Date(),7)),
    });
  }

  // 5 competency review — đang ở bước manager-review
  for (let i = 0; i < 5; i++) {
    const emp    = empRows[(i+20) % empRows.length];
    const piId   = uid();
    piRows.push({
      id:piId, definition_id:defMap['competency-review'],
      project_id:null, started_by:hrId, status:'RUNNING',
      variables:JSON.stringify({ employeeId:emp.id, cycle:'Q2/2026', selfScore:rand(7,9) }),
      token_state:JSON.stringify({ current:'manager-review' }),
      started_at:new Date('2026-05-10T08:00:00'), completed_at:null,
    });
    putRows.push({
      id:uid(), instance_id:piId, activity_id:'manager-review',
      name:'Trưởng phòng đánh giá trực tiếp',
      assignee_id:pmId, candidate_roles:['PM'],
      status:'PENDING', due_date:fmtDate(addDays(new Date(),3)),
    });
  }

  // 6 probation review — mix RUNNING/COMPLETED
  for (let i = 0; i < 6; i++) {
    const emp     = empRows[(i+30) % empRows.length];
    const piId    = uid();
    const running = i < 4;
    const step    = ['manager-eval','hr-decision','notify-task','manager-eval'][i % 4];
    piRows.push({
      id:piId, definition_id:defMap['probation-review'],
      project_id:null, started_by:hrId,
      status: running ? 'RUNNING' : 'COMPLETED',
      variables:JSON.stringify({ employeeId:emp.id, probationEnd:fmtDate(addDays(new Date(),rand(-5,20))), contractType:'PROBATION' }),
      token_state:JSON.stringify({ current: running ? step : 'end' }),
      started_at:new Date('2026-05-01T08:00:00'),
      completed_at: running ? null : new Date('2026-05-20T16:00:00'),
    });
    if (running) {
      putRows.push({
        id:uid(), instance_id:piId, activity_id:step,
        name: step==='manager-eval' ? 'Trưởng phòng đánh giá kết quả TV'
            : step==='hr-decision'  ? 'HR xem xét và quyết định ký HĐLĐ'
            : 'Thông báo kết quả cho nhân viên',
        assignee_id: step==='manager-eval' ? pmId : hrId,
        candidate_roles: step==='manager-eval' ? ['PM'] : ['hr:manager'],
        status:'PENDING', due_date:fmtDate(addDays(new Date(),2)),
      });
    }
  }

  // 5 contract renewal RUNNING
  for (let i = 0; i < 5; i++) {
    const emp   = empRows[(i+40) % empRows.length];
    const piId  = uid();
    const steps = ['hr-notify','employee-respond','manager-review','hr-notify','employee-respond'];
    const step  = steps[i];
    piRows.push({
      id:piId, definition_id:defMap['labor-contract-renewal'],
      project_id:null, started_by:hrId, status:'RUNNING',
      variables:JSON.stringify({ employeeId:emp.id, contractExpiry:fmtDate(addDays(new Date(),rand(10,45))), currentSalary:rand(15,50)*1000000 }),
      token_state:JSON.stringify({ current:step }),
      started_at:new Date('2026-05-01T08:00:00'), completed_at:null,
    });
    putRows.push({
      id:uid(), instance_id:piId, activity_id:step,
      name: step==='hr-notify'         ? 'HR thông báo NV trước 30 ngày'
          : step==='employee-respond'  ? 'Nhân viên xác nhận nguyện vọng'
          : 'Trưởng phòng quyết định gia hạn',
      assignee_id: step==='manager-review' ? pmId : hrId,
      candidate_roles: step==='manager-review' ? ['PM'] : ['hr:manager'],
      status:'IN_PROGRESS', due_date:fmtDate(addDays(new Date(),5)),
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
  console.log(`  ✓ ${piRows.length} process instances, ${putRows.length} user tasks added`);

  // ══════════════════════════════════════════════════════════════════════════
  // PHẦN 3 — Dữ liệu CRM bổ sung (15-20 bản ghi mỗi loại)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n💼 Bổ sung dữ liệu CRM...');
  const crmLeads = [
    { title:'Triển khai ERP cho chuỗi nhà thuốc', val:2_000_000_000, src:'REFERRAL', st:'QUALIFIED' },
    { title:'Phát triển app đặt lịch spa online', val:800_000_000, src:'WEBSITE', st:'CONTACTED' },
    { title:'Hệ thống quản lý kho tự động cho nhà máy', val:3_500_000_000, src:'EVENT', st:'QUALIFIED' },
    { title:'Nền tảng thương mại điện tử B2B', val:5_000_000_000, src:'COLD_OUTREACH', st:'CONVERTED' },
    { title:'CRM cho công ty bảo hiểm nhân thọ', val:1_200_000_000, src:'REFERRAL', st:'CONTACTED' },
    { title:'Ứng dụng quản lý nhân sự cho SME', val:600_000_000, src:'WEBSITE', st:'NEW' },
    { title:'Cổng thông tin điện tử tỉnh', val:4_000_000_000, src:'OTHER', st:'QUALIFIED' },
    { title:'Hệ thống đặt tour du lịch trực tuyến', val:900_000_000, src:'SOCIAL', st:'NEW' },
    { title:'Phần mềm quản lý phòng khám đa khoa', val:700_000_000, src:'REFERRAL', st:'CONTACTED' },
    { title:'Platform logistics xuyên biên giới', val:8_000_000_000, src:'EVENT', st:'QUALIFIED' },
    { title:'Giải pháp Smart Building cho tòa nhà văn phòng', val:2_500_000_000, src:'COLD_OUTREACH', st:'NEW' },
    { title:'Ứng dụng học tiếng Anh AI-powered', val:400_000_000, src:'WEBSITE', st:'LOST' },
    { title:'Hệ thống POS cho chuỗi nhà hàng', val:1_100_000_000, src:'REFERRAL', st:'QUALIFIED' },
    { title:'Nền tảng quản lý tài sản đầu tư', val:6_000_000_000, src:'EVENT', st:'CONTACTED' },
    { title:'ERP cho doanh nghiệp xuất nhập khẩu', val:3_000_000_000, src:'COLD_OUTREACH', st:'CONVERTED' },
  ];
  const newLeads = crmLeads.map(l => ({
    id:uid(), title:l.title, contact_id:null,
    source:l.src, status:l.st,
    estimated_value:l.val, currency:'VND',
    assignee_id:pmId, notes:'Lead từ hoạt động marketing',
    created_at:new Date(), updated_at:new Date(),
  }));
  await bulk('leads', ['id','title','contact_id','source','status','estimated_value','currency','assignee_id','notes','created_at','updated_at'], newLeads);

  const crmDeals = [
    { code:'DEAL-E001', title:'ERP VinGroup Phase 2', custIdx:2, stage:'NEGOTIATION', val:12_000_000_000, prob:75 },
    { code:'DEAL-E002', title:'Core Banking MB Bank Mobile', custIdx:0, stage:'PROPOSAL', val:8_500_000_000, prob:60 },
    { code:'DEAL-E003', title:'Smart City Platform Hà Nội', custIdx:4, stage:'WON', val:25_000_000_000, prob:100 },
    { code:'DEAL-E004', title:'Telecom BSS Viettel 5G', custIdx:3, stage:'QUALIFICATION', val:15_000_000_000, prob:40 },
    { code:'DEAL-E005', title:'Healthcare Data Platform Vinmec', custIdx:9, stage:'PROPOSAL', val:5_500_000_000, prob:65 },
    { code:'DEAL-E006', title:'Loyalty Platform BIDV', custIdx:10, stage:'WON', val:3_200_000_000, prob:100 },
    { code:'DEAL-E007', title:'Insurance Claims AI PVI', custIdx:8, stage:'NEGOTIATION', val:4_800_000_000, prob:80 },
    { code:'DEAL-E008', title:'Logistics Platform GHN', custIdx:13, stage:'PROPOSAL', val:6_000_000_000, prob:55 },
    { code:'DEAL-E009', title:'E-commerce Tiki 2.0', custIdx:5, stage:'LOST', val:7_000_000_000, prob:0 },
    { code:'DEAL-E010', title:'DevOps Platform FPT', custIdx:4, stage:'QUALIFICATION', val:2_000_000_000, prob:35 },
    { code:'DEAL-E011', title:'HR Payroll TH True Milk Extension', custIdx:2, stage:'WON', val:1_800_000_000, prob:100 },
    { code:'DEAL-E012', title:'Security Audit VPS Securities', custIdx:19, stage:'PROPOSAL', val:900_000_000, prob:70 },
    { code:'DEAL-E013', title:'Airport Ground System Vietnam Airlines', custIdx:15, stage:'NEGOTIATION', val:18_000_000_000, prob:85 },
    { code:'DEAL-E014', title:'Construction ERP Coteccons', custIdx:17, stage:'QUALIFICATION', val:4_200_000_000, prob:45 },
    { code:'DEAL-E015', title:'Energy Management EVN', custIdx:0, stage:'PROPOSAL', val:11_000_000_000, prob:60 },
  ];
  const newDeals = crmDeals.map(d => {
    const now = new Date();
    return {
      id:uid(), code:d.code, title:d.title,
      customer_id:custIds[d.custIdx % custIds.length] || custIds[0],
      stage:d.stage, value:d.val, currency:'VND', probability:d.prob,
      expected_close_date:fmtDate(addDays(now, rand(-30,120))),
      assignee_id:pmId,
      won_at:  d.stage==='WON'  ? fmtDate(addDays(now,-rand(5,60))) : null,
      lost_at: d.stage==='LOST' ? fmtDate(addDays(now,-rand(5,30))) : null,
      lost_reason: d.stage==='LOST' ? 'KH chọn giải pháp nội bộ' : null,
      created_at:now, updated_at:now,
    };
  });
  await bulk('deals', ['id','code','title','customer_id','stage','value','currency','probability','expected_close_date','assignee_id','won_at','lost_at','lost_reason','created_at','updated_at'], newDeals);
  console.log(`  ✓ ${newLeads.length} leads, ${newDeals.length} deals added`);

  // ══════════════════════════════════════════════════════════════════════════
  // PHẦN 4 — Dữ liệu Finance bổ sung
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n💰 Bổ sung dữ liệu Finance...');
  const expExtras = [
    { title:'Chi phí hội nghị Techfest 2026',         cat:'TRAVEL',    amt:15_000_000 },
    { title:'Mua license IntelliJ IDEA cho team BE',   cat:'SOFTWARE',  amt:8_400_000  },
    { title:'Đào tạo AWS Solutions Architect',         cat:'TRAINING',  amt:25_000_000 },
    { title:'Tiếp khách VinGroup tại Hà Nội',          cat:'MEALS',     amt:5_500_000  },
    { title:'Mua MacBook Pro M3 cho dev lead',         cat:'EQUIPMENT', amt:78_000_000 },
    { title:'Chi phí công tác Singapore (AWS Summit)', cat:'TRAVEL',    amt:32_000_000 },
    { title:'Mua Figma Professional team license',     cat:'SOFTWARE',  amt:4_200_000  },
    { title:'Đào tạo PMP cho PM team',                 cat:'TRAINING',  amt:18_000_000 },
    { title:'Tiệc cuối năm team IT',                   cat:'MEALS',     amt:12_000_000 },
    { title:'Nâng cấp RAM server staging',             cat:'EQUIPMENT', amt:6_800_000  },
    { title:'Chi phí công tác Đà Nẵng gặp KH',        cat:'TRAVEL',    amt:8_200_000  },
    { title:'Mua Jira/Confluence licenses',            cat:'SOFTWARE',  amt:11_000_000 },
    { title:'Workshop Agile Scrum nội bộ',             cat:'TRAINING',  amt:9_500_000  },
    { title:'Tân trang văn phòng tầng 5',              cat:'OTHER',     amt:45_000_000 },
    { title:'Chi phí in ấn tài liệu đấu thầu',        cat:'OTHER',     amt:2_300_000  },
  ];
  const expRows2   = [];
  const expItemRows2 = [];
  for (const e of expExtras) {
    const eId = uid();
    const st  = pick(['PENDING','APPROVED','PAID','APPROVED']);
    expRows2.push({
      id:eId, project_id:Math.random()>0.4 ? projRows[rand(0,projRows.length-1)].id : null,
      submitted_by_id:pick(allUserIds), title:e.title, category:e.cat,
      total_amount:e.amt, currency:'VND', status:st,
      approved_by_id:st!=='PENDING'?adminId:null,
      approved_at:st!=='PENDING'?fmtDate(new Date()):null,
      created_at:new Date(), updated_at:new Date(),
    });
    expItemRows2.push({ id:uid(), expense_id:eId, description:e.title, amount:e.amt });
  }
  await bulk('expenses',
    ['id','project_id','submitted_by_id','title','category','total_amount','currency','status','approved_by_id','approved_at','created_at','updated_at'],
    expRows2
  );
  await bulk('expense_items', ['id','expense_id','description','amount'], expItemRows2);

  // Invoices bổ sung (15 hóa đơn có thực chất)
  const invExtras = [
    { code:'INV-E001', cust:0, proj:0, desc:'Core Banking Phase 1 — Development Services', sub:850_000_000, type:'SALES', st:'PAID' },
    { code:'INV-E002', cust:1, proj:1, desc:'Mobile App Q1/2026 Milestone', sub:320_000_000, type:'SALES', st:'SENT' },
    { code:'INV-E003', cust:2, proj:7, desc:'ERP Enterprise System Phase 2', sub:1_200_000_000, type:'SALES', st:'OVERDUE' },
    { code:'INV-E004', cust:3, proj:13, desc:'Telecom Billing — Monthly Maintenance', sub:45_000_000, type:'SALES', st:'PAID' },
    { code:'INV-E005', cust:4, proj:4, desc:'Risk Module Integration & Testing', sub:280_000_000, type:'SALES', st:'PAID' },
    { code:'INV-E006', cust:null, proj:null, desc:'AWS Cloud Services tháng 5/2026', sub:125_000_000, type:'PURCHASE', st:'PAID' },
    { code:'INV-E007', cust:null, proj:null, desc:'JetBrains All Products Pack — Annual', sub:85_000_000, type:'PURCHASE', st:'PAID' },
    { code:'INV-E008', cust:5, proj:30, desc:'E-commerce Platform — Final Delivery', sub:640_000_000, type:'SALES', st:'SENT' },
    { code:'INV-E009', cust:6, proj:16, desc:'CRM Platform — Support & Maintenance', sub:38_000_000, type:'SALES', st:'PAID' },
    { code:'INV-E010', cust:7, proj:8, desc:'Supply Chain Analytics Dashboard', sub:420_000_000, type:'SALES', st:'DRAFT' },
    { code:'INV-E011', cust:8, proj:27, desc:'Insurance Claims Processing Module', sub:510_000_000, type:'SALES', st:'SENT' },
    { code:'INV-E012', cust:null, proj:null, desc:'GitHub Enterprise License — Annual', sub:62_000_000, type:'PURCHASE', st:'PAID' },
    { code:'INV-E013', cust:9, proj:23, desc:'Hospital Information System — Phase 3', sub:780_000_000, type:'SALES', st:'PAID' },
    { code:'INV-E014', cust:10, proj:3, desc:'Digital Wallet API Integration', sub:190_000_000, type:'SALES', st:'OVERDUE' },
    { code:'INV-E015', cust:null, proj:null, desc:'Datadog APM Monitoring — Quarterly', sub:28_000_000, type:'PURCHASE', st:'PAID' },
  ];
  const invRows2  = [];
  const invItemRows2 = [];
  for (const inv of invExtras) {
    const iId   = uid();
    const issueDate = fmtDate(new Date(`2026-0${rand(1,5)}-${String(rand(1,28)).padStart(2,'0')}`));
    const dueDate   = fmtDate(addDays(new Date(issueDate), 45));
    const tax  = Math.floor(inv.sub * 0.1);
    invRows2.push({
      id:iId, code:inv.code, type:inv.type,
      customer_id:inv.cust!==null ? (custIds[inv.cust % custIds.length] || null) : null,
      project_id:inv.proj!==null  ? (projRows[inv.proj % projRows.length]?.id || null) : null,
      issue_date:issueDate, due_date:dueDate, status:inv.st,
      subtotal:inv.sub, tax_amount:tax, total_amount:inv.sub+tax, currency:'VND',
      notes:inv.desc, paid_at:inv.st==='PAID'?fmtDate(addDays(new Date(dueDate),-rand(1,10))):null,
      created_by_id:adminId, created_at:new Date(), updated_at:new Date(),
    });
    invItemRows2.push({ id:uid(), invoice_id:iId, description:inv.desc, quantity:1, unit_price:inv.sub, amount:inv.sub, tax_rate:10 });
  }
  await bulk('invoices',
    ['id','code','type','customer_id','project_id','issue_date','due_date','status','subtotal','tax_amount','total_amount','currency','notes','paid_at','created_by_id','created_at','updated_at'],
    invRows2
  );
  await bulk('invoice_items', ['id','invoice_id','description','quantity','unit_price','amount','tax_rate'], invItemRows2);
  console.log(`  ✓ ${expRows2.length} expenses, ${invRows2.length} invoices added`);

  // ══════════════════════════════════════════════════════════════════════════
  // PHẦN 5 — Dữ liệu Asset bổ sung (20 tài sản có tên cụ thể)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n💻 Bổ sung dữ liệu Assets...');
  const assetExtras = [
    { code:'ASSET-SPEC-001', name:'MacBook Pro 16" M3 Max — CEO',            cat:'LAPTOP',    brand:'Apple',     model:'MacBook Pro M3 Max', price:75_000_000, st:'ASSIGNED' },
    { code:'ASSET-SPEC-002', name:'Dell XPS 15 9530 — CTO',                  cat:'LAPTOP',    brand:'Dell',      model:'XPS 15 9530',        price:42_000_000, st:'ASSIGNED' },
    { code:'ASSET-SPEC-003', name:'iPhone 15 Pro Max — Sales Director',      cat:'PHONE',     brand:'Apple',     model:'iPhone 15 Pro Max',  price:35_000_000, st:'ASSIGNED' },
    { code:'ASSET-SPEC-004', name:'Server Dell PowerEdge R750 — Primary DB', cat:'SERVER',    brand:'Dell',      model:'PowerEdge R750 2U',  price:320_000_000, st:'ASSIGNED' },
    { code:'ASSET-SPEC-005', name:'Server HP ProLiant DL360 — App Server',   cat:'SERVER',    brand:'HP',        model:'ProLiant DL360 Gen10',price:280_000_000, st:'ASSIGNED' },
    { code:'ASSET-SPEC-006', name:'UPS APC Smart-UPS 3000VA',                cat:'OTHER',     brand:'APC',       model:'SMT3000I',           price:28_000_000, st:'AVAILABLE' },
    { code:'ASSET-SPEC-007', name:'NAS Synology DS1823xs+ — File Server',    cat:'SERVER',    brand:'Synology',  model:'DS1823xs+',          price:65_000_000, st:'ASSIGNED' },
    { code:'ASSET-SPEC-008', name:'LG UltraWide 34" — Dev Monitor Set 1',   cat:'PERIPHERAL',brand:'LG',        model:'34WP880',            price:18_500_000, st:'ASSIGNED' },
    { code:'ASSET-SPEC-009', name:'LG UltraWide 34" — Dev Monitor Set 2',   cat:'PERIPHERAL',brand:'LG',        model:'34WP880',            price:18_500_000, st:'AVAILABLE' },
    { code:'ASSET-SPEC-010', name:'Samsung Galaxy Tab S9 Ultra — Design',    cat:'PHONE',     brand:'Samsung',   model:'Galaxy Tab S9 Ultra',price:22_000_000, st:'ASSIGNED' },
    { code:'ASSET-SPEC-011', name:'Lenovo ThinkPad X1 Carbon — PM Lead',    cat:'LAPTOP',    brand:'Lenovo',    model:'X1 Carbon Gen 12',   price:38_000_000, st:'ASSIGNED' },
    { code:'ASSET-SPEC-012', name:'HP ZBook Fury 16 — Data Scientist',       cat:'LAPTOP',    brand:'HP',        model:'ZBook Fury 16 G10',  price:55_000_000, st:'ASSIGNED' },
    { code:'ASSET-SPEC-013', name:'Cisco Catalyst 9300 Switch 48p',          cat:'OTHER',     brand:'Cisco',     model:'C9300-48P',          price:85_000_000, st:'ASSIGNED' },
    { code:'ASSET-SPEC-014', name:'Fortinet FortiGate 200F Firewall',        cat:'OTHER',     brand:'Fortinet',  model:'FortiGate 200F',     price:120_000_000, st:'ASSIGNED' },
    { code:'ASSET-SPEC-015', name:'Logitech MX Keys S Combo Pack ×10',      cat:'PERIPHERAL',brand:'Logitech',  model:'MX Keys S Combo',    price:15_000_000, st:'AVAILABLE' },
    { code:'ASSET-SPEC-016', name:'Plantronics Headset Poly Voyager ×20',   cat:'PERIPHERAL',brand:'Poly',      model:'Voyager Focus 2',    price:12_000_000, st:'AVAILABLE' },
    { code:'ASSET-SPEC-017', name:'Apple iPad Pro 12.9" M4 — UX Team',      cat:'PHONE',     brand:'Apple',     model:'iPad Pro M4',        price:28_000_000, st:'ASSIGNED' },
    { code:'ASSET-SPEC-018', name:'Wacom Cintiq 22 — UI Designer',          cat:'PERIPHERAL',brand:'Wacom',     model:'Cintiq 22',          price:22_000_000, st:'ASSIGNED' },
    { code:'ASSET-SPEC-019', name:'ThinkStation P360 Ultra — Build Server',  cat:'DESKTOP',   brand:'Lenovo',    model:'ThinkStation P360',  price:48_000_000, st:'UNDER_MAINTENANCE' },
    { code:'ASSET-SPEC-020', name:'MacBook Air M2 13" — QA Engineer ×5',    cat:'LAPTOP',    brand:'Apple',     model:'MacBook Air M2',     price:95_000_000, st:'ASSIGNED' },
  ];
  const assetRows2   = [];
  const assetAssRows2 = [];
  const assetMaintRows2 = [];
  for (const a of assetExtras) {
    const aId = uid();
    assetRows2.push({
      id:aId, code:a.code, name:a.name, category:a.cat,
      brand:a.brand, model:a.model, serial_number:`SN-SPEC-${rand(10000,99999)}`,
      org_unit_id:orgMap['IT'] || (Object.values(orgMap)[0]),
      status:a.st, purchase_date:fmtDate(new Date('2025-01-01')),
      purchase_price:a.price, depreciation_years:3,
      notes:'Tài sản cao cấp — theo dõi chặt',
      created_at:new Date(), updated_at:new Date(),
    });
    if (a.st === 'ASSIGNED' && empRows.length > 0) {
      const emp = empRows[assetRows2.length % empRows.length];
      assetAssRows2.push({
        id:uid(), asset_id:aId, employee_id:emp.id,
        assigned_at:new Date('2025-02-01'), returned_at:null,
        notes:'Cấp phát theo chức vụ', created_at:new Date(),
      });
    }
    if (a.st === 'UNDER_MAINTENANCE') {
      assetMaintRows2.push({
        id:uid(), asset_id:aId, type:'Bảo trì định kỳ',
        performed_at:fmtDate(new Date()),
        cost:rand(500_000,2_000_000), performed_by:'Kỹ thuật nội bộ',
        notes:'Kiểm tra định kỳ hàng quý', created_at:new Date(),
      });
    }
  }
  await bulk('assets',
    ['id','code','name','category','brand','model','serial_number','org_unit_id','status','purchase_date','purchase_price','depreciation_years','notes','created_at','updated_at'],
    assetRows2
  );
  await bulk('asset_assignments', ['id','asset_id','employee_id','assigned_at','returned_at','notes','created_at'], assetAssRows2);
  await bulk('asset_maintenance', ['id','asset_id','type','performed_at','cost','performed_by','notes','created_at'], assetMaintRows2);
  console.log(`  ✓ ${assetRows2.length} assets, ${assetAssRows2.length} assignments added`);

  // ══════════════════════════════════════════════════════════════════════════
  // PHẦN 6 — Dữ liệu Tuyển dụng bổ sung (15 job openings cụ thể)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n🎯 Bổ sung dữ liệu Recruitment...');
  const jobExtras = [
    { code:'JOB-E01', title:'Senior Java Developer (Spring Boot)', level:'SENIOR', headcount:4, org:'JAVA', salary:[35,55], req:'5+ năm Java/Spring Boot/Microservices, kinh nghiệm dự án tài chính/ngân hàng' },
    { code:'JOB-E02', title:'Frontend Lead Engineer (React)', level:'SENIOR', headcount:2, org:'FE', salary:[40,65], req:'6+ năm React/TypeScript, experience leading FE team, code review, architecture' },
    { code:'JOB-E03', title:'.NET Core Senior Developer', level:'SENIOR', headcount:3, org:'NET', salary:[35,52], req:'5+ năm .NET Core, EF Core, Azure/AWS, enterprise app development' },
    { code:'JOB-E04', title:'iOS/Android Mobile Dev', level:'MID', headcount:2, org:'MOBILE', salary:[20,35], req:'3+ năm React Native hoặc Flutter, publish app lên App Store/Play Store' },
    { code:'JOB-E05', title:'QA Automation Engineer', level:'MID', headcount:3, org:'QA', salary:[18,28], req:'3+ năm Playwright/Selenium, REST API testing, CI/CD integration, BDD' },
    { code:'JOB-E06', title:'Data Engineer (Spark/Databricks)', level:'SENIOR', headcount:2, org:'DE', salary:[40,60], req:'5+ năm Big Data pipeline, Spark, Kafka, Airflow, cloud data warehouse' },
    { code:'JOB-E07', title:'Machine Learning Engineer', level:'SENIOR', headcount:1, org:'DS', salary:[45,70], req:'PhD hoặc 5+ năm ML/AI production, Python, TensorFlow/PyTorch, MLOps' },
    { code:'JOB-E08', title:'Cloud & DevOps Engineer (AWS)', level:'SENIOR', headcount:2, org:'DEVOPS', salary:[40,65], req:'AWS Certified Solutions Architect, Kubernetes, Terraform, CI/CD automation' },
    { code:'JOB-E09', title:'Senior Business Analyst (Banking)', level:'SENIOR', headcount:3, org:'BA', salary:[28,45], req:'5+ năm BA trong domain ngân hàng/tài chính, BABOK, BPMN, SQL' },
    { code:'JOB-E10', title:'Project Manager (Agile)', level:'SENIOR', headcount:2, org:'PM_T', salary:[35,55], req:'PMP/Scrum Master certified, 5+ năm PM phần mềm, stakeholder management' },
    { code:'JOB-E11', title:'Product Owner / Product Manager', level:'MID', headcount:1, org:'PM_T', salary:[30,50], req:'3+ năm PO/PM trong SaaS/platform, backlog management, OKR' },
    { code:'JOB-E12', title:'UX Researcher & Designer', level:'MID', headcount:2, org:'UX', salary:[20,35], req:'3+ năm user research, Figma, usability testing, design thinking' },
    { code:'JOB-E13', title:'UI Designer (Web & Mobile)', level:'MID', headcount:2, org:'UI', salary:[18,30], req:'3+ năm UI design, Figma, design system, responsive design, animation' },
    { code:'JOB-E14', title:'Application Security Engineer', level:'SENIOR', headcount:1, org:'SEC', salary:[45,70], req:'OSCP/CISSP, penetration testing, OWASP Top 10, threat modeling, secure SDLC' },
    { code:'JOB-E15', title:'HR Business Partner (Tech)', level:'MID', headcount:1, org:'HRD', salary:[25,40], req:'3+ năm HRBP trong công ty công nghệ, talent acquisition, performance management' },
  ];
  const jobRows2 = jobExtras.map(j => ({
    id:uid(), code:j.code, title:j.title,
    org_unit_id:orgMap[j.org] || orgMap['IT'],
    level:j.level, headcount:j.headcount,
    status:pick(['OPEN','OPEN','OPEN','ON_HOLD']),
    requirements:j.req,
    salary_from:j.salary[0]*1_000_000,
    salary_to:j.salary[1]*1_000_000,
    created_at:new Date(), updated_at:new Date(),
  }));
  await bulk('job_openings',
    ['id','code','title','org_unit_id','level','headcount','status','requirements','salary_from','salary_to','created_at','updated_at'],
    jobRows2
  );

  // 20 ứng viên cụ thể cho các job mới
  const candExtras = [
    { name:'Nguyễn Hoàng Long',  email:'hlong.nguyen@gmail.com',   job:0,  stage:'INTERVIEW', salary:42_000_000 },
    { name:'Trần Minh Khôi',     email:'khoi.tran.dev@gmail.com',   job:0,  stage:'OFFER',     salary:48_000_000 },
    { name:'Lê Thị Thanh Hương', email:'thuong.le.fe@gmail.com',    job:1,  stage:'INTERVIEW', salary:50_000_000 },
    { name:'Phạm Anh Tuấn',      email:'tuan.pham.java@gmail.com',  job:0,  stage:'SCREENING', salary:38_000_000 },
    { name:'Hoàng Ngọc Bảo',     email:'bao.hoang.net@gmail.com',   job:2,  stage:'INTERVIEW', salary:44_000_000 },
    { name:'Vũ Thị Thu Trang',   email:'trang.vu.mobile@gmail.com', job:3,  stage:'APPLIED',   salary:28_000_000 },
    { name:'Đặng Văn Nghĩa',     email:'nghia.dang.qa@gmail.com',   job:4,  stage:'INTERVIEW', salary:25_000_000 },
    { name:'Bùi Thị Lan Chi',    email:'chi.bui.data@gmail.com',    job:5,  stage:'OFFER',     salary:55_000_000 },
    { name:'Đỗ Quang Huy',       email:'huy.do.ml@gmail.com',       job:6,  stage:'INTERVIEW', salary:65_000_000 },
    { name:'Hồ Thị Diễm Quỳnh', email:'quynh.ho.aws@gmail.com',    job:7,  stage:'INTERVIEW', salary:52_000_000 },
    { name:'Ngô Văn Phúc',       email:'phuc.ngo.ba@gmail.com',     job:8,  stage:'SCREENING', salary:35_000_000 },
    { name:'Dương Thị Mai Linh', email:'linh.duong.pm@gmail.com',   job:9,  stage:'INTERVIEW', salary:45_000_000 },
    { name:'Lý Minh Trí',        email:'tri.ly.po@gmail.com',       job:10, stage:'OFFER',     salary:42_000_000 },
    { name:'Đinh Thị Khánh Vân', email:'van.dinh.ux@gmail.com',     job:11, stage:'INTERVIEW', salary:28_000_000 },
    { name:'Trịnh Văn Đức Thịnh',email:'thinh.trinh.ui@gmail.com',  job:12, stage:'APPLIED',   salary:22_000_000 },
    { name:'Cao Thị Tuyết Nhi',  email:'nhi.cao.sec@gmail.com',     job:13, stage:'INTERVIEW', salary:60_000_000 },
    { name:'Hà Văn Bảo Trung',   email:'trung.ha.hr@gmail.com',     job:14, stage:'INTERVIEW', salary:32_000_000 },
    { name:'Vương Thị Thanh Nga', email:'nga.vuong.fe@gmail.com',   job:1,  stage:'SCREENING', salary:38_000_000 },
    { name:'Tô Minh Khoa',       email:'khoa.to.devops@gmail.com',  job:7,  stage:'APPLIED',   salary:48_000_000 },
    { name:'Nguyễn Thị Ánh Tuyết',email:'tuyet.nguyen.java@gmail.com',job:0,stage:'REJECTED', salary:35_000_000 },
  ];
  const candRows2 = candExtras.map((c, i) => ({
    id:uid(), name:c.name, email:c.email,
    phone:`09${String(rand(10000000,99999999))}`,
    job_opening_id:jobRows2[c.job % jobRows2.length].id,
    stage:c.stage, assignee_id:hrId,
    source:pick(['WEBSITE','REFERRAL','SOCIAL','OTHER']),
    expected_salary:c.salary, notes:'Ứng viên đã được screening qua HR',
    created_at:new Date(), updated_at:new Date(),
  }));
  await bulk('candidates',
    ['id','name','email','phone','job_opening_id','stage','assignee_id','source','expected_salary','notes','created_at','updated_at'],
    candRows2
  );

  // Thêm interviews cho ứng viên INTERVIEW/OFFER
  const ivRows2 = [];
  for (const c of candRows2.filter(c => ['INTERVIEW','OFFER','HIRED'].includes(c.stage))) {
    ivRows2.push({
      id:uid(), candidate_id:c.id, type:'PHONE',
      scheduled_at:new Date('2026-05-10T09:00:00'),
      location:'Google Meet', interviewers:[hrId],
      result:'PASS', score:rand(80,92), notes:'Ứng viên trình bày tốt, kinh nghiệm phù hợp',
      created_at:new Date(), updated_at:new Date(),
    });
    if (['INTERVIEW','OFFER'].includes(c.stage)) {
      ivRows2.push({
        id:uid(), candidate_id:c.id, type:'TECHNICAL',
        scheduled_at:new Date('2026-05-20T14:00:00'),
        location:'Văn phòng Loop.vn — Phòng Hội nghị A', interviewers:[pmId],
        result:c.stage==='OFFER'?'PASS':'PENDING',
        score:c.stage==='OFFER'?rand(82,95):null,
        notes:c.stage==='OFFER'?'Ứng viên vượt qua bài kiểm tra kỹ thuật xuất sắc':null,
        created_at:new Date(), updated_at:new Date(),
      });
    }
  }
  await bulk('interviews',
    ['id','candidate_id','type','scheduled_at','location','interviewers','result','score','notes','created_at','updated_at'],
    ivRows2
  );
  console.log(`  ✓ ${jobRows2.length} job openings, ${candRows2.length} candidates, ${ivRows2.length} interviews added`);

  // ══════════════════════════════════════════════════════════════════════════
  // PHẦN 7 — Leave requests gắn với process instances
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n🏖  Cập nhật leave requests với process instances...');
  // Lấy process instances leave đã tạo
  const leaveInstances = (await db.query(
    `SELECT pi.id, pi.started_by FROM process_instances pi
     JOIN process_definitions pd ON pd.id=pi.definition_id
     WHERE pd.key='leave-approval' AND pi.status IN ('RUNNING','COMPLETED')
     ORDER BY pi.started_at DESC LIMIT 20`
  )).rows;

  const leaveTypeRow = (await db.query(`SELECT id FROM leave_types WHERE name='Nghỉ phép năm' LIMIT 1`)).rows[0];
  const empForLeave  = (await db.query(`SELECT id FROM employees WHERE is_active=true LIMIT 20`)).rows;

  if (leaveTypeRow && leaveInstances.length > 0 && empForLeave.length > 0) {
    const leaveLinked = leaveInstances.slice(0, 10).map((pi, i) => ({
      id:uid(),
      employee_id:empForLeave[i % empForLeave.length].id,
      leave_type_id:leaveTypeRow.id,
      start_date:fmtDate(addDays(new Date(),rand(5,30))),
      end_date:fmtDate(addDays(new Date(),rand(6,35))),
      days:rand(1,4),
      reason:'Công việc gia đình / Sức khỏe',
      status: pi.status==='COMPLETED' ? 'APPROVED' : 'PENDING',
      approved_by_id: pi.status==='COMPLETED' ? hrId : null,
      approved_at: pi.status==='COMPLETED' ? fmtDate(new Date()) : null,
      process_instance_id:pi.id,
      created_at:new Date(), updated_at:new Date(),
    }));
    await bulk('leave_requests',
      ['id','employee_id','leave_type_id','start_date','end_date','days','reason','status','approved_by_id','approved_at','process_instance_id','created_at','updated_at'],
      leaveLinked
    );
    console.log(`  ✓ ${leaveLinked.length} leave requests linked to process instances`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════════════════════════
  const counts = await Promise.all([
    db.query(`SELECT COUNT(*) FROM process_definitions`),
    db.query(`SELECT COUNT(*) FROM process_instances`),
    db.query(`SELECT COUNT(*) FROM process_user_tasks WHERE status='PENDING'`),
    db.query(`SELECT COUNT(*) FROM deals`),
    db.query(`SELECT COUNT(*) FROM invoices`),
    db.query(`SELECT COUNT(*) FROM expenses`),
    db.query(`SELECT COUNT(*) FROM assets`),
    db.query(`SELECT COUNT(*) FROM job_openings`),
    db.query(`SELECT COUNT(*) FROM candidates`),
  ]);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ PATCH HOÀN TẤT!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 Tổng kết sau patch:');
  console.log(`   • BPM Quy trình: ${counts[0].rows[0].count} definitions (với BPMN DI diagram)`);
  console.log(`   • Process Instances: ${counts[1].rows[0].count} (${counts[2].rows[0].count} tasks đang chờ)`);
  console.log(`   • CRM Deals:  ${counts[3].rows[0].count}`);
  console.log(`   • Invoices:   ${counts[4].rows[0].count}`);
  console.log(`   • Expenses:   ${counts[5].rows[0].count}`);
  console.log(`   • Assets:     ${counts[6].rows[0].count}`);
  console.log(`   • Job Openings: ${counts[7].rows[0].count}`);
  console.log(`   • Candidates:   ${counts[8].rows[0].count}`);
  console.log('═══════════════════════════════════════════════════════');

  await db.end();
}

main().catch(err => {
  console.error('❌ Patch thất bại:', err.message);
  db.end();
  process.exit(1);
});
