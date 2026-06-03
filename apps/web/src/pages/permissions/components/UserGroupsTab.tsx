import { useState } from 'react';
import {
  Table, Tag, Button, Space, App, Popconfirm, Badge, Alert,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SettingOutlined, ApartmentOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userGroupsApi, type UserGroup } from '../../../api/user-groups';
import { useThemePalette } from '../../../hooks/useThemePalette';
import { GroupDrawer } from './GroupDrawer';

// ─── Tab: Nhóm người dùng ─────────────────────────────────────────────────────

export function UserGroupsTab() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { isDark, preset, textMuted } = useThemePalette();
  const [drawerGroupId, setDrawerGroupId] = useState<string | null | undefined>(undefined);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['user-groups'],
    queryFn: userGroupsApi.list,
  });

  const deleteMut = useMutation({
    mutationFn: userGroupsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-groups'] });
      message.success('Đã xoá nhóm');
    },
  });

  const border = isDark ? '#334155' : '#E2E8F0';

  const cols = [
    {
      title: 'Tên nhóm',
      dataIndex: 'name',
      render: (name: string, row: UserGroup) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
          {row.description && (
            <div style={{ fontSize: 12, color: textMuted }}>{row.description}</div>
          )}
          {row.isDefault && <Tag color="green" style={{ marginTop: 2, fontSize: 11 }}>Mặc định</Tag>}
        </div>
      ),
    },
    {
      title: 'Quyền',
      dataIndex: '_count',
      width: 100,
      render: (c: UserGroup['_count']) => (
        <div style={{ textAlign: 'center' }}>
          <Badge count={c?.permissions ?? 0} showZero style={{ backgroundColor: preset.primary }} />
          <div style={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8', marginTop: 2 }}>quyền</div>
        </div>
      ),
    },
    {
      title: 'Thành viên',
      dataIndex: '_count',
      width: 100,
      render: (c: UserGroup['_count']) => (
        <div style={{ textAlign: 'center' }}>
          <Badge count={c?.members ?? 0} showZero style={{ backgroundColor: '#059669' }} />
          <div style={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8', marginTop: 2 }}>người</div>
        </div>
      ),
    },
    {
      title: 'Phạm vi tổ chức',
      dataIndex: 'orgAccess',
      render: (acc: UserGroup['orgAccess']) => (
        acc && acc.length > 0
          ? <Tag color="blue" icon={<ApartmentOutlined />}>{acc.length} đơn vị</Tag>
          : <Tag color="orange">Theo vai trò</Tag>
      ),
    },
    {
      title: 'Thao tác',
      width: 140,
      render: (_: unknown, row: UserGroup) => (
        <Space>
          <Button
            size="small" icon={<SettingOutlined />}
            onClick={() => setDrawerGroupId(row.id)}
          >
            Chỉnh sửa
          </Button>
          <Popconfirm
            title="Xoá nhóm này?"
            description="Tất cả quyền và thành viên sẽ bị xoá theo."
            onConfirm={() => deleteMut.mutate(row.id)}
            okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Alert
        type="info" showIcon style={{ marginBottom: 14 }}
        message="Nhóm người dùng giúp phân quyền theo tập thể. User thuộc nhiều nhóm sẽ được cộng quyền (union). Phạm vi tổ chức xác định dữ liệu nào user được xem."
      />
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <Button icon={<PlusOutlined />} type="primary" onClick={() => setDrawerGroupId(null)}>
          Tạo nhóm mới
        </Button>
      </div>
      <Table
        loading={isLoading}
        dataSource={groups}
        rowKey="id"
        columns={cols}
        size="small"
        pagination={false}
        style={{ border: `1px solid ${border}`, borderRadius: 8 }}
        rowClassName={() => 'perm-row'}
      />
      {drawerGroupId !== undefined && (
        <GroupDrawer
          open
          groupId={drawerGroupId}
          onClose={() => setDrawerGroupId(undefined)}
        />
      )}
    </>
  );
}
