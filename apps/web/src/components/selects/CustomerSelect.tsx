import React from 'react';
import { Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface CustomerOption {
  id: string;
  code: string;
  name: string;
  industry?: string;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
}

interface Props {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const CustomerSelect: React.FC<Props> = ({
  placeholder = 'Chọn khách hàng...',
  ...props
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () =>
      apiClient
        .get<PaginatedResult<CustomerOption>>('/crm/customers', { params: { limit: 500 } })
        .then((r) => r.data.data),
    staleTime: 60_000,
  });

  const options = (data ?? []).map((c) => ({
    value: c.id,
    label: c.industry ? `${c.name} (${c.industry})` : c.name,
    searchText: `${c.name} ${c.code} ${c.industry ?? ''}`.toLowerCase(),
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
