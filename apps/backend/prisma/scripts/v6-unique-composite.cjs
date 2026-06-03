/* eslint-disable */
// v6: đổi unique sang composite (tenantId, ...) cho 19 model. Idempotent.
// ChartOfAccount.code: bỏ @unique + @@unique([tenantId,code]); JournalLine relation
// chuyển sang composite (tenantId, accountCode)->(tenantId, code) (xử lý riêng).
const fs = require('fs');
const path = require('path');
const SCHEMA = path.join(__dirname, '..', 'schema.prisma');

const FIELD_UNIQUE = {
  Skill: 'name', JobTitle: 'code', WorkShift: 'code', LeaveType: 'name',
  HolidayCalendar: 'date', AllowanceType: 'name', BonusType: 'name',
  ChartOfAccount: 'code', Vehicle: 'plateNumber', AutomationRule: 'key',
  ModuleConfig: 'moduleId', Position: 'code', HrDecision: 'decisionNumber',
  SocialInsuranceBook: 'bookNumber', UserGroup: 'name',
};
const BLOCK_UNIQUE = {
  PerformanceReview: ['employeeId', 'period'],
  RevenueTarget: ['period', 'periodType'],
  ProjectCostSnapshot: ['projectId', 'snapshotDate'],
};
const ADD_TENANT_UNIQUE = ['TelegramConfig'];

let lines = fs.readFileSync(SCHEMA, 'utf8').split('\n');
const out = [];
const rep = { field: [], block: [], add: [], journalRel: false };
let i = 0;
while (i < lines.length) {
  const m = lines[i].match(/^model\s+(\w+)\s*\{/);
  if (!m) { out.push(lines[i]); i++; continue; }
  const model = m[1];
  const blk = [lines[i]];
  let j = i + 1;
  while (j < lines.length && !/^\}/.test(lines[j])) { blk.push(lines[j]); j++; }
  const closing = lines[j];

  // JournalLine: đổi relation account sang composite
  if (model === 'JournalLine') {
    for (let k = 0; k < blk.length; k++) {
      if (/account\s+ChartOfAccount\s+@relation\(fields:\s*\[accountCode\],\s*references:\s*\[code\]\)/.test(blk[k])) {
        blk[k] = blk[k].replace(
          /@relation\(fields:\s*\[accountCode\],\s*references:\s*\[code\]\)/,
          '@relation(fields: [tenantId, accountCode], references: [tenantId, code])',
        );
        rep.journalRel = true;
      }
    }
  }

  if (FIELD_UNIQUE[model]) {
    const f = FIELD_UNIQUE[model];
    let removed = false;
    for (let k = 0; k < blk.length; k++) {
      const re = new RegExp(`^(\\s*${f}\\s+\\S.*?)\\s+@unique\\b(.*)$`);
      if (re.test(blk[k])) { blk[k] = blk[k].replace(/\s+@unique\b/, ''); removed = true; break; }
    }
    if (!blk.some((l) => new RegExp(`@@unique\\(\\[tenantId,\\s*${f}\\]`).test(l))) {
      blk.push(`  @@unique([tenantId, ${f}])`);
    }
    rep.field.push(`${model}.${f}${removed ? '' : '(NOFIELD!)'}`);
  }
  if (BLOCK_UNIQUE[model]) {
    const flds = BLOCK_UNIQUE[model];
    const oldRe = new RegExp(`@@unique\\(\\[\\s*${flds.join('\\s*,\\s*')}\\s*\\]([^)]*)\\)`);
    let done = false;
    for (let k = 0; k < blk.length; k++) {
      if (oldRe.test(blk[k]) && !/\[tenantId/.test(blk[k])) {
        blk[k] = blk[k].replace(oldRe, `@@unique([tenantId, ${flds.join(', ')}]$1)`); done = true; break;
      }
    }
    rep.block.push(`${model}${done ? '' : '(NOBLOCK!)'}`);
  }
  if (ADD_TENANT_UNIQUE.includes(model) && !blk.some((l) => /@@unique\(\[tenantId\]\)/.test(l))) {
    blk.push('  @@unique([tenantId])');
    rep.add.push(model);
  }

  out.push(...blk, closing);
  i = j + 1;
}
fs.writeFileSync(SCHEMA, out.join('\n'));
console.log('field:', rep.field.length, rep.field.join(', '));
console.log('block:', rep.block.join(', '));
console.log('add:', rep.add.join(', '));
console.log('JournalLine composite relation:', rep.journalRel);
