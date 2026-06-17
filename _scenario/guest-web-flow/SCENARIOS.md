# Guest Web 축의/메세지 플로우 시나리오

## 개요

현장 방문자가 결혼식 QR을 스캔하면 Guest Web으로 진입해서 축의/메세지 플로우를 진행한다.
Host는 Dibang Wedding의 My Wedding 페이지에서 결혼식 QR을 다운로드하여 출력한다.
이 플로우의 결과(GuestbookEntry)가 Wedding Lounge 피드에 반영된다.

### 플로우 순서
누구측 6슬롯 선택 → 관계/이름 입력 → 금액 선택(축의) → 축의 전달 → 메세지 작성 → 완료

### 진입점
결혼식 QR 스캔 → `guest/?weddingId={id}` → Guest Web

---

## 그룹 A: 결혼식 QR 다운로드 (Dibang Wedding)

| # | Actor | Screen | Action | Result | Data Flow | Edge Case |
|---|-------|--------|--------|--------|-----------|-----------|
| S-01 | Host | Dibang Wedding - My Wedding | 결혼식 QR 다운로드 버튼 | QR 이미지(PNG) 다운로드. QR URL = `guest/?weddingId={id}` | 클라이언트에서 QR 생성 → 다운로드 | - |

---

## 그룹 B: 축의/메세지 플로우 (Guest Web)

| # | Actor | Screen | Action | Result | Data Flow | Navigation | Edge Case |
|---|-------|--------|--------|--------|-----------|------------|-----------|
| S-02 | 현장 방문자 | Guest Web - QR 랜딩 | QR 스캔 (`guest/?weddingId=xxx`) | 상단: 결혼식 정보(신랑/신부 이름, 날짜, 사진) + 하단: 누구측 6슬롯 선택 | GET /weddings/{weddingId} (public) | 누구측 탭 → S-03 | weddingId 유효하지 않으면 에러 화면 |
| S-03 | 현장 방문자 | Guest Web - 관계/이름 | 관계(6개 객관식 + 자유서술 40자) + 이름(10자) → "다음" | 금액 선택 화면 | 클라이언트 상태 | → S-04 | 관계 필수, 이름 필수 → 미입력 시 다음 비활성화 |
| S-04a | 현장 방문자 | Guest Web - 금액 선택 | 금액 선택 (±1만원, ±5만원) | 축의 전달 화면 | 클라이언트 상태 | → S-05 | - |
| S-04b | 현장 방문자 | Guest Web - 금액 선택 | "이미 축의했어요" | 기록 없이 메세지 화면 | - | → S-06 | - |
| S-04c | 현장 방문자 | Guest Web - 금액 선택 | "건너뛰기" | 기록 없이 메세지 화면 | - | → S-06 | - |
| S-05 | 현장 방문자 | Guest Web - 축의 전달 | 계좌번호 복사 또는 토스/카카오 딥링크 → 확인 | 축의 완료 → 메세지 화면 | POST /cash-gifts → DB(CashGift) | → S-06 | 딥링크 앱 미설치 시 계좌 복사 fallback |
| S-06 | 현장 방문자 | Guest Web - 메세지 | 텍스트(이모지, 60자) 작성 후 전송 또는 하트만 전송 | 봉투 오버레이 → 전송 완료 화면 | POST /guestbook → DB(GuestbookEntry). 하트만 시 message=null, 피드에 하트 아이콘 표시 | → S-07 | - |
| S-07 | 현장 방문자 | Guest Web - 전송 완료 | "사진 공유하기" 또는 "돌아가기" | 리다이렉트 또는 처음으로 | - | 끝 | 사진 기능 범위 밖, 리다이렉트만 |

### 누구측 6슬롯
1. 신랑 (groom)
2. 신랑 아버지 (groom_father)
3. 신랑 어머니 (groom_mother)
4. 신부 (bride)
5. 신부 아버지 (bride_father)
6. 신부 어머니 (bride_mother)

### 관계 카테고리 (객관식 6개)
1. 가족 / 친척
2. 친구 / 지인
3. 동문 / 동창
4. 직장 동료
5. 스승 / 제자
6. 기타 모임

자유서술(주관식)은 선택, 최대 40자.

### 축의 전달 방식
- 계좌번호 복사 (선택한 recipient_slot에 해당하는 host의 계좌)
- 토스 딥링크: `supertoss://send?bank=...&accountNo=...&amount=...`
- 카카오페이 딥링크: `kakaotalk://kakaopay/money/to/bank?bank_code=...&bank_account_number=...&amount=...`
- 딥링크 반환 감지: visibilitychange, focus, pageshow 이벤트

### 레거시 참고
- `web-mobile-application/apps/web/src/hooks/useWeddingFlow.ts` — 플로우 상태 관리
- `web-mobile-application/apps/web/src/steps/` — 각 스텝 컴포넌트
- `web-mobile-application/packages/shared/types/cash-gift.ts` — CashGift 타입, 은행 코드 매핑

---

## 이번 범위에서 제외

