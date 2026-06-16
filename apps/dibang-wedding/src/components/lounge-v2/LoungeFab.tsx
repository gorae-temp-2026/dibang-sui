import type { ReactNode } from 'react';

// 라운지 V2 공통 FAB — 라운드 사각형 버튼 + 바로 아래 레이블 (2026-06-12 피드백: 원형 → 라운드 사각형, 레이블 표기).
// 외곽 fixed inset-x-0 + 안쪽 mx-auto max-w 래퍼로 max-width 안쪽 우측 앵커링 (issue #30 패턴).
// 스택 컨벤션: bottom 90 / 175 / 260 … 한 단 85px (버튼 58 + 레이블 ~20 + 마진).
// 버튼 열은 w-[58px] 고정 — 레이블이 더 길어도 버튼끼리 수직 정렬 유지(레이블은 좌우 균등 오버플로).

interface LoungeFabProps {
  /** 버튼 바로 아래 표시되는 레이블. text-sm 고정 — 글씨 크기 최소 기준(14px) 준수. */
  label: string;
  /** 접근성·E2E용 aria-label. 미지정 시 label 사용. */
  ariaLabel?: string;
  /** 뷰포트 하단 기준 anchor 오프셋(px). 레이블 하단이 이 위치에 온다. */
  bottom: number;
  onClick: () => void;
  disabled?: boolean;
  /** 아이콘 svg */
  children: ReactNode;
}

export function LoungeFab({ label, ariaLabel, bottom, onClick, disabled, children }: LoungeFabProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[45]" style={{ bottom }}>
      <div className="relative mx-auto h-0 max-w-[480px]">
        <div className="absolute bottom-0 right-[18px] flex w-[58px] flex-col items-center gap-1.5">
          <button
            type="button"
            aria-label={ariaLabel ?? label}
            onClick={onClick}
            disabled={disabled}
            className="pointer-events-auto flex h-[58px] w-[58px] items-center justify-center rounded-2xl border border-black/[0.07] bg-[rgba(255,255,255,0.96)] text-[#3F2F33] shadow-[0_12px_28px_rgba(0,0,0,0.14),0_2px_6px_rgba(0,0,0,0.06)] backdrop-blur-[10px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {children}
          </button>
          <span className="whitespace-nowrap text-sm font-medium leading-none text-[#3F2F33]">{label}</span>
        </div>
      </div>
    </div>
  );
}
