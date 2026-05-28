import { useState, useEffect } from 'react';
import { Form, Switch, Input, Button, Alert, Typography, Space, Divider, App } from 'antd';
import { SendOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationsApi } from '../../api/integrations';

const { Title, Text, Link } = Typography;

export default function TelegramSettingsSection() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [isEnabled, setIsEnabled] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const { data: config } = useQuery({
    queryKey: ['telegram-config'],
    queryFn: integrationsApi.getTelegramConfig,
  });

  useEffect(() => {
    if (config) {
      setIsEnabled(config.isEnabled);
      setBotToken(config.botToken ?? '');
      setChatId(config.chatId ?? '');
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: integrationsApi.updateTelegramConfig,
    onSuccess: () => {
      void message.success('Đã lưu cấu hình Telegram');
      void qc.invalidateQueries({ queryKey: ['telegram-config'] });
    },
    onError: () => void message.error('Lưu cấu hình thất bại'),
  });

  const testMutation = useMutation({
    mutationFn: integrationsApi.testTelegramConfig,
    onSuccess: (result) => setTestResult(result),
    onError: () => setTestResult({ success: false, error: 'Không thể kết nối đến server' }),
  });

  const isMasked = (token: string) => token.endsWith('***');

  const handleSave = () => {
    if (isEnabled && (!botToken.trim() || !chatId.trim())) {
      void message.warning('Vui lòng nhập Bot Token và Chat ID');
      return;
    }
    saveMutation.mutate({
      isEnabled,
      // Chỉ gửi botToken nếu user đã thay đổi (không gửi masked value)
      ...(!isMasked(botToken) ? { botToken } : {}),
      chatId,
    });
  };

  const canTest = botToken.trim() !== '' && chatId.trim() !== '';

  return (
    <div style={{ maxWidth: 600, padding: '16px 0' }}>
      <Title level={5}>Tích hợp Telegram</Title>
      <Text type="secondary">
        Nhận thông báo task và cập nhật trạng thái trực tiếp từ Telegram group.
      </Text>

      <Divider />

      <Form layout="vertical">
        <Form.Item label="Bật thông báo Telegram">
          <Switch checked={isEnabled} onChange={setIsEnabled} />
        </Form.Item>

        <Form.Item
          label="Bot Token"
          help={
            <Link href="https://t.me/BotFather" target="_blank">
              Tạo bot tại @BotFather
            </Link>
          }
        >
          <Input.Password
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            disabled={!isEnabled}
            placeholder="123456789:ABCdef..."
            visibilityToggle={false}
          />
        </Form.Item>

        <Form.Item label="Chat ID" help="Thêm @userinfobot vào group để lấy Chat ID">
          <Input
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            disabled={!isEnabled}
            placeholder="-100123456789"
          />
        </Form.Item>

        {testResult && (
          <Form.Item>
            <Alert
              type={testResult.success ? 'success' : 'error'}
              message={
                testResult.success
                  ? '✅ Tin nhắn thử nghiệm đã được gửi — kiểm tra Telegram group của bạn'
                  : `❌ Không thể gửi tin — ${testResult.error ?? 'kiểm tra lại Bot Token và Chat ID'}`
              }
              showIcon
            />
          </Form.Item>
        )}

        <Form.Item>
          <Space>
            <Button
              icon={<SendOutlined />}
              onClick={() => {
                setTestResult(null);
                testMutation.mutate();
              }}
              loading={testMutation.isPending}
              disabled={!canTest}
            >
              Gửi tin thử nghiệm
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saveMutation.isPending}
            >
              Lưu cấu hình
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
}
