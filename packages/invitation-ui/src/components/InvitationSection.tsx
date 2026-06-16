import { useIntersectionFadeIn } from '../hooks/useIntersectionFadeIn';
import { stripSurname } from '../utils/koreanName';
import type { HostInfo } from '../types/invitation';

interface InvitationSectionProps {
  hosts: HostInfo;
  groomName: string;
  brideName: string;
  greetingMessage: string;
}

export function InvitationSection({ hosts, groomName, brideName, greetingMessage }: InvitationSectionProps) {
  const ref = useIntersectionFadeIn<HTMLElement>();

  // 고인(故) 표기 — 이름 앞에 한자 '故'를 붙인다(QA 2026-05-29: 국화 아이콘 → 故).
  const displayName = (name: string, deceased?: boolean) =>
    deceased ? <>故 {name}</> : name;

  return (
    <section
      ref={ref}
      className="px-7 py-12 border-b border-line opacity-0 translate-y-10 transition-all duration-[1.5s] ease-[cubic-bezier(.16,1,.3,1)] [&.visible]:opacity-100 [&.visible]:translate-y-0"
    >
      <div className="font-italic italic font-normal text-[13px] text-sky tracking-[.18em] uppercase text-center mb-1.5">Invitation</div>
      <div className="font-serif font-medium text-xl text-navy text-center tracking-[.02em] mb-[18px]">초대합니다</div>
      <div className="w-6 h-px bg-soft-sky mx-auto mb-[18px]" />
      <div className="text-center mb-[26px]">
        <p className="font-serif font-normal text-[15px] leading-[1.95] text-ink tracking-[.02em]">{displayName(hosts.groomFatherName, hosts.groomFatherDeceased)} · {displayName(hosts.groomMotherName, hosts.groomMotherDeceased)} 의 아들 {stripSurname(groomName)}</p>
        <p className="font-serif font-normal text-[15px] leading-[1.95] text-ink tracking-[.02em]">{displayName(hosts.brideFatherName, hosts.brideFatherDeceased)} · {displayName(hosts.brideMotherName, hosts.brideMotherDeceased)} 의 딸 {stripSurname(brideName)}</p>
      </div>
      <p
        className="font-serif font-light text-sm leading-[1.95] text-ink text-center"
        dangerouslySetInnerHTML={{ __html: greetingMessage.replace(/\n/g, '<br>') }}
      />
    </section>
  );
}
