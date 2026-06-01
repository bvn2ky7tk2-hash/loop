import 'dotenv/config';
import { Client } from 'pg';
import { randomUUID } from 'crypto';

const DB_URL = process.env['DATABASE_URL'] || 'postgresql://loop:loop_password@localhost:5432/loop_db';

// ─── Types (mirror AssigneeConfigDto / StepConfigItemDto from BE) ─────────────

interface AssigneeConfig {
  mode: 'fixed' | 'orgunit' | 'requester_manager' | 'variable';
  userId?: string;
  orgUnitId?: string;
  role?: string;
  variablePath?: string;
}

interface NotificationTrigger {
  enabled: boolean;
  recipients: string[];
  subject: string;
  bodyTemplate: string;
}

interface StepConfigItem {
  assigneeConfig?: AssigneeConfig;
  notificationConfig?: {
    taskAssigned?: NotificationTrigger;
    taskCompleted?: NotificationTrigger;
  };
}

type StepConfigMap = Record<string, StepConfigItem>;

// ─── Email template helpers ───────────────────────────────────────────────────

const ASSIGNED_BODY = (extra = '') => `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#1D4ED8;padding:16px 24px;border-radius:8px 8px 0 0">
    <h2 style="color:#fff;margin:0;font-size:18px">Task quy trình mới</h2>
  </div>
  <div style="background:#F8FAFC;padding:20px 24px;border-radius:0 0 8px 8px;border:1px solid #E2E8F0;border-top:none">
    <p style="margin:0 0 12px">Xin chào <strong>{{recipient.name}}</strong>,</p>
    <p style="margin:0 0 12px">Task <strong>{{task.name}}</strong> trong quy trình <strong>{{process.name}}</strong> vừa được giao cho bạn.</p>
    ${extra}
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:12px;margin:16px 0">
      <p style="margin:0;font-size:13px;color:#1E40AF">Người yêu cầu: <strong>{{requester.name}}</strong></p>
    </div>
    <p style="margin:0;color:#64748B;font-size:13px">Vui lòng đăng nhập <strong>Loop 360</strong> để xem và xử lý task.</p>
  </div>
  <p style="color:#94A3B8;font-size:11px;margin:12px 0 0;text-align:center">— Loop 360 Workflow System</p>
</div>`.trim();

const COMPLETED_BODY = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
  <div style="background:#059669;padding:16px 24px;border-radius:8px 8px 0 0">
    <h2 style="color:#fff;margin:0;font-size:18px">Bước quy trình đã hoàn thành</h2>
  </div>
  <div style="background:#F8FAFC;padding:20px 24px;border-radius:0 0 8px 8px;border:1px solid #E2E8F0;border-top:none">
    <p style="margin:0 0 12px">Xin chào <strong>{{recipient.name}}</strong>,</p>
    <p style="margin:0 0 12px">Task <strong>{{task.name}}</strong> trong quy trình <strong>{{process.name}}</strong> vừa được hoàn thành bởi <strong>{{assignee.name}}</strong>.</p>
    <p style="margin:0;color:#64748B;font-size:13px">Vui lòng đăng nhập <strong>Loop 360</strong> để xem chi tiết và các bước tiếp theo.</p>
  </div>
  <p style="color:#94A3B8;font-size:11px;margin:12px 0 0;text-align:center">— Loop 360 Workflow System</p>
