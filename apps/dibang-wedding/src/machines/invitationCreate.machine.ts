import { setup, assign } from 'xstate';

/**
 * invitationCreate.machine — /invitation/create 페이지 flow 제어 (프로덕션 연결본).
 *
 * 실제 페이지(InvitationCreatePage.tsx)를 단일 원천으로 작성.
 * 흐름: slugGate(공유링크 모달) → editing → saving → success / left.
 *
 * 역할 분리(STATE_MANAGEMENT.md §4 — 머신은 직접 fetch하지 않음):
 * - slug 가용성 조회·표시: SlugModal + useSlugCheck(서버상태) — 머신은 '확인 여부(CONFIRM)'만.
 * - 업로드 진행: useInvitationImageUpload(자체 머신) — 저장 시 uploadingNow 플래그로 전달.
 * - 폼 값/검증(validate): zustand store — 머신은 검증 '결과(missing 라벨)'만 받아 분기.
 * - 컴포넌트가 send → 전이 → React Query 호출 → 결과를 SAVE_SUCCESS/SAVE_ERROR로 send.
 *
 * ※ "한 머신에 업로드·저장 전 API·온체인까지 펼친" 리치/시뮬 버전은
 *    invitationCreate.design.machine.ts (Stately 설계용, 프로덕션 미연결).
 */

export interface InvitationCreateContext {
  /** 저장 차단/검증 안내 토스트 메시지 (없으면 null) */
  toast: string | null;
  /** 저장 실패 메시지 (SAVE_ERROR 보존) */
  saveError: string | null;
}

export type InvitationCreateEvent =
  | { type: 'CONFIRM_SLUG' } // SlugModal 확인 (canConfirm은 모달이 게이트)
  | { type: 'CLOSE' } // SlugModal 돌아가기 → 이탈
  | {
      type: 'SAVE';
      /** 커버/갤러리 업로드 진행 중 여부 (페이지가 업로드 훅 items에서 계산) */
      uploadingNow: boolean;
      /** ?weddingId 존재 = invitation 추가 모드 */
      isAddMode: boolean;
      /** 현재 slug (추가 모드 필수 검사용) */
      slug: string;
      /** 생성 모드 validate() 결과 — 첫 누락 필드 라벨, 없으면 null */
      missing: string | null;
    }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; error: string }
  | { type: 'DISMISS_TOAST' };

export const invitationCreateMachine = setup({
  types: {
    context: {} as InvitationCreateContext,
    events: {} as InvitationCreateEvent,
  },
  guards: {
    // 업로드 진행 중 — 저장 차단(진행 중 사진은 store에 없어 페이로드에서 빠짐)
    uploadingNow: ({ event }) => event.type === 'SAVE' && event.uploadingNow,
    // 추가 모드: slug 2자 미만
    addSlugInvalid: ({ event }) =>
      event.type === 'SAVE' && event.isAddMode && (!event.slug || event.slug.trim().length < 2),
    // 생성 모드: 필수 6칸 중 누락 존재(validate 결과)
    createHasMissing: ({ event }) =>
      event.type === 'SAVE' && !event.isAddMode && event.missing !== null,
  },
  actions: {
    toastUploadWait: assign({ toast: '사진 업로드가 끝나면 저장할 수 있어요' }),
    toastSlugRequired: assign({ toast: '공유 링크를 입력해주세요' }),
    toastMissing: assign({
      toast: ({ event }) =>
        event.type === 'SAVE' && event.missing ? `${event.missing}을(를) 입력해주세요` : null,
    }),
    clearToast: assign({ toast: null }),
    setSaveError: assign({
      saveError: ({ event }) => (event.type === 'SAVE_ERROR' ? event.error : null),
    }),
    clearSaveError: assign({ saveError: null }),
  },
}).createMachine({
  id: 'invitationCreate',
  context: { toast: null, saveError: null },
  initial: 'slugGate',
  states: {
    /** 공유링크(slug) 모달 — 확인 전까지 편집 진입 불가 */
    slugGate: {
      on: {
        CONFIRM_SLUG: { target: 'editing' },
        CLOSE: { target: 'left' },
      },
    },
    /** 편집 — 저장 시도 시 가드 체인으로 분기 (업로드중 → slug → 필수검증 → 저장) */
    editing: {
      on: {
        SAVE: [
          { guard: 'uploadingNow', actions: "toastUploadWait" }, // 머무름
          { guard: 'addSlugInvalid', actions: "toastSlugRequired" }, // 머무름
          { guard: 'createHasMissing', actions: "toastMissing" }, // 머무름
          { target: 'saving', actions: "clearToast" }, // 통과
        ],
        DISMISS_TOAST: { actions: "clearToast" },
      },
    },
    /** 저장 중 — 컴포넌트가 mutation 호출 후 결과를 send (버튼 비활성 = 이 상태) */
    saving: {
      entry: "clearSaveError",
      on: {
        SAVE_SUCCESS: { target: 'success' },
        SAVE_ERROR: { target: 'editing', actions: "setSaveError" },
      },
    },
    /** 저장 완료 — 컴포넌트가 reset() + navigate(/my-wedding) */
    success: { type: 'final' },
    /** 모달 돌아가기 — 컴포넌트가 navigate(/my-wedding) */
    left: { type: 'final' },
  },
});
