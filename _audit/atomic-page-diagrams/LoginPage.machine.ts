// [Stately 관리용 스펙 모델 — 방향 A] LoginPage.md 다이어그램에서 도출.
// 실제 컴포넌트에 와이어링되지 않은 모델. guards/actions/actors는 이름 참조용 stub. XState v5.
import { setup, fromPromise } from 'xstate';

export const loginPageMachine = setup({
  types: {
    context: {} as { redirectAfter: string },
    events: {} as { type: 'SUBMIT_GOOGLE' } | { type: 'SUBMIT_EMAIL' },
  },
  actors: {
    // signInGoogle.mutate → onSuccess(data.url 있으면 window.location.href)
    googleSignIn: fromPromise(async (): Promise<{ url?: string }> => ({ url: undefined })),
    // signInPassword.mutate({email,password})
    emailSignIn: fromPromise(async (): Promise<void> => {}),
  },
  actions: {
    alertError: () => {}, // window.alert(에러 메시지)
  },
  guards: {
    // isReady && session — 이미 로그인된 사용자
    isAuthed: () => false,
    // devEmail && devPassword
    hasCreds: () => true,
    // signInGoogle 결과 data.url 존재
    hasOAuthUrl: ({ event }) => Boolean((event as { output?: { url?: string } }).output?.url),
  },
}).createMachine({
  id: 'loginPage',
  // redirectAfter = resolveSafeRedirect(?redirect) (값 변환, 컨텍스트 초기화)
  context: { redirectAfter: '/my-wedding' },
  initial: 'checkingAuth',
  states: {
    checkingAuth: {
      always: [
        { guard: 'isAuthed', target: 'redirected' },
        { target: 'form' },
      ],
    },
    form: {
      on: {
        SUBMIT_GOOGLE: { target: 'signingInGoogle' },
        SUBMIT_EMAIL: [
          { guard: 'hasCreds', target: 'signingInEmail' },
          { actions: 'alertError' }, // 이메일/비번 미입력 → alert, form 유지
        ],
      },
    },
    signingInGoogle: {
      invoke: {
        src: 'googleSignIn',
        onDone: [
          { guard: 'hasOAuthUrl', target: 'oauthRedirect' }, // window.location.href = data.url
          { target: 'form' }, // url 없음 → 무동작(머무름)
        ],
        onError: { target: 'form', actions: 'alertError' },
      },
    },
    signingInEmail: {
      invoke: {
        src: 'emailSignIn',
        onDone: { target: 'redirected' }, // navigate(redirectAfter)
        onError: { target: 'form', actions: 'alertError' },
      },
    },
    // navigate(redirectAfter, replace) — 이미 로그인 or 이메일 로그인 성공
    redirected: { type: 'final' },
    // window.location.href = data.url — 외부 Google OAuth
    oauthRedirect: { type: 'final' },
  },
});
