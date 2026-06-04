import { Tag, Typography } from 'antd';

const { Text } = Typography;

// Helper: flatten org-unit tree thành mảng phẳng để dùng trong Select
export type OrgTreeNode = { id: string; name: string; children?: OrgTreeNode[] };

export function flattenOrgTree(nodes: OrgTreeNode[]): { id: string; name: string }[] {
  const result: { id: string; name: string }[] = [];
  const walk = (items: OrgTreeNode[], depth: number) => {
    for (const n of items) {
      result.push({ id: n.id, name: ' '.repeat(depth * 2) + n.name });
      if (n.children?.length) walk(n.children, depth + 1);
    }
  };
  walk(nodes, 0);
  return result;
}

export const ATTENDANCE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PRESENT:       { label: 'Đi làm',      color: '#10B981' },
  ABSENT:        { label: 'Vắng mặt',    color: '#EF4444' },
  LEAVE:         { label: 'Nghỉ phép',   color: '#F59E0B' },
  ON_LEAVE:      { label: 'Nghỉ phép',   color: '#F59E0B' },
  HALF_DAY:      { label: 'Nửa ngày',    color: '#F59E0B' },
  HOLIDAY:       { label: 'Ngày lễ',     color: '#8B5CF6' },
  OT:            { label: 'Tăng ca',     color: '#F97316' },
  LATE:          { label: 'Đi muộn',     color: '#EF4444' },
  BUSINESS_TRIP: { label: 'Công tác',    color: '#3B82F6' },
  ONSITE:        { label: 'Onsite',      color: '#3B82F6' },
  WFH:           { label: 'Làm từ xa',   color: '#06B6D4' },
};

// Cờ lỗi chấm công (đồng bộ ExplanationType) — hiển thị kèm trạng thái, luôn màu đỏ.
export const ATTENDANCE_ANOMALY_MAP: Record<string, string> = {
  LATE_ARRIVAL:    'Đi muộn',
  EARLY_DEPARTURE: 'Về sớm',
  MISSING_CHECKIN: 'Thiếu giờ vào',
  MISSING_CHECKOUT: 'Thiếu giờ ra',
};

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

export function StatusTag({ status, isDark }: { status: string; isDark: boolean }) {
  const meta = ATTENDANCE_STATUS_MAP[status];
  if (!meta) return <Text>{status}</Text>;
  return (
    <Tag
      style={isDark ? {
        background: hexToRgba(meta.color, 0.15),
        color: meta.color,
        borderColor: hexToRgba(meta.color, 0.35),
      } : {}}
      color={isDark ? undefined : meta.color}
    >
      {meta.label}
    </Tag>
  );
}

// Render danh sách cờ lỗi chấm công (tag đỏ nhỏ), đứng sau StatusTag.
export function AnomalyTags({ anomalies, isDark }: { anomalies?: string[]; isDark: boolean }) {
  if (!anomalies?.length) return null;
  return (
    <>
      {anomalies.map((a) => (
        <Tag
          key={a}
          style={isDark
            ? { background: 'rgba(248,113,113,0.15)', color: '#FCA5A5', borderColor: 'rgba(248,113,113,0.3)', fontSize: 11, marginTop: 2 }
            : { fontSize: 11, marginTop: 2 }}
          color={isDark ? undefined : 'red'}
        >
          {ATTENDANCE_ANOMALY_MAP[a] ?? a}
        </Tag>
      ))}
    </>
  );
}
