import { useState } from 'react';
import {
  Select, Table, Button, Modal, Form, Switch, InputNumber,
  Badge, List, Avatar, Popconfirm, App, Tabs,
} from 'antd';
import { PlusOutlined, DeleteOutlined, BellOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '../../api/projects';
import { useThemePalette } from '../../hooks/useThemePalette';
import { notificationsApi, type Notification } from '../../api/notifications';
import { apiClient } from '../../api/client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);


const ALERT_TYPES = [
  { value: 'TASK_OVERDUE', label: 'Task quá hạn' },
  { value: 'TASK_DUE_TODAY', label: 'Task đến hạn hôm nay' },
  { value: 'TASK_DUE_SOON', label: 'Task sắp đến hạn' },
  { value: 'TASK_APPROVED', label: 'Task được duyệt' },
  { value: 'TASK_RETURNED', label: 'Task bị trả lại' },
  { value: 'TASK_CANCELLED', label: 'Task bị huỷ' },
  { value: 'BUDGET_EXCEEDED', label: 'Vượt ngân sách' },
  { value: 'ALLOCATION_CONFLICT', label: 'Xung đột phân bổ' },
];

interface AlertConfig {
  id: string;
  type: string;
  threshold?: number;
  daysBeforeDue?: number;
  isActive: boolean;
}

export default function AlertsPage() {
  const { message } = App.useApp();
  const { textMuted } = useThemePalette();
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts', projectId],
    queryFn: () => apiClient.get<AlertConfig[]>(`/projects/${projectId}/alerts`).then((r) => r.data),
    enabled: !!projectId,
  });

  const { data: notificationFeed } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
  });
  const notifications = notificationFeed?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: Partial<AlertConfig>) =>
      apiClient.post(`/projects/${projectId}/alerts`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts', projectId] });
      setCreateOpen(false);
      createForm.resetFields();
      message.success('Đã lưu cấu hình cảnh báo');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (alertId: string) =>
      apiClient.delete(`/projects/${projectId}/alerts/${alertId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts', projectId] });
      message.success('Đã xoá');
    },
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const alertColumns = [
    {
      title: 'Loại cảnh báo', dataIndex: 'type',
      render: (v: string) => ALERT_TYPES.find((t) => t.value === v)?.label ?? v,
    },
    {
      title: 'Ngưỡng', dataIndex: 'threshold',
      render: (v: number) => v ? `${v}%` : '—',
    },
    {
      title: 'Ngày trước hạn', dataIndex: 'daysBeforeDue',
      render: (v: number) => v ? `${v} ngày` : '—',
    },
    {
      title: 'Kích hoạt', dataIndex: 'isActive',
      render: (v: boolean) => (
        <span style={{
          fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: '3px 10px',
          background: v ? '#ECFDF5' : '#F1F5F9',
          color: v ? '#065F46' : textMuted,
        }}>
          {v ? 'Bật' : 'Tắt'}
        </span>
      ),
    },
    {
      title: '', key: 'actions',
      render: (_: unknown, r: AlertConfig) => (
        <Popconfirm title="Xoá cảnh báo?" onConfirm={() => deleteMutation.mutate(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Alerts</h1>
      </div>

      <Tabs
        items={[
          {
            key: 'alerts',
            label: 'Cấu hình cảnh báo',
            children: (
              <>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <Select
                    style={{ width: 320 }}
                    placeholder="Chọn dự án"
                    onChange={setProjectId}
                    showSearch
                    optionFilterProp="label"
                    options={projects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
                  />
                  {projectId && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                      Thêm cảnh báo
                    </Button>
                  )}
                </div>
                <Table
                  dataSource={alerts}
                  columns={alertColumns}
                  rowKey="id"
                  size="middle"
                  locale={{ emptyText: projectId ? 'Chưa có cảnh báo' : 'Chọn dự án để xem' }}
                />
              </>
            ),
          },
          {
            key: 'notifications',
            label: (
              <Badge count={unreadCount} size="small">
                <span style={{ paddingRight: 8 }}>Thông báo</span>
              </Badge>
            ),
            children: (
              <>
                {unreadCount > 0 && (
                  <div style={{ marginBottom: 12, textAlign: 'right' }}>
                    <Button onClick={() => markAllReadMutation.mutate()}>
                      Đánh dấu tất cả đã đọc
                    </Button>
                  </div>
                )}
                <List
                  dataSource={notifications}
                  renderItem={(item: Notification) => (
                    <List.Item
                      style={{ background: item.isRead ? undefined : '#EEF2FF', borderRadius: 8, paddingLeft: 12 }}
                      actions={!item.isRead ? [
                        <Button size="small" onClick={() => markReadMutation.mutate(item.id)}>
                          Đã đọc
                        </Button>,
                      ] : []}
                    >
                      <List.Item.Meta
                        avatar={<Avatar icon={<BellOutlined />} />}
                        title={item.title}
                        description={
                          <>
                            <div>{item.body}</div>
                            <small style={{ color: 'var(--ant-color-text-secondary)' }}>
                              {dayjs(item.createdAt).fromNow()}
                            </small>
                          </>
                        }
                      />
                    </List.Item>
                  )}
                />
              </>
            ),
          },
        ]}
      />

      <Modal
        title="Thêm cảnh báo"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form form={createForm} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="type" label="Loại cảnh báo" rules={[{ required: true }]}>
            <Select options={ALERT_TYPES} />
          </Form.Item>
          <Form.Item name="threshold" label="Ngưỡng (%)">
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="daysBeforeDue" label="Số ngày trước hạn">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="isActive" label="Kích hoạt" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
