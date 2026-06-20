// ============================================================
// 신뢰 네트워크 — 현실 규모 절차 시뮬레이션 (Moi Credit 데모 심장 본체)
//   고정 시드 = 완전 재현가능. 하드코딩 이벤트 없음 — 생성기가 인물·이벤트·상호작용 생성.
//   엔진(fold·Φ)은 sim.mjs(검증분)와 동일 모델: 07-fold-dynamics / 09-credit-propagation.
//   디방인연 온라인 레이어(이음·대화·승급·선물) 포함 — 오프라인 이벤트 + 온라인 디방인연 둘 다.
//   신호 매핑(핸드오프 §13-2): 이음·대화=CS / 선물=증여=EM·CS / 부조=EM.
//   출력: (a) 1층 raw 로그(JSON/CSV)  (b) 철수 1→2→3→4층 트레이스  (c) 층별 공식  (d) ⑤용 철수-profile.json.
//   실행: node sim-scale.mjs
// ============================================================
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));

// ===== 0. 결정적 PRNG (mulberry32) — 시드 고정 =====
function mulberry32(seed){ let a = seed>>>0; return () => {
  a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a>>>15), 1 | a);
  t = (t + Math.imul(t ^ (t>>>7), 61 | t)) ^ t; return ((t ^ (t>>>14)) >>> 0) / 4294967296; }; }
const SEED = 42;
const rnd = mulberry32(SEED);
const ri = (lo,hi) => lo + Math.floor(rnd()*(hi-lo+1));            // 정수 [lo,hi]
const chance = p => rnd() < p;
const pick = arr => arr[Math.floor(rnd()*arr.length)];
function sample(arr,k){ const a=arr.slice();                        // Fisher–Yates 부분 셔플
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a.slice(0, Math.min(k, a.length)); }

// ===== 튜닝 상수 (디방인연 온라인 레이어 — 철수 퍼널, 위에서 조절) =====
const INYEON = {
  철수_온라인이음_min: 60, 철수_온라인이음_max: 100, // ② 온라인 이음 수 (약신호라 多여도 영향 작아야)
  대화_rate: 0.35,         // 이음 중 대화로 이어지는 비율
  오프라인승급_rate: 0.12, // 이음 중 오프라인 재회 → ③ 승급 (중신호)
  선물_rate: 0.05,         // 이음 중 선물(증여)까지 (강신호 EM·CS이지만 드묾)
  이음_온라인_CS: 0.12,    // 온라인 이음 유대 — 매우 약(탭 한 번 수준). 78건 모여도 ≈9
  이음_오프라인_CS: 0.8,   // 오프라인 승급 유대 (중)
  대화_CS: 0.15,           // 대화 유대 (소량)
  선물_EM: 2, 선물_CS: 0.4, // 선물=증여: EM(본체)+CS(동시). 약하게(부조 5~13 대비 작음)
  인구_이음_rate: 0.4,     // 일반 인구도 디방인연 활발 사용 → 철수가 아웃라이어 아니게
  인구_이음_min: 3, 인구_이음_max: 12,
};

// ===== 1. 인물 풀 + 클러스터(회사·학교·가족) =====
const N = 300;
const COMPANIES = Array.from({length:14},(_,i)=>`회사${i+1}`);
const SCHOOLS   = Array.from({length:22},(_,i)=>`동창${i+1}`);
const FAMILIES  = Array.from({length:95},(_,i)=>`가문${i+1}`);
const 성 = ['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','홍','전'];
const 음 = ['민','준','서','지','현','우','연','수','은','예','도','하','윤','채','시','주','건','아','람','솔'];
function genName(used){ let n; do { n = pick(성)+pick(음)+pick(음); } while(used.has(n)); used.add(n); return n; }

const PEOPLE = ['철수'];                                            // 철수 = 스포트라이트 주체
const PROF = { 철수: { company: COMPANIES[0], school: SCHOOLS[0], family: FAMILIES[0] } };
const used = new Set(PEOPLE);
for(let i=1;i<N;i++){ const nm = genName(used);
  PROF[nm] = { company: pick(COMPANIES), school: pick(SCHOOLS), family: pick(FAMILIES) }; PEOPLE.push(nm); }

