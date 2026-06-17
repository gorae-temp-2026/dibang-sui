# Sui Move 컨벤션

> 이 프로젝트의 온체인 컨트랙트(`contracts/dibang_wedding/`)에 적용하는 Move 규칙. 작성·리뷰 전
> `~/.claude/skills/sui-dev-skills/move/`(setup·syntax·objects·patterns·stdlib)를 함께 읽는다.
> Sui Move는 Aptos Move·Rust와 다르다 — 그쪽 패턴을 가져오지 않는다.

## 패키지 설정
- `edition = "2024"`. Sui 1.45+는 `Sui`/`MoveStdlib` 등 프레임워크가 **암묵적 의존성** — `[dependencies]`에 명시하지 않는다.
- Sui CLI 1.63+는 `[addresses]` 섹션 불필요(패키지 name에서 파생).
- `build/`는 gitignore, `Move.lock`·`Published.toml`은 커밋.

## 모듈·구조
- 단일라인 모듈 선언: `module dibang_wedding::wedding;` (중괄호 없음).
- 섹션 순서: use → const → struct → init → public fun → public(package) fun → private → `#[test_only]`.
- `public(friend)` 금지 → `public(package)`. `public entry` 금지 — `public`(합성 가능) 또는 `entry`(엔드포인트) 중 하나.
- 파라미터 순서: 가변 객체 → 불변 객체 → capability → 원시값 → `&Clock` → `&mut TxContext`.
- getter는 필드명 그대로(`get_` 금지). 같은 모듈 내 동명 함수 불가(타입별 오버로드 안 됨).

## 오브젝트 능력 — **SBT 원칙(이 프로젝트 핵심)**
- `key`만 = soulbound(모듈 외부 transfer 불가). `key + store` = `public_transfer`로 누구나 전송 가능(되돌릴 수 없는 선택).
- **VISION §4: 활동 기록(방명록·축의·이음 등)은 신용평가 무결성을 위해 transfer 불가여야 한다 → `key`만으로.**
  - 단 **거래/선물 의도가 있는 자산**(예: MoiItem 선물 — 도메인 `SendMoiItem`)은 `store` 필요. 기록 vs 자산을 구분.
  - PTB의 `TransferObjects`는 `store`를 요구한다 → soulbound(`key`-only) 객체는 PTB로 못 옮긴다. 생성 시
    **모듈이 직접 `transfer::transfer(obj, recipient)`** 로 귀속시킨다(recipient를 인자로 받아 self-transfer lint 회피).
- 모든 struct는 `public`. `key` struct는 첫 필드 `id: UID`. capability는 `Cap` 접미사. 이벤트는 과거형 + `copy, drop`.

## 에러·이벤트
- 에러 상수 `EPascalCase: u64`. 다른 모듈의 private 에러 상수는 `expected_failure(abort_code=...)`로 참조 불가 → 그 모듈에서 테스트.
- 상태 변경마다 `event::emit`. **신뢰 잔액 계산의 입력이 되도록**, 이벤트에 누가·무엇을·언제(필요 필드)를 충분히 담는다(예: 방명록 이벤트에 message 포함 — 피드/집계가 이벤트만으로 가능해야).

## 테스트 (TDD)
- 구현 전 `_test` 먼저, `sui move test`로 red 확인 후 구현.
- `#[test]` 함수에 `test_` 접두 금지. `#[test, expected_failure(abort_code = E...)]` 한 줄로.
- 값 비교는 `assert_eq!`(import: `std::unit_test::assert_eq`). 오브젝트 정리는 `std::unit_test::destroy`
  (`sui::test_utils::destroy`는 deprecated). 간단 케이스는 `tx_context::dummy()`, 멀티-tx/공유객체는 `sui::test_scenario`.
- byte string 리터럴 `b"..."`는 ASCII만 — 테스트엔 영문 더미, 한글은 런타임에 SDK가 UTF8로 전달.
- UTF8 글자수 검증은 byte 길이가 아니라 코드포인트 수(한글 1자=3byte) — `utils::utf8_char_count` 사용.

## 배포
- testnet 재배포 시 `Published.toml`의 해당 env 엔트리 제거 후 `sui client publish`.
- public 함수 시그니처 변경은 upgrade 호환 불가 → 새 배포. 배포 ID는 `.env.testnet.sui`에 기록(공개 ID라 커밋 가능).

## 이번 세션 LESSON
- `key`-only 객체를 PTB `transferObjects`로 옮기려다 `InvalidTransferObject` → recipient 인자 방식 내부 transfer로 해결.
- 현재 컨트랙트의 `GuestbookEntry`/`CashGiftRecord`/`MoiItem`/`Ium`은 `key+store` → SBT 원칙상 `key`-only 재작성 검토(D15).
