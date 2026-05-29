const { Client } = require('pg');
const { randomUUID } = require('crypto');

const DB_URL = process.env.DATABASE_URL || 'postgresql://loop:loop_password@localhost:5432/loop_db';

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  const leaveTypes = [
    { name: 'Nghỉ phép năm', maxDaysPerYear: 12, isPaid: true, color: '#6366F1', processDefinitionKey: 'leave-approval' },
    { name: 'Nghỉ bệnh', maxDaysPerYear: 30, isPaid: true, color: '#10B981', processDefinitionKey: 'leave-approval' },
    { name: 'Nghỉ thai sản', maxDaysPerYear: 180, isPaid: true, color: '#8B5CF6', processDefinitionKey: 'leave-approval' },
    { name: 'Nghỉ không lương', maxDaysPerYear: 30, isPaid: false, color: '#94A3B8', processDefinitionKey: 'leave-approval' },
    { name: 'Nghỉ việc riêng có lương', maxDaysPerYear: 5, isPaid: true, color: '#F59E0B', processDefinitionKey: 'leave-approval' },
    { name: 'Nghỉ bù', maxDaysPerYear: 20, isPaid: true, color: '#3B82F6', processDefinitionKey: 'leave-approval' },
  ];

  for (const lt of leaveTypes) {
    await client.query(
      `INSERT INTO leave_types (id, name, max_days_per_year, is_paid, color, is_active, process_definition_key)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       ON CONFLICT (name) DO UPDATE SET
         max_days_per_year = EXCLUDED.max_days_per_year,
         is_paid = EXCLUDED.is_paid,
         color = EXCLUDED.color,
         process_definition_key = EXCLUDED.process_definition_key`,
      [randomUUID(), lt.name, lt.maxDaysPerYear, lt.isPaid, lt.color, lt.processDefinitionKey]
    );
    console.log('  ✓', lt.name);
  }

  console.log('✅ Seeded leave types thành công');
  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
