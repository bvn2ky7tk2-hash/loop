import { useState } from 'react';
import { Layout, Button, Tooltip, Avatar, Dropdown, Popover, App, Form, Input, Modal, Select } from 'antd';
import {
  MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, LogoutOutlined,
  BgColorsOutlined, PlusOutlined, CheckSquareOutlined, BugOutlined,
  KeyOutlined, ApartmentOutlined,
} from '@ant-design/icons';
import { useThemeStore } from '../../store/theme.store';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api/auth';
import { notificationsApi } from '../../api/notifications';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../NotificationBell';
import { ThemePanel } from '../ui/ThemePanel';
import { BugCreateDrawer } from '../bugs/BugCreateDrawer';
import { projectsApi } from '../../api/projects';
import { tasksApi } from '../../api/tasks';
import { ChangePasswordModal } from '../ChangePasswordModal';
import { GlobalSearch } from './GlobalSearch';

const { Header } = Layout;

interface AppTopbarProps {
  sidebarWidth: number;
  onToggle?: () => void;
}

function QuickTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const qc = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
    enabled: open,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['project-members', selectedProject],
    queryFn: () => selectedProject ? projectsApi.getMembers(selectedProject) : Promise.resolve([]),
    enabled: !!selectedProject,
  });

  const createMut = useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: object }) =>
      tasksApi.create(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      message.success('Tạo task thành công');
      form.resetFields();
      setSelectedProject(null);
      onClose();
    },
    onError: () => message.error('Tạo task thất bại'),
  });

  const handleFinish = (values: { projectId: string; title: string; assigneeId?: string }) => {
    createMut.mutate({ projectId: values.projectId, data: { title: values.title, assigneeId: values.assigneeId } });
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedProject(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={<><CheckSquareOutlined style={{ marginRight: 8 }} />Tạo Task mới</>}
      okText="Tạo mới"
      cancelText="Huỷ"
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={createMut.isPending}
      width={480}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} style={{ marginTop: 12 }}>
        <Form.Item name="projectId" label="Dự án" rules={[{ required: true, message: 'Chọn dự án' }]}>
          <Select
            showSearch
            placeholder="Chọn dự án..."
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(val) => { setSelectedProject(val); form.setFieldValue('assigneeId', undefined); }}
          />
        </Form.Item>
        <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề task' }]}>
          <Input placeholder="Tiêu đề task" />
        </Form.Item>
        <Form.Item name="assigneeId" label="Người thực hiện">
          <Select
            showSearch allowClear
            disabled={!selectedProject}
            placeholder={selectedProject ? 'Chọn người thực hiện...' : 'Chọn dự án trước'}
            filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
            options={members.map((m) => ({
              value: m.employeeId,
              label: m.employee?.fullName ?? m.employeeId,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function AppTopbar({ sidebarWidth, onToggle }: AppTopbarProps) {
  const { mode, preset } = useThemeStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [quickTaskOpen,      setQuickTaskOpen]      = useState(false);
  const [quickBugOpen,       setQuickBugOpen]       = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
  });

  const handleLogout = async () => {
    await authApi.logout().catch(() => {});
    logout();
    navigate('/login', { replace: true });
  };

  const isDark      = mode === 'dark';
  const topbarBg    = isDark ? '#0F172A' : preset.navBg;
  const iconColor   = '#fff';
  const borderColor = isDark ? '#1E293B' : 'transparent';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const firstName = user?.name?.split(' ').at(-1) ?? user?.name ?? '';

  const userMenuItems = [
    {
      key: 'name',
      label: (
        <span>
          <span style={{ fontWeight: 600, display: 'block' }}>{user?.name}</span>
          <span style={{ fontSize: 11, opacity: 0.55 }}>{user?.role ?? 'MEMBER'}</span>
        </span>
      ),
      disabled: true,
    },
    { type: 'divider' as const },
    {
      key: 'change-password',
      icon: <KeyOutlined />,
      label: 'Đổi mật khẩu',
      onClick: () => setChangePasswordOpen(true),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      onClick: handleLogout,
    },
  ];

  const createMenuItems = [
    {
      key: 'task',
      icon: <CheckSquareOutlined />,
      label: 'New Task',
      onClick: () => setQuickTaskOpen(true),
    },
    {
      key: 'bug',
      icon: <BugOutlined />,
      label: 'New Bug',
      onClick: () => setQuickBugOpen(true),
    },
    {
      key: 'process',
      icon: <ApartmentOutlined />,
      label: 'New Process',
      onClick: () => navigate('/processes/modeler/new'),
    },
  ];

  return (
    <>
      <Header
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          left: sidebarWidth,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          zIndex: 99,
          transition: 'left 0.2s',
          background: topbarBg,
          borderBottom: `1px solid ${borderColor}`,
          boxShadow: isDark
            ? '0 1px 4px rgba(0,0,0,0.25)'
            : '0 2px 12px rgba(57,73,171,0.22)',
        }}
      >
        {/* Left: toggle + quick create */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Button
            type="text"
            icon={sidebarWidth > 64
              ? <MenuFoldOutlined   style={{ color: iconColor }} />
              : <MenuUnfoldOutlined style={{ color: iconColor }} />
            }
            onClick={onToggle}
            size="large"
            aria-label="Toggle sidebar"
          />

          <Dropdown menu={{ items: createMenuItems }} placement="bottomLeft" trigger={['click']}>
            <Tooltip title="Quick create">
              <Button
                icon={<PlusOutlined />}
                size="middle"
                style={{
                  borderRadius: 8,
                  fontWeight: 600,
                  background: 'rgba(255,255,255,0.15)',
                  borderColor: 'rgba(255,255,255,0.35)',
                  color: '#fff',
                }}
              >
                Create
              </Button>
            </Tooltip>
          </Dropdown>
        </div>

        {/* Center: global search inline */}
        <div style={{ flex: 1, maxWidth: 360, margin: '0 24px' }}>
          <GlobalSearch />
        </div>

        {/* Right: greeting + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Greeting */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginRight: 6,
            whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 400 }}>
              {greeting},
            </span>
            <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>
              {firstName}
            </span>
          </div>

          <NotificationBell unreadCount={unreadCount} />

          <Popover
            content={<ThemePanel />}
            title={null}
            trigger="click"
            placement="bottomRight"
            arrow={false}
            overlayInnerStyle={{
              padding: '14px 16px',
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
            }}
          >
            <Tooltip title="Tuỳ chỉnh giao diện">
              <Button
                type="text"
                size="large"
                icon={<BgColorsOutlined style={{ color: isDark ? preset.primary : iconColor, fontSize: 18 }} />}
              />
            </Tooltip>
          </Popover>

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <Button type="text" style={{ padding: '0 8px', height: 40 }}>
              <Avatar
                size={28}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  cursor: 'pointer',
                  border: '1.5px solid rgba(255,255,255,0.4)',
                }}
              />
            </Button>
          </Dropdown>
        </div>
      </Header>

      <QuickTaskModal open={quickTaskOpen} onClose={() => setQuickTaskOpen(false)} />
      <BugCreateDrawer open={quickBugOpen} onClose={() => setQuickBugOpen(false)} />
      <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </>
  );
}
