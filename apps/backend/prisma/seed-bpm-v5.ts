import 'dotenv/config';
import { Client } from 'pg';
import { randomUUID } from 'crypto';

const DB_URL = process.env['DATABASE_URL'] || 'postgresql://loop:loop_password@localhost:5432/loop_db';

interface StepConfig {
  steps: Array<{
    id: string;
    name: string;
    type: string;
    assigneeRole: string;
    parallel?: boolean;
    conditional?: boolean;
    condition?: string;
  }>;
}

async function upsertProcess(
  client: InstanceType<typeof Client>,
  key: string,
  name: string,
  bpmnXml: string,
  orgUnitId: string,
  formFields: object,
  taskFormFields: object,
  stepConfig: StepConfig,
) {
  const existing = await client.query('SELECT id FROM process_definitions WHERE key = $1 AND tenant_id IS NULL', [key]);
  if (existing.rows.length > 0) {
    await client.query(
      `UPDATE process_definitions SET
        name = $2, bpmn_xml = $3, status = 'ACTIVE',
        form_fields = $4, task_form_fields = $5, step_config = $6,
        updated_at = NOW()
       WHERE key = $1 AND tenant_id IS NULL`,
      [key, name, bpmnXml, JSON.stringify(formFields), JSON.stringify(taskFormFields), JSON.stringify(stepConfig)],
    );
    console.log('  ✓ Updated:', key);
  } else {
    await client.query(
      `INSERT INTO process_definitions (id, key, name, bpmn_xml, status, org_unit_id, form_fields, task_form_fields, step_config)
       VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6, $7, $8)`,
      [
        randomUUID(),
        key,
        name,
        bpmnXml,
        orgUnitId,
        JSON.stringify(formFields),
        JSON.stringify(taskFormFields),
        JSON.stringify(stepConfig),
      ],
    );
    console.log('  ✓ Created:', key);
  }
}

// --- BPMN XML templates ---

const OT_APPROVAL_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="overtime-approval-v1" isExecutable="true">
    <startEvent id="Start_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="ManagerApprove" />
    <userTask id="ManagerApprove" name="Trưởng phòng duyệt tăng ca" />
    <sequenceFlow id="Flow_2" sourceRef="ManagerApprove" targetRef="HRConfirm" />
    <userTask id="HRConfirm" name="HR xác nhận giờ tăng ca" />
    <sequenceFlow id="Flow_3" sourceRef="HRConfirm" targetRef="End_1" />
    <endEvent id="End_1" />
  </process>
</definitions>`;

const BUDGET_APPROVAL_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="budget-approval-v1" isExecutable="true">
    <startEvent id="Start_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="FinanceManagerReview" />
    <userTask id="FinanceManagerReview" name="Finance Manager xem xét ngân sách" />
    <sequenceFlow id="Flow_2" sourceRef="FinanceManagerReview" targetRef="CFOApprove" />
    <userTask id="CFOApprove" name="CFO phê duyệt kế hoạch ngân sách" />
    <sequenceFlow id="Flow_3" sourceRef="CFOApprove" targetRef="End_1" />
    <endEvent id="End_1" />
  </process>
</definitions>`;

const CONTRACT_RENEWAL_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="contract-renewal-v1" isExecutable="true">
    <startEvent id="Start_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="HRPrepare" />
    <userTask id="HRPrepare" name="HR chuẩn bị hợp đồng gia hạn" />
    <sequenceFlow id="Flow_2" sourceRef="HRPrepare" targetRef="ManagerApprove" />
    <userTask id="ManagerApprove" name="Trưởng phòng xác nhận gia hạn" />
    <sequenceFlow id="Flow_3" sourceRef="ManagerApprove" targetRef="DirectorGateway" />
    <exclusiveGateway id="DirectorGateway" name="Cần Giám đốc?" />
    <sequenceFlow id="Flow_4" sourceRef="DirectorGateway" targetRef="DirectorApprove">
      <conditionExpression>${'${environment.variables.requiresDirectorApproval === true}'}</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="Flow_5" sourceRef="DirectorGateway" targetRef="End_1" />
    <userTask id="DirectorApprove" name="Giám đốc ký duyệt (điều kiện)" />
    <sequenceFlow id="Flow_6" sourceRef="DirectorApprove" targetRef="End_1" />
    <endEvent id="End_1" />
  </process>
