import { useRef, useState } from 'react';
import { useInvitationForm } from '../../hooks/invitation-create/useInvitationForm';
import type { InvitationUploadItem } from '../../machines/invitationImageUpload.machine';
import { PhotoPositionModal } from './PhotoPositionModal';
import { sectionTitleClass } from './styles';

/**
 * 커버 이미지 업로더 — 낙관적 UI.
 * 선택 즉시 item.localUrl로 미리보기를 띄우고(업로드는 백그라운드),
 * 완료되면 store.coverImage(서버 URL)는 페이지 onItemDone이 동기화한다.
 * item이 없으면 기존 저장분(store.coverImage)을 표시 — 편집 진입 hydrate 경로.
 */
interface Props {
  /** 진행 중·실패·완료된 낙관적 업로드 아이템 (없으면 store.coverImage 표시) */
  item?: InvitationUploadItem;
  onPickFile: (file: File) => void;
  onRetry: () => void;
  onRemoveItem: () => void;
}

export function CoverImageUploader({ item, onPickFile, onRetry, onRemoveItem }: Props) {
  const store = useInvitationForm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [posModalOpen, setPosModalOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onPickFile(file);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  // 미리보기 소스: 진행 중 아이템(localUrl) 우선, 없으면 저장된 서버 URL
  const previewSrc = item ? item.localUrl : store.coverImage;
  const isUploading = item?.status === 'uploading';
  const isFailed = item?.status === 'failed';
  // 위치 조정은 서버 URL(store.coverImage) 기준 — 업로드 완료 전에는 숨김
  const canAdjustPosition = Boolean(store.coverImage) && (!item || item.status === 'done');

  const handleDelete = () => {
    if (item) {
      onRemoveItem();
      return;
    }
    store.setField('coverImage', '');
  };

  const pos = store.coverImagePosition;
  const hasCrop = pos?.cropArea && (pos.cropArea.width < 100 || pos.cropArea.height < 100 || pos.cropArea.x !== 0 || pos.cropArea.y !== 0);

  return (
    <section className="space-y-4">
      <h2 className={sectionTitleClass}>커버 이미지</h2>
      {previewSrc && (
        <div className="relative w-40 aspect-[9/16] rounded-lg overflow-hidden border border-gray-200">
          {hasCrop && pos && !item ? (
            <img
              src={previewSrc}
              alt="커버 미리보기"
              className="absolute block max-w-none"
              style={{
                width: `${(100 / pos.cropArea.width) * 100}%`,
                height: `${(100 / pos.cropArea.height) * 100}%`,
                left: `${-(pos.cropArea.x / pos.cropArea.width) * 100}%`,
                top: `${-(pos.cropArea.y / pos.cropArea.height) * 100}%`,
              }}
            />
          ) : (
            <img src={previewSrc} alt="커버 미리보기" className="w-full h-full object-cover" />
          )}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
              <span className="text-sm font-medium text-gray-700">업로드 중...</span>
            </div>
          )}
          {isFailed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70">
              <span className="text-sm font-medium text-red-500">업로드 실패</span>
              <button
                type="button"
                onClick={onRetry}
                className="rounded-md bg-black/60 px-2 py-1 text-sm text-white hover:bg-black/80 transition-colors"
              >
                재시도
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={handleDelete}
            className="absolute top-1 right-1 rounded-md bg-black/50 px-1.5 py-0.5 text-sm text-white hover:bg-black/70 transition-colors"
          >
            삭제
          </button>
          {canAdjustPosition && (
            <button
              type="button"
              onClick={() => setPosModalOpen(true)}
              className="absolute bottom-1 left-1 rounded-md bg-black/50 px-1.5 py-0.5 text-sm text-white hover:bg-black/70 transition-colors"
            >
              위치 조정
            </button>
          )}
        </div>
      )}
      <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-4 text-base text-gray-500 hover:border-sky-400 hover:text-sky-500 cursor-pointer transition-colors">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        파일 선택
      </label>
      {isFailed && item?.error && <p className="text-base text-red-500">{item.error}</p>}
      {posModalOpen && store.coverImage && (
        <PhotoPositionModal
          url={store.coverImage}
          saved={store.coverImagePosition}
          onApply={store.setCoverImagePosition}
          onClose={() => setPosModalOpen(false)}
          aspect={9 / 16}
        />
      )}
    </section>
  );
}
