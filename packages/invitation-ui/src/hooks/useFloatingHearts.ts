import { useEffect, useRef } from 'react';

export function useFloatingHearts(active: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const COLORS = ['#87CEEB', '#F4A6B8'];

    function spawnHeart() {
      const heart = document.createElement('span');
      heart.className = 'floating-heart';
      const color = COLORS[Math.random() < 0.5 ? 0 : 1];
      heart.innerHTML = `<svg viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg"><path d="M12 21s-6.8-4.4-9-9.4C1.4 7.5 4 4 7.5 4c2 0 3.6 1 4.5 2.5C12.9 5 14.5 4 16.5 4 20 4 22.6 7.5 21 11.6 19.2 16.6 12 21 12 21z"/></svg>`;
      heart.style.left = `${6 + Math.random() * 88}%`;
      const size = 14 + Math.random() * 12;
      heart.style.width = `${size}px`;
      heart.style.height = `${size}px`;
      heart.style.animationDuration = `${7 + Math.random() * 5}s`;
      heart.style.opacity = (0.55 + Math.random() * 0.3).toFixed(2);
      container.appendChild(heart);
      setTimeout(() => heart.remove(), 13000);
    }

    spawnHeart();
    setTimeout(spawnHeart, 700);
    timerRef.current = setInterval(spawnHeart, 1500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active]);

  return containerRef;
}
