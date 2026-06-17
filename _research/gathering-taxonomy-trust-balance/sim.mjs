// 신뢰 잔액 시뮬레이션 — 10명 × 10년 (결정적)
// 모델: 07-fold-dynamics.md 그대로. signal{from,to,자원,크기,청산,default판정} → fold.
//   청산: 미청산=EM / 무청산=CS / 즉시=거래(0)
//   default판정: 미반환이 신용 손상 사건인가 — 부조=불가, 대여=가능 (§2-2). 키에 포함 → 부조·대여 분리.

// ====== SIM-1. 등장인물 10명 + 초기 관계(t=0) ======
const PEOPLE = ['민수','영희','철수','수진','지훈','은정','태호','보라','현우','미래'];
// 초기 엣지: [a, b, 관계, 시드 CS유대(양방향 동일)]  — EM은 0에서 시작(이벤트로 쌓임)
const SEED = [
  ['민수','영희','친구',2], ['민수','철수','친구',2], ['영희','수진','친구',2],
  ['철수','지훈','동료',1], ['지훈','은정','연인',4], ['수진','보라','친구',2],
  ['태호','현우','형제',5], ['민수','태호','동료',1], ['보라','미래','친구',2],
  ['영희','철수','지인',0.5],
];

// ====== 상태 + fold (07 그대로) ======
function newState(){ return { EM:{}, CS:{} }; }
const k = (...xs) => xs.join('|');
function apply(st, s){                                   // 신호 1개를 상태에 fold
  if (s.청산 === '즉시') { st.거래?.push?.(s); return; } // 거래: 트러스트 0(대여 default는 따로)
  const bucket = s.청산 === '미청산' ? st.EM : st.CS;
  const key = s.청산 === '미청산' ? k(s.from,s.to,s.자원,s.default판정) : k(s.from,s.to,s.자원);
  bucket[key] = (bucket[key]||0) + s.크기;
}
const emNet = (st,a,b,r,d) => (st.EM[k(a,b,r,d)]||0) - (st.EM[k(b,a,r,d)]||0); // 같은 종류끼리만 청산
const csTie = (st,a,b) => st.CS[k(a,b,'유대')]||0;

// ====== SIM-2. 이벤트 타입 → 액션 → signal 규칙 ======
// 각 규칙은 이벤트 파라미터로 signal 배열을 생성. 카탈로그/07과 일관.
const 부조 = (g,h,액) => [
  {from:g,to:h,자원:'돈',크기:액,청산:'미청산',default판정:'불가'},  // 부조(EM, default 불가)
  {from:g,to:h,자원:'유대',크기:1,청산:'무청산'},                    // 참석(CS)
  {from:h,to:g,자원:'유대',크기:0.5,청산:'무청산'},                  // 호스트 답례/감사(CS)
];
const RULES = {
  결혼식:  ({host,부조s})=> 부조s.flatMap(([g,액])=>부조(g,host,액)),
  장례식:  ({host,부조s})=> 부조s.flatMap(([g,액])=>부조(g,host,액)),   // 조의 = 부조 동형
  생일:    ({host,참석})=> 참석.flatMap(g=>[                              // 선물=증여(CS), 참석(CS)
             {from:g,to:host,자원:'유대',크기:1,청산:'무청산'} ]),
  집들이:  ({host,참석})=> 참석.flatMap(g=>[
             {from:g,to:host,자원:'유대',크기:1,청산:'무청산'},          // 선물·함께먹음(CS)
             {from:host,to:g,자원:'유대',크기:0.5,청산:'무청산'} ]),     // 대접(CS)
  정기모임:({참석})=>{ const out=[]; for(let i=0;i<참석.length;i++)for(let j=i+1;j<참석.length;j++){
             out.push({from:참석[i],to:참석[j],자원:'유대',크기:0.5,청산:'무청산'});
             out.push({from:참석[j],to:참석[i],자원:'유대',크기:0.5,청산:'무청산'}); } return out; },
  돈빌림:  ({lender,borrower,액})=> [
             {from:lender,to:borrower,자원:'돈',크기:액,청산:'미청산',default판정:'가능'} ], // 대여(EM, default 가능)
  상환:    ({borrower,lender,액})=> [
             {from:borrower,to:lender,자원:'돈',크기:액,청산:'미청산',default판정:'가능'} ], // 상환 → 대여와 net
};

