# 02. 담보·보증·익스포저 — 리서치

> 기존 금융·신용 시스템에서 신용을 "보강·측정·한정"하는 3대 장치 — 담보(collateral)·보증(guarantee)·익스포저(exposure) — 의 정의·메커니즘·공식·대표 제도(한국 포함)를 출처와 함께 순수 수집. 우리 4층 대조는 §2·§3에서. (2026-06-17)

## 1. 리서치 (수집)

이 도메인의 큰 그림: 대출의 **기대손실(Expected Loss, EL)** 은 보통 다음으로 분해된다.

> **EL = PD × LGD × EAD**
> - PD (Probability of Default, 부도확률) — *얼마나 떼일 가능성이 있나* (01번 도메인 주제)
> - LGD (Loss Given Default, 부도시손실률) — *떼이면 얼마를 잃나* → **담보·보증·우선순위가 여기를 낮춘다**
> - EAD (Exposure at Default, 부도시익스포저) — *떼이는 시점에 얼마가 걸려 있나* → **익스포저 한도가 여기를 통제한다**

즉 담보·보증·신용보강은 **LGD를 낮추는** 장치이고, 익스포저 관리는 **EAD와 그 집중을 통제하는** 장치다. 이 분해가 §1 전체를 관통하는 뼈대다. (출처: Wikipedia EAD; Wall Street Prep LGD)

---

### 1-A. 담보 (Collateral)

#### 정의
담보(collateral)는 "대출자(lender)의 이익을 보호하기 위해 차입자(borrower)가 제공(pledge)하는 자산·재산"이다. 차입자가 채무를 갚지 못하면 대출자는 담보를 압류·처분(seize and sell)해 손실을 회수할 수 있다. 주택, 자동차, 예금, 투자자산 등 금전적 가치가 있는 거의 모든 자산이 담보가 될 수 있다. (출처: Discover; CFI Collateral; eCapital)

#### Secured vs Unsecured (담보부 vs 무담보)
- **Secured loan(담보부 대출)**: 자산을 담보로 잡는 대출. 담보가 상환을 "보증(guarantee)"하는 역할을 해서 채무불이행 시 대출자가 회수할 수단이 있다. 대표 예: **모기지(주택담보대출)** — 담보=집, **자동차담보대출** — 담보=차.
- **Unsecured loan(무담보 대출)**: 담보 없이 **차입자의 신용도(creditworthiness)에만** 의존하는 대출. 대표 예: 대부분의 신용카드, 학자금대출, 개인 신용대출.
- 핵심 차이: 담보부는 담보에 기대고, 무담보는 오직 신용에 기댄다. 따라서 무담보는 보통 금리가 더 높고 한도가 더 낮다. (출처: Discover; OneMain; Truist; U.S. Bank)

#### LTV (Loan-to-Value Ratio, 담보인정비율)
- **정의**: 대출금액 / 담보자산 가치. 빌리는 돈이 담보의 시장가·감정가 대비 얼마나 큰지를 나타내는 비율로, **대출의 재무 리스크를 재는 지표**다.
- **공식**: `LTV = 대출금액 ÷ 자산가치`
- **예시**: 15만 달러짜리 집을 사려고 13만 달러를 빌리면 LTV = 130,000 ÷ 150,000 = **약 87%**.
- **의미**: LTV가 높을수록 리스크가 크다 → 대출자는 더 높은 금리를 매기거나 보험(예: PMI)을 요구한다. (출처: Wikipedia LTV; CheckCity; Qollateral)

**모기지에서의 LTV 임계선 (미국, 2025~2026 기준):**
- 전통적(conventional) 대출에서 **계약금(down payment)이 20% 미만 = LTV 80% 초과**이면 통상 **PMI(Private Mortgage Insurance, 민간모기지보험)** 가 요구된다. 즉 LTV ≤ 80%면 PMI를 피할 수 있다.
- PMI 비용은 신용점수에 따라 보통 연 **0.46%~1.50%** (기준 대출액 대비).
- 미국 법상 LTV가 **78%** 에 도달하면 대출이 정상인 한 PMI를 **자동 해지**해야 하고, LTV 80% 도달 시 차입자가 해지를 요청할 수 있다.
- Fannie Mae HomeReady / Freddie Mac HomeOne 같은 프로그램은 계약금 3%(= 최대 **LTV 97%**)까지 허용. (출처: Chase PMI; gustancho; themortgagereports; Navy Federal)

**Combined LTV (CLTV, 결합 LTV):** 같은 담보(집)에 1순위 모기지 + 2순위(HELOC 등) 여러 대출이 걸려 있을 때, 모든 대출 잔액 합 ÷ 담보가치. 2순위 대출의 실질 리스크를 본다. (출처: Chase CLTV)

#### 헤어컷 (Haircut)
- **정의**: 자산의 **현재 시장가치**와 그 자산을 **담보(또는 규제자본 계산)로 인정할 때 매기는 가치**의 차이. 즉 시장가에서 깎아내는 할인폭이다. 즉시 매각·청산 시 자산 가치가 떨어질 위험을 반영한다. **자산의 리스크·변동성이 클수록 헤어컷이 크다.** (출처: Wikipedia Haircut)
- **공식적 직관**: `담보인정가 = 시장가 × (1 − 헤어컷%)`
- **예시**:
  - 시장가 100달러 자산에 20% 헤어컷 → **80달러**만 대출 담보로 인정.
  - 브로커-딜러가 5년 만기 미국채 1,000만 달러를 담보로 받고 2.5% 헤어컷 적용 → 인정 담보가 = 975만 달러. 거기에 LTV 캡 95% 적용 시 최대 대출 = 9,262,500달러.
- **자산별 헤어컷 차이**: 미국 단기국채(T-bill)처럼 안전·고유동성 자산은 헤어컷이 **거의 0**, 변동성 크거나 시장성 낮은 자산은 **최대 50%** 까지. (출처: Wikipedia Haircut; fe.training)
- **레포(repo) 시장에서의 역할**: 헤어컷은 대출자(현금 제공자)를 보호하는 리스크 관리 장치로, 차입자가 맡긴 담보의 시장가를 깎는 비율이다. 헤어컷이 높을수록 = 빌릴 수 있는 현금이 적고(낮은 LTV), 내재 레포금리(implied repo rate)가 높아질 수 있다. **낮은 헤어컷은 더 큰 레버리지를 허용한다.** (출처: Wikipedia Haircut; FasterCapital Collateral Haircut)
- **중앙은행 적용**: ECB(유럽중앙은행)는 담보로 제출되는 **모든 증권에 헤어컷을 적용**하며, 헤어컷 크기는 증권의 리스크·유동성에 따라 달라진다. (출처: Wikipedia Haircut)
- **용어 주의 — 두 가지 의미**: ① 위의 담보 할인(margin) 의미, ② 2008 위기·그리스 사태 이후 미디어/경제학에서 쓰는 **"채권자가 받을 금액의 삭감"**(채무 액면가 감액) 의미. 예: 2012년 그리스 국채 구조조정에서 액면가의 약 70% 헤어컷(NPV 기준) — "역사상 최대 채무재조정". 거래소 상품(주식·옵션·선물) 맥락에서는 **margin(증거금)** 과 호환되어 쓰임 — 헤어컷이 계좌 자본을 초과하면 마진콜 또는 강제청산. (출처: Wikipedia Haircut)

