import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';
import dayjs from 'dayjs';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding Feed + Activity Data...\n');

  const users = await prisma.user.findMany({ take: 50 });
  const employees = await prisma.employee.findMany({ take: 100 });
  const projects = await prisma.project.findMany({ take: 10 });
  const tasks = await prisma.task.findMany({ take: 50 });

  if (users.length === 0) {
    console.log('❌ No users found. Run seed:mega first.');
    return;
  }

  // ─────────────────────────────────────────────────────────────────
  // 1. SYSTEM ANNOUNCEMENTS (Thông báo hệ thống)
  // ─────────────────────────────────────────────────────────────────
  console.log('📢 Creating System Announcements...');
  let announcementCount = 0;

  const announcements = [
    {
      title: 'Nâng cấp hệ thống v5.9',
      content: 'Loop 360 v5.9 đã phát hành với cải tiến hiệu năng và tính năng mới.',
      priority: 'HIGH' as any,
    },
    {
      title: 'Bảo trì hệ thống - 02/06/2026',
      content: 'Hệ thống sẽ bảo trì từ 22:00-23:00. Vui lòng lưu công việc của bạn.',
      priority: 'CRITICAL' as any,
    },
    {
      title: 'Kích hoạt tính năng Payroll Analytics',
      content: 'Báo cáo lương chi tiết đã khả dụng. Truy cập Finance > Analytics > Payroll.',
      priority: 'MEDIUM' as any,
    },
    {
      title: 'Chính sách bảo mật dữ liệu',
      content: 'Vui lòng cập nhật mật khẩu hàng tháng để bảo vệ tài khoản.',
      priority: 'LOW' as any,
    },
    {
      title: 'Tuyển dụng nhân viên kỹ thuật',
      content: 'Đang tuyển 10 vị trí Software Engineer. Chi tiết: HR > Job Openings.',
      priority: 'MEDIUM' as any,
    },
  ];

  for (const ann of announcements) {
    try {
      await prisma.systemAnnouncement.create({
        data: {
          title: ann.title,
          content: ann.content,
          priority: ann.priority,
          publishedAt: dayjs().subtract(Math.random() * 30, 'days').toDate(),
          expiresAt: dayjs().add(Math.random() * 60 + 10, 'days').toDate(),
          isActive: true,
        },
      });
      announcementCount++;
    } catch (e) {
      // Skip duplicates
    }
  }
  console.log(`   ✓ ${announcementCount} system announcements created\n`);

  // ─────────────────────────────────────────────────────────────────
  // 2. APP CHANGELOGS (Nhật ký thay đổi)
  // ─────────────────────────────────────────────────────────────────
  console.log('📝 Creating App Changelogs...');
  let changelogCount = 0;

  const changelogs = [
    {
      version: '5.9.2',
      title: 'Cải thiện hiệu năng Dashboard',
      description: 'Giảm thời gian tải Dashboard từ 3s xuống 0.8s',
      type: 'IMPROVEMENT' as any,
    },
    {
      version: '5.9.1',
      title: 'Fix lỗi báo cáo lương',
      description: 'Sửa lỗi tính toán thuế BHXH trong báo cáo lương chi tiết',
      type: 'BUG_FIX' as any,
    },
    {
      version: '5.9.0',
      title: 'Tính năng Payroll Analytics',
      description: 'Thêm báo cáo phân tích lương theo bộ phận, cấp bậc, thời gian',
      type: 'FEATURE' as any,
    },
    {
      version: '5.9.0',
      title: 'Hỗ trợ Dark Mode',
      description: 'Toàn bộ giao diện hỗ trợ Dark Mode với 9 preset màu',
      type: 'FEATURE' as any,
    },
    {
      version: '5.8.5',
      title: 'API Rate Limiting',
      description: 'Thêm giới hạn yêu cầu API để bảo vệ hệ thống',
      type: 'SECURITY' as any,
    },
  ];

  for (const log of changelogs) {
    try {
      await prisma.appChangelog.create({
        data: {
          version: log.version,
          title: log.title,
          description: log.description,
          type: log.type,
          releasedAt: dayjs().subtract(Math.random() * 30, 'days').toDate(),
        },
      });
      changelogCount++;
    } catch (e) {
      // Skip duplicates
    }
  }
  console.log(`   ✓ ${changelogCount} app changelogs created\n`);

  // ─────────────────────────────────────────────────────────────────
  // 3. FEED POSTS (Bài viết trên feed)
  // ─────────────────────────────────────────────────────────────────
  console.log('📰 Creating Feed Posts...');
  let postCount = 0;

  const postTemplates = [
    (emp: any, task: any) => ({
      title: `${emp.fullName} cập nhật: ${task?.title || 'Công việc'}`,
      content: `Hoàn thành 50% công việc. Dự kiến hoàn tất vào ${dayjs().add(5, 'days').format('DD/MM')}.`,
      type: 'TASK_UPDATE' as any,
    }),
    (emp: any) => ({
      title: `${emp.fullName} đạt mục tiêu tháng ${dayjs().format('MM')}`,
      content: `Hoàn thành 120% KPI, vượt mục tiêu đề ra. Chúc mừng!`,
      type: 'ACHIEVEMENT' as any,
    }),
    (emp: any, project: any) => ({
      title: `Dự án ${project?.name || 'mới'} khởi động`,
      content: `Dự án đã chính thức khởi động với ${Math.floor(Math.random() * 15) + 5} thành viên.`,
      type: 'PROJECT_UPDATE' as any,
    }),
    (emp: any) => ({
      title: `${emp.fullName} chia sẻ kinh nghiệm`,
      content: `Học hỏi được nhiều điều từ dự án vừa rồi. Cảm ơn team!`,
      type: 'MILESTONE' as any,
    }),
    (emp: any) => ({
      title: `${emp.fullName} nhận danh hiệu Nhân viên xuất sắc`,
      content: `Được tuyên dương vì đóng góp lớn cho công ty.`,
      type: 'ACHIEVEMENT' as any,
    }),
  ];

  for (let i = 0; i < 100; i++) {
    const user = users[i % users.length];
    const emp = employees[i % employees.length];
    const project = projects[i % projects.length];
    const task = tasks[i % tasks.length];

    const template = postTemplates[i % postTemplates.length];
    const post = template(emp, task || project);

    try {
      await prisma.feedPost.create({
        data: {
          userId: user.id,
          title: post.title,
          content: post.content,
          type: post.type,
          createdAt: dayjs().subtract(Math.random() * 60, 'days').toDate(),
        },
      });
      postCount++;
    } catch (e) {
      // Skip errors
    }
  }
  console.log(`   ✓ ${postCount} feed posts created\n`);

  // ─────────────────────────────────────────────────────────────────
  // 4. FEED REACTIONS (Like, Comment)
  // ─────────────────────────────────────────────────────────────────
  console.log('👍 Creating Feed Reactions...');
  let reactionCount = 0;

  const posts = await prisma.feedPost.findMany({ take: 50 });

  for (const post of posts) {
    // 5-15 reactions per post
    const reactionCount_per_post = Math.floor(Math.random() * 10) + 5;

    for (let i = 0; i < reactionCount_per_post; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const reactionType = ['LIKE', 'LOVE', 'HELPFUL'][Math.floor(Math.random() * 3)];

      try {
        await prisma.feedReaction.create({
          data: {
            postId: post.id,
            userId: user.id,
            reactionType: reactionType as any,
          },
        });
        reactionCount++;
      } catch (e) {
        // Skip duplicates
      }
    }
  }
  console.log(`   ✓ ${reactionCount} feed reactions created\n`);

  // ─────────────────────────────────────────────────────────────────
  // 5. PROCESS ACTIVITY LOGS (Log hoạt động từ BPM)
  // ─────────────────────────────────────────────────────────────────
  console.log('🔄 Creating Process Activity Logs...');
  let activityCount = 0;

  const processTypes = ['LEAVE_REQUEST', 'OVERTIME_REQUEST', 'EXPENSE_REQUEST', 'APPROVAL_FLOW'];
  const actions = ['CREATED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'COMMENTED', 'REASSIGNED'];

  for (let i = 0; i < 200; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const actor = users[Math.floor(Math.random() * users.length)];
    const processType = processTypes[Math.floor(Math.random() * processTypes.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];

    try {
      await prisma.processActivityLog.create({
        data: {
          userId: user.id,
          actorId: actor.id,
          processType: processType as any,
          action: action as any,
          description: `${actor.name} ${action.toLowerCase()} ${processType.toLowerCase()}`,
          metadata: {
            processId: `PROC-${String(i).padStart(5, '0')}`,
            timestamp: new Date().toISOString(),
          },
          createdAt: dayjs().subtract(Math.random() * 60, 'days').toDate(),
        },
      });
      activityCount++;
    } catch (e) {
      // Skip errors
    }
  }
  console.log(`   ✓ ${activityCount} process activity logs created\n`);

  // ─────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ FEED + ACTIVITY SEED COMPLETED!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`
📢 System Announcements: ${announcementCount}
📝 App Changelogs:       ${changelogCount}
📰 Feed Posts:           ${postCount}
👍 Feed Reactions:       ${reactionCount}
🔄 Activity Logs:        ${activityCount}
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
