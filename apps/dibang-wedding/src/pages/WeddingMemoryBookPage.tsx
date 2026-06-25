import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useMachine } from '@xstate/react';
import { memoryBookMachine } from '../machines/memoryBook.machine';
import { getWeddingMemoryBookOptions } from '@gorae/contracts/@tanstack/react-query.gen';
import { MemoryBookViewer } from '../components/memorybook/MemoryBookViewer';
import { useT } from '../lib/i18n';

// _scenario/wedding-memorybook-ui-2026-05-24/SCENARIOS.md §C(S-07~S-08).
// status 분기: ready_uncurated → curate 자동 이동, ready → MemoryBookViewer.

export function WeddingMemoryBookPage() {
  const { weddingId } = useParams<{ weddingId: string }>();
  const navigate = useNavigate();
  const t = useT();
  const enabled = !!weddingId;

  const { data, isLoading, isError } = useQuery({
    ...getWeddingMemoryBookOptions({ path: { weddingId: weddingId! } }),
    enabled,
  });

  // 로딩 flow는 머신(memoryBook): loading→loaded/error. status 분기는 데이터 파생(아래 useEffect).
  const [state, send] = useMachine(memoryBookMachine);
  useEffect(() => {
    if (isLoading) return;
    if (isError || !data) send({ type: 'LOAD_ERROR' });
    else send({ type: 'LOAD_SUCCESS' });
  }, [isLoading, isError, data, send]);

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
        {t('page.memoryBook.noWedding')}
      </div>
    );
  }

  if (state.matches('loading')) {
    return (
      <div className="min-h-dvh bg-stone-50 flex flex-col items-center justify-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-stone-700" />
        <p className="text-sm text-stone-500">{t('page.memoryBook.loading')}</p>
      </div>
    );
  }

  if (state.matches('error') || !data) {
    return (
      <div className="min-h-dvh bg-stone-50 flex items-center justify-center p-6 text-sm text-stone-500">
        {t('page.memoryBook.loadError')}
      </div>
    );
  }

  if (data.status === 'ready_uncurated') {
    // useEffect가 redirect 처리 중 — 짧은 placeholder.
    return (
      <div className="min-h-dvh bg-stone-50 flex items-center justify-center p-6 text-sm text-stone-500">
        {t('page.memoryBook.redirecting')}
      </div>
    );
  }

  // status === 'ready'
  return data.data ? <MemoryBookViewer data={data.data} weddingId={weddingId} /> : null;
}
