// CAT-1 검증: 국소 합성(=전이가중치 곱) · M²=2-경로 합성 · 결합법칙 · 항등 · 부동점=경로합성 감쇠합.
// 엔진은 repo sim.mjs와 동일(부조 유방향 give → 전이행렬 M).

const PEOPLE=['민수','영희','철수','수진','지훈','은정','태호','보라','현우','미래'];
const SEED=[['민수','영희','친구',2],['민수','철수','친구',2],['영희','수진','친구',2],['철수','지훈','동료',1],['지훈','은정','연인',4],['수진','보라','친구',2],['태호','현우','형제',5],['민수','태호','동료',1],['보라','미래','친구',2],['영희','철수','지인',0.5]];
const k=(...xs)=>xs.join('|');
const newState=()=>({EM:{},CS:{}});
function apply(st,s){ if(s.청산==='즉시')return; const b=s.청산==='미청산'?st.EM:st.CS; const key=s.청산==='미청산'?k(s.from,s.to,s.자원,s.default판정):k(s.from,s.to,s.자원); b[key]=(b[key]||0)+s.크기; }
const 부조=(g,h,a)=>[{from:g,to:h,자원:'돈',크기:a,청산:'미청산',default판정:'불가'},{from:g,to:h,자원:'유대',크기:1,청산:'무청산'},{from:h,to:g,자원:'유대',크기:0.5,청산:'무청산'}];
const RULES={결혼식:({host,부조s})=>부조s.flatMap(([g,a])=>부조(g,host,a)),장례식:({host,부조s})=>부조s.flatMap(([g,a])=>부조(g,host,a)),생일:({host,참석})=>참석.flatMap(g=>[{from:g,to:host,자원:'유대',크기:1,청산:'무청산'}]),집들이:({host,참석})=>참석.flatMap(g=>[{from:g,to:host,자원:'유대',크기:1,청산:'무청산'},{from:host,to:g,자원:'유대',크기:0.5,청산:'무청산'}]),정기모임:({참석})=>{const o=[];for(let i=0;i<참석.length;i++)for(let j=i+1;j<참석.length;j++){o.push({from:참석[i],to:참석[j],자원:'유대',크기:0.5,청산:'무청산'});o.push({from:참석[j],to:참석[i],자원:'유대',크기:0.5,청산:'무청산'});}return o;},돈빌림:({lender,borrower,액})=>[{from:lender,to:borrower,자원:'돈',크기:액,청산:'미청산',default판정:'가능'}],상환:({borrower,lender,액})=>[{from:borrower,to:lender,자원:'돈',크기:액,청산:'미청산',default판정:'가능'}]};
const TIMELINE=[[1,'정기모임',{참석:['민수','철수','지훈','태호']}],[1,'생일',{host:'수진',참석:['영희','보라','미래']}],[2,'결혼식',{host:'민수',부조s:[['영희',5],['철수',5],['수진',3],['지훈',5],['태호',3]]}],[3,'집들이',{host:'철수',참석:['영희','민수','수진']}],[3,'결혼식',{host:'지훈',부조s:[['철수',5],['민수',5],['태호',3]]}],[4,'돈빌림',{lender:'민수',borrower:'태호',액:200}],[4,'정기모임',{참석:['민수','철수','지훈','태호']}],[5,'결혼식',{host:'영희',부조s:[['민수',10],['수진',5],['보라',3],['지훈',5],['은정',3]]}],[5,'상환',{borrower:'태호',lender:'민수',액:200}],[6,'결혼식',{host:'수진',부조s:[['영희',5],['보라',3],['미래',3],['민수',5]]}],[6,'생일',{host:'보라',참석:['수진','미래']}],[7,'돈빌림',{lender:'민수',borrower:'지훈',액:300}],[8,'장례식',{host:'태호',부조s:[['민수',5],['철수',3],['지훈',3]]}],[9,'집들이',{host:'은정',참석:['지훈','철수','민수']}],[9,'결혼식',{host:'미래',부조s:[['수진',5],['보라',5],['영희',3]]}],[10,'정기모임',{참석:['민수','철수','지훈','태호']}]];
function simulate(){ const st=newState(); for(const [a,b,_r,cs] of SEED){apply(st,{from:a,to:b,자원:'유대',크기:cs,청산:'무청산'});apply(st,{from:b,to:a,자원:'유대',크기:cs,청산:'무청산'});} for(const[,t,p] of TIMELINE)for(const s of RULES[t](p))apply(st,s); return st; }

const N=PEOPLE.length, idx=Object.fromEntries(PEOPLE.map((p,i)=>[p,i]));
const st=simulate();

// ── 전이행렬 M: w(g,h)=give[g][h]/recv[h]  (신용영향: 받은 쪽 h → 베푼 쪽 g) ──
const give=Array.from({length:N},()=>Array(N).fill(0));
for(const a of PEOPLE)for(const b of PEOPLE){ if(a===b)continue; const g=st.EM[k(a,b,'돈','불가')]||0; if(g>0) give[idx[a]][idx[b]]=g; }
const recv=Array(N).fill(0); for(let g=0;g<N;g++)for(let h=0;h<N;h++) recv[h]+=give[g][h];
const M=Array.from({length:N},()=>Array(N).fill(0));
for(let g=0;g<N;g++)for(let h=0;h<N;h++) if(recv[h]>0) M[g][h]=give[g][h]/recv[h];

