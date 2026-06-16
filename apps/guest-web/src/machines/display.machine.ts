// mecdisplay 워크스트림(_scenario/display-port/SCENARIOS.md §3 S-01·S-04).
//
// 페이지 단위 비동기 분기 4종(wedding 로딩 / Realtime 구독 상태 / 재연결 / 치명적 에러)을
// 가지므로 CLAUDE.md "비동기 분기 2개 이상 → machine 우선" 규칙 적용. 카드 큐 자체는
// useEnvelopeQueue가 ref·dom 단위로 관리하므로 machine 외부.

import { setup, assign } from 'xstate'

export interface DisplayContext {
  /** URL에서 읽은 weddingId. 없으면 안내 화면. */
  weddingId: string | null
  /** v3 API 로드된 라운지 식별자. Realtime 구독·시드 fetch의 기준. */
  loungeId: string | null
  /** 마지막으로 본 Realtime 채널 상태. catch-up 트리거에 사용. */
  channelStatus: 'IDLE' | 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'
  /** 치명적 에러 메시지(weddingId 없음 / wedding 미존재 등). */
  fatalReason: string | null
}

export type DisplayEvent =
  | { type: 'WEDDING_LOADED'; loungeId: string }
  | { type: 'WEDDING_NOT_FOUND' }
  | { type: 'WEDDING_MISSING_ID' }
  | { type: 'SUBSCRIBE_OK' }
  | { type: 'SUBSCRIBE_ERROR' }
  | { type: 'SUBSCRIBE_TIMEOUT' }
  | { type: 'RETRY' }

export const displayMachine = setup({
  types: {} as { context: DisplayContext; events: DisplayEvent; input: { weddingId: string | null } },
  actions: {
    setLoungeId: assign({ loungeId: (_, params: { loungeId: string }) => params.loungeId }),
    setChannelStatus: assign({
      channelStatus: (_, params: { status: DisplayContext['channelStatus'] }) => params.status,
    }),
    setFatalReason: assign({ fatalReason: (_, params: { reason: string }) => params.reason }),
  },
}).createMachine({
  id: 'display',
  initial: 'loadingWedding',
  context: ({ input }) => ({
    weddingId: input.weddingId,
    loungeId: null,
    channelStatus: 'IDLE',
    fatalReason: input.weddingId ? null : 'weddingId 없음',
  }),
  states: {
    loadingWedding: {
      // 빈 weddingId면 fatal로 즉시 이동
      always: [{ guard: ({ context }) => !context.weddingId, target: 'fatalError' }],
      on: {
        WEDDING_LOADED: {
          target: 'subscribing',
          actions: { type: 'setLoungeId', params: ({ event }) => ({ loungeId: event.loungeId }) },
        },
        WEDDING_NOT_FOUND: {
          target: 'fatalError',
          actions: { type: 'setFatalReason', params: () => ({ reason: 'wedding 미존재' }) },
        },
        WEDDING_MISSING_ID: {
          target: 'fatalError',
          actions: { type: 'setFatalReason', params: () => ({ reason: 'weddingId 없음' }) },
        },
      },
    },
    subscribing: {
      on: {
        SUBSCRIBE_OK: {
          target: 'ready',
          actions: { type: 'setChannelStatus', params: () => ({ status: 'SUBSCRIBED' as const }) },
        },
        SUBSCRIBE_ERROR: {
          target: 'reconnecting',
          actions: { type: 'setChannelStatus', params: () => ({ status: 'CHANNEL_ERROR' as const }) },
        },
        SUBSCRIBE_TIMEOUT: {
          target: 'reconnecting',
          actions: { type: 'setChannelStatus', params: () => ({ status: 'TIMED_OUT' as const }) },
        },
      },
    },
    ready: {
      on: {
        SUBSCRIBE_ERROR: {
          target: 'reconnecting',
          actions: { type: 'setChannelStatus', params: () => ({ status: 'CHANNEL_ERROR' as const }) },
        },
        SUBSCRIBE_TIMEOUT: {
          target: 'reconnecting',
          actions: { type: 'setChannelStatus', params: () => ({ status: 'TIMED_OUT' as const }) },
        },
      },
    },
    reconnecting: {
      // 호스트 코드(useEffect 5초 타이머)가 RETRY를 디스패치하면 다시 subscribing.
      on: {
        RETRY: 'subscribing',
        SUBSCRIBE_OK: {
          target: 'ready',
          actions: { type: 'setChannelStatus', params: () => ({ status: 'SUBSCRIBED' as const }) },
        },
      },
    },
    fatalError: { type: 'final' },
  },
})
