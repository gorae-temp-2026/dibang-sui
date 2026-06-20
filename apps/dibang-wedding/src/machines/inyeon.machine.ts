// 디방인연 상태 머신 — 카드 탐색 + 사진 게이트 + 이음(연결) async 흐름.
// xState 사용 근거(CLAUDE.md): 이음 신청 = 전송→수락대기→성사 비동기 분기. 데모는 mock 수락,
// 백엔드 연결 시 sendIeum actor를 실제 attestation/수락 폴링으로 교체(나머지 구조 유지).
import { setup, assign, fromPromise } from 'xstate'
import type { Moi, IncomingReq } from '../components/inyeon/types'
import { POOL, PHOTO_COST, START_YONE, DM_COST, INCOMING } from '../components/inyeon/data'

export type InyeonScreen = 'universe' | 'received' | 'chat' | 'me'

export interface InyeonContext {
  queue: number[]
  photoIdx: Record<number, number>
  unlocked: Record<number, boolean>
  yone: number
  screen: InyeonScreen
  degMin: number
  degMax: number
  activeId: number | null
  message: string
  sentIds: number[]
  matchedIds: number[]
  /** 나에게 온 이음 신청(받은이음). */
  incoming: IncomingReq[]
  /** 대화(DM)가 열린 모이 — 요네 게이트 통과 여부. */
  chatOpen: Record<number, boolean>
  error: string | null
}

const moiById = (id: number): Moi | undefined => POOL.find((m) => m.id === id)
const buildQueue = (lo: number, hi: number) => POOL.filter((m) => m.deg >= lo && m.deg <= hi).map((m) => m.id)

