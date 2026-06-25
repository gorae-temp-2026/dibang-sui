import { useRef, useEffect, useCallback } from 'react';
import { useT } from '../lib/i18n';

type Tab = 'invitation' | 'lounge';

interface BottomToggleProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function BottomToggle({ activeTab, onTabChange }: BottomToggleProps) {
  const t = useT();
  const toggleRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const updateSlider = useCallback(() => {
    const toggle = toggleRef.current;
    const slider = sliderRef.current;
    if (!toggle || !slider) return;

    const activeBtn = toggle.querySelector<HTMLButtonElement>('button.active-tab');
    if (!activeBtn) return;

    const btnRect = activeBtn.getBoundingClientRect();
    const toggleRect = toggle.getBoundingClientRect();
    slider.style.left = `${btnRect.left - toggleRect.left}px`;
    slider.style.width = `${btnRect.width}px`;
  }, []);

  useEffect(() => {
    updateSlider();
    window.addEventListener('resize', updateSlider);
    return () => window.removeEventListener('resize', updateSlider);
  }, [activeTab, updateSlider]);

  const handleClick = () => {
    onTabChange(activeTab === 'invitation' ? 'lounge' : 'invitation');
  };

  return (
    <div
      ref={toggleRef}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex bg-white rounded-[30px] p-[5px] shadow-[0_8px_32px_rgba(30,58,95,.22)] text-sm z-[100] overflow-hidden cursor-pointer"
      onClick={handleClick}
    >
      <div
        ref={sliderRef}
        className="absolute top-[5px] bottom-[5px] bg-navy rounded-3xl shadow-[0_4px_12px_rgba(30,58,95,.25)] transition-all duration-[.4s] ease-[cubic-bezier(.16,1,.3,1)] z-[1]"
      />
      <button className={`relative border-none bg-transparent py-[11px] px-[30px] rounded-3xl cursor-pointer font-body font-medium whitespace-nowrap shrink-0 z-[2] transition-colors duration-[.35s] ease-[cubic-bezier(.16,1,.3,1)] ${activeTab === 'invitation' ? 'active-tab text-white font-semibold' : 'text-muted'}`}>
        {t('invitationUi.toggle.invitation')}
      </button>
      <button className={`relative border-none bg-transparent py-[11px] px-[30px] rounded-3xl cursor-pointer font-body font-medium whitespace-nowrap shrink-0 z-[2] transition-colors duration-[.35s] ease-[cubic-bezier(.16,1,.3,1)] ${activeTab === 'lounge' ? 'active-tab text-white font-semibold' : 'text-muted'}`}>
        {t('invitationUi.toggle.lounge')}
      </button>
    </div>
  );
}