#### 담보의 종류
- **부동산(real estate)**: 주택·상업용 건물. 모기지·홈에쿼티대출의 담보. 고가치 자산이라 강력한 담보로 인정.
- **유가증권(securities)**: 주식·채권·뮤추얼펀드. 증권담보대출·신용거래(margin)에서 활용.
- **현금성 자산(cash deposits)**: 예금, **양도성예금증서(CD)** 등. 가장 안전(헤어컷 최소).
- **재고·기계·장비(inventory, machinery, equipment)**: 기업 대출, 특히 **자산기반대출(ABL, asset-based lending)** 에서.
- 미국에서는 **UCC(Uniform Commercial Code) Article 9** 가 담보(동산·채권 등)에 대한 **담보권(security interest)** 의 설정(attachment)·완성(perfection)을 규율한다. (출처: eCapital; UpCounsel; CFI Collateral; clearlyacquired)

**관련 법적 용어:**
- **Pledge(질권/담보제공)**: 자산을 담보로 제공하는 행위.
- **Security interest(담보권)**: 담보 자산에 대한 대출자의 법적 권리.
- **Lien(유치권/담보권 표시)**: 담보 자산에 설정된 권리 — 채무 미상환 시 그 자산으로 변제받을 수 있는 청구권.
- **Attachment(부착) / Perfection(완성)**: 담보권이 효력을 갖고(부착), 제3자에 대항할 수 있게(완성) 되는 절차. (출처: CFI Collateral; UpCounsel)

#### 담보 평가·실행 (Valuation & Enforcement / Foreclosure)
- **담보 평가**: 담보가치는 감정가·시장가로 산정하며 헤어컷·LTV 캡이 그 위에 적용된다. 가치는 시간에 따라 변하므로 LTV 약정(maximum LTV covenant)으로 모니터링한다. (출처: Qollateral; lawinsider Maximum LTV)
- **담보권자(secured creditor)의 지위**: 담보권을 가진 채권자는 채무자 파산 시 **무담보채권자(unsecured creditors)와 경쟁하지 않고** 담보 자산에 대해 권리를 실행할 수 있다 — 우선적 회수. (출처: Wikipedia Secured creditor)

**미국 UCC Article 9 기준 실행(담보 처분) 2대 방식:**
1. **공개매각(Public/Private Sale of Collateral)** — UCC §9-615. 매각대금 배분 우선순위:
   ① 실행하는 담보권자의 비용(expenses) → ② 그 담보권자의 피담보채무 → ③ 요구를 제출한 후순위 담보권자의 채무. 비용·채무를 모두 갚고 **잉여(surplus)** 가 남으면 채무자에게 반환. 매각이 **부족(deficiency)** 으로 끝나면 채무자가 부족분에 대해 책임을 진다(잔존 채무). (출처: ABA Business Law Today; boisestate pressbooks)
2. **엄격집행/강제취득(Strict Foreclosure)** — 담보권자의 부도후 구제수단. 가장 단순한 형태는 **"채무 면제 ↔ 담보 소유권 이전"** 의 교환. 절차: ① 담보권자가 담보를 채무의 전부/일부 변제 대신 보유하겠다는 제안을 채무자·보조채무자·기타 담보권자에게 송부 → ② 이들이 수락(또는 정해진 기간 내 이의 없음)하면 성립. (출처: Proskauer; ABA Business Law Today)

- **부동산 모기지 foreclosure**(미국)는 주에 따라 **사법적(judicial)/비사법적(non-judicial)** 절차로 나뉘며, 경매(auction) 후 잔존채무(deficiency)·잉여 처리가 따른다. UCC foreclosure는 동산 담보에 대한 비사법적 절차로, 채무에 다툼이 없을 때 특히 유용하다. (출처: ABA Business Law Today; Venable)

---

### 1-B. 보증 (Guarantee)

#### 개인보증 (Personal Guarantee)
- **정의**: 차입자(보통 기업의 소유주·핵심 이해관계자)가 **기업이 상환하지 못하면 개인이 그 대출 상환에 대한 책임을 진다**는 계약상 의무. 담보부 대출이 상환을 *특정 자산*에 묶는 것과 달리, 개인보증은 책임을 **보증인의 개인 재산 전체(financial portfolio)** 로 확장한다. (출처: Crestmont; clarifycapital; OnDeck; Brex)
- **종류**:
  - **무한(unlimited) 개인보증**: 미상환 채무 전액 + 법적 비용까지 책임.
  - **제한(limited) 개인보증**: 책임 금액에 상한. 종종 지분율과 연동(예: 지분 25%면 채무의 25%만 책임). (출처: clarifycapital; Crestmont)

#### 연대보증 (Joint and Several Liability) — 법적 의미
- **정의**: 여러 사람이 보증인으로 서명할 때, 대출자는 **단일 보증인 한 명에게 미상환 채무 전액**을 청구할 수 있다 — 그 사람의 비례 지분만이 아니라.
- **핵심 함의**: 지분 30%만 가진 사람도 다른 파트너들이 못 갚으면 **혼자 100%를 갚아야 할 수 있다.** 서류상 책임이 제한(limited)되어 있어도, 대출자가 joint and several 조항을 넣으면 한 파트너가 전액을 떠안게 될 수 있다. (출처: National Law Review; lawinsider Joint and several; clarifycapital)
- "joint(공동)"은 함께, "several(개별)"은 각자 — 둘을 합치면 **"전원 함께도, 각자 한 명씩도 전액 추궁 가능"** 이라는 강력한 채권자 보호 장치.

#### 한국의 연대보증 폐지 흐름 (중요 — 정책 변화)
한국은 연대보증인의 과중한 부담(보증인 연쇄 파산 등) 문제로 **공적 영역에서 연대보증을 단계적으로 폐지**해 왔다.
- **신용보증기금(신보)**: 제3자 연대보증은 **1999년부터 단계적 폐지**되어 현재 **전면 금지**. 설립 7년 미만 창업기업에 대해서는 (대표자 연대보증) 면제 조치.
- **2018년 4월~**: 공공기관 중심으로 **법인 대표자 연대보증 전면 폐지**. 구체적으로 주식회사 등 법인 중소기업이 **중소기업진흥공단(직접 정책자금 대출)** 과 **신용보증기금·기술보증기금·지역신용보증재단(보증부 대출)** 으로부터 자금을 받을 때 **대표이사 연대보증 입보 요구를 폐지**.
- **은행권(제1·제2금융권)**: 개인 대상 대출에 한해 **2013년부터** 신규 연대보증 폐지.
- **대부업**: 금융위가 **2019년 1월 1일부터** 신규 취급 개인대출 계약에 대해 원칙적으로 연대보증 폐지.
- 단, **개인 간(사인 간) 연대보증** 자체는 여전히 합법(불법이 아님). 폐지는 주로 금융기관·공공기관 대출에 한정. (출처: namu.wiki 연대보증; FSC 대부업 연대보증 폐지; brunch 연대보증 폐지)

