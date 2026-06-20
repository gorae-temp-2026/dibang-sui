# LoungeCheckInGatePage — 원자 단위 상태/액티비티 다이어그램

- **라우트:** `/lounge/:loungeId/enter` (`?name·recipient_slot·relation_category·relation_detail`)
- **검증:** ✅ Opus 4.8 (2라운드)
- **요약:** xstate `loungeCheckInGate.machine` **실제 구동**(checking→hasEntry/form/error · form→submitting→done/form). 페이지 고유: 인증 가드(미인증→로그인 리다이렉트), checking↔쿼리 브리지, guest-web 쿼리 prefill→자동입장(1회), handleSubmit(이름 변경 시 updateMe→createEntry, 각 실패 분기), hasEntry/done→v2 리다이렉트. 비동기는 actor 아닌 페이지 측.

```mermaid
flowchart TB
  classDef st fill:#fff,stroke:#94a3b8,color:#334155;
  classDef async fill:#E8F4FA,stroke:#185FA5,color:#13324d;
  classDef warn fill:#fff7e6,stroke:#b8860b,color:#7a5b00;
  classDef done fill:#e9f7ef,stroke:#1e8449,color:#145a32;
  classDef term fill:#1E3A5F,stroke:#1E3A5F,color:#fff;
  classDef flat fill:#f1f5f9,stroke:#64748b,stroke-dasharray:4 3,color:#334155;
  classDef mstate fill:#eef2ff,stroke:#4f46e5,color:#312e81;
  START(["진입 /lounge/:loungeId/enter ?name·recipient·relation·detail"]):::term --> authGate{"isReady ∧ !session?"}
  EXITLOGIN(["→ /login?redirect=enter+쿼리 (미인증)"]):::term
  EXITV2(["→ /lounge/:loungeId/v2"]):::term
  authGate -- "예(미인증)" --> EXITLOGIN
  authGate -- "아니오(세션 있음/대기)" --> prefill["쿼리 prefill 파싱·검증(enum 밖→null)<br/>hasQueryPrefill=recipient∧relation 유효 · 폼 init"]:::flat
  prefill --> checking
  checking["checking ('확인 중...')"]:::mstate
  checking --> chkQ{"useCheckMyCheckIn 결과 (enabled: checking∧session)"}
  chkQ -- "로딩 중 → 대기" --> checking
  chkQ -- "성공·entry 있음 → CHECK_SUCCESS/setExistingEntry" --> hasEntry
  chkQ -- "성공·entry 없음 → CHECK_NOT_FOUND" --> form
  chkQ -- "에러 → CHECK_ERROR/setError" --> error
  hasEntry["hasEntry"]:::mstate -. "navigate v2(replace)" .-> EXITV2
  error["error ('오류' 화면)"]:::mstate -- "다시 시도 RETRY/clearError" --> checking
  form["form (입장 게이트 상태)"]:::mstate
  form -. "자동입장 [hasQueryPrefill ∧ isFormValid · autoSubmittedRef 1회] → send SUBMIT" .-> submitting
  form --> formUI["폼 표시·필드 입력(flat·수동) · isFormValid=이름∧수신인∧관계"]:::flat
  formUI -- "라운지 입장하기 [isFormValid] → send SUBMIT" --> submitting
  formUI -. "미입력 시 버튼 비활성" .-> formUI
  submitting["submitting ('입장 중...')"]:::mstate
  submitting --> nameChk{"이름 변경?(trim ∧ ≠ me.name)"}
  nameChk -- 예 --> updMe["updateMe.mutateAsync({name})"]:::async
  updMe -- "실패 → SUBMIT_ERROR('이름 저장 실패')/setError" --> form
  updMe -- 성공 --> createE
  nameChk -- 아니오 --> createE["createEntry.mutateAsync({loungeId,body})"]:::async
  createE -- "성공 → SUBMIT_SUCCESS(entryId)/setCreatedEntry" --> done
  createE -- "실패 → SUBMIT_ERROR('입장 실패')/setError" --> form
  done["done"]:::mstate -. "navigate v2(replace)" .-> EXITV2
```
