import { useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { serif, colors } from '../../styles/tokens';
import { useT } from '../../lib/i18n';

interface Props {
  visible: boolean;
  onDone: () => void;
}

function EnvelopeSVG({ onComplete }: { onComplete: () => void }) {
  const controls = useAnimation();

  useEffect(() => {
    async function play() {
      controls.set({ y: 60, opacity: 0, rotate: -8, scale: 0.9 });
      await controls.start({
        y: 0, opacity: 1, rotate: 0, scale: 1,
        transition: { type: 'spring', damping: 20, stiffness: 160 },
      });
      await controls.start({
        rotate: [0, -3, 3, -2, 2, 0],
        transition: { duration: 0.5, ease: 'easeInOut' },
      });
      onComplete();
    }
    play();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div animate={controls} style={{ userSelect: 'none', pointerEvents: 'none' }}>
      <svg width="80" height="56" viewBox="0 0 80 56" fill="none">
        <rect x="1" y="1" width="78" height="54" rx="6" fill="#F5EDD8" stroke="#E8A0AD" strokeWidth="1.5" />
        <path d="M1 1 L40 30 L1 55" stroke="#E8A0AD" strokeWidth="1" fill="none" />
        <path d="M79 1 L40 30 L79 55" stroke="#E8A0AD" strokeWidth="1" fill="none" />
        <path d="M1 1 L40 30 L79 1 Z" fill="#EDD9B0" stroke="#E8A0AD" strokeWidth="1" />
        <circle cx="40" cy="30" r="8" fill="#D4687A" />
        <text x="40" y="34" textAnchor="middle" fontSize="9" fill="rgba(255,240,235,0.9)" fontFamily="serif">&#9829;</text>
      </svg>
    </motion.div>
  );
}

export function EnvelopeSendingOverlay({ visible, onDone }: Props) {
  const t = useT();
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            background: colors.bgWarm,
          }}
        >
          <EnvelopeSVG onComplete={onDone} />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            style={{ ...serif, fontSize: 16, color: colors.textSubtle }}
          >
            {t('guestFlow.envelopeSending')}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
