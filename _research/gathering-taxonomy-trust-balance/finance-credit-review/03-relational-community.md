# 03. 관계형·공동체 금융 — 리서치

> 범위: 계(契)/ROSCA · 마이크로파이낸스(그라민) · P2P 렌딩 · 관계형/평판 기반 대출 · 사회적 자본과 신용. 순수 외부 리서치(실세계 시스템 사실 수집, 출처 포함). 내부/독자 모델 미참조. 2026-06-17

---

## 1. 리서치 (수집)

이 도메인의 공통 주제는 하나다: **담보(collateral)·신용조회(credit check) 없이, 사회적 관계·평판·반복 상호작용이 어떻게 디폴트(상환 불이행)를 억제하는가.** 정보경제학 용어로는 (a) **역선택(adverse selection)** = 누가 나쁜 차입자인지 모름, (b) **도덕적 해이(moral hazard)** = 빌린 뒤 노력/상환을 게을리함, (c) **계약 집행(enforcement)** = 갚을 능력이 있어도 안 갚음(전략적 디폴트) — 이 세 가지를 공식 담보 대신 **사회적 메커니즘**으로 푼다. 아래 각 시스템을 이 렌즈로 정리한다.

---

### 1-1. 계(契)/ROSCA — Rotating Savings and Credit Association (회전저축신용계)

#### 정의·기본 구조

ROSCA는 정해진 기간 동안 **함께 저축하고 빌리기** 위해 모인 개인들의 집단으로, **peer-to-peer 뱅킹과 peer-to-peer 렌딩이 결합된 형태**다. 모든 구성원이 정기적으로 같은 금액을 갹출(곗돈 납입)하고, 매 회차마다 한 명이 모인 전액(pot)을 차례로 가져간다. 경제학자 F. J. A. Bouman(1983)의 유명한 표현으로는 **"가난한 사람의 은행(the poor man's bank), 돈이 오래 놀지 않고 빠르게 손을 바꿔 소비와 생산 수요를 동시에 충족하는 곳"**이다. (출처: en.wikipedia.org/wiki/Rotating_savings_and_credit_association)

핵심 작동:
- N명이 모여 매 회차(주/월/계절) 동일 금액을 납입 → pot 형성.
- 회차마다 한 명이 pot 전액 수령 → 모든 구성원이 한 번씩 받으면 한 사이클 종료. **시간 제한적(보통 6개월 이내)**.
- 각 구성원은 사이클 동안 자기가 낸 총액과 **거의 같은 금액**을 받지만(이자 없는 random/fixed형), 받는 **시점**이 달라 일찍 받는 사람은 사실상 무담보 대출을, 늦게 받는 사람은 강제 저축을 하는 셈이다.
- 모든 거래가 모임에서 모두에게 공개 → 따로 보관할 돈이 없으니 **장부가 거의 불필요**, 저문해(low-literacy) 공동체에 잘 맞는 **투명성·단순성 모델**.

(출처: en.wikipedia.org/wiki/Rotating_savings_and_credit_association)

#### 분배(allocation) 방식 — random / fixed / bidding

ROSCA는 pot을 누구에게 주느냐로 세 유형으로 나뉜다. (출처: Wikipedia ROSCA; faisalkhan.com/.../rotating-savings-and-credit-associations-roscas)

1. **추첨계 / Random ROSCA** — 매 회차, 아직 못 받은 사람들 중 **제비뽑기(lottery)**로 수령자 결정. 한국의 추첨계에 해당.
2. **번호계·순번계 / Fixed ROSCA** — 첫 모임 전에 **수령 순서를 미리 확정**. 한국 전통의 순번계(번호계)가 이것. 순번에 따라 납입금에 차등을 두기도 한다(나중에 받는 사람이 덜 내거나 이자 보전을 받는 식). (출처: m.cafe.daum.net/skrckfrP123/9zMN/7; yjlim12345.mycafe24.com/순번계-낙찰계-파계시…)
3. **낙찰계 / Bidding ROSCA** — 매 회차 **입찰(bid)**로 최고 입찰자가 pot 수령. 일찍 받고 싶은 사람은 **자기 payout에서 할인(discount)을 제시**하거나 **더 높은 이자를 주겠다고** 써내고, 그만큼이 다른 구성원들에게 재분배된다. 즉 **시간선호(돈이 급한 정도)에 따라 가격이 매겨지는 시장**이다. (출처: Wikipedia ROSCA; m.cafe.daum.net/skrckfrP123/9zMN/7)

한국 낙찰계 정의(원문): "경쟁입찰의 형식으로 곗날 가장 낮은 금액을 타겠다고 써낸 사람이나 가장 높은 이자를 주겠다는 사람이 낙찰을 받아 곗돈을 타가는 방식." (출처: 검색 요약 — m.cafe.daum.net/skrckfrP123, yjlim12345.mycafe24.com)

학술적으로 Besley, Coate & Loury(1993, *American Economic Review* 83:792–810)는 분배 불가능한 내구재(indivisible durable good)를 사려고 저축하는 모형으로 random형과 bidding형을 분석했다. 결론: **두 유형 모두 신용시장 접근이 없는 개인의 후생을 autarky(자급자족, 혼자 저축)보다 높인다**(구성원이 ROSCA 덕에 재화를 더 일찍 얻음). 선호가 동일한(homogeneous) 경우엔 **random형이 bidding형보다 선호**되지만, 구성원이 이질적(heterogeneous)이면 이 결론이 성립하지 않을 수 있다. (출처: scirp.org/reference/referencespapers?referenceid=1914882; ideas.repec.org/a/aea/aecrev/v83y1993i4p792-810.html; researchonline.lse.ac.uk/id/eprint/1613)

#### 인접 형태 — ASCA / VSLA

ROSCA와 대비되는 것이 **ASCA(Accumulating Savings and Credit Association, 누적저축신용계)**. ROSCA처럼 시간 제한적·비공식이지만, 구성원 중 1명이 **내부 펀드를 운용**한다: 장부를 기록하고 잉여를 외부에 대출한다. 정해진 기간(보통 6~12개월) 후 모든 대출을 회수해 원금+누적이익을 구성원에게 분배. NGO CARE가 이를 표준화한 것이 **VSLA(Village Savings and Loan Association, 마을저축대출조합)**로, 보통 10~20명이 12개월 사이클로 운영하고 **삼중잠금 상자(triple-locked box)**·표준 선거 절차·역할 분리(기록/계산/진행)를 둔다. VSLA 대출 이자는 월 5~10%, 사이클 종료 배당은 투자원금의 30~60% 수준. (출처: Wikipedia ROSCA)

ROSCA의 첫 학술 기술은 인류학자 Shirley Ardener(1964, *Journal of the Royal Anthropological Institute*)이고, 그 전에 Clifford Geertz(1956)가 인도네시아 자바의 **arisan**을 "농민 사회구조 안에서 자라난 중간 단계 제도… 농민과 상인의 화폐관 사이를 잇는 다리"로 기술했다. (출처: Wikipedia ROSCA; Geertz, "The Rotating Credit Association: a middle rung in development", MIT 1956)

#### 전 세계 변형(동의어)

같은 구조가 전 세계에 200개 이상의 이름으로 존재한다. (출처: Wikipedia ROSCA; Wikipedia Tanda; gdrc.org/icm/rosca/rosca-names.html)

| 지역/언어권 | 명칭 |
|---|---|
| 라틴아메리카(멕시코) | **tanda**, cundina |
| 페루 | junta, panderos, quiniela |
| 칠레/베네수엘라/엘살바도르 | polla / sand / cuchubal |
| 카리브·서아프리카 | **susu / osusu**, partner/pardna(서인도제도) |
| 동아시아 중화권 | **hui(會)** |
| 베트남 | hụi/hội(會) |
| 필리핀 | **paluwagan** |
| 한국 | **gye(계/契)**, wichin gye |
| 일본 | tanomoshiko(頼母子講), (전전) mujin |
| 인도 | **chit fund**, committee, visi(구자라트) |
| 파키스탄 | kameti(committee) |
| 에티오피아 | equb(ekub) |
| 이집트 | gam'eya | 
| 남아공 | **stokvel** | 
| 케냐·동아프리카(스와힐리) | **chama** |
| 인도네시아 | **arisan** |
| 브라질 | **consórcio**(2015년 기준 활성 사용자 500만 명 이상) |

