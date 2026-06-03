import {
  Button,
  Space,
  Typography,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Row,
  Col,
} from 'antd';
import type { FormInstance } from 'antd';

import { CenteredModal } from '../../../../components/ui/CenteredModal';
import { EmployeeSelect } from '../../../../components/selects';
import type { HrDecision, HrDecisionType } from '../../../../api/hr-decisions';
import { DECISION_TYPE_MAP } from '../constants';

const { Text } = Typography;
const { TextArea } = Input;

interface SelectOption {
  value: string;
  label: string;
}

interface SelectedEmpDetail {
  orgUnit?: { name?: string } | null;
  position?: { jobTitle?: { name?: string } | null } | null;
}

interface DecisionFormModalProps {
  open: boolean;
  editRecord: HrDecision | null;
  form: FormInstance;
  onClose: () => void;
  onSave: () => void;
  savePending: boolean;
  selectedType: HrDecisionType | undefined;
  onTypeChange: (v: HrDecisionType) => void;
  onEmpChange: (v: string) => void;
  onSignedByChange: (v: string | undefined) => void;
  selectedEmpDetail: SelectedEmpDetail | null | undefined;
  empOptions: SelectOption[];
  orgOptions: SelectOption[];
  positionOptions: SelectOption[];
  // palette
  textPrimary: string;
  textMuted: string;
  isDark: boolean;
}

export function DecisionFormModal({
  open,
  editRecord,
  form,
  onClose,
  onSave,
  savePending,
  selectedType,
  onTypeChange,
  onEmpChange,
  onSignedByChange,
  selectedEmpDetail,
  empOptions,
  orgOptions,
  positionOptions,
  textPrimary,
  textMuted,
  isDark,
}: DecisionFormModalProps) {
  return (
    <CenteredModal
      open={open}
      onClose={onClose}
      title={editRecord ? 'Sửa quyết định nhân sự' : 'Tạo quyết định nhân sự'}
      width={620}
      footer={
        <Space>
          <Button onClick={onClose}>Huỷ</Button>
          <Button
            type="primary"
            loading={savePending}
            disabled={savePending}
            onClick={onSave}
          >
            {editRecord ? 'Lưu thay đổi' : 'Tạo quyết định'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        {/* Loại QĐ */}
        <Form.Item
          name="type"
          label={<Text style={{ color: textPrimary }}>Loại quyết định</Text>}
          rules={[{ required: true, message: 'Vui lòng chọn loại quyết định' }]}
        >
          <Select
            placeholder="Chọn loại quyết định"
            onChange={(v: HrDecisionType) => onTypeChange(v)}
            options={Object.entries(DECISION_TYPE_MAP).map(([k, v]) => ({
              value: k,
              label: v.label,
            }))}
          />
        </Form.Item>

        {/* Nhân viên */}
        <Form.Item
          name="employeeId"
          label={<Text style={{ color: textPrimary }}>Nhân viên</Text>}
          rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}
        >
          <Select
            showSearch
            placeholder="Tìm và chọn nhân viên"
            filterOption={(input, option) =>
              String(option?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            options={empOptions}
            onChange={(v: string) => onEmpChange(v)}
          />
        </Form.Item>

        {/* Hiển thị thông tin nhân viên được chọn */}
        {selectedEmpDetail && (
          <div style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)',
            border: `1px solid ${isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}`,
            marginBottom: 16,
            display: 'flex', gap: 16, flexWrap: 'wrap',
          }}>
            <div>
              <Text style={{ fontSize: 11, color: textMuted }}>Đơn vị hiện tại</Text>
              <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>
                {selectedEmpDetail.orgUnit?.name ?? '—'}
              </div>
            </div>
            <div>
              <Text style={{ fontSize: 11, color: textMuted }}>Vị trí hiện tại</Text>
              <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>
                {selectedEmpDetail.position?.jobTitle?.name ?? '—'}
              </div>
            </div>
          </div>
        )}

        <Row gutter={12}>
          {/* Số QĐ */}
          <Col span={12}>
            <Form.Item
              name="decisionNumber"
              label={<Text style={{ color: textPrimary }}>Số quyết định</Text>}
            >
              <Input placeholder="VD: QĐ-2026-001 (để trống = tự động)" />
            </Form.Item>
          </Col>
          {/* Người ký */}
          <Col span={12}>
            <Form.Item
              name="signedByEmpId"
              label={<Text style={{ color: textPrimary }}>Người ký</Text>}
            >
              <EmployeeSelect
                allowClear
                placeholder="Chọn người ký..."
                onChange={(v) => onSignedByChange(v)}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          {/* Ngày ký */}
          <Col span={12}>
            <Form.Item
              name="signedDate"
              label={<Text style={{ color: textPrimary }}>Ngày ký</Text>}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          {/* Ngày hiệu lực */}
          <Col span={12}>
            <Form.Item
              name="effectiveDate"
              label={<Text style={{ color: textPrimary }}>Ngày hiệu lực</Text>}
              rules={[{ required: true, message: 'Bắt buộc' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
        </Row>

        {/* Conditional: Điều chỉnh lương */}
        {(selectedType === 'SALARY_CHANGE') && (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="fromSalary"
                label={<Text style={{ color: textPrimary }}>Lương hiện tại (₫)</Text>}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="toSalary"
                label={<Text style={{ color: textPrimary }}>Lương mới (₫)</Text>}
                rules={[{ required: true, message: 'Nhập lương mới' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* Conditional: Điều chuyển / Thay đổi vị trí / Biệt phái */}
        {(selectedType === 'TRANSFER' ||
          selectedType === 'SECONDMENT' ||
          selectedType === 'POSITION_CHANGE') && (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="fromOrgUnitId"
                label={<Text style={{ color: textPrimary }}>Phòng ban hiện tại</Text>}
              >
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn phòng ban..."
                  filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                  options={orgOptions}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="toOrgUnitId"
                label={<Text style={{ color: textPrimary }}>Phòng ban mới</Text>}
                rules={[{ required: true, message: 'Chọn phòng ban mới' }]}
              >
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn phòng ban..."
                  filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                  options={orgOptions}
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* Conditional: Thăng chức / Thay đổi vị trí */}
        {(selectedType === 'PROMOTION' || selectedType === 'POSITION_CHANGE') && (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="fromPositionId"
                label={<Text style={{ color: textPrimary }}>Vị trí hiện tại</Text>}
              >
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn vị trí..."
                  filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                  options={positionOptions}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="toPositionId"
                label={<Text style={{ color: textPrimary }}>Vị trí mới</Text>}
                rules={[{ required: true, message: 'Chọn vị trí mới' }]}
              >
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn vị trí..."
                  filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                  options={positionOptions}
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* Nội dung QĐ */}
        <Form.Item
          name="content"
          label={<Text style={{ color: textPrimary }}>Nội dung quyết định</Text>}
        >
          <TextArea rows={3} placeholder="Mô tả nội dung quyết định..." />
        </Form.Item>

        {/* Ghi chú */}
        <Form.Item
          name="notes"
          label={<Text style={{ color: textPrimary }}>Ghi chú</Text>}
        >
          <TextArea rows={2} placeholder="Ghi chú thêm (nếu có)..." />
        </Form.Item>
      </Form>
    </CenteredModal>
  );
}
