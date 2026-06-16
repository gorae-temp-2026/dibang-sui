import { useRef } from 'react';
import { useLetteringUpload } from '../../hooks/invitation-create/useLetteringUpload';
import type { InvitationUploadContext } from '../../queries/invitation/useInvitationPhotoUpload';
import {
  ANIMATION_PRESETS,
  type LetteringAnimation,
  type LetteringSource,
  type LetteringStroke,
} from '../../types/invitationDesignConfig';
import { LetteringDrawBoard } from './LetteringDrawBoard';
import { inputClass } from './styles';

type CoverTextAnimation = 'none' | 'fade-in' | 'typing';

const UPLOAD_PRESETS = ANIMATION_PRESETS;
const DRAW_ANIM_OPTIONS: { value: LetteringAnimation; label: string }[] = [
  { value: 'none', label: '정지' },
  { value: 'stroke-order', label: '그린 순서' },
  { value: 'fade-in', label: '페이드인' },
];
const TEXT_PRESETS: { value: CoverTextAnimation; label: string }[] = [
  { value: 'none', label: '없음' },
  { value: 'fade-in', label: '페이드인' },
  { value: 'typing', label: '타이핑' },
];

type CoverTextColorType = 'solid' | 'gradient';
const COLOR_TYPES: { value: CoverTextColorType; label: string }[] = [
  { value: 'solid', label: '단색' },
  { value: 'gradient', label: '그라데이션' },
];

const SOLID_PRESETS = ['#FF8FA3', '#222222', '#FFFFFF', '#B08968'] as const;
const GRADIENT_PRESETS: [string, string][] = [
  ['#FFB8C5', '#FFE0A8'],
  ['#A8C4D9', '#A8C4D9'],
  ['#D4A5A5', '#E8C4C4'],
  ['#B8D4B8', '#D4E8D4'],
];

const MODES: { value: LetteringSource; label: string }[] = [
  { value: 'text', label: '텍스트 입력' },
  { value: 'draw', label: '직접 그리기' },
  { value: 'upload', label: '이미지 업로드' },
];

interface Props {
  /** 업로드 스코프 — Edit: wedding, Create: draft (useLetteringUpload에 전달) */
  uploadContext: InvitationUploadContext;
  source: LetteringSource;
  imageUrl: string | null;
  strokes: LetteringStroke[];
  drawViewBox: { width: number; height: number };
  animation: LetteringAnimation;
  coverText: string;
  coverTextAnimation: CoverTextAnimation;
  coverTextColorType: CoverTextColorType;
  coverTextSolidColor: string;
  coverTextGradientColors: [string, string];
  onChangeSource: (s: LetteringSource) => void;
  onChangeImage: (url: string | null) => void;
  onChangeStrokes: (strokes: LetteringStroke[]) => void;
  onChangeAnimation: (a: LetteringAnimation) => void;
  onChangeCoverText: (text: string) => void;
  onChangeCoverTextAnimation: (a: CoverTextAnimation) => void;
  onChangeCoverTextColorType: (t: CoverTextColorType) => void;
  onChangeCoverTextSolidColor: (c: string) => void;
  onChangeCoverTextGradientColors: (c: [string, string]) => void;
  /** 애니메이션 재생 — 미리보기에서 현재 애니메이션 다시 재생 */
  onPlayAnimation?: () => void;
}

const chipBase =
  'rounded-lg border px-3 py-2 text-base font-medium transition-colors';
const chipActive = 'border-sky-400 bg-sky-50 text-sky-700';
const chipIdle = 'border-gray-200 bg-white text-gray-600 hover:border-gray-300';
const chip = (active: boolean) => `${chipBase} ${active ? chipActive : chipIdle}`;

