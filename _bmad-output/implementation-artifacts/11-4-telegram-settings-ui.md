# Story 11.4: Web UI — Telegram Integration Settings Section

Status: done

## Story

As a PM or Admin,
I want to configure and test the Telegram integration directly from the Loop settings page,
so that I can set up the bot without touching server files or environment variables.

## Acceptance Criteria

1. Tab "Tích hợp" mới trong `SettingsPage` (bên cạnh tab "Người dùng" và "Cấu hình cảnh báo"), chứa `TelegramSettingsSection` component.
2. `TelegramSettingsSection` có: Toggle bật/tắt, input Bot Token (type password), input Chat ID, button "Gửi tin thử nghiệm" (disabled khi token/chatId trống), button "Lưu cấu hình".
3. Khi load trang: gọi `GET /api/v1/integrations/telegram` — hiển thị config hiện tại. Bot Token hiển thị dạng masked (`"12345678***"`).
4. "Lưu cấu hình" gọi `PUT /api/v1/integrations/telegram` — toast "Đã lưu cấu hình Telegram" khi success.
5. "Gửi tin thử nghiệm" gọi `POST /api/v1/integrations/telegram/test` — hiển thị Alert success hoặc error theo response.
6. Khi toggle tắt và lưu (`isEnabled: false`): Bot Token và Chat ID inputs bị disable nhưng giữ nguyên giá trị.
7. Chỉ Admin và PM mới thấy tab "Tích hợp" (check `currentUser.role`).
8. Form validation: Bot Token và Chat ID required khi `isEnabled: true`. Submit bị block nếu validation fail.
9. Unit/component tests cho `TelegramSettingsSection`: (a) render đúng fields, (b) disable button khi token trống, (c) disable inputs khi toggle off.

## Tasks / Subtasks

- [x] Task 1: Tạo API module cho Telegram integration (AC: 3, 4, 5)
  - [x] Tạo `apps/web/src/api/integrations.ts`
  - [x] Export `integrationsApi` với 3 methods
  - [x] TypeScript interfaces: `TelegramConfig`, `UpdateTelegramConfigDto`, `TelegramTestResult`

- [x] Task 2: Implement `TelegramSettingsSection` component (AC: 2, 3, 4, 5, 6, 8)
  - [x] Tạo `apps/web/src/components/settings/TelegramSettingsSection.tsx`
  - [x] `useQuery` → `getTelegramConfig` key: `['telegram-config']`
  - [x] `useMutation` → `updateTelegramConfig` + invalidate
  - [x] `useMutation` → `testTelegramConfig`
  - [x] State: `isEnabled`, `botToken`, `chatId`
  - [x] Hydrate form từ query data
  - [x] Handle masked token (không gửi lên nếu kết thúc bằng ***)
  - [x] Validation: warn khi isEnabled true mà token/chatId trống

- [x] Task 3: Thêm tab "Tích hợp" vào `SettingsPage` (AC: 1, 7)
  - [x] Import `TelegramSettingsSection` và `ApiOutlined`
  - [x] Thêm tab mới vào `items` array
  - [x] Check role: chỉ render tab nếu ADMIN hoặc PM
  - [x] Lấy `currentUser` từ `useAuthStore`

- [x] Task 4: Component tests (AC: 9)
  - [x] Tạo `apps/web/src/components/settings/TelegramSettingsSection.test.tsx`
  - [x] Test: render đúng fields
  - [x] Test: button disabled khi botToken trống
  - [x] Test: inputs disabled khi toggle off

## Dev Notes

### Pattern web API module

Follow pattern file `apps/web/src/api/notifications.ts` (TanStack Query + axios client):

```typescript
// apps/web/src/api/integrations.ts
import { apiClient } from './client';

export interface TelegramConfig {
  isEnabled: boolean;
  botToken: string | null;
  chatId: string | null;
}

export interface UpdateTelegramConfigDto {
  isEnabled?: boolean;
  botToken?: string;
  chatId?: string;
}

export interface TelegramTestResult {
  success: boolean;
  error?: string;
}

export const integrationsApi = {
  getTelegramConfig: () =>
    apiClient.get<TelegramConfig>('/integrations/telegram').then((r) => r.data),

  updateTelegramConfig: (data: UpdateTelegramConfigDto) =>
    apiClient.put<TelegramConfig>('/integrations/telegram', data).then((r) => r.data),

  testTelegramConfig: () =>
    apiClient.post<TelegramTestResult>('/integrations/telegram/test').then((r) => r.data),
};
```

### Component UI pattern

Follow `AlertsPage.tsx` pattern: `useQuery` + `useMutation` + Ant Design form components. File ở `apps/web/src/pages/alerts/AlertsPage.tsx`.

