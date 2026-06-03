import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock toàn bộ API mạng để render không phụ thuộc backend ─────────────────────

vi.mock('../api/employees', () => ({
  employeesApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: 'emp-1',
        code: 'EMP-0001',
        fullName: 'Nguyễn Văn A',
        level: 'MID',
        orgUnitId: 'org-1',
        techStack: ['React'],
        startDate: '2020-01-01',
        activeProjectCount: 0,
      },
    ]),
    get: vi.fn().mockResolvedValue({}),
    getRates: vi.fn().mockResolvedValue([]),
    getProjectHistory: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    addRate: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../api/org-units', () => ({
  orgUnitsApi: {
    getTree: vi.fn().mockResolvedValue([
      { id: 'org-1', name: 'Phòng Kỹ thuật', code: 'KT', level: 0, children: [], _count: { users: 1 } },
    ]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../api/payroll', () => ({
  payrollApi: {
    getEmployeeTaxProfile: vi.fn().mockResolvedValue(null),
    listDependents: vi.fn().mockResolvedValue([]),
    upsertEmployeeTaxProfile: vi.fn().mockResolvedValue({}),
    addDependent: vi.fn().mockResolvedValue({}),
    terminateDependent: vi.fn().mockResolvedValue({}),
    deleteDependent: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../api/hr-core', () => ({
  jobTitlesApi: { list: vi.fn().mockResolvedValue({ data: [] }) },
  positionsApi: { list: vi.fn().mockResolvedValue({ data: [] }) },
}));

vi.mock('../utils/exportApi', () => ({
  downloadExport: vi.fn().mockResolvedValue(undefined),
}));

// ProvinceWardSelect / OrgUnitSelect gọi apiClient trực tiếp
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

import PersonnelPage from '../pages/personnel/PersonnelPage';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <MemoryRouter initialEntries={['/people']}>
      <QueryClientProvider client={qc}>
        <ConfigProvider>
          <AntdApp>{children}</AntdApp>
        </ConfigProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('PersonnelPage — smoke', () => {
  it('render không throw và hiển thị danh sách nhân sự', async () => {
    const { getByText, getAllByText } = render(
      <Wrapper>
        <PersonnelPage />
      </Wrapper>,
    );
    // Tiêu đề mặc định khi chưa chọn đơn vị
    await waitFor(() => expect(getByText('Tất cả nhân sự')).toBeTruthy());
    // Nhân sự từ mock hiển thị trong bảng
    await waitFor(() => expect(getAllByText('Nguyễn Văn A').length).toBeGreaterThan(0));
  });
});
