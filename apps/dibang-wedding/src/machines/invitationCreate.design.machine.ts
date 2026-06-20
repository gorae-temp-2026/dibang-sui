// [설계/시뮬 전용 — 프로덕션 미연결] 리치 invitationCreate 머신(slug·편집∥업로드·저장 전 API·온체인까지 한 장). Stately로 보고 시뮬하는 설계 SSOT. 실제 페이지는 invitationCreate.machine.ts(thin)에 연결됨.
import { setup, assign, sendTo, fromPromise, type ActorRefFrom } from 'xstate';
import { uploadItemMachine } from './uploadItem.machine';

/**
 * invitationCreate.machine — /invitation/create 페이지 전체 flow (xState-first, 완전 펼침).
 *
 * 원자 다이어그램(InvitationCreatePage.md)을 한 머신으로 흡수 — Stately에서 한 장으로 보고
 * 시뮬까지 가능. 모든 비동기/API를 invoke actor로 선언(자체 구동). 실제 페이지는
 * useMachine(...).provide({actors})로 진짜 구현(React Query/zkLogin/presigned)을 주입한다.
 *
 * 구역:
 *  - slugModal: 입력 디바운스(after 500) → checkSlug(invoke) → taken/available/error, CONFIRM/CLOSE
 *  - editor(parallel): edit(폼=zustand) ∥ upload(파일별 uploadItem spawn, 완료는 ITEM_DONE/FAILED 수거)
 *  - saving: 모드 분기 → (create) createWedding→[updateInvitation]→onchain(best-effort)
 *                       → (add) createInvitation→[updateInvitation]
 *  - success/left: final (컴포넌트가 reset+navigate)
 *
 * 폼 값(groomName 등)은 zustand 유지. 머신은 흐름과 검증 '결과(missing/hasInvitationData)'만 받는다.
 */

type UploadKind = 'cover' | 'gallery';
type UploadStatus = 'uploading' | 'done' | 'failed';

export interface UploadEntry {
  id: string;
  kind: UploadKind;
  status: UploadStatus;
  serverUrl: string | null;
  error: string | null;
  ref: ActorRefFrom<typeof uploadItemMachine>;
  /** 낙관적 미리보기용 — EditPanel(InvitationUploadItem)과 동일 형태 매핑 */
  file: File;
  localUrl: string;
}

export interface InvitationCreateContext {
  slug: string;
  slugStatus: 'idle' | 'checking' | 'taken' | 'available' | 'error';
  isAddMode: boolean;
  addWeddingId: string | null;
  items: UploadEntry[];
  hasInvitationData: boolean; // SAVE 시 컴포넌트가 계산해 전달(gallery/cover/message/template/design/cover_text 중 1)
  createdWeddingId: string | null;
  createdInvitationId: string | null;
  onchainFailed: boolean;
  toast: string | null;
  saveError: string | null;
}

export interface InvitationCreateInput {
  isAddMode: boolean;
  weddingId: string | null; // ?weddingId (add 모드)
}

export type InvitationCreateEvent =
  | { type: 'TYPE'; slug: string }
  | { type: 'CONFIRM' }
  | { type: 'CLOSE' }
  | { type: 'HEADER_LOGO' }
  | { type: 'ADD_COVER'; file: File }
  | { type: 'ADD_GALLERY'; files: File[]; galleryCount: number } // galleryCount = 이미 저장된 갤러리 수(zustand)
  | { type: 'UPLOAD_CANVAS'; file: File } // 그림판 이미지 (fire-and-forget)
  | { type: 'ITEM_DONE'; id: string; serverUrl: string | null }
  | { type: 'ITEM_FAILED'; id: string; error: string | null }
  | { type: 'RETRY_ITEM'; id: string }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'DISMISS_TOAST' }
  | { type: 'SAVE'; missing: string | null; hasInvitationData: boolean };

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const MAX_GALLERY_PHOTOS = 60; // 갤러리 최대 장수 (GalleryUploader와 동일)

// objectURL 헬퍼 — 브라우저에서만 동작(노드 시뮬에선 ''). try/catch로 비-Blob 입력 방어.
const makeLocalUrl = (file: File): string => {
  try {
    return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '';
  } catch {
    return '';
  }
};
const revokeLocalUrl = (url: string): void => {
  try {
    if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
  } catch {
    /* no-op */
  }
};

