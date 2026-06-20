// [Stately 관리용 스펙 모델 — 방향 A] InvitationCreatePage.md 다이어그램에서 도출.
// 주의: 실제 invitationCreate.machine은 '미사용'이고 런타임은 useState(slugConfirmed)+zustand+훅.
// 이 파일은 그 페이지 '흐름'을 statechart로 이상화한 스펙(코드 와이어링 아님).
// 업로드 1건 파이프라인(UPLOAD 서브그래프)은 per-item 업로드 actor의 내부 명령형 로직이라
// 머신 상태가 아님 → uploadItemActor 액터로 표현하고 파이프라인은 액터 주석에 보존(누락 방지).
// guards/actions/actors는 이름 참조용 stub. XState v5.
import { setup, fromPromise } from 'xstate';

export const invitationCreatePageMachine = setup({
  types: {
    context: {} as {
      slug: string;
      slugConfirmed: boolean;
      uploadingCount: number; // 진행 중 item 수 (저장 가드용)
      error: string | null;
    },
    events: {} as
      | { type: 'TYPE'; slug: string }   // slug onChange
      | { type: 'CONFIRM' }              // 모달 확인
      | { type: 'BACK' }                 // 모달 돌아가기 → 이탈
      | { type: 'HEADER_LOGO' }          // 헤더 로고 → 이탈
      | { type: 'EDIT_FIELD' }           // zustand 필드 편집
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
    checkSlug: fromPromise(async (): Promise<{ taken: boolean }> => ({ taken: false })), // getInvitation({slug}) retry:false
    canvasUpload: fromPromise(async (): Promise<{ url: string | null }> => ({ url: null })), // compress→presigned (머신 미경유)
    // runUpload(item) = mutateAsync. 압축(retry 밖) → presign/PUT(autoRetry=1 안) → publicUrl 검증(retry 밖):
    //  GIF? → 원본>10MB면 fail / 아니면 압축 스킵.
    //  비-GIF → ensureJpegIfHeic(throw→fail) → 압축가능(jpeg/png/webp)? 예: imageCompression(≤9MB,≤2560px,
    //   throw→fail, 결과>10MB→fail) / 아니오(svg 등): source>10MB→fail else 스킵.
    //  → createPresignedUpload(throw→retry) → putBinary(진행률, throw→retry) → 재시도 남음(attempt≤1)?
    //   예→presign 재시도 / 아니오→fail. PUT 성공 → publicUrl 있음? 예→ITEM_DONE(serverUrl) / 아니오→fail.
    uploadItemActor: fromPromise(async (): Promise<{ serverUrl: string }> => ({ serverUrl: '' })),
    createInvitation: fromPromise(async (): Promise<void> => {}), // 추가모드 ({weddingId},{slug}) throwOnError
    updateInvitation: fromPromise(async (): Promise<void> => {}), // 조건부 throwOnError
    createWedding: fromPromise(async (): Promise<void> => {}),    // 생성모드 throwOnError
  },
  actions: {
    setSlugField: () => {},
    setSlugConfirmed: () => {}, // setSlugConfirmed(true)
    coverPick: () => {},        // 기존 커버 item remove → addFiles([file]) → item spawn
    galAdd: () => {},           // addFiles(slice(0,남은)) → item spawn
    canvasResult: () => {},     // 성공 URL → 캔버스
    canvasNull: () => {},       // 실패 null → 캔버스
    syncItem: () => {},         // onItemDone: 커버→setField(coverImage) / 갤러리→addGalleryPhoto+낙관적 remove
    markFailed: () => {},
    retryItem: () => {},
    removeItem: () => {},       // revokeObjectURL + 제거
    editField: () => {},
    toastWaitUpload: () => {},  // '업로드 끝나면 저장'
    toastSlug: () => {},        // '공유 링크를 입력'
    toastGroom: () => {},
    toastBride: () => {},
    toastDate: () => {},
    toastTime: () => {},
    toastVenueName: () => {},
    toastVenueAddr: () => {},
    onSuccess: () => {},        // invalidate(myWeddings) + reset() + navigate(/my-wedding)
  },
  guards: {
    slugLongEnough: () => false, // slug trim 길이 ≥ 2
    slugTaken: ({ event }) => Boolean((event as { output?: { taken?: boolean } }).output?.taken),
    is404: () => true,           // 조회 에러가 404(=available)인지
    canConfirm: () => false,     // trim 길이≥2 ∧ available
    hasGalleryCap: () => true,   // 남은 자리 > 0 (60−갤러리−진행중)
    itemAlive: () => true,       // done 시점 item 생존(REMOVE 선행 아님)
    hasUploadingItems: ({ context }) => context.uploadingCount > 0,
    isAddMode: () => false,      // ?weddingId 존재
    addSlugValid: () => false,   // 추가모드 slug trim 길이≥2
    hasData: () => false,        // gallery·cover·message·template·design·cover_text 중 1
    hasGroomName: () => false,
    hasBrideName: () => false,
    hasDate: () => false,
    hasTime: () => false,
    hasVenueName: () => false,
    hasVenueAddr: () => false,
  },
}).createMachine({
  id: 'invitationCreatePage',
  context: { slug: '', slugConfirmed: false, uploadingCount: 0, error: null },
  initial: 'slugModal',
  states: {
    // ── ① 공유링크 모달 (slugConfirmed=false) ──
    slugModal: {
      initial: 'idle',
      on: {
        TYPE: { target: '.debouncing', actions: 'setSlugField' }, // 어느 상태서든 입력 → 디바운스 재시작
        BACK: { target: 'exit' },                                  // 돌아가기 → 이탈
      },
      states: {
        idle: {}, // 입력 대기 / 길이<2 (조회 안 함)
        debouncing: {
          after: {
            500: [
              { guard: 'slugLongEnough', target: 'checking' },
              { target: 'idle' },
            ],
          },
        },
        checking: {
          invoke: {
            src: 'checkSlug',
            onDone: [
              { guard: 'slugTaken', target: 'taken' }, // data 있음(200)
              { target: 'available' },                  // data 없음
            ],
            onError: [
              { guard: 'is404', target: 'available' }, // 404
              { target: 'error' },                      // 그 외
            ],
          },
        },
        taken: {},
        available: {
          on: { CONFIRM: { guard: 'canConfirm', target: '#editorRoot', actions: 'setSlugConfirmed' } },
        },
        error: {},
      },
    },

    // ── fork: 편집 ∥ 업로드 트랙 ──
    editor: {
      id: 'editorRoot',
      type: 'parallel',
      on: { HEADER_LOGO: { target: 'exit' } },
      states: {
        edit: {
          initial: 'editing',
          states: {
            // 편집(zustand 필드 self-edit·분기 없음=flat). 필수 6칸은 저장 시 검증.
            editing: {
              id: 'icEditing',
              on: {
                EDIT_FIELD: { actions: 'editField' },
                SAVE: [
                  { guard: 'hasUploadingItems', actions: 'toastWaitUpload' }, // 업로드 중 → toast, 머무름
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
                  {}, // 남은 자리 없음 → 무동작
                ],
                PICK_CANVAS: { target: 'canvasUploading' },
              },
            },
            // ≥1 item 업로드 중 (item 별 uploadItemActor 동시 진행)
            active: {
              on: {
                PICK_COVER: { actions: 'coverPick' },
                PICK_GALLERY: { guard: 'hasGalleryCap', actions: 'galAdd' },
                PICK_CANVAS: { target: 'canvasUploading' },
                ITEM_DONE: [
                  { guard: 'itemAlive', actions: 'syncItem' }, // 생존 → onItemDone 동기화
                  {}, // REMOVE 선행 → skip
                ],
                ITEM_FAILED: { actions: 'markFailed' },
                RETRY_ITEM: { actions: 'retryItem' },     // failed → 재업로드
                REMOVE_ITEM: { actions: 'removeItem' },   // revoke + 제거
                ITEMS_SETTLED: { target: 'idle' },        // 전부 done/제거 → 유휴
              },
            },
            // canvasUpload.mutateAsync (머신 미경유 파이프라인)
            canvasUploading: {
              invoke: {
                src: 'canvasUpload',
                onDone: { target: 'idle', actions: 'canvasResult' }, // URL → 캔버스
                onError: { target: 'idle', actions: 'canvasNull' },  // null → 캔버스
              },
            },
          },
        },
      },
    },

    // ── 저장 플로우 (업로드중 가드 통과 후) ──
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
        // 추가모드: createInvitation → 조건부 updateInvitation
        addMode: {
          initial: 'checkSlug',
          states: {
            checkSlug: {
              always: [
                { guard: 'addSlugValid', target: 'creatingInvite' },
                { target: '#icEditing', actions: 'toastSlug' }, // slug 미입력 → toast → 편집 복귀
              ],
            },
            creatingInvite: {
              invoke: {
                src: 'createInvitation',
                onDone: [
                  { guard: 'hasData', target: 'updatingInvite' },
                  { target: '#icSuccess' },
                ],
                onError: { target: '#icEditing' }, // reject → 편집 복귀
              },
            },
            updatingInvite: {
              invoke: {
                src: 'updateInvitation',
                onDone: { target: '#icSuccess' },
                onError: { target: '#icEditing' },
              },
            },
          },
        },
        // 생성모드: validate 6칸 단락 체인 → createWedding → 조건부 updateInvitation
        createMode: {
          initial: 'validate',
          states: {
            validate: {
              initial: 'v1',
              states: {
                v1: { always: [{ guard: 'hasGroomName', target: 'v2' }, { target: '#icEditing', actions: 'toastGroom' }] },
                v2: { always: [{ guard: 'hasBrideName', target: 'v3' }, { target: '#icEditing', actions: 'toastBride' }] },
                v3: { always: [{ guard: 'hasDate', target: 'v4' }, { target: '#icEditing', actions: 'toastDate' }] },
                v4: { always: [{ guard: 'hasTime', target: 'v5' }, { target: '#icEditing', actions: 'toastTime' }] },
                v5: { always: [{ guard: 'hasVenueName', target: 'v6' }, { target: '#icEditing', actions: 'toastVenueName' }] },
                v6: { always: [{ guard: 'hasVenueAddr', target: '#icCreatingWedding' }, { target: '#icEditing', actions: 'toastVenueAddr' }] },
              },
            },
            creatingWedding: {
              id: 'icCreatingWedding',
              invoke: {
                src: 'createWedding',
                onDone: [
                  { guard: 'hasData', target: 'updatingInvite' },
                  { target: '#icSuccess' },
                ],
                onError: { target: '#icEditing' },
              },
            },
            updatingInvite: {
              invoke: {
                src: 'updateInvitation',
                onDone: { target: '#icSuccess' },
                onError: { target: '#icEditing' },
              },
            },
          },
        },
        // 성공 합류: invalidate(myWeddings) + reset() + navigate(/my-wedding)
        success: { id: 'icSuccess', type: 'final', entry: 'onSuccess' },
      },
      onDone: { target: 'exit' },
    },

    exit: { type: 'final' }, // 페이지 이탈 → /my-wedding
  },
});
