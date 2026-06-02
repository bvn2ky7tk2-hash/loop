/* eslint-disable */
// Test cách ly tenant cho Prisma tenant-extension. Chạy: npx tsx src/common/prisma/__v6_isolation_test.ts
process.env.TENANT_ENFORCEMENT = 'true';
process.env.DEPLOYMENT_MODE = 'saas';

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma';
import { tenantExtension } from '../../src/common/prisma/tenant-extension';

const DEFAULT_T = 'loop-default-tenant-001';
const DEMO_T = '71dac385-65f1-43b5-bfc4-dfe2eb468c8a';

let current: string | undefined;
const stubCls: any = {
  isActive: () => true,
  get: () => current,
};

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const base = new PrismaClient({ adapter: new PrismaPg(pool) });
  const db = base.$extends(tenantExtension(stubCls)) as any;

  let pass = 0, fail = 0;
  const check = (name: string, ok: boolean) => {
    console.log((ok ? '✅ PASS' : '❌ FAIL') + ' — ' + name);
    ok ? pass++ : fail++;
  };

  // Tạo 1 skill cho tenant DEMO (set tenantId tường minh khi current=demo → extension cũng tự set, nhưng set rõ để chắc)
  current = DEMO_T;
  const demoSkill = await db.skill.create({ data: { name: '__v6_demo_skill__' } });
  check('create gán đúng tenantId = demo', demoSkill.tenantId === DEMO_T);

  // current = default → KHÔNG được thấy skill của demo
  current = DEFAULT_T;
  const seenFromDefault = await db.skill.findMany({ where: { name: '__v6_demo_skill__' } });
  check('findMany(default) KHÔNG thấy skill của demo', seenFromDefault.length === 0);

  // current = demo → thấy đúng skill demo
  current = DEMO_T;
  const seenFromDemo = await db.skill.findMany({ where: { name: '__v6_demo_skill__' } });
  check('findMany(demo) thấy skill demo', seenFromDemo.length === 1);

  // findUnique cross-tenant: current=default, tìm theo id của demo → null (rewrite findFirst+tenantId)
  current = DEFAULT_T;
  const crossUnique = await db.skill.findUnique({ where: { id: demoSkill.id } });
  check('findUnique(default) theo id demo → null', crossUnique === null);

  // findUnique same-tenant: current=demo → thấy
  current = DEMO_T;
  const sameUnique = await db.skill.findUnique({ where: { id: demoSkill.id } });
  check('findUnique(demo) theo id demo → thấy', !!sameUnique && sameUnique.id === demoSkill.id);

  // count theo tenant
  current = DEFAULT_T;
  const cntDefault = await db.skill.count();
  current = DEMO_T;
  const cntDemo = await db.skill.count();
  check('count tách theo tenant (demo < default)', cntDemo >= 1 && cntDefault >= 1 && cntDemo !== cntDefault);

  // update cross-tenant: current=default cố update skill demo → 0 rows
  current = DEFAULT_T;
  const upd = await db.skill.updateMany({ where: { id: demoSkill.id }, data: { description: 'x' } });
  check('updateMany(default) lên skill demo → 0 rows', upd.count === 0);

  // GLOBAL model (Category) KHÔNG bị lọc — tạo + đọc không phụ thuộc tenant
  current = DEFAULT_T;
  const catCountDefault = await db.category.count();
  current = DEMO_T;
  const catCountDemo = await db.category.count();
  check('Category (GLOBAL) không bị lọc (count bằng nhau)', catCountDefault === catCountDemo);

  // cleanup (dùng base client bỏ qua extension)
  await base.skill.delete({ where: { id: demoSkill.id } });

  console.log(`\nKẾT QUẢ: ${pass} pass, ${fail} fail`);
  await base.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('TEST ERROR:', e); process.exit(2); });
