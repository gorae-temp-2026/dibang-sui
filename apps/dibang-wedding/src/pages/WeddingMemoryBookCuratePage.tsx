import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  getWeddingMemoryBookOptions,
  getWeddingSharedPhotoGroupsOptions,
} from '@gorae/contracts/@tanstack/react-query.gen';
import type { SharedPhotoGroup } from '../types/db-compat';
import { useSignedUrls } from '../queries/share-photo/useSignedUrls';
import { useReplaceCurated } from '../queries/memory-book/useReplaceCurated';
import { PhotoLightbox } from '../components/memorybook/PhotoLightbox';
import { SelectionDot } from '../components/memorybook/SelectionDot';
import { useMachine } from '@xstate/react';
import { memoryBookCurateMachine } from '../machines/memoryBookCurate.machine';
import { useT } from '../lib/i18n';

// _scenario/wedding-memorybook-ui-2026-05-24/SCENARIOS.md §B(S-02~S-06).
// T-18: 그룹 그리드 + 빈 상태.
// T-19: SelectionDot + 토글 + 30장 cap + 상단 미니 그리드.

const MAX_SELECTION = 30;

// 안정 ref 빈 컬렉션 — derived state fallback이 매 렌더 새 ref가 되는 걸 방지.
const EMPTY_IDS: string[] = [];

// side는 표시용 — i18n 키로 매핑(other는 라벨 없음).
const SIDE_LABEL_KEY: Record<string, string> = {
  groom: 'curate.side.groom',
  bride: 'curate.side.bride',
  other: '',
};
// relation_category 값(백엔드 한국어 enum)은 그대로 두고 표시만 번역 — LoungeCheckIn과 키 공유.
const RELATION_LABEL_KEY: Record<string, string> = {
  '가족/친척': 'loungeCheckIn.relation.family',
  '친구/지인': 'loungeCheckIn.relation.friend',
  '동문/동창': 'loungeCheckIn.relation.alumni',
  '직장동료': 'loungeCheckIn.relation.coworker',
  '스승/제자': 'loungeCheckIn.relation.mentor',
  '기타모임': 'loungeCheckIn.relation.other',
};

function sideBadgeClass(side?: string) {
  if (side === 'groom') return 'bg-blue-50 text-blue-700';
  if (side === 'bride') return 'bg-rose-50 text-rose-700';
  return 'bg-stone-100 text-stone-600';
}

// relation_category는 i18n 매핑, relation_detail은 사용자 입력 자유텍스트라 그대로 둔다.
function buildRelationLabel(g: SharedPhotoGroup, t: (k: string, v?: Record<string, string | number>) => string): string | null {
  const parts: string[] = [];
  if (g.relation_category) parts.push(RELATION_LABEL_KEY[g.relation_category] ? t(RELATION_LABEL_KEY[g.relation_category]) : g.relation_category);
  if (g.relation_detail) parts.push(g.relation_detail);
  if (parts.length === 0) return null;
  return parts.join(' · ');
}

