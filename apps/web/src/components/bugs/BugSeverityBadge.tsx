import { Tag } from 'antd';
import type { BugSeverity } from '../../api/bugs.api';

export const SEVERITY_CONFIG: Record<BugSeverity, { color: string; tagColor: string; label: string; icon: string }> = {
  CRITICAL: { color: '#FF4D4F', tagColor: 'error',   label: 'Nghiêm trọng', icon: '🔴' },
  HIGH:     { color: '#FA8C16', tagColor: 'volcano',  label: 'Cao',          icon: '🟠' },
  MEDIUM:   { color: '#FADB14', tagColor: 'gold',     label: 'Trung bình',   icon: '🟡' },
  LOW:      { color: '#52C41A', tagColor: 'success',  label: 'Thấp',         icon: '🟢' },
};

export const BugSeverityBadge: React.FC<{ severity: BugSeverity }> = ({ severity }) => {
  const cfg = SEVERITY_CONFIG[severity];
  return <Tag color={cfg.tagColor}>{cfg.icon} {cfg.label}</Tag>;
};
