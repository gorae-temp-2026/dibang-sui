// 디방인연 도메인 타입 — 목업 `디방인연_틴더식_목업_260617.html` 기준 포팅.
// 익명/공개 규칙: 이음 전엔 이름·소속 숨김(기능정의 §5). 카드는 generic hook + 익명 신뢰범위만.

export type Tier = 0 | 1 | 2 // 0 같은 이벤트(무료) · 1 2~3다리(저) · 2 낯선(고)

export interface MoiPhoto {
  /** 실제 사진 URL. 없으면 hue 기반 플레이스홀더 그라데이션으로 렌더. TODO(②): 실제 인연 갤러리 사진 연결. */
  url?: string
  hue: number
}

export interface MoiProv {
  emoji: string
  text: string
  sub?: string
  tier: Tier
}

/** 카드/추천 큐에 뜨는 모이. 이음 전 단계라 name은 매칭(이음 성사) 후에만 노출한다. */
export interface Moi {
  id: number
  /** 이음 성사 후 공개되는 이름. 카드 단계에선 렌더하지 않는다. */
  name: string
  photos: MoiPhoto[]
  online: boolean
  tier: Tier
  /** 관계 거리 1~6다리 (매칭 범위 필터 축). */
  deg: number
  /** 익명 헤드라인 — 구체 식장명 없이 generic (기능정의 §5). */
  hook: string
  /** 공통으로 아는 사람 수 — 이음 전엔 카운트만 노출. */
  mutualCount: number
  prov: MoiProv[]
  /** 신뢰잔액 익명 범위 라벨 e.g. '매우 높음' (정확값 비노출 = 프라이버시). */
  balLabel: string
  /** 신뢰 막대 채움 0~5 (익명 범위 시각화). */
  barsF: number
  /** 이음(연결) 노드 수 — 익명. */
  net: number
}

/** 나에게 온 이음 신청(받은이음) — 상대가 이름·관계·한마디를 먼저 공개한 상태(기능정의 §5).
 *  moiId = POOL 모이 참조(수락 시 그 모이가 matched로). */
export interface IncomingReq {
  moiId: number
  /** 상대가 밝힌 관계(이미 공개). */
  rel: string
  /** 먼저 건넨 한마디. */
  msg: string
}

/** 채팅(DM) 메시지 한 줄 — sys(시스템 안내) / me(내 메시지) / them(상대 메시지) 중 하나. */
export interface DmMsg {
  sys?: string
  me?: string
  them?: string
}
