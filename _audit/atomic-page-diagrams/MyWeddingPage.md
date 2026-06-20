# MyWeddingPage — 원자 단위 상태/액티비티 다이어그램

- **라우트:** `/my-wedding` (바텀탭)
- **검증:** ✅ Opus 4.8 (1라운드)
- **요약:** 머신 없음. getMyWeddings 로딩/빈(AddCard→생성)/목록(WeddingCard). 카드 핸들러: 링크 복사·공유(navigator.share/copy)·미리보기(새 탭).

```mermaid
flowchart TB
  classDef st fill:#fff,stroke:#94a3b8,color:#334155;
  classDef async fill:#E8F4FA,stroke:#185FA5,color:#13324d;
  classDef warn fill:#fff7e6,stroke:#b8860b,color:#7a5b00;
  classDef done fill:#e9f7ef,stroke:#1e8449,color:#145a32;
  classDef term fill:#1E3A5F,stroke:#1E3A5F,color:#fff;
  classDef flat fill:#f1f5f9,stroke:#64748b,stroke-dasharray:4 3,color:#334155;
  START(["진입 /my-wedding (바텀탭)"]):::term --> load["getMyWeddings (retry:false)"]:::async
  load --> ld{"isLoading?"}
  ld -- "예 → '불러오는 중...'" --> ld
  ld -- 아니오 --> empty{"목록 0건?"}
  empty -- 예 --> addCard["AddCard"]:::st
  addCard -- "클릭 → navigate(/invitation/create)" --> EXITCREATE(["→ /invitation/create"]):::term
  empty -- 아니오 --> list["WeddingCard 캐러셀(목록)"]:::st
  list -. "청첩장 링크 복사 → copy → copyToast(2s)" .-> list
  list -. "청첩장 공유 → navigator.share 있으면 share(취소 무시) / 없으면 copy→toast" .-> list
  list -. "미리보기 → window.open(guestWeb/slug, 새 탭)" .-> list
  list -. "호스트 초대 공유 → navigator.share / copy→toast" .-> list
```
