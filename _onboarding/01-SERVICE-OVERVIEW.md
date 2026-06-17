# 01 — 서비스 개요

> 이 문서는 디방이 "무슨 서비스인가"를 빠르게 잡게 한다. 엔티티·불변식의 최종 기준은
> `_architecture/DOMAIN_MODEL_SUMMARY.md`(SSOT)이고, "왜 Sui인가"의 원천은 `VISION-AND-INTENT.md`다.

---

## 한 문장

디방은 **결혼식 디지털 방명록 + 웨딩 라운지** 서비스이고, 그 위에서 발생하는 **사람들 간 상호작용을
온체인 데이터로 쌓아 "신뢰네트워크"와 "관계 신뢰 잔액"을 만드는** 것이 본질적 목표다.

---

## 두 층위로 보기

### 층위 1 — 눈에 보이는 제품 (결혼식 경험)
- **호스트**(신랑·신부·양가 부모)가 결혼식(Wedding)을 만들고, **모바일 청첩장**과 **웨딩 라운지**를 갖는다.
- **하객**은 청첩장을 보고(하트), 현장 QR로 들어와 **누구측(혼주 6슬롯) 선택 → 관계/이름 → 축의 → 축하
  메시지**를 남긴다(방명록).
- 라운지에 입장(로그인)하면 **피드**(방명록·입장·공지)를 보고 하트·댓글로 상호작용하며, 자기 **아바타
  (Moi)** 로 신뢰네트워크 공간에 모인다.

### 층위 2 — 진짜 목표 (신뢰네트워크 → 신용 → DeFi)
- 위의 모든 상호작용(방명록, 축의, 하트, 댓글, 입장, 관계 맺기…)은 **신뢰네트워크의 데이터**다.
- 이 데이터를 **Sui 온체인**에 (비민감 범위에서) 쌓아, 사람·관계마다 **관계 신뢰 잔액(trust balance)** 을
  계산한다.
- 한 지갑에 연결된 모든 신뢰 잔액을 합치면 **그 지갑의 신용 평가 재료**가 되고, 이를 **DeFi**(대출·결제
  등)에 활용한다. → 제출 목표: **Sui Overflow 2026, Payment & DeFi 트랙.**
- 상세 모델: `08-TRUST-BALANCE-CREDIT-MODEL.md`. 원천 발언: `VISION-AND-INTENT.md`.

---

## 핵심 개념 (도메인 모델 Glossary 인용)

- **신뢰네트워크**: "인간이 사회적 동물로서 생존을 위해 진화시켜온 관계망. 결혼식·장례식 등에서 기쁨과
  슬픔을 나누는 행위는 본질적으로 '관계를 사기 위한 에너지·재화의 교환'이며, 감정 교류는 관계 유지를
  위한 에너지." → 디방이 궁극적으로 발굴·활용하려는 핵심.
- **User**: 디방 계정 주체(이메일/전화로 식별). 영속적 **Moi 1개**를 보유(1:1). Host/Guest는 *역할*(특정
  Wedding 컨텍스트에서 부여).
- **Moi(모이)**: 신뢰네트워크의 노드를 시각화한 **아바타**. User의 시각적 표현.
- **Ium(이음)**: User와 User 간의 **관계**. 신뢰네트워크의 엣지(핵심 단위). 한국어로 "이음".
- **Wedding / WeddingLounge / MoiGatherPlace**: 결혼식 이벤트 / 그 라운지 / 라운지 안의 모이 시각화 공간.
- **GuestbookEntry / GuestbookMessage**: 하객의 라운지 정체성(누가·어느 관계로 참석) / 거기 달리는 개별 메시지(1:N).
- **CashGift**: 하객→혼주 축의금. (현재 오프체인: 외부송금 유도 + 기록만 / 목표: SUI 온체인 송금 — VISION §6)
- **LoungeCheckIn**: User가 특정 라운지에 입장한 멤버십 기록(user×lounge 1건, 로그인 필수).
- **HostInvite**: 신랑/신부가 부모·배우자를 Host 슬롯에 초대하는 토큰 기반 초대.

---

## 큰 그림 흐름

```
[청첩장 공유/QR]  ──(비로그인, guest-web)──>  청첩장 보기·하트
                                              누구측→관계/이름→축의(CashGift)→메시지
                                                        │  "사진 공유/라운지" 후킹
                                                        ▼
[로그인 게이트] ──(dibang-wedding /lounge/{id}/enter)──> LoungeCheckIn(입장)
                                                        ▼
                              라운지 피드(방명록·입장·공지) + 하트·댓글 + Moi/이음(신뢰네트워크)
                                                        ▼
                              (목표) 모든 상호작용을 온체인에 → 신뢰 잔액 → 신용 → DeFi
```

자세한 단계는 `04-USER-JOURNEYS.md`. 앱 경계는 `02-APP-BOUNDARIES.md`.

---

## 핵심 엔티티 한눈 지도 (관계)

```
User ─┬─ Moi (1:1) ─ MoiItem (1:N)
      ├─ Ium (M:N, from/to)         ← 신뢰 엣지
      └─ LoungeCheckIn (1:N)        ← 라운지 입장(로그인)

Wedding ─┬─ WeddingInfo(VO) ─┬─ MobileInvitation (1:N)
         ├─ CashGift (1:N)   ├─ HostInvite (1:N)
         └─ WeddingLounge (1:1)
              ├─ LoungeCheckIn (1:N)
              ├─ MoiGatherPlace (1:1) ─ InteriorItem (1:N)
              ├─ GuestbookEntry (1:N) ─ GuestbookMessage (1:N) ─ View / FeedComment / FeedHeart
              └─ HostAnnouncement (1:N)
```

> 전체 엔티티·필드·불변식은 `_architecture/DOMAIN_MODEL_SUMMARY.md` 참조 (이 지도는 요약).

---

## 무엇이 실제로 구현됐나 (요점)

- **구현됨**: 청첩장·방명록·축의 퍼널(guest-web), 라운지 피드·입장·하트·댓글, 호스트 결혼식 생성/관리,
  호스트 초대, 축의 장부(웨딩 리포트), 사진공유, 동의 온보딩, 메모리북.
- **선언만/미구현**: **Moi·MoiItem·Ium·InteriorItem·MoiGatherPlace**(신뢰네트워크의 시각·소셜 계층) —
  계약상 deprecated·백엔드 501·프론트 없음. → 온체인으로 새로 짓는 **그린필드**.
- 상세: `05-IMPLEMENTED-VS-PLANNED.md`.
