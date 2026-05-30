/**
 * Seed demo AppChangelog entries cho E25.5 In-app Changelog.
 * Chạy: npx ts-node prisma/seed-changelog.ts
 */
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const ENTRIES = [
  {
    version: '5.1.0',
    title: 'Nâng cấp HR & Utilities tháng 6/2026',
    publishedAt: new Date('2026-06-01'),
    items: [
      'Thêm trang "Công việc của tôi" — Dashboard cá nhân với check-in/check-out',
      'Bộ lọc đã lưu — Lưu và tái sử dụng bộ lọc trên các trang danh sách',
      '@mention trong bình luận — Nhắc đồng nghiệp trong comment, tự động gửi thông báo',
      'Changelog in-app — Tự động thông báo tính năng mới sau khi cập nhật',
      'Cải thiện hiệu suất trang tải danh sách lớn',
    ],
  },
  {
    version: '5.0.0',
    title: 'Loop v5.0 — Foundation & Payroll E16',
    publishedAt: new Date('2026-05-15'),
    items: [
      'Module Payroll E16 — Tính lương tự động, BullMQ queue',
      'Budget E17 — Quản lý ngân sách theo phòng ban',
      'Contract Lifecycle E18 — Vòng đời hợp đồng tự động',
      'Performance E19 — Đánh giá KPI và xét duyệt tăng lương',
      'Nâng cấp kiến trúc multi-tenant toàn phần',
    ],
  },
  {
    version: '4.3.0',
    title: 'Multi-tenant + TenantAware batch 2',
    publishedAt: new Date('2026-04-20'),
    items: [
      'TenantAware cho Alerts, Calendar, Feed, Notifications',
      'Room booking và Vehicle booking đã hỗ trợ tenant scope',
      'ProcessEventBus + FinanceEventBus → BullMQ',
      'Pagination safety caps cho tất cả list API',
      'Dark mode — Cải thiện contrast và readability',
    ],
  },
];

async function main() {
  console.log('🌱 Seeding AppChangelog...');

  for (const entry of ENTRIES) {
    const existing = await prisma.appChangelog.findFirst({
      where: { version: entry.version },
    });
    if (existing) {
      console.log(`  ⏭️  v${entry.version} đã tồn tại`);
      continue;
    }
    await prisma.appChangelog.create({
      data: {
        version: entry.version,
        title: entry.title,
        items: entry.items,
        publishedAt: entry.publishedAt,
      },
    });
    console.log(`  ✅ Tạo changelog v${entry.version}`);
  }

  console.log('✅ Seed changelog hoàn tất');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
