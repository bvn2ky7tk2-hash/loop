import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock các API gọi mạng mà các tab con sử dụng — chỉ override hàm list.
vi.mock('../api/user-groups', () => ({
  userGroupsApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('../api/users', () => ({
  usersApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('../api/permissions', () => ({
  permissionsApi: {
    listAll: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('../api/org-units', () => ({
  orgUnitsApi: {
    getTree: vi.fn().mockResolvedValue([]),
  },
}));

import PermissionsPage from '../pages/permissions/PermissionsPage';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <ConfigProvider>{children}</ConfigProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('PermissionsPage — smoke', () => {
  it('render tiêu đề trang và hai tab chính', () => {
    render(
      <Wrapper>
        <PermissionsPage />
      </Wrapper>,
    );
    expect(screen.getByText('Quản lý phân quyền')).toBeInTheDocument();
    expect(screen.getByText('Nhóm người dùng')).toBeInTheDocument();
    expect(screen.getByText('Override cá nhân')).toBeInTheDocument();
  });
});