export const inyeonMachine = setup({
  types: {} as {
    context: InyeonContext
    events:
      | { type: 'NAV'; screen: InyeonScreen }
      | { type: 'SWIPE_NEXT' }
      | { type: 'PHOTO_NAV'; id: number; dir: 1 | -1 }
      | { type: 'UNLOCK_PHOTOS'; id: number }
      | { type: 'OPEN_IEUM'; id: number }
      | { type: 'SET_MESSAGE'; message: string }
      | { type: 'SEND_IEUM' }
      | { type: 'CANCEL_IEUM' }
      | { type: 'DISMISS_MATCH' }
      | { type: 'SET_FILTER'; degMin: number; degMax: number }
      | { type: 'RESET_DECK' }
      | { type: 'ACCEPT_REQ'; moiId: number }
      | { type: 'DECLINE_REQ'; moiId: number }
      | { type: 'OPEN_DM'; id: number }
  },
  guards: {
    canUnlock: ({ context, event }) =>
      event.type === 'UNLOCK_PHOTOS' && !context.unlocked[event.id] && context.yone >= PHOTO_COST,
  },
  actors: {
    sendIeum: fromPromise(async () => {
      await new Promise((resolve) => setTimeout(resolve, 650))
      return { accepted: true }
    }),
  },
}).createMachine({
  id: 'inyeon',
  context: {
    queue: buildQueue(1, 6),
    photoIdx: {},
    unlocked: {},
    yone: START_YONE,
    screen: 'universe',
    degMin: 1,
    degMax: 6,
    activeId: null,
    message: '',
    sentIds: [],
    matchedIds: [],
    incoming: INCOMING,
    chatOpen: {},
    error: null,
  },
  on: {
    NAV: { actions: assign({ screen: ({ event }) => event.screen }) },
    SET_FILTER: {
      actions: assign({
        degMin: ({ event }) => event.degMin,
        degMax: ({ event }) => event.degMax,
        queue: ({ event }) => buildQueue(event.degMin, event.degMax),
        photoIdx: () => ({}),
      }),
    },
    RESET_DECK: {
      actions: assign({
        queue: ({ context }) => buildQueue(context.degMin, context.degMax),
        photoIdx: () => ({}),
      }),
    },
    PHOTO_NAV: {
      actions: assign({
        photoIdx: ({ context, event }) => {
          if (event.type !== 'PHOTO_NAV') return context.photoIdx
          const m = moiById(event.id)
          if (!m) return context.photoIdx
          const len = m.photos.length
          const cur = context.photoIdx[event.id] ?? 0
          return { ...context.photoIdx, [event.id]: (cur + event.dir + len) % len }
        },
      }),
    },
    UNLOCK_PHOTOS: {
      guard: 'canUnlock',
      actions: assign({
        yone: ({ context }) => context.yone - PHOTO_COST,
        unlocked: ({ context, event }) =>
          event.type === 'UNLOCK_PHOTOS' ? { ...context.unlocked, [event.id]: true } : context.unlocked,
      }),
    },
    // 받은이음 수락 = 상대가 먼저 다가왔으니 대화는 상대 부담(무료로 열림).
    ACCEPT_REQ: {
      actions: assign({
        matchedIds: ({ context, event }) =>
          event.type === 'ACCEPT_REQ' && !context.matchedIds.includes(event.moiId)
            ? [...context.matchedIds, event.moiId]
            : context.matchedIds,
        chatOpen: ({ context, event }) =>
          event.type === 'ACCEPT_REQ' ? { ...context.chatOpen, [event.moiId]: true } : context.chatOpen,
        incoming: ({ context, event }) =>
          event.type === 'ACCEPT_REQ' ? context.incoming.filter((r) => r.moiId !== event.moiId) : context.incoming,
      }),
    },
    DECLINE_REQ: {
      actions: assign({
        incoming: ({ context, event }) =>
          event.type === 'DECLINE_REQ' ? context.incoming.filter((r) => r.moiId !== event.moiId) : context.incoming,
      }),
    },
    // 대화 열기 = 관계 거리별 요네 차감(먼저 다가간 쪽 부담). 부족하면 못 엶.
    OPEN_DM: {
      actions: assign(({ context, event }) => {
        if (event.type !== 'OPEN_DM') return {}
        const m = moiById(event.id)
        if (!m || context.chatOpen[event.id]) return {}
        const cost = DM_COST[m.tier]
        if (cost > 0 && context.yone < cost) return { error: '요네가 부족해 대화를 못 열어요. 충전하면 바로 열려요.' }
        return { yone: context.yone - cost, chatOpen: { ...context.chatOpen, [event.id]: true }, error: null }
      }),
    },
  },
  initial: 'browsing',
  states: {
    browsing: {
      on: {
        SWIPE_NEXT: { actions: assign({ queue: ({ context }) => context.queue.slice(1) }) },
        OPEN_IEUM: {
          target: 'composing',
          actions: assign({ activeId: ({ event }) => event.id, message: '', error: null }),
        },
      },
    },
    composing: {
      on: {
        SET_MESSAGE: { actions: assign({ message: ({ event }) => event.message }) },
        CANCEL_IEUM: { target: 'browsing', actions: assign({ activeId: null, message: '' }) },
        SEND_IEUM: { target: 'sending' },
      },
    },
    sending: {
      invoke: {
        src: 'sendIeum',
        onDone: {
          target: 'matched',
          actions: assign({
            sentIds: ({ context }) =>
              context.activeId ? [...context.sentIds, context.activeId] : context.sentIds,
            matchedIds: ({ context }) =>
              context.activeId ? [...context.matchedIds, context.activeId] : context.matchedIds,
          }),
        },
        onError: {
          target: 'composing',
          actions: assign({ error: () => '이음 신청을 보내지 못했어요. 다시 시도해주세요.' }),
        },
      },
    },
    matched: {
      on: {
        DISMISS_MATCH: {
          target: 'browsing',
          actions: assign({
            queue: ({ context }) => context.queue.filter((id) => id !== context.activeId),
            activeId: null,
            message: '',
          }),
        },
      },
    },
  },
})
