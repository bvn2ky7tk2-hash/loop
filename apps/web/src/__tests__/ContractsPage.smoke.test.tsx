import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock toàn bộ API mạng để render không phụ thuộc backend ─────────────────────
vi.mock('../api/contracts', async (importActual) => {
  const actual = await importActual<typeof import('../api/contracts')>();
  return {
    ...actual,
    contractsApi: {
      list: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 }),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      renew: vi.fn().mockResolvedValue({}),
      remove: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock('../api/payroll', () => ({
  payrollApi: { listAllowanceTypes: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../api/employees', () => ({
  employeesApi: {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../api/hr-core', () => ({
  positionsApi: { list: vi.fn().mockResolvedValue({ data: [], total: 0 }) },
}));

// OrgUnitSelect gọi apiClient.get('/org-units') trực tiếp
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

import ContractsPage from '../pages/contracts/ContractsPage';

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

describe('ContractsPage — smoke', () => {
  it('render không throw với dữ liệu rỗng', () => {
    const { getByText } = render(
      <Wrapper>
        <ContractsPage />
      </Wrapper>,
    );
    expect(getByText('Quản lý hợp đồng lao động')).toBeTruthy();
  });
});
