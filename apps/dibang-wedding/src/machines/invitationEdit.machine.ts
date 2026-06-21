import { setup, assign } from 'xstate';

// invitationEdit.machine — 청첩장 수정 페이지 flow (InvitationEditPage 연결, XS-7).
//
// parallel: flow(로딩→편집→저장→완료/충돌/이탈) + slug(중복검증 병렬).
// 역할분담(STATE_MANAGEMENT.md §4): 머신은 flow만. 로드/저장/slug체크 API는 페이지가
//   React Query로 호출하고 결과를 send로 회신한다. 폼 값은 zustand(useInvitationForm).
// upload 상태는 useInvitationImageUpload(파일별 자체 머신)가 SSOT — 여기선 SAVE 시
//   uploadingNow 플래그만 받는다(중복 상태 방지, invitationCreate.machine과 동일 패턴).
// 저장 게이트 = editing SAVE 가드 체인(업로드중 → 필수누락 → slug미확인 → toast 머무름, 통과 → saving).
// 저장 실패(SAVE_ERROR)는 editing 복귀 + 실패 toast(invitationCreate.machine과 동일) — 별도 saveError 상태를
//   두지 않는다(갇힘 방지). 사용자는 즉시 재저장 가능하고 toast로 실패를 통보받는다.

export type LoadErrorKind = 'not_found' | 'forbidden' | 'network';

export interface InvitationEditContext {
  /** 데이터 로딩 에러 종류 */
  loadError: LoadErrorKind | null;
  /** slug 검증 상태(slug 병렬과 동기) — 저장 가드용 */
  slugStatus: 'available' | 'checking' | 'taken' | 'error';
  /** 저장 차단/검증/실패 안내 통합 토스트 */
  toast: string | null;
  /** 저장 시도 횟수 */
  saveAttempts: number;
  /** 폼 수정 여부(이탈 경고용) */
  isDirty: boolean;
  /** 서버 데이터와 충돌(낙관잠금) */
  hasConflict: boolean;
}

export type InvitationEditEvent =
  | { type: 'LOAD_SUCCESS' }
  | { type: 'LOAD_ERROR'; kind: LoadErrorKind }
  | { type: 'RETRY_LOAD' }
  | { type: 'FIELD_CHANGED' }
  | { type: 'SLUG_CHECK_START' }
  | { type: 'SLUG_AVAILABLE' }
  | { type: 'SLUG_TAKEN' }
  | { type: 'SLUG_ERROR' }
  | { type: 'SAVE'; missing: string[]; uploadingNow: boolean }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; error: string }
  | { type: 'SAVE_CONFLICT' }
  | { type: 'FORCE_SAVE' }
  | { type: 'RELOAD_SERVER_DATA' }
  | { type: 'NAVIGATE_AWAY' }
  | { type: 'CONFIRM_LEAVE' }
  | { type: 'CANCEL_LEAVE' }
  | { type: 'DISMISS_TOAST' };

