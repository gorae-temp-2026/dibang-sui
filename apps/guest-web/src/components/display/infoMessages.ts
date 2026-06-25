// 레거시 NOTICE_MESSAGES / DEFAULT_SEED_MESSAGES 그대로(SCENARIOS §1-1·§4).
// 시각 동일성 보존 — 순서 변경 금지.
// 영문화(트랙 E): INFO_MESSAGES.message 는 이제 i18n *키*다. DisplayPage 가 렌더 시점에 t()로
// 번역해 봉투에 싣는다(언어 변경 즉시 반영). DEFAULT_SEED_MESSAGES 는 데모 시드라 원문 유지.
import type { EnvelopeBase } from './types'

export const INFO_MESSAGES: EnvelopeBase[] = [
  { guestName: '', guestAffiliation: '', message: 'display.notice.heartsFlowing' },
  { guestName: '', guestAffiliation: '', message: 'display.notice.deliveredAfterCeremony' },
  { guestName: '', guestAffiliation: '', message: 'display.notice.loginToShare' },
]

export const DEFAULT_SEED_MESSAGES: EnvelopeBase[] = [
  { guestName: '', guestAffiliation: '', message: '❤️' },
  { guestName: '', guestAffiliation: '', message: '❤️' },
  { guestName: '', guestAffiliation: '', message: '❤️' },
  { guestName: '', guestAffiliation: '', message: '❤️' },
  { guestName: '', guestAffiliation: '', message: '❤️' },
  { guestName: '', guestAffiliation: '', message: '❤️' },
  { guestName: '', guestAffiliation: '', message: '❤️' },
  { guestName: '', guestAffiliation: '', message: '❤️' },
  { guestName: '정유상', guestAffiliation: '디지털방명록', message: '두 분의 결혼을 진심으로 축하합니다 💕' },
  { guestName: '박태원', guestAffiliation: '디지털방명록', message: '두 분의 결혼 축하드립니다!' },
]