</definitions>`;

const OFFBOARDING_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="employee-offboarding-v1" isExecutable="true">
    <startEvent id="Start_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="ParallelSplit" />
    <parallelGateway id="ParallelSplit" name="Bắt đầu song song" />
    <sequenceFlow id="Flow_IT" sourceRef="ParallelSplit" targetRef="ITRevoke" />
    <sequenceFlow id="Flow_HR" sourceRef="ParallelSplit" targetRef="HRProcess" />
    <sequenceFlow id="Flow_Payroll" sourceRef="ParallelSplit" targetRef="PayrollFinal" />
    <sequenceFlow id="Flow_Manager" sourceRef="ParallelSplit" targetRef="ManagerHandover" />
    <userTask id="ITRevoke" name="IT thu hồi thiết bị và tài khoản" />
    <userTask id="HRProcess" name="HR xử lý hồ sơ nghỉ việc" />
    <userTask id="PayrollFinal" name="Kế toán chốt lương và phụ cấp" />
    <userTask id="ManagerHandover" name="Trưởng phòng bàn giao công việc" />
    <sequenceFlow id="Flow_IT2" sourceRef="ITRevoke" targetRef="ParallelJoin" />
    <sequenceFlow id="Flow_HR2" sourceRef="HRProcess" targetRef="ParallelJoin" />
    <sequenceFlow id="Flow_Payroll2" sourceRef="PayrollFinal" targetRef="ParallelJoin" />
    <sequenceFlow id="Flow_Manager2" sourceRef="ManagerHandover" targetRef="ParallelJoin" />
    <parallelGateway id="ParallelJoin" name="Tổng hợp" />
    <sequenceFlow id="Flow_End" sourceRef="ParallelJoin" targetRef="End_1" />
    <endEvent id="End_1" />
  </process>
</definitions>`;

const DEAL_KICKOFF_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="deal-to-project-kickoff-v1" isExecutable="true">
    <startEvent id="Start_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="PMConfirm" />
    <userTask id="PMConfirm" name="PM xác nhận kickoff dự án" />
    <sequenceFlow id="Flow_2" sourceRef="PMConfirm" targetRef="LegalReview" />
    <userTask id="LegalReview" name="Pháp lý rà soát hợp đồng" />
    <sequenceFlow id="Flow_3" sourceRef="LegalReview" targetRef="ITPortalSetup" />
    <userTask id="ITPortalSetup" name="IT cấp quyền truy cập portal dự án" />
    <sequenceFlow id="Flow_4" sourceRef="ITPortalSetup" targetRef="End_1" />
    <endEvent id="End_1" />
  </process>
</definitions>`;

const SALARY_REVIEW_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="salary-review-v1" isExecutable="true">
    <startEvent id="Start_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="HRPropose" />
    <userTask id="HRPropose" name="HR đề xuất mức điều chỉnh lương" />
    <sequenceFlow id="Flow_2" sourceRef="HRPropose" targetRef="DirectorApprove" />
    <userTask id="DirectorApprove" name="Giám đốc phê duyệt điều chỉnh lương" />
    <sequenceFlow id="Flow_3" sourceRef="DirectorApprove" targetRef="End_1" />
    <endEvent id="End_1" />
  </process>
</definitions>`;

const YEAR_END_LEAVE_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="year-end-leave-closure-v1" isExecutable="true">
    <startEvent id="Start_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="HRConfirmPayout" />
    <userTask id="HRConfirmPayout" name="HR xác nhận danh sách payout phép dư" />
    <sequenceFlow id="Flow_2" sourceRef="HRConfirmPayout" targetRef="End_1" />
    <endEvent id="End_1" />
  </process>
