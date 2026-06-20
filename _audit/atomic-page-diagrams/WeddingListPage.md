# WeddingListPage — 원자 단위 상태/액티비티 다이어그램

- **라우트:** `/wedding-list` (`?weddingId`, `?entryId`)
- **검증:** ✅ Opus 4.8 (1라운드)
- **요약:** 머신 없음. ?weddingId 있으면 join 1회(onSettled로 URL param 제거). 참여 결혼식 조회 → 예정/지난 분리 → EventCard → 라운지 v2.

```mermaid
flowchart TB
  classDef st fill:#fff,stroke:#94a3b8,color:#334155;
  classDef async fill:#E8F4FA,stroke:#185FA5,color:#13324d;
  classDef warn fill:#fff7e6,stroke:#b8860b,color:#7a5b00;
  classDef done fill:#e9f7ef,stroke:#1e8449,color:#145a32;
  classDef term fill:#1E3A5F,stroke:#1E3A5F,color:#fff;
  classDef flat fill:#f1f5f9,stroke:#64748b,stroke-dasharray:4 3,color:#334155;
  START(["진입 /wedding-list ?weddingId ?entryId"]):::term --> joinChk{"?weddingId 있음 ∧ joinedRef 미실행?"}
  joinChk -- "예 → joinWedding.mutate({weddingId,entryId})" --> join["joinWedding.mutate"]:::async
  join -. "onSettled(성공/실패 무관) → URL param 제거(replace)" .-> listLoad
  joinChk -- 아니오 --> listLoad
  listLoad["getMyParticipatedWeddings"]:::async --> ld{"isLoading?"}
  ld -- "예 → '불러오는 중...'(예정·지난 섹션 각각)" --> ld
  ld -- 아니오 --> split["upcoming/past 날짜로 분리 (파생)"]:::flat
  split --> up{"예정 0건?"}
  up -- "예 → '예정된 결혼식이 없습니다'" --> upEmpty["빈 상태"]:::flat
  up -- 아니오 --> upList["예정 EventCard 목록"]:::st
  split --> pa{"지난 0건?"}
  pa -- "예 → '지난 결혼식이 없습니다'" --> paEmpty["빈 상태"]:::flat
  pa -- 아니오 --> paList["지난 EventCard 목록"]:::st
  upList -. "카드 클릭 → /lounge/:loungeId/v2" .-> EXITV2(["→ /lounge/:loungeId/v2"]):::term
  paList -. "카드 클릭 → /lounge/:loungeId/v2" .-> EXITV2
```
