/**
 * Seed dữ liệu cài đặt lương thực tế:
 * - InsuranceConfig (tỷ lệ BHXH/BHYT/BHTN hiện hành 2024)
 * - TaxBracket (Luật 109/2025/QH15 — 5 bậc)
 * - TaxDeductionConfig (Nghị quyết 954/2020/UBTVQH14)
 * - AllowanceType (các loại phụ cấp phổ biến)
 * - SalaryColumn (cấu trúc bảng lương chuẩn)
 *
 * Chạy: node prisma/seed-payroll-settings.js
 */

const { Client } = require('pg');
const { randomUUID } = require('crypto');

const db = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'loop',
  password: process.env.DB_PASSWORD || 'loop_password',
  database: process.env.DB_NAME || 'loop_db',
});

async function main() {
  await db.connect();
  console.log('🌱 Seeding payroll settings...\n');

  // ─── 1. Insurance Config ────────────────────────────────────────────────────
  const { rows: existingIns } = await db.query('SELECT id FROM insurance_configs LIMIT 1');
  if (existingIns.length === 0) {
    await db.query(`
      INSERT INTO insurance_configs (
        id, effective_from,
        bhxh_employee_rate, bhyt_employee_rate, bhtn_employee_rate,
        bhxh_employer_rate, bhyt_employer_rate, bhtn_employer_rate, tnld_rate,
        wage_base, bhxh_ceiling_multiple, tenant_id, created_at
      ) VALUES (
        $1, '2024-01-01',
        0.08, 0.015, 0.01,
        0.175, 0.03, 0.01, 0.005,
        2340000, 20, NULL, NOW()
      )
    `, [randomUUID()]);
    console.log('  ✅ InsuranceConfig 2024 (BHXH 8%/17.5%, BHYT 1.5%/3%, BHTN 1%/1%, lương cơ sở 2.34M, trần 20x)');
  } else {
    console.log('  ⏭  InsuranceConfig đã có');
  }

  // ─── 2. Tax Bracket ─────────────────────────────────────────────────────────
  const { rows: existingTax } = await db.query('SELECT id FROM tax_brackets LIMIT 1');
  if (existingTax.length === 0) {
    const brackets = JSON.stringify([
      { from: 0,           to: 60000000,  rate: 0.05 },
      { from: 60000000,    to: 120000000, rate: 0.10 },
      { from: 120000000,   to: 216000000, rate: 0.15 },
      { from: 216000000,   to: 384000000, rate: 0.20 },
      { from: 384000000,   to: null,      rate: 0.25 },
    ]);
    await db.query(`
      INSERT INTO tax_brackets (id, name, effective_from, brackets, tenant_id, created_at)
      VALUES ($1, $2, '2025-01-01', $3::jsonb, NULL, NOW())
    `, [randomUUID(), 'Luật 109/2025/QH15 (5 bậc)', brackets]);
    console.log('  ✅ TaxBracket Luật 109/2025 (5%, 10%, 15%, 20%, 25%)');
  } else {
    console.log('  ⏭  TaxBracket đã có');
  }

  // ─── 3. Tax Deduction Config ────────────────────────────────────────────────
  const { rows: existingDeduct } = await db.query('SELECT id FROM tax_deduction_configs LIMIT 1');
  if (existingDeduct.length === 0) {
    await db.query(`
      INSERT INTO tax_deduction_configs (id, effective_from, self_deduction, dependent_deduction, tenant_id, created_at)
      VALUES ($1, '2020-07-01', 11000000, 4400000, NULL, NOW())
    `, [randomUUID()]);
    console.log('  ✅ TaxDeductionConfig: bản thân 11M, NPT 4.4M (NQ 954/2020)');
  } else {
    console.log('  ⏭  TaxDeductionConfig đã có');
  }

  // ─── 4. AllowanceType ───────────────────────────────────────────────────────
  const allowances = [
    {
      name: 'Phụ cấp ăn ca',
      defaultAmount: 730000,
      calculationMode: 'FIXED',
      isBhxhExempt: true, isPitExempt: true, pitExemptCeiling: 730000,
    },
    {
      name: 'Phụ cấp đi lại',
      defaultAmount: 500000,
      calculationMode: 'FIXED',
      isBhxhExempt: true, isPitExempt: true, pitExemptCeiling: null,
    },
    {
      name: 'Phụ cấp điện thoại',
      defaultAmount: 300000,
      calculationMode: 'FIXED',
      isBhxhExempt: true, isPitExempt: true, pitExemptCeiling: null,
    },
    {
      name: 'Phụ cấp trách nhiệm',
      defaultAmount: 1000000,
      calculationMode: 'FIXED',
      isBhxhExempt: true, isPitExempt: false, pitExemptCeiling: null,
    },
    {
      name: 'Phụ cấp thâm niên',
      defaultAmount: 200000,
      calculationMode: 'PER_WORK_DAY',
      isBhxhExempt: true, isPitExempt: false, pitExemptCeiling: null,
    },
    {
      name: 'Hỗ trợ nhà ở',
      defaultAmount: 1500000,
      calculationMode: 'FIXED',
      isBhxhExempt: true, isPitExempt: false, pitExemptCeiling: null,
    },
    {
      name: 'Phụ cấp độc hại / nguy hiểm',
      defaultAmount: 400000,
      calculationMode: 'PER_WORK_DAY',
      isBhxhExempt: true, isPitExempt: true, pitExemptCeiling: null,
    },
  ];

  const allowanceIdMap = {};
  for (const a of allowances) {
    const { rows } = await db.query('SELECT id FROM allowance_types WHERE name = $1', [a.name]);
    if (rows.length === 0) {
      const id = randomUUID();
      await db.query(`
        INSERT INTO allowance_types (id, name, default_amount, calculation_mode, is_bhxh_exempt, is_pit_exempt, pit_exempt_ceiling, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
      `, [id, a.name, a.defaultAmount, a.calculationMode, a.isBhxhExempt, a.isPitExempt, a.pitExemptCeiling]);
      allowanceIdMap[a.name] = id;
      const modeLabel = a.calculationMode === 'PER_WORK_DAY' ? '⏱ Theo ngày công' : '📅 Cố định';
      console.log(`  ✅ AllowanceType: ${a.name} — ${(a.defaultAmount/1000).toFixed(0)}k ${modeLabel}`);
    } else {
      allowanceIdMap[a.name] = rows[0].id;
      console.log(`  ⏭  AllowanceType đã có: ${a.name}`);
    }
  }

  // ─── 5. SalaryColumn ────────────────────────────────────────────────────────
  const { rows: existingCols } = await db.query('SELECT id FROM salary_columns LIMIT 1');
  if (existingCols.length === 0) {
    const salaryColumns = [
      {
        id: 'col-base-salary', name: 'Lương cơ bản', type: 'EARNING', source: 'CONTRACT_SALARY',
        allowanceTypeId: null, fixedValue: null, formula: null,
        isBhxhExempt: false, isPitExempt: false, pitExemptCeiling: null, sortOrder: 1, isActive: true,
      },
      {
        id: 'col-eat-allowance', name: 'Phụ cấp ăn ca', type: 'EARNING', source: 'ALLOWANCE_TYPE',
        allowanceTypeId: allowanceIdMap['Phụ cấp ăn ca'] || null, fixedValue: null, formula: null,
        isBhxhExempt: true, isPitExempt: true, pitExemptCeiling: 730000, sortOrder: 2, isActive: true,
      },
      {
        id: 'col-travel-allowance', name: 'Phụ cấp đi lại', type: 'EARNING', source: 'ALLOWANCE_TYPE',
        allowanceTypeId: allowanceIdMap['Phụ cấp đi lại'] || null, fixedValue: null, formula: null,
        isBhxhExempt: true, isPitExempt: true, pitExemptCeiling: null, sortOrder: 3, isActive: true,
      },
      {
        id: 'col-phone-allowance', name: 'Phụ cấp điện thoại', type: 'EARNING', source: 'ALLOWANCE_TYPE',
        allowanceTypeId: allowanceIdMap['Phụ cấp điện thoại'] || null, fixedValue: null, formula: null,
        isBhxhExempt: true, isPitExempt: true, pitExemptCeiling: null, sortOrder: 4, isActive: true,
      },
      {
        id: 'col-ot-weekday', name: 'OT ngày thường (150%)', type: 'EARNING', source: 'FORMULA',
        allowanceTypeId: null, fixedValue: null,
        formula: '{contractSalary}/{standardDays}/8*1.5*{otWeekday}',
        isBhxhExempt: true, isPitExempt: false, pitExemptCeiling: null, sortOrder: 10, isActive: true,
      },
      {
        id: 'col-ot-weekend', name: 'OT cuối tuần (200%)', type: 'EARNING', source: 'FORMULA',
        allowanceTypeId: null, fixedValue: null,
        formula: '{contractSalary}/{standardDays}/8*2*{otWeekend}',
        isBhxhExempt: true, isPitExempt: false, pitExemptCeiling: null, sortOrder: 11, isActive: true,
      },
      {
        id: 'col-ot-holiday', name: 'OT ngày lễ (300%)', type: 'EARNING', source: 'FORMULA',
        allowanceTypeId: null, fixedValue: null,
        formula: '{contractSalary}/{standardDays}/8*3*{otHoliday}',
        isBhxhExempt: true, isPitExempt: false, pitExemptCeiling: null, sortOrder: 12, isActive: true,
      },
    ];

    for (const col of salaryColumns) {
      if (!col.allowanceTypeId && col.source === 'ALLOWANCE_TYPE') {
        console.log(`  ⚠️  Skip ${col.name}: AllowanceType không tìm thấy`);
        continue;
      }
      await db.query(`
        INSERT INTO salary_columns (
          id, name, type, source, allowance_type_id, fixed_value, formula,
          is_bhxh_exempt, is_pit_exempt, pit_exempt_ceiling, sort_order, is_active, tenant_id, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NULL,NOW())
        ON CONFLICT (id) DO NOTHING
      `, [
        col.id, col.name, col.type, col.source,
        col.allowanceTypeId, col.fixedValue, col.formula,
        col.isBhxhExempt, col.isPitExempt, col.pitExemptCeiling,
        col.sortOrder, col.isActive,
      ]);
      console.log(`  ✅ SalaryColumn: ${col.name}`);
    }
  } else {
    console.log(`  ⏭  SalaryColumns đã có`);
  }

  console.log('\n✅ Payroll settings seeded successfully!');
  await db.end();
}

main().catch(async (e) => {
  console.error(e);
  await db.end();
  process.exit(1);
});
