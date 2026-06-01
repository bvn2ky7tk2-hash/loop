---
name: project-v4-complete
description: v4.3 hoàn thành — tất cả P1-P9 đã giải quyết, sẵn sàng cho v5
metadata:
  type: project
---

Loop v4.3 đã hoàn thành toàn bộ foundation plan. Không còn blocker kỹ thuật nào trước v5.

**Đã xong (xác nhận từ codebase 2026-05-30):**
- TenantAwareService: 93/93 services đã migrate
- JWT payload: có tenantId tại `auth.service.ts:44,102`
- BullMQ: ProcessEventBus + FinanceEventBus + PayslipQueue
- MinIO per-tenant: prefix `tenant/{tenantId}/`
- Redis cache: dashboard APIs có TTL cache với key theo tenantId
- Compression: `app.use(compression())` trong main.ts
- Graceful shutdown: enableShutdownHooks() đã có

**Cam kết kiến trúc v4+:**
- Mọi service mới phải extend `TenantAwareService`
- Mọi EventBus/Queue mới phải dùng BullMQ (không EventEmitter2)
- Tất cả đã ghi vào CLAUDE.md section 2 (backend rules)

**Design System polish (thực hiện trước v5 E16):**
- `<EmptyState>` component cần tạo tại `components/ui/EmptyState.tsx`
- `<SkeletonTable>` + `<SkeletonCard>` cần tạo tại `components/ui/Skeleton.tsx`
- `showFeedback` utility cần tạo tại `utils/feedback.ts`
- Rules đã ghi vào CLAUDE.md #9/#10/#11

**Why:** v4 đặt nền móng multi-tenant production-ready. v5 chỉ cần thêm business logic, không cần lo infrastructure.

**How to apply:** Khi bắt đầu story v5, skip mọi infrastructure setup — chỉ implement business logic trên nền v4.
