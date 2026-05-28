---
name: project-erp-roadmap
description: Lộ trình nâng cấp Loop lên ERP — 3 phase, 4 domain group, quyết định kiến trúc schema-per-domain
metadata:
  type: project
---

Loop đang được lên kế hoạch nâng cấp thành ERP đầy đủ theo lộ trình 3 phase.

**Why:** Hiện tại Loop có 6 domain (IAM, Project, HR Core, Timesheet, BPM, Platform). Mục tiêu mở rộng thêm Payroll, Leave, CRM, Finance, Accounting.

**Tài liệu đầy đủ:** `_bmad-output/planning-artifacts/erp-roadmap.md`

**Tóm tắt:**
- Phase 1 (0–3 tháng): Hardening — tách schema.prisma, AuditLog, Helmet, module boundary
- Phase 2 (3–9 tháng): Payroll, Leave, Budget, Expense
- Phase 3 (9–18 tháng): CRM, Invoice, Accounting, Recruitment

**Kiến trúc đã chốt:** Schema-per-domain, 1 PostgreSQL database (không microservices sớm).

**How to apply:** Khi user hỏi về module mới, tham chiếu lộ trình này để xác định phase và dependency.
