# InvitationEditPage — 원자 단위 상태/액티비티 다이어그램

- **라우트:** `/invitation/edit/:weddingId` (`?invitationId`)
- **검증:** ✅ Opus 4.8 (1라운드)
- **요약:** xstate `invitationEdit.machine` **미사용**(Create와 동일). 차이: slug 모달 없음(로드→hydrate), 앞단 로드(getWedding→getInvitation)·hydrate(slug당 1회 가드), 저장은 단일 update(updateWedding→조건부 updateInvitation·hasInvitationData 4필드·invalidate myWeddings+wedding), 뒤로가기·unmount reset. 업로드 파이프라인은 Create와 동일(context=wedding).

```mermaid
flowchart TB
  classDef st fill:#fff,stroke:#94a3b8,color:#334155;
  classDef async fill:#E8F4FA,stroke:#185FA5,color:#13324d;
  classDef warn fill:#fff7e6,stroke:#b8860b,color:#7a5b00;
  classDef done fill:#e9f7ef,stroke:#1e8449,color:#145a32;
  classDef term fill:#1E3A5F,stroke:#1E3A5F,color:#fff;
  classDef flat fill:#f1f5f9,stroke:#64748b,stroke-dasharray:4 3,color:#334155;
  START(["진입 /invitation/edit/:weddingId · ?invitationId"]):::term --> load
  EXIT(["이탈 /my-wedding"]):::term
  EXITBACK(["뒤로 navigate(-1)"]):::term
  subgraph LOAD["① 로드 (useLoadWedding)"]
    load["getWedding({weddingId})"]:::async --> wLoad{"wedding 로딩?"}
    wLoad -- 예 --> loadingScreen
    wLoad -- 아니오 --> wErr{"wedding 에러?"}
    wErr -- 예 --> errScreen
    wErr -- 아니오 --> pick["invitation 선택: ?invitationId 매치 ?? invitations[0]"]:::st
    pick --> hasInv{"대상 invitation(slug) 있음?"}
    hasInv -- "아니오(invitations 비어있음·slug='')" --> noInv["invitation 조회 skip(enabled=false)"]:::warn
    hasInv -- 예 --> invReq["getInvitation({slug}) (enabled)"]:::async
    invReq --> iLoad{"invitation 로딩?"}
    iLoad -- 예 --> loadingScreen
    iLoad -- 아니오 --> iErr{"invitation 에러?"}
    iErr -- 예 --> errScreen
    iErr -- 아니오 --> loaded
  end
  loadingScreen["로딩 화면 '불러오는 중...'"]:::st -. "쿼리 해결 시 재평가" .-> wLoad
  errScreen["에러 화면 '청첩장을 불러올 수 없습니다'"]:::warn -. "돌아가기 Link" .-> EXIT
  noInv --> hydrateGate
  loaded(["로드 완료"]) --> hydrateGate
  hydrateGate{"hydrate 가드: wedding∧invitation∧slug 있음 ∧ hydratedSlug≠slug?"}
  hydrateGate -- "아니오(데이터 없음 또는 이미 hydrate)" --> forkEdit
  hydrateGate -- 예 --> hydrate["폼 hydrate(useEffect 1회/slug): info·accounts·invitation·designConfig·canvas + originalSlug·hydratedSlug=slug<br/>※ 내부 필드 매핑=값 변환(flat)"]:::flat
  hydrate --> forkEdit
  forkEdit[["fork: 편집 ∥ 업로드 트랙"]]:::async
  forkEdit --> editFlat
  forkEdit --> upIdle
  editFlat["편집(zustand 필드 self-edit·flat)<br/>필수: 신랑·신부 이름·날짜·시간·예식장 이름·주소"]:::flat
  upIdle["업로드 트랙: 유휴 (presigned mobile-invitation·wedding 스코프)"]:::st
  upIdle -. "커버 선택" .-> coverPick["기존 커버 item remove → addFiles([file])"]:::st
  upIdle -. "갤러리 선택" .-> galCap{"남은 자리>0?(60−갤러리−진행중)"}
  galCap -- 아니오 --> upIdle
  galCap -- 예 --> galAdd["addFiles(slice(0,남은))"]:::st
  upIdle -. "캔버스 이미지" .-> canvasUp["canvasUpload.mutateAsync = compress→presigned(동일)·머신 미경유"]:::async
  canvasUp -- "성공:URL→캔버스" --> upIdle
  canvasUp -- "실패:null→캔버스" --> upIdle
  coverPick --> addFiles
  galAdd --> addFiles
  addFiles[["ADD_FILES→파일마다 item(localUrl·uploading)·fork 0..N"]]:::async --> upRun
  subgraph UPLOAD["업로드 1건 파이프라인 (Create와 동일·검증완료 · context=wedding)"]
    upRun["runUpload→mutateAsync"]:::st --> cIsGif{"GIF?"}
    cIsGif -- 예 --> cLimGif{"원본>10MB?"}
    cLimGif -- 예 --> upFail
    cLimGif -- "아니오(스킵)" --> reqP
    cIsGif -- 아니오 --> cHeic["ensureJpegIfHeic"]:::async
    cHeic -- throw --> upFail
    cHeic -- 성공 --> cComp{"압축가능?(jpeg/png/webp)"}
    cComp -- "아니오(svg·스킵)" --> cLimRaw{"source>10MB?"}
    cLimRaw -- 예 --> upFail
    cLimRaw -- 아니오 --> reqP
    cComp -- 예 --> cDo["imageCompression"]:::async
    cDo -- throw --> upFail
    cDo -- 성공 --> cLimPost{"압축결과>10MB?"}
    cLimPost -- 예 --> upFail
    cLimPost -- 아니오 --> reqP
    reqP["createPresignedUpload"]:::async
    reqP -- throw --> upRetry
    reqP -- 성공 --> put["putBinary(PUT)"]:::async
    put -- throw --> upRetry
    put -- 성공 --> val{"publicUrl 있음?(retry 밖)"}
    val -- 예 --> upDone
    val -- "아니오/Error" --> upFail
    upRetry{"재시도 남음?(autoRetry=1)"}
    upRetry -- 예 --> reqP
    upRetry -- 아니오 --> upFail
    upDone["ITEM_DONE→done"]:::done
    upFail["ITEM_FAILED→failed"]:::warn
  end
  upDone --> aliveChk{"item done 생존?(REMOVE 선행 skip)"}
  aliveChk -- 예 --> sync["onItemDone: 커버→setField(coverImage)/갤러리→addGalleryPhoto+remove"]:::st
  aliveChk -- 아니오 --> upIdle
  sync --> upIdle
  upFail -. "RETRY→uploading" .-> upRun
  upFail -. "REMOVE→revoke+제거" .-> upIdle
  editFlat -- "수정하기 클릭(항상 활성·isPending만 비활성)" --> gUp{"커버/갤러리 item uploading?"}
  gUp -- 예 --> tUp["toast:업로드 끝나면 저장"]:::warn
  tUp -.-> editFlat
  gUp -- 아니오 --> v1
  subgraph VAL["validate() 단락 체인(필수 6칸 AND)"]
    v1{"신랑 이름?"} -- "없음·신랑 이름" --> tVal
    v1 -- 있음 --> v2{"신부 이름?"}
    v2 -- "없음·신부 이름" --> tVal
    v2 -- 있음 --> v3{"예식 날짜?"}
    v3 -- "없음·예식 날짜" --> tVal
    v3 -- 있음 --> v4{"예식 시간?"}
    v4 -- "없음·예식 시간" --> tVal
    v4 -- 있음 --> v5{"예식장 이름?"}
    v5 -- "없음·예식장 이름" --> tVal
    v5 -- 있음 --> v6{"예식장 주소?"}
    v6 -- "없음·예식장 주소" --> tVal
    tVal["toast:(그 필드) 입력"]:::warn
  end
  v6 -- "있음(6칸)" --> updW["updateWedding({weddingId},{info,hosts}) [throwOnError]"]:::async
  tVal -.-> editFlat
  updW -- reject --> editFlat
  updW -- 성공 --> upHas{"hasInvitationData?(gallery·cover·message·template 중 1) ∧ invitationId 있음?"}
  upHas -- 예 --> updI["updateInvitation({weddingId,invitationId}) [throwOnError]"]:::async
  updI -- reject --> editFlat
  updI -- 성공 --> ok
  upHas -- 아니오 --> ok
  ok["onSuccess: invalidate(myWeddings + wedding) · reset() · navigate(/my-wedding)"]:::done --> EXIT
  editFlat -. "헤더 로고" .-> EXIT
  editFlat -. "뒤로가기 navigate(-1)" .-> EXITBACK
```
