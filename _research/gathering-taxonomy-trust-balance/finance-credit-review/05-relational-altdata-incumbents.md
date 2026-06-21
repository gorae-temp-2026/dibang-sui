# 05. 현대 상용 관계·대안데이터 신용 (선례) — 리서치

> 범위: "인간관계·대안데이터를 신용평가에 넣는" 현대 상용·연구 선례(즈마신용/Lenddo/Tala·Branch/소셜네트워크 ML 학술/한국 대안신용)와 그 규제·윤리(한국 신용정보법·개인정보보호법, EU AI Act)를 출처와 함께 순수 외부 수집. 내부 모델 비참조. 빠르게 변하는 분야이므로 2024~2026 현황을 WebSearch/web_fetch로 교차확인. (2026-06-17)

---

## 1. 리서치 (수집)

### 1-0. 전체 지형 한눈에 — "관계를 신용에 넣었다"는 4가지 서로 다른 일

"관계·대안데이터 기반 신용평가"라는 한 단어 아래 **메커니즘이 전혀 다른 4종**이 섞여 있다. 이걸 먼저 갈라야 선례 분석이 정확해진다.

1. **소셜그래프 그 자체를 점수로** (Lenddo 초기, Sesame의 인맥 5%) — "네 친구가 누구냐 / 친구들이 어떻게 행동하느냐"를 신용신호로. **가장 직접적인 '관계=신용'.** 결과적으로 가장 많이 후퇴·폐기된 계열.
2. **스마트폰 행동·통신 메타데이터** (Tala, Branch, Óskarsdóttir 학술) — 연락처 수·통화패턴·SMS·앱 사용. 표면상 '관계' 같지만 실제로 예측력의 핵심은 **개인의 행동 규칙성**(요금 납부, 통화 규칙성)이지 *관계망의 구조*가 아니다(후술 학술 결과).
3. **대안 거래데이터** (한국 인터넷은행·NF스코어·통신3사) — 통신비·쇼핑매출·구독·이체 실적. **관계 데이터가 아니라 비금융 '거래/행동' 데이터.** 한국 선례는 거의 전부 여기에 속한다(중요).
4. **소프트정보 기반 관계금융(relationship lending)** (BIS WP 1244) — 은행원이 오랜 거래로 축적한 '관계'. 이건 **개인 소셜네트워크가 아니라 은행-차주 양자 관계**다. 용어가 같을 뿐 우리 주제와 다른 갈래(주의).

핵심 통찰(미리): **'친구가 누구냐(소셜그래프)'를 직접 점수화한 계열은 거의 다 실패하거나 후퇴했고, 살아남은 상용 대안신용은 전부 '거래·행동 데이터'다.** 우리(경조사 호혜·결혼식 관측)는 1번처럼 보이지만 실제 데이터는 "관계망 구조"가 아니라 "관측된 호혜 거래"라는 점에서 3번에 더 가깝다. **단 주의(검증 보강): 이는 데이터의 *형식*이 그렇다는 것이고, *리스크 구조*(부조 상대방 동의·gaming·AI Act '무관한 사회맥락')는 오히려 1번 소셜그래프와 동형이다 — 형식과 리스크의 위치가 다르다(§3).** 이 구분이 §3 검토의 핵심이 될 것.

---

### 1-1. 즈마신용 (Sesame Credit / 芝麻信用, Ant Group, 2015~) — 가장 중요

**출처(핵심):** Wikipedia "Zhima Credit" https://en.wikipedia.org/wiki/Zhima_Credit (Liu 2024 Princeton UP·Brussee 2023 Palgrave 인용) · What's on Weibo 백그라운더 https://www.whatsonweibo.com/insights-into-sesame-credit-top-5-ways-to-use-a-high-sesame-score/ · Liu & Xu, "Sesame (Zhima) Score: 'Social Credit Score' or FICO-like Credit Score?" (Univ. of Edinburgh CER, 2019) https://cer.business-school.ed.ac.uk/wp-content/uploads/sites/55/2019/07/Y89-Sesame-Zhima-Score-%E2%80%98Social-Credit-Score%E2%80%99-or-FICO-like-Credit-Score-Liu.pdf · WIRED(Matsakis 2019) "How the West Got China's Social Credit System Wrong" https://www.wired.com/story/china-social-credit-score-system/ · CNBC 2017 https://www.cnbc.com/2017/03/16/china-social-credit-system-ant-financials-sesame-credit-and-others-give-scores-that-go-beyond-fico.html

#### (a) 무엇인가 — 민간 상업 점수, 350~950