export const invitationCreateDesignMachine = setup({
  types: {
    input: {} as InvitationCreateInput,
    context: {} as InvitationCreateContext,
    events: {} as InvitationCreateEvent,
  },
  actors: {
    uploadItem: uploadItemMachine,
    // getInvitation({slug}) — taken 여부. 실제: useSlugCheck/RQ 주입.
    checkSlug: fromPromise(async ({ input }: { input: { slug: string } }): Promise<{ taken: boolean }> => {
      void input;
      return { taken: false };
    }),
    // createWedding(weddingReq) → {id, invitationId}
    createWedding: fromPromise(
      async ({ input }: { input: { slug: string } }): Promise<{ weddingId: string; invitationId: string }> => {
        void input;
        return { weddingId: '', invitationId: '' };
      },
    ),
    // createInvitation({weddingId},{slug}) → {invitationId}
    createInvitation: fromPromise(
      async ({ input }: { input: { weddingId: string; slug: string } }): Promise<{ invitationId: string }> => {
        void input;
        return { invitationId: '' };
      },
    ),
    // updateInvitation({weddingId,invitationId}, invitationReq)
    updateInvitation: fromPromise(
      async ({ input }: { input: { weddingId: string; invitationId: string } }): Promise<void> => {
        void input;
      },
    ),
    // 온체인 createWedding(+vault, sui_id dual-write). best-effort.
    createWeddingOnchain: fromPromise(async ({ input }: { input: { weddingId: string } }): Promise<void> => {
      void input;
    }),
    // 그림판 이미지 — compress→presigned, fire-and-forget (items에 안 들어감, 결과 URL은 캔버스로)
    canvasUpload: fromPromise(async ({ input }: { input: { file: File } }): Promise<{ url: string | null }> => {
      void input;
      return { url: null };
    }),
  },
  guards: {
    slugLongEnough: ({ context }) => context.slug.trim().length >= 2,
    slugTaken: ({ event }) => (event as unknown as { output: { taken: boolean } }).output.taken,
    is404: ({ event }) => {
      // 조회 에러가 404(미존재=available)인지. 실제 주입 actor가 status를 error에 실어줌.
      const err = (event as unknown as { error?: { status?: number } }).error;
      return err?.status === undefined || err.status === 404;
    },
    slugAvailable: ({ context }) => context.slugStatus === 'available',
    uploadingNow: ({ context }) => context.items.some((it) => it.status === 'uploading'),
    addSlugInvalid: ({ context }) => context.isAddMode && (!context.slug || context.slug.trim().length < 2),
    createHasMissing: ({ context, event }) =>
      !context.isAddMode && (event as { missing?: string | null }).missing != null,
    isAddMode: ({ context }) => context.isAddMode,
    hasInvitationData: ({ context }) => context.hasInvitationData,
    canRetryItem: ({ context, event }) =>
      context.items.some((it) => it.id === (event as { id: string }).id && it.status === 'failed'),
    noItems: ({ context }) => context.items.length === 0,
    // 남은 자리 = 60 − 이미 저장된 갤러리(event) − 머신 내 진행 중 갤러리
    galleryHasRoom: ({ context, event }) => {
      const saved = (event as { galleryCount?: number }).galleryCount ?? 0;
      const inMachine = context.items.filter((it) => it.kind === 'gallery').length;
      return MAX_GALLERY_PHOTOS - saved - inMachine > 0;
    },
  },
  actions: {
    setSlug: assign({ slug: ({ event }) => (event as { slug: string }).slug, slugStatus: 'idle' }),
    setStatusChecking: assign({ slugStatus: 'checking' }),
    setStatusTaken: assign({ slugStatus: 'taken' }),
    setStatusAvailable: assign({ slugStatus: 'available' }),
    setStatusError: assign({ slugStatus: 'error' }),

    spawnCover: assign(({ context, event, spawn }) => {
      if (event.type !== 'ADD_COVER') return {};
      // 커버 교체: 기존 커버 엔트리는 제거(미리보기 URL 해제). 고아 actor 완료 보고는 unknown id → 무시
      for (const it of context.items) if (it.kind === 'cover') revokeLocalUrl(it.localUrl);
      const kept = context.items.filter((it) => it.kind !== 'cover');
      const id = newId();
      const ref = spawn('uploadItem', { input: { file: event.file, id } });
      return {
        items: [
          ...kept,
          {
            id, kind: 'cover' as const, status: 'uploading' as const, serverUrl: null, error: null, ref,
            file: event.file, localUrl: makeLocalUrl(event.file),
          },
        ],
      };
    }),
    spawnGallery: assign(({ context, event, spawn }) => {
      if (event.type !== 'ADD_GALLERY') return {};
      const inMachine = context.items.filter((it) => it.kind === 'gallery').length;
      const remaining = MAX_GALLERY_PHOTOS - event.galleryCount - inMachine;
      if (remaining <= 0) return {};
      const added: UploadEntry[] = event.files.slice(0, remaining).map((file) => {
        const id = newId();
        const ref = spawn('uploadItem', { input: { file, id } });
        return {
          id, kind: 'gallery' as const, status: 'uploading' as const, serverUrl: null, error: null, ref,
          file, localUrl: makeLocalUrl(file),
        };
      });
      return { items: [...context.items, ...added] };
    }),
    markItemDone: assign({
      items: ({ context, event }) => {
        if (event.type !== 'ITEM_DONE') return context.items;
        return context.items.map((it) =>
          it.id === event.id ? { ...it, status: 'done' as const, serverUrl: event.serverUrl } : it,
        );
      },
    }),
    markItemFailed: assign({
      items: ({ context, event }) => {
        if (event.type !== 'ITEM_FAILED') return context.items;
        return context.items.map((it) =>
          it.id === event.id ? { ...it, status: 'failed' as const, error: event.error } : it,
        );
      },
    }),
    markItemRetrying: assign({
      items: ({ context, event }) => {
        if (event.type !== 'RETRY_ITEM') return context.items;
        return context.items.map((it) =>
          it.id === event.id ? { ...it, status: 'uploading' as const, error: null } : it,
        );
      },
    }),
    removeItem: assign(({ context, event }) => {
      // note: 인플라이트 취소(stopChild)는 프로덕션 보강 — 여기선 목록 제거(고아 완료는 무시됨)
      if (event.type !== 'REMOVE_ITEM') return {};
      const target = context.items.find((it) => it.id === event.id);
      if (target) revokeLocalUrl(target.localUrl);
      return { items: context.items.filter((it) => it.id !== event.id) };
    }),

    toastUploadWait: assign({ toast: '사진 업로드가 끝나면 저장할 수 있어요' }),
    toastSlugRequired: assign({ toast: '공유 링크를 입력해주세요' }),
    toastMissing: assign({
      toast: ({ event }) => {
        const m = (event as { missing?: string | null }).missing;
        return m ? `${m}을(를) 입력해주세요` : null;
      },
    }),
    clearToast: assign({ toast: null }),
    setSaveMeta: assign({
      hasInvitationData: ({ event }) => (event as { hasInvitationData?: boolean }).hasInvitationData ?? false,
      saveError: null,
    }),
    setCreatedWedding: assign({
      createdWeddingId: ({ event }) => (event as unknown as { output: { weddingId: string } }).output.weddingId,
      createdInvitationId: ({ event }) => (event as unknown as { output: { invitationId: string } }).output.invitationId,
    }),
    setCreatedInvitation: assign({
      createdInvitationId: ({ event }) => (event as unknown as { output: { invitationId: string } }).output.invitationId,
    }),
    setSaveError: assign({
      saveError: ({ event }) => {
        const e = (event as unknown as { error?: unknown }).error;
        return e instanceof Error ? e.message : '저장에 실패했습니다.';
      },
    }),
    markOnchainFailed: assign({ onchainFailed: true }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QEsB2A3ZAXAhl5A9qgMIBOYeYAdLADYCuUAsgRDrVRGAEYH2oBjNFADEAD1i4s1HADNppABQBWAAyqAlCLSYphEuUo0GzVu048+g4QG1VAXUSgADgVjZ9TkGMQBGVQDsAEwANCAAnogALL5BAL5xYTrYePpkFNLGjCxsHFy8-EKoohJSMvJgSmqa2hgp+ETpRnTZZnmWhba+jkggru4NqF4+CACcAMwAbGGRCONBvglJdXqNhpktprlUAgAWYAIA1sIiEETUOgSHFyupaxnUmznmewfHxQiXAneodvZ-Xn6HiIw0QAXGvhmYNUyiWIGSqwMDyyWxe+yOJzOqBu6CuOPqaXWjxMzw4rwxHy+Pz+Nm6gLcwKGvRGAA4YVCECyorDEvDboMmhsSW0duj3qJKqQCKQqM5aHhZNKALZUBE-QXE1rbcniz4YAjfQY0hz0gaeZl+XzjVQcgIwuFqgVElGk0VvE6S6Wy+VYRWkFWOwnIp4inXCPW4w36Gl03pAwaghC+Xws6YRRBcnnLXTq50h3IiAAqAE0AAoAUQBcYZCYtSd8oyiHJTqgd-KDzWFBeIABkAPIAZUrJurZpBddGk1GzdiWb5Oadwa77BExD7ADkAGIASQASkwqy4a+bQCNxizfE30-WgnPA-cjJBsF76HKCDgIKqILQwCIAIIACIAQA+muABq5a7oefTHuOp6IEE542tevhTpMbYLh2mRPlgL5vh+X4-v+QHAQA4n+PY9pBxbQfGJ7eAhqhRKEKFoRhBIPthEDPjKr60O+n44AI+DoL+gEgeBkG0bBTLwUmkyqCxswNlELLsYiGpUDheH8QRQkiWJJHkZR1HSWOskMQgQRMSyzaNmpvL3kij7cbhvH4YJwnIKJIjboW5ZMMBAEbsOPRHuZiZWpM4x2ap6m5si2nubpnkGb5-mBZuf7blRAFmYyiaIamsUOdmHHOVxPFUHxAlUPp3m-ru5aFruxbAX5AX5bWclBJMQTTih9nxYuLlVTVeleT5TVMH2EHtRlXX0SMKZBAEJXDVh1BJdVHl1ZNv7sAA7jg4SwItcGWSmyi2ShwSLI57acVtrlet8GA4LAhG-gAqqW-aAaBf7rmBf4DudFlnsooxKX4AQBKV87lZp21vegH07SlmLnKq+rXDjmFPVpL0yqj6PjdxlL6lGRDGmFMERXW4wQjDSbw62D0ExVz1VaTn3kx6pBSjKcoKsq+NI86KM4O9fMeeGVJGg44OJtaTPNmzG2E0lIgABLloBkHAf2pF9srE7Mc21oI05yPEyIAHbgOTCOwOwGFn2oOFmbcmTmmsxBEEcUcxLiV2wOf4Qd7l2+PDHIB0HZUaZLYcR5WsbhQVdaXpMURUL18zKOCkwBDELIs-HvhUJMyjKFMyg56Mk6rZrXNEzxIjh5HQR03RF3LXDoxUKoEIsiyyhRKMZeT1e-uB5X1e19XDdNwELe2+3neVuMPcyYVsSqFQDbjCXUyKeoATKHHAdBFXNd18vfWr8HSfBjgmDFBYQhcDkB20Mdp1R2WqXKgARJwsgvnHHON8ojHzvI9VusA37CE-sgb+rBf7-zOunemmc5LZ0HqAyY4DL7XlVtA2Ba88xII-gIIkP8djrGEAAdUgBTUQWIcR4nFi-Zo1CoAMIePQ2hGRmGsPllTakSsRwZ26pdeuBCwEQNIQES8VAYEX0oa-d+-DhGUCEYw4oLCIBsNONjS4eMbZUO0QIvR6CbH4EMWIymkZJH-Gwb3CGfha4shAYokhsxzypjURQ5+CVeHWN0dIfRIjHHGIFkLb0ot-TcLCRsPh9iwDRNSLEthEYDSuMAQhCYg9VJENQlEVQfV-GIHGDXSYVc4bzDtJeZMGjQkjTSREuhdjXxsAcVAbc8DTHYnxlwyxWjkGRMyT05wfThCDM5nk6mvwpE7wZng0eB9CHEI5BUwuwS2mJ1SY8dJUz6G9OyQMoZnphY+j9AGeBmlEFdMETMuZxQFnlSWQU6RODZEjAqUzKgbILwwiiEQpR-sYgH1qVECeCxiGaPCZM7pXAqBED2DgNAwzOEWMeVYlFry0UYt2Fi1A3zFb-F+R4yKdS1ElxUbeayFSFi7Mfg0gIkx-D+EnqMJ+RyOknJebY4lghSXYpuYk30YtxnIpoai6gJKyUUujKs00uDLqpgCFQUYKYiHxzQuCtlilD5wy5aoHlLI+VIs6cgj8EAsn9M+YiHFoy8Wcyeek+1jr5nwJVTTNVo4NUjAmLnbZkKamKWUAcuBHqCUf29XYyJvrOauvMfiHhtqE3GJ9R8v1CtVVuLWcGjM0UQHFwbP1K1vhlC3l2dUQ+VrlDJknIvWNIc5X8MTWi5NebU2SpFtK5Jsqs1dpzUmgxVzFkFoDVS4t-zojHxvkzKGsDmx9TDVaY+VrKm3htUKu1460UXKdUMjhbqM3HJoF6o91AT0pq+TOlZc71ULqTKoScaiLUqLheCWtnK2WoR1WoaGd9RjXSiPu691ju13tmZc51PwRADruTK-FEzs0OreQh-NEjKWFKshMaNk8yk513dUuYAdtUQnmPMZiKY2m8lQOg+AvQR1gFfUtRA101ooXGFB-M7BON90QNFCjuqBPLg4Kgn8wnPHvtZdeAO1t0Odi1OYfIVgihQDk5FBYFH5jswFZtF0oYxTCF01nM+HI1DxHaSZwTHBcDXAsjSusRCYrXkzJJ9THA35YvlNwWTQa33JliBySe7bM2alRBwG5lm8EQmQrMSLUGkoJcur1XjykYjoXs1rYmbcsAZbPFyFmNbkxpcKzhIrFmQtcbmDu9dH6qtjQ8iVvwEIKM1sCK1tyGNaoyY4-VkTVka3Zb8ApSD+XW7bXJntAyHWkyjEqc2FkUw+uvWlmjVjMiGtVu69dUYm2SbbfRkNpbNHPPKSIXl4zBWeZndlpjYol2mlraIQJvhS31s+PDRRwOCkY1fesVwL+0yuBLcvFEbV-2441wPuoqLV7nmEpFcNvbo3Lwrd8RCgz9Hgczc9cKqJE6YlQCMWwqHP7cc7NIc2yuSOQdo9J8e+Dp7OZQ4mOMWnEbGvj0J-dhBpyFXorFWSqH7K4fXhiDAwXiNovQcPVhyHI35Oj3qdL-24IedM6J-GsdKvqC9qneVKHqg2S84B2XchhyFco5vUbna7zTeIih8maNWuamoWjXroXTz6ACAEHAXbfyGtWhUcC8EjdC62burszMOrrSXkLk3aKUGfzyCW5OGefh9MJASEAA */
  id: 'invitationCreate',
  context: ({ input }) => ({
    slug: '',
    slugStatus: 'idle',
    isAddMode: input.isAddMode,
    addWeddingId: input.weddingId,
    items: [],
    hasInvitationData: false,
    createdWeddingId: null,
    createdInvitationId: null,
    onchainFailed: false,
    toast: null,
    saveError: null,
  }),
  initial: 'slugModal',
  states: {
    // ── 공유링크(slug) 모달 ──
    slugModal: {
      initial: 'idle',
      on: {
        TYPE: { target: '.debouncing', actions: "setSlug" },
        CLOSE: { target: 'left' },
        CONFIRM: { guard: 'slugAvailable', target: 'editor' }, // 가용일 때만
      },
      states: {
        idle: {},
        debouncing: {
          after: {
            500: [
              { guard: 'slugLongEnough', target: 'checking' },
              { target: 'idle' },
            ],
          },
        },
        checking: {
          entry: "setStatusChecking",
          invoke: {
            src: "checkSlug",
            input: ({ context }) => ({ slug: context.slug }),
            onDone: [
              { guard: 'slugTaken', target: 'taken', actions: "setStatusTaken" },
              { target: 'available', actions: "setStatusAvailable" },
            ],
            onError: [
              { guard: 'is404', target: 'available', actions: "setStatusAvailable" },
              { target: 'error', actions: "setStatusError" },
            ],
          },
        },
        taken: {},
        available: {},
        error: {},
      },
    },

    // ── 편집 ∥ 업로드 (fork) ──
    editor: {
      id: 'editor',
      type: 'parallel',
      on: {
        HEADER_LOGO: { target: 'left' },
        DISMISS_TOAST: { actions: "clearToast" },
        SAVE: [
          { guard: 'uploadingNow', actions: "toastUploadWait" }, // 머무름
          { guard: 'addSlugInvalid', actions: "toastSlugRequired" }, // 머무름
          { guard: 'createHasMissing', actions: "toastMissing" }, // 머무름
          { target: 'saving', actions: ["clearToast", "setSaveMeta"] }, // 통과
        ],
      },
      states: {
        edit: {
          initial: 'editing',
          // 폼 필드 값은 zustand. 머신은 편집 상태만 표현.
          states: { editing: { id: 'editing' } },
        },
        upload: {
          initial: 'idle',
          states: {
            idle: {
              on: {
                ADD_COVER: { target: 'active', actions: "spawnCover" },
                ADD_GALLERY: { guard: 'galleryHasRoom', target: 'active', actions: "spawnGallery" },
              },
            },
            // 1건 이상 업로드 진행/완료. 파일별 상세는 spawn된 uploadItem 머신.
            active: {
              always: { guard: 'noItems', target: 'idle' },
              on: {
                ADD_COVER: { actions: "spawnCover" },
                ADD_GALLERY: { guard: 'galleryHasRoom', actions: "spawnGallery" },
                ITEM_DONE: { actions: "markItemDone" },
                ITEM_FAILED: { actions: "markItemFailed" },
                RETRY_ITEM: {
                  guard: 'canRetryItem',
                  actions: [
                    "markItemRetrying",
                    "inline:invitationCreate.editor.upload.active#RETRY_ITEM[-1]#transition[1]",
                  ],
                },
                REMOVE_ITEM: { actions: "removeItem" },
              },
            },
          },
        },
        // 그림판 이미지 업로드 (독립 리전·fire-and-forget, items/저장가드와 무관)
        canvas: {
          initial: 'idle',
          states: {
            idle: { on: { UPLOAD_CANVAS: { target: 'uploading' } } },
            uploading: {
              invoke: {
                src: "canvasUpload",
                input: ({ event }) => ({ file: (event as { file: File }).file }),
                onDone: { target: 'idle' }, // 성공: URL → 캔버스(컴포넌트가 반영)
                onError: { target: 'idle' }, // 실패: null → 캔버스
              },
            },
          },
        },
      },
    },

    // ── 저장 시퀀스 (모든 API 콜을 상태로 펼침) ──
    saving: {
      id: 'saving',
      initial: 'decideMode',
      states: {
        decideMode: {
          always: [
            { guard: 'isAddMode', target: 'addMode' },
            { target: 'createMode' },
          ],
        },
        // 생성: createWedding → [updateInvitation] → onchain(best-effort)
        createMode: {
          initial: 'creatingWedding',
          states: {
            creatingWedding: {
              invoke: {
                src: "createWedding",
                input: ({ context }) => ({ slug: context.slug }),
                onDone: [
                  { guard: 'hasInvitationData', target: 'updatingInvitation', actions: "setCreatedWedding" },
                  { target: 'onchain', actions: "setCreatedWedding" },
                ],
                onError: { target: '#editing', actions: "setSaveError" },
              },
            },
            updatingInvitation: {
              invoke: {
                src: "updateInvitation",
                input: ({ context }) => ({
                  weddingId: context.createdWeddingId ?? '',
                  invitationId: context.createdInvitationId ?? '',
                }),
                onDone: { target: 'onchain' },
                onError: { target: '#editing', actions: "setSaveError" },
              },
            },
            // 온체인 실패는 저장을 막지 않음(best-effort) → 성공 합류로 진행
            onchain: {
              invoke: {
                src: "createWeddingOnchain",
                input: ({ context }) => ({ weddingId: context.createdWeddingId ?? '' }),
                onDone: { target: '#saved' },
                onError: { target: '#saved', actions: "markOnchainFailed" },
              },
            },
          },
        },
        // 추가: createInvitation → [updateInvitation]
        addMode: {
          initial: 'creatingInvitation',
          states: {
            creatingInvitation: {
              invoke: {
                src: "createInvitation",
                input: ({ context }) => ({ weddingId: context.addWeddingId ?? '', slug: context.slug }),
                onDone: [
                  { guard: 'hasInvitationData', target: 'updatingInvitation', actions: "setCreatedInvitation" },
                  { target: '#saved', actions: "setCreatedInvitation" },
                ],
                onError: { target: '#editing', actions: "setSaveError" },
              },
            },
            updatingInvitation: {
              invoke: {
                src: "updateInvitation",
                input: ({ context }) => ({
                  weddingId: context.addWeddingId ?? '',
                  invitationId: context.createdInvitationId ?? '',
                }),
                onDone: { target: '#saved' },
                onError: { target: '#editing', actions: "setSaveError" },
              },
            },
          },
        },
      },
    },

    // 컴포넌트: reset() + navigate(/my-wedding)
    success: { id: 'saved', type: 'final' },

    // 컴포넌트: navigate(/my-wedding)
    left: { type: 'final' },

    "New state 2": {}
  },
});
