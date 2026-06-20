import { setup, assign } from 'xstate';

// ---------- Types ----------

export type LoadErrorKind = 'not_found' | 'forbidden' | 'network';

export interface InvitationEditContext {
  /** 데이터 로딩 에러 종류 */
  loadError: LoadErrorKind | null;
  /** slug 검증 상태 */
  slugStatus: 'idle' | 'checking' | 'available' | 'taken' | 'error';
  /** 업로드 ���인 파일 수 */
  uploadsInProgress: number;
  /** 폼 검증 에��� 목록 */
  validationErrors: string[];
  /** 저장 시도 횟수 */
  saveAttempts: number;
  /** 저장 ���패 에러 메시지 */
  saveError: string | null;
  /** 폼이 수정되었는지 (dirty tracking) */
  isDirty: boolean;
  /** 서버 데이터와 충돌 발생 */
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
  | { type: 'UPLOAD_START' }
  | { type: 'UPLOAD_SUCCESS' }
  | { type: 'UPLOAD_ERROR'; error: string }
  | { type: 'SAVE' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; error: string }
  | { type: 'SAVE_CONFLICT' }
  | { type: 'RETRY' }
  | { type: 'FORCE_SAVE' }
  | { type: 'RELOAD_SERVER_DATA' }
  | { type: 'NAVIGATE_AWAY' }
  | { type: 'CONFIRM_LEAVE' }
  | { type: 'CANCEL_LEAVE' };

// ---------- Machine ----------

export const invitationEditMachine = setup({
  types: {
    context: {} as InvitationEditContext,
    events: {} as InvitationEditEvent,
  },
  guards: {
    isSlugAvailable: ({ context }) => context.slugStatus === 'available',
    hasNoUploadsInProgress: ({ context }) => context.uploadsInProgress === 0,
    isDirty: ({ context }) => context.isDirty,
    isNotDirty: ({ context }) => !context.isDirty,
    hasValidationErrors: ({ context }) => context.validationErrors.length > 0,
    isNetworkError: ({ context }) => context.loadError === 'network',
    isLastUpload: ({ context }) => context.uploadsInProgress <= 1,
  },
  actions: {
    markDirty: assign({ isDirty: true }),
    clearDirty: assign({ isDirty: false }),
    setLoadError: assign({ loadError: (_, params: { kind: LoadErrorKind }) => params.kind }),
    clearLoadError: assign({ loadError: null }),
    setSlugAvailable: assign({ slugStatus: 'available' }),
    setSlugTaken: assign({ slugStatus: 'taken' }),
    setSlugError: assign({ slugStatus: 'error' }),
    incrementUploads: assign({ uploadsInProgress: ({ context }) => context.uploadsInProgress + 1 }),
    decrementUploads: assign({ uploadsInProgress: ({ context }) => Math.max(0, context.uploadsInProgress - 1) }),
    incrementSaveAttempts: assign({ saveAttempts: ({ context }) => context.saveAttempts + 1 }),
    setSaveError: assign({ saveError: (_, params: { error: string }) => params.error }),
    clearSaveError: assign({ saveError: null }),
    setConflict: assign({ hasConflict: true }),
    clearConflict: assign({ hasConflict: false }),
  },
}).createMachine({
  /** @xstate-layout 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 */
  id: 'invitationEdit',
  type: 'parallel',

  context: {
    loadError: null,
    slugStatus: 'idle',
    uploadsInProgress: 0,
    validationErrors: [],
    saveAttempts: 0,
    saveError: null,
    isDirty: false,
    hasConflict: false,
  },

  states: {
    /** ��인 페이지 flow */
    flow: {
      initial: 'loading',
      states: {
        loading: {
          description: 'getWedding + getInvitation fetch',
          on: {
            LOAD_SUCCESS: { target: 'editing', actions: "clearLoadError" },
            LOAD_ERROR: {
              target: 'loadError',
              actions: {
                type: "setLoadError",
                params: ({ event }) => ({ kind: event.kind }),
              },
            },
          },
        },

        loadError: {
          description: '데이터 로딩 실패 — 에러 종류에 따라 UI 분기',
          on: {
            RETRY_LOAD: {
              guard: 'isNetworkError',
              target: 'loading',
              actions: "clearLoadError",
            },
          },
        },

        editing: {
          on: {
            FIELD_CHANGED: { actions: "markDirty" },
            SAVE: [
              {
                guard: 'hasNoUploadsInProgress',
                target: 'validating',
              },
            ],
            NAVIGATE_AWAY: [
              { guard: 'isDirty', target: 'confirmingLeave' },
              { guard: 'isNotDirty', target: 'left' },
            ],
          },
        },

        validating: {
          description: '필수 필드 검증 + slug 상��� 확인',
          always: [
            { guard: 'hasValidationErrors', target: 'editing' },
            {
              guard: 'isSlugAvailable',
              target: 'saving',
              actions: ["clearSaveError", "incrementSaveAttempts"],
            },
            { target: 'editing' },
          ],
        },

        saving: {
          description: 'updateWedding + updateInvitation API 호출',
          on: {
            SAVE_SUCCESS: { target: 'success', actions: "clearDirty" },
            SAVE_ERROR: {
              target: 'saveError',
              actions: {
                type: "setSaveError",
                params: ({ event }) => ({ error: event.error }),
              },
            },
            SAVE_CONFLICT: { target: 'conflict', actions: "setConflict" },
          },
        },

        saveError: {
          description: '저장 실패 — ��시도 또는 편집으로 복귀',
          on: {
            RETRY: { target: 'saving', actions: "incrementSaveAttempts" },
            FIELD_CHANGED: { target: 'editing', actions: ["markDirty", "clearSaveError"] },
          },
        },

        conflict: {
          description: '서버 데이터와 충돌 — 강제 저장 또는 서버 데이터 다시 로드',
          on: {
            FORCE_SAVE: { target: 'saving', actions: ["clearConflict", "incrementSaveAttempts"] },
            RELOAD_SERVER_DATA: { target: 'loading', actions: ["clearConflict", "clearDirty"] },
          },
        },

        success: {
          description: '저장 완료 — 컴포넌트에서 navigate 처��',
          type: 'final',
        },

        confirmingLeave: {
          description: '미저장 변경사항 경고 모달',
          on: {
            CONFIRM_LEAVE: { target: 'left' },
            CANCEL_LEAVE: { target: 'editing' },
          },
        },

        left: {
          description: '페이지 이탈 확정',
          type: 'final',
        },
      },
    },

    /** slug 검증 (메인 flow��� 병렬) */
    slug: {
      initial: 'idle',
      states: {
        idle: {
          on: { SLUG_CHECK_START: { target: 'checking' } },
        },
        checking: {
          on: {
            SLUG_AVAILABLE: { target: 'available' },
            SLUG_TAKEN: { target: 'taken' },
            SLUG_ERROR: { target: 'error' },
          },
        },
        available: {
          entry: "setSlugAvailable",
          on: { SLUG_CHECK_START: { target: 'checking' } },
        },
        taken: {
          entry: "setSlugTaken",
          on: { SLUG_CHECK_START: { target: 'checking' } },
        },
        error: {
          entry: "setSlugError",
          on: { SLUG_CHECK_START: { target: 'checking' } },
        },
      },
    },

    /** 이미지 업로드 추적 (메인 flow와 병렬) */
    upload: {
      initial: 'idle',
      states: {
        idle: {
          on: { UPLOAD_START: { target: 'uploading', actions: "incrementUploads" } },
        },
        uploading: {
          on: {
            UPLOAD_START: { actions: "incrementUploads" },
            UPLOAD_SUCCESS: [
              {
                guard: 'isLastUpload',
                target: 'idle',
                actions: "decrementUploads",
              },
              { actions: "decrementUploads" },
            ],
            UPLOAD_ERROR: [
              {
                guard: 'isLastUpload',
                target: 'idle',
                actions: "decrementUploads",
              },
              { actions: "decrementUploads" },
            ],
          },
        },
      },
    },
  },
});
