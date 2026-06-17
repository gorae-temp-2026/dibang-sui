# 09 — Sui Overflow 2026 정렬 (DeFi & Payments 트랙)

> 출처: https://mystenlabs.notion.site/overflow-2026-handbook (playwright로 직접 열람, 2026-06-17).
> Notion 동적 페이지라 fetch 불가 → playwright/chromium 필요. 트랙별 "Problem Statement" 하위 페이지는
> 별도 링크(미열람, 후속 확인 권장).

---

## 제출 트랙: DeFi & Payments

> "Build programmable payment systems and financial applications on Sui that move, manage, and transform
> money intelligently, creating more seamless, automated, and composable financial experiences **beyond
> traditional DeFi**."

- 상금: **1st $30,000 / 2nd $15,000 / 3rd $10,000 / 4th $7,500**.
- 우리 포지션: **관계 기반 신용(relationship-based credit)** — 결혼식 등 이벤트의 상호작용을 온체인에 쌓아
  신뢰 잔액→신용 점수를 만들고 이를 결제·대출 등 DeFi에 연결. "beyond traditional DeFi"(담보 중심을 넘어
  사회적 신뢰 기반)에 정확히 부합.

---

## 심사 기준 (가중치) — 전략의 기준

| 기준 | 가중 | 내용 | 우리 정렬 |
|------|------|------|-----------|
| **Real-World Application** | **50%** | 의미 있는 문제 해결, 시장 관련성, 장기 가치 | ★ 최대 강점. "사회적 관계를 신용으로" = 무담보/씬파일 신용의 실제 문제. 결혼식이라는 실데이터 진입점. |
| Product & UX | 20% | 품질·사용성·완성도·UX | zkLogin(지갑 없이 Google 로그인) + sponsor(가스 무료)로 일반인 진입 마찰 제거가 강점. UI 완성도 필요. |
| Technical Implementation | 20% | 기술 품질·신뢰성·**의미 있는 Sui 통합** | Move SBT(soulbound 활동기록), zkLogin, sponsored tx, (추후) USDSui — Sui 프리미티브를 깊게 사용. |
| Presentation & Vision | 10% | 명확성·스토리텔링·장기 비전 | 신뢰네트워크→신용→DeFi 서사가 강력. 데모 영상·피치 필요. |

> "Strong projects: solve meaningful problems, polished UX, leverage Sui meaningfully, strong product
> thinking, long-term potential. **focused on meaningful products and ecosystem impact, not just technical
> demos.**" → 기술 데모가 아니라 **의미 있는 제품**으로 보여야 한다.

---

## 일정 (Pacific Time) — ⚠️ 마감 임박

| 날짜 | 이벤트 |
|------|--------|
| 5/7 | 공식 시작 |
| 5/7–6/21 | 빌딩 기간 |
| **6/21 18:00 PT** | **제출 마감** (이후 수정해도 shortlisting 미반영 가능) |
| 7/8 | shortlist 발표 |
| 7/20–21 | Demo Day (**DeFi & Payments = 7/21**) |
| 8/27 | 최종 발표 (Sui Basecamp 2026 피치 초대) |

> 작성 시점(2026-06-17) 기준 마감까지 약 4일. **속도가 중요** — 코어부터 온체인(VISION §8).

---

## 상금 구조 — **mainnet 배포가 50%를 좌우**
- 50%는 수상 발표 시, **나머지 50%는 mainnet 성공 배포 후**. 8월 발표 시점에 이미 mainnet이면 **100% 즉시**.
- → 현재 testnet 배포만 됨. **mainnet 배포를 목표에 포함**해야 전액 수령 + 자격(아래) 충족.
- 자격: 빌딩 기간(5/7~6/21) 중 제작, shortlist/Demo Day 시점에 **mainnet 또는 testnet 배포**. 기존
  프로젝트는 **이번 기간에 substantial new 기능**을 만든 경우만 허용 → 디방 온체인화는 신규 기능으로 명확.

---

## 제출 체크리스트 (핸드북)
- [ ] Project Name (간결)
- [ ] Description (무엇을·왜 중요한지)
- [ ] Logo (1:1, JPG/PNG)
- [ ] **Public GitHub Repo** (심사 기간 public 필수)
- [ ] **Demo Video** (YouTube 권장, **≤5분**, 필수)
- [ ] Website (선택, 강력 권장)
- [ ] Deployment (testnet 또는 mainnet)
- [ ] **Package ID** (온체인 배포 시) — 우리: `.env.testnet.sui`에 testnet ID 보유, mainnet 시 갱신
- 상세: "Sui Overflow 2026: Detailed Submission Guide"(핸드북 링크, 후속 확인).

## Demo Day (shortlist 시)
- 팀원 1명 이상 참석, **작동하는 버전 시연** + 라이브 발표(5분) + Q&A(최대 2분), YouTube 라이브.
- 발표 5분 구성: **문제 / 솔루션 / 기술 구현 / 왜 Sui / 향후 로드맵.**

## 기타
- University Award: 10×$2,500 (팀 ≥50% 학생).
- Post-hackathon $250k+ value (audit credits·멘토십 등). OpenZeppelin·OtterSec 등 보안 office hours 제공
  → 우리 sponsor/SBT 컨트랙트 보안 리뷰에 활용 가능.

---

## "상 타려면" 우선순위 (이 가중치 기준)

1. **Real-World 서사·실증(50%)**: "관계 신뢰 → 신용 → DeFi"를 **실제 동작하는 한 흐름**으로 보여라.
   예: 하객 상호작용(온체인 SBT) → 한 지갑의 신뢰 잔액 산출 → 그 점수로 DeFi 동작(대출 한도/결제) 데모.
   기술 나열이 아니라 "왜 이게 중요한 문제인가"(씬파일·무담보 신용)를 명확히.
2. **완성도 있는 한 흐름 > 미완성 여러 흐름(20% UX)**: zkLogin 로그인 → 온체인 기록 → 신뢰잔액 표시가
   매끄럽게. 데모 영상에서 끊김 없이.
3. **의미 있는 Sui 통합(20%)**: SBT(soulbound), zkLogin, sponsored tx, (가능하면) USDSui/결제 — Sui만의
   프리미티브를 핵심 메커니즘으로.
4. **mainnet 배포**: 상금 100% + 자격. 코어 기능 안정화 후 mainnet.
5. **5분 데모 영상 + 피치**: 문제→솔루션→기술→왜 Sui→로드맵.

> 결론: 심사의 절반이 "Real-World Application"이다. **신뢰잔액→신용→DeFi가 실제로 한 번 도는 데모**가
> 이 프로젝트의 승부처다. 신뢰 잔액 모델 상세는 `08-TRUST-BALANCE-CREDIT-MODEL.md`.
