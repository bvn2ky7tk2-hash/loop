import { Modal, Select, Form, Input, InputNumber, Switch, Spin, Typography, message } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  leavesApi,
  processDefsApi,
  type LeaveType,
  type ProcessDefinitionRef,
} from '../../api/leaves';
import { useThemePalette } from '../../hooks/useThemePalette';

const { Text } = Typography;

interface Props {
  leaveType: LeaveType | null;
  open: boolean;
  onClose: () => void;
}

export default function LeaveTypeConfigModal({ leaveType, open, onClose }: Props) {
  const { preset, textPrimary, bgContainer, borderColor } = useThemePalette();
  const qc = useQueryClient();
  const [form] = Form.useForm();

  const { data: defs = [], isLoading: defsLoading } = useQuery<ProcessDefinitionRef[]>({
    queryKey: ['process-definitions', 'active'],
    queryFn: processDefsApi.listActive,
    enabled: open,
    staleTime: 30_000,
  });
  const defsWithKey = defs.filter((d) => (d.status === 'ACTIVE' || d.status === 'DEPLOYED') && d.key);

  const isCreate = !leaveType;

  const { mutate: save, isPending } = useMutation({
    mutationFn: (v: Record<string, unknown>) =>
      isCreate
        ? leavesApi.createType(v as { name: string })
        : leavesApi.updateType(leaveType!.id, v),
    onSuccess: () => {
      message.success(isCreate ? 'Đã thêm loại nghỉ' : 'Đã cập nhật loại nghỉ');
      qc.invalidateQueries({ queryKey: ['leave-types'] });
      qc.invalidateQueries({ queryKey: ['leave-balance-me'] });
      onClose();
    },
    onError: () => message.error('Lưu thất bại'),
  });

  function syncForm(vis: boolean) {
    if (!vis) return;
    if (leaveType) {
      form.setFieldsValue({
        name: leaveType.name,
        maxDaysPerYear: leaveType.maxDaysPerYear,
        annualDays: leaveType.annualDays ?? 0,
        maxCarryOver: leaveType.maxCarryOver ?? 0,
        isPaid: leaveType.isPaid,
        deductsAnnualLeave: leaveType.deductsAnnualLeave ?? false,
        color: leaveType.color,
        processDefinitionKey: leaveType.processDefinitionKey ?? null,
        isActive: leaveType.isActive,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ maxDaysPerYear: 12, annualDays: 12, maxCarryOver: 0, isPaid: true, deductsAnnualLeave: false, color: '#2563EB', processDefinitionKey: null, isActive: true });
    }
  }

  return (
    <Modal
      title={
        <span style={{ color: textPrimary }}>
          <SettingOutlined style={{ color: preset.primary, marginRight: 8 }} />
          {isCreate ? 'Thêm loại nghỉ' : `Cấu hình loại nghỉ — ${leaveType?.name}`}
        </span>
      }
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Lưu"
      cancelText="Huỷ"
      confirmLoading={isPending}
      afterOpenChange={syncForm}
      width={520}
      styles={{
        header: { background: bgContainer, borderBottom: `1px solid ${borderColor}` },
        body:   { background: bgContainer },
        footer: { background: bgContainer, borderTop: `1px solid ${borderColor}` },
      }}
    >
      {defsLoading ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}><Spin /></div>
      ) : (
        <Form form={form} layout="vertical" onFinish={(v) => save(v)} style={{ marginTop: 8 }}>
          <Form.Item name="name" label="Tên loại nghỉ" rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input placeholder="VD: Nghỉ phép năm" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="maxDaysPerYear" label="Số ngày tối đa/năm" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="annualDays" label="Số ngày cấp/năm" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="maxCarryOver" label="Chuyển tối đa sang năm sau" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
            <Form.Item name="isPaid" label="Hưởng lương" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch />
            </Form.Item>
            <Form.Item
              name="deductsAnnualLeave"
              label={<span>Trừ vào phép năm <Text type="secondary" style={{ fontSize: 11 }}>(trừ số dư phép năm khi nghỉ)</Text></span>}
              valuePropName="checked"
              style={{ marginBottom: 0 }}
            >
              <Switch />
            </Form.Item>
            <Form.Item name="isActive" label="Hoạt động" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch />
            </Form.Item>
          </div>

          <Form.Item name="color" label="Màu hiển thị">
            <Input type="color" style={{ width: 80, height: 36, padding: 2 }} />
          </Form.Item>

          <Form.Item
            name="processDefinitionKey"
            label="Quy trình duyệt (BPM)"
            extra={<Text type="secondary" style={{ fontSize: 12 }}>Để trống = duyệt trực tiếp; chọn quy trình để chạy qua BPM khi nộp đơn.</Text>}
          >
            <Select allowClear placeholder="Duyệt trực tiếp (không qua BPM)" optionFilterProp="label" showSearch
              options={defsWithKey.map((d) => ({ value: d.key!, label: `${d.name} (${d.key})` }))}
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
