import React from 'react';
import { Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface UserOption {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

interface Props {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  /** Nếu true, chỉ hiển thị user đang active */
  onlyActive?: boolean;
  style?: React.CSSProperties;
}

export const UserSelect: React.FC<Props> = ({
  onlyActive = false,
  placeholder = 'Chọn người dùng...',
  ...props
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['users-select'],
    queryFn: () =>
      apiClient.get<UserOption[]>('/users').then((r) => r.data),
    staleTime: 60_000,
  });

  const filtered = onlyActive ? (data ?? []).filter((u) => u.isActive) : (data ?? []);

  const options = filtered.map((u) => ({
    value: u.id,
    label: `${u.name} (${u.email})`,
    searchText: `${u.name} ${u.email}`.toLowerCase(),
  }));

  return (
    <Select
      showSearch
      loading={isLoading}
      placeholder={placeholder}
      filterOption={(input, option) =>
        ((option as { searchText?: string })?.searchText ?? '').includes(input.toLowerCase())
      }
      options={options}
      {...props}
    />
  );
};
