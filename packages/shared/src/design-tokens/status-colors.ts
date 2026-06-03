// Màu trạng thái theo domain — gom về 1 nguồn để mobile thôi hardcode rải rác.
// Khớp ngữ nghĩa StatCard/StatusPill của web (chỉ màu sáng đủ tương phản text trắng).

export const STATUS_COLORS = {
  task: {
    TODO:             '#94A3B8',
    IN_PROGRESS:      '#3B82F6',
    DONE:             '#10B981',
    OVERDUE:          '#EF4444',
    PENDING_APPROVAL: '#F59E0B',
  },
  project: {
    PLANNING: '#94A3B8',
    ACTIVE:   '#3B82F6',
    ON_HOLD:  '#F59E0B',
    CLOSED:   '#64748B',
  },
  request: {
    PENDING:   '#F59E0B',
    APPROVED:  '#10B981',
    REJECTED:  '#EF4444',
    CANCELLED: '#94A3B8',
    PAID:      '#3B82F6',
  },
} as const;

export type StatusDomain = keyof typeof STATUS_COLORS;

export function getStatusColor(domain: StatusDomain, status: string): string {
  const group = STATUS_COLORS[domain] as Record<string, string>;
  return group[status] ?? '#94A3B8';
}
