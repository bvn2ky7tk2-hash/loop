/**
 * Seed InvoiceAccountMapping (E21.1)
 * Tạo 3 bản ghi mapping InvoiceType → tài khoản kế toán TT200
 *
 * Chạy: npx tsx prisma/seed-invoice-mapping.ts
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const MAPPINGS = [
  {
    invoiceType:   'SALES',
    debitCode:  '1311', // Phải thu khách hàng
    creditCode: '5111', // Doanh thu dịch vụ
    vatCode:    '3331', // Thuế GTGT phải nộp
  },
  {
    invoiceType:   'PURCHASE',
    debitCode:  '6421', // Chi phí QLDN
    creditCode: '3311', // Phải trả nhà cung cấp
    vatCode:    null,
  },
  {
    invoiceType:   'MILESTONE',
    debitCode:  '1311', // Phải thu khách hàng
    creditCode: '5111', // Doanh thu dịch vụ
    vatCode:    '3331', // Thuế GTGT phải nộp
  },
];

async function main() {
  console.log('🌱 Seeding InvoiceAccountMapping...');

  for (const m of MAPPINGS) {
    const existing = await prisma.invoiceAccountMapping.findFirst({
      where: { invoiceType: m.invoiceType },
    });
    if (existing) {
      console.log(`  ${m.invoiceType}: đã tồn tại, bỏ qua.`);
      continue;
    }

    // Tra cứu ChartOfAccount theo code
    const debitAcc = await prisma.chartOfAccount.findFirst({ where: { code: m.debitCode } });
    const creditAcc = await prisma.chartOfAccount.findFirst({ where: { code: m.creditCode } });
    const vatAcc = m.vatCode ? await prisma.chartOfAccount.findFirst({ where: { code: m.vatCode } }) : null;

    if (!debitAcc || !creditAcc) {
      console.log(`  ⚠️ Bỏ qua ${m.invoiceType}: không tìm thấy tài khoản ${m.debitCode} hoặc ${m.creditCode}`);
      continue;
    }

    await prisma.invoiceAccountMapping.create({
      data: {
        id:              `map-${m.invoiceType.toLowerCase()}`,
        invoiceType:     m.invoiceType,
        debitAccountId:  debitAcc.id,
        creditAccountId: creditAcc.id,
        vatAccountId:    vatAcc?.id ?? undefined,
      },
    });
    console.log(`  ✅ Created mapping ${m.invoiceType} → debit:${m.debitCode} / credit:${m.creditCode}${m.vatCode ? ` / vat:${m.vatCode}` : ''}`);
  }

  console.log('✅ seed-invoice-mapping hoàn thành.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
