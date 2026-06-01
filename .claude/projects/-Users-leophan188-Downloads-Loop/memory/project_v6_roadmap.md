---
name: project-v6-roadmap
description: Loop v6 — SaaS Production Readiness: schema tenantId toàn diện, service migration, pending PRDs nghiệp vụ
metadata:
  type: project
---

Loop v6 tập trung vào **hoàn thiện hạ tầng SaaS** và **bổ sung nghiệp vụ còn thiếu** — không mở rộng module mới.

**Mục tiêu v6:** Hệ thống đạt chuẩn production SaaS multi-tenant thực sự — mọi dữ liệu tenant đều bị cô lập, mọi service đều tenant-aware, đồng thời hoàn thành các PRD nghiệp vụ quan trọng còn tồn đọng.

---

## Nhóm A — Schema tenantId hoàn thiện (ưu tiên cao nhất)

Hiện 93/131 model **chưa có tenantId**. Các model quan trọng thiếu:

| Model | Rủi ro nếu thiếu tenantId |
|---|---|
| OvertimeRequest, Expense, ExpenseItem | Cross-tenant payroll/finance leak |
| TimesheetRecord, ProcessInstance, ProcessUserTask | Workflow cross-tenant |
| BudgetPlan, BudgetLine, BudgetTransaction | v5 models mới, thiếu ngay |
| ChartOfAccount, JournalEntry, JournalLine | Finance leak |
| InsuranceEnrollment, SalaryRecord | HR sensitive |
| CalendarEvent, RoomBooking, FeedPost | Ops/social leak |
| AuditLog, Notification, AutomationRule | System records |
| KpiMetric, KpiRecord, TrainingRecord, PerformanceReview | HR/OKR leak |

**Việc cần làm:**
- Migration Prisma: thêm `tenantId String? @map("tenant_id")` + relation cho 93 model
- Backfill data: set tenantId từ parent relation (Employee.tenantId → TimesheetRecord…)
- Prisma generate lại

## Nhóm B — Service migration TenantAwareService

14 service còn dùng `this.prisma` trực tiếp không qua `tenantWhere()`:

```
recruit: jobs, candidates, interviews
crm: forecast, activities, client-contracts
comments, user-groups, procurement
skills, positions, job-titles
work-shifts, hr-holidays, leave-policies
```

Mỗi service cần: extend TenantAwareService + thay `where: {}` → `where: this.tenantWhere({...})`

## Nhóm C — Pagination safety

`findMany()` thiếu `take` tại:
- accounting.service.ts (chartOfAccount, journalEntry)
- tasks.service.ts (internal tree traversal — cần cap 500)
- portal.service.ts (customerPortal, clientContract)
- calendar.service.ts (calendarEvent, roomBooking)

## Nhóm D — PRD nghiệp vụ tồn đọng

| PRD | File | Nội dung |
|---|---|---|
| Payroll Compliance | `prds/prd-Loop-2026-05-28/prd.md` | Thuế TNCN 7→5 bậc, BHXH/BHYT/BHTN, phiếu lương PDF, xuất 05-QTT-TNCN |
| HR HRIS v4.0 | `prds/prd-hr-v4-2026-05-28/prd.md` | Vòng đời nhân viên đầy đủ, audit trail, workflow PDF chuẩn pháp lý |
| Issue Register | `prds/prd-issue-register-2026-05-27/prd.md` | Bug+CR theo dự án triển khai (khác Bug Tracking nội bộ) |
| Bulk Operations | `loop-product-roadmap.md v2.x` | Import wizard, bulk actions, export CSV/Excel toàn hệ thống |

---

**Nguyên tắc v6:**
- Không thêm model mới nếu chưa có tenantId
- Mọi service mới phải extend TenantAwareService từ đầu
- Migration script phải có backfill + rollback plan

**Why:** v5 bổ sung models mới (BudgetPlan, OvertimeRequest.dayType) nhưng bỏ qua tenantId → nợ kỹ thuật tích lũy. v6 phải thanh toán toàn bộ trước khi onboard tenant thật.

**How to apply:** Khi bắt đầu v6, ưu tiên Nhóm A+B trước (infrastructure), sau đó Nhóm C+D (nghiệp vụ). Nhóm A là blocker cho SaaS go-live.
