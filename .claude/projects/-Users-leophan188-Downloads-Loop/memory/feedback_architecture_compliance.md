---
name: feedback-architecture-compliance
description: Quy tắc tuân thủ kiến trúc bắt buộc khi thêm tính năng mới — áp dụng cho mọi version từ v5 trở đi
metadata:
  type: feedback
---

Mọi tính năng mới phải tuân thủ đồng bộ cả kiến trúc backend lẫn UI/UX — để hệ thống nhất quán khi phát triển thêm.

**Why:** Audit v4 phát hiện các module mới (recruit, crm, comments...) được thêm vào mà bỏ qua TenantAwareService và thiếu tenantId trên schema — tạo ra nợ kỹ thuật tích lũy. v5 models mới (BudgetPlan, OvertimeRequest) tiếp tục lặp lỗi này. Kiến trúc không nhất quán từ đầu sẽ rất khó fix sau.

**How to apply:**

### Checklist bắt buộc khi tạo model/service/page mới

**Backend — Schema:**
- [ ] Model mới phải có `tenantId String? @map("tenant_id")` + `@relation` đến Tenant
- [ ] Nếu model là child (FK đến model cha đã có tenantId), vẫn phải thêm tenantId riêng

**Backend — Service:**
- [ ] Service mới có DB access phải `extends TenantAwareService`
- [ ] Mọi `findMany` phải có `where: this.tenantWhere({...})` + `take: limit`
- [ ] Mọi `findOne/findFirst` phải có `where: this.tenantWhere({ id })`
- [ ] Không dùng `this.prisma.model.findMany()` bare không có where+take

**Backend — Controller:**
- [ ] Mọi `@Public()` endpoint phải có `@Throttle`
- [ ] Endpoint nhạy cảm phải có `@Roles()`

**Frontend — Component:**
- [ ] Dùng `useThemePalette()` — không khai báo lại `isDark`, `textPrimary`...
- [ ] Dùng `<PageHeader>`, `<StatCard>`, `<FilterBar>`, `confirmDelete` từ component library
- [ ] Màu StatCard phải từ bảng chuẩn (sáng đủ tương phản text trắng)
- [ ] Column Table render phải wrap JSX với `style={{ color: textPrimary/textMuted }}`
- [ ] Không hardcode hex color ngoài StatCard palette (cấm: `#0EA5E9`, `#64748B`, `#475569`...)
- [ ] Không dùng `components={{ header: { cell: ... }}}` trên Table

**Kiến trúc xuyên suốt:**
- [ ] Cross-domain communication qua EventBus (HrEventBus/ProjectEventBus/FinanceEventBus) — không Prisma join cross-domain
- [ ] Approval/review flow phải dùng BPMN ProcessDefinition — không tự build state machine
- [ ] Queue job phải dùng BullMQ — không EventEmitter2
