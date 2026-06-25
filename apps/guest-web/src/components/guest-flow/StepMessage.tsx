import { useState } from 'react';
import { motion } from 'framer-motion';
import { serif, springs, colors } from '../../styles/tokens';
import { useT } from '../../lib/i18n';

function HeartSVG({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 100 90" fill="none">
      <path
        d="M50 82 C50 82 8 52 8 28 C8 16 18 8 30 8 C38 8 46 13 50 20 C54 13 62 8 70 8 C82 8 92 16 92 28 C92 52 50 82 50 82Z"
        fill="#E8A0AD"
        opacity="0.85"
      />
    </svg>
  );
}

interface StepMessageProps {
  onSendMessage: (message: string) => void;
  onSendHeart: () => void;
  error: string | null;
  /** 머신 sendingMessage(POST .../message) 진행 중 — 버튼 잠금(중복 제출 방지) */
  isSubmitting?: boolean;
}

export function StepMessage({ onSendMessage, onSendHeart, error, isSubmitting = false }: StepMessageProps) {
  const t = useT();
  const [message, setMessage] = useState('');
  const [useHeart, setUseHeart] = useState(false);

  const canSend = useHeart || message.trim().length > 0;
  const disabled = !canSend || isSubmitting;

  const handleSend = () => {
    if (disabled) return;
    if (useHeart) {
      onSendHeart();
    } else {
      onSendMessage(message.trim());
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 24px 32px', maxWidth: 420, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <p style={{ ...serif, fontSize: 20, color: colors.textHeading, textAlign: 'center', marginBottom: 24 }}>
        {t('guestFlow.message.title')}
      </p>

      {error && (
        <div style={{
          padding: 12, marginBottom: 16, borderRadius: 12,
          background: 'rgba(232,70,90,0.08)', border: '1px solid rgba(232,70,90,0.2)',
        }}>
          <p style={{ ...serif, fontSize: 14, color: '#E8465A' }}>{error}</p>
        </div>
      )}

      <div style={{ minHeight: 260 }}>
        {useHeart ? (
          <div style={{ display: 'flex', height: 260, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <HeartSVG size={96} />
            <p style={{ ...serif, fontSize: 16, color: colors.textSubtle }}>{t('guestFlow.message.heartCaption')}</p>
          </div>
        ) : (
          <div>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, border: `1px solid ${colors.border}` }}>
              <div
                style={{
                  pointerEvents: 'none',
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(180,155,100,0.12) 31px, rgba(180,155,100,0.12) 32px)',
                  backgroundPositionY: '40px',
                }}
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 60))}
                placeholder={t('guestFlow.message.placeholder')}
                rows={5}
                maxLength={60}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: '100%',
                  resize: 'none',
                  background: 'rgba(255,253,249,0.8)',
                  border: 'none',
                  outline: 'none',
                  padding: '44px 20px 16px',
                  lineHeight: '32px',
                  fontSize: 18,
                  color: colors.textBody,
                  boxSizing: 'border-box',
                  ...serif,
                }}
              />
            </div>
            <p style={{ marginTop: 8, textAlign: 'right', fontSize: 14, color: colors.textSubtle }}>
              {message.length}/60
            </p>
          </div>
        )}
      </div>

      <label style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={useHeart}
          onChange={(e) => setUseHeart(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: colors.accent, outline: 'none' }}
        />
        <span style={{ ...serif, fontSize: 16, color: colors.textMuted }}>{t('guestFlow.message.heartOnly')}</span>
      </label>

      <motion.button
        whileTap={{ scale: 0.95 }}
        transition={springs.snappy}
        onClick={handleSend}
        disabled={disabled}
        style={{
          marginTop: 32, height: 56, width: '100%', borderRadius: 16,
          fontSize: 18, fontWeight: 500, color: '#fff', background: colors.accent,
          opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer',
          border: 'none', ...serif,
        }}
      >
        {isSubmitting ? t('guestFlow.message.sending') : t('guestFlow.message.send')}
      </motion.button>
    </div>
  );
}