(출처: Wikipedia ROSCA — 전체 목록)

특기할 변형:
- **tanda(멕시코)**: 멕시코 인구의 약 31%가 참여한다는 조사. 인류학자 Carlos Vélez-Ibáñez가 멕시코계 tanda를 처음 비판적으로 연구하며 **confianza(상호 신뢰)**를 핵심으로 짚었다. 미국 이민자에게 SSN 없이도 "빌리고 저축"하는 통로. (출처: Wikipedia Tanda; npr.org/blogs/codeswitch/2014/04/01/292580644)
- **consórcio(브라질)**: 낯선 사람들을 에이전트/중개인이 모아 ROSCA 단위로 조직하고, 그 운영 대가로 보수를 받는 **상업화된 ROSCA**. 자동차·내구재 할부구매용으로 발달. (출처: Wikipedia ROSCA; Banco Central do Brasil 금융포용 보고서)
- **susu(서아프리카/카리브)**: 아래 1-3에서 별도 상술.
- **hui(중화권)**: 아래에서 별도 상술.

#### 한국 계(契) — 추가 사실

- 기원: 16세기 한국 농촌 마을에서 정식 대출 접근이 없는 사람들의 자본 조달 수단으로 거슬러 올라간다고 본다. (출처: animascorp.com/gye-the-traditional-korean-savings-system-explained; natlawreview.com — kye 관련)
- 목적의 다양성: **노동 교환(품앗이형), 보험, 친목(사교), 공공사업** 등 다목적으로 조직된다. (출처: 동상; 우리역사넷 contents.history.go.kr — 부녀계의 유형)
- 유형(한국 분류): **순번계(=번호계), 추첨계, 낙찰계, 정액계, 일수계** 등. (출처: m.cafe.daum.net/skrckfrP123/9zMN/7)
- 미국 한인 이민 공동체의 "kye"는 법원 집행 가능성 자체가 쟁점이 된다(아래 디폴트 항 참조). (출처: natlawreview.com/article/legality-kye-loans-korean-immigrant-communities; pashmanstein.com/.../will-new-jersey-courts-enforce-rotating-credit-association-agreements)

#### 디폴트 위험과 사회적 강제(social enforcement) — ★핵심★

ROSCA의 근본 취약점은 명확하다: **이미 pot을 받은 사람은 그 뒤 회차의 곗돈을 안 낼 유인(전략적 디폴트)이 생긴다.** 자기 차례가 지난 자기-이익 추구자가 계속 충성할 이유가, 떼먹을 유인보다 작아 보인다. 경제학자들이 "ROSCA가 어떻게 지속되는가"를 퍼즐로 여겨 온 이유다. (출처: 검색 요약 — journals.plos.org/plosone PMC6114866; legalclarity.org/what-are-roscas)

그런데 ROSCA는 전통적 담보 대신 **사회적 메커니즘으로 상환을 강제**한다:

1. **사회적 담보(social collateral)** — 구성원은 동료들에게 일종의 "사회적 담보"를 맡긴 것과 같다. 즉 **자기 평판·관계 자체가 담보물**이다. (출처: legalclarity.org/what-are-roscas)
2. **평판 손상(reputation)** — 디폴트의 비용은 사회적 제재로 나타난다: 떼먹은 사람은 **나쁜 평판**을 얻고, **앞으로의 ROSCA에서 배제**되며, 경우에 따라 개인 재산 손상까지 감수한다. **평판 리스크가 은행의 담보·신용조회를 대체**한다. (출처: legalclarity.org)
3. **배제(exclusion)와 그 위협** — 신뢰할 수 없는 참가자를 **배제**하면 디폴트 위험이 줄고, **배제될 수 있다는 위협 자체**가 구성원의 디폴트를 억제한다. 한 지역 전체 ROSCA에서 추방될 수 있다는 점이 큰 비용이 된다. (출처: ncbi.nlm.nih.gov/pmc/articles/PMC6114866; journals.plos.org/plosone 2018 — Reciprocity and exclusion…)
4. **반복 접촉이 쌓은 사회적 자본** — 반복 접촉에서 오는 지식과 신뢰가 **사회적 자본**을 형성하고, 이것이 ROSCA가 (a) 나쁜 위험을 사전 배제하고 (b) 디폴트한 자에게 제재를 집행할 수 있게 한다. 참가자 평판은 그룹 **형성** 단계부터 중요하다(누구를 끼워줄지). (출처: ncbi.nlm.nih.gov/pmc/articles/PMC6114866)
5. **구조 자체가 손실을 한정** — 시간 제한적이고(≤6개월) 각자 최소 한 번은 pot을 받으므로, 누군가 일찍 받고 튀어도 **손실 규모가 작게 제한**된다. (출처: Wikipedia ROSCA)
6. **회원 선택(self-selection)** — 구성원들이 서로를 고른다는 점이 참여가 **신뢰와 사회적 힘(social capital), 진정한 참여 의지**에 기반함을 보장한다. (출처: Wikipedia ROSCA)

집행 메커니즘의 구조설계에 관한 학술 연구(Siwan Anderson 외)도 비공식 저축그룹에서 **집행(enforcement)과 조직설계**가 핵심임을 다룬다. (출처: econ.cms.arts.ubc.ca/.../pdf_paper_siwan-anderson-enforcement-organizational-design.pdf; "Enforcement Problems in ROSCAs: Evidence from Benin", researchgate.net/publication/332488711)

**실패 사례 — 사회적 강제가 작동 안 할 때:**
- Bouman(1995)은 (1) ROSCA에 **계약 위반(breach of contract)이 내재된 위험**이고 (2) 많은 나라 법체계에서 ROSCA 계약 위반은 **법원 구제가 안 된다**는 점 때문에, 일부 시대·지역에서 ROSCA가 비판·억제되었다고 설명한다. (출처: Bouman 1995, *Savings and Development* 19(2):117–148, jstor.org/stable/25830410 — Wikipedia ROSCA 인용)
- **계주(系主) 횡령·잠적**이 한국 계 사기의 전형. 곗돈을 모으는 계주가 돈을 가로채거나 사라지는 방식. (한국 사례: 2026년 전남 광양에서 낙찰계 5개로 계원 20명에게 8억 원을 가로챈 혐의로 50대 여성 구속; 부산에서 낙찰계 10개로 20억 원대를 빼돌린 60대 여성 징역 5년 6개월) → **공개·소규모·반복관계라는 사회적 강제가 무력화되는 지점이 곧 중앙 신뢰자(계주)에 집중된 권력**임을 보여준다. (출처: etoday.co.kr/news/view/2537630 — 계주와 곗돈; 검색 요약 — boannews.com 사기예방 기사)
- 멕시코 CONDUSEF(금융소비자보호기구)는 인플레이션·투자수익 부재·사회적 분란·낮은 유동성·사기 위험을 들어 tanda 참여를 권하지 않는다. (출처: Wikipedia Tanda)

#### 디지털 ROSCA (현대화)

ROSCA의 약점(투명성·조직·지리적 한계·수금/분배)을 풀려는 온라인 플랫폼이 다수 등장: **eMoneyPool, Esusu(전 Goldman Sachs/PwC/LinkedIn 출신 창업), Moneyfellows(영국·아프리카 기반 ROSCA 디지털화), Puddle, ROSCA Finance, Partnerhand(영국 'Pardner')** 등. Esusu는 현재 **임대료 등 대안 납부 데이터를 미국 3대 신용국에 보고**(부정정보는 미보고, 평균 +45점)하는 사업으로 발전했다(초기엔 ROSCA 디지털화로 포지셔닝). 〔2026-06-17 검증 정정 — '곗돈 납입 보고'가 아니라 임대료 보고가 현 주력〕 (출처: Wikipedia ROSCA)

