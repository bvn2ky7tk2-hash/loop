import { Button, Dropdown, Space, Tag, Progress, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import {
  CheckOutlined, EditOutlined, MoreOutlined,
  CheckCircleOutlined, RollbackOutlined, EyeOutlined,
} from '@ant-design/icons';
import { TaskStatusPill } from '../../components/ui/TaskStatusPill';
import type { TaskStatus as TaskStatusType } from '../../components/ui/TaskStatusPill';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';
import { isProgressLocked, type Task } from '../../api/tasks';
import dayjs from 'dayjs';
import type { TaskWithDepth } from './tasks.constants';

interface BuildMenuDeps {
  setEditTask: (t: Task) => void;
  editForm: { setFieldsValue: (v: Record<string, unknown>) => void };
  setProgressOpen: (id: string) => void;
  setLogOpen: (id: string) => void;
  approveMutation: { mutate: (id: string) => void };
  cancelMutation: { mutate: (id: string) => void };
  modal: { confirm: (cfg: Record<string, unknown>) => void };
}

export function buildMenu(r: Task, deps: BuildMenuDeps): MenuProps {
  const {
    setEditTask, editForm, setProgressOpen, setLogOpen,
    approveMutation, cancelMutation, modal,
  } = deps;
  return {
    items: [
      {
        key: 'edit', label: 'Chỉnh sửa', icon: <EditOutlined />,
        onClick: () => {
          setEditTask(r);
          editForm.setFieldsValue({
            title: r.title,
            description: r.description,
            assigneeId: r.assigneeId,
            estimateHours: r.estimateHours,
            startDate: r.startDate ? dayjs(r.startDate) : null,
            dueDate: r.dueDate ? dayjs(r.dueDate) : null,
          });
        },
      },
      {
        key: 'progress',
        label: isProgressLocked(r) ? (
          <Tooltip title={r.children?.length ? 'Task cha — tiến độ tự tính từ subtask' : 'Có bug/issue linked — tiến độ tự tính'}>
            <span style={{ opacity: 0.4 }}>Cập nhật tiến độ</span>
          </Tooltip>
        ) : 'Cập nhật tiến độ',
        icon: <CheckOutlined />,
        disabled: isProgressLocked(r),
        onClick: () => !isProgressLocked(r) && setProgressOpen(r.id),
      },
      { key: 'log', label: 'Ghi giờ thực tế', onClick: () => setLogOpen(r.id) },
      ...(r.status === 'PENDING_APPROVAL' ? [{
        key: 'approve', label: 'Duyệt task',
        onClick: () => approveMutation.mutate(r.id),
      }] : []),
      ...(!['DONE', 'CANCELLED'].includes(r.status) ? [{
        key: 'cancel', label: 'Huỷ task', danger: true,
        onClick: () => {
          modal.confirm({
            title: 'Huỷ task?',
            content: `Huỷ "${r.title}"?`,
            okText: 'Huỷ task', okButtonProps: { danger: true },
            cancelText: 'Đóng',
            onOk: () => cancelMutation.mutate(r.id),
          });
        },
      }] : []),
    ],
  };
}

interface TreeColumnsDeps {
  linkColor: string;
  textMuted: string;
  token: { colorText: string; colorTextDisabled: string };
  isVisible: (key: string) => boolean;
  buildMenuFor: (r: Task) => MenuProps;
}

export function buildTreeColumns(deps: TreeColumnsDeps) {
  const { linkColor, textMuted, token, isVisible, buildMenuFor } = deps;
  return [
    {
      key: 'title',
      title: 'Tên task', dataIndex: 'title',
      ellipsis: true, minWidth: 240,
      render: (v: string, r: Task) => {
        const depth = (r as TaskWithDepth)._depth ?? 0;
        return (
          <span title={v} style={{ fontWeight: depth === 0 ? 600 : 400, opacity: depth === 0 ? 1 : 0.75 }}>
            {v}
          </span>
        );
      },
    },
    {
      key: 'status',
      title: 'Trạng thái', dataIndex: 'status', width: 130,
      render: (v: string) => <TaskStatusPill status={v as TaskStatusType} size="sm" />,
    },
    {
      key: 'progress',
      title: 'Tiến độ', dataIndex: 'progress', width: 80,
      render: (v: number) => (
        <span style={{ fontSize: 13, fontWeight: 600, color: Number(v) >= 100 ? '#10B981' : Number(v) >= 50 ? linkColor : '#F59E0B' }}>
          {Number(v)}%
        </span>
      ),
    },
    {
      key: 'dueDate',
      title: 'Hạn', dataIndex: 'dueDate', width: 95,
      render: (v: string) => {
        if (!v) return <span style={{ color: '#94A3B8' }}>—</span>;
        const overdue = dayjs(v).isBefore(dayjs(), 'day');
        return <span style={{ color: overdue ? '#EF4444' : textMuted, fontSize: 12 }}>{dayjs(v).format('DD/MM/YY')}</span>;
      },
    },
    {
      key: 'assignee',
      title: 'Người thực hiện', width: 140, ellipsis: true,
      render: (_: unknown, r: Task) => {
        const name = r.assignee?.fullName;
        return name
          ? <span style={{ fontSize: 12, color: token.colorText }}>{name}</span>
          : <span style={{ fontSize: 12, color: token.colorTextDisabled }}>—</span>;
      },
    },
    {
      key: 'hours',
      title: 'Giờ (est / act)', width: 120,
      render: (_: unknown, r: Task) => (
        <span style={{ fontSize: 12 }}>
          <span style={{ color: linkColor, fontWeight: 500 }}>{Number(r.estimateHours)}h</span>
          <span style={{ color: '#94A3B8' }}> / </span>
          <span style={{ color: Number(r.actualHours) > Number(r.estimateHours) ? '#EF4444' : '#10B981', fontWeight: 500 }}>
            {Number(r.actualHours)}h
          </span>
        </span>
      ),
    },
    {
      key: 'actions',
      title: '', width: 40, fixed: 'right' as const,
      render: (_: unknown, r: Task) => (
        <Dropdown menu={buildMenuFor(r)} trigger={['click']} placement="bottomRight">
          <Button type="text" size="small" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ].filter((c) => c.key === 'actions' || isVisible(c.key));
}

interface ApprovalColumnsDeps {
  token: {
    colorPrimary: string;
    colorText: string;
    colorTextSecondary: string;
    colorTextDisabled: string;
  };
  setDetailTaskId: (id: string) => void;
  setReturnOpenId: (id: string) => void;
  approveMutation: { mutate: (id: string) => void; isPending: boolean };
}

export function buildApprovalColumns(deps: ApprovalColumnsDeps) {
  const { token, setDetailTaskId, setReturnOpenId, approveMutation } = deps;
  return [
    {
      key: 'title',
      title: 'Tên task', dataIndex: 'title',
      ellipsis: true, minWidth: 220,
      render: (v: string, r: Task) => (
        <div
          style={{ cursor: 'pointer' }}
          onClick={() => setDetailTaskId(r.id)}
        >
          <div style={{ fontWeight: 500, color: token.colorPrimary }}>{v}</div>
          {r.description && (
            <Tooltip title={r.description}>
              <div style={{
                fontSize: 11, color: token.colorTextSecondary,
                marginTop: 2, overflow: 'hidden',
                whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 300,
              }}>
                {r.description}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      key: 'project',
      title: 'Dự án', dataIndex: 'project', width: 200, ellipsis: true,
      render: (p: Task['project']) => p
        ? <span style={{ fontSize: 12 }}><Tag color="geekblue" style={{ marginRight: 4 }}>{p.code}</Tag>{p.name}</span>
        : <span style={{ color: '#94A3B8' }}>—</span>,
    },
    {
      key: 'assignee',
      title: 'Người thực hiện', width: 140, ellipsis: true,
      render: (_: unknown, r: Task) => r.assignee
        ? <EmployeeInfoCell employee={{ fullName: r.assignee.fullName, code: r.assignee.code }} />
        : <span style={{ fontSize: 12, color: token.colorTextDisabled }}>—</span>,
    },
    {
      key: 'progress',
      title: 'Tiến độ', dataIndex: 'progress', width: 90,
      render: (v: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Progress
            percent={Number(v)}
            size="small"
            showInfo={false}
            style={{ flex: 1, margin: 0 }}
            strokeColor={Number(v) >= 100 ? '#10B981' : '#F59E0B'}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: Number(v) >= 100 ? '#10B981' : '#F59E0B', minWidth: 30 }}>
            {Number(v)}%
          </span>
        </div>
      ),
    },
    {
      key: 'dueDate',
      title: 'Hạn', dataIndex: 'dueDate', width: 95,
      render: (v: string) => {
        if (!v) return <span style={{ color: '#94A3B8' }}>—</span>;
        const overdue = dayjs(v).isBefore(dayjs(), 'day');
        return (
          <span style={{ color: overdue ? '#EF4444' : token.colorTextSecondary, fontSize: 12, fontWeight: overdue ? 600 : 400 }}>
            {dayjs(v).format('DD/MM/YY')}
            {overdue && <span style={{ marginLeft: 4, fontSize: 10 }}>⚠</span>}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      title: 'Nộp lúc', dataIndex: 'createdAt', width: 110,
      render: (v: string) => v
        ? <span style={{ fontSize: 12, color: token.colorTextSecondary }}>{dayjs(v).format('DD/MM/YY HH:mm')}</span>
        : <span style={{ color: '#94A3B8' }}>—</span>,
    },
    {
      key: 'actions',
      title: 'Hành động', width: 200, fixed: 'right' as const,
      render: (_: unknown, r: Task) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setDetailTaskId(r.id)}
          >
            Chi tiết
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            loading={approveMutation.isPending}
            disabled={approveMutation.isPending}
            onClick={() => approveMutation.mutate(r.id)}
          >
            Duyệt
          </Button>
          <Button
            size="small"
            danger
            icon={<RollbackOutlined />}
            onClick={() => setReturnOpenId(r.id)}
          >
            Trả lại
          </Button>
        </Space>
      ),
    },
  ];
}