#### 보증보험 / 신용보험 (Surety / Credit Insurance)
세 가지 유사하지만 다른 장치를 구분하는 것이 핵심:

**(1) 보증보험 / Surety Bond:**
- **3당사자 구조**: ① **principal(주채무자)** — 의무 이행 당사자, ② **obligee/beneficiary(수혜자)** — 의무 이행을 받을 측, ③ **surety(보증인)** — 보통 은행·보험사로, principal이 이행할 것을 obligee에게 보증.
- **claim 처리 방식이 보험과 다름**: surety bond에 claim이 들어오면 surety가 비용을 지급하되 **principal에게 전액 상환(reimbursement)을 추궁**한다. 즉 surety는 보험보다 **신용 공여자(credit provider)** 에 가깝다. (출처: nichetc; creditguarantee.co.za; kaseinsurance)

**(2) 무역신용보험 / Trade Credit Insurance:**
- **정의**: 매출채권(accounts receivable)을 부실채권(bad debt) 손실로부터 보호하는 리스크 관리·보험 상품. **거래 매출채권(고객에게 보낸 송장)에만** 적용되며, 고객이 지급하지 않으면 보험사가 보험금을 지급.
- **메커니즘**: 물품·서비스 납품 후 고객이 파산·부도로 미지급하면 보험사가 보상 — 보통 거래액의 **85~100%**.
- **수출신용보험(export credit insurance)** 은 그 수출 버전(국가위험 포함). (출처: nichetc; linkedin Export Credit Insurance)

**(3) 보험 vs surety 핵심 차이:**
- **보험사**는 claim의 손실을 **자기가 흡수**하고 기업엔 소액 자기부담(excess)만 부과.
- **surety**는 claim 비용을 지급하되 **principal에게 전액 회수** → 신용 공여 성격.
- (참고: **신용장 Letter of Credit** 도 유사 기능이나, 은행이 발행하고 담보·수수료 구조가 다름.) (출처: kaseinsurance; nichetc)

#### 한국의 공적 신용보증 3대 기관
한국에는 **담보력이 부족한** 기업·소상공인이 금융기관에서 대출받을 수 있도록 **신용보증서**를 발급하는 공적 보증기관 3종이 있다. 구조: 기관이 보증서를 발급 → 금융기관이 그 보증을 믿고 대출 → 차주 부도 시 기관이 **대위변제(代位辨濟)** → 기관은 차주에게 **구상권(求償權)** 행사. (출처: ko.wikipedia 신용보증기금; easylaw.go.kr; see-real)

**(1) 신용보증기금 (KODIT, Korea Credit Guarantee Fund):**
- 근거법: **신용보증기금법**, 소관: **금융위원회**.
- 대상: 주로 **일반 중소기업**(전국 단위).
- 역할: 담보능력이 부족한 기업의 신용도를 심사해 신용보증서를 제공, 금융회사 대출을 받게 함. (출처: ko.wikipedia 신용보증기금; namu.wiki 신용보증기금)

**(2) 기술보증기금 (KIBO, Korea Technology Finance Corporation):**
- 근거법: **기술신용보증기금법**(현 기술보증기금법), 소관: **금융위원회**.
- 대상: 주로 **기술형 기업**(벤처·이노비즈·창업초기·R&D 기업).
- 역할: **기술력·사업성**을 종합 평가(기술평가)해 맞춤형 보증 제공. (출처: 기술보증기금 jasoseol; namu.wiki 기술보증기금)

**(3) 지역신용보증재단 (지신보, Regional Credit Guarantee Foundation):**
- 근거법: **지역신용보증재단법**, 소관: (구) 중소기업청 계열(현 중소벤처기업부).
- 대상: **담보력이 미약한 지역 내 소기업·소상공인**.
- 역할: 물적 담보력은 약하나 사업성·성장잠재력·신용이 양호한 지역 소기업·소상공인을 보증해 자금조달·경영안정·지역경제 활성화에 기여. 전국 각 시·도에 재단이 있고 그 상위에 **신용보증재단중앙회**. (출처: easylaw.go.kr; see-real)

**3기관 요약 차이**: 신보=전국 일반 중소기업 / 기보=기술·벤처 / 지신보=지역 소상공인. (출처: see-real)

**한국 공적보증의 핵심 운영 개념:**
- **보증료(guarantee fee)**: 보증금액 대비 부과. 보증심사등급별 보증료율 → 가산보증료율 → 차감보증료율을 차례로 적용. 최종 보증료율은 보통 **0.5%~3.0%**(대기업 최고 3.5%). 신용도 변화에 연동. 계산식: `보증료 = 보증금액 × 보증료율 × 보증기간 ÷ 365`. (출처: KODIT 보증료 안내)
- **대위변제(代位辨濟)**: 보증업체 부실 시 기관이 금융기관에 대신 갚는 것.
- **구상권(求償權)**: 대위변제 후 기관이 채무관계자에게 청구할 수 있는 모든 금전채권. 구상채권 = 상각 전 대위변제금·대지급금 + 부수되는 보증료·지연보증료·대위변제수수료·손해금·위약금. (출처: KODIT; data.go.kr 구상권 현황)
- **운용배수(operating multiple, 레버리지)**: **보증잔액 ÷ 기본재산**. 즉 자기 기본재산의 몇 배까지 보증을 서고 있나. 금융당국 권고 적정 운용배수 **12.5배**(은행 건전성 지표 **BIS 자기자본비율 8%** 준용, 1 ÷ 0.08 = 12.5). **법정 상한은 20배**(신용보증기금법 제25조: 기본재산+이월이익금 합계의 20배 이내) — 〔2026-06-17 검증 정정: 이전 본문 '법정 15배'는 오기, 15배는 법정수치가 아닌 운영 기준치로 추정〕. 부분보증(보증비율 < 100%)으로 금융기관과 위험을 분담. (출처: namu.wiki 신용보증기금; KODIT 적정 운용배수 추정; 서울경제 운용배수; BOK 신용보증제도 운용현황)

---

### 1-C. 익스포저 (Exposure)

#### EAD (Exposure at Default, 부도시익스포저)
- **정의**: 채무자(obligor) 부도 시점에 그 여신(facility)에서 **노출되어 있는 총 익스포저(gross exposure)**. 즉 차주가 부도나는 그 시점에 은행이 그 거래상대방에게 얼마나 노출되어 있을지의 추정치. (출처: Wikipedia EAD; LegalClarity EAD)
- **역할**: Basel II 하에서 경제적자본·규제자본 계산의 핵심 파라미터. **EL = EAD × PD × LGD**.
- **산정 방식**:
  - **고정 익스포저(예: 만기일시상환 term loan)**: EAD = 현재 잔액.
  - **회전 익스포저(예: 한도대출 line of credit)**: EAD = **인출분(drawn) + 미인출 약정(undrawn commitment)의 추정 사용분**. 미인출분은 부도 시 추가로 끌어 쓸 가능성이 있으므로 **신용환산율(CCF, Credit Conversion Factor)** 로 추정. (출처: Wikipedia EAD; Cambridge EAD/LGD 챕터)
