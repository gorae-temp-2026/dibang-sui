/**
 * Photo Sharing T-16 — 웨딩 리포트 "공유 사진" 탭 (host 전용).
 *
 * 시나리오 S-04·§14:
 *   - host만 호출, 라운지 전체 사진을 하객별 그룹으로 묶어 표시
 *   - 그룹별 일괄 ZIP 다운로드
 *   - 빈 상태 메시지
 *
 * UI/데이터 분리 P3-7:
 *   - 데이터(3 SDK + signed URL + 그룹화)는 `useSharedPhotosWithGuestInfo`
 *   - ZIP 다운로드(supabase + DOM)는 `useDownloadSharedPhotosZip` + `lib/sharedPhotosZip`
 *   - 본 컴포넌트는 두 훅의 반환값으로 표현만 책임진다. alert/DOM/supabase/SDK 직호출 없음.
 */
import { useSharedPhotosWithGuestInfo } from '../../queries/share-photo/useSharedPhotosWithGuestInfo';
import { useDownloadSharedPhotosZip } from '../../hooks/share-photo/useDownloadSharedPhotosZip';
import { useT } from '../../lib/i18n';

interface Props {
  loungeId: string;
}

export function SharePhotosTab({ loungeId }: Props) {
  const t = useT();
  const { groups, signedUrls, isLoading, error } = useSharedPhotosWithGuestInfo(loungeId);
  const downloadZip = useDownloadSharedPhotosZip();

  // 전체 사진 저장 — 그룹별 ZIP을 순차 다운로드(백엔드 전체-zip 엔드포인트 추가 시 단일 zip로 개선).
  const handleSaveAll = async () => {
    for (const g of groups) {
      await downloadZip.mutateAsync({ loungeId, guestUserId: g.guestUserId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-lng-line border-t-lng-brand" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-4 my-6 rounded-2xl border border-lng-line bg-white p-4 text-center text-base text-lng-coral">
        {t('share.tab.errorPrefix')}{error.message}
      </div>
    );
  }

  return (
    <div data-testid="share-photos-tab" className="px-4 py-4">
      {downloadZip.error && (
        <div className="mb-3 rounded-2xl border border-lng-line bg-white p-3 text-center text-sm text-lng-coral">
          {downloadZip.error.message}
        </div>
      )}
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-lng-line bg-gray-50 p-8 text-center text-base text-lng-muted">
          {t('share.tab.emptyTitle')}
          <br />
          <span className="mt-1 inline-block text-sm">{t('share.tab.emptyDesc')}</span>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={downloadZip.isPending}
            className="mb-3 w-full rounded-lg bg-[#6A9AB8] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#5A8AA8] disabled:opacity-50"
          >
            {downloadZip.isPending ? t('share.tab.saving') : t('share.tab.saveAll')}
          </button>
          <ul className="space-y-4">
          {groups.map((group) => (
            <li key={group.guestUserId} className="rounded-2xl border border-lng-line bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold text-lng-text-primary">
                    {group.name}
                    <span className="ml-2 text-sm font-normal text-lng-muted">{t('share.tab.photoCount', { n: group.rows.length })}</span>
                  </div>
                  {group.prefix && (
                    <div className="mt-0.5 truncate text-sm text-lng-muted">{group.prefix}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    downloadZip.mutate({ loungeId, guestUserId: group.guestUserId })
                  }
                  disabled={downloadZip.isPending}
                  className="flex-shrink-0 rounded-lg border border-lng-line bg-lng-surface px-3 py-1.5 text-sm text-lng-text-primary hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('share.tab.savePhotos')}
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {group.rows.map((p) => {
                  const url = signedUrls[p.storage_path];
                  return (
                    <div key={p.id} className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                      {url ? (
                        <img src={url} alt="" className="block h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-lng-muted">{t('share.tab.photo')}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
          </ul>
        </>
      )}
    </div>
  );
}
