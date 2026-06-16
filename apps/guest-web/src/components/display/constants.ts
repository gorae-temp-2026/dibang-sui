import { env } from '../../env'

export function getBaseUrl(): string {
  return env.VITE_BASE_URL ?? 'http://localhost:5173'
}

export const REPLAY_INTERVAL_MIN = 300
export const REPLAY_INTERVAL_MAX = 700
export const QUIET_WAIT_MS = 2000
export const REPLAY_MAX_CONCURRENT = 7
export const MIN_VISIBLE_TARGET = 7
export const MIN_VISIBLE_HEARTS = 2

export const ENVELOPE_RADIUS = 190
export const QR_RADIUS = 130

export const serif = { fontFamily: 'var(--font-noto-serif-kr)' }

export const FLOAT_START_Y_OFFSET = 800
export const FLOAT_END_Y_OFFSET = 1600
export const INIT_POS_MARGIN = 60
export const SLIDESHOW_INTERVAL_MS = 6000
export const NOTICE_DELAY_MS = 10000
export const NOTICE_INITIAL_DELAY_MS = 5000
export const RECONNECT_DELAY_MS = 5000
