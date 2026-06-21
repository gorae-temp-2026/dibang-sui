# 01. 전통 신용평가·여신 — 리서치

> 범위: 실제 세계의 전통 신용평가(credit scoring)·여신(lending) 시스템 — 개인 신용점수(FICO/VantageScore/한국 NICE·KCB), 신용평가사(credit bureau), 스코어카드 방법론, 은행 신용리스크 모수(PD·LGD·EAD·Basel), 기업 신용등급, 핵심 정의·메커니즘. 순수 외부 리서치(내부/독자 모델 미참조). · 2026-06-17

## 1. 리서치 (수집)

### 1.0 전체 그림: 세 개의 층(layer)

전통 신용 시스템은 개념적으로 세 층으로 나뉜다. 이 층 구분을 먼저 잡아두면 이하 내용이 정리된다.

1. **데이터 층 — 신용평가사/신용국(credit bureau)**: 금융사·공공기관으로부터 개인·기업의 신용거래 정보를 모아 **신용보고서(credit report)**를 만든다. 미국은 Experian·Equifax·TransUnion 3대 사, 한국은 NICE평가정보·KCB(코리아크레딧뷰로)가 대표적이며 그 위에 정보 집중기관(한국신용정보원)이 있다. 신용국은 원칙적으로 **대출 결정도, 점수 산정의 최종 권한도 갖지 않는다**(데이터를 모아 제공할 뿐). (https://www.experian.com/blogs/ask-experian/what-is-a-credit-bureau/)
2. **점수 층 — 신용점수 모델(credit score)**: 신용보고서의 데이터를 통계 모델로 요약해 한 개의 숫자로 만든다. 미국은 FICO(Fair Isaac Corporation)와 VantageScore가 양대 산맥, 한국은 NICE/KCB의 **개인신용평점(1~1000점)**. 점수가 높을수록 향후 일정 기간 내 부도(연체) 확률이 낮음을 의미한다.
3. **여신 층 — 대출기관(lender)의 의사결정 + 은행 자본/리스크 규제**: 은행·카드사가 점수·소득·담보 등을 종합해 승인/한도/금리를 결정하고, 포트폴리오 차원에서 **PD·LGD·EAD**로 기대손실을 계산하며, 이를 **Basel 프레임워크**가 자기자본 규제로 묶는다. 기업 여신·채권 영역에서는 Moody's·S&P·Fitch의 **기업 신용등급(AAA~D)**이 핵심 신호다.

> 중요한 구분: **신용점수(score)는 신용보고서(report)의 정보만으로 산출된다.** 소득·직장·재직기간·대출 신청 종류 같은 정보는 신용보고서에 들어가지 않으므로 FICO 점수 계산에 직접 들어가지 않는다 — 그러나 대출기관은 점수와 별개로 이 정보들을 본다. (https://www.myfico.com/credit-education/whats-in-your-credit-score)

---

### 1.1 개인 신용점수 (1): 미국 FICO 점수

**FICO 점수란.** FICO(파이코)는 Fair Isaac Corporation이 만든 신용점수로, 미국에서 사실상 표준이다. myFICO에 따르면 "상위 대출기관의 90%가 FICO 점수를 사용한다". 기본(base) FICO 점수의 범위는 **300~850점**이며, 산업별(industry-specific, 예: 자동차·카드 전용) 점수는 250~900 범위를 쓴다. (https://www.myfico.com/legal/fico-score-versions)

**FICO 점수의 5개 구성요소와 가중치 (myFICO 공식, 일반 인구 기준).** myFICO 공식 페이지 원문: "FICO Scores are calculated using many different pieces of credit data in your credit report. This data is grouped into five categories: payment history (35%), amounts owed (30%), length of credit history (15%), new credit (10%) and credit mix (10%)." (https://www.myfico.com/credit-education/whats-in-your-credit-score)

| 구성요소 (영문) | 가중치 | 무엇을 보는가 |
|---|---|---|
| **상환이력 Payment history** | **35%** | 과거 신용계좌를 제때 갚았는가. 연체(지연), 부도, 추심, 파산 등 부정적 기록. FICO에서 **가장 중요한 단일 요소**. |
| **부채 수준 Amounts owed** | **30%** | 보유 중인 빚의 규모, 특히 **신용한도 대비 사용 비율(credit utilization)**. 가용 신용을 많이 끌어 쓰면 "과다 차입(overextended)"으로 보아 부도 위험이 높다고 해석. |
| **신용이력 길이 Length of credit history** | **15%** | 계좌가 개설된 기간 — 가장 오래된 계좌 나이, 가장 최근 계좌 나이, 전 계좌 평균 나이, 특정 계좌를 마지막으로 사용한 시점 등. |
| **신용 조합 Credit mix** | **10%** | 신용카드·소매계좌·할부대출(installment)·소비자금융·모기지 등 **계좌 종류의 다양성**. 한 종류씩 다 가질 필요는 없다. |
| **새 신용 New credit** | **10%** | 짧은 기간에 여러 계좌를 새로 여는 것 — 특히 신용이력이 짧은 사람에게 더 큰 위험 신호. 신규 조회(hard inquiry) 포함. |

(출처 5개 모두 동일 수치 확인: myFICO, Equifax, NerdWallet, Nav, MyCreditUnion.gov — https://www.myfico.com/credit-education/whats-in-your-credit-score , https://www.equifax.com/personal/education/credit/score/articles/-/learn/what-is-a-fico-score/ )

- 상환이력 + 부채수준만으로 **약 65%**를 차지 — 즉 "연체 안 하고, 한도 대비 적게 쓰는 것"이 점수의 핵심.
- myFICO는 이 가중치가 **일반 인구(general population) 기준 평균**이며 개인별로 달라질 수 있다고 명시한다. 예컨대 신용이력이 짧은 사람은 가중치 구조가 다르게 적용된다. (https://www.myfico.com/credit-education/whats-in-your-credit-score)
- **FICO가 보지 않는 것**: 점수는 신용보고서 정보만 사용 → 소득, 현 직장 재직기간, 신청한 신용의 종류는 점수에 안 들어간다(대출기관이 별도로 봄). 인종·성별·종교·결혼여부·나이 등은 미국 공정대출법(ECOA)상 금지. (https://www.myfico.com/credit-education/whats-in-your-credit-score)

**FICO 점수 구간(밴드).** 일반적으로 통용되는 구분: Exceptional(매우 우수) 800–850, Very Good 740–799, Good 670–739, Fair 580–669, Poor 300–579. (https://www.experian.com/blogs/ask-experian/infographic-what-are-the-different-scoring-ranges/ , https://www.myfico.com/credit-education/credit-scores/fico-score-versions)

**FICO 버전.** FICO는 현재 약 **16개의 서로 다른 버전**이 사용 중이라고 밝힌다. 주요 버전:
- **FICO Score 8** — 가장 널리 쓰이는 base 버전(은행·주요 카드사·대부분 자동차 대출 등 약 70%).
- **FICO Score 9** — 2014년 출시. 의료 부채(medical debt)와 이미 상환한 추심(paid collection)의 영향을 낮춤.
- **FICO Score 10 / 10 T** — 최신 버전. **10 T는 trended data(추세 데이터, 과거 잔액 변화 추이)**를 반영. 핀테크·일부 신협 등에서 채택.
- 모기지 업계는 관성으로 여전히 구버전(FICO 2/4/5)을 많이 쓴다. (https://www.myfico.com/legal/fico-score-versions , https://www.experian.com/blogs/ask-experian/fico-score-versions/)

---

### 1.2 개인 신용점수 (2): VantageScore와 FICO의 차이

**VantageScore란.** 3대 신용국(Experian·Equifax·TransUnion)이 2006년 **공동으로** 만든 경쟁 신용점수 모델. 현재 주력은 **VantageScore 4.0**(2017 출시)이며, 범위는 FICO와 동일하게 **300~850**. (https://www.experian.com/blogs/ask-experian/what-is-a-vantagescore-credit-score/ , https://www.creditkarma.com/credit/i/vantagescore-vs-fico)

**VantageScore 4.0의 요인(영향도 표현).** FICO와 달리 VantageScore는 **정확한 % 가중치를 공개하지 않고** 영향도를 "extremely / highly / moderately / less influential" 같은 정성적 등급으로 표현한다. 공식 영향도 순위: (https://www.vantagescore.com/resources/knowledge-center/credit-scoring-101-factors-that-affect-your-vantagescore-credit-score , https://www.chase.com/personal/credit-cards/education/credit-score/vantagescore-ranges-explained)

1. **Payment history — extremely influential** (가장 중요)
2. **Depth of credit(신용의 깊이: 계좌 나이·종류) — highly influential**
3. **Credit utilization(사용률) — highly influential** (사용률의 **추세**에 가중)
4. **Balances(총 잔액) — moderately influential**
5. **Recent credit(신규 계좌·조회) — less influential**
6. **Available credit(총 가용 한도) — less influential**

> 주의: 일부 매체(예: Self.inc, 일부 모기지 블로그)는 VantageScore 4.0 가중치를 "payment history 41%, depth of credit 20%, utilization 20%, recent credit 11%, balances 6%, available credit 2%" 식의 수치로 인용한다. 이는 과거 VantageScore 3.0 시절의 추정/매체 환산치이며, **VantageScore사 공식은 이런 %를 공개하지 않는다**. 따라서 정성 등급(위 목록)을 1차 사실로 보고, %는 "일부 출처의 환산치"로만 취급. (https://www.self.inc/blog/fico-vs-vantagescore)

**FICO vs VantageScore 핵심 차이.** (https://www.experian.com/blogs/ask-experian/the-difference-between-vantage-scores-and-fico-scores/ , https://www.equifax.com/newsroom/all-news/-/story/what-is-the-difference-between-vantagescore-4-0-and-classic-fico-scores-/)

| 항목 | FICO 8 (classic) | VantageScore 4.0 |
|---|---|---|
| 점수 산출 최소 조건 | **6개월 이상** 신용이력 + 최근 6개월 내 보고된 계좌 | **단 1개월** 이력으로도 산출 가능 |
| 요인 가중치 공개 | 5개 요인 **% 공개** | 정성 등급만, % 비공개 |
| trended data(추세) | base 버전은 미사용(10 T부터 사용) | **사용** — 24개월 잔액 변화 추이 반영 |
| 추심(collection) 취급 | 버전별로 다름 | **상환한 추심·미상환 의료추심 무시** |
| 동종 조회 묶기(rate shopping) | 자동차/학자금/모기지: **45일** 윈도우 | **14일** 윈도우, 적용 대상 더 넓음(카드 포함) |

- 두 모델 모두 "thin file(이력 빈약)" 소비자를 점수화하려는 방향으로 진화 중이며, VantageScore가 그 점에서 더 포용적(1개월 이력으로 산출).
- 실무에서 대출기관이 **어느 점수를 보느냐는 제품·기관마다 다르다**. 모기지는 FICO 구버전, 카드/핀테크/무료 점수앱(Credit Karma 등)은 VantageScore를 흔히 쓴다. (https://www.nerdwallet.com/article/finance/vantagescore-fico-score-the-difference)

---

### 1.3 개인 신용점수 (3): 한국 — NICE평가정보 / KCB(올크레딧)

**한국 개인신용평점 체계 개요.** 한국은 2020년까지 쓰던 **신용등급(1~10등급)**을 폐지하고 **신용점수제(1~1000점)**로 전환했다. 대표 평가사는 **NICE평가정보(나이스, NICE Information Service)**와 **KCB(코리아크레딧뷰로, Korea Credit Bureau / 브랜드: 올크레딧 allcredit)** 둘이며, 둘 다 금융위원회 인가 신용조회회사(CB)다. 거의 모든 은행·카드사가 여신 심사 시 이 둘의 점수를 활용한다. 점수가 높을수록 향후 1년 내 부실(장기연체) 가능성이 낮음을 뜻한다. (https://www.bank-mall.co.kr/plus/blog/11993)

- NICE: 1986년 설립, 국내 1위 금융인프라/신용정보 DB 기업.
- KCB: 2005년 금융사들이 공동 출자해 설립. 연체 등 불량정보뿐 아니라 금융거래실적 등 우량정보까지 수집하는 국내 최초의 **Positive(우량정보 기반) 개인신용평가** 전문회사로 출발. (https://www.bank-mall.co.kr/plus/blog/11993 , https://www.koreacb.com/)

**NICE 개인신용평점 평가요소 및 활용비중 (공식, RK0600 스코어 기준).** NICE평가정보 공식 공시 페이지의 표를 그대로 옮기면: (https://www.niceinfo.co.kr/creditrating/cb_score_1_4_1.nice)

| 평가요소 | 상세내용 | 활용비중 |
|---|---|---|
| **상환이력** | 현재 연체 및 과거 채무 상환 이력 | **28.4%** |
| **부채수준** | 채무 부담 정보(대출 및 보증채무 등) | **24.5%** |
| **신용거래기간** | 최초/최근 개설로부터의 기간 | **12.3%** |
| **신용형태** | 신용 거래 패턴(체크/신용카드 이용 정보) | **27.5%** |
| **비금융/마이데이터** | 성실납부실적 등 비금융·마이데이터 정보 | **7.3%** |
| 계 | | **100.0%** |

- NICE는 **조회정보(신용조회 이력)를 평가에 활용하지 않는다.** 학력 등 민감정보, 현금서비스 소진율도 미반영.
- 신용평가에 활용할 정보가 없거나, 만 18세 미만/만 100세 이상은 점수를 산출하지 않는다.
- NICE는 고객군별로 가중치가 달라진다. 위 표는 일반 기준이고, **장기연체 경험군**에서는 상환이력 비중이 47.8%까지 치솟는 등 부정적 요소 중심으로 재가중된다(NICE 공식 변동요인 표). (https://www.niceinfo.co.kr/creditrating/cb_score_1_4_1.nice)
- 단기연체 기준: **5영업일·10만원 이상**, 장기연체: **90일 이상** 연체 등재 기준. 일시적 소액연체는 미활용. (https://www.niceinfo.co.kr/creditrating/cb_score_1_4_1.nice)

**KCB 개인신용평점 평가요소 및 활용비중 (공식 공시 PDF, 2024.04.01, 일반대상 기준).** KCB 「개인신용평가체계 공시」 원문의 비중을 정리: (https://www.allcredit.co.kr/down/KCB_Credit_Evaluation_System.pdf)

| 평가영역 | KCB 비중(일반) | KCB 비중(장기연체경험) | 참고: 미국 FICO |
|---|---|---|---|
| **신용행동 합계** | **92%** | 89% | — |
| ─ 상환이력 | 21% | 32% | (FICO payment history 35%) |
| ─ 부채수준 | 24% | 25% | (FICO amounts owed 30%) |
| ─ 신용거래기간 | 9% | 5% | (FICO length 15%) |
| ─ 신용거래형태 | **38%** | 27% | — |
| **비금융/마이데이터** | **8%** | 11% | — |

- KCB 개인신용평점의 정의(공식): "개인에 대한 다양한 신용정보를 종합하여 통계적 방법으로 1~1000점으로 점수화한 것으로, 점수가 높을수록 **향후 1년 내 90일 이상 연체 등 불량사유 없이 신용생활을 지속할 가능성**이 높음을 의미." (https://www.allcredit.co.kr/down/KCB_Credit_Evaluation_System.pdf)
- KCB 상환이력 기준: **5영업일·10만원 이상** 연체부터 평가 활용(8영업일 이전 상환 시 미활용). 90일 이상은 장기연체로 분류, 더 큰 영향. 연체경험정보는 90일 이상은 최장 5년, 90일 미만은 최장 3년 활용. (2018년 말부터: 연체 1건·30일 미만·30만원 미만은 미활용.)
- KCB도 **신용조회기록을 평가에 활용하지 않는다**(합리적 금융상품 탐색에 불이익 주지 않기 위해).

**NICE vs KCB 차이 — 같은 사람이 점수가 다른 이유.** (https://www.bank-mall.co.kr/plus/blog/11993)
- **NICE = 상환이력 중심**: 연체 없이 꾸준히 갚았는가가 핵심. 대출이 많아도 연체 없이 잘 갚으면 높은 점수 가능.
- **KCB = 위험도(부채의 질) 중심**: 신용거래형태 비중이 38%로 가장 높음 → 카드론·현금서비스·고금리 대출 사용을 부정적으로 강하게 반영.
- 두 기관은 점수→등급 매핑 기준도 달라 같은 점수라도 분포상 위치가 다르다(NICE는 상위 점수에서, KCB는 하위 점수에서 더 깐깐). 실무 금융사는 **두 점수 중 더 낮은 쪽**을 기준으로 대출조건을 잡는 경우가 많다. (https://www.bank-mall.co.kr/plus/blog/11993)
- 비금융정보(국민연금·건강보험·통신요금·공공요금 등 성실납부)와 마이데이터(금융자산)를 제출하면 두 기관 모두 가점 → 한국식 "대안데이터"의 제도화된 형태.

**KCB 공시의 실측 통계(매우 유용한 캘리브레이션 근거).** KCB 공시 PDF는 점수대별 실제 불량률(향후 1년 내 90일 이상 장기연체 발생 가능성, 실측치)을 공개한다(2022년말 대상자 기준): (https://www.allcredit.co.kr/down/KCB_Credit_Evaluation_System.pdf)

| 신용점수 | 실측 불량률(1년) |
|---|---|
| 950 이상 | 0.05% |
| 900 이상 | 0.14% |
| 850 이상 | 0.30% |
| 800 이상 | 0.53% |
| 750 이상 | 1.03% |
| 700 이상 | 2.68% |
| 600 이상 | 5.98% |
| 300 이상 | 22.22% |
| 300 미만 | 94.64% |
| 전체 평균 | 1.50% |

→ 점수와 부도확률(PD)의 단조 관계가 실증적으로 드러난다. 점수 100점 차이가 부도확률 수 배 차이로 이어진다.

**한국신용정보원(KCIS) — 정보 집중기관.** 위 CB사들 위에, 「신용정보법」에 따라 2016년 1월 설립된 **종합신용정보집중기관**이 있다. 종전 은행연합회 등 5개 금융협회·보험개발원이 분산 관리하던 신용정보를 한곳에 집중관리하고, 전 금융기관·공공기관의 신용정보를 모아 금융기관·**민간 CB사(NICE·KCB)**·금융당국에 제공한다. 즉 한국 구조는 "집중기관(KCIS) → 민간 CB(NICE/KCB) → 금융사" 흐름이다. KCB·NICE도 한국신용정보원과 금융회사로부터 정보를 수집한다고 공시(예: 연체정보는 한국신용정보원·KCB 회원사에서 수집). (https://ko.wikipedia.org/wiki/한국신용정보원 , https://www.kcredit.or.kr/ , https://www.allcredit.co.kr/down/KCB_Credit_Evaluation_System.pdf)

---

### 1.4 신용평가사 / 신용국 (credit bureau)

**정의·역할.** 신용국(credit bureau, 또는 consumer reporting agency / credit reporting agency)은 소비자의 신용활동 데이터를 **수집·정리해 신용보고서(credit report)로 만들어 판매**하는 기관. 보고서는 신용점수 산정사, 대출기관, 고용주, 보험사 등이 활용한다. **핵심: 신용국은 대출 결정을 하지 않고, 점수를 직접 정하지도 않는다(데이터 제공자).** (https://www.experian.com/blogs/ask-experian/what-is-a-credit-bureau/ , https://www.capitalone.com/learn-grow/money-management/three-credit-bureaus/)

**미국 3대 신용국: Experian · Equifax · TransUnion.** (https://www.capitalone.com/learn-grow/money-management/three-credit-bureaus/ , https://www.transunion.com/credit-reporting-agencies)
- 셋은 각각 독립적으로 데이터를 수집한다. **모든 채권자가 세 곳 모두에 보고하는 것은 아니다** → 한 채권자가 한두 곳에만 보고할 수 있어, 같은 사람도 세 보고서가 다를 수 있다(따라서 점수도 다를 수 있다).
- 데이터 제공자(data furnisher: 은행·카드사·대출사 등)는 각 신용국과 **Data Furnisher / Service Agreement**를 맺어야 보고할 수 있다. 보고는 **긍정 정보(positive tradeline)**와 **부정 정보(negative tradeline)** 모두 포함.

**신용보고서에 들어가는 정보(수집 데이터).** 신용보고서는 보통 4개 섹션으로 구성: (https://www.experian.com/blogs/ask-experian/what-is-a-credit-bureau/ , https://www.nolo.com/legal-encyclopedia/the-nationwide-credit-reporting-agencies-experian-equifax-transunion.html)
1. **신원정보(identifying info)**: 이름, 주소(이력), 생년월일, SSN, 고용주 등(점수에는 미반영).
2. **신용계좌/거래선(tradelines / credit accounts)**: 계좌 종류(카드·할부·모기지 등), 개설일, 신용한도 또는 대출원금, 잔액, **상환이력(월별 납부 상태)**. ← 점수의 핵심 원천.
3. **신용조회(inquiries)**:
   - **Hard inquiry(경성 조회)**: 신규 신용 신청 시 발생, 점수에 영향, 본인 동의 필요.
   - **Soft inquiry(연성 조회)**: 본인 조회·사전심사·기존 계좌 모니터링 등, 점수 영향 없음.
4. **공공기록·추심(public records & collections)**: 파산(bankruptcy), (과거)세금 유치권(tax lien)·민사판결, 추심계좌(collections) 등 법원·추심 기록.

> 한 거래선(tradeline)에 담기는 표준 필드: 채권자명, 계좌종류, 개설일, 신용한도/대출액, 현재 잔액, 월 납부액, **납부 상태(현행/30·60·90·120일 연체 등)**, 마지막 활동일. 이 월별 상태가 모여 "상환이력"이 된다.

**무엇이 신용보고서에 안 들어가나(미국).** 소득, 은행 예금 잔액, 인종·종교·성별, 형사기록(대개), 의료 진단명 등은 일반적으로 미포함. (https://www.experian.com/blogs/ask-experian/what-is-a-credit-bureau/)

**기업용 신용국.** 개인 외에 **Dun & Bradstreet(D&B, DUNS 번호·PAYDEX 점수)**, Experian Business, Equifax Business 등이 기업 신용보고서를 제공한다. (https://www.tsbsoftware.com/how-to-report-credit)

**법적 틀(미국 — FCRA).** 신용보고는 **Fair Credit Reporting Act(FCRA, 15 U.S.C. §1681)**가 규율. 핵심 보존기한: (https://www.ftc.gov/system/files/ftc_gov/pdf/fcra-may2023-508.pdf , https://corporatefinanceinstitute.com/resources/commercial-lending/fair-credit-reporting-act-fcra/)
- 부정적 정보(연체·추심·민사판결·상환한 세금유치권 등): **7년** 후 삭제.
- **파산(bankruptcy)**: 신청일로부터 **10년** 보존.
- 예외: $75,000 이상 급여 직무, $150,000 이상 신용/생명보험 신청 시에는 기간 제한 미적용. 형사 유죄기록은 무기한 보고 가능.
- 소비자는 연 1회 무료 보고서 열람권, 오류 정정 요구권, 부정확 정보 분쟁권을 가진다(FCRA).

---

### 1.5 스코어카드 방법론 (scorecard methodology)

신용점수 모델의 고전적·산업표준 형태가 **스코어카드(scorecard)**다. 1950년대부터 쓰여왔고 지금도 규제·해석가능성 때문에 주류다. (https://rstudio-pubs-static.s3.amazonaws.com/376828_032c59adbc984b0ab892ce0026370352.html)

**(a) 기본 모델: 로지스틱 회귀(logistic regression).**
- 타깃은 이진(binary): **good(우량, 비부도) vs bad(불량, 부도)**. "bad"의 정의는 보통 "관찰기간 내 90일+ 연체" 같은 식으로 못박는다.
- 로지스틱 회귀는 **log-odds(로그 승산)**를 선형으로 모델링: `ln(P(bad)/P(good)) = β0 + β1x1 + ... + βnxn`. 출력 확률을 점수로 환산한다.
- 해석가능성(어떤 변수가 점수를 올리고 내리는지 설명 가능), 안정성, 규제 친화성 때문에 신용 분야 표준으로 자리잡음. (https://medium.com/@rachmanto.rian/logistic-regression-in-building-credit-scorecard-924bece9f953)

**(b) 변수 변환: WOE(Weight of Evidence) / IV(Information Value).** 스코어카드의 핵심 전처리.

- **Binning(구간화)**: 연속변수·고카디널리티 변수를 보통 20~50개 fine bin으로 나눈 뒤(fine classing), 통계적으로 비슷한 구간을 병합(coarse classing). 이상치는 양끝 bin에 흡수되고, 결측치도 자체 bin을 가질 수 있다. (https://altair.com/blog/articles/credit-scoring-series-part-five-credit-scorecard-development)
- **WOE(증거가중치)**: 각 bin이 우량/불량을 얼마나 가르는지를 로그 승산으로 표현.
  `WOE = ln( (해당 bin의 Good 비율 / 전체 Good) / (해당 bin의 Bad 비율 / 전체 Bad) ) = ln(Distribution_Good / Distribution_Bad)`
  WOE는 범주형/구간화 변수를 **연속적인 수치로 변환**해 로지스틱 회귀에 바로 넣을 수 있게 한다. WOE와 로지스틱 회귀는 둘 다 log-odds 기반이라 잘 맞는다. 또 비선형 관계를 단조 변환으로 흡수해준다. (https://rstudio-pubs-static.s3.amazonaws.com/376828_032c59adbc984b0ab892ce0026370352.html , https://www.listendata.com/2015/03/weight-of-evidence-woe-and-information.html)
- **IV(정보가치)**: 한 변수 전체의 **예측력(변별력)**을 하나의 수치로 요약. 변수 선택(feature selection)에 쓴다.
  `IV = Σ_bins ( Distribution_Good − Distribution_Bad ) × WOE`
  **경험칙(rule of thumb)**: IV < 0.02 = 예측력 없음(제외) / 0.02–0.1 = 약함 / 0.1–0.3 = 중간 / **> 0.3 = 강함**. 통상 IV ≥ 0.1 변수들을 후보로 채택. (단, IV가 너무 크면(예: >0.5) 과적합·정보누수(leakage) 의심.) (https://www.listendata.com/2015/03/weight-of-evidence-woe-and-information.html , https://www.analyticsvidhya.com/blog/2021/06/understand-weight-of-evidence-and-information-value/)

**(c) 스코어카드 점수 환산: scaling(PDO).** 로지스틱 회귀의 log-odds를 정수 점수로 바꾸는 표준 공식. 두 기준값으로 보정한다: 특정 점수에서의 기준 odds, 그리고 **PDO(Points to Double the Odds, 승산을 두 배로 바꾸는 점수폭)**.
`Score = Offset + Factor × ln(odds)`, 여기서 `Factor = PDO / ln(2)`, `Offset = Score − Factor × ln(odds_ref)`.
예: "600점에서 odds 50:1, PDO 20"으로 보정하면 620점은 odds 100:1, 640점은 200:1이 되도록 점수가 짜인다. 각 변수의 각 bin은 (회귀계수 × WOE)를 점수폭으로 환산해 **가산점/감점**으로 카드에 박힌다 → 그래서 "스코어카드"다. (https://altair.com/blog/articles/credit-scoring-series-part-five-credit-scorecard-development)

**(d) Application vs Behavioral scorecard.** (KCB 공식 공시도 동일 구분 — https://www.allcredit.co.kr/down/KCB_Credit_Evaluation_System.pdf)
- **신청평점 Application scorecard**: 신용거래를 **신규 신청한 시점**의 정보(신청서 + 신용국 데이터)로 산출. 대출 승인 여부, 카드 발급 여부 등 **신규 거래 개설(originations)** 의사결정에 사용.
- **행동평점 Behavioral scorecard**: 이미 거래 중인 고객의 **실제 거래·납부 행태**(최근 수개월 잔액·납부·연체 패턴)로 일정 시점마다 재평가. 대출 연장, 금리 변경, **카드 한도 상향/하향**, 한도 관리, 추심 전략 등에 사용. 일반적으로 행동평점이 신청평점보다 예측력이 높다(실제 행동 데이터가 있으므로).

**(e) Reject inference(거절추론) 문제.** 스코어카드를 만들 때 근본 편향.
- 문제: 과거에 **승인된(accepted) 고객의 good/bad 결과만** 관측된다. 거절(rejected)된 신청자는 결과(부도 여부)를 알 수 없다 → 승인자만으로 모델을 만들면 **표본 편향(selection bias)**이 생긴다. 통계적으로 "Missing Not At Random(MNAR)" 상황. (https://altair.com/blog/articles/credit-scoring-series-part-six-segmentation-and-reject-inference , https://www.mathworks.com/help/risk/reject-inference-for-credit-scorecards.html)
- **Reject inference**는 거절자에게 추정된 good/bad 결과를 부여해 모델 학습 모집단에 포함시키는 기법군. 대표 방법: **parceling(승인자 모델로 거절자의 부도확률 추정 후 비례 배분)**, **augmentation(가중치 보정)**, **fuzzy/extrapolation**, 최근엔 **deep generative model** 등. 목적은 "신청자 전체 모집단(through-the-door population)"을 대표하는 모델을 만드는 것. (https://adimajo.github.io/assets/publications/rejectInference.pdf , https://arxiv.org/pdf/1904.11376)

**(f) Thin-file / credit invisible 문제와 대안데이터(alternative data).**
- **Credit invisible**: 신용국에 파일이 아예 없는 사람. **Thin file**: 점수 산출에 필요한 거래선이 부족하거나 오래돼(stale) 신뢰할 점수를 못 만드는 사람. 미국에서 약 4,500만 명이 thin/stale 파일로 추정된다. (https://files.consumerfinance.gov/f/documents/20170214_cfpb_Alt-Data-RFI.pdf , https://arxiv.org/html/2410.22382)
- **대안데이터(alternative data)**: 전통 신용보고서 밖의 정보로 이들을 평가하려는 시도. CFPB가 정리한 범주: 거래/현금흐름(은행계좌 입출금), 청구서 납부(임대료·공공요금·통신비), 소득·자산(고용이력·부동산 보유) 등. 잘 쓰면 정확도↑ + 신용소외층 포용↑. 다만 대안데이터는 편향·차별(프록시) 위험이 있어 인과추론 기반 디바이어싱 연구가 활발. (https://files.consumerfinance.gov/f/documents/20170214_cfpb_Alt-Data-RFI.pdf , https://arxiv.org/html/2410.22382)
- 한국식 사례: NICE/KCB의 **비금융정보·마이데이터 가점**(국민연금·건강보험·통신요금·공공요금 성실납부, 금융자산)이 제도화된 대안데이터다. VantageScore 4.0의 "1개월 이력으로 산출", 통신·임대료 데이터 반영도 같은 흐름. (§1.3, §1.2)

**(g) 모델 성능지표(스코어카드 검증).** KCB 공시가 제시하는 산업표준 지표(적정기준치 포함): (https://www.allcredit.co.kr/down/KCB_Credit_Evaluation_System.pdf)
- **K-S(Kolmogorov–Smirnov)**: 점수대별 누적 우량비율과 누적 불량비율의 최대 차이. 클수록 변별력 우수(KCB 기준 50 이상).
- **Divergence**: 우량·불량 점수분포 간 거리(평균차/분산 기반). 클수록 좋음(기준 1.0 이상).
- **GINI 계수**: ROC/CAP 곡선 면적 기반 변별력. 클수록 좋음(기준 0.6 이상). (Gini ≈ 2·AUC − 1)
- **PSI(Population Stability Index)**: 기준시점 대비 현재 점수분포 변화. `PSI = Σ (%현재 − %기준) × ln(%현재/%기준)`. 작을수록 안정적(기준 0.1 미만 — 0.1~0.25 주의, 0.25↑ 재개발 신호).
- (참고문헌으로 Elizabeth Mays, *Handbook of Credit Scoring* (2000); Raymond Anderson, *The Credit Scoring Toolkit* (2007)을 KCB가 인용 — 업계 표준 교재.)

---

### 1.6 은행 신용리스크 모수: PD · LGD · EAD · 기대손실 · Basel

**기대손실(Expected Loss) 공식.** 은행 여신 리스크의 가장 기본 항등식:

**EL = PD × LGD × EAD**

(Expected Loss = Probability of Default × Loss Given Default × Exposure at Default) (https://analystprep.com/study-notes/frm/part-1/valuation-and-risk-management/measuring-credit-risk/ , https://en.wikipedia.org/wiki/Advanced_IRB)

**세 모수의 정의.**
- **PD (Probability of Default, 부도확률)**: 차주가 일정 기간(통상 **1년**) 내 부도(채무불이행)에 빠질 확률. 0~100%. 신용점수/등급이 본질적으로 PD의 추정치다(§1.3 KCB 점수대별 불량률 표가 바로 PD 곡선). (https://en.wikipedia.org/wiki/Probability_of_default)
- **LGD (Loss Given Default, 부도시 손실률)**: 부도가 났을 때 노출액 중 **실제로 회수 못 하는 비율**. `LGD = 1 − 회수율(recovery rate)`. 담보·보증·변제순위에 좌우(무담보 카드는 LGD 높고, 부동산 담보 모기지는 낮음). (https://analystprep.com/study-notes/frm/part-1/valuation-and-risk-management/measuring-credit-risk/)
- **EAD (Exposure at Default, 부도시 노출액)**: 부도 시점에 은행이 떠안고 있을 익스포저(대출잔액 + 한도 미사용분 중 부도 직전 끌어 쓸 것으로 추정되는 부분, CCF로 추정). (https://en.wikipedia.org/wiki/Advanced_IRB)

→ 예: EAD 1,000만원, PD 2%, LGD 45%면 EL = 1,000 × 0.02 × 0.45 = 9만원. 은행은 **EL을 비용(대손충당금/금리 스프레드)**으로 처리하고, **예상 못한 손실(Unexpected Loss)은 자기자본**으로 흡수해야 한다. Basel 자본규제의 핵심 논리가 이것이다. (https://www.bis.org/bcbs/publ/d424.pdf)

**Basel 프레임워크 개요.** 바젤은행감독위원회(BCBS)가 만든 은행 자기자본 규제 국제표준. 신용리스크 자본(RWA, 위험가중자산) 산출에 두 접근법: (https://www.bis.org/bcbs/publ/d424_hlsummary.pdf , https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/basel-iii-the-final-regulatory-standard)
- **표준방법(Standardised Approach, SA)**: 규제당국이 정한 위험가중치표 사용. 자산군별로, 그리고 **외부 신용등급(Moody's/S&P/Fitch 등)**에 연동된 위험가중치를 적용. 내부모델 없는 은행의 기본.
- **내부등급법(Internal Ratings-Based, IRB)**: 감독당국 승인 하에 은행 자체 모델로 모수 추정.
  - **Foundation IRB(F-IRB)**: 은행이 **PD만** 자체 추정, LGD·EAD는 감독당국 규정값 사용.
  - **Advanced IRB(A-IRB)**: 은행이 **PD·LGD·EAD 모두** 자체 추정. 추정된 PD·LGD·EAD를 바젤 감독공식(supervisory formula)에 넣어 RWA를 산출하며, 자본은 **예상손실(EL)을 충당금으로, 예상외손실(UL)을 자기자본으로** 커버하도록 설계. (https://en.wikipedia.org/wiki/Advanced_IRB , https://en.wikipedia.org/wiki/Foundation_IRB)
- Basel 발전사: Basel I(1988, 단순 위험가중) → Basel II(2004, IRB·PD/LGD/EAD 도입) → Basel III(2010~, 글로벌 금융위기 후 자본질·레버리지·유동성 강화). 최종 Basel III 개혁(일명 "Basel IV", 2017 합의, 2023~ 시행)은 **RWA 산출의 신뢰성·비교가능성 회복**을 목표로 표준방법을 강화하고 내부모델 사용을 제약(예: **output floor** — IRB RWA가 SA의 일정 비율(72.5%) 아래로 못 내려가게 하한 설정). (https://www.bis.org/bcbs/publ/d424_hlsummary.pdf , https://www.moodys.com/web/en/us/insights/banking/final-basel-reforms-how-can-banks-prepare.html)

**Basel의 부도(default) 정의 — 매우 중요한 표준.** Basel은 다음 둘 중 **하나 이상** 충족 시 차주를 부도로 본다(CRE36 등): (https://www.bis.org/bcbs/publ/d403.pdf , https://en.wikipedia.org/wiki/Probability_of_default)
1. **상환불능 추정(unlikely to pay)**: 은행이 담보처분 등의 조치 없이는 차주가 채무를 전액 상환하기 어렵다고 판단할 때(예: 채무재조정, 충당금 적립, 도산 등).
2. **90일 초과 연체(90 days past due)**: 차주가 **중요한(material)** 신용채무를 **90일을 초과**해 연체했을 때. 90일은 backstop(최후 기준)이며, "중요성(materiality)"은 은행이 정한 임계금액 이상일 때만 적용. (단, IRB의 일부 리테일·공공부문 익스포저는 180일 기준 허용.)

---

### 1.7 기업 신용등급: Moody's / S&P / Fitch

**기업·채권 신용등급 체계.** 글로벌 3대 신용평가사(NRSRO): **Moody's, S&P Global Ratings, Fitch Ratings**. 발행사·채권의 디폴트 위험을 알파벳 등급으로 표현한다. 최상위는 Moody's **Aaa**, S&P/Fitch **AAA**(최저 위험). (https://wolfstreet.com/credit-rating-scales-by-moodys-sp-and-fitch/ , https://smartasset.com/investing/moodys-rating-scale)

**등급 척도 대조표(장기 등급).** (https://wolfstreet.com/credit-rating-scales-by-moodys-sp-and-fitch/ , https://financestu.com/sp-vs-moodys-vs-fitch/)

| 구분 | Moody's | S&P | Fitch | 의미 |
|---|---|---|---|---|
| **투자등급 Investment Grade** | Aaa | AAA | AAA | 최고 신용 |
| | Aa1/Aa2/Aa3 | AA+/AA/AA− | AA+/AA/AA− | 매우 높음 |
| | A1/A2/A3 | A+/A/A− | A+/A/A− | 높음 |
| | Baa1/Baa2/**Baa3** | BBB+/BBB/**BBB−** | BBB+/BBB/**BBB−** | 적정(투자등급 하한) |
| **투기등급 Speculative / "Junk"** | **Ba1**/Ba2/Ba3 | **BB+**/BB/BB− | **BB+**/BB/BB− | 투기적 시작 |
| | B1/B2/B3 | B+/B/B− | B+/B/B− | 높은 투기성 |
| | Caa1/Caa2/Caa3 | CCC+/CCC/CCC− | CCC | 매우 취약 |
| | Ca | CC / C | CC / C | 부도 임박 |
| | C | D | D / RD | 부도(default) |

- **투자등급 vs 투기등급 경계**: **S&P·Fitch는 BBB−**, **Moody's는 Baa3**가 투자등급의 **하한선**. 이보다 한 단계 아래(BB+/Ba1)부터 투기등급("junk")이다. 이 경계는 많은 기관투자자의 투자 가능 여부, 채권 금리에 결정적. (https://www.britannica.com/money/FICO-vs-VantageScore — 비교표 일반론; https://wolfstreet.com/credit-rating-scales-by-moodys-sp-and-fitch/)
- **세분 표기 차이**: Moody's는 숫자 수식어 **1/2/3**(1이 최상), S&P·Fitch는 **+/−**로 같은 카테고리 안을 세분. 예: A1 ≈ A+, A2 ≈ A, A3 ≈ A−.
- 개인 점수와 달리 기업등급은 **발행사 등급(issuer rating)**과 **개별 채권/발행물 등급(issue-specific rating)**이 구분된다(담보·변제순위·보증에 따라 같은 회사라도 채권별 등급이 다를 수 있음). KCB도 한국 기업신용등급을 AAA~D의 10개 등급(±포함 22개 세부)으로 표시한다고 공시. (https://www.koreacb.com/mobile/kr/etc/policy_scoring)
- 등급은 발행사가 비용을 내고 받는 **"발행사 지불(issuer-pays)" 모델**이 일반적이며, 2008 금융위기 때 이 구조의 이해상충이 문제됐다(구조화상품 과대평가). 등급은 PD의 서수적 신호로 쓰이며, 각 등급의 역사적 누적부도율 표(rating transition / default study)를 평가사가 매년 공표한다. (https://medium.com/@jerrygrzegorzek/credit-ratings-and-the-influence-of-s-p-moodys-and-fitch-7134303d919c)

---

### 1.8 핵심 정의·메커니즘 정리

**신용한도(credit limit).** 대출기관이 차주에게 허용하는 최대 차입(또는 카드 사용) 한도. 회전성(revolving, 카드·마이너스통장)에서 특히 중요. 점수와의 연결: **사용률(utilization) = 잔액 / 한도**. FICO의 "amounts owed(30%)", VantageScore의 "utilization"이 이를 핵심으로 본다. 실무 권고는 **사용률 30% 이하** 유지. 한도는 행동평점에 따라 상향/하향 조정된다(§1.5 behavioral scorecard). (https://www.myfico.com/credit-education/credit-scores/amount-of-debt , https://www.bank-mall.co.kr/plus/blog/11993)

**연체(delinquency) vs 부도(default).** 둘은 다른 개념이며 심각도 단계가 다르다. (https://financeops.ai/blogs/delinquent-loans-vs-defaults-definitions-differences-and-what-borrowers-should-know , https://www.creditkarma.com/credit/i/what-is-a-delinquent-account)
- **연체(delinquency)**: 약정 납부일을 지나 한 번이라도 못 갚은 상태. **하루만 늦어도 기술적으로 연체.** 단, 대출기관은 보통 **30일 경과** 시점부터 신용국에 보고. 이후 60·90·120일 식으로 심화.
- **부도(default)**: 더 심각한 단계. 계약·규제가 정한 기준 충족 시 발생, 보통 **90일(대출 일반)** 무납부. 추심·기한이익 상실(acceleration)·법적 조치를 촉발. (미 연방 학자금은 270일.) Basel·은행 리스크의 PD는 이 부도(통상 90일+ 또는 "상환불능 추정")를 사건으로 정의(§1.6).
- **상각(charge-off)**: 연체가 장기화(보통 90~270일)되면 채권자가 회수불능으로 보고 회계상 손실 처리하고 추심업체에 매각하기도 함. (https://www.federalreserve.gov/releases/chargeoff/delallsa.htm)
- 한국: 단기연체 **5영업일·10만원 이상**, 장기연체 **90일 이상**(NICE/KCB 공통). 신용점수의 "불량(bad)" 정의는 "**향후 1년 내 90일 이상 연체 발생**"이 표준. (§1.3)

**신용이력(credit history).** 개인이 신용을 빌리고 갚아온 누적 기록 전체(계좌 개설·사용·납부·연체·완납). 신용보고서로 구체화되고, FICO "length of credit history(15%)" 등으로 점수에 반영. 이력이 없거나 빈약하면 thin-file/credit-invisible 문제(§1.5). 부정적 기록은 미국 FCRA상 7년(파산 10년) 후 삭제(§1.4).

**점수가 산출되고 대출자가 활용되는 전체 흐름(end-to-end).**
1. 차주가 카드·대출 거래를 하면 채권자가 신용국에 **거래선/납부상태를 보고**(월 단위) → 신용보고서 갱신.
2. 신용점수 모델(FICO/VantageScore/NICE/KCB)이 보고서 데이터를 **점수(PD 추정치)**로 요약.
3. 차주가 신규 신청 → 대출기관이 **신청평점 + 소득·직장·담보·DTI 등 자체 정보**로 승인/한도/금리(risk-based pricing) 결정. (신용국·점수사는 결정에 관여 안 함 — 결정은 대출기관 몫. KCB도 "점수는 참고지표 중 하나, 절대적 의사결정 수단 아님"이라 명시.) (https://www.allcredit.co.kr/down/KCB_Credit_Evaluation_System.pdf)
4. 거래 개시 후엔 **행동평점**으로 한도 조정·금리 변경·갱신·추심 전략을 운영.
5. 은행은 포트폴리오 차원에서 **PD·LGD·EAD로 기대손실(EL)**을 산출 → 대손충당금·금리 스프레드에 반영하고, **Basel 자본**으로 예상외손실을 커버.
6. 기업/채권 영역에선 Moody's·S&P·Fitch **등급**이 PD 신호로 같은 역할(금리·투자가능 여부 결정).

### 출처

**FICO / VantageScore (미국 개인 점수)**
- https://www.myfico.com/credit-education/whats-in-your-credit-score (FICO 5요소·가중치 공식 — 35/30/15/10/10)
- https://www.myfico.com/legal/fico-score-versions (FICO 범위 300–850, 버전 16종)
- https://www.myfico.com/credit-education/credit-scores/fico-score-versions
- https://www.experian.com/blogs/ask-experian/fico-score-versions/
- https://www.experian.com/blogs/ask-experian/infographic-what-are-the-different-scoring-ranges/ (FICO 구간)
- https://www.equifax.com/personal/education/credit/score/articles/-/learn/what-is-a-fico-score/
- https://www.nerdwallet.com/finance/learn/fico-score
- https://www.nav.com/resource/5-main-credit-scoring-factors/
- https://www.vantagescore.com/resources/knowledge-center/credit-scoring-101-factors-that-affect-your-vantagescore-credit-score (VantageScore 4.0 공식 요인)
- https://www.chase.com/personal/credit-cards/education/credit-score/vantagescore-ranges-explained
- https://www.experian.com/blogs/ask-experian/the-difference-between-vantage-scores-and-fico-scores/
- https://www.equifax.com/newsroom/all-news/-/story/what-is-the-difference-between-vantagescore-4-0-and-classic-fico-scores-/
- https://www.experian.com/blogs/ask-experian/what-is-a-vantagescore-credit-score/
- https://www.creditkarma.com/credit/i/vantagescore-vs-fico
- https://www.self.inc/blog/fico-vs-vantagescore (VantageScore % 환산치 — 비공식)
- https://www.nerdwallet.com/article/finance/vantagescore-fico-score-the-difference

**한국 개인신용평점 (NICE / KCB / KCIS)**
- https://www.niceinfo.co.kr/creditrating/cb_score_1_4_1.nice (NICE 공식 평가요소·활용비중 — 상환28.4/부채24.5/기간12.3/형태27.5/비금융7.3)
- https://www.allcredit.co.kr/down/KCB_Credit_Evaluation_System.pdf (KCB 개인신용평가체계 공시 2024.04.01 — 비중·정의·성능지표·점수대별 불량률)
- https://www.koreacb.com/mobile/kr/etc/policy_scoring (KCB 신용평점/등급 체계, 기업등급 AAA~D)
- https://www.bank-mall.co.kr/plus/blog/11993 (NICE vs KCB 차이·관점·사례)
- https://ko.wikipedia.org/wiki/한국신용정보원 (KCIS 종합신용정보집중기관)
- https://www.kcredit.or.kr/ (한국신용정보원 공식)
- https://namu.wiki/w/신용점수제 (신용점수제 개요)

**신용국 / FCRA**
- https://www.experian.com/blogs/ask-experian/what-is-a-credit-bureau/ (신용국 역할·수집정보)
- https://www.capitalone.com/learn-grow/money-management/three-credit-bureaus/ (3대 신용국)
- https://www.transunion.com/credit-reporting-agencies
- https://www.nolo.com/legal-encyclopedia/the-nationwide-credit-reporting-agencies-experian-equifax-transunion.html
- https://www.tsbsoftware.com/how-to-report-credit (data furnisher, 기업 신용국 D&B 등)
- https://www.ftc.gov/system/files/ftc_gov/pdf/fcra-may2023-508.pdf (FCRA 원문)
- https://corporatefinanceinstitute.com/resources/commercial-lending/fair-credit-reporting-act-fcra/ (FCRA 7년/파산10년)

**스코어카드 방법론 (로지스틱·WOE/IV·reject inference·대안데이터)**
- https://rstudio-pubs-static.s3.amazonaws.com/376828_032c59adbc984b0ab892ce0026370352.html (WOE/IV/스코어카드)
- https://www.listendata.com/2015/03/weight-of-evidence-woe-and-information.html (WOE·IV 공식·임계값)
- https://www.analyticsvidhya.com/blog/2021/06/understand-weight-of-evidence-and-information-value/
- https://altair.com/blog/articles/credit-scoring-series-part-five-credit-scorecard-development (binning·scaling·PDO)
- https://altair.com/blog/articles/credit-scoring-series-part-six-segmentation-and-reject-inference (reject inference)
- https://medium.com/@rachmanto.rian/logistic-regression-in-building-credit-scorecard-924bece9f953
- https://adimajo.github.io/assets/publications/rejectInference.pdf (reject inference 방법론)
- https://arxiv.org/pdf/1904.11376 (deep generative reject inference)
- https://files.consumerfinance.gov/f/documents/20170214_cfpb_Alt-Data-RFI.pdf (CFPB 대안데이터 RFI, thin file 4,500만)
- https://arxiv.org/html/2410.22382 (대안데이터 디바이어싱)

**은행 리스크 / Basel / PD·LGD·EAD**
- https://analystprep.com/study-notes/frm/part-1/valuation-and-risk-management/measuring-credit-risk/ (EL=PD×LGD×EAD)
- https://en.wikipedia.org/wiki/Advanced_IRB (A-IRB, PD·LGD·EAD 자체추정)
- https://en.wikipedia.org/wiki/Foundation_IRB (F-IRB)
- https://en.wikipedia.org/wiki/Probability_of_default (PD, Basel 부도정의)
- https://www.bis.org/bcbs/publ/d424.pdf (Basel III 최종개혁 본문)
- https://www.bis.org/bcbs/publ/d424_hlsummary.pdf (Basel III 요약, SA·IRB)
- https://www.bis.org/bcbs/publ/d403.pdf (Basel 부도 prudential 정의)
- https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/basel-iii-the-final-regulatory-standard (output floor 등)
- https://www.moodys.com/web/en/us/insights/banking/final-basel-reforms-how-can-banks-prepare.html

**기업 신용등급 (Moody's/S&P/Fitch)**
- https://wolfstreet.com/credit-rating-scales-by-moodys-sp-and-fitch/ (3사 등급 대조표)
- https://financestu.com/sp-vs-moodys-vs-fitch/ (등급 변환표)
- https://smartasset.com/investing/moodys-rating-scale (Moody's 척도)
- https://medium.com/@jerrygrzegorzek/credit-ratings-and-the-influence-of-s-p-moodys-and-fitch-7134303d919c (issuer-pays 등)
- https://www.britannica.com/money/FICO-vs-VantageScore

**연체/부도/상각 정의**
- https://financeops.ai/blogs/delinquent-loans-vs-defaults-definitions-differences-and-what-borrowers-should-know
- https://www.creditkarma.com/credit/i/what-is-a-delinquent-account
- https://www.federalreserve.gov/releases/chargeoff/delallsa.htm (charge-off·연체율)

## 2. 매핑 (기존 개념 → 우리 4층)

| 기존 개념 | 한 줄 정의 | 우리 4층 대응 위치 | 정합 | 비고 |
|---|---|---|---|---|
| 신용점수(FICO/NICE/KCB) | 1년 내 부도확률(PD)의 단일 점수 | **3층 신용 출력(PHI-3)** — 노드값 | ○ | 둘 다 "사람당 한 점수 = 미래 불이행 가능성". 우리 신용이 점유하는 자리 |
| 신용보고서·신용국 | 거래이력 수집·집계 인프라 | **1층(entity·event·action) + 2층 fold(원장)** | ○ | 그들=금융 tradeline, 우리=경조사·모임 액션 |
| 5요소 가중치(상환35·부채30·기간15·조합10·신규10) | 점수 구성요소·비중 | **2층 자원별 fold + 3층 합산비중(PHI-2)** | △ | 그들=개인 단독 요소, 우리=관계 자원. "상환이력"≈우리 이행 node |
| PD·LGD·EAD / EL=PD×LGD×EAD | 기대손실 3분해 | **3층=PD 자리 / 4층 금융=LGD·EAD(미구축)** | △ | 우리는 PD격(신용)만, LGD·EAD 없음 → 4층에서 도입 필요 |
| 스코어카드(로지스틱·WOE/IV) | good/bad 지도학습 점수화 | **3층 Φ의 대안/보완** | △ | 그들=지도학습(라벨), 우리=그래프 전파(비지도). 하이브리드 가능 |
| behavioral scorecard | 거래 후 행태로 재평가 | **2층 시간 누적 + 3층 재계산** | ○ | 우리 fold의 시간 발전과 동형 |
| reject inference | 승인자만 관측되는 표본편향 보정 | (우리도 동일 문제) | — | 우리 데이터도 MNAR(서비스 미사용자 결측) — 주의 |
| thin-file/credit invisible·대안데이터 | 이력 빈약자·비전통 데이터 | **우리의 핵심 기회** | ○○ | 부조·참석·역할 = 관계형 대안데이터. NICE/KCB 비금융 가점의 확장 |
| 기업등급 issuer vs issue | 발행사/개별채권 등급 분리 | 노드 신용 vs 거래별 신용 | △ | 우리는 아직 노드만 — 거래별 분화 여지 |
| Basel 부도정의(90일 초과+상환불능) | 부도의 조작적 표준 | 우리 default판정 기준 참고 | — | "90일+materiality"는 우리 default판정 못박기에 참고 |

## 3. 검토 (정합 · 엇나감 · 메울 갭 · 배울 것)

**정합 총평.** 전통 신용평가의 최종 산출물(신용점수=PD 추정)은 우리 3층 신용과 *정확히 같은 자리*다 — "사람당 하나의, 미래 불이행 가능성을 나타내는 점수". 데이터→점수→여신의 3층 구조도 우리 1·2·3층과 대응한다. 큰 틀에서 우리가 만드는 게 "신용점수"라는 점은 정합한다.

**논리적으로 엇나가는·주의할 지점.**
1. **전통은 '개인의 과거 금융 거래'만 본다 — 네트워크를 의도적으로 배제.** FICO는 소득·관계·인구속성을 안 보고(ECOA 차별금지) 신용보고서 거래선만 쓴다. 우리의 핵심 주장(신용=네트워크 위치)은 전통이 *일부러 피하는* 영역이다. → **차별·공정대출(ECOA) 리스크**: "누구와 엮였나"로 평가하면 연좌·프록시 차별이 될 수 있다(03 안드라·04 SBT 역익명화와 연결). 설계로 반드시 방어해야 할 함정.
2. **우리는 PD격(신용)만 있고 LGD·EAD가 없다.** 전통 여신은 "얼마나 떼일까(PD)"와 "떼이면 얼마(LGD)·얼마가 걸렸나(EAD)"를 분리한다. 4층 금융으로 가려면 이 분해가 필요 — 현재 우리에게 없는 조각.

**우리가 메울 수 있는 갭(차별화).**
1. **thin-file/credit-invisible(미국 4,500만)에게 관계 기반 신용** — 부조·참석·역할이 곧 대안데이터. NICE/KCB 비금융 가점이 이미 제도화된 씨앗이고, 우리는 그 *관계망 버전*.
2. **비금융 사회적 거래를 신용 신호로 정식 편입** — 전통이 안 보는 경조사 호혜를 1차 신호로.
3. **네트워크 위치(전파)를 점수에** — 전통은 개인 단독 합산만, 우리는 3층 전파를 더함.

**우리가 배워야 할 것(그들이 앞선 것).**
1. **PD·LGD·EAD 분해** — 4층 금융 설계의 표준 골격.
2. **검증·안정성 방법론** — reject inference(우리 데이터도 MNAR), PSI·K-S·Gini 등 모델 안정성 지표(우리 시제품 검증에 그대로 적용 가능).
3. **부도의 조작적 정의** — Basel "90일 초과 + 상환불능 추정"을 우리 default판정 기준에 참고.
4. **ECOA식 공정성 가드레일** — 관계 평가의 차별 위험을 규제 수준에서 관리.
