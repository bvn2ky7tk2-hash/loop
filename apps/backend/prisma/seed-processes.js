const { Client } = require('pg');
const { randomUUID } = require('crypto');

const DB_URL = process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db';

const LEAVE_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="leave-approval" isExecutable="true">
    <startEvent id="StartEvent_1" />
    <sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="ManagerApproveTask" />
    <userTask id="ManagerApproveTask" name="Manager duyệt đơn nghỉ phép" />
    <sequenceFlow id="Flow_2" sourceRef="ManagerApproveTask" targetRef="EndEvent_1" />
    <endEvent id="EndEvent_1" />
  </process>
</definitions>`;

const OT_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="overtime-approval" isExecutable="true">
    <startEvent id="StartEvent_1" />
    <sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="ApproveOTTask" />
    <userTask id="ApproveOTTask" name="Manager duyệt đăng ký OT" />
    <sequenceFlow id="Flow_2" sourceRef="ApproveOTTask" targetRef="EndEvent_1" />
    <endEvent id="EndEvent_1" />
  </process>
</definitions>`;

async function upsertProcess(client, key, name, bpmnXml, orgUnitId, formFields, taskFormFields, stepConfig) {
  const existing = await client.query('SELECT id FROM process_definitions WHERE key = $1', [key]);
  if (existing.rows.length > 0) {
    await client.query(
      `UPDATE process_definitions SET
        name = $2, bpmn_xml = $3, status = 'ACTIVE',
        form_fields = $4, task_form_fields = $5, step_config = $6,
        updated_at = NOW()
       WHERE key = $1`,
      [key, name, bpmnXml, JSON.stringify(formFields), JSON.stringify(taskFormFields), JSON.stringify(stepConfig)]
    );
    console.log('  ✓ Updated:', key);
  } else {
    await client.query(
      `INSERT INTO process_definitions (id, key, name, bpmn_xml, status, org_unit_id, form_fields, task_form_fields, step_config, updated_at)
       VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6, $7, $8, NOW())`,
      [randomUUID(), key, name, bpmnXml, orgUnitId, JSON.stringify(formFields), JSON.stringify(taskFormFields), JSON.stringify(stepConfig)]
    );
    console.log('  ✓ Created:', key);
  }
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  // Lấy OrgUnit gốc (không có parent)
  const orgRes = await client.query('SELECT id FROM org_units WHERE parent_id IS NULL LIMIT 1');
  if (orgRes.rows.length === 0) {
    console.error('❌ Không tìm thấy OrgUnit gốc, bỏ qua seed process definitions');
    await client.end();
    return;
  }
  const orgUnitId = orgRes.rows[0].id;

  await upsertProcess(
    client,
    'leave-approval',
    'Quy trình duyệt nghỉ phép',
    LEAVE_BPMN,
    orgUnitId,
    [
      { name: 'startDate', label: 'Ngày bắt đầu', type: 'date', required: true },
      { name: 'endDate', label: 'Ngày kết thúc', type: 'date', required: true },
      { name: 'days', label: 'Số ngày', type: 'number', required: true, min: 0.5, max: 30 },
      { name: 'reason', label: 'Lý do', type: 'textarea', required: false },
    ],
    {
      ManagerApproveTask: [
        { name: 'decision', label: 'Quyết định', type: 'select', required: true, options: [
          { label: 'Duyệt', value: 'APPROVED' },
          { label: 'Từ chối', value: 'REJECTED' },
        ]},
        { name: 'managerNote', label: 'Ghi chú', type: 'textarea', required: false },
      ],
    },
    {
      ManagerApproveTask: { assigneeFromVariable: 'managerUserId', notifyOnAssign: true },
    }
  );

  await upsertProcess(
    client,
    'overtime-approval',
    'Quy trình duyệt đăng ký OT',
    OT_BPMN,
    orgUnitId,
    [
      { name: 'date', label: 'Ngày làm thêm', type: 'date', required: true },
      { name: 'fromTime', label: 'Từ giờ', type: 'time', required: true },
      { name: 'toTime', label: 'Đến giờ', type: 'time', required: true },
      { name: 'hours', label: 'Số giờ OT', type: 'number', required: true, min: 0.5, max: 12 },
      { name: 'reason', label: 'Lý do', type: 'textarea', required: false },
    ],
    {
      ApproveOTTask: [
        { name: 'decision', label: 'Quyết định', type: 'select', required: true, options: [
          { label: 'Duyệt', value: 'APPROVED' },
          { label: 'Từ chối', value: 'REJECTED' },
        ]},
        { name: 'note', label: 'Ghi chú', type: 'textarea', required: false },
      ],
    },
    {
      ApproveOTTask: { assigneeFromVariable: 'managerUserId', notifyOnAssign: true },
    }
  );

  console.log('✅ Seeded process definitions thành công');
  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
