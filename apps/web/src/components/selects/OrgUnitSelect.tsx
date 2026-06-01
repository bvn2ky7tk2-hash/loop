import React from 'react';
import { TreeSelect, theme } from 'antd';
import {
  BankOutlined, ApartmentOutlined, TeamOutlined, UserOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

const ORG_LEVEL_HUE   = ['#7C3AED', '#2563EB', '#16A34A', '#EA580C', '#0891B2', '#DC2626'];
const ORG_LEVEL_ICONS = [BankOutlined, ApartmentOutlined, TeamOutlined, UserOutlined];

interface OrgUnitNode {
  id: string;
  name: string;
  code: string;
  level?: number;
  _count?: { users?: number; employees?: number };
  children?: OrgUnitNode[];
}

// Component cần token → dùng hook bên trong wrapper
function OrgUnitSelectInner({
  placeholder,
  onChange,
  ...props
}: {
  placeholder?: string;
  onChange?: (value: string | undefined) => void;
  allowClear?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  value?: string;
}) {
  const { token } = theme.useToken();

  const { data, isLoading } = useQuery({
    queryKey: ['org-units-select'],
    queryFn: () =>
      apiClient.get<OrgUnitNode[]>('/org-units').then((r) => r.data),
    staleTime: 120_000,
  });

  function buildTreeData(nodes: OrgUnitNode[], depth = 0): object[] {
    return nodes.map((n) => {
      const lvlIdx  = Math.min(n.level ?? depth, ORG_LEVEL_HUE.length - 1);
      const hue     = ORG_LEVEL_HUE[lvlIdx];
      const LvlIcon = ORG_LEVEL_ICONS[Math.min(lvlIdx, ORG_LEVEL_ICONS.length - 1)];
      const count   = n._count?.employees ?? n._count?.users;

      return {
        title: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
            {/* Icon box — exact match PersonnelPage */}
            <span style={{
              width: 18, height: 18, borderRadius: 4, flexShrink: 0,
              background: `${hue}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LvlIcon style={{ color: hue, fontSize: 10 }} />
            </span>
            {/* Name */}
            <span style={{
              flex: 1, fontSize: 12.5, fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {n.name}
            </span>
            {/* Code badge */}
            <span style={{
              fontSize: 9, fontWeight: 700, borderRadius: 3,
              padding: '1px 5px', flexShrink: 0,
              background: `${hue}22`, color: hue, letterSpacing: '0.4px',
            }}>
              {n.code}
            </span>
            {/* Count pill */}
            {count ? (
              <span style={{
                fontSize: 10, fontWeight: 600, borderRadius: 9999,
                padding: '0 5px', flexShrink: 0, minWidth: 18, textAlign: 'center',
                background: token.colorFillSecondary,
                color: token.colorTextSecondary,
              }}>
                {count}
              </span>
            ) : null}
          </div>
        ),
        value: n.id,
        key: n.id,
        searchLabel: `${n.name} ${n.code}`.toLowerCase(),
        children: n.children?.length ? buildTreeData(n.children, depth + 1) : undefined,
      };
    });
  }

  const treeData = buildTreeData(data ?? []);

  return (
    <TreeSelect
      showSearch
      loading={isLoading}
      placeholder={placeholder}
      treeData={treeData}
      treeExpandAction="click"
      popupMatchSelectWidth={false}
      dropdownStyle={{ minWidth: 300, maxHeight: 420, overflow: 'auto' }}
      filterTreeNode={(input, node: any) =>
        (node.searchLabel ?? '').includes(input.toLowerCase())
      }
      onChange={(val) => onChange?.(val as string | undefined)}
      {...props}
    />
  );
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
  placeholder = 'Cơ cấu tổ chức...',
  ...props
}) => (
  <OrgUnitSelectInner placeholder={placeholder} {...props} />
);