- **거래상대방신용위험(CCR)에서의 EAD**: 파생상품 등은 미래 가치가 변하므로 단순 잔액이 아님. Basel은 **EAD = α × Effective EPE** 로 설정하며 승수 **α의 기본값 = 1.4**. (EPE = Expected Positive Exposure, 기대양의익스포저) (출처: Wikipedia EAD)
- **담보의 EAD 경감**: Basel의 포괄적 접근(comprehensive approach)에서는 은행이 받은 담보의 **변동성조정가치(volatility-adjusted value = 헤어컷 적용 후)** 만큼 익스포저를 차감한다 → 담보가 EAD를 줄임. (출처: Wikipedia EAD; BIS Large exposures)

#### 익스포저 한도 (Exposure Limit) & 거액익스포저 (Large Exposures)
- **개념**: 거래상대방신용한도(CCL, Counterparty Credit Limit)는 한 기관이 다른 기관에 기꺼이 부담할 **최대 거래상대방 신용 익스포저**. 한도는 어떤 단일 상대방으로부터 받을 수 있는 최대 익스포저를 캡(cap)해 **과도한 노출**에 대한 명시적 방어선을 제공한다. (출처: arxiv Counterparty Credit Limits)
- **Basel 거액익스포저 프레임워크(Large Exposures Framework)** — BCBS, 2014년 4월 도입, **2019년 1월 1일 발효**:
  - 강한 자본비율을 가진 은행도 **단일 거래상대방(또는 연결된 상대방 그룹)** 의 급작스런 부도로 큰 손실을 입으면 무너질 수 있다 — 이 리스크는 리스크기반 자본규제로는 포착되지 않음. 그래서 별도 한도 도입.
  - **거액익스포저(large exposure) 정의**: 한 은행의 단일 거래상대방에 대한 모든 익스포저 합이 **Tier 1 자본의 10% 이상**.
  - **한도(limit)**: **Tier 1 자본의 25%**.
  - **G-SIB 간** (글로벌 시스템상 중요 은행끼리)에는 더 엄격한 **15%** 한도.
  - 보고 의무: 모든 거액익스포저 + 신용위험경감/면제 효과를 빼면 거액익스포저가 됐을 익스포저 + **상위 20개 익스포저**(거액 정의 미달이라도) 보고. 한도 위반은 드물고 예외적이어야 하며, 위반 시 즉시 보고·신속 시정. (출처: BIS Large exposures Executive Summary)
  - **연결된 거래상대방 그룹(group of connected counterparties)**: 한 상대방의 부도가 나머지의 연쇄 부도(cascading failure)로 이어질 관계가 있으면 그룹 합산 익스포저에 한도 적용. 연결 기준: ① **지배관계(control)** — 한쪽이 다른 쪽을 직·간접 지배, ② **경제적 상호의존(economic interdependence)** — 한쪽이 재무곤란에 빠지면 다른 쪽도 곤란해지는 관계. (출처: BIS Large exposures)
  - **익스포저 측정**: 은행계정 부내(on-balance)는 회계가치, 부외(off-balance)는 CCF로 신용익스포저로 환산. OTC 파생·증권금융거래(SFT)는 EAD(표준 SACCR) / 포괄적 접근·감독 헤어컷으로 산정. 신용위험경감(보증·신용파생·금융담보·부내 네팅)으로 익스포저 경감 인정. 국가·중앙은행 익스포저는 면제, 일중(intraday) 은행간 익스포저 면제 등. (출처: BIS Large exposures)

#### 집중위험 (Concentration Risk)
- **정의**: 은행 포트폴리오가 **단일 거래상대방·섹터(업종)·국가**에 집중되어 발생하는 리스크 수준. 더 집중된 포트폴리오는 덜 분산되어 있고, 기초자산 수익률 간 **상관(correlation)이 높아** 동반 부실 위험이 크다. (출처: Wikipedia Concentration risk)
- **유형**: ① **단일 이름(name/counterparty) 집중**, ② **섹터(산업) 집중**, ③ **지역(geographic) 집중**. (Basel 거액익스포저 프레임워크는 이 중 *단일 거래상대방 부도*만 다룬다 — 섹터·지역 집중은 별도 감독 영역.) (출처: Wikipedia Concentration risk; BIS Large exposures)
- **관리**: 상업은행 내 리스크 부서·위원회·이사회가 모니터링하고, 통상 정해진 한도 내에서만 허용. 감독당국도 모니터링하며 보통 **더 높은 자본 부과(capital charge)** 가 따른다. (출처: Wikipedia Concentration risk; OCC Concentrations of Credit Handbook)

#### 거래상대방위험 (Counterparty Credit Risk, CCR)
- **정의**: 거래(특히 파생상품) 상대방이 **만기 전 부도**나서, 그 시점에 그 거래가 자기에게 **순현재가치상 이익(in-the-money)** 이었다면 그 가치를 잃는 위험. 양방향성(어느 쪽이 이익일지 시장에 따라 바뀜)·시간에 따른 변동이 특징. (출처: ryanoconnellfinance; Fed Interagency CCR Guidance)
- **핵심 익스포저 지표:**
  - **현재익스포저(Current Exposure) = 대체비용(Replacement Cost)**: max(0, 거래/네팅셋의 시장가치) — 상대방 부도 시 회수 없이 잃게 될 값. (출처: ryanoconnellfinance; arxiv Counterparty Risk FAQ)
  - **잠재미래익스포저(PFE, Potential Future Exposure)**: 미래 특정 시점 익스포저 분포의 **높은 백분위(예: 95%)**. 파생상품은 수명이 길고 익스포저가 빠르고 크게 변하므로, 고정 기간 동안 익스포저가 늘어날 가능성을 추정. Peak Exposure(PE)라고도. (출처: arxiv Counterparty Risk FAQ; FasterCapital PFE)
  - **EE / EPE / ENE**: Expected Exposure(기대익스포저), Expected Positive Exposure(기대양의익스포저), Expected Negative Exposure. EAD = α × Effective EPE에 쓰임. (출처: ryanoconnellfinance; Wikipedia EAD)
  - **CVA (Credit Valuation Adjustment, 신용가치조정)**: 거래상대방신용위험의 **시장가격**. 파생상품의 무위험가치에서 상대방 부도 가능성을 반영해 조정하는 값. (출처: Wikipedia CVA; mathworks CCR/CVA)
- **경감 장치**: **네팅(netting)** — 한 상대방과 여러 거래가 있을 때 상호 채무를 상계해 PFE를 크게 줄임. **담보(collateral/margin)**, **CCP(중앙청산소) 청산** 등. (출처: ryanoconnellfinance; BIS Guidelines for CCR d588)

---

### 1-D. 신용보강 (Credit Enhancement)

