import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { WarmthOrb } from './WarmthOrb';
import { useT } from '../../lib/i18n';

// 프로토타입 .top-bar/.tb-back/.top-bar-mini/.tbm-title 정합.
// 평소: fixed 투명, 플로팅 chevron만. 스크롤 시(>200): 흰 풀바 + mini(라운지명+온기 orb).
// 뒤로가기 목적지는 V1과 동일(/my-wedding).

interface TopBarV2Props {
  title: string;
  warmthLabel: string;
}

export function TopBarV2({ title, warmthLabel }: TopBarV2Props) {
  const t = useT();
  const navigate = useNavigate();
  const [mini, setMini] = useState(false);

  useEffect(() => {
    const onScroll = () => setMini(window.scrollY > 200);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`pointer-events-none fixed inset-x-0 top-0 z-[200] mx-auto flex max-w-[480px] items-center gap-[10px] border-b transition-[background,box-shadow,border-color,padding] duration-[250ms] [&>*]:pointer-events-auto ${
        mini
          ? 'h-12 border-lng-line bg-[rgba(255,255,255,0.98)] px-4 py-[10px] shadow-[0_4px_14px_rgba(0,0,0,0.06)] backdrop-blur-[12px]'
          : 'border-transparent bg-transparent px-[14px] py-3'
      }`}
    >
      <button
        type="button"
        onClick={() => navigate('/my-wedding')}
        aria-label={t('loungeV2.topBar.back')}
        className="flex h-9 w-9 items-center justify-center bg-transparent p-0 text-lng-ink transition-opacity hover:opacity-60"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {mini && (
        <div className="flex min-w-0 flex-1 items-center gap-[10px] pl-1">
          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold leading-none tracking-[-0.01em] text-lng-ink">
            {title}
          </span>
          <WarmthOrb label={warmthLabel} variant="mini" />
        </div>
      )}
    </header>
  );
}