---

### 1-2. chit fund (인도) — 입찰형 ROSCA의 제도화·규제

인도의 chit fund는 ROSCA의 입찰형이 **법으로 제도화·규제**된 대표 사례로, "사회적 강제"가 **법적 등록·foreman(주관자) 책임**으로 대체된 스펙트럼의 반대쪽 끝을 보여준다.

#### 구조

- 가입자(subscriber)들이 정해진 기간 동안 정기 납입(installment)을 하고, 매 회차 한 명이 **prize amount(상금=pot)**를 가져간다. 수령자는 **추첨(lot)·경매(auction)·입찰(tender)** 등으로 정해진다. (출처: prsindia.org/theprsblog/chit-funds-q)
- **경매·할인(discount)**: 입찰은 "모인 돈에서 내가 **할인해서 덜 받겠다**고 제시하는 비율"로 한다. **최대 할인율 40%** 제한. **가장 낮은 금액을 받겠다고 한 사람이 낙찰**. (낙찰계와 동일 논리) (출처: prsindia.org)
- **foreman(주관자) 수수료**: foreman은 총 chit 금액의 **5%를 수수료**로 받는다. 실제 prize money = (전체 정기 납입 합계) − (최고 입찰 할인액), 그리고 그 할인액 안에 foreman 몫이 포함된다. (출처: prsindia.org)

#### 규제·사기

- 1982년 인도 재무부가 **Chit Funds Act, 1982**(중앙 법령)를 제정해 규제. 이 법(또는 주별 법)에 **등록되면 chit fund는 완전히 합법**. (출처: prsindia.org; indiankanoon.org/doc/194827648 — The Chit Funds Act, 1982)
- **Saradha 사기(2013)**: Saradha Group(2006 설립)이 chit fund를 가장해 사실상 **폰지(Ponzi)** 상품을 팔아 대규모 피해. chit fund "이름"을 도용한 폰지였음. 중앙·주정부·SEBI가 대응했고, 서벵골 주의회는 예금자 보호 법안을 통과. → **합법적 chit fund와 chit를 가장한 폰지의 구분**이 핵심 교훈. (출처: lawfullegal.in/saradha-chit-fund-scam-analysis; shankariasparliament.com/article/chit-funds-saradha-scam; researchgate.net/publication/275219784)

---

### 1-3. susu (서아프리카·가나) — 개인 수금원(collector) 모델

susu는 ROSCA(그룹 회전)와는 또 다른 **개인 수금원 기반 저축 동원** 메커니즘으로, "사회적 강제"가 아니라 **신뢰받는 개인 중개자(수금원)**에 의존하는 변형이다.

#### 정의·메커니즘

- susu는 **개인 저축수금원(susu collector)**이 저축자들이 **매일 소액 정기 예치(daily deposit)**를 통해 저축을 쌓도록 돕는 비공식 저축 동원 장치다. 소정의 수수료를 받고 수금원이 안전한 보관과 (제한적) 신용 접근을 제공하는 **마이크로파이낸스의 일종**. (출처: en.wikipedia.org/wiki/Susu_collectors; imtfi.uci.edu/files/blog_working_papers/2014-1_ossei-assibey.pdf)
- 작동: 예치는 보통 한 달 동안 매일 소액으로 받고, 수금원은 **월말에 모은 돈을 돌려주되 그 대가로 '하루치 수금액'을 수수료로 가져간다.** (출처: Wikipedia Susu collectors)
- 즉 susu collector형은 **'마이너스 이자 저축'**: 저축자가 안전 보관·규율(저축 강제) 서비스를 위해 약 1/30(월 기준 하루치)을 지불한다. ROSCA형 susu(그룹 회전)도 카리브·서아프리카에 병존한다.

#### 어원·역사

- 어원: Akan어로 susu는 "plan(계획)" — 여기선 "일정 금액을 모으려고 사람들과 함께 계획함." Ga어라는 견해도 있다. (출처: Wikipedia Susu collectors)
- 역사: 가나의 소액금융 체계 안에 **최소 3세기**(약 300년) 이상 존재. 아프리카에서 가장 오래된 전통 뱅킹 체계 중 하나로, 미소기업의 창업·존속·발전 자금 동원 수단. (출처: iiste.org/Journals/index.php/JEDS/article/viewFile/4337/4405 — "Susu: A Dynamic Microfinance Phenomenon in Ghana"; researchgate.net/publication/297895520)
- 구성: 주로 **여성**들이 자조(self-help) 협동 모델로 모인다. 농촌·빈곤·저소득층의 저축 형성을 도와 경제·사회적 필요를 충족. (출처: 동상; tandfonline.com/doi/full/10.1080/08935696.2022.2159744 — Situating the West African System of Collectivity)

---

### 1-4. hui(會, 중화권) — 입찰형(biaohui)과 디폴트 연쇄

#### 구조

- hui(또는 hehui, 合會)는 중국 기원의 전통 ROSCA로, **10~40명**이 정기 고정 갹출로 공동기금을 만들고 이를 한 명씩 일시금으로 받는다. 수령 순서는 **추첨·입찰·협상**으로 정한다. (출처: grokipedia.com/page/Hui_(informal_loan_club); 검색 요약 — tandfonline.com 1540496X.2019.1587609)
- **입찰형(biaohui, 標會)**이 현대 중국의 지배적 형태(이자부). 일찍 pot을 받는 사람일수록 더 높은 이자를 물고, 끝까지 기다린 사람은 먼저 받은 사람들이 낸 이자를 받아 **순(純)이자 수취자**가 된다. biaohui에서는 **봉인 경매(sealed auction)**로 경쟁해 최고 입찰자(이자/할인 최고 제시자)가 pot을 일찍 받는다. (출처: grokipedia.com/page/Hui_(informal_loan_club))
- 역사 연구: 청대~민국기 산시성(Shanxi) ROSCA의 위험관리, 전전(prewar) 중국 ROSCA가 공동체 금융·경제발전의 뿌리였다는 경제사 연구가 다수. (출처: tandfonline.com/doi/full/10.1080/00076791.2023.2222662; onlinelibrary.wiley.com/doi/10.1111/ehr.13297 — Lowenstein 2024, *Economic History Review*)
- 위험관리 메커니즘 사례연구: 원저우(Wenzhou) 청난촌(Chengnan) biaohui의 리스크 관리. (출처: tandfonline.com/doi/abs/10.1080/1540496X.2019.1587609)

#### 디폴트·붕괴(원저우 위기)

- biaohui는 "지하금융(underground banking)"으로 확장되며 시스템 리스크를 키울 수 있다. **2011~2014 원저우 금융위기**는 중국의 '4조 위안 경기부양책'의 의도치 않은 결과로, 신용 팽창이 금리 신호와 생산구조를 왜곡한 끝에 발생. 2008 글로벌 위기 후 주문 급감으로 차입자들이 디폴트하자 지하은행이 연쇄 디폴트의 타격을 받았다. (출처: muse.jhu.edu/article/688052; scmp.com/.../underground-banking-may-become-thing-past-wenzhou; chinadaily.com.cn/china/2011-11/07/content_14046191.htm) → **사회적 강제는 소규모·동질 공동체에서 강하지만, 익명·대형·경기 충격 상황에선 연쇄 디폴트로 무너진다**는 점을 보여주는 거시 사례.

---

### 1-5. 마이크로파이낸스 — 그라민은행(Grameen Bank)과 그룹대출

#### 기원·기본 사실

