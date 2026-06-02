import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)]!;
const rand = (lo: number, hi: number) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const sample = <T>(a: T[], n: number): T[] => [...a].sort(() => Math.random() - 0.5).slice(0, n);

const EDU = ['Trung cấp', 'Cao đẳng', 'Đại học', 'Thạc sĩ', 'Tiến sĩ'];
const CITIES = ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Bình Dương', 'Đồng Nai'];
const COMPANIES = ['FPT Software', 'Viettel', 'VNG', 'Tiki', 'Shopee', 'MoMo', 'VNPT', 'CMC', 'Axon Active', 'KMS Technology'];
const POSITIONS = ['Junior Developer', 'Developer', 'Senior Developer', 'Tech Lead', 'Business Analyst', 'QA Engineer', 'DevOps Engineer', 'Product Manager', 'UI/UX Designer'];
const SKILLS = ['React', 'Node.js', 'TypeScript', 'Java', 'Python', 'Go', 'PostgreSQL', 'Docker', 'Kubernetes', 'AWS', 'NestJS', 'Vue', 'Spring Boot', 'Figma', 'Scrum'];

async function main() {
  const c = await pool.connect();
  try {
    console.log('🌱 Seed hồ sơ ứng viên đầy đủ...\n');
    const { rows } = await c.query(`SELECT id FROM candidates`);
    let n = 0;
    for (const r of rows) {
      const years = rand(0, 12);
      const edu = years >= 6 ? pick(['Đại học', 'Thạc sĩ', 'Tiến sĩ']) : pick(EDU);
      const birthYear = 2026 - rand(22, 45);
      await c.query(
        `UPDATE candidates SET
           education_level = $2, address = $3, years_of_experience = $4,
           current_position = $5, current_company = $6, skills = $7,
           birthdate = $8
         WHERE id = $1`,
        [
          r.id, edu, `${pick(['Quận', 'Huyện'])} ${rand(1, 12)}, ${pick(CITIES)}`,
          years, pick(POSITIONS), pick(COMPANIES), sample(SKILLS, rand(2, 5)),
          `${birthYear}-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}`,
        ],
      );
      n++;
    }
    console.log(`✅ Cập nhật hồ sơ đầy đủ cho ${n} ứng viên (học vấn, địa chỉ, KN, kỹ năng, ngày sinh).`);
  } catch (e) {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  } finally {
    c.release();
    await pool.end();
  }
}

main();
