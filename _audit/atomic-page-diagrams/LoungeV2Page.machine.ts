// [Stately 관리용 스펙 모델 — 방향 A] LoungeV2Page.md 다이어그램에서 도출.
// loungeV2.machine은 loungeFeed와 동형(피드 영역만). 페이지 전체(Hero·피드·스토리·FAB·공지)를
// parallel 리전으로 이상화. 리전 간 이벤트 충돌 방지를 위해 이벤트명에 리전 접미사 사용.
// guards/actions/actors는 이름 참조용 stub. XState v5.
import { setup, fromPromise } from 'xstate';

export const loungeV2PageMachine = setup({
  types: {
    context: {} as { error: string | null; refreshAttempts: number },
    events: {} as
      | { type: 'SHARE_PHOTOS' } // Hero 버튼 → share-photos/upload 라우트 이탈
      | { type: 'OPEN_DISPLAY' } // 디스플레이 FAB → 새 탭
      | { type: 'REFRESH' }
      | { type: 'POLL' }
      | { type: 'FETCH_NEXT' }
      | { type: 'RETRY' }
      | { type: 'OPEN_STORY' }
      | { type: 'VIEW_ITEM' }
      | { type: 'CLOSE_STORY' }
      | { type: 'OPEN_COMPOSE' }
      | { type: 'SUBMIT_MEMORY' }
      | { type: 'CLOSE_COMPOSE' }
      | { type: 'OPEN_ANNOUNCE' }
      | { type: 'SUBMIT_ANNOUNCE' }
      | { type: 'DELETE_ANNOUNCE' }
      | { type: 'CLOSE_ANNOUNCE' },
  },
  actors: {
    loadHeader: fromPromise(async (): Promise<void> => {}),
    loadFeed: fromPromise(async (): Promise<void> => {}),
    refetchFeed: fromPromise(async (): Promise<void> => {}),
    uploadMemoryPhoto: fromPromise(async (): Promise<{ photoUrl: string }> => ({ photoUrl: '' })), // presigned memory
    createMemory: fromPromise(async (): Promise<void> => {}), // {text, asAnnounce:false, photoUrl?}
    createAnnounce: fromPromise(async (): Promise<void> => {}),
  },
  actions: {
    ensureCheckIn: () => {},     // 마운트 1회·실패 무시
    subscribeRealtime: () => {}, // useMemoriesRealtime → 변경 시 feed/memories invalidate(백그라운드)
    clearError: () => {},
    setError: () => {},
    incAttempts: () => {},
    resetAttempts: () => {},
    openDisplay: () => {},       // window.open(/display, 새 탭)
    recordView: () => {},        // recordView.mutate (fire-and-forget)
    setUploadError: () => {},
    setPostError: () => {},
    deleteAnnounce: () => {},
  },
  guards: {
    hasLoungeId: () => true,
    hasWeddingId: () => false, // 디스플레이 FAB 활성 조건
    isHost: () => false,       // 공지 FAB 노출 조건
    hasFile: () => false,      // compose: file 첨부 여부
  },
}).createMachine({
  id: 'loungeV2Page',
  context: { error: null, refreshAttempts: 0 },
  initial: 'gate',
  states: {
    gate: {
      always: [
        { guard: 'hasLoungeId', target: 'loadingHeader' },
        { target: 'deadLounge' },
      ],
    },
    deadLounge: { type: 'final' }, // 'loungeId 없음'(정지)

    loadingHeader: {
      entry: ['ensureCheckIn', 'subscribeRealtime'],
      invoke: {
        src: 'loadHeader',
        onDone: { target: 'ready' },
        onError: { target: 'ready' }, // Hero/헤더는 값 변환 폴백
      },
    },

    // Hero ∥ 피드 ∥ 스토리 ∥ FAB(compose) ∥ 공지
    ready: {
      type: 'parallel',
      on: {
        SHARE_PHOTOS: { target: '#v2Exited' },                                  // Hero 사진공유 → 이탈
        OPEN_DISPLAY: { guard: 'hasWeddingId', actions: 'openDisplay' },        // 디스플레이 FAB(있을 때만)
      },
      states: {
        // ── 피드 리전 (loungeFeed 동형) ──
        feed: {
          initial: 'loading',
          states: {
            loading: {
              invoke: {
                src: 'loadFeed',
                onDone: { target: 'idle', actions: 'clearError' },
                onError: { target: 'error', actions: 'setError' },
              },
            },
            idle: {
              on: {
                REFRESH: { target: 'refreshing', actions: 'incAttempts' },
                POLL: {},       // 5초 폴링·realtime invalidate, 상태 무변
                FETCH_NEXT: {}, // 무한스크롤, 상태 무변
              },
            },
            refreshing: {
              invoke: {
                src: 'refetchFeed',
                onDone: { target: 'idle', actions: ['clearError', 'resetAttempts'] },
                onError: { target: 'idle', actions: 'setError' }, // 미표시
              },
            },
            error: {
              on: { RETRY: { target: 'loading', actions: 'clearError' } },
            },
          },
        },
        // ── 스토리 리전 ──
        story: {
          initial: 'closed',
          states: {
            closed: { on: { OPEN_STORY: { target: 'open' } } },
            open: {
              on: {
                VIEW_ITEM: { actions: 'recordView' }, // fire-and-forget 자기전이
                CLOSE_STORY: { target: 'closed' },
              },
            },
          },
        },
        // ── 메모리 작성(compose) 리전 ──
        compose: {
          initial: 'closed',
          states: {
            closed: { id: 'v2ComposeClosed', on: { OPEN_COMPOSE: { target: 'open' } } },
            open: {
              id: 'v2ComposeOpen',
              on: {
                CLOSE_COMPOSE: { target: 'closed' },
                SUBMIT_MEMORY: { target: 'submitting' },
              },
            },
            submitting: {
              initial: 'decideFile',
              states: {
                decideFile: {
                  always: [
                    { guard: 'hasFile', target: 'uploading' },
                    { target: 'posting' },
                  ],
                },
                uploading: {
                  invoke: {
                    src: 'uploadMemoryPhoto',
                    onDone: { target: 'posting' },
                    onError: { target: '#v2ComposeOpen', actions: 'setUploadError' }, // ok:false
                  },
                },
                posting: {
                  invoke: {
                    src: 'createMemory',
                    onDone: { target: '#v2ComposeClosed' },                        // ok:true · 모달 닫기
                    onError: { target: '#v2ComposeOpen', actions: 'setPostError' }, // ok:false
                  },
                },
              },
            },
          },
        },
        // ── 공지 리전 (Host 전용) ──
        announce: {
          initial: 'closed',
          states: {
            closed: { on: { OPEN_ANNOUNCE: { guard: 'isHost', target: 'open' } } },
            open: {
              on: {
                CLOSE_ANNOUNCE: { target: 'closed' },
                SUBMIT_ANNOUNCE: { target: 'submitting' },
                DELETE_ANNOUNCE: { actions: 'deleteAnnounce' },
              },
            },
            submitting: {
              invoke: {
                src: 'createAnnounce',
                onDone: { target: 'closed' },
                onError: { target: 'open' },
              },
            },
          },
        },
      },
    },
    exited: { id: 'v2Exited', type: 'final' }, // navigate share-photos/upload
  },
});
