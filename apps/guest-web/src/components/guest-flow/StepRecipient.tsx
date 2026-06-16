import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Wedding } from '@gorae/contracts';
import type { RecipientSlot } from '../../machines/guestFlow.machine';
import { serif, colors } from '../../styles/tokens';

const HERO_H = 384;

interface SlotDef {
  slot: RecipientSlot;
  label: string;
  nameKey: 'groom_name' | 'bride_name' | 'groom_father_name' | 'groom_mother_name' | 'bride_father_name' | 'bride_mother_name';
  side: 'groom' | 'bride';
}

const GROOM_SLOTS: SlotDef[] = [
  { slot: 'groom', label: '신랑', nameKey: 'groom_name', side: 'groom' },
  { slot: 'groom_father', label: '신랑 아버지', nameKey: 'groom_father_name', side: 'groom' },
  { slot: 'groom_mother', label: '신랑 어머니', nameKey: 'groom_mother_name', side: 'groom' },
];

const BRIDE_SLOTS: SlotDef[] = [
  { slot: 'bride', label: '신부', nameKey: 'bride_name', side: 'bride' },
  { slot: 'bride_father', label: '신부 아버지', nameKey: 'bride_father_name', side: 'bride' },
  { slot: 'bride_mother', label: '신부 어머니', nameKey: 'bride_mother_name', side: 'bride' },
];

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${y}. ${m}. ${d}`;
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h < 12 ? '오전' : '오후';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${period} ${h12}시` : `${period} ${h12}시 ${m}분`;
}

interface StepRecipientProps {
  wedding: Wedding;
  onSelect: (slot: RecipientSlot, label: string) => void;
}

export function StepRecipient({ wedding, onSelect }: StepRecipientProps) {
  const { info } = wedding;
  const containerRef = useRef<HTMLDivElement>(null);

  const coverImage = wedding.invitations?.[0]?.cover_image;

  const groomButtons = GROOM_SLOTS.filter((d) => info[d.nameKey]);
  const brideButtons = BRIDE_SLOTS.filter((d) => info[d.nameKey]);

  const venueName = info.venue?.venue_name ?? '';

  const [groomOpen, setGroomOpen] = useState(false);
  const [brideOpen, setBrideOpen] = useState(false);

  return (
    <div>
      {/* Hero Section */}
      <div ref={containerRef} style={{ position: 'relative', height: HERO_H, overflow: 'hidden' }}>
        {coverImage ? (
          <img
            src={coverImage}
            alt="커플 사진"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg, #e8dcc8 0%, #d4c4a0 100%)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 35%, rgba(15,11,8,0.62) 100%)' }} />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: '0 0 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 24 }}
        >
          <p style={{ ...serif, fontSize: 26, letterSpacing: '0.22em', color: '#fff' }}>
            {info.groom_name} · {info.bride_name}
          </p>
          <p style={{ ...serif, fontSize: 14, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.75)', marginTop: 8 }}>
            {formatDate(info.date)}{info.time && <>&nbsp;&nbsp;{formatTime(info.time)}</>}
          </p>
          <p style={{ ...serif, fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{venueName}</p>
        </motion.div>
      </div>

      {/* Host Selector */}
      <div style={{ flex: 1, padding: '28px 20px 24px', maxWidth: 420, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35, ease: 'easeOut' }}
          style={{ ...serif, marginBottom: 28, textAlign: 'center', fontSize: 18, lineHeight: 1.7, color: colors.textHeading }}
        >
          방명록 작성, 축의, 사진 공유를 할 수 있어요.<br />어느 분의 하객으로 오셨나요?
        </motion.p>

        {groomButtons.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.35, ease: 'easeOut' }}
            style={{ marginBottom: 12, borderRadius: 16, border: `1px solid ${colors.border}`, overflow: 'hidden' }}
          >
            <button
              onClick={() => setGroomOpen((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 16px', background: colors.bgAccentSubtle, borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: groomOpen ? `1px solid ${colors.borderLight}` : 'none', cursor: 'pointer' }}
            >
              <p style={{ ...serif, fontSize: 18, letterSpacing: '0.14em', color: colors.accent, margin: 0 }}>신랑측</p>
              <span style={{ fontSize: 28, fontWeight: 300, color: colors.accent, transition: 'transform 0.2s', transform: groomOpen ? 'rotate(90deg)' : 'rotate(0deg)', lineHeight: 1 }}>&#8250;</span>
            </button>
            <AnimatePresence initial={false}>
              {groomOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden', background: 'rgba(255,255,255,0.75)' }}
                >
                  {groomButtons.map((btn, i) => (
                    <motion.button
                      key={btn.slot}
                      whileTap={{ opacity: 0.6 }}
                      onClick={() => onSelect(btn.slot, `${btn.label} ${info[btn.nameKey]}`)}
                      style={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        borderTop: i > 0 ? `1px solid ${colors.bgMuted}` : 'none',
                        background: 'none',
                        border: i > 0 ? undefined : 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ ...serif, fontSize: 20, color: '#3D3026' }}>{btn.label} {info[btn.nameKey]}</span>
                      <span style={{ fontSize: 18, color: colors.accentLight }}>&#8250;</span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {brideButtons.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.35, ease: 'easeOut' }}
            style={{ borderRadius: 16, border: `1px solid ${colors.border}`, overflow: 'hidden' }}
          >
            <button
              onClick={() => setBrideOpen((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 16px', background: colors.bgAccentSubtle, borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: brideOpen ? `1px solid ${colors.borderLight}` : 'none', cursor: 'pointer' }}
            >
              <p style={{ ...serif, fontSize: 18, letterSpacing: '0.14em', color: colors.accent, margin: 0 }}>신부측</p>
              <span style={{ fontSize: 28, fontWeight: 300, color: colors.accent, transition: 'transform 0.2s', transform: brideOpen ? 'rotate(90deg)' : 'rotate(0deg)', lineHeight: 1 }}>&#8250;</span>
            </button>
            <AnimatePresence initial={false}>
              {brideOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden', background: 'rgba(255,255,255,0.75)' }}
                >
                  {brideButtons.map((btn, i) => (
                    <motion.button
                      key={btn.slot}
                      whileTap={{ opacity: 0.6 }}
                      onClick={() => onSelect(btn.slot, `${btn.label} ${info[btn.nameKey]}`)}
                      style={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        borderTop: i > 0 ? `1px solid ${colors.bgMuted}` : 'none',
                        background: 'none',
                        border: i > 0 ? undefined : 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ ...serif, fontSize: 20, color: '#3D3026' }}>{btn.label} {info[btn.nameKey]}</span>
                      <span style={{ fontSize: 18, color: colors.accentLight }}>&#8250;</span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
