export type LetteringAnimation = 'none' | 'fade-in' | 'draw' | 'typing' | 'stroke-order';

export type LetteringTool = 'pen' | 'brush';

export interface TimedPoint {
  x: number;
  y: number;
  t: number; // 획 시작 기준 ms (첫 점 0) — '그린 속도' 재생용
}

export interface LetteringStroke {
  d: string;
  color: string;
  width: number;
  tool?: LetteringTool;
  points?: TimedPoint[]; // 그린 속도·순서 재생용 타임드 좌표. 없으면 렌더러가 기존 fade로 폴백
}

export type LetteringSource = 'text' | 'draw' | 'upload';

export interface LetteringConfig {
  source: LetteringSource;
  imageUrl: string | null;
  strokes: LetteringStroke[];
  drawViewBox: { width: number; height: number };
  animation: LetteringAnimation;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface ThemeFonts {
  title: string;
  subtitle: string;
  body: string;
}

export interface ThemeColors {
  background: string;
  text: string;
  button: string;
  accent: string;
}

export type SectionKey = 'greeting' | 'weddingDate' | 'location' | 'notice' | 'gallery' | 'account' | 'canvas';

export interface SectionEntry {
  key: SectionKey;
  enabled: boolean;
  order: number;
}

export interface InvitationDesignConfig {
  lettering: LetteringConfig;
  theme: {
    fonts: ThemeFonts;
    colors: ThemeColors;
  };
  sections: SectionEntry[];
}

export const SYSTEM_FONTS = [
  'Pretendard',
  'Noto Serif KR',
  'Nanum Myeongjo',
  'Gowun Batang',
  'Gaegu',
  'Nanum Gothic',
  'Gothic A1',
  'Song Myung',
  'Nanum Pen Script',
  'Do Hyeon',
] as const;

export const ANIMATION_PRESETS: { value: LetteringAnimation; label: string }[] = [
  { value: 'none', label: '없음' },
  { value: 'fade-in', label: '페이드인' },
  { value: 'draw', label: '드로잉' },
  { value: 'typing', label: '타이핑' },
];

export interface PalettePreset {
  label: string;
  colors: ThemeColors;
}

export const RECOMMENDED_PALETTES: PalettePreset[] = [
  {
    label: '클래식 화이트',
    colors: { background: '#ffffff', text: '#222222', button: '#222222', accent: '#b08968' },
  },
  {
    label: '세이지 그린',
    colors: { background: '#eef0e5', text: '#3a4a3a', button: '#5a7a5a', accent: '#7a9a7a' },
  },
  {
    label: '더스티 핑크',
    colors: { background: '#f6e7e7', text: '#5a3a3a', button: '#c08a8a', accent: '#d4a5a5' },
  },
  {
    label: '네이비 골드',
    colors: { background: '#1e2a3a', text: '#f0e6d2', button: '#c9a76b', accent: '#e0c98a' },
  },
];

export const SECTION_LABELS: Record<SectionKey, { name: string; sub: string }> = {
  greeting: { name: '인사말', sub: 'Invitation' },
  weddingDate: { name: '예식 일시', sub: 'Wedding Date' },
  location: { name: '예식장', sub: 'Location' },
  notice: { name: '안내사항', sub: 'Ceremony Info' },
  gallery: { name: '갤러리', sub: 'Gallery' },
  account: { name: '축의금 계좌 정보', sub: 'Gratitude' },
  canvas: { name: '그림판', sub: 'Canvas' },
};

export const REQUIRED_SECTIONS: SectionKey[] = ['greeting', 'weddingDate', 'location'];

export const ALL_SECTION_KEYS: SectionKey[] = [
  'greeting',
  'weddingDate',
  'location',
  'notice',
  'gallery',
  'account',
  'canvas',
];

export function makeDefaultDesignConfig(): InvitationDesignConfig {
  return {
    lettering: {
      source: 'text',
      imageUrl: null,
      strokes: [],
      drawViewBox: { width: 360, height: 250 },
      animation: 'none',
      // 커버 텍스트 자리에 중앙 오버레이 — width는 커버 폭 대비 %, x·y는 레터링 박스 자기 크기 대비 translate %(0=정중앙), height는 미사용(박스 aspectRatio는 drawViewBox 비율로 유도)
      x: 0,
      y: 0,
      width: 95,
      height: 60,
      rotation: 0,
    },
    theme: {
      fonts: { title: 'Pretendard', subtitle: 'Pretendard', body: 'Pretendard' },
      colors: { ...RECOMMENDED_PALETTES[0].colors },
    },
    sections: ALL_SECTION_KEYS.map((key, i) => ({
      key,
      enabled: true,
      order: i,
    })),
  };
}
