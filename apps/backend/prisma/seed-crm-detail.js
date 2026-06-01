'use strict';
/**
 * seed-crm-detail.js — Dữ liệu CRM chi tiết
 * - 100 khách hàng (customers)
 * - 500 liên hệ (contacts)
 * - 150 deals (cơ hội bán)
 * - 300 activities (hoạt động khách hàng)
 *
 * Chạy: node prisma/seed-crm-detail.js
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

const INDUSTRIES = ['Công nghệ', 'Tài chính', 'Bán lẻ', 'Sản xuất', 'Logistics', 'Y tế', 'Giáo dục', 'Bất động sản', 'Nông nghiệp', 'Du lịch'];
const CITIES = ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Biên Hòa', 'Nha Trang', 'Huế'];

const COMPANY_NAMES = [
  'Vimec Healthcare', 'TPBank', 'Vinmart+', 'NetCom', 'TechFlow Solutions',
  'Green Energy Corp', 'SmartLogistics', 'FoodHub Vietnam', 'CloudBox', 'DataSoft',
  'RetailPro', 'IndustrialTech', 'HealthFirst', 'EduTech', 'FinanceHub',
  'LogisticsPro', 'TravelGo', 'FarmTech', 'RealEstate Hub', 'TechStartup',
  'NextGen Solutions', 'Digital Transform', 'Cloud Native', 'AI Solutions', 'BigData Analytics'
];

const CONTACT_TITLES = ['CEO', 'CTO', 'CFO', 'COO', 'Giám đốc Bán hàng', 'Trưởng phòng IT', 'Trưởng phòng Tài chính', 'Trưởng phòng HR', 'Quản lý Dự án', 'Chuyên viên'];

const DEAL_STAGES = ['Khám phá', 'Nhu cầu', 'Đề xuất', 'Thương lượng', 'Quyết định', 'Đóng'];
const DEAL_STATUS = ['OPEN', 'WON', 'LOST'];

async function main() {
  try {
    await db.connect();
    console.log('🧹  Xóa dữ liệu CRM cũ...');

    // Get tenant ID
    const tenantResult = await db.query('SELECT id FROM tenants LIMIT 1');
    const tenantId = tenantResult.rows[0]?.id;
    if (!tenantId) throw new Error('No tenant found');

    // Clear old data
    await db.query('DELETE FROM crm_activities WHERE 1=1');
    await db.query('DELETE FROM deals WHERE 1=1');
    await db.query('DELETE FROM contacts WHERE 1=1');
    await db.query('DELETE FROM customers WHERE 1=1');

    const now = new Date();

    // ─── CUSTOMERS (Khách hàng) ───────────────────────────────────────
    console.log('👥  Tạo 100 khách hàng...');
    const customerIds = Array.from({ length: 100 }, () => uid());
    const customers = customerIds.map((id, i) => ({
      id,
      tenant_id: tenantId,
      name: COMPANY_NAMES[i % COMPANY_NAMES.length] + ` #${i + 1}`,
      code: `CUST-${String(i + 1).padStart(4, '0')}`,
      industry: pick(INDUSTRIES),
      website: `https://customer${i + 1}.com.vn`,
      tax_code: `${String(i + 1).padStart(10, '0')}`,
      created_at: new Date(now - rand(1, 180) * 24 * 60 * 60 * 1000),
      updated_at: now,
    }));

    await bulkInsert('customers', [
      'id', 'tenant_id', 'name', 'code', 'industry', 'website', 'tax_code',
      'created_at', 'updated_at'
    ], customers);

    // ─── CONTACTS (Liên hệ) ────────────────────────────────────────
    console.log('📞  Tạo 500 liên hệ...');
    const contactIds = Array.from({ length: 500 }, () => uid());
    const FIRST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng'];
    const LAST_NAMES = ['Văn An', 'Thị Hương', 'Minh Tuấn', 'Hữu Long', 'Kim Anh', 'Quốc Dũng', 'Thanh Hoa'];

    const contacts = contactIds.map((id, i) => ({
      id,
      tenant_id: tenantId,
      customer_id: customerIds[i % customerIds.length],
      name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      title: pick(CONTACT_TITLES),
      email: `contact${i + 1}@email.com`,
      phone: `09${rand(10000000, 99999999)}`,
      created_at: new Date(now - rand(1, 180) * 24 * 60 * 60 * 1000),
      updated_at: now,
    }));

    await bulkInsert('contacts', [
      'id', 'tenant_id', 'customer_id', 'name', 'title', 'email', 'phone',
      'created_at', 'updated_at'
    ], contacts);

    // ─── DEALS (Cơ hội bán) ────────────────────────────────────────
    console.log('💰  Tạo 150 deals...');

    // Get PM IDs for deal assignees
    const pmResult = await db.query(
      "SELECT id FROM users WHERE email LIKE 'pm%@loop.vn' LIMIT 100"
    );
    const pmIds = pmResult.rows.map(r => r.id);
    if (pmIds.length === 0) throw new Error('No PM users found');

    const dealIds = Array.from({ length: 150 }, () => uid());
    const STAGES = ['QUALIFICATION', 'PROPOSAL', 'NEGOTIATION'];

    const deals = dealIds.map((id, i) => {
      const custIdx = i % customerIds.length;
      const stage = pick(STAGES);
      const value = rand(100, 5000) * 1_000;
      const probability = rand(10, 90);
      const assigneeIdx = rand(0, pmIds.length - 1);

      return {
        id,
        code: `DEAL-${String(i + 1).padStart(5, '0')}`,
        tenant_id: tenantId,
        customer_id: customerIds[custIdx],
        title: `Deal ${i + 1} - ${COMPANY_NAMES[custIdx % COMPANY_NAMES.length]}`,
        value,
        currency: 'VND',
        stage,
        probability,
        assignee_id: pmIds[assigneeIdx],
        expected_close_date: new Date(now.getTime() + rand(1, 120) * 24 * 60 * 60 * 1000),
        created_at: new Date(now - rand(1, 180) * 24 * 60 * 60 * 1000),
        updated_at: now,
      };
    });

    await bulkInsert('deals', [
      'id', 'code', 'tenant_id', 'customer_id', 'title', 'value', 'currency',
      'stage', 'probability', 'assignee_id', 'expected_close_date',
      'created_at', 'updated_at'
    ], deals);

    // ─── ACTIVITIES (Hoạt động CRM) ────────────────────────────────────────
    console.log('📅  Tạo 300 activities...');
    const ACTIVITY_TYPES = ['CALL', 'EMAIL', 'MEETING', 'TASK', 'NOTE'];
    const activities = Array.from({ length: 300 }, (_, i) => {
      const createdAt = new Date(now - rand(1, 180) * 24 * 60 * 60 * 1000);
      return {
        id: uid(),
        tenant_id: tenantId,
        customer_id: customerIds[rand(0, customerIds.length - 1)],
        contact_id: contactIds[rand(0, contactIds.length - 1)],
        type: pick(ACTIVITY_TYPES),
        subject: `Activity ${i + 1}`,
        content: `Chi tiết hoạt động ${i + 1}`,
        scheduled_at: new Date(now - rand(1, 30) * 24 * 60 * 60 * 1000),
        completed_at: rand(0, 1) ? new Date(now - rand(1, 20) * 24 * 60 * 60 * 1000) : null,
        created_by_id: pmIds[rand(0, pmIds.length - 1)],
        created_at: createdAt,
        updated_at: now,
      };
    });

    await bulkInsert('crm_activities', [
      'id', 'tenant_id', 'customer_id', 'contact_id', 'type', 'subject', 'content',
      'scheduled_at', 'completed_at', 'created_by_id', 'created_at', 'updated_at'
    ], activities);

    console.log(`
✅  Seed CRM hoàn tất!
   Customers   : 100
   Contacts    : 500
   Deals       : 150  (${deals.filter(d => d.status === 'WON').length} WON · ${deals.filter(d => d.status === 'LOST').length} LOST)
   Activities  : 300
   Total Value : ${(deals.reduce((sum, d) => sum + d.amount, 0) / 1_000_000).toFixed(1)}M VND
    `);

    await db.end();
  } catch (e) {
    console.error('❌ Lỗi:', e.message);
    process.exit(1);
  }
}

main();
