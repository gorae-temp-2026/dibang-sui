import { setup, assign } from 'xstate';

// invitation.machine — 게스트 청첩장 페이지(InvitationPage) flow (XS-8).
//
// parallel 3축: data(로딩) + tab(청첩장/라운지 전환) + rsvp(참석 회신 모달).
// InvitationPage가 실제 쓰는 흐름만 둔다:
//   - 방명록(guestbook)은 라운지 영역(GuestFlow/라운지) 소관 — InvitationPage엔 없음.
//   - 좋아요(heart)는 useHeartInvitationOnce(once + 디바운스 자체 훅)가 SSOT — 머신 밖
//     (invitationImageUpload와 동일한 '자체 훅이 SSOT면 머신은 그 상태를 중복 보유하지 않는다' 원칙).
// 역할분담(STATE_MANAGEMENT.md §4): API 호출은 페이지가 React Query/SDK로, 머신은 flow만 제어.

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
  | { type: 'RSVP_DUPLICATE' };

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
  },
}).createMachine({
  /** @xstate-layout invitation-page-3axis */
  id: 'invitationPage',
  type: 'parallel',

  context: {
    fetchError: null,
    activeTab: 'invitation',
    rsvpError: null,
    rsvpSubmitted: false,
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
                params: ({ event }) => ({ kind: event.type === 'FETCH_ERROR' ? event.kind : 'network' }),
              },
            },
          },
        },
        error: {
          on: { RETRY_FETCH: { target: 'loading', actions: 'clearFetchError' } },
        },
        ready: { type: 'final' },
      },
    },

    /** 탭 전환 (청첩장 ↔ 라운지) */
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

    /** RSVP flow (진입 타이머 → 모달 → 제출/중복) */
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
                params: ({ event }) => ({ error: event.type === 'RSVP_ERROR' ? event.error : 'RSVP 제출에 실패했습니다.' }),
              },
            },
            RSVP_DUPLICATE: { target: 'duplicate', actions: 'markRsvpSubmitted' },
          },
        },
        submitted: {
          description: 'RSVP 제출 완료',
          on: { RSVP_OPEN: { target: 'duplicate' } },
        },
        duplicate: {
          description: '이미 제출됨 안내',
          on: { RSVP_CLOSE: { target: 'submitted' } },
        },
      },
    },
  },
});
