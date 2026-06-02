import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });

// Map loại nghỉ tiếng Anh (cũ) → tiếng Việt (chuẩn, đang active)
const MAP: Record<string, string> = {
  'Annual Leave': 'Nghỉ phép năm',
  'Sick Leave': 'Nghỉ ốm',
  'Unpaid Leave': 'Nghỉ không lương',
  'Maternity Leave': 'Nghỉ thai sản',
};

async function main() {
  const c = await pool.connect();
  try {
    console.log('🌱 Đồng bộ Loại nghỉ: gộp bản tiếng Anh → tiếng Việt...\n');

    const { rows } = await c.query(`SELECT id, name FROM leave_types`);
    const idByName = new Map<string, string>(rows.map((r: any) => [r.name, r.id]));

    for (const [en, vi] of Object.entries(MAP)) {
      const enId = idByName.get(en);
      const viId = idByName.get(vi);
      if (!enId) { console.log(`   ⓘ Bỏ qua "${en}" (không tồn tại)`); continue; }
      if (!viId) { console.log(`   ⚠️  Không tìm thấy bản tiếng Việt "${vi}" — bỏ qua`); continue; }

      await c.query('BEGIN');
      try {
        // 1) Re-point LeaveRequest English → Việt (không có unique constraint)
        const lr = await c.query(
          `UPDATE leave_requests SET leave_type_id = $1 WHERE leave_type_id = $2`,
          [viId, enId],
        );

        // 2) Re-point LeaveBalance — xử lý unique (employee, type, year):
        //    nếu Việt đã có balance cùng (employee, year) → cộng dồn used/total rồi xóa bản English
        await c.query(
          `UPDATE leave_balances eb SET
             used_days  = eb.used_days  + vb.used_days,
             total_days = GREATEST(eb.total_days, vb.total_days)
           FROM leave_balances vb
           WHERE vb.leave_type_id = $2 AND eb.leave_type_id = $1
             AND eb.employee_id = vb.employee_id AND eb.year = vb.year`,
          [viId, enId],
        );
        await c.query(
          `DELETE FROM leave_balances WHERE leave_type_id = $2
             AND EXISTS (SELECT 1 FROM leave_balances v WHERE v.leave_type_id = $1
                         AND v.employee_id = leave_balances.employee_id AND v.year = leave_balances.year)`,
          [viId, enId],
        );
        const lb = await c.query(
          `UPDATE leave_balances SET leave_type_id = $1 WHERE leave_type_id = $2`,
          [viId, enId],
        );

        // 3) Xóa loại nghỉ tiếng Anh
        await c.query(`DELETE FROM leave_types WHERE id = $1`, [enId]);
        await c.query('COMMIT');
        console.log(`   ✓ "${en}" → "${vi}"  (re-point ${lb.rowCount} balance, ${lr.rowCount} request, xóa type EN)`);
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      }
    }

    const { rows: left } = await c.query(
      `SELECT name FROM leave_types WHERE is_active = false ORDER BY name`,
    );
    console.log(`\n✅ Hoàn tất! Loại nghỉ inactive còn lại: ${left.length ? left.map((r: any) => r.name).join(', ') : '(không còn)'}`);
  } catch (e) {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  } finally {
    c.release();
    await pool.end();
  }
}

main();
