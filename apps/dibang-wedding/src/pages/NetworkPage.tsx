import { useState, useCallback } from 'react';
import { useOnchainHostActions } from '../hooks/useOnchainHostActions';
import { useZkLogin } from '../providers/ZkLoginProvider';

/**
 * 신뢰 네트워크 화면 (C11, 그린필드).
 *
 * 디방의 온체인 신뢰네트워크를 직접 구축하는 실제 화면이다(DEV 패널 아님).
 * - Moi: 사용자의 신뢰 아바타(SBT, key-only). 네트워크의 노드.
 * - Ium: 두 사람 사이의 신뢰관계(SBT). 노드 간 엣지.
 * 둘 다 dev 서명/zkLogin으로 온체인 발행한다.
 */
export function NetworkPage() {
  const { createMoi, createIum } = useOnchainHostActions();
  const { isAuthenticated, address } = useZkLogin();

  const [moiResult, setMoiResult] = useState('');
  const [moiBusy, setMoiBusy] = useState(false);

  const [toUser, setToUser] = useState('');
  const [relationType, setRelationType] = useState('friend');
  const [label, setLabel] = useState('');
  const [iumResult, setIumResult] = useState('');
  const [iumBusy, setIumBusy] = useState(false);

  const handleCreateMoi = useCallback(async () => {
    setMoiBusy(true);
    setMoiResult('Moi 발행 중...');
    try {
      const digest = await createMoi();
      setMoiResult(`✅ Moi 발행 완료 · digest ${digest}`);
    } catch (e) {
      setMoiResult(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setMoiBusy(false);
    }
  }, [createMoi]);

  const handleCreateIum = useCallback(async () => {
    setIumBusy(true);
    setIumResult('Ium 발행 중...');
    try {
      const digest = await createIum({ toUser: toUser.trim(), relationType, label: label.trim() });
      setIumResult(`✅ Ium 발행 완료 · digest ${digest}`);
    } catch (e) {
      setIumResult(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIumBusy(false);
    }
  }, [createIum, toUser, relationType, label]);

  if (!isAuthenticated) {
    return <div className="mx-auto max-w-xl p-8 text-center text-gray-500">로그인이 필요합니다.</div>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-bold">신뢰 네트워크</h1>
        <p className="mt-1 text-sm text-gray-500">내 주소: {address}</p>
      </header>

      {/* C11-1: Moi 아바타 */}
      <section className="rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold">내 신뢰 아바타 (Moi)</h2>
        <p className="mt-1 text-sm text-gray-500">
          신뢰네트워크의 내 노드를 온체인에 발행합니다(SBT, 양도 불가).
        </p>
        <button
          onClick={handleCreateMoi}
          disabled={moiBusy}
          className="mt-3 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {moiBusy ? '발행 중…' : 'Moi 생성'}
        </button>
        {moiResult && <p className="mt-3 break-all text-sm">{moiResult}</p>}
      </section>

      {/* C11-2: Ium 신뢰관계 */}
      <section className="rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold">신뢰관계 (Ium)</h2>
        <p className="mt-1 text-sm text-gray-500">상대를 향한 신뢰관계를 온체인에 기록합니다.</p>
        <div className="mt-3 space-y-2">
          <input
            value={toUser}
            onChange={(e) => setToUser(e.target.value)}
            placeholder="상대 Sui 주소 (toUser)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={relationType}
            onChange={(e) => setRelationType(e.target.value)}
            placeholder="관계 유형 (예: friend, family)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="라벨 (예: 대학 동기)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={handleCreateIum}
          disabled={iumBusy || !toUser.trim()}
          className="mt-3 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {iumBusy ? '발행 중…' : 'Ium 생성'}
        </button>
        {iumResult && <p className="mt-3 break-all text-sm">{iumResult}</p>}
      </section>
    </div>
  );
}
