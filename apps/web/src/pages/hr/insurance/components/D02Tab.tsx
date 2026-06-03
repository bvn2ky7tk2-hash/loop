import { Table, Button, DatePicker, Space, Typography } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';

import { hrInsuranceApi } from '../../../../api/hr-insurance';
import type { buildD02EnrolledCols, buildD02SalaryChangedCols } from '../columns';

const { Text } = Typography;

type D02Preview = Awaited<ReturnType<typeof hrInsuranceApi.exportD02>>;

interface D02TabProps {
  textPrimary: string;
  d02Month: Dayjs | null;
  setD02Month: (v: Dayjs | null) => void;
  setD02Preview: (v: D02Preview | null) => void;
  d02Preview: D02Preview | null;
  d02Loading: boolean;
  onPreview: () => void;
  onExport: () => void;
  enrolledCols: ReturnType<typeof buildD02EnrolledCols>;
  salaryChangedCols: ReturnType<typeof buildD02SalaryChangedCols>;
}

export function D02Tab({
  textPrimary,
  d02Month,
  setD02Month,
  setD02Preview,
  d02Preview,
  d02Loading,
  onPreview,
  onExport,
  enrolledCols,
  salaryChangedCols,
}: D02TabProps) {
  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <DatePicker.MonthPicker
          placeholder="Chọn tháng/năm"
          value={d02Month}
          onChange={(val) => {
            setD02Month(val);
            setD02Preview(null);
          }}
          format="MM/YYYY"
          style={{ width: 160 }}
        />
        <Button onClick={onPreview} loading={d02Loading}>
          Xem trước
        </Button>
        <Button type="primary" icon={<FileTextOutlined />} onClick={onExport} disabled={!d02Month}>
          Xuất Excel
        </Button>
      </Space>

      {d02Preview && (
        <div>
          <Text strong style={{ color: textPrimary, display: 'block', marginBottom: 8, fontSize: 15 }}>
            Tăng lao động ({d02Preview.enrolled.length} người)
          </Text>
          <Table
            rowKey="employeeCode"
            columns={enrolledCols}
            dataSource={d02Preview.enrolled}
            pagination={false}
            size="small"
            style={{ marginBottom: 24 }}
          />

          <Text strong style={{ color: textPrimary, display: 'block', marginBottom: 8, fontSize: 15 }}>
            Giảm lao động ({d02Preview.terminated.length} người)
          </Text>
          <Table
            rowKey="employeeCode"
            columns={enrolledCols}
            dataSource={d02Preview.terminated}
            pagination={false}
            size="small"
            style={{ marginBottom: 24 }}
          />

          <Text strong style={{ color: textPrimary, display: 'block', marginBottom: 8, fontSize: 15 }}>
            Điều chỉnh mức đóng ({d02Preview.salaryChanged.length} người)
          </Text>
          <Table
            rowKey="employeeCode"
            columns={salaryChangedCols}
            dataSource={d02Preview.salaryChanged}
            pagination={false}
            size="small"
          />
        </div>
      )}
    </div>
  );
}
