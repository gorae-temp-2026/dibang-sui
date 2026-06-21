import { setup } from 'xstate';

// authCallback.machine — AuthCallbackPage flow (XS-21).
// OAuth 콜백 처리: processing(세션 대기) → resolved(세션 도착)/redirectingLogin(코드 없음)/timedOut(10초).
// navigate는 컴포넌트가 수행하고, 머신은 처리 진행 상태(화면 메시지 + 흐름 추적)만 제어
// (STATE_MANAGEMENT §4). timedOut 시 화면 메시지가 바뀐다.

export type AuthCallbackEvent =
  | { type: 'RESOLVE' }
  | { type: 'NO_SESSION' }
  | { type: 'TIMEOUT' };

export const authCallbackMachine = setup({
  types: { events: {} as AuthCallbackEvent },
}).createMachine({
  id: 'authCallback',
  initial: 'processing',
  states: {
    processing: {
      on: { RESOLVE: 'resolved', NO_SESSION: 'redirectingLogin', TIMEOUT: 'timedOut' },
    },
    resolved: { type: 'final' },
    redirectingLogin: { type: 'final' },
    timedOut: { type: 'final' },
  },
});
