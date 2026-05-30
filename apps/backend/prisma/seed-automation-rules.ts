/**
 * Seed default AutomationRule records với actions JSON.
 * Dùng upsert theo key — an toàn khi chạy nhiều lần.
 */
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const RULES = [
  {
    key: 'timesheet-reminder',
    name: 'Nhắc nộp Timesheet',
    description: 'Gửi thông báo cho nhân viên chưa nộp timesheet tuần này vào mỗi thứ 6 lúc 17h.',
    cronExpr: '0 17 * * 5',
    triggerType: 'SCHEDULE',
    isActive: true,
    actions: [
      {
        type: 'SEND_NOTIFICATION',
        // userId sẽ được resolve động trong timesheetReminder() — action này chỉ mô tả intent
        title: 'Nhắc nộp timesheet',
        body: 'Bạn chưa nộp timesheet tuần này. Vui lòng nộp trước cuối ngày hôm nay.',
        notificationType: 'REMINDER',
        link: '/timesheet',
      },
    ],
  },
  {
    key: 'contract-expiry',
    name: 'Cảnh báo Hợp đồng hết hạn',
    description: 'Thông báo cho HR khi có hợp đồng sắp hết hạn trong 30 ngày tới.',
    cronExpr: '0 9 * * *',
    triggerType: 'SCHEDULE',
    isActive: true,
    actions: [
      {
        type: 'SEND_NOTIFICATION',
        title: 'Hợp đồng sắp hết hạn',
        body: 'Có hợp đồng nhân viên sẽ hết hạn trong 30 ngày tới. Vui lòng kiểm tra và gia hạn.',
        notificationType: 'ALERT',
        link: '/contracts',
      },
    ],
  },
  {
    key: 'leave-escalation',
    name: 'Đơn nghỉ phép tồn đọng',
    description: 'Nhắc manager xử lý các đơn nghỉ phép đã chờ quá 2 ngày.',
    cronExpr: '0 10 * * *',
    triggerType: 'SCHEDULE',
    isActive: true,
    actions: [
      {
        type: 'SEND_NOTIFICATION',
        title: 'Đơn nghỉ phép tồn đọng',
        body: 'Có đơn nghỉ phép chờ xử lý quá 2 ngày. Vui lòng xử lý sớm.',
        notificationType: 'ALERT',
        link: '/leaves',
      },
    ],
  },
  {
    key: 'okr-checkin-reminder',
    name: 'Nhắc Check-in OKR',
    description: 'Nhắc nhân viên cập nhật tiến độ OKR chưa được cập nhật trong 14 ngày.',
    cronExpr: '0 9 * * 1',
    triggerType: 'SCHEDULE',
    isActive: true,
    actions: [
      {
        type: 'SEND_NOTIFICATION',
        title: 'Nhắc cập nhật OKR',
        body: 'OKR của bạn chưa được cập nhật 14 ngày. Hãy check-in tiến độ ngay hôm nay.',
        notificationType: 'REMINDER',
        link: '/hr/okr',
      },
    ],
  },
];

async function main() {
  console.log('Seeding AutomationRule records...');

  for (const rule of RULES) {
    await prisma.automationRule.upsert({
      where: { key: rule.key },
      update: {
        name: rule.name,
        description: rule.description,
        cronExpr: rule.cronExpr,
        triggerType: rule.triggerType,
        isActive: rule.isActive,
        actions: rule.actions,
      },
      create: {
        key: rule.key,
        name: rule.name,
        description: rule.description,
        cronExpr: rule.cronExpr,
        triggerType: rule.triggerType,
        isActive: rule.isActive,
        actions: rule.actions,
      },
    });
    console.log(`  upserted: ${rule.key}`);
  }

  console.log('Seed automation-rules hoàn tất!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
