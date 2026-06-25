import { setup, assign, fromCallback } from 'xstate';
import { presignedUpload, type PresignedUploadResult } from '../lib/presignedUpload';
import { translate, useLangStore } from '../lib/i18n';
const lang = () => useLangStore.getState().lang;

/**
 * Photo Sharing T-15a — 하객 현장사진 공유 업로드 머신.
 *
 * 시나리오 §3 / §11:
 *   idle → selecting → uploading(per file 병렬, 3-5 동시) → done | error
 *   - 100장/하객 클라이언트 가드 (서버 트랜잭션이 진정 race-safe하지만 UX용 사전 차단)
 *   - 진행률·취소·자동 재시도 1회는 presignedUpload 헬퍼가 담당
 *
 * UI/데이터 분리 P3-2: `uploading` state가 `presignedUploadActor` (fromCallback)를 invoke
 * 해 presignedUpload 호출과 register chain을 머신 내부로 흡수. page는 START 이벤트와
 * onRegister 콜백 주입만 책임. (이전엔 page가 await presignedUpload + send PROGRESS 직접
 * 라우팅)
 */

export interface FileProgress {
  index: number;
  name: string;
  percent: number; // 0..100
  state: 'queued' | 'converting' | 'requesting' | 'uploading' | 'done' | 'failed';
  error?: string;
}

/**
 * register 콜백 — page에서 React Query mutation(createSharedPhotoAsync) wrapping해 주입.
 * 캐시 invalidate가 mutation 안에 묶여 있으므로 actor가 SDK 직접 호출하지 않고 함수 위임.
 */
export type RegisterUploaded = (result: PresignedUploadResult) => Promise<void>;

export interface SharePhotoUploadContext {
  loungeId: string;
  /** 이미 본인이 이 라운지에 올린 누적 (서버에서 조회해 주입) */
  existingCount: number;
  files: File[];
  progress: FileProgress[];
  /** 업로드 완료된 storage_path 누적 */
  uploadedPaths: string[];
  error: string | null;
  /** page가 useMutation으로 만든 createSharedPhotoAsync wrapping. machine input으로 주입. */
  onRegister: RegisterUploaded;
}

export type SharePhotoUploadEvent =
  | { type: 'PICK'; files: File[] }
  | { type: 'CLEAR' }
  | { type: 'START' }
  | { type: 'PROGRESS'; index: number; state: FileProgress['state']; percent?: number; error?: string }
  | { type: 'UPLOAD_DONE'; uploadedPaths: string[] }
  | { type: 'UPLOAD_ERROR'; error: string }
  | { type: 'RESET' };

export const SHARE_PHOTO_QUOTA_PER_GUEST = 100;

/**
 * presignedUpload actor — uploading state에서 invoke.
 * input: { loungeId, files, onRegister }
 * sendBack: PROGRESS | UPLOAD_DONE | UPLOAD_ERROR
 */
const presignedUploadActor = fromCallback<
  SharePhotoUploadEvent,
  { loungeId: string; files: File[]; onRegister: RegisterUploaded }
>(({ input, sendBack }) => {
  let cancelled = false;
  (async () => {
    try {
      const results = await presignedUpload({
        category: 'share',
        loungeId: input.loungeId,
        files: input.files,
        concurrency: 4,
        autoRetry: 1,
        onProgress: (index, s) => {
          if (cancelled) return;
          let st: FileProgress['state'] = 'queued';
          let percent: number | undefined;
          let error: string | undefined;
          switch (s.phase) {
            case 'queued':      st = 'queued'; break;
            case 'converting':  st = 'converting'; break;
            case 'requesting':  st = 'requesting'; break;
            case 'uploading':   st = 'uploading'; percent = s.percent; break;
            case 'done':        st = 'done'; percent = 100; break;
            case 'failed':      st = 'failed'; error = s.error; break;
          }
          sendBack({ type: 'PROGRESS', index, state: st, percent, error });
        },
        onUploaded: async (_idx, r) => {
          // register 실패는 흡수 (idempotent 아닐 수 있어 autoRetry 트리거 안 함).
          await input.onRegister(r).catch(() => undefined);
        },
      });
      if (cancelled) return;
      const uploadedPaths = results
        .filter((r): r is PresignedUploadResult => !(r instanceof Error))
        .map((r) => r.storagePath);
      sendBack({ type: 'UPLOAD_DONE', uploadedPaths });
    } catch (e) {
      if (cancelled) return;
      sendBack({ type: 'UPLOAD_ERROR', error: (e as Error).message });
    }
  })();
  return () => {
    cancelled = true;
  };
});

