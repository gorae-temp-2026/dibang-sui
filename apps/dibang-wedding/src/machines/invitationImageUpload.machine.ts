import { assign, setup } from 'xstate';

/**
 * 청첩장 에디터 이미지 업로드 머신 (커버·갤러리 공용 — 페이지가 인스턴스 분리).
 *
 * 낙관적 UI: ADD_FILES 즉시 localUrl(objectURL)로 미리보기를 띄우고,
 * 업로드는 백그라운드 진행 — 결과가 ITEM_DONE/ITEM_FAILED로 돌아온다.
 * 파일별 독립: 한 아이템의 실패가 다른 아이템 상태에 영향을 주지 않는다.
 *
 * 업로드 실행은 머신 밖 — 훅(useInvitationImageUpload)이 ADD_FILES 후
 * 아이템별로 React Query mutation을 호출하고 결과를 send로 돌려준다.
 * (STATE_MANAGEMENT.md §machine 작성 규칙 4: machine이 직접 fetch하지 않는다)
 *
 * localUrl 해제: REMOVE/CLEAR에서 revokeObjectURL. done 시에는 해제하지
 * 않는다 — 서버 이미지가 로드되기 전 미리보기가 깜빡이는 것을 막기 위해
 * 페이지 이탈(CLEAR)까지 유지한다.
 */

export type UploadItemStatus = 'uploading' | 'done' | 'failed';

export interface InvitationUploadItem {
  id: string;
  file: File;
  localUrl: string;
  serverUrl?: string;
  status: UploadItemStatus;
  error?: string;
}

interface Context {
  items: InvitationUploadItem[];
}

type Event =
  | { type: 'ADD_FILES'; files: File[] }
  | { type: 'ITEM_DONE'; id: string; serverUrl: string }
  | { type: 'ITEM_FAILED'; id: string; error: string }
  | { type: 'RETRY'; id: string }
  | { type: 'REMOVE'; id: string }
  | { type: 'CLEAR' };

function newItemId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const invitationImageUploadMachine = setup({
  types: {
    context: {} as Context,
    events: {} as Event,
  },
  actions: {
    addItems: assign({
      items: ({ context, event }) => {
        if (event.type !== 'ADD_FILES') return context.items;
        const added = event.files.map<InvitationUploadItem>((file) => ({
          id: newItemId(),
          file,
          localUrl: URL.createObjectURL(file),
          status: 'uploading',
        }));
        return [...context.items, ...added];
      },
    }),
    markItemDone: assign({
      items: ({ context, event }) => {
        if (event.type !== 'ITEM_DONE') return context.items;
        return context.items.map((it) =>
          it.id === event.id && it.status === 'uploading'
            ? { ...it, status: 'done' as const, serverUrl: event.serverUrl, error: undefined }
            : it,
        );
      },
    }),
    markItemFailed: assign({
      items: ({ context, event }) => {
        if (event.type !== 'ITEM_FAILED') return context.items;
        return context.items.map((it) =>
          it.id === event.id && it.status === 'uploading'
            ? { ...it, status: 'failed' as const, error: event.error }
            : it,
        );
      },
    }),
    retryItem: assign({
      items: ({ context, event }) => {
        if (event.type !== 'RETRY') return context.items;
        return context.items.map((it) =>
          it.id === event.id && it.status === 'failed'
            ? { ...it, status: 'uploading' as const, error: undefined }
            : it,
        );
      },
    }),
    removeItem: assign({
      items: ({ context, event }) => {
        if (event.type !== 'REMOVE') return context.items;
        const target = context.items.find((it) => it.id === event.id);
        if (target) URL.revokeObjectURL(target.localUrl);
        return context.items.filter((it) => it.id !== event.id);
      },
    }),
    clearItems: assign({
      items: ({ context }) => {
        for (const it of context.items) URL.revokeObjectURL(it.localUrl);
        return [];
      },
    }),
  },
}).createMachine({
  id: 'invitationImageUpload',
  context: { items: [] },
  initial: 'active',
  states: {
    active: {
      on: {
        ADD_FILES: { actions: 'addItems' },
        ITEM_DONE: { actions: 'markItemDone' },
        ITEM_FAILED: { actions: 'markItemFailed' },
        RETRY: { actions: 'retryItem' },
        REMOVE: { actions: 'removeItem' },
        CLEAR: { actions: 'clearItems' },
      },
    },
  },
});
