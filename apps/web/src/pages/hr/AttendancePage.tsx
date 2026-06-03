import { Tabs } from 'antd';
import { ScheduleOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/ui/PageHeader';
import { MonthlyTab } from './attendance/components/MonthlyTab';
import { DetailTab } from './attendance/components/DetailTab';
import { ManualEntryTab } from './attendance/components/ManualEntryTab';

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
            label: 'Chi tiết chấm công',
            children: <DetailTab />,
          },
          {
            key: 'monthly',
            label: 'Bảng công tháng',
            children: <MonthlyTab />,
          },
          {
            key: 'manual',
            label: 'Nhập chấm công',
            children: <ManualEntryTab />,
          },
        ]}
      />
    </div>
  );
}
