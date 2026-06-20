# LedgerPage — 원자 단위 상태/액티비티 다이어그램

- **라우트:** `/wedding/:weddingId/report`
- **검증:** ✅ Opus 4.8 (2라운드 — 메시지탭 로딩/빈상태·편집 Drawer 닫기·받은사진 loungeId 가드 보강)
- **요약:** 머신 없음. 4탭(장부/메시지/RSVP/받은사진, 선택 시 enabled 조회)·두 개의 독립 무한스크롤·Drawer 스택(상세→수정/삭제, 추가)·CSV. 뒤로 navigate(-1).

```mermaid
flowchart TB
  classDef st fill:#fff,stroke:#94a3b8,color:#334155;
  classDef async fill:#E8F4FA,stroke:#185FA5,color:#13324d;
  classDef warn fill:#fff7e6,stroke:#b8860b,color:#7a5b00;
  classDef done fill:#e9f7ef,stroke:#1e8449,color:#145a32;
  classDef term fill:#1E3A5F,stroke:#1E3A5F,color:#fff;
  classDef flat fill:#f1f5f9,stroke:#64748b,stroke-dasharray:4 3,color:#334155;
  START(["진입 /wedding/:weddingId/report"]):::term --> mount["마운트: listCashGifts(infinite)·summary·wedding(→loungeId)·me 병렬 조회"]:::async
  mount --> screen[["리포트 화면 fork: Summary ∥ 탭바 ∥ Drawer층"]]:::async
  screen --> summary["Summary 카드(총 축의·현장참석 축의·건수·참석)"]:::flat
  screen -. "뒤로가기 navigate(-1)" .-> EXITBACK(["뒤로"]):::term
  screen --> tabs{"activeTab? (setActiveTab)"}
  tabs -- 장부 --> ledgerT["LedgerTabContent(gifts·로딩/빈 자식 처리·무한스크롤 lastCardRef)"]:::st
  ledgerT -. "무한스크롤: observer 교차 ∧ hasNextPage → fetchNextPage" .-> ledgerT
  ledgerT -. "카드 클릭 → selectedGift(상세 Drawer)" .-> detail
  ledgerT -. "내보내기 → exportLedgerCsv(gifts)" .-> ledgerT
  ledgerT -. "추가 → showAddForm(추가 Drawer)" .-> addForm
  tabs -- "메시지(enabled listFeed)" --> msgT{"메시지 상태"}
  msgT -- "isMessagesLoading → '불러오는 중...'" --> msgT
  msgT -- "0건 → '아직 축하 메시지가 없습니다'" --> msgEmpty["빈 상태"]:::flat
  msgT -- "목록 → guestbook_message 렌더(무한스크롤 lastMsgRef)" --> msgList["메시지 목록"]:::st
  msgList -. "무한스크롤: hasNextMsgPage → fetchNextMsgPage" .-> msgList
  tabs -- "RSVP(enabled listRsvps)" --> rsvpT{"RSVP 상태"}
  rsvpT -- "0건 → '아직 수집된 답변이 없습니다'" --> rsvpEmpty["빈 상태"]:::flat
  rsvpT -- "있음 → 신랑측/신부측 분리 카드" --> rsvpList["RSVP 목록"]:::st
  tabs -- 받은사진 --> spG{"loungeId 있음?"}
  spG -- "예 → SharePhotosTab(loungeId·자식)" --> spT["받은 사진"]:::st
  spG -- "아니오 → 미표시" --> screen
  detail["상세 Drawer(GiftDetail)"]:::st
  detail -. "닫기 → selectedGift=null" .-> screen
  detail -. "수정 → isEditing(수정 Drawer)" .-> editForm
  detail -. "삭제 → deleteConfirm(확인)" .-> delConf
  editForm["수정 Drawer(GiftForm) → updateMut.mutate"]:::async
  editForm -- "성공 → selectedGift=updated, isEditing=false" --> detail
  editForm -. "닫기(취소) → isEditing=false" .-> detail
  addForm["추가 Drawer(GiftForm) → createMut.mutate (성공 콜백 없음)"]:::async
  addForm -. "닫기 → showAddForm=false" .-> screen
  delConf{"삭제 확인 다이얼로그"}
  delConf -- "취소 → deleteConfirm=null" --> detail
  delConf -- "삭제 → deleteMut.mutate" --> del["deleteMut"]:::async
  del -- "성공 → selectedGift=null, deleteConfirm=null" --> screen
```