// ====== SIM-3. 10년 타임라인(결정적) ======
const TIMELINE = [
  [1,'정기모임',{참석:['민수','철수','지훈','태호']}],
  [1,'생일',    {host:'수진',참석:['영희','보라','미래']}],
  [2,'결혼식',  {host:'민수',부조s:[['영희',5],['철수',5],['수진',3],['지훈',5],['태호',3]]}],
  [3,'집들이',  {host:'철수',참석:['영희','민수','수진']}],
  [3,'결혼식',  {host:'지훈',부조s:[['철수',5],['민수',5],['태호',3]]}],
  [4,'돈빌림',  {lender:'민수',borrower:'태호',액:200}],   // 대여 200(만)
  [4,'정기모임',{참석:['민수','철수','지훈','태호']}],
  [5,'결혼식',  {host:'영희',부조s:[['민수',10],['수진',5],['보라',3],['지훈',5],['은정',3]]}], // 민수→영희(Y2 영희→민수 5와 net)
  [5,'상환',    {borrower:'태호',lender:'민수',액:200}],   // 태호 갚음 → 대여 청산
  [6,'결혼식',  {host:'수진',부조s:[['영희',5],['보라',3],['미래',3],['민수',5]]}],
  [6,'생일',    {host:'보라',참석:['수진','미래']}],
  [7,'돈빌림',  {lender:'민수',borrower:'지훈',액:300}],   // 대여 300
  [8,'장례식',  {host:'태호',부조s:[['민수',5],['철수',3],['지훈',3]]}],
  // Y8 지훈 default: 안 갚음 → 민수→지훈 대여 잔액 그대로 남음(3층 신호). 상환 이벤트 없음으로 표현.
  [9,'집들이',  {host:'은정',참석:['지훈','철수','민수']}],
  [9,'결혼식',  {host:'미래',부조s:[['수진',5],['보라',5],['영희',3]]}],
  [10,'정기모임',{참석:['민수','철수','지훈','태호']}],
];
const DEFAULTS = [ {borrower:'지훈',lender:'민수',액:300,year:8} ]; // 미상환 = default 사건

// ====== SIM-4. 시뮬레이션 엔진 ======
function simulate(uptoYear){
  const st = newState(); st.거래=[];
  // 시드 CS
  for (const [a,b,_rel,cs] of SEED){ apply(st,{from:a,to:b,자원:'유대',크기:cs,청산:'무청산'}); apply(st,{from:b,to:a,자원:'유대',크기:cs,청산:'무청산'}); }
  for (const [year,type,p] of TIMELINE){
    if (year>uptoYear) continue;
    for (const s of RULES[type](p)) apply(st,s);
  }
  return st;
}

// ====== SIM-5. 결과 추이 출력 ======
function 부조잔액(st,a,b){ return emNet(st,a,b,'돈','불가'); }   // +면 b가 a에게 부조 미청산
function 대여잔액(st,a,b){ return emNet(st,a,b,'돈','가능'); }   // +면 b가 a에게 대여 미상환
function showMilestone(year){
  const st = simulate(year);
  console.log(`\n========== Y${year} 상태 ==========`);
  // EM 부조 잔액(0 아닌 것만)
  console.log('[부조 잔액] (A↦B +면 B가 A에게 갚을 차례, 미청산)');
  for (const a of PEOPLE) for (const b of PEOPLE){ if(a>=b) continue;
    const n=부조잔액(st,a,b); if(n!==0) console.log(`  ${a}↦${b}: ${n>0?'+':''}${n}만 ${n>0?`(${b}가 ${a}에게)`:`(${a}가 ${b}에게)`}`); }
  // EM 대여 잔액
  const loans=[]; for (const a of PEOPLE) for (const b of PEOPLE){ if(a>=b) continue;
    const n=대여잔액(st,a,b); if(n!==0) loans.push(`  ${a}↦${b}: ${n>0?'+':''}${n}만 (대여 미상환)`); }
  console.log('[대여 잔액]'+(loans.length?'\n'+loans.join('\n'):' 없음(다 청산)'));
  // CS 유대 상위
  const ties=[]; for (const a of PEOPLE) for (const b of PEOPLE){ if(a===b) continue;
    const t=csTie(st,a,b); if(t>0) ties.push([a,b,t]); }
  ties.sort((x,y)=>y[2]-x[2]);
  console.log('[CS 유대 상위 8] (방향별)');
  ties.slice(0,8).forEach(([a,b,t])=>console.log(`  ${a}→${b}: ${t}`));
  return st;
}

console.log('### 신뢰 잔액 시뮬레이션 — 10명 × 10년 ###');
console.log('등장인물:', PEOPLE.join(', '));
console.log('초기 관계:', SEED.map(([a,b,r])=>`${a}-${b}(${r})`).join(', '));
[0,3,5,10].forEach(showMilestone);

// ====== 검증 스폿체크 ======
console.log('\n\n========== 검증 ==========');
const fin = simulate(10);
// ① 민수-영희 부조: 영희→민수 5(Y2) + 민수→영희 10(Y5) → 민수가 5 더 줌 → net(민수,영희)= +?
console.log(`① 민수-영희 부조 net(민수,영희)= ${부조잔액(fin,'민수','영희')} (영희가 민수에게. Y2 영희→민수5, Y5 민수→영희10 → 민수가 5 초과 → 영희 -5 = 민수가 영희에게 5 미청산 기대)`);
// ② 태호 대여: Y4 빌리고 Y5 갚음 → 0
console.log(`② 민수-태호 대여 net= ${대여잔액(fin,'민수','태호')} (Y4 200 빌리고 Y5 200 상환 → 0 청산)`);
// ③ 지훈 대여 default: Y7 300 빌리고 안 갚음 → 300 남음
console.log(`③ 민수-지훈 대여 net= ${대여잔액(fin,'민수','지훈')} (Y7 300, 상환 없음 → 300 미상환 = default)`);
// ④ 부조와 대여가 분리되나: 민수-태호는 부조(장례 등)와 대여가 따로
console.log(`④ 민수-태호 부조 net= ${부조잔액(fin,'민수','태호')}, 대여 net= ${대여잔액(fin,'민수','태호')} (두 장부 분리 — 합산 안 됨)`);

