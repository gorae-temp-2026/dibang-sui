import { useEffect, useRef, useState } from 'react';
import { useT } from '../../lib/i18n';

// 온기 더하기 — 프로토타입 #composeModal 원본 UI 이식.
// 여기서 만드는 건 '피드'(메시지 아님): 작성 시 작성자가 온기 스토리에 노출되고,
// 그 프로필을 누르면 FeedCardModal(인스타 스토리식)로 이 피드가 보인다.
// 사진 0~1장은 presigned memory(v3-memory/{loungeId}/) 업로드 후 photo_url로 전송(FEED 확장 노선,
// decisions #2 반전). 제출 = 텍스트(필수) + 사진(선택). 공지 토글 없음.
// (W03 #2·#3: mutation·upload·me 호출은 상위 컨테이너에서 주입, 모달은 form state·preview만)

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
  onSubmit: (text: string, file: File | null) => Promise<{ ok: boolean }>;
  isUploading: boolean;
  isPosting: boolean;
  /** 업로드/게시 에러 여부. true면 안내 문구 노출. */
  uploadError?: string | null;
  postError?: boolean;
}

function PhotoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

export function ComposeModal({
  isOpen,
  onClose,
  currentUserName,
  onSubmit,
  isUploading,
  isPosting,
  uploadError,
  postError,
}: ComposeModalProps) {
  const t = useT();
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setText('');
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setPhotoFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // 언마운트 시 objectURL 정리
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  if (!isOpen) return null;

  const name = currentUserName;
  const initial = name.charAt(0);

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setPhotoFile(file);
    setImageUrl(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setPhotoFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || isPosting || isUploading) return;
    const result = await onSubmit(trimmed, photoFile);
    if (result.ok) {
      reset();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 px-6 py-10">
      <button
        type="button"
        onClick={close}
        aria-label={t('loungeV2.compose.close')}
        className="absolute right-5 top-8 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {/* 피드 카드와 동일 구조의 미리보기 카드 */}
      <article className="mt-12 flex aspect-[3/4] w-full max-w-[340px] flex-col self-center overflow-hidden rounded-2xl bg-white shadow-frame">
        <div className="flex items-center gap-3 border-b border-lng-line/60 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lng-pink text-base font-semibold text-lng-brand">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-lng-ink">{name}</p>
          </div>
          <span className="shrink-0 text-sm text-lng-muted">{t('loungeV2.compose.now')}</span>
        </div>

        <div className="relative flex-1">
          {imageUrl ? (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${imageUrl})` }}
              />
              <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 to-transparent" />
              <button
                type="button"
                onClick={removePhoto}
                aria-label={t('loungeV2.compose.removePhoto')}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-lg text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('loungeV2.compose.placeholder')}
                className="absolute inset-x-0 bottom-0 max-h-[55%] w-full resize-none bg-transparent px-5 pb-5 font-serif text-lg leading-relaxed text-white outline-none placeholder:text-white/70"
              />
            </>
          ) : (
            <div className="flex h-full flex-col bg-gradient-to-b from-[#FCEBDD] to-lng-pink p-5">
              <label className="mb-3 inline-flex w-fit cursor-pointer items-center gap-1.5 self-center rounded-full bg-white/70 px-3 py-1.5 text-sm font-medium text-lng-muted">
                <PhotoIcon />
                <span>{t('loungeV2.compose.addPhoto')}</span>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickPhoto} />
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('loungeV2.compose.placeholder')}
                className="w-full flex-1 resize-none bg-transparent font-serif text-lg leading-relaxed text-lng-ink outline-none placeholder:text-lng-muted"
              />
            </div>
          )}
        </div>
      </article>

      {/* 하단: 게시 */}
      <div className="mt-5 flex w-full max-w-[340px] justify-end self-center">
        <button
          type="button"
          onClick={submit}
          disabled={isPosting || isUploading || text.trim() === ''}
          className="rounded-full bg-lng-brand px-6 py-2 text-base font-medium text-white disabled:opacity-50"
        >
          {isUploading ? t('loungeV2.compose.uploading') : isPosting ? t('loungeV2.compose.posting') : t('loungeV2.compose.post')}
        </button>
      </div>

      {(postError || uploadError) && (
        <p className="mt-3 self-center text-sm text-lng-pink">
          {uploadError
            ? t('loungeV2.compose.uploadError')
            : t('loungeV2.compose.postError')}
        </p>
      )}
    </div>
  );
}
