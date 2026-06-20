# SharePhotoUploadPage — 원자 단위 상태/액티비티 다이어그램

- **라우트:** `/lounge/:loungeId/share-photos/upload`
- **검증:** ✅ Opus 4.8 (1라운드)
- **요약:** xstate `sharePhotoUpload.machine` **실제 구동**(idle→selecting→uploading→done/error). uploading은 `presignedUploadActor` invoke → presignedUpload(category 'share', **압축 없음**, pLimit 4, autoRetry 1). 파일별 HEIC 변환→presign→PUT(재시도 1)→register(실패 흡수). **부분 실패여도 성공분만 모아 UPLOAD_DONE→done**, actor 예외 시에만 UPLOAD_ERROR→error. 외곽은 기존 사진 로드(list + signedUrls).

```mermaid
flowchart TB
  classDef st fill:#fff,stroke:#94a3b8,color:#334155;
  classDef async fill:#E8F4FA,stroke:#185FA5,color:#13324d;
  classDef warn fill:#fff7e6,stroke:#b8860b,color:#7a5b00;
  classDef done fill:#e9f7ef,stroke:#1e8449,color:#145a32;
  classDef term fill:#1E3A5F,stroke:#1E3A5F,color:#fff;
  classDef flat fill:#f1f5f9,stroke:#64748b,stroke-dasharray:4 3,color:#334155;
  classDef mstate fill:#eef2ff,stroke:#4f46e5,color:#312e81;
  START(["진입 /lounge/:loungeId/share-photos/upload"]):::term --> gLounge{"loungeId 있음?"}
  EXIT(["이탈 → /lounge/:loungeId/v2"]):::term
  gLounge -- 아니오 --> deadLounge["'loungeId가 없습니다'(정지)"]:::warn
  gLounge -- 예 --> listReq["useListSharedPhotos(loungeId)"]:::async
  subgraph OUTER["① 기존 사진 로드"]
    listReq --> exCalc{"existing 계산"}
    exCalc -- "데이터 없음·에러 아님" --> spin["로딩 스피너(existing=null)"]:::st
    exCalc -- "조회 에러" --> exEmpty["existing=[](빈 목록)"]:::warn
    exCalc -- "데이터 있음" --> exMap["existing=rows.map(+signedUrl)"]:::flat
    spin -. "쿼리 해결 재평가" .-> exCalc
    signed["useSignedUrls(paths)(병렬·썸네일)"]:::async -. "실패/지연 시 placeholder fallback(비차단)" .-> exMap
  end
  exEmpty --> idle
  exMap --> idle
  subgraph MACHINE["② 업로드 머신 (useMachine — 실제 구동)"]
    idle["idle(선택 화면·files 0)"]:::mstate
    idle -- "PICK [existing+files≤100] / setFiles" --> selecting
    idle -- "PICK [초과] / setError(미표시·페이지 선슬라이스로 사실상 미발생)" --> idle
    selecting["selecting(선택 화면·files≥1)"]:::mstate
    selecting -- "PICK [≤100] / setFiles(추가·삭제)" --> selecting
    selecting -- "removeAt로 전부삭제 → CLEAR / clearFiles" --> idle
    selecting -- "공유 START [hasFiles]" --> uploading
    uploading["uploading(업로드 중 화면)"]:::mstate
    uploading -- "PROGRESS / updateProgress(파일별)" --> uploading
    uploading -- "UPLOAD_DONE(성공 paths) / appendUploaded" --> done
    uploading -- "UPLOAD_ERROR / setError" --> error
    done["done(완료 화면)"]:::mstate
    error["error(에러 화면)"]:::mstate
    done -- "계속 올리기 RESET / reset" --> idle
    error -- "처음으로 RESET / reset" --> idle
    error -- "다시 시도 START [hasFiles]" --> uploading
  end
  uploading -. "invoke" .-> aStart
  idle -. "취소(헤더)" .-> EXIT
  selecting -. "취소(헤더)" .-> EXIT
  done -. "돌아가기" .-> EXIT
  subgraph SPUP["presignedUploadActor (uploading 동안) — presignedUpload(category 'share', 압축 없음)"]
    aStart["actor: presignedUpload(files)"]:::st --> aFork[["pLimit(4) fork: 파일별 동시(최대 4)"]]:::async
    aFork --> ufHeic{"파일 HEIC?"}
    ufHeic -- 예 --> ufConv["ensureJpegIfHeic(converting)"]:::async
    ufHeic -- 아니오 --> ufReq
    ufConv --> ufReq["createPresignedUpload(requesting)"]:::async
    ufReq -- "throw(!res.data·네트워크)" --> ufRetry
    ufReq -- 성공 --> ufPut["putBinary(uploading %)"]:::async
    ufPut -- throw --> ufRetry
    ufPut -- 성공 --> ufReg["onUploaded: register(createSharedPhoto)·실패 흡수"]:::st
    ufReg --> ufDone["파일 done(Result)"]:::done
    ufRetry{"재시도 남음?(autoRetry=1)"}
    ufRetry -- 예 --> ufReq
    ufRetry -- 아니오 --> ufErr["파일 Error(결과배열에 Error)"]:::warn
    ufHeic -. "각 단계 onProgress" .-> prog["sendBack PROGRESS → updateProgress"]:::flat
  end
  ufDone --> aAgg
  ufErr --> aAgg
  aAgg(["모든 파일 settle"]) --> aDone["uploadedPaths=성공분 → sendBack UPLOAD_DONE(부분 실패여도 done)"]:::done
  aStart -. "actor 예외(희귀)" .-> aErr["sendBack UPLOAD_ERROR"]:::warn
  prog -.-> uploading
  aDone -. "UPLOAD_DONE" .-> uploading
  aErr -. "UPLOAD_ERROR" .-> uploading
```
