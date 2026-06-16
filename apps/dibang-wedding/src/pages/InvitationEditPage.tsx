import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router';
import { DibangWordmark } from '@gorae/invitation-ui';
import { useInvitationForm, toCreateWeddingRequest, toUpdateInvitationRequest } from '../hooks/invitation-create/useInvitationForm';
import { useLoadWedding } from '../hooks/invitation-edit/useLoadWedding';
import { useHydrateInvitationForm } from '../hooks/invitation-edit/useHydrateInvitationForm';
import { useUpdateWedding } from '../queries/invitation-edit/useUpdateWedding';
import { useInvitationImageUpload } from '../hooks/invitation-create/useInvitationImageUpload';
import { useInvitationPhotoUpload } from '../queries/invitation/useInvitationPhotoUpload';
import { EditPanel } from '../components/invitation-create/EditPanel';
import { MAX_GALLERY_PHOTOS } from '../components/invitation-create/GalleryUploader';
import { PreviewPanel } from '../components/invitation-create/PreviewPanel';
import { Toast } from '../components/invitation-create/Toast';

export function InvitationEditPage() {
  const { weddingId } = useParams<{ weddingId: string }>();
  const [searchParams] = useSearchParams();
  const targetInvitationId = searchParams.get('invitationId');
  const navigate = useNavigate();
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [toast, setToast] = useState<string | null>(null);
  const [focusedSection, setFocusedSection] = useState<{ section: string; key: number } | undefined>();

  const handleFocusSection = useCallback((section: string) => {
    setFocusedSection({ section, key: Date.now() });
  }, []);
  const { wedding, invitation, slug, isLoading, isError, invitationId } = useLoadWedding(weddingId!, targetInvitationId);
  useHydrateInvitationForm(wedding, invitation, slug);
  const { mutate: update, isPending } = useUpdateWedding(weddingId!, invitationId);

  // 이미지 업로드 (cover/gallery) — page가 mutation 흡수 (UI/데이터 분리 2-G)
  // Edit은 wedding이 존재 → presigned mobile-invitation(wedding 스코프)으로 업로드 (STORAGE.md).
  // 업로드 UI는 로딩 완료 후에만 렌더되므로 invitationId는 사용 시점에 항상 채워져 있다.
  const uploadContext = {
    mode: 'wedding',
    weddingId: weddingId ?? '',
    invitationId,
  } as const;
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

  useEffect(() => {
    return () => {
      useInvitationForm.getState().reset();
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-base text-muted">불러오는 중...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-base text-muted">청첩장을 불러올 수 없습니다</p>
        <Link to="/my-wedding" className="text-base text-sky-500 hover:text-sky-700">
          돌아가기
        </Link>
      </div>
    );
  }

  const handleSave = () => {
    const state = useInvitationForm.getState();
    // 업로드 진행 중 저장 가드 — 진행 중 사진은 아직 store에 없어 페이로드에서 빠진다
    if ([...coverUpload.items, ...galleryUpload.items].some((it) => it.status === 'uploading')) {
      showToast('사진 업로드가 끝나면 저장할 수 있어요');
      return;
    }
    const missing = state.validate();
    if (missing) {
      showToast(`${missing}을(를) 입력해주세요`);
      return;
    }
    const weddingFull = toCreateWeddingRequest(state);
    update(
      {
        weddingReq: { info: weddingFull.info, hosts: weddingFull.hosts },
        invitationReq: toUpdateInvitationRequest(state),
      },
      {
        onSuccess: () => {
          useInvitationForm.getState().reset();
          navigate('/my-wedding');
        },
      },
    );
  };

  return (
    <div className="h-screen flex flex-col max-w-screen-lg mx-auto w-full bg-gray-50">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="뒤로가기"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <Link to="/my-wedding"><DibangWordmark className="text-2xl" /></Link>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-sky-500 px-4 py-2 text-base font-semibold text-white hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? '저장 중...' : '수정하기'}
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
          <PreviewPanel focusedSection={focusedSection} />
        </div>
        <div className="basis-7/12 overflow-y-auto">
          <EditPanel
            title="청첩장 수정하기"
            onFocusSection={handleFocusSection}
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
      <div className="flex-1 overflow-y-auto md:hidden">
        {mobileTab === 'edit' ? (
          <EditPanel
            title="청첩장 수정하기"
            onFocusSection={handleFocusSection}
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
          <PreviewPanel focusedSection={focusedSection} />
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
