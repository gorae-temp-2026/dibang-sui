import { setup, assign } from 'xstate';

// ---------- Types ----------

export type FetchErrorKind = 'not_found' | 'network';

export interface InvitationPageContext {
  /** 데이터 로딩 에러 종류 */
  fetchError: FetchErrorKind | null;
  /** 현재 활성 탭 */
  activeTab: 'invitation' | 'lounge';
  /** RSVP 제출 에러 */
  rsvpError: string | null;
  /** RSVP 중복 제출 방지 */
  rsvpSubmitted: boolean;
  /** 방명록 작성 에러 */
  guestbookError: string | null;
  /** heart 탭 누적 횟수 (디바운스 배치용) */
  heartTaps: number;
  /** heart API 에러 */
  heartError: string | null;
}

export type InvitationPageEvent =
  // Data fetch
  | { type: 'FETCH_SUCCESS' }
  | { type: 'FETCH_ERROR'; kind: FetchErrorKind }
  | { type: 'RETRY_FETCH' }
  // Tab
  | { type: 'TAB_CHANGE'; tab: 'invitation' | 'lounge' }
  // RSVP
  | { type: 'RSVP_TIMER_DONE' }
  | { type: 'RSVP_OPEN' }
  | { type: 'RSVP_CLOSE' }
  | { type: 'RSVP_SUBMIT' }
  | { type: 'RSVP_SUCCESS' }
  | { type: 'RSVP_ERROR'; error: string }
  | { type: 'RSVP_DUPLICATE' }
  // Guestbook
  | { type: 'GUESTBOOK_SUBMIT' }
  | { type: 'GUESTBOOK_SUCCESS' }
  | { type: 'GUESTBOOK_ERROR'; error: string }
  | { type: 'GUESTBOOK_ROLLBACK' }
  | { type: 'GUESTBOOK_LOAD_MORE' }
  | { type: 'GUESTBOOK_LOADED' }
  // Heart
  | { type: 'HEART_TAP' }
  | { type: 'HEART_FLUSH' }
  | { type: 'HEART_SUCCESS' }
  | { type: 'HEART_ERROR'; error: string };

// ---------- Machine ----------

