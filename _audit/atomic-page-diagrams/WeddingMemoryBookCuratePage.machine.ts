// [Stately 관리용 스펙 모델 — 방향 A] WeddingMemoryBookCuratePage.md 다이어그램에서 도출.
// 머신 없음(페이지 흐름 이상화 스펙). guards/actions/actors는 이름 참조용 stub. XState v5.
import { setup, fromPromise } from 'xstate';

export const weddingMemoryBookCuratePageMachine = setup({
  types: {
    context: {} as { saveError: string | null },
    events: {} as
      | { type: 'TOGGLE' }      // 사진 토글(30장 cap)
      | { type: 'PHOTO_CLICK' } // 라이트박스
      | { type: 'SAVE' }
      | { type: 'CANCEL' }      // 빈 선택 다이얼로그 취소
      | { type: 'CONFIRM' },    // 빈 선택 다이얼로그 나가기
  },
  actors: {
    // groups + memoryBook 병렬 조회 + signedUrls(paths 파생)
    loadCurate: fromPromise(async (): Promise<{ groups: unknown[] }> => ({ groups: [] })),
    replaceCurated: fromPromise(async (): Promise<void> => {}), // ({photo_ids})
  },
  actions: {
    handleToggle: () => {}, // 이미선택 해제 / 30 미만 추가(31번째 무시) + 토스트 리셋
    openLightbox: () => {},
    setSaveError: () => {},
  },
  guards: {
    isEmptyGroups: ({ event }) => ((event as { output?: { groups?: unknown[] } }).output?.groups ?? []).length === 0,
    isEmptySelection: () => false, // selectedIds 0건
  },
}).createMachine({
  id: 'weddingMemoryBookCuratePage',
  context: { saveError: null },
  initial: 'loading',
  states: {
    // isLoading(groups ∨ memoryBook) 동안 머무름(invoke pending)
    loading: {
      invoke: {
        src: 'loadCurate',
        onDone: [
          { guard: 'isEmptyGroups', target: 'empty' }, // groups 0건
          { target: 'grid' },
        ],
        onError: { target: 'errScreen' }, // hasError(groups ∨ memoryBook)
      },
    },
    errScreen: { type: 'final' }, // '사진 불러오기 실패'(정지)
    empty: {},                    // '아직 공유된 사진이 없어요'(빈 상태)

    // selectedIds = userSelected ?? serverInitialSelected ?? [] (데이터 파생)
    grid: {
      on: {
        TOGGLE: { actions: 'handleToggle' },     // 자기전이
        PHOTO_CLICK: { actions: 'openLightbox' }, // 자기전이
        SAVE: { target: 'saveCheck' },            // [!isPending]
      },
    },
    saveCheck: {
      always: [
        { guard: 'isEmptySelection', target: 'confirmEmpty' },
        { target: 'performing' },
      ],
    },
    confirmEmpty: {
      on: {
        CANCEL: { target: 'grid' },
        CONFIRM: { target: 'performing' }, // 나가기
      },
    },
    performing: {
      invoke: {
        src: 'replaceCurated',
        onDone: { target: 'savedDelay' },
        onError: { target: 'grid', actions: 'setSaveError' },
      },
    },
    // 성공 → 600ms 후 navigate
    savedDelay: {
      after: { 600: { target: 'exitDone' } },
    },
    exitDone: { type: 'final' }, // navigate(0건이면 /my-wedding, 아니면 /memory-book, replace)
  },
});
