// [Stately 관리용 스펙 모델 — 방향 A] SettingsPage.md 다이어그램에서 도출.
// guards/actions/actors는 이름 참조용 stub. XState v5.
// 주: marketing = userOverride ?? me.marketing_agreed ?? false 는 데이터 파생(상태 아님).
import { setup, fromPromise } from 'xstate';

export const settingsPageMachine = setup({
  types: {
    context: {} as Record<string, never>,
    events: {} as { type: 'TOGGLE_MARKETING' } | { type: 'LOGOUT' },
  },
  actors: {
    updateMarketing: fromPromise(async (): Promise<void> => {}), // updateMarketingConsent.mutate({agreed})
    signOut: fromPromise(async (): Promise<void> => {}),
  },
  actions: {
    setUserOverride: () => {}, // 토글 즉시 로컬 override(낙관적) 기록
    invalidateMe: () => {},    // invalidate(getMe)
    toast: () => {},           // '변경되었습니다' 2초
  },
}).createMachine({
  id: 'settingsPage',
  context: {},
  initial: 'idle',
  states: {
    idle: {
      on: {
        TOGGLE_MARKETING: { target: 'savingMarketing' },
        LOGOUT: { target: 'loggingOut' },
      },
    },
    savingMarketing: {
      invoke: {
        src: 'updateMarketing',
        onDone: { target: 'idle', actions: ['invalidateMe', 'toast'] },
        onError: { target: 'idle' }, // 에러 콜백 없음 → 머무름
      },
    },
    loggingOut: {
      invoke: {
        src: 'signOut',
        onDone: { target: 'loggedOut' },
      },
    },
    loggedOut: { type: 'final' }, // navigate(/login)
  },
});
