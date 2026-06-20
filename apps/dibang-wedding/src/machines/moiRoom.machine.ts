// 모이가모인곳(④) 미니룸 상태 머신 — 샵 경제(요네 차감) + 배치/장착.
// xState 근거(CLAUDE.md): 구매 = 요네 차감→(백엔드 시 attestation/결제)→소유 비동기 분기.
//   데모는 mock 차감, 백엔드 연결 시 buyItem actor를 실제 결제/검증으로 교체(구조 유지).
// 차감 = 구매 1회 / 배치·장착 토글은 무료(에셋스펙 §2). 구매 즉시 자동 배치·장착(데모 즉각 피드백).
import { setup, assign, fromPromise } from 'xstate'
import { ITEM_BY_ID, START_YONE_ROOM, CHARGE_AMOUNT, type ShopItem, type EquipSlot } from '../components/moi-gather/data'

export interface PlacedItem {
  itemId: string
  /** 바닥 정규화 좌표 0~1. */
  x: number
  y: number
}

export interface MoiRoomContext {
  yone: number
  /** 구매한 아이템 id. */
  owned: string[]
  /** 방에 배치된 인테리어(아이템당 1개). */
  placed: PlacedItem[]
  /** 내 모이 장착 옷(슬롯별). */
  equipped: Partial<Record<EquipSlot, string>>
  /** 구매 진행 중 아이템. */
  pendingItemId: string | null
  error: string | null
}

// 자동 배치 스폰 위치 — 시드/랜덤 없이 배치 수로 결정(재현 가능).
function spawnFor(item: ShopItem, count: number): { x: number; y: number } {
  if (item.anchor === 'floor-center') return { x: 0.5, y: 0.5 }
  if (item.anchor === 'wall') return { x: 0.22 + (count % 3) * 0.28, y: 0.2 }
  return { x: 0.28 + (count % 3) * 0.22, y: 0.42 + Math.floor(count / 3) * 0.07 }
}

export const moiRoomMachine = setup({
  types: {} as {
    context: MoiRoomContext
    events:
      | { type: 'PURCHASE'; itemId: string }
      | { type: 'PLACE'; itemId: string; x?: number; y?: number }
      | { type: 'MOVE'; itemId: string; x: number; y: number }
      | { type: 'REMOVE'; itemId: string }
      | { type: 'EQUIP'; itemId: string }
      | { type: 'UNEQUIP'; slot: EquipSlot }
      | { type: 'CHARGE' }
      | { type: 'DISMISS_ERROR' }
  },
  guards: {
    canPurchase: ({ context, event }) => {
      if (event.type !== 'PURCHASE') return false
      const item = ITEM_BY_ID[event.itemId]
      return !!item && !context.owned.includes(event.itemId) && context.yone >= item.yone
    },
  },
  actors: {
    // mock 결제/요네 차감 확정. 백엔드 연결 시 실제 결제·attestation actor로 교체.
    buyItem: fromPromise(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      return { ok: true }
    }),
  },
}).createMachine({
  id: 'moiRoom',
  context: {
    yone: START_YONE_ROOM,
    owned: [],
    placed: [],
    equipped: {},
    pendingItemId: null,
    error: null,
  },
  on: {
    // 배치/장착 = 무료 토글 (소유한 아이템만). 어느 상태에서나 가능.
    PLACE: {
      actions: assign({
        placed: ({ context, event }) => {
          if (event.type !== 'PLACE') return context.placed
          const item = ITEM_BY_ID[event.itemId]
          if (!item || item.category !== 'interior' || !context.owned.includes(event.itemId)) return context.placed
          if (context.placed.some((p) => p.itemId === event.itemId)) return context.placed
          const at = event.x != null && event.y != null ? { x: event.x, y: event.y } : spawnFor(item, context.placed.length)
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
          if (!item || item.category !== 'outfit' || !item.slot || !context.owned.includes(event.itemId)) return context.equipped
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
    CHARGE: { actions: assign({ yone: ({ context }) => context.yone + CHARGE_AMOUNT }) },
    DISMISS_ERROR: { actions: assign({ error: () => null }) },
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
            // 구매 즉시 자동 배치(인테리어)/장착(옷) — 데모 즉각 피드백.
            let placed = context.placed
            let equipped = context.equipped
            if (item.category === 'interior' && !placed.some((p) => p.itemId === id)) {
              placed = [...placed, { itemId: id, ...spawnFor(item, placed.length) }]
            } else if (item.category === 'outfit' && item.slot) {
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
