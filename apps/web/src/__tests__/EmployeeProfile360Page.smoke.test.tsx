import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock toàn bộ API mạng để render không phụ thuộc backend ─────────────────────
vi.mock('../api/hr-profile', () => ({
  hrProfileApi: {
    get360: vi.fn().mockResolvedValue({
      personal: {
        id: 'emp-1',
        code: 'EMP-0001',
        fullName: 'Nguyễn Văn A',
        startDate: '2020-01-01',
        employeeStatus: 'ACTIVE',
        isActive: true,
      },
      workHistory: [],
      salaryHistory: [],
      decisions: [],
      contracts: [],
      training: [],
      performance: [],
      education: [],
      workExperience: [],
      familyMembers: [],
    }),
    getEducation: vi.fn().mockResolvedValue([]),
    getWorkExperience: vi.fn().mockResolvedValue([]),
    getFamilyMembers: vi.fn().mockResolvedValue([]),
  },
}));

// ProvinceWardSelect / CategorySelect gọi apiClient trực tiếp
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

import EmployeeProfile360Page from '../pages/hr/EmployeeProfile360Page';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <MemoryRouter initialEntries={['/hr/employees/emp-1/profile']}>
      <QueryClientProvider client={qc}>
        <ConfigProvider>
          <AntdApp>
            <Routes>
              <Route path="/hr/employees/:employeeId/profile" element={children} />
            </Routes>
          </AntdApp>
        </ConfigProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('EmployeeProfile360Page — smoke', () => {
  it('render không throw và hiển thị tên nhân viên', async () => {
    const { getByText } = render(
      <Wrapper>
        <EmployeeProfile360Page />
      </Wrapper>,
    );
    await waitFor(() => expect(getByText('Nguyễn Văn A')).toBeTruthy());
  });
});
