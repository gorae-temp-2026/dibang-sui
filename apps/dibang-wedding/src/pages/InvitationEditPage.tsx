import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router';
import { DibangWordmark } from '@gorae/invitation-ui';
import { useInvitationForm, toCreateWeddingRequest, toUpdateInvitationRequest } from '../hooks/invitation-create/useInvitationForm';
import { useLoadWedding } from '../hooks/invitation-edit/useLoadWedding';
import { useHydrateInvitationForm } from '../hooks/invitation-edit/useHydrateInvitationForm';
import { useUpdateWedding } from '../queries/invitation-edit/useUpdateWedding';
import { useInvitationImageUpload } from '../hooks/invitation-create/useInvitationImageUpload';
import { useSlugCheck } from '../hooks/invitation-create/useSlugCheck';
import { useInvitationPhotoUpload } from '../queries/invitation/useInvitationPhotoUpload';
import { EditPanel } from '../components/invitation-create/EditPanel';
import { MAX_GALLERY_PHOTOS } from '../components/invitation-create/GalleryUploader';
import { PreviewPanel } from '../components/invitation-create/PreviewPanel';
import { Toast } from '../components/invitation-create/Toast';
import { useMachine } from '@xstate/react';
import { useQueryClient } from '@tanstack/react-query';
import { getWeddingQueryKey } from '@gorae/contracts/@tanstack/react-query.gen';
import { invitationEditMachine } from '../machines/invitationEdit.machine';

