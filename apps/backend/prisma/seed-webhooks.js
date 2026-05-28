const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db',
  });

  await client.connect();
  console.log('Seeding webhook endpoints...');

  // Xóa dữ liệu cũ để seed lại sạch
  await client.query('DELETE FROM webhook_logs WHERE endpoint_id IN (SELECT id FROM webhook_endpoints WHERE name IN ($1, $2))', [
    'Slack #dev',
    'CRM Sync',
  ]);
  await client.query('DELETE FROM webhook_endpoints WHERE name IN ($1, $2)', ['Slack #dev', 'CRM Sync']);

  // Endpoint 1: Slack #dev
  const r1 = await client.query(
    `INSERT INTO webhook_endpoints (id, name, url, secret, events, is_active, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING id`,
    [
      'Slack #dev',
      'https://hooks.slack.com/demo',
      null,
      ['task.created', 'bug.assigned'],
      true,
    ],
  );

  // Endpoint 2: CRM Sync
  const r2 = await client.query(
    `INSERT INTO webhook_endpoints (id, name, url, secret, events, is_active, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING id`,
    [
      'CRM Sync',
      'https://example.com/webhook',
      'secret-token-crm-2024',
      ['leave.approved', 'expense.approved'],
      false,
    ],
  );

  // Thêm vài log mẫu cho Slack #dev
  const ep1Id = r1.rows[0].id;
  await client.query(
    `INSERT INTO webhook_logs (id, endpoint_id, event, payload, status_code, response, success, attempt_count, sent_at)
     VALUES
       (gen_random_uuid(), $1, 'task.created', '{"taskId":"demo-1","title":"Fix login bug"}', 200, 'ok', true, 1, NOW() - INTERVAL '2 hours'),
       (gen_random_uuid(), $1, 'bug.assigned', '{"bugId":"bug-42","assignee":"Tuan Anh"}', 200, 'ok', true, 1, NOW() - INTERVAL '1 hour'),
       (gen_random_uuid(), $1, 'task.created', '{"taskId":"demo-2","title":"Write tests"}', null, 'Connection timeout', false, 3, NOW() - INTERVAL '30 minutes')`,
    [ep1Id],
  );

  await client.end();
  console.log('✅  Seeded 2 webhook endpoints + 3 sample logs.');
}

main().catch((err) => { console.error(err); process.exit(1); });
