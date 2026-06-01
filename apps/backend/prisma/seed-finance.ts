import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Decimal, InvoiceStatus, ExpenseStatus, PoStatus } from '../src/generated/prisma';
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

const INVOICE_STATUSES: InvoiceStatus[] = ['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'PAID', 'OVERDUE', 'CANCELLED'];
const EXPENSE_STATUSES: ExpenseStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
const EXPENSE_CATEGORIES = ['TRAVEL', 'MEALS', 'EQUIPMENT', 'SOFTWARE', 'TRAINING', 'OTHER'];
const PO_STATUSES: PoStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];

const INVOICE_DESCRIPTIONS = [
  'Dịch vụ phát triển phần mềm',
  'Thiết kế giao diện',
  'Tư vấn kỹ thuật',
  'Hỗ trợ kỹ thuật 3 tháng',
  'Đào tạo nhân viên',
];

const EXPENSE_DESCRIPTIONS = [
  'Vé máy bay Hà Nội - TP.HCM',
  'Khách sạn 3 đêm',
  'Cơm công tác',
  'Taxi',
  'Laptop Dell',
  'License phần mềm',
];

const PO_DESCRIPTIONS = [
  'Máy chủ',
  'Thiết bị mạng',
  'Phần mềm ERP',
  'Dịch vụ cloud',
  'Bàn ghế văn phòng',
];

async function main() {
  console.log('🌱 Seeding Finance Data...\n');

  const projects = await prisma.project.findMany({ take: 10 });
  const employees = await prisma.employee.findMany({ take: 20 });
  const users = await prisma.user.findMany({ take: 10 });

  console.log(`📊 Data check: ${projects.length} projects, ${employees.length} employees, ${users.length} users`);

  if (projects.length === 0 || employees.length === 0 || users.length === 0) {
    console.log('❌ Need projects, employees, users. Run seed:mega first.');
    return;
  }

  // 1. INVOICES
  console.log('📄 Creating Invoices...');
  let invoiceCount = 0;

  for (let i = 0; i < 30; i++) {
    const issueDate = dayjs().subtract(rand(1, 90), 'days').toDate();
    const dueDate = dayjs(issueDate).add(rand(15, 60), 'days').toDate();
    const itemCount = rand(1, 4);
    let subtotal = 0;

    const items = Array.from({ length: itemCount }, () => {
      const unitPrice = rand(5000, 100000) * 1000;
      const quantity = rand(1, 10);
      const amount = unitPrice * quantity;
      subtotal += amount;
      return { 
        description: pick(INVOICE_DESCRIPTIONS), 
        quantity: new Decimal(quantity), 
        unitPrice: new Decimal(unitPrice), 
        amount: new Decimal(amount), 
        taxRate: new Decimal(rand(0, 10)) 
      };
    });

    const taxAmount = Math.round((subtotal * rand(0, 10)) / 100);
    const totalAmount = subtotal + taxAmount;

    try {
      await prisma.invoice.create({
        data: {
          code: `INV-${String(i + 1).padStart(4, '0')}`,
          type: 'SALES',
          projectId: projects[i % projects.length].id,
          issueDate,
          dueDate,
          status: pick(INVOICE_STATUSES),
          subtotal: new Decimal(subtotal),
          taxAmount: new Decimal(taxAmount),
          totalAmount: new Decimal(totalAmount),
          currency: 'VND',
          createdById: users[i % users.length].id,
          invoiceItems: {
            createMany: {
              data: items.map(it => ({
                description: it.description,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                amount: it.amount,
                taxRate: it.taxRate,
              })),
            },
          },
        },
      });
      invoiceCount++;
    } catch (e: any) {
      // Skip on error
    }
  }
  console.log(`   ✓ ${invoiceCount} invoices created\n`);

  // 2. EXPENSES
  console.log('💰 Creating Expenses...');
  let expenseCount = 0;

  for (let i = 0; i < 25; i++) {
    const submittedDate = dayjs().subtract(rand(1, 60), 'days').toDate();
    const itemCount = rand(1, 3);
    let totalAmount = 0;

    const items = Array.from({ length: itemCount }, () => {
      const amount = rand(100, 500) * 1000;
      totalAmount += amount;
      return { description: pick(EXPENSE_DESCRIPTIONS), amount: new Decimal(amount) };
    });

    try {
      await prisma.expense.create({
        data: {
          projectId: projects[i % projects.length].id,
          employeeId: employees[i % employees.length].id,
          submittedById: users[i % users.length].id,
          title: `Chi phí #${i + 1}`,
          category: pick(EXPENSE_CATEGORIES) as any,
          totalAmount: new Decimal(totalAmount),
          currency: 'VND',
          status: pick(EXPENSE_STATUSES),
          approvedById: rand(0, 1) ? users[(i + 1) % users.length].id : undefined,
          approvedAt: rand(0, 1) ? dayjs(submittedDate).add(rand(1, 10), 'days').toDate() : undefined,
          note: `Chi phí chi tiết cho dự án`,
          expenseItems: {
            createMany: { data: items },
          },
          createdAt: submittedDate,
        },
      });
      expenseCount++;
    } catch (e: any) {
      // Skip on error
    }
  }
  console.log(`   ✓ ${expenseCount} expenses created\n`);

  // 3. PURCHASE ORDERS
  const vendors = await prisma.vendor.findMany({ take: 10 });
  console.log('📦 Creating Purchase Orders...');
  
  if (vendors.length === 0) {
    console.log('   ⚠️  No vendors found - skipping\n');
  } else {
    let poCount = 0;

    for (let i = 0; i < 20; i++) {
      const createdDate = dayjs().subtract(rand(10, 90), 'days').toDate();
      const itemCount = rand(1, 5);
      let totalAmount = 0;

      const items = Array.from({ length: itemCount }, () => {
        const unitPrice = rand(1000, 50000) * 1000;
        const quantity = rand(1, 50);
        const totalPrice = unitPrice * quantity;
        totalAmount += totalPrice;
        return {
          description: pick(PO_DESCRIPTIONS),
          unit: pick(['cái', 'bộ', 'chiếc', 'hộp']),
          quantity: new Decimal(quantity),
          unitPrice: new Decimal(unitPrice),
          totalPrice: new Decimal(totalPrice),
        };
      });

      const taxAmount = Math.round((totalAmount * rand(0, 5)) / 100);

      try {
        await prisma.purchaseOrder.create({
          data: {
            poNumber: `PO-${String(i + 1).padStart(4, '0')}`,
            vendorId: vendors[i % vendors.length].id,
            requesterId: users[i % users.length].id,
            approverId: rand(0, 1) ? users[(i + 1) % users.length].id : undefined,
            status: pick(PO_STATUSES),
            currency: 'VND',
            totalAmount: new Decimal(totalAmount),
            taxAmount: new Decimal(taxAmount),
            deliveryDate: dayjs(createdDate).add(rand(7, 30), 'days').toDate(),
            approvedAt: rand(0, 1) ? dayjs(createdDate).add(rand(1, 5), 'days').toDate() : undefined,
            notes: `Đơn mua hàng #${i + 1}`,
            poItems: {
              createMany: {
                data: items.map(it => ({
                  description: it.description,
                  unit: it.unit,
                  quantity: it.quantity,
                  unitPrice: it.unitPrice,
                  totalPrice: it.totalPrice,
                })),
              },
            },
            createdAt: createdDate,
          },
        });
        poCount++;
      } catch (e: any) {
        // Skip on error
      }
    }
    console.log(`   ✓ ${poCount} purchase orders created\n`);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ FINANCE SEED COMPLETED!');
  console.log('═══════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
