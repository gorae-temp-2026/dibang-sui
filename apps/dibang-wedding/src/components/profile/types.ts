// 공유 프로필 데이터 타입 — `sim-scale.mjs`가 출력한 chulsoo-profile.json 스키마.
// 인연(①②)·모이가모인곳/라운지(③) 공용 프로필이 소비. Moi Credit 정확값은 온체인(프로필 밖).

export interface ProfileNode {
  id: string
  label: string
  /** 사진 플레이스홀더 색상(hue 0~360). 실제는 모이 대표 사진. */
  hue: number
  self?: boolean
}

export interface ProfileLink {
  source: string
  target: string
  /** 관계 종류: 부조 · 선물 · 승급(오프라인 이음) · 이음(온라인). */
  type: string
  value: number
}

/** sunburst 계층 노드 (2층 fold). 안쪽=대분류(EM·CS·AR·MP), 바깥=소분류. */
export interface SignalNode {
  name: string
  value?: number
  /** 산출 스텁(AR 표시만 / MP 스텁). */
  stub?: boolean
  children?: SignalNode[]
}

export interface ProfileData {
  subject: string
  asOf: string
  /** 절대값 = 온체인 신용 오브젝트. 프로필엔 티어/범위만, 정확 score는 온체인 read 맥락에서만. */
  moiCredit: { value: number; score: number; tier: string; rank: number; total: number; onchain: boolean }
  trace: {
    L1_raw: { 부조: number; 이음: number; 대화: number; 선물: number; total: number }
    L2_fold: { 부조EM: number; 증여EM: number; topTies: { p: string; t: number }[] }
    L3_phi: { 부조: number; CS: number; 이행: number; op: string }
    L4_integrate: { W: { 부조: number; cs: number; 이행: number }; formula: string; value: number }
  }
  graph: { nodes: ProfileNode[]; links: ProfileLink[] }
  signal: SignalNode
  /** 익명 신뢰범위 — 이음 전(①②) 거친 티어/막대만, 정확값 비노출. */
  trustRange: { tier: string; label: string; anon: boolean }
}

/** 프로필 공개 범위 컨텍스트 (정보공개 테이블 ①②③, 핸드오프 §12-3·§13-3). */
export type ProfileContext = 'inyeon' | 'lounge'
