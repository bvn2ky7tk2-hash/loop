import { useState } from 'react';
import { Table, Button, Tag, Space, Typography, Switch, App } from 'antd';
import { PlusOutlined, EditOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leavesApi, type LeaveType } from '../../api/leaves';
import { useThemePalette } from '../../hooks/useThemePalette';
import { confirmDelete } from '../../components/ui/confirmDelete';
import LeaveTypeConfigModal from './LeaveTypeConfigModal';

const { Text } = Typography;

export default function LeaveTypesManager() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { textPrimary, textMuted, bgContainer, borderColor } = useThemePalette();
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: types = [], isLoading } = useQuery({
    queryKey: ['leave-types', 'manage'],
    queryFn: () => leavesApi.getTypes(true),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => leavesApi.updateType(id, { isActive }),
    onSuccess: () => { message.success('Đã cập nhật'); qc.invalidateQueries({ queryKey: ['leave-types'] }); },
    onError: () => message.error('Cập nhật thất bại'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => leavesApi.deleteType(id),
    onSuccess: () => { message.success('Đã vô hiệu hóa'); qc.invalidateQueries({ queryKey: ['leave-types'] }); },
    onError: () => message.error('Thao tác thất bại'),
  });

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (t: LeaveType) => { setEditing(t); setModalOpen(true); };

  const columns: ColumnsType<LeaveType> = [
    {
      title: 'Loại nghỉ',
      render: (_: unknown, t: LeaveType) => (
        <Space>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: t.color, display: 'inline-block' }} />
          <Text style={{ color: textPrimary, fontWeight: 500 }}>{t.name}</Text>
        </Space>
      ),
    },
    { title: 'Ngày/năm', dataIndex: 'maxDaysPerYear', width: 100, align: 'center', render: (v: number) => <Text style={{ color: textMuted }}>{v}</Text> },
    {
      title: 'Hưởng lương', dataIndex: 'isPaid', width: 110, align: 'center',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Có lương' : 'Không lương'}</Tag>,
    },
    {
      title: 'Trừ phép năm', dataIndex: 'deductsAnnualLeave', width: 120, align: 'center',
      render: (v?: boolean) => v ? <Tag color="orange">Trừ phép năm</Tag> : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Quy trình BPM', dataIndex: 'processDefinitionKey', width: 160,
      render: (v?: string | null) => v ? <Tag color="blue">{v}</Tag> : <Text style={{ color: textMuted }}>Duyệt trực tiếp</Text>,
    },
    {
      title: 'Trạng thái', dataIndex: 'isActive', width: 120, align: 'center',
      render: (v: boolean, t: LeaveType) => (
        <Switch size="small" checked={v} checkedChildren="Bật" unCheckedChildren="Tắt"
          loading={toggleMutation.isPending}
          onChange={(checked) => toggleMutation.mutate({ id: t.id, isActive: checked })} />
      ),
    },
    {
      title: '', width: 90, align: 'center',
      render: (_: unknown, t: LeaveType) => (
        <Space size={2}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(t)} />
          {t.isActive && (
            <Button type="text" size="small" danger icon={<StopOutlined />}
              onClick={() => confirmDelete({ itemName: t.name, onConfirm: () => deactivateMutation.mutate(t.id) })} />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: textMuted, fontSize: 13 }}>
          <CheckCircleOutlined style={{ marginRight: 6 }} />
          Khai báo các loại nghỉ, cấu hình "trừ phép năm" và gắn quy trình duyệt (BPM).
        </Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm loại nghỉ</Button>
      </div>
      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={types}
        size="middle"
        pagination={false}
        style={{ background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 8 }}
      />
      <LeaveTypeConfigModal leaveType={editing} open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
