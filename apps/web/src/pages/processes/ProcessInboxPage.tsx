import { useState } from 'react';
import {
  Button, Modal, Select, Form, App, Input, Space, theme as antTheme,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { usersApi } from '../../api/users';
import dayjs from 'dayjs';
import { UserTaskList } from './components/UserTaskList';
import {
  useDefinitions,
  useStartInstance,
  processesApi,
  type ProcessDefinition,
  type FormField,
} from '../../api/processes.api';
import { DynamicFormFields } from './components/DynamicFormFields';

const { useToken } = antTheme;

const STATUS_OPTIONS = [
  { value: '',            label: 'Tất cả trạng thái' },
  { value: 'PENDING',     label: 'Chờ nhận' },
  { value: 'IN_PROGRESS', label: 'Đang xử lý' },
  { value: 'COMPLETED',   label: 'Hoàn thành' },
];

export default function ProcessInboxPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { token } = useToken();

  // Modal state
  const [open, setOpen] = useState(false);
  const [selectedDef, setSelectedDef] = useState<ProcessDefinition | null>(null);
  const [form] = Form.useForm();
  const startInstance = useStartInstance();

  // Filter state
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatus]         = useState('');
  const [defFilter, setDefFilter]         = useState('');
  const [assigneeFilter, setAssignee]     = useState('');
  const [requesterFilter, setRequester]   = useState('');

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

  const { data: defsData } = useDefinitions({ pageSize: 100 });
  const activeDefinitions = (defsData?.data ?? []).filter((d) => d.status === 'ACTIVE');

  const handleDefChange = (id: string) => {
    const def = activeDefinitions.find((d) => d.id === id) ?? null;
    setSelectedDef(def);
    form.resetFields(def?.formFields?.map((f) => f.name) ?? []);
  };

  const handleClose = () => {
    setOpen(false);
    form.resetFields();
    setSelectedDef(null);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (!selectedDef) return;

    const variables: Record<string, unknown> = {};
    for (const field of selectedDef.formFields ?? []) {
      const val = values[field.name];
      if (val !== undefined && val !== null && val !== '') {
        variables[field.name] = dayjs.isDayjs(val) ? val.format('YYYY-MM-DD') : val;
      }
    }

    try {
      const result = await startInstance.mutateAsync({
        definitionId: selectedDef.id,
        variables,
      });

      const instanceId = result.data.id;

      const tasksRes = await processesApi.listUserTasks({ instanceId, pageSize: 10 });
      const firstTask = tasksRes.data.find((t) => t.status === 'PENDING');
      if (firstTask) {
        await processesApi.claimTask(firstTask.id);
      }

      await qc.invalidateQueries({ queryKey: ['process-user-tasks'] });
      message.success(`Đã gửi yêu cầu "${selectedDef.name}" — task đầu tiên đã được giao cho bạn`);
      handleClose();

      navigate(`/processes/instances/${instanceId}`);
    } catch {
      message.error('Không thể tạo yêu cầu');
    }
  };

  return (
    <div className="page-wrapper">
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <h1 className="page-title">Process Management</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setOpen(true)}
          disabled={activeDefinitions.length === 0}
        >
          Tạo yêu cầu mới
        </Button>
      </div>

      {/* ── Bộ lọc ── */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          padding: '12px 16px',
          marginBottom: 12,
          background: token.colorFillAlter,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadius,
        }}
      >
        <Input
          prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
          placeholder="Tìm theo tên công việc..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 220 }}
        />
        <Select
          value={statusFilter}
          onChange={setStatus}
          options={STATUS_OPTIONS}
          style={{ width: 170 }}
        />
        <Select
          placeholder="Tất cả quy trình"
          value={defFilter || undefined}
          onChange={setDefFilter}
          allowClear
          options={[
            ...activeDefinitions.map((d) => ({ value: d.id, label: d.name })),
          ]}
          style={{ width: 230 }}
        />
        <Select
          showSearch
          placeholder="Người yêu cầu"
          allowClear
          style={{ width: 185 }}
          filterOption={(input, opt) =>
            (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={users.map((u) => ({ value: u.id, label: u.name }))}
          onChange={(v) => setRequester(v ?? '')}
        />
        <Select
          showSearch
          placeholder="Người xử lý"
          allowClear
          style={{ width: 185 }}
          filterOption={(input, opt) =>
            (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={users.map((u) => ({ value: u.id, label: u.name }))}
          onChange={(v) => setAssignee(v ?? '')}
        />
        {(search || statusFilter || defFilter || assigneeFilter || requesterFilter) && (
          <Button
            size="small"
            onClick={() => { setSearch(''); setStatus(''); setDefFilter(''); setAssignee(''); setRequester(''); }}
          >
            Xóa bộ lọc
          </Button>
        )}
        <Space style={{ marginLeft: 'auto' }}>
          <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
            Bộ lọc đang hoạt động
          </span>
        </Space>
      </div>

      <UserTaskList
        showInstanceInfo
        searchFilter={search}
        statusFilter={statusFilter}
        definitionIdFilter={defFilter}
        assigneeIdFilter={assigneeFilter}
        requesterIdFilter={requesterFilter}
      />

      <Modal
        title="Tạo yêu cầu mới"
        open={open}
        onCancel={handleClose}
        onOk={() => form.submit()}
        confirmLoading={startInstance.isPending}
        okText="Gửi yêu cầu"
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 8 }}>
          <Form.Item
            name="definitionId"
            label="Loại yêu cầu"
            rules={[{ required: true, message: 'Vui lòng chọn loại yêu cầu' }]}
          >
            <Select
              placeholder="Chọn quy trình..."
              onChange={handleDefChange}
              options={activeDefinitions.map((d) => ({
                value: d.id,
                label: d.name,
                description: d.description,
              }))}
              optionRender={(opt) => (
                <div>
                  <div>{opt.label}</div>
                  {opt.data.description && (
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>{opt.data.description}</div>
                  )}
                </div>
              )}
            />
          </Form.Item>

          {selectedDef && (selectedDef.formFields ?? []).length > 0 && (
            <DynamicFormFields fields={selectedDef.formFields as FormField[]} />
          )}
        </Form>
      </Modal>
    </div>
  );
}
