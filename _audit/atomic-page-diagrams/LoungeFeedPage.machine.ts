// [Stately 관리용 스펙 모델 — 방향 A] LoungeFeedPage.md 다이어그램에서 도출.
// 실제 페이지는 loungeFeed.machine으로 '피드 영역만' 관장(loading/idle/refreshing/error)하고
// 헤더·공지·참여자는 페이지 측 병렬 관심사. 이 스펙은 페이지 전체를 parallel 리전으로 이상화.
// guards/actions/actors는 이름 참조용 stub. XState v5.
import { setup, fromPromise } from 'xstate';

export const loungeFeedPageMachine = setup({
  types: {
    context: {} as { error: string | null; refreshAttempts: number },
    events: {} as
      | { type: 'BACK' }
      | { type: 'REFRESH' } // 풀다운(pullDistance>80 ∧ idle)
      | { type: 'POLL' } // 5초 폴링 — 백그라운드, 상태 무변
      | { type: 'FETCH_NEXT' } // 무한스크롤 — 백그라운드, 상태 무변
      | { type: 'RETRY' }
      | { type: 'OPEN_ANNOUNCE' }
      | { type: 'OPEN_PARTICIPANTS' }
      | { type: 'SUBMIT_ANNOUNCE' } // 공지 제출
      | { type: 'DELETE_ANNOUNCE' } // 공지 삭제
      | { type: 'CLOSE_ANNOUNCE' }
      | { type: 'CLOSE_PARTICIPANTS' },
  },
  actors: {
    loadHeader: fromPromise(async (): Promise<void> => {}),   // lounge/wedding 쿼리(스켈레톤 게이트)
    loadFeed: fromPromise(async (): Promise<void> => {}),     // feedQuery 최초 로드
    refetchFeed: fromPromise(async (): Promise<void> => {}),  // refetch()
    createAnnounce: fromPromise(async (): Promise<void> => {}), // createAnnouncement.mutate
  },
  actions: {
    ensureCheckIn: () => {},  // 마운트 1회·ref가드·실패 무시 (createLoungeCheckIn 백그라운드)
    clearError: () => {},
    setError: () => {},
    incAttempts: () => {},
    resetAttempts: () => {},
    deleteAnnounce: () => {}, // deleteAnnouncement.mutate
  },
  guards: {
    hasLoungeId: () => true,
  },
}).createMachine({
  id: 'loungeFeedPage',
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

    // 스켈레톤 게이트: (lounge∨wedding 로딩) ∧ weddingInfo 없음 동안 머무름(invoke pending)
    loadingHeader: {
      entry: 'ensureCheckIn',
      invoke: {
        src: 'loadHeader',
        onDone: { target: 'ready' },
        onError: { target: 'ready' }, // 헤더는 값 변환으로 폴백('웨딩라운지')
      },
    },

    // 메인 화면: 헤더 ∥ 피드머신 ∥ 공지 ∥ 참여자 (동시)
    ready: {
      type: 'parallel',
      on: { BACK: { target: '#lfExited' } }, // 헤더 뒤로가기 (화면 어디서든)
      states: {
        // ── 피드 리전 (loungeFeed.machine 대응) ──
        feed: {
          initial: 'loading',
          states: {
            loading: {
              invoke: {
                src: 'loadFeed',
                onDone: { target: 'idle', actions: 'clearError' },   // LOAD_SUCCESS
                onError: { target: 'error', actions: 'setError' },   // LOAD_ERROR
              },
            },
            // 피드 표시. empty/items 분기는 데이터 파생 렌더(상태 아님).
            idle: {
              on: {
                REFRESH: { target: 'refreshing', actions: 'incAttempts' },
                POLL: {},       // 백그라운드 갱신, 상태 무변
                FETCH_NEXT: {}, // 무한스크롤, 상태 무변
              },
            },
            refreshing: {
              invoke: {
                src: 'refetchFeed',
                onDone: { target: 'idle', actions: ['clearError', 'resetAttempts'] }, // REFRESH_SUCCESS
                onError: { target: 'idle', actions: 'setError' }, // REFRESH_ERROR (메시지 미표시)
              },
            },
            error: {
              on: { RETRY: { target: 'loading', actions: 'clearError' } },
            },
          },
        },
        // ── 공지 리전 (Host) ──
        announce: {
          initial: 'closed',
          states: {
            closed: { on: { OPEN_ANNOUNCE: { target: 'open' } } },
            open: {
              on: {
                CLOSE_ANNOUNCE: { target: 'closed' },
                SUBMIT_ANNOUNCE: { target: 'submitting' },
                DELETE_ANNOUNCE: { actions: 'deleteAnnounce' }, // 자기전이
              },
            },
            submitting: {
              invoke: {
                src: 'createAnnounce',
                onDone: { target: 'closed' }, // 성공 → 폼 닫기
                onError: { target: 'open' },  // 실패 → 폼 유지
              },
            },
          },
        },
        // ── 참여자 리전 ──
        participant: {
          initial: 'closed',
          states: {
            closed: { on: { OPEN_PARTICIPANTS: { target: 'open' } } },
            open: { on: { CLOSE_PARTICIPANTS: { target: 'closed' } } },
          },
        },
      },
    },
    exited: { id: 'lfExited', type: 'final' }, // 뒤로 → /my-wedding
  },
});