// ============================================================
// 3층. 신용 전파 (L3) — 자원별 PageRank + 행동 신호 + 합산
// 결정(first-cut, 임의·근사): 무방향 전파 · default→이행점수 0.2 · 비중 부조0.5·CS0.3·이행0.2
// ============================================================
console.log('\n\n========== 3층. 신용 전파 ==========');
const N = PEOPLE.length;

// L3-1. 자원별 동질 그래프 분리(무방향 가중) — 부조·CS. (대여는 sparse → 행동신호로 L3-3)
function buildGraphs(st){
  const 부조={}, csG={}; PEOPLE.forEach(p=>{부조[p]={};csG[p]={};});
  const add=(G,a,b,w)=>{ if(w<=0)return; G[a][b]=(G[a][b]||0)+w; G[b][a]=(G[b][a]||0)+w; };
  for(let i=0;i<N;i++)for(let j=i+1;j<N;j++){ const a=PEOPLE[i],b=PEOPLE[j];
    add(부조,a,b, Math.abs(부조잔액(st,a,b)));        // 부조: |net|(무방향)
    add(csG,a,b, csTie(st,a,b)+csTie(st,b,a));         // CS: 양방향 유대 합
  }
  return {부조, cs:csG};
}
// L3-2. PageRank(무방향 가중, 텔레포트 d=0.85). 고립(degree0)은 텔레포트 baseline만.
function pagerank(G, d=0.85, iters=200){
  let s={}; PEOPLE.forEach(p=>s[p]=1/N);
  const deg=p=>Object.values(G[p]).reduce((x,y)=>x+y,0);
  for(let it=0;it<iters;it++){
    let dangling=0; PEOPLE.forEach(p=>{ if(deg(p)===0) dangling+=s[p]; });
    const nx={};
    for(const a of PEOPLE){ let inflow=0;
      for(const b of PEOPLE){ if(!G[b][a]) continue; inflow += (G[b][a]/deg(b))*s[b]; }
      nx[a] = (1-d)/N + d*(inflow + dangling/N);
    }
    s=nx;
  }
  return s;
}
// L3-3. 행동 신호 → 이행 점수(네트워크 아닌 노드 직접). 대여 기록 기반.
//   first-cut: 갚음=1.0, default=0.2, 기록없음=0.7(중립). ※ 값 임의 — 정식은 금액·비율·데이터 보정.
function 이행Scores(){
  const loans={}, repays={}, defaulted={};
  for(const [,type,p] of TIMELINE){
    if(type==='돈빌림') loans[p.borrower]=(loans[p.borrower]||0)+1;
    if(type==='상환')   repays[p.borrower]=(repays[p.borrower]||0)+1;
  }
  for(const {borrower} of DEFAULTS) defaulted[borrower]=true;
  const out={};
  for(const p of PEOPLE){
    if(!loans[p]) out[p]=0.7;                               // 기록 없음 = 중립
    else if(defaulted[p]) out[p]=0.2;                       // default
    else out[p]= (repays[p]||0)>=loans[p] ? 1.0 : 0.5;      // 다 갚음=1.0
  }
  return out;
}
// L3-4. 점수 합산(각 자원 0~1 정규화 후 가중합). 비중=용도별 정책(예시).
const norm = s => { const m=Math.max(...Object.values(s))||1; const o={}; for(const p of PEOPLE)o[p]=s[p]/m; return o; };
const G = buildGraphs(fin);
const 부조점수 = norm(pagerank(G.부조));
const cs점수   = norm(pagerank(G.cs));
const 이행점수 = 이행Scores();
const W3 = {부조:0.5, cs:0.3, 이행:0.2};
const 최종 = {}; for(const p of PEOPLE) 최종[p] = W3.부조*부조점수[p] + W3.cs*cs점수[p] + W3.이행*이행점수[p];

// L3-5. 출력 — 순위 + 자원별 분해(왜 그 점수인지)
console.log(`결정(first-cut): 무방향 · default→이행0.2 · 비중 부조${W3.부조}·CS${W3.cs}·이행${W3.이행}`);
console.log('순위. 이름 : 최종신용  (부조 / CS / 이행)');
Object.entries(최종).sort((a,b)=>b[1]-a[1]).forEach(([p,v],i)=>
  console.log(`  ${i+1}. ${p} : ${v.toFixed(3)}  (${부조점수[p].toFixed(2)} / ${cs점수[p].toFixed(2)} / ${이행점수[p].toFixed(2)})`));
console.log('\n해석: 부조·CS=망 중심성(PageRank), 이행=대여 행동. 지훈은 default로 이행 0.2.');
console.log('=== 끝 ===');
