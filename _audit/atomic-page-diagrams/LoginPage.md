# LoginPage — 원자 단위 상태/액티비티 다이어그램

- **라우트:** `/login` (`?redirect`)
- **검증:** ✅ Opus 4.8 (1라운드)
- **요약:** 머신 없음(React Query+useState). 이미 로그인이면 redirect로. 구글 OAuth(성공 시 url로 이동)·DEV 이메일 로그인. redirect 안전검사.

```mermaid
flowchart TB
  classDef st fill:#fff,stroke:#94a3b8,color:#334155;
  classDef async fill:#E8F4FA,stroke:#185FA5,color:#13324d;
  classDef warn fill:#fff7e6,stroke:#b8860b,color:#7a5b00;
  classDef done fill:#e9f7ef,stroke:#1e8449,color:#145a32;
  classDef term fill:#1E3A5F,stroke:#1E3A5F,color:#fff;
  classDef flat fill:#f1f5f9,stroke:#64748b,stroke-dasharray:4 3,color:#334155;
  START(["진입 /login ?redirect"]):::term --> redir["redirectAfter = 안전검사(/로시작 ∧ //아님 ∧ ≠/login·/auth/callback) 아니면 /my-wedding (값변환)"]:::flat
  redir --> authChk{"isReady ∧ session 있음?"}
  authChk -- 예 --> EXITR(["navigate(redirectAfter, replace)"]):::term
  authChk -- "아니오(로그인 화면)" --> screen["로그인 화면: 구글 버튼 (DEV: 이메일·비번)"]:::st
  screen -- "구글로 계속하기 [!isPending]" --> g["signInGoogle.mutate({redirectTo})"]:::async
  g -- "성공·data.url 있음 → window.location.href=data.url" --> EXTOAUTH(["외부: Google OAuth"]):::term
  g -- "성공·url 없음 → 무동작(머무름)" --> screen
  g -- "실패(onError) → alert" --> screen
  screen -. "DEV: 이메일로 로그인" .-> em{"email ∧ password 있음?"}
  em -- "아니오 → alert('이메일과 비밀번호 입력')" --> screen
  em -- 예 --> sp["signInPassword.mutate({email,password})"]:::async
  sp -- "성공 → navigate(redirectAfter)" --> EXITR
  sp -- "실패 → alert" --> screen
```
> 노트: 버튼 disabled = signInGoogle.isPending ∨ signInPassword.isPending. DEV 블록은 `import.meta.env.DEV`. redirectTo = redirectAfter≠/my-wedding이면 콜백 URL에 `?redirect` 부착.
