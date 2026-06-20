// [Stately 관리용 스펙 모델 — 방향 A] SharePhotoUploadPage.md 다이어그램에서 도출.
// 실제 useMachine은 ②업로드 머신(idle→selecting→uploading→done/error). ①기존 사진 로드는 페이지 측
// 병렬 관심사 → 여기서는 parallel(existingPhotos ∥ uploader)로 이상화.
// SPUP 서브그래프(pLimit fork·HEIC·presign·PUT·재시도·register·집계)는 actor 내부 명령형 로직
// (presignedUpload.ts)이라 머신 상태가 아님 → presignedUploadActor 액터로 표현하고 파이프라인은
// 액터 주석에 보존(누락 방지). guards/actions/actors는 이름 참조용 stub. XState v5.
import { setup, fromPromise } from 'xstate';

export const sharePhotoUploadPageMachine = setup({
  types: {
    context: {} as {
      files: number;            // 선택 파일 수
      existing: unknown[] | null; // null=로딩, []=빈/에러
      uploadedPaths: string[];
      error: string | null;
    },
    events: {} as
      | { type: 'PICK' }      // 파일 선택(추가/삭제)
      | { type: 'CLEAR' }     // 전부삭제
      | { type: 'START' }     // 공유/다시 시도
      | { type: 'PROGRESS' }  // 파일별 진행률 (actor sendBack)
      | { type: 'RESET' }     // 계속 올리기 / 처음으로
      | { type: 'CANCEL' }    // 헤더 취소
      | { type: 'BACK' },     // done 돌아가기
  },
  actors: {
    listSharedPhotos: fromPromise(async (): Promise<unknown[]> => []), // useListSharedPhotos
    // presignedUpload(files, category 'share', 압축 없음, pLimit 4, autoRetry 1):
    //  파일별 동시(≤4) → [HEIC? ensureJpegIfHeic] → createPresignedUpload → putBinary(%)
    //   → 실패 시 재시도(1) → 소진 시 파일 Error / 성공 시 onUploaded: register(createSharedPhoto, 실패 흡수)
    //  모든 파일 settle → 성공분 paths만 모아 UPLOAD_DONE(부분 실패여도 done).
    //  단계별 onProgress → sendBack PROGRESS. actor 예외(희귀) → UPLOAD_ERROR.
    presignedUploadActor: fromPromise(async (): Promise<{ paths: string[] }> => ({ paths: [] })),
  },
  actions: {
    setFiles: () => {},        // 선택 반영
    clearFiles: () => {},
    setError: () => {},
    updateProgress: () => {},  // PROGRESS
    appendUploaded: () => {},  // UPLOAD_DONE(성공 paths)
    reset: () => {},
    mapExisting: () => {},     // rows.map(+signedUrl) · 썸네일(병렬·실패시 placeholder)
  },
  guards: {
    hasLoungeId: () => true,
    withinCap: () => true,  // existing + files ≤ 100
    hasFiles: () => false,
  },
}).createMachine({
  id: 'sharePhotoUploadPage',
  context: { files: 0, existing: null, uploadedPaths: [], error: null },
  initial: 'gate',
  states: {
    gate: {
      always: [
        { guard: 'hasLoungeId', target: 'main' },
        { target: 'deadLounge' },
      ],
    },
    deadLounge: { type: 'final' }, // 'loungeId가 없습니다'(정지)

    main: {
      type: 'parallel',
      states: {
        // ── ① 기존 사진 로드 ──
        existingPhotos: {
          initial: 'loading',
          states: {
            // 데이터 없음·에러 아님 = 로딩 스피너(existing=null) → invoke pending
            loading: {
              invoke: {
                src: 'listSharedPhotos',
                onDone: { target: 'loaded', actions: 'mapExisting' }, // 데이터 있음
                onError: { target: 'empty' },                          // 조회 에러 → existing=[]
              },
            },
            loaded: {}, // existing=rows.map(+signedUrl)
            empty: {},  // existing=[]
          },
        },
        // ── ② 업로드 머신 ──
        uploader: {
          initial: 'idle',
          states: {
            idle: {
              on: {
                PICK: [
                  { guard: 'withinCap', target: 'selecting', actions: 'setFiles' },
                  { actions: 'setError' }, // 초과(미표시·선슬라이스로 사실상 미발생)
                ],
                CANCEL: { target: '#spExit' },
              },
            },
            selecting: {
              on: {
                PICK: { guard: 'withinCap', target: 'selecting', actions: 'setFiles' }, // 추가/삭제
                CLEAR: { target: 'idle', actions: 'clearFiles' },  // 전부삭제
                START: { guard: 'hasFiles', target: 'uploading' }, // 공유
                CANCEL: { target: '#spExit' },
              },
            },
            uploading: {
              invoke: {
                src: 'presignedUploadActor',
                onDone: { target: 'done', actions: 'appendUploaded' }, // UPLOAD_DONE(부분 실패여도)
                onError: { target: 'error', actions: 'setError' },     // UPLOAD_ERROR(actor 예외)
              },
              on: {
                PROGRESS: { actions: 'updateProgress' }, // 자기전이
              },
            },
            done: {
              on: {
                RESET: { target: 'idle', actions: 'reset' }, // 계속 올리기
                BACK: { target: '#spExit' },                 // 돌아가기
              },
            },
            error: {
              on: {
                RESET: { target: 'idle', actions: 'reset' },       // 처음으로
                START: { guard: 'hasFiles', target: 'uploading' }, // 다시 시도
              },
            },
          },
        },
      },
    },
    exit: { id: 'spExit', type: 'final' }, // navigate /lounge/:loungeId/v2
  },
});