#### 정의
신용보강(credit enhancement)은 **구조화 금융거래의 신용 프로파일을 개선**하는 것, 또는 그렇게 개선하는 방법들. 증권화(securitization)의 핵심 요소이며, 신용평가사가 증권화 상품을 평가(rating)할 때 중요. 목표: 더 높은 신용등급 → 더 낮은 조달비용. (출처: Wikipedia Credit enhancement; S&P Basics of Credit Enhancement)

#### 내부(Internal) vs 외부(External) 신용보강
**내부 신용보강 (Internal Credit Enhancement)** — 구조 자체에 내재된 기법:
1. **우선/후순위 구조 (Subordination / Senior-Subordinated)**: 자산이 만드는 현금흐름을 **서로 다른 우선순위의 트랜치(tranche)** 에 배분. **후순위(subordinate) 클래스가 손실을 먼저 흡수**해 선순위(senior) 채권을 보호. 후순위는 낮은 등급, 선순위는 높은 등급. 가장 널리 쓰이는 내부 보강. (출처: Wikipedia Credit enhancement; Penpoin)
2. **과담보 (Overcollateralization, OC)**: 발행한 증권보다 **기초 자산풀의 액면가를 더 크게** 잡는 것. 예: 100을 발행하는데 담보풀은 120 → 20만큼 초과담보. 손실 완충. (출처: Wikipedia Credit enhancement; diversification Initial OC)
3. **초과스프레드 (Excess Spread)**: 기초자산이 버는 이자수익에서 증권 이자·비용을 뺀 **잉여 이자(surplus interest income)** 를 손실 완충에 사용. (출처: Penpoin; Wikipedia Credit enhancement)
4. (관련) **준비금 계정(reserve account / cash collateral account)** 도 내부 보강에 포함되기도.

**외부 신용보강 (External Credit Enhancement)** — 제3자의 보증·보험:
1. **보증보험(Surety Bond)**: ABS의 손실을 보전하는 보험. surety bond를 붙인 ABS는 **그 surety 발행자의 등급과 동일한 등급**을 받음. (출처: onlinewbc External Credit Enhancements; Wikipedia Credit enhancement)
2. **신용장(Letter of Credit, LOC)**: 금융기관(보통 은행)이 수수료를 받고, 담보풀의 현금부족분을 신용보강 한도까지 보전하는 일정 현금을 제공. 단, 1990년대 초 LOC 제공 은행들의 장기채 등급 하락으로 매력이 줄어 **점점 덜 쓰임**. (출처: onlinewbc; Wikipedia Credit enhancement)
3. **모노라인 보증/래핑(Monoline Insurance Wrap)**: AAA 등급 금융보증사(financial guarantor)·**모노라인(monoline)** 보험사가 제공하는 제3자 보증. "wrapper"는 채권 매수자와 보증사 간 양자 계약으로, 부도 시 채권 상환을 보증. 모노라인은 1970년대 지방채(municipal bond) 보증에서 시작 → 2000년대 구조화금융 붐 때 CDO 보증·신용부도스왑(CDS) 참여로 확대(→ 2008 위기 때 큰 타격). (출처: octus Monoline Wraps; Wikipedia Credit enhancement; RBA box-a)
4. **신용부도스왑(CDS)** 등 신용파생도 외부 보강·헤지 수단으로 분류 가능. (출처: Wikipedia Credit enhancement)

#### 신용보강의 4대 도구를 한눈에 (담보·보증·코버넌트·우선순위·과담보)
질문에 명시된 보강 수단들을 정리:
- **담보(collateral)**: §1-A. 자산을 잡아 LGD↓.
- **보증(guarantee)**: §1-B. 제3자(개인·기관·보험)가 상환을 책임 → 외부 보강.
- **코버넌트(covenants)**: 아래 별도 정리. 차주의 행동을 제약해 신용도 유지.
- **우선순위(seniority/subordination)**: §1-D 내부 보강. 후순위가 선순위를 보호.
- **과담보(overcollateralization)**: §1-D 내부 보강. 담보를 채무보다 크게.

#### 코버넌트 (Covenants) — 상세
- **정의**: 대출계약상 모든 관계자가 합의한 법적 구속력 있는 의무. 차주가 특정 규칙을 준수하거나 특정 행동을 할 때 따라야 하는 조건. 보통 선순위 대출자가 더 엄격히 부과. (출처: SEC subordination agreement; wallstreetprep Debt covenants)
- **3대 유형:**
  1. **확약(긍정) 코버넌트 (Affirmative Covenants)**: 차주가 **반드시 해야 할 것**. 예: 정기 재무보고 제출, 감사받은 재무제표 제공, 이자·수수료 적시 납부, 세금 납부, 보험 유지, 법규 준수. (출처: preplounge; wallstreetprep Debt covenants)
  2. **제한(부정) 코버넌트 (Negative Covenants)**: 차주가 **하면 안 되는 것**(대출자 승인 없이). 예: 주요 자산 매각, 추가 부채 발행, 인수합병, 배당 지급 제한. 차주 상황에 맞춰 재단(tailored)됨. (출처: preplounge; KKR Negative Covenants)
  3. **재무 코버넌트 (Financial Covenants)**: 특정 재무지표 충족 요구. 예: 부채비율(debt-to-equity), 이자보상배율(interest coverage), 최소 유동성. (출처: preplounge; dbrownconsulting)
- **유지 vs 발생 코버넌트:**
  - **유지 코버넌트 (Maintenance Covenants)**: **정기적(예: 분기마다)** 재무지표 충족을 요구. 부채비율·이자보상·최소유동성 등 주기적 테스트. (전통적 은행 대출에 흔함.)
  - **발생 코버넌트 (Incurrence Covenants)**: **특정 행동(트리거)이 있을 때만** 테스트. 예: 추가 부채 인수·대규모 투자·배당 지급 시도 시 발동. (하이일드 채권·covenant-lite 대출에 흔함.) (출처: Carta Loan covenants; preplounge; credcore)
- 코버넌트 위반(breach) = 보통 **기술적 부도(technical default)** 사유 → 대출자가 조기상환 요구·재협상·금리 인상 등 가능. (출처: jmco Risk of Violating Debt Covenants; wallstreetprep Senior debt)

#### 우선순위 (Seniority / Subordination) — 상세
- **선순위 채무 (Senior Debt)**: 청산·파산 시 **가장 먼저 상환**. 종종 담보로 보전(secured). 대출자에게 더 안전 → **낮은 금리**. 보통 **더 엄격한 코버넌트**(차주 유연성↓). (출처: ecapital Senior vs Subordinated; wallstreetprep Senior debt; CFI Senior and subordinated)
- **후순위/열후 채무 (Subordinated / Junior Debt)**: 선순위가 모두 변제된 **후에** 상환. 종종 무담보(unsecured). 리스크↑ → **높은 금리**. 코버넌트는 더 느슨(유연). (출처: ecapital; CFI)
- **종속약정 (Subordination Agreement)**: 채권자 간 변제 우선순위를 법적으로 정하는 문서 — 한 채권자의 청구를 다른 채권자보다 후순위로 둠. 부도·파산·청산 시 **선순위 먼저, 후순위 나중** 순서를 명시. 선·후순위가 섞일 때 통상 요구됨. (출처: SEC subordination agreement; ecapital Subordination Agreement)
- **자본구조(capital structure) 워터폴**: 담보부 선순위 → 무담보 선순위 → 후순위 → 메자닌 → 우선주 → 보통주 순으로 변제. 청산 시 **절대우선원칙(Absolute Priority Rule)** 에 따라 상위가 먼저. (출처: wallstreetprep Senior debt; wallstreetprep LGD)

