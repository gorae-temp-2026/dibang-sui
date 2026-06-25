import { useState } from 'react';
import { colors, fonts } from '../../lib/theme';
import { useT } from '../../lib/i18n';
import type { Announcement } from '../../types/db-compat';

interface Props {
  currentAnnouncement?: Announcement;
  onSubmit: (message: string) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  isSubmitting?: boolean;
  isDeleting?: boolean;
}

export function AnnouncementForm({
  currentAnnouncement,
  onSubmit,
  onDelete,
  isSubmitting,
  isDeleting,
}: Props) {
  const [message, setMessage] = useState('');
  const t = useT();

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const result = onSubmit(trimmed);
    if (result && typeof (result as Promise<void>).then === 'function') {
      (result as Promise<void>).then(() => setMessage(''));
    } else {
      setMessage('');
    }
  };

  return (
    <div>
      {/* 현재 공지 표시 */}
      {currentAnnouncement ? (
        <div
          style={{
            backgroundColor: colors.surfaceWarm,
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 14, color: colors.textMuted, margin: '0 0 6px' }}>{t('feed.announcement.current')}</p>
          <p style={{
            fontSize: 16,
            color: colors.textPrimary,
            margin: 0,
            lineHeight: 1.6,
            fontFamily: fonts.serif.family,
          }}>
            {currentAnnouncement.message}
          </p>
        </div>
      ) : (
        <p style={{ fontSize: 14, color: colors.textMuted, margin: '0 0 16px' }}>
          {t('feed.announcement.none')}
        </p>
      )}

      {/* 입력 */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, 100))}
        placeholder={currentAnnouncement ? t('feed.announcement.replacePlaceholder') : t('feed.announcement.newPlaceholder')}
        maxLength={100}
        rows={3}
        style={{
          border: `1px solid ${colors.borderWarm}`,
          borderRadius: 10,
          padding: '12px 14px',
          width: '100%',
          fontSize: 15,
          fontFamily: fonts.serif.family,
          boxSizing: 'border-box',
          color: colors.textPrimary,
          resize: 'none',
          outline: 'none',
        }}
      />
      <p style={{ fontSize: 14, color: colors.textMuted, textAlign: 'right', margin: '4px 0 12px' }}>
        {message.length}/100
      </p>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !message.trim()}
          style={{
            flex: 1,
            border: 'none',
            background: !message.trim() ? colors.borderWarm : colors.brand,
            color: !message.trim() ? colors.textMuted : colors.white,
            padding: '12px 16px',
            cursor: !message.trim() ? 'default' : 'pointer',
            fontSize: 15,
            fontWeight: 600,
            borderRadius: 10,
          }}
        >
          {currentAnnouncement ? t('feed.announcement.replace') : t('feed.announcement.post')}
        </button>
        {currentAnnouncement && (
          <button
            type="button"
            onClick={() => onDelete()}
            disabled={isDeleting}
            style={{
              border: `1px solid ${colors.borderWarm}`,
              background: colors.bgWarm,
              color: colors.textSecondary,
              padding: '12px 16px',
              cursor: 'pointer',
              fontSize: 15,
              borderRadius: 10,
            }}
          >
            {t('feed.announcement.delete')}
          </button>
        )}
      </div>
    </div>
  );
}
