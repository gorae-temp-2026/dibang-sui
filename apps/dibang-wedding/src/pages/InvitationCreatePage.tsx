import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { DibangWordmark } from '@gorae/invitation-ui';
import { useInvitationForm, toCreateWeddingRequest, toUpdateInvitationRequest } from '../hooks/invitation-create/useInvitationForm';
import { toCreateWeddingParams } from '../queries/invitation-create/onchainWedding';
import { useSaveInvitation } from '../queries/invitation-create/useSaveInvitation';
import { useAddInvitation } from '../queries/invitation-create/useAddInvitation';
import { useInvitationImageUpload } from '../hooks/invitation-create/useInvitationImageUpload';
import { useInvitationPhotoUpload } from '../queries/invitation/useInvitationPhotoUpload';
import { useSlugCheck } from '../hooks/invitation-create/useSlugCheck';
import { useQuery } from '@tanstack/react-query';
import { getMeOptions } from '@gorae/contracts/@tanstack/react-query.gen';
import { EditPanel } from '../components/invitation-create/EditPanel';
import { MAX_GALLERY_PHOTOS } from '../components/invitation-create/GalleryUploader';
import { PreviewPanel } from '../components/invitation-create/PreviewPanel';
import { SlugModal } from '../components/invitation-create/SlugModal';
import { Toast } from '../components/invitation-create/Toast';

