// 디방인연 상태 머신 — 카드 탐색 + 사진 게이트 + 이음(연결) async 흐름.
// xState 사용 근거(CLAUDE.md): 이음 신청 = 전송→수락대기→성사 비동기 분기. 데모는 mock 수락,
// 백엔드 연결 시 sendIeum actor를 실제 attestation/수락 폴링으로 교체(나머지 구조 유지).
import { setup, assign, fromPromise, raise } from 'xstate'
import type { Moi, IncomingReq, DmMsg } from '../components/inyeon/types'
import { POOL, PHOTO_COST, START_YONE, DM_COST, seedDm, DM_AUTO_REPLY } from '../components/inyeon/data'

export type InyeonScreen = 'universe' | 'received' | 'chat' | 'me'

export interface InyeonContext {
  pool: Moi[]
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
  // ── 오버레이/시트 네비 (페이지 useState였던 것을 머신이 단일 소유 — 동시 1개 + 전환 규칙 강제) ──
  /** 카드 상세(경량 DetailSheet)로 연 모이. */
  detailId: number | null
  /** 다른 모이 전체 프로필 시트로 연 모이(이음 전 익명). */
  profileMoiId: number | null
  /** 내 전체 프로필 시트 열림. */
  myProfileOpen: boolean
  /** 매칭 범위 필터 시트 열림. */
  filterOpen: boolean
  // ── 채팅(DM) — 방/메모리 네비 + 방별 메시지 ──
  /** 열린 대화방 모이 id. */
  dmRoomId: number | null
  /** 열린 메모리 뷰어 모이 id. */
  memoryId: number | null
  /** 모이별 대화 메시지(진입 시 seedDm로 시드). */
  dms: Record<number, DmMsg[]>
}

const moiById = (pool: Moi[], id: number): Moi | undefined => pool.find((m) => m.id === id)
const seedIfAbsent = (dms: Record<number, DmMsg[]>, id: number): Record<number, DmMsg[]> =>
  dms[id] ? dms : { ...dms, [id]: seedDm() }
