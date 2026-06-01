import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../src/generated/prisma';
import dayjs from 'dayjs';

const Decimal = Prisma.Decimal;
const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const BUDGET_CATEGORIES = ['Nhân sự', 'Marketing', 'Hạ tầng & Cloud', 'Thiết bị', 'Đào tạo', 'Vận hành', 'Khác'];

async function main() {
  console.log('🌱 Seed Finance + Workspace...\n');

  const orgUnits = await prisma.orgUnit.findMany({ select: { id: true } });
  const projects = await prisma.project.findMany({ select: { id: true, name: true } });
  const users = await prisma.user.findMany({ select: { id: true }, take: 100 });
  const bugs = await prisma.bug.findMany({ select: { id: true } });
  const tasks = await prisma.task.findMany({ select: { id: true }, take: 500 });
  const kbCats = await prisma.kbCategory.findMany({ select: { id: true } });
  const accounts = await prisma.chartOfAccount.findMany({ select: { id: true } });
  if (users.length === 0) { console.log('❌ Cần users.'); return; }

  // ── 1. BUDGET PLANS + LINES + TRANSACTIONS ─────────────────────────────────
  console.log('💵 Kế hoạch ngân sách...');
  if (await prisma.budgetPlan.count() > 0) console.log('   ⏭  Đã có, bỏ qua.');
  else {
    let lineCount = 0, txCount = 0;
    for (let i = 0; i < 20; i++) {
      const type = pick(['DEPARTMENT', 'PROJECT', 'COMPANY']) as Prisma.BudgetPlanCreateInput['type'];
      const numLines = rand(3, 5);
      const lines = Array.from({ length: numLines }, () => ({
        category: pick(BUDGET_CATEGORIES),
        allocated: rand(50, 500) * 1_000_000,
      }));
      const total = lines.reduce((s, l) => s + l.allocated, 0);
      const status = pick(['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'ACTIVE', 'CLOSED']) as Prisma.BudgetPlanCreateInput['status'];
      const plan = await prisma.budgetPlan.create({
        data: {
          name: `Ngân sách ${type === 'PROJECT' ? 'dự án' : type === 'COMPANY' ? 'công ty' : 'phòng ban'} 2026 #${i + 1}`,
          fiscalYear: 2026, type, status,
          orgUnitId: type !== 'PROJECT' && orgUnits.length ? pick(orgUnits).id : null,
          projectId: type === 'PROJECT' && projects.length ? pick(projects).id : null,
          totalAmount: new Decimal(total),
          createdById: pick(users).id,
          approvedById: status === 'ACTIVE' || status === 'CLOSED' ? pick(users).id : null,
          approvedAt: status === 'ACTIVE' || status === 'CLOSED' ? dayjs().subtract(rand(10, 100), 'days').toDate() : null,
          lines: {
            create: lines.map((l) => {
              const used = Math.round(l.allocated * (rand(0, 90) / 100));
              return {
                category: l.category,
                allocatedAmount: new Decimal(l.allocated),
                usedAmount: new Decimal(used),
                committedAmount: new Decimal(Math.round(used * 0.2)),
              };
            }),
          },
        },
        include: { lines: true },
      });
      lineCount += plan.lines.length;
      // transactions cho mỗi line
      const txs: Prisma.BudgetTransactionCreateManyInput[] = [];
      for (const ln of plan.lines) {
        const n = rand(0, 3);
        for (let t = 0; t < n; t++) {
          txs.push({
            lineId: ln.id, sourceType: pick(['EXPENSE', 'PO', 'MANUAL']), sourceId: `SRC-${rand(1000, 9999)}`,
            amount: new Decimal(rand(5, 50) * 1_000_000),
            type: pick(['ACTUAL', 'ACTUAL', 'COMMITTED']) as Prisma.BudgetTransactionCreateManyInput['type'],
            note: 'Phát sinh chi tiêu',
          });
        }
      }
      if (txs.length) { const r = await prisma.budgetTransaction.createMany({ data: txs }); txCount += r.count; }
    }
    console.log(`   ✓ 20 kế hoạch, ${lineCount} dòng, ${txCount} giao dịch`);
  }

  // ── 2. PROJECT JOURNALS (nhật ký dự án) ────────────────────────────────────
  console.log('📓 Nhật ký dự án...');
  if (await prisma.projectJournal.count() > 0) console.log('   ⏭  Đã có, bỏ qua.');
  else {
    const rows: Prisma.ProjectJournalCreateManyInput[] = [];
    for (const pr of projects.slice(0, 50)) {
      const n = rand(1, 3);
      for (let i = 0; i < n; i++) {
        rows.push({
          projectId: pr.id, date: dayjs().subtract(rand(1, 90), 'days').toDate(),
          title: pick(['Họp giao ban tuần', 'Review sprint', 'Họp với khách hàng', 'Daily standup tổng kết']),
          location: pick(['Phòng họp A', 'Online - Google Meet', 'Phòng họp B']),
          participants: ['PM', 'Tech Lead', 'QA'] as Prisma.InputJsonValue,
          content: 'Thảo luận tiến độ, rủi ro và kế hoạch tuần tới.',
          resolvedItems: ['Chốt scope sprint', 'Phân công task'] as Prisma.InputJsonValue,
          unresolvedItems: ['Chờ phản hồi khách hàng về yêu cầu mới'] as Prisma.InputJsonValue,
          createdById: pick(users).id,
        });
      }
    }
    const r = await prisma.projectJournal.createMany({ data: rows });
    console.log(`   ✓ ${r.count} nhật ký dự án`);
  }

  // ── 3. INVOICE ACCOUNT MAPPINGS ────────────────────────────────────────────
  console.log('🧾 Ánh xạ tài khoản hóa đơn...');
  if (accounts.length < 3) console.log('   ⚠ Thiếu chart of accounts.');
  else {
    const rows: Prisma.InvoiceAccountMappingCreateManyInput[] = ['SALES', 'PURCHASE', 'SERVICE'].map((t, i) => ({
      invoiceType: t,
      debitAccountId: accounts[i % accounts.length].id,
      creditAccountId: accounts[(i + 1) % accounts.length].id,
      vatAccountId: accounts[(i + 2) % accounts.length].id,
    }));
    const r = await prisma.invoiceAccountMapping.createMany({ data: rows, skipDuplicates: true });
    console.log(`   ✓ ${r.count} ánh xạ tài khoản`);
  }

  // ── 4. KB ARTICLES (kho tri thức) ──────────────────────────────────────────
  console.log('📚 Bài viết tri thức...');
  if (kbCats.length === 0) console.log('   ⚠ Thiếu KB category.');
  else if (await prisma.kbArticle.count() > 0) console.log('   ⏭  Đã có, bỏ qua.');
  else {
    const titles = [
      'Hướng dẫn onboarding nhân viên mới', 'Quy trình xin nghỉ phép', 'Chính sách làm thêm giờ',
      'Hướng dẫn sử dụng Loop ERP', 'Quy định bảo mật thông tin', 'Quy trình duyệt chi phí',
      'Hướng dẫn chấm công', 'Chính sách phúc lợi', 'Quy trình quản lý tài sản',
      'Coding convention nội bộ', 'Hướng dẫn Git workflow', 'Quy trình release sản phẩm',
      'FAQ - Câu hỏi thường gặp', 'Hướng dẫn đặt phòng họp', 'Quy định sử dụng xe công',
      'Lộ trình phát triển nghề nghiệp', 'Hướng dẫn đánh giá hiệu suất', 'Chính sách đào tạo',
      'Quy trình tuyển dụng', 'Hướng dẫn bảo hiểm xã hội',
    ];
    const rows: Prisma.KbArticleCreateManyInput[] = titles.map((t, i) => {
      const status = pick(['DRAFT', 'PUBLISHED', 'PUBLISHED', 'PUBLISHED', 'ARCHIVED']) as Prisma.KbArticleCreateManyInput['status'];
      return {
        title: t,
        slug: `${t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${i + 1}`,
        content: `# ${t}\n\nNội dung chi tiết hướng dẫn về "${t}". Áp dụng cho toàn bộ nhân viên Loop.vn.`,
        summary: `Tóm tắt: ${t}.`,
        categoryId: pick(kbCats).id,
        authorId: pick(users).id,
        status,
        tags: pick([['HR'], ['Kỹ thuật'], ['Quy trình'], ['Hướng dẫn']]),
        viewCount: rand(0, 500),
        isPinned: Math.random() > 0.85,
        publishedAt: status === 'PUBLISHED' ? dayjs().subtract(rand(1, 200), 'days').toDate() : null,
      };
    });
    const r = await prisma.kbArticle.createMany({ data: rows, skipDuplicates: true });
    console.log(`   ✓ ${r.count} bài viết tri thức`);
  }

  // ── 5. BUG COMMENTS ────────────────────────────────────────────────────────
  console.log('💬 Bình luận bug...');
  if (bugs.length === 0) console.log('   ⚠ Chưa có bug.');
  else if (await prisma.bugComment.count() > 0) console.log('   ⏭  Đã có, bỏ qua.');
  else {
    const texts = ['Đã tái hiện được lỗi.', 'Đang xử lý.', 'Cần thêm thông tin từ QA.', 'Đã fix, chờ verify.', 'Liên quan module thanh toán.'];
    const rows: Prisma.BugCommentCreateManyInput[] = [];
    for (const b of bugs) {
      const n = rand(1, 4);
      for (let i = 0; i < n; i++) rows.push({ bugId: b.id, authorId: pick(users).id, content: pick(texts) });
    }
    const r = await prisma.bugComment.createMany({ data: rows });
    console.log(`   ✓ ${r.count} bình luận bug`);
  }

  // ── 6. BUG ↔ TASK LINKS ────────────────────────────────────────────────────
  console.log('🔗 Liên kết bug ↔ task...');
  if (bugs.length === 0 || tasks.length === 0) console.log('   ⚠ Thiếu bug/task.');
  else if (await prisma.bugTask.count() > 0) console.log('   ⏭  Đã có, bỏ qua.');
  else {
    const seen = new Set<string>();
    const rows: Prisma.BugTaskCreateManyInput[] = [];
    for (let i = 0; i < 40; i++) {
      const b = pick(bugs).id, t = pick(tasks).id;
      const key = `${b}:${t}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ bugId: b, taskId: t });
    }
    const r = await prisma.bugTask.createMany({ data: rows, skipDuplicates: true });
    console.log(`   ✓ ${r.count} liên kết bug-task`);
  }

  // ── 7. COMMENTS (CommentThread đa thực thể) ────────────────────────────────
  console.log('🗨️  Bình luận đa thực thể...');
  if (await prisma.comment.count() > 0) console.log('   ⏭  Đã có, bỏ qua.');
  else {
    const texts = ['Đồng ý phương án này.', 'Cần review lại estimate.', 'Đã cập nhật tiến độ.', 'Tốt, tiếp tục triển khai.', 'Lưu ý deadline cuối tháng.'];
    const rows: Prisma.CommentCreateManyInput[] = [];
    for (const t of tasks.slice(0, 150)) {
      if (Math.random() > 0.5) continue;
      const n = rand(1, 3);
      for (let i = 0; i < n; i++) rows.push({ entityType: 'TASK', entityId: t.id, authorId: pick(users).id, content: pick(texts) });
    }
    for (const pr of projects.slice(0, 50)) {
      rows.push({ entityType: 'PROJECT', entityId: pr.id, authorId: pick(users).id, content: pick(texts) });
    }
    const r = await prisma.comment.createMany({ data: rows });
    console.log(`   ✓ ${r.count} bình luận`);
  }

  console.log('\n✅ Hoàn tất seed Finance + Workspace!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
