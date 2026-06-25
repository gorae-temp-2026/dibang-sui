import { setup, assign } from 'xstate';
import { translate, useLangStore } from '../lib/i18n';
const lang = () => useLangStore.getState().lang;

// network.machine — NetworkPage(신뢰 네트워크) flow (XS-12).
// parallel 2축: moi(아바타 발행) + ium(신뢰관계 발행). 각 idle→submitting→idle(result).
// 온체인 호출(createMoi/createIum)은 컴포넌트가 useOnchainHostActions로 수행하고 결과를 send
// (STATE_MANAGEMENT.md §4: 머신은 발행 flow만, 실호출은 컴포넌트). ium 폼값(toUser 등)은 로컬 입력.

export interface NetworkContext {
  moiResult: string;
  iumResult: string;
}

export type NetworkEvent =
  | { type: 'CREATE_MOI' }
  | { type: 'MOI_DONE'; result: string }
  | { type: 'MOI_ERROR'; result: string }
  | { type: 'CREATE_IUM' }
  | { type: 'IUM_DONE'; result: string }
  | { type: 'IUM_ERROR'; result: string };

export const networkMachine = setup({
  types: { context: {} as NetworkContext, events: {} as NetworkEvent },
  actions: {
    moiPending: assign({ moiResult: () => translate(lang(), 'machine.network.moiPending') }),
    setMoiResult: assign({ moiResult: (_, p: { result: string }) => p.result }),
    iumPending: assign({ iumResult: () => translate(lang(), 'machine.network.iumPending') }),
    setIumResult: assign({ iumResult: (_, p: { result: string }) => p.result }),
  },
}).createMachine({
  id: 'network',
  type: 'parallel',
  context: { moiResult: '', iumResult: '' },
  states: {
    moi: {
      initial: 'idle',
      states: {
        idle: { on: { CREATE_MOI: { target: 'submitting', actions: 'moiPending' } } },
        submitting: {
          on: {
            MOI_DONE: {
              target: 'idle',
              actions: { type: 'setMoiResult', params: ({ event }) => ({ result: event.type === 'MOI_DONE' ? event.result : '' }) },
            },
            MOI_ERROR: {
              target: 'idle',
              actions: { type: 'setMoiResult', params: ({ event }) => ({ result: event.type === 'MOI_ERROR' ? event.result : '' }) },
            },
          },
        },
      },
    },
    ium: {
      initial: 'idle',
      states: {
        idle: { on: { CREATE_IUM: { target: 'submitting', actions: 'iumPending' } } },
        submitting: {
          on: {
            IUM_DONE: {
              target: 'idle',
              actions: { type: 'setIumResult', params: ({ event }) => ({ result: event.type === 'IUM_DONE' ? event.result : '' }) },
            },
            IUM_ERROR: {
              target: 'idle',
              actions: { type: 'setIumResult', params: ({ event }) => ({ result: event.type === 'IUM_ERROR' ? event.result : '' }) },
            },
          },
        },
      },
    },
  },
});
