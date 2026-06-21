// 모이가모인곳(④) 광장 상태 머신 — 샵 경제(요네 차감) + 데코 배치/옷 장착 + 테마 스왑.
// xState 근거(CLAUDE.md): 구매 = 요네 차감→(백엔드 시 결제/attestation)→소유 비동기 분기.
//   데모는 mock 차감, 백엔드 연결 시 buyItem actor 교체(구조 유지). 토글(배치·장착)은 무료(에셋스펙 §2).
// theme = 광장 데코 세트 스왑(결혼식 기본 / 파티·클럽 구조). placed = 샵에서 산 추가 데코.
import { setup, assign, fromPromise, raise, cancel } from 'xstate'
import { ITEM_BY_ID, SHOP, START_YONE_PLAZA, CHARGE_AMOUNT, DEFAULT_HEAD, DEFAULT_BODY, type EquipSlot } from '../components/moi-gather/data'

// 무료 기본(헤어·옷) = 시작부터 보유 → 기본으로 자유 전환.
const DEFAULT_OWNED = SHOP.filter((s) => s.isDefault).map((s) => s.id)

/** 토스트 자동 소멸(ms) — 새 토스트가 오면 타이머 재시작(id로 이전 예약 취소). */
const TOAST_MS = 2600

export interface PlacedItem {
  itemId: string
  /** 광장 정규화 좌표 0~1. */
  x: number
  y: number
}

export interface MoiPlazaContext {
  yone: number
  /** 구매한 아이템 id. */
  owned: string[]
  /** 광장에 추가 배치한 데코(아이템당 1개). */
  placed: PlacedItem[]
  /** 내 모이 장착 옷(슬롯별). */
  equipped: Partial<Record<EquipSlot, string>>
  /** 구매 진행 중 아이템. */
  pendingItemId: string | null
  error: string | null
  /** 전역 토스트(예: 이음 신청 완료) — null이면 미표시. 표시 후 TOAST_MS 뒤 자동 소멸. */
  toast: string | null
}

// 추가 데코 자동 배치 위치 — 시드/랜덤 없이 배치 수로 결정(재현 가능).
function spawnFor(count: number): { x: number; y: number } {
  return { x: 0.3 + (count % 3) * 0.2, y: 0.34 + Math.floor(count / 3) * 0.08 }
}

