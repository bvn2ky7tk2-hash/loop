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
  PRESENT: { label: 'Đi làm',    color: '#10B981' },
  ABSENT:  { label: 'Vắng mặt',  color: '#EF4444' },
  LEAVE:   { label: 'Nghỉ phép', color: '#F59E0B' },
  HOLIDAY: { label: 'Ngày lễ',   color: '#8B5CF6' },
  OT:      { label: 'Tăng ca',   color: '#F97316' },
};

export function StatusTag({ status, isDark }: { status: string; isDark: boolean }) {
  const meta = ATTENDANCE_STATUS_MAP[status];
  if (!meta) return <Text>{status}</Text>;
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };
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
