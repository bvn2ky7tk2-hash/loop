import { useState, useMemo } from 'react';
import { Table, Button, Space, Tag, Tooltip, App, Typography } from 'antd';
import { UserOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  useUserTasks,
  useClaimTask,
  processesApi,
  type ProcessUserTask,
  type UserTaskStatus,
} from '../../../api/processes.api';
import { useThemePalette } from '../../../hooks/useThemePalette';
import { UserTaskStatusBadge } from './ProcessStatusBadge';
import { TaskCompleteDrawer } from './TaskCompleteDrawer';

const { Text } = Typography;

interface UserTaskListProps {
  instanceId?:          string;
  showInstanceInfo?:    boolean;
  searchFilter?:        string;
  statusFilter?:        string;
  definitionIdFilter?:  string;
  assigneeIdFilter?:    string;
  requesterIdFilter?:   string;
  /** Khi true: hiển thị checkbox + batch approve toolbar */
  enableBatchApprove?:  boolean;
}

export function UserTaskList({
  instanceId,
  showInstanceInfo    = false,
  searchFilter        = '',
  statusFilter        = '',
  definitionIdFilter  = '',
  assigneeIdFilter    = '',
  requesterIdFilter   = '',
  enableBatchApprove  = false,
}: UserTaskListProps) {
  const { message } = App.useApp();
  const { textMuted } = useThemePalette();
  const qc = useQueryClient();
  const { data, isLoading } = useUserTasks({ instanceId, pageSize: 100 });
  const claimMutation = useClaimTask();
  const [activeTask, setActiveTask] = useState<ProcessUserTask | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleClaim = (id: string) => {
    claimMutation.mutate(id, {
      onSuccess: () => message.success('Đã nhận task'),
      onError:   () => message.error('Không thể nhận task'),
    });
  };

  // Batch approve mutation
  const batchMut = useMutation({
    mutationFn: ({ ids, decision }: { ids: string[]; decision: 'APPROVE' | 'REJECT' }) =>
      processesApi.batchApprove(ids, decision),
    onSuccess: (res, { decision }) => {
      const label = decision === 'APPROVE' ? 'Duyệt' : 'Từ chối';
      if (res.meta.errors > 0) {
        message.warning(`${label} ${res.meta.ok}/${res.meta.total} task thành công (${res.meta.errors} lỗi)`);
      } else {
        message.success(`${label} ${res.meta.ok} task thành công`);
      }
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ['user-tasks'] });
    },
    onError: () => message.error('Không thể thực hiện batch approve'),
  });

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

  // Chỉ cho chọn task PENDING hoặc IN_PROGRESS để batch approve
  const approvableIds = useMemo(
    () => new Set(filtered.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS').map((t) => t.id)),
    [filtered],
  );

  const columns = [
    {
      title: 'Tên công việc',
      dataIndex: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    ...(showInstanceInfo
      ? [
          {
            title: 'Quy trình',
            key: 'definition',
            render: (_: unknown, record: ProcessUserTask) =>
              record.instance?.definition ? (
                <Text style={{ color: textMuted }}>
                  {`${record.instance.definition.name} v${record.instance.definition.version}`}
                </Text>
              ) : (
                <Text style={{ color: textMuted }}>—</Text>
              ),
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
            <Text style={{ color: textMuted }}>{record.instance.startedByUser.name}</Text>
          </Space>
        ) : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Người xử lý',
      key: 'assignee',
      render: (_: unknown, record: ProcessUserTask) =>
        record.assignee ? (
          <Space>
            <UserOutlined />
            <Text style={{ color: textMuted }}>{record.assignee.name}</Text>
          </Space>
        ) : (
          <Tag>Chưa giao</Tag>
        ),
    },
    {
      title: 'Hạn xử lý',
      dataIndex: 'dueDate',
      render: (d: string | undefined) => {
        if (!d) return <Text style={{ color: textMuted }}>—</Text>;
        const isOverdue = dayjs(d).isBefore(dayjs());
        return (
          <Text style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
            {dayjs(d).format('DD/MM/YYYY')}
          </Text>
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
      {/* Batch approve toolbar — hiện khi có task được chọn */}
      {enableBatchApprove && selectedIds.length > 0 && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: textMuted }}>Đã chọn {selectedIds.length} task:</Text>
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            loading={batchMut.isPending}
            onClick={() => batchMut.mutate({ ids: selectedIds, decision: 'APPROVE' })}
          >
            Duyệt {selectedIds.length} task
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseOutlined />}
            loading={batchMut.isPending}
            onClick={() => batchMut.mutate({ ids: selectedIds, decision: 'REJECT' })}
          >
            Từ chối {selectedIds.length} task
          </Button>
          <Button size="small" onClick={() => setSelectedIds([])}>
            Bỏ chọn
          </Button>
        </div>
      )}

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="middle"
        rowSelection={
          enableBatchApprove
            ? {
                selectedRowKeys: selectedIds,
                onChange: (keys) => setSelectedIds(keys as string[]),
                getCheckboxProps: (record: ProcessUserTask) => ({
                  disabled: !approvableIds.has(record.id),
                  title: approvableIds.has(record.id)
                    ? undefined
                    : `Task ${record.status} không thể batch approve`,
                }),
              }
            : undefined
        }
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
