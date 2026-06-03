import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock toàn bộ API mạng để render không phụ thuộc backend ─────────────────────
vi.mock('../api/hr-decisions', () => ({
  hrDecisionsApi: {
    list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    submit: vi.fn().mockResolvedValue({}),
    approve: vi.fn().mockResolvedValue({}),
    reject: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../api/employees', () => ({
  employeesApi: {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../api/hr-core', () => ({
  positionsApi: {
    list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  },
}));

vi.mock('../api/org-units', () => ({
  orgUnitsApi: {
    getTree: vi.fn().mockResolvedValue([]),
  },
}));

import HrDecisionsPage from '../pages/hr/HrDecisionsPage';

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

describe('HrDecisionsPage — smoke', () => {
  it('render không throw với dữ liệu rỗng', () => {
    const { getAllByText } = render(
      <Wrapper>
        <HrDecisionsPage />
      </Wrapper>,
    );
    // PageHeader title "Quyết định nhân sự"
    expect(getAllByText('Quyết định nhân sự').length).toBeGreaterThan(0);
  });
});
