import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { useT } from '../../lib/i18n';

// _scenario/wedding-memorybook-ui-2026-05-24/SCENARIOS.md §S-03.
// embla 라이트박스 — 좌우 스와이프, 키보드, 우상단 동그라미로 선택 토글.

export interface LightboxPhoto {
  id: string;
  storage_path: string;
  guestName: string;
}

interface Props {
  photos: LightboxPhoto[];
  signedUrls: Record<string, string>;
  index: number;
  onIndexChange: (i: number) => void;
  selectedIds: string[];
  onClose: () => void;
  onToggle: (photoId: string) => void;
}

export function PhotoLightbox({
  photos,
  signedUrls,
  index,
  onIndexChange,
  selectedIds,
  onClose,
  onToggle,
}: Props) {
  const t = useT();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex: index,
    loop: false,
    align: 'center',
    skipSnaps: true,
    duration: 90,
    dragThreshold: 120,
    containScroll: 'trimSnaps',
  });

  // embla → 부모 index 동기화
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => onIndexChange(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onIndexChange]);

  // 외부 index 변경 → embla 동기화
  useEffect(() => {
    if (!emblaApi) return;
    if (emblaApi.selectedScrollSnap() !== index) {
      emblaApi.scrollTo(index);
    }
  }, [emblaApi, index]);

  // 키보드: Esc / 좌우
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') emblaApi?.scrollPrev();
      else if (e.key === 'ArrowRight') emblaApi?.scrollNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [emblaApi, onClose]);

  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-black/95 p-4"
      aria-label={t('memorybook.lightboxLabel')}
    >
      <div ref={emblaRef} className="w-full max-w-[720px] overflow-hidden">
        <div className="flex">
          {photos.map((p, i) => {
            const sIdx = selectedIds.indexOf(p.id);
            const sel = sIdx >= 0;
            const url = signedUrls[p.storage_path];
            const isCurrent = i === index;
            return (
              <div
                key={p.id}
                className="flex min-w-0 shrink-0 grow-0 basis-full items-center justify-center px-2"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="relative inline-block max-h-[78dvh] max-w-full rounded-lg"
                >
                  {url ? (
                    <img
                      src={url}
                      alt={t('memorybook.photoAlt', { name: p.guestName })}
                      draggable={false}
                      decoding="async"
                      loading={isCurrent ? 'eager' : 'lazy'}
                      fetchPriority={isCurrent ? 'high' : 'auto'}
                      className="block max-h-[78dvh] max-w-full select-none rounded-lg object-contain"
                      style={{ pointerEvents: 'none' }}
                    />
                  ) : (
                    <div className="flex h-72 w-72 items-center justify-center text-white/60">…</div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(p.id);
                    }}
                    aria-label={sel ? t('memorybook.deselect') : t('memorybook.select')}
                    className="absolute -top-2 -right-2 flex h-14 w-14 items-center justify-center bg-transparent p-0 border-0"
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-base font-semibold text-white shadow ${
                        sel ? 'bg-stone-900' : 'border-2 border-white/90 bg-black/30'
                      }`}
                    >
                      {sel ? sIdx + 1 : ''}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {hasPrev && (
        <button
          type="button"
          aria-label={t('memorybook.prevPhoto')}
          onClick={(e) => {
            e.stopPropagation();
            emblaApi?.scrollPrev();
          }}
          className="absolute top-1/2 left-3 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/40 text-2xl text-white"
        >
          ‹
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          aria-label={t('memorybook.nextPhoto')}
          onClick={(e) => {
            e.stopPropagation();
            emblaApi?.scrollNext();
          }}
          className="absolute top-1/2 right-3 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/40 text-2xl text-white"
        >
          ›
        </button>
      )}

      {photo && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-4 flex items-center gap-3 text-[13px] text-white/75"
        >
          <span>{photo.guestName}</span>
          <span>·</span>
          <span>
            {index + 1} / {photos.length}
          </span>
        </div>
      )}
    </div>,
    document.body,
  );
}
