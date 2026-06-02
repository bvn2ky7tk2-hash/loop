import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dropdown, Spin, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { timesheetApi, type WorkStatusType } from '../../api/timesheet';

const STATUS_CONFIG: Record<WorkStatusType, { label: string; color: string; dot: string }> = {
  WORKING:       { label: 'Đang làm việc', color: '#10B981', dot: '🟢' },
  WFH:           { label: 'Làm từ xa',     color: '#4F46E5', dot: '🏠' },
  MEETING:       { label: 'Đang họp',      color: '#F59E0B', dot: '📅' },
  BREAK:         { label: 'Nghỉ giải lao', color: '#94A3B8', dot: '☕' },
  OFF:           { label: 'Nghỉ phép',     color: '#EF4444', dot: '🔴' },
  BUSINESS_TRIP: { label: 'Công tác',      color: '#0369A1', dot: '✈️' },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG) as WorkStatusType[];

export function StatusPill() {
  const qc = useQueryClient();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['timesheet-today'],
    queryFn: timesheetApi.todaySummary,
    refetchInterval: 60_000,
  });

  const { mutate: setStatus, isPending } = useMutation({
    mutationFn: (type: WorkStatusType) => timesheetApi.setStatus(type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet-today'] }),
  });

  const currentStatus = summary?.currentStatus;
  const cfg = currentStatus ? STATUS_CONFIG[currentStatus] : null;

  const menuItems: MenuProps['items'] = ALL_STATUSES.map((type) => {
    const c = STATUS_CONFIG[type];
    return {
      key: type,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: c.color,
              flexShrink: 0,
            }}
          />
          {c.label}
        </span>
      ),
      onClick: () => setStatus(type),
    };
  });

  if (isLoading) return <Spin size="small" style={{ margin: '0 8px' }} />;

  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
      <Tooltip title="Cập nhật trạng thái">
        <span
          style={{
            cursor: 'pointer',
            borderRadius: 12,
            padding: '2px 10px',
            fontSize: 12,
            lineHeight: '20px',
            userSelect: 'none',
            opacity: isPending ? 0.6 : 1,
            transition: 'opacity 0.2s',
            border: `1px solid ${cfg?.color ?? '#CBD5E1'}`,
            color: cfg?.color ?? '#94A3B8',
            backgroundColor: cfg ? `${cfg.color}18` : undefined,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: cfg?.color ?? '#94A3B8',
              display: 'inline-block',
              marginRight: 6,
            }}
          />
          {cfg ? cfg.label : 'Chưa có trạng thái'}
        </span>
      </Tooltip>
    </Dropdown>
  );
}
