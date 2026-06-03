import type { Profile360 } from '../../../api/hr-profile';

export type Personal = Profile360['personal'];

export interface Palette {
  textPrimary: string;
  textMuted: string;
  bgCard: string;
  borderColor: string;
  isDark: boolean;
  linkColor: string;
}
