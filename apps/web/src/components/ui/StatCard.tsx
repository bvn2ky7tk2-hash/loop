import type { ReactNode, CSSProperties } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
  icon?: ReactNode;
  style?: CSSProperties;
}

export function StatCard({ label, value, subValue, color, icon, style }: StatCardProps) {
  const cardStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
    padding: '18px 20px',
    background: `linear-gradient(145deg, rgba(255,255,255,0.22) 0%, rgba(0,0,0,0.12) 100%), ${color}`,
    boxShadow: `0 4px 20px ${color}66, 0 1px 4px rgba(0,0,0,0.2)`,
    border: 'none',
    ...style,
  };

  const labelStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.07em',
    textTransform: 'uppercase' as const,
    color: 'rgba(255,255,255,0.78)',
    marginBottom: 10,
    display: 'block',
  };

  const valueStyle: CSSProperties = {
    fontSize: 30,
    fontWeight: 800,
    lineHeight: 1,
    color: '#ffffff',
    display: 'block',
    letterSpacing: -1,
  };

  const subValueStyle: CSSProperties = {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 6,
    display: 'block',
    fontWeight: 500,
  };

  const bgIconStyle: CSSProperties = {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 56,
    color: 'rgba(255,255,255,0.22)',
    pointerEvents: 'none',
    lineHeight: 1,
  };

  return (
    <div style={cardStyle}>
      {icon && <div style={bgIconStyle}>{icon}</div>}
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value}</span>
      {subValue && <span style={subValueStyle}>{subValue}</span>}
    </div>
  );
}
