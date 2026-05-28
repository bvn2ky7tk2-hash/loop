import type { CSSProperties } from 'react';

interface ProgressRingProps {
  percent: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  style?: CSSProperties;
  'aria-label'?: string;
  primaryColor?: string;
  isDark?: boolean;
}

const SIZE_MAP   = { sm: 48,  md: 80,  lg: 120 };
const STROKE_MAP = { sm: 5,   md: 8,   lg: 10  };

function strokeColor(percent: number, primaryColor?: string): string {
  if (percent >= 67) return primaryColor ?? '#10B981';
  if (percent >= 33) return '#F59E0B';
  return '#EF4444';
}

export function ProgressRing({
  percent,
  size = 'md',
  showLabel = true,
  style,
  'aria-label': ariaLabel,
  primaryColor,
  isDark = false,
}: ProgressRingProps) {
  const diameter     = SIZE_MAP[size];
  const strokeWidth  = STROKE_MAP[size];
  const radius       = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped      = Math.min(100, Math.max(0, percent));
  const offset       = circumference - (clamped / 100) * circumference;
  const color        = strokeColor(clamped, primaryColor);
  const fontSize     = size === 'sm' ? 11 : size === 'md' ? 16 : 24;
  const textFill     = isDark ? '#F1F5F9' : '#0F172A';
  const trackColor   = isDark ? '#334155' : '#E2E8F0';

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel ?? `Tiến độ: ${clamped}%`}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}
    >
      <svg width={diameter} height={diameter} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={diameter / 2} cy={diameter / 2} r={radius}
          fill="none" stroke={trackColor} strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={diameter / 2} cy={diameter / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
        />
        {/* Label */}
        {showLabel && (
          <text
            x="50%" y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontSize, fontWeight: 700, fill: textFill,
              transform: 'rotate(90deg)',
              transformOrigin: '50% 50%',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {clamped}%
          </text>
        )}
      </svg>
    </div>
  );
}
