import { motion } from 'framer-motion';
import type { Wedding, Account } from '@gorae/contracts';
import type { RecipientSlot, PayMethod } from '../../machines/guestFlow.machine';
import { serif, springs, colors } from '../../styles/tokens';
import { buildTossLink, buildKakaoLink } from '../../lib/payDeepLink';
import { useDeepLinkReturn } from '../../hooks/useDeepLinkReturn';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

const ACCOUNT_KEYS: Record<RecipientSlot, keyof Wedding['info']> = {
  groom: 'groom_account',
  bride: 'bride_account',
  groom_father: 'groom_father_account',
  groom_mother: 'groom_mother_account',
  bride_father: 'bride_father_account',
  bride_mother: 'bride_mother_account',
};

interface StepTransferProps {
  wedding: Wedding;
  recipientSlot: RecipientSlot;
  amount: number;
  onConfirm: (payMethod: PayMethod) => void;
  /** 외부 결제 앱(토스/카카오페이)로의 이동을 page가 책임지도록 콜백 위임 (UI/데이터 분리 1-D) */
  onDeepLinkNavigate: (url: string) => void;
  /** 머신 transferring(POST /cash-gifts) 진행 중 — 확인 버튼 잠금(중복 제출 방지) */
  isSubmitting?: boolean;
}

export function StepTransfer({ wedding, recipientSlot, amount, onConfirm, onDeepLinkNavigate, isSubmitting = false }: StepTransferProps) {
  // 명시적 확인 버튼 가드(딥링크 복귀 자동 onConfirm은 머신이 transferring에서 무시).
  const handleConfirm = () => {
    if (isSubmitting) return;
    onConfirm('transfer');
  };

  const accountKey = ACCOUNT_KEYS[recipientSlot];
  const account = wedding.info[accountKey] as Account | undefined;
  const bankName = account?.bank ?? '';
  const accountNumber = account?.address ?? '';

  // 딥링크 복귀 감지 → 자동 onConfirm.
  const { markWaiting } = useDeepLinkReturn(() => onConfirm('transfer'));
  const { isCopied: copied, copy } = useCopyToClipboard();

  function handleToss() {
    markWaiting();
    onDeepLinkNavigate(buildTossLink({ bankName, accountNumber, amount }));
  }

  function handleKakaoPay() {
    const url = buildKakaoLink({ bankName, accountNumber, amount });
    if (!url) return;
    markWaiting();
    onDeepLinkNavigate(url);
  }

  function handleCopy() {
    void copy(accountNumber);
  }

  if (!account || !accountNumber) {
    return (
      <div style={{ padding: '24px 24px 32px' }}>
        <p style={{ ...serif, fontSize: 16, color: '#E8465A' }}>계좌 정보가 등록되지 않았습니다.</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={springs.snappy}
          onClick={handleConfirm}
          disabled={isSubmitting}
          style={{
            marginTop: 16, height: 56, width: '100%', borderRadius: 16, fontSize: 18, fontWeight: 500,
            color: '#fff', background: colors.accent, border: 'none',
            opacity: isSubmitting ? 0.4 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer', ...serif,
          }}
        >
          {isSubmitting ? '처리 중…' : '다음으로'}
        </motion.button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 24px 32px', maxWidth: 420, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ ...serif, fontSize: 16, color: colors.textMuted }}>축의금 전달</p>
        <p style={{ ...serif, marginTop: 4, fontSize: 24, fontWeight: 700 }}>
          &#8361; {amount.toLocaleString()}
        </p>
      </div>

      {/* 계좌 정보 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderRadius: 16, padding: 16, background: colors.bgWarm,
        border: `1px solid ${colors.border}`, marginBottom: 12,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <p style={{ fontSize: 14, color: colors.textSubtle }}>{bankName}</p>
          <p style={{ ...serif, fontSize: 20, fontWeight: 500, color: colors.textPrimary }}>{accountNumber}</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={springs.snappy}
          onClick={handleCopy}
          style={{
            padding: '6px 14px', borderRadius: 8,
            border: `1px solid ${colors.border}`, background: 'rgba(255,255,255,0.8)',
            fontSize: 16, color: colors.textMuted, cursor: 'pointer',
          }}
        >
          {copied ? '복사 완료' : '복사'}
        </motion.button>
      </div>

      <p style={{ ...serif, textAlign: 'center', fontSize: 14, color: colors.textSubtle }}>
        버튼을 누르면 앱으로 이동합니다
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={springs.snappy}
          onClick={handleToss}
          style={{
            height: 48, width: '100%', borderRadius: 12, fontSize: 17, fontWeight: 500,
            color: colors.accent, background: colors.bgButton,
            border: `1px solid ${colors.borderAccent}`, cursor: 'pointer', ...serif,
          }}
        >
          토스로 송금
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={springs.snappy}
          onClick={handleKakaoPay}
          style={{
            height: 48, width: '100%', borderRadius: 12, fontSize: 17, fontWeight: 500,
            color: colors.accent, background: colors.bgButton,
            border: `1px solid ${colors.borderAccent}`, cursor: 'pointer', ...serif,
          }}
        >
          카카오페이로 송금
        </motion.button>
      </div>

      <div style={{ flex: 1 }} />

      <motion.button
        whileTap={{ scale: 0.95 }}
        transition={springs.snappy}
        onClick={handleConfirm}
        disabled={isSubmitting}
        style={{
          height: 56, width: '100%', borderRadius: 16, fontSize: 18, fontWeight: 500,
          color: '#fff', background: colors.accent, border: 'none',
          opacity: isSubmitting ? 0.4 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer', ...serif,
        }}
      >
        {isSubmitting ? '처리 중…' : '메시지로 이동'}
      </motion.button>
    </div>
  );
}
