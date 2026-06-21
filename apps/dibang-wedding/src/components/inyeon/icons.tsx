// 디방인연 전용 아이콘 — 틴더식 목업(디방인연_틴더식_목업_260617.html) <symbol> 그대로 복원.
// 색은 currentColor 상속(lucide와 동일 사용), strokeWidth는 레일 on/off 대응 위해 prop.
interface IconProps {
  className?: string
  strokeWidth?: number
}

/** i-nodes — 이음 신청: 두 원 + 점선 연결. */
export function IeumIcon({ className, strokeWidth = 2 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="8.3" y1="8.3" x2="15.7" y2="15.7" strokeDasharray="2.4 2.4" />
      <circle cx="6" cy="6" r="3" fill="currentColor" stroke="none" />
      <circle cx="18" cy="18" r="3" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** i-inbox — 받은이음: 모이는 두 선 + 3원. */
export function ReceivedIcon({ className, strokeWidth = 2 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <line x1="7.8" y1="7.6" x2="10.8" y2="12" />
      <line x1="16.2" y1="7.6" x2="13.2" y2="12" />
      <circle cx="12" cy="15" r="3.2" fill="currentColor" stroke="none" />
      <circle cx="6" cy="6" r="2.3" fill="currentColor" stroke="none" />
      <circle cx="18" cy="6" r="2.3" fill="currentColor" stroke="none" />
    </svg>
  )
}
