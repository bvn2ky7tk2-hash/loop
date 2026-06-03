import { Descriptions, Badge, Typography } from 'antd';
import dayjs from 'dayjs';
import type { Profile360 } from '../../../../api/hr-profile';

import { formatCurrency } from '../../../../utils/format';
import type { Palette } from '../types';

const { Text } = Typography;

interface InsuranceTabProps {
  insurance: Profile360['insurance'];
  cardStyle: React.CSSProperties;
  palette: Palette;
}

export function InsuranceTab({ insurance, cardStyle, palette }: InsuranceTabProps) {
  const { textPrimary, textMuted } = palette;
  return insurance ? (
    <div style={{ ...cardStyle, maxWidth: 480 }}>
      <Text strong style={{ color: textPrimary, display: 'block', marginBottom: 14, fontSize: 14 }}>Thông tin BHXH</Text>
      <Descriptions column={1} size="small">
        <Descriptions.Item label={<Text style={{ color: textMuted }}>Trạng thái</Text>}>
          <Badge status={insurance.status === 'ACTIVE' ? 'success' : 'default'} text={<Text style={{ color: textPrimary }}>{insurance.status === 'ACTIVE' ? 'Đang đóng' : insurance.status}</Text>} />
        </Descriptions.Item>
        <Descriptions.Item label={<Text style={{ color: textMuted }}>Mức đóng</Text>}>
          <Text style={{ color: textPrimary, fontWeight: 600 }}>{formatCurrency(insurance.insuranceSalary)}</Text>
        </Descriptions.Item>
        <Descriptions.Item label={<Text style={{ color: textMuted }}>Ngày bắt đầu</Text>}>
          <Text style={{ color: textMuted }}>{dayjs(insurance.startDate).format('DD/MM/YYYY')}</Text>
        </Descriptions.Item>
        <Descriptions.Item label={<Text style={{ color: textMuted }}>Số sổ BHXH</Text>}>
          <Text style={{ color: textPrimary }}>{insurance.bhxhBookNumber ?? '—'}</Text>
        </Descriptions.Item>
      </Descriptions>
    </div>
  ) : <Text style={{ color: textMuted }}>Chưa có thông tin BHXH</Text>;
}
