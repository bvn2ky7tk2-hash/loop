import 'dotenv/config';
import { Client } from 'pg';
import { randomUUID } from 'crypto';

const DB_URL =
  process.env['DATABASE_URL'] || 'postgresql://loop:loop_password@localhost:5432/loop_db';

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
  const existing = await client.query(
    'SELECT id FROM process_definitions WHERE key = $1',
    [key],
  );
  if (existing.rows.length > 0) {
    await client.query(
      `UPDATE process_definitions SET
        name = $2, bpmn_xml = $3, status = 'ACTIVE',
        form_fields = $4, task_form_fields = $5, step_config = $6,
        updated_at = NOW()
       WHERE key = $1`,
      [key, name, bpmnXml, JSON.stringify(formFields), JSON.stringify(taskFormFields), JSON.stringify(stepConfig)],
    );
    console.log('  ✓ Updated:', key);
  } else {
    await client.query(
      `INSERT INTO process_definitions (id, key, name, bpmn_xml, status, org_unit_id, form_fields, task_form_fields, step_config, updated_at)
       VALUES ($1, $2, $3, $4, 'ACTIVE', $5, $6, $7, $8, NOW())`,
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

// ─── BPMN XML Templates ────────────────────────────────────────────────────

// 1. Nghỉ phép: Start → Manager review → Gateway(APPROVED/REJECTED) → End
const LEAVE_REQUEST_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="leave-request-v1" isExecutable="true">
    <startEvent id="Start_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="ManagerReview" />
    <userTask id="ManagerReview" name="Trưởng phòng duyệt nghỉ phép" />
    <sequenceFlow id="Flow_2" sourceRef="ManagerReview" targetRef="ApprovalGateway" />
    <exclusiveGateway id="ApprovalGateway" name="Kết quả duyệt?" />
    <sequenceFlow id="Flow_Approved" sourceRef="ApprovalGateway" targetRef="End_Approved">
      <conditionExpression>\${environment.variables.decision === 'APPROVED'}</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="Flow_Rejected" sourceRef="ApprovalGateway" targetRef="End_Rejected">
      <conditionExpression>\${environment.variables.decision === 'REJECTED'}</conditionExpression>
    </sequenceFlow>
    <endEvent id="End_Approved" name="Được duyệt" />
    <endEvent id="End_Rejected" name="Bị từ chối" />
  </process>
</definitions>`;

// 2. Hoàn ứng chi phí: Start → Line Manager → Finance → Gateway → End
const EXPENSE_CLAIM_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="expense-claim-v1" isExecutable="true">
    <startEvent id="Start_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="LineManagerApprove" />
    <userTask id="LineManagerApprove" name="Line Manager duyệt chi phí" />
    <sequenceFlow id="Flow_2" sourceRef="LineManagerApprove" targetRef="FinanceApprove" />
    <userTask id="FinanceApprove" name="Finance xác nhận hoàn ứng" />
    <sequenceFlow id="Flow_3" sourceRef="FinanceApprove" targetRef="ExpenseGateway" />
    <exclusiveGateway id="ExpenseGateway" name="Finance quyết định?" />
    <sequenceFlow id="Flow_Approved" sourceRef="ExpenseGateway" targetRef="End_Approved">
      <conditionExpression>\${environment.variables.financeDecision === 'APPROVED'}</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="Flow_Rejected" sourceRef="ExpenseGateway" targetRef="End_Rejected">
      <conditionExpression>\${environment.variables.financeDecision === 'REJECTED'}</conditionExpression>
    </sequenceFlow>
    <endEvent id="End_Approved" name="Được thanh toán" />
    <endEvent id="End_Rejected" name="Bị từ chối" />
  </process>
</definitions>`;

// 3. Tăng ca: Start → Manager → Gateway → End
const OT_APPROVAL_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="overtime-approval-v1" isExecutable="true">
    <startEvent id="Start_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="ManagerApprove" />
    <userTask id="ManagerApprove" name="Trưởng phòng duyệt tăng ca" />
    <sequenceFlow id="Flow_2" sourceRef="ManagerApprove" targetRef="OTGateway" />
    <exclusiveGateway id="OTGateway" name="Kết quả?" />
    <sequenceFlow id="Flow_Approved" sourceRef="OTGateway" targetRef="End_Approved">
      <conditionExpression>\${environment.variables.decision === 'APPROVED'}</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="Flow_Rejected" sourceRef="OTGateway" targetRef="End_Rejected">
      <conditionExpression>\${environment.variables.decision === 'REJECTED'}</conditionExpression>
    </sequenceFlow>
    <endEvent id="End_Approved" name="Tăng ca được duyệt" />
    <endEvent id="End_Rejected" name="Tăng ca bị từ chối" />
  </process>
</definitions>`;

// 4. Gia hạn hợp đồng: Start → HR → Director → Gateway → End
const CONTRACT_RENEWAL_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="contract-renewal-v1" isExecutable="true">
    <startEvent id="Start_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="HRPrepare" />
    <userTask id="HRPrepare" name="HR chuẩn bị hợp đồng gia hạn" />
    <sequenceFlow id="Flow_2" sourceRef="HRPrepare" targetRef="DirectorApprove" />
    <userTask id="DirectorApprove" name="Giám đốc ký duyệt gia hạn" />
    <sequenceFlow id="Flow_3" sourceRef="DirectorApprove" targetRef="ContractGateway" />
    <exclusiveGateway id="ContractGateway" name="Giám đốc quyết định?" />
    <sequenceFlow id="Flow_Approved" sourceRef="ContractGateway" targetRef="End_Approved">
      <conditionExpression>\${environment.variables.directorDecision === 'APPROVED'}</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="Flow_Rejected" sourceRef="ContractGateway" targetRef="End_Rejected">
      <conditionExpression>\${environment.variables.directorDecision === 'REJECTED'}</conditionExpression>
    </sequenceFlow>
    <endEvent id="End_Approved" name="Hợp đồng được gia hạn" />
    <endEvent id="End_Rejected" name="Từ chối gia hạn" />
  </process>
</definitions>`;

// 5. Nghỉ việc: Start → IT clearance → HR final → End
const OFFBOARDING_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="employee-offboarding-v1" isExecutable="true">
    <startEvent id="Start_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="ITClearance" />
    <userTask id="ITClearance" name="IT thu hồi thiết bị và tài khoản" />
    <sequenceFlow id="Flow_2" sourceRef="ITClearance" targetRef="HRFinal" />
    <userTask id="HRFinal" name="HR hoàn tất thủ tục nghỉ việc" />
    <sequenceFlow id="Flow_3" sourceRef="HRFinal" targetRef="End_1" />
    <endEvent id="End_1" name="Nghỉ việc hoàn tất" />
  </process>
</definitions>`;

// 6. Quyết định nhân sự: Start → HR Director → CEO → Gateway → End
const HR_DECISION_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="hr-decision-approval-v1" isExecutable="true">
    <startEvent id="Start_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="HRDirectorReview" />
    <userTask id="HRDirectorReview" name="HR Director xem xét quyết định nhân sự" />
    <sequenceFlow id="Flow_2" sourceRef="HRDirectorReview" targetRef="CEOApprove" />
    <userTask id="CEOApprove" name="CEO phê duyệt quyết định nhân sự" />
    <sequenceFlow id="Flow_3" sourceRef="CEOApprove" targetRef="HRDecisionGateway" />
    <exclusiveGateway id="HRDecisionGateway" name="CEO quyết định?" />
    <sequenceFlow id="Flow_Approved" sourceRef="HRDecisionGateway" targetRef="End_Approved">
      <conditionExpression>\${environment.variables.ceoDecision === 'APPROVED'}</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="Flow_Rejected" sourceRef="HRDecisionGateway" targetRef="End_Rejected">
      <conditionExpression>\${environment.variables.ceoDecision === 'REJECTED'}</conditionExpression>
    </sequenceFlow>
    <endEvent id="End_Approved" name="Quyết định được duyệt" />
    <endEvent id="End_Rejected" name="Quyết định bị từ chối" />
  </process>
</definitions>`;

// 7. Duyệt ngân sách: Start → CFO → CEO → Gateway → End
const BUDGET_APPROVAL_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="budget-approval-v1" isExecutable="true">
    <startEvent id="Start_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="CFOReview" />
    <userTask id="CFOReview" name="CFO xem xét kế hoạch ngân sách" />
    <sequenceFlow id="Flow_2" sourceRef="CFOReview" targetRef="CEOApprove" />
    <userTask id="CEOApprove" name="CEO phê duyệt ngân sách" />
    <sequenceFlow id="Flow_3" sourceRef="CEOApprove" targetRef="BudgetGateway" />
    <exclusiveGateway id="BudgetGateway" name="CEO quyết định?" />
    <sequenceFlow id="Flow_Approved" sourceRef="BudgetGateway" targetRef="End_Approved">
      <conditionExpression>\${environment.variables.ceoDecision === 'APPROVED'}</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="Flow_Rejected" sourceRef="BudgetGateway" targetRef="End_Rejected">
      <conditionExpression>\${environment.variables.ceoDecision === 'REJECTED'}</conditionExpression>
    </sequenceFlow>
    <endEvent id="End_Approved" name="Ngân sách được duyệt" />
    <endEvent id="End_Rejected" name="Ngân sách bị từ chối" />
  </process>
</definitions>`;

// 8. Kickoff dự án: Start → PM assign → Tech Lead → End
const DEAL_KICKOFF_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="deal-to-project-kickoff-v1" isExecutable="true">
    <startEvent id="Start_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="PMAssign" />
    <userTask id="PMAssign" name="PM phân công và xác nhận kickoff dự án" />
    <sequenceFlow id="Flow_2" sourceRef="PMAssign" targetRef="TechLeadSetup" />
    <userTask id="TechLeadSetup" name="Tech Lead thiết lập môi trường dự án" />
    <sequenceFlow id="Flow_3" sourceRef="TechLeadSetup" targetRef="End_1" />
    <endEvent id="End_1" name="Kickoff hoàn tất" />
  </process>
</definitions>`;

// 9. Đánh giá lương: Start → CHRO → CEO → Gateway → End
const SALARY_REVIEW_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="salary-review-v1" isExecutable="true">
    <startEvent id="Start_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="CHROReview" />
    <userTask id="CHROReview" name="CHRO đề xuất điều chỉnh lương" />
    <sequenceFlow id="Flow_2" sourceRef="CHROReview" targetRef="CEOApprove" />
    <userTask id="CEOApprove" name="CEO phê duyệt mức lương mới" />
    <sequenceFlow id="Flow_3" sourceRef="CEOApprove" targetRef="SalaryGateway" />
    <exclusiveGateway id="SalaryGateway" name="CEO quyết định?" />
    <sequenceFlow id="Flow_Approved" sourceRef="SalaryGateway" targetRef="End_Approved">
      <conditionExpression>\${environment.variables.ceoDecision === 'APPROVED'}</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="Flow_Rejected" sourceRef="SalaryGateway" targetRef="End_Rejected">
      <conditionExpression>\${environment.variables.ceoDecision === 'REJECTED'}</conditionExpression>
    </sequenceFlow>
    <endEvent id="End_Approved" name="Lương được điều chỉnh" />
    <endEvent id="End_Rejected" name="Đề xuất bị từ chối" />
  </process>
</definitions>`;

// 10. Giải trình chấm công: Start → Manager → Gateway → End
const ATTENDANCE_EXPLANATION_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="attendance-explanation-v1" isExecutable="true">
    <startEvent id="Start_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="ManagerReview" />
    <userTask id="ManagerReview" name="Trưởng phòng xác nhận giải trình chấm công" />
    <sequenceFlow id="Flow_2" sourceRef="ManagerReview" targetRef="AttendanceGateway" />
    <exclusiveGateway id="AttendanceGateway" name="Kết quả xác nhận?" />
    <sequenceFlow id="Flow_Approved" sourceRef="AttendanceGateway" targetRef="End_Approved">
      <conditionExpression>\${environment.variables.decision === 'APPROVED'}</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="Flow_Rejected" sourceRef="AttendanceGateway" targetRef="End_Rejected">
      <conditionExpression>\${environment.variables.decision === 'REJECTED'}</conditionExpression>
    </sequenceFlow>
    <endEvent id="End_Approved" name="Giải trình được chấp nhận" />
    <endEvent id="End_Rejected" name="Giải trình bị từ chối" />
  </process>
</definitions>`;

// 11. Đánh giá hiệu suất: Start → Self assessment → Manager review → End
const PERFORMANCE_REVIEW_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="performance-review-v1" isExecutable="true">
    <startEvent id="Start_1" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="SelfAssessment" />
    <userTask id="SelfAssessment" name="Nhân viên tự đánh giá hiệu suất" />
    <sequenceFlow id="Flow_2" sourceRef="SelfAssessment" targetRef="ManagerReview" />
    <userTask id="ManagerReview" name="Trưởng phòng đánh giá và xác nhận" />
    <sequenceFlow id="Flow_3" sourceRef="ManagerReview" targetRef="End_1" />
    <endEvent id="End_1" name="Đánh giá hoàn tất" />
  </process>
</definitions>`;

// ─── Main ──────────────────────────────────────────────────────────────────

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

  console.log('🔄 Seeding BPM ProcessDefinitions (11 quy trình)...\n');

  // ─── 1. Xin nghỉ phép ───────────────────────────────────────────────────
  await upsertProcess(
    client,
    'leave-request-v1',
    'Xin nghỉ phép',
    LEAVE_REQUEST_BPMN,
    orgUnitId,
    [
      { name: 'leaveType', label: 'Loại nghỉ phép', type: 'select', required: true, options: [
        { label: 'Nghỉ phép năm', value: 'ANNUAL' },
        { label: 'Nghỉ ốm', value: 'SICK' },
        { label: 'Nghỉ thai sản', value: 'MATERNITY' },
        { label: 'Nghỉ không lương', value: 'UNPAID' },
      ]},
      { name: 'startDate', label: 'Ngày bắt đầu', type: 'date', required: true },
      { name: 'endDate', label: 'Ngày kết thúc', type: 'date', required: true },
      { name: 'totalDays', label: 'Tổng số ngày', type: 'number', required: true, min: 0.5 },
      { name: 'reason', label: 'Lý do nghỉ', type: 'textarea', required: true },
    ],
    {
      ManagerReview: [
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
        { name: 'note', label: 'Ghi chú Trưởng phòng', type: 'textarea', required: false },
      ],
    },
    {
      steps: [
        { id: 'ManagerReview', name: 'Trưởng phòng duyệt', type: 'USER_TASK', assigneeRole: 'MANAGER' },
      ],
    },
  );

  // ─── 2. Hoàn ứng chi phí ────────────────────────────────────────────────
  await upsertProcess(
    client,
    'expense-claim-v1',
    'Hoàn ứng chi phí',
    EXPENSE_CLAIM_BPMN,
    orgUnitId,
    [
      { name: 'expenseCategory', label: 'Danh mục chi phí', type: 'select', required: true, options: [
        { label: 'Đi lại', value: 'TRAVEL' },
        { label: 'Ăn uống', value: 'MEALS' },
        { label: 'Văn phòng phẩm', value: 'OFFICE_SUPPLIES' },
        { label: 'Tiếp khách', value: 'ENTERTAINMENT' },
        { label: 'Đào tạo', value: 'TRAINING' },
        { label: 'Khác', value: 'OTHER' },
      ]},
      { name: 'amount', label: 'Số tiền (VNĐ)', type: 'number', required: true, min: 0 },
      { name: 'expenseDate', label: 'Ngày chi', type: 'date', required: true },
      { name: 'description', label: 'Mô tả chi phí', type: 'textarea', required: true },
      { name: 'receiptAttached', label: 'Đính kèm hóa đơn', type: 'checkbox', required: false },
    ],
    {
      LineManagerApprove: [
        {
          name: 'lineManagerDecision',
          label: 'Quyết định Line Manager',
          type: 'select',
          required: true,
          options: [
            { label: 'Đồng ý chuyển Finance', value: 'APPROVED' },
            { label: 'Từ chối', value: 'REJECTED' },
          ],
        },
        { name: 'lineManagerNote', label: 'Ghi chú', type: 'textarea', required: false },
      ],
      FinanceApprove: [
        {
          name: 'financeDecision',
          label: 'Quyết định Finance',
          type: 'select',
          required: true,
          options: [
            { label: 'Phê duyệt thanh toán', value: 'APPROVED' },
            { label: 'Yêu cầu bổ sung chứng từ', value: 'NEED_DOCS' },
            { label: 'Từ chối', value: 'REJECTED' },
          ],
        },
        { name: 'approvedAmount', label: 'Số tiền thanh toán (VNĐ)', type: 'number', required: false, min: 0 },
        { name: 'financeNote', label: 'Ghi chú Finance', type: 'textarea', required: false },
      ],
    },
    {
      steps: [
        { id: 'LineManagerApprove', name: 'Line Manager duyệt', type: 'USER_TASK', assigneeRole: 'MANAGER' },
        { id: 'FinanceApprove', name: 'Finance xác nhận', type: 'USER_TASK', assigneeRole: 'FINANCE' },
      ],
    },
  );

  // ─── 3. Duyệt tăng ca ───────────────────────────────────────────────────
  await upsertProcess(
    client,
    'overtime-approval-v1',
    'Duyệt tăng ca',
    OT_APPROVAL_BPMN,
    orgUnitId,
    [
      { name: 'otDate', label: 'Ngày tăng ca', type: 'date', required: true },
      { name: 'fromTime', label: 'Từ giờ', type: 'time', required: true },
      { name: 'toTime', label: 'Đến giờ', type: 'time', required: true },
      { name: 'hours', label: 'Số giờ tăng ca', type: 'number', required: true, min: 0.5, max: 12 },
      { name: 'reason', label: 'Lý do tăng ca', type: 'textarea', required: true },
    ],
    {
      ManagerApprove: [
        {
          name: 'decision',
          label: 'Quyết định Trưởng phòng',
          type: 'select',
          required: true,
          options: [
            { label: 'Duyệt', value: 'APPROVED' },
            { label: 'Từ chối', value: 'REJECTED' },
          ],
        },
        { name: 'note', label: 'Ghi chú', type: 'textarea', required: false },
      ],
    },
    {
      steps: [
        { id: 'ManagerApprove', name: 'Trưởng phòng duyệt tăng ca', type: 'USER_TASK', assigneeRole: 'MANAGER' },
      ],
    },
  );

  // ─── 4. Gia hạn hợp đồng lao động ──────────────────────────────────────
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
        { label: '6 tháng', value: '6M' },
        { label: '1 năm', value: '1Y' },
        { label: '2 năm', value: '2Y' },
        { label: 'Không xác định thời hạn', value: 'INDEFINITE' },
      ]},
      { name: 'proposedSalary', label: 'Mức lương đề xuất (VNĐ)', type: 'number', required: false, min: 0 },
      { name: 'notes', label: 'Ghi chú', type: 'textarea', required: false },
    ],
    {
      HRPrepare: [
        { name: 'contractDraftReady', label: 'Bản thảo hợp đồng đã chuẩn bị', type: 'checkbox', required: true },
        { name: 'hrNote', label: 'Ghi chú HR', type: 'textarea', required: false },
      ],
      DirectorApprove: [
        {
          name: 'directorDecision',
          label: 'Quyết định Giám đốc',
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
        { id: 'DirectorApprove', name: 'Giám đốc ký duyệt', type: 'USER_TASK', assigneeRole: 'DIRECTOR' },
      ],
    },
  );

  // ─── 5. Quy trình nghỉ việc ─────────────────────────────────────────────
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
        { label: 'Tự nguyện', value: 'VOLUNTARY' },
        { label: 'Hết hợp đồng', value: 'CONTRACT_END' },
        { label: 'Thỏa thuận chấm dứt', value: 'MUTUAL_AGREEMENT' },
        { label: 'Kỷ luật sa thải', value: 'DISCIPLINARY' },
      ]},
      { name: 'notes', label: 'Ghi chú bổ sung', type: 'textarea', required: false },
    ],
    {
      ITClearance: [
        { name: 'accountsRevoked', label: 'Đã thu hồi tài khoản email/hệ thống', type: 'checkbox', required: true },
        { name: 'devicesReturned', label: 'Thiết bị đã hoàn trả', type: 'checkbox', required: true },
        { name: 'itNote', label: 'Ghi chú IT', type: 'textarea', required: false },
      ],
      HRFinal: [
        { name: 'documentsCompleted', label: 'Hồ sơ nghỉ việc hoàn tất', type: 'checkbox', required: true },
        { name: 'socialInsuranceProcess', label: 'BHXH đã xử lý', type: 'checkbox', required: true },
        { name: 'finalSalaryPaid', label: 'Lương tháng cuối đã thanh toán', type: 'checkbox', required: true },
        { name: 'hrNote', label: 'Ghi chú HR', type: 'textarea', required: false },
      ],
    },
    {
      steps: [
        { id: 'ITClearance', name: 'IT thu hồi thiết bị và tài khoản', type: 'USER_TASK', assigneeRole: 'IT' },
        { id: 'HRFinal', name: 'HR hoàn tất thủ tục', type: 'USER_TASK', assigneeRole: 'HR' },
      ],
    },
  );

  // ─── 6. Quyết định nhân sự cấp cao ─────────────────────────────────────
  await upsertProcess(
    client,
    'hr-decision-approval-v1',
    'Quyết định nhân sự cấp cao',
    HR_DECISION_BPMN,
    orgUnitId,
    [
      { name: 'decisionType', label: 'Loại quyết định', type: 'select', required: true, options: [
        { label: 'Thăng chức', value: 'PROMOTION' },
        { label: 'Điều chuyển', value: 'TRANSFER' },
        { label: 'Kỷ luật', value: 'DISCIPLINARY' },
        { label: 'Phong danh hiệu', value: 'TITLE_CHANGE' },
        { label: 'Khác', value: 'OTHER' },
      ]},
      { name: 'employeeId', label: 'Nhân viên liên quan', type: 'text', required: true },
      { name: 'effectiveDate', label: 'Ngày hiệu lực', type: 'date', required: true },
      { name: 'description', label: 'Mô tả quyết định', type: 'textarea', required: true },
      { name: 'justification', label: 'Căn cứ quyết định', type: 'textarea', required: true },
    ],
    {
      HRDirectorReview: [
        {
          name: 'hrDirectorDecision',
          label: 'Ý kiến HR Director',
          type: 'select',
          required: true,
          options: [
            { label: 'Đồng ý trình CEO', value: 'ENDORSED' },
            { label: 'Yêu cầu chỉnh sửa', value: 'REVISION_NEEDED' },
            { label: 'Không đồng ý', value: 'REJECTED' },
          ],
        },
        { name: 'hrDirectorNote', label: 'Nhận xét HR Director', type: 'textarea', required: false },
      ],
      CEOApprove: [
        {
          name: 'ceoDecision',
          label: 'Phê duyệt CEO',
          type: 'select',
          required: true,
          options: [
            { label: 'Phê duyệt', value: 'APPROVED' },
            { label: 'Từ chối', value: 'REJECTED' },
          ],
        },
        { name: 'ceoNote', label: 'Chỉ đạo CEO', type: 'textarea', required: false },
      ],
    },
    {
      steps: [
        { id: 'HRDirectorReview', name: 'HR Director xem xét', type: 'USER_TASK', assigneeRole: 'HR_DIRECTOR' },
        { id: 'CEOApprove', name: 'CEO phê duyệt', type: 'USER_TASK', assigneeRole: 'CEO' },
      ],
    },
  );

  // ─── 7. Duyệt ngân sách ─────────────────────────────────────────────────
  await upsertProcess(
    client,
    'budget-approval-v1',
    'Duyệt kế hoạch ngân sách',
    BUDGET_APPROVAL_BPMN,
    orgUnitId,
    [
      { name: 'budgetYear', label: 'Năm ngân sách', type: 'number', required: true },
      { name: 'budgetQuarter', label: 'Quý (nếu có)', type: 'select', required: false, options: [
        { label: 'Q1', value: 'Q1' },
        { label: 'Q2', value: 'Q2' },
        { label: 'Q3', value: 'Q3' },
        { label: 'Q4', value: 'Q4' },
        { label: 'Cả năm', value: 'FULL_YEAR' },
      ]},
      { name: 'department', label: 'Phòng ban', type: 'text', required: true },
      { name: 'totalAmount', label: 'Tổng ngân sách đề xuất (VNĐ)', type: 'number', required: true, min: 0 },
      { name: 'breakdown', label: 'Chi tiết phân bổ ngân sách', type: 'textarea', required: true },
      { name: 'justification', label: 'Căn cứ đề xuất', type: 'textarea', required: true },
    ],
    {
      CFOReview: [
        {
          name: 'cfoRecommendation',
          label: 'Đề xuất của CFO',
          type: 'select',
          required: true,
          options: [
            { label: 'Đồng ý trình CEO', value: 'RECOMMENDED' },
            { label: 'Đồng ý với điều chỉnh', value: 'RECOMMENDED_MODIFIED' },
            { label: 'Không đồng ý', value: 'REJECTED' },
          ],
        },
        { name: 'adjustedAmount', label: 'Ngân sách điều chỉnh (VNĐ)', type: 'number', required: false, min: 0 },
        { name: 'cfoNote', label: 'Nhận xét CFO', type: 'textarea', required: false },
      ],
      CEOApprove: [
        {
          name: 'ceoDecision',
          label: 'Phê duyệt CEO',
          type: 'select',
          required: true,
          options: [
            { label: 'Phê duyệt', value: 'APPROVED' },
            { label: 'Phê duyệt có điều kiện', value: 'CONDITIONAL' },
            { label: 'Từ chối', value: 'REJECTED' },
          ],
        },
        { name: 'approvedAmount', label: 'Ngân sách phê duyệt (VNĐ)', type: 'number', required: false, min: 0 },
        { name: 'ceoNote', label: 'Chỉ đạo CEO', type: 'textarea', required: false },
      ],
    },
    {
      steps: [
        { id: 'CFOReview', name: 'CFO xem xét ngân sách', type: 'USER_TASK', assigneeRole: 'CFO' },
        { id: 'CEOApprove', name: 'CEO phê duyệt', type: 'USER_TASK', assigneeRole: 'CEO' },
      ],
    },
  );

  // ─── 8. Kickoff dự án từ Deal ───────────────────────────────────────────
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
      PMAssign: [
        { name: 'projectCode', label: 'Mã dự án đã tạo', type: 'text', required: true },
        { name: 'teamAssigned', label: 'Team đã phân công', type: 'checkbox', required: true },
        { name: 'kickoffDate', label: 'Ngày kickoff chính thức', type: 'date', required: true },
        { name: 'pmNote', label: 'Ghi chú PM', type: 'textarea', required: false },
      ],
      TechLeadSetup: [
        { name: 'repoCreated', label: 'Repository đã tạo', type: 'checkbox', required: false },
        { name: 'projectSpaceCreated', label: 'Workspace dự án đã thiết lập', type: 'checkbox', required: true },
        { name: 'accessGranted', label: 'Đã cấp quyền cho toàn bộ team', type: 'checkbox', required: true },
        { name: 'techNote', label: 'Ghi chú Tech Lead', type: 'textarea', required: false },
      ],
    },
    {
      steps: [
        { id: 'PMAssign', name: 'PM phân công và xác nhận kickoff', type: 'USER_TASK', assigneeRole: 'PM' },
        { id: 'TechLeadSetup', name: 'Tech Lead thiết lập môi trường', type: 'USER_TASK', assigneeRole: 'TECH_LEAD' },
      ],
    },
  );

  // ─── 9. Đánh giá và điều chỉnh lương ───────────────────────────────────
  await upsertProcess(
    client,
    'salary-review-v1',
    'Đánh giá và điều chỉnh lương',
    SALARY_REVIEW_BPMN,
    orgUnitId,
    [
      { name: 'employeeId', label: 'Nhân viên', type: 'text', required: true },
      { name: 'currentSalary', label: 'Lương hiện tại (VNĐ)', type: 'number', required: true, min: 0 },
      { name: 'proposedSalary', label: 'Lương đề xuất (VNĐ)', type: 'number', required: true, min: 0 },
      { name: 'increasePercent', label: 'Tỷ lệ tăng (%)', type: 'number', required: false, min: 0, max: 200 },
      { name: 'effectiveDate', label: 'Ngày hiệu lực', type: 'date', required: true },
      { name: 'reviewBasis', label: 'Căn cứ điều chỉnh', type: 'select', required: true, options: [
        { label: 'Đánh giá hiệu suất định kỳ', value: 'PERIODIC_REVIEW' },
        { label: 'Thăng chức', value: 'PROMOTION' },
        { label: 'Điều chỉnh thị trường', value: 'MARKET_ADJUSTMENT' },
        { label: 'Khác', value: 'OTHER' },
      ]},
      { name: 'justification', label: 'Lý do đề xuất', type: 'textarea', required: true },
    ],
    {
      CHROReview: [
        { name: 'performanceScore', label: 'Điểm KPI/hiệu suất', type: 'number', required: false, min: 0, max: 10 },
        { name: 'marketBenchmark', label: 'So sánh thị trường', type: 'textarea', required: false },
        { name: 'chroNote', label: 'Nhận xét CHRO', type: 'textarea', required: false },
      ],
      CEOApprove: [
        {
          name: 'ceoDecision',
          label: 'Quyết định CEO',
          type: 'select',
          required: true,
          options: [
            { label: 'Phê duyệt theo đề xuất', value: 'APPROVED' },
            { label: 'Phê duyệt mức điều chỉnh khác', value: 'APPROVED_MODIFIED' },
            { label: 'Từ chối', value: 'REJECTED' },
          ],
        },
        { name: 'approvedSalary', label: 'Mức lương phê duyệt (VNĐ)', type: 'number', required: false, min: 0 },
        { name: 'ceoNote', label: 'Chỉ đạo CEO', type: 'textarea', required: false },
      ],
    },
    {
      steps: [
        { id: 'CHROReview', name: 'CHRO đề xuất mức điều chỉnh', type: 'USER_TASK', assigneeRole: 'CHRO' },
        { id: 'CEOApprove', name: 'CEO phê duyệt', type: 'USER_TASK', assigneeRole: 'CEO' },
      ],
    },
  );

  // ─── 10. Giải trình chấm công ───────────────────────────────────────────
  await upsertProcess(
    client,
    'attendance-explanation-v1',
    'Giải trình chấm công',
    ATTENDANCE_EXPLANATION_BPMN,
    orgUnitId,
    [
      { name: 'attendanceDate', label: 'Ngày cần giải trình', type: 'date', required: true },
      { name: 'issueType', label: 'Loại vấn đề', type: 'select', required: true, options: [
        { label: 'Quên chấm vào', value: 'FORGOT_CHECK_IN' },
        { label: 'Quên chấm ra', value: 'FORGOT_CHECK_OUT' },
        { label: 'Thiết bị lỗi', value: 'DEVICE_ERROR' },
        { label: 'Làm việc ngoài văn phòng', value: 'REMOTE_WORK' },
        { label: 'Lý do khác', value: 'OTHER' },
      ]},
      { name: 'actualCheckIn', label: 'Giờ vào thực tế', type: 'time', required: false },
      { name: 'actualCheckOut', label: 'Giờ ra thực tế', type: 'time', required: false },
      { name: 'explanation', label: 'Giải thích chi tiết', type: 'textarea', required: true },
    ],
    {
      ManagerReview: [
        {
          name: 'decision',
          label: 'Quyết định Trưởng phòng',
          type: 'select',
          required: true,
          options: [
            { label: 'Chấp nhận giải trình', value: 'APPROVED' },
            { label: 'Từ chối giải trình', value: 'REJECTED' },
          ],
        },
        { name: 'note', label: 'Ghi chú', type: 'textarea', required: false },
      ],
    },
    {
      steps: [
        { id: 'ManagerReview', name: 'Trưởng phòng xác nhận giải trình', type: 'USER_TASK', assigneeRole: 'MANAGER' },
      ],
    },
  );

  // ─── 11. Đánh giá hiệu suất ─────────────────────────────────────────────
  await upsertProcess(
    client,
    'performance-review-v1',
    'Đánh giá hiệu suất nhân viên',
    PERFORMANCE_REVIEW_BPMN,
    orgUnitId,
    [
      { name: 'reviewPeriod', label: 'Kỳ đánh giá', type: 'select', required: true, options: [
        { label: 'Q1/2026', value: '2026-Q1' },
        { label: 'Q2/2026', value: '2026-Q2' },
        { label: 'Q3/2026', value: '2026-Q3' },
        { label: 'Q4/2026', value: '2026-Q4' },
        { label: 'Cả năm 2026', value: '2026-FULL' },
      ]},
      { name: 'employeeId', label: 'Nhân viên được đánh giá', type: 'text', required: true },
      { name: 'reviewType', label: 'Loại đánh giá', type: 'select', required: true, options: [
        { label: 'Đánh giá định kỳ', value: 'PERIODIC' },
        { label: 'Đánh giá sau thử việc', value: 'PROBATION' },
        { label: 'Đánh giá đặc biệt', value: 'SPECIAL' },
      ]},
    ],
    {
      SelfAssessment: [
        { name: 'achievements', label: 'Thành tích nổi bật trong kỳ', type: 'textarea', required: true },
        { name: 'challenges', label: 'Khó khăn gặp phải', type: 'textarea', required: false },
        { name: 'selfScore', label: 'Điểm tự đánh giá (1-10)', type: 'number', required: true, min: 1, max: 10 },
        { name: 'developmentGoals', label: 'Mục tiêu phát triển kỳ tới', type: 'textarea', required: false },
      ],
      ManagerReview: [
        { name: 'managerScore', label: 'Điểm Trưởng phòng chấm (1-10)', type: 'number', required: true, min: 1, max: 10 },
        { name: 'finalRating', label: 'Xếp loại cuối kỳ', type: 'select', required: true, options: [
          { label: 'Xuất sắc (S)', value: 'S' },
          { label: 'Tốt (A)', value: 'A' },
          { label: 'Đạt yêu cầu (B)', value: 'B' },
          { label: 'Cần cải thiện (C)', value: 'C' },
          { label: 'Không đạt (D)', value: 'D' },
        ]},
        { name: 'managerFeedback', label: 'Nhận xét Trưởng phòng', type: 'textarea', required: true },
        { name: 'developmentRecommendation', label: 'Khuyến nghị phát triển', type: 'textarea', required: false },
      ],
    },
    {
      steps: [
        { id: 'SelfAssessment', name: 'Nhân viên tự đánh giá', type: 'USER_TASK', assigneeRole: 'SELF' },
        { id: 'ManagerReview', name: 'Trưởng phòng đánh giá và xác nhận', type: 'USER_TASK', assigneeRole: 'MANAGER' },
      ],
    },
  );

  console.log('\n✅ Đã seed 11 BPM ProcessDefinitions thành công!');
  await client.end();
}

main().catch((err) => {
  console.error('❌ Lỗi seed:', err);
  process.exit(1);
});