</definitions>`;

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  const orgRes = await client.query('SELECT id FROM org_units WHERE parent_id IS NULL LIMIT 1');
  if (orgRes.rows.length === 0) {
    console.error('❌ Không tìm thấy OrgUnit gốc. Chạy seed HR structure trước.');
    await client.end();
    process.exit(1);
  }
  const orgUnitId: string = orgRes.rows[0].id;

  console.log('🔄 Seeding BPM ProcessDefinitions v5...\n');

  // 1. Duyệt tăng ca — 2-level: Trưởng phòng → HR
  await upsertProcess(
    client,
    'overtime-approval-v1',
    'Duyệt tăng ca',
    OT_APPROVAL_BPMN,
    orgUnitId,
    [
      { name: 'date', label: 'Ngày tăng ca', type: 'date', required: true },
      { name: 'fromTime', label: 'Từ giờ', type: 'time', required: true },
      { name: 'toTime', label: 'Đến giờ', type: 'time', required: true },
      { name: 'hours', label: 'Số giờ OT', type: 'number', required: true, min: 0.5, max: 12 },
      { name: 'reason', label: 'Lý do tăng ca', type: 'textarea', required: true },
    ],
    {
      ManagerApprove: [
        {
          name: 'decision',
          label: 'Quyết định',
          type: 'select',
          required: true,
          options: [
            { label: 'Duyệt', value: 'APPROVED' },
            { label: 'Từ chối', value: 'REJECTED' },
          ],
        },
        { name: 'note', label: 'Ghi chú trưởng phòng', type: 'textarea', required: false },
      ],
      HRConfirm: [
        { name: 'confirmedHours', label: 'Giờ OT thực tế', type: 'number', required: true, min: 0.5, max: 12 },
        { name: 'hrNote', label: 'Ghi chú HR', type: 'textarea', required: false },
      ],
    },
    {
      steps: [
        { id: 'ManagerApprove', name: 'Trưởng phòng duyệt', type: 'USER_TASK', assigneeRole: 'MANAGER' },
        { id: 'HRConfirm', name: 'HR xác nhận', type: 'USER_TASK', assigneeRole: 'HR' },
      ],
    },
  );

  // 2. Duyệt kế hoạch ngân sách — Finance Manager → CFO
  await upsertProcess(
    client,
    'budget-approval-v1',
    'Duyệt kế hoạch ngân sách',
    BUDGET_APPROVAL_BPMN,
    orgUnitId,
    [
      { name: 'budgetYear', label: 'Năm ngân sách', type: 'number', required: true },
      { name: 'budgetQuarter', label: 'Quý', type: 'select', required: false, options: [
        { label: 'Q1', value: 'Q1' }, { label: 'Q2', value: 'Q2' },
        { label: 'Q3', value: 'Q3' }, { label: 'Q4', value: 'Q4' },
        { label: 'Cả năm', value: 'FULL_YEAR' },
      ]},
      { name: 'department', label: 'Phòng ban', type: 'text', required: true },
      { name: 'totalAmount', label: 'Tổng ngân sách (VNĐ)', type: 'number', required: true, min: 0 },
      { name: 'breakdown', label: 'Chi tiết phân bổ', type: 'textarea', required: true },
      { name: 'justification', label: 'Căn cứ đề xuất', type: 'textarea', required: true },
    ],
    {
      FinanceManagerReview: [
        {
          name: 'decision',
          label: 'Quyết định Finance Manager',
          type: 'select',
          required: true,
          options: [
            { label: 'Đồng ý chuyển CFO', value: 'APPROVED' },
            { label: 'Yêu cầu bổ sung', value: 'NEED_INFO' },
            { label: 'Từ chối', value: 'REJECTED' },
          ],
        },
        { name: 'financeNote', label: 'Nhận xét Finance Manager', type: 'textarea', required: false },
      ],
      CFOApprove: [
        {
          name: 'decision',
          label: 'Phê duyệt CFO',
          type: 'select',
          required: true,
          options: [
            { label: 'Phê duyệt', value: 'APPROVED' },
            { label: 'Điều chỉnh ngân sách', value: 'REVISED' },
            { label: 'Từ chối', value: 'REJECTED' },
          ],
        },
        { name: 'approvedAmount', label: 'Số tiền phê duyệt (VNĐ)', type: 'number', required: false, min: 0 },
        { name: 'cfoNote', label: 'Ý kiến CFO', type: 'textarea', required: false },
      ],
    },
    {
      steps: [
        { id: 'FinanceManagerReview', name: 'Finance Manager xem xét', type: 'USER_TASK', assigneeRole: 'FINANCE_MANAGER' },
        { id: 'CFOApprove', name: 'CFO phê duyệt', type: 'USER_TASK', assigneeRole: 'CFO' },
      ],
    },
  );

  // 3. Gia hạn hợp đồng lao động — HR → Manager → Director (conditional)
  await upsertProcess(
    client,
    'contract-renewal-v1',
    'Gia hạn hợp đồng lao động',
    CONTRACT_RENEWAL_BPMN,
    orgUnitId,
    [
      { name: 'employeeId', label: 'Nhân viên', type: 'text', required: true },
      { name: 'currentContractEnd', label: 'Ngày hết hợp đồng hiện tại', type: 'date', required: true },
      { name: 'renewalPeriod', label: 'Thời hạn gia hạn', type: 'select', required: true, options: [
        { label: '6 tháng', value: '6M' }, { label: '1 năm', value: '1Y' },
        { label: '2 năm', value: '2Y' }, { label: 'Không xác định thời hạn', value: 'INDEFINITE' },
      ]},
      { name: 'proposedSalary', label: 'Mức lương đề xuất (VNĐ)', type: 'number', required: false, min: 0 },
      { name: 'requiresDirectorApproval', label: 'Cần Giám đốc duyệt?', type: 'boolean', required: true },
      { name: 'notes', label: 'Ghi chú', type: 'textarea', required: false },
    ],
    {
      HRPrepare: [
        { name: 'contractDraft', label: 'Hợp đồng đã chuẩn bị', type: 'checkbox', required: true },
        { name: 'hrNote', label: 'Ghi chú HR', type: 'textarea', required: false },
      ],
      ManagerApprove: [
        {
          name: 'decision',
          label: 'Quyết định Trưởng phòng',
          type: 'select',
          required: true,
          options: [
            { label: 'Đồng ý gia hạn', value: 'APPROVED' },
            { label: 'Từ chối gia hạn', value: 'REJECTED' },
          ],
        },
        { name: 'managerNote', label: 'Nhận xét Trưởng phòng', type: 'textarea', required: false },
      ],
      DirectorApprove: [
        {
          name: 'decision',
          label: 'Phê duyệt Giám đốc',
          type: 'select',
          required: true,
          options: [
            { label: 'Ký duyệt gia hạn', value: 'APPROVED' },
            { label: 'Từ chối', value: 'REJECTED' },
          ],
        },
        { name: 'directorNote', label: 'Ý kiến Giám đốc', type: 'textarea', required: false },
      ],
    },
    {
      steps: [
        { id: 'HRPrepare', name: 'HR chuẩn bị hợp đồng', type: 'USER_TASK', assigneeRole: 'HR' },
        { id: 'ManagerApprove', name: 'Trưởng phòng xác nhận', type: 'USER_TASK', assigneeRole: 'MANAGER' },
        {
          id: 'DirectorApprove',
          name: 'Giám đốc ký duyệt',
          type: 'USER_TASK',
          assigneeRole: 'DIRECTOR',
          conditional: true,
          condition: 'requiresDirectorApproval === true',
        },
      ],
    },
  );

  // 4. Quy trình nghỉ việc — parallel: IT / HR / Payroll / Manager
  await upsertProcess(
    client,
    'employee-offboarding-v1',
    'Quy trình nghỉ việc',
    OFFBOARDING_BPMN,
    orgUnitId,
    [
      { name: 'employeeId', label: 'Nhân viên nghỉ việc', type: 'text', required: true },
      { name: 'lastWorkingDay', label: 'Ngày làm việc cuối', type: 'date', required: true },
      { name: 'resignReason', label: 'Lý do nghỉ việc', type: 'select', required: true, options: [
        { label: 'Tự nguyện', value: 'VOLUNTARY' }, { label: 'Hết hợp đồng', value: 'CONTRACT_END' },
        { label: 'Thỏa thuận', value: 'MUTUAL_AGREEMENT' }, { label: 'Kỷ luật', value: 'DISCIPLINARY' },
      ]},
      { name: 'notes', label: 'Ghi chú', type: 'textarea', required: false },
    ],
    {
      ITRevoke: [
        { name: 'accountsRevoked', label: 'Đã thu hồi tài khoản email/hệ thống', type: 'checkbox', required: true },
        { name: 'devicesReturned', label: 'Thiết bị đã hoàn trả', type: 'checkbox', required: true },
        { name: 'itNote', label: 'Ghi chú IT', type: 'textarea', required: false },
      ],
      HRProcess: [
        { name: 'documentsCompleted', label: 'Hồ sơ nghỉ việc hoàn tất', type: 'checkbox', required: true },
        { name: 'socialInsuranceProcess', label: 'BHXH đã xử lý', type: 'checkbox', required: true },
        { name: 'hrNote', label: 'Ghi chú HR', type: 'textarea', required: false },
      ],
      PayrollFinal: [
        { name: 'finalSalaryCalculated', label: 'Đã tính lương tháng cuối', type: 'checkbox', required: true },
        { name: 'unusedLeavePayoutAmount', label: 'Tiền phép dư (VNĐ)', type: 'number', required: false, min: 0 },
        { name: 'payrollNote', label: 'Ghi chú kế toán', type: 'textarea', required: false },
      ],
      ManagerHandover: [
        { name: 'taskHandoverCompleted', label: 'Bàn giao công việc hoàn tất', type: 'checkbox', required: true },
        { name: 'knowledgeTransfer', label: 'Chuyển giao kiến thức', type: 'checkbox', required: true },
        { name: 'managerNote', label: 'Ghi chú Trưởng phòng', type: 'textarea', required: false },
      ],
    },
    {
      steps: [
        { id: 'ITRevoke', name: 'IT thu hồi thiết bị/tài khoản', type: 'USER_TASK', assigneeRole: 'IT', parallel: true },
        { id: 'HRProcess', name: 'HR xử lý hồ sơ', type: 'USER_TASK', assigneeRole: 'HR', parallel: true },
        { id: 'PayrollFinal', name: 'Kế toán chốt lương', type: 'USER_TASK', assigneeRole: 'ACCOUNTANT', parallel: true },
        { id: 'ManagerHandover', name: 'Trưởng phòng bàn giao', type: 'USER_TASK', assigneeRole: 'MANAGER', parallel: true },
      ],
    },
  );

  // 5. Kickoff dự án từ Deal thắng — PM confirm → Legal → IT portal
  await upsertProcess(
    client,
    'deal-to-project-kickoff-v1',
    'Kickoff dự án từ Deal thắng',
    DEAL_KICKOFF_BPMN,
    orgUnitId,
    [
      { name: 'dealId', label: 'Deal ID', type: 'text', required: true },
      { name: 'dealName', label: 'Tên Deal', type: 'text', required: true },
      { name: 'clientName', label: 'Tên khách hàng', type: 'text', required: true },
      { name: 'dealValue', label: 'Giá trị hợp đồng (VNĐ)', type: 'number', required: true, min: 0 },
      { name: 'proposedStartDate', label: 'Ngày dự kiến bắt đầu', type: 'date', required: true },
      { name: 'projectScope', label: 'Phạm vi dự án', type: 'textarea', required: true },
    ],
    {
      PMConfirm: [
        { name: 'projectCodeAssigned', label: 'Mã dự án đã tạo', type: 'text', required: true },
        { name: 'teamAssigned', label: 'Team đã phân công', type: 'checkbox', required: true },
        { name: 'kickoffDate', label: 'Ngày kickoff chính thức', type: 'date', required: true },
        { name: 'pmNote', label: 'Ghi chú PM', type: 'textarea', required: false },
      ],
      LegalReview: [
        { name: 'contractSigned', label: 'Hợp đồng đã ký', type: 'checkbox', required: true },
        { name: 'nda', label: 'NDA đã ký (nếu có)', type: 'checkbox', required: false },
        { name: 'legalNote', label: 'Ghi chú pháp lý', type: 'textarea', required: false },
      ],
      ITPortalSetup: [
        { name: 'projectSpaceCreated', label: 'Workspace dự án đã tạo', type: 'checkbox', required: true },
        { name: 'accessGranted', label: 'Đã cấp quyền cho team', type: 'checkbox', required: true },
        { name: 'repoCreated', label: 'Repository đã tạo (nếu có)', type: 'checkbox', required: false },
        { name: 'itNote', label: 'Ghi chú IT', type: 'textarea', required: false },
      ],
    },
    {
      steps: [
        { id: 'PMConfirm', name: 'PM xác nhận kickoff', type: 'USER_TASK', assigneeRole: 'PM' },
        { id: 'LegalReview', name: 'Pháp lý rà soát hợp đồng', type: 'USER_TASK', assigneeRole: 'LEGAL' },
        { id: 'ITPortalSetup', name: 'IT cấp quyền portal', type: 'USER_TASK', assigneeRole: 'IT' },
      ],
    },
  );

  // 6. Đề xuất điều chỉnh lương — HR propose → Director approve
  await upsertProcess(
    client,
    'salary-review-v1',
    'Đề xuất điều chỉnh lương',
    SALARY_REVIEW_BPMN,
    orgUnitId,
    [
      { name: 'employeeId', label: 'Nhân viên', type: 'text', required: true },
      { name: 'currentSalary', label: 'Lương hiện tại (VNĐ)', type: 'number', required: true, min: 0 },
      { name: 'proposedSalary', label: 'Lương đề xuất (VNĐ)', type: 'number', required: true, min: 0 },
      { name: 'increasePercent', label: 'Tỷ lệ tăng (%)', type: 'number', required: false, min: 0, max: 100 },
      { name: 'effectiveDate', label: 'Ngày hiệu lực', type: 'date', required: true },
      { name: 'reviewBasis', label: 'Căn cứ điều chỉnh', type: 'select', required: true, options: [
        { label: 'Đánh giá định kỳ', value: 'PERIODIC_REVIEW' },
        { label: 'Thăng chức', value: 'PROMOTION' },
        { label: 'Điều chỉnh thị trường', value: 'MARKET_ADJUSTMENT' },
        { label: 'Khác', value: 'OTHER' },
      ]},
      { name: 'justification', label: 'Lý do đề xuất', type: 'textarea', required: true },
    ],
    {
      HRPropose: [
        { name: 'performanceScore', label: 'Điểm đánh giá hiệu suất', type: 'number', required: false, min: 0, max: 10 },
        { name: 'benchmarkData', label: 'So sánh thị trường', type: 'textarea', required: false },
        { name: 'hrNote', label: 'Ghi chú HR', type: 'textarea', required: false },
      ],
      DirectorApprove: [
        {
          name: 'decision',
          label: 'Quyết định Giám đốc',
          type: 'select',
          required: true,
          options: [
            { label: 'Phê duyệt theo đề xuất', value: 'APPROVED' },
            { label: 'Phê duyệt mức khác', value: 'APPROVED_MODIFIED' },
            { label: 'Từ chối', value: 'REJECTED' },
          ],
        },
        { name: 'approvedSalary', label: 'Mức lương phê duyệt (VNĐ)', type: 'number', required: false, min: 0 },
        { name: 'directorNote', label: 'Ý kiến Giám đốc', type: 'textarea', required: false },
      ],
    },
    {
      steps: [
        { id: 'HRPropose', name: 'HR đề xuất điều chỉnh', type: 'USER_TASK', assigneeRole: 'HR' },
        { id: 'DirectorApprove', name: 'Giám đốc phê duyệt', type: 'USER_TASK', assigneeRole: 'DIRECTOR' },
      ],
    },
  );

  // 7. Chốt phép năm — HR xác nhận danh sách payout
  await upsertProcess(
    client,
    'year-end-leave-closure-v1',
    'Chốt phép năm',
    YEAR_END_LEAVE_BPMN,
    orgUnitId,
    [
      { name: 'closureYear', label: 'Năm chốt phép', type: 'number', required: true },
      { name: 'closureDate', label: 'Ngày chốt', type: 'date', required: true },
      { name: 'totalEmployees', label: 'Tổng số nhân viên', type: 'number', required: false, min: 0 },
      { name: 'notes', label: 'Ghi chú', type: 'textarea', required: false },
    ],
    {
      HRConfirmPayout: [
        { name: 'employeeListVerified', label: 'Danh sách nhân viên đã kiểm tra', type: 'checkbox', required: true },
        { name: 'unusedLeaveListExported', label: 'Báo cáo phép dư đã xuất', type: 'checkbox', required: true },
        { name: 'totalPayoutAmount', label: 'Tổng tiền payout (VNĐ)', type: 'number', required: true, min: 0 },
        { name: 'employeesWithCarryover', label: 'Số NV chuyển phép sang năm mới', type: 'number', required: false, min: 0 },
        { name: 'hrConfirmNote', label: 'Ghi chú xác nhận', type: 'textarea', required: false },
      ],
    },
    {
      steps: [
        { id: 'HRConfirmPayout', name: 'HR xác nhận danh sách payout', type: 'USER_TASK', assigneeRole: 'HR' },
      ],
    },
  );

  console.log('\n✅ Seeded 7 BPM ProcessDefinitions v5 thành công');
  await client.end();
}

main().catch((err) => {
  console.error('❌ Lỗi seed:', err);
  process.exit(1);
});