export const invitationPageMachine = setup({
  types: {
    context: {} as InvitationPageContext,
    events: {} as InvitationPageEvent,
  },
  guards: {
    isAlreadySubmitted: ({ context }) => context.rsvpSubmitted,
    isNotSubmitted: ({ context }) => !context.rsvpSubmitted,
    isTargetLounge: ({ event }) => event.type === 'TAB_CHANGE' && event.tab === 'lounge',
    isTargetInvitation: ({ event }) => event.type === 'TAB_CHANGE' && event.tab === 'invitation',
  },
  actions: {
    setFetchError: assign({ fetchError: (_, params: { kind: FetchErrorKind }) => params.kind }),
    clearFetchError: assign({ fetchError: null }),
    setActiveTab: assign({ activeTab: (_, params: { tab: 'invitation' | 'lounge' }) => params.tab }),
    setRsvpError: assign({ rsvpError: (_, params: { error: string }) => params.error }),
    clearRsvpError: assign({ rsvpError: null }),
    markRsvpSubmitted: assign({ rsvpSubmitted: true }),
    setGuestbookError: assign({ guestbookError: (_, params: { error: string }) => params.error }),
    clearGuestbookError: assign({ guestbookError: null }),
    incrementHeartTaps: assign({ heartTaps: ({ context }) => context.heartTaps + 1 }),
    resetHeartTaps: assign({ heartTaps: 0 }),
    setHeartError: assign({ heartError: (_, params: { error: string }) => params.error }),
    clearHeartError: assign({ heartError: null }),
  },
}).createMachine({
  id: 'invitationPage',
  type: 'parallel',

  context: {
    fetchError: null,
    activeTab: 'invitation',
    rsvpError: null,
    rsvpSubmitted: false,
    guestbookError: null,
    heartTaps: 0,
    heartError: null,
  },

  states: {
    /** 데이터 로딩 flow */
    data: {
      initial: 'loading',
      states: {
        loading: {
          on: {
            FETCH_SUCCESS: { target: 'ready', actions: 'clearFetchError' },
            FETCH_ERROR: {
              target: 'error',
              actions: {
                type: 'setFetchError',
                params: ({ event }) => ({ kind: event.kind }),
              },
            },
          },
        },
        error: {
          on: {
            RETRY_FETCH: { target: 'loading', actions: 'clearFetchError' },
          },
        },
        ready: {
          type: 'final',
        },
      },
    },

    /** 탭 전환 */
    tab: {
      initial: 'invitation',
      states: {
        invitation: {
          on: {
            TAB_CHANGE: {
              guard: 'isTargetLounge',
              target: 'lounge',
              actions: { type: 'setActiveTab', params: { tab: 'lounge' } },
            },
          },
        },
        lounge: {
          on: {
            TAB_CHANGE: {
              guard: 'isTargetInvitation',
              target: 'invitation',
              actions: { type: 'setActiveTab', params: { tab: 'invitation' } },
            },
          },
        },
      },
    },

    /** RSVP flow */
    rsvp: {
      initial: 'idle',
      states: {
        idle: {
          description: '페이지 진입 후 타이머 대기',
          on: {
            RSVP_TIMER_DONE: { target: 'modalOpen' },
            RSVP_OPEN: { target: 'modalOpen' },
          },
        },
        modalOpen: {
          description: '모달 표시 — 폼 작성 중',
          on: {
            RSVP_CLOSE: { target: 'idle' },
            RSVP_SUBMIT: [
              { guard: 'isAlreadySubmitted', target: 'duplicate' },
              { guard: 'isNotSubmitted', target: 'submitting' },
            ],
          },
        },
        submitting: {
          description: 'RSVP API 호출 중',
          on: {
            RSVP_SUCCESS: { target: 'submitted', actions: ['markRsvpSubmitted', 'clearRsvpError'] },
            RSVP_ERROR: {
              target: 'modalOpen',
              actions: {
                type: 'setRsvpError',
                params: ({ event }) => ({ error: event.error }),
              },
            },
            RSVP_DUPLICATE: { target: 'duplicate', actions: 'markRsvpSubmitted' },
          },
        },
        submitted: {
          description: 'RSVP 제출 완료',
          on: {
            RSVP_OPEN: { target: 'duplicate' },
          },
        },
        duplicate: {
          description: '이미 제출됨 안내',
          on: {
            RSVP_CLOSE: { target: 'submitted' },
          },
        },
      },
    },

    /** 방명록 flow */
    guestbook: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            GUESTBOOK_SUBMIT: { target: 'submitting' },
            GUESTBOOK_LOAD_MORE: { target: 'loadingMore' },
          },
        },
        submitting: {
          description: '방명록 작성 → optimistic update 적용',
          on: {
            GUESTBOOK_SUCCESS: { target: 'idle', actions: 'clearGuestbookError' },
            GUESTBOOK_ERROR: {
              target: 'submitError',
              actions: {
                type: 'setGuestbookError',
                params: ({ event }) => ({ error: event.error }),
              },
            },
          },
        },
        submitError: {
          description: '작성 실패 — optimistic update 롤백',
          on: {
            GUESTBOOK_ROLLBACK: { target: 'idle' },
            GUESTBOOK_SUBMIT: { target: 'submitting', actions: 'clearGuestbookError' },
          },
        },
        loadingMore: {
          description: '다음 페이지 로딩',
          on: {
            GUESTBOOK_LOADED: { target: 'idle' },
            GUESTBOOK_ERROR: {
              target: 'idle',
              actions: {
                type: 'setGuestbookError',
                params: ({ event }) => ({ error: event.error }),
              },
            },
          },
        },
      },
    },

    /** Heart(좋아요) flow */
    heart: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            HEART_TAP: { target: 'tapped', actions: 'incrementHeartTaps' },
          },
        },
        tapped: {
          description: '탭 후 디바운스 대기 (추가 탭 수집)',
          on: {
            HEART_TAP: { actions: 'incrementHeartTaps' },
            HEART_FLUSH: { target: 'sending' },
          },
        },
        sending: {
          description: '누적 탭 수를 서버에 전송',
          on: {
            HEART_SUCCESS: { target: 'idle', actions: ['resetHeartTaps', 'clearHeartError'] },
            HEART_ERROR: {
              target: 'idle',
              actions: [
                'resetHeartTaps',
                { type: 'setHeartError', params: ({ event }) => ({ error: event.error }) },
              ],
            },
          },
        },
      },
    },
  },
});
