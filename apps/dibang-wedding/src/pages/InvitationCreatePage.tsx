import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { useMachine } from '@xstate/react';
import { DibangWordmark } from '@gorae/invitation-ui';
import { useInvitationForm, toCreateWeddingRequest, toUpdateInvitationRequest } from '../hooks/invitation-create/useInvitationForm';
import { useSaveInvitation } from '../queries/invitation-create/useSaveInvitation';
import { useAddInvitation } from '../queries/invitation-create/useAddInvitation';
import { useInvitationImageUpload } from '../hooks/invitation-create/useInvitationImageUpload';
import { useInvitationPhotoUpload } from '../queries/invitation/useInvitationPhotoUpload';
import { useSlugCheck } from '../hooks/invitation-create/useSlugCheck';
import { invitationCreateMachine } from '../machines/invitationCreate.machine';
import { useQuery } from '@tanstack/react-query';
import { getMeOptions } from '@gorae/contracts/@tanstack/react-query.gen';
import { EditPanel } from '../components/invitation-create/EditPanel';
import { MAX_GALLERY_PHOTOS } from '../components/invitation-create/GalleryUploader';
import { PreviewPanel } from '../components/invitation-create/PreviewPanel';
import { SlugModal } from '../components/invitation-create/SlugModal';
import { Toast } from '../components/invitation-create/Toast';

export function InvitationCreatePage() {
  // UI 토글 — flow 아님(STATE_MANAGEMENT.md): useState 유지
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [focusedSection, setFocusedSection] = useState<{ section: string; key: number } | undefined>();
  const [animPlayKey, setAnimPlayKey] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addToWeddingId = searchParams.get('weddingId');
  const isAddMode = !!addToWeddingId;

  // 페이지 flow 제어 = xState machine (slugGate → editing → saving → success/left)
  const [flow, send, flowActor] = useMachine(invitationCreateMachine);

  const { mutate: save } = useSaveInvitation();
  const { mutate: addInvitation } = useAddInvitation(addToWeddingId ?? '');
  const { data: me } = useQuery(getMeOptions());

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

  // 저장: 머신이 흐름 제어. send(SAVE) → 가드 통과 시 saving 진입 → mutation 호출 → 결과 send.
  // (STATE_MANAGEMENT.md §4: 머신은 fetch 안 함 — 컴포넌트가 Query 호출 후 결과 send)
  const handleSave = () => {
    const state = useInvitationForm.getState();
    const uploadingNow = [...coverUpload.items, ...galleryUpload.items].some((it) => it.status === 'uploading');
    // validate()는 store.errors(필드 하이라이트) 부수효과 + 첫 누락 라벨 반환 — 생성 모드에서만
    const missing = isAddMode ? null : state.validate();
    send({ type: 'SAVE', uploadingNow, isAddMode, slug: state.slug, missing });
    // send는 동기 처리 — 방금 전이 결과는 flowActor.getSnapshot()로 읽는다.
    // (렌더 스냅샷 flow는 이 틱엔 아직 editing이라 분기에 쓰면 안 됨)
    // 가드에 막히면(업로드중·slug·필수누락) saving 미진입 → 토스트만 뜨고 종료
    if (!flowActor.getSnapshot().matches('saving')) return;

    const onError = (e: unknown) =>
      send({ type: 'SAVE_ERROR', error: e instanceof Error ? e.message : '저장에 실패했습니다.' });

    if (isAddMode) {
      addInvitation(
        { slug: state.slug, invitationReq: toUpdateInvitationRequest(state) },
        { onSuccess: () => send({ type: 'SAVE_SUCCESS' }), onError },
      );
    } else {
      save(
        {
          weddingReq: toCreateWeddingRequest(state, me?.id),
          invitationReq: toUpdateInvitationRequest(state),
        },
        { onSuccess: () => send({ type: 'SAVE_SUCCESS' }), onError },
      );
    }
  };

  // 저장 완료 → 폼 리셋 + 이동 / 모달 돌아가기 → 이동 (머신 final 상태가 트리거).
  // 전체 flow 스냅샷 대신 파생 키(exitTarget)에 의존 — 무관한 context 변경 시 재실행 방지.
  const exitTarget = flow.matches('success') ? 'success' : flow.matches('left') ? 'left' : null;
  useEffect(() => {
    if (exitTarget === 'success') {
      useInvitationForm.getState().reset();
      navigate('/my-wedding');
    } else if (exitTarget === 'left') {
      navigate('/my-wedding');
    }
  }, [exitTarget, navigate]);

  // 토스트 3초 자동 해제 (머신 context.toast 단일 소스)
  useEffect(() => {
    if (!flow.context.toast) return;
    const t = setTimeout(() => send({ type: 'DISMISS_TOAST' }), 3000);
    return () => clearTimeout(t);
  }, [flow.context.toast, send]);

  const isSaving = flow.matches('saving');

  return (
    <div className="h-screen flex flex-col max-w-screen-lg mx-auto w-full bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <Link to="/my-wedding"><DibangWordmark className="text-2xl" /></Link>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-sky-500 px-4 py-2 text-base font-semibold text-white hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? '저장 중...' : '저장하기'}
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
        open={flow.matches('slugGate')}
        onClose={() => send({ type: 'CLOSE' })}
        onConfirm={() => send({ type: 'CONFIRM_SLUG' })}
        isPending={false}
        slugAvailability={slugAvailability}
      />

      {flow.context.toast && <Toast message={flow.context.toast} onClose={() => send({ type: 'DISMISS_TOAST' })} />}
    </div>
  );
}
