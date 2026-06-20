# LoungeV2Page — 원자 단위 상태/액티비티 다이어그램

- **라우트:** `/lounge/:loungeId/v2`
- **검증:** ✅ Opus 4.8 (1라운드)
- **요약:** xstate `loungeV2.machine`는 `loungeFeed`와 **동형**(피드 영역만·재사용). V2 추가: 실제 isHost(공지 FAB), compose(파일 업로드→메모리 생성, 각 실패), 실시간 구독(→feed invalidate), 스토리 모달(FeedCardModal=storyCarousel 자식), FAB 3종(공지·디스플레이=새 탭 window.open·메모리), 사진공유=라우트 이탈.

```mermaid
flowchart TB
  classDef st fill:#fff,stroke:#94a3b8,color:#334155;
  classDef async fill:#E8F4FA,stroke:#185FA5,color:#13324d;
  classDef warn fill:#fff7e6,stroke:#b8860b,color:#7a5b00;
  classDef done fill:#e9f7ef,stroke:#1e8449,color:#145a32;
  classDef term fill:#1E3A5F,stroke:#1E3A5F,color:#fff;
  classDef flat fill:#f1f5f9,stroke:#64748b,stroke-dasharray:4 3,color:#334155;
  classDef mstate fill:#eef2ff,stroke:#4f46e5,color:#312e81;
  START(["진입 /lounge/:loungeId/v2"]):::term --> gLounge{"loungeId 있음?"}
  EXITSHARE(["→ /lounge/:loungeId/share-photos/upload (navigate)"]):::term
  gLounge -- 아니오 --> deadLounge["'loungeId 없음'(정지)"]:::warn
  gLounge -- 예 --> mount["마운트: 병렬 쿼리/효과"]:::st
  mount -. "ensureCheckIn(1회·실패 무시)" .-> bgCheck["createLoungeCheckIn(백그라운드)"]:::flat
  mount -. "useMemoriesRealtime 구독" .-> rt["realtime v3_memories(lounge) → 변경 시 feed/memories invalidate(백그라운드)"]:::flat
  mount --> skelGate{"(lounge∨wedding 로딩) ∧ info 없음?"}
  skelGate -- 예 --> skel["스피너(헤더 대기)"]:::st
  skel -. "해결 재평가" .-> skelGate
  skelGate -- 아니오 --> screen[["메인 화면 fork: Hero ∥ 피드머신 ∥ 스토리 ∥ FAB ∥ 공지"]]:::async
  screen --> hero["Hero/TopBar/Marquee/LiveCelebration (info·warmth 파생·값변환)"]:::flat
  hero -. "사진 공유(Hero 버튼) → navigate" .-> EXITSHARE
  screen --> floading
  subgraph FEED["피드 머신 (loungeV2 — loungeFeed와 동형·재사용)"]
    floading["loading (별도 스피너 없음 · GatheringLog 표시)"]:::mstate
    fidle["idle (GatheringLog)"]:::mstate
    frefresh["refreshing ('새로고침 중...')"]:::mstate
    ferror["error (에러 UI: GatheringLog 대체 + 재시도)"]:::mstate
    ferror -- "재시도 RETRY/clearError (+refetch)" --> floading
  end
  floading --> fbridge{"feedQuery 결과 (loading 동안)"}
  fbridge -- "로딩 중 → 대기" --> floading
  fbridge -- "isSuccess → LOAD_SUCCESS/clearError" --> fidle
  fbridge -- "isError → LOAD_ERROR/setError" --> ferror
  fidle -. "5초 폴링·realtime invalidate·무한스크롤 fetchNextPage (백그라운드·상태 무변)" .-> fidle
  fidle -- "풀다운(pullDistance>80 ∧ idle) → REFRESH/inc + refetch()" --> frefresh
  frefresh -- "성공 → REFRESH_SUCCESS/clearError+reset" --> fidle
  frefresh -- "실패 → REFRESH_ERROR/setError (idle 복귀·미표시)" --> fidle
  screen --> storyStrip["StoryStrip (storyGroups 파생)"]:::flat
  storyStrip -. "스토리 열기(openStoryKey)" .-> storyModal["FeedCardModal(feedGroups)·자식 storyCarousel 머신"]:::st
  storyModal -. "아이템 뷰 → recordView.mutate(fire-and-forget)" .-> storyModal
  storyModal -. "닫기(openStoryKey=null)" .-> storyStrip
  screen --> fabMem["메모리 FAB → composeOpen"]:::flat
  fabMem -. "열림" .-> composeModal["ComposeModal(자식)"]:::st
  composeModal --> cSubmit["compose.submit(text, file?)"]:::st
  cSubmit --> cFile{"file 있음?"}
  cFile -- 예 --> cUp["uploadMemoryPhoto.mutateAsync(presigned memory)"]:::async
  cUp -- "실패(catch) → ok:false · uploadError" --> composeModal
  cUp -- 성공(photoUrl) --> cPost
  cFile -- 아니오 --> cPost["createMemory.mutateAsync({text, asAnnounce:false, photoUrl?})"]:::async
  cPost -- "성공 → ok:true (모달 닫기)" --> screen
  cPost -- "실패(catch) → ok:false · postError" --> composeModal
  screen --> fabDisp{"디스플레이 FAB [weddingId 있음?]"}
  fabDisp -- "예 → window.open(/display·새 탭)" --> screen
  fabDisp -- "아니오(비활성)" --> screen
  screen --> fabAnn{"공지 FAB [isHost?]"}
  fabAnn -- "아니오(미노출)" --> screen
  fabAnn -- "예 → announceOpen" --> annForm["AnnouncementForm(현재 공지)"]:::st
  annForm -- "제출 → createAnnouncement.mutate" --> annRes{"결과"}
  annRes -- "성공 → 닫기·resolve" --> annForm
  annRes -- "실패 → reject(폼 유지)" --> annForm
  annForm -- "삭제 → deleteAnnouncement.mutate" --> annForm
```
