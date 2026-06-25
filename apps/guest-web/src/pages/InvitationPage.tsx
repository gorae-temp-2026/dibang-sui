import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router';
import { useMachine } from '@xstate/react';
import { invitationPageMachine } from '../machines/invitation.machine';
import { useQuery } from '@tanstack/react-query';
import { getInvitationOptions } from '@gorae/contracts/@tanstack/react-query.gen';
import type { InvitationPublic } from '@gorae/contracts';
import type { WeddingData, RsvpFormData, MapProvider, CanvasItem } from '@gorae/invitation-ui';
import {
  InvitationRenderer,
  RsvpModal,
  BottomToggle,
  LoungePreview,
  getRsvpHostOptions,
} from '@gorae/invitation-ui';
import { useCopyToClipboard } from '@gorae/web-utils';
import { useHeartInvitationOnce } from '../queries/invitation/useHeartInvitationOnce';
import { getDibangUrl } from '../lib/config';
import { buildMapLink, detectMobile } from '../lib/map-deep-link';
import { buildTossLink, buildKakaoLink } from '../lib/payDeepLink';
import { createRsvp } from '@gorae/contracts/sdk.gen';
import type { CreateRsvpRequest } from '@gorae/contracts';
import { useOnchainActions } from '../hooks/useOnchainActions';
import { useZkLogin } from '../providers/ZkLoginProvider';
import { useT } from '../lib/i18n';

function toUiAccount(
  apiAccount: { bank?: string; address?: string } | undefined,
  role: string,
  name: string,
): { role: string; name: string; bank: string; number: string } | null {
  if (!apiAccount || (!apiAccount.bank && !apiAccount.address)) return null;
  return { role, name, bank: apiAccount.bank ?? '', number: apiAccount.address ?? '' };
}

/** 발행 청첩장의 디자인 설정(레터링·폰트·색상·섹션)을 API(snake) → WeddingData(camel)로 변환.
 *  dibang-wedding useHydrateInvitationForm 복원 로직과 동일 규칙. */
function toCoverTextConfig(c: InvitationPublic['cover_text_config']): WeddingData['coverTextConfig'] {
  if (!c) return undefined;
  return {
    text: c.text,
    fontSize: c.font_size,
    x: c.x,
    y: c.y,
    rotation: c.rotation,
    animation: c.animation,
    colorType: c.color_type,
    solidColor: c.solid_color,
    gradientColors:
      c.gradient_colors && c.gradient_colors.length >= 2
        ? [c.gradient_colors[0], c.gradient_colors[1]]
        : undefined,
  };
}

function toLettering(dc: InvitationPublic['design_config']): WeddingData['lettering'] {
  const l = dc?.lettering;
  if (!l) return undefined;
  const hasContent = !!l.image_url || (l.strokes?.length ?? 0) > 0;
  if (!hasContent) return undefined;
  return {
    source: l.source ?? 'text',
    imageUrl: l.image_url ?? null,
    strokes: (l.strokes ?? []).map((s) => ({
      d: s.d ?? '',
      color: s.color ?? '#000000',
      width: s.width ?? 2,
      tool: s.tool,
      points: s.points?.map((p) => ({ x: p.x ?? 0, y: p.y ?? 0, t: p.t ?? 0 })),
    })),
    drawViewBox: { width: l.draw_view_box?.width ?? 300, height: l.draw_view_box?.height ?? 300 },
    animation: l.animation ?? 'none',
    x: l.x ?? 0,
    y: l.y ?? 0,
    width: l.width ?? 60,
    height: l.height ?? 60,
    rotation: l.rotation ?? 0,
  };
}

function toCoverImagePosition(dc: InvitationPublic['design_config']): WeddingData['coverImagePosition'] {
  const cp = dc?.cover_image_position;
  if (!cp?.cropArea || cp.zoom == null || !cp.editorCrop) return undefined;
  return {
    cropArea: {
      x: cp.cropArea.x ?? 0,
      y: cp.cropArea.y ?? 0,
      width: cp.cropArea.width ?? 100,
      height: cp.cropArea.height ?? 100,
    },
    zoom: cp.zoom,
    editorCrop: { x: cp.editorCrop.x ?? 0, y: cp.editorCrop.y ?? 0 },
  };
}

type RawCanvasItem = NonNullable<NonNullable<NonNullable<InvitationPublic['design_config']>['canvas']>['items']>[number];

