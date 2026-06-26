// ============================================================
// 디방 데모 시뮬레이션 (260621) — 철수 미혼·강병주 결혼식 앵커·예측·10배·초단위 타임스탬프
//   엔진(fold·Φ·통합)은 sim-scale.mjs와 동일 모델. 데모 정렬 + "누가 올까" 예측 추가.
//   시드 고정 = 재현가능. 실행: node sim-demo-260621.mjs
// ============================================================
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE,'out-demo'); mkdirSync(OUT,{recursive:true});

// ===== PRNG =====
function mulberry32(seed){ let a=seed>>>0; return ()=>{ a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a);
  t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
const SEED=42, rnd=mulberry32(SEED);
const ri=(lo,hi)=>lo+Math.floor(rnd()*(hi-lo+1)), chance=p=>rnd()<p, pick=a=>a[Math.floor(rnd()*a.length)];
function sample(arr,k){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a.slice(0,Math.min(k,a.length)); }

// ===== 튜닝 (철수 디방인연 퍼널) =====
const INYEON={ 철수_온라인이음_min:60,철수_온라인이음_max:100, 대화_rate:0.35, 오프라인승급_rate:0.12, 선물_rate:0.05,
  이음_온라인_CS:0.12, 이음_오프라인_CS:0.8, 대화_CS:0.15, 선물_EM:2, 선물_CS:0.4, 인구_이음_rate:0.45, 인구_이음_min:3, 인구_이음_max:14 };

// ===== 인구 (~1000) + 클러스터 =====
const N=1000;
const COMPANIES=Array.from({length:28},(_,i)=>`회사${i+1}`);
const SCHOOLS  =Array.from({length:36},(_,i)=>`동창${i+1}`);
const FAMILIES =Array.from({length:150},(_,i)=>`가문${i+1}`);
const 성=['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','홍','전'];
const 음=['민','준','서','지','현','우','연','수','은','예','도','하','윤','채','시','주','건','아','람','솔'];
function genName(used){ let n; do{ n=pick(성)+pick(음)+pick(음); }while(used.has(n)); used.add(n); return n; }

// 데모 고정 인물 (이름 보존): 철수 + 강병주(신랑)·송민정(신부) + 만난 인연(서아·하늘·하린) + 안만난(도윤·예준)
const DEMO=['철수','강병주','송민정','서아','하늘','하린','도윤','예준'];
const PEOPLE=[...DEMO]; const used=new Set(PEOPLE); const PROF={};
// 철수·만난인연(서아·하늘·하린) = 같은 학교 클러스터(그래야 강병주 결혼식서 자연스레 만남), 강병주·송민정 = 별 가문
PROF['철수']  ={company:COMPANIES[0],school:SCHOOLS[0],family:FAMILIES[0]};
PROF['강병주']={company:COMPANIES[1],school:SCHOOLS[0],family:FAMILIES[1]}; // 철수와 동창(강병주 결혼식에 철수 초대 자연스러움)
PROF['송민정']={company:COMPANIES[2],school:SCHOOLS[1],family:FAMILIES[2]};
PROF['서아']  ={company:COMPANIES[3],school:SCHOOLS[0],family:FAMILIES[3]}; // 철수 동창 → 강병주 결혼식서 만남
PROF['하늘']  ={company:COMPANIES[0],school:SCHOOLS[2],family:FAMILIES[4]}; // 철수 회사동료
PROF['하린']  ={company:COMPANIES[4],school:SCHOOLS[0],family:FAMILIES[5]}; // 철수 동창
PROF['도윤']  ={company:COMPANIES[20],school:SCHOOLS[30],family:FAMILIES[100]}; // 무관(온라인만)
PROF['예준']  ={company:COMPANIES[21],school:SCHOOLS[31],family:FAMILIES[101]};
for(let i=PEOPLE.length;i<N;i++){ const nm=genName(used); PROF[nm]={company:pick(COMPANIES),school:pick(SCHOOLS),family:pick(FAMILIES)}; PEOPLE.push(nm); }

const byKey=sel=>{const m={};for(const p of PEOPLE){(m[PROF[p][sel]]??=[]).push(p);}return m;};
const CO=byKey('company'),SC=byKey('school'),FA=byKey('family');
const circleOf=p=>{const{company,school,family}=PROF[p]; return [...new Set([...CO[company],...SC[school],...FA[family]])].filter(x=>x!==p);};
const closeness=(a,b)=>{const A=PROF[a],B=PROF[b];let c=0; if(A.family===B.family)c+=3; if(A.school===B.school)c+=1; if(A.company===B.company)c+=1; return c;};

// ===== 이벤트 타임라인 (10년, 초단위 타임스탬프) =====
const DAY=86400000, T0=Date.UTC(2016,0,1);
const tsOf=year=>new Date(T0+((year-1)*365+ri(0,364))*DAY+ri(0,86399)*1000).toISOString().slice(0,19);
let EID=0; const events=[];
const addEvent=(year,type,host,guests,extra={})=>events.push({id:'E'+String(++EID).padStart(4,'0'),year,ts:tsOf(year),type,host,guests,...extra});

// ★ 강병주·송민정 결혼식 (앵커) — 철수 + 서아·하늘·하린 하객으로 강제 포함
{ const g='강병주',b='송민정';
  let gl=[...new Set([...sample(circleOf(g),ri(150,260)),...sample(circleOf(b),ri(120,220)),'철수','서아','하늘','하린'])].filter(p=>p!==g&&p!==b);
  addEvent(8,'결혼식',g,gl,{bride:b,anchor:true}); }
// 일반 결혼식 ~40 (철수 본인 결혼식 = 없음, 미혼)
for(let w=0;w<95;w++){ const groom=pick(PEOPLE),bride=pick(PEOPLE.filter(p=>p!==groom));
  let g=[...new Set([...sample(circleOf(groom),ri(120,240)),...sample(circleOf(bride),ri(100,200))])].filter(p=>p!==groom&&p!==bride);
  if(groom!=='철수'&&bride!=='철수'&&!g.includes('철수')&&chance(0.5)) g.push('철수');   // 철수는 하객으로만
  addEvent(ri(1,10),'결혼식',groom,g,{bride}); }
for(let i=0;i<42;i++){ const h=pick(PEOPLE); const g=sample(circleOf(h),ri(50,110)); if(h!=='철수'&&!g.includes('철수')&&chance(0.45)) g.push('철수'); addEvent(ri(1,10),'장례식',h,g); }
for(let i=0;i<55;i++){ const h=pick(PEOPLE); const g=sample(circleOf(h),ri(8,22)); if(h!=='철수'&&!g.includes('철수')&&chance(0.4)) g.push('철수'); addEvent(ri(1,10),'생일',h,g); }
for(let i=0;i<45;i++){ const h=pick(PEOPLE); addEvent(ri(1,10),'집들이',h,sample(circleOf(h),ri(7,16))); }
for(let i=0;i<70;i++){ const s=pick(PEOPLE); const g=[...new Set([...sample(circleOf(s),ri(4,9)),s])]; addEvent(ri(1,10),'정기모임',null,g); }

const loans=[];
for(let i=0;i<55;i++){ const lender=pick(PEOPLE),borrower=pick(circleOf(lender)); if(!borrower)continue;
  const amt=ri(50,500),y=ri(2,9),willRepay=chance(0.7);
  addEvent(y,'돈빌림',lender,[borrower],{amt}); if(willRepay) addEvent(Math.min(10,y+ri(1,2)),'상환',borrower,[lender],{amt});
  loans.push({lender,borrower,amt,y,default:!willRepay}); }
{ const lender=pick(circleOf('철수')); addEvent(3,'돈빌림',lender,['철수'],{amt:300}); addEvent(4,'상환','철수',[lender],{amt:300}); loans.push({lender,borrower:'철수',amt:300,y:3,default:false}); }
events.sort((a,b)=>a.ts<b.ts?-1:a.ts>b.ts?1:0);

// ===== 1층 raw =====
const RAW=[]; const rp=(ts,eid,type,from,to,action,자원,크기)=>RAW.push({ts,event_id:eid,type,from,to,action,자원,크기});
for(const ev of events){
  if(ev.type==='결혼식'||ev.type==='장례식'){ for(const g of ev.guests){
    rp(ev.ts,ev.id,ev.type,g,ev.host,'부조','돈',Math.max(3,3+closeness(g,ev.host)+ri(0,5)));
    rp(ev.ts,ev.id,ev.type,g,ev.host,'방명록','유대',1); rp(ev.ts,ev.id,ev.type,ev.host,g,'답례','유대',0.5); } }
  else if(ev.type==='생일'||ev.type==='집들이'){ for(const g of ev.guests){ rp(ev.ts,ev.id,ev.type,g,ev.host,'선물','유대',1); if(ev.type==='집들이') rp(ev.ts,ev.id,ev.type,ev.host,g,'대접','유대',0.5); } }
  else if(ev.type==='정기모임'){ for(let i=0;i<ev.guests.length;i++) for(let j=i+1;j<ev.guests.length;j++){ rp(ev.ts,ev.id,ev.type,ev.guests[i],ev.guests[j],'모임','유대',0.5); rp(ev.ts,ev.id,ev.type,ev.guests[j],ev.guests[i],'모임','유대',0.5); } }
  else if(ev.type==='돈빌림'){ rp(ev.ts,ev.id,ev.type,ev.host,ev.guests[0],'대여','돈',ev.amt); }
  else if(ev.type==='상환'){ rp(ev.ts,ev.id,ev.type,ev.host,ev.guests[0],'상환','돈',ev.amt); }
}
// 디방인연 온라인 레이어
let IID=0;
function genInyeon(a,b,year,forceMeet=false){ const eid='I'+String(++IID).padStart(4,'0'); const ts=tsOf(year);
  rp(ts,eid,'디방인연',a,b,'이음','유대',INYEON.이음_온라인_CS); rp(ts,eid,'디방인연',b,a,'이음','유대',INYEON.이음_온라인_CS);
  if(chance(INYEON.대화_rate)){ rp(ts,eid,'디방인연',a,b,'대화','유대',INYEON.대화_CS); rp(ts,eid,'디방인연',b,a,'대화','유대',INYEON.대화_CS); }
  if(forceMeet||chance(INYEON.오프라인승급_rate)){ const ts2=tsOf(Math.min(10,year+ri(0,1))); const rid='R'+String(IID).padStart(4,'0');
    rp(ts2,rid,'라운지재회',a,b,'이음승급','유대',INYEON.이음_오프라인_CS); rp(ts2,rid,'라운지재회',b,a,'이음승급','유대',INYEON.이음_오프라인_CS); }
  if(chance(INYEON.선물_rate)){ rp(ts,eid,'디방인연',a,b,'선물','선물',INYEON.선물_EM); rp(ts,eid,'디방인연',a,b,'선물','유대',INYEON.선물_CS); }
}
// 철수: 서아·하늘·하린 = 만남(오프라인 승급 강제) / 도윤·예준 = 온라인만
for(const b of ['서아','하늘','하린']) genInyeon('철수',b,ri(8,9),true);
for(const b of ['도윤','예준']) genInyeon('철수',b,ri(9,10),false);
const 철수targets=sample(PEOPLE.filter(p=>!['철수','서아','하늘','하린','도윤','예준'].includes(p)),ri(115,155));
for(const b of 철수targets) genInyeon('철수',b,ri(2,10),chance(0.30));
for(const a of PEOPLE){ if(a==='철수')continue; if(chance(INYEON.인구_이음_rate)){ const cand=[...new Set([...sample(circleOf(a),6),...sample(PEOPLE,8)])].filter(x=>x!==a); for(const b of sample(cand,ri(INYEON.인구_이음_min,INYEON.인구_이음_max))) genInyeon(a,b,ri(1,10)); } }
RAW.sort((x,y)=>x.ts<y.ts?-1:x.ts>y.ts?1:0);

// ===== fold → Φ → Moi Credit (sim-scale.mjs 동일) =====
const k=(...xs)=>xs.join('|');
function foldAll(records){ const S={EM:{},CS:{}}; for(const r of records){ if(r.자원==='유대'){const key=k(r.from,r.to,'유대');S.CS[key]=(S.CS[key]||0)+r.크기;} else{const d=(r.action==='부조'||r.action==='선물')?'불가':'가능';const key=k(r.from,r.to,r.자원,d);S.EM[key]=(S.EM[key]||0)+r.크기;} } return S; }
function buildDirected(s){ const give={},cs={};PEOPLE.forEach(p=>{give[p]={};cs[p]={};});
  for(const key in s.EM){ if(s.EM[key]<=0)continue; const a=key.indexOf('|'),b=key.indexOf('|',a+1); const f=key.slice(0,a),t=key.slice(a+1,b),rest=key.slice(b+1); if(rest==='돈|불가') give[f][t]=s.EM[key]; }
  for(const key in s.CS){ if(s.CS[key]<=0)continue; const a=key.indexOf('|'),b=key.indexOf('|',a+1); cs[key.slice(0,a)][key.slice(a+1,b)]=s.CS[key]; }
  return {give,cs}; }
function propGiver(give,d=0.85,iters=250,tol=1e-10){ const recv={};PEOPLE.forEach(h=>recv[h]=0); for(const g of PEOPLE)for(const h in give[g])recv[h]=(recv[h]||0)+give[g][h];
  const edges={};for(const g of PEOPLE){const l=[];for(const h in give[g])if(recv[h]>0)l.push([h,give[g][h]/recv[h]]);edges[g]=l;}
  const p=1/N;let s=Object.fromEntries(PEOPLE.map(x=>[x,1/N])); for(let it=0;it<iters;it++){let dang=0;for(const h of PEOPLE)if(recv[h]===0)dang+=s[h]; const base=(1-d)*p+d*dang*p; const nx={};for(const g of PEOPLE){let inf=0;const l=edges[g];for(let i=0;i<l.length;i++)inf+=l[i][1]*s[l[i][0]];nx[g]=base+d*inf;} let dl=0;for(const x of PEOPLE){const dd=Math.abs(nx[x]-s[x]);if(dd>dl)dl=dd;}s=nx;if(dl<tol)break;} return s; }
function propAuthority(G,d=0.85,iters=250,tol=1e-10){ const out={};PEOPLE.forEach(g=>{let t=0;for(const b in G[g])t+=G[g][b];out[g]=t;}); const inE={};PEOPLE.forEach(b=>inE[b]=[]); for(const a of PEOPLE)if(out[a]>0)for(const b in G[a])inE[b].push([a,G[a][b]/out[a]]);
  let s=Object.fromEntries(PEOPLE.map(x=>[x,1/N])); for(let it=0;it<iters;it++){let dang=0;for(const g of PEOPLE)if(out[g]===0)dang+=s[g]; const base=(1-d)/N+d*dang/N; const nx={};for(const b of PEOPLE){let inf=0;const l=inE[b];for(let i=0;i<l.length;i++)inf+=l[i][1]*s[l[i][0]];nx[b]=base+d*inf;} let dl=0;for(const x of PEOPLE){const dd=Math.abs(nx[x]-s[x]);if(dd>dl)dl=dd;}s=nx;if(dl<tol)break;} return s; }
function 이행Scores(records){ const cnt={},rep={}; for(const r of records){ if(r.action==='대여')cnt[r.to]=(cnt[r.to]||0)+1; if(r.action==='상환')rep[r.from]=(rep[r.from]||0)+1; } const def={}; for(const l of loans)if(l.default)def[l.borrower]=true; const o={};for(const p of PEOPLE){ if(!cnt[p])o[p]=0.7; else if(def[p]&&(rep[p]||0)<cnt[p])o[p]=0.2; else o[p]=(rep[p]||0)>=cnt[p]?1.0:0.5; } return o; }
const norm=s=>{let m=0;for(const p of PEOPLE)if(s[p]>m)m=s[p];m=m||1;const o={};for(const p of PEOPLE)o[p]=s[p]/m;return o;};
const W3={부조:0.5,cs:0.3,이행:0.2}, ME='철수';

const st=foldAll(RAW), Gd=buildDirected(st);
const 부조점수=norm(propGiver(Gd.give)), cs점수=norm(propAuthority(Gd.cs)), 이행점수=이행Scores(RAW);
const MOI={};for(const p of PEOPLE)MOI[p]=W3.부조*부조점수[p]+W3.cs*cs점수[p]+W3.이행*이행점수[p];
const score=p=>Math.round(MOI[p]*1000), tierOf=v=>v>=0.80?'AAA':v>=0.70?'AA':v>=0.60?'A':v>=0.45?'BBB':v>=0.30?'BB':'B';
const ranked=Object.entries(MOI).sort((a,b)=>b[1]-a[1]); const myRank=ranked.findIndex(([p])=>p===ME)+1;

// ===== "누가 올까" 예측 — 철수 결혼식 (미발생) =====
// 호혜: 철수가 과거 부조한 사람(그들 행사 참석) + 강한 이음/재회 → 답방 확률↑. 예상 부조 = closeness 기반.
const 철수gave=new Set(RAW.filter(r=>r.from===ME&&r.action==='부조').map(r=>r.to));
const 철수meet=new Set(RAW.filter(r=>r.from===ME&&(r.action==='이음승급')).map(r=>r.to));
const csTie=(a,b)=>st.CS[k(a,b,'유대')]||0;
const cand={};
for(const p of PEOPLE){ if(p===ME)continue; let sc=0;
  if(철수gave.has(p)) sc+=2.5;                 // 내가 부조했음 → 호혜 답방
  if(철수meet.has(p)) sc+=1.5;                 // 오프라인 재회(만남)
  sc += Math.min(2, csTie(ME,p));              // 유대 강도
  sc += closeness(ME,p)*0.6;                   // 같은 가문/학교/회사
  if(sc>0) cand[p]=sc; }
const attendees=Object.entries(cand).filter(([,s])=>s>=0.6).sort((a,b)=>b[1]-a[1]);
const 예상하객=attendees.length;
const 예상부조=Math.round(attendees.reduce((s,[p])=>s+(5+closeness(ME,p)*3+(철수gave.has(p)?4:0)),0)*1.0); // 만원 단위
const 대출한도=Math.round((예상부조*10000*0.5 + MOI[ME]*8_000_000)/10000)*10000; // 예상부조(현금흐름)+신용 가중

// ===== 시계열 (월~분기 체크포인트) =====
const a0=Date.parse(RAW[0].ts+'Z'), b0=Date.parse(RAW[RAW.length-1].ts+'Z'), NCP=30, series=[];
function ihaeng철수(records){ let c=0,rp2=0; for(const r of records){ if(r.action==='대여'&&r.to===ME)c++; if(r.action==='상환'&&r.from===ME)rp2++; } if(c===0)return 0.7; if(rp2>=c)return 1.0; return 0.5; }
for(let i=1;i<=NCP;i++){ const cp=new Date(a0+(b0-a0)*(i/NCP)).toISOString().slice(0,19); const sub=RAW.filter(r=>r.ts<=cp);
  const G2=buildDirected(foldAll(sub)); const bj=norm(propGiver(G2.give))[ME],c2=norm(propAuthority(G2.cs))[ME],ih=ihaeng철수(sub);
  series.push({ts:cp,score:Math.round((W3.부조*bj+W3.cs*c2+W3.이행*ih)*1000),bujo:+bj.toFixed(3),cs:+c2.toFixed(3),ih}); }

// ===== 출력 =====
writeFileSync(join(OUT,'raw-events.json'),JSON.stringify(RAW));
writeFileSync(join(OUT,'raw-events.csv'),'ts,event_id,type,from,to,action,자원,크기\n'+RAW.map(r=>`${r.ts},${r.event_id},${r.type},${r.from},${r.to},${r.action},${r.자원},${r.크기}`).join('\n'));
writeFileSync(join(OUT,'moi_timeseries.json'),JSON.stringify(series));
const prediction={ subject:ME, married:false, 예상하객, 예상부조_만원:예상부조, 예상부조_원:예상부조*10000, 대출한도_원:대출한도, top예상하객:attendees.slice(0,12).map(([p,s])=>({p,score:+s.toFixed(1)})) };
writeFileSync(join(OUT,'prediction.json'),JSON.stringify(prediction,null,2));
console.log('=== dibang demo sim (seed 42) ===');
console.log('people '+N+' / events '+events.length+' / raw '+RAW.length);
console.log('Chulsoo MoiCredit '+score(ME)+'/1000 '+tierOf(MOI[ME])+' rank '+myRank+'/'+N);
console.log('[predict] guests '+예상하객+' / gift '+예상부조+'manwon / loan '+(대출한도/10000)+'manwon');
