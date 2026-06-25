import { create } from 'zustand';
import type { WeddingInfo, HostSlots, CreateWeddingRequest, UpdateInvitationRequest } from '../../types/db-compat';
import type { WeddingData, InvitationTheme, ImagePosition } from '@gorae/invitation-ui';
import type { InvitationDesignConfig, LetteringConfig, LetteringSource, ThemeFonts, ThemeColors, SectionEntry } from '../../types/invitationDesignConfig';
import { makeDefaultDesignConfig } from '../../types/invitationDesignConfig';
import { makeDefaultCanvasConfig, type CanvasConfig, type CanvasItem } from '../../types/canvasConfig';
import { translate, useLangStore } from '../../lib/i18n';

const lang = () => useLangStore.getState().lang;

export interface AccountSlot {
  role: string;
  name: string;
  bank: string;
  number: string;
  enabled: boolean;
}

const INITIAL_GROOM_ACCOUNTS: AccountSlot[] = [
  { role: '신랑', name: '', bank: '', number: '', enabled: false },
  { role: '아버지', name: '', bank: '', number: '', enabled: false },
  { role: '어머니', name: '', bank: '', number: '', enabled: false },
];

const INITIAL_BRIDE_ACCOUNTS: AccountSlot[] = [
  { role: '신부', name: '', bank: '', number: '', enabled: false },
  { role: '아버지', name: '', bank: '', number: '', enabled: false },
  { role: '어머니', name: '', bank: '', number: '', enabled: false },
];

export type HostRole = 'groom' | 'bride';

export interface InvitationFormState {
  // Host role (내가 어떤 역할인지)
  myRole: HostRole;

  // Wedding Info
  groomName: string;
  brideName: string;
  groomFatherName: string;
  groomMotherName: string;
  brideFatherName: string;
  brideMotherName: string;
  groomFatherDeceased: boolean;
  groomMotherDeceased: boolean;
  brideFatherDeceased: boolean;
  brideMotherDeceased: boolean;
  date: string;
  time: string;
  venueName: string;
  venueAddress: string;
  venueHall: string;

  // Accounts (고정 6슬롯: 신랑/신부 + 부모님)
  groomAccounts: AccountSlot[];
  brideAccounts: AccountSlot[];

  // Slug
  slug: string;
  originalSlug: string;
  /** 서버값 hydrate가 완료된 invitation slug — refetch 재hydrate 방지 가드.
   *  reset()에 함께 초기화돼 StrictMode 이중 마운트(hydrate→reset→재마운트)에서도
   *  재hydrate가 막히지 않는다 (ref 가드의 회귀 수정, 2026-06-10). */
  hydratedSlug: string;

  // Invitation customization
  theme: InvitationTheme;
  designTemplateId: string;
  customMessage: string;
  galleryPhotos: string[];
  coverImage: string;
  hostNotice: string;
  accountMessage: string;
  coverTextConfig: {
    text: string;
    fontSize: number;
    x: number;
    y: number;
    rotation: number;
    animation: 'none' | 'fade-in' | 'typing';
    colorType: 'solid' | 'gradient';
    solidColor: string;
    gradientColors: [string, string];
  };

  // Design Config
  designConfig: InvitationDesignConfig;

  // Canvas (그림판) Config — 자유 배치 요소
  canvasConfig: CanvasConfig;

  // Validation
  errors: Set<string>;

