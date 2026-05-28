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
