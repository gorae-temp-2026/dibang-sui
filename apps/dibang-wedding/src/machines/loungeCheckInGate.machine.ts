import { setup, assign } from "xstate";

// ---------- Types ----------

export interface LoungeCheckInGateContext {
  loungeId: string;
  /** 기존 방명록 entry가 있는 경우 해당 ID */
  existingEntryId: string | null;
  /** 방명록 작성 중 생성된 entry ID */
  createdEntryId: string | null;
  error: string | null;
}

export type LoungeCheckInGateEvent =
  | { type: "CHECK_SUCCESS"; entryId: string }
  | { type: "CHECK_NOT_FOUND" }
  | { type: "CHECK_ERROR"; error: string }
  | { type: "SUBMIT" }
  | { type: "SUBMIT_SUCCESS"; entryId: string }
  | { type: "SUBMIT_ERROR"; error: string }
  | { type: "RETRY" };

// ---------- Machine ----------

export const loungeCheckInGateMachine = setup({
  types: {
    context: {} as LoungeCheckInGateContext,
    events: {} as LoungeCheckInGateEvent,
  },
  actions: {
    setExistingEntry: assign({
      existingEntryId: (_, params: { entryId: string }) => params.entryId,
    }),
    setCreatedEntry: assign({
      createdEntryId: (_, params: { entryId: string }) => params.entryId,
    }),
    setError: assign({
      error: (_, params: { error: string }) => params.error,
    }),
    clearError: assign({ error: null }),
  },
}).createMachine({
  id: "loungeCheckInGate",
  initial: "checking",

  context: {
    loungeId: "",
    existingEntryId: null,
    createdEntryId: null,
    error: null,
  },

  states: {
    checking: {
      description: "로그인 유저의 LoungeCheckIn 존재 여부 확인 중",
      on: {
        CHECK_SUCCESS: {
          target: "hasEntry",
          actions: {
            type: "setExistingEntry",
            params: ({ event }) => ({ entryId: event.entryId }),
          },
        },
        CHECK_NOT_FOUND: {
          target: "form",
        },
        CHECK_ERROR: {
          target: "error",
          actions: {
            type: "setError",
            params: ({ event }) => ({ error: event.error }),
          },
        },
      },
    },

    hasEntry: {
      description: "이미 입장한 적 있음 — 라운지로 리디렉트",
    },

    form: {
      description: "관계 정보 입력 폼 표시",
      on: {
        SUBMIT: {
          target: "submitting",
        },
      },
    },

    submitting: {
      description: "라운지 입장(LoungeCheckIn 생성) API 호출 중",
      on: {
        SUBMIT_SUCCESS: {
          target: "done",
          actions: {
            type: "setCreatedEntry",
            params: ({ event }) => ({ entryId: event.entryId }),
          },
        },
        SUBMIT_ERROR: {
          target: "form",
          actions: {
            type: "setError",
            params: ({ event }) => ({ error: event.error }),
          },
        },
      },
    },

    done: {
      description: "입장 완료 — 라운지로 리디렉트",
    },

    error: {
      description: "확인 실패",
      on: {
        RETRY: {
          target: "checking",
          actions: "clearError",
        },
      },
    },
  },
});