export const sharePhotoUploadMachine = setup({
  types: {
    context: {} as SharePhotoUploadContext,
    events: {} as SharePhotoUploadEvent,
    input: {} as { loungeId: string; existingCount: number; onRegister: RegisterUploaded },
  },
  actors: {
    presignedUploadActor,
  },
  actions: {
    setFiles: assign({
      files: (_, params: { files: File[] }) => params.files,
      progress: (_, params: { files: File[] }) =>
        params.files.map((f, i) => ({
          index: i,
          name: f.name,
          percent: 0,
          state: 'queued' as const,
        })),
    }),
    clearFiles: assign({
      files: () => [],
      progress: () => [],
      error: () => null,
    }),
    updateProgress: assign({
      progress: (
        { context },
        params: { index: number; state: FileProgress['state']; percent?: number; error?: string },
      ) =>
        context.progress.map((p) =>
          p.index === params.index
            ? {
                ...p,
                state: params.state,
                percent: params.percent ?? p.percent,
                error: params.error,
              }
            : p,
        ),
    }),
    appendUploaded: assign({
      uploadedPaths: ({ context }, params: { paths: string[] }) => [
        ...context.uploadedPaths,
        ...params.paths,
      ],
      existingCount: ({ context }, params: { paths: string[] }) =>
        context.existingCount + params.paths.length,
    }),
    setError: assign({
      error: (_, params: { error: string }) => params.error,
    }),
    reset: assign({
      files: () => [],
      progress: () => [],
      uploadedPaths: () => [],
      error: () => null,
    }),
  },
  guards: {
    /** 100장 한도 클라이언트 가드: existing + 선택 파일 합산. */
    withinQuota: ({ context }, params: { files: File[] }) =>
      context.existingCount + params.files.length <= SHARE_PHOTO_QUOTA_PER_GUEST,
    hasFiles: ({ context }) => context.files.length > 0,
  },
}).createMachine({
  id: 'sharePhotoUpload',
  initial: 'idle',
  context: ({ input }) => ({
    loungeId: input.loungeId,
    existingCount: input.existingCount,
    files: [],
    progress: [],
    uploadedPaths: [],
    error: null,
    onRegister: input.onRegister,
  }),
  states: {
    idle: {
      on: {
        PICK: [
          {
            guard: { type: 'withinQuota', params: ({ event }) => ({ files: event.files }) },
            actions: {
              type: 'setFiles',
              params: ({ event }) => ({ files: event.files }),
            },
            target: 'selecting',
          },
          {
            actions: {
              type: 'setError',
              params: () => ({ error: translate(lang(), 'machine.share.quotaExceeded') }),
            },
          },
        ],
      },
    },
    selecting: {
      on: {
        PICK: {
          guard: { type: 'withinQuota', params: ({ event }) => ({ files: event.files }) },
          actions: { type: 'setFiles', params: ({ event }) => ({ files: event.files }) },
        },
        CLEAR: {
          actions: 'clearFiles',
          target: 'idle',
        },
        START: {
          guard: 'hasFiles',
          target: 'uploading',
        },
      },
    },
    uploading: {
      invoke: {
        src: 'presignedUploadActor',
        input: ({ context }) => ({
          loungeId: context.loungeId,
          files: context.files,
          onRegister: context.onRegister,
        }),
      },
      on: {
        PROGRESS: {
          actions: {
            type: 'updateProgress',
            params: ({ event }) => ({
              index: event.index,
              state: event.state,
              percent: event.percent,
              error: event.error,
            }),
          },
        },
        UPLOAD_DONE: {
          actions: {
            type: 'appendUploaded',
            params: ({ event }) => ({ paths: event.uploadedPaths }),
          },
          target: 'done',
        },
        UPLOAD_ERROR: {
          actions: {
            type: 'setError',
            params: ({ event }) => ({ error: event.error }),
          },
          target: 'error',
        },
      },
    },
    done: {
      on: {
        RESET: { actions: 'reset', target: 'idle' },
      },
    },
    error: {
      on: {
        RESET: { actions: 'reset', target: 'idle' },
        START: {
          guard: 'hasFiles',
          target: 'uploading',
        },
      },
    },
  },
});