</div>`.trim();

function makeStep(opts: {
  assigneeMode?: AssigneeConfig['mode'];
  assigneeOrgUnitId?: string;
  assigneeRole?: string;
  assigneeUserId?: string;
  assigneeVariablePath?: string;
  extraAssignedBody?: string;
  assignedSubject?: string;
  completedRecipients?: string[];
}): StepConfigItem {
  const {
    assigneeMode = 'requester_manager',
    assigneeOrgUnitId,
    assigneeRole,
    assigneeUserId,
    assigneeVariablePath,
    extraAssignedBody = '',
    assignedSubject = 'Task mới: {{task.name}} — {{process.name}}',
    completedRecipients = ['requester'],
  } = opts;

  const assigneeConfig: AssigneeConfig = { mode: assigneeMode };
  if (assigneeOrgUnitId) assigneeConfig.orgUnitId = assigneeOrgUnitId;
  if (assigneeRole) assigneeConfig.role = assigneeRole;
  if (assigneeUserId) assigneeConfig.userId = assigneeUserId;
  if (assigneeVariablePath) assigneeConfig.variablePath = assigneeVariablePath;

  return {
    assigneeConfig,
    notificationConfig: {
      taskAssigned: {
        enabled: true,
        recipients: ['assignee'],
        subject: assignedSubject,
        bodyTemplate: ASSIGNED_BODY(extraAssignedBody),
      },
      taskCompleted: {
        enabled: true,
        recipients: completedRecipients,
        subject: 'Cập nhật quy trình: {{process.name}}',
        bodyTemplate: COMPLETED_BODY,
      },
    },
  };
}

// ─── BPMN XML với DI diagram sections ────────────────────────────────────────

// 1. Duyệt tăng ca: Start → ManagerApprove → HRConfirm → End
const OT_APPROVAL_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="overtime-approval-v1" isExecutable="true">
    <startEvent id="Start_1" name="Nhân viên gửi OT" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="ManagerApprove" />
    <userTask id="ManagerApprove" name="Trưởng phòng duyệt tăng ca" />
    <sequenceFlow id="Flow_2" sourceRef="ManagerApprove" targetRef="HRConfirm" />
    <userTask id="HRConfirm" name="HR xác nhận giờ tăng ca" />
    <sequenceFlow id="Flow_3" sourceRef="HRConfirm" targetRef="End_1" />
    <endEvent id="End_1" name="Hoàn thành" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="overtime-approval-v1">
      <bpmndi:BPMNShape id="Start_1_di" bpmnElement="Start_1">
        <dc:Bounds x="152" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="135" y="125" width="72" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ManagerApprove_di" bpmnElement="ManagerApprove">
        <dc:Bounds x="280" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="HRConfirm_di" bpmnElement="HRConfirm">
        <dc:Bounds x="440" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_1_di" bpmnElement="End_1">
        <dc:Bounds x="602" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="592" y="125" width="57" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="100" /><di:waypoint x="280" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="380" y="100" /><di:waypoint x="440" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="540" y="100" /><di:waypoint x="602" y="100" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

// 2. Duyệt kế hoạch ngân sách: Start → FinanceManagerReview → CFOApprove → End
const BUDGET_APPROVAL_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="budget-approval-v1" isExecutable="true">
    <startEvent id="Start_1" name="Đề xuất ngân sách" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="FinanceManagerReview" />
    <userTask id="FinanceManagerReview" name="Finance Manager xem xét ngân sách" />
    <sequenceFlow id="Flow_2" sourceRef="FinanceManagerReview" targetRef="CFOApprove" />
    <userTask id="CFOApprove" name="CFO phê duyệt kế hoạch ngân sách" />
    <sequenceFlow id="Flow_3" sourceRef="CFOApprove" targetRef="End_1" />
    <endEvent id="End_1" name="Ngân sách được duyệt" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="budget-approval-v1">
      <bpmndi:BPMNShape id="Start_1_di" bpmnElement="Start_1">
        <dc:Bounds x="152" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="130" y="125" width="82" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="FinanceManagerReview_di" bpmnElement="FinanceManagerReview">
        <dc:Bounds x="280" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="CFOApprove_di" bpmnElement="CFOApprove">
        <dc:Bounds x="440" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_1_di" bpmnElement="End_1">
        <dc:Bounds x="602" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="578" y="125" width="84" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="100" /><di:waypoint x="280" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="380" y="100" /><di:waypoint x="440" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="540" y="100" /><di:waypoint x="602" y="100" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

// 3. Gia hạn hợp đồng: Start → HRPrepare → ManagerApprove → Gateway → DirectorApprove? → End
const CONTRACT_RENEWAL_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="contract-renewal-v1" isExecutable="true">
    <startEvent id="Start_1" name="Đề xuất gia hạn" />
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
    <endEvent id="End_1" name="Hợp đồng được gia hạn" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="contract-renewal-v1">
      <bpmndi:BPMNShape id="Start_1_di" bpmnElement="Start_1">
        <dc:Bounds x="152" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="133" y="125" width="74" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="HRPrepare_di" bpmnElement="HRPrepare">
        <dc:Bounds x="280" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ManagerApprove_di" bpmnElement="ManagerApprove">
        <dc:Bounds x="440" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="DirectorGateway_di" bpmnElement="DirectorGateway" isMarkerVisible="true">
        <dc:Bounds x="615" y="75" width="50" height="50" />
        <bpmndi:BPMNLabel><dc:Bounds x="605" y="132" width="70" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="DirectorApprove_di" bpmnElement="DirectorApprove">
        <dc:Bounds x="740" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_1_di" bpmnElement="End_1">
        <dc:Bounds x="902" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="876" y="125" width="90" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="100" /><di:waypoint x="280" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="380" y="100" /><di:waypoint x="440" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="540" y="100" /><di:waypoint x="615" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4">
        <di:waypoint x="665" y="100" /><di:waypoint x="740" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5">
        <di:waypoint x="640" y="75" /><di:waypoint x="640" y="35" /><di:waypoint x="920" y="35" /><di:waypoint x="920" y="82" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6">
        <di:waypoint x="840" y="100" /><di:waypoint x="902" y="100" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

// 4. Nghỉ việc: Start → ParallelSplit → [IT, HR, Payroll, Manager] → ParallelJoin → End
const OFFBOARDING_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="employee-offboarding-v1" isExecutable="true">
    <startEvent id="Start_1" name="Nhân viên nghỉ việc" />
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
    <endEvent id="End_1" name="Hoàn tất nghỉ việc" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="employee-offboarding-v1">
      <bpmndi:BPMNShape id="Start_1_di" bpmnElement="Start_1">
        <dc:Bounds x="82" y="182" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="58" y="225" width="85" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ParallelSplit_di" bpmnElement="ParallelSplit">
        <dc:Bounds x="175" y="175" width="50" height="50" />
        <bpmndi:BPMNLabel><dc:Bounds x="158" y="232" width="85" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ITRevoke_di" bpmnElement="ITRevoke">
        <dc:Bounds x="310" y="10" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="HRProcess_di" bpmnElement="HRProcess">
        <dc:Bounds x="310" y="110" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="PayrollFinal_di" bpmnElement="PayrollFinal">
        <dc:Bounds x="310" y="210" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ManagerHandover_di" bpmnElement="ManagerHandover">
        <dc:Bounds x="310" y="310" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ParallelJoin_di" bpmnElement="ParallelJoin">
        <dc:Bounds x="465" y="175" width="50" height="50" />
        <bpmndi:BPMNLabel><dc:Bounds x="466" y="232" width="48" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_1_di" bpmnElement="End_1">
        <dc:Bounds x="562" y="182" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="541" y="225" width="79" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="118" y="200" /><di:waypoint x="175" y="200" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_IT_di" bpmnElement="Flow_IT">
        <di:waypoint x="200" y="175" /><di:waypoint x="200" y="50" /><di:waypoint x="310" y="50" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_HR_di" bpmnElement="Flow_HR">
        <di:waypoint x="200" y="175" /><di:waypoint x="200" y="150" /><di:waypoint x="310" y="150" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Payroll_di" bpmnElement="Flow_Payroll">
        <di:waypoint x="200" y="225" /><di:waypoint x="200" y="250" /><di:waypoint x="310" y="250" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Manager_di" bpmnElement="Flow_Manager">
        <di:waypoint x="200" y="225" /><di:waypoint x="200" y="350" /><di:waypoint x="310" y="350" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_IT2_di" bpmnElement="Flow_IT2">
        <di:waypoint x="410" y="50" /><di:waypoint x="440" y="50" /><di:waypoint x="440" y="200" /><di:waypoint x="465" y="200" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_HR2_di" bpmnElement="Flow_HR2">
        <di:waypoint x="410" y="150" /><di:waypoint x="440" y="150" /><di:waypoint x="440" y="200" /><di:waypoint x="465" y="200" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Payroll2_di" bpmnElement="Flow_Payroll2">
        <di:waypoint x="410" y="250" /><di:waypoint x="440" y="250" /><di:waypoint x="440" y="200" /><di:waypoint x="465" y="200" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Manager2_di" bpmnElement="Flow_Manager2">
        <di:waypoint x="410" y="350" /><di:waypoint x="440" y="350" /><di:waypoint x="440" y="200" /><di:waypoint x="465" y="200" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_End_di" bpmnElement="Flow_End">
        <di:waypoint x="515" y="200" /><di:waypoint x="562" y="200" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

// 5. Kickoff dự án: Start → PMConfirm → LegalReview → ITPortalSetup → End
const DEAL_KICKOFF_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="deal-to-project-kickoff-v1" isExecutable="true">
    <startEvent id="Start_1" name="Deal thắng" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="PMConfirm" />
    <userTask id="PMConfirm" name="PM xác nhận kickoff dự án" />
    <sequenceFlow id="Flow_2" sourceRef="PMConfirm" targetRef="LegalReview" />
    <userTask id="LegalReview" name="Pháp lý rà soát hợp đồng" />
    <sequenceFlow id="Flow_3" sourceRef="LegalReview" targetRef="ITPortalSetup" />
    <userTask id="ITPortalSetup" name="IT cấp quyền truy cập portal dự án" />
    <sequenceFlow id="Flow_4" sourceRef="ITPortalSetup" targetRef="End_1" />
    <endEvent id="End_1" name="Dự án được khởi động" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="deal-to-project-kickoff-v1">
      <bpmndi:BPMNShape id="Start_1_di" bpmnElement="Start_1">
        <dc:Bounds x="152" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="148" y="125" width="45" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="PMConfirm_di" bpmnElement="PMConfirm">
        <dc:Bounds x="280" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="LegalReview_di" bpmnElement="LegalReview">
        <dc:Bounds x="440" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ITPortalSetup_di" bpmnElement="ITPortalSetup">
        <dc:Bounds x="600" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_1_di" bpmnElement="End_1">
        <dc:Bounds x="762" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="738" y="125" width="86" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="100" /><di:waypoint x="280" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="380" y="100" /><di:waypoint x="440" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="540" y="100" /><di:waypoint x="600" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4">
        <di:waypoint x="700" y="100" /><di:waypoint x="762" y="100" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

// 6. Điều chỉnh lương: Start → HRPropose → DirectorApprove → End
const SALARY_REVIEW_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="salary-review-v1" isExecutable="true">
    <startEvent id="Start_1" name="Đề xuất điều chỉnh lương" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="HRPropose" />
    <userTask id="HRPropose" name="HR đề xuất mức điều chỉnh lương" />
    <sequenceFlow id="Flow_2" sourceRef="HRPropose" targetRef="DirectorApprove" />
    <userTask id="DirectorApprove" name="Giám đốc phê duyệt điều chỉnh lương" />
    <sequenceFlow id="Flow_3" sourceRef="DirectorApprove" targetRef="End_1" />
    <endEvent id="End_1" name="Lương được điều chỉnh" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="salary-review-v1">
      <bpmndi:BPMNShape id="Start_1_di" bpmnElement="Start_1">
        <dc:Bounds x="152" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="121" y="125" width="99" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="HRPropose_di" bpmnElement="HRPropose">
        <dc:Bounds x="280" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="DirectorApprove_di" bpmnElement="DirectorApprove">
        <dc:Bounds x="440" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_1_di" bpmnElement="End_1">
        <dc:Bounds x="602" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="575" y="125" width="91" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="100" /><di:waypoint x="280" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="380" y="100" /><di:waypoint x="440" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="540" y="100" /><di:waypoint x="602" y="100" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

// 7. Chốt phép năm: Start → HRConfirmPayout → End
const YEAR_END_LEAVE_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="year-end-leave-closure-v1" isExecutable="true">
    <startEvent id="Start_1" name="Bắt đầu chốt phép năm" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="HRConfirmPayout" />
    <userTask id="HRConfirmPayout" name="HR xác nhận danh sách payout phép dư" />
    <sequenceFlow id="Flow_2" sourceRef="HRConfirmPayout" targetRef="End_1" />
    <endEvent id="End_1" name="Hoàn tất chốt phép" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="year-end-leave-closure-v1">
      <bpmndi:BPMNShape id="Start_1_di" bpmnElement="Start_1">
        <dc:Bounds x="152" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="121" y="125" width="99" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="HRConfirmPayout_di" bpmnElement="HRConfirmPayout">
        <dc:Bounds x="280" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_1_di" bpmnElement="End_1">
        <dc:Bounds x="442" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="418" y="125" width="84" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="100" /><di:waypoint x="280" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="380" y="100" /><di:waypoint x="442" y="100" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

// ─── Database upsert ──────────────────────────────────────────────────────────

async function upsertProcess(
  client: InstanceType<typeof Client>,
  key: string,
  name: string,
  bpmnXml: string,
  orgUnitId: string,
  formFields: object,
  taskFormFields: object,
  stepConfig: StepConfigMap,
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

// ─── Main ─────────────────────────────────────────────────────────────────────

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

  console.log('🔄 Seeding BPM ProcessDefinitions v5 (với DI diagram + stepConfig)...\n');

  // 1. Duyệt tăng ca — Trưởng phòng → HR
  await upsertProcess(
    client,
    'overtime-approval-v1',
    'Duyệt tăng ca',
    OT_APPROVAL_BPMN,
    orgUnitId,
    [
      { name: 'date', label: 'Ngày tăng ca', type: 'date', required: true },
      { name: 'fromTime', label: 'Từ giờ', type: 'text', required: true },
      { name: 'toTime', label: 'Đến giờ', type: 'text', required: true },
      { name: 'hours', label: 'Số giờ OT', type: 'number', required: true, min: 0.5, max: 12 },
      { name: 'reason', label: 'Lý do tăng ca', type: 'textarea', required: true },
    ],
    {
      ManagerApprove: [
        { name: 'decision', label: 'Quyết định', type: 'select', required: true, options: [
          { label: 'Duyệt', value: 'APPROVED' }, { label: 'Từ chối', value: 'REJECTED' },
        ]},
        { name: 'note', label: 'Ghi chú', type: 'textarea', required: false },
      ],
      HRConfirm: [
        { name: 'confirmedHours', label: 'Giờ OT thực tế', type: 'number', required: true, min: 0.5, max: 12 },
        { name: 'hrNote', label: 'Ghi chú HR', type: 'textarea', required: false },
      ],
    },
    {
      ManagerApprove: makeStep({
        assigneeMode: 'requester_manager',
        assignedSubject: 'Cần duyệt tăng ca: {{process.name}}',
        extraAssignedBody: '<p style="color:#D97706;font-size:13px">⏰ Đơn tăng ca cần được xử lý trong 24 giờ.</p>',
        completedRecipients: ['requester'],
      }),
      HRConfirm: makeStep({
        assigneeMode: 'orgunit',
        assigneeOrgUnitId: orgUnitId,
        assigneeRole: 'LEADERSHIP',
        assignedSubject: 'Xác nhận giờ OT: {{process.name}}',
        completedRecipients: ['requester', 'requester_manager'],
      }),
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
        { name: 'decision', label: 'Quyết định Finance Manager', type: 'select', required: true, options: [
          { label: 'Đồng ý chuyển CFO', value: 'APPROVED' },
          { label: 'Yêu cầu bổ sung', value: 'NEED_INFO' },
          { label: 'Từ chối', value: 'REJECTED' },
        ]},
        { name: 'financeNote', label: 'Nhận xét', type: 'textarea', required: false },
      ],
      CFOApprove: [
        { name: 'decision', label: 'Phê duyệt CFO', type: 'select', required: true, options: [
          { label: 'Phê duyệt', value: 'APPROVED' },
          { label: 'Điều chỉnh ngân sách', value: 'REVISED' },
          { label: 'Từ chối', value: 'REJECTED' },
        ]},
        { name: 'approvedAmount', label: 'Số tiền phê duyệt (VNĐ)', type: 'number', required: false, min: 0 },
        { name: 'cfoNote', label: 'Ý kiến CFO', type: 'textarea', required: false },
      ],
    },
    {
      FinanceManagerReview: makeStep({
        assigneeMode: 'requester_manager',
        assignedSubject: 'Cần xem xét kế hoạch ngân sách: {{process.name}}',
        completedRecipients: ['requester'],
      }),
      CFOApprove: makeStep({
        assigneeMode: 'orgunit',
        assigneeOrgUnitId: orgUnitId,
        assigneeRole: 'LEADERSHIP',
        assignedSubject: 'Ngân sách chờ phê duyệt CFO: {{process.name}}',
        completedRecipients: ['requester', 'requester_manager'],
      }),
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
      { name: 'requiresDirectorApproval', label: 'Cần Giám đốc duyệt?', type: 'text', required: true },
      { name: 'notes', label: 'Ghi chú', type: 'textarea', required: false },
    ],
    {
      HRPrepare: [
        { name: 'contractDraft', label: 'Hợp đồng đã chuẩn bị', type: 'text', required: true },
        { name: 'hrNote', label: 'Ghi chú HR', type: 'textarea', required: false },
      ],
      ManagerApprove: [
        { name: 'decision', label: 'Quyết định', type: 'select', required: true, options: [
          { label: 'Đồng ý gia hạn', value: 'APPROVED' },
          { label: 'Từ chối', value: 'REJECTED' },
        ]},
        { name: 'managerNote', label: 'Nhận xét', type: 'textarea', required: false },
      ],
      DirectorApprove: [
        { name: 'decision', label: 'Phê duyệt Giám đốc', type: 'select', required: true, options: [
          { label: 'Ký duyệt gia hạn', value: 'APPROVED' },
          { label: 'Từ chối', value: 'REJECTED' },
        ]},
        { name: 'directorNote', label: 'Ý kiến Giám đốc', type: 'textarea', required: false },
      ],
    },
    {
      HRPrepare: makeStep({
        assigneeMode: 'orgunit',
        assigneeOrgUnitId: orgUnitId,
        assigneeRole: 'LEADERSHIP',
        assignedSubject: 'Cần chuẩn bị hợp đồng gia hạn: {{process.name}}',
        completedRecipients: ['requester'],
      }),
      ManagerApprove: makeStep({
        assigneeMode: 'requester_manager',
        assignedSubject: 'Cần xác nhận gia hạn hợp đồng: {{process.name}}',
        completedRecipients: ['requester'],
      }),
      DirectorApprove: makeStep({
        assigneeMode: 'orgunit',
        assigneeOrgUnitId: orgUnitId,
        assigneeRole: 'LEADERSHIP',
        assignedSubject: 'Gia hạn hợp đồng cần Giám đốc ký duyệt: {{process.name}}',
        completedRecipients: ['requester', 'requester_manager'],
      }),
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
        { name: 'accountsRevoked', label: 'Đã thu hồi tài khoản', type: 'text', required: true },
        { name: 'devicesReturned', label: 'Thiết bị đã hoàn trả', type: 'text', required: true },
        { name: 'itNote', label: 'Ghi chú IT', type: 'textarea', required: false },
      ],
      HRProcess: [
        { name: 'documentsCompleted', label: 'Hồ sơ nghỉ việc hoàn tất', type: 'text', required: true },
        { name: 'socialInsuranceProcess', label: 'BHXH đã xử lý', type: 'text', required: true },
        { name: 'hrNote', label: 'Ghi chú HR', type: 'textarea', required: false },
      ],
      PayrollFinal: [
        { name: 'finalSalaryCalculated', label: 'Đã tính lương tháng cuối', type: 'text', required: true },
        { name: 'unusedLeavePayoutAmount', label: 'Tiền phép dư (VNĐ)', type: 'number', required: false, min: 0 },
        { name: 'payrollNote', label: 'Ghi chú kế toán', type: 'textarea', required: false },
      ],
      ManagerHandover: [
        { name: 'taskHandoverCompleted', label: 'Bàn giao công việc hoàn tất', type: 'text', required: true },
        { name: 'knowledgeTransfer', label: 'Chuyển giao kiến thức', type: 'text', required: true },
        { name: 'managerNote', label: 'Ghi chú Trưởng phòng', type: 'textarea', required: false },
      ],
    },
    {
      ITRevoke: makeStep({
        assigneeMode: 'orgunit',
        assigneeOrgUnitId: orgUnitId,
        assigneeRole: 'PM',
        assignedSubject: 'Thu hồi thiết bị & tài khoản: {{process.name}}',
        completedRecipients: ['requester'],
      }),
      HRProcess: makeStep({
        assigneeMode: 'orgunit',
        assigneeOrgUnitId: orgUnitId,
        assigneeRole: 'LEADERSHIP',
        assignedSubject: 'Xử lý hồ sơ nghỉ việc: {{process.name}}',
        completedRecipients: ['requester'],
      }),
      PayrollFinal: makeStep({
        assigneeMode: 'orgunit',
        assigneeOrgUnitId: orgUnitId,
        assigneeRole: 'LEADERSHIP',
        assignedSubject: 'Chốt lương và phụ cấp: {{process.name}}',
        completedRecipients: ['requester'],
      }),
      ManagerHandover: makeStep({
        assigneeMode: 'requester_manager',
        assignedSubject: 'Bàn giao công việc nhân viên nghỉ việc: {{process.name}}',
        completedRecipients: ['requester'],
      }),
    },
  );

  // 5. Kickoff dự án từ Deal thắng — PM → Legal → IT portal
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
        { name: 'teamAssigned', label: 'Team đã phân công', type: 'text', required: true },
        { name: 'kickoffDate', label: 'Ngày kickoff chính thức', type: 'date', required: true },
        { name: 'pmNote', label: 'Ghi chú PM', type: 'textarea', required: false },
      ],
      LegalReview: [
        { name: 'contractSigned', label: 'Hợp đồng đã ký', type: 'text', required: true },
        { name: 'nda', label: 'NDA đã ký (nếu có)', type: 'text', required: false },
        { name: 'legalNote', label: 'Ghi chú pháp lý', type: 'textarea', required: false },
      ],
      ITPortalSetup: [
        { name: 'projectSpaceCreated', label: 'Workspace dự án đã tạo', type: 'text', required: true },
        { name: 'accessGranted', label: 'Đã cấp quyền cho team', type: 'text', required: true },
        { name: 'repoCreated', label: 'Repository đã tạo (nếu có)', type: 'text', required: false },
        { name: 'itNote', label: 'Ghi chú IT', type: 'textarea', required: false },
      ],
    },
    {
      PMConfirm: makeStep({
        assigneeMode: 'orgunit',
        assigneeOrgUnitId: orgUnitId,
        assigneeRole: 'PM',
        assignedSubject: 'Kickoff dự án cần xác nhận từ PM: {{process.name}}',
        completedRecipients: ['requester'],
      }),
      LegalReview: makeStep({
        assigneeMode: 'requester_manager',
        assignedSubject: 'Rà soát pháp lý hợp đồng: {{process.name}}',
        completedRecipients: ['requester'],
      }),
      ITPortalSetup: makeStep({
        assigneeMode: 'orgunit',
        assigneeOrgUnitId: orgUnitId,
        assigneeRole: 'PM',
        assignedSubject: 'Cấp quyền portal dự án: {{process.name}}',
        completedRecipients: ['requester', 'requester_manager'],
      }),
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
        { name: 'decision', label: 'Quyết định Giám đốc', type: 'select', required: true, options: [
          { label: 'Phê duyệt theo đề xuất', value: 'APPROVED' },
          { label: 'Phê duyệt mức khác', value: 'APPROVED_MODIFIED' },
          { label: 'Từ chối', value: 'REJECTED' },
        ]},
        { name: 'approvedSalary', label: 'Mức lương phê duyệt (VNĐ)', type: 'number', required: false, min: 0 },
        { name: 'directorNote', label: 'Ý kiến Giám đốc', type: 'textarea', required: false },
      ],
    },
    {
      HRPropose: makeStep({
        assigneeMode: 'orgunit',
        assigneeOrgUnitId: orgUnitId,
        assigneeRole: 'LEADERSHIP',
        assignedSubject: 'Đề xuất điều chỉnh lương cần HR xem xét: {{process.name}}',
        completedRecipients: ['requester'],
      }),
      DirectorApprove: makeStep({
        assigneeMode: 'orgunit',
        assigneeOrgUnitId: orgUnitId,
        assigneeRole: 'LEADERSHIP',
        assignedSubject: 'Điều chỉnh lương chờ phê duyệt Giám đốc: {{process.name}}',
        completedRecipients: ['requester', 'requester_manager'],
      }),
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
        { name: 'employeeListVerified', label: 'Danh sách nhân viên đã kiểm tra', type: 'text', required: true },
        { name: 'unusedLeaveListExported', label: 'Báo cáo phép dư đã xuất', type: 'text', required: true },
        { name: 'totalPayoutAmount', label: 'Tổng tiền payout (VNĐ)', type: 'number', required: true, min: 0 },
        { name: 'employeesWithCarryover', label: 'Số NV chuyển phép sang năm mới', type: 'number', required: false, min: 0 },
        { name: 'hrConfirmNote', label: 'Ghi chú xác nhận', type: 'textarea', required: false },
      ],
    },
    {
      HRConfirmPayout: makeStep({
        assigneeMode: 'orgunit',
        assigneeOrgUnitId: orgUnitId,
        assigneeRole: 'LEADERSHIP',
        assignedSubject: 'Chốt danh sách payout phép năm: {{process.name}}',
        completedRecipients: ['requester'],
      }),
    },
  );

  // 8. Duyệt đặt xe công vụ — Leadership duyệt một bước
  const VEHICLE_APPROVAL_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="vehicle-booking-approval" isExecutable="true">
    <startEvent id="Start_1" name="Nhân viên đặt xe" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="DuyetXe" />
    <userTask id="DuyetXe" name="Duyệt yêu cầu xe công vụ" />
    <sequenceFlow id="Flow_2" sourceRef="DuyetXe" targetRef="End_1" />
    <endEvent id="End_1" name="Hoàn thành" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="vehicle-booking-approval">
      <bpmndi:BPMNShape id="Start_1_di" bpmnElement="Start_1">
        <dc:Bounds x="152" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="131" y="125" width="80" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="DuyetXe_di" bpmnElement="DuyetXe">
        <dc:Bounds x="280" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_1_di" bpmnElement="End_1">
        <dc:Bounds x="462" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="450" y="125" width="62" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="100" /><di:waypoint x="280" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="380" y="100" /><di:waypoint x="462" y="100" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

  await upsertProcess(
    client,
    'vehicle-booking-approval',
    'Duyệt đặt xe công vụ',
    VEHICLE_APPROVAL_BPMN,
    orgUnitId,
    [
      { name: 'vehicleName',  label: 'Tên xe',           type: 'text',     required: false },
      { name: 'plateNumber',  label: 'Biển số',           type: 'text',     required: false },
      { name: 'purpose',      label: 'Mục đích',          type: 'textarea', required: true  },
      { name: 'destination',  label: 'Điểm đến',          type: 'text',     required: true  },
      { name: 'startTime',    label: 'Thời gian bắt đầu', type: 'text',     required: false },
      { name: 'endTime',      label: 'Thời gian kết thúc',type: 'text',     required: false },
    ],
    {
      DuyetXe: [
        { name: 'decision', label: 'Quyết định', type: 'select', required: true, options: [
          { label: 'Duyệt', value: 'APPROVED' }, { label: 'Từ chối', value: 'REJECTED' },
        ]},
        { name: 'rejectedReason', label: 'Lý do từ chối', type: 'textarea', required: false },
      ],
    },
    {
      DuyetXe: makeStep({
        assigneeMode:        'orgunit',
        assigneeOrgUnitId:   orgUnitId,
        assigneeRole:        'LEADERSHIP',
        assignedSubject:     'Yêu cầu xe công vụ cần duyệt: {{process.name}}',
        completedRecipients: ['requester'],
      }),
    },
  );

  // 9. Duyệt phiếu chi (Expense) — Manager duyệt → Kế toán xác nhận
  const EXPENSE_APPROVAL_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="expense-approval" isExecutable="true">
    <startEvent id="Start_1" name="Nhân viên gửi phiếu chi" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="ManagerApprove" />
    <userTask id="ManagerApprove" name="Quản lý duyệt phiếu chi" />
    <sequenceFlow id="Flow_2" sourceRef="ManagerApprove" targetRef="AccountingConfirm" />
    <userTask id="AccountingConfirm" name="Kế toán xác nhận thanh toán" />
    <sequenceFlow id="Flow_3" sourceRef="AccountingConfirm" targetRef="End_1" />
    <endEvent id="End_1" name="Hoàn thành" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="expense-approval">
      <bpmndi:BPMNShape id="Start_1_di" bpmnElement="Start_1">
        <dc:Bounds x="152" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="131" y="125" width="80" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ManagerApprove_di" bpmnElement="ManagerApprove">
        <dc:Bounds x="280" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="AccountingConfirm_di" bpmnElement="AccountingConfirm">
        <dc:Bounds x="450" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_1_di" bpmnElement="End_1">
        <dc:Bounds x="632" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="620" y="125" width="62" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="100" /><di:waypoint x="280" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="380" y="100" /><di:waypoint x="450" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="550" y="100" /><di:waypoint x="632" y="100" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

  await upsertProcess(
    client,
    'expense-approval',
    'Duyệt phiếu đề nghị thanh toán',
    EXPENSE_APPROVAL_BPMN,
    orgUnitId,
    [
      { name: 'title',       label: 'Tên phiếu chi',      type: 'text',     required: true  },
      { name: 'category',    label: 'Loại chi phí',        type: 'text',     required: true  },
      { name: 'totalAmount', label: 'Tổng tiền (VNĐ)',     type: 'number',   required: true, min: 0 },
      { name: 'currency',    label: 'Đơn vị tiền tệ',     type: 'text',     required: false },
      { name: 'description', label: 'Mô tả chi tiết',     type: 'textarea', required: false },
    ],
    {
      ManagerApprove: [
        { name: 'decision', label: 'Quyết định', type: 'select', required: true, options: [
          { label: 'Duyệt', value: 'APPROVED' }, { label: 'Từ chối', value: 'REJECTED' },
        ]},
        { name: 'rejectedReason', label: 'Lý do từ chối', type: 'textarea', required: false },
        { name: 'note',           label: 'Ghi chú',        type: 'textarea', required: false },
      ],
      AccountingConfirm: [
        { name: 'decision', label: 'Xác nhận thanh toán', type: 'select', required: true, options: [
          { label: 'Đã thanh toán', value: 'APPROVED' }, { label: 'Hoàn trả', value: 'REJECTED' },
        ]},
        { name: 'paymentDate',    label: 'Ngày thanh toán',   type: 'date',     required: false },
        { name: 'paymentMethod',  label: 'Hình thức TT',      type: 'text',     required: false },
        { name: 'rejectedReason', label: 'Lý do hoàn trả',   type: 'textarea', required: false },
      ],
    },
    {
      ManagerApprove: makeStep({
        assigneeMode:        'requester_manager',
        assignedSubject:     'Phiếu chi cần duyệt: {{process.name}}',
        extraAssignedBody:   '<p style="color:#D97706;font-size:13px">💰 Vui lòng xem xét và phê duyệt phiếu đề nghị thanh toán.</p>',
        completedRecipients: ['requester'],
      }),
      AccountingConfirm: makeStep({
        assigneeMode:        'orgunit',
        assigneeOrgUnitId:   orgUnitId,
        assigneeRole:        'LEADERSHIP',
        assignedSubject:     'Xác nhận thanh toán phiếu chi: {{process.name}}',
        completedRecipients: ['requester', 'requester_manager'],
      }),
    },
  );

  // 10. Giải trình chấm công — Manager xem xét một bước
  const ATTENDANCE_EXPLANATION_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="attendance-explanation-v1" isExecutable="true">
    <startEvent id="Start_1" name="Nhân viên gửi giải trình" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="ManagerReview" />
    <userTask id="ManagerReview" name="Quản lý xem xét giải trình chấm công" />
    <sequenceFlow id="Flow_2" sourceRef="ManagerReview" targetRef="End_1" />
    <endEvent id="End_1" name="Hoàn thành" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="attendance-explanation-v1">
      <bpmndi:BPMNShape id="Start_1_di" bpmnElement="Start_1">
        <dc:Bounds x="152" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="131" y="125" width="90" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ManagerReview_di" bpmnElement="ManagerReview">
        <dc:Bounds x="280" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_1_di" bpmnElement="End_1">
        <dc:Bounds x="462" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="450" y="125" width="62" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="100" /><di:waypoint x="280" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="380" y="100" /><di:waypoint x="462" y="100" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

  await upsertProcess(
    client,
    'attendance-explanation-v1',
    'Giải trình chấm công',
    ATTENDANCE_EXPLANATION_BPMN,
    orgUnitId,
    [
      { name: 'date',   label: 'Ngày cần giải trình', type: 'date',     required: true  },
      { name: 'type',   label: 'Loại giải trình',      type: 'text',     required: true  },
      { name: 'reason', label: 'Lý do giải trình',     type: 'textarea', required: true  },
    ],
    {
      ManagerReview: [
        { name: 'decision', label: 'Quyết định', type: 'select', required: true, options: [
          { label: 'Chấp thuận', value: 'APPROVED' }, { label: 'Từ chối', value: 'REJECTED' },
        ]},
        { name: 'rejectedReason', label: 'Lý do từ chối',  type: 'textarea', required: false },
        { name: 'approvedById',   label: 'ID người duyệt', type: 'text',     required: false },
      ],
    },
    {
      ManagerReview: makeStep({
        assigneeMode:        'requester_manager',
        assignedSubject:     'Giải trình chấm công cần xem xét: {{process.name}}',
        extraAssignedBody:   '<p style="color:#0891B2;font-size:13px">📋 Nhân viên đã gửi giải trình chấm công, vui lòng xem xét.</p>',
        completedRecipients: ['requester'],
      }),
    },
  );

  // 11. Duyệt quyết định nhân sự — HR Leader → Director
  const HR_DECISION_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="hr-decision-approval" isExecutable="true">
    <startEvent id="Start_1" name="HR tạo quyết định" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="HRReview" />
    <userTask id="HRReview" name="Trưởng HR xem xét" />
    <sequenceFlow id="Flow_2" sourceRef="HRReview" targetRef="DirectorApprove" />
    <userTask id="DirectorApprove" name="Ban Giám đốc phê duyệt" />
    <sequenceFlow id="Flow_3" sourceRef="DirectorApprove" targetRef="End_1" />
    <endEvent id="End_1" name="Hoàn thành" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="hr-decision-approval">
      <bpmndi:BPMNShape id="Start_1_di" bpmnElement="Start_1">
        <dc:Bounds x="152" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="138" y="125" width="65" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="HRReview_di" bpmnElement="HRReview">
        <dc:Bounds x="280" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="DirectorApprove_di" bpmnElement="DirectorApprove">
        <dc:Bounds x="450" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_1_di" bpmnElement="End_1">
        <dc:Bounds x="632" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="620" y="125" width="62" height="14" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="100" /><di:waypoint x="280" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="380" y="100" /><di:waypoint x="450" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="550" y="100" /><di:waypoint x="632" y="100" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

  await upsertProcess(
    client,
    'hr-decision-approval',
    'Duyệt quyết định nhân sự',
    HR_DECISION_BPMN,
    orgUnitId,
    [
      { name: 'type',          label: 'Loại quyết định', type: 'text', required: true  },
      { name: 'employeeId',    label: 'Nhân viên',       type: 'text', required: true  },
      { name: 'effectiveDate', label: 'Ngày hiệu lực',   type: 'date', required: true  },
    ],
    {
      HRReview: [
        { name: 'decision', label: 'Quyết định HR', type: 'select', required: true, options: [
          { label: 'Chuyển BGĐ duyệt', value: 'APPROVED' }, { label: 'Trả lại', value: 'REJECTED' },
        ]},
        { name: 'hrNote',         label: 'Nhận xét HR',   type: 'textarea', required: false },
        { name: 'rejectedReason', label: 'Lý do trả lại', type: 'textarea', required: false },
      ],
      DirectorApprove: [
        { name: 'decision', label: 'Phê duyệt BGĐ', type: 'select', required: true, options: [
          { label: 'Phê duyệt', value: 'APPROVED' }, { label: 'Từ chối', value: 'REJECTED' },
        ]},
        { name: 'rejectedReason', label: 'Lý do từ chối', type: 'textarea', required: false },
        { name: 'directorNote',   label: 'Ý kiến BGĐ',   type: 'textarea', required: false },
      ],
    },
    {
      HRReview: makeStep({
        assigneeMode:        'orgunit',
        assigneeOrgUnitId:   orgUnitId,
        assigneeRole:        'LEADERSHIP',
        assignedSubject:     'Quyết định nhân sự chờ xem xét: {{process.name}}',
        extraAssignedBody:   '<p style="color:#8B5CF6;font-size:13px">📑 Quyết định nhân sự mới cần được xem xét trước khi trình BGĐ.</p>',
        completedRecipients: ['requester'],
      }),
      DirectorApprove: makeStep({
        assigneeMode:        'orgunit',
        assigneeOrgUnitId:   orgUnitId,
        assigneeRole:        'LEADERSHIP',
        assignedSubject:     'Quyết định nhân sự chờ phê duyệt BGĐ: {{process.name}}',
        completedRecipients: ['requester', 'requester_manager'],
      }),
    },
  );

  // ── 12. Onboarding nhân viên mới ────────────────────────────────────────────
  const ONBOARDING_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <process id="employee-onboarding-v1" isExecutable="true">
    <startEvent id="Start_1" name="Nhân viên gia nhập" />
    <sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="HRDocuments" />
    <userTask id="HRDocuments" name="HR hoàn thiện hồ sơ" />
    <sequenceFlow id="Flow_2" sourceRef="HRDocuments" targetRef="ITSetup" />
    <userTask id="ITSetup" name="IT cấp tài khoản và thiết bị" />
    <sequenceFlow id="Flow_3" sourceRef="ITSetup" targetRef="ManagerHandover" />
    <userTask id="ManagerHandover" name="Quản lý bàn giao công việc" />
    <sequenceFlow id="Flow_4" sourceRef="ManagerHandover" targetRef="End_1" />
    <endEvent id="End_1" name="Onboarding hoàn tất" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="employee-onboarding-v1">
      <bpmndi:BPMNShape id="Start_1_di" bpmnElement="Start_1">
        <dc:Bounds x="152" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="132" y="125" width="78" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="HRDocuments_di" bpmnElement="HRDocuments">
        <dc:Bounds x="280" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ITSetup_di" bpmnElement="ITSetup">
        <dc:Bounds x="450" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ManagerHandover_di" bpmnElement="ManagerHandover">
        <dc:Bounds x="620" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_1_di" bpmnElement="End_1">
        <dc:Bounds x="792" y="82" width="36" height="36" />
        <bpmndi:BPMNLabel><dc:Bounds x="768" y="125" width="86" height="27" /></bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="100" /><di:waypoint x="280" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="380" y="100" /><di:waypoint x="450" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="550" y="100" /><di:waypoint x="620" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4">
        <di:waypoint x="720" y="100" /><di:waypoint x="792" y="100" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`;

  await upsertProcess(
    client,
    'employee-onboarding-v1',
    'Onboarding nhân viên mới',
    ONBOARDING_BPMN,
    orgUnitId,
    [
      { name: 'employeeId',   label: 'Mã nhân viên',   type: 'text', required: true  },
      { name: 'employeeName', label: 'Họ và tên',       type: 'text', required: true  },
      { name: 'startDate',    label: 'Ngày bắt đầu',    type: 'date', required: true  },
      { name: 'orgUnitId',    label: 'Phòng ban',       type: 'text', required: false },
    ],
    {
      HRDocuments: [
        { name: 'contractSigned',   label: 'Hợp đồng đã ký',            type: 'checkbox', required: true  },
        { name: 'bhxhRegistered',   label: 'Đã đăng ký BHXH/BHYT',      type: 'checkbox', required: true  },
        { name: 'bankAccountInfo',  label: 'Thông tin tài khoản ngân hàng', type: 'text',  required: false },
        { name: 'hrNote',           label: 'Ghi chú HR',                 type: 'textarea', required: false },
      ],
      ITSetup: [
        { name: 'accountCreated', label: 'Tài khoản email/hệ thống đã tạo', type: 'select', required: true, options: [
          { label: 'Đã tạo đầy đủ', value: 'DONE' }, { label: 'Chưa hoàn tất', value: 'PARTIAL' },
        ]},
        { name: 'deviceAssigned', label: 'Thiết bị đã cấp phát', type: 'select', required: true, options: [
          { label: 'Đã cấp laptop + phụ kiện', value: 'DONE' }, { label: 'Chưa có thiết bị', value: 'PENDING' },
        ]},
        { name: 'assetCodes', label: 'Mã tài sản đã cấp (nếu có)', type: 'text',     required: false },
        { name: 'itNote',     label: 'Ghi chú IT',                  type: 'textarea', required: false },
      ],
      ManagerHandover: [
        { name: 'workHandover',    label: 'Đã bàn giao công việc và quy trình', type: 'checkbox', required: true },
        { name: 'teamIntroduced',  label: 'Đã giới thiệu với team',             type: 'checkbox', required: true },
        { name: 'managerNote',     label: 'Nhận xét ban đầu của quản lý',       type: 'textarea', required: false },
      ],
    },
    {
      HRDocuments: makeStep({
        assigneeMode:        'orgunit',
        assigneeOrgUnitId:   orgUnitId,
        assigneeRole:        'HR',
        assignedSubject:     'Nhân viên mới {{process.variables.employeeName}} — HR hoàn thiện hồ sơ',
        extraAssignedBody:   '<p style="color:#8B5CF6;font-size:13px">👤 Nhân viên mới vừa được tuyển dụng. Vui lòng hoàn thiện hợp đồng, đăng ký BHXH và thu thập thông tin tài khoản ngân hàng.</p>',
        completedRecipients: ['requester'],
      }),
      ITSetup: makeStep({
        assigneeMode:        'orgunit',
        assigneeOrgUnitId:   orgUnitId,
        assigneeRole:        'IT',
        assignedSubject:     'Nhân viên mới {{process.variables.employeeName}} — IT cấp tài khoản & thiết bị',
        extraAssignedBody:   '<p style="color:#3B82F6;font-size:13px">💻 HR đã hoàn thiện hồ sơ. Vui lòng tạo tài khoản hệ thống và cấp phát thiết bị cho nhân viên mới.</p>',
        completedRecipients: ['requester'],
      }),
      ManagerHandover: makeStep({
        assigneeMode:        'variable',
        assigneeVariablePath: 'orgUnitId',
        assignedSubject:     'Nhân viên mới {{process.variables.employeeName}} — Bàn giao công việc',
        extraAssignedBody:   '<p style="color:#10B981;font-size:13px">✅ IT đã cấp phát tài khoản và thiết bị. Vui lòng bàn giao công việc và giới thiệu nhân viên mới với team.</p>',
        completedRecipients: ['requester'],
      }),
    },
  );

  console.log('\n✅ Seeded 12 BPM ProcessDefinitions v5 (DI diagram + stepConfig + notificationConfig) thành công');
  await client.end();
}

main().catch((err) => {
  console.error('❌ Lỗi seed:', err);
  process.exit(1);
});
