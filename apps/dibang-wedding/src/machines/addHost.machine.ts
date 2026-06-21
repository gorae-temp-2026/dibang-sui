// addHost.machine — 공동 혼주 추가 flow(idle → submitting → done/idle).
// 온체인 호출(useOnchainHostActions.addHost + cap 조회)은 머신이 직접 하지 않고, 컴포넌트가
// `submit` actor를 .provide()로 주입한다(STATE_MANAGEMENT §4: 머신은 flow만, 온체인/fetch는 input 주입).
import { setup, fromPromise, assign } from 'xstate'

export interface AddHostContext {
  error: string | null
  digest: string | null
}

export type AddHostEvent = { type: 'SUBMIT'; newHost: string } | { type: 'RESET' }

export const addHostMachine = setup({
  types: {
    context: {} as AddHostContext,
    events: {} as AddHostEvent,
  },
  actors: {
    // 기본값은 플레이스홀더 — 컴포넌트가 실제 온체인 addHost로 교체(provide).
    submit: fromPromise<string, { newHost: string }>(async () => {
      throw new Error('submit actor must be provided via .provide()')
    }),
  },
  actions: {
    setError: assign({ error: (_, params: { msg: string }) => params.msg }),
    setDigest: assign({ digest: (_, params: { digest: string }) => params.digest }),
    clear: assign({ error: () => null, digest: () => null }),
  },
}).createMachine({
  id: 'addHost',
  context: { error: null, digest: null },
  initial: 'idle',
  states: {
    idle: {
      on: { SUBMIT: { target: 'submitting', actions: { type: 'clear' } } },
    },
    submitting: {
      invoke: {
        src: 'submit',
        input: ({ event }) => ({ newHost: event.type === 'SUBMIT' ? event.newHost : '' }),
        onDone: {
          target: 'done',
          actions: { type: 'setDigest', params: ({ event }) => ({ digest: event.output }) },
        },
        onError: {
          target: 'idle',
          actions: {
            type: 'setError',
            params: ({ event }) => ({ msg: event.error instanceof Error ? event.error.message : String(event.error) }),
          },
        },
      },
    },
    done: {
      on: { RESET: { target: 'idle', actions: { type: 'clear' } } },
    },
  },
})
