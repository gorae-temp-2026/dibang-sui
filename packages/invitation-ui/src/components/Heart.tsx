import { useState, useCallback } from 'react';
import { useIntersectionFadeIn } from '../hooks/useIntersectionFadeIn';

interface HeartProps {
  initialCount: number;
  // 서버 응답으로 받은 최신 카운트. 들어오면 표시 값을 이 값으로 덮어쓴다.
  syncedCount?: number;
  // 세션 내 첫 발화(자동 노출 또는 클릭) 시 1회 호출되는 콜백. 카운트 +1 서버 반영용.
  onTrigger?: () => void;
}

export function Heart({ initialCount, syncedCount, onTrigger }: HeartProps) {
  const ref = useIntersectionFadeIn<HTMLDivElement>();
  const [hearted, setHearted] = useState(false);
  const [localCount, setLocalCount] = useState(initialCount);
  const [burstKey, setBurstKey] = useState(0);

  // 자동 노출: 한 번만 발화. 두 번째부터는 빠르게 return해야 함.
  // (IntersectionObserver가 ref 콜백 안에서 매 렌더마다 재등록되므로 가드 필수.)
  const handleVisible = useCallback(() => {
    if (hearted) return;
    setLocalCount((c) => c + 1);
    setHearted(true);
    setBurstKey((k) => k + 1);
    onTrigger?.();
  }, [hearted, onTrigger]);

  // 클릭: 누적 시맨틱이라 카운트·hearted는 첫 번째만 갱신, 버스트는 매번 재발사.
  const handleClick = useCallback(() => {
    setBurstKey((k) => k + 1);
    if (hearted) return;
    setLocalCount((c) => c + 1);
    setHearted(true);
    onTrigger?.();
  }, [hearted, onTrigger]);

  const displayCount = syncedCount ?? localCount;

  return (
    <div
      className="flex justify-end px-7 pb-7 relative opacity-0 translate-y-8 transition-all duration-[1.4s] ease-[cubic-bezier(.16,1,.3,1)] [&.visible]:opacity-100 [&.visible]:translate-y-0"
      ref={(el) => {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
        if (el) {
          const observer = new IntersectionObserver(
            (entries) => {
              if (entries[0].isIntersecting) {
                handleVisible();
                observer.disconnect();
              }
            },
            { threshold: 0.35 },
          );
          observer.observe(el);
        }
      }}
    >
      <button
        type="button"
        aria-label="좋아요"
        className={`bg-transparent border-none cursor-pointer inline-flex items-baseline gap-1.5 font-body transition-transform duration-150 relative active:scale-[.92] ${!hearted ? '[&_.heart-icon]:text-[#FFC1C8] [&_.heart-icon]:opacity-50' : ''}`}
        onClick={handleClick}
      >
        <span className="relative inline-flex overflow-visible">
          <span className="heart-icon text-[22px] text-[#FF6B7A] transition-all duration-200">❤</span>
          {burstKey > 0 && (
            <span
              key={burstKey}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-[22px] text-[#FF6B7A] animate-heart-burst"
            >
              ❤
            </span>
          )}
        </span>
        <span className="font-italic italic text-xl font-semibold text-navy">{displayCount}</span>
      </button>
    </div>
  );
}
