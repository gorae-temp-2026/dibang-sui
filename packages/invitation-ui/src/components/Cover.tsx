import type { InvitationTheme, ImagePosition, CoverTextConfig } from '../types/invitation';
import { LetteringRenderer, type LetteringRenderConfig } from './LetteringRenderer';

const DEFAULT_TEXT = 'Our\nwedding day';
const DEFAULT_FONT_SIZE = 78;
const DEFAULT_ROTATION = -3;

/** 테마별 커버 텍스트 그라디언트 CSS */
const THEME_GRADIENTS: Record<InvitationTheme, string> = {
  'moi-pink': 'linear-gradient(to bottom right, #FFB8C5, #FFA29A 35%, #F8C57A 70%, #FFE0A8)',
  'moi-blue': 'linear-gradient(to bottom right, #A8C4D9, #8FB3CC 35%, #6B9FBF 70%, #A8C4D9)',
};

/** 테마별 커버 텍스트 drop-shadow */
const THEME_SHADOWS: Record<InvitationTheme, string> = {
  'moi-pink': 'drop-shadow(0 4px 14px rgba(255,140,140,.45))',
  'moi-blue': 'drop-shadow(0 4px 14px rgba(107,159,191,.45))',
};

/** hex 색 → 같은 색의 부드러운 drop-shadow (테마 글로우와 동일한 느낌). 사용자 지정 색상용. */
function hexToDropShadow(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return 'drop-shadow(0 4px 14px rgba(0,0,0,.3))';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return 'drop-shadow(0 4px 14px rgba(0,0,0,.3))';
  return `drop-shadow(0 4px 14px rgba(${r}, ${g}, ${b}, .45))`;
}

interface CoverProps {
  groomName: string;
  brideName: string;
  date: string;
  venueName: string;
  venueHall?: string;
  coverImageUrl: string;
  coverImagePosition?: ImagePosition;
  theme?: InvitationTheme;
  coverTextConfig?: CoverTextConfig;
  /** 레터링(직접 그리기·이미지 업로드)은 커버 텍스트와 같은 자리에 오버레이로 표시 */
  lettering?: LetteringRenderConfig;
  textRef?: (el: HTMLDivElement | null) => void;
  /** 레터링 오버레이 박스 ref — 미리보기에서 Moveable로 위치·크기·회전 조절용 */
  letteringRef?: (el: HTMLDivElement | null) => void;
  /** 애니메이션 재생 키 — 증가 시 텍스트/레터링 애니메이션 재마운트로 재생 (미리보기 '재생' 버튼용) */
  animPlayKey?: number;
}

