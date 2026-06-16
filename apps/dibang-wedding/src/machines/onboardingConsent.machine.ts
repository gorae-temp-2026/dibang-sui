import { setup, assign } from "xstate";

// ---------- Types ----------

export type TermsType =
  | "age_verification"
  | "service"
  | "privacy"
  | "marketing";

export interface OnboardingConsentContext {
  // 4개 약관 체크 상태 — key는 terms_type과 동일 (API body와 직결).
  age_verification: boolean;
  service: boolean;
  privacy: boolean;
  marketing: boolean;
  // 제출 후 리다이렉트할 URL (?next 쿼리)
  nextUrl: string;
  error: string | null;
}

export type OnboardingConsentEvent =
  | { type: "TOGGLE"; key: TermsType }
  | { type: "TOGGLE_ALL"; value: boolean }
  | { type: "SUBMIT" }
  | { type: "SUBMIT_SUCCESS" }
  | { type: "SUBMIT_ERROR"; error: string }
  | { type: "RETRY" };

// ---------- Helpers ----------

export function isRequiredAllChecked(ctx: OnboardingConsentContext): boolean {
  return ctx.age_verification && ctx.service && ctx.privacy;
}

// ---------- Machine ----------

export const onboardingConsentMachine = setup({
  types: {
    context: {} as OnboardingConsentContext,
    events: {} as OnboardingConsentEvent,
  },
  actions: {
    toggleOne: assign(({ context, event }) => {
      if (event.type !== "TOGGLE") return {};
      return { [event.key]: !context[event.key] };
    }),
    toggleAll: assign(({ event }) => {
      if (event.type !== "TOGGLE_ALL") return {};
      return {
        age_verification: event.value,
        service: event.value,
        privacy: event.value,
        marketing: event.value,
      };
    }),
    setError: assign({
      error: (_, params: { error: string }) => params.error,
    }),
    clearError: assign({ error: null }),
  },
  guards: {
    canSubmit: ({ context }) => isRequiredAllChecked(context),
  },
}).createMachine({
  id: "onboardingConsent",
  initial: "editing",
  context: {
    age_verification: false,
    service: false,
    privacy: false,
    marketing: false,
    nextUrl: "/my-wedding",
    error: null,
  },
  states: {
    editing: {
      on: {
        TOGGLE: { actions: "toggleOne" },
        TOGGLE_ALL: { actions: "toggleAll" },
        SUBMIT: {
          target: "submitting",
          guard: "canSubmit",
          actions: "clearError",
        },
      },
    },
    submitting: {
      // service는 호출 측에서 mutation 발사 후 SUBMIT_SUCCESS/ERROR 이벤트 보냄
      on: {
        SUBMIT_SUCCESS: "success",
        SUBMIT_ERROR: {
          target: "editing",
          actions: {
            type: "setError",
            params: ({ event }) =>
              event.type === "SUBMIT_ERROR" ? { error: event.error } : { error: "unknown" },
          },
        },
      },
    },
    success: { type: "final" },
  },
});
