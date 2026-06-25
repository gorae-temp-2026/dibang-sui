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
    // 새로고침 누적 실패 3회 이상 → 일시 오류가 아니라 error 상태로 격리(자동 무한재시도 방지).
    maxRefreshFailsReached: ({ context }) => context.refreshAttempts >= 3,
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBsD2BXAdjAYmSAdGgIYQCW2AxADIDyAggCID6AygKoDCnAoq6wG0ADAF1EoAA6pYZAC5lUmcSAAeiAKwBmACwAaEAE9EmgIwB2AL4X9aLLnwQiqUhSg0GLHgCUvtL8LEkECkZeUVlNQQAJgBOAA4CADZklNSUzX0jBFNLaxBbbDA8QjIIZDBKLx4cKtYACQDlELkFJSDI9XU9Q0REkyirGwxC4scAJzAAMwnYAAtXSuraurYuXn5GoOawttBIqMS4zI0YzUH84ftCCem4eaoqmr4V719-USbpFvD23qFjhB9AZ5ApXRxgMZjVBjRYAFS8AE1NpIvjsIogYkIkmkcYkMj1suYrHlMKgIHBlKCig5PqFWuiEP0ASYziDLtTCCRyNhad9dqoNFF-gSTHETOcqaMCKVyry0b8ENpEt0stp1LkhnYOeMpjN7lA5fSFZooiYAWYzOK2VqpRCoWNDT89sYhOoAWrclYgA */
  id: "loungeFeed",
  initial: "loading",

  context: {
    errorMessage: null,
    refreshAttempts: 0,
  },

  states: {
    loading: {
      description: "Feed initial loading",
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
      description: "Showing feed — infinite scroll & pull-to-refresh available",
      on: {
        REFRESH: {
          target: "refreshing",
          actions: "incrementRefreshAttempts",
        },
      },
    },

    refreshing: {
      description: "Pull-to-refresh in progress",
      on: {
        REFRESH_SUCCESS: {
          target: "idle",
          actions: ["clearError", "resetRefreshAttempts"],
        },
        REFRESH_ERROR: [
          {
            // 누적 실패 임계 초과 → error 상태로 격리(RETRY로만 복구)
            guard: "maxRefreshFailsReached",
            target: "error",
            actions: { type: "setError", params: ({ event }) => ({ error: event.error }) },
          },
          {
            // 임계 미만 → idle 유지(다시 풀다운 새로고침 가능)
            target: "idle",
            actions: { type: "setError", params: ({ event }) => ({ error: event.error }) },
          },
        ],
      },
    },

    error: {
      description: "Feed load failed",
      on: {
        RETRY: {
          target: "loading",
          actions: ["clearError", "resetRefreshAttempts"],
        },
      },
    },
  },
});
