import { Button, Form, Input, Select, DatePicker, Space, Row, Col, Typography, Divider } from 'antd';
import type { FormInstance } from 'antd';

import { CenteredModal } from '../../../../components/ui/CenteredModal';
import { type WorkSchedule } from '../../../../api/work-shifts';
import type { SelectOption } from './AssignmentFormModal';

const { Text } = Typography;

export function EnrollModal({
  open,
  onClose,
  form,
  target,
  employeeOptions,
  onSave,
  saving,
  isDark,
  textPrimary,
  textMuted,
}: {
  open: boolean;
  onClose: () => void;
  form: FormInstance;
  target: WorkSchedule | null;
  employeeOptions: SelectOption[];
  onSave: () => void;
  saving: boolean;
  isDark: boolean;
  textPrimary: string;
  textMuted: string;
}) {
  return (
    <CenteredModal
      open={open}
      onClose={onClose}
      title={`Gán nhân sự — ${target?.name ?? ''}`}
      width={540}
      footer={
        <Space>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="primary" loading={saving} disabled={saving} onClick={onSave}>Gán vào lịch</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        <div style={{
          background: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
          borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: textMuted,
        }}>
          Chọn nhân viên hoặc phòng ban để áp dụng lịch xoay ca <strong style={{ color: textPrimary }}>
            {target?.name}
          </strong>. Nhân sự trong lịch sẽ tự động nhận ca theo chu kỳ đã cấu hình.
        </div>

        <Form.Item name="employeeIds" label="Nhân viên (chọn nhiều)">
          <Select
            mode="multiple" showSearch placeholder="Tìm và chọn nhân viên..."
            optionFilterProp="label" options={employeeOptions}
          />
        </Form.Item>

        <Divider style={{ margin: '4px 0 12px' }}>
          <Text style={{ color: textMuted, fontSize: 11 }}>hoặc theo phòng ban</Text>
        </Divider>

        <Form.Item name="orgUnitId" label="Phòng ban (tất cả nhân viên trong phòng)">
          <Select allowClear placeholder="Chọn phòng ban..." options={[]} disabled />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="effectiveFrom" label="Hiệu lực từ ngày" rules={[{ required: true, message: 'Chọn ngày bắt đầu' }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="effectiveTo" label="Đến ngày (để trống = vô thời hạn)">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="VD: Áp dụng từ kỳ mới..." />
        </Form.Item>
      </Form>
    </CenteredModal>
  );
}
