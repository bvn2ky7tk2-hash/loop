'use strict';
/**
 * seed-kb.js — Seed demo data cho Knowledge Base
 * Chạy: node prisma/seed-kb.js
 */

require('dotenv/config');
const { Client } = require('pg');
const { randomUUID: uid } = require('crypto');

const db = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db',
});

const ADMIN_USER = 'ce54ea7d-26b9-44f3-85d1-c1647548619b';
const HOA_USER   = '60d6c58d-2582-4531-81ef-623fb269e435';
const AN_USER    = 'e3c4b016-1a88-4c65-8b1d-72730d443160';
const TAI_USER   = '094653ee-af94-421a-89eb-67e51961b66d';

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 280);
}

const categories = [
  { id: uid(), name: 'Quy trình nội bộ',   icon: '📋', color: '#6366F1', description: 'Các quy trình, hướng dẫn vận hành nội bộ công ty', sortOrder: 1 },
  { id: uid(), name: 'Kỹ thuật & Dev',      icon: '💻', color: '#3B82F6', description: 'Tài liệu kỹ thuật, coding standards, architecture', sortOrder: 2 },
  { id: uid(), name: 'Nhân sự & Chính sách',icon: '👥', color: '#10B981', description: 'Chính sách HR, phúc lợi, quy định nhân sự', sortOrder: 3 },
  { id: uid(), name: 'Tài chính & Kế toán', icon: '💰', color: '#F59E0B', description: 'Quy trình tài chính, hướng dẫn expense, payroll', sortOrder: 4 },
  { id: uid(), name: 'Khách hàng & Sales',  icon: '🤝', color: '#EF4444', description: 'Pitch deck, case studies, quy trình sales', sortOrder: 5 },
  { id: uid(), name: 'Onboarding',           icon: '🚀', color: '#8B5CF6', description: 'Hướng dẫn cho nhân viên mới', sortOrder: 6 },
];

const catMap = {};

