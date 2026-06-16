import { useEffect, useRef } from 'react';
import { ThemeControls } from './ThemeControls';
import type { ThemeFonts, ThemeColors } from '../../types/invitationDesignConfig';

// 섹션 구성은 EditPanel 최상단 카드로 분리됨. 이 팝업은 폰트·색상(디자인 설정)만 담당.
interface Props {
  open: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
  fonts: ThemeFonts;
  colors: ThemeColors;
  onChangeFont: (slot: keyof ThemeFonts, font: string) => void;
  onChangeColors: (colors: ThemeColors) => void;
}

export function SectionConfigPopup({
  open, onClose, triggerRef,
  fonts, colors, onChangeFont, onChangeColors,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef?.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open, onClose]);

  return (
    <div
      ref={panelRef}
      className={`absolute bottom-28 right-8 z-50 w-[calc(100%-64px)] max-h-[70%] overflow-y-auto overscroll-contain scrollbar-hide bg-white rounded-2xl border border-gray-200 shadow-lg p-5 space-y-6 origin-bottom-right transition-all duration-200 ease-out ${
        open
          ? 'scale-100 opacity-100'
          : 'scale-0 opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">디자인 설정</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <ThemeControls
        fonts={fonts}
        colors={colors}
        onChangeFont={onChangeFont}
        onChangeColors={onChangeColors}
      />
    </div>
  );
}
