// [Stately 관리용 스펙 모델 — 방향 A] WeddingMemoryBookPage.md 다이어그램에서 도출.
// 머신 없음(페이지 흐름 이상화 스펙). guards/actions/actors는 이름 참조용 stub. XState v5.
import { setup, fromPromise } from 'xstate';

export const weddingMemoryBookPageMachine = setup({
  types: {
    context: {} as Record<string, never>,
    events: {} as { type: never },
  },
  actors: {
    getMemoryBook: fromPromise(async (): Promise<{ status: string; data?: unknown } | null> => null),
  },
  actions: {
    scrollTop: () => {}, // 진입 시 scrollTo(0,0)
  },
  guards: {
    hasWeddingId: () => true,
    noData: ({ event }) => !(event as { output?: unknown }).output, // data 없음
    isUncurated: ({ event }) =>
      (event as { output?: { status?: string } }).output?.status === 'ready_uncurated',
  },
}).createMachine({
  id: 'weddingMemoryBookPage',
  context: {},
  initial: 'gate',
  states: {
    gate: {
      always: [
        { guard: 'hasWeddingId', target: 'loading' },
        { target: 'dead' },
      ],
    },
    dead: { type: 'final' }, // '웨딩 정보가 없습니다'(정지)

    loading: {
      entry: 'scrollTop',
      invoke: {
        src: 'getMemoryBook',
        onDone: [
          { guard: 'noData', target: 'errScreen' },         // data 없음 → 불러올 수 없음
          { guard: 'isUncurated', target: 'redirectCurate' }, // ready_uncurated → 큐레이션
          { target: 'viewer' },                               // ready
        ],
        onError: { target: 'errScreen' }, // isError
      },
    },
    errScreen: { type: 'final' },      // '불러올 수 없습니다'(정지)
    redirectCurate: { type: 'final' }, // (effect) navigate(curate, replace)
    // ready: data.data 있으면 MemoryBookViewer / 없으면 null (데이터 파생 렌더)
    viewer: {},
  },
});
