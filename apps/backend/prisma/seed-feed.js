const { Client } = require('pg');
const DB_URL = process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db';

async function seed() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    const userRes = await client.query(`SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`);
    if (!userRes.rows.length) { console.log('No admin user, skip.'); return; }
    const authorId = userRes.rows[0].id;

    // Xóa data cũ
    await client.query('DELETE FROM feed_reactions');
    await client.query('DELETE FROM feed_posts');

    const now = new Date();
    const daysAgo = (d) => new Date(now - d * 86400000);

    const posts = [
      // ── PINNED ANNOUNCEMENTS ──────────────────────────────────────────────────
      {
        type: 'ANNOUNCEMENT',
        title: 'Chính sách WFH từ 01/06/2026',
        content: 'Ban lãnh đạo quyết định cho phép làm việc từ xa 2 ngày/tuần (Thứ 4 và Thứ 6) kể từ 01/06/2026. Nhân viên cần đăng ký lịch WFH trước 17h thứ Hai hằng tuần qua hệ thống Loop.',
        is_pinned: true,
        image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
        target_years: null, target_name: null,
        created_at: daysAgo(0),
      },
      {
        type: 'ANNOUNCEMENT',
        title: 'Nâng cấp hệ thống Loop ERP — bảo trì 30/05',
        content: 'Hệ thống Loop ERP sẽ được bảo trì và nâng cấp lên phiên bản 3.0 vào ngày 30/05/2026 từ 22:00 đến 02:00 hôm sau. Trong thời gian này, toàn bộ tính năng sẽ tạm ngưng. Vui lòng lưu công việc trước 21:30.',
        is_pinned: true,
        image_url: null,
        target_years: null, target_name: null,
        created_at: daysAgo(1),
      },

      // ── ANNIVERSARY — Tri ân thâm niên ───────────────────────────────────────
      {
        type: 'ANNIVERSARY',
        title: '5 năm đồng hành — Nguyễn Thị Lan Anh 🏆',
        content: 'Xin chào mừng Nguyễn Thị Lan Anh đã gắn bó và cống hiến cho Loop.vn tròn 5 năm! Hành trình 5 năm qua là minh chứng rõ nhất cho sự tận tâm và nỗ lực của bạn. Từ ngày đầu gia nhập phòng CRM đến nay, chị đã giúp Loop.vn ký kết hàng chục hợp đồng lớn và xây dựng đội ngũ sale xuất sắc. Cảm ơn chị đã là một phần không thể thiếu của gia đình Loop.vn! 🎉',
        is_pinned: false,
        image_url: null,
        target_years: 5,
        target_name: 'Nguyễn Thị Lan Anh',
        created_at: daysAgo(2),
      },
      {
        type: 'ANNIVERSARY',
        title: '3 năm đồng hành — Trần Minh Khoa 🏆',
        content: 'Chúc mừng Trần Minh Khoa đã đồng hành cùng Loop.vn tròn 3 năm! Từ một fresher đến Senior Backend Engineer, anh đã trưởng thành vượt bậc và là trụ cột kỹ thuật của đội Engineering. Cảm ơn anh đã luôn đặt chất lượng lên hàng đầu! 💪',
        is_pinned: false,
        image_url: null,
        target_years: 3,
        target_name: 'Trần Minh Khoa',
        created_at: daysAgo(8),
      },
      {
        type: 'ANNIVERSARY',
        title: '10 năm đồng hành — Lê Quang Hùng 🏆',
        content: 'Một thập kỷ gắn bó — điều đó nói lên tất cả! Chúc mừng anh Lê Quang Hùng đã đồng hành cùng Loop.vn tròn 10 năm. Từ những ngày đầu khởi nghiệp đến hôm nay, anh đã đóng góp to lớn vào sự phát triển của công ty. Cảm ơn anh — Loop.vn tự hào có bạn! 🙌',
        is_pinned: false,
        image_url: null,
        target_years: 10,
        target_name: 'Lê Quang Hùng',
        created_at: daysAgo(14),
      },

      // ── KUDOS ─────────────────────────────────────────────────────────────────
      {
        type: 'KUDOS',
        title: null,
        content: '🏆 Chúc mừng team Engineering hoàn thành Sprint Q2 xuất sắc! Tốc độ delivery tăng 40% so với Q1. Cảm ơn toàn bộ anh chị em đã cống hiến hết mình — kết quả này xứng đáng được ăn mừng! 🎉',
        is_pinned: false,
        image_url: null,
        target_years: null, target_name: null,
        created_at: daysAgo(3),
      },
      {
        type: 'KUDOS',
        title: null,
        content: '👏 Xin chúc mừng chị Nguyễn Lan Anh (CRM Team) đã ký thành công hợp đồng 3 tỷ với đối tác Vietcombank! Đây là deal lớn nhất trong quý. Cả công ty tự hào về chị!',
        is_pinned: false,
        image_url: null,
        target_years: null, target_name: null,
        created_at: daysAgo(5),
      },
      {
        type: 'KUDOS',
        title: null,
        content: '🌟 Big shoutout cho anh Trần Minh Khoa — hoàn thành tính năng báo cáo tài chính trước deadline 2 ngày và không có bug production. Đây là tiêu chuẩn chúng ta cần hướng tới!',
        is_pinned: false,
        image_url: null,
        target_years: null, target_name: null,
        created_at: daysAgo(7),
      },

      // ── ANNOUNCEMENTS với ảnh ─────────────────────────────────────────────────
      {
        type: 'ANNOUNCEMENT',
        title: 'Lịch nghỉ lễ 30/4 - 1/5 — 5 ngày liên tục',
        content: 'Công ty nghỉ lễ từ 30/04 đến 02/05/2026 (5 ngày liên tục). Nhân viên trực vận hành đăng ký với HR trước 25/04. Phụ cấp trực lễ theo quy định tại điều 12 nội quy lao động.',
        is_pinned: false,
        image_url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80',
        target_years: null, target_name: null,
        created_at: daysAgo(4),
      },
      {
        type: 'ANNOUNCEMENT',
        title: 'Tuyển dụng — Mở 5 vị trí Q2/2026',
        content: 'Phòng HR thông báo mở tuyển 5 vị trí: (1) Senior Backend Engineer, (2) Product Designer, (3) Data Analyst, (4) Sales Executive, (5) Customer Success Manager. Chi tiết JD tại careers.loop.vn. Nhân viên giới thiệu thành công nhận thưởng 5.000.000 đ.',
        is_pinned: false,
        image_url: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&q=80',
        target_years: null, target_name: null,
        created_at: daysAgo(6),
      },
      {
        type: 'ANNOUNCEMENT',
        title: 'Thay đổi giờ làm việc mùa hè 2026',
        content: 'Từ 01/06 đến 31/08/2026, giờ làm việc chính thức là 8:30 – 17:30 (thay vì 8:00 – 17:00). Giờ nghỉ trưa giữ nguyên 12:00 – 13:00.',
        is_pinned: false,
        image_url: null,
        target_years: null, target_name: null,
        created_at: daysAgo(9),
      },

      // ── DOCUMENTS ────────────────────────────────────────────────────────────
      {
        type: 'DOCUMENT',
        title: 'Quy trình nghỉ phép & OT mới — áp dụng từ 01/06',
        content: 'Đính kèm quy trình mới về đăng ký nghỉ phép và tăng ca: (1) Nghỉ phép ≥ 2 ngày phải đăng ký trước 3 ngày làm việc. (2) OT sau 21h phải được LEADERSHIP duyệt. (3) Bù phép được tính trong vòng 30 ngày.',
        is_pinned: false,
        image_url: null,
        target_years: null, target_name: null,
        created_at: daysAgo(11),
      },
      {
        type: 'DOCUMENT',
        title: 'Hướng dẫn sử dụng Loop ERP v3.0 — tài liệu nội bộ',
        content: 'Tài liệu hướng dẫn sử dụng hệ thống Loop ERP phiên bản 3.0 đã được cập nhật. Bao gồm: module Quản lý Nhân sự, module CRM, module Tài chính và tính năng mới Đặt phòng họp / Đặt xe. Truy cập docs.loop.vn/v3 hoặc liên hệ IT Helpdesk.',
        is_pinned: false,
        image_url: null,
        target_years: null, target_name: null,
        created_at: daysAgo(13),
      },
    ];

    for (const post of posts) {
      await client.query(
        `INSERT INTO feed_posts (id, type, author_id, title, content, is_pinned, image_url, target_years, target_name, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
        [post.type, authorId, post.title, post.content, post.is_pinned,
         post.image_url, post.target_years, post.target_name, post.created_at],
      );
    }
    console.log(`✓ Seeded ${posts.length} feed posts`);

    // Seed reactions lên bài ANNIVERSARY để trông sinh động
    const annivPosts = await client.query(
      `SELECT id FROM feed_posts WHERE type = 'ANNIVERSARY' ORDER BY created_at DESC`,
    );
    const allUsers = await client.query(`SELECT id FROM users LIMIT 8`);
    const emojis = ['👍', '❤️', '🎉', '👏'];

    for (const post of annivPosts.rows) {
      for (const u of allUsers.rows.slice(0, 5)) {
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        await client.query(
          `INSERT INTO feed_reactions (id, post_id, user_id, emoji, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, NOW())
           ON CONFLICT (post_id, user_id, emoji) DO NOTHING`,
          [post.id, u.id, emoji],
        );
      }
    }
    console.log('✓ Seeded reactions cho anniversary posts');

    // Seed comments trên tasks (nếu có)
    const taskRes = await client.query(`SELECT id FROM tasks LIMIT 1`);
    if (taskRes.rows.length) {
      const taskId = taskRes.rows[0].id;
      const comments = [
        'Đã xem requirements, bắt đầu implement ngay.',
        'Cần review phần auth flow trước khi merge.',
        'Done! PR đã tạo rồi ạ.',
      ];
      for (const content of comments) {
        await client.query(
          `INSERT INTO comments (id, "entityType", "entityId", author_id, content, created_at, updated_at)
           VALUES (gen_random_uuid(), 'task', $1, $2, $3, NOW(), NOW())`,
          [taskId, authorId, content],
        );
      }
      console.log('✓ Seeded 3 task comments');
    }

    console.log('✅ Seed feed hoàn tất!');
  } finally {
    await client.end();
  }
}

seed().catch(err => { console.error(err); process.exit(1); });
