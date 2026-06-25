import { useState, useRef } from 'react';
import { useInvitationForm } from '../../hooks/invitation-create/useInvitationForm';
import type { InvitationUploadItem } from '../../machines/invitationImageUpload.machine';
import { sectionTitleClass } from './styles';
import { useT } from '../../lib/i18n';

/**
 * 갤러리 사진 그리드 + 다중 file input presentational — 낙관적 UI.
 * (UI/데이터 분리 2-G: 데이터 훅 호출은 상위 page가 흡수)
 *
 * 두 종류의 칸을 렌더:
 *  - store.galleryPhotos(서버 URL, 업로드 완료분): 드래그 정렬·삭제 가능
 *  - items(진행 중·실패한 낙관적 업로드): localUrl 미리보기 + 오버레이,
 *    파일별 독립 — 한 칸의 실패가 다른 칸에 영향 없음. 정렬 대상 아님.
 * 완료된 아이템은 페이지 onItemDone이 store로 옮기고 머신에서 제거한다.
 */

export const MAX_GALLERY_PHOTOS = 60;

interface Props {
  items: InvitationUploadItem[];
  onPickFiles: (files: File[]) => void;
  onRetryItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
}

export function GalleryUploader({ items, onPickFiles, onRetryItem, onRemoveItem }: Props) {
  const t = useT();
  const store = useInvitationForm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    onPickFiles(Array.from(files));
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleDragStart = (i: number) => setDragIndex(i);
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) return;
    store.reorderGalleryPhoto(dragIndex, i);
    setDragIndex(i);
  };
  const handleDragEnd = () => setDragIndex(null);

  // 진행 중 칸까지 합산 — 60장 가드가 낙관적 칸을 빠뜨리지 않게
  const totalCount = store.galleryPhotos.length + items.length;

  return (
    <section className="space-y-4">
      <h2 className={sectionTitleClass}>
        {t('invite.gallery.title')} <span className="text-sm font-normal text-gray-400">({totalCount}/{MAX_GALLERY_PHOTOS})</span>
      </h2>
      <div className="grid grid-cols-4 gap-2">
        {totalCount < MAX_GALLERY_PHOTOS && (
          <label className={`aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-2xl text-gray-400 hover:border-sky-400 hover:text-sky-500 cursor-pointer transition-colors ${dragIndex !== null ? 'pointer-events-none' : ''}`}>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesChange}
              className="hidden"
            />
            +
          </label>
        )}
        {store.galleryPhotos.map((url, i) => (
          <div
            key={url}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragEnd={handleDragEnd}
            className={`relative aspect-square rounded-lg overflow-hidden border border-gray-200 cursor-grab active:cursor-grabbing transition-opacity ${
              dragIndex === i ? 'opacity-50' : ''
            }`}
          >
            <img
              src={url}
              alt={t('invite.gallery.photoAlt', { n: i + 1 })}
              className="w-full h-full object-cover pointer-events-none"
            />
            <button
              type="button"
              onClick={() => store.removeGalleryPhoto(i)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-sm text-white hover:bg-black/70 transition-colors"
            >
              X
            </button>
          </div>
        ))}
        {items.map((item) => (
          <div
            key={item.id}
            className="relative aspect-square rounded-lg overflow-hidden border border-gray-200"
          >
            <img
              src={item.localUrl}
              alt={t('invite.gallery.uploadingAlt')}
              className="w-full h-full object-cover pointer-events-none"
            />
            {item.status === 'uploading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                <span className="text-sm font-medium text-gray-700">{t('invite.upload.uploadingShort')}</span>
              </div>
            )}
            {item.status === 'failed' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/70">
                <span className="text-sm font-medium text-red-500">{t('invite.upload.failedShort')}</span>
                <button
                  type="button"
                  onClick={() => onRetryItem(item.id)}
                  className="rounded-md bg-black/60 px-2 py-0.5 text-sm text-white hover:bg-black/80 transition-colors"
                >
                  {t('invite.upload.retry')}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => onRemoveItem(item.id)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-sm text-white hover:bg-black/70 transition-colors"
            >
              X
            </button>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-400">{t('invite.gallery.maxHint', { max: MAX_GALLERY_PHOTOS })}</p>
      {items.some((it) => it.status === 'failed') && (
        <p className="text-base text-red-500">
          {t('invite.gallery.someFailed')}
        </p>
      )}
    </section>
  );
}