export const moiPlazaMachine = setup({
  types: {} as {
    context: MoiPlazaContext
    events:
      | { type: 'PURCHASE'; itemId: string }
      | { type: 'PLACE'; itemId: string; x?: number; y?: number }
      | { type: 'MOVE'; itemId: string; x: number; y: number }
      | { type: 'REMOVE'; itemId: string }
      | { type: 'EQUIP'; itemId: string }
      | { type: 'UNEQUIP'; slot: EquipSlot }
      | { type: 'GRANT_OWNED'; ids: string[] }
      | { type: 'CHARGE' }
      | { type: 'DISMISS_ERROR' }
      | { type: 'SHOW_TOAST'; message: string }
      | { type: 'CLEAR_TOAST' }
  },
  guards: {
    canPurchase: ({ context, event }) => {
      if (event.type !== 'PURCHASE') return false
      const item = ITEM_BY_ID[event.itemId]
      return !!item && !context.owned.includes(event.itemId) && context.yone >= item.yone
    },
  },
  actors: {
    // mock 결제/요네 차감 확정. 결정#6(2026-06-21): 실 구매 = SUI 직접 결제(Sui payment SDK·Coin<SUI>),
    // YONE 전환은 후순위. 온체인 연결 시 sui-sdk buildPurchaseItemTx(SUI 결제→mint 게이트)로 교체.
    buyItem: fromPromise(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      return { ok: true }
    }),
  },
}).createMachine({
  id: 'moiPlaza',
  context: {
    yone: START_YONE_PLAZA,
    owned: DEFAULT_OWNED,
    placed: [],
    equipped: { head: DEFAULT_HEAD, body: DEFAULT_BODY },
    pendingItemId: null,
    error: null,
    toast: null,
  },
  on: {
    // 데코 배치/옷 장착 = 무료 토글 (소유한 아이템만). 어느 상태에서나 가능.
    PLACE: {
      actions: assign({
        placed: ({ context, event }) => {
          if (event.type !== 'PLACE') return context.placed
          const item = ITEM_BY_ID[event.itemId]
          if (!item || item.category !== 'interior' || !context.owned.includes(event.itemId)) return context.placed
          if (context.placed.some((p) => p.itemId === event.itemId)) return context.placed
          const at = event.x != null && event.y != null ? { x: event.x, y: event.y } : spawnFor(context.placed.length)
          return [...context.placed, { itemId: event.itemId, ...at }]
        },
      }),
    },
    MOVE: {
      actions: assign({
        placed: ({ context, event }) =>
          event.type === 'MOVE'
            ? context.placed.map((p) => (p.itemId === event.itemId ? { ...p, x: event.x, y: event.y } : p))
            : context.placed,
      }),
    },
    REMOVE: {
      actions: assign({
        placed: ({ context, event }) =>
          event.type === 'REMOVE' ? context.placed.filter((p) => p.itemId !== event.itemId) : context.placed,
      }),
    },
    EQUIP: {
      actions: assign({
        equipped: ({ context, event }) => {
          if (event.type !== 'EQUIP') return context.equipped
          const item = ITEM_BY_ID[event.itemId]
          if (!item || !item.slot || !context.owned.includes(event.itemId)) return context.equipped
          return { ...context.equipped, [item.slot]: event.itemId }
        },
      }),
    },
    UNEQUIP: {
      actions: assign({
        equipped: ({ context, event }) => {
          if (event.type !== 'UNEQUIP') return context.equipped
          const next = { ...context.equipped }
          delete next[event.slot]
          return next
        },
      }),
    },
    // 선물로 받은 아이템을 무료 보유로 부여(꾸미기 장착·배치 가능). gift actor → MoiGatherPage 브리지.
    GRANT_OWNED: {
      actions: assign({
        owned: ({ context, event }) =>
          event.type === 'GRANT_OWNED' ? [...new Set([...context.owned, ...event.ids])] : context.owned,
      }),
    },
    CHARGE: { actions: assign({ yone: ({ context }) => context.yone + CHARGE_AMOUNT }) },
    DISMISS_ERROR: { actions: assign({ error: () => null }) },
    // 토스트 표시 + TOAST_MS 뒤 자동 소멸. 새 토스트가 오면 이전 예약을 cancel하고 다시 걸어
    // 타이머를 재시작한다(원본 useEffect의 clearTimeout 재현).
    SHOW_TOAST: {
      actions: [
        cancel('plazaToastClear'),
        assign({ toast: ({ event }) => (event.type === 'SHOW_TOAST' ? event.message : null) }),
        raise({ type: 'CLEAR_TOAST' }, { delay: TOAST_MS, id: 'plazaToastClear' }),
      ],
    },
    CLEAR_TOAST: { actions: assign({ toast: () => null }) },
  },
  initial: 'idle',
  states: {
    idle: {
      on: {
        PURCHASE: {
          guard: 'canPurchase',
          target: 'purchasing',
          actions: assign({ pendingItemId: ({ event }) => event.itemId, error: () => null }),
        },
      },
    },
    purchasing: {
      invoke: {
        src: 'buyItem',
        onDone: {
          target: 'idle',
          actions: assign(({ context }) => {
            const id = context.pendingItemId
            const item = id ? ITEM_BY_ID[id] : undefined
            if (!id || !item) return { pendingItemId: null }
            const owned = context.owned.includes(id) ? context.owned : [...context.owned, id]
            // 구매 즉시 자동 배치(데코)/장착(옷) — 데모 즉각 피드백.
            let placed = context.placed
            let equipped = context.equipped
            if (item.category === 'interior' && !placed.some((p) => p.itemId === id)) {
              placed = [...placed, { itemId: id, ...spawnFor(placed.length) }]
            } else if (item.slot) {
              equipped = { ...equipped, [item.slot]: id }
            }
            return { yone: context.yone - item.yone, owned, placed, equipped, pendingItemId: null }
          }),
        },
        onError: {
          target: 'idle',
          actions: assign({ error: () => '구매를 완료하지 못했어요. 다시 시도해주세요.', pendingItemId: () => null }),
        },
      },
    },
  },
})
