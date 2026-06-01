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

async function main() {
  console.log('🌱 Seed CRM bổ sung (hợp đồng, cổng KH, ticket, follow-up, target)...\n');

  const customers = await prisma.customer.findMany({ select: { id: true, name: true } });
  const deals = await prisma.deal.findMany({ select: { id: true } });
  const leads = await prisma.lead.findMany({ select: { id: true } });
  const users = await prisma.user.findMany({ select: { id: true }, take: 100 });
  if (customers.length === 0 || users.length === 0) { console.log('❌ Cần customers + users.'); return; }

  // ── 1. CLIENT CONTRACTS + MILESTONES ───────────────────────────────────────
  console.log('📄 Hợp đồng khách hàng + mốc thanh toán...');
  const contractsByCustomer = new Map<string, string[]>();
  if (await prisma.clientContract.count() > 0) {
    console.log('   ⏭  Đã có, bỏ qua.');
    for (const c of await prisma.clientContract.findMany({ select: { id: true, customerId: true } })) {
      const arr = contractsByCustomer.get(c.customerId) ?? []; arr.push(c.id); contractsByCustomer.set(c.customerId, arr);
    }
  } else {
    let cNo = 1, mCount = 0;
    for (const cust of customers.slice(0, 60)) {
      const numC = rand(1, 2);
      for (let k = 0; k < numC; k++) {
        const value = rand(100, 2000) * 1_000_000;
        const start = dayjs().subtract(rand(30, 400), 'days');
        const status = pick(['DRAFT', 'ACTIVE', 'ACTIVE', 'COMPLETED']) as Prisma.ClientContractCreateInput['status'];
        const numM = rand(2, 4);
        const per = Math.round(value / numM);
        const contract = await prisma.clientContract.create({
          data: {
            contractNo: `HD-2026-${String(cNo++).padStart(4, '0')}`,
            title: `Hợp đồng dịch vụ phần mềm - ${cust.name}`,
            customerId: cust.id,
            type: pick(['SERVICE', 'PRODUCT', 'SUPPORT', 'SLA']) as Prisma.ClientContractCreateInput['type'],
            value: new Decimal(value), currency: 'VND',
            startDate: start.toDate(),
            endDate: start.add(rand(6, 18), 'month').toDate(),
            signedAt: status !== 'DRAFT' ? start.toDate() : null,
            status,
            paymentTermsDays: pick([15, 30, 45]),
            milestones: {
              create: Array.from({ length: numM }, (_, i) => {
                const ms = pick(['PENDING', 'COMPLETED', 'INVOICED', 'PAID']) as Prisma.ContractMilestoneCreateWithoutContractInput['status'];
                return {
                  name: `Mốc ${i + 1}: ${pick(['Khởi tạo', 'Phát triển', 'Nghiệm thu', 'Bảo hành'])}`,
                  dueDate: start.add((i + 1) * 2, 'month').toDate(),
                  amount: new Decimal(per),
                  status: ms,
                  paidAt: ms === 'PAID' ? start.add((i + 1) * 2, 'month').toDate() : null,
                };
              }),
            },
          },
        });
        mCount += numM;
        const arr = contractsByCustomer.get(cust.id) ?? []; arr.push(contract.id); contractsByCustomer.set(cust.id, arr);
      }
    }
    console.log(`   ✓ ${cNo - 1} hợp đồng, ${mCount} mốc thanh toán`);
  }

  // ── 2. CUSTOMER PORTALS + TICKETS ──────────────────────────────────────────
  console.log('🌐 Cổng khách hàng + ticket...');
  if (await prisma.customerPortal.count() > 0) {
    console.log('   ⏭  Đã có, bỏ qua.');
  } else {
    let pCount = 0, tCount = 0;
    const TICKET_TITLES = ['Lỗi đăng nhập', 'Yêu cầu tính năng mới', 'Hỏi về hóa đơn', 'Báo lỗi hiển thị', 'Yêu cầu hỗ trợ tích hợp'];
    for (const cust of customers.slice(0, 40)) {
      const portal = await prisma.customerPortal.create({
        data: {
          name: `Cổng KH - ${cust.name}`,
          customerId: cust.id,
          allowedContractIds: contractsByCustomer.get(cust.id) ?? [],
          isActive: Math.random() > 0.2,
          welcomeMessage: 'Chào mừng quý khách đến với cổng hỗ trợ Loop.vn',
        },
      });
      pCount++;
      const numT = rand(0, 5);
      const tickets: Prisma.CustomerTicketCreateManyInput[] = [];
      for (let i = 0; i < numT; i++) {
        const st = pick(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']) as Prisma.CustomerTicketCreateManyInput['status'];
        const resolved = st === 'RESOLVED' || st === 'CLOSED';
        tickets.push({
          portalId: portal.id,
          title: pick(TICKET_TITLES),
          description: 'Khách hàng phản ánh vấn đề, cần đội hỗ trợ xử lý.',
          priority: pick(['LOW', 'MEDIUM', 'HIGH', 'URGENT']) as Prisma.CustomerTicketCreateManyInput['priority'],
          status: st,
          submittedBy: 'khách hàng',
          response: resolved ? 'Đã xử lý và phản hồi khách hàng.' : null,
          resolvedAt: resolved ? dayjs().subtract(rand(1, 20), 'days').toDate() : null,
        });
      }
      if (tickets.length) { const r = await prisma.customerTicket.createMany({ data: tickets }); tCount += r.count; }
    }
    console.log(`   ✓ ${pCount} cổng KH, ${tCount} ticket`);
  }

  // ── 3. LEAD/DEAL FOLLOW-UP SCHEDULES ───────────────────────────────────────
  console.log('📅 Lịch follow-up lead/deal...');
  if (await prisma.leadFollowUpSchedule.count() > 0) {
    console.log('   ⏭  Đã có, bỏ qua.');
  } else {
    const rows: Prisma.LeadFollowUpScheduleCreateManyInput[] = [];
    for (const l of leads) {
      if (Math.random() > 0.6) continue;
      rows.push({
        leadId: l.id, scheduledDate: dayjs().add(rand(-10, 20), 'days').toDate(),
        type: pick(['CALL', 'EMAIL', 'MEETING', 'DEMO']) as Prisma.LeadFollowUpScheduleCreateManyInput['type'],
        note: 'Liên hệ tư vấn, chốt nhu cầu khách hàng.',
        status: pick(['PENDING', 'DONE', 'SKIPPED']) as Prisma.LeadFollowUpScheduleCreateManyInput['status'],
        assigneeId: pick(users).id,
      });
    }
    for (const d of deals) {
      if (Math.random() > 0.5) continue;
      rows.push({
        dealId: d.id, scheduledDate: dayjs().add(rand(-10, 20), 'days').toDate(),
        type: pick(['CALL', 'MEETING', 'SITE_VISIT', 'TASK']) as Prisma.LeadFollowUpScheduleCreateManyInput['type'],
        note: 'Theo dõi tiến độ thương vụ.',
        status: pick(['PENDING', 'DONE']) as Prisma.LeadFollowUpScheduleCreateManyInput['status'],
        assigneeId: pick(users).id,
      });
    }
    const r = await prisma.leadFollowUpSchedule.createMany({ data: rows });
    console.log(`   ✓ ${r.count} lịch follow-up`);
  }

  // ── 4. REVENUE TARGETS ─────────────────────────────────────────────────────
  console.log('🎯 Chỉ tiêu doanh thu...');
  const rtRows: Prisma.RevenueTargetCreateManyInput[] = [];
  for (let m = 1; m <= 12; m++) {
    rtRows.push({ period: `2026-${String(m).padStart(2, '0')}`, periodType: 'MONTHLY', target: new Decimal(rand(500, 1500) * 1_000_000), currency: 'VND' });
  }
  for (let q = 1; q <= 4; q++) {
    rtRows.push({ period: `2026-Q${q}`, periodType: 'QUARTERLY', target: new Decimal(rand(2000, 5000) * 1_000_000), currency: 'VND' });
  }
  const rt = await prisma.revenueTarget.createMany({ data: rtRows, skipDuplicates: true });
  console.log(`   ✓ ${rt.count} chỉ tiêu doanh thu`);

  console.log('\n✅ Hoàn tất seed CRM bổ sung!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