---

### 1-E. 담보·보증 ↔ 손실의 관계 (LGD · 회수율)

#### LGD (Loss Given Default, 부도시손실률)
- **정의**: 차주가 부도났을 때 대출자가 **실제로 잃는** 익스포저의 비율(%). 즉 미상환 대출의 손실을 EAD 대비 백분율로 추정. (출처: Wall Street Prep LGD; LegalClarity LGD; Tata Capital)
- **공식**:
  > **LGD = 1 − 회수율(Recovery Rate)**
  > **손실액(Loss) = EAD × (1 − Recovery Rate)**
- **예시**: 회수율 55% → LGD 45% ("1달러당 55센트 회수"). Wall Street Prep 예: 담보부 선순위로 200만 달러 대출, 회수율 90% 가정 → LGD = 2,000,000 × (1 − 0.90) = **20만 달러**(최대 추정 손실). (출처: Wall Street Prep LGD; frmquizbank)
- **주의**: LGD는 **부도 여부(가능성)는 말해주지 않는다** — 그건 PD의 몫. LGD는 "부도가 *나면* 얼마나 아픈가"만 측정. 따라서 PD·EAD와 함께 봐야 함. 낮은 LGD라도 PD가 높으면 여전히 위험. (출처: Wall Street Prep LGD)

#### 회수율 (Recovery Rate)
- **정의**: 부도 자산에서 **담보 처분·채무 재조정·부실채권 매각** 등을 통해 회수하는 모든 것을, **회수 과정 비용을 뺀(net of costs)** 뒤, 장부가 대비 백분율로 본 것. (출처: Wall Street Prep LGD; LegalClarity LGD)

#### 담보·우선순위가 LGD를 낮추는 메커니즘 (핵심 연결)
- **담보(collateral)**: 담보가 있으면 부도액 상당 부분을 **담보 청산으로 회수** → 회수율↑ → **LGD↓**. "담보로 보전된 대출의 LGD는 보통 더 낮다." (출처: Wall Street Prep LGD; Tata Capital)
- **자본구조상 우선순위(seniority)**: 회수율은 그 채무가 자본구조에서 **어디에 있는가(선순위/후순위)** 에 크게 좌우. 청산 시 상위 채권자가 먼저 변제받으므로 **선순위일수록 완전 회수 가능성↑** → LGD↓. (출처: Wall Street Prep LGD)
- **Wall Street Prep가 정리한 LGD 감소 규칙:**
  - 차주 담보에 대한 Lien(담보권) → 잠재손실 감소
  - 자본구조상 더 높은 우선순위 청구권 → 잠재손실 감소
  - 크고 유동성 높은 자산기반 → 잠재손실 감소
- **기대손실로의 연결**: LGD는 PD·EAD와 함께 **EL = PD × LGD × EAD** 의 입력값으로, 규제자본 계산의 앵커. 담보·보증이 LGD를 낮추면 → EL↓ → 필요자본↓ → 차주는 더 좋은 금리. 이것이 "담보·보증을 잡으면 금리가 싸지는" 정량적 이유다. (출처: Wall Street Prep LGD; Wikipedia EAD; LegalClarity)
- **Basel IRB 맥락**: 내부등급법(IRB)은 PD, EAD, LGD, 만기(M) 4개 입력으로 신용위험 자본을 산출. 보증·신용파생·금융담보·부내네팅 같은 **신용위험경감(CRM)** 기법으로 익스포저/손실을 줄임 — 담보는 헤어컷 조정 후 가치만큼 인정. (출처: Wikipedia Advanced IRB; BIS Large exposures; Wikipedia EAD)

---

### 출처
**담보·LTV·헤어컷**
- Wikipedia — Loan-to-value ratio: https://en.wikipedia.org/wiki/Loan-to-value_ratio
- Wikipedia — Haircut (finance): https://en.wikipedia.org/wiki/Haircut_(finance)
- Discover — Secured vs Unsecured Loans: https://www.discover.com/personal-loans/resources/learn-about-personal-loans/secured-and-unsecured-loans/
- OneMain Financial — Secured vs. Unsecured Loan: https://www.onemainfinancial.com/personal-loans/resources/whats-the-difference-between-a-secured-and-unsecured-loan
- Truist — Secured vs. Unsecured Loans: https://www.truist.com/money-mindset/principles/outsmarting-debt/secured-vs-unsecured-loans
- U.S. Bank — Secured vs unsecured debt: https://www.usbank.com/financialiq/manage-your-household/manage-debt/secured-vs-unsecured-debt.html
- CheckCity — Loan to Value Ratio (LTV) Explained: https://www.checkcity.com/loans-101/loan-to-value-ratio
- Qollateral — Understanding LTV / LTV examples: https://qollateral.com/collateral-resources/loan-to-value-ratio/
- Chase — Combined Loan to Value: https://www.chase.com/personal/mortgage/education/financing-a-home/what-is-combined-loan-to-value
- Chase — What is PMI: https://www.chase.com/personal/mortgage/education/financing-a-home/what-is-pmi-calculated
- gustancho — PMI on Conventional Loans >80% LTV: https://gustancho.com/pmi-on-conventional-loans/
- The Mortgage Reports — How to Avoid PMI: https://themortgagereports.com/17861/private-mortgage-insurance-avoid-pmi-mortgage-rates
- Navy Federal — PMI: https://www.navyfederal.org/makingcents/home-ownership/private-mortgage-insurance.html
- FE Training — Haircut in Finance: https://www.fe.training/free-resources/project-finance/haircut-in-finance-definition-and-example/
- FasterCapital — Collateral Haircut & Implied Repo Rate: https://fastercapital.com/content/Collateral-Haircut--Understanding-its-Impact-on-Implied-Repo-Rate.html
- eCapital — Collateral / Collateralized Loan: https://ecapital.com/financial-term/collateral-or-collateralized-loan/
- UpCounsel — Collateral Transactions Explained: https://www.upcounsel.com/collateral-transaction
- Corporate Finance Institute — Collateral: https://corporatefinanceinstitute.com/resources/commercial-lending/collateral/
- ClearlyAcquired — 5 Common Collateral Types: https://www.clearlyacquired.com/blog/5-common-collateral-types-for-business-loans

