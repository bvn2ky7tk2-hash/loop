import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App, ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PayrollPage from '../pages/payroll/PayrollPage';

// Giữ các type/export thuần thật, chỉ override payrollApi (gọi mạng).
vi.mock('../api/payroll', async (importActual) => {
  const actual = await importActual<typeof import('../api/payroll')>();
  return {
    ...actual,
    payrollApi: {
      ...actual.payrollApi,
      listPeriods: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 50, totalPages: 0 }),
    },
  };
});

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <ConfigProvider>
          <App>{children}</App>
        </ConfigProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('PayrollPage smoke', () => {
  it('render được header và 2 tab mà không crash', async () => {
    render(<PayrollPage />, { wrapper: Wrapper });
    expect(await screen.findByText('Payroll')).toBeTruthy();
    expect(screen.getByText('Lương tháng')).toBeTruthy();
    expect(screen.getByText('Tháng 13')).toBeTruthy();
    expect(screen.getByText('Tạo kỳ lương')).toBeTruthy();
  });
});
