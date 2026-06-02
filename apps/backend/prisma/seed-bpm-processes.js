const { Client } = require('pg');
const { randomUUID } = require('crypto');

const DB_URL = process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db';

// Sinh BPMN hợp lệ KÈM sơ đồ (BPMNDI) để bpmn-js render: start → các userTask tuần tự → end
function makeBpmn(processId, tasks) {
  const els = [];   // phần tử process
  const flows = []; // sequenceFlow
  const shapes = []; // BPMNShape
  const edges = [];  // BPMNEdge

  // Layout ngang: start (36x36) → task (100x80) → ... → end (36x36)
  const GAP = 60, TASK_W = 110, TASK_H = 80, EV = 36, CY = 140;
  const startX = 160;
  const ids = ['StartEvent_1', ...tasks.map((t) => t.id), 'EndEvent_1'];
  const xOf = {};
  let x = startX;
  ids.forEach((id, i) => {
    xOf[id] = x;
    x += (i === 0 || i === ids.length - 1 ? EV : TASK_W) + GAP;
  });

  // Phần tử + incoming/outgoing
  const flowId = (i) => `Flow_${i}`;
  els.push(`    <bpmn:startEvent id="StartEvent_1"><bpmn:outgoing>${flowId(0)}</bpmn:outgoing></bpmn:startEvent>`);
  tasks.forEach((t, i) => {
    els.push(`    <bpmn:userTask id="${t.id}" name="${t.name}"><bpmn:incoming>${flowId(i)}</bpmn:incoming><bpmn:outgoing>${flowId(i + 1)}</bpmn:outgoing></bpmn:userTask>`);
  });
  els.push(`    <bpmn:endEvent id="EndEvent_1"><bpmn:incoming>${flowId(tasks.length)}</bpmn:incoming></bpmn:endEvent>`);

  // Sequence flows
  const seq = ['StartEvent_1', ...tasks.map((t) => t.id), 'EndEvent_1'];
  for (let i = 0; i < seq.length - 1; i++) {
    flows.push(`    <bpmn:sequenceFlow id="${flowId(i)}" sourceRef="${seq[i]}" targetRef="${seq[i + 1]}" />`);
  }

  // DI shapes
  const isEv = (id) => id === 'StartEvent_1' || id === 'EndEvent_1';
  ids.forEach((id) => {
    const w = isEv(id) ? EV : TASK_W;
    const h = isEv(id) ? EV : TASK_H;
    const y = CY - h / 2;
    shapes.push(`      <bpmndi:BPMNShape id="${id}_di" bpmnElement="${id}"><dc:Bounds x="${xOf[id]}" y="${y}" width="${w}" height="${h}" /></bpmndi:BPMNShape>`);
  });
  // DI edges (nối tâm phải nguồn → tâm trái đích)
  const rightX = (id) => xOf[id] + (isEv(id) ? EV : TASK_W);
  for (let i = 0; i < seq.length - 1; i++) {
    const a = seq[i], b = seq[i + 1];
    edges.push(`      <bpmndi:BPMNEdge id="${flowId(i)}_di" bpmnElement="${flowId(i)}"><di:waypoint x="${rightX(a)}" y="${CY}" /><di:waypoint x="${xOf[b]}" y="${CY}" /></bpmndi:BPMNEdge>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_${processId}" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="${processId}" isExecutable="true">
${els.join('\n')}
${flows.join('\n')}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">
${shapes.join('\n')}
${edges.join('\n')}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

const DECISION = (label = 'Quyết định') => ({
  name: 'decision', label, type: 'select', required: true,
  options: [{ label: 'Duyệt', value: 'APPROVED' }, { label: 'Từ chối', value: 'REJECTED' }],
});
const NOTE = { name: 'note', label: 'Ý kiến / Ghi chú', type: 'textarea', required: false };

// Danh sách quy trình cần tạo
const PROCESSES = [
  {
    key: 'expense-approval', name: 'Quy trình duyệt chi phí',
    tasks: [{ id: 'ManagerApprove', name: 'Quản lý duyệt chi phí' }, { id: 'FinanceApprove', name: 'Kế toán duyệt thanh toán' }],
    form: [
      { name: 'title', label: 'Nội dung chi phí', type: 'text', required: true },
      { name: 'amount', label: 'Số tiền', type: 'number', required: true, min: 0 },
      { name: 'category', label: 'Loại chi phí', type: 'text', required: false },
      { name: 'reason', label: 'Lý do', type: 'textarea', required: false },
    ],
    approvers: { ManagerApprove: 'managerUserId', FinanceApprove: 'financeUserId' },
  },
  {
    key: 'performance-review', name: 'Quy trình đánh giá nhân sự',
    tasks: [{ id: 'ManagerReview', name: 'Quản lý đánh giá' }, { id: 'HrConfirm', name: 'HR xác nhận kết quả' }],
    form: [
      { name: 'period', label: 'Kỳ đánh giá', type: 'text', required: true },
      { name: 'employeeName', label: 'Nhân viên', type: 'text', required: true },
      { name: 'selfAssessment', label: 'Tự đánh giá', type: 'textarea', required: false },
    ],
    taskForm: {
      ManagerReview: [
        { name: 'score', label: 'Điểm đánh giá (1-10)', type: 'number', required: true, min: 1, max: 10 },
        { name: 'strengths', label: 'Điểm mạnh', type: 'textarea', required: false },
        { name: 'improvements', label: 'Cần cải thiện', type: 'textarea', required: false },
      ],
      HrConfirm: [DECISION('Xác nhận'), NOTE],
    },
    approvers: { ManagerReview: 'managerUserId', HrConfirm: 'hrUserId' },
  },
  {
    key: 'contract-renewal', name: 'Quy trình đánh giá & gia hạn hợp đồng',
    tasks: [{ id: 'ManagerEvaluate', name: 'Quản lý đánh giá gia hạn' }, { id: 'HrApprove', name: 'HR phê duyệt gia hạn' }],
    form: [
      { name: 'employeeName', label: 'Nhân viên', type: 'text', required: true },
      { name: 'currentContract', label: 'Hợp đồng hiện tại', type: 'text', required: false },
      { name: 'expiryDate', label: 'Ngày hết hạn', type: 'date', required: true },
    ],
    taskForm: {
      ManagerEvaluate: [
        { name: 'recommendation', label: 'Đề xuất', type: 'select', required: true, options: [
          { label: 'Gia hạn', value: 'RENEW' }, { label: 'Không gia hạn', value: 'TERMINATE' }] },
        { name: 'newDuration', label: 'Thời hạn mới (tháng)', type: 'number', required: false },
        NOTE,
      ],
      HrApprove: [DECISION(), NOTE],
    },
    approvers: { ManagerEvaluate: 'managerUserId', HrApprove: 'hrUserId' },
  },
  {
    key: 'probation-evaluation', name: 'Quy trình đánh giá thử việc',
    tasks: [{ id: 'MentorEvaluate', name: 'Người hướng dẫn đánh giá' }, { id: 'ManagerDecide', name: 'Quản lý quyết định' }],
    form: [
      { name: 'employeeName', label: 'Nhân viên thử việc', type: 'text', required: true },
      { name: 'probationEnd', label: 'Ngày kết thúc thử việc', type: 'date', required: true },
    ],
    taskForm: {
      MentorEvaluate: [
        { name: 'score', label: 'Điểm thử việc (1-10)', type: 'number', required: true, min: 1, max: 10 },
        { name: 'comment', label: 'Nhận xét', type: 'textarea', required: true },
      ],
      ManagerDecide: [
        { name: 'result', label: 'Kết quả', type: 'select', required: true, options: [
          { label: 'Đạt - chuyển chính thức', value: 'PASS' }, { label: 'Không đạt', value: 'FAIL' }, { label: 'Gia hạn thử việc', value: 'EXTEND' }] },
        NOTE,
      ],
    },
    approvers: { MentorEvaluate: 'mentorUserId', ManagerDecide: 'managerUserId' },
  },
  {
    key: 'employee-onboarding', name: 'Quy trình onboarding nhân viên mới',
    tasks: [{ id: 'HrPrepare', name: 'HR chuẩn bị hồ sơ & tài khoản' }, { id: 'ItSetup', name: 'IT cấp thiết bị & tài khoản' }, { id: 'ManagerWelcome', name: 'Quản lý tiếp nhận' }],
    form: [
      { name: 'employeeName', label: 'Nhân viên mới', type: 'text', required: true },
      { name: 'startDate', label: 'Ngày bắt đầu', type: 'date', required: true },
      { name: 'position', label: 'Vị trí', type: 'text', required: false },
    ],
    taskForm: {
      HrPrepare: [{ name: 'done', label: 'Hoàn tất', type: 'select', required: true, options: [{ label: 'Đã xong', value: 'DONE' }] }, NOTE],
      ItSetup: [{ name: 'done', label: 'Hoàn tất', type: 'select', required: true, options: [{ label: 'Đã xong', value: 'DONE' }] }, NOTE],
      ManagerWelcome: [DECISION('Hoàn tất tiếp nhận'), NOTE],
    },
    approvers: { HrPrepare: 'hrUserId', ItSetup: 'itUserId', ManagerWelcome: 'managerUserId' },
  },
  {
    key: 'employee-offboarding-v1', name: 'Quy trình offboarding nghỉ việc',
    tasks: [{ id: 'ManagerApprove', name: 'Quản lý duyệt nghỉ việc' }, { id: 'HandoverConfirm', name: 'Xác nhận bàn giao' }, { id: 'HrFinalize', name: 'HR chốt thủ tục & lương' }],
    form: [
      { name: 'employeeName', label: 'Nhân viên', type: 'text', required: true },
      { name: 'lastWorkingDay', label: 'Ngày làm việc cuối', type: 'date', required: true },
      { name: 'reason', label: 'Lý do nghỉ', type: 'textarea', required: false },
    ],
    taskForm: {
      ManagerApprove: [DECISION(), NOTE],
      HandoverConfirm: [{ name: 'done', label: 'Đã bàn giao', type: 'select', required: true, options: [{ label: 'Đã bàn giao đầy đủ', value: 'DONE' }] }, NOTE],
      HrFinalize: [DECISION('Chốt thủ tục'), NOTE],
    },
    approvers: { ManagerApprove: 'managerUserId', HandoverConfirm: 'managerUserId', HrFinalize: 'hrUserId' },
  },
  {
    key: 'salary-review', name: 'Quy trình điều chỉnh lương',
    tasks: [{ id: 'ManagerPropose', name: 'Quản lý đề xuất' }, { id: 'HrReview', name: 'HR thẩm định' }, { id: 'BodApprove', name: 'Ban giám đốc phê duyệt' }],
    form: [
      { name: 'employeeName', label: 'Nhân viên', type: 'text', required: true },
      { name: 'currentSalary', label: 'Lương hiện tại', type: 'number', required: true },
      { name: 'proposedSalary', label: 'Lương đề xuất', type: 'number', required: true },
      { name: 'reason', label: 'Lý do', type: 'textarea', required: false },
    ],
    taskForm: {
      ManagerPropose: [NOTE],
      HrReview: [DECISION('Thẩm định'), NOTE],
      BodApprove: [DECISION('Phê duyệt'), NOTE],
    },
    approvers: { ManagerPropose: 'managerUserId', HrReview: 'hrUserId', BodApprove: 'bodUserId' },
  },
  {
    key: 'budget-approval', name: 'Quy trình duyệt ngân sách',
    tasks: [{ id: 'FinanceReview', name: 'Tài chính thẩm định' }, { id: 'BodApprove', name: 'Ban giám đốc phê duyệt' }],
    form: [
      { name: 'planName', label: 'Tên kế hoạch ngân sách', type: 'text', required: true },
      { name: 'fiscalYear', label: 'Năm tài chính', type: 'number', required: true },
      { name: 'totalAmount', label: 'Tổng ngân sách', type: 'number', required: true },
    ],
    taskForm: { FinanceReview: [DECISION('Thẩm định'), NOTE], BodApprove: [DECISION('Phê duyệt'), NOTE] },
    approvers: { FinanceReview: 'financeUserId', BodApprove: 'bodUserId' },
  },
  {
    key: 'recruitment-request', name: 'Quy trình duyệt yêu cầu tuyển dụng',
    tasks: [{ id: 'HrReview', name: 'HR xem xét nhu cầu' }, { id: 'BodApprove', name: 'Ban giám đốc phê duyệt headcount' }],
    form: [
      { name: 'jobTitle', label: 'Vị trí cần tuyển', type: 'text', required: true },
      { name: 'quantity', label: 'Số lượng', type: 'number', required: true, min: 1 },
      { name: 'reason', label: 'Lý do tuyển', type: 'textarea', required: false },
    ],
    taskForm: { HrReview: [DECISION('Xem xét'), NOTE], BodApprove: [DECISION('Phê duyệt'), NOTE] },
    approvers: { HrReview: 'hrUserId', BodApprove: 'bodUserId' },
  },
  {
    key: 'purchase-approval', name: 'Quy trình duyệt mua hàng',
    tasks: [{ id: 'ManagerApprove', name: 'Quản lý duyệt nhu cầu' }, { id: 'FinanceApprove', name: 'Tài chính duyệt ngân sách' }],
    form: [
      { name: 'item', label: 'Hạng mục mua', type: 'text', required: true },
      { name: 'quantity', label: 'Số lượng', type: 'number', required: true, min: 1 },
      { name: 'estimatedCost', label: 'Chi phí dự kiến', type: 'number', required: true },
    ],
    taskForm: { ManagerApprove: [DECISION(), NOTE], FinanceApprove: [DECISION('Duyệt ngân sách'), NOTE] },
    approvers: { ManagerApprove: 'managerUserId', FinanceApprove: 'financeUserId' },
  },
  {
    key: 'business-trip-approval', name: 'Quy trình duyệt công tác',
    tasks: [{ id: 'ManagerApprove', name: 'Quản lý duyệt công tác' }],
    form: [
      { name: 'destination', label: 'Địa điểm', type: 'text', required: true },
      { name: 'fromDate', label: 'Từ ngày', type: 'date', required: true },
      { name: 'toDate', label: 'Đến ngày', type: 'date', required: true },
      { name: 'purpose', label: 'Mục đích', type: 'textarea', required: false },
    ],
    taskForm: { ManagerApprove: [DECISION(), NOTE] },
    approvers: { ManagerApprove: 'managerUserId' },
  },
  {
    key: 'training-request', name: 'Quy trình duyệt đào tạo',
    tasks: [{ id: 'ManagerApprove', name: 'Quản lý duyệt' }, { id: 'HrApprove', name: 'HR duyệt ngân sách đào tạo' }],
    form: [
      { name: 'courseName', label: 'Khóa đào tạo', type: 'text', required: true },
      { name: 'cost', label: 'Chi phí', type: 'number', required: false },
      { name: 'reason', label: 'Lý do', type: 'textarea', required: false },
    ],
    taskForm: { ManagerApprove: [DECISION(), NOTE], HrApprove: [DECISION('Duyệt ngân sách'), NOTE] },
    approvers: { ManagerApprove: 'managerUserId', HrApprove: 'hrUserId' },
  },
];

async function upsert(client, p, orgUnitId) {
  const bpmnXml = makeBpmn(p.key, p.tasks);
  // taskForm mặc định: mỗi task có decision + note nếu chưa khai báo
  const taskForm = p.taskForm ?? p.tasks.reduce((acc, t) => { acc[t.id] = [DECISION(), NOTE]; return acc; }, {});
  const stepConfig = Object.fromEntries(
    Object.entries(p.approvers ?? {}).map(([taskId, variablePath]) => [
      taskId,
      {
        assigneeConfig: { mode: 'variable', variablePath },
        notificationConfig: {
          taskAssigned: {
            enabled: true,
            recipients: ['assignee'],
            subject: `[Loop 360] Bạn có task mới: {{task.name}}`,
            bodyTemplate: `<p>Xin chào {{assignee.name}},</p><p>Bạn có task mới từ quy trình <strong>{{process.name}}</strong>:</p><p><strong>{{task.name}}</strong></p><p>Vui lòng xử lý trước <em>{{dueDate}}</em></p>`,
          },
        },
      },
    ])
  );
  const existing = await client.query('SELECT id FROM process_definitions WHERE key = $1', [p.key]);
  if (existing.rows.length > 0) {
    await client.query(
      `UPDATE process_definitions SET name=$2, bpmn_xml=$3, status='ACTIVE', form_fields=$4, task_form_fields=$5, step_config=$6, updated_at=NOW() WHERE key=$1`,
      [p.key, p.name, bpmnXml, JSON.stringify(p.form), JSON.stringify(taskForm), JSON.stringify(stepConfig)]
    );
    return 'updated';
  }
  await client.query(
    `INSERT INTO process_definitions (id, key, name, bpmn_xml, status, org_unit_id, form_fields, task_form_fields, step_config, updated_at)
     VALUES ($1,$2,$3,$4,'ACTIVE',$5,$6,$7,$8,NOW())`,
    [randomUUID(), p.key, p.name, bpmnXml, orgUnitId, JSON.stringify(p.form), JSON.stringify(taskForm), JSON.stringify(stepConfig)]
  );
  return 'created';
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  const orgRes = await client.query('SELECT id FROM org_units WHERE parent_id IS NULL LIMIT 1');
  if (orgRes.rows.length === 0) { console.error('❌ Không có OrgUnit gốc'); await client.end(); return; }
  const orgUnitId = orgRes.rows[0].id;

  let created = 0, updated = 0;
  for (const p of PROCESSES) {
    const r = await upsert(client, p, orgUnitId);
    r === 'created' ? created++ : updated++;
    console.log(`  ✓ ${r}: ${p.key} (${p.tasks.length} bước)`);
  }
  console.log(`\n✅ Seeded ${PROCESSES.length} quy trình BPM (${created} mới, ${updated} cập nhật)`);
  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