export function Cover({ groomName, brideName, date, venueName, venueHall, coverImageUrl, coverImagePosition, theme = 'moi-pink', coverTextConfig, lettering, textRef, letteringRef, animPlayKey = 0 }: CoverProps) {
  const d = new Date(date);
  const formatted = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayName = dayNames[d.getDay()];
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const text = coverTextConfig?.text || DEFAULT_TEXT;
  const fontSize = coverTextConfig?.fontSize ?? DEFAULT_FONT_SIZE;
  const offsetX = coverTextConfig?.x ?? 0;
  const offsetY = coverTextConfig?.y ?? 0;
  const rotation = coverTextConfig?.rotation ?? DEFAULT_ROTATION;
  const animation = coverTextConfig?.animation ?? 'typing';

  const lines = text.split('\n');

  // 줄별 등장 애니메이션 클래스. typing은 기존 write 효과(좌→우 clip) 재사용.
  const animClass = (i: number) => {
    if (animation === 'fade-in') return 'animate-fade-in';
    if (animation === 'typing') return `clip-hidden ${i === 0 ? 'animate-write-l1' : 'animate-write-l2'}`;
    return '';
  };

  // 커버 텍스트 색상: 사용자 지정(단색/그라데이션) 우선, 미설정이면 테마 기본 그라데이션 (하위 호환)
  // 단색도 bg-clip-text를 쓰는 span 구조를 유지하기 위해 같은 색 2-stop 그라데이션으로 표현
  const gradientStyle =
    coverTextConfig?.colorType === 'solid' && coverTextConfig.solidColor
      ? `linear-gradient(${coverTextConfig.solidColor}, ${coverTextConfig.solidColor})`
      : coverTextConfig?.colorType === 'gradient' && coverTextConfig.gradientColors
        ? `linear-gradient(to bottom right, ${coverTextConfig.gradientColors[0]}, ${coverTextConfig.gradientColors[1]})`
        : THEME_GRADIENTS[theme];

  const customShadowColor =
    coverTextConfig?.colorType === 'solid'
      ? coverTextConfig.solidColor
      : coverTextConfig?.colorType === 'gradient'
        ? coverTextConfig.gradientColors?.[0]
        : undefined;
  const shadowStyle = customShadowColor ? hexToDropShadow(customShadowColor) : THEME_SHADOWS[theme];

  // 레터링 source가 draw·upload이고 내용이 있으면 커버 텍스트 대신 레터링을 오버레이
  const showLettering =
    !!lettering &&
    (lettering.source === 'draw' || lettering.source === 'upload') &&
    (!!lettering.imageUrl || lettering.strokes.length > 0);

  return (
    <section className="relative w-full aspect-[9/16] bg-ivory text-white overflow-hidden">
      {coverImagePosition?.cropArea && (coverImagePosition.cropArea.width < 100 || coverImagePosition.cropArea.height < 100 || coverImagePosition.cropArea.x !== 0 || coverImagePosition.cropArea.y !== 0) ? (
        <img
          src={coverImageUrl}
          alt=""
          className="absolute z-0 block max-w-none"
          style={{
            width: `${(100 / coverImagePosition.cropArea.width) * 100}%`,
            height: `${(100 / coverImagePosition.cropArea.height) * 100}%`,
            left: `${-(coverImagePosition.cropArea.x / coverImagePosition.cropArea.width) * 100}%`,
            top: `${-(coverImagePosition.cropArea.y / coverImagePosition.cropArea.height) * 100}%`,
          }}
        />
      ) : (
        <div
          className="absolute inset-0 bg-center bg-cover z-0"
          style={{ backgroundImage: `url(${coverImageUrl})` }}
        />
      )}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/18 via-transparent via-55% to-black/50" />
      <div className="relative z-[2] px-6 pt-6 h-full flex flex-col drop-shadow-[0_2px_12px_rgba(0,0,0,.4)]">
        <div className="flex justify-between items-start">
          <div className="text-[12px] tracking-[.16em] uppercase">
            <div className="opacity-85 font-medium">Groom</div>
            <div className="font-serif font-semibold text-[18px] tracking-[.04em] normal-case mt-1">{groomName}</div>
          </div>
          <div className="text-[12px] tracking-[.16em] uppercase text-right">
            <div className="opacity-85 font-medium">Bride</div>
            <div className="font-serif font-semibold text-[18px] tracking-[.04em] normal-case mt-1">{brideName}</div>
          </div>
        </div>
        {showLettering && lettering ? (
          <div className="mt-auto mb-auto flex justify-center">
            <div
              ref={letteringRef}
              style={{
                width: `${lettering.width}%`,
                // 박스 비율을 drawViewBox로 유도 — 가로형 보드는 가로로 넓게, 과거 정사각(300×300) 데이터는 자동으로 정사각 유지(하위호환)
                aspectRatio: `${lettering.drawViewBox.width} / ${lettering.drawViewBox.height}`,
                transform: `translate(${lettering.x}px, ${lettering.y}px) rotate(${lettering.rotation}deg)`,
              }}
            >
              <LetteringRenderer config={lettering} animKey={`${lettering.source}-${lettering.animation}-${animPlayKey}`} />
            </div>
          </div>
        ) : (
          <div className="text-center mt-auto mb-auto flex justify-center">
            <div
              ref={textRef}
              className="font-cursive leading-none tracking-[.005em] inline-block py-2.5"
              style={{
                transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg)`,
                fontSize: `${fontSize}px`,
              }}
            >
              {lines.map((line, i) => (
                <span
                  key={`${i}-${animPlayKey}`}
                  className={`block leading-[1.05] bg-clip-text text-transparent ${i === 0 ? 'text-left -ml-[30px]' : 'text-right -mr-[30px] -mt-3'} ${animClass(i)}`}
                  style={{
                    backgroundImage: gradientStyle,
                    filter: shadowStyle,
                  }}
                >
                  {line}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col items-center gap-[5px]">
          <div className="text-[15px] tracking-[.08em] font-medium">{formatted} {dayName} {time}</div>
          <div className="text-[15px] tracking-[.04em] font-medium">{venueName}{venueHall ? ` ${venueHall}` : ''}</div>
          <div className="mt-3.5 text-sm animate-bounce-arrow opacity-85">&#8595;</div>
        </div>
      </div>
    </section>
  );
}
