const { Client } = require('pg');
const DB_URL = process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db';
async function seed() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    const userRes = await client.query(`SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`);
    if (!userRes.rows.length) { console.log('No admin user, skip.'); return; }
    const authorId = userRes.rows[0].id;
    const posts = [
      { type: 'ANNOUNCEMENT', title: 'Chính sách WFH từ 01/06/2026', content: 'Ban lãnh đạo quyết định cho phép làm việc từ xa 2 ngày/tuần (Thứ 4 và Thứ 6) kể từ 01/06/2026.', is_pinned: true },
      { type: 'KUDOS', title: null, content: '🏆 Chúc mừng team Engineering hoàn thành Sprint Q2 xuất sắc!', is_pinned: false },
      { type: 'ANNOUNCEMENT', title: 'Lịch nghỉ lễ 30/4 - 1/5', content: 'Công ty nghỉ lễ từ 30/04 đến 02/05/2026. Nhân viên trực đăng ký với HR trước 25/04.', is_pinned: false },
    ];
    for (const post of posts) {
      await client.query(
        `INSERT INTO feed_posts (id, type, author_id, title, content, is_pinned, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW()) ON CONFLICT DO NOTHING`,
        [post.type, authorId, post.title, post.content, post.is_pinned],
      );
    }
    console.log(`✓ Seeded ${posts.length} feed posts`);
    const taskRes = await client.query(`SELECT id FROM tasks LIMIT 1`);
    if (taskRes.rows.length) {
      const taskId = taskRes.rows[0].id;
      const comments = ['Đã xem requirements, bắt đầu implement ngay.', 'Cần review phần auth flow trước khi merge.', 'Done! PR đã tạo rồi ạ.'];
      for (const content of comments) {
        await client.query(
          `INSERT INTO comments (id, entity_type, entity_id, author_id, content, created_at, updated_at) VALUES (gen_random_uuid(), 'task', $1, $2, $3, NOW(), NOW())`,
          [taskId, authorId, content],
        );
      }
      console.log(`✓ Seeded 3 comments`);
    }
    console.log('Seed feed + comments done!');
  } finally { await client.end(); }
}
seed().catch(err => { console.error(err); process.exit(1); });
