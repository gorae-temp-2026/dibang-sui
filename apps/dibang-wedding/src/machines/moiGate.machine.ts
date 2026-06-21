// moiGate.machine — Moi(아바타)가 꼭 필요한 기능 진입 시, 미보유 사용자에게 *강제* 생성 모달을 띄우는 flow.
// 강제 = visible에서 닫기(DISMISS) 전환을 두지 않는다 — 만들어야(SUBMIT→done) 빠져나간다.
// 온체인 createMoi 호출은 머신이 직접 안 하고 컴포넌트가 submit actor로 주입(STATE_MANAGEMENT §4).
// Moi 보유 여부 조회(fetch)는 머신 밖 React Query — REQUIRE는 "미보유로 확인된 기능 진입"일 때만 컴포넌트가 보낸다.
import { setup, fromPromise, assign } from 'xstate'

export interface MoiGateContext {
  error: string | null
  digest: string | null
}

export type MoiGateEvent = { type: 'REQUIRE' } | { type: 'SUBMIT' }

export const moiGateMachine = setup({
  types: {
    context: {} as MoiGateContext,
    events: {} as MoiGateEvent,
  },
  actors: {
    submit: fromPromise<string>(async () => {
      throw new Error('submit actor must be provided via .provide()')
    }),
  },
  actions: {
    setError: assign({ error: (_, params: { msg: string }) => params.msg }),
    setDigest: assign({ digest: (_, params: { digest: string }) => params.digest }),
    clearError: assign({ error: () => null }),
  },
}).createMachine({
  id: 'moiGate',
  context: { error: null, digest: null },
  initial: 'hidden',
  states: {
    // 게이트 통과(Moi 있음/미인증 등) — 모달 숨김. 기능 진입 + 미보유면 컴포넌트가 REQUIRE.
    hidden: {
      on: { REQUIRE: 'visible' },
    },
    // 강제 표시 — 닫기 전환 없음. 만들기(SUBMIT)만 빠져나가는 길.
    visible: {
      on: { SUBMIT: { target: 'submitting', actions: { type: 'clearError' } } },
    },
    submitting: {
      invoke: {
        src: 'submit',
        onDone: {
          target: 'done',
          actions: { type: 'setDigest', params: ({ event }) => ({ digest: event.output }) },
        },
        // 실패 시 강제 모달로 복귀(여전히 못 빠져나감) + 에러 표시.
        onError: {
          target: 'visible',
          actions: {
            type: 'setError',
            params: ({ event }) => ({ msg: event.error instanceof Error ? event.error.message : String(event.error) }),
          },
        },
      },
    },
    // 생성 완료 → 모달 닫힘(최종). 컴포넌트가 소유 Moi를 refetch해 더는 REQUIRE 안 보냄.
    done: { type: 'final' },
  },
})
