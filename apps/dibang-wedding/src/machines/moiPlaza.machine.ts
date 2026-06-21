// 모이가모인곳(④) 광장 상태 머신 — 샵 경제(요네 차감) + 인벤토리(내 아이템) + 데코 배치/옷 장착.
// xState 근거(CLAUDE.md): 구매 = 요네 차감 → (백엔드 시 결제/attestation) → 소유 비동기 분기.
// ★구매 = '내 아이템'(owned)으로만 이동(즉시 착용/배치 안 함) — 착용/배치는 내 아이템에서 확정.
//   인테리어·소품 = 다중 구매·다중 배치(placed 인스턴스 uid, 보유 수 한도). 헤어·옷·액세서리 = 1개(전환·착용).
import { setup, assign, fromPromise, raise, cancel } from 'xstate'
import { ITEM_BY_ID, SHOP, START_YONE_PLAZA, CHARGE_AMOUNT, DEFAULT_HEAD, DEFAULT_BODY, type EquipSlot, type ShopItem } from '../components/moi-gather/data'

// 무료 기본(헤어·옷) = 시작부터 보유 → 기본으로 자유 전환.
const DEFAULT_OWNED = SHOP.filter((s) => s.isDefault).map((s) => s.id)

/** 토스트 자동 소멸(ms) — 새 토스트가 오면 타이머 재시작(id로 이전 예약 취소). */
const TOAST_MS = 2600

export interface PlacedItem {
  /** 배치 인스턴스 고유 id — 같은 아이템 다중 배치(버진로드 여러 개 등). */
  uid: string
  itemId: string
  /** 광장 정규화 좌표 0~1. */
  x: number
  y: number
}

export interface MoiPlazaContext {
  yone: number
  /** 구매한 아이템 id — 인테리어는 중복 허용(= 수량). */
  owned: string[]
  /** 광장에 배치한 데코 인스턴스(다중). */
  placed: PlacedItem[]
  /** 내 모이 장착 옷(슬롯별). */
  equipped: Partial<Record<EquipSlot, string>>
  /** 구매 진행 중 아이템. */
  pendingItemId: string | null
  /** 배치 인스턴스 uid 카운터(재현 가능, 랜덤 미사용). */
  placeSeq: number
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
      | { type: 'MOVE'; uid: string; x: number; y: number }
      | { type: 'REMOVE'; uid: string }
      | { type: 'EQUIP'; itemId: string }
      | { type: 'UNEQUIP'; slot: EquipSlot }
      | { type: 'GRANT_OWNED'; ids: string[] }
      | { type: 'HYDRATE_EQUIPPED'; equipped: Partial<Record<EquipSlot, string>> }
      | { type: 'CHARGE' }
      | { type: 'DISMISS_ERROR' }
      | { type: 'SHOW_TOAST'; message: string }
      | { type: 'CLEAR_TOAST' }
  },
  guards: {
    canPurchase: ({ context, event }) => {
      if (event.type !== 'PURCHASE') return false
      const item = ITEM_BY_ID[event.itemId]
      if (!item || context.yone < item.yone) return false
      // 인테리어·소품 = 다중 구매 허용. 헤어·옷·액세서리 = 보유 시 구매 불가(전환·착용).
      if (item.category === 'interior') return true
      return !context.owned.includes(event.itemId)
    },
  },
  actors: {
    // 온체인 결제 게이트(결정#6) — 컴포넌트가 .provide()로 buildPurchaseItemTx 호출 actor를 주입(STATE_MANAGEMENT §4).
    // 기본은 mock(미주입/데모). input.item으로 무엇을 사는지 전달 — 성공 시 머신이 owned로 이동.
    buyItem: fromPromise<{ ok: boolean }, { item: ShopItem | null }>(async () => {
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
    placeSeq: 0,
    error: null,
    toast: null,
  },
  on: {
    // 배치(인테리어) = 내 아이템에서 확정 → 광장에 인스턴스 추가(다중, 보유 수 한도). 소유한 것만.
    PLACE: {
      actions: assign(({ context, event }) => {
        if (event.type !== 'PLACE') return {}
        const item = ITEM_BY_ID[event.itemId]
        if (!item || item.category !== 'interior' || !context.owned.includes(event.itemId)) return {}
        const ownedCount = context.owned.filter((i) => i === event.itemId).length
        const placedCount = context.placed.filter((p) => p.itemId === event.itemId).length
        if (placedCount >= ownedCount) return {} // 보유 수만큼만 배치.
        const at = event.x != null && event.y != null ? { x: event.x, y: event.y } : spawnFor(context.placed.length)
        return {
          placed: [...context.placed, { uid: `pl${context.placeSeq}`, itemId: event.itemId, ...at }],
          placeSeq: context.placeSeq + 1,
        }
      }),
    },
    MOVE: {
      actions: assign({
        placed: ({ context, event }) =>
          event.type === 'MOVE' ? context.placed.map((p) => (p.uid === event.uid ? { ...p, x: event.x, y: event.y } : p)) : context.placed,
      }),
    },
    REMOVE: {
      actions: assign({
        placed: ({ context, event }) => (event.type === 'REMOVE' ? context.placed.filter((p) => p.uid !== event.uid) : context.placed),
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
        owned: ({ context, event }) => (event.type === 'GRANT_OWNED' ? [...new Set([...context.owned, ...event.ids])] : context.owned),
      }),
    },
    HYDRATE_EQUIPPED: {
      actions: assign({
        equipped: ({ event }) => event.type === 'HYDRATE_EQUIPPED' ? event.equipped : {},
      }),
    },
    CHARGE: { actions: assign({ yone: ({ context }) => context.yone + CHARGE_AMOUNT }) },
    DISMISS_ERROR: { actions: assign({ error: () => null }) },
    // 토스트 표시 + TOAST_MS 뒤 자동 소멸. 새 토스트가 오면 이전 예약을 cancel하고 다시 걸어 재시작.
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
        input: ({ context }) => ({ item: context.pendingItemId ? ITEM_BY_ID[context.pendingItemId] ?? null : null }),
        onDone: {
          target: 'idle',
          actions: assign(({ context }) => {
            const id = context.pendingItemId
            const item = id ? ITEM_BY_ID[id] : undefined
            if (!id || !item) return { pendingItemId: null }
            // 구매 = '내 아이템'(owned)으로만 이동. 인테리어=다중(중복 push) / 나머지=1개. 착용·배치는 확정에서.
            const owned = item.category === 'interior' ? [...context.owned, id] : context.owned.includes(id) ? context.owned : [...context.owned, id]
            return { yone: context.yone - item.yone, owned, pendingItemId: null }
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
