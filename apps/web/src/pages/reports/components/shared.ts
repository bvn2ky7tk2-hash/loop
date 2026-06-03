import type React from 'react';

export interface ChartProps {
  axisColor: string;
  gridColor: string;
  tooltipBg: string;
  primary: string;
  chartCardStyle: React.CSSProperties;
}

export const LEVEL_BADGE: Record<string, { bg: string; color: string }> = {
  JUNIOR:  { bg: '#ECFDF5', color: '#065F46' },
  MID:     { bg: '#EEF2FF', color: '#4338CA' },
  SENIOR:  { bg: '#FFFBEB', color: '#92400E' },
  EXPERT:  { bg: '#FEF2F2', color: '#991B1B' },
};

export const DEAL_STAGE_COLORS: Record<string, string> = {
  QUALIFICATION: '#6366F1', PROPOSAL: '#3B82F6', NEGOTIATION: '#F59E0B', WON: '#10B981', LOST: '#EF4444',
};

export const CANDIDATE_STAGE_COLORS: Record<string, string> = {
  APPLIED: '#94A3B8', SCREENING: '#6366F1', INTERVIEW: '#3B82F6', OFFER: '#F59E0B', HIRED: '#10B981', REJECTED: '#EF4444',
};

export const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#EF4444',
  HIGH:     '#F97316',
  MEDIUM:   '#EAB308',
  LOW:      '#22C55E',
};

export const SEVERITY_LABEL: Record<string, string> = {
  CRITICAL: 'Critical',
  HIGH:     'High',
  MEDIUM:   'Medium',
  LOW:      'Low',
};

export const BUG_STATUS_LABEL: Record<string, string> = {
  OPEN:        'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED:    'Resolved',
  CLOSED:      'Closed',
};

export const BUG_STATUS_COLOR: Record<string, string> = {
  OPEN:        '#EF4444',
  IN_PROGRESS: '#F97316',
  RESOLVED:    '#10B981',
  CLOSED:      '#94A3B8',
};

export const LEAVE_STATUS_COLOR: Record<string, string> = {
  PENDING:  '#F59E0B',
  APPROVED: '#10B981',
  REJECTED: '#EF4444',
};

export const EXPENSE_STATUS_COLOR: Record<string, string> = {
  PENDING:  '#F59E0B',
  APPROVED: '#10B981',
  REJECTED: '#EF4444',
  PAID:     '#6366F1',
};
