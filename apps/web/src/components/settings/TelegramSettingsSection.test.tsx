import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TelegramSettingsSection from './TelegramSettingsSection';
import * as integrationsModule from '../../api/integrations';

jest.mock('../../api/integrations');

const mockConfig = { isEnabled: false, botToken: null, chatId: null };

describe('TelegramSettingsSection', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    (integrationsModule.integrationsApi.getTelegramConfig as jest.Mock).mockResolvedValue(
      mockConfig,
    );
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <TelegramSettingsSection />
      </QueryClientProvider>,
    );

  it('renders all fields', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('Bot Token')).toBeInTheDocument());
    expect(screen.getByText('Chat ID')).toBeInTheDocument();
    expect(screen.getByText('Gửi tin thử nghiệm')).toBeInTheDocument();
    expect(screen.getByText('Lưu cấu hình')).toBeInTheDocument();
  });

  it('disables test button when botToken is empty', async () => {
    renderComponent();
    await waitFor(() => screen.getByText('Gửi tin thử nghiệm'));
    expect(screen.getByText('Gửi tin thử nghiệm').closest('button')).toBeDisabled();
  });

  it('disables inputs when toggle is off', async () => {
    renderComponent();
    await waitFor(() => screen.getByText('Bot Token'));
    // Switch is off by default (isEnabled: false from mockConfig)
    const passwordInputs = screen.getAllByPlaceholderText(/ABCdef/i);
    expect(passwordInputs[0]).toBeDisabled();
    const chatIdInput = screen.getByPlaceholderText(/-100123456789/i);
    expect(chatIdInput).toBeDisabled();
  });
});
