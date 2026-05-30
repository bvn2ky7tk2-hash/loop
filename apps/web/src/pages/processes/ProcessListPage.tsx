import { useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Popconfirm,
  App, Space, Tag, Tooltip, theme,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import {
  PlusOutlined, EditOutlined, PlayCircleOutlined,
  CheckCircleOutlined, StopOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  useDefinitions, useCreateDefinition, usePatchDefinitionStatus,
  useUpdateDefinition, useDeleteDefinition, useStartInstance,
  type ProcessDefinition, type DefinitionStatus,
} from '../../api/processes.api';
import { DefinitionStatusBadge } from './components/ProcessStatusBadge';
import { FieldBuilderDrawer } from './components/FieldBuilderDrawer';
import dayjs from 'dayjs';

export default function ProcessListPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProcessDefinition | null>(null);
  const [startTarget, setStartTarget] = useState<ProcessDefinition | null>(null);
  const [fieldBuilderTarget, setFieldBuilderTarget] = useState<ProcessDefinition | null>(null);

  const [createForm] = Form.useForm<{ name: string; description?: string }>();
  const [editForm] = Form.useForm<{ name: string; description?: string }>();
  const [startForm] = Form.useForm<{ variables?: string }>();

  const { data, isLoading } = useDefinitions({ page: 1, pageSize: 100 });
  const createMutation = useCreateDefinition();
  const updateMutation = useUpdateDefinition();
  const patchStatus = usePatchDefinitionStatus();
  const deleteMutation = useDeleteDefinition();
  const startInstance = useStartInstance();

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async (values: { name: string; description?: string }) => {
    await createMutation.mutateAsync({ name: values.name, description: values.description, bpmnXml: DEFAULT_BPMN });
    setCreateOpen(false);
    createForm.resetFields();
    message.success('Đã tạo quy trình mới');
    qc.invalidateQueries({ queryKey: ['process-definitions'] });
  };

  // ── Edit metadata ─────────────────────────────────────────────────────────
  const openEdit = (record: ProcessDefinition) => {
    setEditTarget(record);
    editForm.setFieldsValue({ name: record.name, description: record.description });
  };

  const handleEdit = async (values: { name: string; description?: string }) => {
    if (!editTarget) return;
    await updateMutation.mutateAsync({ id: editTarget.id, data: { name: values.name, description: values.description } });
    message.success('Đã cập nhật thông tin');
    setEditTarget(null);
    editForm.resetFields();
  };

  // ── Status actions ────────────────────────────────────────────────────────
  const handleActivate = (id: string) =>
    patchStatus.mutate({ id, status: 'ACTIVE' }, {
      onSuccess: () => message.success('Đã kích hoạt'),
      onError: (e: unknown) => message.error((e as { message?: string })?.message ?? 'Không thể kích hoạt'),
    });

  const handleDeactivate = (id: string) =>
    patchStatus.mutate({ id, status: 'DRAFT' }, {
      onSuccess: () => message.success('Đã huỷ kích hoạt'),
      onError: () => message.error('Không thể huỷ kích hoạt'),
    });

  const handleDelete = (id: string) =>
    deleteMutation.mutate(id, {
      onSuccess: () => message.success('Đã xoá'),
      onError: () => message.error('Không thể xoá quy trình đang kích hoạt'),
    });

  // ── Start instance ────────────────────────────────────────────────────────
  const handleStart = async (values: { variables?: string }) => {
    if (!startTarget) return;
    let variables: Record<string, unknown> = {};
    if (values.variables?.trim()) {
      try { variables = JSON.parse(values.variables) as Record<string, unknown>; }
      catch { message.error('Variables phải là JSON hợp lệ'); return; }
    }
    await startInstance.mutateAsync({ definitionId: startTarget.id, variables });
    setStartTarget(null);
    startForm.resetFields();
    message.success('Đã khởi động instance');
    navigate('/processes/instances');
  };

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Tên quy trình',
      dataIndex: 'name',
      render: (name: string, record: ProcessDefinition) => (
        <span onClick={() => navigate(`/processes/modeler/${record.id}`)} style={{ fontWeight: 600, color: token.colorText, cursor: 'pointer' }}>
          {name}
        </span>
      ),
    },
    { title: 'Mô tả', dataIndex: 'description', ellipsis: true },
    {
      title: 'Phiên bản',
      dataIndex: 'version',
      render: (v: number) => <Tag>v{v}</Tag>,
      width: 80,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (s: DefinitionStatus) => <DefinitionStatusBadge status={s} />,
      width: 130,
    },
    {
      title: 'Cập nhật',
      dataIndex: 'updatedAt',
      render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
      width: 110,
    },
    {
      title: '',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: ProcessDefinition) => (
        <Space size={4}>
          {/* Sửa thông tin */}
          <Tooltip title="Sửa thông tin">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>

          {/* Kích hoạt */}
          {record.status === 'DRAFT' && (
            <Tooltip title="Kích hoạt">
              <Popconfirm title="Kích hoạt quy trình này?" onConfirm={() => handleActivate(record.id)}>
                <Button size="small" icon={<CheckCircleOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}

          {/* Khởi động instance */}
          {record.status === 'ACTIVE' && (
            <Tooltip title="Khởi động">
              <Button
                size="small" type="primary" icon={<PlayCircleOutlined />}
                onClick={() => { setStartTarget(record); startForm.resetFields(); }}
              />
            </Tooltip>
          )}

          {/* Huỷ kích hoạt */}
          {record.status === 'ACTIVE' && (
            <Tooltip title="Huỷ kích hoạt">
              <Popconfirm
                title="Huỷ kích hoạt quy trình này? Các instance đang chạy vẫn tiếp tục."
                onConfirm={() => handleDeactivate(record.id)}
              >
                <Button size="small" icon={<StopOutlined />} danger />
              </Popconfirm>
            </Tooltip>
          )}

          {/* Xoá — khi không kích hoạt (DRAFT hoặc DEPRECATED) */}
          {record.status !== 'ACTIVE' && (
            <Tooltip title="Xoá">
              <Popconfirm
                title="Xoá quy trình này? Hành động không thể hoàn tác."
                onConfirm={() => handleDelete(record.id)}
              >
                <Button size="small" icon={<DeleteOutlined />} danger />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-wrapper">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Process Configuration</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          Tạo quy trình
        </Button>
      </div>

      <Table
        dataSource={data?.data ?? []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="middle"
        pagination={{ total: data?.meta.total, pageSize: data?.meta.pageSize, showSizeChanger: false }}
      />

      {/* Modal tạo mới */}
      <Modal title="Tạo quy trình mới" open={createOpen}
        onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
        onOk={() => createForm.submit()} confirmLoading={createMutation.isPending}>
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="Tên quy trình" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input placeholder="VD: Quy trình xét duyệt ngân sách" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả ngắn gọn mục đích quy trình" />
          </Form.Item>
        </Form>
      </Modal>

      {/* CenteredModal sửa thông tin */}
      <CenteredModal
        title="Sửa thông tin quy trình"
        open={!!editTarget}
        onClose={() => { setEditTarget(null); editForm.resetFields(); }}
        footer={
          <Space style={{ justifyContent: 'flex-end', display: 'flex' }}>
            <Button onClick={() => { setEditTarget(null); editForm.resetFields(); }}>Huỷ</Button>
            <Button type="primary" loading={updateMutation.isPending} onClick={() => editForm.submit()}>Lưu</Button>
          </Space>
        }
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item name="name" label="Tên quy trình" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={4} />
          </Form.Item>
          {editTarget && (
            <>
              <Button
                type="dashed"
                block
                style={{ marginBottom: 12 }}
                onClick={() => setFieldBuilderTarget(editTarget)}
              >
                Cấu hình trường nhập liệu ({editTarget.formFields?.length ?? 0} trường)
              </Button>
              <div style={{ color: '#8c8c8c', fontSize: 12 }}>
                Để sửa sơ đồ BPMN, nhấn tên quy trình để vào Modeler.
              </div>
            </>
          )}
        </Form>
      </CenteredModal>

      {/* Field Builder */}
      <FieldBuilderDrawer
        definition={fieldBuilderTarget}
        open={!!fieldBuilderTarget}
        onClose={() => setFieldBuilderTarget(null)}
      />

      {/* Modal khởi động instance */}
      <Modal
        title={`Khởi động: ${startTarget?.name ?? ''}`}
        open={!!startTarget}
        onCancel={() => { setStartTarget(null); startForm.resetFields(); }}
        onOk={() => startForm.submit()} confirmLoading={startInstance.isPending}
        okText="Khởi động"
      >
        <Form form={startForm} layout="vertical" onFinish={handleStart}>
          <Form.Item name="variables" label="Biến khởi đầu (JSON, tùy chọn)"
            help='Ví dụ: {"projectId": "abc123"}'>
            <Input.TextArea rows={4} placeholder='{"key": "value"}' style={{ fontFamily: 'monospace' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

const DEFAULT_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Bắt đầu" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="82" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
