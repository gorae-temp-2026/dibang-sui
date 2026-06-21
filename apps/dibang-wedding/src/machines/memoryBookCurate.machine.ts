import { setup, assign } from 'xstate';

// memoryBookCurate.machine — WeddingMemoryBookCuratePage flow (XS-15).
// parallel 3축:
//   - data: 그룹/메모리북 로딩 표시(loading→loaded/error). 빈 상태(groups.length===0)는 데이터 파생.
//   - save: 저장 flow(빈 선택 확인 → saving → 성공/에러). 토글 시 토스트 리셋.
//   - lightbox: 사진 확대 open/close + 현재 index.
// 선택 목록(userSelected)·signedUrls 등 데이터는 React Query/useState가 SSOT —
// 머신은 로딩 표시 + 저장 flow + 라이트박스 flow만 제어(STATE_MANAGEMENT §4).

export interface CurateContext {
  saveError: string | null;
  lightboxIndex: number | null;
}

export type CurateEvent =
  | { type: 'LOAD_DONE' }
  | { type: 'LOAD_ERROR' }
  | { type: 'SAVE' } // 선택 있음 → 저장
  | { type: 'SAVE_EMPTY' } // 선택 없음 → 빈 확인 다이얼로그
  | { type: 'CONFIRM_EMPTY' } // 빈 확인 → 저장
  | { type: 'CANCEL_EMPTY' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; error: string }
  | { type: 'RESET_TOAST' } // 선택 토글 시 성공/에러 토스트 리셋
  | { type: 'OPEN_LIGHTBOX'; index: number }
  | { type: 'CHANGE_LIGHTBOX'; index: number }
  | { type: 'CLOSE_LIGHTBOX' };

export const memoryBookCurateMachine = setup({
  types: { context: {} as CurateContext, events: {} as CurateEvent },
  actions: {
    setSaveError: assign({ saveError: (_, p: { error: string }) => p.error }),
    clearSaveError: assign({ saveError: null }),
    setLightbox: assign({ lightboxIndex: (_, p: { index: number }) => p.index }),
    closeLightbox: assign({ lightboxIndex: null }),
  },
}).createMachine({
  id: 'memoryBookCurate',
  type: 'parallel',
  context: { saveError: null, lightboxIndex: null },
  states: {
    data: {
      initial: 'loading',
      states: {
        loading: { on: { LOAD_DONE: 'loaded', LOAD_ERROR: 'error' } },
        loaded: {},
        error: {},
      },
    },
    save: {
      initial: 'idle',
      states: {
        idle: {
          on: { SAVE: 'saving', SAVE_EMPTY: 'confirmingEmpty' },
        },
        confirmingEmpty: {
          on: { CONFIRM_EMPTY: 'saving', CANCEL_EMPTY: 'idle' },
        },
        saving: {
          on: {
            SAVE_SUCCESS: { target: 'success', actions: 'clearSaveError' },
            SAVE_ERROR: {
              target: 'error',
              actions: { type: 'setSaveError', params: ({ event }) => ({ error: event.type === 'SAVE_ERROR' ? event.error : '저장에 실패했습니다.' }) },
            },
          },
        },
        success: {
          // 저장 성공 후 컴포넌트가 navigate. 토글로 토스트 리셋 가능.
          on: { RESET_TOAST: { target: 'idle', actions: 'clearSaveError' } },
        },
        error: {
          on: {
            RESET_TOAST: { target: 'idle', actions: 'clearSaveError' },
            SAVE: 'saving',
            SAVE_EMPTY: 'confirmingEmpty',
          },
        },
      },
    },
    lightbox: {
      initial: 'closed',
      states: {
        closed: {
          on: {
            OPEN_LIGHTBOX: {
              target: 'open',
              actions: { type: 'setLightbox', params: ({ event }) => ({ index: event.type === 'OPEN_LIGHTBOX' ? event.index : 0 }) },
            },
          },
        },
        open: {
          on: {
            CHANGE_LIGHTBOX: {
              actions: { type: 'setLightbox', params: ({ event }) => ({ index: event.type === 'CHANGE_LIGHTBOX' ? event.index : 0 }) },
            },
            CLOSE_LIGHTBOX: { target: 'closed', actions: 'closeLightbox' },
          },
        },
      },
    },
  },
});