**담보 실행 / Foreclosure**
- Wikipedia — Secured creditor: https://en.wikipedia.org/wiki/Secured_creditor
- ABA Business Law Today — Remedies & Enforcement upon Default under UCC Article 9: https://businesslawtoday.org/2023/03/remedies-enforcement-upon-default-under-ucc-article-9/
- ABA — Remedies Outside the Box (UCC Article 9): https://www.americanbar.org/groups/business_law/resources/business-law-today/2012-august/remedies-outside-the-box/
- Proskauer — Private Credit Restructuring: Strict Foreclosure: https://www.proskauer.com/alert/private-credit-restructuring-strict-foreclosure-spotlight
- Boise State Pressbooks — Secured Transactions and Bankruptcy: https://boisestate.pressbooks.pub/buslaw/chapter/secured-transactions-and-bankruptcy/
- Venable — Foreclosure Remedies: https://www.venable.com/insights/publications/2009/07/foreclosure-remedies-knowing-them-is-the-first-ste

**보증 / 연대보증 / 보증·신용보험**
- National Law Review — Personal Guaranties & Joint and Several Liability: https://natlawreview.com/article/look-you-sign-pitfalls-personal-guaranties
- lawinsider — Joint and several liability definition: https://lawinsider.com/dictionary/joint-and-several-liability
- Crestmont Capital — Personal Guarantee on a Business Loan: https://www.crestmontcapital.com/blog/personal-guarantee-business-loan
- clarifycapital — Personal Guarantee: https://clarifycapital.com/blog/personal-guarantee
- OnDeck — Understanding Personal Guarantees: https://www.ondeck.com/resources/understanding-personal-guarantees
- Brex — What is a personal guarantee: https://www.brex.com/spend-trends/corporate-credit-cards/personal-guarantee
- Niche Trade Credit — Trade Credit Insurance vs Surety: https://nichetc.com.au/trade-credit-insurance-vs-surety/
- Credit Guarantee (ZA) — Surety Bonds and Insurance: https://www.creditguarantee.co.za/surety-bonds-and-insurance/
- KASE Insurance — Surety Bond vs Insurance / LOC vs Surety: https://kaseinsurance.com/news/surety-bond-vs-insurance/
- LinkedIn — Export Credit Insurance v. Surety Bonds: https://www.linkedin.com/pulse/export-credit-insurance-v-surety-bonds-musiwedzingo-acii

**한국 공적 신용보증 (신보·기보·지신보) / 연대보증 폐지**
- ko.wikipedia — 신용보증기금: https://ko.wikipedia.org/wiki/신용보증기금
- namu.wiki — 신용보증기금: https://namu.wiki/w/신용보증기금
- namu.wiki — 연대보증: https://namu.wiki/w/연대보증
- 금융위원회(FSC) — 대부업자 연대보증 관행 폐지: https://www.fsc.go.kr/no010101/73344
- easylaw.go.kr — 신용보증 및 지급보증: https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=632&ccfNo=4&cciNo=2&cnpClsNo=2
- see-real — 신용보증재단/신용보증기금/기술보증기금 차이: https://see-real.kr/신용보증재단-신용보증기금-기술보증기금-차이-2/
- jasoseol — 기술보증기금(KIBO) 기업분석: https://jasoseol.com/companies/2212/insights
- KODIT — 보증료 안내: https://www.kodit.co.kr/kodit/cm/cntnts/cntntsView.do?mi=2806&cntntsId=11382
- KODIT — 적정 운용배수 추정(연구자료): https://www.kodit.co.kr/common/nttFileDownload.do?fileKey=abf7016c6297c437413590091df0c7a6
- 한국은행(BOK) — 신용보증제도의 운용현황과 과제: https://www.bok.or.kr/portal/cmmn/file/fileDown.do?menuNo=200634&atchFileId=KO_00000000000023063&fileSn=1
- 한국조세재정연구원(KIPF) — 신용보증기금의 재정위험: https://www.kipf.re.kr/cmm/fms/FileDown.do?atchFileId=FILE_000000000006120&fileSn=0
- 서울경제 — 운용배수 협의 쟁점: https://www.sedaily.com/NewsView/29VZEMEREN
- 공공데이터포털 — 신용보증기금 보증취급 사고 및 구상권 현황: https://www.data.go.kr/data/15084344/fileData.do

