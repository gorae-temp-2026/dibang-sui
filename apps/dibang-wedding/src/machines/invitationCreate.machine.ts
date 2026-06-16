import { setup, assign } from "xstate";

// ---------- Types ----------

export interface InvitationCreateContext {
  /** slug 검증 상태 */
  slugStatus: "idle" | "checking" | "available" | "taken" | "error";
  /** 업로드 중인 파일 수 */
  uploadsInProgress: number;
  /** 폼 검증 에러 목록 */
  validationErrors: string[];
  /** 저장 시도 횟수 */
  saveAttempts: number;
  /** 저장 실패 에러 메시지 */
  saveError: string | null;
  /** 폼이 수정되었는지 (미저장 경고용) */
  isDirty: boolean;
}

export type InvitationCreateEvent =
  | { type: "FIELD_CHANGED" }
  | { type: "SLUG_CHANGED"; slug: string }
  | { type: "SLUG_CHECK_START" }
  | { type: "SLUG_AVAILABLE" }
  | { type: "SLUG_TAKEN" }
  | { type: "SLUG_ERROR" }
  | { type: "UPLOAD_START" }
  | { type: "UPLOAD_SUCCESS" }
  | { type: "UPLOAD_ERROR"; error: string }
  | { type: "SAVE" }
  | { type: "SAVE_SUCCESS" }
  | { type: "SAVE_ERROR"; error: string }
  | { type: "RETRY" }
  | { type: "NAVIGATE_AWAY" }
  | { type: "CONFIRM_LEAVE" }
  | { type: "CANCEL_LEAVE" };

// ---------- Machine ----------

