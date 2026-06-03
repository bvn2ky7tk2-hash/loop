import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock toàn bộ API mạng để render không phụ thuộc backend ─────────────────────

vi.mock('../api/org-units', () => ({
  orgUnitsApi: {
    getTree: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    setLeader: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../api/employees', () => ({
  employeesApi: {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../api/hr-core', () => ({
  jobTitlesApi: { list: vi.fn().mockResolvedValue({ data: [] }) },
  positionsApi: { list: vi.fn().mockResolvedValue({ data: [] }) },
}));

// OrgUnitSelect gọi apiClient trực tiếp
vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

import OrgChartPage from '../pages/org/OrgChartPage';

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

describe('OrgChartPage — smoke', () => {
  it('render không throw với dữ liệu rỗng', () => {
    const { getAllByText } = render(
      <Wrapper>
        <OrgChartPage />
      </Wrapper>,
    );
    // Tiêu đề trang "Sơ đồ tổ chức"
    expect(getAllByText('Sơ đồ tổ chức').length).toBeGreaterThan(0);
  });
});
