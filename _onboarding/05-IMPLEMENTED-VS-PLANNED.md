# 05 — 구현 현황 (무엇이 실제 있고, 무엇이 선언만 됐나)

> 원본: `_architecture/API_ENDPOINT_MAP.md`(R4·R7 주석), `_scenario/INDEX.md`, 도메인 모델 구현현황 주석.
> **이전 세션이 이 문서를 안 봐서 헛다리를 짚었다.** 특히 "온체인에 가장 자연스러운" Moi/Ium이 오프체인엔
> 없다(미구현·그린필드)는 점을 반드시 인지하라.

---

## ✅ 구현됨 (오프체인, 실제 동작)

| 기능 | 근거 |
|------|------|
| 라운지 피드(GuestbookEntry+LoungeCheckIn+HostAnnouncement), 하트, 댓글 | INDEX `[x]` 2026-05-08, wedding-lounge |
| guest-web 퍼널 (QR→방명록→축의→메시지→완료) | INDEX, guest-web-flow |
| 라운지 페이지 UI | INDEX `[x]` |
| 호스트 초대 (부모/배우자 슬롯, 토큰) | INDEX `[x]`, HostInvites |
| 웨딩 리포트 / 축의 장부 (요약·CSV·수동추가) | INDEX `[x]` |
| 사진 공유 3종(invitation/memory/share) + presigned + 버킷분리(dev) | INDEX `[x]` 2026-05-20 |
| 동의 온보딩 (consent) | dev 구현, prod pending, IP/UA stub |
| 웨딩 메모리북 (BE 32/32 + UI) | 2026-05-24 |
| admin 페이지 (가드 검증) | `[~]` authed data e2e는 prod env 필요 |

## ❌ 선언만 / 미구현 — **중요 (온체인 그린필드)**

`_architecture/API_ENDPOINT_MAP.md` **R4(2026-05-18)**: 아래 **14개 operation은 계약상 `deprecated` ·
백엔드 501 · 프론트 전무(미구현·추후)**.

| 도메인 | 엔드포인트(예) | 상태 |
|--------|----------------|------|
| **Mois (모이)** | getMyMoi, getMoi | 501 / 프론트 없음 |
| **Moi Items** | listMyMoiItems, equip/unequip/**send**MoiItem | 501 / 프론트 없음 |
| **Iums (이음)** | createIum, deleteIum, listMyIums | 501 / 프론트 없음 |
| **Interior Items** | list/create/place/unplace | 501 / 프론트 없음 |
| **GatherPlaces** | getGatherPlace | 501 / 프론트 없음 (같은 태그 `listLoungeCheckIns`는 deprecated 아님 — 마스킹 대상으로 살아있음) |

→ **신뢰네트워크의 시각·소셜 계층(Moi 아바타, 아이템, 이음, 모이가모인곳)은 오프체인에 존재하지 않는다.**
이번 해커톤에서 **처음부터 온체인으로 짓는 그린필드**다. "오프체인→온체인 전환"이 아니다.

> 미묘한 점: 이름 마스킹 해제가 `v3_iums` 테이블에 의존하지만(API_CONVENTIONS §3), Ium CRUD UX는 501.
> 즉 이음은 **테이블만 존재**하고 생성 경로는 없다. `getUser`는 마스킹 cross-cutting이라 deprecated 아님
> ("우선 구현 예정").

## 🟡 계획 / 미완 / in-flight

| 항목 | 상태 |
|------|------|
| memory-domain-split (`v3_memories`, entries.message 드롭) | `[ ]` in-flight (엔드포인트맵 미등재, admin은 테이블 존재 가정 — 불일치) |
| display-port (`/display`) | `[ ]` 미구현 |
| 로그인 상태 QR 메시지/축의 (dibang-wedding) | 추후(미구현) |
| `claimGuestbookEntry` | 계약엔 존재, 시나리오 없음 |
| 사진 삭제 / 메모리 수정 / 디스플레이 하트·사진 | MVP 제외 |

## 총계
- `API_ENDPOINT_MAP.md`는 **R7(2026-05-18) 기준 58개**(deprecated 14 포함)로 적혀 있으나, **이후 live
  `packages/contracts/api-contract.yaml`는 그보다 큼** — memories·RSVP·consents·presigned uploads·
  shared-photo-groups·admin(파괴적 CRUD 포함) 등이 추가됨(독립 검증 시 ~100여 operationId 확인). deprecated 14는
  여전히 유효. **정확한 수·목록은 `packages/contracts/api-contract.yaml`(단일 진실원)에서 재확인할 것.**

---

## 온체인 작업에의 함의

1. **신뢰네트워크(Moi/Ium/InteriorItem/GatherPlace)** = 오프체인 미구현 → **온체인 그린필드 구축**. 이게
   신뢰 잔액·신용의 핵심 데이터원이므로 이번 작업의 중심.
2. **이미 구현된 상호작용**(방명록·축의·하트·댓글·입장·메모리북)은 "전환" 대상 — 온체인 기록(SBT/이벤트)으로 옮긴다.
3. **모든 (비민감) 상호작용을 온체인**(VISION §7): 좋아요·하트·댓글·방문까지 신뢰 잔액 입력이므로 온체인 목표.
4. 이미 만든 Move 컨트랙트(`contracts/dibang_wedding/`)는 wedding·guestbook·cash_gift·rsvp·moi·ium을 포함하지만,
   (a) SBT 정합성(키-only) 정정 필요, (b) 신뢰 잔액 모델(`08`) 입력 요구에 맞춰 필드/이벤트 보강 필요.
