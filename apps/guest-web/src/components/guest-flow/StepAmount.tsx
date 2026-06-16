import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { amountToKorean } from '../../lib/formatAmount';
import { serif, springs, colors } from '../../styles/tokens';

interface StepAmountProps {
  onSelectAmount: (amount: number) => void;
  onAlreadyPaid: () => void;
  onSkip: () => void;
  hasAccount?: boolean;
  hostLabel?: string;
}

const MIN = 0;
const MAX = 10_000_000;
const STEP_SMALL = 10_000;
const STEP_LARGE = 50_000;
const STEP_XLARGE = 100_000;

export function StepAmount({ onSelectAmount, onAlreadyPaid, onSkip, hasAccount = true, hostLabel }: StepAmountProps) {
  const [amount, setAmount] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const isValid = amount > 0 && amount <= MAX;
  const korean = amountToKorean(amount);

  function adjust(delta: number) {
    setAmount((prev) => Math.min(MAX, Math.max(MIN, prev + delta)));
  }

  function handleAmountButtonClick(delta: number) {
    if (!hasAccount && amount === 0 && delta > 0) {
      setShowModal(true);
      return;
    }
    adjust(delta);
  }

  const canIncrease = amount + STEP_SMALL <= MAX;
  const canDecrease = amount - STEP_SMALL >= MIN;
  const canIncreaseLarge = amount + STEP_LARGE <= MAX;
  const canDecreaseLarge = amount > MIN;
  const canIncreaseXLarge = amount + STEP_XLARGE <= MAX;
  const canDecreaseXLarge = amount > MIN;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 24px 32px', maxWidth: 420, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ ...serif, fontSize: 18, letterSpacing: '0.15em', color: colors.textMuted }}>축의를 담아요</p>
        <p style={{ ...serif, marginTop: 16, fontSize: 20, color: colors.textHeading }}>축의금 금액을 정해주세요</p>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', paddingTop: 56 }}>
          {/* 직접 입력 가능 — 버튼 조정과 양방향. 표시는 콤마 포맷, 입력은 숫자만 파싱. */}
          <input
            inputMode="numeric"
            value={amount > 0 ? amount.toLocaleString('ko-KR') : ''}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/[^0-9]/g, ''));
              setAmount(Math.min(MAX, Math.max(MIN, Number.isNaN(n) ? 0 : n)));
            }}
            placeholder="0원"
            aria-label="축의금 금액 직접 입력"
            style={{
              ...serif,
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: amount > 0 ? colors.textPrimary : colors.textDisabled,
              margin: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              textAlign: 'center',
              width: '100%',
            }}
          />
          <p style={{ ...serif, fontSize: 17, color: colors.textSubtle, marginTop: 6, visibility: korean ? 'visible' : 'hidden' }}>
            {korean || '\u00A0'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', marginTop: 32 }}>
          <motion.button
            whileTap={canDecrease ? { scale: 0.95 } : undefined}
            transition={springs.snappy}
            onClick={() => adjust(-STEP_SMALL)}
            disabled={!canDecrease}
            style={{
              ...serif, height: 48, borderRadius: 12, fontSize: 17, fontWeight: 500,
              color: canDecrease ? colors.accent : colors.accentDisabled,
              background: canDecrease ? colors.bgButton : colors.bgButtonDisabled,
              border: `1px solid ${canDecrease ? colors.borderAccent : colors.borderAccentDisabled}`,
              cursor: canDecrease ? 'pointer' : 'default',
            }}
          >
            -1만
          </motion.button>
          <motion.button
            whileTap={canIncrease ? { scale: 0.95 } : undefined}
            transition={springs.snappy}
            onClick={() => handleAmountButtonClick(STEP_SMALL)}
            disabled={!canIncrease}
            style={{
              ...serif, height: 48, borderRadius: 12, fontSize: 17, fontWeight: 500,
              color: canIncrease ? colors.accent : colors.accentDisabled,
              background: canIncrease ? colors.bgButton : colors.bgButtonDisabled,
              border: `1px solid ${canIncrease ? colors.borderAccent : colors.borderAccentDisabled}`,
              cursor: canIncrease ? 'pointer' : 'default',
            }}
          >
            +1만
          </motion.button>
          <motion.button
            whileTap={canDecreaseLarge ? { scale: 0.95 } : undefined}
            transition={springs.snappy}
            onClick={() => adjust(-STEP_LARGE)}
            disabled={!canDecreaseLarge}
            style={{
              ...serif, height: 48, borderRadius: 12, fontSize: 17, fontWeight: 500,
              color: canDecreaseLarge ? colors.accent : colors.accentDisabled,
              background: canDecreaseLarge ? colors.bgButton : colors.bgButtonDisabled,
              border: `1px solid ${canDecreaseLarge ? colors.borderAccent : colors.borderAccentDisabled}`,
              cursor: canDecreaseLarge ? 'pointer' : 'default',
            }}
          >
            -5만
          </motion.button>
          <motion.button
            whileTap={canIncreaseLarge ? { scale: 0.95 } : undefined}
            transition={springs.snappy}
            onClick={() => handleAmountButtonClick(STEP_LARGE)}
            disabled={!canIncreaseLarge}
            style={{
              ...serif, height: 48, borderRadius: 12, fontSize: 17, fontWeight: 500,
              color: canIncreaseLarge ? colors.accent : colors.accentDisabled,
              background: canIncreaseLarge ? colors.bgButton : colors.bgButtonDisabled,
              border: `1px solid ${canIncreaseLarge ? colors.borderAccent : colors.borderAccentDisabled}`,
              cursor: canIncreaseLarge ? 'pointer' : 'default',
            }}
          >
            +5만
          </motion.button>
          <motion.button
            whileTap={canDecreaseXLarge ? { scale: 0.95 } : undefined}
            transition={springs.snappy}
            onClick={() => adjust(-STEP_XLARGE)}
            disabled={!canDecreaseXLarge}
            style={{
              ...serif, height: 48, borderRadius: 12, fontSize: 17, fontWeight: 500,
              color: canDecreaseXLarge ? colors.accent : colors.accentDisabled,
              background: canDecreaseXLarge ? colors.bgButton : colors.bgButtonDisabled,
              border: `1px solid ${canDecreaseXLarge ? colors.borderAccent : colors.borderAccentDisabled}`,
              cursor: canDecreaseXLarge ? 'pointer' : 'default',
            }}
          >
            -10만
          </motion.button>
          <motion.button
            whileTap={canIncreaseXLarge ? { scale: 0.95 } : undefined}
            transition={springs.snappy}
            onClick={() => handleAmountButtonClick(STEP_XLARGE)}
            disabled={!canIncreaseXLarge}
            style={{
              ...serif, height: 48, borderRadius: 12, fontSize: 17, fontWeight: 500,
              color: canIncreaseXLarge ? colors.accent : colors.accentDisabled,
              background: canIncreaseXLarge ? colors.bgButton : colors.bgButtonDisabled,
              border: `1px solid ${canIncreaseXLarge ? colors.borderAccent : colors.borderAccentDisabled}`,
              cursor: canIncreaseXLarge ? 'pointer' : 'default',
            }}
          >
            +10만
          </motion.button>
        </div>
      </div>

      <motion.button
        whileTap={isValid ? { scale: 0.95 } : undefined}
        transition={springs.snappy}
        onClick={() => onSelectAmount(amount)}
        disabled={!isValid}
        style={{
          marginTop: 32, height: 56, width: '100%', borderRadius: 16, fontSize: 18, fontWeight: 500,
          color: '#fff', background: colors.accent, opacity: isValid ? 1 : 0.4,
          cursor: isValid ? 'pointer' : 'not-allowed', border: 'none', ...serif,
        }}
      >
        다음
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.95 }}
        transition={springs.snappy}
        onClick={onAlreadyPaid}
        style={{
          marginTop: 12, height: 56, width: '100%', borderRadius: 16, fontSize: 18, fontWeight: 500,
          color: colors.accent, background: colors.bgButton,
          border: `1px solid ${colors.borderAccent}`, cursor: 'pointer', ...serif,
        }}
      >
        이미 축의했어요
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.95 }}
        transition={springs.snappy}
        onClick={onSkip}
        style={{
          marginTop: 8, height: 48, width: '100%', borderRadius: 16, fontSize: 16, fontWeight: 500,
          color: colors.textMuted, background: 'transparent', border: 'none', cursor: 'pointer', ...serif,
        }}
      >
        건너뛰기
      </motion.button>

      {/* 축의대 안내 모달 */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowModal(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.4)',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              transition={springs.snappy}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 20,
                padding: '36px 28px 28px', width: 'calc(100% - 48px)', maxWidth: 320, textAlign: 'center',
              }}
            >
              <p style={{
                ...serif, fontSize: 20, fontWeight: 600, color: colors.textHeading,
                lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line',
              }}>
                {`${hostLabel ? hostLabel.replace(/\s+\S+$/, '') + '측' : ''} 계좌 정보가\n등록되지 않았습니다.\n축의대를 이용해주세요`}
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                transition={springs.snappy}
                onClick={() => { setShowModal(false); onSkip(); }}
                style={{
                  marginTop: 28, height: 52, width: '100%', borderRadius: 14,
                  fontSize: 17, fontWeight: 500, color: '#fff', background: colors.accent,
                  border: 'none', cursor: 'pointer', ...serif,
                }}
              >
                메시지 전하기
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
