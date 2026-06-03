import { Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { type PermissionDef } from '../../api/permissions';
import { usersApi } from '../../api/users';
import { type OrgUnitTree } from '../../api/org-units';
import {
  PERM_DOMAIN_COLOR, PERM_DOMAIN_LABEL, PERM_DOMAIN_MODULE,
  MODULE_LABELS, ACTION_LABELS,
} from '../../config/screens.registry';

const { Text } = Typography;

// Hình dạng user thực tế trả về từ /users (id, name, email) — bù cho type
// UserRecord upstream đang thiếu các field cơ bản.
export interface AppUser { id: string; name: string; email: string }
export const fetchUsers = (): Promise<AppUser[]> =>
  usersApi.list() as unknown as Promise<AppUser[]>;

// ─── Derive screens + module groups từ permission list ───────────────────────

export interface PermScreen {
  key: string;
  label: string;
  color: string;
  appModule: string;
  funcs: { perm: string; label: string }[];
}

export interface ModuleGroup {
  key: string;
  label: string;
  domains: string[];
}

export function buildScreens(perms: PermissionDef[]): { screens: PermScreen[]; moduleGroups: ModuleGroup[] } {
  // Group permissions by domain (module field)
  const domainMap = new Map<string, PermissionDef[]>();
  for (const p of perms) {
    if (!domainMap.has(p.module)) domainMap.set(p.module, []);
    domainMap.get(p.module)!.push(p);
  }

  const screens: PermScreen[] = [];
  for (const [domain, list] of domainMap) {
    screens.push({
      key: domain,
      label: PERM_DOMAIN_LABEL[domain] ?? domain,
      color: PERM_DOMAIN_COLOR[domain] ?? '#94A3B8',
      appModule: PERM_DOMAIN_MODULE[domain] ?? 'general',
      funcs: list.map(p => ({
        perm: p.code,
        label: ACTION_LABELS[p.action] ?? p.action,
      })),
    });
  }

  // Build module groups from unique appModule values
  const moduleSet = new Map<string, string[]>();
  for (const s of screens) {
    if (!moduleSet.has(s.appModule)) moduleSet.set(s.appModule, []);
    moduleSet.get(s.appModule)!.push(s.key);
  }

  const moduleGroups: ModuleGroup[] = [
    { key: 'all', label: 'Tất cả', domains: screens.map(s => s.key) },
    ...Array.from(moduleSet.entries()).map(([mod, domains]) => ({
      key: mod,
      label: MODULE_LABELS[mod] ?? mod,
      domains,
    })),
  ];

  return { screens, moduleGroups };
}

// ─── Flatten OrgUnitTree → map id → {name, code} ─────────────────────────────

export function flattenOrgTree(nodes: OrgUnitTree[]): Record<string, { name: string; code: string }> {
  const map: Record<string, { name: string; code: string }> = {};
  function walk(ns: OrgUnitTree[]) {
    for (const n of ns) {
      map[n.id] = { name: n.name, code: n.code };
      if (n.children?.length) walk(n.children);
    }
  }
  walk(nodes);
  return map;
}

export function collectAllIds(nodes: OrgUnitTree[]): string[] {
  const ids: string[] = [];
  function walk(ns: OrgUnitTree[]) {
    for (const n of ns) {
      ids.push(n.id);
      if (n.children?.length) walk(n.children);
    }
  }
  walk(nodes);
  return ids;
}

// ─── Chuyển OrgUnitTree → Tree DataNode ──────────────────────────────────────

export function toTreeNodes(nodes: OrgUnitTree[]): DataNode[] {
  return nodes.map(n => ({
    key: n.id,
    title: (
      <span>
        {n.name}
        <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
          [{n.code}]
        </Text>
      </span>
    ),
    children: n.children?.length ? toTreeNodes(n.children) : undefined,
  }));
}
