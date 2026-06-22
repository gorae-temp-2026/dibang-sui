import { useEffect } from 'react';
import type { DesignConfig } from '../../types/db-compat';
import { useInvitationForm } from '../invitation-create/useInvitationForm';
import { makeDefaultDesignConfig, REQUIRED_SECTIONS } from '../../types/invitationDesignConfig';
import type { InvitationDesignConfig, LetteringSource } from '../../types/invitationDesignConfig';
import { makeDefaultCanvasConfig, type CanvasItem } from '../../types/canvasConfig';

type WeddingLike = {
  info: {
    groom_name: string;
    bride_name: string;
    groom_father_name?: string | null;
    groom_mother_name?: string | null;
    bride_father_name?: string | null;
    bride_mother_name?: string | null;
    groom_father_deceased?: boolean | null;
    groom_mother_deceased?: boolean | null;
    bride_father_deceased?: boolean | null;
    bride_mother_deceased?: boolean | null;
    date: string;
    time: string;
    venue: {
      venue_name: string;
      venue_address: string;
      venue_hall?: string | null;
    };
    groom_account?: { bank?: string; address?: string };
    groom_father_account?: { bank?: string; address?: string };
    groom_mother_account?: { bank?: string; address?: string };
    bride_account?: { bank?: string; address?: string };
    bride_father_account?: { bank?: string; address?: string };
    bride_mother_account?: { bank?: string; address?: string };
  };
};

type InvitationLike = {
  slug?: string;
  custom_message?: string | null;
  design_template_id?: string | null;
  cover_image?: string | null;
  gallery_photos?: string[] | null;
  cover_text_config?: {
    text?: string | null;
    font_size?: number | null;
    x?: number | null;
    y?: number | null;
    rotation?: number | null;
    animation?: string | null;
    color_type?: string | null;
    solid_color?: string | null;
    gradient_colors?: string[] | null;
  } | null;
  design_config?: DesignConfig | null;
};

type RawCanvasItem = NonNullable<NonNullable<DesignConfig['canvas']>['items']>[number];

