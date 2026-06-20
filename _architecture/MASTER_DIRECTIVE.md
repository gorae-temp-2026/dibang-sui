# MASTER DIRECTIVE — 10시간 끊임없는 개선 루프 (매 작업 시작 시 재독 필수)

> **이 파일은 매 작업·매 태스크 시작 때마다 새로 읽는다. 한 번 읽고 끝이 아니다.**
> compaction을 두려워하지 않는다. 길을 잃으면 이 파일 + `SUI_CONTRACT_DESIGN_DIRECTION.md` + `AGENT_BRIEFING_PROTOCOL.md` + 메모리를 다시 읽고 복귀한다.

---

## 1. 사용자 원본 지시 (verbatim — 절대 수정 금지)

> 척추 상세 설계부터 선물/자산 레이어를 넘어 현재 프로젝트를 전부 담고 관통하는 컨트랙트와 hook 설계를 해야 해. 정답이 없어서 더 어려운 것이고, 그 만큼 정신 바짝 차리고 설계해야 해. compaction이 나도 다시 프로젝트 공부하고 논리적으로 어긋난 것은 없는지 수백가지 관점에서 개선할 수 있는 부분을 개선해야 하고, 딴 길로 빠지면 안 돼. 귀찮아하면 안 되고, 누락이 있으면 안 돼.
>
> 1 move 컨트랙트 초안 설계 및 리뷰 및 개선 /sui-dev-skills 읽고 sui 의 특성을 잘 반영
> 2 초안을 더 개선하는 관점에서 다시 재분석 및 재리서치 및 논리적 모순 발견 및 개선
> 3 컨트랙트 기반으로 sui의 특성과 현재 프로젝트 방향성과 기능을 구현할 수 있는 hook 개발 및 리팩토링
> 4 최종 목적지를 향해 컨트랙트의 부족함 없는지 파악 후 개선 및 hook 개선
> ..
>
> 이렇게 점진적으로 끊임없이 개선하는 작업을 10시간 동안 진행해야 함.
>
> 80구현 -> 120 구현 -> 140 구현 -> 150구현 -> 155구현 -> 158구현
>
> 이렇듯 한 발자국이라도 조금이라도 더 개선하기 위한 방향으로 끊임없이 루프를 돌려야 한다.
>
> 하나의 큰 작업은 여러 개의 세부적인 태스크로 쪼개지며, 작업이 끝날 때마다 opus에게 검증 및 피드백을 요청하는데 okay 사인이 나올 때까지 반복하며 okay 사인 이후에 새로 작업을 정의(안 한게 있으면 그것을 하고, 구현이 다 끝났다고 생각이 들면 더 개선할 수 있는 부분을 찾아서 개선한다)해서 진행한다. opus에게 검증 및 피드백을 요청할 때는 해당 검증 opus 또한 현재 이 프로젝트, 코드, 메모리 모든 맥락을 안 상태에서 2~30만 토큰의 맥락을 가진 상태에서 피드백을 한다. 섣불리 그럴싸한 피드백을 하지 않게 조심해야 한다.
>
> 10분마다 현재 작업 잘 하고 있는지 체크하는 loop를 등록할 건데 이는 loop 한 번에 하나의 작업 또는 태스크를 하라는 뜻이 아니라 중간에 핑계대고 멈추지 않도록 하는 부가적인 장치라고 이해하면 된다.
>
> 이 사용자의 프롬프트의 원본을 파일로 남기고, 매 작업이 시작할 때 마다 매 번 새로 읽는다. 한 번 읽었다고 끝이 아니라 매 작업마다 읽는다. compaction을 두려워하지 않는다. 10시간 동안 계속 진행한다. 핑계는 없다. 끊임없는 개선만이 너의 임무다.

---

## 2. 운영 프로토콜 (위 지시에서 도출 — 매번 이대로 돈다)

**루프 한 사이클:**
1. **재독** — 이 파일 + `SUI_CONTRACT_DESIGN_DIRECTION.md`(현재 설계·결정) + 필요한 코드/연구. (compaction 후엔 `_onboarding/VISION-AND-INTENT`·`08`·`06`·메모리도.)
2. **작업 정의** — 현재 사이클의 한 발자국(미구현분 우선 / 다 됐으면 개선점 발굴). 큰 작업이면 세부 태스크로 쪼갬(TaskCreate).
3. **구현/개선** — Move는 TDD(`sui move test` red→green), hook/프론트는 `tsc --noEmit`+`pnpm build`+테스트. Sui 특성 반영(/sui-dev-skills). 결정·가드레일(§아래) 준수.
4. **opus 검증 — OK까지 반복.** 검증 opus는 `AGENT_BRIEFING_PROTOCOL.md §7`로 **완전 온보딩(20~30만 토큰)** 후 적대 리뷰. OK 안 나오면 반영→재검증. 섣부른 그럴싸한 피드백 경계.
5. **반영 후 다음 작업 정의** → 1로. **끊임없이 한 발자국씩(80→120→…→158).**

