import { Tabs } from 'antd';
import { ScheduleOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/ui/PageHeader';
import { MonthlyTab } from './attendance/components/MonthlyTab';
import { DetailTab } from './attendance/components/DetailTab';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AttendancePage() {
  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Bảng công"
        icon={<ScheduleOutlined />}
        iconColor="#3B82F6"
      />

      <Tabs
        defaultActiveKey="detail"
        items={[
          {
            key: 'detail',
            label: 'Bảng công chi tiết',
            children: <DetailTab />,
          },
          {
            key: 'monthly',
            label: 'Bảng công tháng',
            children: <MonthlyTab />,
          },
        ]}
      />
    </div>
  );
}
