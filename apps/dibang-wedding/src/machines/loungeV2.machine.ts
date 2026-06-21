import { setup, assign } from "xstate";

// ---------- Types ----------

export interface LoungeV2Context {
  /** 피드 로딩 에러 메시지 */
  errorMessage: string | null;
  /** 풀다운 새로고침 시도 횟수 */
  refreshAttempts: number;
}

export type LoungeV2Event =
  | { type: "LOAD_SUCCESS" }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "REFRESH" }
  | { type: "REFRESH_SUCCESS" }
  | { type: "REFRESH_ERROR"; error: string }
  | { type: "RETRY" };

// ---------- Machine ----------
//
// 웨딩 라운지 V2 페이지의 lifecycle 제어.
// V1 loungeFeed.machine.ts와 동일한 흐름(loading→idle→refreshing/error)을
// 따른다. STATE_MANAGEMENT.md 컨벤션: setup() 패턴, named guard/action,
// machine은 직접 fetch하지 않고 컴포넌트가 send로 결과를 돌려준다.

export const loungeV2Machine = setup({
  types: {
    context: {} as LoungeV2Context,
    events: {} as LoungeV2Event,
  },
  guards: {
    // 새로고침 누적 실패 3회 이상 → error 상태로 격리(자동 무한재시도 방지).
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
  id: "loungeV2",
  initial: "loading",

  context: {
    errorMessage: null,
    refreshAttempts: 0,
  },

  states: {
    loading: {
      description: "라운지 V2 초기 로딩 중",
      on: {
        LOAD_SUCCESS: { target: "idle", actions: "clearError" },
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
      description: "라운지 표시 중 — 무한스크롤 & 풀다운 새로고침 가능",
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
        REFRESH_ERROR: [
          {
            guard: "maxRefreshFailsReached",
            target: "error",
            actions: { type: "setError", params: ({ event }) => ({ error: event.error }) },
          },
          {
            target: "idle",
            actions: { type: "setError", params: ({ event }) => ({ error: event.error }) },
          },
        ],
      },
    },

    error: {
      description: "라운지 로딩 실패",
      on: {
        RETRY: { target: "loading", actions: ["clearError", "resetRefreshAttempts"] },
      },
    },
  },
});
