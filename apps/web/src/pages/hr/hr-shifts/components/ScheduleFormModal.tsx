import { Button, Form, Input, Select, Space, Row, Col, Typography, Segmented, Divider } from 'antd';
import type { FormInstance } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';

import { CenteredModal } from '../../../../components/ui/CenteredModal';
import { type WorkShift, type ScheduleRepeatType } from '../../../../api/work-shifts';
import { REPEAT_META } from './constants';

const { Text } = Typography;

export function ScheduleFormModal({
  open,
  onClose,
  form,
  shifts,
  scheduleRepeatType,
  setScheduleRepeatType,
  onSave,
  saving,
  isDark,
  textMuted,
  borderColor,
}: {
  open: boolean;
  onClose: () => void;
  form: FormInstance;
  shifts: WorkShift[];
  scheduleRepeatType: ScheduleRepeatType;
  setScheduleRepeatType: (v: ScheduleRepeatType) => void;
  onSave: () => void;
  saving: boolean;
  isDark: boolean;
  textMuted: string;
  borderColor: string;
}) {
  return (
    <CenteredModal
      open={open}
      onClose={onClose}
      title="Tạo lịch làm việc xoay ca"
      width={600}
      footer={
        <Space>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="primary" loading={saving} disabled={saving} onClick={onSave}>Tạo lịch</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" requiredMark="optional"
        initialValues={{ repeatType: 'WEEKLY', phases: [{ shiftId: undefined }] }}>
        <Row gutter={12}>
          <Col span={24}>
            <Form.Item name="name" label="Tên lịch" rules={[{ required: true, message: 'Nhập tên lịch' }]}>
              <Input placeholder="VD: Lịch xoay ca sáng-chiều nhà máy A" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="description" label="Mô tả">
          <Input placeholder="Mô tả ngắn về lịch này..." />
        </Form.Item>

        <Form.Item name="repeatType" label="Kiểu lặp" rules={[{ required: true }]}>
          <Segmented
            block
            value={scheduleRepeatType}
            options={[
              { label: '🌅 Theo ngày', value: 'DAILY' },
              { label: '📅 Theo tuần', value: 'WEEKLY' },
              { label: '🗓️ Theo tháng', value: 'MONTHLY' },
            ]}
            onChange={(v) => {
              setScheduleRepeatType(v as ScheduleRepeatType);
              form.setFieldValue('repeatType', v);
            }}
          />
        </Form.Item>

        <div style={{
          background: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
          borderRadius: 8, padding: '6px 10px', marginBottom: 12, fontSize: 12, color: textMuted,
        }}>
          {scheduleRepeatType === 'DAILY' && '💡 Mỗi ngày đổi sang ca tiếp theo. VD: Ca sáng → Ca chiều → Ca đêm → Ca sáng → …'}
          {scheduleRepeatType === 'WEEKLY' && '💡 Mỗi tuần đổi ca. VD: Tuần 1 ca sáng, tuần 2 ca chiều, rồi lặp lại.'}
          {scheduleRepeatType === 'MONTHLY' && '💡 Mỗi tháng đổi ca. VD: 1 tháng hành chính, 1 tháng ca đêm.'}
        </div>

        <Divider style={{ margin: '8px 0 16px' }}>
          <Text style={{ color: textMuted, fontSize: 12 }}>Các ca trong chu kỳ</Text>
        </Divider>

        <Form.List name="phases" rules={[{
          validator: async (_, phases) => {
            if (!phases || phases.length < 1) return Promise.reject('Cần ít nhất 1 ca');
          },
        }]}>
          {(fields, { add, remove }, { errors }) => (
            <>
              {fields.map((field, index) => (
                <Form.Item key={field.key} style={{ marginBottom: 8 }}>
                  <Row gutter={8} align="middle">
                    <Col flex="100px">
                      <Text style={{ color: textMuted, fontSize: 13 }}>
                        {REPEAT_META[scheduleRepeatType].phaseLabel} {index + 1}
                      </Text>
                    </Col>
                    <Col flex="auto">
                      <Form.Item {...field} name={[field.name, 'shiftId']} noStyle rules={[{ required: true, message: 'Chọn ca' }]}>
                        <Select
                          placeholder="Chọn ca làm việc"
                          showSearch optionFilterProp="label"
                          options={shifts.map((s) => ({ value: s.id, label: `${s.name} (${s.startTime}–${s.endTime})` }))}
                        />
                      </Form.Item>
                    </Col>
                    {fields.length > 1 && (
                      <Col flex="32px">
                        <Button type="text" size="small" danger icon={<MinusCircleOutlined />} onClick={() => remove(field.name)} />
                      </Col>
                    )}
                  </Row>
                </Form.Item>
              ))}
              <Form.Item>
                <Button
                  type="dashed" onClick={() => add()} block icon={<PlusOutlined />}
                  style={{ color: textMuted, borderColor }}
                >
                  Thêm {REPEAT_META[scheduleRepeatType].phaseLabel.toLowerCase()} tiếp theo
                </Button>
                <Form.ErrorList errors={errors} />
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </CenteredModal>
  );
}
