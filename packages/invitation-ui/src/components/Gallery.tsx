import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useIntersectionFadeIn } from '../hooks/useIntersectionFadeIn';
import { useT } from '../lib/i18n';
import type { ImagePosition } from '../types/invitation';

interface GalleryProps {
  photos: string[];
  photoPositions?: Record<string, ImagePosition>;
  /** 편집 모드 — 전달하면 각 사진에 조절 버튼 표시 */
  onEditPhoto?: (url: string) => void;
  /** 테마 — 사진 프레임 배경색 연동 */
  theme?: 'moi-blue' | 'moi-pink';
}

const THEME_FRAME_BORDER: Record<string, string> = {
  'moi-blue': '2px solid rgba(168, 196, 217, 0.5)',
  'moi-pink': '2px solid rgba(212, 104, 122, 0.3)',
};

const rotations = ['-rotate-[1.6deg]', 'rotate-[1.2deg]', '-rotate-[.6deg]'];

export function Gallery({ photos, photoPositions, onEditPhoto, theme }: GalleryProps) {
  const ref = useIntersectionFadeIn<HTMLElement>();
  const t = useT();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const isEditMode = !!onEditPhoto;
  const isLightboxOpen = lightboxIndex !== null;

  const goToPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
  }, []);

  const goToNext = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null && prev < photos.length - 1 ? prev + 1 : prev,
    );
  }, [photos.length]);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, closeLightbox, goToPrev, goToNext]);

  return (
    <>
      <section
        ref={ref}
        className="px-7 py-12 border-b border-line opacity-0 translate-y-10 transition-all duration-[1.5s] ease-[cubic-bezier(.16,1,.3,1)] [&.visible]:opacity-100 [&.visible]:translate-y-0"
      >
        <div className="font-italic italic font-normal text-[13px] text-sky tracking-[.18em] uppercase text-center mb-1.5">Gallery</div>
        <div className="font-serif font-medium text-xl text-navy text-center tracking-[.02em] mb-[18px]">{t('invitationUi.gallery.title')}</div>
        <div className="w-6 h-px bg-soft-sky mx-auto mb-[18px]" />
        <div className="mx-[-28px] px-7 grid grid-rows-3 grid-flow-col auto-cols-[30%] gap-2.5 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide">
          {photos.map((src, i) => {
            const pos = photoPositions?.[src];
            const hasPosition = pos?.cropArea && (pos.cropArea.width < 100 || pos.cropArea.height < 100 || pos.cropArea.x !== 0 || pos.cropArea.y !== 0);
            return (
              <div
                key={i}
                className={`relative bg-white p-[5px] pb-3.5 shadow-[0_4px_14px_rgba(30,58,95,.12)] cursor-pointer transition-transform duration-[.35s] ease-[cubic-bezier(.16,1,.3,1)] snap-start photo-tape hover:!rotate-0 hover:scale-[1.06] hover:z-5 hover:shadow-[0_10px_28px_rgba(30,58,95,.22)] ${rotations[i % 3]}`}
                style={theme ? { border: THEME_FRAME_BORDER[theme] } : undefined}
                onClick={() => !isEditMode && setLightboxIndex(i)}
              >
                <div className="w-full aspect-[3/4] overflow-hidden relative">
                  {hasPosition ? (
                    <img
                      src={src}
                      alt=""
                      className="absolute block max-w-none"
                      style={{
                        width: `${(100 / pos.cropArea.width) * 100}%`,
                        height: `${(100 / pos.cropArea.height) * 100}%`,
                        left: `${-(pos.cropArea.x / pos.cropArea.width) * 100}%`,
                        top: `${-(pos.cropArea.y / pos.cropArea.height) * 100}%`,
                      }}
                    />
                  ) : (
                    <img src={src} alt="" className="w-full h-full object-cover block" />
                  )}
                </div>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEditPhoto(src); }}
                    className="absolute bottom-2 left-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
                    title={t('invitationUi.gallery.cropPhoto')}
                  >
                    {/* 자르기(crop) 아이콘 — QA 2026-05-29 */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                      <path d="M18 22V8a2 2 0 0 0-2-2H2" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {isLightboxOpen && createPortal(
        <div
          className="fixed inset-0 bg-black/85 z-[250] flex items-center justify-center animate-fade-in"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-[260] w-10 h-10 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm text-white/90 hover:bg-white/25 transition-colors"
            aria-label={t('invitationUi.gallery.close')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Previous button */}
          {lightboxIndex > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goToPrev(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-[260] w-10 h-10 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm text-white/90 hover:bg-white/25 transition-colors"
              aria-label={t('invitationUi.gallery.prevPhoto')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {/* Next button */}
          {lightboxIndex < photos.length - 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-[260] w-10 h-10 flex items-center justify-center rounded-full bg-white/15 backdrop-blur-sm text-white/90 hover:bg-white/25 transition-colors"
              aria-label={t('invitationUi.gallery.nextPhoto')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}

          {/* Image */}
          <img
            src={photos[lightboxIndex]}
            alt=""
            className="max-w-[calc(100%-5rem)] max-h-[calc(100%-5rem)] rounded-lg shadow-[0_20px_60px_rgba(0,0,0,.5)] select-none"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          {/* Counter */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[260] text-sm text-white/70 tabular-nums tracking-wide">
            {lightboxIndex + 1} / {photos.length}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
