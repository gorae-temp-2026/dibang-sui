# Create 흐름 업로드 전략 — 설계 결정 (2026-06-10)

## 문제

스토리지 컨벤션(_code_convention/STORAGE.md)은 "경로 = 소유 리소스 스코프(wedding)"를 요구한다.
그런데 InvitationCreatePage는 **저장 버튼을 누르는 시점에야** wedding이 생긴다
(useSaveInvitation: createWedding → updateInvitation 2단계). 편집 중 커버·갤러리·캔버스를
업로드할 때는 weddingId가 없어, presigned `mobile-invitation`(weddingId 필수 + 소유자 검증)을
쓸 수 없다.

## 후보

### 안 A — 임시 경로 + 저장 시 서버 이동 (권고)

- 편집 중 업로드: presigned 신규 카테고리 `invitation-draft` → `v3-tmp/{userId}/{uuid}{ext}`
  (버킷: **v3-uploads-public**)
- 저장 확정: updateInvitation 처리 중 서버가 `v3-tmp/` key를 감지 →
  `POST /storage/v1/object/copy`(선례: cmd/rebucket-photos)로
  `v3-mobile-invitation/{weddingId}/{subKind}/...`에 복사 → 참조 재작성 → tmp 원본 삭제(Delete 능력, 태스크 18)
- 버려진 tmp(저장 안 하고 이탈): TTL 정리 대상 (태스크 28 sweep) — 업계 표준
  "temp prefix + 확정 시 이동 + TTL" 패턴 (_research: 인스타그램/STRV 조사, 2026-06-10)
- Edit 페이지(weddingId 존재)는 tmp 없이 곧장 `mobile-invitation`으로 업로드

tmp를 public 버킷에 두는 이유: 커버·갤러리는 공개될 운명의 콘텐츠라 노출 수준이
현행(/uploads, public)과 동일하고, 미리보기(PhotoPositionModal·PreviewPanel)가
공개 URL을 그대로 써서 FE 변경이 없다. private로 두면 편집 중 미리보기마다
signed URL 발급이 필요해 FE 복잡도만 올라간다 (아래 A' 참고).

### 안 A′ — A와 같되 tmp를 private 버킷에

- 장점: 저장 전 콘텐츠 비노출 (URL 추측 노출 차단)
- 단점: 편집 중 미리보기·위치조정·미리보기 패널이 전부 signed URL 필요 —
  sharedPhotoUrl 패턴 재사용은 가능하나 에디터 전반에 비동기 URL 해석이 끼어듦.
  uuid 경로라 실질 노출 위험은 낮은데 비용이 큼.

### 안 B — draft wedding 선행 생성

- slug 확정 모달 시점에 wedding(+invitation)을 미리 생성 → 이후는 Edit과 동일 경로
- 장점: 업로드 경로가 처음부터 단일(wedding 스코프), 이동·tmp·TTL 불필요
- 단점: 도메인 영향이 큼 — draft 상태 도입, 이탈 시 빈 wedding row 누적과 그 정리,
  "내 결혼식" 목록·슬러그 점유 시점 변화, RLS·핸들러 전반 수정. 스토리지 일관화
  범위를 넘는 제품 결정.

## 비교

| 기준 | A (tmp public) | A′ (tmp private) | B (draft wedding) |
|---|---|---|---|
| 구현 범위 | 서버 카테고리 1 + 이동 로직 | A + FE signed URL 전반 | 도메인 모델·목록·RLS 광역 |
| 도메인 영향 | 없음 | 없음 | 큼 (draft 상태 신설) |
| 버려진 산출물 정리 | tmp TTL sweep (계획된 태스크) | 동일 | 빈 wedding row 정리 신설 필요 |
| 저장 전 노출 | 현행과 동일 (public, uuid 경로) | 차단 | 현행과 동일 |
| FE 변경 | 업로드 함수 1곳 | 에디터 미리보기 전반 | 페이지 흐름 변경 |

## 결정 (제안)

**안 A.** 컨벤션 원칙(리소스 스코프·서버 경로 생성·고아는 서버 정리)을 지키면서
변경 반경이 가장 작다. A′의 노출 차단 이득은 uuid 경로 특성상 실익이 작고,
B는 별도 제품 결정으로 분리하는 게 맞다.

> 승인: **A안 확정** (2026-06-10, 사용자). 복사 부하(서버 내부·egress 무관)와
> tmp 정리(저장 시 즉시 삭제 + sweep 2차)가 감당 가능함을 확인하고 결정.
