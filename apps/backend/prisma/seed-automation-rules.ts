import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

interface RuleSeed {
  key: string;
  name: string;
  description: string;
  triggerType: string;
  cronExpr: string | null;
  entityType?: string;
  actions: { type: string }[];
  isActive: boolean;
}

const RULES: RuleSeed[] = [
  {
    key: 'contract-expiry-notify',
    name: 'Thông báo hợp đồng sắp hết hạn',
    description: 'Gửi thông báo cho HR khi có hợp đồng sắp hết hạn trong 30 ngày tới, chạy mỗi ngày lúc 8h.',
    triggerType: 'SCHEDULE',
    cronExpr: '0 8 * * *',
    actions: [{ type: 'SEND_NOTIFICATION' }],
    isActive: true,
  },
  {
    key: 'expense-approved-budget-update',
    name: 'Cập nhật ngân sách khi chi phí được duyệt',
    description: 'Tự động cập nhật số dư ngân sách khi một khoản chi phí được phê duyệt.',
    triggerType: 'RECORD_STATUS_CHANGE',
    entityType: 'EXPENSE',
    cronExpr: null,
    actions: [{ type: 'UPDATE_BUDGET' }],
    isActive: true,
  },
  {
    key: 'invoice-overdue-alert',
    name: 'Cảnh báo hóa đơn quá hạn',
    description: 'Gửi cảnh báo mỗi ngày lúc 9h cho các hóa đơn đã quá hạn thanh toán.',
    triggerType: 'SCHEDULE',
    cronExpr: '0 9 * * *',
    actions: [{ type: 'SEND_ALERT' }],
    isActive: true,
  },
  {
    key: 'ot-approved-payroll-flag',
    name: 'Đánh dấu bảng lương khi OT được duyệt',
    description: 'Tự động đánh dấu bản ghi bảng lương cần tính lại khi đơn OT được phê duyệt.',
    triggerType: 'RECORD_STATUS_CHANGE',
    entityType: 'OVERTIME_REQUEST',
    cronExpr: null,
    actions: [{ type: 'FLAG_PAYROLL' }],
    isActive: true,
  },
];

async function main() {
  console.log('Seeding automation rules...');

  for (const rule of RULES) {
    await prisma.automationRule.upsert({
      where: { key: rule.key },
      update: {
        name: rule.name,
        description: rule.description,
        triggerType: rule.triggerType,
        entityType: rule.entityType ?? null,
        // cronExpr required trong schema → dùng '0 0 * * *' cho event-driven rules
        cronExpr: rule.cronExpr ?? '0 0 * * *',
        actions: rule.actions as any,
        isActive: rule.isActive,
      },
      create: {
        key: rule.key,
        name: rule.name,
        description: rule.description,
        triggerType: rule.triggerType,
        entityType: rule.entityType ?? null,
        cronExpr: rule.cronExpr ?? '0 0 * * *',
        actions: rule.actions as any,
        isActive: rule.isActive,
      },
    });
    console.log(`  ✓ ${rule.key}`);
  }

  console.log('Seed automation rules hoàn tất!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
