import { useState, useEffect } from 'react';
import {
  Form, Input, Button, Select, Card, Row, Col,
  message, Typography, Space, Divider,
} from 'antd';
import { BuildOutlined, SaveOutlined, EyeOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/ui/PageHeader';
import { useThemePalette } from '../../hooks/useThemePalette';
import { tenantApi } from '../../api/tenant';
import type { TenantConfig } from '../../api/tenant';
import { useTenantStore } from '../../store/tenant.store';

const { Text } = Typography;

const TIMEZONE_OPTIONS = [
  { label: 'Asia/Ho_Chi_Minh (UTC+7)', value: 'Asia/Ho_Chi_Minh' },
  { label: 'Asia/Bangkok (UTC+7)',      value: 'Asia/Bangkok' },
  { label: 'Asia/Singapore (UTC+8)',    value: 'Asia/Singapore' },
  { label: 'Asia/Tokyo (UTC+9)',        value: 'Asia/Tokyo' },
  { label: 'UTC (UTC+0)',               value: 'UTC' },
];

export default function TenantSettingsPage() {
  const { textPrimary, textMuted, bgContainer, bgCard, borderColor } = useThemePalette();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { config, setConfig } = useTenantStore();
  const [previewColor, setPreviewColor] = useState<string>('#6366F1');

  useEffect(() => {
    tenantApi.getConfig()
      .then(cfg => {
        setConfig(cfg);
        form.setFieldsValue({
          name:         cfg.name,
          primaryColor: cfg.primaryColor ?? '',
          logoUrl:      cfg.logoUrl ?? '',
          address:      cfg.address ?? '',
          timezone:     cfg.timezone ?? 'Asia/Ho_Chi_Minh',
        });
        if (cfg.primaryColor) setPreviewColor(cfg.primaryColor);
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  async function handleSave(values: Partial<TenantConfig>) {
    try {
      setLoading(true);
      const updated = await tenantApi.update(values);
      setConfig(updated);
      if (updated.name) document.title = updated.name;
      message.success('Đã lưu cài đặt công ty');
    } catch {
      message.error('Lưu thất bại, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Cài đặt Công ty"
        icon={<BuildOutlined />}
        iconColor="#6366F1"
      />

      <Row gutter={24}>
        {/* ── Form ── */}
        <Col xs={24} lg={14}>
          <Card
            style={{ background: bgContainer, border: `1px solid ${borderColor}` }}
            loading={fetching}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
              initialValues={{ timezone: 'Asia/Ho_Chi_Minh' }}
            >
              <Form.Item
                label={<Text style={{ color: textPrimary }}>Tên công ty</Text>}
                name="name"
                rules={[{ required: true, message: 'Vui lòng nhập tên công ty' }]}
              >
                <Input placeholder="Loop 360 Demo" maxLength={200} />
              </Form.Item>

              <Form.Item
                label={<Text style={{ color: textPrimary }}>Màu chủ đạo</Text>}
                name="primaryColor"
                extra={<Text style={{ color: textMuted, fontSize: 12 }}>Định dạng hex: #RRGGBB (vd: #6366F1)</Text>}
              >
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="#6366F1"
                    maxLength={7}
                    onChange={e => {
                      const val = e.target.value;
                      if (/^#[0-9A-Fa-f]{6}$/.test(val)) setPreviewColor(val);
                    }}
                    style={{ flex: 1 }}
                  />
                  {/* Ô preview màu */}
                  <div style={{
                    width: 40,
                    background: previewColor,
                    border: `1px solid ${borderColor}`,
                    borderLeft: 'none',
                    borderRadius: '0 6px 6px 0',
                    flexShrink: 0,
                  }} />
                </Space.Compact>
              </Form.Item>

              <Form.Item
                label={<Text style={{ color: textPrimary }}>URL Logo</Text>}
                name="logoUrl"
                extra={<Text style={{ color: textMuted, fontSize: 12 }}>URL hình ảnh logo công ty (để trống để dùng logo mặc định)</Text>}
              >
                <Input placeholder="https://cdn.example.com/logo.png" />
              </Form.Item>

              <Form.Item
                label={<Text style={{ color: textPrimary }}>Địa chỉ</Text>}
                name="address"
              >
                <Input.TextArea rows={2} placeholder="123 Nguyễn Huệ, Quận 1, TP.HCM" maxLength={500} />
              </Form.Item>

              <Form.Item
                label={<Text style={{ color: textPrimary }}>Múi giờ</Text>}
                name="timezone"
              >
                <Select options={TIMEZONE_OPTIONS} />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={loading}
                >
                  Lưu cài đặt
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* ── Preview ── */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <EyeOutlined style={{ color: '#6366F1' }} />
                <Text style={{ color: textPrimary }}>Xem trước thương hiệu</Text>
              </Space>
            }
            style={{ background: bgContainer, border: `1px solid ${borderColor}` }}
          >
            {/* Sidebar preview mini */}
            <div style={{
              background: bgCard,
              borderRadius: 8,
              border: `1px solid ${borderColor}`,
              overflow: 'hidden',
            }}>
              {/* Logo bar */}
              <div style={{
                height: 52,
                background: previewColor,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: 10,
              }}>
                {config?.logoUrl
                  ? <img src={config.logoUrl} alt="logo" style={{ height: 28, objectFit: 'contain' }} />
                  : (
                    <div style={{
                      width: 32, height: 32, borderRadius: 6,
                      background: 'rgba(255,255,255,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <BuildOutlined style={{ color: '#fff', fontSize: 16 }} />
                    </div>
                  )
                }
                <Text style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                  {form.getFieldValue('name') || config?.name || 'Loop 360'}
                </Text>
              </div>

              <Divider style={{ margin: 0, borderColor }} />

              {/* Nav item preview */}
              {['Bảng công việc', 'Tất cả dự án', 'Quản lý lỗi'].map((label, i) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    height: 36,
                    padding: '0 16px',
                    margin: '2px 6px',
                    borderRadius: 6,
                    background: i === 0 ? `${previewColor}22` : 'transparent',
                    borderLeft: i === 0 ? `3px solid ${previewColor}` : '3px solid transparent',
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: i === 0 ? previewColor : borderColor }} />
                  <Text style={{ color: textPrimary, fontSize: 13 }}>{label}</Text>
                </div>
              ))}
            </div>

            <Divider style={{ borderColor }} />

            <div>
              <Text style={{ color: textMuted, fontSize: 12, display: 'block', marginBottom: 4 }}>Địa chỉ</Text>
              <Text style={{ color: textPrimary, fontSize: 13 }}>
                {form.getFieldValue('address') || config?.address || 'Chưa cài đặt'}
              </Text>
            </div>
            <div style={{ marginTop: 8 }}>
              <Text style={{ color: textMuted, fontSize: 12, display: 'block', marginBottom: 4 }}>Múi giờ</Text>
              <Text style={{ color: textPrimary, fontSize: 13 }}>
                {form.getFieldValue('timezone') || config?.timezone || 'Asia/Ho_Chi_Minh'}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