**절대 준수(가드레일 — 어기면 길 잃은 것):**
- 설계 = 컨트랙트 로직 중심. 운영영역(sponsor·가스최적화·zkLogin·메인넷상금) 설계 드라이버 금지. ([[design-scope-contract-logic-first]])
- 컨트랙트 = **신원-불가지 지갑 그래프**(이름·성별·채팅·사진·사람정보 전부 오프체인).
- 확정 결정: #1 amount 평문 / #2 inyeon target 평문·콘텐츠 오프체인 / #4 범위=전체·부조 우선 / #12 신용=오프체인.
- 원칙: raw 액션 저장·해석은 오프체인 / SBT=key-only+transfer / per-node(전역레지스트리 X) / capability / role=fold 방향 / 돈=실제 SUI / 범주론=오프체인 함자(over-claim 금지).
- 깊이 우선: 부조로 척추(ledger) 닫고 → 신호 확장. 누락·축소·핑계 금지.

**상태의 단일 출처(SSOT for this sprint):** 진행/결정은 `SUI_CONTRACT_DESIGN_DIRECTION.md`에, 작업 추적은 TaskList에, 코드는 `contracts/dibang_wedding/sources/*.move` + `apps/dibang-wedding/src/**`. 새 결정·교훈은 즉시 해당 문서/메모리에 persist(다음 사이클이 파일로 복원 가능하게).

---

## 3. 진척 로그 (사이클마다 한 줄 append — "무엇을 한 발 더 갔나")

