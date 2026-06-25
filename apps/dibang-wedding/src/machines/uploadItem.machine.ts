import { setup, assign, fromPromise } from 'xstate';
import { translate, useLangStore } from '../lib/i18n';
const lang = () => useLangStore.getState().lang;

/**
 * uploadItem.machine — 이미지 1건 업로드 파이프라인 (완전 펼침).
 *
 * 원자 다이어그램(InvitationCreatePage UPLOAD 서브그래프)을 invoke 기반 statechart로 1:1 모델.
 * 압축 단계는 retry 밖, presign/PUT은 autoRetry=1 안. publicUrl 검증은 retry 밖.
 *
 * xState-first 설계용 + 시뮬 가능: actor(ensureJpegIfHeic·compressImage·createPresignedUpload·
 * putBinary)는 여기선 stub. 실제 페이지는 부모가 .provide({actors})로 진짜 구현 주입.
 *
 * 부모(invitationCreate)가 파일마다 이 머신을 spawn → 완료 시 sendParent로 ITEM_DONE(serverUrl)
 * / ITEM_FAILED(error)를 올려보낸다(부모 upload 리전이 수거). 단독 실행 시 부모가 없어
 * sendParent는 무시된다.
 *
 * ⚠️ 콜드 시뮬 주의: 기본 stub은 createPresignedUpload가 publicUrl ''을 반환 → validating에서
 * hasPublicUrl false → failed로 끝난다. done 경로를 보려면 presign actor가 publicUrl을 채우도록
 * .provide/override 하라(시뮬 시 actor 교체).
 */

export const AUTO_RETRY = 1;
const MAX_BYTES = 10 * 1024 * 1024; // 10MB — 원본(gif)/소스(svg)/압축결과 공통 한도

export interface UploadItemInput {
  file: File;
  /** 부모(invitationCreate)가 부여하는 상관 id — 완료 보고(ITEM_DONE/ITEM_FAILED)에 실림 */
  id: string;
}

export interface UploadItemContext {
  /** 부모 상관 id */
  id: string;
  /** 원본(재시도 시 복원용) */
  originalFile: File;
  /** 현재 작업 파일(HEIC 변환·압축으로 교체됨) */
  file: File;
  /** presign/PUT 재시도 횟수 */
  attempts: number;
  uploadUrl: string | null;
  publicUrl: string | null;
  serverUrl: string | null;
  error: string | null;
}

export interface UploadItemOutput {
  serverUrl: string | null;
  error: string | null;
}

