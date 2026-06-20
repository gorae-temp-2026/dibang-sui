# WeddingMemoryBookPage — 원자 단위 상태/액티비티 다이어그램

- **라우트:** `/wedding/:weddingId/memory-book`
- **검증:** ✅ Opus 4.8 (1라운드)
- **요약:** 머신 없음. weddingId 가드 → 메모리북 조회 로딩/에러 → status: ready_uncurated면 큐레이션으로 리다이렉트(effect), ready면 MemoryBookViewer.

```mermaid
flowchart TB
  classDef st fill:#fff,stroke:#94a3b8,color:#334155;
  classDef async fill:#E8F4FA,stroke:#185FA5,color:#13324d;
  classDef warn fill:#fff7e6,stroke:#b8860b,color:#7a5b00;
  classDef done fill:#e9f7ef,stroke:#1e8449,color:#145a32;
  classDef term fill:#1E3A5F,stroke:#1E3A5F,color:#fff;
  classDef flat fill:#f1f5f9,stroke:#64748b,stroke-dasharray:4 3,color:#334155;
  START(["진입 /wedding/:weddingId/memory-book"]):::term --> g0{"weddingId 있음?"}
  g0 -- "아니오 → '웨딩 정보가 없습니다'(정지)" --> dead["정지"]:::warn
  g0 -- 예 --> load["getWeddingMemoryBook (enabled) · 진입 시 scrollTo(0,0)"]:::async
  load --> ld{"isLoading?"}
  ld -- "예 → '메모리북 불러오는 중…'" --> ld
  ld -- 아니오 --> err{"isError ∨ data 없음?"}
  err -- "예 → '불러올 수 없습니다'(정지)" --> errS["정지"]:::warn
  err -- 아니오 --> stt{"data.status?"}
  stt -- "ready_uncurated → (effect) navigate(curate, replace) + '이동 중…' placeholder" --> EXITCURATE(["→ /wedding/:id/memory-book/curate"]):::term
  stt -- "그 외(ready) → data.data 있으면 MemoryBookViewer(자식) / 없으면 null" --> viewer["MemoryBookViewer"]:::st
```
