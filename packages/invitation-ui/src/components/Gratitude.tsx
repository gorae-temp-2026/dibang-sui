import { useState } from 'react';
import { useIntersectionFadeIn } from '../hooks/useIntersectionFadeIn';
import { useT } from '../lib/i18n';
import type { Account } from '../types/invitation';

interface GratitudeProps {
  groomAccounts: Account[];
  brideAccounts: Account[];
  /**
   * 계좌 정보 복사 콜백. 호출 앱이 clipboard 책임. 미제공 시 무동작.
   * (UI/데이터 분리 라운드 3 A1-1: packages 외부 API 직접 호출 제거)
   */
  onCopyAccount?: (text: string) => void;
  /** 카카오페이 송금 — 호출 앱이 딥링크 책임. 미제공 시 무동작(미리보기). */
  onPayKakao?: (account: Account) => void;
  /** 토스 송금 — 호출 앱이 딥링크 책임. 미제공 시 무동작(미리보기). */
  onPayToss?: (account: Account) => void;
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function AccountItem({ account, variant, onCopyAccount, onPayKakao, onPayToss }: { account: Account; variant: 'groom' | 'bride'; onCopyAccount?: (text: string) => void; onPayKakao?: (account: Account) => void; onPayToss?: (account: Account) => void }) {
  const t = useT();
  const handleCopy = () => {
    onCopyAccount?.(`${account.bank} ${account.number}`);
  };

  const isBride = variant === 'bride';

  return (
    <div className={`rounded-xl p-3.5 mb-2 flex gap-2.5 items-stretch ${isBride ? 'bg-[#FCE4EC]' : 'bg-pale-sky'}`}>
      <div className="flex-1 flex flex-col justify-center gap-0.5">
        <div className={`text-[10px] font-bold tracking-[.1em] uppercase ${isBride ? 'text-[#C2185B]' : 'text-navy'}`}>{account.role}</div>
        <div className="font-serif text-sm font-medium text-ink">{account.name}</div>
        <div className="flex items-center gap-1.5 mt-[3px]">
          <span className="text-xs text-muted">{account.bank} {account.number}</span>
          <button
            className={`bg-transparent border-none cursor-pointer p-[2px_4px] leading-none transition-all duration-150 inline-flex items-center hover:scale-115 ${isBride ? 'text-[#E0A0B5] hover:text-[#C2185B]' : 'text-soft-sky hover:text-navy'}`}
            title={t('invitationUi.gratitude.copy')}
            aria-label={t('invitationUi.gratitude.copy')}
            onClick={handleCopy}
          >
            <CopyIcon />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-[5px] shrink-0 w-[74px]">
        <button
          className="flex items-center justify-center gap-1.5 py-[7px] px-2.5 w-full bg-white border-2 border-[#FEE500] rounded-lg cursor-pointer font-body text-[10px] font-bold tracking-[.04em] text-[#3C1E1E] transition-all duration-150 hover:-translate-y-0.5"
          onClick={() => onPayKakao?.(account)}
        >
          {t('invitationUi.gratitude.kakao')}
        </button>
        <button
          className="flex items-center justify-center gap-1.5 py-[7px] px-2.5 w-full bg-white border-2 border-[#0064FF] rounded-lg cursor-pointer font-body text-[10px] font-bold tracking-[.04em] text-[#0064FF] transition-all duration-150 hover:-translate-y-0.5"
          onClick={() => onPayToss?.(account)}
        >
          {t('invitationUi.gratitude.toss')}
        </button>
      </div>
    </div>
  );
}

function AccountSide({ label, accounts, variant, onCopyAccount, onPayKakao, onPayToss }: { label: string; accounts: Account[]; variant: 'groom' | 'bride'; onCopyAccount?: (text: string) => void; onPayKakao?: (account: Account) => void; onPayToss?: (account: Account) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3.5">
      <button
        className={`w-full text-left py-3.5 px-[18px] bg-white border border-line rounded-xl font-body text-[13px] font-semibold text-navy cursor-pointer flex justify-between items-center tracking-[.02em] transition-all duration-250 hover:border-soft-sky ${open ? '[&_.arrow]:rotate-180' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span>{label}</span>
        <span className="arrow text-soft-sky transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)]">▾</span>
      </button>
      <div className={`overflow-hidden transition-[max-height] duration-[.4s] ease-[cubic-bezier(.16,1,.3,1)] ${open ? 'max-h-[600px] pt-2.5' : 'max-h-0'}`}>
        {accounts.map((account, i) => (
          <AccountItem key={i} account={account} variant={variant} onCopyAccount={onCopyAccount} onPayKakao={onPayKakao} onPayToss={onPayToss} />
        ))}
      </div>
    </div>
  );
}

export function Gratitude({ groomAccounts, brideAccounts, onCopyAccount, onPayKakao, onPayToss }: GratitudeProps) {
  const ref = useIntersectionFadeIn<HTMLElement>();
  const t = useT();

  return (
    <section
      ref={ref}
      className="px-7 py-12 border-b border-line opacity-0 translate-y-10 transition-all duration-[1.5s] ease-[cubic-bezier(.16,1,.3,1)] [&.visible]:opacity-100 [&.visible]:translate-y-0"
    >
      <div className="font-serif font-medium text-xl text-navy text-center tracking-[.02em] mb-[18px]">{t('invitationUi.gratitude.title')}</div>
      <div className="w-6 h-px bg-soft-sky mx-auto mb-[18px]" />
      <AccountSide label={t('invitationUi.gratitude.groomSide')} accounts={groomAccounts} variant="groom" onCopyAccount={onCopyAccount} onPayKakao={onPayKakao} onPayToss={onPayToss} />
      <AccountSide label={t('invitationUi.gratitude.brideSide')} accounts={brideAccounts} variant="bride" onCopyAccount={onCopyAccount} onPayKakao={onPayKakao} onPayToss={onPayToss} />
    </section>
  );
}
