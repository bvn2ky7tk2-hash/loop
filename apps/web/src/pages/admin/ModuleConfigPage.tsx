import React from 'react';
import {
  Row, Col, Switch, Card, Typography, Space, Tag, Badge, Modal, message, Spin,
} from 'antd';
import {
  AppstoreOutlined, LockOutlined, ApiOutlined,
  TeamOutlined, DollarOutlined, ShopOutlined, LaptopOutlined,
  ToolOutlined, UserOutlined, SettingOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moduleConfigApi } from '../../api/module-config';
import type { ModuleConfig } from '../../api/module-config';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';

const { Text, Title } = Typography;

const MODULE_META: Record<string, { icon: React.ReactNode; color: string; features: string }> = {
  work:    { icon: <ApiOutlined />,    color: '#6366F1', features: 'Task, Bug, Timesheet, BPM Inbox' },
  people:  { icon: <TeamOutlined />,   color: '#8B5CF6', features: 'Nhân viên, Payroll, Nghỉ phép, Tuyển dụng' },
  finance: { icon: <DollarOutlined />, color: '#10B981', features: 'Chi phí, Hóa đơn, Kế toán, Ngân sách' },
  crm:     { icon: <ShopOutlined />,   color: '#F59E0B', features: 'Leads, Deals, Contacts, Pipeline' },
  asset:   { icon: <LaptopOutlined />, color: '#F97316', features: 'Hardware, Phần mềm, License' },
  ops:     { icon: <ToolOutlined />,   color: '#3B82F6', features: 'Hợp đồng, Mua hàng, Vận hành' },
  me:      { icon: <UserOutlined />,   color: '#6366F1', features: 'Dashboard cá nhân, Task của tôi' },
  admin:   { icon: <SettingOutlined />,color: '#EF4444', features: 'Cấu hình hệ thống, Phân quyền, Audit' },
};

export default function ModuleConfigPage() {
  const { textPrimary, textMuted, bgCard, borderColor, isDark } = useThemePalette();
  const qc = useQueryClient();

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['module-config'],
    queryFn: moduleConfigApi.listModules,
  });

  const toggleMut = useMutation({
    mutationFn: ({ moduleId, isEnabled }: { moduleId: string; isEnabled: boolean }) =>
      moduleConfigApi.toggleModule(moduleId, isEnabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['module-config'] });
      message.success('Đã cập nhật trạng thái module');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Không thể cập nhật module';
      message.error(msg);
    },
  });

  const handleToggle = (mod: ModuleConfig, newValue: boolean) => {
    if (!newValue) {
      Modal.confirm({
        title: `Tắt module "${mod.displayName}"?`,
        content: 'Tắt module này sẽ ẩn khỏi navigation và không cho phép người dùng truy cập. Bạn có thể bật lại bất kỳ lúc nào.',
        okText: 'Xác nhận tắt',
        cancelText: 'Hủy',
        okButtonProps: { danger: true },
        onOk: () => toggleMut.mutate({ moduleId: mod.moduleId, isEnabled: false }),
      });
    } else {
      toggleMut.mutate({ moduleId: mod.moduleId, isEnabled: true });
    }
  };

  const enabledCount = modules.filter((m) => m.isEnabled).length;
  const disabledCount = modules.filter((m) => !m.isEnabled).length;
  const coreCount = modules.filter((m) => m.isCore).length;

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Cấu hình Module"
        icon={<AppstoreOutlined />}
        iconColor="#6366F1"
      />

      {/* Stat Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <StatCard
            label="Modules đang bật"
            value={enabledCount}
            color="#10B981"
            icon={<AppstoreOutlined />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Modules đã tắt"
            value={disabledCount}
            color="#EF4444"
            icon={<AppstoreOutlined />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Core (không tắt được)"
            value={coreCount}
            color="#6366F1"
            icon={<LockOutlined />}
          />
        </Col>
      </Row>

      {/* Module Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {modules.map((mod) => {
            const meta = MODULE_META[mod.moduleId];
            const color = meta?.color ?? '#6366F1';
            const icon = meta?.icon ?? <AppstoreOutlined />;
            const features = meta?.features ?? mod.description ?? '';

            return (
              <Col xs={24} sm={12} key={mod.moduleId}>
                <Card
                  style={{
                    background: bgCard,
                    border: `2px solid ${mod.isEnabled ? color + '55' : borderColor}`,
                    borderRadius: 12,
                    opacity: mod.isEnabled ? 1 : 0.65,
                    transition: 'all 0.2s ease',
                  }}
                  bodyStyle={{ padding: '16px 20px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    {/* Left: icon + info */}
                    <Space align="start" size={12}>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: `${color}22`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        color,
                        flexShrink: 0,
                      }}>
                        {icon}
                      </div>
                      <div>
                        <Space size={6} align="center" style={{ marginBottom: 2 }}>
                          <Title level={5} style={{ margin: 0, color: textPrimary }}>
                            {mod.displayName}
                          </Title>
                          <Text style={{ color: textMuted, fontSize: 12 }}>({mod.moduleId})</Text>
                          {mod.isCore && (
                            <Tag
                              icon={<LockOutlined />}
                              style={isDark
                                ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', borderColor: 'rgba(99,102,241,0.35)', fontSize: 11 }
                                : { fontSize: 11 }}
                              color={isDark ? undefined : 'purple'}
                            >
                              Core
                            </Tag>
                          )}
                        </Space>
                        <Text style={{ color: textMuted, fontSize: 12 }}>{features}</Text>
                      </div>
                    </Space>

                    {/* Right: switch */}
                    <Space direction="vertical" size={4} style={{ alignItems: 'flex-end' }}>
                      <Switch
                        checked={mod.isEnabled}
                        disabled={mod.isCore}
                        loading={toggleMut.isPending && toggleMut.variables?.moduleId === mod.moduleId}
                        onChange={(checked) => handleToggle(mod, checked)}
                        style={mod.isEnabled ? { backgroundColor: color } : undefined}
                      />
                      {mod.isCore && (
                        <Text style={{ fontSize: 11, color: textMuted }}>Không thể tắt</Text>
                      )}
                    </Space>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}