export const invitationCreateMachine = setup({
  types: {
    context: {} as InvitationCreateContext,
    events: {} as InvitationCreateEvent,
  },
  guards: {
    isSlugAvailable: ({ context }) => context.slugStatus === "available",
    hasNoUploadsInProgress: ({ context }) => context.uploadsInProgress === 0,
    isDirty: ({ context }) => context.isDirty,
    isNotDirty: ({ context }) => !context.isDirty,
    hasValidationErrors: ({ context }) => context.validationErrors.length > 0,
    isLastUpload: ({ context }) => context.uploadsInProgress <= 1,
  },
  actions: {
    markDirty: assign({ isDirty: true }),
    setSlugChecking: assign({ slugStatus: "checking" }),
    setSlugAvailable: assign({ slugStatus: "available" }),
    setSlugTaken: assign({ slugStatus: "taken" }),
    setSlugError: assign({ slugStatus: "error" }),
    incrementUploads: assign({
      uploadsInProgress: ({ context }) => context.uploadsInProgress + 1,
    }),
    decrementUploads: assign({
      uploadsInProgress: ({ context }) =>
        Math.max(0, context.uploadsInProgress - 1),
    }),
    incrementSaveAttempts: assign({
      saveAttempts: ({ context }) => context.saveAttempts + 1,
    }),
    setSaveError: assign({
      saveError: (_, params: { error: string }) => params.error,
    }),
    clearSaveError: assign({ saveError: null }),
    clearValidationErrors: assign({ validationErrors: [] }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QEsB2A3ZAXAhl5A9qgMIBOYeYAdAGYA2BA7lZNmlAMQBiAkgKIAZACIB9YgAkAggDkA4nyEBtAAwBdRKAAOBWGyIaQAD0QAWABwmqATisAmAIwA2e8oDsFs7YDMAVgA0IACeiGbKXlQmPl5WXq6OdibetgC+yQFomLj4RGQUWNT0TCwQbKicAMqSAGp8KupIINq62agGxgiu0VSu9mY9yvZeXvb2Pq4BwQg2tlRO0Y62Zs7KfY6p6RjYeIQk5JS0DMys+GUc0tU8spIAKnwikgDqkgCadQZNeq0N7Z1W3b39QbDUbjIKIRxmP4OFYmVwmKzOBLrEAZLYtXL7QpHEonTjnKqXG53R4vRT2epaHSfNqIX7-PouIEjMYTEL2Vz-Fa+RwQuw+ZGorI7DH5A5FdA4OjICDbU5vBofFo0hBmMbWOz2WwIqJRRwmVlTEyOWaOaK2HwW2LKZQmAWbIU5PairFUCVSmW4jhkimNKlK76ITVWDluUJGxI+CxeA0xMwRRxc9wrQYpNIo+3bR15AqHV2S6WyziKWw+xU7ZVWEbWLUJxKV5xRGPWk1eMxt2xG4ZDO2ZTO7bNi5iwHCYU6VGoicoAVWIxD45XK8spzXLAYQvS8MzrkdbrchjgNmtisxMNr1MUj8VcPbRwqdOaKw9HFWqdz4ACV3wB5d9L30r-Q10GZwqBrdwfA7C1bFBSYXErWY+lPBZIk1EwvBvB1+0xXMnzAPhSFIAhSA4d8+Gud9XjUd4-VXUB2k3SxnB6VVXDcND3EPbxLEraIfGcLULDQjC+xFB8hxHPCCKI7h+GEMQpDkBQ-zLQC6MQBiqCY3oxjY2IzANVUZiiWwHHhM9W2vNNBRE+9ByoABjIgaGQUgAFt2AECh0DADhiC-aReHfABZEQBD4V9lJo1SjEDLUQyTcNzSjA1HDiUCXFVLxTysTxnGE9FbJdRzUGctyPK8nziBkOcBFC8KakigCvjUlUrB8boETMRlrR6NqUtbTkowcVwRq6-K7wHWA6AAVygKhpToHzygEKdZHkvhiAAaUna5JHfa5GupNcvDCawEz5BEXEjQ8TFPKgllYiCzFiOweXGrN9im2aHIACzAeyAGt2A4ZbVvuKpJB4ARJAAITCw7-RaoZlCoC0jRGnL4QRfUwXXPVLAesIrDQiEQXerDRS+ub7L+wHgdBtbds2vhpAR2iYoQLwFnVUyTpiVsWVx+x4XsKguceno5hMexydEqgqd+-6gbHFa1o-b9fyohUouajnHDVStT3ZBFTXNQ8fHhawfCJi3pZBfkrIzArJpmuaRxwZA6BwAAjRaQdV9atp2vaDq15cjqR06EWUC7lmuoWfGJsXUrCHxRgsAZbUd3tnc+12qFwAGwFQf2wYkDbtvKXb9rZ6L6Kj87zUu5R49gi3RcJ5xolhKDZdshWwCk4iGcDyvq9D0sdeVfWOUNgZXBNzd-CFrGImt6IRgWOFfD7gdps0BgcAgeaID9qcAAUBC-SRRCrkPa919pTM01wdI7JY2y6g9cb+B60I7GOu5TRWF3vsfeh9j7gIIEfYGF8r432DjXMO-4I4cyiHGdkzh4RcwZEMA0ABaGw3QTq3VYjyG0O9s63g+qKKBR8qB0JKKcOB19b4zjnAuB+yoHDtWBKlL+DguZ8UPF0SsFowiJFGBBWEoDaEH2gZA+RMDmGX1YZOdh85Fzkmok1ZUWVwjmkjAvSItYwjf0mB2SwiceRRkMqabsVDMJy0YQwpRTDOAsIQerH8XC1wWjjIhHoFpxGalsAaXwfx+IxGDF3Fu6FHE2T3m41xEDYGqK8Z+Hx2jta6LXJWFGMJrZtnsDYIp4TE6aSDNEOIgw4mpDTKgAgEA4AGGsrnfIOjUHtHwSdTSqp4jwmgosWwFCCHQUsJ0ChHZvBWhlgk9pYlOmIw5h2A0FpRbQmeidaCFsTKyLEsUUoUAlns3aGMDkmoXCuDipuTcYTcb7mIVEZGtgeRDP2XZN0BZcQnLroGGE3R9YWjaqMeeMFEBtRRjxGwThN5GlTBsHOE1sKPhHOwX5j9AxRBRoMuCm4Y4W04qMMWVgwiQhKcsPZ8zkXOhwhJfChFSAYuVNcw8MctyDGDBZNiFsPkulgNNey9k4DwByV0xAIzBigSxk4CC+tTz6SFs-YWNojS9DcBbSyiLqEUwOcVUq7kyieQksyoCMdLDDHXoY8wJkcaTHlfGFYnRFg2H0Xy3Mi0aBYFNS1UYvTcWAJGW1O1tIF6aXGXEBsrFXkfKpj6lZIb1y+HCFzeI1S9wLDmdqpx-d84LTAPGp+xKjQx05bEXoppFWwVuqLcWLdFgvVeWsalNDqAKxpkrdFYrllnM3KjYYJllALBGSse5bdEjJzIZynuEFY353dp7H2i1C20jHYGBMcZIgSMesoGNLbdXy3zoXYuK6pg4ohHEVs8I9QJmXm3XdVsbTagGOLOd31B6MtPasCIUZNRbx2fYc2UrnmsROhbBMvQPmMNPeyMWwswNuGgsbQWkx8EAlAiQ2E0csqhKg8k-Np79ZwbQi3RDPQF7mPUjMKMOUBgW33EaPDECUkKK7eHHtpgiPkfiDaCwLhTSUc5tRtCtHRjmGxs21IQA */
  id: "invitationCreate",
  type: "parallel",

  context: {
    slugStatus: "idle",
    uploadsInProgress: 0,
    validationErrors: [],
    saveAttempts: 0,
    saveError: null,
    isDirty: false,
  },

  states: {
    /** 메인 페이지 flow */
    flow: {
      initial: "editing",
      states: {
        editing: {
          on: {
            FIELD_CHANGED: { actions: "markDirty" },
            SAVE: [
              {
                guard: "hasNoUploadsInProgress",
                target: "validating",
              },
              // 업로드 중이면 SAVE 무시 (불가능한 액션)
            ],
            NAVIGATE_AWAY: [
              { guard: "isDirty", target: "confirmingLeave" },
              { guard: "isNotDirty", target: "left" },
            ],
          },
        },

        validating: {
          description: "필수 필드 검증 + slug 상태 확인",
          always: [
            {
              guard: "hasValidationErrors",
              target: "editing",
            },
            {
              guard: "isSlugAvailable",
              target: "saving",
              actions: ["clearSaveError", "incrementSaveAttempts"],
            },
            // slug가 available이 아니면 editing으로 복귀
            {
              target: "editing",
            },
          ],
        },

        saving: {
          description: "createWedding + updateInvitation API 호출",
          on: {
            SAVE_SUCCESS: { target: "success" },
            SAVE_ERROR: {
              target: "saveError",
              actions: {
                type: "setSaveError",
                params: ({ event }) => ({ error: event.error }),
              },
            },
          },
        },

        saveError: {
          description: "저장 실패 — 재시도 또는 편집으로 복귀",
          on: {
            RETRY: { target: "saving", actions: "incrementSaveAttempts" },
            FIELD_CHANGED: {
              target: "editing",
              actions: ["markDirty", "clearSaveError"],
            },
          },
        },

        success: {
          description: "저장 완료 — 컴포넌트에서 navigate 처리",
          type: "final",
        },

        confirmingLeave: {
          description: "미저장 변경사항 경고 모달",
          on: {
            CONFIRM_LEAVE: { target: "left" },
            CANCEL_LEAVE: { target: "editing" },
          },
        },

        left: {
          description: "페이지 이탈 확정",
          type: "final",
        },
      },
    },

    /** slug 검증 (메인 flow와 병렬) */
    slug: {
      initial: "idle",
      states: {
        idle: {
          on: {
            SLUG_CHECK_START: { target: "checking" },
          },
        },
        checking: {
          on: {
            SLUG_AVAILABLE: { target: "available" },
            SLUG_TAKEN: { target: "taken" },
            SLUG_ERROR: { target: "error" },
          },
        },
        available: {
          entry: "setSlugAvailable",
          on: { SLUG_CHECK_START: { target: "checking" } },
        },
        taken: {
          entry: "setSlugTaken",
          on: { SLUG_CHECK_START: { target: "checking" } },
        },
        error: {
          entry: "setSlugError",
          on: { SLUG_CHECK_START: { target: "checking" } },
        },
      },
    },

    /** 이미지 업로드 추적 (메인 flow와 병렬) */
    upload: {
      initial: "idle",
      states: {
        idle: {
          on: {
            UPLOAD_START: { target: "uploading", actions: "incrementUploads" },
          },
        },
        uploading: {
          on: {
            UPLOAD_START: { actions: "incrementUploads" },
            UPLOAD_SUCCESS: [
              {
                guard: "isLastUpload",
                target: "idle",
                actions: "decrementUploads",
              },
              { actions: "decrementUploads" },
            ],
            UPLOAD_ERROR: [
              {
                guard: "isLastUpload",
                target: "idle",
                actions: "decrementUploads",
              },
              { actions: "decrementUploads" },
            ],
          },
        },
      },
    },
  },
});