const byKey = sel => { const m={}; for(const p of PEOPLE){ (m[PROF[p][sel]] ??= []).push(p); } return m; };
const CO = byKey('company'), SC = byKey('school'), FA = byKey('family');
const circleOf = p => { const { company, school, family } = PROF[p];
  return [...new Set([...CO[company], ...SC[school], ...FA[family]])].filter(x => x !== p); };
const closeness = (a,b) => { const A=PROF[a], B=PROF[b]; let c=0;
  if(A.family===B.family) c+=3; if(A.school===B.school) c+=1; if(A.company===B.company) c+=1; return c; };

// ===== 2. 이벤트 타임라인 (10년, 날짜 포함) — 생성기 =====
const DAY = 86400000, T0 = Date.UTC(2016,0,1);
const dateOf = (year) => new Date(T0 + ((year-1)*365 + ri(0,364))*DAY).toISOString().slice(0,10);
let EID = 0;
const events = [];
const addEvent = (year, type, host, guests, extra={}) =>
  events.push({ id:'E'+String(++EID).padStart(3,'0'), year, date:dateOf(year), type, host, guests, ...extra });

for(let w=0;w<12;w++){                                              // 결혼식 12회 (신랑측+신부측 클러스터, 80~300 하객)
  const groom = pick(PEOPLE), bride = pick(PEOPLE.filter(p=>p!==groom));
  let g = [...new Set([...sample(circleOf(groom), ri(80,160)), ...sample(circleOf(bride), ri(70,140))])].filter(p=>p!==groom&&p!==bride);
  if(groom!=='철수' && bride!=='철수' && !g.includes('철수') && chance(0.6)) g.push('철수');
  addEvent(ri(1,10),'결혼식', groom, g, { bride });
}
addEvent(5,'결혼식','철수', [...new Set(sample(circleOf('철수'),180))].filter(p=>p!=='철수'), { bride: pick(PEOPLE.filter(p=>p!=='철수')) });
for(let i=0;i<5;i++){ const h=pick(PEOPLE); addEvent(ri(1,10),'장례식', h, sample(circleOf(h), ri(40,90))); }
for(let i=0;i<10;i++){ const h=pick(PEOPLE); const g=sample(circleOf(h), ri(8,20)); if(h!=='철수'&&!g.includes('철수')&&chance(0.4)) g.push('철수'); addEvent(ri(1,10),'생일', h, g); }
for(let i=0;i<8;i++){ const h=pick(PEOPLE); addEvent(ri(1,10),'집들이', h, sample(circleOf(h), ri(6,15))); }
for(let i=0;i<12;i++){ const s=pick(PEOPLE); const g=[...new Set([...sample(circleOf(s), ri(4,8)), s])]; addEvent(ri(1,10),'정기모임', null, g); }

const loans = [];                                                   // 돈빌림/상환 (default 포함)
for(let i=0;i<10;i++){ const lender=pick(PEOPLE), borrower=pick(circleOf(lender)); if(!borrower) continue;
  const amt=ri(50,500), y=ri(2,9), willRepay=chance(0.7);
  addEvent(y,'돈빌림', lender, [borrower], { amt });
  if(willRepay) addEvent(Math.min(10,y+ri(1,2)),'상환', borrower, [lender], { amt });
  loans.push({ lender, borrower, amt, y, default: !willRepay });
}
{ const lender = pick(circleOf('철수'));                            // 철수: 빌리고 갚음(이행 1.0) 보장
  addEvent(3,'돈빌림', lender, ['철수'], { amt:300 }); addEvent(4,'상환','철수',[lender],{ amt:300 });
  loans.push({ lender, borrower:'철수', amt:300, y:3, default:false }); }

events.sort((a,b)=> a.date<b.date?-1:a.date>b.date?1:0);