const matmul=(A,B)=>{const C=Array.from({length:N},()=>Array(N).fill(0));for(let i=0;i<N;i++)for(let j=0;j<N;j++){let s=0;for(let t=0;t<N;t++)s+=A[i][t]*B[t][j];C[i][j]=s;}return C;};
const matvec=(A,v)=>A.map(row=>row.reduce((s,a,j)=>s+a*v[j],0));
const I=Array.from({length:N},(_,i)=>Array.from({length:N},(_,j)=>i===j?1:0));
const maxdiff=(A,B)=>{let m=0;for(let i=0;i<N;i++)for(let j=0;j<N;j++)m=Math.max(m,Math.abs(A[i][j]-B[i][j]));return m;};

console.log('### CAT-1 검증 — 국소 합성(전이가중치 곱) ###\n');

// 검증 1. M 열-확률(column-stochastic): 받은 적 있는 h는 열 합=1 (전이가 새지 않음)
let colOK=true; const colsums=[];
for(let h=0;h<N;h++){ let s=0; for(let g=0;g<N;g++)s+=M[g][h]; colsums.push(s); if(recv[h]>0 && Math.abs(s-1)>1e-12) colOK=false; }
console.log(`1. M 열-확률: 받은 적 있는 노드의 열 합=1 ? ${colOK?'✅':'❌'}  (열합 예: ${PEOPLE.map((p,i)=>`${p}:${colsums[i].toFixed(2)}`).slice(0,5).join(' ')})`);

// 검증 2. 국소 합성 = 2-경로 곱의 합 (워크드 예시) : (M²)[g][i] = Σ_h M[g][h]·M[h][i]
const M2=matmul(M,M);
// 기여 중간자 있는 (g,i) 한 쌍 찾기
let ex=null;
for(let g=0;g<N&&!ex;g++)for(let i=0;i<N&&!ex;i++){ if(g===i)continue; const hs=[]; for(let h=0;h<N;h++) if(h!==g&&h!==i&&M[g][h]>0&&M[h][i]>0) hs.push(h); if(hs.length>=2) ex=[g,i,hs]; }
if(ex){ const [g,i,hs]=ex; let s=0; const parts=hs.map(h=>{const v=M[g][h]*M[h][i];s+=v;return `${PEOPLE[g]}←${PEOPLE[h]}←${PEOPLE[i]}: ${M[g][h].toFixed(3)}×${M[h][i].toFixed(3)}=${v.toFixed(4)}`;});
  console.log(`2. 2-경로 합성 워크드 예시  (${PEOPLE[g]} ← ${PEOPLE[i]}, 중간자 ${hs.length}명):`);
  parts.forEach(x=>console.log(`     ${x}`));
  console.log(`     Σ = ${s.toFixed(6)}   vs  (M²)[${PEOPLE[g]}][${PEOPLE[i]}] = ${M2[g][i].toFixed(6)}  → ${Math.abs(s-M2[g][i])<1e-12?'✅ 일치(합성=중간자별 곱의 합)':'❌'}`);
}

// 검증 3. 부동점 = 모든 경로 합성의 감쇠합:  π=(1-d)p+dMπ  ==  (1-d)Σ_k d^k M^k p
const d=0.85, p=Array(N).fill(1/N);
// (a) 반복 부동점
let pi=Array(N).fill(1/N);
for(let it=0;it<2000;it++){ const nx=matvec(M,pi).map((x,g)=>(1-d)*p[g]+d*x); let dl=0; for(let g=0;g<N;g++)dl=Math.max(dl,Math.abs(nx[g]-pi[g])); pi=nx; if(dl<1e-15)break; }
// (b) 경로 합성 감쇠합: Σ_k (1-d) d^k (M^k p)  — k=0 직접, k=1 1-경유, ...
let series=p.map(x=>(1-d)*x), vk=p.slice();
for(let kk=1;kk<=300;kk++){ vk=matvec(M,vk); for(let g=0;g<N;g++) series[g]+=(1-d)*Math.pow(d,kk)*vk[g]; }
const d3=Math.max(...pi.map((x,g)=>Math.abs(x-series[g])));
console.log(`\n3. 부동점 == 경로 합성의 감쇠합:  max|반복부동점 − Σ(1-d)dᵏMᵏp| = ${d3.toExponential(2)}  → ${d3<1e-9?'✅ 일치(전파 = 모든 경로 합성의 합)':'❌'}`);
console.log(`     (의미: k=0 직접신뢰 + k=1 한다리 합성 + k=2 두다리 … 를 dᵏ로 깎아 모두 더한 것이 곧 전파 부동점)`);

// 검증 4. 결합법칙: (M·M)·M == M·(M·M)
const assoc=maxdiff(matmul(matmul(M,M),M), matmul(M,matmul(M,M)));
console.log(`\n4. 결합법칙 (h∘g)∘f=h∘(g∘f):  max|(MM)M − M(MM)| = ${assoc.toExponential(2)}  → ${assoc<1e-12?'✅ 성립(합성=행렬곱이라 자동)':'❌'}`);

// 검증 5. 항등원: I·M = M = M·I  (자기신뢰 단위 = I)
const idL=maxdiff(matmul(I,M),M), idR=maxdiff(matmul(M,I),M);
console.log(`5. 항등원 I (자기신뢰=1):  max|I·M−M|=${idL.toExponential(1)}, max|M·I−M|=${idR.toExponential(1)}  → ${idL<1e-15&&idR<1e-15?'✅ 성립':'❌'}`);

console.log('\n=== 요약: 국소 합성 = 전이가중치 곱(중간자 합) = 행렬곱. 결합·항등 성립, 전파 부동점 = 경로 합성 감쇠합. ===');
