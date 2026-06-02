import { Tag } from 'antd';
import type { Vehicle, VehicleRequest } from '../../api/vehicle-booking';

export function VehicleStatusTag({ status, isDark }: { status: Vehicle['status']; isDark: boolean }) {
  if (status === 'AVAILABLE') {
    return (
      <Tag
        style={isDark ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' } : {}}
        color={isDark ? undefined : 'green'}
      >
        Sẵn sàng
      </Tag>
    );
  }
  if (status === 'IN_USE') {
    return (
      <Tag
        style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}
        color={isDark ? undefined : 'blue'}
      >
        Đang dùng
      </Tag>
    );
  }
  if (status === 'MAINTENANCE') {
    return (
      <Tag
        style={isDark ? { background: 'rgba(251,191,36,0.15)', color: '#FCD34D', borderColor: 'rgba(251,191,36,0.3)' } : {}}
        color={isDark ? undefined : 'orange'}
      >
        Bảo trì
      </Tag>
    );
  }
  return (
    <Tag
      style={isDark ? { background: 'rgba(148,163,184,0.15)', color: '#CBD5E1', borderColor: 'rgba(148,163,184,0.3)' } : {}}
      color={isDark ? undefined : 'default'}
    >
      Đã nghỉ hưu
    </Tag>
  );
}

export function RequestStatusTag({ status, isDark }: { status: VehicleRequest['status']; isDark: boolean }) {
  const map: Record<VehicleRequest['status'], { label: string; style: Record<string, string>; color: string }> = {
    PENDING:     { label: 'Chờ duyệt',  style: isDark ? { background: 'rgba(251,191,36,0.15)', color: '#FCD34D', borderColor: 'rgba(251,191,36,0.3)' } : {}, color: 'orange' },
    APPROVED:    { label: 'Đã duyệt',   style: isDark ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' } : {}, color: 'green' },
    REJECTED:    { label: 'Từ chối',    style: isDark ? { background: 'rgba(248,113,113,0.15)', color: '#FCA5A5', borderColor: 'rgba(248,113,113,0.3)' } : {}, color: 'red' },
    IN_PROGRESS: { label: 'Đang đi',    style: isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}, color: 'blue' },
    COMPLETED:   { label: 'Hoàn thành', style: isDark ? { background: 'rgba(52,211,153,0.12)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.25)' } : {}, color: 'cyan' },
    CANCELLED:   { label: 'Đã hủy',     style: isDark ? { background: 'rgba(148,163,184,0.15)', color: '#CBD5E1', borderColor: 'rgba(148,163,184,0.3)' } : {}, color: 'default' },
  };
  const cfg = map[status];
  return <Tag style={isDark ? cfg.style : {}} color={isDark ? undefined : cfg.color}>{cfg.label}</Tag>;
}
