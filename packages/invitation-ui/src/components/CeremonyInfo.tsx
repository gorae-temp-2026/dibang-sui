import { useIntersectionFadeIn } from '../hooks/useIntersectionFadeIn';
import { MecDisplayMini } from './MecDisplayMini';

interface CeremonyInfoProps {
  groomName: string;
  brideName: string;
  date: string;
  hostNotice: string;
  /** 식장 디스플레이 미니어처 화면 배경에 깔 커버(커플) 사진 */
  couplePhotoUrl: string;
}

export function CeremonyInfo({ groomName: _groomName, brideName: _brideName, date: _date, hostNotice, couplePhotoUrl }: CeremonyInfoProps) {
  const ref = useIntersectionFadeIn<HTMLElement>();

  return (
    <section
      ref={ref}
      className="px-7 py-12 border-b border-line opacity-0 translate-y-10 transition-all duration-[1.5s] ease-[cubic-bezier(.16,1,.3,1)] [&.visible]:opacity-100 [&.visible]:translate-y-0"
    >
      <div className="font-italic italic font-normal text-[13px] text-sky tracking-[.18em] uppercase text-center mb-1.5">Ceremony Info</div>
      <div className="font-serif font-medium text-xl text-navy text-center tracking-[.02em] mb-[18px]">안내 사항</div>
      <div className="w-6 h-px bg-soft-sky mx-auto mb-[18px]" />
      <div className="flex flex-col gap-[18px]">
        {hostNotice && (
          <div className="w-full bg-gradient-to-br from-[#FFF7E8] to-white rounded-[18px] px-6 py-7 text-center">
            <div className="font-serif text-sm text-navy font-semibold tracking-[.04em] mb-3.5">안내드립니다</div>
            <p className="text-sm leading-[1.8] text-ink font-normal px-2 py-6" dangerouslySetInnerHTML={{ __html: hostNotice.replace(/\n/g, '<br>') }} />
          </div>
        )}
        <div className="w-full bg-gradient-to-br from-pale-sky to-white rounded-[18px] px-6 py-7 text-center">
          <p className="text-[13px] leading-[1.7] text-ink font-medium mb-[18px]">결혼식장에서 디지털 방명록 QR을 확인하세요.</p>
          <MecDisplayMini couplePhotoUrl={couplePhotoUrl} />
          <p className="text-[13px] leading-[1.75] text-ink font-normal mt-3">
            식장에 준비된 QR을 스캔하고<br />
            <strong className="text-navy font-bold">간편 축의, 축하 메시지, 사진 공유</strong>를 하세요.<br />
            예식이 끝나고 신랑 신부에게<br />
            <strong className="text-navy font-bold">Wedding Memorybook</strong>으로 전달됩니다.
          </p>
        </div>
      </div>
    </section>
  );
}
