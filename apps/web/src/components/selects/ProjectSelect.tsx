import React from 'react';
import { Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface ProjectOption {
  id: string;
  code: string;
  name: string;
  status: string;
  customer?: string;
}

interface Props {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  filterByCustomerId?: string;
  filterByStatus?: string;
  style?: React.CSSProperties;
}

export const ProjectSelect: React.FC<Props> = ({
  filterByCustomerId: _filterByCustomerId,
  filterByStatus,
  placeholder = 'Chọn dự án...',
  ...props
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['projects-select'],
    queryFn: () =>
      apiClient.get<ProjectOption[]>('/projects').then((r) => r.data),
    staleTime: 60_000,
  });

  // Apply client-side status filter if provided (API does not support filter params on list)
  const filtered = (data ?? []).filter((p) =>
    filterByStatus ? p.status === filterByStatus : true,
  );

  const options = filtered.map((p) => ({
    value: p.id,
    label: `${p.code} — ${p.name}`,
    searchText: `${p.code} ${p.name} ${p.customer ?? ''}`.toLowerCase(),
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
