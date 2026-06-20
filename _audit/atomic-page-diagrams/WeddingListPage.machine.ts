// [Stately 관리용 스펙 모델 — 방향 A] WeddingListPage.md 다이어그램에서 도출.
// guards/actions/actors는 이름 참조용 stub. XState v5.
// 주: loaded의 예정/지난 분리·빈상태는 데이터 파생 렌더(상태 아님). 카드 클릭만 흐름 전이.
import { setup, fromPromise } from 'xstate';

export const weddingListPageMachine = setup({
  types: {
    context: {} as Record<string, never>,
    events: {} as { type: 'OPEN_LOUNGE' },
  },
  actors: {
    joinWedding: fromPromise(async (): Promise<void> => {}),       // ?weddingId 있으면 1회
    getParticipated: fromPromise(async (): Promise<unknown[]> => []),
  },
  actions: {
    removeParams: () => {}, // onSettled: URL ?weddingId·?entryId 제거(replace)
  },
  guards: {
    hasJoinParam: () => false, // ?weddingId 있음 ∧ joinedRef 미실행
  },
}).createMachine({
  id: 'weddingListPage',
  context: {},
  initial: 'init',
  states: {
    init: {
      always: [
        { guard: 'hasJoinParam', target: 'joining' },
        { target: 'loading' },
      ],
    },
    // joinWedding.mutate({weddingId,entryId}) — onSettled(성공/실패 무관) → param 제거 후 로드
    joining: {
      invoke: {
        src: 'joinWedding',
        onDone: { target: 'loading', actions: 'removeParams' },
        onError: { target: 'loading', actions: 'removeParams' },
      },
    },
    loading: {
      invoke: {
        src: 'getParticipated',
        onDone: { target: 'loaded' },
        onError: { target: 'loaded' },
      },
    },
    // 예정/지난 분리 + 빈상태는 데이터 파생 렌더. 카드 클릭만 전이.
    loaded: {
      on: { OPEN_LOUNGE: { target: 'navigatedLounge' } },
    },
    navigatedLounge: { type: 'final' }, // navigate(/lounge/:loungeId/v2)
  },
});