- 1976년 방글라데시 치타공대 교수 **Muhammad Yunus**가 시작. 1974 방글라데시 기근 중 42가구에게 자기 돈 **US$27**을 빌려준 경험에서 출발(고리대 부담 없이 물건을 만들어 팔 종잣돈). Jobra 마을이 첫 대상지. **1983년 10월** 방글라데시 정부 조례로 독립 은행 'Grameen Bank'(벵골어로 '농촌/마을 은행')로 전환. (출처: en.wikipedia.org/wiki/Grameen_Bank)
- **2006년 그라민은행과 Yunus 공동 노벨평화상.** 64개국 이상에 유사 프로젝트 영감. (출처: Wikipedia Grameen Bank)
- 차입자의 **약 97%가 여성**. 은행은 차입자(대부분 빈곤 여성)들이 소유한다. (출처: Wikipedia Grameen Bank)
- 자립 운영: 1995년 이후 기부금 수령 중단, 1998년 이후 국내시장 차입 중단 — 예금만으로 대출 프로그램 수행. 1995년 이래 대출의 90%가 이자수입·고객예금으로 조달. 마을에서 모은 예금을 같은 공동체의 대출로 전환. (출처: Wikipedia Grameen Bank)

#### 그룹대출(group lending)·연대책임·사회적 담보 — ★핵심 메커니즘★

그라민의 혁신은 **그룹대출(group lending)**: 잠재 차입자들이 서로 **혈연이 아닌(unrelated) 5명**으로 차입 그룹을 만들어 서로에게 책임진다. (출처: Wikipedia Grameen Bank)

- **사회적 담보(social collateral)·연대책임(joint liability)의 원리**: 물리적 담보 요구를 **상호 책임**으로 우회한다. "마을을 담보로(with their village as collateral)" 소액을 받고, **동료 압력(peer pressure)과 그룹 책임이 극빈층의 담보·신용이력 부재를 대체**한다. (출처: Wikipedia Grameen Bank — solidarity lending; en.wikipedia.org/wiki/Solidarity_lending)
- **순차적 대출(staggered disbursement)**: 그룹 결성 몇 주 뒤 **먼저 2명**에게 대출 → 이들이 잘 갚으면 다음 사람들에게 확대. (출처: Wikipedia Grameen Bank)
- **점진적/동적 대출(progressive / dynamic lending)**: 상환 능력을 입증하면 시간이 갈수록 **더 큰 대출**에 접근. 미래 대출 접근권을 인질로 잡는 **동적 인센티브**. (출처: Wikipedia/검색 요약)
- **점진적(주간) 상환**: 그룹대출제 + **주 단위 분할상환(weekly-installment)** + 비교적 긴 만기. (출처: Wikipedia Grameen Bank)
- **16개 결의(Sixteen Decisions, 2023년 18개로 확대)**: 차입자들이 모임마다 제창하는 사회적 규범 서약(자녀 교육, 위생, 상호부조, "정기 모임 참석·정기 상환" 등). #14 "우리는 항상 서로 돕는다 — 누가 위험에 처하면 모두 돕는다", #16 "정기 모임에 참석하고 대출을 규칙적으로 갚는다." → **규범 내면화 + 공개 서약**이 상환 규율을 강화. (출처: Wikipedia Grameen Bank — 16 Decisions 표)
- **무계약·신뢰 기반**: 그라민과 차입자 사이엔 **법적 계약서가 없다(no written contract)** — 시스템은 신뢰로 작동. (출처: Wikipedia Grameen Bank)
- **강제 저축(내장 보험)**: 대출에 더해 비상·그룹 펀드에 소액 정기 저축을 의무화 → 우발사태에 대한 보험. (출처: Wikipedia Grameen Bank)
- **높은 상환율**: 일부 지역 **상환율 98% 초과**. 그룹대출(연대책임) 환경의 마이크로크레딧 상환율은 흔히 95% 초과로 보고. (출처: Wikipedia Grameen Bank; 검색 요약 — 95% 이상)

#### ★중요한 진화 — Grameen II / "연대책임은 사실상 비공식"★

- 그라민은 솔리데리티 렌딩(solidarity lending)으로 유명하지만, **실제로는 형식적(formal) 연대책임이 존재하지 않는다**: 상환 책임은 **개별 차입자에게만** 있고, 그룹원이 디폴트한 사람을 대신 갚을 **법적 의무는 없다.** 다만 **실무적으로는 그룹원들이 디폴트 금액을 메우고 나중에 본인에게서 회수하려는 경향**이 있다 — 왜냐하면 **그룹에 디폴트한 사람이 있으면 그라민이 그 그룹 전체에 추가 신용을 안 주기 때문.** (출처: Wikipedia Grameen Bank — Solidarity lending 절, cite 31) → 즉 그라민의 강제는 "법적 공동채무"가 아니라 **"미래 신용 접근의 동결(dynamic incentive)" + 동료 압력**이 핵심 동력.
- 이는 2000년대 초 그라민이 도입한 **Grameen Generalised System(GGS, 통칭 "Grameen II")**의 방향과 일치한다(엄격한 공식 연대책임에서 유연한 개별 책임+동료 압력+동적 인센티브로 이동). (배경: Wikipedia Grameen Bank 전반; 학술 일반 상식)

#### 마이크로파이낸스의 이론적 토대(왜 작동하나)

초기 이론연구들은 **연대책임 그룹대출이 역선택·도덕적 해이를 완화**함을 보였다(Stiglitz 1990, Varian 1990, Besley & Coate 1995, Ghatak & Guinnane 1999, Ghatak 2000). (출처: voxdev.org/voxdevlit/microfinance-issue-3/classic-features-microcredit)

- **역선택(누가 위험한지 모름) → 동료 선택(peer selection)**: Ghatak(1999, 2000)은 그룹을 **자기선택(self-selection)**으로 만들면 비슷한 위험도의 사람끼리 모이는 **동질적 매칭(assortative matching)**이 일어나, 정보 비대칭에도 파레토 우월 균형이 가능함을 보였다("당신이 어울리는 사람으로 선별한다 — Screening by the Company You Keep"). (출처: voxdev; researchgate.net/publication/4894636; econ.lse.ac.uk/staff/mghatak/ej.pdf)
- **도덕적 해이(빌린 뒤 게으름) → 동료 감시(peer monitoring)·동료 압력**: Stiglitz(1990), Banerjee/Besley/Guinnane(1994), Conning(2000)이 연대책임의 도덕적 해이 완화를 분석. 실증적으로 **동료 선택·감시·압력·동적 인센티브·매칭**이 신용그룹 간 도덕적 해이 변동의 대부분을 설명. (출처: voxdev; researchgate.net/publication/24114048 — Malawi 증거)
- 정리: **동료 선택(역선택 완화) + 동료 감시·압력(도덕적 해이 완화) + 동적 인센티브(집행)** = 마이크로크레딧이 담보 없이 작동하는 3대 기둥. (출처: 검색 요약 — voxdev, Armendáriz & Morduch *The Economics of Microfinance*)

#### ★비판·한계★

- **연대책임이 정말 상환율을 올리나? — RCT 증거는 회의적**: Giné & Karlan(필리핀 현장실험)은 기존 그룹책임 센터의 절반을 무작위로 **개별책임(individual liability)**으로 전환했더니 **상환율에 차이가 없었고**, 오히려 신규 고객 유치로 센터 규모는 더 커졌다. 또 신규 지역을 그룹/개별로 무작위 배정한 실험에서도 디폴트 변화 없음(다만 신규 그룹 생성은 줄어듦). **두 실험 모두 주간 모임은 유지** → "정기 모임·관계"가 "법적 공동채무"보다 더 중요할 수 있음을 시사. (출처: papers.ssrn.com/sol3/papers.cfm?abstract_id=981390 및 abstract_id=1407614 — "Group versus Individual Liability", Giné & Karlan)
- **과다채무(over-indebtedness)와 강압적 추심 — 안드라프라데시 위기(2010)**: 인도 안드라프라데시 주에서 과잉 대출로 차입자 과다채무·디폴트가 폭발. 2010년 말 200명 이상의 채무자가 자살(주정부 집계). MFI들이 강압적 추심에 의존했고, 극단적으로는 추심원이 **신용생명보험으로 대출을 갚으려고 차입자에게 자살을 종용**했다는 보도까지. 고금리(연 24~36%)가 채무함정을 만들었고, 가구당 평균 **동시 대출 9건**까지 치솟음. 적정 규제 부재가 과잉대출을 낳았고 안드라 MFI의 부실채권(NPA)이 96% 초과. SKS Microfinance가 차입자 자살과 연루되었다는 조사도. (출처: cgap.org/.../CGAP-Focus-Note-Andhra-Pradesh-2010; practicalactionpublishing.com/article/2271 — Over-indebtedness, coercion, and default; philanthropynewsdigest.org/news/investigations-link-sks-microfinance-to-borrower-suicides; dandc.eu/en/article/reasons-microfinance-tragedy-andhra-pradesh)
- 의미: **사회적 강제(동료 압력)는 양날의 칼** — 상환은 강제하지만, 과잉 대출·외부 추심 압력과 결합하면 **공동체 압력이 강압·수치·심리적 파탄으로 변질**될 수 있다.

