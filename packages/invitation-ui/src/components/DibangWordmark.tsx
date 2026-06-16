interface DibangWordmarkProps {
  /** 크기·여백 등 추가 클래스 (예: 'text-2xl') */
  className?: string;
}

/**
 * dibang 브랜드 워드마크 — 랜딩 푸터 디자인으로 통일(QA 2026-05-29).
 * Sacramento 필기체 + 핑크(#FFB8C5)→피치(#F8C57A) 그라데이션 텍스트 + 살짝 기울임(-2deg).
 * `font-cursive`(=Sacramento)는 호출 앱 tailwind/CSS에 정의되어 있어야 한다
 * (dibang-wedding·guest-web·landing 모두 --font-cursive 보유).
 */
export function DibangWordmark({ className = '' }: DibangWordmarkProps) {
  return (
    <span
      className={`font-cursive inline-block -rotate-2 bg-gradient-to-br from-[#FFB8C5] to-[#F8C57A] bg-clip-text leading-tight text-transparent ${className}`}
    >
      dibang
    </span>
  );
}
