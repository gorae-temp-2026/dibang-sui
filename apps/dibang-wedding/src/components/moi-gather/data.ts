// 모이가모인곳(④) 광장 데이터 — 손그림 에셋 카탈로그(manifest 기준) + 군중.
// ★개념: 45° 부감 넓은 광장(150~300 모이 = 라운지 시각화). 기본 = 빈 흰 바닥, 데코는 샵 아이템.
// 에셋: public/assets/moi/{heads,bodies,items,accessories} (원본 moi_assets 복사). 합성=head(neck278)+body(neck256).
// 모이 = head(헤어) + body(옷). head 교체=헤어변경 / body 교체=옷변경. accessory=머리·얼굴 소품. casual=리컬러.
import manifest from './manifest.json'
import { POOL } from '../inyeon/data'

const ASSET_BASE = '/assets/moi'
const idFromFile = (file: string) => file.split('/').pop()!.replace(/\.png$/, '')

export type ShopCategory = 'hair' | 'clothes' | 'interior' | 'accessory'
export type EquipSlot = 'head' | 'body' | 'acc'

export interface ShopItem {
  /** 에셋키(파일명) — 안정적. */
  id: string
  name: string
  category: ShopCategory
  yone: number
  /** 정적 PNG url(/assets/moi/...). */
  url: string
  /** 헤어 캐릭터(chu/yh) — 표시용. */
  char?: string
  /** 장착 슬롯 (인테리어는 없음 = 바닥 배치). */
  slot?: EquipSlot
  /** 무료 기본 제공. */
  isDefault?: boolean
}

const heads: ShopItem[] = manifest.heads.map((h) => ({ id: idFromFile(h.file), name: h.ko, category: 'hair', yone: h.yone, url: `${ASSET_BASE}/${h.file}`, char: h.char, slot: 'head', isDefault: h.default }))
const bodies: ShopItem[] = manifest.bodies.map((b) => ({ id: idFromFile(b.file), name: b.ko, category: 'clothes', yone: b.yone, url: `${ASSET_BASE}/${b.file}`, slot: 'body', isDefault: b.default }))
const items: ShopItem[] = manifest.items.map((it) => ({ id: idFromFile(it.file), name: it.ko, category: 'interior', yone: it.yone, url: `${ASSET_BASE}/${it.file}` }))
const accessories: ShopItem[] = manifest.accessories.map((ac) => ({ id: idFromFile(ac.file), name: ac.ko, category: 'accessory', yone: ac.yone, url: `${ASSET_BASE}/${ac.file}`, slot: 'acc' }))

export const SHOP: ShopItem[] = [...heads, ...bodies, ...items, ...accessories]
export const ITEM_BY_ID: Record<string, ShopItem> = Object.fromEntries(SHOP.map((it) => [it.id, it]))
/** 캔버스 텍스처 프리로드용 전체 url. */
export const ALL_ASSET_URLS: string[] = SHOP.map((it) => it.url)

// 합성 기하 (manifest neck_y) — 캔버스가 사용. head를 body보다 (278-256)=22px 위로.
export const HEAD_NECK_Y = 278
export const BODY_NECK_Y = 256
export const DEFAULT_HEAD = 'chu_default'
export const DEFAULT_BODY = 'casual'
/** casual(리컬러)만 틴트 적용 — 나머지 옷은 고정색. */
export const RECOLOR_BODY = 'casual'

export const START_YONE_PLAZA = 300
export const CHARGE_AMOUNT = 100

// ─ 광장 군중 (모이) ─
export interface PlazaMoi {
  id: string
  /** ③ 오프라인 이음 = 실명 공개. */
  name: string
  /** 본인 밝힌 관계·소속(③ 공개). */
  role: string
  /** 광장 바닥 정규화 좌표 0~1. */
  x: number
  y: number
  /** 머리통(헤어) 에셋 id. */
  head: string
  /** 바디(옷) 에셋 id. */
  body: string
  /** casual 리컬러 틴트(pixi hex). */
  color: number
  me?: boolean
  /** 인연 페르소나 연결(POOL id). 있으면 클릭 시 인연 탭과 동일 프로필 + 실사진. */
  personaId?: number
  /** 실사진 url(hero 모이만 — 프로필 시트 헤더용). */
  photoUrl?: string
}

