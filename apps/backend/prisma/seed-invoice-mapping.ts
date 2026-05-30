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
    debitAccount:  '1311', // Phải thu khách hàng
    creditAccount: '5111', // Doanh thu dịch vụ
    vatAccount:    '3331', // Thuế GTGT phải nộp
  },
  {
    invoiceType:   'PURCHASE',
    debitAccount:  '6421', // Chi phí QLDN
    creditAccount: '3311', // Phải trả nhà cung cấp
    vatAccount:    null,
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
    const debitAcc  = await prisma.chartOfAccount.findFirst({ where: { code: m.debitAccount } });
    const creditAcc = await prisma.chartOfAccount.findFirst({ where: { code: m.creditAccount } });
    const vatAcc    = m.vatAccount ? await prisma.chartOfAccount.findFirst({ where: { code: m.vatAccount } }) : null;
    if (!debitAcc || !creditAcc) {
      console.log(`  ⚠️  ${m.invoiceType}: không tìm thấy tài khoản ${m.debitAccount}/${m.creditAccount}, bỏ qua.`);
      continue;
    }
    await (prisma.invoiceAccountMapping as any).create({
      data: {
        id:              `map-${m.invoiceType.toLowerCase()}`,
        invoiceType:     m.invoiceType,
        debitAccountId:  debitAcc.id,
        creditAccountId: creditAcc.id,
        vatAccountId:    vatAcc?.id ?? null,
      },
    });
    console.log(`  ✅ Created mapping ${m.invoiceType} → debit:${m.debitAccount} / credit:${m.creditAccount}${m.vatAccount ? ` / vat:${m.vatAccount}` : ''}`);
  }

  console.log('✅ seed-invoice-mapping hoàn thành.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