  // Actions
  setField: <K extends keyof InvitationFormState>(key: K, value: InvitationFormState[K]) => void;
  setGroomAccounts: (accounts: AccountSlot[]) => void;
  setBrideAccounts: (accounts: AccountSlot[]) => void;
  updateAccountSlot: (side: 'groom' | 'bride', index: number, field: keyof AccountSlot, value: string | boolean) => void;
  addGalleryPhoto: (url: string) => void;
  removeGalleryPhoto: (index: number) => void;
  reorderGalleryPhoto: (from: number, to: number) => void;
  setGalleryPhotoPosition: (url: string, position: ImagePosition) => void;
  galleryPhotoPositions: Record<string, ImagePosition>;
  coverImagePosition: ImagePosition | null;
  setCoverImagePosition: (pos: ImagePosition) => void;
  setDesignConfig: (config: InvitationDesignConfig) => void;
  setLettering: (lettering: LetteringConfig) => void;
  setLetteringSource: (source: LetteringSource) => void;
  setThemeFonts: (fonts: ThemeFonts) => void;
  setThemeFontSlot: (slot: keyof ThemeFonts, font: string) => void;
  setThemeColors: (colors: ThemeColors) => void;
  setSections: (sections: SectionEntry[]) => void;
  setCanvasConfig: (config: CanvasConfig) => void;
  addCanvasItem: (item: CanvasItem) => void;
  updateCanvasItem: (id: string, partial: Partial<CanvasItem>) => void;
  removeCanvasItem: (id: string) => void;
  reorderCanvasItems: (ids: string[]) => void;
  validate: () => string | null;
  clearErrors: () => void;
  reset: () => void;
}

const initialState = {
  myRole: 'groom' as HostRole,
  groomName: '',
  brideName: '',
  groomFatherName: '',
  groomMotherName: '',
  brideFatherName: '',
  brideMotherName: '',
  groomFatherDeceased: false,
  groomMotherDeceased: false,
  brideFatherDeceased: false,
  brideMotherDeceased: false,
  date: '',
  time: '',
  venueName: '',
  venueAddress: '',
  venueHall: '',
  groomAccounts: INITIAL_GROOM_ACCOUNTS.map(a => ({ ...a })),
  brideAccounts: INITIAL_BRIDE_ACCOUNTS.map(a => ({ ...a })),
  slug: '',
  originalSlug: '',
  hydratedSlug: '',
  theme: 'moi-pink' as InvitationTheme,
  designTemplateId: '',
  customMessage: '',
  galleryPhotos: [] as string[],
  coverImage: '',
  hostNotice: '',
  accountMessage: '참석이 어려우신 분들을 위해\n계좌번호를 안내해 드립니다.\n너그러운 마음으로 양해 부탁드립니다.',
  coverTextConfig: {
    text: '',
    fontSize: 78,
    x: 0,
    y: 0,
    rotation: -3,
    animation: 'typing' as const,
    colorType: 'gradient' as const,
    solidColor: '#FF8FA3',
    gradientColors: ['#FFB8C5', '#FFE0A8'] as [string, string],
  },
  galleryPhotoPositions: {} as Record<string, ImagePosition>,
  coverImagePosition: null as ImagePosition | null,
  designConfig: makeDefaultDesignConfig(),
  canvasConfig: makeDefaultCanvasConfig(),
};

const REQUIRED_FIELDS = ['groomName', 'brideName', 'date', 'time', 'venueName', 'venueAddress'] as const;

const FIELD_LABEL_KEYS: Record<string, string> = {
  groomName: 'invite.field.groomName',
  brideName: 'invite.field.brideName',
  date: 'invite.field.date',
  time: 'invite.field.time',
  venueName: 'invite.field.venueName',
  venueAddress: 'invite.field.venueAddress',
};

export const DEFAULT_GREETING = 'The love we have nurtured facing each other,\nwe now wish to grow into a greater love\nas we walk forward, looking the same way.\nIf you bless the two of us\nto keep it in the name of love,\nwe will cherish it as boundless joy.';

