import { useState, useMemo } from 'react';
import { Table, Button, Space, Tag, Tooltip, App } from 'antd';
import { UserOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useUserTasks,
  useClaimTask,
  type ProcessUserTask,
  type UserTaskStatus,
} from '../../../api/processes.api';
import { UserTaskStatusBadge } from './ProcessStatusBadge';
import { TaskCompleteDrawer } from './TaskCompleteDrawer';

interface UserTaskListProps {
  instanceId?:          string;
  showInstanceInfo?:    boolean;
  searchFilter?:        string;
  statusFilter?:        string;
  definitionIdFilter?:  string;
  assigneeIdFilter?:    string;
  requesterIdFilter?:   string;
}

export function UserTaskList({
  instanceId,
  showInstanceInfo    = false,
  searchFilter        = '',
  statusFilter        = '',
  definitionIdFilter  = '',
  assigneeIdFilter    = '',
  requesterIdFilter   = '',
}: UserTaskListProps) {
  const { message } = App.useApp();
  const { data, isLoading } = useUserTasks({ instanceId, pageSize: 100 });
  const claimMutation = useClaimTask();
  const [activeTask, setActiveTask] = useState<ProcessUserTask | null>(null);

  const handleClaim = (id: string) => {
    claimMutation.mutate(id, {
      onSuccess: () => message.success('Đã nhận task'),
      onError:   () => message.error('Không thể nhận task'),
    });
  };

  // Client-side filtering
  const filtered = useMemo(() => {
    let rows = data?.data ?? [];
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      rows = rows.filter((t) => t.name.toLowerCase().includes(q));
    }
    if (statusFilter) {
      rows = rows.filter((t) => t.status === statusFilter);
    }
    if (definitionIdFilter) {
      rows = rows.filter((t) => t.instance?.definition?.id === definitionIdFilter);
    }
    if (assigneeIdFilter) {
      rows = rows.filter((t) => t.assignee?.id === assigneeIdFilter);
    }
    if (requesterIdFilter) {
      rows = rows.filter((t) => t.instance?.startedByUser?.id === requesterIdFilter);
    }
    return rows;
  }, [data, searchFilter, statusFilter, definitionIdFilter, assigneeIdFilter, requesterIdFilter]);

  const columns = [
    {
      title: 'Tên công việc',
      dataIndex: 'name',
      render: (name: string) => <strong>{name}</strong>,
    },
    ...(showInstanceInfo
      ? [
          {
            title: 'Quy trình',
            key: 'definition',
            render: (_: unknown, record: ProcessUserTask) =>
              record.instance?.definition
                ? `${record.instance.definition.name} v${record.instance.definition.version}`
                : '—',
          },
        ]
      : []),
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (s: UserTaskStatus) => <UserTaskStatusBadge status={s} />,
      width: 140,
    },
    {
      title: 'Người yêu cầu',
      key: 'requester',
      render: (_: unknown, record: ProcessUserTask) =>
        record.instance?.startedByUser ? (
          <Space>
            <UserOutlined />
            {record.instance.startedByUser.name}
          </Space>
        ) : '—',
    },
    {
      title: 'Người xử lý',
      key: 'assignee',
      render: (_: unknown, record: ProcessUserTask) =>
        record.assignee ? (
          <Space>
            <UserOutlined />
            {record.assignee.name}
          </Space>
        ) : (
          <Tag>Chưa giao</Tag>
        ),
    },
    {
      title: 'Hạn xử lý',
      dataIndex: 'dueDate',
      render: (d: string | undefined) => {
        if (!d) return '—';
        const isOverdue = dayjs(d).isBefore(dayjs());
        return (
          <span style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
            {dayjs(d).format('DD/MM/YYYY')}
          </span>
        );
      },
      width: 120,
    },
    {
      title: '',
      key: 'actions',
      width: 140,
      render: (_: unknown, record: ProcessUserTask) => (
        <Space>
          {record.status === 'PENDING' && (
            <Tooltip title="Nhận task và xử lý">
              <Button
                size="small"
                icon={<UserOutlined />}
                onClick={() => handleClaim(record.id)}
                loading={claimMutation.isPending}
                disabled={claimMutation.isPending}
              >
                Nhận
              </Button>
            </Tooltip>
          )}
          {record.status === 'IN_PROGRESS' && (
            <Tooltip title="Mở form xử lý task">
              <Button
                size="small"
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setActiveTask(record)}
              >
                Xử lý
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="middle"
        pagination={{
          total: filtered.length,
          pageSize: 20,
          showSizeChanger: false,
          showTotal: (total) => `${total} công việc`,
        }}
        locale={{ emptyText: 'Không có công việc nào' }}
      />

      <TaskCompleteDrawer
        task={activeTask}
        open={!!activeTask}
        onClose={() => setActiveTask(null)}
      />
    </>
  );
}
