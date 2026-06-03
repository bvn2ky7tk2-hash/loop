import { Button, Form, Input, DatePicker, Space, Row, Col, Typography } from 'antd';
import type { FormInstance } from 'antd';
import dayjs from 'dayjs';

import { CenteredModal } from '../../../../components/ui/CenteredModal';
import { RELATIONSHIP_LABEL } from '../constants';
import type { FamilyMember } from '../../../../api/hr-profile';
import type { Palette } from '../types';

const { Text } = Typography;

interface DependentModalProps {
  open: boolean;
  form: FormInstance;
  target: FamilyMember | null;
  loading: boolean;
  palette: Palette;
  onClose: () => void;
  onSubmit: () => void;
  onUnregister: () => void;
}

export function DependentModal({ open, form, target, loading, palette, onClose, onSubmit, onUnregister }: DependentModalProps) {
  const { textPrimary, textMuted, isDark } = palette;
  return (
    <CenteredModal
      open={open}
      onClose={onClose}
      title={target?.dependent ? 'Cập nhật đăng ký người phụ thuộc' : `Đăng ký người phụ thuộc — ${target?.fullName ?? ''}`}
      width={480}
      footer={
        <Space>
          <Button onClick={onClose}>Hủy</Button>
          {target?.dependent && (
            <Button
              danger
              loading={loading}
              onClick={onUnregister}
            >
              Hủy đăng ký
            </Button>
          )}
          <Button
            type="primary"
            loading={loading}
            onClick={onSubmit}
          >
            {target?.dependent ? 'Lưu thay đổi' : 'Đăng ký'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item name="taxId" label="Mã số thuế / Số CCCD người phụ thuộc">
          <Input placeholder="Nhập MST hoặc số CCCD" />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="registeredFrom" label="Ngày bắt đầu tính giảm trừ" rules={[{ required: true, message: 'Chọn ngày' }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="registeredTo" label="Ngày kết thúc (để trống nếu vô thời hạn)">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
        </Row>
        {target && (
          <div style={{ padding: '10px 12px', background: isDark ? 'rgba(99,102,241,0.1)' : '#EEF2FF', borderRadius: 8, fontSize: 13 }}>
            <Text style={{ color: textMuted }}>Thông tin từ hồ sơ: </Text>
            <Text style={{ color: textPrimary }}>{target.fullName}</Text>
            <Text style={{ color: textMuted }}> · {RELATIONSHIP_LABEL[target.relationship] ?? target.relationship}</Text>
            {target.birthdate && <Text style={{ color: textMuted }}> · {dayjs(target.birthdate).format('DD/MM/YYYY')}</Text>}
          </div>
        )}
      </Form>
    </CenteredModal>
  );
}
