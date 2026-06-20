# 04. 신뢰그래프·온체인 — 리서치

> 범위: 신뢰그래프 알고리즘(EigenTrust·PageRank/TrustRank·web-of-trust)과 온체인 신용·평판(DeFi 무담보대출·온체인 신용점수·신용위임·SBT·attestation 신원)의 작동 원리·메커니즘·대표 프로젝트·2024~2026 현황을 출처와 함께 순수 수집. (2026-06-17)

---

## 1. 리서치 (수집)

### 1-0. 전체 지형 한눈에

이 도메인은 두 갈래가 합류한다.

1. **신뢰그래프 알고리즘 계보(2000년대 학계)** — 노드(사람/페이지/피어)와 방향성·가중 엣지(신뢰/링크/평가)로 이루어진 그래프에서 "누가 얼마나 신뢰받는가"를 **고유벡터(eigenvector) / 정상분포(stationary distribution)** 형태로 푸는 계열. EigenTrust(P2P 평판), PageRank·Personalized PageRank·TrustRank(웹 랭킹·스팸 대응), PGP web-of-trust(인증), SybilRank/SybilGuard(소셜그래프 시빌 방어)가 모두 같은 수학적 골격(반복 곱셈 → 수렴)을 공유한다.
2. **온체인 신용·평판 인프라(2020년대 크립토)** — 위 알고리즘 사상을 블록체인 위에 올려서 **무담보·저담보 대출**, **온체인 신용점수**, **비양도성 평판(SBT)**, **attestation(검증가능 주장)** 으로 구현하려는 시도. DeFi 신용(Aave 신용위임·Maple·Goldfinch·TrueFi), 온체인 신용점수(Spectral·Cred·ARCx), SBT(DeSoc 논문), 평판/신원(Gitcoin/Human Passport·EAS·OpenRank)이 여기에 속한다.

핵심 공통 긴장: **트러스트는 본질적으로 비이행적(non-transitive)인데, 그래프 알고리즘은 이행성을 가정해 전파한다.** 이 간극을 어떻게 메우느냐(정규화·감쇠·사전신뢰 시드·시빌 방어)가 모든 시스템의 설계 핵심이다.

---

### 1-1. EigenTrust — P2P 네트워크의 전이적 신뢰

**출처:** 원논문 Kamvar, Schlosser, Garcia-Molina, "The EigenTrust Algorithm for Reputation Management in P2P Networks" (WWW 2003, Stanford) — https://nlp.stanford.edu/pubs/eigentrust.pdf , Wikipedia https://en.wikipedia.org/wiki/EigenTrust , OpenRank docs https://docs.openrank.com/reputation-algorithms/eigentrust

**문제 설정.** Gnutella 같은 파일공유 P2P 네트워크에서 악의적 피어가 가짜/오염 파일을 뿌리는 것을 막고 싶다. 중앙 권위 없이, 각 피어가 "어떤 피어에게서 받으면 안전한가"를 판단할 **전역 평판값(global trust value)** 을 분산 계산하는 것이 목표.

**핵심 아이디어 (재귀적 평판).** "한 사람의 평판은 그를 신뢰하는 사람들에 의해 재귀적으로 정의되고, 그 사람들의 평판으로 가중된다." 내 친구를 믿는 것에서 시작해, 친구가 믿는 사람, 또 그가 믿는 사람으로 신뢰를 **전이(transitive)** 시켜 네트워크 전체로 커버리지를 넓힌다. (OpenRank docs)

**메커니즘 — 단계별 수식.** (원논문 표기)

1. **로컬 신뢰값(local trust value) s_ij.** 피어 i가 피어 j와의 거래에서 만족(sat)/불만족(unsat) 횟수의 차이로 직접 신뢰를 매긴다: `s_ij = sat(i,j) − unsat(i,j)`. 비대칭(i가 j를 보는 신뢰 ≠ j가 i를 보는 신뢰)이며 음수가 될 수 있다.

2. **정규화된 로컬 신뢰값 c_ij.** 음수는 0으로 클리핑하고, 피어 i가 매긴 값들의 합으로 나눠 행 단위로 정규화한다:
   ```
   c_ij = max(s_ij, 0) / Σ_k max(s_ik, 0)
   ```
   → 각 피어의 신뢰 "투표권"의 총합이 1이 된다(Σ_j c_ij = 1). **정규화의 목적:** 악의적 피어가 공모 피어에게 임의로 높은 값을, 선량한 피어에게 임의로 낮은 값을 매겨 시스템을 흔드는 것을 막는다(공모 피어에게 1을 다 줘도 그 합이 1로 묶임). (Wikipedia, 검색 확인)

3. **신뢰 전파(이행적 신뢰).** 피어 i는 자기가 아는 피어 k들에게 "j를 얼마나 믿느냐"를 물어보고, 그 응답을 자신이 k를 믿는 정도(c_ik)로 가중한다: `t_ij = Σ_k c_ik · c_kj`. 행렬로 쓰면 한 피어의 신뢰벡터 `t_i = C^T c_i`. 이걸 계속 반복하면(C를 n번 곱하면) i의 친구의 친구의 …까지 도달한다.

