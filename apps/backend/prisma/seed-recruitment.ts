import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, JobStatus, CandidateStage, InterviewType, InterviewResult, EmployeeLevel, LeadSource } from '../src/generated/prisma';
import dayjs from 'dayjs';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const JOB_TITLES = [
  'Senior Backend Developer',
  'Frontend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'QA Engineer',
  'Data Analyst',
  'Product Manager',
  'UX Designer',
  'Business Analyst',
  'Solutions Architect',
  'Cloud Engineer',
  'Mobile Developer',
  'Database Administrator',
  'Technical Lead',
];

const LEVELS: EmployeeLevel[] = ['JUNIOR', 'MID', 'SENIOR', 'EXPERT'];
const STATUSES: JobStatus[] = ['OPEN', 'ON_HOLD', 'CLOSED'];
const STAGES: CandidateStage[] = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];
const SOURCES: LeadSource[] = ['WEBSITE', 'REFERRAL', 'SOCIAL', 'EVENT', 'COLD_OUTREACH'];
const INTERVIEW_TYPES: InterviewType[] = ['PHONE', 'TECHNICAL', 'HR', 'FINAL'];
const INTERVIEW_RESULTS: InterviewResult[] = ['PENDING', 'PASS', 'FAIL'];

const FIRST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi'];
const LAST_NAMES = ['Văn An', 'Thị Hương', 'Minh Tuấn', 'Hữu Long', 'Kim Anh', 'Quốc Dũng'];

const SKILLS = [
  'Node.js', 'React', 'Python', 'Java', 'TypeScript', 'PostgreSQL', 'MongoDB',
  'Docker', 'Kubernetes', 'AWS', 'Git', 'REST API', 'GraphQL', 'CI/CD'
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(lo: number, hi: number): number {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

async function main() {
  console.log('🌱 Seeding Recruitment Data...\n');

  // Get org units
  const orgUnits = await prisma.orgUnit.findMany({ take: 10 });
  if (orgUnits.length === 0) {
    console.log('❌ No org units found. Please run seed:mega first.');
    return;
  }

  console.log('📢 Creating Job Openings...');
  const jobOpenings = await Promise.all(
    Array.from({ length: 20 }, async (_, i) => {
      const createdDate = dayjs().subtract(rand(10, 60), 'days').toDate();
      return prisma.jobOpening.create({
        data: {
          code: `JO-${String(i + 1).padStart(4, '0')}`,
          title: `${pick(JOB_TITLES)} (${i + 1})`,
          orgUnitId: pick(orgUnits).id,
          level: pick(LEVELS),
          headcount: rand(1, 3),
          status: pick(STATUSES),
          requirements: `${rand(2, 8)} năm kinh nghiệm, Tiếng Anh tốt, Kỹ năng: ${Array.from({length: rand(2,4)}, () => pick(SKILLS)).join(', ')}`,
          salaryFrom: Math.floor(rand(20, 60) * 1_000_000 / 1_000) * 1_000,
          salaryTo: Math.floor(rand(80, 200) * 1_000_000 / 1_000) * 1_000,
          createdAt: createdDate,
          updatedAt: createdDate,
        },
      });
    })
  );
  console.log(`   ✓ ${jobOpenings.length} job openings created\n`);

  console.log('👤 Creating Candidates...');
  const candidates = await Promise.all(
    Array.from({ length: 80 }, async (_, i) => {
      const jobOpening = pick(jobOpenings);
      const appliedDate = dayjs().subtract(rand(1, 30), 'days').toDate();

      return prisma.candidate.create({
        data: {
          name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
          email: `candidate${i + 1}@example.com`,
          phone: `09${String(rand(10000000, 99999999)).slice(0, 8)}`,
          stage: pick(STAGES),
          source: pick(SOURCES),
          expectedSalary: Math.floor(rand(40, 150) * 1_000_000 / 1_000) * 1_000,
          notes: `Ứng viên #${i + 1} - Kỹ năng: ${Array.from({length: rand(2,5)}, () => pick(SKILLS)).join(', ')}`,
          jobOpeningId: jobOpening.id,
          createdAt: appliedDate,
          updatedAt: appliedDate,
        },
      });
    })
  );
  console.log(`   ✓ ${candidates.length} candidates created\n`);

  console.log('📅 Creating Interviews...');
  let interviewCount = 0;
  for (const candidate of candidates) {
    // 60% candidates have interviews
    if (Math.random() > 0.4) {
      const numInterviews = rand(1, 3);
      for (let j = 0; j < numInterviews; j++) {
        await prisma.interview.create({
          data: {
            candidateId: candidate.id,
            type: pick(INTERVIEW_TYPES),
            scheduledAt: dayjs().add(rand(1, 30), 'days').add(rand(0, 8), 'hours').toDate(),
            location: Math.random() > 0.3 ? pick(['Hà Nội', 'TP.HCM', 'Đà Nẵng']) : null,
            meetingUrl: Math.random() > 0.5 ? `https://meet.google.com/interview-${candidate.id}-${j}` : null,
            interviewers: [`interviewer${rand(1, 5)}@example.com`],
            result: candidate.stage === 'HIRED' ? 'PASS' : pick(INTERVIEW_RESULTS),
            score: ['INTERVIEW', 'FINAL'].includes(pick(INTERVIEW_TYPES)) ? rand(60, 100) : null,
            notes: `Interview #${j + 1} for ${candidate.name}`,
          },
        });
        interviewCount++;
      }
    }
  }
  console.log(`   ✓ ${interviewCount} interviews created\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ RECRUITMENT SEED COMPLETED!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`
📢 Job Openings  : ${jobOpenings.length}
👤 Candidates    : ${candidates.length}
📅 Interviews    : ${interviewCount}
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