const buildQueue = (pool: Moi[], lo: number, hi: number, sentIds: number[] = []) => {
  const sent = new Set(sentIds)
  return pool.filter((m) => m.deg >= lo && m.deg <= hi && !sent.has(m.id)).map((m) => m.id)
}

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
      | { type: 'SET_POOL'; pool: Moi[] }
      | { type: 'SET_INCOMING'; incoming: IncomingReq[] }
      | { type: 'SET_MATCHED'; moiIds: number[] }
      | { type: 'ACCEPT_REQ'; moiId: number }
      | { type: 'DECLINE_REQ'; moiId: number }
      // 오버레이/시트 네비
      | { type: 'OPEN_DETAIL'; id: number }
      | { type: 'CLOSE_DETAIL' }
      | { type: 'OPEN_PROFILE'; id: number }
      | { type: 'CLOSE_PROFILE' }
      | { type: 'OPEN_MY_PROFILE' }
      | { type: 'CLOSE_MY_PROFILE' }
      | { type: 'OPEN_FILTER' }
      | { type: 'CLOSE_FILTER' }
      // 채팅(DM) — 방 열기(요네 게이트 통합)·닫기, 메모리 뷰어, 메시지 전송 + 지연 자동응답
      | { type: 'OPEN_DM_ROOM'; id: number }
      | { type: 'CLOSE_DM_ROOM' }
      | { type: 'OPEN_MEMORY'; id: number }
      | { type: 'CLOSE_MEMORY' }
      | { type: 'SEND_DM'; id: number; text: string }
      | { type: 'DM_REPLY'; id: number }
  },
  guards: {
    canUnlock: ({ context, event }) =>
      event.type === 'UNLOCK_PHOTOS' && !context.unlocked[event.id] && context.yone >= PHOTO_COST,
  },
  actors: {
    // 온체인 이음 신청 — 컴포넌트가 .provide()로 requestIum 호출 actor를 주입(STATE_MANAGEMENT §4).
    // 기본은 mock(미주입/데모). input.targetId로 상대 식별자 전달.
    sendIeum: fromPromise<{ accepted: boolean }, { targetId: number | null }>(async () => {
      await new Promise((resolve) => setTimeout(resolve, 650))
      return { accepted: true }
    }),
  },
}).createMachine({
  id: 'inyeon',
  context: {
    pool: POOL,
    queue: buildQueue(POOL, 1, 6, []),
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
    incoming: [],
    chatOpen: {},
    error: null,
    detailId: null,
    profileMoiId: null,
    myProfileOpen: false,
    filterOpen: false,
    dmRoomId: null,
    memoryId: null,
    dms: {},
  },
  on: {
    // 원본은 chat 화면을 조건 렌더(screen==='chat' && <ChatScreen/>)한다. 따라서 화면이 실제로
    // 바뀔 때만 ChatScreen이 언마운트→로컬 state(dmRoomId/memoryId/dms)가 리셋됐고, 같은 탭을
    // 다시 눌러 같은 화면으로 NAV해도(예: chat→chat) 언마운트되지 않아 열린 방·메시지가 유지됐다.
    // 그 동작을 보존: screen이 바뀔 때만 DM방·메모리·대화기록 초기화, 같은 화면 재NAV는 보존.
    NAV: {
      actions: assign(({ context, event }) => {
        if (event.type !== 'NAV') return {}
        if (event.screen === context.screen) return { screen: event.screen }
        return { screen: event.screen, dmRoomId: null, memoryId: null, dms: {} }
      }),
    },
    SET_FILTER: {
      actions: assign({
        degMin: ({ event }) => event.degMin,
        degMax: ({ event }) => event.degMax,
        queue: ({ context, event }) => buildQueue(context.pool, event.degMin, event.degMax, context.sentIds),
        photoIdx: () => ({}),
      }),
    },
    RESET_DECK: {
      actions: assign({
        queue: ({ context }) => buildQueue(context.pool, context.degMin, context.degMax, context.sentIds),
        photoIdx: () => ({}),
      }),
    },
    SET_POOL: {
      actions: assign({
        pool: ({ event }) => event.pool,
        queue: ({ event, context }) => buildQueue(event.pool, context.degMin, context.degMax, context.sentIds),
        photoIdx: () => ({}),
      }),
    },
    SET_INCOMING: {
      actions: assign({ incoming: ({ event }) => event.incoming }),
    },
    SET_MATCHED: {
      actions: assign({ matchedIds: ({ event }) => event.moiIds }),
    },
    PHOTO_NAV: {
      actions: assign({
        photoIdx: ({ context, event }) => {
          if (event.type !== 'PHOTO_NAV') return context.photoIdx
          const m = moiById(context.pool, event.id)
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
    // ── 오버레이/시트 네비 (동시 1개 + 전환 규칙: OPEN_PROFILE은 detail을 닫고, OPEN_IEUM은 detail·profile을 닫음) ──
    OPEN_DETAIL: { actions: assign({ detailId: ({ event }) => event.type === 'OPEN_DETAIL' ? event.id : null }) },
    CLOSE_DETAIL: { actions: assign({ detailId: () => null }) },
    OPEN_PROFILE: {
      actions: assign({
        profileMoiId: ({ event }) => (event.type === 'OPEN_PROFILE' ? event.id : null),
        detailId: () => null,
      }),
    },
    CLOSE_PROFILE: { actions: assign({ profileMoiId: () => null }) },
    OPEN_MY_PROFILE: { actions: assign({ myProfileOpen: () => true }) },
    CLOSE_MY_PROFILE: { actions: assign({ myProfileOpen: () => false }) },
    OPEN_FILTER: { actions: assign({ filterOpen: () => true }) },
    CLOSE_FILTER: { actions: assign({ filterOpen: () => false }) },

    // ── 채팅(DM) ──
    // 대화방 열기 = 관계 거리별 요네 게이트(먼저 다가간 쪽 부담). 이미 열렸으면 무료 재입장,
    // 아니면 차감 후 입장. 부족하면 error만(방 안 열림). (기존 OPEN_DM 게이트 + enter 입장을 원자 통합.)
    OPEN_DM_ROOM: {
      actions: assign(({ context, event }) => {
        if (event.type !== 'OPEN_DM_ROOM') return {}
        const m = moiById(context.pool, event.id)
        if (!m) return {}
        if (context.chatOpen[event.id]) {
          return { dmRoomId: event.id, dms: seedIfAbsent(context.dms, event.id), error: null }
        }
        const cost = DM_COST[m.tier]
        if (cost > 0 && context.yone < cost) {
          return { error: '요네가 부족해 대화를 못 열어요. 충전하면 바로 열려요.' }
        }
        return {
          yone: context.yone - cost,
          chatOpen: { ...context.chatOpen, [event.id]: true },
          dmRoomId: event.id,
          dms: seedIfAbsent(context.dms, event.id),
          error: null,
        }
      }),
    },
    CLOSE_DM_ROOM: { actions: assign({ dmRoomId: () => null }) },
    OPEN_MEMORY: { actions: assign({ memoryId: ({ event }) => event.type === 'OPEN_MEMORY' ? event.id : null }) },
    CLOSE_MEMORY: { actions: assign({ memoryId: () => null }) },
    // 메시지 전송 = 내 메시지 즉시 append + 900ms 뒤 상대 자동응답(DM_REPLY 지연 raise).
    SEND_DM: {
      actions: [
        assign({
          dms: ({ context, event }) => {
            if (event.type !== 'SEND_DM') return context.dms
            const cur = context.dms[event.id] ?? seedDm()
            return { ...context.dms, [event.id]: [...cur, { me: event.text }] }
          },
        }),
        raise(({ event }) => ({ type: 'DM_REPLY' as const, id: event.type === 'SEND_DM' ? event.id : -1 }), { delay: 900 }),
      ],
    },
    DM_REPLY: {
      actions: assign({
        dms: ({ context, event }) => {
          if (event.type !== 'DM_REPLY') return context.dms
          // 대화가 이미 닫힌(NAV로 dms 리셋된) 방에는 자동응답을 되살리지 않는다 —
          // 원본은 ChatScreen 언마운트로 setTimeout 콜백이 무효화돼 응답이 버려졌다.
          const cur = context.dms[event.id]
          if (!cur) return context.dms
          return { ...context.dms, [event.id]: [...cur, { them: DM_AUTO_REPLY }] }
        },
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
          // detail/프로필 오버레이에서 이음 진입 시 그 오버레이를 닫고 이음 시트로 전환.
          actions: assign({
            activeId: ({ event }) => (event.type === 'OPEN_IEUM' ? event.id : null),
            message: '',
            error: null,
            detailId: () => null,
            profileMoiId: () => null,
          }),
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
        input: ({ context }) => ({ targetId: context.activeId }),
        onDone: {
          target: 'sentPending',
          actions: assign({
            sentIds: ({ context }) =>
              context.activeId ? [...context.sentIds, context.activeId] : context.sentIds,
          }),
        },
        onError: {
          target: 'composing',
          actions: assign({ error: () => '이음 신청을 보내지 못했어요. 다시 시도해주세요.' }),
        },
      },
    },
    sentPending: {
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
    matched: {
      on: {
        DISMISS_MATCH: {
          target: 'browsing',
          actions: assign({
            matchedIds: ({ context }) =>
              context.activeId ? [...context.matchedIds, context.activeId] : context.matchedIds,
            queue: ({ context }) => context.queue.filter((id) => id !== context.activeId),
            activeId: null,
            message: '',
          }),
        },
      },
    },
  },
})