---

### 1-6. P2P 렌딩(peer-to-peer lending) — 플랫폼·신용평가·사회적 데이터

#### 역사·플랫폼

- 현대 P2P 렌딩은 **2005년 영국 Zopa** 출범으로 시작. 1년 뒤 **2006년 미국 LendingClub·Prosper** 출범. 느린 전통 은행 대신 개인이 개인에게 온라인으로 직접 대출하는 마켓플레이스를 표방. (출처: en.wikipedia.org/wiki/Peer-to-peer_lending; p2pmarketdata.com/articles/p2p-lending-history)
- 초기 규제 충돌: **2008년 미국 SEC**가 P2P 상품을 증권(1933 증권법)으로 등록하라고 요구. 등록 절차가 까다로워 Prosper·LendingClub은 신규 대출을 일시 중단, Zopa는 미국 시장에서 철수. (출처: Wikipedia Peer-to-peer lending)

#### 작동 방식(마켓플레이스 렌딩)

전통 중개자(은행·신협)를 우회해 차입자와 대출자를 온라인 플랫폼으로 연결. 단계: (1) **신용평가** — 플랫폼 알고리즘이 신용점수·소득 등으로 신용등급(grade)을 부여, (2) **펀딩** — 승인된 대출을 온라인에 게시, 투자자들이 검토·자금 약정, 충분히 모이면 차입자에게 송금, (3) **상환 회수** — 플랫폼이 원리금을 회수해 수수료를 떼고 투자자에게 전달. 플랫폼은 차입자 대출수수료 + 투자자 정기수수료로 수익. (출처: p2pmarketdata.com/articles/marketplace-lending; supermoney.com/marketplace-lending)

#### 신용평가·사회적/관계 데이터 활용

- 기본은 전통 신용평가(신용이력·소득·고용)로 **위험등급(grade/score)** 부여. (출처: blog.brankas.com/Peer-to-Peer-Lending)
- **대안 데이터(alternative data)**: 일부 플랫폼은 전통 점수를 넘어 **휴대폰 사용 패턴, 온라인 쇼핑 행동, 소셜미디어 상호작용, 차입자의 사회적 네트워크**까지 분석해 신뢰성·안정성을 추정. 대안 신용평가는 과거 습관이 아닌 **요청 시점의 현재 지표(current metrics)**를 본다는 점이 차별점. (출처: infosysbpm.com/blogs/financial-services/harnessing-ai-in-peer-to-peer-lending; trustdecision.com/.../alternative-credit-scoring)

#### ★Prosper의 초기 "Groups" — 사회적/평판 렌딩의 실험과 실패★ (★우리 작업에 직결★)

- **2006년 출범 시 Prosper는 차입자에게 '그룹(Group)'을 만들도록 장려**했다. 각 그룹엔 그룹리더(보통 창업자)가 있고, 차입자들은 **공통점을 가진 사람끼리** 묶였다. **사회적 연결이 연체를 줄일 것**이라는 가설. 당시 그룹은 "Prosper 마켓플레이스의 심장"으로 불렸고, 그룹 구성원이면 **더 좋은 금리**를 받곤 했다. (출처: news.fintechnexus.com/prosper-groups-put-the-social-in-social-lending)
- **메커니즘 설계 의도**: 한 사람의 미상환이 그룹(과 그룹리더)의 평판에 **직접 타격**을 주게 묶어 **디폴트 비용을 극적으로 높이려** 했다. 가까운 공동체의 차입자가 **그룹의 평판과 동료 압력을 지렛대 삼아** 더 많은 입찰·더 낮은 금리를 끌어내고, 대출자에겐 더 낮은 디폴트율을 — 이것이 원래 철학. (출처: contracts.justia.com/.../prosper-marketplace — Group Leader Registration Agreement; news.fintechnexus.com)
- **결과 — 모델은 폐기됨(약 2008~2011 사이 de-emphasize)**: 5년 뒤 그룹은 크게 약화. **주된 이유: 그룹이 디폴트에 별 차이를 만들지 못했다.** Prosper 그룹이 작동하려면 차입자가 그룹과 **긴밀한 유대**를 갖고 **내부 처벌(inside-group punishment)**을 충분히 받아야 했는데, **그룹이 크고, 구성원이 불안정하며, 그룹리더에게 인센티브와 내부 상벌 체계가 없을 때** 이 조건이 충족되기 어려웠다. (출처: news.fintechnexus.com/prosper-groups-put-the-social-in-social-lending; prosper.com/downloads/research/dynamic-learning-selection-062008.pdf — Freedman & Jin) → **온라인의 약한·불안정한 유대 + 내부 제재·리더 인센티브 부재 ⇒ 사회적 담보가 작동 안 함**. 그라민/계가 작동한 조건(소규모·강한 유대·반복관계·실질적 배제 위협)의 거울상.

---

### 1-7. 관계형/평판 기반 대출(relationship lending, character-based lending)

#### relationship lending vs transactions-based lending

- **관계형 대출(relationship lending)**: 대출담당자(loan officer)가 기업·소유주·공동체와의 **상호작용을 통해 수집한 '정성(soft)' 정보**에 의존하는 대출 기술. (출처: papers.ssrn.com/sol3/papers.cfm?abstract_id=285937 — Berger & Udell; nber.org/system/files/working_papers/w8752/w8752.pdf — Stein "Does Function Follow Organizational Form?")
- **soft information(정성정보) vs hard information(정량정보)**:
  - **hard information** = 정량적·저장 쉬움·비대면 전달 가능(숫자로 기록, 수집자와 독립). → **거래 기반 대출(transactions-based lending)**과 결부.
  - **soft information** = 정성적·전달 어려움(평판, 신뢰성, 경영자 성품, 공동체 평판 등). → **관계형 대출**과 결부. (출처: ssrn 285937; nber w8752 — Stein)

#### 조직구조 효과(왜 작은 은행이 관계형에 강한가)

- 큰 위계조직은 hard 정보엔 강하지만 soft 정보엔 약하다 — hard 정보는 위계 상위로 전달하기 쉽지만 soft 정보는 그렇지 않다. **큰 은행은 '정보적으로 어려운' 신용에 덜 빌려주고, 더 먼 거리에서·더 비인격적으로·더 짧고 덜 배타적인 관계로 대출**하며 신용제약을 덜 완화한다. (출처: onlinelibrary.wiley.com/doi/10.1111/1468-0297.00682 — Berger & Udell 2002, *Economic Journal*; nber w8752 — Stein)
- 대출담당자가 soft 정보의 **저장소(repository)**이므로, 조직 전반에 대리인 문제(agency problem)가 생기고 이는 **작고·소수 경영층의 조직(소규모 커뮤니티 은행)**에서 가장 잘 해소된다. (출처: ssrn 285937; sciencedirect.com/.../S104295731100026X — Loan officers and relationship lending to SMEs)
- 커뮤니티 은행은 관계형 대출에서 여전히 강점("That Ship Has Not Sailed"). (출처: communitybanking.org/.../relationship-lending-that-ship-has-not-sailed-for-community-banks.pdf)

