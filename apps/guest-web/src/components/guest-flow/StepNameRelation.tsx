import { useState } from 'react';
import { motion } from 'framer-motion';
import type { RelationCategory } from '../../machines/guestFlow.machine';
import { serif, springs, colors } from '../../styles/tokens';
import { useT } from '../../lib/i18n';

const RELATION_CATEGORIES: RelationCategory[] = [
  '가족/친척', '친구/지인', '동문/동창', '직장동료', '스승/제자', '기타모임',
];

// Korean backend VALUE → display label i18n key (values stay as data).
const RELATION_LABEL_KEYS: Record<RelationCategory, string> = {
  '가족/친척': 'loungeCheckIn.relation.family',
  '친구/지인': 'loungeCheckIn.relation.friend',
  '동문/동창': 'loungeCheckIn.relation.alumni',
  '직장동료': 'loungeCheckIn.relation.coworker',
  '스승/제자': 'loungeCheckIn.relation.mentor',
  '기타모임': 'loungeCheckIn.relation.other',
};

interface StepNameRelationProps {
  hostLabel: string;
  onSubmit: (name: string, category: RelationCategory, detail: string) => void;
  /** 머신 creating(POST /guestbook) 진행 중 — 제출 버튼 잠금(중복 제출 방지) */
  isSubmitting?: boolean;
}

export function StepNameRelation({ hostLabel, onSubmit, isSubmitting = false }: StepNameRelationProps) {
  const t = useT();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<RelationCategory | ''>('');
  const [detail, setDetail] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [detailFocused, setDetailFocused] = useState(false);

  const isValid = name.trim().length > 0 && category !== '';
  const disabled = !isValid || isSubmitting;

  const handleSubmit = () => {
    if (disabled) return;
    onSubmit(name.trim(), category as RelationCategory, detail.trim());
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 24px 32px', maxWidth: 420, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ ...serif, fontSize: 20, color: colors.textHeading }}>{t('guestFlow.nameRelation.title')}</p>
      </div>

      <div style={{ paddingTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 관계 카테고리 선택 */}
        <div>
          <p style={{ ...serif, fontSize: 18, color: colors.textSubtle, marginBottom: 6, paddingLeft: 4 }}>
            {t('guestFlow.nameRelation.relationTo', { host: hostLabel })}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {RELATION_CATEGORIES.map((cat) => (
              <motion.button
                key={cat}
                whileTap={{ scale: 0.95 }}
                transition={springs.snappy}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '10px 4px',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: category === cat ? 600 : 400,
                  color: category === cat ? '#fff' : colors.textMuted,
                  background: category === cat ? colors.accent : colors.bgButton,
                  border: `1px solid ${category === cat ? colors.accent : colors.borderAccent}`,
                  cursor: 'pointer',
                  ...serif,
                }}
              >
                {t(RELATION_LABEL_KEYS[cat])}
              </motion.button>
            ))}
          </div>
        </div>

        {/* 관계 상세 */}
        <div>
          <p style={{ ...serif, fontSize: 18, color: colors.textSubtle, marginBottom: 6, paddingLeft: 4 }}>
            {t('guestFlow.nameRelation.detailLabel')}
          </p>
          <div style={{ borderRadius: 16, border: `1px solid ${colors.border}`, background: 'rgba(255,253,249,0.8)', padding: '16px 20px' }}>
            <input
              type="text"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={detailFocused ? '' : t('guestFlow.nameRelation.detailPlaceholder')}
              maxLength={40}
              onFocus={() => setDetailFocused(true)}
              onBlur={() => setDetailFocused(false)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                textAlign: 'center',
                fontSize: 18,
                letterSpacing: '0.05em',
                color: colors.textMuted,
                ...serif,
              }}
            />
          </div>
        </div>

        {/* 이름 */}
        <div>
          <p style={{ ...serif, fontSize: 18, color: colors.textSubtle, marginBottom: 6, paddingLeft: 4 }}>
            {t('guestFlow.nameRelation.nameLabel')}
          </p>
          <div style={{ borderRadius: 16, border: `1px solid ${colors.border}`, background: 'rgba(255,253,249,0.8)', padding: '16px 20px' }}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={nameFocused ? '' : t('guestFlow.nameRelation.namePlaceholder')}
              maxLength={10}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                textAlign: 'center',
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: name ? colors.textBody : colors.textDisabled,
                ...serif,
              }}
            />
          </div>
        </div>
      </div>

      <motion.button
        whileTap={!disabled ? { scale: 0.95 } : undefined}
        transition={springs.snappy}
        onClick={handleSubmit}
        disabled={disabled}
        style={{
          marginTop: 32,
          height: 56,
          width: '100%',
          borderRadius: 16,
          fontSize: 18,
          fontWeight: 500,
          color: '#fff',
          background: colors.accent,
          opacity: disabled ? 0.4 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          border: 'none',
          ...serif,
        }}
      >
        {isSubmitting ? t('guestFlow.nameRelation.submitting') : t('guestFlow.nameRelation.next')}
      </motion.button>
    </div>
  );
}
