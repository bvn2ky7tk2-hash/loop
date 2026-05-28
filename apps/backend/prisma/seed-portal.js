/**
 * Seed demo data for Customer Portal (#9)
 * Usage: node prisma/seed-portal.js
 */
const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/loop_dev';

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  try {
    console.log('🚀 Seeding Customer Portal demo data...');

    // Get existing customers
    const { rows: customers } = await client.query(
      `SELECT id, name FROM customers ORDER BY created_at LIMIT 5`
    );

    if (customers.length === 0) {
      console.log('⚠️  No customers found — run CRM seed first');
      return;
    }

    // Get existing client contracts to link
    const { rows: contracts } = await client.query(
      `SELECT id, customer_id, title FROM client_contracts ORDER BY created_at LIMIT 10`
    );

    // Get existing deals to link
    const { rows: deals } = await client.query(
      `SELECT id, customer_id, title FROM deals ORDER BY created_at LIMIT 10`
    );

    console.log(`Found ${customers.length} customers, ${contracts.length} contracts, ${deals.length} deals`);

    // Create portals for top 3 customers
    const portalData = [
      {
        customer: customers[0],
        name: `${customers[0].name} — Client Portal`,
        welcomeMessage: 'Chào mừng đến với cổng thông tin khách hàng. Tại đây bạn có thể theo dõi tiến độ dự án và gửi yêu cầu hỗ trợ.',
        isActive: true,
        expiresAt: null,
      },
      {
        customer: customers[1] || customers[0],
        name: `${(customers[1] || customers[0]).name} — Partner Hub`,
        welcomeMessage: 'Xin chào! Chúng tôi rất vui khi được hợp tác cùng bạn. Hãy theo dõi các cột mốc quan trọng của hợp đồng tại đây.',
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        customer: customers[2] || customers[0],
        name: `${(customers[2] || customers[0]).name} — Project Tracker`,
        welcomeMessage: null,
        isActive: false,
        expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    const createdPortals = [];

    for (const pd of portalData) {
      // Build allowed contract IDs for this customer
      const customerContracts = contracts.filter(c => c.customer_id === pd.customer.id);
      const allowedContractIds = customerContracts.slice(0, 3).map(c => c.id);

      const { rows } = await client.query(
        `INSERT INTO customer_portals
           (id, name, customer_id, token, allowed_contract_ids, is_active, expires_at, welcome_message, created_at, updated_at)
         VALUES
           (gen_random_uuid(), $1, $2, gen_random_uuid()::text, $3::text[], $4, $5, $6, NOW(), NOW())
         ON CONFLICT DO NOTHING
         RETURNING id, token, name, customer_id`,
        [
          pd.name,
          pd.customer.id,
          allowedContractIds,
          pd.isActive,
          pd.expiresAt,
          pd.welcomeMessage,
        ]
      );

      if (rows.length > 0) {
        createdPortals.push({ ...rows[0], customerName: pd.customer.name });
        console.log(`✅ Portal created: "${pd.name}" (token: ${rows[0].token})`);
      } else {
        console.log(`⚠️  Portal already exists: "${pd.name}"`);
      }
    }

    if (createdPortals.length === 0) {
      console.log('No new portals created. Done.');
      return;
    }

    // Seed tickets for the first active portal
    const activePortal = createdPortals[0];

    const tickets = [
      {
        title: 'Không thể truy cập tài liệu kỹ thuật giai đoạn 2',
        description: 'Khi click vào link tài liệu kỹ thuật giai đoạn 2 trong email, tôi nhận được lỗi 403. Vui lòng kiểm tra phân quyền truy cập.',
        priority: 'HIGH',
        status: 'RESOLVED',
        submittedBy: 'Nguyễn Thành Long',
        response: 'Đã cập nhật quyền truy cập. Bạn có thể thử lại ngay bây giờ.',
        resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        title: 'Yêu cầu thay đổi scope giai đoạn triển khai',
        description: 'Sau khi thảo luận nội bộ, chúng tôi muốn bổ sung thêm 2 màn hình vào scope giai đoạn 3. Có thể arrange một cuộc họp để thảo luận không?',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        submittedBy: 'Trần Thị Hoa',
        response: null,
        resolvedAt: null,
      },
      {
        title: 'Báo lỗi: Dữ liệu export sai format ngày tháng',
        description: 'Khi export báo cáo ra Excel, cột ngày tháng hiển thị dưới dạng số thay vì DD/MM/YYYY. Môi trường: Chrome 124, Windows 11.',
        priority: 'HIGH',
        status: 'OPEN',
        submittedBy: 'Lê Văn Đức',
        response: null,
        resolvedAt: null,
      },
      {
        title: 'Hỏi về timeline milestone Q3',
        description: 'Milestone M4 dự kiến hoàn thành cuối tháng 6, nhưng chúng tôi chưa nhận được thông báo nào từ team. Xin cập nhật tiến độ.',
        priority: 'LOW',
        status: 'RESOLVED',
        submittedBy: 'Phạm Thị Mai',
        response: 'Milestone M4 đang hoàn thiện 90%, dự kiến bàn giao ngày 28/06. Team sẽ gửi email xác nhận sớm.',
        resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        title: 'Đề xuất tính năng: Dashboard tùy chỉnh theo vai trò',
        description: 'Chúng tôi mong muốn có khả năng cấu hình dashboard riêng cho từng bộ phận (kế toán, sales, vận hành). Đây có phải là tính năng có thể thêm trong giai đoạn 4 không?',
        priority: 'LOW',
        status: 'CLOSED',
        submittedBy: 'Nguyễn Văn An',
        response: 'Tính năng này sẽ được đưa vào backlog cho Phase 4. Cảm ơn đề xuất của bạn.',
        resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        title: 'Lỗi nghiêm trọng: Hệ thống import dữ liệu bị treo',
        description: 'Tính năng import dữ liệu từ Excel bị treo tại 67% khi file có hơn 5000 dòng. Server timeout sau 30 giây. Ảnh hưởng nghiêm trọng đến việc migration dữ liệu.',
        priority: 'URGENT',
        status: 'IN_PROGRESS',
        submittedBy: 'Trần Minh Khoa',
        response: 'Team đang điều tra. Tạm thời vui lòng split file thành từng batch 1000 dòng.',
        resolvedAt: null,
      },
    ];

    for (const t of tickets) {
      await client.query(
        `INSERT INTO customer_tickets
           (id, portal_id, title, description, priority, status, submitted_by, response, resolved_at, created_at, updated_at)
         VALUES
           (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8,
            NOW() - (random() * INTERVAL '20 days'),
            NOW() - (random() * INTERVAL '5 days'))
         ON CONFLICT DO NOTHING`,
        [
          activePortal.id,
          t.title,
          t.description,
          t.priority,
          t.status,
          t.submittedBy,
          t.response,
          t.resolvedAt,
        ]
      );
    }

    console.log(`✅ ${tickets.length} tickets seeded for portal "${activePortal.name}"`);

    // Print shareable links
    console.log('\n📋 Portal links (use these to test public portal view):');
    for (const p of createdPortals) {
      console.log(`  ${p.name}: /portal/${p.token}`);
    }

    console.log('\n✨ Customer Portal seed complete!');

  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
