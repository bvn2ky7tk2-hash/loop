import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });

const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)]!;
const rand = (lo: number, hi: number) => Math.floor(Math.random() * (hi - lo + 1)) + lo;

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ'];
const TEN = ['Văn An', 'Thị Hương', 'Minh Tuấn', 'Hữu Long', 'Kim Anh', 'Quốc Dũng', 'Thanh Hoa', 'Ngọc Mai', 'Đức Thắng', 'Bích Ngọc'];
const QUANHE = ['Vợ', 'Chồng', 'Cha', 'Mẹ', 'Anh trai', 'Chị gái', 'Em ruột'];
const MAU = ['A', 'B', 'AB', 'O'];
const SUCKHOE = ['Bình thường', 'Tốt', 'Cận thị nhẹ', 'Dị ứng hải sản', 'Huyết áp thấp', 'Không có bệnh nền'];

async function main() {
  const c = await pool.connect();
  try {
    console.log('🌱 Seed hồ sơ HR đầy đủ (liên hệ khẩn cấp, y tế, MST)...\n');

    const { rows: emps } = await c.query(
      `SELECT id, code FROM employees WHERE deleted_at IS NULL`,
    );
    console.log(`👥 ${emps.length} nhân viên`);

    // 1) Liên hệ khẩn cấp + y tế + giám hộ + SĐT phụ
    let updated = 0;
    for (const e of emps) {
      const name = `${pick(HO)} ${pick(TEN)}`;
      const phone = `09${rand(10_000_000, 99_999_999)}`;
      const phone2 = `08${rand(10_000_000, 99_999_999)}`;
      await c.query(
        `UPDATE employees SET
           secondary_phone = $2,
           emergency_contact_name = $3,
           emergency_contact_phone = $4,
           emergency_contact_relation = $5,
           blood_type = $6,
           health_note = $7,
           guardian_name = $8
         WHERE id = $1`,
        [e.id, phone2, name, phone, pick(QUANHE), pick(MAU), pick(SUCKHOE),
         Math.random() < 0.15 ? `${pick(HO)} ${pick(TEN)}` : null],
      );
      updated++;
    }
    console.log(`   ✓ Cập nhật liên hệ khẩn cấp/y tế cho ${updated} NV`);

    // 2) EmployeeTaxProfile (MST + vùng lương) cho NV chưa có
    let tax = 0;
    for (const e of emps) {
      const taxId = `${rand(1_000_000_000, 9_999_999_999)}`;
      const r = await c.query(
        `INSERT INTO employee_tax_profiles (employee_id, tax_id, residency_status, wage_zone, updated_at)
         VALUES ($1, $2, 'RESIDENT', $3, NOW())
         ON CONFLICT (employee_id) DO UPDATE SET tax_id = EXCLUDED.tax_id, wage_zone = EXCLUDED.wage_zone, updated_at = NOW()`,
        [e.id, taxId, rand(1, 4)],
      );
      tax += r.rowCount ?? 0;
    }
    console.log(`   ✓ Tax profile (MST + vùng lương): ${tax} NV`);

    const { rows: check } = await c.query(
      `SELECT
         (SELECT COUNT(*) FROM employees WHERE emergency_contact_name IS NOT NULL) AS ec,
         (SELECT COUNT(*) FROM employee_tax_profiles WHERE tax_id IS NOT NULL) AS mst`,
    );
    console.log(`\n✅ Hoàn tất! Liên hệ khẩn cấp: ${check[0].ec} · MST: ${check[0].mst}`);
  } catch (e) {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  } finally {
    c.release();
    await pool.end();
  }
}

main();
