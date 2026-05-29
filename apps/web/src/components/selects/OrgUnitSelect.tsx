import React from 'react';
import { Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface OrgUnitNode {
  id: string;
  name: string;
  code: string;
  children?: OrgUnitNode[];
}

/** Làm phẳng cây org-unit thành danh sách */
function flattenTree(nodes: OrgUnitNode[], prefix = ''): { id: string; name: string; code: string; displayName: string }[] {
  const result: { id: string; name: string; code: string; displayName: string }[] = [];
  for (const node of nodes) {
    const displayName = prefix ? `${prefix} > ${node.name}` : node.name;
    result.push({ id: node.id, name: node.name, code: node.code, displayName });
    if (node.children?.length) {
      result.push(...flattenTree(node.children, displayName));
    }
  }
  return result;
}

interface Props {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const OrgUnitSelect: React.FC<Props> = ({
  placeholder = 'Chọn phòng ban...',
  ...props
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['org-units-select'],
    queryFn: () =>
      apiClient.get<OrgUnitNode[]>('/org-units').then((r) => r.data),
    staleTime: 120_000,
  });

  const flat = flattenTree(data ?? []);

  const options = flat.map((u) => ({
    value: u.id,
    label: u.name,
    searchText: `${u.name} ${u.code} ${u.displayName}`.toLowerCase(),
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
