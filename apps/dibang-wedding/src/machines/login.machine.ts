import { setup } from 'xstate';

// login.machine — LoginPage flow (XS-20).
// signIn: idle → signingGoogle / signingPassword → idle. 어떤 방식이 진행 중인지로
// 버튼 disabled(전체) / password 라벨('로그인 중...')을 결정한다.
// 폼값(devEmail/devPassword)은 useState, 실제 OAuth/password 호출은 mutation 훅 —
// 머신은 로그인 진행 flow만 제어(STATE_MANAGEMENT §4).

export type LoginEvent =
  | { type: 'SIGN_IN_GOOGLE' }
  | { type: 'SIGN_IN_PASSWORD' }
  | { type: 'SIGN_IN_DONE' }
  | { type: 'SIGN_IN_ERROR' };

export const loginMachine = setup({
  types: { events: {} as LoginEvent },
}).createMachine({
  id: 'login',
  initial: 'idle',
  states: {
    idle: {
      on: { SIGN_IN_GOOGLE: 'signingGoogle', SIGN_IN_PASSWORD: 'signingPassword' },
    },
    // OAuth는 보통 onSuccess에서 외부 이동(window.location.href)하지만, url 없거나 에러면 idle 복귀.
    signingGoogle: {
      on: { SIGN_IN_DONE: 'idle', SIGN_IN_ERROR: 'idle' },
    },
    signingPassword: {
      on: { SIGN_IN_DONE: 'idle', SIGN_IN_ERROR: 'idle' },
    },
  },
});
