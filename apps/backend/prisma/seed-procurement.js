/**
 * Seed demo data for Procurement & Vendor Management (#10)
 * Usage: node prisma/seed-procurement.js
 */
const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db';

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  try {
    console.log('🚀 Seeding Procurement demo data...');

    // Get existing user to use as requester/approver
    const { rows: users } = await client.query(
      `SELECT id, name FROM users ORDER BY created_at LIMIT 5`
    );
    if (users.length === 0) throw new Error('No users found');
    const requester  = users[0];
    const approver   = users[1] || users[0];

    // ─── Vendors ───────────────────────────────────────────────────────────────
    const vendors = [
      { code: 'VND-001', name: 'Công ty TNHH Thiết bị VP Hoàng Minh', category: 'Office Supplies', contact: 'Nguyễn Hoàng Minh', email: 'hoangminh@hmoffice.vn', phone: '028 3812 4567', taxCode: '0301234567', bank: '1234567890', bankName: 'Vietcombank', rating: 4, status: 'ACTIVE' },
      { code: 'VND-002', name: 'FPT Retail – Chi nhánh HCM', category: 'IT', contact: 'Lê Văn Hùng', email: 'lvhung@fptretail.vn', phone: '028 7300 6000', taxCode: '0100686209', bank: '9876543210', bankName: 'Techcombank', rating: 5, status: 'ACTIVE' },
      { code: 'VND-003', name: 'Công ty CP In ấn Toàn Cầu', category: 'Marketing', contact: 'Trần Thị Lan', email: 'tthilan@toancau.com', phone: '024 3921 8888', taxCode: '0200456789', bank: '5678901234', bankName: 'BIDV', rating: 3, status: 'ACTIVE' },
      { code: 'VND-004', name: 'Synnex FPT – Distributor', category: 'Hardware', contact: 'Phạm Minh Đức', email: 'pmduc@synnexfpt.com.vn', phone: '028 6290 8888', taxCode: '0300789012', bank: '2345678901', bankName: 'ACB', rating: 4, status: 'ACTIVE' },
      { code: 'VND-005', name: 'VNPT Technology', category: 'Software', contact: 'Nguyễn Thị Hoa', email: 'nthoa@vnpt.vn', phone: '028 3721 3456', taxCode: '0101688765', bank: '3456789012', bankName: 'Vietinbank', rating: 4, status: 'ACTIVE' },
      { code: 'VND-006', name: 'Công ty Cổ phần Logistic TMS', category: 'Logistics', contact: 'Vũ Đình Thắng', email: 'vdthang@tms-logistics.vn', phone: '028 3550 6789', taxCode: '0302345678', bank: '4567890123', bankName: 'MB Bank', rating: 3, status: 'ACTIVE' },
      { code: 'VND-007', name: 'Evertech Solutions Ltd', category: 'Services', contact: 'David Nguyen', email: 'david@evertech.io', phone: '028 7307 8899', taxCode: '0400567890', bank: '6789012345', bankName: 'HSBC', rating: 5, status: 'ACTIVE' },
      { code: 'VND-008', name: 'Nhà Cung Cấp Cũ ABC Corp', category: 'Others', contact: 'Trần ABC', email: 'info@abc-corp.vn', phone: '028 1234 0000', taxCode: '0500000001', bank: null, bankName: null, rating: 2, status: 'INACTIVE' },
    ];

    const vendorIds = [];
    for (const v of vendors) {
      const { rows } = await client.query(
        `INSERT INTO vendors (id, code, name, category, contact_name, email, phone, tax_code, bank_account, bank_name, rating, status, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
         ON CONFLICT (code) DO UPDATE SET name=$2, updated_at=NOW()
         RETURNING id, code, name`,
        [v.code, v.name, v.category, v.contact, v.email, v.phone, v.taxCode, v.bank, v.bankName, v.rating, v.status]
      );
      vendorIds.push({ id: rows[0].id, code: rows[0].code, name: rows[0].name });
    }
    console.log(`✅ ${vendorIds.length} vendors seeded`);

    // ─── Purchase Orders ────────────────────────────────────────────────────────
    const poTemplates = [
      {
        vendor: vendorIds[1], // FPT Retail
        status: 'RECEIVED',
        items: [
          { desc: 'Laptop Dell Latitude 5540 i7-1365U', unit: 'cái', qty: 5, price: 22_500_000 },
          { desc: 'Mouse Logitech MX Master 3', unit: 'cái', qty: 10, price: 1_200_000 },
          { desc: 'Keyboard Logitech MK470', unit: 'bộ', qty: 10, price: 850_000 },
        ],
        daysAgo: 45,
      },
      {
        vendor: vendorIds[0], // Hoàng Minh office
        status: 'RECEIVED',
        items: [
          { desc: 'Giấy A4 Double A 80gsm (500 tờ/ream)', unit: 'thùng', qty: 20, price: 420_000 },
          { desc: 'Bút bi Thiên Long TL-027', unit: 'hộp', qty: 15, price: 45_000 },
          { desc: 'Sổ ghi chú A5 bìa cứng', unit: 'cuốn', qty: 50, price: 35_000 },
          { desc: 'Mực máy in HP 17A', unit: 'hộp', qty: 8, price: 680_000 },
        ],
        daysAgo: 30,
      },
      {
        vendor: vendorIds[3], // Synnex FPT
        status: 'ORDERED',
        items: [
          { desc: 'Monitor Dell U2723D 27" 4K', unit: 'cái', qty: 8, price: 14_500_000 },
          { desc: 'Webcam Logitech C920 HD Pro', unit: 'cái', qty: 8, price: 2_200_000 },
          { desc: 'USB Hub 7-port Anker', unit: 'cái', qty: 12, price: 650_000 },
        ],
        daysAgo: 10,
      },
      {
        vendor: vendorIds[2], // In ấn Toàn Cầu
        status: 'APPROVED',
        items: [
          { desc: 'In brochure A5 4 màu (1000 tờ)', unit: 'bộ', qty: 3, price: 2_800_000 },
          { desc: 'In banner roll-up 60x160cm', unit: 'cái', qty: 10, price: 350_000 },
          { desc: 'In card visit 2 mặt (500 tờ/hộp)', unit: 'hộp', qty: 5, price: 180_000 },
        ],
        daysAgo: 5,
      },
      {
        vendor: vendorIds[4], // VNPT Technology
        status: 'SUBMITTED',
        items: [
          { desc: 'Bản quyền Microsoft 365 Business Standard (12 tháng)', unit: 'user', qty: 50, price: 4_200_000 },
          { desc: 'Bản quyền Adobe Creative Cloud Team (12 tháng)', unit: 'user', qty: 5, price: 18_000_000 },
        ],
        daysAgo: 2,
      },
      {
        vendor: vendorIds[6], // Evertech
        status: 'DRAFT',
        items: [
          { desc: 'Dịch vụ tư vấn kiến trúc cloud AWS (40 giờ)', unit: 'giờ', qty: 40, price: 2_500_000 },
          { desc: 'Setup Kubernetes cluster 3 nodes', unit: 'dịch vụ', qty: 1, price: 35_000_000 },
        ],
        daysAgo: 0,
      },
      {
        vendor: vendorIds[5], // TMS Logistics
        status: 'CANCELLED',
        items: [
          { desc: 'Dịch vụ vận chuyển nội thành HCM (tháng)', unit: 'tháng', qty: 3, price: 8_500_000 },
        ],
        daysAgo: 60,
      },
    ];

    let poSeq = 1;
    for (const tmpl of poTemplates) {
      const createdAt = new Date(Date.now() - tmpl.daysAgo * 24 * 60 * 60 * 1000);
      const year  = createdAt.getFullYear();
      const month = String(createdAt.getMonth() + 1).padStart(2, '0');
      const poNumber = `PO-${year}${month}-${String(poSeq).padStart(4, '0')}`;
      poSeq++;

      const totalAmount = tmpl.items.reduce((s, i) => s + i.qty * i.price, 0);
      const isApproved  = ['APPROVED', 'ORDERED', 'RECEIVED', 'PARTIALLY_RECEIVED'].includes(tmpl.status);
      const isReceived  = ['RECEIVED'].includes(tmpl.status);

      const { rows: poRows } = await client.query(
        `INSERT INTO purchase_orders
           (id, po_number, vendor_id, requester_id, approver_id, status, currency, total_amount, tax_amount,
            delivery_date, approved_at, received_at, created_at, updated_at)
         VALUES
           (gen_random_uuid(), $1, $2, $3, $4, $5, 'VND', $6, 0,
            $7, $8, $9, $10, $10)
         ON CONFLICT (po_number) DO NOTHING
         RETURNING id`,
        [
          poNumber,
          tmpl.vendor.id,
          requester.id,
          isApproved ? approver.id : null,
          tmpl.status,
          totalAmount,
          new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
          isApproved ? new Date(createdAt.getTime() + 1 * 24 * 60 * 60 * 1000) : null,
          isReceived ? new Date(createdAt.getTime() + 5 * 24 * 60 * 60 * 1000) : null,
          createdAt,
        ]
      );

      if (poRows.length === 0) continue;
      const poId = poRows[0].id;

      for (const item of tmpl.items) {
        const totalPrice = item.qty * item.price;
        const receivedQty = isReceived ? item.qty : 0;
        const itemStatus  = isReceived ? 'RECEIVED' : 'PENDING';

        await client.query(
          `INSERT INTO purchase_order_items
             (id, po_id, description, unit, quantity, unit_price, total_price, received_qty, status, created_at, updated_at)
           VALUES
             (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [poId, item.desc, item.unit, item.qty, item.price, totalPrice, receivedQty, itemStatus]
        );
      }

      console.log(`  ✅ PO ${poNumber} (${tmpl.status}) — ${tmpl.vendor.name} — ${totalAmount.toLocaleString('vi-VN')} ₫`);
    }

    console.log('\n✨ Procurement seed complete!');

  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
