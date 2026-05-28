import React from 'react';
import { Card, Button, Typography, Tag, Descriptions, Space, message } from 'antd';
import { ExperimentOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { demoApi } from '../../api/demo';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { confirmDelete } from '../../components/ui/confirmDelete';

const { Text, Paragraph } = Typography;

export default function DemoModePage() {
  const { textPrimary, textMuted, bgContainer, borderColor } = useThemePalette();

  const { data, refetch } = useQuery({
    queryKey: ['demo-status'],
    queryFn: demoApi.getStatus,
  });

  const resetMutation = useMutation({
    mutationFn: demoApi.reset,
    onSuccess: () => {
      message.success('Đã gửi lệnh reset demo data thành công!');
      refetch();
    },
    onError: () => {
      message.error('Không thể reset demo data. Vui lòng thử lại.');
    },
  });

  const handleReset = () => {
    confirmDelete({
      itemName: 'toàn bộ dữ liệu về trạng thái demo ban đầu',
      onConfirm: () => resetMutation.mutate(),
    });
  };

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Demo Mode"
        icon={<ExperimentOutlined />}
        iconColor="#8B5CF6"
      />

      {/* Status badge */}
      <div style={{ marginBottom: 20 }}>
        <Space>
          <Text style={{ color: textMuted }}>Trạng thái Demo Mode:</Text>
          {data?.isDemoMode ? (
            <Tag color="purple">Bật</Tag>
          ) : (
            <Tag color="default">Tắt</Tag>
          )}
        </Space>
      </div>

      {/* Info card */}
      <Card
        style={{
          background: bgContainer,
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          marginBottom: 24,
        }}
        styles={{ body: { padding: 24 } }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
          <ExperimentOutlined style={{ color: '#8B5CF6', fontSize: 22, marginTop: 2 }} />
          <div>
            <Text style={{ color: textPrimary, fontWeight: 700, fontSize: 15, display: 'block', marginBottom: 6 }}>
              Về Demo Mode
            </Text>
            <Paragraph style={{ color: textMuted, margin: 0 }}>
              Demo Mode cho phép reset toàn bộ dữ liệu về trạng thái demo ban đầu. Dùng cho môi trường
              staging/demo để giữ dữ liệu mẫu luôn nhất quán và sẵn sàng cho việc thử nghiệm sản phẩm.
            </Paragraph>
          </div>
        </div>

        <Descriptions
          column={1}
          size="small"
          styles={{ label: { color: textMuted }, content: { color: textPrimary } }}
        >
          <Descriptions.Item label="Môi trường">
            {process.env.NODE_ENV === 'production' ? (
              <Tag color="red">Production</Tag>
            ) : (
              <Tag color="blue">Development / Staging</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Lần reset cuối">
            {data?.lastReset
              ? dayjs(data.lastReset).format('DD/MM/YYYY HH:mm:ss')
              : <Text style={{ color: textMuted }}>Chưa có lần reset nào</Text>}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Warning + Action */}
      <Card
        style={{
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 12,
        }}
        styles={{ body: { padding: 24 } }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
          <WarningOutlined style={{ color: '#EF4444', fontSize: 20, marginTop: 2 }} />
          <div>
            <Text style={{ color: '#EF4444', fontWeight: 700, display: 'block', marginBottom: 4 }}>
              Cảnh báo
            </Text>
            <Text style={{ color: textMuted }}>
              Hành động này sẽ xóa toàn bộ dữ liệu hiện tại và thay thế bằng dữ liệu demo. Hành động không thể hoàn tác.
            </Text>
          </div>
        </div>

        <Button
          danger
          type="primary"
          icon={<ReloadOutlined />}
          size="large"
          loading={resetMutation.isPending}
          onClick={handleReset}
        >
          Reset Demo Data
        </Button>
      </Card>
    </div>
  );
}
