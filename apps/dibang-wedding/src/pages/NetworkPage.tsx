// ============================================================================
// [비활성 / DISABLED] NetworkPage 전체 주석처리.
// 이 화면(/network)은 실제 서비스가 아니라 dev 스캐폴드였다. App.tsx의 import·route도 주석처리됨.
// 온체인 액션의 진짜 자리: 이음(request/accept_ium)→InyeonPage, Moi→온보딩/프로필 (태스크 #24).
// 아래는 보존용 원본(전부 주석). 되살리려면 주석 해제 + App.tsx import/route 복원.
// ============================================================================

// import { useState, useCallback } from 'react';
// import { useMachine } from '@xstate/react';
// import { useOnchainHostActions } from '../hooks/useOnchainHostActions';
// import { networkMachine } from '../machines/network.machine';
// import { useZkLogin } from '../providers/ZkLoginProvider';
//
// /**
//  * ⚠️ 실제 서비스 페이지가 아님 — dev/검증용 스캐폴드.
//  *
//  * 이 화면(/network)은 이전 세션이 온체인 발행을 빠르게 떠보려고 임의로 만든 임시 페이지다.
//  * 실제 제품 흐름에 속하지 않으며, 온체인 액션의 "진짜 자리"는 여기가 아니다:
//  *   - 이음 신청(request_ium)·수락(accept_ium) → 디방인연 InyeonPage(/inyeon)의 "이음 신청"·"받은 이음" 흐름.
//  *     구체적으로 inyeonMachine의 mock `sendIeum` actor(inyeon.machine.ts)를 실제 requestIum/acceptIum으로 교체.
//  *   - Moi 아바타 생성(create_moi) → 온보딩/프로필 surface(인연 프로필).
//  * → 실제 배선이 끝나면 이 페이지는 제거 대상. 여기서의 createMoi/requestIum 호출은 임시 검증용일 뿐이다.
//  */
// export function NetworkPage() {
//   const { createMoi, requestIum } = useOnchainHostActions();
//   const { isAuthenticated, address } = useZkLogin();
//
//   // 발행 flow는 머신(network): moi/ium 각 idle→submitting→idle(result). busy/result 파생.
//   const [state, send] = useMachine(networkMachine);
//   const moiResult = state.context.moiResult;
//   const moiBusy = state.matches({ moi: 'submitting' });
//   const iumResult = state.context.iumResult;
//   const iumBusy = state.matches({ ium: 'submitting' });
//
//   // ium 폼값은 로컬 입력 — 머신은 발행 flow만 담당.
//   const [toUser, setToUser] = useState('');
//   const [relationType, setRelationType] = useState('friend');
//   const [label, setLabel] = useState('');
//
//   const handleCreateMoi = useCallback(async () => {
//     send({ type: 'CREATE_MOI' });
//     try {
//       const digest = await createMoi();
//       send({ type: 'MOI_DONE', result: `✅ Moi 발행 완료 · digest ${digest}` });
//     } catch (e) {
//       send({ type: 'MOI_ERROR', result: `❌ ${e instanceof Error ? e.message : String(e)}` });
//     }
//   }, [createMoi, send]);
//
//   // 인연 매칭 = 2단계 합의. 여기선 *신청*(request_ium) — 상대가 수락(accept_ium)하면 매칭 확정.
//   // relationType·label은 오프체인 메모(온체인 미전송, 결정#2). 오프체인 저장 연동은 후속.
//   // 발행 flow는 main의 networkMachine 그대로 유지(머신 보존), 호출만 requestIum.
//   const handleRequestIum = useCallback(async () => {
//     send({ type: 'CREATE_IUM' });
//     try {
//       const digest = await requestIum({ toUser: toUser.trim() });
//       send({ type: 'IUM_DONE', result: `✅ 이음 신청 완료 (상대 수락 대기) · digest ${digest}` });
//     } catch (e) {
//       send({ type: 'IUM_ERROR', result: `❌ ${e instanceof Error ? e.message : String(e)}` });
//     }
//   }, [requestIum, toUser, send]);
//
//   if (!isAuthenticated) {
//     return <div className="mx-auto max-w-xl p-8 text-center text-gray-500">로그인이 필요합니다.</div>;
//   }
//
//   return (
//     <div className="mx-auto max-w-xl space-y-8 p-6">
//       <header>
//         <h1 className="text-2xl font-bold">신뢰 네트워크</h1>
//         <p className="mt-1 text-sm text-gray-500">내 주소: {address}</p>
//       </header>
//
//       {/* C11-1: Moi 아바타 */}
//       <section className="rounded-xl border border-gray-200 p-5">
//         <h2 className="text-lg font-semibold">내 신뢰 아바타 (Moi)</h2>
//         <p className="mt-1 text-sm text-gray-500">
//           신뢰네트워크의 내 노드를 온체인에 발행합니다(SBT, 양도 불가).
//         </p>
//         <button
//           onClick={handleCreateMoi}
//           disabled={moiBusy}
//           className="mt-3 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
//         >
//           {moiBusy ? '발행 중…' : 'Moi 생성'}
//         </button>
//         {moiResult && <p className="mt-3 break-all text-sm">{moiResult}</p>}
//       </section>
//
//       {/* C11-2: Ium 인연 매칭 (2단계 합의: 신청→수락) */}
//       <section className="rounded-xl border border-gray-200 p-5">
//         <h2 className="text-lg font-semibold">인연 매칭 (이음)</h2>
//         <p className="mt-1 text-sm text-gray-500">
//           상대에게 이음을 신청합니다. 상대가 수락하면 매칭 확정 = 양방향 신뢰(CS) 신호. (관계유형·라벨은 오프체인.)
//         </p>
//         <div className="mt-3 space-y-2">
//           <input
//             value={toUser}
//             onChange={(e) => setToUser(e.target.value)}
//             placeholder="상대 Sui 주소 (toUser)"
//             className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
//           />
//           <input
//             value={relationType}
//             onChange={(e) => setRelationType(e.target.value)}
//             placeholder="관계 유형 (예: friend, family)"
//             className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
//           />
//           <input
//             value={label}
//             onChange={(e) => setLabel(e.target.value)}
//             placeholder="라벨 (예: 대학 동기)"
//             className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
//           />
//         </div>
//         <button
//           onClick={handleRequestIum}
//           disabled={iumBusy || !toUser.trim()}
//           className="mt-3 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
//         >
//           {iumBusy ? '신청 중…' : '이음 신청'}
//         </button>
//         {iumResult && <p className="mt-3 break-all text-sm">{iumResult}</p>}
//       </section>
//     </div>
//   );
// }
