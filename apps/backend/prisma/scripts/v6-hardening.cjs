/* eslint-disable */
// v6 hardening: 93 model tenantId String? -> String (NOT NULL) + FK relation tới Tenant
// + 19 unique-composite (tenantId, ...). Idempotent. Cập nhật cả back-relation trên Tenant.
const fs = require('fs');
const path = require('path');

const SCHEMA = path.join(__dirname, '..', 'schema.prisma');
const MAP = require('./v6-model-table-map.json');
const MODELS = Object.keys(MAP); // 93 model đã thêm tenantId ở Đợt 1

// Unique field-level: field @unique -> @@unique([tenantId, field])
const FIELD_UNIQUE = {}; const _FU_OLD = {
  Skill: 'name', JobTitle: 'code', WorkShift: 'code', LeaveType: 'name',
  HolidayCalendar: 'date', AllowanceType: 'name', BonusType: 'name',
  ChartOfAccount: 'code', Vehicle: 'plateNumber', AutomationRule: 'key',
  ModuleConfig: 'moduleId', Position: 'code', HrDecision: 'decisionNumber',
  SocialInsuranceBook: 'bookNumber',
};
// Block-level @@unique([A,B]) -> @@unique([tenantId, A, B])
const BLOCK_UNIQUE = {}; const _BU_OLD = {
  PerformanceReview: ['employeeId', 'period'],
  RevenueTarget: ['period', 'periodType'],
  UserGroup: ['name'],
  ProjectCostSnapshot: ['projectId', 'snapshotDate'],
};
// Thêm mới @@unique([tenantId])
const ADD_TENANT_UNIQUE = []; const _AU_OLD = ['TelegramConfig'];

let src = fs.readFileSync(SCHEMA, 'utf8');
const lines = src.split('\n');
const out = [];
const report = { notnull: [], fk: [], fieldUnique: [], blockUnique: [], addUnique: [], backrel: 0 };

function camel(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

let i = 0;
while (i < lines.length) {
  const line = lines[i];
  const m = line.match(/^model\s+(\w+)\s*\{/);
  if (!m) { out.push(line); i++; continue; }
  const model = m[1];

  // gom block
  const block = [line];
  let j = i + 1;
  while (j < lines.length && !/^\}/.test(lines[j])) { block.push(lines[j]); j++; }
  const closing = lines[j];

  if (model === 'Tenant') {
    // thêm 93 back-relation trước closing
    const existing = block.join('\n');
    const adds = [];
    for (const mdl of MODELS) {
      const relName = `Tenant${mdl}`;
      if (!existing.includes(`"${relName}"`)) {
        adds.push(`  v6_${camel(mdl)}  ${mdl}[]  @relation("${relName}")`);
        report.backrel++;
      }
    }
    out.push(...block, ...adds, closing);
    i = j + 1;
    continue;
  }

  if (!MODELS.includes(model)) { out.push(...block, closing); i = j + 1; continue; }

  let nb = block.slice();

  // 1) NOT NULL + 2) FK relation: tìm dòng tenantId
  for (let k = 0; k < nb.length; k++) {
    if (/^\s*tenantId\s+String\??\s+@map\("tenant_id"\)/.test(nb[k])) {
      nb[k] = '  tenantId  String  @map("tenant_id")';
      report.notnull.push(model);
      // thêm relation ngay sau (nếu chưa có)
      if (!nb.some((l) => /\btenant\s+Tenant\b/.test(l))) {
        nb.splice(k + 1, 0, `  tenant    Tenant  @relation("Tenant${model}", fields: [tenantId], references: [id], onDelete: Cascade)`);
        report.fk.push(model);
      }
      break;
    }
  }

  // 3a) field-level unique -> composite
  if (FIELD_UNIQUE[model]) {
    const f = FIELD_UNIQUE[model];
    for (let k = 0; k < nb.length; k++) {
      const re = new RegExp(`^(\\s*${f}\\s+\\w+.*?)\\s+@unique(.*)$`);
      if (re.test(nb[k])) {
        nb[k] = nb[k].replace(/\s+@unique/, '');
        report.fieldUnique.push(`${model}.${f}`);
        break;
      }
    }
    nb.push(`  @@unique([tenantId, ${f}])`);
  }

  // 3b) block-level @@unique -> prepend tenantId
  if (BLOCK_UNIQUE[model]) {
    const flds = BLOCK_UNIQUE[model];
    const oldRe = new RegExp(`@@unique\\(\\[${flds.join(',\\s*')}\\]([^)]*)\\)`);
    for (let k = 0; k < nb.length; k++) {
      if (oldRe.test(nb[k])) {
        nb[k] = nb[k].replace(oldRe, `@@unique([tenantId, ${flds.join(', ')}]$1)`);
        report.blockUnique.push(model);
        break;
      }
    }
  }

  // 3c) thêm @@unique([tenantId])
  if (ADD_TENANT_UNIQUE.includes(model) && !nb.some((l) => /@@unique\(\[tenantId\]\)/.test(l))) {
    nb.push('  @@unique([tenantId])');
    report.addUnique.push(model);
  }

  out.push(...nb, closing);
  i = j + 1;
}

fs.writeFileSync(SCHEMA, out.join('\n'), 'utf8');
console.log('NOT NULL:', report.notnull.length);
console.log('FK added:', report.fk.length);
console.log('back-relations on Tenant:', report.backrel);
console.log('field-unique→composite:', report.fieldUnique.length, report.fieldUnique.join(', '));
console.log('block-unique→composite:', report.blockUnique.length, report.blockUnique.join(', '));
console.log('add @@unique([tenantId]):', report.addUnique.join(', '));
const miss = MODELS.filter((m) => !report.notnull.includes(m));
if (miss.length) console.log('⚠️ KHÔNG tìm thấy dòng tenantId ở:', miss.join(', '));
