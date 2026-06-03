import type { ContractType, ContractStatus } from '../../../api/contracts';
import {
  CONTRACT_TYPE_LABELS, CONTRACT_TYPE_HUE,
  CONTRACT_STATUS_LABELS, CONTRACT_STATUS_HUE,
} from '../constants';

// ── Sub-components ────────────────────────────────────────────────────────────

export function TypeBadge({ type, isDark }: { type: ContractType; isDark: boolean }) {
  const hue = CONTRACT_TYPE_HUE[type] ?? '#94A3B8';
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, borderRadius: 5, padding: '2px 8px',
      color: hue,
      background: isDark ? `${hue}25` : `${hue}15`,
      border: `1px solid ${hue}40`,
      whiteSpace: 'nowrap',
    }}>
      {CONTRACT_TYPE_LABELS[type] ?? type}
    </span>
  );
}

export function StatusBadge({ status, isDark }: { status: ContractStatus; isDark: boolean }) {
  const hue = CONTRACT_STATUS_HUE[status] ?? '#94A3B8';
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, borderRadius: 5, padding: '2px 8px',
      color: hue,
      background: isDark ? `${hue}25` : `${hue}15`,
      border: `1px solid ${hue}40`,
      whiteSpace: 'nowrap',
    }}>
      {CONTRACT_STATUS_LABELS[status] ?? status}
    </span>
  );
}
