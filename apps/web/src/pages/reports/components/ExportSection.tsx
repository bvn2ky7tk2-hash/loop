import { useState } from 'react';
import { Card, Form, Select, DatePicker, Button, App } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { reportsApi } from '../../../api/reports';
import type { ReportType } from '../../../api/reports';
import dayjs from 'dayjs';

export function ExportSection({ chartCardStyle }: { chartCardStyle: React.CSSProperties }) {
  const { message } = App.useApp();
  const [exportLoading, setExportLoading] = useState(false);
  const [exportForm] = Form.useForm<{ reportType: ReportType; dateRange: [import('dayjs').Dayjs, import('dayjs').Dayjs] }>();

  return (
    <Card
      title={<><DownloadOutlined style={{ marginRight: 8 }} />Xuất báo cáo Excel</>}
      style={{ marginTop: 24, ...chartCardStyle }}
    >
      <Form
        form={exportForm}
        layout="inline"
        initialValues={{
          reportType: 'PROJECT_COST' as ReportType,
          dateRange: [dayjs().subtract(1, 'month').startOf('month'), dayjs().endOf('month')],
        }}
        onFinish={async (values) => {
          setExportLoading(true);
          try {
            await reportsApi.generate({
              reportType: values.reportType,
              startDate: values.dateRange[0].format('YYYY-MM-DD'),
              endDate:   values.dateRange[1].format('YYYY-MM-DD'),
            });
            void message.success('Tải xuống thành công');
          } catch {
            void message.error('Không thể tạo báo cáo');
          } finally {
            setExportLoading(false);
          }
        }}
      >
        <Form.Item name="reportType" label="Loại báo cáo">
          <Select style={{ width: 220 }}>
            <Select.Option value="PROJECT_COST">Chi phí dự án</Select.Option>
            <Select.Option value="PERSONNEL_ALLOCATION">Phân bổ nhân sự</Select.Option>
            <Select.Option value="TASK_PROGRESS">Tiến độ công việc</Select.Option>
            <Select.Option value="TIMESHEET_SUMMARY">Tổng hợp bảng công</Select.Option>
            <Select.Option value="ALERT_HISTORY">Lịch sử cảnh báo</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="dateRange" label="Kỳ báo cáo">
          <DatePicker.RangePicker format="DD/MM/YYYY" />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<DownloadOutlined />}
            loading={exportLoading}
          >
            Tải xuống (.xlsx)
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
