export type EnvelopeBase = {
  guestName: string
  guestAffiliation: string
  message: string
  side?: 'groom' | 'bride'
}

// mecdisplay 컴포넌트 전용 Wedding 타입. 레거시 @gorae/shared/types/wedding 의 camelCase
// 필드를 그대로 유지(시각 동일성 보장). DisplayPage에서 v3 API 응답을 이 형태로 매핑.
export type DisplayWedding = {
  id: string
  groomName: string
  brideName: string
  date: string
  time?: string
  venue: string
  venueAddress?: string
  photoUrl?: string
  groomFatherName?: string
  groomMotherName?: string
  brideFatherName?: string
  brideMotherName?: string
}

export type FloatingEnvelopeData = EnvelopeBase & {
  id: string
  initX: number
  initY: number
  addedAt: number
  isReplay: boolean
  isNotice?: boolean
  speedFactor?: number  // 생성 시 고정 (0.75~1.25), undefined = 1.0
}
