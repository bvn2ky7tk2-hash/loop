import { useState } from 'react';
import {
  Button, Table, Space, Modal, Form, Input,
  Select, Switch, InputNumber, App, Popconfirm, Tag,
  Typography, Divider,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, HolderOutlined,
} from '@ant-design/icons';
import {
  type FormField,
  type CriterionConfig,
} from '../../../../api/processes.api';
import { FIELD_TYPE_LABELS, type FieldType } from './constants';

interface FieldTabContentProps {
  tabKey: string;
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  description: string;
  isDark: boolean;
  cardStyle: React.CSSProperties;
}

export function FieldTabContent({ fields, onChange, description }: FieldTabContentProps) {
  const { message } = App.useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FormField | null>(null);
  const [fieldForm] = Form.useForm<FormField & { optionsRaw?: string; criteriaRaw?: string }>();
  const [watchType, setWatchType] = useState<FieldType>('text');

  const openAdd = () => {
    setEditTarget(null);
    fieldForm.resetFields();
    setWatchType('text');
    setAddOpen(true);
  };

  const openEdit = (field: FormField) => {
    setEditTarget(field);
    if (field.type === 'select') {
      const optionsRaw = field.options?.map((o) => `${o.label}:${o.value}`).join('\n') ?? '';
      fieldForm.setFieldsValue({ ...field, optionsRaw });
    } else if (field.type === 'criteria_grid') {
      const criteriaRaw = field.criteria.map((c) => `${c.label}:${c.key}:${c.weight}`).join('\n');
      fieldForm.setFieldsValue({ ...field, criteriaRaw });
    } else {
      fieldForm.setFieldsValue({ ...field });
    }
    setWatchType(field.type);
    setAddOpen(true);
  };

  const handleSaveField = (values: FormField & { optionsRaw?: string; criteriaRaw?: string }) => {
    let parsed: FormField;

    if (values.type === 'criteria_grid') {
      const criteria: CriterionConfig[] = (values.criteriaRaw ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split(':');
          return {
            label: parts[0]?.trim() ?? line,
            key: parts[1]?.trim() ?? parts[0]?.trim().toLowerCase().replace(/\s+/g, '_') ?? line,
            weight: parseFloat(parts[2] ?? '0') || 0,
          };
        });
      parsed = {
        name: values.name.trim(),
        label: values.label.trim(),
        type: 'criteria_grid',
        required: values.required ?? false,
        criteria,
        scoreMin: (values as { scoreMin?: number }).scoreMin ?? 1,
        scoreMax: (values as { scoreMax?: number }).scoreMax ?? 5,
      };
    } else if (values.type === 'select') {
      parsed = {
        name: values.name.trim(),
        label: values.label.trim(),
        type: 'select',
        required: values.required ?? false,
        placeholder: (values as { placeholder?: string }).placeholder || undefined,
        options: (values.optionsRaw ?? '').split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [label, value] = line.split(':');
            return { label: label?.trim() ?? line, value: value?.trim() ?? line };
          }),
      };
    } else {
      parsed = {
        name: values.name.trim(),
        label: values.label.trim(),
        type: values.type as 'text' | 'textarea' | 'number' | 'date',
        required: values.required ?? false,
        placeholder: (values as { placeholder?: string }).placeholder || undefined,
        min: (values as { min?: number }).min,
        max: (values as { max?: number }).max,
      } as FormField;
    }

    if (editTarget) {
      onChange(fields.map((f) => (f.name === editTarget.name ? parsed : f)));
    } else {
      if (fields.some((f) => f.name === parsed.name)) {
        message.error('Tên field đã tồn tại, vui lòng dùng tên khác');
        return;
      }
      onChange([...fields, parsed]);
    }
    setAddOpen(false);
  };

  const columns = [
    {
      title: '',
      width: 24,
      render: () => <HolderOutlined style={{ color: '#8c8c8c', cursor: 'grab' }} />,
    },
    {
      title: 'Tên field',
      dataIndex: 'name',
      render: (n: string) => <code style={{ fontSize: 12 }}>{n}</code>,
    },
    { title: 'Nhãn hiển thị', dataIndex: 'label' },
    {
      title: 'Loại',
      dataIndex: 'type',
      render: (t: FieldType) => (
        <Tag color={t === 'criteria_grid' ? 'purple' : undefined}>
          {FIELD_TYPE_LABELS[t]}
        </Tag>
      ),
      width: 130,
    },
    {
      title: 'Bắt buộc',
      dataIndex: 'required',
      render: (r: boolean) => r ? <Tag color="red">Có</Tag> : <Tag>Không</Tag>,
      width: 90,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: FormField) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="Xoá trường này?"
            onConfirm={() => onChange(fields.filter((f) => f.name !== record.name))}
          >
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        {description}
      </Typography.Text>

      <Table
        dataSource={fields}
        columns={columns}
        rowKey="name"
        size="small"
        pagination={false}
        locale={{ emptyText: 'Chưa có trường nào — nhấn "Thêm trường" để bắt đầu' }}
      />

      <Button
        icon={<PlusOutlined />}
        onClick={openAdd}
        style={{ marginTop: 12 }}
        block
        type="dashed"
      >
        Thêm trường nhập liệu
      </Button>

      <Modal
        title={editTarget ? 'Sửa trường nhập liệu' : 'Thêm trường nhập liệu'}
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={() => fieldForm.submit()}
        okText="Lưu"
        width={520}
        destroyOnClose
      >
        <Form
          form={fieldForm}
          layout="vertical"
          onFinish={handleSaveField}
          onValuesChange={(changed) => {
            if (changed.type) setWatchType(changed.type as FieldType);
          }}
          style={{ marginTop: 8 }}
        >
          <Form.Item name="type" label="Loại dữ liệu" rules={[{ required: true }]} initialValue="text">
            <Select
              options={Object.entries(FIELD_TYPE_LABELS).map(([v, l]) => ({
                value: v,
                label: l,
              }))}
            />
          </Form.Item>

          <Space style={{ width: '100%' }} align="start">
            <Form.Item
              name="name"
              label="Tên field (key)"
              rules={[
                { required: true, message: 'Bắt buộc' },
                { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: 'Chỉ dùng chữ cái, số, dấu _' },
              ]}
              style={{ width: 180 }}
              tooltip="Tên biến trong hệ thống, ví dụ: selfEval, managerScore"
            >
              <Input placeholder="selfEval" disabled={!!editTarget} />
            </Form.Item>

            <Form.Item
              name="label"
              label="Nhãn hiển thị"
              rules={[{ required: true, message: 'Bắt buộc' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="Tự đánh giá" />
            </Form.Item>
          </Space>

          {watchType === 'criteria_grid' && (
            <>
              <Divider titlePlacement="left" plain style={{ fontSize: 12 }}>
                Cấu hình bảng tiêu chí
              </Divider>
              <Form.Item
                name="criteriaRaw"
                label="Danh sách tiêu chí"
                tooltip="Mỗi dòng: Tên tiêu chí:key:trọng_số. Tổng trọng số nên = 100"
                rules={[{ required: true, message: 'Vui lòng nhập ít nhất 1 tiêu chí' }]}
                help='Ví dụ: "Kỹ năng kỹ thuật:technical:30" — mỗi tiêu chí một dòng'
              >
                <Input.TextArea
                  rows={5}
                  placeholder={
                    'Kỹ năng kỹ thuật:technical:30\nKỹ năng giao tiếp:communication:20\nChủ động sáng tạo:initiative:20\nTiến độ hoàn thành:timeliness:30'
                  }
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
              </Form.Item>
              <Space style={{ width: '100%' }}>
                <Form.Item name="scoreMin" label="Điểm nhỏ nhất" initialValue={1} style={{ width: '50%' }}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
                <Form.Item name="scoreMax" label="Điểm lớn nhất" initialValue={5} style={{ width: '50%' }}>
                  <InputNumber style={{ width: '100%' }} min={1} />
                </Form.Item>
              </Space>
            </>
          )}

          {watchType !== 'criteria_grid' && (
            <Form.Item name="placeholder" label="Placeholder (tùy chọn)">
              <Input placeholder="Hướng dẫn nhập liệu..." />
            </Form.Item>
          )}

          {watchType === 'number' && (
            <Space style={{ width: '100%' }}>
              <Form.Item name="min" label="Giá trị nhỏ nhất" style={{ width: '50%' }}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="max" label="Giá trị lớn nhất" style={{ width: '50%' }}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Space>
          )}

          {watchType === 'select' && (
            <Form.Item
              name="optionsRaw"
              label="Danh sách lựa chọn"
              tooltip="Mỗi dòng một lựa chọn. Định dạng: Nhãn:giá_trị"
              rules={[{ required: true, message: 'Vui lòng nhập ít nhất 1 lựa chọn' }]}
              help='Ví dụ: "Nghỉ phép năm:annual" — mỗi lựa chọn một dòng'
            >
              <Input.TextArea
                rows={5}
                placeholder={'Nghỉ phép năm:annual\nNghỉ ốm:sick\nNghỉ bù:compensatory'}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
            </Form.Item>
          )}

          <Form.Item name="required" label="Bắt buộc điền" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