#### 커뮤니티 은행·신용조합(credit union) — 공동유대(common bond)가 담보를 대체

- **신용조합(credit union)**: 조합원이 소유하는 협동조합으로 **공동유대(common bond)**가 가입 자격을 규정. 세 가지: (1) 단일 공동유대(직장·결사 기반), (2) 복수 공동유대, (3) 지역(지리적) 공동유대. (출처: congress.gov/crs_external_products/IF/HTML/IF11713.html; coop.fandom.com/wiki/Bond_of_association)
- **공동유대 = 담보 대체물**: "common bond는 금융시스템 발전 초기 단계에서 **담보를 대체**한다." 라이파이젠 모델은 강한 지역적 유대를 강조 — **조합원들이 서로를 알고, 서로를 보증하며, 손실을 공유했다.** (출처: coop.fandom.com/wiki/Bond_of_association)
- **역사**: 1864년 **Friedrich Raiffeisen**이 독일에 최초의 농촌 신용조합 설립(비영리, 공동체가 자원을 모음). 1900년 **Alphonse Desjardins**가 라이파이젠·슐체-델리치 등과 교류 후 캐나다에 협동조합 금융기관(Desjardins) 도입. **비영리** → 법인세 면제. (출처: en.wikipedia.org/wiki/Desjardins_Group; en.wikipedia.org/wiki/Raiffeisenbank; britannica.com/money/credit-union)
- **character-based lending(성품 기반 대출)**: 담보·점수 대신 차입자의 **성품·평판·공동체 내 신뢰**로 대출. 라이파이젠형 공동유대 대출이 그 역사적 원형. (출처: coop.fandom.com/wiki/Bond_of_association; legalclarity.org/why-were-credit-unions-created-the-original-mission)

---

### 1-8. 사회적 자본(social capital)과 신용 — 신뢰가 담보를 대체하는 원리

#### 이론적 토대 (Putnam · Coleman · Granovetter · Bourdieu)

- **Granovetter — 배태성(embeddedness)·약한 연결(weak ties)**: 경제 행위가 사회관계망에 "배태(embedded)"되어 있다는 개념. 그의 약한 연결 이론(strength of weak ties)에서, 서로 다른 사회 서클을 잇는 **약한 관계가 새롭고 이질적인 정보를 얻는 다리(bridge)** 역할을 한다. (출처: scispace.com/pdf/social-capital-in-bourdieu-s-coleman-s-and-putnam-s-theory; socialcapitalresearch.com/.../Introduction-to-Social-Capital-Theory.pdf)
- **Coleman — 사회구조에 깃든 사회적 자본**: 사회적 자본은 사람들 사이 **관계의 사회구조에 깃들어 있고**, "그것이 없으면 달성 불가능했을 목적의 달성을 가능케 한다." 배태성 개념을 Granovetter에게서 차용. Coleman은 **친족·이웃의 강한 연결(strong ties)**에 주목. (출처: scispace.com/pdf/...; researchgate.net/publication/324645902)
- **Putnam — 신뢰·시민결사, 『Bowling Alone』**: 사회적 자본을 대중화. 그는 **지역 조직·자발적 결사 같은 약한 연결**에 주목하며, 사회적 자본은 본질적으로 사회에 가용한 **'신뢰(trust)'의 양**이라 보았다. 『Bowling Alone』의 우려: 미국인의 사회적 고립 심화와 결사활동 쇠퇴가 사회적 자본 고갈을 낳는다. (출처: beyondintractability.org/bksum/putnam-bowling; socialcapitalresearch.com/wp-content/uploads/2018/11/Functions-of-Social-Capital.pdf)
- **사회적 자본의 기능 분류**: bonding(결속, 동질 집단 내)·bridging(가교, 이질 집단 간)·linking(연결, 권력 위계 간). (출처: socialcapitalresearch.com/.../Functions-of-Social-Capital.pdf)

#### 신뢰가 담보를 대체하는 원리(작동 정리)

비공식 금융에서 **신뢰·사회적 자본이 물적 담보를 대체**하는 경로를 통합하면:
1. **정보(역선택 완화)** — 공동체는 누가 신뢰할 만한지 안다(soft information). 동료 선택·공동유대로 나쁜 위험을 사전 배제. (출처: Ghatak — voxdev; coop.fandom.com)
2. **감시(도덕적 해이 완화)** — 가까운 동료가 차입자의 행동을 감시·압박. (출처: Stiglitz 1990 — voxdev)
3. **집행(전략적 디폴트 억제)** — 담보 대신 **평판 손상·미래 배제·미래 신용 동결·동료 압력**이 디폴트 비용을 높인다. 법원 집행이 안 되는 곳에서 **사회적 제재가 사실상의 집행**. (출처: legalclarity.org/what-are-roscas; ncbi PMC6114866; Wikipedia Grameen Bank)
4. **반복 게임·관계 자본** — 반복 상호작용이 신뢰를 쌓고, 그 신뢰 자체가 담보(사회적 담보)가 된다. (출처: Wikipedia ROSCA; Vélez-Ibáñez confianza — Wikipedia Tanda)

#### 실증 — P2P에서도 사회적 자본이 상환에 영향

- "Social Capital, Trusting, and Trustworthiness: Evidence from Peer-to-Peer Lending"(*Journal of Financial and Quantitative Analysis*)은 P2P 렌딩에서 **사회적 자본이 신뢰(trusting)와 신뢰성(trustworthiness)에 영향**을 줌을 실증. → 사회적 자본 개념이 디지털 대출에도 측정 가능하게 작동. (출처: cambridge.org/core/journals/journal-of-financial-and-quantitative-analysis/article/social-capital-trusting-and-trustworthiness-evidence-from-peertopeer-lending)
- 단, **Prosper Groups의 실패(1-6)**가 보여주듯, 사회적 자본은 **유대의 강도·안정성·실질적 제재 가능성**이 받쳐줄 때만 디폴트를 억제한다. 약하고 불안정한 온라인 유대로는 효과가 사라진다.

---

### 1-9. 횡단 정리 — "사회적 강제가 디폴트를 억제하는 조건"

(여러 시스템을 가로질러 도출되는 메커니즘 정리 — 모두 §1-1~1-8 출처 기반)

**사회적 강제가 강하게 작동하는 조건(계·그라민·라이파이젠형):**
- 소규모이고 구성원이 서로를 **반복적으로** 마주침(반복 게임).
- 구성원이 서로를 **선택**하고(self-selection) 평판 정보를 공유(soft info).
- 디폴트 시 **실질적 비용**이 존재: 공동체 평판 손상 + 미래 ROSCA/대출 **배제** + 미래 신용 **동결**(동적 인센티브).
- 거래·잔액이 **공개**되어 감시가 쉬움(ROSCA의 공개 모임).
- 손실 규모가 구조적으로 **한정**됨(시간 제한·순차 지급).

**사회적 강제가 무너지는 지점(원저우·안드라·Prosper Groups·계 사기):**
- 익명·대형화로 유대가 약해지고 감시·제재가 불가능(Prosper Groups).
- 권력/자금이 **중앙 신뢰자**(계주·foreman·MFI 본부)에 집중되어 그가 배신하면 사회적 강제가 우회됨(계주 횡령, Saradha 폰지).
- **거시 충격**으로 동시다발 디폴트가 나면 동료 압력으로 막을 수 없음(원저우).
- 과잉대출·외부 추심과 결합하면 사회적 압력이 **강압·수치·파탄**으로 변질(안드라프라데시).
- 법적 집행 불가 + 사회적 집행도 약하면 떼먹기 유인이 지배(Bouman의 계약위반 내재 위험).

---

### 출처