const articles = [
  // ── Quy trình nội bộ ──
  {
    catKey: 'Quy trình nội bộ', authorId: ADMIN_USER, status: 'PUBLISHED', isPinned: true, viewCount: 284,
    title: 'Quy trình phê duyệt chi phí tại Loop360',
    summary: 'Hướng dẫn toàn bộ quy trình submit, review và approve expense từ nhân viên đến CFO.',
    tags: ['expense', 'finance', 'approval'],
    content: `# Quy trình phê duyệt chi phí

## 1. Tổng quan

Mọi chi phí phát sinh cần được phê duyệt trước khi thanh toán (trừ chi phí < 500.000 VNĐ đã có ngân sách được duyệt sẵn).

## 2. Các bước thực hiện

### Bước 1: Nhân viên submit expense
- Vào **Finance > Expenses > New Expense**
- Điền đầy đủ: loại chi phí, số tiền, ngày, dự án liên quan
- Upload hóa đơn/receipt (bắt buộc với chi phí > 1.000.000 VNĐ)
- Nhấn Submit

### Bước 2: Team Lead review
- Team Lead nhận notification qua email + app
- Có 2 ngày làm việc để approve hoặc reject
- Nếu reject: phải ghi rõ lý do

### Bước 3: Finance review (với chi phí > 5.000.000 VNĐ)
- Finance team kiểm tra budget availability
- Verify hóa đơn hợp lệ

### Bước 4: CFO approve (với chi phí > 20.000.000 VNĐ)

## 3. Thanh toán
- Chi phí được duyệt sẽ được thanh toán vào ngày 5 và 20 hàng tháng
- Qua chuyển khoản ngân hàng đăng ký trong hồ sơ nhân viên

## 4. Các lưu ý
- Không submit expense sau 15 ngày kể từ ngày phát sinh
- Chi phí cá nhân (ăn uống, đi lại cá nhân) KHÔNG được thanh toán
- Luôn giữ hóa đơn gốc ít nhất 12 tháng`,
  },
  {
    catKey: 'Quy trình nội bộ', authorId: AN_USER, status: 'PUBLISHED', isPinned: false, viewCount: 156,
    title: 'Quy trình báo cáo Bug và escalate vấn đề',
    summary: 'Hướng dẫn phân loại, ghi nhận và escalate bug từ dev team đến PM và khách hàng.',
    tags: ['bug', 'quy trình', 'dev'],
    content: `# Quy trình xử lý Bug

## Phân loại Severity

| Severity | Định nghĩa | SLA xử lý |
|----------|-----------|-----------|
| Critical | Production down, mất dữ liệu | 4 giờ |
| High | Tính năng core bị lỗi | 1 ngày |
| Medium | Tính năng phụ bị lỗi | 3 ngày |
| Low | Cosmetic, minor UX | Backlog |

## Quy trình

1. **Dev phát hiện bug** → vào Bug Management → New Bug
2. Điền đầy đủ: title, severity, môi trường, steps to reproduce
3. **PM review** trong 4h (Critical) hoặc 1 ngày (High+)
4. PM assign cho dev phù hợp
5. Dev fix → PR → Code review → Deploy to staging
6. QA verify trên staging
7. PM xác nhận đóng bug

## Escalation Path
- Critical bug không xử lý trong 2h → PM phải notify khách hàng
- Critical bug không xử lý trong 4h → CEO được notify tự động`,
  },

  // ── Kỹ thuật & Dev ──
  {
    catKey: 'Kỹ thuật & Dev', authorId: AN_USER, status: 'PUBLISHED', isPinned: true, viewCount: 412,
    title: 'Coding Standards — TypeScript & NestJS tại Loop360',
    summary: 'Quy tắc viết code bắt buộc: naming convention, error handling, API design, security.',
    tags: ['typescript', 'nestjs', 'coding-standards'],
    content: `# Coding Standards — Loop360 Backend

## Naming Conventions

\`\`\`typescript
// ✅ Files: kebab-case
user-profile.service.ts
create-user.dto.ts

// ✅ Classes: PascalCase
class UserProfileService {}

// ✅ Variables/functions: camelCase
const userProfile = await this.findById(id);

// ✅ Enums: SCREAMING_SNAKE_CASE
enum UserRole { ADMIN = 'ADMIN', MEMBER = 'MEMBER' }
\`\`\`

## Error Handling
- Dùng NestJS built-in exceptions: NotFoundException, ForbiddenException
- KHÔNG throw raw Error hoặc Prisma error
- KHÔNG return stack trace ra ngoài

## API Design
- Mọi list endpoint PHẢI paginate (page + limit)
- Response chuẩn: { data, total, totalPages }
- Status codes: 200/201/400/401/403/404/409/500

## Security Rules
- JwtAuthGuard global — đánh @Public() cho endpoint public
- Validate input qua DTO + class-validator
- Không nối chuỗi vào SQL — dùng Prisma ORM hoặc parameterized query
- Rate limit mọi public endpoint`,
  },
  {
    catKey: 'Kỹ thuật & Dev', authorId: AN_USER, status: 'PUBLISHED', isPinned: false, viewCount: 203,
    title: 'Hướng dẫn setup môi trường Dev local',
    summary: 'Cài đặt và cấu hình toàn bộ stack Loop360 (NestJS + React + PostgreSQL + Redis) trên máy local.',
    tags: ['setup', 'onboarding', 'dev'],
    content: `# Setup môi trường Dev local

## Yêu cầu
- Node.js >= 20
- pnpm >= 9
- Docker Desktop
- Git

## Bước 1: Clone và cài dependencies

\`\`\`bash
git clone git@github.com:loopvn/loop-erp.git
cd loop-erp
pnpm install
\`\`\`

## Bước 2: Start services
\`\`\`bash
docker-compose up -d  # PostgreSQL + Redis + MinIO
\`\`\`

## Bước 3: Setup database
\`\`\`bash
cd apps/backend
cp .env.example .env
# Điền DATABASE_URL, JWT_SECRET, REDIS_URL
npx prisma db push
node prisma/seed.ts  # Data cơ bản
\`\`\`

## Bước 4: Start apps
\`\`\`bash
# Terminal 1: Backend
cd apps/backend && pnpm start:dev

# Terminal 2: Web
cd apps/web && pnpm dev
\`\`\`

## Xong! Truy cập:
- Web: http://localhost:5173
- API: http://localhost:3000
- API Docs: http://localhost:3000/api`,
  },

  // ── Nhân sự & Chính sách ──
  {
    catKey: 'Nhân sự & Chính sách', authorId: HOA_USER, status: 'PUBLISHED', isPinned: true, viewCount: 521,
    title: 'Chính sách nghỉ phép 2026',
    summary: 'Các loại nghỉ phép, số ngày được hưởng, quy trình xin nghỉ và điều kiện áp dụng.',
    tags: ['leave', 'HR', 'chính sách'],
    content: `# Chính sách Nghỉ phép 2026

## Các loại nghỉ phép

| Loại | Số ngày/năm | Ghi chú |
|------|-------------|---------|
| Annual Leave | 12 ngày | Tích lũy 1 ngày/tháng |
| Sick Leave | 8 ngày | Cần giấy khám bệnh nếu > 2 ngày liên tiếp |
| Marriage Leave | 3 ngày | Kết hôn bản thân |
| Bereavement | 3 ngày | Bố/mẹ/vợ/chồng/con |
| Maternity Leave | 180 ngày | Theo Luật Lao động VN |
| Paternity Leave | 5 ngày | |

## Quy trình xin nghỉ

1. Vào **HR > Leave Requests > New Request**
2. Chọn loại nghỉ, ngày, lý do
3. Team Lead approve trong 1 ngày làm việc
4. Hệ thống tự update số dư phép

## Nguyên tắc
- Nghỉ phép năm phải đăng ký trước ít nhất 3 ngày
- Nghỉ > 5 ngày liên tiếp: báo trước 7 ngày và được Manager approve
- Phép chưa dùng được chuyển sang năm sau tối đa 5 ngày
- Phép hết hạn 31/3 năm sau`,
  },
  {
    catKey: 'Nhân sự & Chính sách', authorId: HOA_USER, status: 'PUBLISHED', isPinned: false, viewCount: 189,
    title: 'Chế độ lương thưởng và phúc lợi',
    summary: 'Cấu trúc lương, KPI bonus, các phúc lợi (BHXH, bảo hiểm sức khỏe, team building).',
    tags: ['lương', 'phúc lợi', 'HR', 'bonus'],
    content: `# Lương thưởng & Phúc lợi Loop360

## Cấu trúc lương
- **Lương cơ bản**: Theo thỏa thuận hợp đồng
- **BHXH/BHYT/BHTN**: Đóng đầy đủ theo quy định
- **PC ăn trưa**: 800.000 VNĐ/tháng
- **PC điện thoại**: 300.000–500.000 VNĐ/tháng (tùy vị trí)

## Thưởng KPI (quarterly)
- Q score >= 90%: Thưởng 1.5 tháng lương
- Q score 75–89%: Thưởng 1.0 tháng lương
- Q score 60–74%: Thưởng 0.5 tháng lương
- Q score < 60%: Không có thưởng KPI

## Thưởng Tết (năm)
- Nhân viên >= 1 năm: 2 tháng lương
- Nhân viên 6–12 tháng: 1 tháng lương

## Phúc lợi khác
- Bảo hiểm sức khỏe PVI Gold cho nhân viên chính thức
- Team building 2 lần/năm
- Birthday gift: 500.000 VNĐ
- Company trip hàng năm`,
  },

  // ── Onboarding ──
  {
    catKey: 'Onboarding', authorId: HOA_USER, status: 'PUBLISHED', isPinned: true, viewCount: 678,
    title: 'Welcome to Loop360 — Checklist cho nhân viên mới',
    summary: 'Tất cả những gì bạn cần làm trong tuần đầu tiên tại Loop360.',
    tags: ['onboarding', 'mới', 'checklist'],
    content: `# Welcome to Loop360! 🚀

Chào mừng bạn gia nhập đội ngũ! Dưới đây là checklist những việc cần làm trong tuần đầu.

## Ngày 1 — Setup tài khoản
- [ ] Nhận laptop + tài khoản từ IT
- [ ] Đổi mật khẩu email công ty
- [ ] Login Loop360 app (nhận link từ HR)
- [ ] Cài Slack, Notion, GitHub (nếu là Dev)
- [ ] Chụp ảnh đại diện và cập nhật hồ sơ trên Loop360

## Tuần 1 — Tìm hiểu công ty
- [ ] Đọc tài liệu Company Overview
- [ ] 1-on-1 với Manager trực tiếp
- [ ] Meeting giới thiệu với team
- [ ] Hoàn thành module Onboarding Training trên Loop360

## Tuần 2–4 — Hòa nhập
- [ ] Shadow 1–2 dự án đang chạy
- [ ] Hoàn thành 30-day plan với Manager
- [ ] Submit lần đầu timesheet (mỗi thứ Sáu)

## Liên hệ khi cần
- **IT Support**: it@loop.vn hoặc Slack #it-support
- **HR**: hr@loop.vn
- **Buddy của bạn**: được assign bởi HR trong ngày đầu`,
  },

  // ── Tài chính ──
  {
    catKey: 'Tài chính & Kế toán', authorId: TAI_USER, status: 'PUBLISHED', isPinned: false, viewCount: 142,
    title: 'Hướng dẫn kê khai thuế TNCN cho nhân viên',
    summary: 'Cách kê khai người phụ thuộc, giảm trừ gia cảnh, và theo dõi quyết toán thuế cuối năm.',
    tags: ['thuế', 'TNCN', 'tài chính'],
    content: `# Kê khai Thuế TNCN

## Giảm trừ gia cảnh 2026

| Đối tượng | Mức giảm trừ |
|-----------|-------------|
| Bản thân | 11.000.000 VNĐ/tháng |
| Người phụ thuộc | 4.400.000 VNĐ/người/tháng |

## Đăng ký người phụ thuộc

1. Vào HR > Self-Service > Tax Profile
2. Click "Thêm người phụ thuộc"
3. Upload CCCD + giấy tờ chứng minh quan hệ
4. Nộp bản gốc cho phòng Kế toán

Hạn chót đăng ký: **31/01 hàng năm**

## Quyết toán thuế cuối năm
- Loop360 thực hiện quyết toán thay cho nhân viên (nếu chỉ có 1 nguồn thu nhập)
- Nhân viên có nhiều nguồn thu nhập: tự quyết toán trước 31/03 năm sau

## Hoàn thuế
- Nếu thuế đã nộp > thuế phải nộp: Bộ Tài chính hoàn trả
- Thường mất 30–60 ngày sau khi nộp hồ sơ quyết toán`,
  },
  {
    catKey: 'Khách hàng & Sales', authorId: ADMIN_USER, status: 'PUBLISHED', isPinned: false, viewCount: 97,
    title: 'Quy trình chốt deal và bàn giao khách hàng cho Implementation',
    summary: 'Từ khi deal WON đến khi bàn giao cho đội triển khai: tài liệu cần có, kickoff meeting, SLA.',
    tags: ['sales', 'handover', 'CRM', 'implementation'],
    content: `# Quy trình Handover Deal → Implementation

## Điều kiện deal sẵn sàng handover
- Hợp đồng đã ký (scan + gốc)
- Đặt cọc đã thu (nếu có)
- Phạm vi dự án đã confirm bằng văn bản
- Stakeholder matrix đã xác định (Who's the decision maker?)

## Bước 1: Sales chuẩn bị handover package
- SOW (Statement of Work) đã ký
- Discovery notes (pain points, current system, integration requirements)
- Commercial summary (contract value, payment schedule, penalties)
- Contact list khách hàng

## Bước 2: Kickoff meeting (trong 5 ngày sau ký)
- Tham dự: Sales AE + PM + Tech Lead + Key stakeholders từ KH
- Agenda: Giới thiệu team, review scope, timeline, communication protocol

## Bước 3: Chuyển ownership trên CRM
- Update deal stage → WON
- Assign project trên Loop360
- Sales vẫn là "Account Owner" nhưng PM chịu trách nhiệm delivery

## SLA cam kết kickoff: 5 ngày làm việc sau ký hợp đồng`,
  },
];

