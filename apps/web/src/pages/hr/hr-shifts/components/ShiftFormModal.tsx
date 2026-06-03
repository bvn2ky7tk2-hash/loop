import { Button, Form, Input, Select, InputNumber, Space, Row, Col } from 'antd';
import type { FormInstance } from 'antd';

import { CenteredModal } from '../../../../components/ui/CenteredModal';
import { type WorkShift } from '../../../../api/work-shifts';
import { SHIFT_TYPE_MAP } from './constants';

export function ShiftFormModal({
  open,
  onClose,
  form,
  editShift,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  form: FormInstance;
  editShift: WorkShift | null;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <CenteredModal
      open={open}
      onClose={onClose}
      title={editShift ? `Sửa ca: ${editShift.name}` : 'Thêm ca làm việc'}
      width={540}
      footer={
        <Space>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="primary" loading={saving} disabled={saving} onClick={onSave}>
            {editShift ? 'Lưu thay đổi' : 'Tạo ca'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        <Row gutter={12}>
          <Col span={14}>
            <Form.Item name="name" label="Tên ca" rules={[{ required: true, message: 'Nhập tên ca' }]}>
              <Input placeholder="VD: Ca Hành Chính" />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item name="code" label="Mã ca" rules={[{ required: true }, { pattern: /^[A-Z0-9_-]+$/, message: 'Chỉ dùng chữ hoa, số' }]}>
              <Input placeholder="VD: HC" onChange={(e) => form.setFieldValue('code', e.target.value.toUpperCase())} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="type" label="Loại ca" rules={[{ required: true }]}>
          <Select placeholder="Chọn loại ca" options={Object.entries(SHIFT_TYPE_MAP).map(([k, v]) => ({ value: k, label: v.label }))} />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="startTime" label="Giờ bắt đầu" rules={[{ required: true }]}>
              <Input placeholder="HH:mm — VD: 08:00" maxLength={5} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="endTime" label="Giờ kết thúc" rules={[{ required: true }]}>
              <Input placeholder="HH:mm — VD: 17:00" maxLength={5} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="breakMinutes" label="Nghỉ giữa ca (phút)" initialValue={60}>
          <InputNumber min={0} max={120} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="workingDays" label="Thứ làm việc trong tuần"
          initialValue={[1, 2, 3, 4, 5]}
          tooltip="Dùng để tính công chuẩn. VD hành chính off T7+CN; công nhân chỉ off CN."
        >
          <Select
            mode="multiple"
            placeholder="Chọn các thứ làm việc"
            options={[
              { value: 1, label: 'Thứ 2' }, { value: 2, label: 'Thứ 3' },
              { value: 3, label: 'Thứ 4' }, { value: 4, label: 'Thứ 5' },
              { value: 5, label: 'Thứ 6' }, { value: 6, label: 'Thứ 7' },
              { value: 7, label: 'Chủ nhật' },
            ]}
          />
        </Form.Item>
        {editShift && (
          <Form.Item name="isActive" label="Trạng thái" initialValue={true}>
            <Select options={[{ value: true, label: 'Hoạt động' }, { value: false, label: 'Dừng' }]} />
          </Form.Item>
        )}
        <Form.Item name="description" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="Mô tả thêm..." />
        </Form.Item>
      </Form>
    </CenteredModal>
  );
}
