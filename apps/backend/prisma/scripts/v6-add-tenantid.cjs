/* eslint-disable */
// Đợt 1 v6: thêm `tenantId String? @map("tenant_id")` + `@@index([tenantId])`
// cho 93 model (DOMAIN+CHILD). Idempotent. KHÔNG đụng model đã có tenantId.
// Xuất map model->table (qua @@map) để sinh raw SQL ALTER.
const fs = require('fs');
const path = require('path');

const SCHEMA = path.join(__dirname, '..', 'schema.prisma');

const TARGETS = [
  // DOMAIN (39)
  'Skill','JobTitle','TimeLog','WorkStatus','TimesheetRecord','AttendanceRecord','MonthlyAttendance',
  'WorkShift','WorkSchedule','LeaveType','LeavePolicy','HolidayCalendar','OvertimeRequest','SalaryBand',
  'AllowanceType','BonusType','PerformanceReview','TrainingProgram','Expense','ChartOfAccount','JournalEntry',
  'BudgetPlan','KpiMetric','RevenueTarget','KbCategory','Vehicle','MeetingRoom','CalendarEvent','FeedPost',
  'UserGroup','AuditLog','Notification','TelegramConfig','TelegramMessage','AlertConfig','AutomationRule',
  'ScheduledReport','WebhookEndpoint','ModuleConfig',
  // CHILD (54)
  'EmployeeSkill','EmployeeRate','Position','PositionHistory','HrDecision','WorkHistory','SalaryRecord',
  'EmployeeTaxProfile','Dependent','EmployeeYearlyTaxSummary','InsuranceEnrollment','SocialInsuranceBook',
  'InsuranceEvent','ShiftAssignment','WorkSchedulePhase','WorkScheduleEnrollment','SalaryReviewSuggestion',
  'EmployeeBonus','EmployeeAllowance','ContractAllowance','ContractMilestone','TrainingRecord','ExpenseItem',
  'JournalLine','InvoiceItem','PurchaseOrderItem','BudgetLine','BudgetTransaction','OkrKeyResult','KpiRecord',
  'CustomerTicket','AssetAssignment','AssetMaintenance','VehicleRequest','RoomBooking','ProjectCostSnapshot',
  'ProjectCostByEmployee','BugTask','BugAttachment','BugComment','BugTag','ProcessUserTask','ProcessActivityLog',
  'FeedReaction','UserPermission','UserModuleRole','GroupPermission','GroupMembership','GroupOrgAccess',
  'NotificationPreference','PushToken','AutomationRuleLog','WebhookLog','SavedFilterPreset',
];

let src = fs.readFileSync(SCHEMA, 'utf8');
const lines = src.split('\n');

const out = [];
const map = {};        // model -> table
const touched = [];
const skipped = [];
const notFound = new Set(TARGETS);

let i = 0;
while (i < lines.length) {
  const line = lines[i];
  const m = line.match(/^model\s+(\w+)\s*\{/);
  if (!m || !TARGETS.includes(m[1])) { out.push(line); i++; continue; }

  const model = m[1];
  notFound.delete(model);
  // gom block tới dấu '}' đầu dòng
  const block = [line];
  let j = i + 1;
  while (j < lines.length && !/^\}/.test(lines[j])) { block.push(lines[j]); j++; }
  const closing = lines[j]; // '}'

  const blockText = block.join('\n');
  const hasTenant = /^\s*tenantId\s+/m.test(blockText);
  // table name từ @@map
  const mapMatch = blockText.match(/@@map\("([^"]+)"\)/);
  const table = mapMatch ? mapMatch[1] : model;
  map[model] = table;

  if (hasTenant) {
    skipped.push(model);
    out.push(...block, closing);
    i = j + 1;
    continue;
  }

  // chèn field tenantId sau dòng có @id (dòng đầu phù hợp)
  const newBlock = [];
  let inserted = false;
  for (const bl of block) {
    newBlock.push(bl);
    if (!inserted && /@id\b/.test(bl)) {
      newBlock.push('  tenantId  String?  @map("tenant_id")');
      inserted = true;
    }
  }
  if (!inserted) {
    // fallback: chèn ngay sau dòng model {
    newBlock.splice(1, 0, '  tenantId  String?  @map("tenant_id")');
  }
  // thêm @@index([tenantId]) trước closing (nếu chưa có)
  if (!/@@index\(\[tenantId\]\)/.test(blockText)) {
    newBlock.push('  @@index([tenantId])');
  }
  out.push(...newBlock, closing);
  touched.push(model);
  i = j + 1;
}

const result = out.join('\n');
fs.writeFileSync(SCHEMA, result, 'utf8');

console.log('TOUCHED (' + touched.length + '):', touched.join(', '));
console.log('SKIPPED already-has-tenantId (' + skipped.length + '):', skipped.join(', '));
console.log('NOT FOUND (' + notFound.size + '):', [...notFound].join(', '));
// xuất map cho bước SQL
fs.writeFileSync(path.join(__dirname, 'v6-model-table-map.json'), JSON.stringify(map, null, 2));
console.log('MAP written:', Object.keys(map).length, 'models');
