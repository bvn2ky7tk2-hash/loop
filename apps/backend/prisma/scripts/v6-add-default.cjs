/* eslint-disable */
const fs = require('fs');
const path = require('path');
const SCHEMA = path.join(__dirname, '..', 'schema.prisma');
const MODELS = Object.keys(require('./v6-model-table-map.json'));

let lines = fs.readFileSync(SCHEMA, 'utf8').split('\n');
const out = [];
let i = 0, added = 0;
while (i < lines.length) {
  const m = lines[i].match(/^model\s+(\w+)\s*\{/);
  if (!m || !MODELS.includes(m[1])) { out.push(lines[i]); i++; continue; }
  const blk = [lines[i]];
  let j = i + 1;
  while (j < lines.length && !/^\}/.test(lines[j])) { blk.push(lines[j]); j++; }
  for (let k = 0; k < blk.length; k++) {
    if (/^\s*tenantId\s+String\s+@map\("tenant_id"\)/.test(blk[k]) && !/@default/.test(blk[k])) {
      blk[k] = blk[k].replace(/@map\("tenant_id"\)/, '@default("loop-default-tenant-001") @map("tenant_id")');
      added++;
    }
  }
  out.push(...blk, lines[j]);
  i = j + 1;
}
fs.writeFileSync(SCHEMA, out.join('\n'));
console.log('added @default:', added);
