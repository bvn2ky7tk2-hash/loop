import { PrismaClient } from "../src/generated/prisma";
const prisma = new PrismaClient();

async function main() {
  console.log("Truncating all data...");
  // Xóa theo thứ tự FK (children trước parents)
  // Cần dùng $executeRawUnsafe hoặc deleteMany theo thứ tự
  // Giữ lại: Tenant records, InsuranceConfig, TaxBracket, TaxDeductionConfig, WageZoneConfig, SalaryColumn, ProcessDefinition

  const tables = [
    "payroll_records", "payroll_periods", "timesheet_records", "time_entries",
    "monthly_attendance", "attendance_records", "attendance_explanations",
    "performance_bonuses", "performance_reviews", "training_records",
    "leave_balances", "leave_requests", "overtime_requests",
    "salary_records", "position_histories", "work_histories", "hr_decisions",
    "insurance_events", "insurance_enrollments", "social_insurance_books",
    "employee_allowances", "employee_bonuses", "employee_tax_profiles", "dependents",
    "contracts", "allocations",
    "time_logs", "bug_tasks", "bugs", "tasks",
    "project_journals", "project_cost_by_employees", "project_cost_snapshots",
    "expense_items", "expenses", "purchase_order_items", "purchase_orders",
    "invoice_items", "invoices", "budget_transactions", "budget_lines", "budget_plans",
    "journal_lines", "journal_entries",
    "crm_activities", "client_contracts", "contract_milestones", "contract_allowances",
    "customer_survey_schedules", "lead_follow_up_schedules",
    "deals", "leads", "contacts", "customer_portals", "customers",
    "kb_articles", "kb_categories",
    "feed_reactions", "feed_posts",
    "assets", "asset_assignments", "asset_maintenance", "asset_transfers", "asset_disposals",
    "kpi_records", "kpi_metrics", "okr_key_results", "okr_objectives",
    "room_bookings", "vehicle_requests",
    "process_user_tasks", "process_activity_logs", "process_instances",
    "notifications", "telegram_messages",
    "audit_logs",
    "work_status",
    "skill_matrix", "employee_skills",
    "interviews", "candidates", "job_openings",
    "employees",
    "users",
    "org_units",
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
      console.log(`✓ Truncated ${table}`);
    } catch(e: any) {
      console.warn(`Skip ${table}: ${e.message?.slice(0,80)}`);
    }
  }
  console.log("Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
