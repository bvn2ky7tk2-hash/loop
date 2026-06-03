import { Timeline, Typography } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Profile360 } from '../../../../api/hr-profile';

import { EVENT_ICON } from '../constants';
import type { Palette } from '../types';

const { Text } = Typography;

interface WorkHistoryTabProps {
  workHistory: Profile360['workHistory'];
  palette: Palette;
}

export function WorkHistoryTab({ workHistory, palette }: WorkHistoryTabProps) {
  const { textPrimary, textMuted } = palette;
  return workHistory.length === 0
    ? <Text style={{ color: textMuted }}>Chưa có lịch sử công tác</Text>
    : <Timeline items={workHistory.map((ev) => ({
        dot: EVENT_ICON[ev.eventType] ?? <ClockCircleOutlined />,
        children: (
          <div>
            <Text strong style={{ color: textPrimary }}>{ev.title}</Text>
            <Text style={{ color: textMuted, marginLeft: 8, fontSize: 12 }}>{dayjs(ev.eventDate).format('DD/MM/YYYY')}</Text>
            {ev.description && <div><Text style={{ color: textMuted, fontSize: 13 }}>{ev.description}</Text></div>}
          </div>
        ),
      }))} />;
}
