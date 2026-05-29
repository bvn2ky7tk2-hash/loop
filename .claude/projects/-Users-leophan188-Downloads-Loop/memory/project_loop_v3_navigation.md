---
name: project-loop-v3-navigation
description: Loop v3.0 — Persona-driven Navigation & Dashboard Redesign; 10→8 module theo vai trò; kèm deployment utilities; chờ v2.x xong
metadata:
  type: project
---

Loop v3.0 được phê duyệt ngày 2026-05-28: tái cấu trúc navigation và dashboard theo persona người dùng. Kèm theo bộ deployment utilities (Onboarding Wizard, Module Toggle, Demo Mode, Health Dashboard, Cmd+K).

**Tài liệu master roadmap (nguồn sự thật):** `_bmad-output/planning-artifacts/loop-product-roadmap.md`  
**Chi tiết navigation spec:** `_bmad-output/planning-artifacts/loop-v3-navigation-redesign.md`

**Why:** 10 module v2.0 nhóm theo data domain gây HR quá phình, Reports chỉ 1 màn hình, BPM Inbox trộn với BPM Design. V3.0 nhóm theo "ai dùng cái gì".

**Lộ trình:**
- `v2.x` (làm ngay): Import/Bulk/Export → Notifications → Reminders → Audit Log → Scheduled Reports
- `v3.0`: Persona navigation (8 module) + 8 Dashboards + Reports tích hợp + Cmd+K + Module Toggle + Onboarding Wizard + Demo Mode + Health Dashboard
- `v3.x`: Mobile PWA, Advanced BI, Multi-tenant, AI features

**8 Module v3.0:** `work` / `people` / `finance` / `crm` / `ops` / `asset` / `me` / `admin`  
Module bị giải thể: `reports`, `recruit` (→people), `bpm` (split→work/ops), `timesheet` (split→work/people)

**How to apply:** Khi nhắc đến v3.0, navigation redesign, dashboard per module, hoặc deployment utilities — tham chiếu loop-product-roadmap.md. Chưa triển khai, chờ v2.x hoàn thành.