- 즈마신용(芝麻信用, Zhīma Xìnyòng; 영어명 Sesame Credit)은 **알리바바 계열 Ant Group(앤트그룹)이 운영하는 민간 신용점수·로열티 프로그램**. 2015년 1월 28일 출시. 중국인민은행(PBOC)이 비은행 기관의 개인신용정보업을 일시 개방하며 **민간 8개 시범사(zhengxin pilot)** 중 하나로 허가받아 시작. (Wikipedia, What's on Weibo)
- **점수범위 350~950.** 600 이상부터 혜택, 600~650 '좋음', 700~950 매우 높음. 신규 가입자는 보통 600에서 시작. (What's on Weibo) — 이 350~950 범위가 미국 FICO·독일 Schufa를 본떴다는 게 정설. (Wikipedia)
- **규모:** 2017년 시점 5억 2천만 명(520M users) 사용 추정(What's on Weibo). 알리바바 마켓플레이스 실명 가입자 3억+, 소상공인 3,700만+의 데이터로 구동(Wikipedia). 즉 **세계 최대 규모의 민간 대안신용점수 실험**이었다.

#### (b) 점수 구성요소 — '인간관계(人脉) input'이 실제로 들어갔는가? → **그렇다(초기). 단 가중 5%, 그리고 후퇴.**

5개 카테고리로 구성되며, 자주 인용되는 가중치(여러 분석 출처가 제시하나 **Ant 공식 미공개**라 '추정치'):

| 카테고리 | 가중 | 내용 |
|---|---|---|
| 신용이력(Credit History) | 35% | 과거 결제·부채 (공과금·할부·범칙금 납부 등, 주로 알리페이 경유) |
| 이행능력(Fulfillment/Behavioral Financial) | 25% (일부 출처 20%) | 알리페이 잔액, 화베이(Huabei) 등 |
| 행동·선호(Behavior & Preferences) | 20~25% | 계정 활동성, 구매 빈도 등 온라인 행동 |
| 개인특성(Personal Characteristics) | 15% | 학력·주소·실명등록 정확성 |
| **인간관계(Interpersonal Relationships / 人脉关系)** | **5%** | **온라인 인맥 수, 연락처 내 영향력, 친구와의 상호작용** |

(출처: What's on Weibo는 "5% 인맥관계 = 온라인 contacts 수, 영향력, 친구와의 interaction"으로 명시. Wikipedia는 "Interpersonal Relationships = reflect the online characteristics of a user's friends"로 기재. 로버트 앤더슨/CNBC 등도 "5% — 친구가 누구냐만이 아니라 그들과 *어떻게 행동하느냐*"라고 일관 보고.)

→ **결론(인맥 input 사용 여부):** 즈마신용은 **세계 최초로 소셜네트워크를 신용평가에 명시적으로 넣은 상업 점수**이며, '인간관계' 카테고리가 **공식 5개 차원 중 하나로 실재**했다. 단 **가중은 5%로 가장 작았고**, '친구 수'보다 '친구의 질·상호작용'을 본다는 식으로 설명됐다. (Wikipedia, What's on Weibo, CNBC)

#### (c) 알리페이 생태계 활용 — 보증금 면제·대출·공유서비스

What's on Weibo가 정리한 고득점 혜택(중국 일상에서 실제 작동):
- **보증금 면제:** 공유자전거(Hello Bike·Ofo, 650+), 우산·보조배터리 공유, 호텔·렌터카, 일부 아파트 임대.
- **대출:** 화베이(Huabei, 알리페이 내 신용결제 "그냥 써")·제베이(Jiebei) 한도가 점수에 연동. 750+면 화베이 한도 ~2만 위안.
- **선체험 후결제:** Tmall 700+ "입어보고 맘에 안 들면 반품"(2018.9~), 750+ 신차·신폰 무료 체험.
- **공공·생활:** 신용의료(650+, 병원 선진료 후결제·대기단축), 도서관 카드 무보증(550+), 기차역 라운지(650+).
- **혼인중개:** 바이허왕(Baihe.com) 데이팅 프로필에 즈마점수 연동(2015~). (Wikipedia, BBC)

#### (d) 중국 정부 사회신용제도(SCS)와의 구분 — **별개의 민간 점수다(자주 혼동)**

이게 가장 흔한 오해이므로 명확히:
- **즈마신용 = 민간 상업 점수.** 운영 주체 Ant Group(민간). 알리바바·알리페이 생태계 내부에서만 작동하며 **국가 처벌 메커니즘과 차단(ring-fenced)**돼 있음. "벌보다 보상" 설계(혜택 부여 중심). (CNBC, WIRED)
- **국가 사회신용제도(Social Credit System) = 정부 시스템.** 60여 개 전국 블랙리스트(탈세·식품안전·증권사기 등) + 수백 개 지방정부 시범의 모자이크. **통일 점수가 아니며** 상호운용 안 됨, 직접 영향받는 사람도 상대적으로 적음. (Wikipedia "Social Credit System", ChinaTalk "Five misconceptions", WIRED)
- **둘이 합쳐진 적 없음.** WIRED(2019)·Liu(2024)가 명확히: 서구 언론이 "즈마=전 국민 사회신용점수"로 오보를 냈으나, 즈마는 시범 zhengxin 메커니즘이었고 국가 금융시스템과 연결된 적 없다. "비디오게임 많이 하면 점수 깎인다"류는 **실제 구현된 적 없는** 도시전설(앤트 기술이사의 인터뷰 발언이 와전). (Wikipedia, Liu 2024 인용)
- **2018년 PBOC가 알리바바·텐센트의 개인신용 라이선스 발급을 명시적으로 차단** — 즈마식 350~950 점수가 전국 단위로 가는 것을 막음. 대신 8개 시범사가 합쳐 **국가-민간 합작 '신련(信联)' = 바이항정신(Baihang Credit, 百行征信)** 으로 통합. (What's on Weibo, Wikipedia)

#### (e) 2018 옵트인 논란 — 알리페이 연말결산 기본동의 사고

**출처:** SCMP https://www.scmp.com/tech/china-tech/article/2126772/chinas-ant-financial-apologises-over-alipay-user-data-gaffe · Sixth Tone "After Privacy Concerns, Zhima Credit Admits It Was 'Stupid'" https://www.sixthtone.com/news/1001503 · CGTN https://news.cgtn.com/news/78637a4e35637a6333566d54/index.html

- 2018년 1월 초, Ant가 알리페이 앱에서 **연말 사용결산("Alipay Annual User Footprint Report")** 을 띄움. 그런데 보고서 안에 **아주 작은 글씨로 "즈마신용 가입·점수 표시에 동의" 박스가 기본 체크(default opt-in)** 돼 있었음. 한 변호사가 이를 발견·공론화.
- 즈마신용을 미사용자에게 **기본동의로 끌어들여 가입자 기반을 늘리려 했다**는 비판. Ant는 웨이보에 사과("동기는 틀리지 않았으나 *극도로 멍청한*(extremely stupid) 방식으로 고지했다")하고, 비자발적 가입자는 실제 등록하지 않겠다고 발표. (SCMP, Sixth Tone, CGTN)
- 의미: **동의(consent) 설계의 실패 사례**로 이후 대안데이터 신용의 프라이버시 논쟁에서 반복 인용됨.

#### (f) 현황(2024~2026) — **인맥·소셜 데이터를 아직도 쓰나? → 사실상 '로열티 프로그램'으로 후퇴. 신용평가로서는 실패 판정.** (여기 nuance가 핵심)

이 부분이 가장 중요하고 단정 전에 교차확인이 필요한 지점. 출처별로:

- **Liu(2024, Princeton UP) — 가장 강한 1차 평가:** Wikipedia가 인용한 *From Click to Boom: The Political Economy of E-Commerce in China*(Lizhi Liu, 2024)는 명시적으로:
  - "즈마신용은 **효과적인 신용평가 메커니즘으로 입증되지 못했다 — 그 지표들과 사용자의 대출상환 능력 사이에 통계적으로 유의한 연결이 없었다**(no statistically significant link between its metrics and a user's ability to repay loans)."
  - "PBOC는 2015년 8개 시범사의 신용 라이선스를 연장하지 않기로 했다."
  - "**결국 즈마신용은 알리바바 서비스 이용·쇼핑을 보상하는 로열티 프로그램이 되었다**(became a loyalty program)." (Wikipedia 인용)
- **Liu & Xu(2019, Edinburgh):** PBOC 규제로 **"Ant Finance가 즈마점수의 *금융 분야* 적용 사업을 중단했다고 발표(stopped its business activities regarding the application of Sesame score in the finance field)"** 고 기록. → 즉 적어도 2018~2019 시점에 **신용/금융 용도로서의 즈마점수는 규제로 위축**.
- **2024~2025 상태:** "Ant Group이 2015년 출시 후 공격적으로 확장했으나 **이제는 과거의 그림자(a shadow of its former self)**. Ant는 미션을 바꿔 **알리페이 사용자용 로열티 프로그램에 가깝게** 만들었다 — 고득점자는 보증금 없는 호텔예약·렌터카·자전거·보조배터리 대여 혜택." (Bloomberg/Bangkok Post 등 2021~ 보도 계열, 검색 확인) — 혜택 구조는 (c)와 동일하나 **'신용평가'가 아니라 '혜택 멤버십'으로 자리매김**.
- **인맥 5% 데이터를 지금도 쓰나(직접 확인):** Ant는 가중치·알고리즘을 공식 비공개라 **"현재 인맥 카테고리가 살아있는지/제거됐는지에 대한 공식 발표는 확인되지 않음"** (불확실). 검색으로 "5% 인맥 가중을 명시적으로 제거/축소했다"는 공식 부인이나 변경 발표는 발견되지 않음 — **다만 점수 자체가 신용도구에서 로열티로 후퇴**했으므로 인맥신호의 '신용상' 의미는 사실상 소멸. 이 지점은 §3에서 "추정/불확실"로 다뤄야 함.

→ **즈마 종합 결론:** "관계를 신용에 넣은 최대 선례"는 맞다. 그러나 ① 인맥 가중은 5%로 작았고, ② **통계적으로 상환력과 연결 안 됨**이 드러났으며, ③ 규제(PBOC 라이선스 차단)로 금융 용도가 막히고, ④ **현재는 신용평가가 아니라 로열티 프로그램**이다. "관계=신용이 상업적으로 작동했다"의 증거로 쓰기엔 **오히려 후퇴·실패의 사례**에 가깝다.

---

### 1-2. Lenddo / LenddoEFL — "It's all about who you know"

**출처:** Wikipedia "Lenddo" https://en.wikipedia.org/wiki/Lenddo · Privacy International 롱리드 "Fintech's dirty little secret? Lenddo, Facebook and the challenge of identity"(2018.10) https://privacyinternational.org/long-read/2323/fintechs-dirty-little-secret-lenddo-facebook-and-challenge-identity · Harvard d3 "It's all about who you know" https://d3.harvard.edu/platform-rctom/submission/its-all-about-who-you-know-lenddo-makes-credit-decisions-based-on-your-social-network · Finovate "EFL Merges with Lenddo" https://finovate.com/efl-merges-lenddo/ · MIT Tech Review "Can a credit score be crowdsourced?" https://www.technologyreview.com/s/428122/can-a-credit-score-be-crowdsourced/

#### 무엇인가 — 소셜네트워크를 신용으로 직접 환산한 선구자

- 싱가포르 본사 SaaS. **2011년 설립**(공동창업 Jeff Stewart·Richard Eldridge), 처음엔 직접 대출(필리핀 2011, 콜롬비아 2012, 멕시코 2013). 비전 "개발도상국 최소 10억 명의 금융포용". (Wikipedia, Privacy International)
- **핵심 사상 — "PageRank for people":** CEO Jeff Stewart가 직접 "어머니가 '너는 네가 어울리는 사람들로 평가받는다'고 했다 … 누구와 어울리고 그들과 어떻게 상호작용하느냐가 평가의 일부가 될 것"이라고 발언. Google의 PageRank(좋은 페이지가 링크하면 그 페이지도 높음)를 사람에 적용 — **고품질 친구가 많으면 점수가 높다.** 게다가 "친구, 친구의 친구, 친구의 친구의 친구까지, *그리고 그들과 어떻게 상호작용하는지*가 예측력이 있다"고 주장. (Privacy International, MIT Tech Review)

#### 변수·데이터 규모

- **LenddoScore(신용)** 3대 요소: ① 소셜네트워크 활동(Facebook·LinkedIn·Twitter·Gmail·Yahoo·**카카오톡** 계정 데이터), ② "Trusted Connections"(신원보증인 — 차주를 보증할 character reference), ③ (재대출자라면)금융이력. 최소 LenddoScore 300 이상 필요. (Wikipedia)
- **수집 데이터(API SDK 문서 기준, Privacy International이 적시):** 연락처(Contacts), SMS, 통화이력(Call History), 위치, 브라우징 이력, 설치 앱, 캘린더 일정, 폰 번호·기종 + 소셜/이메일 계정 접근(Facebook·LinkedIn·Yahoo·Google·Twitter·KakaoTalk). → "당신의 Gmail 받은편지함 전체"까지 접근하려 했다는 비판.
- **규모:** 2015년 Lenddo가 "**1억 2천만 프로필 사이의 1억 1천 3백만 관계(113M relationships between 120M profiles)**를 저장·분석"한다고 주장(AWS 사례연구). 그런데 2017년까지 *신용신청 처리*는 ~500만 건뿐 → **1억+ 프로필은 고객이 아닌 사람들(비고객, '섀도 프로필')**일 개연성. Privacy International이 이 점(비고객 데이터 수집·섀도 프로필)을 정면 제기했고 **Lenddo는 답변하지 않음**. (Privacy International)

#### EFL 합병·진출국·평가규모

- **2017년 10월 EFL(Entrepreneurial Finance Lab, 하버드 발 심리측정 신용평가사)과 합병 → LenddoEFL.** 합병 전 **양사 합산 500만 건 신용평가, 20개 신흥시장 50개 금융기관 통해 20억 달러 대출** 지원. EFL은 **심리측정(psychometric) 테스트**(온라인 퀴즈 응답 + 응답 소요시간 등으로 "성격을 담보화") 강점. (Finovate, Privacy International)
- 진출: 필리핀·콜롬비아·멕시코에서 시작 → 인도(2016 사무소)·케냐·남아공·호주 등 15개+ 시장.

#### 현재 상태 — **폐업(Defunct). 그리고 핵심: 소셜그래프 직접대출에서 일찍 후퇴.**

- **사업모델 전환(2015):** "4년·2천만 파운드 후" **2015년 초 직접 대출을 접고**, 다른 금융기관에 신용평가·신원검증을 파는 **B2B로 피벗**. 즉 "Facebook으로 직접 돈 빌려준다"는 초기 모델은 **상업적으로 지속 못 해 ~4년 만에 접음**. (Privacy International)
- **몰락:** 2019년 새 CEO 부임 후 내홍·자금난(TechinAsia 2020 보도: 급여·벤더 미지급, 해외사무소 폐쇄), **2021년 4월 검증(Verification) 서비스 7월 종료 발표 후 사이트 다운 → 사실상 폐업**. (Wikipedia)

→ **Lenddo 종합 결론:** "관계=신용(who you know)"을 **가장 노골적으로 구현한 상용 선구자**. 그러나 ① 소셜그래프 직접 대출은 ~4년 만에 접고 B2B로 후퇴, ② 비고객 섀도 프로필 수집으로 프라이버시 정면 비판, ③ 끝내 폐업. **"관계 데이터로 신용을 만든다"가 상업적으로 지속 가능했다는 증거가 아니라, 그 어려움의 대표 사례.**

---

### 1-3. Tala · Branch — 스마트폰 데이터 기반 (소셜신호는 부차적)

**출처:** Tala FAQ https://tala.co/faq/ · CNBC "Start-up uses mobile data as a credit score for the global unbanked"(2020) https://www.cnbc.com/2020/01/03/start-up-uses-mobile-data-as-a-credit-score-for-the-global-unbanked.html · Branch International https://branch.co/about-us · TechCrunch "Branch raises $170M"(2019) https://techcrunch.com/2019/04/08/partnering-with-visa-emerging-market-lender-branch-international-raises-170-million/ · Google Play SMS/Call Log 정책: Android Developers Blog https://android-developers.googleblog.com/2019/01/reminder-smscall-log-policy-changes.html , Play Console Help https://support.google.com/googleplay/android-developer/answer/10208820

#### Tala

- 미국 발(창업자 Shivani Siroya), **안드로이드 앱 마이크로대출**. 진출: **케냐·멕시코·필리핀·인도**. (Tala, CNBC)
- **신용평가 방식:** 스마트폰에서 ~**250개 데이터 포인트** 수집 — 휴대폰 요금 납부, 온라인 행동, **통화·문자, 구매이력, 앱 사용**, 일부 개인정보. 사용자 동의 하에 디지털 신용이력 생성. (CNBC) — 케냐 대출 KSh 2,000~50,000, 일 0.3%~.
- 표면상 '연락처·통화·문자'를 쓰니 관계신호로 보이나, 강조점은 **개인의 행동 규칙성**(요금 납부·반복 패턴)이지 *관계망 구조*가 아님.

#### Branch

- **2015년 설립**(공동창업 **Matt Flannery**[Kiva 공동창업자]·**Daniel Jung**). 안드로이드 앱 대출. 진출: **케냐·나이지리아·탄자니아**(아프리카) → **인도·멕시코** 확장. 2019년 Visa 제휴·1억 7천만 달러 투자유치. (TechCrunch, 검색)
- **방식:** 차주가 앱 다운로드 후 **폰 데이터(스마트폰 데이터)를 공유 → 머신러닝으로 신용점수 산출**. (Branch)
- 역시 **스마트폰 행동데이터 중심**.

#### 소셜/네트워크 신호 사용 여부 → **부차적. 핵심은 개인 행동/통신 메타데이터.**

Tala·Branch 모두 연락처·통화·문자에 접근했으나, 공개 자료상 예측의 중심은 **개인 단위 행동(상환·요금납부·앱사용 규칙성)**이며 *소셜그래프(친구가 누구냐)*를 점수화한다는 명시적 설명은 약함. (Lenddo의 "who you know"와 결이 다름)

#### 프라이버시 논란 — **2019 Google Play SMS/통화기록 정책이 결정타**

- **2018년 10월 Google 발표 → 2019년 시행:** 안드로이드 앱은 **기본(default) SMS/전화 앱으로 지정되지 않으면 SMS·통화기록 권한을 못 받음.** 권한선언서 미제출 앱은 Play 스토어에서 제거. (Android Developers Blog, Play Console Help)
- **영향:** 이 권한에 의존하던 **디지털 대출·금융포용 앱들이 직격탄**〔'거부율 80%'류 수치가 일부 매체에 있으나 1차 출처 미확인 — 정책의 질적 타격 자체는 확실〕. Tala·Branch처럼 SMS/통화 메타데이터로 신용을 추론하던 모델의 **데이터 원천이 정책으로 차단**됨 — 대안데이터 신용의 **플랫폼 의존 리스크**를 보여준 사건. (검색: TrustDecision, Medium 등)
- 동시에 이는 **"연락처·통화·문자 같은 관계인접 데이터를 신용에 쓰는 것" 자체에 플랫폼·규제가 제동을 건** 전환점.

→ **Tala/Branch 종합:** 스마트폰 데이터 대안신용은 신흥시장에서 **실제로 작동·확장**한 살아있는 사례. 단 **'관계'보다 '개인 행동·통신 메타데이터'가 본질**이고, 소셜그래프 점수화는 아님. 2019 Google 정책으로 데이터 접근이 좁아진 것이 중요한 교훈(플랫폼 종속).

---

### 1-4. 소셜네트워크 결합 ML 신용평가 (학술·실무)

#### (a) BIS Working Paper No.1244 — "Artificial intelligence and relationship lending" (2025.2)

**출처:** https://www.bis.org/publ/work1244.htm (PDF https://www.bis.org/publ/work1244.pdf) — Gambacorta, Sabatini, Schiaffi, 2025.2.19.

- **주의 — 용어 함정:** 제목의 'relationship lending'은 **개인 소셜네트워크가 아니라 "은행-기업 간 거래관계(소프트정보)"**다. 즉 우리 주제(인간관계망)와 직접 같지 않음. 그래도 "관계 vs 데이터/AI"의 보완·대체를 다루므로 참고가치 있음.
- **데이터:** 이탈리아 은행들의 **AI(신용평가 기법 통합용) 투자** 데이터 + 코로나 발발 전후 1년 신용등록부 매칭.
- **핵심 발견:** ① 평시에는 **AI 스크리닝·모니터링이 관계금융의 '지대추출(rent extraction)'을 완화**(같은 거래기간 동안 AI 쓰는 은행이 더 나은 조건). ② **코로나 위기 중엔 AI가 추가 신용·금리 보호를 주지 못함.** ③ 결론: **AI는 관계금융의 전형적 경기역행(countercyclical) 효과를 줄인다** = 하드데이터 AI와 소프트정보 관계가 *공존*하되, AI가 관계의존을 일부 대체.
- 함의(우리에게): "관계(소프트정보)"는 위기 때 가치를 발휘하는데, AI/하드데이터가 그 일부를 대체할 수 있다 — **관계신호의 가치는 '정보비대칭이 큰 상황'에서 나온다**는 점.

#### (b) Wei, Yildirim, Van den Bulte, Dellarocas — "Credit Scoring with Social Network Data" (Marketing Science, 2016)

**출처:** Marketing Science 35(2):234-258 https://pubsonline.informs.org/doi/10.1287/mksc.2015.0949 · Wharton PDF https://faculty.wharton.upenn.edu/wp-content/uploads/2016/04/Wei-et-al.-MKSC-2016.pdf · Knowledge@Wharton https://knowledge.wharton.upenn.edu/article/using-social-media-for-credit-scoring/

- **문제:** 소셜네트워크 기반 점수가 정확도에 도움이 되나? **사람들이 점수를 올리려고 인맥을 전략적으로 재구성(gaming)하면** 어떻게 되나?
- **핵심 발견:** ① 동질성(homophily, 비슷한 사람끼리 연결)이 있으면 네트워크 정보가 신용예측에 유용할 수 있다. **그러나** ② **개인이 점수를 올리려 동기부여되면 더 적은 수의 더 비슷한 상대와만 연결을 맺게 되고(전략적 tie formation), 그 결과 점수의 정확도에 미치는 영향이 '모호(ambiguous)'해진다.** → **"관계를 점수화하면 관계 자체가 왜곡된다"는 근본적 내생성(endogeneity) 문제**를 이론적으로 보인 핵심 논문.
- 함의(우리에게 직격): 관계를 신용에 넣는 순간 **사람들은 점수를 위해 관계를 조작**하고, 그러면 신호가 오염된다. 이것이 소셜그래프 신용의 구조적 약점.

#### (c) Óskarsdóttir et al. — 모바일폰·통화네트워크 신용평가 (2019)

**출처:** "The value of big data for credit scoring: Enhancing financial inclusion using mobile phone data and social network analytics," *Applied Soft Computing*(2019) https://www.sciencedirect.com/science/article/abs/pii/S156849461830560X · 관련 telco churn SNA 연구 https://www.sciencedirect.com/science/article/abs/pii/S0957417417303445

- **방식:** 통화이력(call logs)으로 통화네트워크를 만들고 소셜네트워크 분석(SNA)을 적용해 신용카드 신청자의 신용도 예측 향상.
- **핵심 발견:** ① 통신데이터 결합이 신용평가 모델의 가치를 높일 잠재력 있음. **그러나** ② **이익(profit) 기준 최선 모델은 '통화행동 피처(calling behavior)'만 포함** — 즉 **개인의 통화 행동이 가장 예측적이고, 관계망 구조(network) 피처의 한계효용은 제한적**. ③ 네트워크 다양성·충전 규칙성·기본 사용통계가 (금융변수 없이도) 디폴터를 분리.
- 함의: 통신/통화데이터에서도 **예측력의 핵심은 '개인 행동의 규칙성'이지 '관계망 구조' 자체가 아니다** — 1-3(Tala/Branch)의 본질과 일치.

→ **학술 종합:** ① 소셜그래프 신용은 **gaming/내생성**으로 신호가 오염된다(Wei et al). ② 통신/통화데이터에서도 **개인 행동 > 관계망 구조**(Óskarsdóttir). ③ '관계(소프트정보)'의 가치는 **정보비대칭·위기 상황**에서 나오고 AI가 일부 대체 가능(BIS). → **"순수 관계망 구조를 직접 점수화"하는 접근에 학술적으로도 회의적**.

---

### 1-5. 한국 대안신용평가 — **거의 전부 '거래·행동 데이터'. '관계(network)' 데이터는 사실상 미사용.**

이 절의 핵심 질문: 한국 사례들이 **'관계(network)' 데이터를 어디까지 쓰나 vs 단순 대안거래데이터(통신·쇼핑)만 쓰나.** → **결론 먼저: 한국 대안신용은 통신·쇼핑·결제 등 *거래/행동 데이터*가 중심이고, '인간관계망(누가 누구와 연결)'을 신용신호로 쓰는 상용 사례는 확인되지 않음.** (신용정보법상 제약이 큼 — 1-6 참조)

#### (a) 카카오뱅크 — '카카오뱅크 스코어' (2022 하반기~)

**출처:** 데이터넷 https://www.datanet.co.kr/news/articleView.html?idxno=181237 · 헤럴드경제 https://biz.heraldcorp.com/article/10604954 · 디지털타임스 https://www.dt.co.kr/article/12067035 · 개인정보위 사례 PDF "가명결합을 활용한 카카오뱅크 신용평가모형개발" https://www.privacy.go.kr/cmm/fms/FileDown.do?atchFileId=FILE_000000000843906&fileSn=0

- 2022년 하반기 업계 최초로 **카카오 공동체 + 롯데멤버스·교보문고·금융결제원 등의 가명결합 데이터**로 독자 대안신용평가모형 '카카오뱅크스코어' 개발.
- **금융정보에 가점 방식이 아니라 비금융 데이터만으로 별도 평가결과를 산출**하는 모형. 가명결합데이터 1,800만 건 기반, **3,800여 개 변수**: 앱 내 적금·이체 실적, **카카오 선물하기·택시 이용, 도서 구매** 등.
- 성과: 이 모형으로 **1.2조 원 중·저신용 대출 추가 공급**. 적용 후 취급 중·저신용 대출의 약 12%는 기존 모형이면 거절 대상이었으나 대안정보로 추가 선별.
- **'관계' 데이터인가?** **아니다.** "카카오 선물하기"가 타인에게 선물하는 행위라 *준-관계적*으로 보일 수 있으나, 이는 **개인의 구매/소비 행동**으로 변수화된 것이지 *관계망 구조(누가 누구와 얼마나 가까운가)*를 모델링한 게 아님. 나머지(적금·이체·택시·도서)도 전부 거래/행동.

#### (b) 네이버파이낸셜 — NF스코어 / 대안신용평가시스템(ACSS) (2019.12~)

**출처:** 서울경제 "은행도 벤치마킹하는 네이버 '대출 신용평가'" https://www.sedaily.com/NewsVIew/22IJJQN6Z1 · NAVER Corp 핀테크 https://www.navercorp.com/service/serviceFintech

- 2019년 12월 미래에셋캐피탈과 **'네이버 스마트스토어 사업자 대출'** 출시. 자체 ACSS(대안신용평가시스템).
- **사용 데이터:** 스마트스토어의 **반품률, 단골고객 비율, 고객문의 응답속도** 등 **사업 운영/매출 데이터(비금융 활동데이터)**. 금융+비금융 함께 평가 시 신청자 60%가 더 나은 승인결과. 무담보·무보증, 최대 5천만 원, 금리 3.2~9.9%.
- **'관계' 데이터인가?** **아니다.** **소상공인의 영업·거래 데이터**가 본질. "단골고객 비율"이 고객과의 관계 같지만 *판매자-구매자 거래 통계*이지 개인 소셜네트워크가 아님.

#### (c) 통신3사 대안신용평가 — '통신대안평가'(KCB·SGI 합작) / 모형명 '이퀄(EQUAL)'

**출처:** 머니투데이 https://news.mt.co.kr/mtview.php?no=2022080408494899859 · 바이라인네트워크(2022) https://byline.network/2022/08/04-71/ · EQUAL 공식 https://www.equal.co.kr/ · 헤럴드경제 "케이뱅크 이퀄 도입" https://biz.heraldcorp.com/article/10465347 · 비즈니스포스트 https://www.businesspost.co.kr/BP?command=article_view&num=391428

- **SKT·KT·LGU+ + 코리아크레딧뷰로(KCB) + SGI서울보증**이 공동출자해 설립한 **'통신대안평가'** 회사. 모형명 **이퀄(EQUAL)**. 통신 3사 가입자 **약 4,800만 명** 통신기록 분석.
- **사용 데이터(500개+ 세부항목):** 요금납부 내역, 데이터 사용량·통화량, 요금제, 부가서비스 이용현황, **시간대별 통화패턴, 금융앱 접속횟수, 멤버십 사용횟수, 소액결제 비율** 등. 통신사 변경해도 정보단절 없이 연속 평가.
- **2025년 케이뱅크가 인터넷은행 최초로 이퀄 도입**(CSS 3.0과 연계), 씬파일러(thin filer) 포용 확대.
- **'관계' 데이터인가?** **거의 아니다.** '통화량·시간대별 통화패턴'이 관계 인접으로 보이나, **개인의 통신 사용 행동 통계**이지 *통화 상대방 네트워크(누구와 통화하는지의 그래프)*를 신용에 쓰는 게 아님(공개 설명상). 본질은 통신 거래/행동 데이터. ← 1-3·1-4(c)의 "개인 행동 > 관계망"과 같은 결.

#### (d) 토스뱅크 — TSS(Toss Scoring System)

**출처:** 토스피드 https://toss.im/tossfeed/article/tossbank-loan-result · 인더스트리뉴스 https://www.industrynews.co.kr/news/articleView.html?idxno=73653

- 자체 신용평가모형 **TSS**로 고객의 **금융·비금융 정보 기반 '실질소득(real income)' 분석**에 주력. 중·저신용 대출 비중 31.75% 달성, 심사 중 26.3%가 고신용으로 상향.
- **'관계' 데이터인가?** 공개 자료상 **소득추정 중심**이며 관계망 데이터 언급 없음.

#### (e) 마이데이터 / NICE·KCB 비금융 / 전문개인신용평가업

- **마이데이터:** 본인 동의로 흩어진 금융·비금융·공공 데이터를 결합. **데이터 거버넌스가 본인 명령 기반(consent-driven)** — 한국 대안신용의 합법 인프라.
- **전문개인신용평가업(신용정보법 §5 신설):** **비금융정보만**(금융거래 제외) 처리하는 전문CB 업종 제도화. 통신대안평가가 이 계열.
- **NICE·KCB 비금융 가점:** 통신비·공과금·건강보험 등 성실납부를 가점(thin filer 구제). → 전부 **'성실 납부 = 거래/행동 데이터'**, 관계 데이터 아님.

→ **한국 종합 결론:** 한국 대안신용평가의 데이터는 **통신·쇼핑·결제·구독·납부 등 '거래/행동' 데이터가 100%에 가깝다.** **'인간관계망(누가 누구와 어떤 사이)' 자체를 신용신호로 쓰는 상용 모형은 확인되지 않음.** (카카오 선물하기·통화량 등 *관계 인접* 신호는 있으나 모두 개인 행동으로 환원됨.) 이는 우연이 아니라 **신용정보법·개인정보보호법의 제약**(1-6)과 맞물린 결과로 보임.

---

### 1-6. 규제·윤리 — '사회관계 데이터를 신용에 쓰는 것'의 합법성

#### (a) 한국 — 신용정보법·개인정보보호법

**출처:** 신용정보법(신용정보의 이용 및 보호에 관한 법률) 국가법령정보센터 https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=140586 · 금융위 "2019년부터 개인신용평가가 보다 합리적으로 개선됩니다" https://www.fsc.go.kr/no010101/73473 · 신용정보업감독규정 https://law.go.kr/LSW/admRulLsInfoP.do?admRulSeq=2100000004568 · 금융위 「개인신용평가체계 개선방안」(2018.1.30) https://www.fsc.go.kr/comm/getFile?srvcId=BBSTY1&upperNo=73008&fileTy=ATTACH&fileNo=6

- **핵심 금지 원칙:** 신용정보회사 등은 **개인의 정치적 사상, 종교적 신념, 그 밖에 신용도와 무관한(unrelated to creditworthiness) 개인정보를 수집·조사할 수 없다.** (신용정보법 — 검색 확인) → **'신용도와의 관련성(relevance)'이 적법성의 핵심 잣대.**
- **차별 금지:** 2019년 개선으로 **성별·학력 등을 사유로 합리적 이유 없는 평가상 차별 금지.** (금융위) 개인신용평가 결과에 대한 **대응권(설명요구·이의제기권)** 도 도입.
- **동의 요건:** 비금융정보 활용은 **정보주체 동의 기반**(마이데이터). 가명정보 결합은 가명처리·결합전문기관 경유.
- **함의(우리 use case 직격):** "인간관계·경조사 호혜"를 신용에 쓰려면 **① 그 데이터가 '신용도와 관련 있음'을 입증**해야 하고(무관한 사회관계 정보 수집은 금지), **② 동의를 받아야 하며**(부조한 *상대방*의 정보까지 쓰면 그의 동의 문제 = Lenddo 섀도프로필 이슈와 동형), **③ 사회적 신분/관계로 인한 차별 소지가 없어야** 한다. → **법적으로 '관계 데이터의 신용 사용'은 한국에서 결코 자유롭지 않다.**

#### (b) EU — AI Act + Consumer Credit Directive (가장 강한 시사점)

**출처:** Future of Privacy Forum "Red Lines under the EU AI Act: Unpacking Social Scoring"(2026.3) https://fpf.org/blog/red-lines-under-the-eu-ai-act-unpacking-social-scoring-as-a-prohibited-ai-practice/ · EU AI Act Annex III https://artificialintelligenceact.eu/annex/3/ · CJEU SCHUFA I (C-634/21) · Consumer Credit Directive II = Directive (EU) 2023/2225 (소셜네트워크 데이터 신용사용 금지 Art 18; 구 2008/48/EC 대체) https://eur-lex.europa.eu/eli/dir/2023/2225/oj

- **신용평가 = 고위험 AI(High-Risk):** AI Act **Annex III 5(b)** — "자연인의 신용도 평가 또는 신용점수 산정용 AI 시스템"(금융사기 탐지 제외)은 **고위험**. 2026.8.2부터 데이터거버넌스·투명성·인간감독·사후모니터링 의무. (Annex III, FPF)
- **소셜스코어링 = 금지(Prohibited):** AI Act **Article 5(1)(c)** — 사회적 행동·개인특성 기반으로 사람을 평가·분류해 **(i) 데이터가 수집된 맥락과 무관한 맥락에서 불리한 처우, 또는 (ii) 행동에 비해 부당·불비례한 처우**를 낳는 AI는 **전면 금지**(공공·민간 불문, 2025.2.2부터 적용). (FPF)
- **결정적 경계선:** FPF는 EU집행위 가이드라인을 인용해 — **"금융기관이 *관련 금융데이터*에 근거해 신용도를 평가하는 신용점수는 금지에 해당하지 않는다. 단 *부당·불비례한 처우*를 낳거나 *무관한 사회적 맥락 데이터(unrelated social context data)에 의존*하지 않을 것을 조건으로 한다."** → **신용평가가 '관계/사회 데이터'에 의존하면 고위험을 넘어 *금지*로 넘어갈 수 있다.**
- **CCD가 더 직접적 — 소셜네트워크 데이터 금지:** FPF 적시 — 소비자신용지침은 신용도 평가에 특수범주 개인정보 사용과 *소셜네트워크로부터의 데이터 취득을 금지*(prohibits ... the obtaining of data from social networks). → **EU에서는 '소셜네트워크 데이터로 신용평가'가 명문으로 금지**된 셈. (우리 use case에 가장 직접적인 규제 신호.) 〔검증 정정 2026-06-17: 이 명문 금지는 **신 CCD II = Directive (EU) 2023/2225 제18조/recital**(회원국 이행기한 2025-11-20)의 것이며, **구 CCD(2008/48/EC)엔 없다** — FPF가 구 2008/48 링크를 걸어 혼동되나 실제 근거 조문은 CCD II. 실질 주장은 참, 인용만 정정.〕
- **SCHUFA I 판결(C-634/21):** 독일 신용점수가 GDPR Art 22 자동화 의사결정·Art 4(4) 프로파일링에 해당한다고 CJEU가 판시 — 신용점수는 프로파일링이며 설명·권리보호 대상.

#### (c) 차별·프라이버시·역익명화 공통 이슈

- **디지털 레드라이닝(digital redlining):** Lenddo 등 소셜미디어 신용이 "사회적으로 바람직하지 않아 보이는" 신청자를 차별할 위험. EPIC의 David Jacobs가 경고. (Mother Jones 2013, Wikipedia)
- **섀도 프로필·비고객 데이터:** Lenddo가 1억+ 비고객 프로필을 보유한 것으로 추정 — **본인이 동의한 적 없는 제3자(친구) 데이터가 신용에 쓰이는** 구조적 문제. (Privacy International)
- **내생성·gaming:** 관계를 점수화하면 관계가 왜곡(Wei et al 2016).
- **역익명화:** (cf. 본 폴더 04 SBT 사례) 소수의 공개 평판신호로 개인 특정 가능 — 관계·부조 데이터도 동일 위험.

---

### 1-7. 추가 선례 (검증 보강, 2026-06-17)

- **텐센트신용(Tencent Credit, 2018-01-30 출시 → 익일 PBOC가 중단):** 즈마와 함께 알리바바·텐센트가 신용점수 시도를 접고 PBOC 주도 **Baihang(바이항정신, 百行征信)**에 주주로 편입된 사례. "플랫폼·관계 데이터 신용은 규제로 막혔다"를 강화. (출처: kr-asia)
- **Kreditech/Monedo(독일, 2012~2020 파산):** 2만 데이터포인트·공개 SNS로 언더뱅크드 신용평가를 시도했으나, **독일 본국에선 그런 수집이 위법이라 서비스 불가**, 2020 파산. "소셜·대안데이터 신용이 선진국 규제에서 작동 못 한" 직접 증거. (출처: BIIA)
- **Nova Credit·Petal(미국, 성공 사례):** 단 이들의 성공 데이터는 *관계*가 아니라 **현금흐름·국경간 신용이력 이전(移轉)**이다 → "성공한 대안데이터 = 비관계 거래데이터"라는 본 문서 패턴을 *재확인*(반례가 아니라 보강). (출처: Nova Credit·Banking Dive)

→ 셋 다 본 문서 핵심 논지(소셜그래프식 관계신용은 규제·시장에서 실패, 거래·행동 데이터식만 생존)를 강화한다.

---

### 출처 (URL 목록)

**즈마신용 / 사회신용제도**
- Wikipedia "Zhima Credit" — https://en.wikipedia.org/wiki/Zhima_Credit
- Wikipedia "Social Credit System" — https://en.wikipedia.org/wiki/Social_Credit_System
- What's on Weibo "Insights into Sesame Credit & Top 5 Ways..." — https://www.whatsonweibo.com/insights-into-sesame-credit-top-5-ways-to-use-a-high-sesame-score/
- Liu & Xu, "Sesame (Zhima) Score: 'Social Credit Score' or FICO-like Credit Score?" (Edinburgh CER, 2019) — https://cer.business-school.ed.ac.uk/wp-content/uploads/sites/55/2019/07/Y89-Sesame-Zhima-Score-%E2%80%98Social-Credit-Score%E2%80%99-or-FICO-like-Credit-Score-Liu.pdf
- WIRED, Matsakis "How the West Got China's Social Credit System Wrong" (2019) — https://www.wired.com/story/china-social-credit-score-system/
- CNBC "Ant Financial's Sesame Credit ... beyond FICO" (2017) — https://www.cnbc.com/2017/03/16/china-social-credit-system-ant-financials-sesame-credit-and-others-give-scores-that-go-beyond-fico.html
- ChinaTalk "Five misconceptions about China's Social Credit System" — https://www.chinatalk.nl/five-misconceptions-about-chinas-social-credit-system/
- SCMP "Ant Financial apologises over Alipay user data gaffe" (2018) — https://www.scmp.com/tech/china-tech/article/2126772/chinas-ant-financial-apologises-over-alipay-user-data-gaffe
- Sixth Tone "After Privacy Concerns, Zhima Credit Admits It Was 'Stupid'" — https://www.sixthtone.com/news/1001503
- CGTN "Zhima Credit apologizes for annual report 'mistake'" — https://news.cgtn.com/news/78637a4e35637a6333566d54/index.html
- TechCrunch "Data From Alibaba's E-Commerce Sites Is Now Powering A Credit-Scoring Service" (2015) — https://techcrunch.com/2015/01/27/data-from-alibabas-e-commerce-sites-is-now-powering-a-credit-scoring-service/

**Lenddo / LenddoEFL**
- Wikipedia "Lenddo" — https://en.wikipedia.org/wiki/Lenddo
- Privacy International "Fintech's dirty little secret? Lenddo, Facebook and the challenge of identity" (2018) — https://privacyinternational.org/long-read/2323/fintechs-dirty-little-secret-lenddo-facebook-and-challenge-identity
- Harvard d3 "It's all about who you know: Lenddo makes credit decisions based on your social network" — https://d3.harvard.edu/platform-rctom/submission/its-all-about-who-you-know-lenddo-makes-credit-decisions-based-on-your-social-network
- Finovate "EFL Merges with Lenddo" — https://finovate.com/efl-merges-lenddo/
- MIT Technology Review "Can a credit score be crowdsourced?" — https://www.technologyreview.com/s/428122/can-a-credit-score-be-crowdsourced/
- Mother Jones "Your Deadbeat Facebook Friends Could Cost You a Loan" (2013) — https://www.motherjones.com/politics/2013/09/lenders-vet-borrowers-social-media-facebook

**Tala / Branch / Google Play 정책**
- Tala FAQ — https://tala.co/faq/
- CNBC "Start-up uses mobile data as a credit score for the global unbanked" (2020) — https://www.cnbc.com/2020/01/03/start-up-uses-mobile-data-as-a-credit-score-for-the-global-unbanked.html
- Branch International About — https://branch.co/about-us
- TechCrunch "Branch International raises $170 million" (2019) — https://techcrunch.com/2019/04/08/partnering-with-visa-emerging-market-lender-branch-international-raises-170-million/
- Android Developers Blog "Reminder SMS/Call Log Policy Changes" (2019) — https://android-developers.googleblog.com/2019/01/reminder-smscall-log-policy-changes.html
- Google Play Console Help "Use of SMS or Call Log permission groups" — https://support.google.com/googleplay/android-developer/answer/10208820

**학술 (소셜네트워크 ML 신용)**
- BIS WP No.1244 "Artificial intelligence and relationship lending" (Gambacorta·Sabatini·Schiaffi, 2025) — https://www.bis.org/publ/work1244.htm
- Wei, Yildirim, Van den Bulte, Dellarocas "Credit Scoring with Social Network Data" (Marketing Science, 2016) — https://pubsonline.informs.org/doi/10.1287/mksc.2015.0949 · PDF https://faculty.wharton.upenn.edu/wp-content/uploads/2016/04/Wei-et-al.-MKSC-2016.pdf
- Knowledge@Wharton "The Surprising Ways that Social Media Can Be Used for Credit Scoring" — https://knowledge.wharton.upenn.edu/article/using-social-media-for-credit-scoring/
- Óskarsdóttir et al. "The value of big data for credit scoring..." (Applied Soft Computing, 2019) — https://www.sciencedirect.com/science/article/abs/pii/S156849461830560X

**한국 대안신용평가**
- 데이터넷 "카카오뱅크, 대안신용평가모형으로..." — https://www.datanet.co.kr/news/articleView.html?idxno=181237
- 헤럴드경제 "카카오뱅크 스코어로 중저신용 9890억 대출" — https://biz.heraldcorp.com/article/10604954
- 디지털타임스 "카카오뱅크 대안신용평가로 1.2조 추가공급" — https://www.dt.co.kr/article/12067035
- 개인정보위 "가명결합을 활용한 카카오뱅크 신용평가모형개발" (PDF) — https://www.privacy.go.kr/cmm/fms/FileDown.do?atchFileId=FILE_000000000843906&fileSn=0
- 서울경제 "은행도 벤치마킹하는 네이버 '대출 신용평가'" — https://www.sedaily.com/NewsVIew/22IJJQN6Z1
- NAVER Corp 핀테크 서비스 — https://www.navercorp.com/service/serviceFintech
- 머니투데이 "통신정보로 신용평가...통신3사 합작 비금융 신평사" — https://news.mt.co.kr/mtview.php?no=2022080408494899859
- 바이라인네트워크 "통신3사 씬파일러 신용평가 합작법인" (2022) — https://byline.network/2022/08/04-71/
- EQUAL(통신대안평가) 공식 — https://www.equal.co.kr/
- 헤럴드경제 "케이뱅크, 통신대안평가 '이퀄' 도입" — https://biz.heraldcorp.com/article/10465347
- 비즈니스포스트 "케이뱅크, 통신3사 데이터 신용평가모형 고도화" — https://www.businesspost.co.kr/BP?command=article_view&num=391428
- 토스피드 "토스뱅크 대출 결과" — https://toss.im/tossfeed/article/tossbank-loan-result
- 인더스트리뉴스 "인뱅 3사 대안신용평가·AI 포용금융" — https://www.industrynews.co.kr/news/articleView.html?idxno=73653

**규제·윤리**
- 신용정보의 이용 및 보호에 관한 법률 (국가법령정보센터) — https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=140586
- 금융위 "2019년부터 개인신용평가가 보다 합리적으로 개선됩니다" — https://www.fsc.go.kr/no010101/73473
- 금융위 「개인신용평가체계 개선방안」(2018.1.30, PDF) — https://www.fsc.go.kr/comm/getFile?srvcId=BBSTY1&upperNo=73008&fileTy=ATTACH&fileNo=6
- 신용정보업감독규정 (국가법령정보센터) — https://law.go.kr/LSW/admRulLsInfoP.do?admRulSeq=2100000004568
- Future of Privacy Forum "Red Lines under the EU AI Act: Unpacking Social Scoring" (2026) — https://fpf.org/blog/red-lines-under-the-eu-ai-act-unpacking-social-scoring-as-a-prohibited-ai-practice/
- EU AI Act Annex III (High-Risk AI Systems) — https://artificialintelligenceact.eu/annex/3/
- EU CCD II = Directive (EU) 2023/2225 (소셜네트워크 데이터 신용사용 금지 Art 18; 구 2008/48/EC 대체) — https://eur-lex.europa.eu/eli/dir/2023/2225/oj
- 텐센트신용 출시 익일 중단 (kr-asia) — https://kr-asia.com/tencent-pulls-credit-scoring-service-right-after-launch
- Kreditech/Monedo 파산 (BIIA) — https://www.biia.com/pioneer-german-fintech-company-kreditech-slipped-into-bankruptcy/
- Nova Credit (cross-border credit history) — https://www.novacredit.com/company
- Nova Credit / Amex 이민자 신용 (Banking Dive) — https://www.bankingdive.com/news/american-express-nova-immigrant-credit-history-card/565914/

---

## 2. 매핑 (선례 → 우리 4층 + 차별점 재포지셔닝)

| 선례 | 관계를 신용에 넣은 방식 | 우리 4층 대응 | 결과 | 우리(디방)와의 관계 |
|---|---|---|---|---|
| 즈마신용 인맥 5% | 온라인 인맥 수·상호작용 → 점수 5% | 3층 신용에 관계신호 가중(우리 지향과 같은 자리) | 상환력과 통계 무관 → 로열티로 후퇴 | 우리도 '호혜=상환력 연결' 입증 못하면 같은 결말 |
| Lenddo 'PageRank for people' | 소셜그래프(친구의 질) 직접 점수화 | 3층 Φ(전파)와 가장 닮은 야심 | 4년 만에 직접대출 포기·폐업·섀도프로필 | 우리 Φ 전파의 거울상 경고(동의·gaming 동일) |
| Tala/Branch | 스마트폰 연락처·통화 메타데이터 | 1층 액션 수집 인접 | 작동하나 본질은 개인행동; Google정책 차단 | 플랫폼·데이터원 종속 리스크 |
| Wei et al(학술) | 소셜그래프 점수화의 gaming·내생성 | 신호 무결성 경고 | 관계 점수화 → 관계 왜곡 | 부조 gaming 방지 설계 필요(04 정규화·할인) |
| Óskarsdóttir(학술) | 통화망 SNA | 3층 네트워크 피처 | 개인행동 > 관계망 구조 | '관계망 구조' 자체 예측력 제한 경고 |
| 한국 대안신용(카뱅·NF·이퀄·토스) | 거래/행동 대안데이터(통신·쇼핑·납부) | 1층 비금융 액션 → 신용 | 작동(씬파일러 포용) | 우리 경조사 호혜가 이 '살아남은 계열'에 합류 |
| 한국 신용정보법 | 신용도 무관 정보 수집 금지·동의 | 전 층위 제약 | — | 호혜의 '신용 관련성' 입증 + 동의 필수 |
| EU AI Act / CCD | 신용=고위험·소셜스코어링 금지·**소셜네트워크 데이터 신용 금지** | 전 층위 제약 | — | EU선 소셜그래프식 금지 — 거래데이터식이어야 |

**이미 존재 vs 우리만의 것(분리):**
- *이미 존재:* 관계·대안데이터로 씬파일러 신용(즈마·Lenddo·한국), 소셜그래프 직접 점수화(즈마·Lenddo — 단 실패), 네트워크 전파 알고리즘(→ 04 EigenTrust/OpenRank).
- *우리만의(후보, 입증 조건부):* 경조사 의례라는 **비용 든·신원결속된 '관측된 호혜 거래'** + **호혜원장(EM 아벨군) enrichment** + **결혼식 = Hom 전수 샘플링**. 선례엔 이 세 조합이 없다.

---

## 3. 검토 (정합 · 엇나감 · 메울 갭 · 배울 것)

**정합 총평(검증보다 정밀해진 그림).** FIN-V는 '관계 신용은 이미 있다'고 경고했지만, 05 리서치는 더 정밀한 그림을 준다: **관계 *그 자체*(소셜그래프)를 직접 점수화한 시도는 거의 다 실패·후퇴**했다(즈마=상환력 무관→로열티, Lenddo=폐업, Wei et al=gaming 오염). **살아남은 상용 대안신용은 전부 '거래·행동 데이터'**(한국 카뱅·이퀄·NF). 우리 경조사 호혜는 *온라인 소셜그래프*가 아니라 **'관측된 호혜 거래'**라, 실패한 계열이 아니라 **살아남은 거래데이터 계열에 가깝다.** → 차별점을 "관계 신용"이 아니라 **"비용 든·신원결속된 관측 호혜 거래 + 호혜원장 구조"**로 재포지셔닝하면 정직하고, 선례 실패를 피하는 위치다. **단 정직하게: 이는 데이터의 *형식*만 거래데이터에 가깝다는 것이고, *리스크 구조*(부조 상대방 동의·gaming·규제)는 소셜그래프와 동형이다 — '살아남은 계열'이라는 안심은 형식에 한정된다.**

**차별점이 진짜 남는가(정직한 판정).** 부분적으로 그렇다. "관계를 신용에 넣는다"는 새롭지 않지만(즈마·Lenddo), 그들은 *온라인 소셜그래프*였고 실패했다. 우리의 *경조사 호혜(관측된 거래)*는 ① 데이터 종류가 다르고(살아남은 거래데이터 계열), ② **호혜원장(EM 아벨군)·결혼식=Hom 샘플링**이라는 구조적 틀이 선례에 없다. 즉 차별점은 '관계 신용 자체'가 아니라 **데이터 종류(관측 호혜) + 수학 구조**에 있다.

**엇나감·리스크 = 통과해야 할 3관문(생사).**
1. **상환력 연결 입증.** 즈마가 바로 여기서 실패했다(인맥이 상환력과 통계적 무관). 우리 호혜가 상환력/신용과 통계적으로 연결되는지 *데이터로 입증* 못하면 같은 운명(로열티 프로그램화).
2. **gaming/내생성.** 관계를 점수화하면 관계가 왜곡된다(Wei et al). 부조를 점수 위해 조작(품앗이 담합·가짜 부조)하면 신호 오염 → 04의 정규화·correlation discounting 같은 방어 필수.
3. **동의·프라이버시·규제.** 부조 *상대방* 데이터까지 쓰면 그의 동의(Lenddo 섀도프로필), 한국 신용정보법('신용 관련성'+동의), **EU CCD의 소셜네트워크 데이터 신용 금지** — EU에선 소셜그래프식이면 금지. '거래데이터식' 포지셔닝이 규제 통과에도 유리.

**(보강 — 검증) 3관문에 숨은 함정.** (i) *역인과·증분예측력* — 호혜가 상환력과 상관돼도 '부유·안정한 사람이 경조사도 활발'한 교란일 수 있다(상관≠인과). 기존 신용변수 통제 후 *증분* 예측력이 있어야 한다(즈마는 상관조차 못 만들었고, 우리는 상관은 있되 증분이 없을 위험). (ii) *신용정보법 관련성* — 동의가 있어도 신용정보법 제16조는 '신용도와 무관한 정보' 수집 자체를 금지 → 관련성 입증 실패 시 동의와 무관하게 위법 소지. (iii) *AI Act 사회맥락 트랩* — 경조사(혼례·상례)는 전형적 '사회적 맥락'이라, 그 데이터로 신용(다른 맥락)을 평가하면 EU AI Act의 '무관한 사회맥락 데이터' 금지 트리거에 오히려 *가까워질* 수 있다 — '거래데이터식 포지셔닝'이 이를 자동 면제하지 않는다.

**메울 갭(재확정).** 우리 차별점 = (i) 관측된 호혜 거래(소셜그래프 아님) (ii) 호혜원장 EM 구조 (iii) 결혼식=Hom 샘플링 — *3관문 통과 조건부*. 더해서, 즈마·Lenddo가 실패로 비운 자리(관계 신용의 *제대로 된* 구현)가 기회이되, 그들이 실패한 이유(상환력 무관·gaming·동의)를 우리가 푸는 한에서만.

**배울 것·경고.** 즈마(상환력 연결 없으면 로열티 전락) · Lenddo(소셜그래프 직접대출 지속불가·섀도프로필) · Wei et al(gaming 방지) · EU CCD/한국 신용정보법(소셜데이터 신용 사용 제약 → 거래데이터 포지셔닝).

---

## 부록: 핵심 질문 (a)(b)(c) 요지

> §3 본격 검토 전, 수집 단계에서 도출된 잠정 답(근거는 §1).

**(a) 이들이 '관계/네트워크'를 *실제로* 얼마나·어떻게 쓰나**
- **직접 소셜그래프 점수화**는 Lenddo("PageRank for people")와 즈마(인맥 5%) 둘뿐. 즈마는 **5%로 최소 가중**, Lenddo는 **~4년 만에 직접대출 포기**. Tala·Branch·한국 사례·통신3사는 표면적 관계신호(통화·연락처·선물하기)가 있어도 **본질은 '개인 행동/거래 데이터'**이지 관계망 구조가 아님. **한국 상용 모형 중 인간관계망을 신용신호로 쓰는 사례는 확인되지 않음.**

**(b) 무엇이 작동했고 무엇이 실패·후퇴했나**
- **후퇴/실패:** ① 즈마 — 지표가 상환력과 통계적 무관, PBOC 라이선스 차단, **현재 로열티 프로그램으로 전락**. ② Lenddo — 직접대출 포기→B2B 피벗→**폐업**, 섀도프로필 비판. ③ 소셜그래프 점수는 **gaming/내생성**으로 신호 오염(Wei et al). ④ 2019 Google 정책이 SMS/통화 기반 모델 데이터원 차단.
- **작동:** **'거래·행동 대안데이터'**(통신·쇼핑·납부) — 한국 인터넷은행·통신대안평가·NF스코어가 **실제 중·저신용/씬파일러를 포용**하며 작동 중. 즉 **"관계 그 자체"는 거의 다 실패했고, 살아남은 건 전부 거래/행동 데이터.**

**(c) 우리(경조사 호혜·결혼식 관측)와의 차이**
- 선례의 '관계'는 ① **온라인 소셜그래프(친구 수·팔로우)** 거나 ② **통신 메타데이터**다. 우리는 **실제 경조사 호혜라는 '관측된 거래(누가 누구에게 얼마를 부조)'** — 가짜비용이 온라인 팔로우보다 높고 신원·관계가 실재. 데이터 성격상 우리는 소셜그래프(1번)보다 **'거래/행동 데이터'(살아남은 계열, 한국 사례)에 가깝다.**
- **단, 차별점은 *확보된 강점이 아니라 입증 대상*:** ① 호혜 데이터가 *상환력과 통계적으로 연결*되는지(즈마가 바로 여기서 실패), ② gaming/내생성(점수 위해 부조를 조작)에서 자유로운지(Wei et al 경고), ③ 부조 *상대방*의 동의·프라이버시(Lenddo 섀도프로필, 한국 신용정보법 동의요건, EU CCD의 소셜데이터 금지)를 어떻게 충족하는지 — 이 세 관문이 §3 검토의 축이 되어야 함.