/** contract canvas item(snake) → WeddingData canvas item(camel). 미지의 type은 드롭. */
function toCanvasItem(raw: RawCanvasItem): CanvasItem | null {
  if (!raw.id || !raw.type) return null;
  const base = {
    id: raw.id,
    x: raw.x ?? 0,
    y: raw.y ?? 0,
    width: raw.width ?? 100,
    height: raw.height ?? 100,
    rotation: raw.rotation ?? 0,
    zIndex: raw.z_index ?? 0,
  };
  if (raw.type === 'drawing') {
    return {
      ...base,
      type: 'drawing',
      strokes: (raw.strokes ?? []).map((s) => ({
        d: s.d ?? '',
        color: s.color ?? '#000000',
        width: s.width ?? 2,
        tool: s.tool as 'pen' | 'brush' | undefined,
      })),
      viewBox: { width: raw.view_box?.width ?? 390, height: raw.view_box?.height ?? 500 },
    };
  }
  if (raw.type === 'text') {
    return {
      ...base,
      type: 'text',
      text: raw.text ?? '',
      fontSize: raw.font_size ?? 24,
      fontFamily: raw.font_family ?? 'Pretendard',
      color: raw.color ?? '#222222',
    };
  }
  if (raw.type === 'image') {
    return {
      ...base,
      type: 'image',
      imageUrl: raw.image_url ?? '',
      isSticker: raw.is_sticker ?? false,
    };
  }
  return null;
}

function toCanvasConfig(dc: InvitationPublic['design_config']): WeddingData['canvasConfig'] {
  const cv = dc?.canvas;
  if (!cv) return undefined;
  return {
    title: cv.title ?? '',
    subtitle: cv.subtitle ?? '',
    items: (cv.items ?? []).map(toCanvasItem).filter((it): it is CanvasItem => it !== null),
    backgroundColor: cv.background_color ?? 'transparent',
    viewBox: { width: cv.view_box?.width ?? 390, height: cv.view_box?.height ?? 500 },
  };
}

type TFn = (key: string, vars?: Record<string, string | number>) => string;

function toWeddingData(inv: InvitationPublic, slug: string, t: TFn): WeddingData {
  const { info } = inv;
  const dc = inv.design_config;
  return {
    groomName: info.groom_name,
    brideName: info.bride_name,
    date: `${info.date}T${info.time}:00`,
    venue: {
      name: info.venue.venue_name,
      address: info.venue.venue_address,
      hall: info.venue.venue_hall,
    },
    hosts: {
      groomFatherName: info.groom_father_name ?? '',
      groomMotherName: info.groom_mother_name ?? '',
      brideFatherName: info.bride_father_name ?? '',
      brideMotherName: info.bride_mother_name ?? '',
      groomFatherDeceased: info.groom_father_deceased,
      groomMotherDeceased: info.groom_mother_deceased,
      brideFatherDeceased: info.bride_father_deceased,
      brideMotherDeceased: info.bride_mother_deceased,
    },
    greetingMessage: inv.custom_message ?? '',
    groomAccounts: [
      toUiAccount(info.groom_account, t('invitationPage.account.groom'), info.groom_name),
      toUiAccount(info.groom_father_account, t('invitationPage.account.groomFather'), info.groom_father_name ?? ''),
      toUiAccount(info.groom_mother_account, t('invitationPage.account.groomMother'), info.groom_mother_name ?? ''),
    ].filter((a): a is NonNullable<typeof a> => a !== null),
    brideAccounts: [
      toUiAccount(info.bride_account, t('invitationPage.account.bride'), info.bride_name),
      toUiAccount(info.bride_father_account, t('invitationPage.account.brideFather'), info.bride_father_name ?? ''),
      toUiAccount(info.bride_mother_account, t('invitationPage.account.brideMother'), info.bride_mother_name ?? ''),
    ].filter((a): a is NonNullable<typeof a> => a !== null),
    galleryPhotos: inv.gallery_photos ?? [],
    coverImageUrl: inv.cover_image ?? '',
    heartCount: inv.heart_count,
    hostNotice: '',
    slug,
    coverTextConfig: toCoverTextConfig(inv.cover_text_config),
    lettering: toLettering(dc),
    coverImagePosition: toCoverImagePosition(dc),
    themeFonts: dc?.theme?.fonts
      ? {
          title: dc.theme.fonts.title ?? 'Pretendard',
          subtitle: dc.theme.fonts.subtitle ?? 'Pretendard',
          body: dc.theme.fonts.body ?? 'Pretendard',
        }
      : undefined,
    themeColors: dc?.theme?.colors
      ? {
          background: dc.theme.colors.background ?? '#ffffff',
          text: dc.theme.colors.text ?? '#222222',
          button: dc.theme.colors.button ?? '#222222',
          accent: dc.theme.colors.accent ?? '#b08968',
        }
      : undefined,
    sectionConfig: dc?.sections?.map((s) => ({
      key: s.key,
      enabled: s.enabled,
      order: s.order,
    })),
    canvasConfig: toCanvasConfig(dc),
  };
}

