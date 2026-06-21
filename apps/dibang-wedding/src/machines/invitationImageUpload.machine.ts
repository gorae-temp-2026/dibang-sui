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
 *
 * ▶ 설계 근거 (XS-6 — reducer형이 정석인 이유):
 *   단일 상태 'active' + items[] reducer가 정석이다. 여러 파일이 동시에 서로 다른
 *   단계(하나 uploading·하나 done·하나 failed)에 있으므로, 머신 '전체'를
 *   idle/uploading/settling 같은 단계 상태로 나누면 파일별 독립성이 깨진다.
 *   진행 상태는 파일(item)별로 보유하고, 머신은 그 컬렉션을 관리하는 오케스트레이터다.
 *   (STATE_MANAGEMENT.md '병렬 독립 항목 오케스트레이션' 케이스)
 *   ▷ 단건 업로드 내부 파이프라인(HEIC변환·압축·presign·PUT·검증)을 statechart로
 *     펼친 uploadItem.machine을 각 파일 actor로 invoke하면 더 세분화·시각화할 수
 *     있으나, uploadItem은 현재 설계/시뮬용(프로덕션 미연결)이라 그 통합 여부는
 *     XS-9(design/uploadItem 정리)에서 결정한다.
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
  /** @xstate-layout N4IgpgJg5mDOIC5QEsB2A3ZAXAhl5A9qgJIC2OMAqgA4A2BOEAdDgMb7pgDEAggCJ8A+gDFiAGQCiAZQDaABgC6iUNQKxshVMpAAPRACYArIYA0IAJ6IA7EYC+ts2ky58RMhTA16jFu2ScuYgAVCQBZQT4AeQA5CXklJBBVdVctRL0EI1MLRAAOADZDe0cMbDxNdyo6BmY2Dm5gsJEecQk+eO1kjSJtDKyzSwQARkLikCcy1MrPap86-24AJQkgxYBNDsSu1N6DYwHEAGY5Iodx0pcK8irvWr8A5dDIgDU4xU61brTQPv2chAALADTiVnOU3NcZrdfPUuABhSQ8RabFSfHbpPbZQaGXKnM6oAgQODaCaXCEeLw1D4pTS7BAAWgBuQODKGhkOY1J4JIkMpc3uYGpXzp+TkLKGAE59PZ7EA */
  id: 'invitationImageUpload',
  context: { items: [] },
  initial: 'active',
  states: {
    active: {
      on: {
        ADD_FILES: { actions: "addItems" },
        ITEM_DONE: { actions: "markItemDone" },
        ITEM_FAILED: { actions: "markItemFailed" },
        RETRY: { actions: "retryItem" },
        REMOVE: { actions: "removeItem" },
        CLEAR: { actions: "clearItems" },
      },
    },
  },
});