- 사진 공유 기능 (S-07의 리다이렉트만 구현, 사진 기능 자체는 나중)
- 식권 기능
- 조용히 보내기 (isPrivate)
- 메세지 가리기 (host/admin이 부적절 메세지 숨기기) — 나중에 별도 시나리오
- QR 꾸미기 — 나중에

---

## 참고 프로토타입

- 관계/이름 입력: `_prototypes/wedding-lounge/guestbook-name.html`

---

## 도메인 모델 매핑

| 요소 | 도메인 엔티티 | 비고 |
|------|--------------|------|
| 방명록/축하메세지 | GuestbookEntry | recipient_slot + relation_category + relation_detail + message(nullable) |
| 축의금 | CashGift (신규) | recipient_slot + amount + pay_method |
| 결혼식 정보 | Wedding | GET /weddings/{weddingId}를 public으로 |

---

## 구현 명세

### 0. 사전 작업: side → recipient_slot 전환

GuestbookEntry의 `side`(2종: groom/bride)를 `recipient_slot`(6종)으로 변경한다.
이미 구현된 wedding-lounge 시나리오의 코드 전체에 영향.

#### 변경 대상

| 위치 | 파일 | 변경 |
|------|------|------|
| DB | v3_guestbook_entries | `side` 칼럼 → `recipient_slot` 리네임 + CHECK 6종으로 변경 |
| DB 마이그레이션 | 새 마이그레이션 파일 | ALTER TABLE RENAME COLUMN + DROP/ADD CHECK |
| DB sqlc schema | db/queries/schema.sql | side → recipient_slot |
| sqlc 생성 코드 | db/guestbook.sql.go, db/models.go | sqlc generate 재실행 |
| 도메인 모델 | DOMAIN_MODEL_SUMMARY.md | Entities + Invariants의 side → recipient_slot(6종) |
| API contract | api-contract.yaml | GuestbookEntry, CreateGuestbookEntryRequest의 side → recipient_slot, enum 6종 |
| Go gen 코드 | models.gen.go, server.gen.go | oapi-codegen 재생성 |
| Go 코드 | service_guestbook.go, handler_guestbook.go | Side → RecipientSlot |
| Go 코드 | service_feed.go | 피드 응답의 side → recipient_slot |
| Frontend | lounge-feed 컴포넌트들 | side → recipient_slot |
| 시나리오 문서 | wedding-lounge/SCENARIOS.md | side → recipient_slot |

### 1. 신규 엔티티: CashGift

```sql
CREATE TABLE v3_cash_gifts (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id          UUID        NOT NULL REFERENCES v3_weddings(id) ON DELETE CASCADE,
    guest_name          TEXT        NOT NULL CHECK (char_length(guest_name) <= 10),
    guest_id            UUID        REFERENCES v3_users(id),
    recipient_slot      TEXT        NOT NULL CHECK (recipient_slot IN ('groom','bride','groom_father','groom_mother','bride_father','bride_mother')),
    relation_category   TEXT        NOT NULL,
    relation_detail     TEXT        CHECK (relation_detail IS NULL OR char_length(relation_detail) <= 40),
    amount              INTEGER     NOT NULL,
    pay_method          TEXT        NOT NULL CHECK (pay_method IN ('transfer','kakaopay','toss')),
    guestbook_entry_id  UUID        REFERENCES v3_guestbook_entries(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_v3_cash_gifts_wedding ON v3_cash_gifts(wedding_id);
```

### 2. API 변경

#### 2-1. 기존 엔드포인트 수정

| 엔드포인트 | 변경 |
|------------|------|
| `GET /weddings/{weddingId}` (getWedding) | 접근 정책을 authenticated → **public**으로 변경 (QR 플로우에서 비로그인 접근) |

#### 2-2. 신규 엔드포인트

| Method | Path | operationId | 접근 정책 | 소비자 | 설명 |
|--------|------|-------------|-----------|--------|------|
| POST | `/cash-gifts` | createCashGift | public | Guest Web | 축의금 기록 |

### 3. 도메인 모델 추가 (DOMAIN_MODEL_SUMMARY.md)

- Glossary: CashGift 추가
- Entities: CashGift 추가
- Aggregates: CashGift Aggregate 추가
- Invariants: CashGift 제약조건 추가
- Events+Commands: CashGiftCreated / CreateCashGift 추가
- Use Cases: Guest에 축의금 전달 추가
- 관계 요약: Wedding 하위에 CashGift 추가

### 4. 작업 순서

```
0. side → recipient_slot 전환 (DB + 도메인 모델 + API contract + Go + Frontend + 시나리오 문서)
1. 도메인 모델: CashGift 추가
2. DB: CashGift 마이그레이션 + 로컬 적용 + ERD 갱신
3. API Contract: createCashGift 추가 + getWedding public 변경 + oapi-codegen 재생성
4. Backend: CashGift service + handler (TDD)
5. Frontend (Guest Web): QR 랜딩 → 누구측 → 관계/이름 → 금액 → 축의 → 메세지 → 완료 (xState machine + 멀티스텝 UI)
6. Frontend (Dibang Wedding): My Wedding에 QR 다운로드 버튼
7. e2e: 전체 플로우 테스트
```
