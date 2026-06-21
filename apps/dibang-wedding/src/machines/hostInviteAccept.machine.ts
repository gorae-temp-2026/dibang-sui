import { setup } from 'xstate';

// hostInviteAccept.machine — HostInviteAcceptPage flow (XS-16).
// parallel 2축: data(초대 조회 loading/loaded/error) + accept(수락 mutation idle/accepting).
// 초대 데이터·status(accepted/cancelled/pending) 분기는 React Query 파생이 SSOT —
// 머신은 로딩 표시 + 수락 진행 flow만 제어(STATE_MANAGEMENT §4).

export type HostInviteEvent =
  | { type: 'LOAD_DONE' }
  | { type: 'LOAD_ERROR' }
  | { type: 'ACCEPT' }
  | { type: 'ACCEPT_DONE' }
  | { type: 'ACCEPT_ERROR' };

export const hostInviteAcceptMachine = setup({
  types: { events: {} as HostInviteEvent },
}).createMachine({
  id: 'hostInviteAccept',
  type: 'parallel',
  states: {
    data: {
      initial: 'loading',
      states: {
        loading: { on: { LOAD_DONE: 'loaded', LOAD_ERROR: 'error' } },
        loaded: {},
        error: {},
      },
    },
    accept: {
      initial: 'idle',
      states: {
        idle: { on: { ACCEPT: 'accepting' } },
        // 성공/실패 모두 idle 복귀(실패 시 재시도 가능). 성공 시 컴포넌트가 navigate.
        accepting: { on: { ACCEPT_DONE: 'idle', ACCEPT_ERROR: 'idle' } },
      },
    },
  },
});
