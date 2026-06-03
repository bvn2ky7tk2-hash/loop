import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock toàn bộ API mạng để render không phụ thuộc backend ─────────────────────
vi.mock('../api/hr-insurance', () => ({
  hrInsuranceApi: {
    getDashboard: vi.fn().mockResolvedValue({
      totalActive: 0,
      thisMonth: { enrolled: 0, terminated: 0 },
      missingBook: 0,
    }),
    listEnrollments: vi.fn().mockResolvedValue([]),
    enroll: vi.fn().mockResolvedValue({}),
    createEvent: vi.fn().mockResolvedValue({}),
    updateBook: vi.fn().mockResolvedValue({}),
    upsertBook: vi.fn().mockResolvedValue({}),
    exportD02: vi.fn().mockResolvedValue({ enrolled: [], terminated: [], salaryChanged: [] }),
  },
}));

vi.mock('../api/employees', () => ({
  employeesApi: {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
  },
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

import InsurancePage from '../pages/hr/InsurancePage';

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

describe('InsurancePage — smoke', () => {
  it('render không throw với dữ liệu rỗng', () => {
    const { getByText } = render(
      <Wrapper>
        <InsurancePage />
      </Wrapper>,
    );
    expect(getByText('Bảo hiểm xã hội')).toBeTruthy();
  });
});
