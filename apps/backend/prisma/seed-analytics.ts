/**
 * Seed Analytics — Saved Reports mẫu cho demo
 * Chạy: cd apps/backend && npx tsx prisma/seed-analytics.ts
 */

import 'dotenv/config';
import { Client } from 'pg';
import { randomUUID as uid } from 'crypto';

const DB_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/loop_db';
const db = new Client({ connectionString: DB_URL });

async function main() {
  await db.connect();
  console.log('=== Seed Saved Reports (Analytics module) ===\n');

  // Lấy admin user
  const adminRes = await db.query(`SELECT id FROM users WHERE role = 'ADMIN' ORDER BY created_at ASC LIMIT 1`);
  if (adminRes.rows.length === 0) {
    console.log('⚠️  Không tìm thấy user ADMIN — bỏ qua seed');
    return;
  }
  const adminId: string = adminRes.rows[0].id;

  const tenantRes = await db.query('SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1');
  const tenantId: string | null = tenantRes.rows[0]?.id ?? null;

  const templates = [
    {
      name: 'Doanh thu theo tháng (YTD)',
      description: 'Tổng hợp doanh thu từ đầu năm đến hiện tại, phân theo tháng',
      category: 'finance',
      is_public: true,
      definition: JSON.stringify({
        entity: 'invoice',
        columns: ['code', 'totalAmount', 'status', 'paidAt', 'type'],
        filters: [{ field: 'type', operator: '=', value: 'SALES' }, { field: 'status', operator: '=', value: 'PAID' }],
        groupBy: 'month',
        sortBy: 'paidAt',
      }),
    },
    {
      name: 'Biến động nhân sự Q này',
      description: 'Tuyển mới và nghỉ việc trong quý hiện tại theo phòng ban',
      category: 'hr',
      is_public: true,
      definition: JSON.stringify({
        entity: 'employee',
        columns: ['fullName', 'orgUnit', 'startDate', 'endDate', 'isActive'],
        filters: [],
        groupBy: 'orgUnit',
        sortBy: 'startDate',
      }),
    },
    {
      name: 'Pipeline CRM — Deals đang mở',
      description: 'Danh sách cơ hội chưa chốt, giá trị ước tính và xác suất',
      category: 'crm',
      is_public: true,
      definition: JSON.stringify({
        entity: 'deal',
        columns: ['title', 'stage', 'value', 'probability', 'expectedCloseDate'],
        filters: [{ field: 'stage', operator: '!=', value: 'WON' }],
        groupBy: 'stage',
        sortBy: 'value',
      }),
    },
    {
      name: 'Utilization nhân lực (tháng này)',
      description: 'Tỉ lệ sử dụng thực tế vs. kế hoạch theo nhân viên và dự án',
      category: 'project',
      is_public: false,
      definition: JSON.stringify({
        entity: 'timeLog',
        columns: ['employee', 'project', 'hours', 'date'],
        filters: [],
        groupBy: 'employee',
        sortBy: 'hours',
      }),
    },
    {
      name: 'Hóa đơn phải thu quá hạn',
      description: 'Danh sách invoice OVERDUE với số ngày quá hạn',
      category: 'finance',
      is_public: true,
      definition: JSON.stringify({
        entity: 'invoice',
        columns: ['code', 'totalAmount', 'dueDate', 'status'],
        filters: [{ field: 'status', operator: '=', value: 'OVERDUE' }],
        groupBy: null,
        sortBy: 'dueDate',
      }),
    },
    {
      name: 'Tổng hợp chấm công tháng',
      description: 'Số ngày đi làm, đi muộn, nghỉ phép của toàn bộ nhân viên',
      category: 'attendance',
      is_public: true,
      definition: JSON.stringify({
        entity: 'attendanceRecord',
        columns: ['employee', 'date', 'status', 'lateMinutes', 'overtimeMinutes'],
        filters: [],
        groupBy: 'employee',
        sortBy: 'date',
      }),
    },
  ];

  let created = 0;
  for (const tpl of templates) {
    const exists = await db.query(
      'SELECT id FROM saved_reports WHERE name = $1 AND created_by = $2',
      [tpl.name, adminId],
    );
    if (exists.rows.length > 0) {
      console.log(`  ⏭  Đã có: ${tpl.name}`);
      continue;
    }
    await db.query(
      `INSERT INTO saved_reports (id, name, description, category, is_public, definition, created_by, tenant_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, NOW(), NOW())`,
      [uid(), tpl.name, tpl.description, tpl.category, tpl.is_public, tpl.definition, adminId, tenantId],
    );
    console.log(`  ✅ Tạo: ${tpl.name}`);
    created++;
  }

  console.log(`\n✅ Seed hoàn tất — đã tạo ${created} saved reports\n`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => db.end());
