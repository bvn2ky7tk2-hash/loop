import { useState } from 'react';
import { Layout, Button, Tooltip, Avatar, Dropdown, Popover, App, Form, Input, Modal, Select } from 'antd';
import {
  MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, LogoutOutlined,
  BgColorsOutlined, PlusOutlined, CheckSquareOutlined, BugOutlined,
  KeyOutlined, PartitionOutlined,
} from '@ant-design/icons';
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
import { useDefinitions, useStartInstance } from '../../api/processes.api';
import { ChangePasswordModal } from '../ChangePasswordModal';
import { GlobalSearch } from './GlobalSearch';
import { useCommandPaletteStore } from '../../store/commandPalette.store';
import { useThemePalette } from '../../hooks/useThemePalette';

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

function QuickProcessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const { data: definitionsData } = useDefinitions({ page: 1, pageSize: 100 });
  const activeDefinitions = (definitionsData?.data ?? []).filter((d) => d.status === 'ACTIVE');

  const startMut = useStartInstance();

  const handleFinish = async (values: { definitionId: string }) => {
    try {
      await startMut.mutateAsync({ definitionId: values.definitionId });
      message.success('Đã khởi động công việc trong quy trình');
      form.resetFields();
      onClose();
      navigate('/processes/inbox');
    } catch {
      message.error('Khởi động thất bại');
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      open={open}
      title={<><PartitionOutlined style={{ marginRight: 8, color: '#10B981' }} />Tạo công việc trong quy trình</>}
      okText="Khởi động"
      cancelText="Huỷ"
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={startMut.isPending}
      width={480}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} style={{ marginTop: 12 }}>
        <Form.Item name="definitionId" label="Chọn quy trình" rules={[{ required: true, message: 'Vui lòng chọn quy trình' }]}>
          <Select
            showSearch
            placeholder={activeDefinitions.length ? 'Chọn quy trình đang hoạt động...' : 'Không có quy trình nào đang hoạt động'}
            disabled={!activeDefinitions.length}
            options={activeDefinitions.map((d) => ({ value: d.id, label: d.name }))}
            optionFilterProp="label"
          />
        </Form.Item>
        {!activeDefinitions.length && (
          <div style={{ color: '#faad14', fontSize: 12 }}>
            Chưa có quy trình nào được kích hoạt. Vào <a onClick={() => { onClose(); navigate('/processes'); }}>Quy trình</a> để kích hoạt trước.
          </div>
        )}
      </Form>
    </Modal>
  );
}

export function AppTopbar({ sidebarWidth, onToggle }: AppTopbarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const openPalette = useCommandPaletteStore((s) => s.open);
  const { isDark, textMuted, borderColor: paletteBorderColor, preset } = useThemePalette();
  const [quickTaskOpen,      setQuickTaskOpen]      = useState(false);
  const [quickBugOpen,       setQuickBugOpen]       = useState(false);
  const [quickProcessOpen,   setQuickProcessOpen]   = useState(false);
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

  const isNavLight  = !isDark && preset.navTheme === 'light';
  const topbarBg    = isDark ? '#0F172A' : preset.navBg;
  const iconColor   = isNavLight ? preset.navText : '#fff';
  const borderColor = isDark ? '#1E293B' : isNavLight ? '#E2E8F0' : 'transparent';

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
      type: 'group' as const,
      label: <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', opacity: 0.5, textTransform: 'uppercase' as const }}>Tạo mới nhanh</span>,
      children: [
        {
          key: 'task',
          icon: <CheckSquareOutlined style={{ color: '#6366F1' }} />,
          label: 'Task mới',
          onClick: () => setQuickTaskOpen(true),
        },
        {
          key: 'bug',
          icon: <BugOutlined style={{ color: '#EF4444' }} />,
          label: 'Bug mới',
          onClick: () => setQuickBugOpen(true),
        },
        {
          key: 'process',
          icon: <PartitionOutlined style={{ color: '#10B981' }} />,
          label: 'Quy trình mới',
          onClick: () => setQuickProcessOpen(true),
        },
      ],
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
            : isNavLight ? '0 1px 4px rgba(0,0,0,0.08)'
            : '0 2px 12px rgba(57,73,171,0.22)',
        }}
      >
        {/* Left: toggle + Cmd+K hint */}
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
          <Tooltip title="Mở Command Palette" placement="bottom">
            <span
              onClick={openPalette}
              style={{
                fontSize: 12,
                color: textMuted,
                background: isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F5',
                border: `1px solid ${paletteBorderColor}`,
                borderRadius: 6,
                padding: '2px 8px',
                cursor: 'pointer',
                userSelect: 'none',
                lineHeight: '20px',
                display: 'inline-block',
                whiteSpace: 'nowrap',
              }}
            >
              {navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K'}
            </span>
          </Tooltip>
        </div>

        {/* Center: global search inline */}
        <div style={{ flex: 1, maxWidth: 360, margin: '0 24px' }}>
          <GlobalSearch />
        </div>

        {/* Right: actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Quick create — nút tròn */}
          <Dropdown menu={{ items: createMenuItems }} placement="bottomRight" trigger={['click']}>
            <Tooltip title="Tạo mới nhanh" placement="bottom">
              <button
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: preset.primary,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 2px 10px ${preset.primary}70`,
                  transition: 'box-shadow 0.18s, transform 0.15s',
                  color: '#fff',
                  fontSize: 16,
                  lineHeight: 1,
                  flexShrink: 0,
                  outline: 'none',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 16px ${preset.primary}90`;
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 2px 10px ${preset.primary}70`;
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                }}
              >
                <PlusOutlined />
              </button>
            </Tooltip>
          </Dropdown>

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
                icon={<BgColorsOutlined style={{ color: iconColor, fontSize: 18 }} />}
              />
            </Tooltip>
          </Popover>

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <Button type="text" style={{ padding: '0 8px', height: 40 }}>
              <Avatar
                size={28}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: isNavLight ? 'rgba(23,43,77,0.08)' : 'rgba(255,255,255,0.22)',
                  cursor: 'pointer',
                  border: isNavLight ? '1.5px solid rgba(23,43,77,0.2)' : '1.5px solid rgba(255,255,255,0.4)',
                }}
              />
            </Button>
          </Dropdown>
        </div>
      </Header>

      <QuickTaskModal open={quickTaskOpen} onClose={() => setQuickTaskOpen(false)} />
      <BugCreateDrawer open={quickBugOpen} onClose={() => setQuickBugOpen(false)} />
      <QuickProcessModal open={quickProcessOpen} onClose={() => setQuickProcessOpen(false)} />
      <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </>
  );
}
