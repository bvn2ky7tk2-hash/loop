import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma, DealStage } from '../src/generated/prisma';
const Decimal = Prisma.Decimal;
import dayjs from 'dayjs';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function rand(lo: number, hi: number): number {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const INDUSTRIES = [
  'Công nghệ',
  'Tài chính',
  'Bán lẻ',
  'Sản xuất',
  'Y tế',
  'Giáo dục',
  'Logistics',
  'Du lịch',
];

const COMPANY_NAMES = [
  'Viettel Solutions',
  'FPT Software',
  'Techcombank',
  'Vinamilk',
  'PetroVietnam',
  'Vietnam Airlines',
  'Agribank',
  'MobiFone',
  'EVN',
  'PVN',
];

const DEAL_STAGES: DealStage[] = [
  'QUALIFICATION',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
];

const FIRST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi'];
const LAST_NAMES = ['Văn An', 'Thị Hương', 'Minh Tuấn', 'Hữu Long', 'Kim Anh', 'Quốc Dũng'];
const TITLES = ['Giám đốc', 'Trưởng phòng', 'Quản lý', 'Chuyên viên', 'Kỹ sư'];

async function main() {
  console.log('🌱 Seeding Customer Data...\n');

  const users = await prisma.user.findMany({ take: 10 });
  if (users.length === 0) {
    console.log('❌ No users found. Run seed:mega first.');
    return;
  }

  // 1. CUSTOMERS
  console.log('🏢 Creating Customers...');
  let customerCount = 0;
  const customers = [];

  for (let i = 0; i < 25; i++) {
    try {
      const customer = await prisma.customer.create({
        data: {
          code: `CUST-${String(i + 1).padStart(4, '0')}`,
          name: `${pick(COMPANY_NAMES)} - Chi nhánh ${i + 1}`,
          industry: pick(INDUSTRIES),
          website: `https://company${i + 1}.com`,
          taxCode: `${String(i + 1).padStart(10, '0')}`,
        },
      });
      customers.push(customer);
      customerCount++;
    } catch (e) {
      // Skip duplicates
    }
  }
  console.log(`   ✓ ${customerCount} customers created\n`);

  // 2. CONTACTS
  console.log('👤 Creating Contacts...');
  let contactCount = 0;

  for (const customer of customers) {
    const contactCount_ = rand(1, 3);
    for (let j = 0; j < contactCount_; j++) {
      try {
        await prisma.contact.create({
          data: {
            name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
            email: `contact${j + 1}@${customer.name.toLowerCase().replace(/\s+/g, '')}.com`,
            phone: `09${String(rand(10000000, 99999999)).slice(0, 8)}`,
            title: pick(TITLES),
            customerId: customer.id,
          },
        });
        contactCount++;
      } catch (e) {
        // Skip errors
      }
    }
  }
  console.log(`   ✓ ${contactCount} contacts created\n`);

  // 3. DEALS
  console.log('📊 Creating Deals...');
  let dealCount = 0;

  for (const customer of customers) {
    const dealCount_ = rand(1, 3);
    for (let j = 0; j < dealCount_; j++) {
      const stage = pick(DEAL_STAGES);
      const createdDate = dayjs().subtract(rand(10, 180), 'days').toDate();

      try {
        const deal = await prisma.deal.create({
          data: {
            code: `DEAL-${String(dealCount + 1).padStart(5, '0')}`,
            title: `Hợp đồng ${j + 1} - ${customer.name}`,
            customerId: customer.id,
            stage,
            value: new Decimal(rand(100, 1000) * 1_000_000),
            currency: 'VND',
            probability: stage === 'QUALIFICATION' ? rand(10, 30) : stage === 'PROPOSAL' ? rand(40, 60) : stage === 'NEGOTIATION' ? rand(70, 90) : 0,
            expectedCloseDate: dayjs(createdDate).add(rand(15, 60), 'days').toDate(),
            assigneeId: users[dealCount % users.length].id,
            wonAt: stage === 'WON' ? dayjs(createdDate).add(rand(15, 60), 'days').toDate() : undefined,
            lostAt: stage === 'LOST' ? dayjs(createdDate).add(rand(15, 60), 'days').toDate() : undefined,
            lostReason: stage === 'LOST' ? pick(['Giá quá cao', 'Chọn đối thủ cạnh tranh', 'Không đủ ngân sách']) : undefined,
            createdAt: createdDate,
          },
        });
        dealCount++;
      } catch (e) {
        // Skip errors
      }
    }
  }
  console.log(`   ✓ ${dealCount} deals created\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ CUSTOMER SEED COMPLETED!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`
🏢 Customers   : ${customerCount}
👤 Contacts    : ${contactCount}
📊 Deals       : ${dealCount}
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
