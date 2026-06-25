import type { InvitationTheme } from '@gorae/invitation-ui';

export const colors = {
  brand: '#D4687A',
  brandDark: '#B85467',
  bgWarm: '#FFFFFF',
  bgCard: '#FFFFFF',
  textPrimary: '#1A1A2E',
  textSecondary: '#6B6B80',
  textMuted: '#9999AD',
  borderWarm: '#EAEAEF',
  surfaceWarm: '#F8F6F9',
  black: '#0F0E0C',
  white: '#FFFFFF',
  success: '#16A34A',
  warning: '#FF8C00',
  error: '#DC2626',
} as const

export interface ThemeColors {
  /** 커버 텍스트 그라디언트 색상 배열 (from → via → to) */
  coverTextGradient: string[];
  /** 테마 대표 배경색 (선택 UI 미리보기용) */
  previewBg: string;
  /** 테마 대표 텍스트색 (선택 UI 미리보기용) */
  previewText: string;
}

export const invitationThemes: Record<InvitationTheme, { labelKey: string; colors: ThemeColors }> = {
  'moi-blue': {
    labelKey: 'theme.moiBlue',
    colors: {
      coverTextGradient: ['#A8C4D9', '#8FB3CC', '#6B9FBF', '#A8C4D9'],
      previewBg: '#A8C4D9',
      previewText: '#D4687A',
    },
  },
  'moi-pink': {
    labelKey: 'theme.moiPink',
    colors: {
      coverTextGradient: ['#FFB8C5', '#FFA29A', '#F8C57A', '#FFE0A8'],
      previewBg: '#E8B4C0',
      previewText: '#6B8FA3',
    },
  },
} as const

export const fonts = {
  serif: { family: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", weight: 400 },
  serifSemiBold: { family: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", weight: 600 },
  serifBold: { family: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", weight: 700 },
} as const
