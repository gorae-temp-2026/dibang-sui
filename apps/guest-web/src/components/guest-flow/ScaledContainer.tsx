import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * 미리보기를 원본 393×852로 렌더한 뒤 wrapper에 `transform: scale()`을 걸어 비율 그대로 축소.
 * landing의 동일 컴포넌트를 guest-web으로 이식 (StepDoneV2의 라운지 미리보기 iframe용).
 * iframe은 원본 사이즈로 페이지를 렌더하고 wrapper만 scale → 393px 기준 내부 레이아웃이 깨지지 않는다.
 * ResizeObserver로 부모 요소의 폭을 측정해 scale을 자동 계산한다.
 */
export function ScaledContainer({
  children,
  baseWidth = 393,
  baseHeight = 852,
}: {
  children: ReactNode;
  baseWidth?: number;
  baseHeight?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // mount 직전에 한 번 계산 (paint flash 방지)
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const parent = wrap.parentElement;
    if (!parent) return;
    setScale(parent.clientWidth / baseWidth);
  }, [baseWidth]);

  // 이후 부모 폭 변화 추적 (orientation 변경, resize 등)
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const parent = wrap.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = e.contentRect.width;
        if (w > 0) setScale(w / baseWidth);
      }
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, [baseWidth]);

  return (
    <div
      ref={wrapRef}
      style={{
        width: `${baseWidth}px`,
        height: `${baseHeight}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}
    >
      {children}
    </div>
  );
}
