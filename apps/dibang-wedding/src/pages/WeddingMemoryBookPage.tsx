import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getWeddingMemoryBookOptions } from '@gorae/contracts/@tanstack/react-query.gen';
import { MemoryBookViewer } from '../components/memorybook/MemoryBookViewer';

// _scenario/wedding-memorybook-ui-2026-05-24/SCENARIOS.md §C(S-07~S-08).
// status 분기: ready_uncurated → curate 자동 이동, ready → MemoryBookViewer.

export function WeddingMemoryBookPage() {
  const { weddingId } = useParams<{ weddingId: string }>();
  const navigate = useNavigate();
  const enabled = !!weddingId;

  const { data, isLoading, isError } = useQuery({
    ...getWeddingMemoryBookOptions({ path: { weddingId: weddingId! } }),
    enabled,
  });

  // 라우트 진입 시 상단으로 스크롤. 이전에는 MemoryBookV2_4Inner 내부에서
  // useEffect 로 수행했으나 P3-10에서 라우트 진입 책임으로 이관.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [weddingId]);

  useEffect(() => {
    if (!weddingId || !data) return;
    if (data.status === 'ready_uncurated') {
      navigate(`/wedding/${weddingId}/memory-book/curate`, { replace: true });
    }
  }, [weddingId, data, navigate]);

  if (!weddingId) {
    return (
      <div className="min-h-dvh bg-stone-50 flex items-center justify-center p-6 text-sm text-stone-500">
        웨딩 정보가 없습니다.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-stone-50 flex flex-col items-center justify-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-stone-700" />
        <p className="text-sm text-stone-500">메모리북 불러오는 중…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-dvh bg-stone-50 flex items-center justify-center p-6 text-sm text-stone-500">
        메모리북 데이터를 불러올 수 없습니다.
      </div>
    );
  }

  if (data.status === 'ready_uncurated') {
    // useEffect가 redirect 처리 중 — 짧은 placeholder.
    return (
      <div className="min-h-dvh bg-stone-50 flex items-center justify-center p-6 text-sm text-stone-500">
        큐레이션 페이지로 이동 중…
      </div>
    );
  }

  // status === 'ready'
  return data.data ? <MemoryBookViewer data={data.data} weddingId={weddingId} /> : null;
}