const NAMES = ['서연', '준호', '민지', '태윤', '하은', '도현', '지우', '수아', '예진', '시우', '하준', '지호', '민서', '서윤', '지안', '하린', '은우', '유진', '다은', '준우']
const ROLES = ['신부측 친구', '신랑측 직장 동료', '신부 사촌', '신랑 대학 친구', '신부측 회사 선배', '신랑측 동네 선배', '신부 고향 친구', '신랑 동호회', '양가 친지', '신부측 동창']
const COLORS = [0xe6a3b6, 0x88b0d8, 0xf0c98a, 0x9ad0b0, 0xc8a6e0, 0xe0b48a, 0x9ec8e8, 0xd99bb0, 0x8fcdb6, 0xe8c07a]
// 군중 헤어 다양화 — chu/yh 변형 섞기. 바디는 casual(리컬러).
const HEAD_POOL = ['chu_default', 'yh_pigtail', 'chu_sport', 'yh_bob', 'chu_buzz', 'yh_veil', 'chu_shaggy']

function makeRng(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff)
}

// 광장에 등장하는 인연 페르소나 = 철수가 실제로 만난 사람만(tier 0 = 같은 결혼식 참석).
// ★대표 지침(260621): 만난 적 없는 새 인연(tier 1·2)은 이 결혼식 광장에 나타나지 않는다.
const PLAZA_PERSONAS = POOL.filter((p) => p.tier === 0)
// hero 앞줄 배치(나 주변, 클릭하기 쉬운 전경).
const HERO_SPOTS = [{ x: 0.31, y: 0.8 }, { x: 0.69, y: 0.8 }, { x: 0.5, y: 0.72 }, { x: 0.4, y: 0.66 }, { x: 0.6, y: 0.66 }]

function genCrowd(n: number): PlazaMoi[] {
  const rng = makeRng(42)
  const out: PlazaMoi[] = [{ id: 'me', name: '나 (유상)', role: '나의 모이', x: 0.5, y: 0.9, head: DEFAULT_HEAD, body: DEFAULT_BODY, color: 0x9ec8e8, me: true }]
  // 만난 사람(인연 페르소나) — 실사진 + 인연과 동일 프로필.
  PLAZA_PERSONAS.forEach((p, i) => {
    const spot = HERO_SPOTS[i % HERO_SPOTS.length]
    out.push({
      id: `persona-${p.id}`,
      personaId: p.id,
      name: p.name,
      role: p.prov[0]?.sub ?? '같은 결혼식 하객',
      photoUrl: p.photos[0]?.url,
      x: spot.x,
      y: spot.y,
      head: HEAD_POOL[i % HEAD_POOL.length],
      body: RECOLOR_BODY,
      color: COLORS[i % COLORS.length],
    })
  })
  // 익명 하객(라운지 군중 시각화).
  for (let i = 0; i < n; i++) {
    const left = rng() < 0.5
    const x = left ? 0.06 + rng() * 0.34 : 0.6 + rng() * 0.34
    const y = 0.26 + rng() * 0.56
    out.push({ id: `c${i}`, name: NAMES[i % NAMES.length], role: ROLES[i % ROLES.length], x, y, head: HEAD_POOL[i % HEAD_POOL.length], body: RECOLOR_BODY, color: COLORS[i % COLORS.length] })
  }
  return out
}

/** 데모 군중 60(구조는 150~300 확장형 — genCrowd 인자만 변경). */
export const PLAZA_CROWD = genCrowd(60)
export const CROWD_BY_ID: Record<string, PlazaMoi> = Object.fromEntries(PLAZA_CROWD.map((m) => [m.id, m]))
