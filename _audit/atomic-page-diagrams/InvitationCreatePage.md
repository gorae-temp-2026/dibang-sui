# InvitationCreatePage — 원자 단위 상태/액티비티 다이어그램

- **라우트:** `/invitation/create`
- **검증:** ✅ Opus 4.8 (2라운드)
- **요약:** xstate `invitationCreate.machine`는 **미사용**. 실제 런타임은 `useState(slugConfirmed)` + zustand + 훅. 처음에 공유링크(slug) 모달 → `available`에서만 확인 → fork(편집 ∥ 업로드 트랙) → 저장(업로드중 가드 → 추가/생성 모드 → 조건부 updateInvitation). 업로드 파이프라인은 압축(GIF/HEIC/비압축형/한도) → presigned(presign/PUT/autoRetry 1) → publicUrl 검증(retry 밖).

```mermaid
flowchart TB
  classDef st fill:#fff,stroke:#94a3b8,color:#334155;
  classDef async fill:#E8F4FA,stroke:#185FA5,color:#13324d;
  classDef warn fill:#fff7e6,stroke:#b8860b,color:#7a5b00;
  classDef done fill:#e9f7ef,stroke:#1e8449,color:#145a32;
  classDef term fill:#1E3A5F,stroke:#1E3A5F,color:#fff;
  classDef flat fill:#f1f5f9,stroke:#64748b,stroke-dasharray:4 3,color:#334155;
  START(["페이지 진입"]):::term --> sgEnter
  EXIT(["페이지 이탈 /my-wedding"]):::term
  subgraph MODAL["① 공유링크 모달 (slugConfirmed=false)"]
    sgEnter["모달 표시·입력 대기"]:::st --> sgType["slug onChange → setField('slug')"]:::st
    sgType --> sgDeb["500ms 디바운스 타이머(입력 변경 시 reset)"]:::async
    sgDeb --> sgSkip{"slug 길이 ≥ 2?"}
    sgSkip -- 아니오 --> sgIdle["idle(조회 안 함)"]:::st
    sgSkip -- 예 --> sgReq["getInvitation({slug}) (retry:false)"]:::async
    sgReq --> sgLoad{"로딩 중?"}
    sgLoad -- 예 --> sgChecking["checking"]:::async
    sgLoad -- 아니오 --> sgData{"data 있음?(200)"}
    sgData -- 예 --> sgTaken["taken"]:::warn
    sgData -- 아니오 --> sgErr{"isError?"}
    sgErr -- "예·404" --> sgAvail["available"]:::done
    sgErr -- "예·그외" --> sgError["error"]:::warn
    sgErr -- 아니오 --> sgAvail
    sgChecking --> sgType
    sgIdle --> sgType
    sgTaken --> sgType
    sgError --> sgType
  end
  sgAvail --> gConfirm{"확인(canConfirm=trim 길이≥2 ∧ available)"}
  MODAL -. "돌아가기(어느 상태서든)" .-> EXIT
  gConfirm -- "클릭(활성)" --> setConf["setSlugConfirmed(true)"]:::st
  setConf --> forkEdit
  forkEdit[["fork: 편집 ∥ 업로드 트랙"]]:::async
  forkEdit --> editFlat
  forkEdit --> upIdle
  editFlat["편집(zustand 필드 self-edit·분기 없음=flat)<br/>필수: 신랑·신부 이름·날짜·시간·예식장 이름·주소"]:::flat
  upIdle["업로드 트랙: 유휴"]:::st
  upIdle -. "커버 선택(사용자)" .-> coverPick["기존 커버 item remove → addFiles([file])"]:::st
  upIdle -. "갤러리 선택(사용자)" .-> galCap{"남은 자리>0?(60−갤러리−진행중)"}
  galCap -- 아니오 --> upIdle
  galCap -- 예 --> galAdd["addFiles(slice(0,남은))"]:::st
  upIdle -. "캔버스 이미지(사용자)" .-> canvasUp["canvasUpload.mutateAsync<br/>= compress→presigned 파이프라인(아래와 동일)·머신 미경유"]:::async
  canvasUp -- "성공:URL→캔버스" --> upIdle
  canvasUp -- "실패:null→캔버스" --> upIdle
  coverPick --> addFiles
  galAdd --> addFiles
  addFiles[["ADD_FILES → 파일마다 item 생성(localUrl 미리보기·uploading)<br/>fork: 0..N 동시"]]:::async --> upRun
  subgraph UPLOAD["업로드 1건 파이프라인 (각 item 동시 · 압축=retry 밖, presign/PUT=autoRetry 1 안)"]
    upRun["runUpload(item) → mutateAsync"]:::st --> cIsGif{"GIF?"}
    cIsGif -- 예 --> cLimGif{"원본 >10MB?"}
    cLimGif -- 예 --> upFail
    cLimGif -- "아니오(압축 스킵)" --> reqP
    cIsGif -- 아니오 --> cHeic["ensureJpegIfHeic(HEIC→JPEG·아니면 그대로)"]:::async
    cHeic -- throw --> upFail
    cHeic -- 성공 --> cComp{"압축 가능?(jpeg/png/webp)"}
    cComp -- "아니오(svg 등·압축 스킵)" --> cLimRaw{"source >10MB?"}
    cLimRaw -- 예 --> upFail
    cLimRaw -- 아니오 --> reqP
    cComp -- 예 --> cDo["imageCompression(≤9MB,≤2560px)"]:::async
    cDo -- throw --> upFail
    cDo -- 성공 --> cLimPost{"압축 결과 >10MB?"}
    cLimPost -- 예 --> upFail
    cLimPost -- 아니오 --> reqP
    reqP["createPresignedUpload(POST)"]:::async
    reqP -- "throw(!res.data·네트워크)" --> upRetry
    reqP -- 성공 --> put["putBinary(PUT,진행률)"]:::async
    put -- throw --> upRetry
    put -- 성공 --> val{"publicUrl 있음?(검증·retry 밖)"}
    val -- 예 --> upDone
    val -- "아니오/Error" --> upFail
    upRetry{"재시도 남음?(attempt ≤ autoRetry=1)"}
    upRetry -- 예 --> reqP
    upRetry -- 아니오 --> upFail
    upDone["ITEM_DONE(serverUrl)→done"]:::done
    upFail["ITEM_FAILED(error)→failed"]:::warn
  end
  upDone --> aliveChk{"item 아직 done으로 생존?(REMOVE 선행 시 skip)"}
  aliveChk -- 예 --> sync["onItemDone: 커버→setField(coverImage) / 갤러리→addGalleryPhoto+낙관적 remove"]:::st
  aliveChk -- 아니오 --> upIdle
  sync --> upIdle
  upFail -. "RETRY→uploading" .-> upRun
  upFail -. "REMOVE→revokeObjectURL+제거" .-> upIdle
  editFlat -- "저장하기 클릭(항상 활성·isPending만 비활성)" --> gUp{"커버/갤러리 item 중 uploading?"}
  gUp -- 예 --> tUp["toast:업로드 끝나면 저장"]:::warn
  tUp -.-> editFlat
  gUp -- 아니오 --> gMode{"isAddMode?(?weddingId)"}
  gMode -- 추가모드 --> gAddSlug{"slug trim 길이≥2?"}
  gAddSlug -- 아니오 --> tAdd["toast:공유 링크를 입력"]:::warn
  tAdd -.-> editFlat
  gAddSlug -- 예 --> addCreate["createInvitation({weddingId},{slug}) [throwOnError]"]:::async
  addCreate -- reject --> editFlat
  addCreate -- 성공 --> addHas{"hasData?(gallery·cover·message·template·design·cover_text 중 1)"}
  addHas -- 예 --> addUpd["updateInvitation [throwOnError]"]:::async
  addUpd -- reject --> editFlat
  addUpd -- 성공 --> okMerge
  addHas -- 아니오 --> okMerge
  gMode -- 생성모드 --> v1
  subgraph VAL["validate() 단락 체인 (필수 6칸 AND·순서=REQUIRED_FIELDS)"]
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
    tVal["toast:(그 필드)을(를) 입력"]:::warn
  end
  v6 -- "있음(6칸 충족)" --> create["createWedding [throwOnError]"]:::async
  tVal -.-> editFlat
  create -- reject --> editFlat
  create -- 성공 --> hasData{"hasData?"}
  hasData -- 예 --> upd["updateInvitation [throwOnError]"]:::async
  upd -- reject --> editFlat
  upd -- 성공 --> okMerge
  hasData -- 아니오 --> okMerge
  okMerge(["성공 합류"]) --> inval["invalidate(myWeddings) [mutation onSuccess]"]:::done
  inval --> resetNav["reset()+navigate(/my-wedding) [page onSuccess]"]:::done
  resetNav --> EXIT
  editFlat -. "헤더 로고" .-> EXIT
```
