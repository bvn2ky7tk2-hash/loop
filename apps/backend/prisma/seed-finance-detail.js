'use strict';
/**
 * seed-finance-detail.js — Dữ liệu Tài chính chi tiết
 * - 200 hóa đơn (invoices)
 * - 150 đơn hàng (purchase orders)
 * - 100 khoản chi (expenses) chi tiết
 * - 12 tháng ngân sách (budget plans)
 * - 200 giao dịch ngân sách (budget transactions)
 *
 * Chạy: node prisma/seed-finance-detail.js
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
  'Microsoft Azure', 'Google Cloud', 'Salesforce', 'SAP SE', 'Oracle',
  'HP Inc', 'Dell Technologies', 'Cisco', 'IBM', 'Canonical',
  'Atlassian', 'JetBrains', 'GitHub', 'GitLab', 'Slack'
];

const INVOICE_STATUSES = ['DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED'];
const PO_STATUSES = ['DRAFT', 'APPROVED', 'SENT', 'RECEIVED', 'INVOICED', 'CANCELLED'];
const PAYMENT_METHODS = ['BANK_TRANSFER', 'CHECK', 'CASH', 'CREDIT_CARD'];

const EXPENSE_CATEGORIES = [
  'Tiền điện', 'Tiền nước', 'Tiền mạng', 'Văn phòng phẩm', 'Vận chuyển',
  'Ăn uống', 'Khách sạn', 'Taxis/Grab', 'Điện thoại', 'Bảo trì',
  'Phần mềm', 'Hardware', 'Bảo hiểm', 'Marketing', 'Huấn luyện'
];

const BUDGET_CATEGORIES = [
  'Tiền lương', 'Thuê nhà', 'Tiền điện/nước', 'Marketing', 'IT & Software',
  'Vận chuyển', 'Huấn luyện', 'Bảo hiểm', 'Khác'
];

async function main() {
  try {
    await db.connect();
    console.log('🧹  Xóa dữ liệu Finance cũ...');

    const tenantResult = await db.query('SELECT id FROM tenants LIMIT 1');
    const tenantId = tenantResult.rows[0]?.id;
    if (!tenantId) throw new Error('No tenant found');

    // Get customer IDs for invoices
    const custResult = await db.query('SELECT id FROM customers LIMIT 50');
    const customerIds = custResult.rows.map(r => r.id);

    // Get user IDs
    const userResult = await db.query("SELECT id FROM users LIMIT 50");
    const userIds = userResult.rows.map(r => r.id);

    await db.query('DELETE FROM budget_transactions WHERE 1=1');
    await db.query('DELETE FROM budget_plans WHERE 1=1');
    await db.query('DELETE FROM expenses WHERE 1=1');
    await db.query('DELETE FROM purchase_orders WHERE 1=1');
    await db.query('DELETE FROM invoices WHERE 1=1');

    const now = new Date();

    // ─── INVOICES (Hóa đơn) ───────────────────────────────────────
    console.log('📄  Tạo 200 hóa đơn...');
    const invoiceIds = Array.from({ length: 200 }, () => uid());
    const invoices = invoiceIds.map((id, i) => {
      const issueDate = new Date(now - rand(1, 180) * 24 * 60 * 60 * 1000);
      const dueDate = new Date(issueDate.getTime() + rand(15, 60) * 24 * 60 * 60 * 1000);
      const amount = rand(10, 500) * 1_000;
      const status = pick(INVOICE_STATUSES);

      return {
        id,
        tenant_id: tenantId,
        invoice_number: `INV-${String(i + 1).padStart(6, '0')}`,
        customer_id: customerIds[i % customerIds.length],
        issue_date: issueDate,
        due_date: dueDate,
        amount,
        tax: Math.round(amount * 0.1),
        total: Math.round(amount * 1.1),
        currency: 'VND',
        status,
        description: `Hóa đơn ${i + 1} - Dịch vụ/Sản phẩm`,
        payment_method: pick(PAYMENT_METHODS),
        paid_date: status === 'PAID' ? new Date(issueDate.getTime() + rand(1, 45) * 24 * 60 * 60 * 1000) : null,
        created_by: userIds[i % userIds.length],
        created_at: issueDate,
        updated_at: now,
      };
    });

    await bulkInsert('invoices', [
      'id', 'tenant_id', 'invoice_number', 'customer_id', 'issue_date', 'due_date',
      'amount', 'tax', 'total', 'currency', 'status', 'description', 'payment_method',
      'paid_date', 'created_by', 'created_at', 'updated_at'
    ], invoices);

    // ─── PURCHASE ORDERS (Đơn hàng mua) ───────────────────────────────────────
    console.log('🛒  Tạo 150 đơn hàng mua...');
    const poIds = Array.from({ length: 150 }, () => uid());
    const pos = poIds.map((id, i) => {
      const createdDate = new Date(now - rand(1, 180) * 24 * 60 * 60 * 1000);
      const amount = rand(20, 1000) * 1_000;

      return {
        id,
        tenant_id: tenantId,
        po_number: `PO-${String(i + 1).padStart(6, '0')}`,
        vendor_name: pick(VENDORS),
        description: `Đơn hàng mua ${i + 1} - ${pick(VENDORS)}`,
        amount,
        tax: Math.round(amount * 0.1),
        total: Math.round(amount * 1.1),
        currency: 'VND',
        status: pick(PO_STATUSES),
        order_date: createdDate,
        delivery_date: new Date(createdDate.getTime() + rand(5, 30) * 24 * 60 * 60 * 1000),
        payment_terms: '30 ngày',
        created_by: userIds[i % userIds.length],
        created_at: createdDate,
        updated_at: now,
      };
    });

    await bulkInsert('purchase_orders', [
      'id', 'tenant_id', 'po_number', 'vendor_name', 'description', 'amount', 'tax',
      'total', 'currency', 'status', 'order_date', 'delivery_date', 'payment_terms',
      'created_by', 'created_at', 'updated_at'
    ], pos);

    // ─── EXPENSES (Khoản chi) ───────────────────────────────────────
    console.log('💸  Tạo 100 khoản chi...');
    const expenses = Array.from({ length: 100 }, (_, i) => {
      const expDate = new Date(now - rand(1, 90) * 24 * 60 * 60 * 1000);
      const amount = rand(100, 50000);

      return {
        id: uid(),
        tenant_id: tenantId,
        employee_id: userIds[rand(0, Math.min(50, userIds.length - 1))] || null,
        category: pick(EXPENSE_CATEGORIES),
        amount,
        currency: 'VND',
        description: `Chi #${i + 1}`,
        receipt_url: `https://storage.example.com/receipt-${i + 1}.pdf`,
        status: pick(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED']),
        expense_date: expDate,
        submitted_date: rand(0, 1) ? new Date(expDate.getTime() + rand(1, 10) * 24 * 60 * 60 * 1000) : null,
        approved_date: rand(0, 1) ? new Date(expDate.getTime() + rand(5, 15) * 24 * 60 * 60 * 1000) : null,
        created_at: expDate,
        updated_at: now,
      };
    });

    await bulkInsert('expenses', [
      'id', 'tenant_id', 'employee_id', 'category', 'amount', 'currency', 'description',
      'receipt_url', 'status', 'expense_date', 'submitted_date', 'approved_date',
      'created_at', 'updated_at'
    ], expenses);

    // ─── BUDGET PLANS (Kế hoạch ngân sách) ───────────────────────────────────────
    console.log('📊  Tạo 12 tháng ngân sách...');
    const budgetPlanIds = Array.from({ length: 12 }, () => uid());
    const budgetPlans = budgetPlanIds.map((id, i) => {
      const month = (i % 12) + 1;
      const year = now.getFullYear();

      return {
        id,
        tenant_id: tenantId,
        name: `Ngân sách T${String(month).padStart(2, '0')}/${year}`,
        description: `Kế hoạch ngân sách tháng ${month} năm ${year}`,
        period_start: new Date(year, month - 1, 1),
        period_end: new Date(year, month, 0),
        total_budget: 1_000_000_000, // 1 tỷ VND
        status: 'APPROVED',
        created_at: new Date(year, month - 2, 1),
        updated_at: now,
      };
    });

    await bulkInsert('budget_plans', [
      'id', 'tenant_id', 'name', 'description', 'period_start', 'period_end',
      'total_budget', 'status', 'created_at', 'updated_at'
    ], budgetPlans);

    // ─── BUDGET TRANSACTIONS (Giao dịch ngân sách) ───────────────────────────────────────
    console.log('💰  Tạo 200 giao dịch ngân sách...');
    const budgetTransactions = Array.from({ length: 200 }, (_, i) => ({
      id: uid(),
      tenant_id: tenantId,
      budget_plan_id: budgetPlanIds[i % budgetPlanIds.length],
      category: pick(BUDGET_CATEGORIES),
      allocated_amount: rand(10, 100) * 1_000_000,
      spent_amount: rand(5, 100) * 1_000_000,
      notes: `Giao dịch ngân sách #${i + 1}`,
      created_at: new Date(now - rand(1, 30) * 24 * 60 * 60 * 1000),
      updated_at: now,
    }));

    await bulkInsert('budget_transactions', [
      'id', 'tenant_id', 'budget_plan_id', 'category', 'allocated_amount', 'spent_amount',
      'notes', 'created_at', 'updated_at'
    ], budgetTransactions);

    const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPOAmount = pos.reduce((sum, po) => sum + po.total, 0);
    const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    console.log(`
✅  Seed Finance hoàn tất!
   Invoices        : 200  (${invoices.filter(inv => inv.status === 'PAID').length} đã thanh toán)
   Purchase Orders : 150  (${pos.filter(po => po.status === 'RECEIVED').length} đã nhận)
   Expenses        : 100  (${expenses.filter(exp => exp.status === 'APPROVED').length} đã duyệt)
   Budget Plans    : 12 tháng
   Budget Trans    : 200

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