interface InvitationPageProps {
  data?: WeddingData;
}

export function InvitationPage({ data: dataProp }: InvitationPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const t = useT();
  const { submitRsvp } = useOnchainActions();
  const { isAuthenticated, login } = useZkLogin();

  const { data: invitation, isLoading, isError } = useQuery({
    ...getInvitationOptions({ path: { slug: slug! } }),
    enabled: !!slug && !dataProp,
  });

  const data = dataProp ?? (invitation ? toWeddingData(invitation, slug!, t) : undefined);

  // 페이지 flow는 머신이 제어(STATE_MANAGEMENT.md). data(로딩)/tab(전환)/rsvp(회신) 3축 parallel.
  const [state, send, rsvpActor] = useMachine(invitationPageMachine);
  const activeTab = state.context.activeTab;
  const rsvpOpen = state.matches({ rsvp: 'modalOpen' });
  // RSVP 제출 결과/복사 안내 — flow와 무관한 표시 전용 토스트라 useState 유지(XS-D0 예외).
  const [rsvpResult, setRsvpResult] = useState<string | null>(null);
  const { trigger: triggerHeart, syncedCount: heartSyncedCount } = useHeartInvitationOnce(slug ?? '');
  const { copy } = useCopyToClipboard();

  // UI/데이터 분리 라운드 3 A1: invitation-ui 컴포넌트의 외부 API 호출을 page가 흡수.
  // 미리보기·카탈로그 호출자는 콜백 미제공으로 무동작 처리.
  const handleCopyAccount = useCallback(async (text: string) => {
    const ok = await copy(text);
    if (ok) setRsvpResult(t('invitationPage.toast.accountCopied'));
  }, [copy, t]);
  const handleCopyAddress = useCallback(async (address: string) => {
    const ok = await copy(address);
    if (ok) setRsvpResult(t('invitationPage.toast.addressCopied'));
  }, [copy, t]);
  const handleCopyCurrentUrl = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const ok = await copy(window.location.href);
    if (ok) setRsvpResult(t('invitationPage.toast.linkCopied'));
  }, [copy, t]);
  const handleShareKakao = useCallback(() => {
    // TODO: Kakao SDK 도입 시 share 호출. 현재는 placeholder 정책 유지.
    setRsvpResult(t('invitationPage.toast.kakaoShareComingSoon'));
  }, [t]);
  // 마음 전하실 곳 송금 딥링크 — 금액 미지정(0, 송금 앱에서 직접 입력).
  const handlePayToss = useCallback((account: { bank: string; number: string }) => {
    if (typeof window === 'undefined') return;
    window.location.href = buildTossLink({ bankName: account.bank, accountNumber: account.number, amount: 0 });
  }, []);
  const handlePayKakao = useCallback((account: { bank: string; number: string }) => {
    if (typeof window === 'undefined') return;
    const url = buildKakaoLink({ bankName: account.bank, accountNumber: account.number, amount: 0 });
    if (url) window.location.href = url;
    else setRsvpResult(t('invitationPage.toast.kakaoPayBankUnsupported'));
  }, [t]);
  const handleOpenMap = useCallback((provider: MapProvider, address: string) => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    const link = buildMapLink(provider, address, detectMobile(navigator.userAgent));
    if (link.appScheme) {
      window.location.href = link.appScheme;
      setTimeout(() => window.open(link.webUrl, '_blank'), 500);
    } else {
      window.open(link.webUrl, '_blank');
    }
  }, []);
  const handleEnterLounge = useCallback((loungeId: string) => {
    if (typeof window === 'undefined') return;
    window.location.href = `${getDibangUrl()}/lounge/${loungeId}/enter`;
  }, []);

  const hasData = !!data;
  // 데이터 로딩/에러 → 머신 data축 동기. dataProp(미리보기)면 즉시 ready.
  useEffect(() => {
    if (dataProp) { send({ type: 'FETCH_SUCCESS' }); return; }
    if (isLoading) return;
    if (isError) send({ type: 'FETCH_ERROR', kind: 'not_found' });
    else if (invitation) send({ type: 'FETCH_SUCCESS' });
  }, [dataProp, isLoading, isError, invitation, send]);

  // 진입 3.2초 후 RSVP 모달 1회 자동 오픈(머신 rsvp idle→modalOpen). 닫은 뒤엔 idle이라도 재오픈 안 함(타이머 1회).
  useEffect(() => {
    if (!hasData) return;
    const timer = setTimeout(() => send({ type: 'RSVP_TIMER_DONE' }), 3200);
    return () => clearTimeout(timer);
  }, [hasData, send]);

  const handleRsvpSubmit = async (formData: RsvpFormData) => {
    send({ type: 'RSVP_SUBMIT' });
    // 중복 제출(이미 submitted)이면 머신이 duplicate로 가 submitting 미진입 → 호출 중단.
    if (!rsvpActor.getSnapshot().matches({ rsvp: 'submitting' })) return;
    // 백엔드 RSVP 저장(QA 2026-05-29 G1). weddingId는 InvitationPublic.wedding_id.
    const weddingId = invitation?.wedding_id;
    if (!weddingId) {
      setRsvpResult(t('invitationPage.rsvp.cannotSend'));
      send({ type: 'RSVP_ERROR', error: 'missing weddingId' });
      return;
    }
    // RsvpHostOption.key(camelCase) → recipient_slot enum(snake_case) 변환.
    // (V-C10: role은 '신랑' 한글 표시값이라 그대로 보내면 DB enum 위반 500.)
    const recipientSlot = ({
      groom: 'groom', bride: 'bride',
      groomFather: 'groom_father', groomMother: 'groom_mother',
      brideFather: 'bride_father', brideMother: 'bride_mother',
    } as const)[formData.host.key] as CreateRsvpRequest['recipient_slot'];
    try {
      await createRsvp({
        path: { weddingId },
        body: {
          recipient_slot: recipientSlot,
          guest_name: formData.name,
          attendance: formData.attendance === '참석' ? 'attending' : 'absent',
          companion_count: formData.companion,
          meal: formData.meal as CreateRsvpRequest['meal'],
          phone_last4: formData.phoneLast4,
        },
        throwOnError: true,
      });
    } catch {
      // 제출 실패 시 거짓 성공 대신 실패를 알린다 (#51).
      setRsvpResult(t('invitationPage.rsvp.submitFailed'));
      send({ type: 'RSVP_ERROR', error: 'submit failed' });
      return;
    }
    // C10-3 + #18(2026-06-21): Supabase 저장 후 온체인 submitRsvp를 게스트 *본인 zkLogin* 서명으로 제출(헤드리스는 dev keypair).
    // sui_lounge_id 있고 인증됐을 때만(미인증이면 위 로그인 배너로 유도) — 익명/대리서명 폐기. 실패해도 Supabase는 유지.
    const suiLoungeId = invitation?.lounge_preview?.sui_lounge_id;
    if (isAuthenticated && suiLoungeId) {
      try {
        // u8 코드 매핑(§1-6): slot 0~5 · attendance attending=0/absent=1 · meal yes=0/no=1/undecided=2.
        const slotCode = { groom: 0, bride: 1, groom_father: 2, groom_mother: 3, bride_father: 4, bride_mother: 5 }[recipientSlot] ?? 0;
        const mealCode = { yes: 0, no: 1, undecided: 2 }[formData.meal] ?? 2;
        await submitRsvp({
          loungeId: suiLoungeId,
          recipientSlot: slotCode,
          attendance: formData.attendance === '참석' ? 0 : 1,
          companionCount: formData.companion,
          meal: mealCode,
        });
      } catch (e) {
        console.error('[온체인] submitRsvp 실패:', e);
      }
    }
    // meal 코드(yes/no/undecided)는 API enum이라 그대로 두고, 표시 라벨만 번역.
    const mealLabel = t(`invitationPage.rsvp.meal.${formData.meal}`);
    setRsvpResult(
      [
        t('invitationPage.rsvp.resultTitle'),
        t('invitationPage.rsvp.resultAttendance', { value: formData.attendance }),
        t('invitationPage.rsvp.resultHost', { role: formData.host.role, name: formData.host.name }),
        t('invitationPage.rsvp.resultName', { value: formData.name }),
        t('invitationPage.rsvp.resultCompanion', { count: formData.companion }),
        t('invitationPage.rsvp.resultMeal', { value: mealLabel }),
        t('invitationPage.rsvp.resultPhone', { value: formData.phoneLast4 ?? '-' }),
      ].join('\n'),
    );
    send({ type: 'RSVP_SUCCESS' });
  };

  const handleTabChange = (tab: 'invitation' | 'lounge') => {
    send({ type: 'TAB_CHANGE', tab });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (state.matches({ data: 'loading' }) && !data) {
    return (
      <div className="w-full max-w-[420px] bg-ivory rounded-[32px] overflow-hidden shadow-frame relative px-7 py-20 text-center">
        <div className="font-serif text-xl text-navy mb-4">{t('invitationPage.loading')}</div>
      </div>
    );
  }

  if (state.matches({ data: 'error' }) || !data) {
    return (
      <div className="w-full max-w-[420px] bg-ivory rounded-[32px] overflow-hidden shadow-frame relative px-7 py-20 text-center">
        <div className="font-serif text-xl text-navy mb-4">{t('invitationPage.notFound.title')}</div>
        <p className="text-sm text-muted">
          {t('invitationPage.notFound.body')}
        </p>
      </div>
    );
  }

  const rsvpHostOptions = getRsvpHostOptions({
    groomName: data.groomName,
    brideName: data.brideName,
    hosts: data.hosts,
  });

  return (
    <>
      <div className="w-full max-w-[420px] md:w-[420px] bg-ivory rounded-[32px] overflow-hidden shadow-frame relative">
        <div className={activeTab === 'invitation' ? 'relative block animate-fade-in' : 'hidden'}>
          <InvitationRenderer
            data={data}
            heartSyncedCount={heartSyncedCount}
            onHeartTrigger={triggerHeart}
            onCopyAccount={handleCopyAccount}
            onCopyAddress={handleCopyAddress}
            onOpenMap={handleOpenMap}
            onShareKakao={handleShareKakao}
            onCopyCurrentUrl={handleCopyCurrentUrl}
            onPayKakao={handlePayKakao}
            onPayToss={handlePayToss}
          />
        </div>

        {activeTab === 'lounge' && (
          <LoungePreview
            loungeId={invitation?.lounge_preview?.lounge_id ?? ''}
            dibangOrigin={getDibangUrl()}
            onEnter={handleEnterLounge}
          />
        )}
      </div>

      <BottomToggle activeTab={activeTab} onTabChange={handleTabChange} />
      <RsvpModal
        isOpen={rsvpOpen}
        onClose={() => send({ type: 'RSVP_CLOSE' })}
        onSubmit={handleRsvpSubmit}
        hostOptions={rsvpHostOptions}
      />
      {/* #18(결정 2026-06-21): 익명/대리서명 폐기 — 게스트도 본인 zkLogin으로 서명한다.
          온체인 라운지가 있고 아직 미인증이면 로그인 진입점을 띄운다. 건너뛰면 Supabase 저장만(온체인 skip). */}
      {rsvpOpen && !isAuthenticated && invitation?.lounge_preview?.sui_lounge_id && (
        <div className="fixed top-4 left-4 right-4 z-[60] flex justify-center">
          <div className="rounded-xl bg-navy/95 px-4 py-3 text-white shadow-lg max-w-sm w-full">
            <p className="text-xs leading-relaxed">
              {t('invitationPage.loginBanner.before')}
              <b>{t('invitationPage.loginBanner.ownWallet')}</b>
              {t('invitationPage.loginBanner.after')}
            </p>
            <button
              type="button"
              onClick={() => login(window.location.href)}
              className="mt-2 w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-navy hover:bg-white/90 transition-colors"
            >
              {t('invitationPage.loginBanner.button')}
            </button>
          </div>
        </div>
      )}
      {rsvpResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setRsvpResult(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-navy">{t('invitationPage.rsvp.modalTitle')}</h3>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{rsvpResult}</pre>
            <button
              type="button"
              onClick={() => setRsvpResult(null)}
              className="w-full rounded-lg bg-navy px-4 py-2.5 text-base font-semibold text-white hover:bg-navy/90 transition-colors"
            >
              {t('invitationPage.confirm')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
