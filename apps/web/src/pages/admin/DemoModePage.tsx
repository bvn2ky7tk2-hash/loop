import React from 'react';
import { Card, Button, Typography, Tag, Descriptions, Space, message, Row, Col, Alert } from 'antd';
import {
  ExperimentOutlined,
  ReloadOutlined,
  WarningOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { demoApi } from '../../api/demo';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { confirmDelete } from '../../components/ui/confirmDelete';

const { Text, Paragraph } = Typography;

export default function DemoModePage() {
  const { textPrimary, textMuted, bgContainer, borderColor } = useThemePalette();

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['demo-status'],
    queryFn: demoApi.getStatus,
    refetchInterval: false,
  });

  const snapshotMutation = useMutation({
    mutationFn: demoApi.createSnapshot,
    onSuccess: (result) => {
      message.success(`Snapshot tạo thành công! ${result.rowCount.toLocaleString('vi-VN')} dòng dữ liệu.`);
      refetch();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err?.response?.data?.message || 'Không thể tạo snapshot. Vui lòng thử lại.');
    },
  });

  const resetMutation = useMutation({
    mutationFn: demoApi.reset,
    onSuccess: () => {
      message.success('Demo data đã được khôi phục thành công!');
      refetch();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      message.error(err?.response?.data?.message || 'Không thể reset demo data. Vui lòng thử lại.');
    },
  });

  const handleSnapshot = () => {
    confirmDelete({
      itemName: 'data hiện tại (sẽ ghi đè snapshot cũ nếu có)',
      onConfirm: () => snapshotMutation.mutate(),
    });
  };

  const handleReset = () => {
    confirmDelete({
      itemName: 'toàn bộ dữ liệu về trạng thái demo ban đầu',
      onConfirm: () => resetMutation.mutate(),
    });
  };

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Chế độ trình diễn"
        icon={<ExperimentOutlined />}
        iconColor="#8B5CF6"
        actions={
          <Space>
            <Button
              icon={<CameraOutlined />}
              loading={snapshotMutation.isPending}
              onClick={handleSnapshot}
              disabled={resetMutation.isPending}
            >
              Tạo Snapshot
            </Button>
            <Button
              danger
              type="primary"
              icon={<ReloadOutlined />}
              loading={resetMutation.isPending}
              onClick={handleReset}
              disabled={!data?.snapshotExists || snapshotMutation.isPending}
            >
              Reset Demo Data
            </Button>
          </Space>
        }
      />

      {/* Stat cards */}
      {!isLoading && data && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <StatCard
              label="Demo Mode"
              value={data.isDemoMode ? 'Bật' : 'Tắt'}
              color={data.isDemoMode ? '#8B5CF6' : '#94A3B8'}
              icon={<ExperimentOutlined />}
            />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard
              label="Snapshot"
              value={data.snapshotExists ? 'Có sẵn' : 'Chưa có'}
              color={data.snapshotExists ? '#10B981' : '#EF4444'}
              icon={<DatabaseOutlined />}
            />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard
              label="Dung lượng"
              value={data.snapshotSizeKb ? `${data.snapshotSizeKb} KB` : '—'}
              color="#3B82F6"
              icon={<CameraOutlined />}
            />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard
              label="Số dòng dữ liệu"
              value={data.rowCount ? data.rowCount.toLocaleString('vi-VN') : '—'}
              color="#F59E0B"
              icon={<DatabaseOutlined />}
            />
          </Col>
        </Row>
      )}

      {/* Status detail */}
      <Card
        style={{ background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 12, marginBottom: 24 }}
        styles={{ body: { padding: 24 } }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
          <ExperimentOutlined style={{ color: '#8B5CF6', fontSize: 22, marginTop: 2 }} />
          <div>
            <Text style={{ color: textPrimary, fontWeight: 700, fontSize: 15, display: 'block', marginBottom: 6 }}>
              Về Chế độ trình diễn
            </Text>
            <Paragraph style={{ color: textMuted, margin: 0 }}>
              Cho phép <strong>đóng gói data hiện tại</strong> thành snapshot, rồi <strong>khôi phục</strong> về
              trạng thái đó bất kỳ lúc nào. Dùng cho môi trường staging/demo để giữ dữ liệu mẫu luôn nhất quán.
            </Paragraph>
          </div>
        </div>

        <Descriptions
          column={1}
          size="small"
          styles={{ label: { color: textMuted }, content: { color: textPrimary } }}
        >
          <Descriptions.Item label="Trạng thái Demo Mode">
            {data?.isDemoMode ? (
              <Space><CheckCircleOutlined style={{ color: '#10B981' }} /><Tag color="purple">Bật</Tag></Space>
            ) : (
              <Space><CloseCircleOutlined style={{ color: '#94A3B8' }} /><Tag color="default">Tắt (đặt DEMO_MODE=true trong .env)</Tag></Space>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Snapshot tồn tại">
            {data?.snapshotExists ? (
              <Tag color="green">Có — {data.snapshotSizeKb} KB, {data.rowCount?.toLocaleString('vi-VN')} dòng</Tag>
            ) : (
              <Tag color="red">Chưa có snapshot</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Snapshot tạo lúc">
            {data?.lastSnapshot
              ? <Text style={{ color: textPrimary }}>{dayjs(data.lastSnapshot).format('DD/MM/YYYY HH:mm:ss')}</Text>
              : <Text style={{ color: textMuted }}>Chưa tạo snapshot</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="Reset lần cuối">
            {data?.lastReset
              ? <Text style={{ color: textPrimary }}>{dayjs(data.lastReset).format('DD/MM/YYYY HH:mm:ss')}</Text>
              : <Text style={{ color: textMuted }}>Chưa reset lần nào</Text>}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Hướng dẫn */}
      <Card
        style={{ background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 12, marginBottom: 24 }}
        styles={{ body: { padding: 24 } }}
      >
        <Text style={{ color: textPrimary, fontWeight: 700, fontSize: 15, display: 'block', marginBottom: 12 }}>
          Hướng dẫn sử dụng
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { step: '1', text: 'Cấu hình data demo đầy đủ theo ý muốn trong hệ thống' },
            { step: '2', text: 'Nhấn "Tạo Snapshot" để lưu lại trạng thái hiện tại (pg_dump)' },
            { step: '3', text: 'Sau khi demo/test, nhấn "Reset Demo Data" để khôi phục về snapshot' },
            { step: '4', text: 'Có thể tạo lại snapshot bất kỳ lúc nào để cập nhật data demo' },
          ].map(({ step, text }) => (
            <div key={step} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: '#8B5CF6',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
              }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{step}</Text>
              </div>
              <Text style={{ color: textMuted }}>{text}</Text>
            </div>
          ))}
        </div>
      </Card>

      {/* Warning */}
      {!data?.snapshotExists && !isLoading && (
        <Alert
          type="warning"
          icon={<WarningOutlined />}
          showIcon
          message="Chưa có snapshot"
          description="Hãy nhấn 'Tạo Snapshot' để lưu data hiện tại trước khi có thể reset."
          style={{ borderRadius: 10 }}
        />
      )}

      {data?.snapshotExists && (
        <Alert
          type="error"
          icon={<WarningOutlined />}
          showIcon
          message="Cảnh báo khi Reset"
          description="Reset sẽ xóa toàn bộ dữ liệu hiện tại và thay thế bằng snapshot. Hành động không thể hoàn tác."
          style={{ borderRadius: 10 }}
        />
      )}
    </div>
  );
}
