import React from 'react';
import { Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface EmployeeOption {
  id: string;
  code: string;
  fullName: string;
  email?: string;
  orgUnitId?: string;
}

interface Props {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  filterByOrgUnitId?: string;
  style?: React.CSSProperties;
  mode?: undefined;
}

export const EmployeeSelect: React.FC<Props> = ({
  filterByOrgUnitId,
  placeholder = 'Chọn nhân viên...',
  ...props
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['employees-select', filterByOrgUnitId],
    queryFn: () =>
      apiClient
        .get<EmployeeOption[]>('/employees', {
          params: filterByOrgUnitId ? { orgUnitId: filterByOrgUnitId } : undefined,
        })
        .then((r) => r.data),
    staleTime: 60_000,
  });

  const options = (data ?? []).map((e) => ({
    value: e.id,
    label: `${e.code} — ${e.fullName}`,
    searchText: `${e.code} ${e.fullName} ${e.email ?? ''}`.toLowerCase(),
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