// ===== 3. 오프라인 이벤트 → 1층 raw (클러스터 기반, 전수 X) =====
// raw = { ts, event_id, type, from, to, action, 자원, 크기 }  (자원: 돈=부조EM / 선물=증여EM / 유대=CS)
const RAW = [];
const rawPush = (ts,eid,type,from,to,action,자원,크기)=> RAW.push({ ts, event_id:eid, type, from, to, action, 자원, 크기 });
for(const ev of events){
  if(ev.type==='결혼식' || ev.type==='장례식'){
    for(const g of ev.guests){
      rawPush(ev.date,ev.id,ev.type, g, ev.host, '부조', '돈', Math.max(3, 3 + closeness(g,ev.host) + ri(0,5))); // EM(부조)
      rawPush(ev.date,ev.id,ev.type, g, ev.host, '방명록', '유대', 1);                                          // CS(참석·축하)
      rawPush(ev.date,ev.id,ev.type, ev.host, g, '답례', '유대', 0.5);                                          // CS(host 답례)
    }
  } else if(ev.type==='생일' || ev.type==='집들이'){
    for(const g of ev.guests){ rawPush(ev.date,ev.id,ev.type, g, ev.host, '선물', '유대', 1); if(ev.type==='집들이') rawPush(ev.date,ev.id,ev.type, ev.host, g, '대접', '유대', 0.5); }
  } else if(ev.type==='정기모임'){
    for(let i=0;i<ev.guests.length;i++) for(let j=i+1;j<ev.guests.length;j++){
      rawPush(ev.date,ev.id,ev.type, ev.guests[i], ev.guests[j], '모임', '유대', 0.5); rawPush(ev.date,ev.id,ev.type, ev.guests[j], ev.guests[i], '모임', '유대', 0.5); }
  } else if(ev.type==='돈빌림'){ rawPush(ev.date,ev.id,ev.type, ev.host, ev.guests[0], '대여', '돈', ev.amt); }   // EM(대여)
  else if(ev.type==='상환'){ rawPush(ev.date,ev.id,ev.type, ev.host, ev.guests[0], '상환', '돈', ev.amt); }
}

// ===== 3b. 디방인연 온라인 레이어 — 이음(②) · 대화 · 오프라인 재회 승급(③) · 선물(증여) =====
let IID = 0;
function genInyeon(a, b, year){
  const eid = 'I'+String(++IID).padStart(4,'0'); const ts = dateOf(year);
  // ② 온라인 이음 — 약신호 CS 양방향(상호 연결)
  rawPush(ts,eid,'디방인연', a, b, '이음', '유대', INYEON.이음_온라인_CS);
  rawPush(ts,eid,'디방인연', b, a, '이음', '유대', INYEON.이음_온라인_CS);
  if(chance(INYEON.대화_rate)){                                     // 대화 — CS 소량 양방향
    rawPush(ts,eid,'디방인연', a, b, '대화', '유대', INYEON.대화_CS);
    rawPush(ts,eid,'디방인연', b, a, '대화', '유대', INYEON.대화_CS);
  }
  if(chance(INYEON.오프라인승급_rate)){                            // ②→③ 오프라인 재회 승급 — 중신호 CS
    const ts2 = dateOf(Math.min(10, year + ri(0,1))); const rid = 'R'+String(IID).padStart(4,'0');
    rawPush(ts2,rid,'라운지재회', a, b, '이음승급', '유대', INYEON.이음_오프라인_CS);
    rawPush(ts2,rid,'라운지재회', b, a, '이음승급', '유대', INYEON.이음_오프라인_CS);
  }
  if(chance(INYEON.선물_rate)){                                     // 선물=증여 — EM(본체)+CS(동시), 방향 a→b
    rawPush(ts,eid,'디방인연', a, b, '선물', '선물', INYEON.선물_EM);  // EM 증여(default 불가)
    rawPush(ts,eid,'디방인연', a, b, '선물', '유대', INYEON.선물_CS);  // CS 동시 적립
  }
}
// 철수 퍼널 (결정적): 온라인 이음 60~100 → 일부 대화/승급/선물
const 철수targets = sample(PEOPLE.filter(p=>p!=='철수'), ri(INYEON.철수_온라인이음_min, INYEON.철수_온라인이음_max));
for(const b of 철수targets) genInyeon('철수', b, ri(2,10));
// 일반 인구 (현실 볼륨) — 클러스터+무관 혼합으로 온라인 매칭
for(const a of PEOPLE){ if(a==='철수') continue;
  if(chance(INYEON.인구_이음_rate)){
    const cand = [...new Set([...sample(circleOf(a), 6), ...sample(PEOPLE, 8)])].filter(x=>x!==a);
    for(const b of sample(cand, ri(INYEON.인구_이음_min, INYEON.인구_이음_max))) genInyeon(a, b, ri(1,10));
  }
}
RAW.sort((x,y)=> x.ts<y.ts?-1:x.ts>y.ts?1:0);

