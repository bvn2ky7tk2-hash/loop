import {
  ApartmentOutlined, TeamOutlined, BankOutlined, UserOutlined,
} from '@ant-design/icons';
import type { OrgUnitTree } from '../../api/org-units';

export const LEVELS = ['JUNIOR', 'MID', 'SENIOR', 'EXPERT'];

// Semantic hue only — bg is derived as 12% alpha so it adapts to dark mode
export const LEVEL_HUE: Record<string, string> = {
  JUNIOR: '#52C41A',
  MID:    '#6366F1',
  SENIOR: '#FA8C16',
  EXPERT: '#8B5CF6',
};

export const ORG_LEVEL_HUE   = ['#8B5CF6', '#3B82F6', '#16A34A', '#EA580C'];
export const ORG_LEVEL_ICONS = [BankOutlined, ApartmentOutlined, TeamOutlined, UserOutlined];

export const PERSONNEL_COL_DEFS = [
  { key: 'code',      label: 'Mã' },
  { key: 'fullName',  label: 'Họ tên' },
  { key: 'orgUnit',   label: 'Phòng ban' },
  { key: 'jobTitle',  label: 'Chức danh' },
  { key: 'position',  label: 'Vị trí' },
  { key: 'level',     label: 'Cấp độ' },
  { key: 'techStack', label: 'Tech Stack' },
  { key: 'startDate', label: 'Ngày vào làm' },
  { key: 'projects',  label: 'Dự án' },
];

// ── Pure helpers ──────────────────────────────────────────────────────────────

export function filterOrgTree(nodes: OrgUnitTree[], search: string): OrgUnitTree[] {
  if (!search.trim()) return nodes;
  const q = search.toLowerCase();
  function filter(list: OrgUnitTree[]): OrgUnitTree[] {
    return list.reduce<OrgUnitTree[]>((acc, n) => {
      const kids = filter(n.children ?? []);
      const hit  = n.name.toLowerCase().includes(q) || n.code.toLowerCase().includes(q);
      if (hit || kids.length) acc.push({ ...n, children: kids });
      return acc;
    }, []);
  }
  return filter(nodes);
}

export function getAllIds(nodes: OrgUnitTree[]): string[] {
  return nodes.flatMap((n) => [n.id, ...getAllIds(n.children)]);
}

export function getSubtreeIds(nodes: OrgUnitTree[], targetId: string): string[] {
  for (const n of nodes) {
    if (n.id === targetId) return getAllIds([n]);
    const found = getSubtreeIds(n.children, targetId);
    if (found.length) return found;
  }
  return [];
}

export function flattenOrgUnits(nodes: OrgUnitTree[], prefix = ''): { value: string; label: string }[] {
  return nodes.flatMap((n) => [
    { value: n.id, label: prefix + n.name },
    ...flattenOrgUnits(n.children ?? [], prefix + '  '),
  ]);
}

export function countOrgs(nodes: OrgUnitTree[]): number {
  return nodes.reduce((s, n) => s + 1 + countOrgs(n.children), 0);
}
