import { Modal, Form, Input, Select, DatePicker, Switch, Typography, Row, Col } from 'antd';
import type { FormInstance } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import type { CalendarEvent } from '../../../api/calendar';

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface EventFormModalProps {
  open: boolean;
  form: FormInstance;
  editingEvent: CalendarEvent | null;
  textPrimary: string;
  bgContainer: string;
  confirmLoading: boolean;
  pickedRange: [string, string] | null;
  setPickedRange: (range: [string, string] | null) => void;
  availableRooms: any[];
  employeesList: any[];
  onCancel: () => void;
  onSubmit: () => void;
}

export function EventFormModal({
  open,
  form,
  editingEvent,
  textPrimary,
  bgContainer,
  confirmLoading,
  pickedRange,
  setPickedRange,
  availableRooms,
  employeesList,
  onCancel,
  onSubmit,
}: EventFormModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      onOk={onSubmit}
      confirmLoading={confirmLoading}
      title={
        <Text style={{ color: textPrimary, fontWeight: 700 }}>
          {editingEvent ? 'Chỉnh sửa sự kiện' : 'Thêm sự kiện mới'}
        </Text>
      }
      okText={editingEvent ? 'Lưu thay đổi' : 'Tạo sự kiện'}
      cancelText="Hủy"
      styles={{ body: { background: bgContainer }, header: { background: bgContainer } }}
      width={560}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="title"
          label={<Text style={{ color: textPrimary }}>Tiêu đề</Text>}
          rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
        >
          <Input placeholder="Tên sự kiện..." />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="eventType"
              label={<Text style={{ color: textPrimary }}>Loại sự kiện</Text>}
            >
              <Select
                options={[
                  { value: 'MEETING',  label: 'Họp' },
                  { value: 'HOLIDAY',  label: 'Nghỉ lễ' },
                  { value: 'TRAINING', label: 'Đào tạo' },
                  { value: 'DEADLINE', label: 'Deadline' },
                  { value: 'OTHER',    label: 'Khác' },
                ]}
                defaultValue="MEETING"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="isAllDay"
              label={<Text style={{ color: textPrimary }}>Cả ngày</Text>}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="range"
          label={<Text style={{ color: textPrimary }}>Thời gian</Text>}
          rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
        >
          <RangePicker
            showTime={{ format: 'HH:mm' }}
            format="DD/MM/YYYY HH:mm"
            style={{ width: '100%' }}
            onChange={(dates) => {
              if (dates?.[0] && dates?.[1]) {
                setPickedRange([dates[0].toISOString(), dates[1].toISOString()]);
              } else {
                setPickedRange(null);
              }
            }}
          />
        </Form.Item>

        <Form.Item
          name="roomId"
          label={<Text style={{ color: textPrimary }}>Phòng họp</Text>}
        >
          <Select
            allowClear
            placeholder={pickedRange ? 'Chọn phòng trống...' : 'Chọn thời gian trước để lọc phòng trống'}
            disabled={!pickedRange}
            onChange={(roomId) => {
              if (roomId) {
                const room = (availableRooms as any[]).find((r) => r.id === roomId);
                if (room) form.setFieldValue('location', room.name);
              }
            }}
            options={(availableRooms as any[]).map((r) => ({
              value: r.id,
              label: `${r.name}${r.floor ? ` — ${r.floor}` : ''} (${r.capacity ?? '?'} người)`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="location"
          label={<Text style={{ color: textPrimary }}>Địa điểm</Text>}
        >
          <Input placeholder="Phòng họp, địa chỉ..." prefix={<EnvironmentOutlined />} />
        </Form.Item>

        <Form.Item
          name="description"
          label={<Text style={{ color: textPrimary }}>Mô tả</Text>}
        >
          <TextArea rows={3} placeholder="Nội dung, ghi chú..." />
        </Form.Item>

        <Form.Item
          name="attendees"
          label={<Text style={{ color: textPrimary }}>Người tham dự</Text>}
        >
          <Select
            mode="multiple"
            allowClear
            showSearch
            placeholder="Chọn nhân viên tham dự..."
            optionFilterProp="label"
            options={(employeesList as any[]).map((e) => ({
              value: e.fullName,
              label: `${e.code ? e.code + ' — ' : ''}${e.fullName}`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
