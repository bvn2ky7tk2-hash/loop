import {
  Table, Typography, Tag, Button, App, Tooltip, Space,
} from 'antd';
import {
  SaveOutlined, PlusOutlined, DeleteOutlined,
  GlobalOutlined, LockOutlined, BuildOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { apiClient } from '../../api/client';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';

const { Text } = Typography;

interface SavedReport {
  id: string;
  name: string;
  description?: string;
  category: string;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  definition: Record<string, unknown>;
}

const CATEGORY_LABELS: Record<string, string> = {
  hr: 'Nhân sự', finance: 'Tài chính', project: 'Dự án',
  crm: 'CRM', attendance: 'Chấm công', custom: 'Tùy chỉnh',
};

const CATEGORY_COLORS: Record<string, string> = {
  hr: 'purple', finance: 'green', project: 'orange',
  crm: 'blue', attendance: 'cyan', custom: 'default',
};

export default function AnalyticsSavedPage() {
  const { isDark, textPrimary, textMuted, bgContainer, borderColor, linkColor } = useThemePalette();
  const { paginationProps } = usePagination(20);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery<SavedReport[]>({
    queryKey: ['analytics', 'saved-reports'],
    queryFn: () => apiClient.get('/api/v1/analytics/saved-reports').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/analytics/saved-reports/${id}`),
    onSuccess: () => {
      message.success('Đã xóa báo cáo');
      qc.invalidateQueries({ queryKey: ['analytics', 'saved-reports'] });
    },
    onError: () => message.error('Xóa thất bại'),
  });

  const columns = [
    {
      title: <Text style={{ color: textPrimary }}>Tên báo cáo</Text>,
      dataIndex: 'name',
      render: (v: string, r: SavedReport) => (
        <div>
          <Text style={{ color: textPrimary, fontWeight: 500 }}>{v}</Text>
          {r.description && (
            <Text style={{ color: textMuted, fontSize: 12, display: 'block' }}>{r.description}</Text>
          )}
        </div>
      ),
    },
    {
      title: <Text style={{ color: textPrimary }}>Danh mục</Text>,
      dataIndex: 'category',
      width: 130,
      render: (v: string) => (
        <Tag
          color={isDark ? undefined : CATEGORY_COLORS[v] ?? 'default'}
          style={isDark ? { background: 'rgba(99,102,241,0.15)', color: '#A5B4FC', borderColor: 'rgba(99,102,241,0.3)' } : {}}
        >
          {CATEGORY_LABELS[v] ?? v}
        </Tag>
      ),
    },
    {
      title: <Text style={{ color: textPrimary }}>Quyền truy cập</Text>,
      dataIndex: 'isPublic',
      width: 140,
      render: (v: boolean) => v
        ? (
          <StatusBadge tone="success" label={<><GlobalOutlined /> Công khai</>} />
        )
        : (
          <Tag icon={<LockOutlined />} color="default">
            <Text style={{ color: textMuted, fontSize: 12 }}>Chỉ mình tôi</Text>
          </Tag>
        ),
    },
    {
      title: <Text style={{ color: textPrimary }}>Cập nhật</Text>,
      dataIndex: 'updatedAt',
      width: 140,
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_: unknown, r: SavedReport) => (
        <Space>
          <Tooltip title="Mở trong Report Builder">
            <Button
              size="small"
              icon={<BuildOutlined />}
              onClick={() => navigate('/analytics/builder')}
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deleteMutation.isPending}
              onClick={() => confirmDelete({
                itemName: r.name,
                onConfirm: () => deleteMutation.mutate(r.id),
              })}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Báo cáo đã lưu"
        icon={<SaveOutlined />}
        iconColor="#6366F1"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/analytics/builder')}
          >
            Tạo báo cáo mới
          </Button>
        }
      />

      <div style={{
        background: bgContainer,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={isLoading}
          pagination={paginationProps(data.length, 'báo cáo')}
          locale={{
            emptyText: (
              <EmptyState
                compact
                description={
                  <span>
                    <Text style={{ color: textMuted }}>Chưa có báo cáo nào. </Text>
                    <Button type="link" style={{ padding: 0, color: linkColor }} onClick={() => navigate('/analytics/builder')}>
                      Tạo báo cáo đầu tiên
                    </Button>
                  </span>
                }
              />
            ),
          }}
        />
      </div>
    </div>
  );
}