export function LetteringControls({
  uploadContext,
  source,
  imageUrl,
  strokes,
  drawViewBox,
  animation,
  coverText,
  coverTextAnimation,
  coverTextColorType,
  coverTextSolidColor,
  coverTextGradientColors,
  onChangeSource,
  onChangeImage,
  onChangeStrokes,
  onChangeAnimation,
  onChangeCoverText,
  onChangeCoverTextAnimation,
  onChangeCoverTextColorType,
  onChangeCoverTextSolidColor,
  onChangeCoverTextGradientColors,
  onPlayAnimation,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, isPending, error } = useLetteringUpload(uploadContext);

  // '애니메이션 재생' 버튼 — 현재 애니메이션이 'none'이면 비활성
  const playButton = (disabled: boolean) => (
    <button
      type="button"
      onClick={() => onPlayAnimation?.()}
      disabled={disabled}
      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-base font-medium text-gray-600 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      애니메이션 재생
    </button>
  );

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const url = await upload(file);
    if (url) onChangeImage(url);
  };

  const selectMode = (next: LetteringSource) => {
    if (next === source) return;
    onChangeSource(next);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {MODES.map((m) => (
          <button key={m.value} type="button" className={chip(source === m.value)} onClick={() => selectMode(m.value)}>
            {m.label}
          </button>
        ))}
      </div>

      {source === 'text' && (
        <div className="space-y-3">
          <p className="text-base text-gray-400">크기, 위치, 회전은 미리보기에서 직접 조절하세요.</p>
          <textarea
            className={`${inputClass} resize-none`}
            rows={2}
            value={coverText}
            onChange={(e) => onChangeCoverText(e.target.value)}
            placeholder={"Our\nwedding day"}
          />

          <div className="space-y-2">
            <h5 className="text-base font-medium text-gray-700">애니메이션</h5>
            <div className="flex flex-wrap gap-2">
              {TEXT_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={chip(coverTextAnimation === p.value)}
                  onClick={() => onChangeCoverTextAnimation(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {playButton(coverTextAnimation === 'none')}
          </div>

          <div className="space-y-2">
            <h5 className="text-base font-medium text-gray-700">색상</h5>
            <div className="flex gap-2">
              {COLOR_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  className={chip(coverTextColorType === ct.value)}
                  onClick={() => onChangeCoverTextColorType(ct.value)}
                >
                  {ct.label}
                </button>
              ))}
            </div>
            {coverTextColorType === 'solid' ? (
              <div className="flex items-center gap-2">
                {SOLID_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChangeCoverTextSolidColor(c)}
                    aria-label={`단색 ${c}`}
                    className={`w-7 h-7 shrink-0 rounded-full border-2 cursor-pointer transition-colors ${coverTextSolidColor.toLowerCase() === c.toLowerCase() ? 'border-sky-500 ring-2 ring-sky-200' : 'border-gray-200 hover:border-gray-400'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <label className="relative w-7 h-7 shrink-0 rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer flex items-center justify-center transition-colors" style={{ backgroundColor: coverTextSolidColor }}>
                  <span className="text-white text-sm font-bold leading-none drop-shadow-[0_0_2px_rgba(0,0,0,.5)]">+</span>
                  <input type="color" value={coverTextSolidColor} onChange={(e) => onChangeCoverTextSolidColor(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </label>
                <span className="text-sm text-gray-500 tabular-nums">{coverTextSolidColor}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {GRADIENT_PRESETS.map((g, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onChangeCoverTextGradientColors(g)}
                      aria-label={`그라데이션 ${i + 1}`}
                      className={`w-7 h-7 shrink-0 rounded-full border-2 cursor-pointer transition-colors ${coverTextGradientColors[0] === g[0] && coverTextGradientColors[1] === g[1] ? 'border-sky-500 ring-2 ring-sky-200' : 'border-gray-200 hover:border-gray-400'}`}
                      style={{ backgroundImage: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative w-7 h-7 shrink-0 rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer flex items-center justify-center transition-colors" style={{ backgroundColor: coverTextGradientColors[0] }}>
                    <span className="text-white text-[10px] font-bold leading-none drop-shadow-[0_0_2px_rgba(0,0,0,.5)]">1</span>
                    <input type="color" value={coverTextGradientColors[0]} onChange={(e) => onChangeCoverTextGradientColors([e.target.value, coverTextGradientColors[1]])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </label>
                  <label className="relative w-7 h-7 shrink-0 rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer flex items-center justify-center transition-colors" style={{ backgroundColor: coverTextGradientColors[1] }}>
                    <span className="text-white text-[10px] font-bold leading-none drop-shadow-[0_0_2px_rgba(0,0,0,.5)]">2</span>
                    <input type="color" value={coverTextGradientColors[1]} onChange={(e) => onChangeCoverTextGradientColors([coverTextGradientColors[0], e.target.value])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </label>
                  <div
                    className="flex-1 h-7 rounded-full border border-gray-200"
                    style={{ backgroundImage: `linear-gradient(to right, ${coverTextGradientColors[0]}, ${coverTextGradientColors[1]})` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {source === 'upload' && (
        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".png,.svg,image/png,image/svg+xml"
            onChange={handleFile}
            className="hidden"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-lg bg-gray-100 px-4 py-2.5 text-base font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors"
              onClick={() => fileRef.current?.click()}
              disabled={isPending}
            >
              {isPending ? '업로드 중...' : imageUrl ? '다시 선택' : '파일 선택'}
            </button>
            {imageUrl && (
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-base font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                onClick={() => onChangeImage(null)}
              >
                삭제
              </button>
            )}
          </div>

          {error && (
            <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-500">{error}</p>
          )}

          {imageUrl && (
            <p className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 break-all">
              레터링 적용됨 · {imageUrl}
            </p>
          )}

          <div className="space-y-2">
            <h5 className="text-base font-medium text-gray-700">애니메이션</h5>
            <div className="flex flex-wrap gap-2">
              {UPLOAD_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={chip(animation === p.value)}
                  onClick={() => onChangeAnimation(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {playButton(animation === 'none')}
          </div>
        </div>
      )}

      {source === 'draw' && (
        <div className="space-y-3">
          <p className="text-base text-gray-500">아래 보드에 직접 그리세요. 그린 순서가 애니메이션 순서가 됩니다.</p>
          <LetteringDrawBoard strokes={strokes} viewBox={drawViewBox} onChange={onChangeStrokes} />

          <div className="space-y-2">
            <h5 className="text-base font-medium text-gray-700">애니메이션</h5>
            <div className="flex flex-wrap gap-2">
              {DRAW_ANIM_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={chip(animation === o.value)}
                  onClick={() => onChangeAnimation(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {playButton(animation === 'none')}
          </div>
        </div>
      )}
    </div>
  );
}
