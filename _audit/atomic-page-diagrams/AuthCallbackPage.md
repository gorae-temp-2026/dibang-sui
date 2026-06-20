# AuthCallbackPage — 원자 단위 상태/액티비티 다이어그램

- **라우트:** `/auth/callback` (`?code`, `?redirect`)
- **검증:** ✅ Opus 4.8 (2라운드 — 10초 타임아웃 페이지 레벨로 정정)
- **요약:** 머신 없음. isReady 대기 → session 있으면 복귀/이탈, 없으면 code(PKCE) 있으면 세션 대기, 없으면 /login. 마운트 시 10초 타임아웃이 페이지 레벨로 무조건 가동되어 어느 대기서든 /login으로 탈출.

```mermaid
flowchart TB
  classDef st fill:#fff,stroke:#94a3b8,color:#334155;
  classDef async fill:#E8F4FA,stroke:#185FA5,color:#13324d;
  classDef warn fill:#fff7e6,stroke:#b8860b,color:#7a5b00;
  classDef done fill:#e9f7ef,stroke:#1e8449,color:#145a32;
  classDef term fill:#1E3A5F,stroke:#1E3A5F,color:#fff;
  classDef flat fill:#f1f5f9,stroke:#64748b,stroke-dasharray:4 3,color:#334155;
  START(["진입 /auth/callback ?code ?redirect ('로그인 처리 중...')"]):::term --> ready{"isReady?"}
  ready -- "아니오 → 대기" --> ready
  ready -- 예 --> sess{"session 있음?"}
  sess -- "예 → navigate(safe redirect ?? /my-wedding, replace)" --> EXITOK(["복귀/이탈"]):::done
  sess -- 아니오 --> code{"?code 있음?(PKCE)"}
  code -- "예 → onAuthStateChange 세션 대기" --> waitS["대기"]:::st
  waitS -. "세션 도착 → effect 재평가" .-> sess
  code -- "아니오 → navigate(/login[?redirect 보존], replace)" --> EXITLOGIN(["→ /login"]):::warn
  START -. "마운트 시 10초 타이머 무조건 가동(언마운트 시 취소)" .-> t10["10초 경과"]:::warn
  t10 -. "어느 대기(미준비·PKCE)서든 탈출 → navigate(/login, replace)" .-> EXITLOGIN
```
