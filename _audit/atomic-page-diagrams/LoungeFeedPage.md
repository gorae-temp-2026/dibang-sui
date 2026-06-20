# LoungeFeedPage — 원자 단위 상태/액티비티 다이어그램

- **라우트:** `/lounge/:loungeId`
- **검증:** ✅ Opus 4.8 (1라운드)
- **요약:** xstate `loungeFeed.machine` **실제 구동**이나 **피드 영역만** 관장(loading/idle/refreshing/error). 주위로 헤더·공지·참여자가 병렬. idle에서 5초 폴링(refetchInterval)+무한스크롤이 백그라운드(상태 무변), 풀다운만 refreshing 전이. ensureCheckIn 마운트 1회 fire-and-forget. 뒤로가기→/my-wedding.

```mermaid
flowchart TB
  classDef st fill:#fff,stroke:#94a3b8,color:#334155;
  classDef async fill:#E8F4FA,stroke:#185FA5,color:#13324d;
  classDef warn fill:#fff7e6,stroke:#b8860b,color:#7a5b00;
  classDef done fill:#e9f7ef,stroke:#1e8449,color:#145a32;
  classDef term fill:#1E3A5F,stroke:#1E3A5F,color:#fff;
  classDef flat fill:#f1f5f9,stroke:#64748b,stroke-dasharray:4 3,color:#334155;
  classDef mstate fill:#eef2ff,stroke:#4f46e5,color:#312e81;
  START(["진입 /lounge/:loungeId"]):::term --> gLounge{"loungeId 있음?"}
  EXITBACK(["뒤로 → /my-wedding"]):::term
  gLounge -- 아니오 --> deadLounge["'loungeId 없음'(정지)"]:::warn
  gLounge -- 예 --> mount["마운트: 병렬 쿼리/효과 시작"]:::st
  mount -. "ensureCheckIn(마운트 1회·ref가드·실패 무시)" .-> bgCheck["createLoungeCheckIn mutate(백그라운드)"]:::flat
  mount --> skelGate{"(lounge∨wedding 로딩) ∧ weddingInfo 없음?"}
  skelGate -- 예 --> skel["LoungeSkeleton(헤더 대기)"]:::st
  skel -. "쿼리 해결 재평가" .-> skelGate
  skelGate -- 아니오 --> screen[["메인 화면 fork: 헤더 ∥ 피드머신 ∥ 공지 ∥ 참여자"]]:::async
  screen --> header["헤더: weddingInfo면 날짜·이름·장소·부모 / 없으면 '웨딩라운지'(값 변환)"]:::flat
  header -. "뒤로가기" .-> EXITBACK
  screen --> floading
  subgraph FEED["피드 머신 (useMachine — feed 로딩/새로고침/에러만)"]
    floading["loading (피드 스피너)"]:::mstate
    fidle["idle (피드 표시)"]:::mstate
    frefresh["refreshing ('새로고침 중...')"]:::mstate
    ferror["error (errorMessage + 재시도)"]:::mstate
    ferror -- "재시도 RETRY/clearError (+feedQuery.refetch)" --> floading
  end
  floading --> fbridge{"feedQuery 결과 (loading 동안 bridge)"}
  fbridge -- "로딩 중 → 대기" --> floading
  fbridge -- "isSuccess → LOAD_SUCCESS/clearError" --> fidle
  fbridge -- "isError → LOAD_ERROR/setError" --> ferror
  fidle -. "5초 폴링(refetchInterval)·백그라운드 갱신(상태 무변)" .-> fidle
  fidle -. "무한스크롤: observer 교차 ∧ hasNextPage ∧ !isFetchingNextPage → fetchNextPage" .-> fidle
  fidle -- "풀다운(pullDistance>80 ∧ idle) → REFRESH/inc + refetch()" --> frefresh
  frefresh -- "성공 → REFRESH_SUCCESS/clearError+resetAttempts" --> fidle
  frefresh -- "실패 → REFRESH_ERROR/setError (idle 복귀·메시지 미표시)" --> fidle
  fidle --> feedBody{"allItems 0건?"}
  feedBody -- 예 --> empty["'아직 활동이 없어요'"]:::flat
  feedBody -- 아니오 --> items["regularItems 렌더 + 고정공지 배너(pinned)"]:::flat
  screen --> annBtn["공지 버튼(Host) 토글"]:::flat
  annBtn -. "열림" .-> annForm["AnnouncementForm(현재 공지)"]:::st
  annForm -- "제출 → createAnnouncement.mutate" --> annRes{"결과"}
  annRes -- "성공 → 폼 닫기·resolve" --> annForm
  annRes -- "실패 → reject(폼 유지)" --> annForm
  annForm -- "삭제 → deleteAnnouncement.mutate" --> annForm
  screen --> partBtn["참여자 버튼"]:::flat
  partBtn -. "열림" .-> partModal["ParticipantListModal(참여자=lounge_check_in)"]:::st
  partModal -. "닫기" .-> partBtn
```
