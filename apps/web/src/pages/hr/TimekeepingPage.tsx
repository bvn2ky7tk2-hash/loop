import { Tabs } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/ui/PageHeader';
import { PunchesTab } from './attendance/components/PunchesTab';
import { ManualEntryTab } from './attendance/components/ManualEntryTab';

// Màn quản lý dữ liệu chấm công GỐC (giờ quẹt thẻ thô + nhập tay).
// Bảng công (chi tiết/tháng) chỉ hiển thị kết quả đã tổng hợp từ đây.
export default function TimekeepingPage() {
  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Quản lý giờ quẹt thẻ"
        icon={<ClockCircleOutlined />}
        iconColor="#0EA5E9"
      />

      <Tabs
        defaultActiveKey="punches"
        items={[
          {
            key: 'punches',
            label: 'Giờ quẹt thẻ',
            children: <PunchesTab />,
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