- 2026-06-20: 루프 시작. 결정 #1/#2/#4/#12 확정, inyeon-frontend 머지(gift/asset 레이어), 설계 v2 + 샵·선물 §3-G 반영. → Step 1(척추 ledger/event TDD) 착수 예정.
- 2026-06-20: Step 1 척추 1차 — `event.move`(Event+Participation, 방향 원천) + `ledger.move`(ActionRecord soulbound, log=public(package), settles/role 포함) 작성. `sui move test` 40/40 통과(신규 4). → opus 적대 검증(OK까지) 진행 중.
- 2026-06-20: opus 검증 NOT-OK → C1(role/event를 actor 소유 Participation에서 파생·위조차단)·C3(participate 권위역할 self 금지·assign_role 생성자 게이트·경계검증) 수정. `ledger`는 `event`를 `gathering`으로 alias(sui::event 충돌 회피). `sui move test` 43/43(신규 7). C2(wedding↔Event 통합)는 다음 증분(cash_gift→ledger 부조) 결정으로 보류: **wedding::create_wedding이 gathering::Event(WEDDING) 생성·링크, 그 event_id를 부조의 event_id로**. → opus 재검증(SendMessage 재사용) 중.
- 2026-06-21: opus 재검증 **OK** — 척추(event+ledger) C1·C3·I1 코드로 닫힘, 잔여 Critical 없음. 척추 커밋. /loop(10분) 등록(job 8c535498). **다음 증분 = 부조 루프**: ①C2(wedding이 Event(WEDDING) 생성·링크) → ②cash_gift::give(실제 SUI + ledger::log(GIVE_MONEY)) PTB 통합 → ③participate 유니크(특히 inyeon)·settles 양끝 일치 assert. 신뢰(부조)→원장 한 흐름 온체인 검증 목표.
- 2026-06-21: **부조 루프 닫힘** — C2 구현(wedding::create_wedding이 gathering::Event(WEDDING) 생성·링크, Wedding.event_id+primary_host, create_default_for_testing 내부 clock으로 호출처 무수정) + cash_gift::give(실제 SUI vault 입금 + ledger::log(GIVE_MONEY), 방향=하객 Participation 파생, target=혼주, event_id 일치 assert). `sui move test` 45/45. 신뢰(부조+SUI)→원장 한 흐름 온체인 검증 완료. **남음:** participate 유니크(특히 inyeon RECEIVER/INITIATOR)·settles 양끝 일치 assert·send_gift(PII·key+store) 정리·신호 확장(이음·선물·방명록). → opus 재검증.
- 2026-06-21: 부조 증분 opus 재검증 **OK**(3겹 정합 assert 충분·방향 파생·tx 경합 0). 커밋 59d5c91/d717c26. **다음 발자국 = send_gift 정리 증분**(task #23 follow-up): send_gift+CashGiftRecord+CashGiftSent(PII 평문·key+store) 제거→give 일원화, 테스트 deposit_for_testing로 교체. 그 뒤 participate 유니크 → 신호 확장(이음 ium→ledger, 선물 gift→ledger).
- 2026-06-21: **send_gift 정리 완료** — cash_gift의 send_gift+CashGiftRecord+CashGiftSent(평문 PII guest_name/relation·key+store=transfer 가능) 제거, 부조는 give(ledger)로 일원화. 미사용 import(String·utils)·상수·에러 정리, 테스트 deposit_for_testing 펀딩 + give_zero_fails 추가. `sui move test` 43/43. VISION §7·결정#2·SBT 위반 제거. 커밋 0788f99. opus 회귀확인 **OK**(PII/SBT 잔존 0·give 무회귀·deposit_for_testing test-only).
- 2026-06-21: **guestbook 신호확장** — GuestbookEntry(key+store·평문 guest_name·message 본문) 제거 → guestbook::write(wedding, participation)가 ledger WRITE_MESSAGE만 기록(본문·이름 오프체인, 결정#2). 부조 패턴 일치. `sui move test` 40/40. 또 하나 위반 제거 + 신호 확장(부조+방명록). **인사이트:** participate(GUEST Participation+Participated emit)가 이미 출석(ATTEND) 신호 → 별도 ATTEND 액션 불필요(인덱서가 Participated 읽음). participate 유니크는 shared Event df 경합 우려라 wedding은 permissive 유지·1:1은 inyeon에서 per-node. 커밋 e8d012d. opus 회귀확인 **OK**.
- 2026-06-21: **ium 리팩터(인연 매칭) — 진단 #1 결함 제거.** 전역 IumRegistry 삭제(단일 shared object 직렬화 chokepoint 해소·병렬성 회복) + Ium key+store 객체·PII(relation_type/label) 제거. 매칭 = request_ium(INYEON Event 생성+신청자 INITIATOR Participation+IumRequest를 수신자에 transfer) → accept_ium(수신자 자기 IumRequest+Event로 RECEIVER 참가, 요청 소비). **인사이트: 매칭=관계형성=이벤트 자체** → CS 엣지는 Event(INYEON)+양측 Participation으로 인덱서 도출, 별도 ActionRecord 불요(매칭 안의 후속 액션(선물·대화)만 원장에). 한마디 오프체인. `sui move test` 40/40. → opus full 검증(novel). 커밋 28d9dd3.
- 2026-06-21: ium full 검증 **NOT-OK**(C-IUM1: ROLE_RECEIVER/INITIATOR가 self-claimable이라 제3자가 매칭 Event에 직접 participate→방향위조 V4 inyeon 경로 재개. 인덱서 필터로 불충분 — C가 실제 RECEIVER Participation 보유→ledger participant==sender 통과). **수정:** event::is_self_claimable=GUEST만(INITIATOR/RECEIVER 제외) + `public(package) mint_participation_for` 추가, ium::accept_ium이 그걸로 RECEIVER 발행(IumRequest 소유=게이트, typed-진입함수 패턴 정합). cannot_self_claim_receiver red→green. `sui move test` 41/41. 1·3·4(레지스트리 제거 무손실·매칭=Event 모델·EWrongEvent)는 OK. → opus 재검증. 커밋 67209b5. opus 재검증 **OK**(stray RECEIVER/INITIATOR 완전 차단, IumRequest 게이트 유일).
- 2026-06-21: **gift→ledger 신호확장** — gift.move: gift(participation, item:MoiItem, recipient)가 MoiItem public_transfer(자산 이동) + ledger GIFT(target=recipient, amount=0) 한 tx. 방향 participation 파생, event-agnostic(인연/웨딩). 증여 EM은 부조 전파 제외(인덱서/Φ, MOICREDIT_AUDIT). `sui move test` 42/42. **인연 액션셋 완성(매칭+선물).** → opus 확인 OK. 커밋 c8a490d.
- 2026-06-21: **INVITE 신호확장** — wedding::invite(wedding, host_participation, guest)가 ledger INVITE(target=guest) 기록. wedding-action-catalog "디방의 본질"(가장 직접적 사전 관계 신호 CS○★) 구현. HOST 역할·event 일치 assert. 이름·연락처 오프체인. `sui move test` 43/43. **웨딩 신호셋 완성(초대·부조·방명록·참석) + 인연(매칭·선물).** → opus 확인. **다음 발자국 = Step3 SDK 재정렬(packages/sui-sdk 6파일 stale 일괄)**: give/write/invite/request_ium/accept_ium/gift/participate 빌더 + create_wedding(+clock) 정렬, 구식(create_ium/send_gift/write_entry/IumRegistry) 제거. tsc green. (+ 잔여 moi.owner·rsvp enum.)
