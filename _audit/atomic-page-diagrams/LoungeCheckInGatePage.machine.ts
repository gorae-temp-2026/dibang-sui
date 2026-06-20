// [Stately 관리용 스펙 모델 — 방향 A] LoungeCheckInGatePage.md 다이어그램에서 도출.
// 실제 페이지는 loungeCheckInGate.machine을 구동하되 비동기는 actor가 아닌 페이지 측(쿼리/mutate)
// 이며 결과를 CHECK_*/SUBMIT_* 이벤트로 send. 이 스펙은 동일 흐름을 invoke로 이상화.
// guards/actions/actors는 이름 참조용 stub. XState v5.
import { setup, fromPromise } from 'xstate';

export const loungeCheckInGatePageMachine = setup({
  types: {
    context: {} as {
      existingEntryId: string | null;
      createdEntryId: string | null;
      error: string | null;
    },
    events: {} as { type: 'SUBMIT' } | { type: 'RETRY' },
  },
  actors: {
    checkMyCheckIn: fromPromise(async (): Promise<{ entry?: unknown }> => ({})), // useCheckMyCheckIn
    updateMe: fromPromise(async (): Promise<void> => {}),       // updateMe.mutateAsync({name})
    createEntry: fromPromise(async (): Promise<{ entryId: string }> => ({ entryId: '' })), // createEntry.mutateAsync
  },
  actions: {
    parsePrefill: () => {},      // 쿼리 prefill 파싱·검증(enum 밖→null) · 폼 init
    setExistingEntry: () => {},  // CHECK_SUCCESS
    setCreatedEntry: () => {},   // SUBMIT_SUCCESS(entryId)
    setError: () => {},
    clearError: () => {},
  },
  guards: {
    needsLogin: () => false,        // isReady ∧ !session
    hasExistingEntry: ({ event }) => Boolean((event as { output?: { entry?: unknown } }).output?.entry),
    autoSubmittable: () => false,   // hasQueryPrefill ∧ isFormValid (autoSubmittedRef 1회)
    nameChanged: () => false,       // trim(name) ∧ name ≠ me.name
  },
}).createMachine({
  id: 'loungeCheckInGatePage',
  context: { existingEntryId: null, createdEntryId: null, error: null },
  initial: 'authGate',
  states: {
    authGate: {
      always: [
        { guard: 'needsLogin', target: 'toLogin' },
        { target: 'checking', actions: 'parsePrefill' }, // 세션 있음/대기 → prefill 후 확인
      ],
    },
    toLogin: { type: 'final' }, // → /login?redirect=enter+쿼리

    // '확인 중...' (쿼리 로딩 동안 머무름 = invoke pending)
    checking: {
      invoke: {
        src: 'checkMyCheckIn',
        onDone: [
          { guard: 'hasExistingEntry', target: 'hasEntry', actions: 'setExistingEntry' },
          { target: 'form' }, // entry 없음
        ],
        onError: { target: 'error', actions: 'setError' },
      },
    },
    hasEntry: { type: 'final' }, // navigate v2(replace)
    error: {
      on: { RETRY: { target: 'checking', actions: 'clearError' } },
    },

    // 입장 게이트: 폼 표시·수동 입력(flat) · isFormValid=이름∧수신인∧관계
    form: {
      id: 'cgForm',
      always: [
        { guard: 'autoSubmittable', target: 'submitting' }, // 자동입장(1회)
      ],
      on: {
        SUBMIT: { target: 'submitting' }, // '라운지 입장하기' [isFormValid]
      },
    },

    // '입장 중...' — 이름 변경 시 updateMe→createEntry, 각 실패는 form 복귀
    submitting: {
      initial: 'maybeUpdateName',
      states: {
        maybeUpdateName: {
          always: [
            { guard: 'nameChanged', target: 'updatingName' },
            { target: 'creatingEntry' },
          ],
        },
        updatingName: {
          invoke: {
            src: 'updateMe',
            onDone: { target: 'creatingEntry' },
            onError: { target: '#cgForm', actions: 'setError' }, // '이름 저장 실패'
          },
        },
        creatingEntry: {
          invoke: {
            src: 'createEntry',
            onDone: { target: '#cgDone', actions: 'setCreatedEntry' },
            onError: { target: '#cgForm', actions: 'setError' }, // '입장 실패'
          },
        },
      },
    },
    done: { id: 'cgDone', type: 'final' }, // navigate v2(replace)
  },
});