**익스포저 (EAD·집중·거래상대방·거액익스포저)**
- Wikipedia — Exposure at default: https://en.wikipedia.org/wiki/Exposure_at_default
- Wikipedia — Advanced IRB: https://en.wikipedia.org/wiki/Advanced_IRB
- Wikipedia — Concentration risk: https://en.wikipedia.org/wiki/Concentration_risk
- Wikipedia — Credit valuation adjustment: https://en.wikipedia.org/wiki/Credit_valuation_adjustment
- LegalClarity — Exposure at Default (EAD): https://legalclarity.org/what-is-exposure-at-default-in-credit-risk/
- Cambridge — EAD and LGD (Managing Portfolio Credit Risk in Banks, ch.4): https://resolve.cambridge.org/core/services/aop-cambridge-core/content/view/16CF4DBFCB8940BA893E08CDD2156424/9781316550915c4_p137-185_CBO.pdf/exposure-at-default-ead-and-loss-given-default-lgd.pdf
- BIS FSI — The treatment of large exposures in the Basel capital standards (Executive Summary): https://www.bis.org/fsi/fsisummaries/largeexpos.htm
- BIS BCBS — Guidelines for counterparty credit risk (d588): https://www.bis.org/bcbs/publ/d588.pdf
- OCC — Concentrations of Credit (Comptroller's Handbook): https://www.occ.gov/publications-and-resources/publications/comptrollers-handbook/files/concentrations-of-credit/pub-ch-concentrations.pdf
- Federal Reserve — Interagency Supervisory Guidance on Counterparty Credit Risk Management: https://www.federalreserve.gov/frrs/guidance/interagency-supervisory-guidance-on-counterparty-credit-risk-management.htm
- Ryan O'Connell, CFA — Counterparty Credit Risk (EPE, ENE, PFE, EE): https://ryanoconnellfinance.com/counterparty-credit-risk/
- arxiv — Counterparty Risk FAQ (Brigo et al.): https://arxiv.org/pdf/1111.1331
- arxiv — Counterparty Credit Limits: https://arxiv.org/pdf/1709.08238
- FasterCapital — Potential Future Exposure in CVA: https://fastercapital.com/content/Potential-Future-Exposure--Projecting-Potential-Future-Exposure-in-CVA-Calculations.html

**신용보강 (내부·외부) / 코버넌트 / 우선순위**
- Wikipedia — Credit enhancement: https://en.wikipedia.org/wiki/Credit_enhancement
- Penpoin — Internal Credit Enhancement: https://penpoin.com/internal-credit-enhancement/
- diversification.com — Initial overcollateralization: https://diversification.com/term/initial-overcollateralization
- S&P (FCIC archive) — The Basics of Credit Enhancement in Securitizations: https://fcic-static.law.stanford.edu/cdn_media/fcic-docs/2008-06-24%20S&P%20Basics%20of%20Credit%20Enhancement%20in%20Securitizations.pdf
- onlinewbc — External Credit Enhancements (MBS): https://www.onlinewbc.org/securities-2/external-credit-enhancements.html
- octus — Monoline Wraps Influencing CLO Spreads: https://octus.com/resources/articles/monoline-wraps-influencing-clo-double-b-spread-movements-sources-say/
- RBA — Financial Stability Review (monoline box-a): https://www.rba.gov.au/publications/fsr/2008/mar/pdf/box-a.pdf
- preplounge — Financial Covenants (types): https://www.preplounge.com/en/finance-interview-basics/financial-covenants
- Carta — Loan Covenants in Private Credit: https://carta.com/learn/private-funds/private-equity/strategies/private-credit-investing/loan-covenants/
- KKR — Negative Covenants: https://www.kkr.com/insights/negative-covenants-guard-rails-credit
- Wall Street Prep — Debt Covenants: https://www.wallstreetprep.com/knowledge/debt-covenants/
- James Moore & Co. — Risk of Violating Debt Covenants: https://www.jmco.com/articles/healthcare/risk-violating-debt-covenants/
- eCapital — Senior vs Subordinated Debt: https://ecapital.com/blog/the-difference-between-senior-debt-and-subordinated-debt-a-guide-to-understanding-capital-structure/
- Wall Street Prep — Senior Debt: https://www.wallstreetprep.com/knowledge/senior-debt/
- Corporate Finance Institute — Senior and Subordinated Debt: https://corporatefinanceinstitute.com/resources/commercial-lending/senior-and-subordinated-debt/
- SEC EDGAR — Subordination Agreement (example): https://www.sec.gov/Archives/edgar/data/810509/000114420415031595/v410727_ex10-3.htm

**LGD · 회수율**
- Wall Street Prep — Loss Given Default (LGD): https://www.wallstreetprep.com/knowledge/loss-given-default-lgd/
- LegalClarity — Loss Given Default (LGD): https://legalclarity.org/what-is-loss-given-default-lgd-and-how-is-it-calculated/
- Tata Capital — Loss Given Default: https://www.tatacapital.com/blog/loan-for-business/what-is-loss-given-default-how-does-it-work/
- FRM Quiz Bank — LGD and Recovery Rates: https://frmquizbank.com/blog/loss-given-default-recovery-rates

## 2. 매핑 (기존 개념 → 우리 4층)

| 기존 개념 | 한 줄 정의 | 우리 4층 대응 위치 | 정합 | 비고 |
|---|---|---|---|---|
| 담보(collateral) | 자산 잡아 LGD↓ | 4층 금융(미구축) — 우리는 무담보 지향 | ✗/△ | 우리는 물적담보 없음; 신뢰가 담보 |
| 보증·연대보증(guarantee, J&S) | 제3자가 상환 책임 | **2층 EM 노출 엣지 + 3층 리스크 전파(PHI-1③)** | ○○ | "보증=평판 빌려줌"=우리 EM 노출 엣지. 단 연대보증 폐지 교훈 |
| 신보·기보·지신보 | 담보부족 기업 공적보증·대위변제·구상권 | 4층 금융 기관모델 후보 | ○ | 우리는 관계망 신용으로 보증심사 보완 |
| 익스포저 EAD·거액익스포저·연결상대방 | 단일/그룹 노출 한도·연쇄부도 | **PHI-1③ 리스크 전파·EM 노출 그래프** | ○ | exposure=EM 노출 엣지. 거액익스포저=네트워크 집중 |
| netting(상계) | 양방향 채무 상계 | **2층 EM net(반대칭 상쇄)** | ○ | 반대칭 상계라는 구조적 직관 공유(완전 '동형'은 과장 — 다자·통화·파산집행가능성은 별개) |
| CCR·CVA·PFE | 시변 양방향 거래상대방위험 | 4층 동적 노출(미구축) | △ | 우리는 정적 잔액만; 시변·미래노출 없음 |
| 집중위험(concentration) | 단일·섹터·지역 쏠림 | 3층 그래프 구조(중심성·집중) | △ | 우리 그래프가 집중을 구조적으로 표현 |
| 신용보강(subordination·OC·seniority) | 트랜치·우선순위 손실완충 | 없음 | ✗ | 4층 상품설계 시 도입 가능 |
| covenants(코버넌트) | 행동제약으로 신용유지 | 없음(행동조건) | ✗ | 4층 대출조건에 도입 가능 |
| LGD=1−회수율 | 부도시 손실률(담보가 낮춤) | 없음 | ✗ | 4층 필요 — 우리 미보유 |

## 3. 검토 (정합 · 엇나감 · 메울 갭 · 배울 것)

**정합 총평.** 이 영역은 "신용을 *보강*(담보·보증)하고 *한정*(익스포저)하는 장치"다. 우리 모델은 담보·트랜치 쪽은 거의 비어 있지만(무담보 지향), **보증과 익스포저는 우리와 강하게 정합**한다 — 특히 *보증=평판을 빌려줌*은 우리 EM 노출 엣지 그 자체이고, *netting(상계)*은 우리 EM 반대칭 net과 같은 구조적 직관을 공유하며(완전 '동형'은 아님 — §2 주), *거액익스포저·연쇄부도(연결 상대방)*는 우리 리스크 전파(PHI-1③)의 제도화된 버전이다.

**논리적으로 엇나가는·주의할 지점.**
1. **무담보 지향의 위험.** 전통은 "무담보는 위험 → LGD를 낮추는 담보·보강이 필수"라고 말한다. 우리가 담보·LGD를 완전히 무시하면 4층 상품에서 손실관리가 빈다. 신뢰신용 + 부분담보 하이브리드가 현실적.
2. **연대보증 폐지의 경고.** 한국은 연대보증을 *폐지*해왔다 — 보증인 연쇄 파산·과중부담 때문. 우리가 "관계 기반 연대책임"을 만들면 같은 폐해(연쇄 파산·인간관계 파탄)를 재현할 수 있다(03 안드라프라데시와 동일 경고). 연대를 *법적 공동채무*로 만들지 말 것.

**우리가 메울 수 있는 갭(차별화).**
1. **보증을 네트워크 엣지로 전파** — 연대보증의 그래프 버전(누가 누구를 사회적으로 보증하나 = 이음·역할). 단 폐해 회피 설계.
2. **익스포저·연쇄부도를 그래프로 자연 표현** — 거액익스포저 프레임워크가 "연결된 상대방 그룹"을 수기로 정의하는 것을, 우리는 그래프 구조로 자동 포착.

**우리가 배워야 할 것.**
1. **LGD·담보·회수율** — 4층 금융의 손실관리 골격(현재 우리 공백).
2. **netting = 우리 net과 구조 공유**(완전 동형은 과장). 단 복식부기↔아벨군/Grothendieck 군(05 H3)은 *회계 항등식*에 대한 별도 주장이며 netting과 혼동하지 말 것.
3. **seniority·covenant** — 4층 상품 구조·조건 설계.
4. **운용배수(12.5배)·부분보증** — 4층 시스템 레버리지·위험분담 설계 참고.
