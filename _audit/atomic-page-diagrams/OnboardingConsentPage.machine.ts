// [Stately 관리용 스펙 모델 — 방향 A] OnboardingConsentPage.md 다이어그램에서 도출.
// 실제 페이지는 onboardingConsent.machine을 구동하며, 제출은 페이지가 mutateAsync 후
// SUBMIT_SUCCESS/SUBMIT_ERROR 이벤트를 send 하는 구조. 이 스펙은 동일 흐름을 invoke로 이상화.
// guards/actions/actors는 이름 참조용 stub. XState v5.
import { setup, fromPromise } from 'xstate';

export const onboardingConsentPageMachine = setup({
  types: {
    context: {} as {
      age: boolean;
      service: boolean;
      privacy: boolean;
      marketing: boolean; // 선택
      nextUrl: string;    // ?next || /my-wedding (값 변환)
      error: string | null;
    },
    events: {} as
      | { type: 'TOGGLE'; key: 'age' | 'service' | 'privacy' | 'marketing' }
      | { type: 'TOGGLE_ALL'; value: boolean }
      | { type: 'SUBMIT' }
      | { type: 'RETRY' }, // 선언만 되고 미처리(dead) — 다이어그램 충실 표기
  },
  actors: {
    // createConsents.mutateAsync({items: age·service·privacy·marketing})
    createConsents: fromPromise(async (): Promise<void> => {}),
  },
  actions: {
    toggleOne: () => {},   // ConsentRow 토글
    toggleAll: () => {},   // 전체 동의/해제
    clearError: () => {},
    setError: () => {},    // SUBMIT_ERROR
    onSuccess: () => {},   // getMe.consents_required=[] 낙관적 + invalidate(getMe) + navigate(nextUrl, replace)
  },
  guards: {
    canSubmit: () => false, // 필수3: age ∧ service ∧ privacy (marketing 무관)
  },
}).createMachine({
  id: 'onboardingConsentPage',
  context: {
    age: false,
    service: false,
    privacy: false,
    marketing: false,
    nextUrl: '/my-wedding',
    error: null,
  },
  initial: 'editing',
  states: {
    // 전체동의 + 필수3 + 선택1 체크박스 · '동의하고 시작'
    editing: {
      on: {
        TOGGLE: { actions: 'toggleOne' },        // 자기전이
        TOGGLE_ALL: { actions: 'toggleAll' },    // 자기전이
        // 버튼 disabled: !canSubmit ∨ submitting — guard로 표현
        SUBMIT: { guard: 'canSubmit', target: 'submitting', actions: 'clearError' },
        // RETRY: 미처리(dead)
      },
    },
    submitting: {
      invoke: {
        src: 'createConsents',
        onDone: { target: 'success' },                      // SUBMIT_SUCCESS
        onError: { target: 'editing', actions: 'setError' }, // SUBMIT_ERROR (editing서 에러 표시)
      },
    },
    // 진입 시: 낙관적 캐시 갱신 + invalidate + navigate(nextUrl, replace)
    success: { type: 'final', entry: 'onSuccess' },
  },
});
