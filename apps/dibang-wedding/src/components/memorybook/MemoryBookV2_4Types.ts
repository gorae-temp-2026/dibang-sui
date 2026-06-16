// ── 웨딩메모리북 공통 타입 (v2 포팅) ──────────────────────────────────────
// 원본: web-mobile-application/apps/web-app/src/pages/host/memorybook/shared/types.ts

export interface CoupleInfo {
  groomName: string
  brideName: string
  weddingDate: string
  time?: string
  venue: string
  coverPhoto: string
}

export interface MecMessage {
  id: string
  guestName: string
  guestAffiliation: string
  message: string
  timestamp: string
  isHeartOnly?: boolean
}

export interface MemoryBookPhoto {
  id: string
  url: string
  uploadedBy: string
}

export interface MemoryBookData {
  couple: CoupleInfo
  mecMessages: MecMessage[]
  guestPhotos: MemoryBookPhoto[]
  curatedPhotos: MemoryBookPhoto[]
  displayPhotos: MemoryBookPhoto[]
  stats: {
    totalGuests: number
    totalMessages: number
    photosUploaded: number
  }
}

/** 모든 버전 컴포넌트가 받는 props */
export interface MemoryBookProps {
  data: MemoryBookData
}
