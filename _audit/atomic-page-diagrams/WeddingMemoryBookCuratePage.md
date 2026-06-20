# WeddingMemoryBookCuratePage — 원자 단위 상태/액티비티 다이어그램

- **라우트:** `/wedding/:weddingId/memory-book/curate`
- **검증:** ✅ Opus 4.8 (1라운드)
- **요약:** 머신 없음. groups+memoryBook 병렬 조회 + signedUrls. selectedIds = userSelected ?? 서버 curated ?? []. 토글(30장 cap). 저장: 0건이면 확인 다이얼로그, 아니면 바로 → replaceCurated → 성공 시 600ms 후 이동.

```mermaid
flowchart TB
  classDef st fill:#fff,stroke:#94a3b8,color:#334155;
  classDef async fill:#E8F4FA,stroke:#185FA5,color:#13324d;
  classDef warn fill:#fff7e6,stroke:#b8860b,color:#7a5b00;
  classDef done fill:#e9f7ef,stroke:#1e8449,color:#145a32;
  classDef term fill:#1E3A5F,stroke:#1E3A5F,color:#fff;
  classDef flat fill:#f1f5f9,stroke:#64748b,stroke-dasharray:4 3,color:#334155;
  START(["진입 /wedding/:weddingId/memory-book/curate"]):::term --> load["groups + memoryBook 쿼리(enabled) · signedUrls(paths 파생)"]:::async
  load --> ld{"isLoading?(groups ∨ memoryBook)"}
  ld -- "예 → '로딩 중…'" --> ld
  ld -- 아니오 --> err{"hasError?(groups ∨ memoryBook)"}
  err -- "예 → '사진 불러오기 실패'(정지)" --> errS["정지"]:::warn
  err -- 아니오 --> empty{"groups 0건?"}
  empty -- "예 → '아직 공유된 사진이 없어요'" --> emptyS["빈 상태"]:::flat
  empty -- 아니오 --> grid["그룹 그리드 + 선택 미니그리드<br/>selectedIds = userSelected ?? serverInitialSelected(서버 curated 파생) ?? []"]:::st
  grid -. "사진 토글 → handleToggle: 이미선택이면 해제 / 30장 미만이면 추가(31번째 무시) + 토스트 리셋" .-> grid
  grid -. "사진 클릭 → 라이트박스(PhotoLightbox)" .-> grid
  grid -- "저장하기 [!isPending]" --> saveChk{"selectedIds 0건?"}
  saveChk -- "예 → 빈 선택 확인 다이얼로그" --> emptyConf{"나가기?"}
  emptyConf -- 취소 --> grid
  emptyConf -- 나가기 --> perform
  saveChk -- 아니오 --> perform["performSave: replaceCurated.mutateAsync({photo_ids})"]:::async
  perform -- "성공 → 600ms 후 navigate(0건이면 /my-wedding, 아니면 /memory-book, replace)" --> EXITDONE(["→ /my-wedding 또는 /memory-book"]):::done
  perform -- "실패(catch) → setSaveError(표시)" --> grid
```
