// LIVE 축하메시지 자동 순환 머신 — LiveCelebration의 idx + setInterval(8.5초)을 이관.
// xState 근거(STATE_MANAGEMENT.md): 시간 기반 자동 전환(타이머) 흐름 → machine(after 지연 전환).
//   메시지 2개 이상일 때만 순환(canRotate). count는 파생 데이터(useMemo)라 컴포넌트가 SET_COUNT로 주입.
import { setup, assign } from 'xstate'

/** 메시지 순환 간격(ms) — 프로토타입 정합(8.5초). */
export const ROTATE_MS = 8500

export interface LiveCelebrationContext {
  /** 현재 표시 중인 메시지 인덱스. */
  idx: number
  /** 표시 대상 메시지 수(파생, 컴포넌트가 주입). */
  count: number
}

export const liveCelebrationMachine = setup({
  types: {} as {
    context: LiveCelebrationContext
    events: { type: 'SET_COUNT'; count: number }
  },
  guards: {
    // 2개 이상이어야 순환(1개 이하는 고정 — 원본 `if (liveMsgs.length <= 1) return`).
    canRotate: ({ context }) => context.count > 1,
  },
  actions: {
    // 다음 메시지로(끝이면 처음으로 wrap).
    advance: assign({ idx: ({ context }) => (context.count > 0 ? (context.idx + 1) % context.count : 0) }),
    // count 반영 + idx를 새 범위로 클램프(메시지 줄어들 때 out-of-range 방지).
    syncCount: assign({
      count: ({ event }) => (event.type === 'SET_COUNT' ? event.count : 0),
      idx: ({ context, event }) => {
        if (event.type !== 'SET_COUNT') return context.idx
        return event.count > 0 ? context.idx % event.count : 0
      },
    }),
  },
}).createMachine({
  id: 'liveCelebration',
  context: { idx: 0, count: 0 },
  initial: 'idle',
  states: {
    // count 정지(0~1) — 순환 없음.
    idle: {
      on: { SET_COUNT: { actions: 'syncCount', target: 'evaluating' } },
    },
    // count 반영 후 순환 여부 결정(분기 노드).
    evaluating: {
      always: [{ guard: 'canRotate', target: 'rotating' }, { target: 'idle' }],
    },
    // 순환 중 — ROTATE_MS마다 다음 메시지. count 바뀌면 타이머 재시작(reenter).
    rotating: {
      on: { SET_COUNT: { actions: 'syncCount', target: 'evaluating' } },
      after: {
        [ROTATE_MS]: { actions: 'advance', target: 'rotating', reenter: true },
      },
    },
  },
})