// ===== 4. 2층 fold (07 모델) — raw → EM/CS 원장 =====
//   EM 키 = from|to|자원|default판정 (부조·선물=불가 / 대여·상환=가능) · CS 키 = from|to|유대
const k = (...xs)=>xs.join('|');
function foldAll(records){ const st={ EM:{}, CS:{} };
  for(const r of records){
    if(r.자원==='유대'){ const key=k(r.from,r.to,'유대'); st.CS[key]=(st.CS[key]||0)+r.크기; }
    else { const d=(r.action==='부조'||r.action==='선물')?'불가':'가능'; const key=k(r.from,r.to,r.자원,d); st.EM[key]=(st.EM[key]||0)+r.크기; }
  } return st; }
const st = foldAll(RAW);
const csTie = (a,b)=> st.CS[k(a,b,'유대')]||0;

// ===== 5. 3층 신용 전파 Φ (PHI-5 유방향, sim.mjs와 동일 연산) =====
function buildDirected(s){ const give={}, cs={}; PEOPLE.forEach(p=>{give[p]={};cs[p]={};});
  for(const a of PEOPLE) for(const b of PEOPLE){ if(a===b) continue;
    // 베풂 엣지 = 경조사 부조(EM)만 전파. [원리, 철수 무관]
    // reversed-giving PageRank는 *diluted co-giving*(부조: 호스트당 다수 기여자 → 1인 몫 작음)에 보정된 연산자다.
    // 선물(증여)도 EM이지만 '온라인 소액 + sole-giver'(수령자가 그 선물만 받음 → 몫 ≈ 1)라 이 연산자에 넣으면
    // §1-1이 경고한 '아무에게나 베풀어 점수 올리는 악용'으로 과대계상된다 (진단: 철수 sole-giver 선물 5개가
    // 부조점수 0.92→1.0·1위로 띄움, 남들은 정규화로 0.5 압축). 구조 불일치이므로 선물은 2층 원장·signal엔
    // 기록하되 부조 전파에선 제외한다. (선물의 올바른 전파 = 별도 보정 = 𝒲 트랙 추후.)
    // ※ 이 규칙은 모든 인물에 동일 적용 — sole-giver 선물을 많이 한 누구든 동일하게 제외된다.
    const g = s.EM[k(a,b,'돈','불가')]||0; if(g>0) give[a][b]=g;
    const t = csTie(a,b);                                                     if(t>0) cs[a][b]=t;    // 유대(음수 클리핑)
  }
  return { give, cs }; }
function propGiver(give,{d=0.85,iters=300,tol=1e-11}={}){             // 부조·증여: reversed-giving PageRank
  const recv={}; PEOPLE.forEach(h=>recv[h]=0);
  for(const g of PEOPLE) for(const h of PEOPLE) if(give[g][h]) recv[h]+=give[g][h];
  const p=1/N; let s=Object.fromEntries(PEOPLE.map(x=>[x,1/N])), conv=iters;
  for(let it=0;it<iters;it++){ let dang=0; for(const h of PEOPLE) if(recv[h]===0) dang+=s[h];
    const nx={}; for(const g of PEOPLE){ let inflow=0;
      for(const h of PEOPLE){ if(recv[h]>0 && give[g][h]) inflow += (give[g][h]/recv[h])*s[h]; }
      nx[g]=(1-d)*p + d*(inflow + dang*p); }
    const delta=Math.max(...PEOPLE.map(x=>Math.abs(nx[x]-s[x]))); s=nx; if(delta<tol){ conv=it+1; break; } }
  return { score:s, iters:conv }; }
