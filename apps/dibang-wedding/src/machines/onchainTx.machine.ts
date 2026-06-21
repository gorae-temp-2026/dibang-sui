// onchainTx.machine — 범용 단일 온체인 액션 flow(idle → submitting → done/idle).
// SUBMIT은 페이로드가 없다 — 컴포넌트가 폼값을 closure로 캡처한 submit actor를 .provide()로 주입한다
// (STATE_MANAGEMENT §4: 머신은 flow만, 온체인/fetch는 주입). 성공 시 digest, 실패 시 error를 context에.
import { setup, fromPromise, assign } from 'xstate'

export interface OnchainTxContext {
  error: string | null
  digest: string | null
}

export type OnchainTxEvent = { type: 'SUBMIT' } | { type: 'RESET' }

export const onchainTxMachine = setup({
  types: {
    context: {} as OnchainTxContext,
    events: {} as OnchainTxEvent,
  },
  actors: {
    submit: fromPromise<string>(async () => {
      throw new Error('submit actor must be provided via .provide()')
    }),
  },
  actions: {
    setError: assign({ error: (_, params: { msg: string }) => params.msg }),
    setDigest: assign({ digest: (_, params: { digest: string }) => params.digest }),
    clear: assign({ error: () => null, digest: () => null }),
  },
}).createMachine({
  id: 'onchainTx',
  context: { error: null, digest: null },
  initial: 'idle',
  states: {
    idle: {
      on: { SUBMIT: { target: 'submitting', actions: { type: 'clear' } } },
    },
    submitting: {
      invoke: {
        src: 'submit',
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
