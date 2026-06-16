export interface ImagePosition {
  cropArea: { x: number; y: number; width: number; height: number };
  zoom: number;
  editorCrop: { x: number; y: number };
}

export interface Venue {
  name: string;
  address: string;
  hall?: string;
}

export interface Account {
  role: string;
  name: string;
  bank: string;
  number: string;
}

export interface HostInfo {
  groomFatherName: string;
  groomMotherName: string;
  brideFatherName: string;
  brideMotherName: string;
  groomFatherDeceased?: boolean;
  groomMotherDeceased?: boolean;
  brideFatherDeceased?: boolean;
  brideMotherDeceased?: boolean;
}

export interface CoverTextConfig {
  text?: string;
  fontSize?: number;
  x?: number;
  y?: number;
  rotation?: number;
  animation?: 'none' | 'fade-in' | 'typing';
  /** 색상 방식 (미설정 시 테마 기본 그라데이션) */
  colorType?: 'solid' | 'gradient';
  /** 단색 hex (colorType=solid) */
  solidColor?: string;
  /** 그라데이션 시작·끝 색 hex 2개 (colorType=gradient) */
  gradientColors?: [string, string];
}

export type InvitationTheme = 'moi-blue' | 'moi-pink';

/** 그림판(canvas) 섹션 — 사용자가 자유롭게 그리기·텍스트·이미지를 배치하는 커스텀 섹션. */
export interface CanvasElementBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface CanvasDrawingItem extends CanvasElementBase {
  type: 'drawing';
  strokes: { d: string; color: string; width: number; tool?: 'pen' | 'brush' }[];
  viewBox: { width: number; height: number };
}

export interface CanvasTextItem extends CanvasElementBase {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
}

export interface CanvasImageItem extends CanvasElementBase {
  type: 'image';
  imageUrl: string;
  isSticker: boolean;
}

export type CanvasItem = CanvasDrawingItem | CanvasTextItem | CanvasImageItem;

export interface CanvasConfig {
  title?: string;
  subtitle?: string;
  items: CanvasItem[];
  backgroundColor: string;
  viewBox: { width: number; height: number };
}

export interface WeddingData {
  groomName: string;
  brideName: string;
  date: string;
  venue: Venue;
  hosts: HostInfo;
  greetingMessage: string;
  groomAccounts: Account[];
  brideAccounts: Account[];
  galleryPhotos: string[];
  coverImageUrl: string;
  heartCount: number;
  hostNotice: string;
  slug: string;
  theme?: InvitationTheme;
  coverTextConfig?: CoverTextConfig;
  photoPositions?: Record<string, ImagePosition>;
  coverImagePosition?: ImagePosition;
  lettering?: {
    source: 'text' | 'upload' | 'draw';
    imageUrl: string | null;
    strokes: { d: string; color: string; width: number; tool?: 'pen' | 'brush'; points?: { x: number; y: number; t: number }[] }[];
    drawViewBox: { width: number; height: number };
    animation: 'none' | 'fade-in' | 'draw' | 'typing' | 'stroke-order';
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  };
  themeFonts?: { title: string; subtitle: string; body: string };
  themeColors?: { background: string; text: string; button: string; accent: string };
  sectionConfig?: { key: string; enabled: boolean; order: number }[];
  canvasConfig?: CanvasConfig;
}

export type HostKey =
  | 'groom'
  | 'bride'
  | 'groomFather'
  | 'groomMother'
  | 'brideFather'
  | 'brideMother';

/** RSVP 모달에서 "누구 측 하객인지" 선택지로 노출되는 호스트 1명 */
export interface RsvpHostOption {
  key: HostKey;
  /** 버튼에 표기되는 역할명 (예: '신랑', '신부 아버지') */
  role: string;
  /** 해당 호스트의 실제 성함 (호스트 보고 시 보존) */
  name: string;
}

export type RsvpMeal = 'yes' | 'no' | 'undecided';

export interface RsvpFormData {
  attendance: '참석' | '불참';
  /** 어느 분의 하객인지 — 최대 6명 호스트 중 1명 */
  host: RsvpHostOption;
  name: string;
  companion: number;
  meal: RsvpMeal;
  /** 동명이인 체크용 휴대폰 뒤 4자리 (선택) */
  phoneLast4?: string;
}