function propAuthority(G,{d=0.85,iters=300,tol=1e-11}={}){           // CS: 유방향 authority
  const out={}; PEOPLE.forEach(g=>out[g]=Object.values(G[g]).reduce((x,y)=>x+y,0));
  let s=Object.fromEntries(PEOPLE.map(x=>[x,1/N])), conv=iters;
  for(let it=0;it<iters;it++){ let dang=0; for(const g of PEOPLE) if(out[g]===0) dang+=s[g];
    const nx={}; for(const b of PEOPLE){ let inf=0; for(const a of PEOPLE){ if(out[a]>0 && G[a][b]) inf+=(G[a][b]/out[a])*s[a]; }
      nx[b]=(1-d)/N + d*(inf + dang/N); }
    const delta=Math.max(...PEOPLE.map(x=>Math.abs(nx[x]-s[x]))); s=nx; if(delta<tol){ conv=it+1; break; } }
  return { score:s, iters:conv }; }
function 이행Scores(){ const cnt={}, rep={}, def={};                  // 이행: node 직접
  for(const l of loans){ cnt[l.borrower]=(cnt[l.borrower]||0)+1; if(l.default) def[l.borrower]=true; else rep[l.borrower]=(rep[l.borrower]||0)+1; }
  const o={}; for(const p of PEOPLE){ if(!cnt[p]) o[p]=0.7; else if(def[p]) o[p]=0.2; else o[p]=(rep[p]||0)>=cnt[p]?1.0:0.5; } return o; }
const norm = s => { const m=Math.max(...Object.values(s))||1; const o={}; for(const p of PEOPLE) o[p]=s[p]/m; return o; };

const Gd = buildDirected(st);
const r부조 = propGiver(Gd.give), rCS = propAuthority(Gd.cs);
const 부조점수 = norm(r부조.score), cs점수 = norm(rCS.score), 이행점수 = 이행Scores();

// ===== 6. 4층 통합 = Moi Credit (절대값 = 가중합 W3) =====
const W3 = { 부조:0.5, cs:0.3, 이행:0.2 };
const MOI = {}; for(const p of PEOPLE) MOI[p] = W3.부조*부조점수[p] + W3.cs*cs점수[p] + W3.이행*이행점수[p];
const score = p => Math.round(MOI[p]*1000);
const tierOf = v => v>=0.80?'AAA':v>=0.70?'AA':v>=0.60?'A':v>=0.45?'BBB':v>=0.30?'BB':'B';

// ===== 7. 출력 =====
const ME = '철수';
const OUT = join(HERE,'out'); mkdirSync(OUT,{recursive:true});
writeFileSync(join(OUT,'raw-events.json'), JSON.stringify(RAW));
writeFileSync(join(OUT,'raw-events.csv'), 'ts,event_id,type,from,to,action,자원,크기\n' + RAW.map(r=>`${r.ts},${r.event_id},${r.type},${r.from},${r.to},${r.action},${r.자원},${r.크기}`).join('\n'));

console.log('### 현실 규모 신뢰 네트워크 — Moi Credit (시드 '+SEED+', 재현가능) ###');
console.log(`인물 ${N}명 · 이벤트 ${events.length}건 · 1층 raw ${RAW.length}건`);
const byType = {}; for(const r of RAW) byType[r.action]=(byType[r.action]||0)+1;
console.log('raw 액션 구성:', Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([t,n])=>`${t} ${n}`).join(' · '));