export function InvitationEditPage() {
  const { weddingId } = useParams<{ weddingId: string }>();
  const [searchParams] = useSearchParams();
  const targetInvitationId = searchParams.get('invitationId');
  const navigate = useNavigate();
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [focusedSection, setFocusedSection] = useState<{ section: string; key: number } | undefined>();
  // 수정 페이지 flow는 머신이 제어(STATE_MANAGEMENT.md). toast/saving/로딩 분기 = 머신 상태.
  const [state, send, editActor] = useMachine(invitationEditMachine);
  const queryClient = useQueryClient();

  const handleFocusSection = useCallback((section: string) => {
    setFocusedSection({ section, key: Date.now() });
  }, []);
  const { wedding, invitation, slug, isLoading, isError, invitationId } = useLoadWedding(weddingId!, targetInvitationId);
  useHydrateInvitationForm(wedding, invitation, slug);

  // slug 중복검증(useSlugCheck 재사용) — 기존 slug(originalSlug)와 같으면 idle(=available 유지), 바꾸면 재검증.
  const formSlug = useInvitationForm((s) => s.slug);
  const slugAvailability = useSlugCheck(formSlug, slug);
  const { mutate: update } = useUpdateWedding(weddingId!, invitationId);

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

  // 로딩/에러(useLoadWedding) → 머신 flow 동기 (머신이 화면 분기의 단일 소스).
  useEffect(() => {
    if (isLoading) return;
    if (isError) send({ type: 'LOAD_ERROR', kind: 'not_found' });
    else send({ type: 'LOAD_SUCCESS' });
  }, [isLoading, isError, send]);

  // slug 가용성 → 머신 slug 병렬 동기 (checking→CHECK_START, taken→TAKEN, error→ERROR, idle/available→AVAILABLE).
  useEffect(() => {
    if (slugAvailability === 'checking') send({ type: 'SLUG_CHECK_START' });
    else if (slugAvailability === 'taken') send({ type: 'SLUG_TAKEN' });
    else if (slugAvailability === 'error') send({ type: 'SLUG_ERROR' });
    else send({ type: 'SLUG_AVAILABLE' });
  }, [slugAvailability, send]);

  // 편집 중 폼 변경 → FIELD_CHANGED(머신 isDirty). editing 진입 후 구독(hydrate 변화는 editing 전이라 제외).
  const isEditing = state.matches({ flow: 'editing' });
  useEffect(() => {
    if (!isEditing) return;
    const unsub = useInvitationForm.subscribe(() => send({ type: 'FIELD_CHANGED' }));
    return unsub;
  }, [isEditing, send]);

  // 이탈 시도(뒤로가기/로고) → dirty면 경고 모달(NAVIGATE_AWAY), 아니면 즉시 이동.
  // (앱이 <BrowserRouter>라 data-router 전용 useBlocker는 못 씀 — 이탈 트리거를 직접 가로챈다.)
  const [pendingTo, setPendingTo] = useState<number | string | null>(null);
  const requestLeave = (to: number | string) => {
    if (state.context.isDirty) {
      setPendingTo(to);
      send({ type: 'NAVIGATE_AWAY' });
    } else if (typeof to === 'number') {
      navigate(to);
    } else {
      navigate(to);
    }
  };
  // 새로고침/탭 닫기 → 브라우저 기본 이탈 경고(dirty 시).
  useEffect(() => {
    if (!state.context.isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [state.context.isDirty]);

  // 저장 완료(머신 flow.success final) → 폼 리셋 + 이동.
  const exitSuccess = state.matches({ flow: 'success' });
  useEffect(() => {
    if (exitSuccess) {
      useInvitationForm.getState().reset();
      navigate('/my-wedding');
    }
  }, [exitSuccess, navigate]);

  // 토스트 3초 자동 해제 (머신 context.toast 단일 소스).
  useEffect(() => {
    if (!state.context.toast) return;
    const t = setTimeout(() => send({ type: 'DISMISS_TOAST' }), 3000);
    return () => clearTimeout(t);
  }, [state.context.toast, send]);

  if (state.matches({ flow: 'loading' })) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-base text-muted">불러오는 중...</p>
      </div>
    );
  }

  if (state.matches({ flow: 'loadError' })) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-base text-muted">청첩장을 불러올 수 없습니다</p>
        <Link to="/my-wedding" className="text-base text-sky-500 hover:text-sky-700">
          돌아가기
        </Link>
      </div>
    );
  }

  // 저장 실행. withVersion=true → 낙관잠금(현재 version 전달), false → FORCE_SAVE(version 생략, 강제 덮어쓰기).
  const doSave = (withVersion: boolean) => {
    const store = useInvitationForm.getState();
    const weddingFull = toCreateWeddingRequest(store);
    update(
      {
        weddingReq: {
          info: weddingFull.info,
          hosts: weddingFull.hosts,
          ...(withVersion ? { version: wedding?.version } : {}),
        },
        invitationReq: {
          ...toUpdateInvitationRequest(store),
          ...(withVersion ? { version: invitation?.version } : {}),
        },
      },
      {
        onSuccess: () => send({ type: 'SAVE_SUCCESS' }),
        onError: (e) => {
          const status =
            (e as { status?: number })?.status ??
            (e as { response?: { status?: number } })?.response?.status;
          if (status === 409) send({ type: 'SAVE_CONFLICT' });
          else send({ type: 'SAVE_ERROR', error: e instanceof Error ? e.message : '저장에 실패했습니다.' });
        },
      },
    );
  };

  // 저장: send(SAVE) → 가드 통과 시 saving 진입 → 낙관잠금 저장 (STATE_MANAGEMENT.md §4).
  const handleSave = () => {
    const store = useInvitationForm.getState();
    const uploadingNow = [...coverUpload.items, ...galleryUpload.items].some((it) => it.status === 'uploading');
    const missing = store.validate();
    send({ type: 'SAVE', missing: missing ? [missing] : [], uploadingNow });
    // send는 동기 — 방금 전이 결과는 getSnapshot으로 읽는다(렌더 state는 이 틱엔 아직 editing).
    if (!editActor.getSnapshot().matches({ flow: 'saving' })) return;
    doSave(true);
  };

  return (
    <div className="h-screen flex flex-col max-w-screen-lg mx-auto w-full bg-gray-50">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => requestLeave(-1)}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="뒤로가기"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button type="button" onClick={() => requestLeave('/my-wedding')}><DibangWordmark className="text-2xl" /></button>
        </div>
        <button
          onClick={handleSave}
          disabled={state.matches({ flow: 'saving' })}
          className="rounded-lg bg-sky-500 px-4 py-2 text-base font-semibold text-white hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {state.matches({ flow: 'saving' }) ? '저장 중...' : '수정하기'}
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
            slugAvailability={slugAvailability}
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
            slugAvailability={slugAvailability}
          />
        ) : (
          <PreviewPanel focusedSection={focusedSection} />
        )}
      </div>

      {state.context.toast && <Toast message={state.context.toast} onClose={() => send({ type: 'DISMISS_TOAST' })} />}

      {/* 이탈 경고 모달 — 머신 flow.confirmingLeave(미저장 변경 시 라우터 차단으로 진입) */}
      {state.matches({ flow: 'confirmingLeave' }) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 space-y-5">
            <h2 className="text-lg font-bold text-gray-900">저장하지 않고 나갈까요?</h2>
            <p className="text-base text-gray-500">변경한 내용이 저장되지 않았어요.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { send({ type: 'CANCEL_LEAVE' }); setPendingTo(null); }}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                계속 편집
              </button>
              <button
                type="button"
                onClick={() => {
                  send({ type: 'CONFIRM_LEAVE' });
                  if (typeof pendingTo === 'number') navigate(pendingTo);
                  else if (pendingTo) navigate(pendingTo);
                }}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-base font-semibold text-white hover:bg-red-600 transition-colors"
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 서버 충돌 모달 — 머신 flow.conflict(낙관잠금 409). 새로고침(서버 데이터 재로드) / 강제 저장(version 생략) */}
      {state.matches({ flow: 'conflict' }) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 space-y-5">
            <h2 className="text-lg font-bold text-gray-900">다른 곳에서 먼저 수정됐어요</h2>
            <p className="text-base text-gray-500">새로고침해서 최신 내용을 받거나, 내 변경으로 강제 저장할 수 있어요.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  send({ type: 'RELOAD_SERVER_DATA' });
                  queryClient.invalidateQueries({ queryKey: getWeddingQueryKey({ path: { weddingId: weddingId! } }) });
                }}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                새로고침
              </button>
              <button
                type="button"
                onClick={() => {
                  send({ type: 'FORCE_SAVE' });
                  if (editActor.getSnapshot().matches({ flow: 'saving' })) doSave(false);
                }}
                className="flex-1 rounded-lg bg-sky-500 px-4 py-2.5 text-base font-semibold text-white hover:bg-sky-600 transition-colors"
              >
                강제 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
