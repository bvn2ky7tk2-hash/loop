import { StatusBadge } from '../../components/ui/StatusBadge';
import type { StatusTone } from '../../components/ui/StatusBadge';
import type { Vehicle, VehicleRequest } from '../../api/vehicle-booking';

// `isDark` giữ lại trong signature để không phá vỡ callers; StatusBadge tự xử lý dark/light.
export function VehicleStatusTag({ status }: { status: Vehicle['status']; isDark?: boolean }) {
  const map: Record<Vehicle['status'], { label: string; tone: StatusTone }> = {
    AVAILABLE:   { label: 'Sẵn sàng',    tone: 'success' },
    IN_USE:      { label: 'Đang dùng',   tone: 'processing' },
    MAINTENANCE: { label: 'Bảo trì',     tone: 'warning' },
    RETIRED:     { label: 'Đã nghỉ hưu', tone: 'neutral' },
  };
  const cfg = map[status] ?? map.RETIRED;
  return <StatusBadge label={cfg.label} tone={cfg.tone} />;
}

export function RequestStatusTag({ status }: { status: VehicleRequest['status']; isDark?: boolean }) {
  const map: Record<VehicleRequest['status'], { label: string; tone: StatusTone }> = {
    PENDING:     { label: 'Chờ duyệt',  tone: 'warning' },
    APPROVED:    { label: 'Đã duyệt',   tone: 'success' },
    REJECTED:    { label: 'Từ chối',    tone: 'error' },
    IN_PROGRESS: { label: 'Đang đi',    tone: 'processing' },
    COMPLETED:   { label: 'Hoàn thành', tone: 'success' },
    CANCELLED:   { label: 'Đã hủy',     tone: 'neutral' },
  };
  const cfg = map[status];
  return <StatusBadge label={cfg.label} tone={cfg.tone} />;
}
