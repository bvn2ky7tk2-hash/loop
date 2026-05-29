import React from 'react';
import { Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface JobTitleOption {
  id: string;
  code: string;
  name: string;
  band?: string;
  isActive: boolean;
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
  /** Nếu true, chỉ hiển thị chức danh đang active */
  onlyActive?: boolean;
  style?: React.CSSProperties;
}

export const JobTitleSelect: React.FC<Props> = ({
  onlyActive = true,
  placeholder = 'Chọn chức danh...',
  ...props
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['job-titles-select', onlyActive],
    queryFn: () =>
      apiClient
        .get<PaginatedResult<JobTitleOption>>('/job-titles', {
          params: { limit: 500, isActive: onlyActive ? true : undefined },
        })
        .then((r) => r.data.data),
    staleTime: 120_000,
  });

  const options = (data ?? []).map((jt) => ({
    value: jt.id,
    label: jt.name,
    searchText: `${jt.name} ${jt.code} ${jt.band ?? ''}`.toLowerCase(),
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
