// Seed default tenant và migrate existing data sang tenantId
// Dùng pg trực tiếp vì Prisma v7 yêu cầu adapter riêng cho scripts độc lập

try { require('dotenv').config(); } catch(e) {}

const { Client } = require('pg');

const DEFAULT_TENANT_ID = 'loop-default-tenant-001';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // 1. Tạo default tenant nếu chưa có
    const existing = await client.query(
      `SELECT id FROM tenants WHERE slug = 'default' LIMIT 1`
    );

    if (existing.rows.length === 0) {
      await client.query(`
        INSERT INTO tenants (id, name, slug, is_default, timezone, is_active, created_at, updated_at)
        VALUES ($1, 'Loop Default', 'default', true, 'Asia/Ho_Chi_Minh', true, NOW(), NOW())
      `, [DEFAULT_TENANT_ID]);
      console.log('✓ Default tenant tạo mới:', DEFAULT_TENANT_ID);
    } else {
      console.log('✓ Default tenant đã tồn tại:', existing.rows[0].id);
    }

    // 2. Migrate existing data — set tenant_id cho tất cả row hiện có
    const tables = [
      'org_units', 'employees', 'projects', 'tasks', 'bugs',
      'deals', 'customers', 'contacts', 'leads', 'invoices', 'contracts',
      'assets', 'kb_articles', 'okr_objectives', 'leave_requests',
      'leave_balances', 'time_entries', 'allocations', 'process_instances',
    ];

    for (const table of tables) {
      try {
        const result = await client.query(
          `UPDATE "${table}" SET tenant_id = $1 WHERE tenant_id IS NULL`,
          [DEFAULT_TENANT_ID]
        );
        console.log(`✓ ${table}: ${result.rowCount} rows updated`);
      } catch (e) {
        console.log(`⚠ Skip ${table}: ${e.message}`);
      }
    }

    console.log('\nMigration hoàn thành.');
  } finally {
    await client.end();
  }
}

main().catch(e => {
  console.error('Lỗi:', e.message);
  process.exit(1);
});
