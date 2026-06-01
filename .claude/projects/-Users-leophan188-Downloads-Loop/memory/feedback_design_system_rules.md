---
name: feedback-design-system-rules
description: Quy tắc Design System bắt buộc từ v4.3 — EmptyState, Skeleton, Toast/Feedback
metadata:
  type: feedback
---

Từ phân tích codebase 2026-05-30, Loop thiếu 3 pattern chuẩn hóa. Đã ghi vào CLAUDE.md (#9/#10/#11).

**Rule:** EmptyState — dùng `<EmptyState>` từ `components/ui/EmptyState.tsx`
**Why:** Mỗi trang tự làm khác nhau — `<Empty>`, div inline, hoặc không có gì. v5 có 7 epic mới, không chuẩn hóa ngay → nợ chồng chất.
**How to apply:** Bất cứ khi nào `data.length === 0`, dùng `<EmptyState icon title description action />`. Không import `Empty` từ antd trực tiếp.

**Rule:** Loading state — dùng `<SkeletonTable>` / `<SkeletonCard>` thay `<Spin>`
**Why:** Spinner đơn độc làm layout nhảy và UX cảm giác "bật sáng đột ngột". Skeleton giữ layout ổn định.
**How to apply:** `{isLoading ? <SkeletonTable rows={5} columns={6} /> : <Table />}`. Không `{isLoading && <Spin />}`.

**Rule:** Toast/Feedback — dùng `showFeedback.*` thay `message.*` / `notification.*`
**Why:** Hiện tại mỗi nơi dùng khác nhau — vị trí, duration, style không nhất quán.
**How to apply:** `showFeedback.success('...')` / `showFeedback.error('...')`. Không import `message` / `notification` từ antd trực tiếp trong page component.