ROSCA / 계 / 변형
- Rotating savings and credit association — https://en.wikipedia.org/wiki/Rotating_savings_and_credit_association
- Tanda (informal loan club) — https://en.wikipedia.org/wiki/Tanda_(informal_loan_club)
- ROSCAs | The Money Wiki — https://faisalkhan.com/knowledge-center/payments-wiki/r/rotating-savings-and-credit-associations-roscas/
- What Are ROSCAs: How They Work and Tax Implications — https://legalclarity.org/what-are-roscas-how-they-work-and-tax-implications/
- Besley, Coate & Loury (1993), The Economics of ROSCAs, AER 83:792–810 — https://ideas.repec.org/a/aea/aecrev/v83y1993i4p792-810.html ; https://researchonline.lse.ac.uk/id/eprint/1613/ ; https://www.scirp.org/reference/referencespapers?referenceid=1914882
- ROSCAs: the choice between random and bidding allocation — https://www.sciencedirect.com/science/article/abs/pii/S0304387899000395
- ROSCAs: A scoping review — https://www.sciencedirect.com/science/article/pii/S2772655X23000393
- Reciprocity and exclusion in informal financial institutions (PLOS One / PMC) — https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0202878 ; https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6114866/
- Enforcement in informal saving groups (Siwan Anderson) — https://econ.cms.arts.ubc.ca/wp-content/uploads/sites/38/2013/05/pdf_paper_siwan-anderson-enforcement-organizational-design.pdf
- Enforcement Problems in ROSCAs: Evidence from Benin — https://www.researchgate.net/publication/332488711_Enforcement_Problems_in_ROSCAs
- Bouman (1995), Rosca: On the Origin of the Species, Savings and Development 19(2):117–148 — https://www.jstor.org/stable/25830410
- Geertz (1956), The Rotating Credit Association: a middle rung in development (MIT)

계(한국)
- Gye: The Traditional Korean Savings System Explained — https://www.animascorp.com/gye-the-traditional-korean-savings-system-explained/
- The Legality of "Kye" Loans in Korean Immigrant Communities — https://natlawreview.com/article/legality-kye-loans-korean-immigrant-communities
- Will New Jersey Courts Enforce Rotating Credit Association Agreements? — https://www.pashmanstein.com/publication-will-new-jersey-courts-enforce-rotating-credit-association-agreements
- 계돈(곗돈)의 원리, 운영방식(낙찰계·번호계) — https://m.cafe.daum.net/skrckfrP123/9zMN/7
- 순번계·낙찰계 파계시 곗돈 정산 방법 판례 — https://yjlim12345.mycafe24.com/순번계-낙찰계-파계시-곗돈-정산-방법-판례-광주민사변호사/
- 계주와 곗돈…계를 아시나요 — https://www.etoday.co.kr/news/view/2537630
- 부녀계의 유형(우리역사넷) — https://contents.history.go.kr/mobile/km/view.do?levelId=km_013_0040_0040_0010

chit fund (인도)
- Chit funds: Q & A (PRS India) — https://www.prsindia.org/theprsblog/chit-funds-q
- The Chit Funds Act, 1982 — https://indiankanoon.org/doc/194827648/
- Saradha Chit Fund Scam Analysis — https://lawfullegal.in/saradha-chit-fund-scam-analysis/
- Chit Funds & Saradha Scam — https://www.shankariasparliament.com/article/chit-funds-saradha-scam
- A Case Study of Chit Fund Scam In India — https://www.researchgate.net/publication/275219784_A_Case_Study_of_Chit_Fund_Scam_In_India

susu (서아프리카/가나)
- Susu collectors — https://en.wikipedia.org/wiki/Susu_collectors
- Susu Operations in Ghana (IMTFI 2014-1, Ossei-Assibey) — https://www.imtfi.uci.edu/files/blog_working_papers/2014-1_ossei-assibey.pdf
- Susu: A Dynamic Microfinance Phenomenon in Ghana (IISTE) — https://www.iiste.org/Journals/index.php/JEDS/article/viewFile/4337/4405
- The Role of Susu… (ResearchGate) — https://www.researchgate.net/publication/297895520
- Situating the West African System of Collectivity — https://www.tandfonline.com/doi/full/10.1080/08935696.2022.2159744

hui (중화권) / 원저우
- Hui (informal loan club) — Grokipedia — https://grokipedia.com/page/Hui_(informal_loan_club)
- Risk Management Mechanism of China's Bidding ROSCA (Wenzhou Chengnan) — https://www.tandfonline.com/doi/abs/10.1080/1540496X.2019.1587609
- Risk management in prewar China (Shanxi ROSCAs) — https://www.tandfonline.com/doi/full/10.1080/00076791.2023.2222662
- ROSCAs in prewar China (Lowenstein 2024, Economic History Review) — https://onlinelibrary.wiley.com/doi/10.1111/ehr.13297
- The Financial Crisis in Wenzhou — https://muse.jhu.edu/article/688052
- Underground banking… Wenzhou (SCMP) — https://www.scmp.com/business/banking-finance/article/1089508/underground-banking-may-become-thing-past-wenzhou

마이크로파이낸스 / 그라민
- Grameen Bank — https://en.wikipedia.org/wiki/Grameen_Bank
- Solidarity lending — https://en.wikipedia.org/wiki/Solidarity_lending
- Joint Liability Lending and the Peer Selection Effect (Ghatak) — https://econ.lse.ac.uk/staff/mghatak/ej.pdf ; https://www.researchgate.net/publication/4894636
- The economics of lending with joint liability (Ghatak & Guinnane) — https://personal.lse.ac.uk/ghatak/jde2.pdf
- Group lending without joint liability (Ghatak) — https://personal.lse.ac.uk/GHATAK/IJ.pdf
- Unpacking features of the classic microcredit model (VoxDev) — https://voxdev.org/voxdevlit/microfinance-issue-3/classic-features-microcredit
- Determinants of Moral Hazard in Microfinance (Malawi) — https://www.researchgate.net/publication/24114048
- Group vs Individual Liability: A Field Experiment in the Philippines (Giné & Karlan) — https://papers.ssrn.com/sol3/papers.cfm?abstract_id=981390
- Group vs Individual Liability: Long Term Evidence (Giné & Karlan) — https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1407614
- CGAP Focus Note: Andhra Pradesh 2010 — https://www.cgap.org/sites/default/files/CGAP-Focus-Note-Andhra-Pradesh-2010-Global-Implications-of-the-Crisis-in-Indian-Microfinance-Nov-2010.pdf
- Over-indebtedness, coercion, and default (Andhra Pradesh) — https://practicalactionpublishing.com/article/2271/
- Investigations Link SKS Microfinance to Borrower Suicides — https://philanthropynewsdigest.org/news/investigations-link-sks-microfinance-to-borrower-suicides
- Tragedy in Andhra Pradesh (D+C) — https://www.dandc.eu/en/article/reasons-microfinance-tragedy-andhra-pradesh

P2P 렌딩
- Peer-to-peer lending (Wikipedia) — https://en.wikipedia.org/wiki/Peer-to-peer_lending
- The History of Peer-to-Peer Lending (P2PMarketData) — https://p2pmarketdata.com/articles/p2p-lending-history/
- Marketplace Lending: What It Is, How It Works (P2PMarketData) — https://p2pmarketdata.com/articles/marketplace-lending/
- P2P Lending: Credit Scoring and Risk Assessment (Brankas) — https://blog.brankas.com/Peer-to-Peer-Lending
- Harnessing AI in P2P Lending (Infosys BPM) — https://www.infosysbpm.com/blogs/financial-services/harnessing-ai-in-peer-to-peer-lending-revolutionizing-credit-accessibility.html
- Alternative Credit Scoring (TrustDecision) — https://trustdecision.com/resources/blog/alternative-credit-scoring-digital-transformation-in-banking-financial-inclusion
- Prosper Groups Put the Social in Social Lending (Fintech Nexus) — https://news.fintechnexus.com/prosper-groups-put-the-social-in-social-lending/
- Dynamic Learning and Selection: the Early Years of Prosper.com (Freedman & Jin) — https://www.prosper.com/downloads/research/dynamic-learning-selection-062008.pdf
- Prosper Marketplace Group Leader Registration Agreement — https://contracts.justia.com/companies/prosper-marketplace-inc-3369/contract/968192

