import type { FileProgress } from '../../machines/sharePhotoUpload.machine';
import { useT } from '../../lib/i18n';

interface Props {
  progress?: FileProgress;
}

const LABEL_KEY: Record<FileProgress['state'], string> = {
  queued: 'share.progress.queued',
  converting: 'share.progress.converting',
  requesting: 'share.progress.requesting',
  uploading: 'share.progress.uploading',
  done: 'share.progress.done',
  failed: 'share.progress.failed',
};

export function PhotoProgressOverlay({ progress }: Props) {
  const t = useT();
  if (!progress) return null;
  const { state, percent, error } = progress;

  if (state === 'done') {
    return (
      <div className="pointer-events-none absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-lng-brand text-white shadow">
        <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="5 11 9 15 15 6" />
        </svg>
      </div>
    );
  }

  if (state === 'failed') {
    return (
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-center">
        <span className="text-sm font-semibold text-white">{t('share.progress.failed')}</span>
        {error && <span className="px-2 text-sm text-white/90 line-clamp-2">{error}</span>}
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40">
      <span className="text-sm font-semibold text-white">{t(LABEL_KEY[state])}</span>
      {state === 'uploading' && (
        <>
          <span className="text-sm font-bold text-white">{percent}%</span>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
            <div className="h-full bg-lng-brand transition-[width] duration-200" style={{ width: `${percent}%` }} />
          </div>
        </>
      )}
    </div>
  );
}
