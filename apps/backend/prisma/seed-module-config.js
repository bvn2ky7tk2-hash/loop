// Seed script: Module Config defaults
// Run: node prisma/seed-module-config.js
// Or via npm script: npm run seed:module-config

const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

const MODULE_DEFAULTS = [
  { moduleId: 'work',    displayName: 'Công việc',   description: 'Task, Bug, Timesheet cá nhân, BPM Inbox', isCore: true,  isEnabled: true },
  { moduleId: 'people',  displayName: 'Nhân sự',     description: 'Quản lý nhân viên, payroll, nghỉ phép',   isCore: false, isEnabled: true },
  { moduleId: 'finance', displayName: 'Tài chính',   description: 'Chi phí, hóa đơn, kế toán, ngân sách',   isCore: false, isEnabled: true },
  { moduleId: 'crm',     displayName: 'Khách hàng',  description: 'Leads, deals, contacts, pipeline',        isCore: false, isEnabled: true },
  { moduleId: 'asset',   displayName: 'Tài sản',     description: 'Hardware, phần mềm, license',             isCore: false, isEnabled: true },
  { moduleId: 'ops',     displayName: 'Vận hành',    description: 'Hợp đồng, mua hàng, vận hành',           isCore: false, isEnabled: true },
  { moduleId: 'me',      displayName: 'Của tôi',     description: 'Dashboard cá nhân, task của tôi',         isCore: true,  isEnabled: true },
  { moduleId: 'admin',   displayName: 'Quản trị',    description: 'Cấu hình hệ thống, phân quyền, audit',   isCore: true,  isEnabled: true },
];

async function main() {
  console.log('Seeding module configs...');
  for (const mod of MODULE_DEFAULTS) {
    const result = await prisma.moduleConfig.upsert({
      where: { moduleId: mod.moduleId },
      update: {
        displayName: mod.displayName,
        description: mod.description,
        isCore: mod.isCore,
      },
      create: mod,
    });
    console.log(`  ✓ ${result.moduleId} — ${result.displayName} (core=${result.isCore})`);
  }
  console.log('Done!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