4. **전역 수렴 = 좌측 주고유벡터(left principal eigenvector).** 모든 피어가 같은 행렬 C를 반복 곱하면 시작 벡터와 무관하게 하나의 벡터 t로 수렴한다(C가 비가역·비주기적일 때). 이 t가 정규화 로컬 신뢰 행렬 C의 **좌측 주고유벡터**이고, 전역 평판값이다. 즉 `t = C^T t` (고유값 1에 대응). 이는 **마르코프 연쇄의 정상분포**이자 PageRank와 동일한 수학 구조. (원논문, Cornell 블로그 https://blogs.cornell.edu/info2040/2017/10/25/determining-trustability-in-p2p-networks-via-an-alternative-algorithm-eigentrust/ )

5. **사전신뢰 피어(pre-trusted peers) p.** 두 가지 문제를 동시에 푸는 장치:
   - (a) 끊긴 컴포넌트·악의적 공모집단이 자기들끼리만 신뢰를 순환시켜 외부 신뢰가 안 닿는 문제(비가역성),
   - (b) 신뢰 벡터의 초기·재출발(teleport) 기준 부재.

   사전신뢰 피어 집합 P(예: 네트워크 설계자·초기 채택자 — 자기가 만든 네트워크를 망칠 동기가 적은 자)를 정하고, 균등분포 벡터 p(i∈P면 1/|P|, 아니면 0)를 둔다. 최종 반복식:
   ```
   t^(k+1) = (1 − a) · C^T · t^(k) + a · p
   ```
   여기서 **a는 사전신뢰로 "재출발"할 확률**(PageRank의 1−d 텔레포트와 동일 역할). a를 섞으면 행렬이 비가역·비주기적이 되어 **수렴이 보장**되고, 악의적 공모집단의 영향이 제한된다. (검색 확인: "the pre-trusted peers guarantee convergence and break up malicious collectives")

**수렴 속도.** 보통 10회 미만 반복으로 수렴(전역값이 거의 안 변함). (검색 확인)

**Basic vs. Distributed/Secure 버전.** 원논문은 (1) 중앙에서 C를 다 모아 계산하는 *Basic* 알고리즘, (2) 각 피어의 점수를 여러 "점수 관리자(score manager)" 피어가 DHT로 중복 보관·교차검증해 분산 계산하는 *Secure/Distributed* 알고리즘을 제시. 분산 버전은 한 피어가 자기 점수를 조작 못 하게 한다.

**시빌·공모 저항.** 논문 실험: 악의적 집단(malicious collective — 서로 높은 점수를, 외부엔 낮은 점수를 주는 공모)이 네트워크의 **최대 70%**를 차지해도 불만족 다운로드를 크게 줄임. 단 시빌 공격(pseudospoofing — 한 적이 수천 개 가짜 피어 생성)은 사전신뢰 시드가 없으면 취약. (검색 확인)

**거리/distrust 모델링의 한계.** EigenTrust는 기본적으로 **중립 이상의 신뢰만** 다룬다. 로컬 신뢰 0 = "교류 없는 임의 피어에 두는 기본 신뢰", 음수는 0으로 클리핑(untrusted-by-default). 불신(distrust, 중립 이하)을 표현하려면 별도 기법(예: 양/음 카르마 점수 2개를 따로 계산해 결합)이 필요. (OpenRank docs — "Modeling Distrust")

---

### 1-2. PageRank·고유벡터 중심성 — 신뢰·신용으로의 응용

**출처:** PageRank 공식·감쇠 https://www.tutorialspoint.com/graph_theory/graph_theory_centrality_measures.htm , 감쇠계수 영향 arXiv https://arxiv.org/pdf/1201.4787 , 신뢰 모델링 적용 arXiv survey https://arxiv.org/pdf/2106.07528 , Dirichlet PageRank·trust ranking https://cseweb.ucsd.edu/~atsiatas/pktrust.pdf

**고유벡터 중심성(eigenvector centrality).** "중요한 노드와 연결될수록 그 노드도 중요하다"를 재귀적으로 정의. degree centrality(이웃 수)의 확장으로, 이웃이 균등하게 기여하는 게 아니라 **이웃의 중요도로 가중**된다. 인접행렬 A의 주고유벡터가 중심성 점수. EigenTrust·PageRank 모두 이 사상의 변형이다. (검색 확인)

**PageRank 공식.**
```
PR(v) = (1 − d)/N + d · Σ_{u→v} PR(u)/L(u)
```
- d = **감쇠계수(damping factor)**, 보통 0.85.
- N = 전체 노드 수.
- L(u) = u의 외향 링크 수.
- PageRank 벡터는 구글행렬 G의 **주고유벡터**(고유값 1): `G·π = π`. (검색 확인)

**감쇠계수의 의미.** "랜덤 서퍼"가 확률 d로 링크를 따라가고, 확률 (1−d)로 임의 페이지로 **점프(teleport)** 한다는 모델. 감쇠는 ① 구글행렬을 비가역(irreducible)으로 만들어 정상분포가 유일하게 존재하도록 보장하고, ② dangling/spider-trap(나가는 링크 없는 노드, 닫힌 루프)에 점수가 갇히는 걸 막는다. d가 1에 가까울수록 링크구조에 민감해지지만 수렴이 느려지고 순위가 불안정해진다(rank-reversal). (arXiv 1201.4787)

**신뢰 모델링에서의 감쇠 해석.** 신뢰 맥락에서 d는 "사용자가 네트워크 안의 타인을 **계속 신뢰**할 확률" vs (1−d) "아무도 신뢰 안 하고 리셋"으로 해석. 페이지에 주어지는 rank가 그 노드의 권위·인기에 비례. (arXiv 2106.07528 survey — 검색 확인)

**Personalized PageRank(PPR).** 표준 PageRank의 텔레포트 벡터가 **균등분포(1/N)** 인 데 비해, PPR은 텔레포트를 **특정 노드(들)에 편중된 벡터**로 바꾼다. 즉 "특정 시작점/관심사에서 본 상대적 중요도". 이로써 **개인화·맥락화된 신뢰 점수**(특정 피어 관점의 평판)를 계산할 수 있다. EigenTrust의 사전신뢰 p, TrustRank의 시드셋이 모두 PPR의 편향 텔레포트 벡터다. (검색 확인 — "TrustRank is a clever extension of Personalized PageRank")

**TrustRank — 웹 스팸 대응(신뢰 전파).**
**출처:** Gyöngyi, Garcia-Molina, Pedersen, "Combating Web Spam with TrustRank" (VLDB 2004, Stanford) — http://ilpubs.stanford.edu:8090/638/1/2004-17.pdf , https://www.vldb.org/conf/2004/RS15P3.PDF

- **전제:** "좋은 사이트는 스팸을 거의 링크하지 않는다(approximate isolation)." 신뢰는 좋은 사이트 → 좋은 사이트로 링크 구조를 타고 전파된다.
- **시드셋(seed set):** 사람이 직접 검수한 신뢰할 수 있는 사이트 소수에 초기 신뢰 점수(0 아님)를 주고, 나머지 전 웹은 0으로 시작.
- **전파:** 편향(biased) PageRank로 시드의 신뢰를 외향 링크로 퍼뜨린다 = **PPR의 응용**.
- **감쇠/분할(dampening & splitting):** 한 페이지가 받은 신뢰를 외향 링크로 나눠줄 때(splitting), 단계마다 β를 곱해 감쇠(`β · trust`)시켜 시드에서 멀어질수록 신뢰가 줄게 한다.
- **시드 선택:** 각 페이지의 **역(inverse) PageRank**(거꾸로 적은 홉으로 많은 페이지에 닿는 페이지)가 높은 것을 시드로 골라 커버리지를 키운다.
- **결과:** 수렴 후 좋은 사이트는 높은 TrustRank, 스팸은 낮은 점수. 실험에서 PageRank는 상위 10버킷에 스팸 90개를 넣은 반면 TrustRank는 58개로 줄임.
- **확장:** Anti-TrustRank/BadRank(불신을 역방향 전파해 스팸을 끌어내림), Topical TrustRank(주제별 시드로 신뢰 전파). (https://www.cse.lehigh.edu/~brian/pubs/2006/MTW/propagating-trust.pdf , https://www.cse.lehigh.edu/~brian/pubs/2006/WWW/topical-trustrank.pdf )

**SybilRank·SybilGuard·SybilLimit — 소셜그래프 시빌 방어(같은 계열).**
**출처:** SoK https://oaklandsok.github.io/papers/alvisi2013.pdf , SybilGuard ResearchGate, SybilRank diagram ResearchGate

- **공통 전제:** 실제 소셜그래프는 **fast-mixing**(랜덤워크가 빠르게 정상분포에 도달)이고, 정상 사용자 영역과 시빌 영역 사이의 **연결 컷(attack edges)** 이 좁다.
- **SybilRank:** 신뢰 시드셋에서 **짧은 랜덤워크(절단 거듭제곱법, O(log|V|) 반복)** 로 신뢰를 전파하고, 받은 신뢰가 낮은 계정을 시빌 의심으로 랭킹. Louvain 커뮤니티 검출과 결합. **= 정규화된 Personalized PageRank의 정상분포** 기반. (검색 확인)
- **SybilGuard/SybilLimit:** 랜덤 라우트가 정상 영역 안에 머무는 성질을 이용해 시빌을 제한. → 이 사상은 후에 **Gitcoin Passport·BrightID·Proof-of-Humanity** 등 크립토 시빌 방어로 이어짐.

---

### 1-3. Web of Trust — PGP/GPG 신뢰 웹과 이행성의 한계

**출처:** Wikipedia https://en.wikipedia.org/wiki/Web_of_trust , GnuPG manual https://www.gnupg.org/gph/en/manual/x334.html , GPGTools ownertrust FAQ https://gpgtools.tenderapp.com/kb/faq/what-is-ownertrust-trust-levels-explained , Linux Foundation https://www.linuxfoundation.org/blog/blog/pgp-web-of-trust-delegated-trust-and-keyservers , "Why did the PGP Web of Trust fail?" (Henry Story) https://medium.com/@bblfish/what-are-the-failings-of-pgp-web-of-trust-958e1f62e5b7

**개념.** PGP/GPG(OpenPGP)의 web-of-trust는 중앙 인증기관(CA)이 없는 **분산 PKI**. "공개키가 정말 그 사람의 것인가"를 사람들이 서로의 키에 **서명(signature)** 해 보증하고, 그 보증을 엮어 신뢰를 형성한다. 계층적 CA 모델과 대비되는 평평한(flat) 구조 — "CA가 없거나, 혹은 모두가 CA다." (Linux Foundation)

**두 가지 분리된 개념 — 핵심.**
1. **키 유효성(key validity):** "이 키가 정말 그 사람 것이라는 확신." 다른 사람들의 서명 수 + 그 서명자에 대한 owner-trust로 **계산**된다.
2. **소유자 신뢰(owner trust):** "이 사람이 **다른** 키를 검증하는 능력을 얼마나 믿는가"(= 이 사람의 서명을 얼마나 신뢰하나). 사용자가 **직접 설정**한다.

**신뢰 레벨(owner trust 값):** ultimate(키링 소유자 자신의 키 전용) / full / marginal / unknown / undefined / untrusted("이 사람의 서명은 안 믿음"). (검색 확인)

**유효성 계산 규칙(GnuPG 기본 모델):**
- **full로 신뢰하는 서명 1개**면 키가 valid가 된다.
- **marginal로 신뢰하는 서명 3개**(기본값, 설정 가능)면 valid가 된다.
- ultimate 신뢰 키는 모두 validity가 full. (GnuPG manual, 검색 확인)
- 기본 모델은 **최대 5단계(certificate depth)** 까지만 신뢰 체인을 따라간다.

**이행성(transitivity)의 한계 — 이 도메인의 핵심 교훈.**
- **트러스트는 이행적이지 않다.** A가 B의 키에 서명하고 B가 C의 키에 서명해도, A가 B를 신뢰한다는 것만으로 C의 키가 유효하다고 결론낼 수 없다 — owner-trust를 명시 설정하지 않는 한 신뢰 체인은 자동으로 흐르지 않는다. PGP web-of-trust는 의도적으로 **"non-transitive"** 로 설계됨(서명자 A를 믿어도 그게 C로 자동 전파되지 않음). (검색 확인)
- **검증 능력은 전이되지 않는다.** 신원 확인을 잘하는 사람이 서명한 키라도, 그 사람이 다음 사람도 잘 검증했다는 보장은 없다. 어떤 사람은 아무에게나 서명한다(검증 가정이 깨짐). (검색 확인)
- **owner-trust ≠ key-validity의 분리**가 바로 "트러스트는 이행적이지 않다"를 시스템에 박아넣은 장치. 키가 valid해도(그 사람 것이 맞아도), 그 사람의 **서명을** 신뢰할지는 별개로 내가 정한다.

**실패 이유(사회적·구조적):**
- 키서명은 **사회적 노동** — 충분한 서명을 모으기 어렵고, 키 서명 파티 같은 의식이 필요(기술 문제가 아니라 사회 문제).
- 평평한 구조라 책임·정책을 가진 중간 노드(CA의 역할)가 없음.
- 사용성 난해, 키서버 신뢰·키 폐기·확장성 문제. (Linux Foundation, Henry Story)

---

### 1-4. DeFi 신용/평판 프로토콜 — 무담보·저담보 대출

**출처:** Aave 신용위임 Messari https://messari.io/report/aave-announces-credit-delegation-enabling-uncollateralized-lending , Decrypt https://decrypt.co/37892/defi-lender-aave-credit-delegation-loan , 2026 DeFi lending 현황 Yellow https://yellow.com/research/decentralized-lending-2026-aave-on-chain-money-markets , 무담보 대출 CoinGecko https://www.coingecko.com/research/publications/undercollateralized-loans-the-future-of-defi-lending , Chainlink https://chain.link/article/undercollateralized-lending-defi , Three Sigma https://threesigma.xyz/blog/defi/defi-money-markets-2024-guide

**기본 문제 — 과담보의 한계.** DeFi 대출(Aave·Compound 등)은 기본이 **과담보(overcollateralization)**. 익명·무신뢰 환경에서 채무자 신원·상환의지를 알 수 없으니, 빌리는 것보다 많은 담보(예 150%)를 잡아 디폴트 시 청산한다. 이는 안전하지만 **자본 비효율**이고, 담보가 없는 사람은 신용을 못 얻는다(레버리지 도구일 뿐 진짜 "신용"이 아님). 무담보·저담보 대출은 이 장벽을 깨려는 시도. (Yellow, CoinGecko)

**Aave 신용위임(Credit Delegation).**
- **2020년 발표/2020년 첫 대출 집행.** 예치자(depositor)가 Aave에 자산을 공급하고, 자기 **신용 한도를 신뢰하는 상대(borrower)에게 위임**하면, 그 상대는 **담보 없이** Aave에서 빌릴 수 있다. (Messari, Decrypt)
- 메커니즘: 위임자는 자기 담보로 뒷받침되는 차입 권한을 특정 주소에 위임. 차입자가 디폴트하면 **위임자가 책임**진다 → 신뢰는 **오프체인(법적 계약·개인적 관계)** 으로 담보된다. 초기엔 OpenLaw 법적 합의와 결합.
- 즉 Aave 신용위임은 "프로토콜이 신용을 평가"하는 게 아니라 **"신뢰관계를 가진 두 당사자 사이로 신용을 전달하는 레일"**. 신뢰의 원천은 여전히 사람 간 관계. (이 도메인의 우리 모델과 가장 가까운 구조)

**무담보·저담보 대출 프로토콜 현황(2024~2026):**
- **Maple Finance** — 기관 차입자(트레이딩펌·기업) 대상 저담보/무담보. 2024년 5월 **Syrup** 출시(기관 수익을 DeFi에 개방, 무허가 접근). MakerDAO의 Spark가 2025년 2월 syrupUSDC vault에 초기 5천만 달러 배정. (검색 확인)
- **TrueFi** — 2020년 무담보 term-loan 풀의 선구자. 누적 17억 달러 대출, 생애 디폴트율 1~4%(하위 등급 하이일드 채권 수준). **대출자(lender)들이 특정 대출 승인을 투표** → 리스크 평가를 커뮤니티에 분산. (검색 확인)
- **Goldfinch** — 신흥시장·실물기업 대상. 오프체인 대출업체에 신용공여 → 그들이 현지 법정통화 대출. 그러나 **2024년 4월 차입자 Lend East가 1,020만 달러 중 425만 달러만 상환하는 대형 디폴트**(2021년 출범 이후 3번째 주요 디폴트) → 무담보 대출의 실제 신용리스크를 드러낸 사례. (검색 확인)
- 공통 흐름: 2022 Silo·Maple(격리 대출·무담보 신용) → 2024 TrueFi·Goldfinch가 **실물자산(RWA) 대출**로 확장. 평균 APY 10~17%(2024). 무담보 DeFi의 현실은 **개인 소비자 무담보가 아니라 "기관/검증된 차입자 + 오프체인 실사"** 가 대부분. (Three Sigma, Yellow)
- **시장 위치:** 2026년 4월 기준 Aave TVL 약 170억 달러로 압도적 1위(Compound 30억 미만, Spark 약 40억). 무담보·신용위임·저담보 vault가 과담보 장벽을 조금씩 침식 중이나 주류는 여전히 과담보. (Yellow)

**온체인 신용점수 프로젝트:**

- **Spectral Finance (MACRO Score).**
  - **MACRO = Multi-Asset Credit-Risk Oracle.** 지갑(들)의 전체 온체인 거래이력을 ML 기반 신용리스크 모델로 처리해 **350~850 범위 3자리 점수**(FICO 모방)를 거의 실시간 산출. 여러 지갑을 하나의 합성 자산으로 묶을 수 있음. (https://blog.spectral.finance/introduction-to-macro-score/ , Token Metrics deep dive https://insights.tokenmetrics.com/spectral-finance-on-chain-credit-scoring-for-defi-crypto-deep-dive/ )
  - 2020년 설립, 누적 약 3천만 달러 조달.
  - **중요한 현황 — 피벗.** Spectral Labs는 **온체인 신용점수에서 "온체인 AI 에이전트" 플랫폼으로 사업 중심을 이동**. 2024년 5월 자연어 프롬프트로 스마트컨트랙트·AI 에이전트를 생성·배포하는 **Syntax** 출시, 이후 Syntax V2. 회사는 "탈중앙 ML과 온체인 신용점수로 시작했으나 ML 문제 일반화로 더 큰 시장을 노린다"고 설명 → **신용점수는 더 이상 주력이 아님**(2024~2026). SPEC 토큰은 AI 에이전트 경제 테마로 거래. (https://venturebeat.com/business/democratizing-finance-spectral-labs-and-the-autonomous-finance-movement , https://blog.spectral.finance/spectralsyntax/ , Phemex https://phemex.com/academy/what-is-spectral-spec )

- **Cred Protocol.**
  - 온체인(+오프체인) 거래활동으로 개인·기업의 **대안 신용점수**를 만들어 DeFi 프로토콜·DAO·스마트컨트랙트가 리스크 기반 의사결정을 하게 함. "리스크를 스케일로 정량화"하는 금융 프리미티브, 크로스체인 호환. 목표는 무담보 소비자 대출을 underserved 커뮤니티에 개방. (https://credprotocol.com/ , Tracxn)
  - 투자자: Sterling Road, Luno Expeditions, Very Serious Ventures 등. Spectral과 함께 온체인 신용점수의 양대 선구자로 거론. (검색 확인)

- **ARCx — DeFi Passport / DeFi Credit Score.**
  - Polygon 위의 탈중앙 신용시장. 주소의 온체인 차입활동 기반 **0~999 DeFi Credit Score**로 ETH 담보에 **동적 최대 LTV** 대출 제공(점수 높을수록 더 적은 담보로 빌림 → 저담보). 2021년 도입, Dragonfly·Scalar 등 투자. (https://wiki.arcx.money/application/defi-credit-score , The Defiant https://thedefiant.io/arcx , The Block https://www.theblock.co/linked/106806/dragonfly-scalar-arcx-defi-passport )
  - **현황:** 대부분 자료가 2021~2022에 멈춰 있고, ARCX 거버넌스 토큰은 현재 시총이 사실상 0·비활성으로 보임. 공식적 "shutdown 발표"는 검색으로 확인되지 않으나 **활발히 운영되는 신호는 없음**(사실상 휴면/중단으로 추정, 명시 확인 불가). (CoinMarketCap, 검색 확인 — 단정 주의)

- **Credora (구 X-Margin).** 기관 대상 비공개 신용평가 → 2025년 **Credora Network**로 "DeFi를 위한 합의(consensus) 등급" 발표. ZK로 차입자 데이터 프라이버시 유지하며 신용 정량화. (https://www.prnewswire.com/news-releases/credora-unveils-the-credora-network-consensus-ratings-for-defi-302373640.html )

**요약 진단(온체인 신용점수의 현실):** FICO식 단일 점수를 온체인 거래만으로 만들려는 1세대 시도(Spectral·Cred·ARCx)는 ① **시빌/지갑 분리 문제**(나쁜 이력 지갑 버리고 새 지갑), ② **온체인 데이터만으론 소득·정체성 추론 한계**, ③ **무담보 대출의 실제 수요·디폴트 처리(법적 강제력 부재)** 때문에 소비자 무담보 대출로 이어지지 못함. Spectral은 AI로 피벗, ARCx는 사실상 휴면, 무담보 대출의 실질은 기관+오프체인 실사(Maple·TrueFi·Goldfinch)로 수렴. (Yellow, CoinGecko 종합)

---

### 1-5. SBT(Soulbound Tokens) — DeSoc 논문과 비양도성 평판

**출처:** 원논문 Weyl, Ohlhaver, Buterin, "Decentralized Society: Finding Web3's Soul" (SSRN, 2022-05) — https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4105763 , Bankless https://www.bankless.com/decentralized-society-desoc-explained , Decrypt https://decrypt.co/resources/what-are-soulbound-tokens-building-blocks-for-a-web3-decentralized-society , 비판/현실 CoinGecko https://www.coingecko.com/learn/soulbound-tokens-sbt

**논문·저자.** 2022년 5월 Vitalik Buterin(이더리움 공동창업자)·Puja Ohlhaver(변호사)·E. Glen Weyl(경제학자·RadicalxChange) 공저 "Decentralized Society: Finding Web3's Soul". "Soulbound"이라는 용어 자체는 Vitalik이 World of Warcraft의 양도 불가 아이템에서 차용.

**SBT 정의.** **비양도성(non-transferable)** 토큰. 특정 지갑 주소("Soul")에 영구히 묶여 양도·매매 불가. 사람/조직의 **정체성·자격·평판·소속·약속**을 온체인으로 표현. NFT와 유사하지만 거래 불가. (Decrypt, Tokenist)

**핵심 사상 — 금융화되지 않는 사회적 관계.**
- 기존 web3는 모든 것이 **거래 가능한 자산(transferable financial asset)** → 정체성·평판·관계 같은 **비금융적 사회 자본**을 표현 못 함. SBT는 양도 불가라서 **돈으로 살 수 없는 신뢰·평판**을 인코딩.
- **Soul(영혼) = 지갑.** 한 사람이 삶의 영역별로 여러 Soul을 가질 수 있고, 각 Soul이 학력·경력·의료기록·소속 같은 SBT를 보유.
- **소셜 회복(social recovery):** 키 분실 시 본인의 신뢰 네트워크(Souls의 커뮤니티)가 다수결로 키 복구를 인가 — 중앙기관 없는 복구.
- **출처기반 신뢰(provenance):** 누가 발행한 SBT인지(발행자 Soul의 평판)가 그 자격의 신뢰도를 결정 → **그래프상의 신뢰 전파**와 연결.

**구체 응용(논문 제안):**
- **무담보 대출:** SBT로 표현된 교육·고용·평판·기존 대출 상환 이력을 **온체인 신용·평판 담보(reputational collateral)** 로 써서 과담보를 대체. SBT 디폴트 시 평판에 영구 흠집(상환 안 하면 SBT가 신용 손상 기록을 남김) → "평판이 담보". (논문 §)
- **Sybil 저항 거버넌스·플루럴리티:** 같은 커뮤니티(상관된 SBT를 공유)의 표는 가중치를 낮춰(correlation discounting), 1인 1표에 가깝게. 시빌 공격·금권정치(plutocracy) 완화.
- **DeSoc(Decentralized Society):** SBT 발행자·보유자가 엮여 만드는 **신뢰 네트워크 자체가 사회의 기반**. 위에서 아래(중앙)가 아니라 관계의 망(아래에서)으로 신뢰가 구성.

**현실·비판(2024~2026):**
- **프라이버시·역익명화:** Cornell 2024 연구 — 공개 SBT **4~5개만으로도** 1만 지갑 중 한 개인을 **97% 이상 정확도**로 특정. 양도 불가 평판이 영구히 지갑에 박히면 강력한 식별자가 됨(체인분석으로 행동패턴 상관 → 디아노니마이즈). (CoinGecko, 검색 확인)
- **키 분실 = 정체성 전체 상실:** 지갑 키를 잃으면 비양도 자격(학위 등)을 전부 잃음. 재발급 = KYC 전과정 재수행 → 사용성 치명. 소셜 회복은 아직 미성숙. (검색 확인)
- **채택 저조:** 프라이버시·복구·사용성 미해결로 광범위 채택 안 됨. ERC-5114/EIP-4973 등 비양도 토큰 표준 논의는 있었으나 표준 단일화·킬러앱 부재. SBT는 **개념·연구는 활발하나 대규모 실사용은 제한적**(2024~2026). 실제 작동 사례는 POAP(참가증명, 양도 가능하지만 비슷한 정신), Gitcoin 패스포트 스탬프, 일부 학위·자격 증명 PoC에 머묾. (CoinGecko, SoluLab)

---

### 1-6. 온체인 평판·신원 — Passport·EAS·attestation·OpenRank

**출처:** Human/Gitcoin Passport https://human.tech/blog/human-passport-proof-of-personhood-and-sybil-resistance-for-web3 , https://passport.human.tech/ , The Defiant https://thedefiant.io/news/security/sybil-resistance-tool-human-passport-launches-new-features-for-base , EAS docs https://docs.attest.org/ , QuickNode https://www.quicknode.com/guides/ethereum-development/smart-contracts/what-is-ethereum-attestation-service-and-how-to-use-it , OpenRank/Karma3Labs https://docs.openrank.com/ , Decrypt https://decrypt.co/219892/karma3-labs-raises-a-45m-seed-round-led-by-galaxy-and-ideo-colab-to-build-openrank-a-decentralized-reputation-protocol

**Gitcoin Passport → Human Passport (proof-of-personhood / 시빌 방어).**
- 사용자가 web2·web3 **검증가능 자격(Stamps)** 을 모아 "나는 사람이고 고유한 개인"임을 증명하는 신원 검증 앱. 오픈소스 시빌 방어 프로토콜, 프라이버시 보존.
- **Stamps 예시:** web2 = Facebook·Twitter·Github·Google 계정(기준 충족), web3 = BrightID·ENS·Proof-of-Humanity·Guild 등. 여러 출처의 스탬프를 모아 **humanity score(인간성 점수)** 로 집계. 펀딩 라운드(Gitcoin Grants의 쿼드라틱 펀딩)는 최소 점수로 자격을 걸거나 점수로 매칭 가중치를 조정.
- **2024~2026 현황:** Gitcoin Passport에서 **Human Passport(human.tech)** 로 리브랜딩. 2026년 3월 기준 120+ 프로젝트·150+ 캠페인에 시빌 방어 제공, 5.12억 달러 이상의 자본 흐름 보호. L2 Base용 신규 기능 출시. (검색 확인)
- 핵심 사상: 단일 강한 ID(KYC)가 아니라 **여러 약한 신호의 합 + 위조 비용(cost-of-forgery)** 으로 시빌을 비싸게 만든다. 1-2의 SybilRank 사상과 같은 계열(다만 그래프 전파보다 자격 집계 중심).

**EAS (Ethereum Attestation Service) — attestation 기반 신뢰의 토대.**
- **정의:** 온체인/오프체인으로 **attestation(누군가가 무언가에 대해 디지털 서명한 주장)** 을 만드는 오픈소스 공공재 인프라. "any entity about anything" — 어떤 주체가 어떤 것에 대해서든 검증가능한 주장을 남길 수 있다. (docs.attest.org)
- **아키텍처 — 단 두 개의 스마트컨트랙트:**
  1. **Schema Registry:** attestation의 데이터 구조·타입을 정의하는 스키마를 등록(누구나 임의 주제로 생성).
  2. **Attestation(EAS) 컨트랙트:** 그 스키마를 참조해 실제 attestation을 발행.
- **Resolver 컨트랙트(선택):** attestation 시 추가 로직 실행(결제 처리, NFT 민팅, DAO 거버넌스 트리거 등).
- **온체인 vs 오프체인:** 온체인은 가스 필요·체인에 저장. 오프체인은 가스 0·실제 데이터는 체인에 안 올리고 URL의 URI 프래그먼트에 인코딩(프라이버시). **둘 다 디지털 서명의 진정성·불변성 보장.**
- **위치:** EAS는 **레이어드 신뢰의 하부 프리미티브**. SBT·평판점수·신원 시스템이 EAS attestation 위에 쌓일 수 있다(예: Coinbase Verifications, Gitcoin이 attestation 기반 펀딩으로 활용). (QuickNode, Gitcoin attestation-based funding)
- **특징:** attestation을 정체성·위조비용 모델에 묶으면 가짜 참가자 생성이 어려워지고, 잘 설계하면 **기저 개인정보를 노출하지 않고 특정 주장만 증명**(selective disclosure)할 수 있다. (검색 확인)

**OpenRank (Karma3 Labs) — EigenTrust의 온체인 부활.**
- **탈중앙 평판 프로토콜.** EigenTrust·행렬분해(Matrix Factorization) 등 **그래프 알고리즘을 검증가능 연산(verifiable compute)** 으로 온체인 평판그래프에 적용. ZK 증명으로 그래프 연산을 검증. (docs.openrank.com)
- **입력 데이터:** Farcaster·Lens 소셜그래프, 온체인 트랜잭션(토큰 전송·컨트랙트 상호작용·NFT 보유)을 EigenTrust로 처리해 **사용자별 개인화 네트워크 그래프·랭킹** 생성.
- **사용처:** MetaMask Snaps 마켓플레이스 커뮤니티 평점, Lens·Farcaster 랭킹/추천 API, 지갑·소비자앱의 온체인 디스커버리 피드, 평판 기반 투표·거버넌스.
- **현황:** 2024년 3월 Galaxy·IDEO CoLab 주도 450만 달러 시드. go-eigentrust 오픈소스 구현 유지, Neynar가 Farcaster OpenRank 랭킹 호스팅. (Decrypt, CryptoPotato, 검색 확인)
- → **이 도메인에서 가장 직접적으로 "신뢰그래프 알고리즘(EigenTrust) = 온체인 평판"을 잇는 현존 프로젝트.** 우리 모델의 3층(Φ 전파)과 수학적으로 가장 가까움.

---

### 출처

**신뢰그래프 알고리즘**
- EigenTrust 원논문 (Kamvar et al., WWW 2003, Stanford): https://nlp.stanford.edu/pubs/eigentrust.pdf
- EigenTrust 컨퍼런스판: https://www2003.thewebconf.org/cdrom/papers/refereed/p446/p446-kamvar/index.html
- EigenTrust Wikipedia: https://en.wikipedia.org/wiki/EigenTrust
- OpenRank — EigenTrust 설명(로컬트러스트·시드·distrust): https://docs.openrank.com/reputation-algorithms/eigentrust
- Cornell INFO2040 EigenTrust 블로그: https://blogs.cornell.edu/info2040/2017/10/25/determining-trustability-in-p2p-networks-via-an-alternative-algorithm-eigentrust/
- PageRank·고유벡터 중심성·감쇠: https://www.tutorialspoint.com/graph_theory/graph_theory_centrality_measures.htm
- PageRank rank-reversal·감쇠계수 의존성 (arXiv): https://arxiv.org/pdf/1201.4787
- 신뢰 모델링 종합 서베이 (arXiv 2106.07528): https://arxiv.org/pdf/2106.07528
- Dirichlet PageRank·trust-based ranking (UCSD): https://cseweb.ucsd.edu/~atsiatas/pktrust.pdf
- TrustRank 원논문 (Gyöngyi et al., VLDB 2004, Stanford): http://ilpubs.stanford.edu:8090/638/1/2004-17.pdf , https://www.vldb.org/conf/2004/RS15P3.PDF
- Propagating Trust and Distrust (Anti-TrustRank, Lehigh): https://www.cse.lehigh.edu/~brian/pubs/2006/MTW/propagating-trust.pdf
- Topical TrustRank (Lehigh): https://www.cse.lehigh.edu/~brian/pubs/2006/WWW/topical-trustrank.pdf
- Sybil 방어 SoK (Oakland): https://oaklandsok.github.io/papers/alvisi2013.pdf

**Web of Trust (PGP/GPG)**
- Web of trust Wikipedia: https://en.wikipedia.org/wiki/Web_of_trust
- GnuPG manual — 키 유효성 검증: https://www.gnupg.org/gph/en/manual/x334.html
- GPGTools — ownertrust/신뢰레벨 FAQ: https://gpgtools.tenderapp.com/kb/faq/what-is-ownertrust-trust-levels-explained
- Linux Foundation — PGP Web of Trust(위임신뢰·키서버): https://www.linuxfoundation.org/blog/blog/pgp-web-of-trust-delegated-trust-and-keyservers
- "Why did the PGP Web of Trust fail?" (Henry Story): https://medium.com/@bblfish/what-are-the-failings-of-pgp-web-of-trust-958e1f62e5b7

**DeFi 신용/무담보 대출·온체인 신용점수**
- Aave 신용위임 (Messari): https://messari.io/report/aave-announces-credit-delegation-enabling-uncollateralized-lending
- Aave 첫 신용위임 대출 (Decrypt): https://decrypt.co/37892/defi-lender-aave-credit-delegation-loan
- DeFi lending 2026 현황 (Yellow): https://yellow.com/research/decentralized-lending-2026-aave-on-chain-money-markets
- 무담보 대출의 미래 (CoinGecko): https://www.coingecko.com/research/publications/undercollateralized-loans-the-future-of-defi-lending
- 무담보 대출 (Chainlink): https://chain.link/article/undercollateralized-lending-defi
- DeFi Money Markets 2024 (Three Sigma): https://threesigma.xyz/blog/defi/defi-money-markets-2024-guide
- Spectral MACRO Score 소개: https://blog.spectral.finance/introduction-to-macro-score/
- Spectral 딥다이브 (Token Metrics): https://insights.tokenmetrics.com/spectral-finance-on-chain-credit-scoring-for-defi-crypto-deep-dive/
- Spectral → AI 에이전트 피벗 (VentureBeat): https://venturebeat.com/business/democratizing-finance-spectral-labs-and-the-autonomous-finance-movement
- Spectral Syntax 소개: https://blog.spectral.finance/spectralsyntax/
- Spectral SPEC/Syntax (Phemex): https://phemex.com/academy/what-is-spectral-spec
- Cred Protocol: https://credprotocol.com/
- ARCx DeFi Credit Score wiki: https://wiki.arcx.money/application/defi-credit-score
- ARCx DeFi Passport (The Defiant): https://thedefiant.io/arcx
- ARCx DeFi Passport (The Block): https://www.theblock.co/linked/106806/dragonfly-scalar-arcx-defi-passport
- Credora Network 발표 (PRNewswire): https://www.prnewswire.com/news-releases/credora-unveils-the-credora-network-consensus-ratings-for-defi-302373640.html

**SBT / DeSoc**
- "Decentralized Society: Finding Web3's Soul" (SSRN, 2022): https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4105763
- DeSoc 해설 (Bankless): https://www.bankless.com/decentralized-society-desoc-explained
- SBT 해설 (Decrypt): https://decrypt.co/resources/what-are-soulbound-tokens-building-blocks-for-a-web3-decentralized-society
- SBT 현황·비판 (CoinGecko): https://www.coingecko.com/learn/soulbound-tokens-sbt

**온체인 평판·신원**
- Human Passport(구 Gitcoin Passport) proof-of-personhood: https://human.tech/blog/human-passport-proof-of-personhood-and-sybil-resistance-for-web3
- Human Passport 신규 기능 Base (The Defiant): https://thedefiant.io/news/security/sybil-resistance-tool-human-passport-launches-new-features-for-base
- EAS 공식 docs: https://docs.attest.org/
- EAS 가이드 (QuickNode): https://www.quicknode.com/guides/ethereum-development/smart-contracts/what-is-ethereum-attestation-service-and-how-to-use-it
- OpenRank docs: https://docs.openrank.com/
- Karma3 Labs/OpenRank 시드라운드 (Decrypt): https://decrypt.co/219892/karma3-labs-raises-a-45m-seed-round-led-by-galaxy-and-ideo-colab-to-build-openrank-a-decentralized-reputation-protocol

---

## 2. 매핑 (기존 개념 → 우리 4층)

| 기존 개념 | 한 줄 정의 | 우리 4층 대응 위치 | 정합 | 비고 |
|---|---|---|---|---|
| EigenTrust | 정규화 로컬신뢰의 좌측 고유벡터·전이적 신뢰 | **3층 Φ(가중 재귀 전파, PHI-1②)** | ○○○ | 우리 Φ의 직접 수학적 선조 |
| 정규화(c_ij, 행합=1) | 공모·악용 방어 | **PHI-5에 도입 필요** | ○ | "아무에게나 뿌려 점수 올리기" 방어책 |
| 사전신뢰 시드 p·teleport | 수렴보장+공모차단 | **PHI-5 전파 설계** | ○ | 누구를 사전신뢰로? |
| 음수 클리핑 max(s,0) | distrust 전파 포기 | **PHI-4 음수 처리** | △ | 우리도 음수(배신·default) 전파 난제 동일 |
| PageRank·감쇠 d | 정상분포·teleport | **09 시제품·PHI-5 감쇠** | ○ | 우리가 이미 쓴 것 |
| Personalized PageRank | 특정 시작점 편향 | 개인화·용도별 신용 | ○ | 기회 |
| TrustRank/Anti-TrustRank | 신뢰 전파/불신 역전파 | 신용 전파 + default 역전파(PHI-1③) | ○ | Anti-TrustRank=우리 리스크 전파 |
| ★web-of-trust 비이행성 | 신뢰는 이행적이지 않다(PGP) | **3층 전제에 대한 근본 경고** | 경고 | owner-trust/validity 분리 |
| Aave 신용위임 | 신뢰관계로 무담보 신용 전달 | 우리 구조와 동형(신뢰=신용레일) | ○ | 우리는 데이터로 정량화 |
| 온체인 신용점수(Spectral·ARCx) | 거래이력→FICO식 점수 | 3층 신용과 같은 목표 | 경고 | 다 실패/피벗(시빌·데이터한계) |
| SBT/DeSoc(Buterin) | 비양도 평판·평판담보 대출 | **우리 비전과 사상적 일치(모이=Soul)** | ○○ | 결혼식=Hom 샘플링이 더 구체적 |
| correlation discounting | 같은 커뮤니티 표 가중↓ | **PHI-5 중복신호 할인** | ○ | 같은 집단 중복 부조 할인 |
| OpenRank(EigenTrust 온체인) | 그래프 평판 검증가능연산 | **우리 3층의 현존 구현 사례** | ○○ | 가장 가까운 레퍼런스 |
| EAS attestation | 검증가능 주장 인프라 | 1층 액션·역할 온체인 기록 | △ | 기회(온체인화) |
| proof-of-personhood(Passport) | 약한신호 합으로 시빌방어 | **모이 진위(가짜 부조) 방어** | ○ | 배울 점 |

---

## 3. 검토 (정합 · 엇나감 · 메울 갭 · 배울 것)

**정합 총평.** **이 영역은 우리 3층과 *수학 골격*을 가장 많이 공유한다.** EigenTrust(정규화 로컬신뢰의 고유벡터)는 우리 PHI-1②(상대 신용으로 가중되는 재귀 전파)와 같은 골격이고, OpenRank는 그것을 온체인 평판으로 구현한 현존 레퍼런스다. **단 "그 자체"는 과장** — EigenTrust는 ① 음수(distrust)를 0으로 클리핑해 *전파를 포기*하고(우리 PHI-1③/PHI-4의 배신·default 음수 전파와 정반대), ② 정규화(행합=1)로 *절대 신용량을 버리며*(우리 '온기 총합' 같은 절대량과 충돌), ③ 입력이 sat/unsat 카운트라 우리 호혜원장(금액·청산·default판정)과 의미론이 다르다. 골격은 같되 바로 이 세 지점에서 갈라진다. PageRank·감쇠·Personalized PageRank·Anti-TrustRank(불신 역전파=우리 리스크 전파)까지 우리 설계 조각이 모두 이 계보에 이미 있다.

**PHI-5에 직접 가져올 것(가장 실용적 수확).**
1. **정규화(행합=1)** — 우리가 PHI-1에서 걱정한 "아무에게나 베풀어 점수 올리는 악용"의 정확한 해법.
2. **사전신뢰 시드 + teleport(감쇠)** — 전파 수렴 보장 + 공모집단 차단. PHI-5 전이 연산의 뼈대.
3. **correlation discounting** — 같은 집단의 중복 신호(한 가족이 서로 부조) 가중 할인 = 시빌·공모 방어.
4. **음수 처리 선택지** — EigenTrust는 음수를 클리핑(전파 포기), 또는 양/음 2점수 분리. 우리 PHI-4 음수(배신·default) 전파의 두 현실적 옵션.

**논리적으로 엇나가는·주의할 지점(근본 경고 둘).**
1. **web-of-trust 비이행성.** PGP는 "신뢰는 이행적이지 않다"를 시스템에 박고도 사회적으로 실패했다. 우리 3층 전체가 *전이적 신뢰 전파*를 가정한다 — 이것이 가장 강한 반론이다. PGP의 **owner-trust(그 사람의 판단을 믿나) vs key-validity(그 사람이 맞나) 분리**를 우리도 도입할지 검토해야(= "A를 신뢰"와 "A가 신뢰하는 자를 신뢰"는 별개).
2. **온체인 신용점수 1세대가 소비자 무담보 신용으로 스케일하지 못함(폐업 아님 — 피벗/휴면).** Spectral(MACRO Score는 존속하나 사업 중심이 AI 에이전트로 피벗)·ARCx(휴면 추정)·Cred. 못 간 이유: ① **시빌**(나쁜 지갑 버리고 새 지갑), ② 온체인 데이터만으론 정체성·소득 추론 한계, ③ 무담보 대출의 법적 강제력 부재. → **우리도 같은 함정.** 차별점이 이걸 피하는지가 생사인데, "경조사=실제 신원·관계라 시빌이 어렵다"는 *확보된 강점이 아니라 입증 대상*이다(가짜 하객·허위 부조 비용은 온라인 팔로우보다 비싸도 0이 아님).

**우리가 메울 수 있는 갭(차별화).**
1. **호혜원장(EM 아벨군)을 로컬신뢰로** — EigenTrust의 sat/unsat 카운트보다 풍부한 베이스(금액·청산·default판정).
2. **경조사=실제 신원·관계** — 온체인 신용점수가 죽은 시빌·데이터한계를 우회하는 우리의 방어선.
3. **결혼식=Hom 전수 샘플링(요네다)** — SBT(평판담보)보다 *구체적 관측 장치*. DeSoc의 추상적 비전을 실제 의례로 구현.

**프라이버시 경고.** SBT 역익명화(공개 평판 4~5개로 개인 97% 특정)는 우리에게도 적용 — 부조·관계 데이터의 프라이버시 설계 필수.
