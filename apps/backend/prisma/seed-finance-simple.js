'use strict';
/**
 * seed-finance-simple.js — Dữ liệu Tài chính (đơn giản)
 * - 100 hóa đơn
 * - 80 đơn hàng mua
 * - 60 khoản chi
 *
 * Chạy: node prisma/seed-finance-simple.js
 */

const { Client } = require('pg');
const { randomUUID: uid } = require('crypto');

const db = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'loop',
  password: process.env.DB_PASS || 'loop_password',
  database: process.env.DB_NAME || 'loop_db',
});

const pick = a => a[Math.floor(Math.random() * a.length)];
const rand = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;

async function bulkInsert(table, cols, rows) {
  if (!rows.length) return;
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const values = slice.map(
      (r, ri) => `(${cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(',')})`
    ).join(',');
    const params = slice.flatMap(r => cols.map(c => r[c] ?? null));
    const colNames = cols.map(c => `"${c}"`).join(',');
    await db.query(`INSERT INTO "${table}" (${colNames}) VALUES ${values}`, params);
  }
}

const VENDORS = [
  'FPT Telecom', 'Viettel', 'VNPT', 'Mobifone', 'AWS Vietnam',
  'Microsoft Azure', 'Google Cloud', 'Salesforce', 'SAP SE', 'Oracle'
];

const EXPENSE_CATEGORIES = [
  'Tiền điện', 'Tiền nước', 'Tiền mạng', 'Văn phòng phẩm', 'Vận chuyển',
  'Ăn uống', 'Khách sạn', 'Taxis/Grab', 'Điện thoại', 'Bảo trì'
];

async function main() {
  try {
    await db.connect();
    console.log('🧹  Xóa dữ liệu Finance cũ...');

    const tenantResult = await db.query('SELECT id FROM tenants LIMIT 1');
    const tenantId = tenantResult.rows[0]?.id;
    if (!tenantId) throw new Error('No tenant found');

    // Get customer + user IDs
    const custResult = await db.query('SELECT id FROM customers LIMIT 50');
    const customerIds = custResult.rows.map(r => r.id);

    const userResult = await db.query("SELECT id FROM users LIMIT 50");
    const userIds = userResult.rows.map(r => r.id);

    // Cleanup
    await db.query('DELETE FROM expenses WHERE 1=1');
    await db.query('DELETE FROM purchase_orders WHERE 1=1');
    await db.query('DELETE FROM invoices WHERE 1=1');

    const now = new Date();

    // ─── INVOICES (Hóa đơn) ───────────────────────────────────────
    console.log('📄  Tạo 100 hóa đơn...');
    const invoices = Array.from({ length: 100 }, (_, i) => {
      const issueDate = new Date(now - rand(1, 180) * 24 * 60 * 60 * 1000);
      const dueDate = new Date(issueDate.getTime() + rand(15, 60) * 24 * 60 * 60 * 1000);
      const subtotal = rand(10, 500) * 1_000;
      const taxAmount = Math.round(subtotal * 0.1);

      return {
        id: uid(),
        code: `INV-${String(i + 1).padStart(6, '0')}`,
        type: pick(['SALES', 'PURCHASE']),
        tenant_id: tenantId,
        customer_id: customerIds[i % Math.max(1, customerIds.length)],
        issue_date: issueDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        subtotal,
        tax_amount: taxAmount,
        total_amount: subtotal + taxAmount,
        currency: 'VND',
        status: pick(['DRAFT', 'SENT', 'PAID']),
        notes: `Hóa đơn ${i + 1}`,
        paid_at: rand(0, 1) ? new Date(issueDate.getTime() + rand(1, 45) * 24 * 60 * 60 * 1000) : null,
        created_by_id: userIds[i % userIds.length],
        created_at: issueDate,
        updated_at: now,
      };
    });

    await bulkInsert('invoices', [
      'id', 'code', 'type', 'tenant_id', 'customer_id', 'issue_date', 'due_date',
      'subtotal', 'tax_amount', 'total_amount', 'currency', 'status', 'notes',
      'paid_at', 'created_by_id', 'created_at', 'updated_at'
    ], invoices);

    // ─── PURCHASE ORDERS (Đơn hàng mua) ───────────────────────────────────────
    console.log('🛒  Tạo 80 đơn hàng mua...');
    const pos = Array.from({ length: 80 }, (_, i) => {
      const createdDate = new Date(now - rand(1, 180) * 24 * 60 * 60 * 1000);
      const subtotal = rand(20, 1000) * 1_000;
      const taxAmount = Math.round(subtotal * 0.1);

      return {
        id: uid(),
        code: `PO-${String(i + 1).padStart(6, '0')}`,
        tenant_id: tenantId,
        vendor_name: pick(VENDORS),
        issue_date: createdDate.toISOString().split('T')[0],
        due_date: new Date(createdDate.getTime() + rand(5, 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal,
        tax_amount: taxAmount,
        total_amount: subtotal + taxAmount,
        currency: 'VND',
        status: pick(['DRAFT', 'ISSUED', 'RECEIVED']),
        notes: `Đơn mua ${i + 1}`,
        created_by_id: userIds[i % userIds.length],
        created_at: createdDate,
        updated_at: now,
      };
    });

    await bulkInsert('purchase_orders', [
      'id', 'code', 'tenant_id', 'vendor_name', 'issue_date', 'due_date',
      'subtotal', 'tax_amount', 'total_amount', 'currency', 'status', 'notes',
      'created_by_id', 'created_at', 'updated_at'
    ], pos);

    // ─── EXPENSES (Khoản chi) ───────────────────────────────────────
    console.log('💸  Tạo 60 khoản chi...');
    const expenses = Array.from({ length: 60 }, (_, i) => {
      const expDate = new Date(now - rand(1, 90) * 24 * 60 * 60 * 1000);
      const amount = rand(100, 50000);

      return {
        id: uid(),
        tenant_id: tenantId,
        category: pick(EXPENSE_CATEGORIES),
        amount,
        currency: 'VND',
        notes: `Chi #${i + 1}`,
        status: pick(['DRAFT', 'SUBMITTED', 'APPROVED']),
        expense_date: expDate.toISOString().split('T')[0],
        created_by_id: userIds[rand(0, userIds.length - 1)],
        created_at: expDate,
        updated_at: now,
      };
    });

    await bulkInsert('expenses', [
      'id', 'tenant_id', 'category', 'amount', 'currency', 'notes', 'status',
      'expense_date', 'created_by_id', 'created_at', 'updated_at'
    ], expenses);

    const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalPOAmount = pos.reduce((sum, po) => sum + po.total_amount, 0);
    const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    console.log(`
✅  Seed Finance hoàn tất!
   Invoices        : 100  (${invoices.filter(inv => inv.status === 'PAID').length} đã thanh toán)
   Purchase Orders : 80   (${pos.filter(po => po.status === 'RECEIVED').length} đã nhận)
   Expenses        : 60   (${expenses.filter(exp => exp.status === 'APPROVED').length} đã duyệt)

   💵 Tổng:
   - Hóa đơn       : ${(totalInvoiceAmount / 1_000_000).toFixed(1)}M VND
   - Đơn mua       : ${(totalPOAmount / 1_000_000).toFixed(1)}M VND
   - Chi tiêu      : ${(totalExpense / 1_000_000).toFixed(1)}M VND
    `);

    await db.end();
  } catch (e) {
    console.error('❌ Lỗi:', e.message);
    process.exit(1);
  }
}

main();