export const invitationEditMachine = setup({
  types: {
    context: {} as InvitationEditContext,
    events: {} as InvitationEditEvent,
  },
  guards: {
    uploadingNow: ({ event }) => event.type === 'SAVE' && event.uploadingNow,
    hasMissing: ({ event }) => event.type === 'SAVE' && event.missing.length > 0,
    slugNotAvailable: ({ context }) => context.slugStatus !== 'available',
    isDirty: ({ context }) => context.isDirty,
    isNotDirty: ({ context }) => !context.isDirty,
    isNetworkError: ({ context }) => context.loadError === 'network',
  },
  actions: {
    markDirty: assign({ isDirty: true }),
    clearDirty: assign({ isDirty: false }),
    setLoadError: assign({ loadError: (_, p: { kind: LoadErrorKind }) => p.kind }),
    clearLoadError: assign({ loadError: null }),
    setSlugChecking: assign({ slugStatus: 'checking' }),
    setSlugAvailable: assign({ slugStatus: 'available' }),
    setSlugTaken: assign({ slugStatus: 'taken' }),
    setSlugError: assign({ slugStatus: 'error' }),
    incrementSaveAttempts: assign({ saveAttempts: ({ context }) => context.saveAttempts + 1 }),
    toastUploadWait: assign({ toast: '사진 업로드가 끝나면 저장할 수 있어요' }),
    toastMissing: assign({
      toast: ({ event }) =>
        event.type === 'SAVE' && event.missing[0] ? `${event.missing[0]}을(를) 입력해주세요` : null,
    }),
    toastSlugCheck: assign({ toast: '공유 링크 중복 확인이 필요해요' }),
    toastSaveError: assign({ toast: (_, p: { error: string }) => p.error }),
    clearToast: assign({ toast: null }),
    setConflict: assign({ hasConflict: true }),
    clearConflict: assign({ hasConflict: false }),
  },
}).createMachine({
  id: 'invitationEdit',
  type: 'parallel',
  context: {
    loadError: null,
    slugStatus: 'available',
    toast: null,
    saveAttempts: 0,
    isDirty: false,
    hasConflict: false,
  },
  states: {
    /** 메인 페이지 flow */
    flow: {
      initial: 'loading',
      states: {
        loading: {
          description: 'getWedding + getInvitation fetch',
          on: {
            LOAD_SUCCESS: { target: 'editing', actions: 'clearLoadError' },
            LOAD_ERROR: {
              target: 'loadError',
              actions: {
                type: 'setLoadError',
                params: ({ event }) => ({ kind: event.type === 'LOAD_ERROR' ? event.kind : 'network' }),
              },
            },
          },
        },
        loadError: {
          description: '데이터 로딩 실패 — network면 재시도 가능',
          on: {
            RETRY_LOAD: { guard: 'isNetworkError', target: 'loading', actions: 'clearLoadError' },
          },
        },
        editing: {
          description: '편집 — 저장 가드 체인(업로드중→필수누락→slug미확인→통과)',
          on: {
            FIELD_CHANGED: { actions: 'markDirty' },
            SAVE: [
              { guard: 'uploadingNow', actions: 'toastUploadWait' },
              { guard: 'hasMissing', actions: 'toastMissing' },
              { guard: 'slugNotAvailable', actions: 'toastSlugCheck' },
              { target: 'saving', actions: ['clearToast', 'incrementSaveAttempts'] },
            ],
            DISMISS_TOAST: { actions: 'clearToast' },
            NAVIGATE_AWAY: [
              { guard: 'isDirty', target: 'confirmingLeave' },
              { target: 'left' },
            ],
          },
        },
        saving: {
          description: 'updateWedding + updateInvitation API 호출(컴포넌트가 결과 send)',
          entry: 'clearToast',
          on: {
            SAVE_SUCCESS: { target: 'success', actions: 'clearDirty' },
            // 저장 실패 → editing 복귀 + 실패 토스트(별도 상태 두지 않음, 갇힘 방지). 즉시 재저장 가능.
            SAVE_ERROR: {
              target: 'editing',
              actions: {
                type: 'toastSaveError',
                params: ({ event }) => ({ error: event.type === 'SAVE_ERROR' ? event.error : '저장에 실패했습니다.' }),
              },
            },
            SAVE_CONFLICT: { target: 'conflict', actions: 'setConflict' },
          },
        },
        conflict: {
          description: '서버 데이터 충돌(낙관잠금) — 강제 저장 또는 서버 데이터 재로드',
          on: {
            FORCE_SAVE: { target: 'saving', actions: ['clearConflict', 'incrementSaveAttempts'] },
            RELOAD_SERVER_DATA: { target: 'loading', actions: ['clearConflict', 'clearDirty'] },
          },
        },
        success: { description: '저장 완료 — 컴포넌트 navigate', type: 'final' },
        confirmingLeave: {
          description: '미저장 변경 경고 모달',
          on: {
            CONFIRM_LEAVE: { target: 'left' },
            CANCEL_LEAVE: { target: 'editing' },
          },
        },
        left: { description: '페이지 이탈 확정 — 컴포넌트 navigate', type: 'final' },
      },
    },

    /** slug 중복검증 (메인 flow와 병렬). Edit은 기존 slug=available에서 시작. */
    slug: {
      initial: 'available',
      states: {
        checking: {
          on: {
            SLUG_AVAILABLE: { target: 'available' },
            SLUG_TAKEN: { target: 'taken' },
            SLUG_ERROR: { target: 'error' },
          },
        },
        available: {
          entry: 'setSlugAvailable',
          on: { SLUG_CHECK_START: { target: 'checking', actions: 'setSlugChecking' } },
        },
        taken: {
          entry: 'setSlugTaken',
          on: { SLUG_CHECK_START: { target: 'checking', actions: 'setSlugChecking' } },
        },
        error: {
          entry: 'setSlugError',
          on: { SLUG_CHECK_START: { target: 'checking', actions: 'setSlugChecking' } },
        },
      },
    },
  },
});
