'use strict';
/**
 * seed-skill-matrix.js — Demo data cho Skill Matrix
 * Chạy: node prisma/seed-skill-matrix.js
 */

require('dotenv/config');
const { Client } = require('pg');
const { randomUUID: uid } = require('crypto');

const db = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db',
});

async function main() {
  await db.connect();

  // Xóa dữ liệu cũ
  await db.query('DELETE FROM employee_skills');
  await db.query('DELETE FROM skills');

  // ─── 1. Tạo danh mục skills ───────────────────────────────────────────────
  const skillDefs = [
    // TECHNICAL
    { name: 'TypeScript',         category: 'TECHNICAL',      desc: 'Ngôn ngữ lập trình TypeScript' },
    { name: 'React',              category: 'TECHNICAL',      desc: 'Thư viện UI React' },
    { name: 'NestJS',             category: 'TECHNICAL',      desc: 'Framework backend Node.js' },
    { name: 'PostgreSQL',         category: 'TECHNICAL',      desc: 'Cơ sở dữ liệu quan hệ' },
    { name: 'Docker',             category: 'TECHNICAL',      desc: 'Container & orchestration' },
    { name: 'AWS / Cloud',        category: 'TECHNICAL',      desc: 'Dịch vụ điện toán đám mây' },
    { name: 'Python',             category: 'TECHNICAL',      desc: 'Ngôn ngữ lập trình Python' },
    { name: 'Redis',              category: 'TECHNICAL',      desc: 'In-memory data store' },
    // SOFT
    { name: 'Communication',      category: 'SOFT',           desc: 'Kỹ năng giao tiếp hiệu quả' },
    { name: 'Leadership',         category: 'SOFT',           desc: 'Kỹ năng lãnh đạo nhóm' },
    { name: 'Problem Solving',    category: 'SOFT',           desc: 'Tư duy giải quyết vấn đề' },
    { name: 'Time Management',    category: 'SOFT',           desc: 'Quản lý thời gian' },
    // LANGUAGE
    { name: 'English',            category: 'LANGUAGE',       desc: 'Tiếng Anh' },
    { name: 'Japanese',           category: 'LANGUAGE',       desc: 'Tiếng Nhật' },
    // DOMAIN
    { name: 'ERP Systems',        category: 'DOMAIN',         desc: 'Hiểu biết hệ thống ERP' },
    { name: 'Agile / Scrum',      category: 'DOMAIN',         desc: 'Phương pháp phát triển Agile' },
    { name: 'Financial Analysis', category: 'DOMAIN',         desc: 'Phân tích tài chính' },
    // CERTIFICATION
    { name: 'AWS Certified',      category: 'CERTIFICATION',  desc: 'AWS Solutions Architect' },
    { name: 'PMP',                category: 'CERTIFICATION',  desc: 'Project Management Professional' },
  ];

  const skillRows = [];
  for (const s of skillDefs) {
    const id = uid();
    await db.query(
      `INSERT INTO skills (id, name, category, description, is_active, created_at)
       VALUES ($1, $2, $3, $4, true, NOW())`,
      [id, s.name, s.category, s.desc],
    );
    skillRows.push({ id, ...s });
  }

  const byName = (name) => skillRows.find(s => s.name === name)?.id;

  // ─── 2. Lấy danh sách nhân viên ──────────────────────────────────────────
  const { rows: emps } = await db.query(
    `SELECT id, code FROM employees ORDER BY code LIMIT 12`,
  );
  const empById = Object.fromEntries(emps.map(e => [e.code, e.id]));

  // ─── 3. Gán skill cho nhân viên ──────────────────────────────────────────
  const assignments = [
    // EMP001 — Admin (DevOps focus)
    { code: 'EMP001', skill: 'TypeScript',       level: 'ADVANCED',     years: 4 },
    { code: 'EMP001', skill: 'Docker',            level: 'EXPERT',       years: 5 },
    { code: 'EMP001', skill: 'AWS / Cloud',       level: 'ADVANCED',     years: 3 },
    { code: 'EMP001', skill: 'PostgreSQL',        level: 'INTERMEDIATE', years: 3 },
    { code: 'EMP001', skill: 'Leadership',        level: 'ADVANCED',     years: 4 },
    { code: 'EMP001', skill: 'English',           level: 'ADVANCED',     years: 8 },
    { code: 'EMP001', skill: 'AWS Certified',     level: 'EXPERT',       years: 2, cert: '2024-03-15' },

    // EMP002 — PM
    { code: 'EMP002', skill: 'Agile / Scrum',     level: 'EXPERT',       years: 6 },
    { code: 'EMP002', skill: 'Leadership',        level: 'EXPERT',       years: 5 },
    { code: 'EMP002', skill: 'Communication',     level: 'EXPERT',       years: 7 },
    { code: 'EMP002', skill: 'Time Management',   level: 'ADVANCED',     years: 5 },
    { code: 'EMP002', skill: 'Problem Solving',   level: 'ADVANCED',     years: 5 },
    { code: 'EMP002', skill: 'English',           level: 'EXPERT',       years: 10 },
    { code: 'EMP002', skill: 'PMP',               level: 'EXPERT',       years: 3, cert: '2023-07-01' },
    { code: 'EMP002', skill: 'ERP Systems',       level: 'ADVANCED',     years: 4 },

    // EMP003 — Frontend Dev
    { code: 'EMP003', skill: 'TypeScript',        level: 'EXPERT',       years: 5 },
    { code: 'EMP003', skill: 'React',             level: 'EXPERT',       years: 5 },
    { code: 'EMP003', skill: 'Communication',     level: 'INTERMEDIATE', years: 3 },
    { code: 'EMP003', skill: 'English',           level: 'INTERMEDIATE', years: 5 },
    { code: 'EMP003', skill: 'Problem Solving',   level: 'ADVANCED',     years: 4 },

    // EMP004 — Backend Dev
    { code: 'EMP004', skill: 'TypeScript',        level: 'ADVANCED',     years: 3 },
    { code: 'EMP004', skill: 'NestJS',            level: 'ADVANCED',     years: 3 },
    { code: 'EMP004', skill: 'PostgreSQL',        level: 'EXPERT',       years: 5 },
    { code: 'EMP004', skill: 'Redis',             level: 'ADVANCED',     years: 2 },
    { code: 'EMP004', skill: 'Docker',            level: 'INTERMEDIATE', years: 2 },
    { code: 'EMP004', skill: 'English',           level: 'INTERMEDIATE', years: 4 },
    { code: 'EMP004', skill: 'Problem Solving',   level: 'ADVANCED',     years: 3 },

    // EMP005 — Junior Dev
    { code: 'EMP005', skill: 'TypeScript',        level: 'BEGINNER',     years: 1 },
    { code: 'EMP005', skill: 'React',             level: 'INTERMEDIATE', years: 1 },
    { code: 'EMP005', skill: 'Communication',     level: 'INTERMEDIATE', years: 2 },
    { code: 'EMP005', skill: 'English',           level: 'INTERMEDIATE', years: 3 },

    // EMP006 — Full Stack
    { code: 'EMP006', skill: 'TypeScript',        level: 'ADVANCED',     years: 3 },
    { code: 'EMP006', skill: 'React',             level: 'ADVANCED',     years: 3 },
    { code: 'EMP006', skill: 'NestJS',            level: 'INTERMEDIATE', years: 2 },
    { code: 'EMP006', skill: 'PostgreSQL',        level: 'INTERMEDIATE', years: 2 },
    { code: 'EMP006', skill: 'Docker',            level: 'BEGINNER',     years: 1 },
    { code: 'EMP006', skill: 'English',           level: 'ADVANCED',     years: 5 },
    { code: 'EMP006', skill: 'Agile / Scrum',     level: 'INTERMEDIATE', years: 2 },

    // EMP007 — Data / Python Dev
    { code: 'EMP007', skill: 'Python',            level: 'EXPERT',       years: 5 },
    { code: 'EMP007', skill: 'PostgreSQL',        level: 'ADVANCED',     years: 4 },
    { code: 'EMP007', skill: 'AWS / Cloud',       level: 'INTERMEDIATE', years: 2 },
    { code: 'EMP007', skill: 'Financial Analysis',level: 'INTERMEDIATE', years: 2 },
    { code: 'EMP007', skill: 'English',           level: 'ADVANCED',     years: 6 },
    { code: 'EMP007', skill: 'Japanese',          level: 'INTERMEDIATE', years: 2 },
    { code: 'EMP007', skill: 'Communication',     level: 'INTERMEDIATE', years: 3 },

    // EMP008 — QA/Tester
    { code: 'EMP008', skill: 'Problem Solving',   level: 'ADVANCED',     years: 4 },
    { code: 'EMP008', skill: 'Communication',     level: 'ADVANCED',     years: 4 },
    { code: 'EMP008', skill: 'Agile / Scrum',     level: 'ADVANCED',     years: 3 },
    { code: 'EMP008', skill: 'TypeScript',        level: 'INTERMEDIATE', years: 2 },
    { code: 'EMP008', skill: 'English',           level: 'INTERMEDIATE', years: 3 },
    { code: 'EMP008', skill: 'ERP Systems',       level: 'INTERMEDIATE', years: 2 },

    // EMP009 — Finance
    { code: 'EMP009', skill: 'Financial Analysis',level: 'EXPERT',       years: 7 },
    { code: 'EMP009', skill: 'ERP Systems',       level: 'ADVANCED',     years: 5 },
    { code: 'EMP009', skill: 'Communication',     level: 'ADVANCED',     years: 5 },
    { code: 'EMP009', skill: 'Time Management',   level: 'ADVANCED',     years: 5 },
    { code: 'EMP009', skill: 'English',           level: 'INTERMEDIATE', years: 4 },

    // EMP010 — HR
    { code: 'EMP010', skill: 'Communication',     level: 'EXPERT',       years: 6 },
    { code: 'EMP010', skill: 'Leadership',        level: 'INTERMEDIATE', years: 3 },
    { code: 'EMP010', skill: 'Time Management',   level: 'EXPERT',       years: 5 },
    { code: 'EMP010', skill: 'ERP Systems',       level: 'INTERMEDIATE', years: 3 },
    { code: 'EMP010', skill: 'English',           level: 'INTERMEDIATE', years: 4 },

    // EMP011 — Senior Backend
    { code: 'EMP011', skill: 'TypeScript',        level: 'EXPERT',       years: 6 },
    { code: 'EMP011', skill: 'NestJS',            level: 'EXPERT',       years: 4 },
    { code: 'EMP011', skill: 'PostgreSQL',        level: 'EXPERT',       years: 6 },
    { code: 'EMP011', skill: 'Redis',             level: 'EXPERT',       years: 3 },
    { code: 'EMP011', skill: 'Docker',            level: 'ADVANCED',     years: 4 },
    { code: 'EMP011', skill: 'AWS / Cloud',       level: 'ADVANCED',     years: 3 },
    { code: 'EMP011', skill: 'Python',            level: 'INTERMEDIATE', years: 2 },
    { code: 'EMP011', skill: 'English',           level: 'ADVANCED',     years: 7 },
    { code: 'EMP011', skill: 'Problem Solving',   level: 'EXPERT',       years: 5 },
    { code: 'EMP011', skill: 'AWS Certified',     level: 'ADVANCED',     years: 1, cert: '2025-01-20' },

    // EMP012 — Tech Lead
    { code: 'EMP012', skill: 'TypeScript',        level: 'EXPERT',       years: 7 },
    { code: 'EMP012', skill: 'React',             level: 'EXPERT',       years: 6 },
    { code: 'EMP012', skill: 'NestJS',            level: 'EXPERT',       years: 5 },
    { code: 'EMP012', skill: 'PostgreSQL',        level: 'ADVANCED',     years: 5 },
    { code: 'EMP012', skill: 'Docker',            level: 'EXPERT',       years: 5 },
    { code: 'EMP012', skill: 'AWS / Cloud',       level: 'EXPERT',       years: 4 },
    { code: 'EMP012', skill: 'Leadership',        level: 'EXPERT',       years: 5 },
    { code: 'EMP012', skill: 'Agile / Scrum',     level: 'EXPERT',       years: 6 },
    { code: 'EMP012', skill: 'Communication',     level: 'ADVANCED',     years: 6 },
    { code: 'EMP012', skill: 'English',           level: 'EXPERT',       years: 10 },
    { code: 'EMP012', skill: 'Japanese',          level: 'BEGINNER',     years: 1 },
    { code: 'EMP012', skill: 'Problem Solving',   level: 'EXPERT',       years: 7 },
  ];

  let ok = 0;
  let skip = 0;
  for (const a of assignments) {
    const empId = empById[a.code];
    const skillId = byName(a.skill);
    if (!empId || !skillId) { skip++; continue; }
    await db.query(
      `INSERT INTO employee_skills (id, employee_id, skill_id, level, years_exp, certified_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (employee_id, skill_id) DO UPDATE
         SET level = $4, years_exp = $5, certified_at = $6, updated_at = NOW()`,
      [uid(), empId, skillId, a.level, a.years ?? 0, a.cert ?? null],
    );
    ok++;
  }

  console.log(`✅ Đã tạo ${skillRows.length} skills, ${ok} gán kỹ năng cho nhân viên (${skip} bỏ qua).`);
  await db.end();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