async function main() {
  await db.connect();

  // Insert categories
  let catInserted = 0;
  for (const c of categories) {
    const exists = await db.query(`SELECT id FROM kb_categories WHERE name = $1`, [c.name]);
    if (exists.rows.length) {
      catMap[c.name] = exists.rows[0].id;
      continue;
    }
    await db.query(
      `INSERT INTO kb_categories (id, name, description, icon, color, sort_order, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
      [c.id, c.name, c.description, c.icon, c.color, c.sortOrder],
    );
    catMap[c.name] = c.id;
    catInserted++;
  }
  console.log(`✓ ${catInserted} KB categories seeded`);

  // Insert articles
  let artInserted = 0;
  for (const a of articles) {
    const catId = catMap[a.catKey];
    if (!catId) { console.log(`⚠ Cat not found: ${a.catKey}`); continue; }

    const slug = a.title.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 280);

    const exists = await db.query(`SELECT id FROM kb_articles WHERE slug = $1`, [slug]);
    if (exists.rows.length) { console.log(`  skip article: ${a.title.substring(0, 50)}`); continue; }

    const publishedAt = a.status === 'PUBLISHED' ? 'NOW()' : 'NULL';
    await db.query(
      `INSERT INTO kb_articles (id, title, slug, content, summary, category_id, author_id, status, tags, is_pinned, view_count, published_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,${publishedAt},NOW(),NOW())`,
      [uid(), a.title, slug, a.content, a.summary, catId, a.authorId, a.status, a.tags, a.isPinned, a.viewCount],
    );
    artInserted++;
  }
  console.log(`✓ ${artInserted} KB articles seeded`);

  await db.end();
}

main().catch(e => { console.error(e); process.exit(1); });