export const uploadItemMachine = setup({
  types: {
    input: {} as UploadItemInput,
    context: {} as UploadItemContext,
    events: {} as { type: 'RETRY' },
    output: {} as UploadItemOutput,
  },
  actors: {
    // HEIC면 JPEG 변환, 아니면 그대로 통과
    ensureJpegIfHeic: fromPromise(async ({ input }: { input: { file: File } }): Promise<File> => input.file),
    // imageCompression(≤9MB, ≤2560px)
    compressImage: fromPromise(async ({ input }: { input: { file: File } }): Promise<File> => input.file),
    // createPresignedUpload(POST) → 업로드 URL + 공개 URL
    createPresignedUpload: fromPromise(
      async ({ input }: { input: { file: File } }): Promise<{ uploadUrl: string; publicUrl: string }> => {
        void input;
        return { uploadUrl: '', publicUrl: '' };
      },
    ),
    // putBinary(PUT, 진행률)
    putBinary: fromPromise(async ({ input }: { input: { uploadUrl: string; file: File } }): Promise<void> => {
      void input;
    }),
  },
  guards: {
    isGif: ({ context }) => context.file.type === 'image/gif',
    isCompressible: ({ context }) =>
      context.file.type === 'image/jpeg' || context.file.type === 'image/png' || context.file.type === 'image/webp',
    tooBig: ({ context }) => context.file.size > MAX_BYTES,
    hasRetryLeft: ({ context }) => context.attempts < AUTO_RETRY,
    hasPublicUrl: ({ context }) => !!context.publicUrl,
  },
  actions: {
    setWorkingFile: assign({
      file: ({ event }) => (event as unknown as { output: File }).output,
    }),
    setPresign: assign({
      uploadUrl: ({ event }) => (event as unknown as { output: { uploadUrl: string } }).output.uploadUrl,
      publicUrl: ({ event }) => (event as unknown as { output: { publicUrl: string } }).output.publicUrl,
    }),
    setServerUrl: assign({ serverUrl: ({ context }) => context.publicUrl }),
    incAttempts: assign({ attempts: ({ context }) => context.attempts + 1 }),
    setStepError: assign({
      error: ({ event }) => {
        const e = (event as unknown as { error?: unknown }).error;
        return e instanceof Error ? e.message : translate(lang(), 'machine.upload.failed');
      },
    }),
    setErrorTooBig: assign({ error: () => translate(lang(), 'machine.upload.tooBig') }),
    setErrorNoUrl: assign({ error: () => translate(lang(), 'machine.upload.noUrl') }),
    resetForRetry: assign({
      file: ({ context }) => context.originalFile,
      attempts: 0,
      uploadUrl: null,
      publicUrl: null,
      serverUrl: null,
      error: null,
    }),
    // 부모에게 완료 보고 (spawn된 경우). 단독 실행/시뮬 시 부모 없음 → no-op (안전).
    reportDone: ({ self, context }) => {
      const parent = (self as unknown as { _parent?: { send: (e: unknown) => void } })._parent;
      parent?.send({ type: 'ITEM_DONE', id: context.id, serverUrl: context.serverUrl });
    },
    reportFailed: ({ self, context }) => {
      const parent = (self as unknown as { _parent?: { send: (e: unknown) => void } })._parent;
      parent?.send({ type: 'ITEM_FAILED', id: context.id, error: context.error });
    },
  },
}).createMachine({
  id: 'uploadItem',
  context: ({ input }) => ({
    id: input.id,
    originalFile: input.file,
    file: input.file,
    attempts: 0,
    uploadUrl: null,
    publicUrl: null,
    serverUrl: null,
    error: null,
  }),
  initial: 'classify',
  states: {
    // GIF 여부로 분기 (GIF는 압축 스킵)
    classify: {
      always: [
        { guard: 'isGif', target: 'gifLimit' },
        { target: 'convertHeic' },
      ],
    },
    // GIF: 원본 >10MB면 실패, 아니면 압축 없이 presign
    gifLimit: {
      always: [
        { guard: 'tooBig', target: 'failed', actions: 'setErrorTooBig' },
        { target: 'requesting' },
      ],
    },
    // 비-GIF: HEIC→JPEG (아니면 통과)
    convertHeic: {
      invoke: {
        src: 'ensureJpegIfHeic',
        input: ({ context }) => ({ file: context.file }),
        onDone: { target: 'compressDecide', actions: 'setWorkingFile' },
        onError: { target: 'failed', actions: 'setStepError' },
      },
    },
    // 압축 가능(jpeg/png/webp) 여부 분기
    compressDecide: {
      always: [
        { guard: 'isCompressible', target: 'compressing' },
        { target: 'rawLimit' }, // svg 등 — 압축 스킵
      ],
    },
    compressing: {
      invoke: {
        src: 'compressImage',
        input: ({ context }) => ({ file: context.file }),
        onDone: { target: 'postLimit', actions: 'setWorkingFile' },
        onError: { target: 'failed', actions: 'setStepError' },
      },
    },
    // 압축 결과 >10MB면 실패
    postLimit: {
      always: [
        { guard: 'tooBig', target: 'failed', actions: 'setErrorTooBig' },
        { target: 'requesting' },
      ],
    },
    // 비압축 소스(svg 등) >10MB면 실패
    rawLimit: {
      always: [
        { guard: 'tooBig', target: 'failed', actions: 'setErrorTooBig' },
        { target: 'requesting' },
      ],
    },
    // presign 요청 (실패 → 재시도 게이트)
    requesting: {
      invoke: {
        src: 'createPresignedUpload',
        input: ({ context }) => ({ file: context.file }),
        onDone: { target: 'putting', actions: 'setPresign' },
        onError: { target: 'retryGate', actions: 'setStepError' },
      },
    },
    // 바이너리 PUT (실패 → 재시도 게이트)
    putting: {
      invoke: {
        src: 'putBinary',
        input: ({ context }) => ({ uploadUrl: context.uploadUrl ?? '', file: context.file }),
        onDone: { target: 'validating' },
        onError: { target: 'retryGate', actions: 'setStepError' },
      },
    },
    // autoRetry=1: 남으면 presign부터 재시도, 소진되면 실패
    retryGate: {
      always: [
        { guard: 'hasRetryLeft', target: 'requesting', actions: 'incAttempts' },
        { target: 'failed' },
      ],
    },
    // publicUrl 검증 (retry 밖)
    validating: {
      always: [
        { guard: 'hasPublicUrl', target: 'done', actions: 'setServerUrl' },
        { target: 'failed', actions: 'setErrorNoUrl' },
      ],
    },
    done: { type: 'final', entry: 'reportDone' },
    // 실패 — 페이지 RETRY 시 전체 재실행
    failed: {
      entry: 'reportFailed',
      on: { RETRY: { target: 'classify', actions: 'resetForRetry' } },
    },
  },
  output: ({ context }) => ({ serverUrl: context.serverUrl, error: context.error }),
});
