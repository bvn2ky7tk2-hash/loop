import { Card } from 'antd';
import {
  BarChart, Bar, LineChart, Line, XAxis, Tooltip as RTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import type { CSSProperties, ReactNode } from 'react';
import { useThemePalette } from '../../hooks/useThemePalette';

interface SparklinePoint {
  day: string;
  value: number;
}

interface SparklineCardProps {
  label: string;
  value: number | string;
  unit?: string;
  subValue?: string;
  delta?: number;
  data?: SparklinePoint[];
  variant?: 'bar' | 'line';
  color?: string;
  icon?: ReactNode;
  loading?: boolean;
  filled?: boolean; // nền đặc theo màu, chữ trắng
  style?: CSSProperties;
  onClick?: () => void;
}

function DeltaBadge({ delta, filled }: { delta: number; filled?: boolean }) {
  const positive = delta >= 0;
  const color  = filled
    ? (delta >= 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)')
    : (delta === 0 ? '#6B7280' : positive ? '#10B981' : '#EF4444');
  const bg = filled
    ? (delta > 0 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)')
    : (delta > 0 ? '#ECFDF5' : delta < 0 ? '#FEF2F2' : '#F3F4F6');
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color, background: bg,
      borderRadius: 9999, padding: '2px 7px', lineHeight: '16px',
    }}>
      {delta > 0 ? '+' : ''}{delta}%
    </span>
  );
}

export function SparklineCard({
  label,
  value,
  unit,
  subValue,
  delta,
  data = [],
  variant = 'bar',
  color,
  icon,
  loading = false,
  filled = false,
  style,
  onClick,
}: SparklineCardProps) {
  const { isDark, textPrimary, textMuted, bgContainer: bgContainerPalette } = useThemePalette();

  const resolvedColor = color ?? 'var(--color-primary, #4F46E5)';
  const isCssVar = resolvedColor.startsWith('var(');

  if (loading) {
    return (
      <Card style={{ borderRadius: 12, overflow: 'hidden', ...style }}>
        <div style={{ height: 110, background: bgContainerPalette, borderRadius: 8 }} />
      </Card>
    );
  }

  // ── Filled variant ──────────────────────────────────────────
  if (filled && !isCssVar) {
    const cardBg = `linear-gradient(145deg, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0.08) 100%), ${resolvedColor}`;

    const barFillFilled = (v: number) => {
      if (data.length === 0) return 'rgba(255,255,255,0.8)';
      const max = Math.max(...data.map((d) => d.value), 1);
      return v / max >= 0.65 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.38)';
    };

    const tooltipStyle = {
      background: '#0F172A', border: 'none',
      borderRadius: 6, fontSize: 12, color: '#F1F5F9', padding: '4px 10px',
    };

    return (
      <Card
        onClick={onClick}
        style={{
          borderRadius: 12,
          overflow: 'hidden',
          background: cardBg,
          border: 'none',
          boxShadow: `0 4px 20px ${resolvedColor}55`,
          cursor: onClick ? 'pointer' : undefined,
          ...style,
        }}
        styles={{ body: { padding: '16px 18px 12px' } }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: 'rgba(255,255,255,0.78)',
            letterSpacing: '0.07em', textTransform: 'uppercase',
          }}>
            {label}
          </span>
          {icon && (
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'rgba(255,255,255,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: '#fff', flexShrink: 0,
            }}>
              {icon}
            </div>
          )}
        </div>

        {/* Value row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: subValue ? 4 : 10 }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: -1 }}>
            {value}
          </span>
          {unit && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{unit}</span>}
          {delta !== undefined && <DeltaBadge delta={delta} filled />}
        </div>
        {subValue && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 8 }}>{subValue}</div>
        )}

        {/* Sparkline */}
        {data.length > 0 && (
          <div style={{ height: 44, marginLeft: -4, marginRight: -4 }}>
            <ResponsiveContainer width="100%" height="100%">
              {variant === 'bar' ? (
                <BarChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 0 }} barCategoryGap="22%">
                  <XAxis dataKey="day" hide />
                  <RTooltip cursor={false} contentStyle={tooltipStyle} labelStyle={{ color: '#94A3B8', fontSize: 11 }} formatter={(v: any) => [v, label]} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {data.map((entry, i) => (
                      <Cell key={i} fill={barFillFilled(entry.value)} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                  <XAxis dataKey="day" hide />
                  <RTooltip cursor={false} contentStyle={tooltipStyle} formatter={(v: any) => [v, label]} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="rgba(255,255,255,0.85)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: '#fff', stroke: resolvedColor, strokeWidth: 2 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    );
  }

  // ── Default (outlined) variant ──────────────────────────────
  const barFill = (v: number) => {
    if (data.length === 0) return resolvedColor;
    if (isCssVar) return resolvedColor;
    const max = Math.max(...data.map((d) => d.value), 1);
    return v / max >= 0.65 ? resolvedColor : `${resolvedColor}70`;
  };

  const tooltipStyle = {
    background: '#0F172A',
    border: 'none', borderRadius: 6, fontSize: 12,
    color: '#F1F5F9', padding: '4px 10px',
  };

  return (
    <Card
      onClick={onClick}
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        borderTop: isCssVar
          ? '3px solid var(--color-primary)'
          : `3px solid ${resolvedColor}`,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      styles={{ body: { padding: '16px 18px 12px' } }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: textMuted,
          letterSpacing: '0.07em', textTransform: 'uppercase',
        }}>
          {label}
        </span>
        {icon && (
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: isCssVar ? 'var(--color-primary-12, #4F46E51f)' : `${resolvedColor}1f`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
            color: isCssVar ? 'var(--color-primary)' : resolvedColor,
            flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: subValue ? 4 : 10 }}>
        <span style={{
          fontSize: 30, fontWeight: 800,
          color: textPrimary,
          lineHeight: 1, letterSpacing: -1,
        }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 13, color: textMuted, fontWeight: 500 }}>{unit}</span>}
        {delta !== undefined && <DeltaBadge delta={delta} />}
      </div>
      {subValue && (
        <div style={{ fontSize: 12, color: textMuted, marginBottom: 8 }}>{subValue}</div>
      )}

      {data.length > 0 && (
        <div style={{ height: 44, marginLeft: -4, marginRight: -4 }}>
          <ResponsiveContainer width="100%" height="100%">
            {variant === 'bar' ? (
              <BarChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 0 }} barCategoryGap="22%">
                <XAxis dataKey="day" hide />
                <RTooltip cursor={false} contentStyle={tooltipStyle} labelStyle={{ color: '#94A3B8', fontSize: 11 }} formatter={(v: any) => [v, label]} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {data.map((entry, i) => (
                    <Cell key={i} fill={barFill(entry.value)} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                <XAxis dataKey="day" hide />
                <RTooltip cursor={false} contentStyle={tooltipStyle} formatter={(v: any) => [v, label]} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={resolvedColor}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: resolvedColor, stroke: bgContainerPalette, strokeWidth: 2 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
