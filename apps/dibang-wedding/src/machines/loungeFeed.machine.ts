import { setup, assign } from "xstate";

// ---------- Types ----------

export interface LoungeFeedContext {
  /** 현재 피드 로딩 상태 에러 메시지 */
  errorMessage: string | null;
  /** 리프레시 시도 횟수 */
  refreshAttempts: number;
}

export type LoungeFeedEvent =
  | { type: "LOAD_SUCCESS" }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "REFRESH" }
  | { type: "REFRESH_SUCCESS" }
  | { type: "REFRESH_ERROR"; error: string }
  | { type: "RETRY" };

// ---------- Machine ----------

export const loungeFeedMachine = setup({
  types: {
    context: {} as LoungeFeedContext,
    events: {} as LoungeFeedEvent,
  },
  guards: {
    hasError: ({ context }) => context.errorMessage !== null,
  },
  actions: {
    setError: assign({
      errorMessage: (_, params: { error: string }) => params.error,
    }),
    clearError: assign({ errorMessage: null }),
    incrementRefreshAttempts: assign({
      refreshAttempts: ({ context }) => context.refreshAttempts + 1,
    }),
    resetRefreshAttempts: assign({ refreshAttempts: 0 }),
  },
}).createMachine({
  id: "loungeFeed",
  initial: "loading",

  context: {
    errorMessage: null,
    refreshAttempts: 0,
  },

  states: {
    loading: {
      description: "피드 초기 로딩 중",
      on: {
        LOAD_SUCCESS: {
          target: "idle",
          actions: "clearError",
        },
        LOAD_ERROR: {
          target: "error",
          actions: {
            type: "setError",
            params: ({ event }) => ({ error: event.error }),
          },
        },
      },
    },

    idle: {
      description: "피드 표시 중 — 무한스크롤 & 풀다운 새로고침 가능",
      on: {
        REFRESH: {
          target: "refreshing",
          actions: "incrementRefreshAttempts",
        },
      },
    },

    refreshing: {
      description: "풀다운 새로고침 중",
      on: {
        REFRESH_SUCCESS: {
          target: "idle",
          actions: ["clearError", "resetRefreshAttempts"],
        },
        REFRESH_ERROR: {
          target: "idle",
          actions: {
            type: "setError",
            params: ({ event }) => ({ error: event.error }),
          },
        },
      },
    },

    error: {
      description: "피드 로딩 실패",
      on: {
        RETRY: {
          target: "loading",
          actions: "clearError",
        },
      },
    },
  },
});
