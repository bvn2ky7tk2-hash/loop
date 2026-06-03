import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock toàn bộ API mạng để render không phụ thuộc backend ─────────────────────
vi.mock('../api/reports', async (importActual) => {
  const actual = await importActual<typeof import('../api/reports')>();
  return {
    ...actual,
    reportsApi: {
      topEmployees: vi.fn().mockResolvedValue([]),
      monthlyHours: vi.fn().mockResolvedValue([]),
      orgSummary: vi.fn().mockResolvedValue([]),
      projectBurndown: vi.fn().mockResolvedValue(undefined),
      bugStats: vi.fn().mockResolvedValue(undefined),
      hrStats: vi.fn().mockResolvedValue(undefined),
      generate: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock('../api/projects', () => ({
  projectsApi: { list: vi.fn().mockResolvedValue([]) },
}));

// Các tab CRM/Recruitment/Asset dùng React Query hooks
vi.mock('../api/crm', () => ({
  useGetDeals: () => ({ data: { data: [] } }),
}));

vi.mock('../api/recruit', () => ({
  useGetJobs: () => ({ data: { data: [] } }),
  useGetCandidates: () => ({ data: { data: [] } }),
}));

vi.mock('../api/assets', () => ({
  useGetAssets: () => ({ data: { data: [] } }),
}));

// PeriodComparisonTab gọi apiClient.get('/reports/summary') trực tiếp
vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { current: {}, compare: {} } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

import ReportsPage from '../pages/reports/ReportsPage';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <ConfigProvider>
          <AntdApp>{children}</AntdApp>
        </ConfigProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('ReportsPage — smoke', () => {
  it('render không throw với dữ liệu rỗng', () => {
    const { getByText } = render(
      <Wrapper>
        <ReportsPage />
      </Wrapper>,
    );
    // Tiêu đề trang + tab mặc định "Giờ làm việc"
    expect(getByText('Reports')).toBeTruthy();
    expect(getByText('Giờ làm việc')).toBeTruthy();
  });
});
