import React, { useState } from 'react';
import {
  Button, Input, Modal, Space, Table, Tag, Typography, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CameraOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { demoApi, type DemoSnapshotItem } from '../../api/demo';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { confirmDelete } from '../../components/ui/confirmDelete';

const { Text } = Typography;

export default function DemoModePage() {
  const { textPrimary, textMuted, bgContainer, borderColor, isDark } = useThemePalette();
  const qc = useQueryClient();

  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['demo-status'],
    queryFn: demoApi.getStatus,
  });

  const createMutation = useMutation({
    mutationFn: () => demoApi.createSnapshot(snapshotLabel || undefined),
    onSuccess: (res) => {
      message.success(`Đã tạo snapshot "${res.label}" — ${res.rowCount.toLocaleString('vi-VN')} dòng`);
      setModalOpen(false);
      setSnapshotLabel('');
      qc.invalidateQueries({ queryKey: ['demo-status'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err?.response?.data?.message || 'Tạo snapshot thất bại');
    },
  });

  const resetMutation = useMutation({
    mutationFn: (id: string) => demoApi.reset(id),
    onSuccess: (res) => {
      message.success(res.message);
      setRestoringId(null);
      qc.invalidateQueries({ queryKey: ['demo-status'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setRestoringId(null);
      message.error(err?.response?.data?.message || 'Khôi phục thất bại');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => demoApi.deleteSnapshot(id),
    onSuccess: () => {
      message.success('Đã xóa snapshot');
      qc.invalidateQueries({ queryKey: ['demo-status'] });
    },
    onError: () => message.error('Xóa thất bại'),
  });

  const handleRestore = (snap: DemoSnapshotItem) => {
    confirmDelete({
      itemName: `dữ liệu hiện tại và khôi phục về snapshot "${snap.label}"`,
      onConfirm: () => {
        setRestoringId(snap.id);
        resetMutation.mutate(snap.id);
      },
    });
  };

  const handleDelete = (snap: DemoSnapshotItem) => {
    confirmDelete({
      itemName: `snapshot "${snap.label}"`,
      onConfirm: () => deleteMutation.mutate(snap.id),
    });
  };

  const columns: ColumnsType<DemoSnapshotItem> = [
    {
      title: <Text style={{ color: textMuted }}>Tên snapshot</Text>,
      dataIndex: 'label',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: <Text style={{ color: textMuted }}>Ngày tạo</Text>,
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY HH:mm')}</Text>
      ),
    },
    {
      title: <Text style={{ color: textMuted }}>Dung lượng</Text>,
      dataIndex: 'sizeKb',
      width: 110,
      render: (v: number) => <Text style={{ color: textMuted }}>{v.toLocaleString('vi-VN')} KB</Text>,
    },
    {
      title: <Text style={{ color: textMuted }}>Số dòng</Text>,
      dataIndex: 'rowCount',
      width: 110,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v.toLocaleString('vi-VN')}</Text>,
    },
    {
      title: <Text style={{ color: textMuted }}>Dùng lần cuối</Text>,
      dataIndex: 'lastUsedAt',
      width: 160,
      render: (v: string | null) =>
        v ? (
          <Space size={4}>
            <CheckCircleOutlined style={{ color: '#10B981', fontSize: 12 }} />
            <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY HH:mm')}</Text>
          </Space>
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: '',
      key: 'actions',
      width: 160,
      render: (_: unknown, snap: DemoSnapshotItem) => (
        <Space>
          <Button
            size="small"
            type="primary"
            icon={<ReloadOutlined />}
            loading={restoringId === snap.id}
            disabled={!!restoringId || deleteMutation.isPending}
            onClick={() => handleRestore(snap)}
          >
            Khôi phục
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            disabled={!!restoringId || deleteMutation.isPending}
            onClick={() => handleDelete(snap)}
          />
        </Space>
      ),
    },
  ];

  const snapshots = data?.snapshots ?? [];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Chế độ trình diễn"
        icon={<ExperimentOutlined />}
        iconColor="#8B5CF6"
        actions={
          <Button
            type="primary"
            icon={<CameraOutlined />}
            onClick={() => setModalOpen(true)}
            disabled={!!restoringId}
          >
            Tạo Snapshot
          </Button>
        }
      />

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 160px' }}>
          <StatCard
            label="Demo Mode"
            value={data?.isDemoMode ? 'Bật' : 'Tắt'}
            color={data?.isDemoMode ? '#8B5CF6' : '#94A3B8'}
            icon={<ExperimentOutlined />}
          />
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <StatCard
            label="Số snapshot"
            value={data?.snapshotCount ?? 0}
            color="#3B82F6"
            icon={<DatabaseOutlined />}
          />
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <StatCard
            label="Reset lần cuối"
            value={data?.lastReset ? dayjs(data.lastReset).format('DD/MM HH:mm') : '—'}
            color="#10B981"
            icon={<ReloadOutlined />}
          />
        </div>
      </div>

      {/* Snapshot table */}
      <div
        style={{
          background: bgContainer,
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${borderColor}` }}>
          <Text style={{ color: textPrimary, fontWeight: 700, fontSize: 15 }}>
            Danh sách Snapshot
          </Text>
          {snapshots.length > 0 && (
            <Tag
              style={isDark
                ? { background: 'rgba(99,102,241,0.15)', color: '#A5B4FC', borderColor: 'rgba(99,102,241,0.3)', marginLeft: 10 }
                : { marginLeft: 10 }}
              color={isDark ? undefined : 'geekblue'}
            >
              {snapshots.length} snapshot
            </Tag>
          )}
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={snapshots}
          loading={isLoading}
          pagination={false}
          locale={{ emptyText: 'Chưa có snapshot nào. Nhấn "Tạo Snapshot" để bắt đầu.' }}
          size="middle"
        />
      </div>

      {/* Modal tạo snapshot */}
      <Modal
        title="Tạo Snapshot mới"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setSnapshotLabel(''); }}
        onOk={() => createMutation.mutate()}
        okText="Tạo Snapshot"
        cancelText="Hủy"
        confirmLoading={createMutation.isPending}
        okButtonProps={{ icon: <CameraOutlined /> }}
      >
        <div style={{ marginBottom: 8 }}>
          <Text style={{ color: textMuted }}>Tên snapshot (để trống sẽ dùng thời gian hiện tại):</Text>
        </div>
        <Input
          placeholder="VD: Before Q2 demo, After HR setup..."
          value={snapshotLabel}
          onChange={(e) => setSnapshotLabel(e.target.value)}
          onPressEnter={() => !createMutation.isPending && createMutation.mutate()}
          maxLength={100}
          showCount
          autoFocus
        />
        <div style={{ marginTop: 12, padding: '10px 14px', background: isDark ? 'rgba(251,191,36,0.08)' : '#FFFBEB', borderRadius: 8, border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : '#FDE68A'}` }}>
          <Text style={{ color: isDark ? '#FCD34D' : '#92400E', fontSize: 13 }}>
            Snapshot sẽ chụp toàn bộ data hiện tại bằng pg_dump. Có thể mất vài giây.
          </Text>
        </div>
      </Modal>
    </div>
  );
}