```tsx
// apps/web/src/components/settings/TelegramSettingsSection.tsx
import { useState, useEffect } from 'react';
import { Form, Switch, Input, Button, Alert, Typography, Space, Divider } from 'antd';
import { SendOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationsApi } from '../../api/integrations';
import { message } from 'antd';

const { Title, Text, Link } = Typography;

export default function TelegramSettingsSection() {
  const qc = useQueryClient();
  const [isEnabled, setIsEnabled] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const { data: config, isLoading } = useQuery({
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
      message.success('Đã lưu cấu hình Telegram');
      qc.invalidateQueries({ queryKey: ['telegram-config'] });
    },
    onError: () => message.error('Lưu cấu hình thất bại'),
  });

  const testMutation = useMutation({
    mutationFn: integrationsApi.testTelegramConfig,
    onSuccess: (result) => setTestResult(result),
    onError: () => setTestResult({ success: false, error: 'Không thể kết nối đến server' }),
  });

  const isMasked = (token: string) => token.endsWith('***');
  const isTokenChanged = !isMasked(botToken) && botToken !== (config?.botToken ?? '');

  const handleSave = () => {
    if (isEnabled && (!botToken || !chatId)) {
      message.warning('Vui lòng nhập Bot Token và Chat ID');
      return;
    }
    saveMutation.mutate({
      isEnabled,
      // Chỉ gửi botToken nếu user đã thay đổi (không gửi masked value)
      ...(isTokenChanged ? { botToken } : {}),
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
          help={<Link href="https://t.me/BotFather" target="_blank">Tạo bot tại @BotFather</Link>}
        >
          <Input.Password
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            disabled={!isEnabled}
            placeholder="123456789:ABCdef..."
            visibilityToggle={false}
          />
        </Form.Item>

        <Form.Item
          label="Chat ID"
          help="Thêm @userinfobot vào group để lấy Chat ID"
        >
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
              onClick={() => { setTestResult(null); testMutation.mutate(); }}
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
```

### Cập nhật `SettingsPage` — thêm tab Tích hợp

```tsx
// apps/web/src/pages/settings/SettingsPage.tsx — thêm vào items array:
{
  key: 'integrations',
  label: <span><ApiOutlined style={{ marginRight: 6 }} />Tích hợp</span>,
  children: <TelegramSettingsSection />,
}
```

Để check role, cần `currentUser`. Xem cách app lấy user hiện tại — tìm `useAuthStore` hoặc `AuthContext` trong `apps/web/src/`. Filter tab theo role:

```tsx
const visibleItems = items.filter(item => {
  if (item.key === 'integrations') {
    return ['ADMIN', 'PM'].includes(currentUser?.role ?? '');
  }
  return true;
});
```

### Xử lý masked token

Backend trả về `botToken: "12345678***"`. Khi user lưu lại mà không thay đổi token, KHÔNG gửi giá trị masked này lên backend (backend sẽ lưu chuỗi `"12345678***"` làm token thật). Chỉ gửi `botToken` khi user đã nhập lại một giá trị khác.

Logic detect: nếu `botToken.endsWith('***')` → giữ nguyên, không include trong PUT body.

### Component test setup

```tsx
// TelegramSettingsSection.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TelegramSettingsSection from './TelegramSettingsSection';
import * as integrationsModule from '../../api/integrations';

// Mock API
jest.mock('../../api/integrations');

const mockConfig = { isEnabled: false, botToken: null, chatId: null };

describe('TelegramSettingsSection', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    (integrationsModule.integrationsApi.getTelegramConfig as jest.Mock)
      .mockResolvedValue(mockConfig);
  });

  const renderComponent = () => render(
    <QueryClientProvider client={queryClient}>
      <TelegramSettingsSection />
    </QueryClientProvider>
  );

  it('renders all fields', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('Bot Token')).toBeInTheDocument());
    expect(screen.getByText('Chat ID')).toBeInTheDocument();
    expect(screen.getByText('Gửi tin thử nghiệm')).toBeInTheDocument();
    expect(screen.getByText('Lưu cấu hình')).toBeInTheDocument();
  });

  it('disables test button when botToken empty', async () => {
    renderComponent();
    await waitFor(() => screen.getByText('Gửi tin thử nghiệm'));
    expect(screen.getByText('Gửi tin thử nghiệm').closest('button')).toBeDisabled();
  });
});
```

### Import Ant Design icons

`ApiOutlined` import từ `@ant-design/icons` — đã có trong dự án (xem `AlertsPage.tsx` import `BellOutlined`).

### References

- `SettingsPage` (thêm tab mới): `apps/web/src/pages/settings/SettingsPage.tsx`
- Pattern API module: `apps/web/src/api/notifications.ts`
- Pattern component: `apps/web/src/pages/alerts/AlertsPage.tsx`
- API client: `apps/web/src/api/client.ts`
- Ant Design v5 Switch: `<Switch>` component, không cần import riêng ngoài `antd`
- Input.Password: `<Input.Password visibilityToggle={false} />` để ẩn eye icon

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- `apps/web/src/api/integrations.ts` (new)
- `apps/web/src/components/settings/TelegramSettingsSection.tsx` (new)
- `apps/web/src/components/settings/TelegramSettingsSection.test.tsx` (new)
- `apps/web/src/pages/settings/SettingsPage.tsx` (modified — thêm tab Tích hợp)

## Change Log

| Date | Change |
|------|--------|
| 2026-05-26 | Story created by Winston (System Architect) |