export function WeddingMemoryBookCuratePage() {
  const { weddingId } = useParams<{ weddingId: string }>();
  const navigate = useNavigate();
  const t = useT();
  const enabled = !!weddingId;

  const groupsQuery = useQuery({
    ...getWeddingSharedPhotoGroupsOptions({ path: { weddingId: weddingId! } }),
    enabled,
  });
  const memoryBookQuery = useQuery({
    ...getWeddingMemoryBookOptions({ path: { weddingId: weddingId! } }),
    enabled,
  });

  // groups를 useMemo로 안정화하지 않으면 아래 allPhotos useMemo가 매 렌더 invalidate된다.
  const groups: SharedPhotoGroup[] = useMemo(
    () => groupsQuery.data?.groups ?? [],
    [groupsQuery.data],
  );
  const allPhotos = useMemo(
    () =>
      groups.flatMap((g) =>
        g.photos.map((p) => ({ ...p, guestName: g.guest_name })),
      ),
    [groups],
  );
  const photoById = useMemo(() => {
    const m = new Map<string, (typeof allPhotos)[number]>();
    for (const p of allPhotos) m.set(p.id, p);
    return m;
  }, [allPhotos]);
  // signed URL 페치는 queries/share-photo/useSignedUrls 훅으로 캡슐화 (라운드 3-I).
  // useSignedUrls 내부에서 storagePathsKey 안정화·캐싱 처리. dev의 set-state-in-effect
  // 회피 패턴은 훅이 useQuery 기반이라 자동 충족.
  const paths = useMemo(() => allPhotos.map((p) => p.storage_path), [allPhotos]);
  const { data: signedUrlsArr } = useSignedUrls(paths);
  const signedUrls: Record<string, string> = useMemo(() => {
    const m: Record<string, string> = {};
    if (!signedUrlsArr) return m;
    paths.forEach((path, i) => {
      const u = signedUrlsArr[i];
      if (u) m[path] = u;
    });
    return m;
  }, [paths, signedUrlsArr]);

  // 선택 상태 — 서버에서 받아온 초기 큐레이션은 derived value, 사용자가 토글하면 override.
  // useEffect로 1회 init하는 패턴은 set-state-in-effect 룰 위반이라 derived로 전환.
  const serverInitialSelected = useMemo(() => {
    const curated = memoryBookQuery.data?.data?.curated_photos;
    if (!curated || allPhotos.length === 0) return null;
    const availableIds = new Set(allPhotos.map((p) => p.id));
    return curated.filter((cp) => availableIds.has(cp.id)).map((cp) => cp.id);
  }, [allPhotos, memoryBookQuery.data]);

  const [userSelected, setUserSelected] = useState<string[] | null>(null);
  const selectedIds = userSelected ?? serverInitialSelected ?? EMPTY_IDS;

  // 페이지 flow는 머신(memoryBookCurate): data(로딩) + save(저장 빈확인/saving/성공/에러) + lightbox.
  const [state, send] = useMachine(memoryBookCurateMachine);
  const saveError = state.context.saveError;
  const saveSuccess = state.matches({ save: 'success' });
  const emptyConfirmOpen = state.matches({ save: 'confirmingEmpty' });
  // 저장 — queries/memory-book/useReplaceCurated 훅 (라운드 3-I). invalidate는 훅 안에서 자동.
  const saveMutation = useReplaceCurated(weddingId);

  const handleToggle = useCallback((photoId: string) => {
    setUserSelected((prev) => {
      const base = prev ?? serverInitialSelected ?? EMPTY_IDS;
      if (base.includes(photoId)) return base.filter((id) => id !== photoId);
      if (base.length >= MAX_SELECTION) return base; // 31번째 무시
      return [...base, photoId];
    });
    // 선택 변경 시 토스트 리셋(머신 save축 → idle).
    send({ type: 'RESET_TOAST' });
  }, [serverInitialSelected, send]);

  // 라이트박스 — 현재 index는 머신 context.
  const lightboxIndex = state.context.lightboxIndex;
  const openLightboxAt = useCallback(
    (photoId: string) => {
      const idx = allPhotos.findIndex((p) => p.id === photoId);
      if (idx >= 0) send({ type: 'OPEN_LIGHTBOX', index: idx });
    },
    [allPhotos, send],
  );

  const performSave = useCallback(async () => {
    if (!weddingId) return;
    try {
      await saveMutation.mutateAsync({
        path: { weddingId },
        body: { photo_ids: selectedIds },
      });
      send({ type: 'SAVE_SUCCESS' });
      window.setTimeout(() => {
        if (selectedIds.length === 0) {
          navigate('/my-wedding', { replace: true });
        } else {
          navigate(`/wedding/${weddingId}/memory-book`, { replace: true });
        }
      }, 600);
    } catch (err) {
      // invalid_ids 등 400/500 처리
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = (err as any)?.error ?? (err as Error)?.message ?? t('curate.saveErrorFallback');
      send({ type: 'SAVE_ERROR', error: typeof detail === 'string' ? detail : t('curate.saveErrorFallback') });
    }
  }, [weddingId, selectedIds, saveMutation, navigate, send, t]);

  const handleSave = useCallback(() => {
    if (!weddingId) return;
    if (selectedIds.length === 0) {
      send({ type: 'SAVE_EMPTY' });
      return;
    }
    send({ type: 'SAVE' });
    void performSave();
  }, [weddingId, selectedIds, performSave, send]);

  const handleEmptyConfirm = useCallback(() => {
    send({ type: 'CONFIRM_EMPTY' });
    void performSave();
  }, [performSave, send]);

  const handleEmptyCancel = useCallback(() => {
    send({ type: 'CANCEL_EMPTY' });
  }, [send]);

  // 그룹/메모리북 로딩 완료 → 머신 data축 동기.
  const queryLoading = groupsQuery.isLoading || memoryBookQuery.isLoading;
  const queryError = groupsQuery.isError || memoryBookQuery.isError;
  useEffect(() => {
    if (queryLoading) return;
    if (queryError) send({ type: 'LOAD_ERROR' });
    else send({ type: 'LOAD_DONE' });
  }, [queryLoading, queryError, send]);
  const isLoading = state.matches({ data: 'loading' });
  const hasError = state.matches({ data: 'error' });

  return (
    <div className="min-h-dvh bg-stone-50 mx-auto max-w-[480px] pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100"
          aria-label={t('curate.back')}
        >
          ‹
        </button>
        <h1 className="text-base font-semibold text-stone-900">{t('curate.title')}</h1>
      </header>

      <p className="px-6 pt-8 pb-3 text-center text-base leading-relaxed text-stone-600">
        {t('curate.intro')}
      </p>

      {isLoading && (
        <div className="flex justify-center py-20 text-sm text-stone-400">{t('curate.loading')}</div>
      )}

      {!isLoading && hasError && (
        <div className="mx-5 my-8 rounded-xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-700">
          {t('curate.loadError')}
        </div>
      )}

      {!isLoading && !hasError && groups.length === 0 && (
        <div className="mx-5 my-8 rounded-xl border border-stone-200 bg-white p-6 text-center">
          <p className="mb-2 text-base font-semibold text-stone-800">{t('curate.emptyTitle')}</p>
          <p className="text-sm leading-relaxed text-stone-500">
            {t('curate.emptyDesc')}
          </p>
        </div>
      )}

      {!isLoading && !hasError && groups.length > 0 && (
        <>
          {/* 선택된 사진 미니 그리드 */}
          <div className="px-4 pt-4 pb-2">
            <p className="mb-2.5 text-base font-semibold text-stone-900">
              {t('curate.selected', { n: selectedIds.length, max: MAX_SELECTION })}
            </p>
            {selectedIds.length === 0 ? (
              <p className="text-sm text-stone-400">{t('curate.pickHint')}</p>
            ) : (
              <div className="grid grid-cols-5 gap-1.5">
                {selectedIds.map((id) => {
                  const p = photoById.get(id);
                  if (!p) return null;
                  const url = signedUrls[p.storage_path];
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleToggle(id)}
                      aria-label={t('curate.deselect', { name: p.guestName })}
                      className="relative aspect-square overflow-hidden rounded-[10px] border-2 border-stone-900 bg-stone-100 p-0"
                    >
                      {url && (
                        <img src={url} alt="" className="block h-full w-full object-cover" />
                      )}
                      <span className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-[12px] font-bold text-white">
                        ✕
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mx-4 my-1 h-px bg-stone-200" />

          <div className="px-4 pt-3 pb-1">
            <p className="text-base font-semibold text-stone-900">{t('curate.allPhotos', { n: allPhotos.length })}</p>
          </div>

          <div className="space-y-3 px-3">
            {groups.map((g) => {
              const sideText = g.side && SIDE_LABEL_KEY[g.side] ? t(SIDE_LABEL_KEY[g.side]) : '';
              const relationLabel = buildRelationLabel(g, t);
              return (
                <section key={g.user_id} className="px-2">
                  <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
                    <p className="text-sm font-semibold text-stone-700">
                      {g.guest_name} ({g.photo_count})
                    </p>
                    {sideText && (
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${sideBadgeClass(g.side)}`}>
                        {sideText}
                      </span>
                    )}
                    {relationLabel && (
                      <span className="text-[11px] text-stone-500">{relationLabel}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {g.photos.map((photo) => {
                      const url = signedUrls[photo.storage_path];
                      const selectionIndex = selectedIds.indexOf(photo.id);
                      const isSelected = selectionIndex >= 0;
                      return (
                        <div
                          key={photo.id}
                          onClick={() => openLightboxAt(photo.id)}
                          className={`relative aspect-square cursor-pointer overflow-hidden rounded-[10px] bg-stone-100 ${
                            isSelected ? 'border-[2.5px] border-stone-900' : 'border border-stone-200'
                          }`}
                          role="button"
                          aria-label={t('curate.photoAria', { name: g.guest_name, sel: isSelected ? t('curate.photoSelectedSuffix', { n: selectionIndex + 1 }) : '' })}
                        >
                          {url ? (
                            <img
                              src={url}
                              alt={t('curate.photoAlt', { name: g.guest_name })}
                              loading="lazy"
                              className="block h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[11px] text-stone-400">…</div>
                          )}
                          <SelectionDot
                            selected={isSelected}
                            selectionIndex={selectionIndex}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggle(photo.id);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}

      {lightboxIndex !== null && allPhotos[lightboxIndex] && (
        <PhotoLightbox
          photos={allPhotos}
          signedUrls={signedUrls}
          index={lightboxIndex}
          onIndexChange={(i) => send({ type: 'CHANGE_LIGHTBOX', index: i })}
          selectedIds={selectedIds}
          onClose={() => send({ type: 'CLOSE_LIGHTBOX' })}
          onToggle={handleToggle}
        />
      )}

      {!isLoading && !hasError && groups.length > 0 && (
        <div
          className="fixed bottom-0 left-1/2 z-20 w-full max-w-[480px] -translate-x-1/2 border-t border-stone-200 bg-stone-50 px-5 pt-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          {saveError && (
            <div className="mb-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-center text-sm text-red-700">
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="mb-2.5 rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 text-center text-sm text-green-700">
              {t('curate.saved')}
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className={`flex h-13 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold transition-colors ${
              saveMutation.isPending
                ? 'cursor-not-allowed bg-stone-200 text-stone-400'
                : 'bg-stone-900 text-white hover:bg-stone-800'
            }`}
            style={{ height: 52 }}
          >
            {saveMutation.isPending ? t('curate.saving') : t('curate.save', { n: selectedIds.length })}
          </button>
        </div>
      )}

      {emptyConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="empty-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
          onClick={handleEmptyCancel}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="empty-confirm-title" className="text-base font-semibold text-stone-900">
              {t('curate.emptyConfirmTitle')}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              {t('curate.emptyConfirmDesc')}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={handleEmptyCancel}
                className="flex-1 rounded-xl border border-stone-200 bg-white py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                {t('curate.cancel')}
              </button>
              <button
                type="button"
                onClick={handleEmptyConfirm}
                className="flex-1 rounded-xl bg-stone-900 py-3 text-sm font-semibold text-white hover:bg-stone-800"
              >
                {t('curate.leave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
