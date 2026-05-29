---
name: project-loop-product-roadmap
description: Master roadmap Loop v2.x→v3.0→v3.x — tiện ích vận hành, persona navigation, deployment tools, mobile/BI/AI
metadata:
  type: project
---

Tài liệu master roadmap tổng hợp toàn bộ lộ trình sản phẩm Loop sau khi hoàn thành v2.0.

**Nguồn sự thật:** `_bmad-output/planning-artifacts/loop-product-roadmap.md`

**Why:** Sau go-live khách hàng đầu tiên cần 3 nhóm tiện ích: (1) end user adoption, (2) HR/Admin vận hành, (3) đội triển khai scale. Các tiện ích này được phân bổ vào v2.x và v3.0 theo mức độ impact/effort.

**v2.x — 5 releases tiện ích vận hành (không thay đổi navigation):**
- v2.1: Import Wizard + Bulk Operations + Export mọi table
- v2.2: Notification Center (in-app + email + Telegram)
- v2.3: Automated Reminders & Escalation (BullMQ cron)
- v2.4: Audit Log Viewer frontend + mở rộng coverage
- v2.5: Weekly Digest Email + Scheduled Reports

**v3.0 — Persona Navigation + Deployment Utilities:**
- A: Navigation refactor 10→8 module
- B: 8 Persona Dashboards (KPI + Charts)
- C: Reports tích hợp trong module (giải thể module Reports)
- D: Quick Action Bar Cmd+K
- E: Module Toggle (feature flags per tenant)
- F: Tenant Onboarding Wizard (7 steps)
- G: Demo Mode & Sandbox
- H: Health Dashboard (System Monitoring)

**v3.x — Future:** Mobile PWA, Advanced BI, Multi-tenant/White Label, AI features

**How to apply:** Khi user hỏi "tiếp theo làm gì" hoặc "kế hoạch phiên bản" — tham chiếu roadmap này. V2.1 là việc làm ngay sau khi v2.0 hoàn thành.