export const useInvitationForm = create<InvitationFormState>((set, get) => ({
  ...initialState,
  errors: new Set<string>(),

  setField: (key, value) => set((s) => {
    const next: Partial<InvitationFormState> = { [key]: value };
    if (s.errors.has(key as string) && value) {
      const errors = new Set(s.errors);
      errors.delete(key as string);
      next.errors = errors;
    }
    return next;
  }),
  setGroomAccounts: (accounts) => set({ groomAccounts: accounts }),
  setBrideAccounts: (accounts) => set({ brideAccounts: accounts }),
  updateAccountSlot: (side, index, field, value) => set((s) => {
    const key = side === 'groom' ? 'groomAccounts' : 'brideAccounts';
    const accounts = s[key].map((a, i) => i === index ? { ...a, [field]: value } : a);
    return { [key]: accounts };
  }),
  addGalleryPhoto: (url) => set((s) => ({ galleryPhotos: [...s.galleryPhotos, url] })),
  removeGalleryPhoto: (index) => set((s) => ({
    galleryPhotos: s.galleryPhotos.filter((_, i) => i !== index),
  })),
  reorderGalleryPhoto: (from, to) => set((s) => {
    const photos = [...s.galleryPhotos];
    const [moved] = photos.splice(from, 1);
    photos.splice(to, 0, moved);
    return { galleryPhotos: photos };
  }),
  setGalleryPhotoPosition: (url, position) => set((s) => ({
    galleryPhotoPositions: { ...s.galleryPhotoPositions, [url]: position },
  })),
  setCoverImagePosition: (pos) => set({ coverImagePosition: pos }),
  setDesignConfig: (config) => set({ designConfig: config }),
  setLettering: (lettering) => set((s) => ({
    designConfig: { ...s.designConfig, lettering },
  })),
  setLetteringSource: (source) => set((s) => {
    const cur = s.designConfig.lettering;
    let animation = cur.animation;
    if (source === 'draw' && animation !== 'stroke-order') animation = 'stroke-order';
    if (source === 'upload' && animation === 'stroke-order') animation = 'none';
    if (source === 'text') animation = 'none';
    return { designConfig: { ...s.designConfig, lettering: { ...cur, source, animation } } };
  }),
  setThemeFonts: (fonts) => set((s) => ({
    designConfig: { ...s.designConfig, theme: { ...s.designConfig.theme, fonts } },
  })),
  setThemeFontSlot: (slot, font) => set((s) => ({
    designConfig: {
      ...s.designConfig,
      theme: {
        ...s.designConfig.theme,
        fonts: { ...s.designConfig.theme.fonts, [slot]: font },
      },
    },
  })),
  setThemeColors: (colors) => set((s) => ({
    designConfig: { ...s.designConfig, theme: { ...s.designConfig.theme, colors } },
  })),
  setSections: (sections) => set((s) => ({
    designConfig: { ...s.designConfig, sections },
  })),
  setCanvasConfig: (config) => set({ canvasConfig: config }),
  addCanvasItem: (item) => set((s) => ({
    canvasConfig: { ...s.canvasConfig, items: [...s.canvasConfig.items, item] },
  })),
  updateCanvasItem: (id, partial) => set((s) => ({
    canvasConfig: {
      ...s.canvasConfig,
      items: s.canvasConfig.items.map((it) => (it.id === id ? ({ ...it, ...partial } as CanvasItem) : it)),
    },
  })),
  removeCanvasItem: (id) => set((s) => ({
    canvasConfig: { ...s.canvasConfig, items: s.canvasConfig.items.filter((it) => it.id !== id) },
  })),
  reorderCanvasItems: (ids) => set((s) => {
    const byId = new Map(s.canvasConfig.items.map((it) => [it.id, it]));
    const items = ids
      .map((id) => byId.get(id))
      .filter((it): it is CanvasItem => it !== undefined)
      .map((it, i) => ({ ...it, zIndex: i }));
    return { canvasConfig: { ...s.canvasConfig, items } };
  }),
  validate: () => {
    const state = get();
    const errors = new Set<string>();
    let firstMissing: string | null = null;
    for (const field of REQUIRED_FIELDS) {
      if (!state[field]?.trim()) {
        errors.add(field);
        if (!firstMissing) firstMissing = FIELD_LABEL_KEYS[field] ? translate(lang(), FIELD_LABEL_KEYS[field]) : field;
      }
    }
    set({ errors });
    return firstMissing;
  },
  clearErrors: () => set({ errors: new Set<string>() }),
  reset: () => set({ ...initialState, errors: new Set<string>() }),
}));

