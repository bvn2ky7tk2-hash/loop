import { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Badge,
  Tooltip, Popconfirm, Input, Modal, Form, Alert, Typography,
} from 'antd';
import { usePagination } from '../../hooks/usePagination';
import {
  CheckCircleOutlined, CloseCircleOutlined,
  WarningOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timesheetApi, type PendingApprovalItem } from '../../api/timesheet';
import { useAuthStore } from '../../store/auth.store';
import dayjs from 'dayjs';
import { Navigate } from 'react-router-dom';

const { Text } = Typography;

const ALLOWED_ROLES = ['PM', 'ADMIN', 'LEADERSHIP'];

export default function TimesheetApprovalsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { resetPage, paginationProps } = usePagination(20);

  const [search, setSearch] = useState('');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectForm] = Form.useForm<{ reason: string }>();

  useEffect(() => { resetPage(); }, [search, resetPage]);

  if (user && !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['timesheet-pending'],
    queryFn: timesheetApi.pendingApproval,
    refetchInterval: 60_000,
  });

  const { mutate: approve, isPending: isApproving } = useMutation({
    mutationFn: (id: string) => timesheetApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet-pending'] }),
  });

  const { mutate: reject, isPending: isRejecting } = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => timesheetApi.reject(id, reason),
    onSuccess: () => {
      setRejectTarget(null);
      rejectForm.resetFields();
      qc.invalidateQueries({ queryKey: ['timesheet-pending'] });
    },
  });

  const filtered = items.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  );

  const overdueCount = items.filter((r) => r.isOverdue).length;

  const columns = [
    {
      title: 'Nhân sự',
      dataIndex: 'name',
      render: (name: string, row: PendingApprovalItem) => (
        <Space>
          {row.isOverdue && (
            <Tooltip title="Quá hạn duyệt 48h">
              <WarningOutlined style={{ color: '#EF4444' }} />
            </Tooltip>
          )}
          <Text strong={row.isOverdue}>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'Kỳ công',
      key: 'period',
      render: (_: unknown, row: PendingApprovalItem) =>
        `${dayjs(row.periodStart).format('DD/MM')} – ${dayjs(row.periodEnd).format('DD/MM/YYYY')}`,
    },
    {
      title: 'Ngày nộp',
      dataIndex: 'submittedAt',
      width: 160,
      render: (v: string | null) =>
        v ? dayjs(v).format('HH:mm DD/MM/YYYY') : '—',
    },
    {
      title: 'Tình trạng',
      dataIndex: 'isOverdue',
      width: 130,
      render: (overdue: boolean) =>
        overdue ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: '2px 8px', background: '#FEF2F2', color: '#DC2626' }}>
            <WarningOutlined /> Quá hạn 48h
          </span>
        ) : (
          <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: '2px 8px', background: '#EEF2FF', color: '#4338CA' }}>Đang chờ</span>
        ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 160,
      render: (_: unknown, row: PendingApprovalItem) => (
        <Space size={4}>
          <Popconfirm
            title="Duyệt bảng công"
            description={`Duyệt bảng công của ${row.name}?`}
            onConfirm={() => approve(row.id)}
            okText="Duyệt"
            cancelText="Huỷ"
          >
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              loading={isApproving}
            >
              Duyệt
            </Button>
          </Popconfirm>
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={() => setRejectTarget(row.id)}
          >
            Từ chối
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Space align="center">
          <h1 className="page-title">Duyệt bảng công</h1>
          {overdueCount > 0 && (
            <Badge
              count={overdueCount}
              title={`${overdueCount} bảng công quá hạn 48h`}
              style={{ backgroundColor: '#EF4444' }}
            />
          )}
        </Space>

        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm nhân sự..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 220 }}
        />
      </div>

      {overdueCount > 0 && (
        <Alert
          type="warning"
          message={`Có ${overdueCount} bảng công đã quá hạn duyệt 48h. Vui lòng xử lý sớm.`}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card size="small">
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          pagination={paginationProps(filtered.length, 'bảng công')}
          rowClassName={(row) => row.isOverdue ? 'ant-table-row-overdue' : ''}
          locale={{ emptyText: 'Không có bảng công chờ duyệt' }}
        />
      </Card>

      {/* Reject modal */}
      <Modal
        title="Từ chối bảng công"
        open={!!rejectTarget}
        onCancel={() => { setRejectTarget(null); rejectForm.resetFields(); }}
        onOk={() =>
          rejectForm.validateFields().then((values) =>
            rejectTarget && reject({ id: rejectTarget, reason: values.reason }),
          )
        }
        okText="Xác nhận từ chối"
        okButtonProps={{ danger: true, loading: isRejecting }}
        cancelText="Huỷ"
        destroyOnHidden
      >
        <Form form={rejectForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="reason"
            label="Lý do từ chối"
            rules={[{ required: true, message: 'Vui lòng nhập lý do từ chối' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Nhập lý do để nhân sự biết cần điều chỉnh..."
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
