import { useCountdown } from '../hooks/useCountdown';
import { useIntersectionFadeIn } from '../hooks/useIntersectionFadeIn';

interface WeddingDateProps {
  date: string;
}

export function WeddingDate({ date }: WeddingDateProps) {
  const ref = useIntersectionFadeIn<HTMLElement>();
  const targetDate = new Date(date);
  const { days, hours, minutes, seconds, isOver } = useCountdown(targetDate);

  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();
  const dayOfWeek = targetDate.getDay();

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const koreanDay = dayNames[dayOfWeek];
  const hour = targetDate.getHours();
  const minute = targetDate.getMinutes();
  const ampm = hour < 12 ? '오전' : '오후';
  const displayHour = hour > 12 ? hour - 12 : hour;

  const startOfWeek = new Date(targetDate);
  startOfWeek.setDate(day - dayOfWeek);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d.getDate();
  });

  return (
    <section
      ref={ref}
      className="px-7 py-12 border-b border-line opacity-0 translate-y-10 transition-all duration-[1.5s] ease-[cubic-bezier(.16,1,.3,1)] [&.visible]:opacity-100 [&.visible]:translate-y-0"
    >
      <div className="font-italic italic font-normal text-[13px] text-sky tracking-[.18em] uppercase text-center mb-1.5">Wedding Date</div>
      <div className="font-serif font-medium text-xl text-navy text-center tracking-[.02em] mb-[18px] flex flex-wrap justify-center gap-x-1.5">
        <span>{year}년 {month}월 {day}일 {koreanDay}요일</span>
        <span>{ampm} {displayHour}시{minute > 0 ? ` ${minute}분` : ''}</span>
      </div>
      <div className="w-6 h-px bg-soft-sky mx-auto mb-[18px]" />
      <div className="mb-[18px]">
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((d, i) => (
            <div
              key={i}
              className={`text-center py-3.5 px-1 pb-4 rounded-[14px] text-[11px] font-medium tracking-[.04em] transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${
                d === day
                  ? 'bg-gradient-to-br from-sky to-soft-sky text-white scale-108 shadow-[0_6px_18px_rgba(135,206,235,.4)]'
                  : `bg-pale-sky ${i === 0 ? 'text-[#D67373]' : 'text-muted'}`
              }`}
            >
              {dayNames[i]}
              <span className={`block font-serif text-lg font-medium mt-1 ${
                d === day ? 'text-white font-bold' : i === 0 ? 'text-[#D67373]' : 'text-ink'
              }`}>
                {d}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="text-center font-body text-muted text-[13px] font-medium tracking-[.04em] mt-[18px]">
        {isOver ? 'D-DAY' : `D-${days} · ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
      </div>
    </section>
  );
}