export function InvitationCreatePage() {
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [slugConfirmed, setSlugConfirmed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [focusedSection, setFocusedSection] = useState<{ section: string; key: number } | undefined>();
  const [animPlayKey, setAnimPlayKey] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addToWeddingId = searchParams.get('weddingId');
  const isAddMode = !!addToWeddingId;

  const { mutate: save, isPending: isSavePending } = useSaveInvitation();
  const { mutate: addInvitation, isPending: isAddPending } = useAddInvitation(addToWeddingId ?? '');
  const { data: me } = useQuery(getMeOptions());
  const isPending = isAddMode ? isAddPending : isSavePending;

  // 이미지 업로드 — page가 mutation 흡수, EditPanel·위젯은 콜백 받음 (UI/데이터 분리 2-G)
  // Create 흐름은 wedding 미존재 → draft(v3-tmp) 업로드, 저장 확정 시 서버가 wedding
  // 경로로 이동 (STORAGE.md, _architecture/2026-06-10-invitation-draft-upload.md)
  const uploadContext = { mode: 'draft' } as const;
  // 커버: 낙관적 업로드 머신 — 선택 즉시 localUrl 미리보기, 완료 시 store에 서버 URL 동기화
  const coverUpload = useInvitationImageUpload({
    context: uploadContext,
    subKind: 'cover',
    onItemDone: ({ serverUrl }) => useInvitationForm.getState().setField('coverImage', serverUrl),
  });
  const coverItem = coverUpload.items.at(-1);
  const handlePickCover = useCallback(
    (file: File) => {
      // 교체 선택: 이전 아이템(진행 중 포함) 제거 후 새 업로드 시작
      for (const it of coverUpload.items) coverUpload.remove(it.id);
      coverUpload.addFiles([file]);
    },
    [coverUpload],
  );
  const handleRetryCover = useCallback(() => {
    if (coverItem) coverUpload.retry(coverItem.id);
  }, [coverUpload, coverItem]);
  const handleRemoveCoverItem = useCallback(() => {
    if (!coverItem) return;
    coverUpload.remove(coverItem.id);
    // 완료된 아이템 제거 = 커버 비우기 (store 동기화 해제)
    if (coverItem.status === 'done' && coverItem.serverUrl) {
      const store = useInvitationForm.getState();
      if (store.coverImage === coverItem.serverUrl) store.setField('coverImage', '');
    }
  }, [coverUpload, coverItem]);
  // 갤러리: 파일별 독립 낙관적 업로드 — 완료분은 store로 옮기고 낙관적 칸은 제거
  const galleryUpload = useInvitationImageUpload({
    context: uploadContext,
    subKind: 'gallery',
    onItemDone: ({ id, serverUrl }) => {
      useInvitationForm.getState().addGalleryPhoto(serverUrl);
      galleryUpload.remove(id);
    },
  });
  // 캔버스(그림판) 이미지: 같은 presigned 경로, subKind만 분리
  const canvasUpload = useInvitationPhotoUpload(uploadContext, 'canvas');
  const handleUploadCanvasImage = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        return await canvasUpload.mutateAsync(file);
      } catch {
        return null;
      }
    },
    [canvasUpload],
  );
  const handleAddGalleryPhotos = useCallback(
    (files: File[]) => {
      const store = useInvitationForm.getState();
      const remaining =
        MAX_GALLERY_PHOTOS - store.galleryPhotos.length - galleryUpload.items.length;
      if (remaining <= 0) return;
      galleryUpload.addFiles(files.slice(0, remaining));
    },
    [galleryUpload],
  );

  // 슬러그 가용성 — page가 useSlugCheck 호출, SlugModal은 props로 받음
  const slug = useInvitationForm((s) => s.slug);
  const slugAvailability = useSlugCheck(slug);

  const handleFocusSection = useCallback((section: string) => {
    setFocusedSection({ section, key: Date.now() });
  }, []);

  // 애니메이션 재생 — 카운터 증가로 미리보기 Cover의 텍스트/레터링 애니메이션 재마운트 트리거
  const handlePlayAnimation = useCallback(() => {
    setAnimPlayKey((k) => k + 1);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = () => {
    const state = useInvitationForm.getState();
    // 업로드 진행 중 저장 가드 — 진행 중 사진은 아직 store에 없어 페이로드에서 빠진다
    if ([...coverUpload.items, ...galleryUpload.items].some((it) => it.status === 'uploading')) {
      showToast('사진 업로드가 끝나면 저장할 수 있어요');
      return;
    }
    if (isAddMode) {
      // invitation 추가 모드: slug만 필수
      if (!state.slug || state.slug.trim().length < 2) {
        showToast('공유 링크를 입력해주세요');
        return;
      }
      addInvitation(
        { slug: state.slug, invitationReq: toUpdateInvitationRequest(state) },
        {
          onSuccess: () => {
            useInvitationForm.getState().reset();
            navigate('/my-wedding');
          },
        },
      );
    } else {
      const missing = state.validate();
      if (missing) {
        showToast(`${missing}을(를) 입력해주세요`);
        return;
      }
      save(
        {
          weddingReq: toCreateWeddingRequest(state, me?.id),
          invitationReq: toUpdateInvitationRequest(state),
          onchainParams: toCreateWeddingParams(state),
        },
        {
          onSuccess: () => {
            useInvitationForm.getState().reset();
            navigate('/my-wedding');
          },
        },
      );
    }
  };

  const handleSlugConfirm = () => {
    setSlugConfirmed(true);
  };

  return (
    <div className="h-screen flex flex-col max-w-screen-lg mx-auto w-full bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <Link to="/my-wedding"><DibangWordmark className="text-2xl" /></Link>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-sky-500 px-4 py-2 text-base font-semibold text-white hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? '저장 중...' : '저장하기'}
        </button>
      </header>

      {/* Mobile tab toggle */}
      <div className="flex md:hidden border-b border-gray-100">
        <button
          onClick={() => setMobileTab('edit')}
          className={`flex-1 py-3 text-base font-semibold text-center transition-colors ${
            mobileTab === 'edit' ? 'text-navy border-b-2 border-navy' : 'text-muted'
          }`}
        >
          편집
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-3 text-base font-semibold text-center transition-colors ${
            mobileTab === 'preview' ? 'text-navy border-b-2 border-navy' : 'text-muted'
          }`}
        >
          미리보기
        </button>
      </div>

      {/* Desktop: side by side */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="basis-5/12 overflow-y-auto scrollbar-hide">
          <PreviewPanel focusedSection={focusedSection} animPlayKey={animPlayKey} />
        </div>
        <div className="basis-7/12 overflow-y-auto">
          <EditPanel
            title={isAddMode ? '청첩장 추가' : '청첩장 만들기'}
            invitationOnly={isAddMode}
            onFocusSection={handleFocusSection}
            onPlayAnimation={handlePlayAnimation}
            uploadContext={uploadContext}
            onPickCover={handlePickCover}
            coverItem={coverItem}
            onRetryCover={handleRetryCover}
            onRemoveCoverItem={handleRemoveCoverItem}
            onAddGalleryPhotos={handleAddGalleryPhotos}
            galleryItems={galleryUpload.items}
            onRetryGalleryItem={galleryUpload.retry}
            onRemoveGalleryItem={galleryUpload.remove}
            onUploadImage={handleUploadCanvasImage}
          />
        </div>
      </div>

      {/* Mobile: tab switch */}
      <div className="flex-1 overflow-y-auto scrollbar-hide md:hidden">
        {mobileTab === 'edit' ? (
          <EditPanel
            title={isAddMode ? '청첩장 추가' : '청첩장 만들기'}
            invitationOnly={isAddMode}
            onFocusSection={handleFocusSection}
            onPlayAnimation={handlePlayAnimation}
            uploadContext={uploadContext}
            onPickCover={handlePickCover}
            coverItem={coverItem}
            onRetryCover={handleRetryCover}
            onRemoveCoverItem={handleRemoveCoverItem}
            onAddGalleryPhotos={handleAddGalleryPhotos}
            galleryItems={galleryUpload.items}
            onRetryGalleryItem={galleryUpload.retry}
            onRemoveGalleryItem={galleryUpload.remove}
            onUploadImage={handleUploadCanvasImage}
          />
        ) : (
          <PreviewPanel focusedSection={focusedSection} animPlayKey={animPlayKey} />
        )}
      </div>

      <SlugModal
        open={!slugConfirmed}
        onClose={() => navigate('/my-wedding')}
        onConfirm={handleSlugConfirm}
        isPending={false}
        slugAvailability={slugAvailability}
      />

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
