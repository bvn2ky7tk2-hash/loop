'use strict';
/**
 * seed-skills.js — Seed demo data cho Skill Matrix
 * Chạy: node prisma/seed-skills.js
 */

require('dotenv/config');
const { Client } = require('pg');
const { randomUUID: uid } = require('crypto');

const db = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db',
});

const skills = [
  // TECHNICAL
  { id: uid(), name: 'React',          category: 'TECHNICAL',     description: 'React.js frontend framework', isActive: true },
  { id: uid(), name: 'Node.js',        category: 'TECHNICAL',     description: 'Node.js runtime', isActive: true },
  { id: uid(), name: 'TypeScript',     category: 'TECHNICAL',     description: 'TypeScript language', isActive: true },
  { id: uid(), name: 'NestJS',         category: 'TECHNICAL',     description: 'NestJS backend framework', isActive: true },
  { id: uid(), name: 'PostgreSQL',     category: 'TECHNICAL',     description: 'PostgreSQL database', isActive: true },
  { id: uid(), name: 'Docker',         category: 'TECHNICAL',     description: 'Container & orchestration', isActive: true },
  { id: uid(), name: 'Python',         category: 'TECHNICAL',     description: 'Python programming', isActive: true },
  { id: uid(), name: 'AWS',            category: 'TECHNICAL',     description: 'Amazon Web Services', isActive: true },
  { id: uid(), name: 'React Native',   category: 'TECHNICAL',     description: 'Mobile development', isActive: true },
  // SOFT
  { id: uid(), name: 'Leadership',     category: 'SOFT',          description: 'Team leadership skills', isActive: true },
  { id: uid(), name: 'Communication',  category: 'SOFT',          description: 'Communication skills', isActive: true },
  { id: uid(), name: 'Problem Solving',category: 'SOFT',          description: 'Analytical & problem solving', isActive: true },
  // LANGUAGE
  { id: uid(), name: 'English',        category: 'LANGUAGE',      description: 'English proficiency', isActive: true },
  { id: uid(), name: 'Japanese',       category: 'LANGUAGE',      description: 'Japanese proficiency', isActive: true },
  // DOMAIN
  { id: uid(), name: 'ERP Systems',    category: 'DOMAIN',        description: 'Enterprise resource planning', isActive: true },
  { id: uid(), name: 'Fintech',        category: 'DOMAIN',        description: 'Financial technology domain', isActive: true },
  // CERTIFICATION
  { id: uid(), name: 'AWS SAA',        category: 'CERTIFICATION', description: 'AWS Solutions Architect Associate', isActive: true },
  { id: uid(), name: 'PMP',            category: 'CERTIFICATION', description: 'Project Management Professional', isActive: true },
];

const skillMap = {};

const employeeSkillData = [
  // Phân công ngẫu nhiên dựa trên level nhân viên
  // Level: BEGINNER(1★) INTERMEDIATE(2★) ADVANCED(3★) EXPERT(4★)
];

async function main() {
  await db.connect();

  // Insert skills
  let inserted = 0;
  for (const s of skills) {
    const exists = await db.query(`SELECT id FROM skills WHERE name = $1`, [s.name]);
    if (exists.rows.length) {
      skillMap[s.name] = exists.rows[0].id;
      continue;
    }
    await db.query(
      `INSERT INTO skills (id, name, category, description, is_active, created_at)
       VALUES ($1,$2,$3,$4,$5,NOW())`,
      [s.id, s.name, s.category, s.description, s.isActive],
    );
    skillMap[s.name] = s.id;
    inserted++;
  }
  console.log(`✓ ${inserted} skills seeded`);

  // Lấy nhân viên
  const emps = await db.query(`SELECT id, full_name, level FROM employees WHERE is_active = true LIMIT 20`);
  if (!emps.rows.length) { console.log('⚠ Không có employees'); await db.end(); return; }

  const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
  const pickLevel = (empLevel) => {
    const base = { JUNIOR: 1, MID: 2, SENIOR: 3, LEAD: 3, MANAGER: 2, DIRECTOR: 1 }[empLevel] ?? 2;
    return LEVELS[Math.min(3, Math.max(0, base - 1 + Math.floor(Math.random() * 2)))];
  };

  const skillNames = Object.keys(skillMap);
  const techSkills = skillNames.filter(n => ['React','Node.js','TypeScript','NestJS','PostgreSQL','Docker','Python','AWS','React Native'].includes(n));
  const softSkills = skillNames.filter(n => ['Leadership','Communication','Problem Solving'].includes(n));
  const langSkills = skillNames.filter(n => ['English','Japanese'].includes(n));

  let empSkillCount = 0;
  for (const emp of emps.rows) {
    // Mỗi nhân viên có 3-6 technical skills + 2 soft skills + 1 language
    const shuffle = arr => arr.sort(() => Math.random() - 0.5);
    const myTech = shuffle([...techSkills]).slice(0, 3 + Math.floor(Math.random() * 4));
    const mySoft = shuffle([...softSkills]).slice(0, 2);
    const myLang = shuffle([...langSkills]).slice(0, 1);
    const mySkills = [...myTech, ...mySoft, ...myLang];

    for (const skillName of mySkills) {
      const skillId = skillMap[skillName];
      const level = pickLevel(emp.level);
      const yearsExp = Math.floor(Math.random() * 5) + 1;
      const exists = await db.query(`SELECT id FROM employee_skills WHERE employee_id = $1 AND skill_id = $2`, [emp.id, skillId]);
      if (exists.rows.length) continue;
      await db.query(
        `INSERT INTO employee_skills (id, employee_id, skill_id, level, years_exp, updated_at)
         VALUES ($1,$2,$3,$4,$5,NOW())`,
        [uid(), emp.id, skillId, level, yearsExp],
      );
      empSkillCount++;
    }
  }
  console.log(`✓ ${empSkillCount} employee skills seeded`);

  await db.end();
}

main().catch(e => { console.error(e); process.exit(1); });
