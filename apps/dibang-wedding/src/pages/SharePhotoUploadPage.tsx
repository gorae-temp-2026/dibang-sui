/**
 * Photo Sharing T-15b — 하객 현장사진 공유 업로드 페이지.
 *
 * 라우트: /lounge/:loungeId/share-photos/upload (AuthGuard 안)
 * 시나리오 S-03·§11: 100장/하객, 병렬 3-5, 진행률, 자동재시도 1회.
 *
 * UI/데이터 분리 P3-2: presignedUpload 직접 호출은 sharePhotoUpload.machine 안의
 * presignedUploadActor로 흡수. page는 register mutation을 input으로 주입하고 START 이벤트만
 * 발사. (이전엔 page가 await presignedUpload + onProgress/onUploaded 콜백 직접 디스패치)
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useMachine } from '@xstate/react';
import {
  sharePhotoUploadMachine,
  SHARE_PHOTO_QUOTA_PER_GUEST,
  type RegisterUploaded,
} from '../machines/sharePhotoUpload.machine';
import { useListSharedPhotos } from '../queries/share-photo/useListSharedPhotos';
import { useCreateSharedPhoto } from '../queries/share-photo/useCreateSharedPhoto';
import { useSignedUrls } from '../queries/share-photo/useSignedUrls';
import { useCheckMyCheckIn } from '../queries/lounge-check-in-gate/useCheckMyCheckIn';
import { SIDE_LABEL } from '../lib/guestLabel';
import { PhotoProgressOverlay } from '../components/share-photos/PhotoProgressOverlay';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

interface ExistingPhoto {
  id: string;
  storagePath: string;
  signedUrl?: string;
}

export function SharePhotoUploadPage() {
  const { loungeId } = useParams<{ loungeId: string }>();
  const navigate = useNavigate();
  const { data: sharedPhotosData, isError: sharedPhotosIsError } = useListSharedPhotos(loungeId);

  // signed URL 페치는 queries/share-photo/useSignedUrls 훅으로 캡슐화 (UI/데이터 분리 3-I).
  // paths 배열은 매 렌더마다 새 reference라 useMemo로 안정화 — queryKey가 매번 달라지는 것 방지.
  const rows = useMemo(
    () => ((sharedPhotosData?.data ?? []) as Array<{ id: string; storage_path: string }>),
    [sharedPhotosData],
  );
  const paths = useMemo(() => rows.map((p) => p.storage_path), [rows]);
  const { data: signedUrls, isError: signedUrlsIsError } = useSignedUrls(paths);

  const existing: ExistingPhoto[] | null = useMemo(() => {
    if (sharedPhotosIsError) return [];
    if (!sharedPhotosData) return null;
    // signed URL은 별도 비동기지만 실패해도 storagePath만으로 fallback 렌더링.
    const urls = signedUrlsIsError ? [] : (signedUrls ?? []);
    return rows.map((p, i) => ({ id: p.id, storagePath: p.storage_path, signedUrl: urls[i] }));
  }, [sharedPhotosData, sharedPhotosIsError, signedUrls, signedUrlsIsError, rows]);

  if (!loungeId) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] items-center justify-center bg-white p-4 text-base text-lng-muted">
        loungeId가 없습니다
      </div>
    );
  }
  if (existing === null) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] items-center justify-center bg-white">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-lng-line border-t-lng-brand" />
      </div>
    );
  }

  return (
    <SharePhotoUploadInner
      loungeId={loungeId}
      existing={existing}
      onBack={() => navigate(`/lounge/${loungeId}/v2`)}
    />
  );
}

function SharePhotoUploadInner({
  loungeId,
  existing,
  onBack,
}: {
  loungeId: string;
  existing: ExistingPhoto[];
  onBack: () => void;
}) {
  const existingCount = existing.length;
  const { mutateAsync: createSharedPhotoAsync } = useCreateSharedPhoto(loungeId);

  // 입장 시 선택한 수신인 측(recipient_slot)에 따라 제목을 '{누구}에게 사진 보내기'로.
  // 미입력/조회 전이면 기본 "사진 공유" fallback.
  const { data: myCheckIn } = useCheckMyCheckIn(loungeId, true);
  const recipientSlot = myCheckIn?.recipient_slot;
  const shareTitle =
    recipientSlot && SIDE_LABEL[recipientSlot]
      ? `${SIDE_LABEL[recipientSlot]}에게 사진 보내기`
      : '사진 공유';

  // machine actor에 주입할 register 콜백 — React Query mutation이 캐시 invalidate를 책임지므로
  // SDK 직접 호출이 아닌 mutateAsync wrapping. (UI/데이터 분리 P3-2)
  const onRegister: RegisterUploaded = useCallback(
    async (r) => {
      await createSharedPhotoAsync({
        path: { loungeId },
        body: {
          storage_path: r.storagePath,
          file_name: r.fileName,
          file_size: r.fileSize,
          mime_type: r.mimeType,
        },
      });
    },
    [createSharedPhotoAsync, loungeId],
  );

  const [state, send] = useMachine(sharePhotoUploadMachine, {
    input: { loungeId, existingCount, onRegister },
  });

  const remaining = useMemo(
    () => Math.max(0, SHARE_PHOTO_QUOTA_PER_GUEST - existingCount),
    [existingCount],
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickImages = () => fileInputRef.current?.click();

  // file → previewUrl 매핑 (createObjectURL revoke 관리)
  const previewUrls = useMemo(() => {
    return state.context.files.map((f) => URL.createObjectURL(f));
  }, [state.context.files]);
  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  // 업로드 중 페이지 이탈 방지
  useEffect(() => {
    if (!state.matches('uploading')) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state]);

  // 사용자 액션 → machine 이벤트 (machine/SDK 무수정)
  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (picked.length === 0) return;
    const next = [...state.context.files, ...picked].slice(0, remaining);
    send({ type: 'PICK', files: next });
  };

  const removeAt = (index: number) => {
    const next = state.context.files.filter((_, i) => i !== index);
    if (next.length === 0) send({ type: 'CLEAR' });
    else send({ type: 'PICK', files: next });
  };

  // START → machine `uploading` state 진입 → presignedUploadActor 자동 invoke.
  // 진행률·register chain·완료/에러는 actor가 sendBack으로 머신에 디스패치.
  const start = () => send({ type: 'START' });

  const files = state.context.files;
  const progress = state.context.progress;
  const isSelecting = state.matches('selecting');
  const isUploading = state.matches('uploading');
  const isDone = state.matches('done');
  const isError = state.matches('error');

  const canShare = files.length > 0 && isSelecting;

  // === 완료 화면 ===
  if (isDone) {
    const uploadedCount = state.context.uploadedPaths.length;
    const attemptedCount = state.context.files.length;
    const failedCount = attemptedCount - uploadedCount;
    const totalAfter = existingCount + uploadedCount;
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-white">
        <Header onCancel={onBack} title="사진 공유" rightSlot={null} />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-lng-brand bg-[#FFF6F8]">
            <svg viewBox="0 0 24 24" className="h-9 w-9 text-lng-brand" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="5 13 10 18 19 7" />
            </svg>
          </div>
          <p className="text-2xl font-semibold text-lng-text-primary">
            {failedCount > 0 ? '일부 사진만 공유됐어요' : '사진이 공유됐어요'}
          </p>
          <p className="text-base text-lng-text-secondary">
            {uploadedCount}장의 사진이 공유됐습니다.
            {failedCount > 0 && ` (${failedCount}장 실패)`}
          </p>
          <p className="text-sm text-lng-muted">
            총 {totalAfter}장 공유 완료 (최대 {SHARE_PHOTO_QUOTA_PER_GUEST}장)
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-2 rounded-2xl bg-[#FFF0F3] px-8 py-3.5 text-base font-medium text-lng-text-primary"
          >
            돌아가기
          </button>
          <button
            type="button"
            onClick={() => send({ type: 'RESET' })}
            className="text-sm text-lng-muted underline-offset-4 hover:underline"
          >
            계속 올리기
          </button>
        </main>
      </div>
    );
  }

  // === 에러 화면 ===
  if (isError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-white">
        <Header onCancel={onBack} title="사진 공유" rightSlot={null} />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-lng-coral bg-[#FFF6F8]">
            <svg viewBox="0 0 24 24" className="h-9 w-9 text-lng-coral" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="8" x2="12" y2="13" />
              <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <p className="text-2xl font-semibold text-lng-text-primary">업로드에 실패했어요</p>
          <p className="text-base text-lng-coral">
            {state.context.error ?? '알 수 없는 오류가 발생했습니다'}
          </p>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => void start()}
              disabled={files.length === 0}
              className="rounded-2xl bg-lng-brand px-6 py-3 text-base font-medium text-white disabled:opacity-40"
            >
              다시 시도
            </button>
            <button
              type="button"
              onClick={() => send({ type: 'RESET' })}
              className="rounded-2xl border border-lng-line bg-white px-6 py-3 text-base font-medium text-lng-text-primary"
            >
              처음으로
            </button>
          </div>
        </main>
      </div>
    );
  }

  // === 업로드 중 화면 (전체 + 사진별 동시) ===
  if (isUploading) {
    const doneCount = progress.filter((p) => p.state === 'done').length;
    const totalCount = Math.max(1, progress.length);
    const overallPercent = Math.round((doneCount / totalCount) * 100);

    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-white">
        <Header onCancel={() => void 0} title="사진 공유 중" rightSlot={null} cancelDisabled />
        <section className="border-b border-lng-line px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-lng-line border-t-lng-brand" />
            <div className="flex-1">
              <p className="text-base font-semibold text-lng-text-primary">사진 업로드 중</p>
              <p className="mt-0.5 text-sm text-lng-text-secondary">
                {doneCount}/{progress.length}장 · {overallPercent}%
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded bg-lng-line">
            <div
              className="h-full bg-lng-brand transition-[width] duration-300"
              style={{ width: `${overallPercent}%` }}
            />
          </div>
        </section>
        <section className="px-4 py-4">
          <p className="mb-2.5 text-base font-semibold text-lng-text-primary">사진별 진행률</p>
          <div className="grid grid-cols-5 gap-1.5">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="relative aspect-square overflow-hidden rounded-xl border-2 border-lng-line"
              >
                <img src={previewUrls[i]} alt="" className="block h-full w-full object-cover" />
                <PhotoProgressOverlay progress={progress.find((p) => p.index === i)} />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // === 기본 (idle / selecting) ===
  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-white">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={handlePick}
      />

      <Header
        onCancel={onBack}
        title={shareTitle}
        rightSlot={
          <button
            type="button"
            onClick={() => void start()}
            disabled={!canShare}
            className="text-base font-semibold text-lng-brand disabled:pointer-events-none disabled:opacity-40"
          >
            공유{files.length > 0 ? `(${files.length})` : ''}
          </button>
        }
      />

      {/* 카운터 */}
      <section className="flex items-center justify-between border-b border-lng-line px-4 py-3 text-sm">
        <span className="text-lng-text-primary">내가 올린 사진 {existingCount}장</span>
        <span className="text-lng-muted">
          남은 {remaining}장 / 최대 {SHARE_PHOTO_QUOTA_PER_GUEST}장
        </span>
      </section>

      {/* 이미 보낸 사진 */}
      {existing.length > 0 && (
        <section className="px-4 pb-2 pt-4">
          <p className="mb-2.5 text-base font-semibold text-lng-text-primary">
            이미 보낸 사진 ({existing.length})
          </p>
          <div className="max-h-44 overflow-y-auto rounded-xl border border-lng-line p-1.5">
            <div className="grid grid-cols-5 gap-1.5">
              {existing.map((p) => (
                <div key={p.id} className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                  {p.signedUrl ? (
                    <img src={p.signedUrl} alt="" className="block h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-lng-muted">사진</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 선택한 사진 */}
      <section className="px-4 pb-6 pt-4">
        <p className="mb-2.5 text-base font-semibold text-lng-text-primary">
          선택한 사진 ({files.length}/{remaining})
        </p>
        {files.length === 0 ? (
          <button
            type="button"
            onClick={pickImages}
            disabled={remaining <= 0}
            className="flex h-[72px] w-[72px] items-center justify-center rounded-xl border-2 border-dashed border-lng-line bg-gray-50 text-3xl text-lng-muted disabled:opacity-40"
            aria-label="사진 추가"
          >
            +
          </button>
        ) : (
          <div className="grid grid-cols-5 gap-1.5">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="relative aspect-square overflow-hidden rounded-xl border-2 border-lng-brand"
              >
                <img src={previewUrls[i]} alt="" className="block h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white"
                  aria-label="삭제"
                >
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="2" y1="2" x2="10" y2="10" />
                    <line x1="10" y1="2" x2="2" y2="10" />
                  </svg>
                </button>
              </div>
            ))}
            {files.length < remaining && (
              <button
                type="button"
                onClick={pickImages}
                className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-lng-line bg-gray-50 text-3xl text-lng-muted"
                aria-label="사진 추가"
              >
                +
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Header({
  onCancel,
  title,
  rightSlot,
  cancelDisabled = false,
}: {
  onCancel: () => void;
  title: string;
  rightSlot: React.ReactNode;
  cancelDisabled?: boolean;
}) {
  return (
    <header className="flex flex-shrink-0 items-center justify-between border-b border-lng-line px-4 py-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={cancelDisabled}
        className="text-base text-lng-text-primary disabled:opacity-40"
      >
        취소
      </button>
      <span className="text-base font-semibold text-lng-text-primary">{title}</span>
      <div className="min-w-[48px] text-right">{rightSlot}</div>
    </header>
  );
}