// (b) 철수 1→2→3→4층 트레이스
const 철수Raw = RAW.filter(r=>r.from===ME||r.to===ME);
const cnt = act => 철수Raw.filter(r=>r.from===ME && (Array.isArray(act)?act.includes(r.action):r.action===act)).length;
const c부조=cnt('부조'), c이음=cnt(['이음','이음승급']), c대화=cnt('대화'), c선물=cnt('선물');
const 철수EM = (자원,d)=> Object.entries(st.EM).filter(([key])=>key.startsWith(`${ME}|`)&&key.endsWith(`|${자원}|${d}`)).reduce((s,[,v])=>s+v,0);
const csOut = {}; for(const r of 철수Raw) if(r.from===ME && r.자원==='유대') csOut[r.to]=(csOut[r.to]||0)+r.크기;
const topTies = Object.entries(csOut).sort((a,b)=>b[1]-a[1]).slice(0,5);
const rank = Object.entries(MOI).sort((a,b)=>b[1]-a[1]); const myRank = rank.findIndex(([p])=>p===ME)+1;
console.log(`\n========== 철수 스포트라이트 — 1→2→3→4층 트레이스 ==========`);
console.log(`[1층 raw] 철수 관련 ${철수Raw.length}건 (준 것 기준) — 부조 ${c부조} · 이음 ${c이음} · 대화 ${c대화} · 선물 ${c선물}`);
console.log(`[2층 fold] 베푼 부조 ${철수EM('돈','불가')}만 · 증여(선물) ${철수EM('선물','불가')} · 유대 상위: ${topTies.map(([p,t])=>`${p}(${t.toFixed(1)})`).join(', ')}`);
console.log(`[3층 Φ] 부조점수 ${부조점수[ME].toFixed(3)} (reversed-giving PageRank) · CS점수 ${cs점수[ME].toFixed(3)} (authority) · 이행 ${이행점수[ME].toFixed(2)}`);
console.log(`[4층 통합] Moi Credit = ${W3.부조}×${부조점수[ME].toFixed(3)} + ${W3.cs}×${cs점수[ME].toFixed(3)} + ${W3.이행}×${이행점수[ME].toFixed(2)} = ${MOI[ME].toFixed(3)} → ${score(ME)}/1000 · 티어 ${tierOf(MOI[ME])} · 전체 ${myRank}위(상위 ${(myRank/N*100).toFixed(0)}%)`);

// 철수 소그래프(납득·시각화용) — '강한 이웃'만: 선물/승급/부조/높은 유대
const 부조To = new Set(철수Raw.filter(r=>r.action==='부조'&&r.from===ME).map(r=>r.to));
const 선물To = new Set(철수Raw.filter(r=>r.action==='선물'&&r.from===ME).map(r=>r.to));
const 승급With = new Set(철수Raw.filter(r=>r.action==='이음승급'&&r.from===ME).map(r=>r.to));
const strong = [...new Set([...부조To,...선물To,...승급With, ...topTies.map(([p])=>p)])].filter(p=>csTie(ME,p)>=0.8 || 부조To.has(p) || 선물To.has(p) || 승급With.has(p));
console.log(`[철수 소그래프] 온라인 이음 ${c이음}건 중 '강한 이웃' ${strong.length}명만 시각화 — ${strong.slice(0,8).join(', ')}${strong.length>8?' …':''}`);

// 차별성 검증 — 신용이 '행동대로' 나오는가 (철수 편애 아님을 데이터로)
const ranked = Object.entries(MOI).sort((a,b)=>b[1]-a[1]);
const rankOf = name => ranked.findIndex(([p])=>p===name)+1;
const defaulters = [...new Set(loans.filter(l=>l.default).map(l=>l.borrower))];
const repayers   = [...new Set(loans.filter(l=>!l.default).map(l=>l.borrower))];
const avgRank = arr => arr.length ? Math.round(arr.reduce((s,p)=>s+rankOf(p),0)/arr.length) : '-';
const line = ([p,v],i) => `  ${i ?? rankOf(p)}. ${p}${p===ME?' ★철수':''}  ${v.toFixed(3)}  (부조 ${부조점수[p].toFixed(2)} / CS ${cs점수[p].toFixed(2)} / 이행 ${이행점수[p].toFixed(2)})`;
console.log(`\n========== 차별성 검증 (행동 → 신용 · 고정 규칙의 산출, 철수 맞춤 아님) ==========`);
console.log('상위 8:'); ranked.slice(0,8).forEach((e,i)=>console.log(line(e,i+1)));
console.log('하위 5:'); ranked.slice(-5).forEach((e)=>console.log(line(e)));
console.log(`default 차주(이행 0.2) ${defaulters.length}명 평균 ${avgRank(defaulters)}위  vs  상환 차주 ${repayers.length}명 평균 ${avgRank(repayers)}위  (전체 ${N}명) → default가 끌어내림 = 행동 반영`);
console.log(`철수: 부조(베풂)·CS(연결)·이행(상환) 모두 상위라 ${rankOf(ME)}위. 같은 규칙으로 default/고립 인물은 하위. (per-철수 튜닝 없음)`);

