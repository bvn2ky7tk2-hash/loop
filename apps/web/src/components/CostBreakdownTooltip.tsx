import { Popover, Avatar, Space, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { formatNumber } from '../utils/format';
import { useThemePalette } from '../hooks/useThemePalette';

const LEVEL_BADGE: Record<string, { bg: string; color: string }> = {
  JUNIOR: { bg: '#ECFDF5', color: '#065F46' },
  MID:    { bg: '#EEF2FF', color: '#4338CA' },
  SENIOR: { bg: '#FFFBEB', color: '#92400E' },
  EXPERT: { bg: '#FEF2F2', color: '#991B1B' },
};

export interface MemberCost {
  fullName: string;
  level: string;
  allocationRole: string;
  ratePerDay: number;
  actualHours: number;
  cost: number;
}

interface Props {
  member: MemberCost;
  children: React.ReactNode;
}

const { Text } = Typography;

function Content({ member }: { member: MemberCost }) {
  const { linkColor, textSecondary, bgCard } = useThemePalette();
  const md = formatNumber(member.actualHours / 8);
  return (
    <div style={{ width: 300 }}>
      <Space align="center" style={{ marginBottom: 10 }}>
        <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: linkColor }} />
        <div>
          <Text strong style={{ display: 'block' }}>{member.fullName}</Text>
          {(() => { const cfg = LEVEL_BADGE[member.level] ?? { bg: bgCard, color: textSecondary }; return <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: '2px 8px', background: cfg.bg, color: cfg.color, display: 'inline-block', marginTop: 2 }}>{member.level}</span>; })()}
          <Text type="secondary" style={{ fontSize: 12 }}> {member.allocationRole}</Text>
        </div>
      </Space>

      <div style={{ borderTop: '1px solid var(--ant-color-border)', paddingTop: 8 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text type="secondary">Effort</Text>
          <Text>{md} MD ({member.actualHours}h)</Text>
        </Space>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 4 }}>
          <Text type="secondary">Đơn giá</Text>
          <Text>{formatNumber(member.ratePerDay)} VND/MD</Text>
        </Space>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--ant-color-border)' }}>
          <Text strong>Chi phí</Text>
          <Text strong style={{ color: linkColor }}>{formatNumber(member.cost)} VND</Text>
        </Space>
      </div>
    </div>
  );
}

export default function CostBreakdownTooltip({ member, children }: Props) {
  return (
    <Popover
      content={<Content member={member} />}
      title="Chi tiết chi phí"
      trigger="hover"
      placement="left"
    >
      {children}
    </Popover>
  );
}
