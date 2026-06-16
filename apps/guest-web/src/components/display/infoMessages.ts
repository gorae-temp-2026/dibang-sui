// 레거시 NOTICE_MESSAGES / DEFAULT_SEED_MESSAGES 그대로(SCENARIOS §1-1·§4).
// 시각 동일성 보존 — 문구·순서 변경 금지.
import type { EnvelopeBase } from './types'

export const INFO_MESSAGES: EnvelopeBase[] = [
  { guestName: '', guestAffiliation: '', message: '하객분들의 마음이 전해지고 있어요' },
  { guestName: '', guestAffiliation: '', message: '예식이 끝나면 신랑·신부에게 메세지가 전달돼요' },
  { guestName: '', guestAffiliation: '', message: '로그인해서 사진을 공유해주세요' },
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
