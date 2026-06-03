import type { OrgUnitTree } from '../../api/org-units';

// ── Helpers ───────────────────────────────────────────────────────────────────

export function flattenTree(nodes: OrgUnitTree[]): OrgUnitTree[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children ?? [])]);
}

export const LEVEL_HUE = ['#8B5CF6', '#3B82F6', '#16A34A', '#EA580C', '#0891B2', '#DC2626'];

export function getLevelHue(level: number): string {
  return LEVEL_HUE[Math.min(level ?? 0, LEVEL_HUE.length - 1)];
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#8B5CF6', '#3B82F6', '#16A34A', '#EA580C', '#0891B2', '#BE185D', '#B45309'];
  return colors[Math.abs(hash) % colors.length];
}
