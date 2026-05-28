---
name: project-loop-status
description: Tổng quan tiến độ Epic Loop — epic nào đã xong, đang làm gì tiếp theo
metadata:
  type: project
---

Epics 1–14 hoàn thành toàn bộ.

**Epic 14 — Issue Register ✅ COMPLETE (2026-05-27)**
- PRD: `_bmad-output/planning-artifacts/prds/prd-issue-register-2026-05-27/prd.md`
- Stories: 14.1–14.11 tất cả đã implement
- Backend: `apps/backend/src/issues/` — IssuesService, Controller, Stats, Export, Attachment, Comment, Overdue Cron
- Web: `apps/web/src/pages/issues/` + `apps/web/src/api/issues.api.ts` + components
- Mobile: `apps/mobile/app/(tabs)/issues.tsx` + `apps/mobile/app/issue/[id].tsx`
- MinIO bucket: `loop-issues`
- NotificationBell: "Issues" tab đã thêm
- Sidebar: "Issue Register" group với My Issues / Issues / Dashboard Issues

**Why:** Module quản lý issues triển khai dự án cho khách hàng (Bug + CR); CR cần PM duyệt trước khi làm; dashboard 6 card; export Excel; overdue daily cron.
**How to apply:** Không còn story nào pending. Epic 14 là epic cuối cùng.