관계형 대출 / 커뮤니티 은행 / 신용조합
- Small Business Credit Availability and Relationship Lending (Berger & Udell 2002, Economic Journal) — https://onlinelibrary.wiley.com/doi/10.1111/1468-0297.00682 ; https://papers.ssrn.com/sol3/papers.cfm?abstract_id=285937
- Does Function Follow Organizational Form? (Stein, NBER w8752) — https://www.nber.org/system/files/working_papers/w8752/w8752.pdf
- Loan officers and relationship lending to SMEs — https://www.sciencedirect.com/science/article/abs/pii/S104295731100026X
- Relationship Lending: That Ship Has Not Sailed for Community Banks — https://www.communitybanking.org/-/media/files/communitybanking/2024-papers/relationship-lending-that-ship-has-not-sailed-for-community-banks.pdf
- Bond of association (Cooperatives Wiki) — https://coop.fandom.com/wiki/Bond_of_association
- Why Were Credit Unions Created: The Original Mission — https://legalclarity.org/why-were-credit-unions-created-the-original-mission/
- Credit union (Britannica Money) — https://www.britannica.com/money/credit-union
- Desjardins Group — https://en.wikipedia.org/wiki/Desjardins_Group
- Raiffeisenbank — https://en.wikipedia.org/wiki/Raiffeisenbank
- Credit Unions (CRS, congress.gov) — https://www.congress.gov/crs_external_products/IF/HTML/IF11713.html

사회적 자본
- Social capital in Bourdieu's, Coleman's and Putnam's theory — https://scispace.com/pdf/social-capital-in-bourdieu-s-coleman-s-and-putnam-s-theory-l7711ppvlt.pdf
- Introduction to Social Capital Theory (Claridge) — https://www.socialcapitalresearch.com/wp-content/uploads/edd/2018/08/Introduction-to-Social-Capital-Theory.pdf
- Functions of social capital – bonding, bridging, linking — https://www.socialcapitalresearch.com/wp-content/uploads/2018/11/Functions-of-Social-Capital.pdf
- Bowling Alone (Putnam) summary — https://www.beyondintractability.org/bksum/putnam-bowling
- Social Capital, Trusting, and Trustworthiness: Evidence from P2P Lending (JFQA) — https://www.cambridge.org/core/journals/journal-of-financial-and-quantitative-analysis/article/social-capital-trusting-and-trustworthiness-evidence-from-peertopeer-lending/3F9399DFEDA6D5AADB71D939C6F4283E

---

## 2. 매핑 (기존 개념 → 우리 4층)

| 기존 개념 | 한 줄 정의 | 우리 4층 대응 위치 | 정합 | 비고 |
|---|---|---|---|---|
| ROSCA/계 | 회전저축신용, 사회적담보로 디폴트억제 | **K2 호혜원장(𝒲)·2층 EM fold** | ○○○ | 우리 모델의 직접 선조 |
| 사회적 담보(social collateral) | 평판·관계가 담보 | **우리 핵심 명제(신뢰=담보)** | ○○ | "신뢰 잔액이 담보" |
| 평판손상·배제·미래신용 동결 | 디폴트 비용(dynamic incentive) | **3층 신용 하락 + PHI-1③** | ○ | "미래 신용 동결"=정량 신용 하락으로 구현 |
| 그라민 그룹대출·연대책임 | N인 상호책임 | **집단(N인) fold(H8)** | ○ | — |
| ★Grameen II: 형식적 연대책임≠실제동력 | 실제는 동적인센티브+동료압력 | **PHI-3 출력 활용 방식** | ○○ | 연대를 법적공동채무 말고 미래신용으로 |
| 동료선택(peer selection, Ghatak) | 자기선택 매칭=역선택완화 | 1층 관계형성·이음 | △ | 누가 누구를 이음했나=동료선택 신호 |
| 동료감시(peer monitoring) | 도덕적해이 완화 | CS 유대·반복 상호작용 | △ | — |
| 관계형 대출 soft information | 정성정보(평판·성품) | **1층 액션·역할 신호(H13)** | ○ | soft info를 구조화 데이터로 |
| 신용조합 공동유대(common bond) | 유대가 담보 대체 | 집단·"우리"(신뢰망) | ○ | — |
| 사회적자본(Putnam/Coleman/Granovetter) | 신뢰의 양·연결 | "우리의 온기"·신뢰망·R축 | ○ | bonding/bridging=R축 |
| ★Prosper Groups 실패 | 약한 온라인유대→사회적담보 무효 | **우리 시도의 거울상 경고** | 경고 | 강한 실제유대 데이터여야 |
| ★안드라프라데시 위기 | 과잉대출+강압추심→파탄 | **윤리·과잉대출 경고** | 경고 | 사회적 압력의 어두운 면 |

---

## 3. 검토 (정합 · 엇나감 · 메울 갭 · 배울 것)

**정합 총평.** **이 영역이 우리 모델과 가장 정합한다 — 사실상 우리가 하려는 것의 아날로그·역사적 선조다.** 계(ROSCA)는 K2 호혜원장(𝒲)이고, "사회적 담보(평판·관계가 담보)"는 우리 핵심 명제 그 자체이며, "평판손상·미래 배제·미래 신용 동결"은 우리 3층 신용 하락·리스크 전파로 구현된다. 정보경제학 3문제(역선택→동료선택, 도덕적해이→동료감시, 전략적디폴트→평판·배제)를 사회적으로 푸는 구조가 곧 우리 설계의 논리다.

**가장 중요한 발견(우리 설계에 직결).**
1. **Grameen II — 형식적 연대책임이 동력이 아니다.** 실제 상환을 끌어내는 건 *법적 공동채무*가 아니라 **동적 인센티브(미래 신용 접근 동결) + 동료 압력**이다. → 우리도 연대를 법적 공동채무로 만들지 말고 **PHI-3 신용 출력의 '미래 접근권'으로 설계**해야 한다. (Giné·Karlan RCT: 개별책임으로 바꿔도 상환율 차이 없음 — 단 *정기 모임*은 유지 → 관계 > 법적책임.)
2. **Prosper Groups 실패 = 우리 시도의 거울상 경고.** 디지털로 사회적 신뢰를 신용에 쓰려던 바로 그 시도가 **약하고 불안정한 온라인 유대 + 내부 제재 부재**로 실패했다. 우리의 방어선은 **경조사라는 강한 실제 유대(부조·참석은 비용을 치른 실제 관계 행위)** — 약한 온라인 팔로우가 아니다. 이 차이가 생사를 가른다.

**논리적으로 엇나가는·주의할 지점.**
1. **확장성의 본질적 한계.** 사회적 강제는 *소규모·동질·반복* 공동체에서 작동한다. 우리는 *대규모·디지털*로 확장하려 한다 — 원저우 위기(대형화·익명화·거시충격으로 연쇄 붕괴)가 그 한계를 보여준다.
2. **사회적 압력의 폭력성.** 안드라프라데시(과잉대출+강압추심→자살)는 관계 기반 신용·압력이 *흉기*가 될 수 있음을 보여준다. 신용을 대출에 연결할 때 윤리·과잉대출 방지가 필수.

**우리가 메울 수 있는 갭(차별화).**
1. **사회적 담보의 정량화·확장.** 계·그라민은 정성적·소규모. 우리는 부조·참석·역할을 *측정·점수화*하고 *디지털 네트워크*로 확장.
2. **soft information의 구조화.** "성품·평판"이라는 정성정보를 역할 배정(주례·사회자)·참석·부조라는 *측정 가능한* 신호로(H13).
3. **"미래 신용 동결"의 디지털 구현.** Grameen II의 실제 동력을 정량 신용 점수로.

**배울 것·경고.** Grameen II(연대=미래신용, not 법적채무) · Prosper(강한 실제 유대 필수) · 원저우·안드라(확장성 한계·윤리 가드레일).