/** 폼 데이터 → createWedding API 요청 형태로 변환 */
export function toCreateWeddingRequest(state: InvitationFormState, userId?: string): CreateWeddingRequest {
  const info: WeddingInfo = {
    groom_name: state.groomName,
    bride_name: state.brideName,
    groom_father_name: state.groomFatherName || undefined,
    groom_mother_name: state.groomMotherName || undefined,
    bride_father_name: state.brideFatherName || undefined,
    bride_mother_name: state.brideMotherName || undefined,
    groom_father_deceased: state.groomFatherDeceased || undefined,
    groom_mother_deceased: state.groomMotherDeceased || undefined,
    bride_father_deceased: state.brideFatherDeceased || undefined,
    bride_mother_deceased: state.brideMotherDeceased || undefined,
    date: state.date,
    time: state.time,
    venue: {
      venue_name: state.venueName,
      venue_address: state.venueAddress,
      venue_hall: state.venueHall || undefined,
    },
    groom_account: state.groomAccounts[0]?.enabled
      ? { bank: state.groomAccounts[0].bank, address: state.groomAccounts[0].number }
      : undefined,
    bride_account: state.brideAccounts[0]?.enabled
      ? { bank: state.brideAccounts[0].bank, address: state.brideAccounts[0].number }
      : undefined,
    groom_father_account: state.groomAccounts[1]?.enabled
      ? { bank: state.groomAccounts[1].bank, address: state.groomAccounts[1].number }
      : undefined,
    groom_mother_account: state.groomAccounts[2]?.enabled
      ? { bank: state.groomAccounts[2].bank, address: state.groomAccounts[2].number }
      : undefined,
    bride_father_account: state.brideAccounts[1]?.enabled
      ? { bank: state.brideAccounts[1].bank, address: state.brideAccounts[1].number }
      : undefined,
    bride_mother_account: state.brideAccounts[2]?.enabled
      ? { bank: state.brideAccounts[2].bank, address: state.brideAccounts[2].number }
      : undefined,
  };

  const hosts: HostSlots = {};
  if (userId) {
    const roleToSlot: Record<HostRole, keyof HostSlots> = {
      groom: 'host_groom_id',
      bride: 'host_bride_id',
    };
    hosts[roleToSlot[state.myRole]] = userId;
  }

  return { info, hosts, slug: state.slug };
}

/** 그림판 요소(camelCase) → contract canvas item(snake_case). type별 추가 필드만 매핑. */
function canvasItemToRequest(item: CanvasItem) {
  const base = {
    id: item.id,
    type: item.type,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    rotation: item.rotation,
    z_index: item.zIndex,
  };
  if (item.type === 'drawing') {
    return { ...base, strokes: item.strokes, view_box: item.viewBox };
  }
  if (item.type === 'text') {
    return { ...base, text: item.text, font_size: item.fontSize, font_family: item.fontFamily, color: item.color };
  }
  return { ...base, image_url: item.imageUrl, is_sticker: item.isSticker };
}

