# OnboardingConsentPage — 원자 단위 상태/액티비티 다이어그램

- **라우트:** `/onboarding/consent` (`?next`)
- **검증:** ✅ Opus 4.8 (1라운드)
- **요약:** xstate `onboardingConsent.machine` **실제 구동**(editing→submitting→success). 토글(TOGGLE/TOGGLE_ALL)은 editing 자기전이. `동의하고 시작`은 canSubmit(필수 3개 age·service·privacy; marketing 선택)일 때만 SUBMIT→submitting. 제출은 createConsents.mutateAsync → 성공 SUBMIT_SUCCESS→success(final) / 실패 SUBMIT_ERROR→editing(에러 표시). success 진입 시 getMe 캐시 consents_required=[] 낙관적 갱신 + invalidate + navigate(nextUrl, replace). RETRY는 선언만 되고 미처리(dead).

```mermaid
flowchart TB
  classDef st fill:#fff,stroke:#94a3b8,color:#334155;
  classDef async fill:#E8F4FA,stroke:#185FA5,color:#13324d;
  classDef warn fill:#fff7e6,stroke:#b8860b,color:#7a5b00;
  classDef done fill:#e9f7ef,stroke:#1e8449,color:#145a32;
  classDef term fill:#1E3A5F,stroke:#1E3A5F,color:#fff;
  classDef flat fill:#f1f5f9,stroke:#64748b,stroke-dasharray:4 3,color:#334155;
  classDef mstate fill:#eef2ff,stroke:#4f46e5,color:#312e81;
  START(["진입 /onboarding/consent ?next"]):::term --> nextDer["nextUrl = ?next || /my-wedding (값 변환)"]:::flat
  nextDer --> editing
  EXIT(["이탈 → nextUrl (기본 /my-wedding, replace)"]):::term
  editing["editing (전체동의 + 필수3 + 선택1 체크박스 · '동의하고 시작')"]:::mstate
  editing -. "ConsentRow 토글 → TOGGLE(key)/toggleOne" .-> editing
  editing -. "전체 동의 → TOGGLE_ALL(!allChecked)/toggleAll" .-> editing
  editing -. "버튼 disabled: !canSubmit ∨ submitting" .-> editing
  editing -- "동의하고 시작 [canSubmit: 필수3 age·service·privacy] → SUBMIT/clearError" --> submitting
  submitting["submitting ('처리 중...')"]:::mstate
  submitting --> mut["createConsents.mutateAsync({items: age·service·privacy·marketing})"]:::async
  mut -- "성공 → SUBMIT_SUCCESS" --> success
  mut -- "실패(catch) → SUBMIT_ERROR/setError (editing서 에러 표시)" --> editing
  success["success (final)"]:::mstate
  success --> okEff["success effect: getMe.consents_required=[] (낙관적) + invalidate(getMe) + navigate(nextUrl, replace)"]:::done
  okEff --> EXIT
```