/** contract canvas item(snake_case, type=string) → 폼 CanvasItem(camelCase, 판별 유니온). 미지의 type은 null로 드롭. */
function restoreCanvasItem(raw: RawCanvasItem): CanvasItem | null {
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

export function useHydrateInvitationForm(
  wedding: WeddingLike | undefined,
  invitation: InvitationLike | undefined,
  slug: string,
) {
  // 같은 invitation(slug)은 최초 1회만 hydrate. refetch(창 포커스 등)로 객체
  // 참조가 바뀌어 effect가 재실행돼도 미저장 편집(낙관적 업로드 완료분 포함)을
  // 서버값으로 덮어쓰지 않는다. slug가 바뀌면(다른 청첩장 편집) 다시 hydrate.
  //
  // 가드 설계 주의 (2026-06-10 회귀 2건의 교훈):
  //  - 키는 invitation 응답이 아니라 **호출자(useLoadWedding)가 가진 slug**를 받는다 —
  //    GET /invitations/{slug} 응답에는 slug 필드가 없어 응답 기반 키는 항상 ''가 됐다.
  //  - 가드는 ref가 아니라 store(hydratedSlug)에 둔다 — StrictMode 이중 마운트에서
  //    [hydrate → 페이지 cleanup reset() → 재마운트] 순서가 되면 ref는 살아남아
  //    빈 store를 방치한다. store 가드는 reset()과 함께 풀린다.
  useEffect(() => {
    if (!wedding || !invitation || !slug) return;

    const { info } = wedding;
    if (useInvitationForm.getState().hydratedSlug === slug) return;
    const store = useInvitationForm.getState();

    store.setField('groomName', info.groom_name);
    store.setField('brideName', info.bride_name);
    store.setField('groomFatherName', info.groom_father_name ?? '');
    store.setField('groomMotherName', info.groom_mother_name ?? '');
    store.setField('brideFatherName', info.bride_father_name ?? '');
    store.setField('brideMotherName', info.bride_mother_name ?? '');
    store.setField('groomFatherDeceased', info.groom_father_deceased ?? false);
    store.setField('groomMotherDeceased', info.groom_mother_deceased ?? false);
    store.setField('brideFatherDeceased', info.bride_father_deceased ?? false);
    store.setField('brideMotherDeceased', info.bride_mother_deceased ?? false);
    store.setField('date', info.date);
    store.setField('time', info.time);
    store.setField('venueName', info.venue.venue_name);
    store.setField('venueAddress', info.venue.venue_address);
    store.setField('venueHall', info.venue.venue_hall ?? '');
    store.setField('slug', slug);
    store.setField('originalSlug', slug);
    store.setField('hydratedSlug', slug);
    store.setField('customMessage', invitation.custom_message ?? '');
    store.setField('designTemplateId', invitation.design_template_id ?? '');
    store.setField('coverImage', invitation.cover_image ?? '');
    store.setField('galleryPhotos', invitation.gallery_photos ?? []);
    if (invitation.cover_text_config) {
      const ctc = invitation.cover_text_config;
      const gc = ctc.gradient_colors;
      store.setField('coverTextConfig', {
        text: ctc.text ?? 'Our\nwedding day',
        fontSize: ctc.font_size ?? 78,
        x: ctc.x ?? 0,
        y: ctc.y ?? 0,
        rotation: ctc.rotation ?? -3,
        animation: (ctc.animation as 'none' | 'fade-in' | 'typing') ?? 'typing',
        colorType: (ctc.color_type as 'solid' | 'gradient') ?? 'gradient',
        solidColor: ctc.solid_color ?? '#FF8FA3',
        gradientColors: gc && gc.length >= 2 ? [gc[0], gc[1]] : ['#FFB8C5', '#FFE0A8'],
      });
    }

    const toSlot = (
      account: { bank?: string; address?: string } | undefined,
      role: string,
      name: string,
    ) => {
      if (!account?.bank) return { role, name: '', bank: '', number: '', enabled: false };
      return { role, name, bank: account.bank ?? '', number: account.address ?? '', enabled: true };
    };

    store.setGroomAccounts([
      toSlot(info.groom_account, '신랑', info.groom_name),
      toSlot(info.groom_father_account, '아버지', info.groom_father_name ?? ''),
      toSlot(info.groom_mother_account, '어머니', info.groom_mother_name ?? ''),
    ]);
    store.setBrideAccounts([
      toSlot(info.bride_account, '신부', info.bride_name),
      toSlot(info.bride_father_account, '아버지', info.bride_father_name ?? ''),
      toSlot(info.bride_mother_account, '어머니', info.bride_mother_name ?? ''),
    ]);

    if (invitation.design_config) {
      const dc = invitation.design_config;
      const defaults = makeDefaultDesignConfig();
      const restored: InvitationDesignConfig = {
        lettering: dc.lettering
          ? {
              source: (dc.lettering.source as LetteringSource) ?? defaults.lettering.source,
              imageUrl: dc.lettering.image_url ?? null,
              strokes: (dc.lettering.strokes ?? []).map((s) => ({
                d: s.d ?? '',
                color: s.color ?? '#000000',
                width: s.width ?? 2,
                tool: s.tool,
                points: s.points?.map((p) => ({ x: p.x ?? 0, y: p.y ?? 0, t: p.t ?? 0 })),
              })),
              drawViewBox: {
                width: dc.lettering.draw_view_box?.width ?? defaults.lettering.drawViewBox.width,
                height: dc.lettering.draw_view_box?.height ?? defaults.lettering.drawViewBox.height,
              },
              animation: (dc.lettering.animation as InvitationDesignConfig['lettering']['animation']) ?? 'none',
              x: dc.lettering.x ?? defaults.lettering.x,
              y: dc.lettering.y ?? defaults.lettering.y,
              width: dc.lettering.width ?? defaults.lettering.width,
              height: dc.lettering.height ?? defaults.lettering.height,
              rotation: dc.lettering.rotation ?? defaults.lettering.rotation,
            }
          : defaults.lettering,
        theme: {
          fonts: {
            title: dc.theme?.fonts?.title ?? defaults.theme.fonts.title,
            subtitle: dc.theme?.fonts?.subtitle ?? defaults.theme.fonts.subtitle,
            body: dc.theme?.fonts?.body ?? defaults.theme.fonts.body,
          },
          colors: {
            background: dc.theme?.colors?.background ?? defaults.theme.colors.background,
            text: dc.theme?.colors?.text ?? defaults.theme.colors.text,
            button: dc.theme?.colors?.button ?? defaults.theme.colors.button,
            accent: dc.theme?.colors?.accent ?? defaults.theme.colors.accent,
          },
        },
        sections: (dc.sections
          ? dc.sections.map((s) => ({
              key: s.key as InvitationDesignConfig['sections'][number]['key'],
              enabled: s.enabled,
              order: s.order,
            }))
          : defaults.sections
        // 필수 섹션은 저장값과 무관하게 항상 활성 — 과거 false 저장 데이터의 모순(꺼진 '필수') 방지
        ).map((s) => (REQUIRED_SECTIONS.includes(s.key) ? { ...s, enabled: true } : s)),
      };
      store.setDesignConfig(restored);

      const cp = dc.cover_image_position;
      if (cp?.cropArea && cp.zoom != null && cp.editorCrop) {
        store.setCoverImagePosition({
          cropArea: {
            x: cp.cropArea.x ?? 0,
            y: cp.cropArea.y ?? 0,
            width: cp.cropArea.width ?? 100,
            height: cp.cropArea.height ?? 100,
          },
          zoom: cp.zoom,
          editorCrop: { x: cp.editorCrop.x ?? 0, y: cp.editorCrop.y ?? 0 },
        });
      }

      if (dc.canvas) {
        const canvasDefaults = makeDefaultCanvasConfig();
        store.setCanvasConfig({
          title: dc.canvas.title ?? '',
          subtitle: dc.canvas.subtitle ?? '',
          items: (dc.canvas.items ?? [])
            .map(restoreCanvasItem)
            .filter((it): it is CanvasItem => it !== null),
          backgroundColor: dc.canvas.background_color ?? canvasDefaults.backgroundColor,
          viewBox: {
            width: dc.canvas.view_box?.width ?? canvasDefaults.viewBox.width,
            height: dc.canvas.view_box?.height ?? canvasDefaults.viewBox.height,
          },
        });
      }
    }
  }, [wedding, invitation, slug]);
}
