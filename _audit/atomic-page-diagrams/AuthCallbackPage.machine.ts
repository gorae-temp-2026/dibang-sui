// [Stately 관리용 스펙 모델 — 방향 A] AuthCallbackPage.md 다이어그램에서 도출.
// guards/actions는 이름 참조용 stub. XState v5.
// 주: 10초 타임아웃은 실제로는 마운트 시 1회 가동되는 '페이지 레벨' 타이머이나,
//     statechart로는 대기 상태(waitingReady·waitingSession) 각각의 after로 근사 표현.
import { setup } from 'xstate';

export const authCallbackPageMachine = setup({
  types: {
    context: {} as Record<string, never>,
    events: {} as { type: 'READY' } | { type: 'SESSION_ARRIVED' },
  },
  guards: {
    hasSession: () => false, // session 존재
    hasCode: () => false,    // ?code (PKCE) 존재
  },
}).createMachine({
  id: 'authCallbackPage',
  context: {},
  initial: 'waitingReady',
  states: {
    // isReady 대기 ('로그인 처리 중...')
    waitingReady: {
      on: { READY: { target: 'checkAuth' } },
      after: { 10000: { target: 'redirectLogin' } }, // 페이지 레벨 10초 타임아웃
    },
    checkAuth: {
      always: [
        { guard: 'hasSession', target: 'redirectApp' },     // navigate(safe redirect ?? /my-wedding)
        { guard: 'hasCode', target: 'waitingSession' },      // PKCE: onAuthStateChange 대기
        { target: 'redirectLogin' },                          // code 없음 → /login(?redirect 보존)
      ],
    },
    // PKCE 세션 도착 대기 ('로그인 처리 중...')
    waitingSession: {
      on: { SESSION_ARRIVED: { target: 'redirectApp' } },
      after: { 10000: { target: 'redirectLogin' } }, // 페이지 레벨 10초 타임아웃
    },
    redirectApp: { type: 'final' },   // navigate(safe redirect ?? /my-wedding, replace)
    redirectLogin: { type: 'final' }, // navigate(/login[?redirect], replace)
  },
});
