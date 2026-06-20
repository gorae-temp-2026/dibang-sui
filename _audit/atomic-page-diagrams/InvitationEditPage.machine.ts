// [Stately 관리용 스펙 모델 — 방향 A] InvitationEditPage.md 다이어그램에서 도출.
// 주의: 실제 invitationEdit.machine은 '미사용'(Create와 동일). 이 파일은 페이지 '흐름' 이상화 스펙.
// Create와의 차이: slug 모달 없음(로드→hydrate), 앞단 로드(getWedding→getInvitation), 저장은 단일
// update(updateWedding→조건부 updateInvitation), 뒤로가기·unmount reset.
// 업로드 1건 파이프라인은 Create와 동일 → uploadItemActor 액터로 표현(파이프라인 주석 보존).
// guards/actions/actors는 이름 참조용 stub. XState v5.
import { setup, fromPromise } from 'xstate';

export const invitationEditPageMachine = setup({
  types: {
    context: {} as {
      uploadingCount: number;
      error: string | null;
    },
    events: {} as
      | { type: 'BACK_TO_LIST' } // 에러화면 돌아가기 Link
      | { type: 'HEADER_LOGO' }
      | { type: 'BACK' }         // 뒤로가기 navigate(-1)
      | { type: 'EDIT_FIELD' }
      | { type: 'PICK_COVER' }
      | { type: 'PICK_GALLERY' }
      | { type: 'PICK_CANVAS' }
      | { type: 'ITEM_DONE' }
      | { type: 'ITEM_FAILED' }
      | { type: 'RETRY_ITEM' }
      | { type: 'REMOVE_ITEM' }
      | { type: 'ITEMS_SETTLED' }
      | { type: 'SAVE' },
  },
  actors: {
    getWedding: fromPromise(async (): Promise<void> => {}),
    getInvitation: fromPromise(async (): Promise<void> => {}),
    canvasUpload: fromPromise(async (): Promise<{ url: string | null }> => ({ url: null })),
    // Create와 동일한 업로드 1건 파이프라인(context=wedding):
    //  GIF? → 원본>10MB면 fail / 아니면 스킵. 비-GIF → ensureJpegIfHeic(throw→fail) →
    //  압축가능(jpeg/png/webp)? 예 imageCompression(throw→fail, 결과>10MB→fail) / 아니오(svg) source>10MB→fail else 스킵.
    //  → createPresignedUpload(throw→retry) → putBinary(throw→retry) → 재시도(autoRetry=1) →
    //  PUT 성공 시 publicUrl 있음? 예→ITEM_DONE / 아니오→fail.
    uploadItemActor: fromPromise(async (): Promise<{ serverUrl: string }> => ({ serverUrl: '' })),
    updateWedding: fromPromise(async (): Promise<void> => {}),    // ({weddingId},{info,hosts}) throwOnError
    updateInvitation: fromPromise(async (): Promise<void> => {}), // 조건부 throwOnError
  },
  actions: {
    hydrateForm: () => {},   // info·accounts·invitation·designConfig·canvas + originalSlug·hydratedSlug=slug (1회/slug)
    coverPick: () => {},
    galAdd: () => {},
    canvasResult: () => {},
    canvasNull: () => {},
    syncItem: () => {},
    markFailed: () => {},
    retryItem: () => {},
    removeItem: () => {},
    editField: () => {},
    toastWaitUpload: () => {},
    toastGroom: () => {},
    toastBride: () => {},
    toastDate: () => {},
    toastTime: () => {},
    toastVenueName: () => {},
    toastVenueAddr: () => {},
    onSuccess: () => {}, // invalidate(myWeddings + wedding) + reset() + navigate(/my-wedding)
  },
  guards: {
    hasTargetInvitation: () => true, // 대상 invitation(slug) 있음 (없으면 조회 skip)
    needsHydrate: () => true,        // wedding∧invitation∧slug ∧ hydratedSlug≠slug
    hasGalleryCap: () => true,
    itemAlive: () => true,
    hasUploadingItems: ({ context }) => context.uploadingCount > 0,
    hasInvitationData: () => false,  // gallery·cover·message·template 중 1 ∧ invitationId 있음
    hasGroomName: () => false,
    hasBrideName: () => false,
    hasDate: () => false,
    hasTime: () => false,
    hasVenueName: () => false,
    hasVenueAddr: () => false,
  },
}).createMachine({
  id: 'invitationEditPage',
  context: { uploadingCount: 0, error: null },
  initial: 'loading',
  states: {
    // ── ① 로드 (useLoadWedding) ──
    loading: {
      initial: 'loadingWedding',
      states: {
        loadingWedding: {
          invoke: {
            src: 'getWedding',
            onDone: { target: 'pickInvitation' },
            onError: { target: '#ieError' },
          },
        },
        // invitation 선택: ?invitationId 매치 ?? invitations[0]
        pickInvitation: {
          always: [
            { guard: 'hasTargetInvitation', target: 'loadingInvitation' },
            { target: '#ieHydrateGate' }, // invitations 비어있음 → 조회 skip
          ],
        },
        loadingInvitation: {
          invoke: {
            src: 'getInvitation',
            onDone: { target: '#ieHydrateGate' },
            onError: { target: '#ieError' },
          },
        },
      },
    },
    errScreen: {
      id: 'ieError',
      on: { BACK_TO_LIST: { target: 'exit' } }, // '청첩장을 불러올 수 없습니다' → 돌아가기 /my-wedding
    },

    hydrateGate: {
      id: 'ieHydrateGate',
      always: [
        { guard: 'needsHydrate', target: 'hydrate' },
        { target: 'editor' }, // 데이터 없음 또는 이미 hydrate
      ],
    },
    hydrate: {
      entry: 'hydrateForm',
      always: { target: 'editor' },
    },

    // ── fork: 편집 ∥ 업로드 트랙 ──
    editor: {
      id: 'editorRoot',
      type: 'parallel',
      on: {
        HEADER_LOGO: { target: 'exit' },
        BACK: { target: 'exitBack' }, // navigate(-1)
      },
      states: {
        edit: {
          initial: 'editing',
          states: {
            editing: {
              id: 'ieEditing',
              on: {
                EDIT_FIELD: { actions: 'editField' },
                SAVE: [
                  { guard: 'hasUploadingItems', actions: 'toastWaitUpload' },
                  { target: '#saving' },
                ],
              },
            },
          },
        },
        upload: {
          initial: 'idle',
          states: {
            idle: {
              on: {
                PICK_COVER: { target: 'active', actions: 'coverPick' },
                PICK_GALLERY: [
                  { guard: 'hasGalleryCap', target: 'active', actions: 'galAdd' },
                  {},
                ],
                PICK_CANVAS: { target: 'canvasUploading' },
              },
            },
            active: {
              on: {
                PICK_COVER: { actions: 'coverPick' },
                PICK_GALLERY: { guard: 'hasGalleryCap', actions: 'galAdd' },
                PICK_CANVAS: { target: 'canvasUploading' },
                ITEM_DONE: [
                  { guard: 'itemAlive', actions: 'syncItem' },
                  {},
                ],
                ITEM_FAILED: { actions: 'markFailed' },
                RETRY_ITEM: { actions: 'retryItem' },
                REMOVE_ITEM: { actions: 'removeItem' },
                ITEMS_SETTLED: { target: 'idle' },
              },
            },
            canvasUploading: {
              invoke: {
                src: 'canvasUpload',
                onDone: { target: 'idle', actions: 'canvasResult' },
                onError: { target: 'idle', actions: 'canvasNull' },
              },
            },
          },
        },
      },
    },

    // ── 저장: validate 6칸 → updateWedding → 조건부 updateInvitation ──
    saving: {
      id: 'saving',
      initial: 'validate',
      states: {
        validate: {
          initial: 'v1',
          states: {
            v1: { always: [{ guard: 'hasGroomName', target: 'v2' }, { target: '#ieEditing', actions: 'toastGroom' }] },
            v2: { always: [{ guard: 'hasBrideName', target: 'v3' }, { target: '#ieEditing', actions: 'toastBride' }] },
            v3: { always: [{ guard: 'hasDate', target: 'v4' }, { target: '#ieEditing', actions: 'toastDate' }] },
            v4: { always: [{ guard: 'hasTime', target: 'v5' }, { target: '#ieEditing', actions: 'toastTime' }] },
            v5: { always: [{ guard: 'hasVenueName', target: 'v6' }, { target: '#ieEditing', actions: 'toastVenueName' }] },
            v6: { always: [{ guard: 'hasVenueAddr', target: '#ieUpdatingWedding' }, { target: '#ieEditing', actions: 'toastVenueAddr' }] },
          },
        },
        updatingWedding: {
          id: 'ieUpdatingWedding',
          invoke: {
            src: 'updateWedding',
            onDone: [
              { guard: 'hasInvitationData', target: 'updatingInvitation' },
              { target: '#ieSuccess' },
            ],
            onError: { target: '#ieEditing' },
          },
        },
        updatingInvitation: {
          invoke: {
            src: 'updateInvitation',
            onDone: { target: '#ieSuccess' },
            onError: { target: '#ieEditing' },
          },
        },
        success: { id: 'ieSuccess', type: 'final', entry: 'onSuccess' },
      },
      onDone: { target: 'exit' },
    },

    exit: { type: 'final' },     // /my-wedding (헤더 로고·성공·에러 돌아가기)
    exitBack: { type: 'final' }, // navigate(-1)
  },
});