/** 폼 데이터 → updateInvitation API 요청 형태로 변환 */
export function toUpdateInvitationRequest(state: InvitationFormState): UpdateInvitationRequest {
  return {
    design_template_id: state.designTemplateId || undefined,
    custom_message: state.customMessage || undefined,
    gallery_photos: state.galleryPhotos.length > 0 ? state.galleryPhotos : undefined,
    cover_image: state.coverImage || undefined,
    // 스토어는 camelCase, contract는 snake_case — 명시 매핑해야 저장·복원 왕복 일관
    cover_text_config: {
      text: state.coverTextConfig.text,
      font_size: state.coverTextConfig.fontSize,
      x: state.coverTextConfig.x,
      y: state.coverTextConfig.y,
      rotation: state.coverTextConfig.rotation,
      animation: state.coverTextConfig.animation,
      color_type: state.coverTextConfig.colorType,
      solid_color: state.coverTextConfig.solidColor,
      gradient_colors: state.coverTextConfig.gradientColors,
    },
    design_config: {
      lettering: {
        source: state.designConfig.lettering.source,
        image_url: state.designConfig.lettering.imageUrl ?? undefined,
        strokes: state.designConfig.lettering.strokes,
        draw_view_box: state.designConfig.lettering.drawViewBox,
        animation: state.designConfig.lettering.animation,
        x: state.designConfig.lettering.x,
        y: state.designConfig.lettering.y,
        width: state.designConfig.lettering.width,
        height: state.designConfig.lettering.height,
        rotation: state.designConfig.lettering.rotation,
      },
      theme: {
        fonts: state.designConfig.theme.fonts,
        colors: state.designConfig.theme.colors,
      },
      sections: state.designConfig.sections,
      canvas: {
        title: state.canvasConfig.title,
        subtitle: state.canvasConfig.subtitle,
        items: state.canvasConfig.items.map(canvasItemToRequest),
        background_color: state.canvasConfig.backgroundColor,
        view_box: state.canvasConfig.viewBox,
      },
      cover_image_position: state.coverImagePosition ?? undefined,
    },
  };
}

/** 폼 데이터 → 미리보기용 WeddingData로 변환 */
export function toPreviewData(state: InvitationFormState): WeddingData {
  const l = lang();
  return {
    groomName: state.groomName || translate(l, 'invitePreview.groom'),
    brideName: state.brideName || translate(l, 'invitePreview.bride'),
    date: state.date
      ? `${state.date}T${state.time || '00:00'}:00`
      : new Date().toISOString(),
    venue: {
      name: state.venueName || translate(l, 'invitePreview.venue'),
      address: state.venueAddress || translate(l, 'invitePreview.address'),
      hall: state.venueHall || undefined,
    },
    hosts: {
      groomFatherName: state.groomFatherName || translate(l, 'invitePreview.father'),
      groomMotherName: state.groomMotherName || translate(l, 'invitePreview.mother'),
      brideFatherName: state.brideFatherName || translate(l, 'invitePreview.father'),
      brideMotherName: state.brideMotherName || translate(l, 'invitePreview.mother'),
      groomFatherDeceased: state.groomFatherDeceased,
      groomMotherDeceased: state.groomMotherDeceased,
      brideFatherDeceased: state.brideFatherDeceased,
      brideMotherDeceased: state.brideMotherDeceased,
    },
    greetingMessage: state.customMessage || DEFAULT_GREETING,
    groomAccounts: state.groomAccounts
      .filter(a => a.enabled)
      .map(({ enabled: _, ...rest }) => rest),
    brideAccounts: state.brideAccounts
      .filter(a => a.enabled)
      .map(({ enabled: _, ...rest }) => rest),
    galleryPhotos: state.galleryPhotos,
    coverImageUrl: state.coverImage || '',
    heartCount: 0,
    hostNotice: state.hostNotice,
    slug: state.slug,
    theme: state.theme,
    coverTextConfig: state.coverTextConfig,
    photoPositions: Object.keys(state.galleryPhotoPositions).length > 0 ? state.galleryPhotoPositions : undefined,
    coverImagePosition: state.coverImagePosition ?? undefined,
    lettering: state.designConfig.lettering.imageUrl || state.designConfig.lettering.strokes.length > 0
      ? {
          source: state.designConfig.lettering.source,
          imageUrl: state.designConfig.lettering.imageUrl,
          strokes: state.designConfig.lettering.strokes,
          drawViewBox: state.designConfig.lettering.drawViewBox,
          animation: state.designConfig.lettering.animation,
          x: state.designConfig.lettering.x,
          y: state.designConfig.lettering.y,
          width: state.designConfig.lettering.width,
          height: state.designConfig.lettering.height,
          rotation: state.designConfig.lettering.rotation,
        }
      : undefined,
    themeFonts: state.designConfig.theme.fonts,
    themeColors: state.designConfig.theme.colors,
    sectionConfig: state.designConfig.sections,
    canvasConfig: state.canvasConfig,
  };
}
