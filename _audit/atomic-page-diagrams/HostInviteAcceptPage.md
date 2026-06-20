# HostInviteAcceptPage — 원자 단위 상태/액티비티 다이어그램

- **라우트:** `/invite/:token`
- **검증:** ✅ Opus 4.8 (1라운드)
- **요약:** 머신 없음. 초대 조회 로딩/에러 → status(accepted/cancelled/pending) 분기. pending이면 session 있으면 수락(→/my-wedding), 없으면 로그인 후 수락.

```mermaid
flowchart TB
  classDef st fill:#fff,stroke:#94a3b8,color:#334155;
  classDef async fill:#E8F4FA,stroke:#185FA5,color:#13324d;
  classDef warn fill:#fff7e6,stroke:#b8860b,color:#7a5b00;
  classDef done fill:#e9f7ef,stroke:#1e8449,color:#145a32;
  classDef term fill:#1E3A5F,stroke:#1E3A5F,color:#fff;
  classDef flat fill:#f1f5f9,stroke:#64748b,stroke-dasharray:4 3,color:#334155;
  START(["진입 /invite/:token"]):::term --> load["useGetHostInvite(token)"]:::async
  load --> ld{"isLoading?"}
  ld -- "예 → '불러오는 중...'" --> ld
  ld -- 아니오 --> err{"isError ∨ invite 없음?"}
  err -- "예 → '초대를 찾을 수 없습니다' + 돌아가기" --> EXITMW(["→ /my-wedding"]):::term
  err -- 아니오 --> st{"invite.status?"}
  st -- "accepted → '이미 수락된 초대' + 나의 결혼식으로" --> EXITMW
  st -- "cancelled → '취소된 초대' + 돌아가기" --> EXITMW
  st -- "그 외(pending) → 초대 상세(커플·날짜·역할)" --> detail["상세 화면"]:::st
  detail --> sessChk{"session 있음?"}
  sessChk -- "예 → 수락하기 [!isPending]" --> acc["acceptMutate"]:::async
  acc -- "성공 → navigate(/my-wedding)" --> EXITMW
  acc -. "(에러 콜백 없음 → 머무름)" .-> detail
  sessChk -- "아니오 → 로그인하고 수락하기" --> EXITLOGIN(["→ /login?redirect=/invite/token"]):::term
  detail -. "나중에 → /my-wedding" .-> EXITMW
```
