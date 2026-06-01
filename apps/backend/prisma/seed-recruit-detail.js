'use strict';
/**
 * seed-recruit-detail.js — Dữ liệu Tuyển dụng chi tiết
 * - 50 vị trí (job postings)
 * - 200 ứng viên (candidates)
 * - 400 ứng tuyển (applications)
 *
 * Chạy: node prisma/seed-recruit-detail.js
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

const JOB_TITLES = [
  'Senior Backend Developer', 'Frontend Developer', 'Full Stack Developer', 'DevOps Engineer',
  'QA Engineer', 'Data Analyst', 'Data Scientist', 'Product Manager', 'UX Designer',
  'Business Analyst', 'Solutions Architect', 'Cloud Engineer', 'Security Engineer',
  'Mobile Developer', 'Database Administrator', 'Technical Lead', 'Engineering Manager',
  'IT Support Specialist', 'Network Engineer', 'System Administrator'
];

const LOCATIONS = ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Remote', 'Hybrid'];
const LEVELS = ['INTERNSHIP', 'JUNIOR', 'SENIOR', 'LEAD', 'MANAGER'];
const STATUSES = ['OPEN', 'IN_PROGRESS', 'CLOSED', 'FILLED'];
const APP_STATUSES = ['NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN'];

const FIRST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Hồ', 'Dương'];
const LAST_NAMES = ['Văn An', 'Thị Hương', 'Minh Tuấn', 'Hữu Long', 'Kim Anh', 'Quốc Dũng', 'Thanh Hoa', 'Bảo Thy', 'Gia Linh', 'Thanh Nhân'];

const SKILLS = [
  'Node.js', 'React', 'Python', 'Java', 'TypeScript', 'PostgreSQL', 'MongoDB',
  'Docker', 'Kubernetes', 'AWS', 'Git', 'REST API', 'GraphQL', 'CI/CD',
  'SQL', 'JavaScript', 'HTML/CSS', 'Vue.js', 'Angular', 'Spring Boot',
  'Machine Learning', 'Data Analysis', 'Excel', 'Project Management', 'Agile'
];

async function main() {
  try {
    await db.connect();
    console.log('🧹  Xóa dữ liệu Recruit cũ...');

    const tenantResult = await db.query('SELECT id FROM tenants LIMIT 1');
    const tenantId = tenantResult.rows[0]?.id;
    if (!tenantId) throw new Error('No tenant found');

    // Get HR user
    const hrResult = await db.query(
      "SELECT id FROM users WHERE email LIKE '%@loop.vn' LIMIT 1"
    );
    const hrUserId = hrResult.rows[0]?.id;

    await db.query('DELETE FROM job_applications WHERE 1=1');
    await db.query('DELETE FROM candidates WHERE 1=1');
    await db.query('DELETE FROM job_postings WHERE 1=1');

    const now = new Date();

    // ─── JOB POSTINGS (Vị trí tuyển dụng) ───────────────────────────────────────
    console.log('📢  Tạo 50 vị trí tuyển dụng...');
    const jobIds = Array.from({ length: 50 }, () => uid());
    const jobs = jobIds.map((id, i) => {
      const createdDate = new Date(now - rand(30, 180) * 24 * 60 * 60 * 1000);
      return {
        id,
        tenant_id: tenantId,
        code: `JOB-${String(i + 1).padStart(4, '0')}`,
        title: `${pick(JOB_TITLES)} - ${i + 1}`,
        description: `Mô tả công việc chi tiết cho vị trí ${i + 1}...`,
        location: pick(LOCATIONS),
        level: pick(LEVELS),
        salary_min: rand(20, 100) * 1_000,
        salary_max: rand(100, 300) * 1_000,
        currency: 'VND',
        requirements: `${rand(2, 5)} năm kinh nghiệm, Tiếng Anh tốt`,
        benefits: 'Bảo hiểm, Thưởng hiệu suất, Phát triển kỹ năng',
        quantity: rand(1, 5),
        posted_date: createdDate,
        deadline: new Date(createdDate.getTime() + rand(15, 60) * 24 * 60 * 60 * 1000),
        status: pick(STATUSES),
        created_by: hrUserId,
        created_at: createdDate,
        updated_at: now,
      };
    });

    await bulkInsert('job_postings', [
      'id', 'tenant_id', 'code', 'title', 'description', 'location', 'level',
      'salary_min', 'salary_max', 'currency', 'requirements', 'benefits',
      'quantity', 'posted_date', 'deadline', 'status', 'created_by',
      'created_at', 'updated_at'
    ], jobs);

    // ─── CANDIDATES (Ứng viên) ────────────────────────────────────────
    console.log('👔  Tạo 200 ứng viên...');
    const candidateIds = Array.from({ length: 200 }, () => uid());
    const candidates = candidateIds.map((id, i) => ({
      id,
      tenant_id: tenantId,
      first_name: pick(FIRST_NAMES),
      last_name: pick(LAST_NAMES),
      email: `candidate${i + 1}@gmail.com`,
      phone: `09${rand(10000000, 99999999)}`,
      location: pick(LOCATIONS),
      current_position: pick(JOB_TITLES),
      skills: Array.from({ length: rand(3, 7) }, () => pick(SKILLS)).join(', '),
      experience_years: rand(0, 15),
      resume_url: `https://storage.example.com/resume-${i + 1}.pdf`,
      linkedin_url: `https://linkedin.com/in/candidate${i + 1}`,
      source: pick(['LinkedIn', 'JobPortal', 'Referral', 'Direct', 'Website']),
      notes: `Ứng viên #${i + 1}`,
      created_at: new Date(now - rand(1, 180) * 24 * 60 * 60 * 1000),
      updated_at: now,
    }));

    await bulkInsert('candidates', [
      'id', 'tenant_id', 'first_name', 'last_name', 'email', 'phone', 'location',
      'current_position', 'skills', 'experience_years', 'resume_url', 'linkedin_url',
      'source', 'notes', 'created_at', 'updated_at'
    ], candidates);

    // ─── JOB APPLICATIONS (Ứng tuyển) ────────────────────────────────────────
    console.log('📝  Tạo 400 ứng tuyển...');
    const applications = Array.from({ length: 400 }, (_, i) => {
      const jobIdx = rand(0, jobIds.length - 1);
      const candIdx = rand(0, candidateIds.length - 1);
      const appliedDate = new Date(now - rand(1, 120) * 24 * 60 * 60 * 1000);

      return {
        id: uid(),
        tenant_id: tenantId,
        job_id: jobIds[jobIdx],
        candidate_id: candidateIds[candIdx],
        status: pick(APP_STATUSES),
        rating: rand(2, 5),
        notes: `Ứng tuyển #${i + 1} - Đánh giá chi tiết...`,
        applied_date: appliedDate,
        reviewed_date: rand(0, 1) ? new Date(appliedDate.getTime() + rand(1, 30) * 24 * 60 * 60 * 1000) : null,
        reviewer_id: hrUserId,
        created_at: appliedDate,
        updated_at: now,
      };
    });

    await bulkInsert('job_applications', [
      'id', 'tenant_id', 'job_id', 'candidate_id', 'status', 'rating', 'notes',
      'applied_date', 'reviewed_date', 'reviewer_id', 'created_at', 'updated_at'
    ], applications);

    const hiredCount = applications.filter(a => a.status === 'HIRED').length;
    const rejectedCount = applications.filter(a => a.status === 'REJECTED').length;

    console.log(`
✅  Seed Recruit hoàn tất!
   Job Postings    : 50  (${jobs.filter(j => j.status === 'OPEN').length} mở)
   Candidates      : 200
   Applications    : 400
   - Hired         : ${hiredCount}
   - Rejected      : ${rejectedCount}
   - In Progress   : ${400 - hiredCount - rejectedCount}
    `);

    await db.end();
  } catch (e) {
    console.error('❌ Lỗi:', e.message);
    process.exit(1);
  }
}

main();
