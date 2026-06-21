// 선물(증여) 거래 머신 — 관계 행동 → 신뢰 신호 → Moi Credit (핸드오프 §13-5).
// 전역 actor(giftActor)로 화면 간 공유: 인연 채팅에서 송신 ↔ 광장 꾸미기에서 수신 아이템 사용.
// sendGift actor는 온체인 gift::gift(MoiItem 이전 + GIFT 신호) 호출.
import { setup, assign, fromPromise, createActor } from 'xstate'
import { ITEM_BY_ID } from '../components/moi-gather/data'

export interface GiftEvent {
  id: number
  /** 내가 보낸 선물(true) / 받은 선물(false). */
  fromMe: boolean
  counterpartId: string
  counterpartName: string
  itemId: string
}

export interface GiftContext {
  /** 선물용 요네 지갑(데모 — 별도 지갑). */
  yone: number
  /** 선물 이벤트 로그(채팅 카드 원천). */
  log: GiftEvent[]
  /** 받은 선물(수신함/인벤토리) — 광장 꾸미기로 GRANT. */
  received: string[]
  /** 상대 모이별 누적 선물 신뢰 신호 수(증여=EM·CS). */
  signals: Record<string, number>
  pending: { itemId: string; toId: string; toName: string } | null
  error: string | null
  /** GiftEvent 고유 id (Date.now/random 미사용). */
  seq: number
}

export const giftMachine = setup({
  types: {} as {
    context: GiftContext
    events:
      | { type: 'SEND_GIFT'; itemId: string; toId: string; toName: string }
      | { type: 'RECEIVE_GIFT'; itemId: string; fromId: string; fromName: string }
      | { type: 'CHARGE'; amount?: number }
      | { type: 'DISMISS_ERROR' }
  },
  guards: {
    canAfford: ({ context, event }) => {
      if (event.type !== 'SEND_GIFT') return false
      const it = ITEM_BY_ID[event.itemId]
      const result = !!it && context.yone >= it.yone
      console.log('[gift] canAfford:', { itemId: event.itemId, found: !!it, yone: context.yone, cost: it?.yone, result })
      return result
    },
  },
  actors: {
    sendGift: fromPromise<{ ok: boolean }, void>(async () => {
      return { ok: true }
    }),
  },
}).createMachine({
  id: 'gift',
  context: {
    yone: 0,
    log: [],
    received: [],
    signals: {},
    pending: null,
    error: null,
    seq: 1,
  },
  on: {
    // 수신(데모 mock incoming) — 인벤토리 + 로그.
    RECEIVE_GIFT: {
      actions: assign({
        received: ({ context, event }) =>
          event.type === 'RECEIVE_GIFT' && !context.received.includes(event.itemId)
            ? [...context.received, event.itemId]
            : context.received,
        log: ({ context, event }) =>
          event.type === 'RECEIVE_GIFT'
            ? [...context.log, { id: context.seq, fromMe: false, counterpartId: event.fromId, counterpartName: event.fromName, itemId: event.itemId }]
            : context.log,
        seq: ({ context }) => context.seq + 1,
      }),
    },
    // 요네 충전 — 금액 지정(설정 'Sui로 충전') 또는 기본 +100(채팅 인라인 충전). 결제 자체는 화폐라 신호 제외.
    CHARGE: { actions: assign({ yone: ({ context, event }) => context.yone + (event.type === 'CHARGE' ? (event.amount ?? 100) : 0) }) },
    DISMISS_ERROR: { actions: assign({ error: () => null }) },
  },
  initial: 'idle',
  states: {
    idle: {
      on: {
        SEND_GIFT: {
          guard: 'canAfford',
          target: 'sending',
          actions: assign({ pending: ({ event }) => ({ itemId: event.itemId, toId: event.toId, toName: event.toName }), error: () => null }),
        },
      },
    },
    sending: {
      invoke: {
        src: 'sendGift',
        onDone: {
          target: 'idle',
          // 요네 차감 + 선물 로그 + 신뢰 신호 적립(증여자→수령자).
          actions: assign(({ context }) => {
            const p = context.pending
            const it = p ? ITEM_BY_ID[p.itemId] : undefined
            if (!p || !it) return { pending: null }
            return {
              yone: context.yone - it.yone,
              log: [...context.log, { id: context.seq, fromMe: true, counterpartId: p.toId, counterpartName: p.toName, itemId: p.itemId }],
              signals: { ...context.signals, [p.toId]: (context.signals[p.toId] ?? 0) + 1 },
              seq: context.seq + 1,
              pending: null,
            }
          }),
        },
        onError: { target: 'idle', actions: assign({ error: () => '선물을 보내지 못했어요. 다시 시도해주세요.', pending: () => null }) },
      },
    },
  },
})

/** 전역 선물 actor — 인연 채팅(송신) ↔ 광장 꾸미기(수신) 공유. */
export const giftActor = createActor(giftMachine).start()
