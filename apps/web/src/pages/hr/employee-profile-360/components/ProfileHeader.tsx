import { Avatar, Tag, Button, Space, Typography } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { avatarColor, getInitials } from '../constants';
import type { Palette, Personal } from '../types';

const { Text, Title } = Typography;

interface ProfileHeaderProps {
  personal: Personal | undefined;
  statusCfg: { label: string; color: string };
  cardStyle: React.CSSProperties;
  palette: Palette;
  onEdit: () => void;
  onCreateDecision: () => void;
}

export function ProfileHeader({ personal, statusCfg, cardStyle, palette, onEdit, onCreateDecision }: ProfileHeaderProps) {
  const { textPrimary, textMuted, isDark, linkColor } = palette;
  return (
    <div style={{ ...cardStyle, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <Avatar size={72} style={{ background: avatarColor(personal?.fullName ?? 'NV'), fontSize: 24, fontWeight: 700, flexShrink: 0 }}>
        {getInitials(personal?.fullName ?? 'NV')}
      </Avatar>
      <div style={{ flex: 1, minWidth: 200 }}>
        <Title level={4} style={{ margin: 0, color: textPrimary }}>{personal?.fullName}</Title>
        <Text style={{ color: textMuted, display: 'block', marginTop: 2 }}>
          {personal?.position?.jobTitle?.name ?? personal?.position?.code ?? '—'} &nbsp;·&nbsp; {personal?.orgUnit?.name ?? '—'}
        </Text>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Tag
            color={isDark ? undefined : statusCfg.color}
            style={isDark && personal?.employeeStatus === 'ACTIVE' ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' }
              : isDark && personal?.employeeStatus === 'PROBATION' ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}
          >
            {statusCfg.label}
          </Tag>
          <Text style={{ color: textMuted, fontSize: 12 }}>Mã NV: <Text style={{ color: textPrimary, fontWeight: 600 }}>{personal?.code}</Text></Text>
          {personal?.startDate && <Text style={{ color: textMuted, fontSize: 12 }}>Ngày vào: {dayjs(personal.startDate).format('DD/MM/YYYY')}</Text>}
          {personal?.tenure?.formatted && <Text style={{ color: textMuted, fontSize: 12 }}>Thâm niên: <Text style={{ color: textPrimary, fontWeight: 600 }}>{personal.tenure.formatted}</Text></Text>}
          {personal?.phoneNumber && <Text style={{ color: textMuted, fontSize: 12 }}>SĐT: <a href={`tel:${personal.phoneNumber}`} style={{ color: linkColor }}>{personal.phoneNumber}</a></Text>}
        </div>
      </div>
      <Space>
        <Button icon={<EditOutlined />} onClick={onEdit}>Chỉnh sửa</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreateDecision}>Tạo quyết định</Button>
      </Space>
    </div>
  );
}