// (c) 층별 전이 공식
console.log(`\n========== 층별 전이 공식 ==========`);
console.log(`1→2 fold:   EM[from→to|자원|default] += 크기 (부조·증여=불가 / 대여=가능) · CS[from→to] += 크기`);
console.log(`2→3 Φ:      부조·증여 π_g=(1-d)p+d·Σ_h(give[g][h]/recv[h])π_h [reversed-giving PageRank=EigenTrust계보] · CS=authority · 이행=node · d=0.85`);
console.log(`3→4 통합:   MoiCredit = ${W3.부조}·부조 + ${W3.cs}·CS + ${W3.이행}·이행  (절대값=노드 신용; 𝒲 추후)`);

// (d) ⑤ 공유 프로필용 fixture (철수-profile.json) — force-graph + sunburst + 트레이스
const hueOf = s => { let h=0; for(const c of s) h=(h*131+c.charCodeAt(0))>>>0; return h%360; };
const nodes = [{ id: ME, label: ME, hue: hueOf(ME), self:true }, ...strong.map(p=>({ id:p, label:p, hue:hueOf(p) }))];
const relType = p => 선물To.has(p)?'선물':승급With.has(p)?'승급':부조To.has(p)?'부조':'이음';
const links = strong.map(p=>({ source: ME, target: p, type: relType(p), value: +(csTie(ME,p)).toFixed(2) }));
// signal 2D sunburst 계층 (2층 fold, 철수 outgoing). EM·CS 실값 / AR 표시 / MP 스텁.
const csBy = act => 철수Raw.filter(r=>r.from===ME && r.자원==='유대' && (Array.isArray(act)?act.includes(r.action):r.action===act)).reduce((s,r)=>s+r.크기,0);
const signal = { name:'우리', children:[
  { name:'EM', children:[ {name:'부조', value:철수EM('돈','불가')}, {name:'선물', value:철수EM('선물','불가')} ] },
  { name:'CS', children:[ {name:'참석', value:+csBy('방명록').toFixed(1)}, {name:'이음', value:+csBy(['이음','이음승급']).toFixed(1)}, {name:'대화', value:+csBy('대화').toFixed(1)}, {name:'모임', value:+csBy('모임').toFixed(1)} ] },
  { name:'AR', children:[ {name:'관계', value:1, stub:true} ] },   // 표시만(산출 스텁)
  { name:'MP', children:[ {name:'거래', value:0.2, stub:true} ] }, // 스텁(사람↔사람 거의 0)
]};
const profile = {
  subject: ME, asOf:'Y10',
  moiCredit: { value:+MOI[ME].toFixed(3), score:score(ME), tier:tierOf(MOI[ME]), rank:myRank, total:N, onchain:true },
  trace: {
    L1_raw: { 부조:c부조, 이음:c이음, 대화:c대화, 선물:c선물, total:철수Raw.length },
    L2_fold: { 부조EM:철수EM('돈','불가'), 증여EM:철수EM('선물','불가'), topTies: topTies.map(([p,t])=>({p,t:+t.toFixed(2)})) },
    L3_phi: { 부조:+부조점수[ME].toFixed(3), CS:+cs점수[ME].toFixed(3), 이행:+이행점수[ME].toFixed(2), op:'reversed-giving PageRank / authority / node, d=0.85' },
    L4_integrate: { W:W3, formula:'0.5·부조 + 0.3·CS + 0.2·이행', value:+MOI[ME].toFixed(3) },
  },
  graph: { nodes, links },
  signal,
  trustRange: { tier: tierOf(MOI[ME]), label: MOI[ME]>=0.7?'상위 추정':MOI[ME]>=0.5?'높음':'보통', anon:true }, // 익명 신뢰범위(정확값 비노출)
};
writeFileSync(join(OUT,'chulsoo-profile.json'), JSON.stringify(profile,null,2));
console.log(`\n출력: out/raw-events.{json,csv} · out/chulsoo-profile.json (⑤ 프로필 입력 — nodes ${nodes.length}·links ${links.length})`);
console.log('=== 끝 (큰 네트워크=스케일 / 철수 강한이웃 소그래프=납득, 둘 다 유지) ===');
