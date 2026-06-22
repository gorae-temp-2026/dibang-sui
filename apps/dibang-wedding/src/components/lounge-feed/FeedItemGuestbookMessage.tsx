import { colors, fonts } from '../../lib/theme';
import { formatGuestPrefix } from '../../lib/guestLabel';
import type { FeedItem } from '../../types/db-compat';

interface Props {
  item: FeedItem;
  /** 호출부 호환용. 하트 비노출 결정으로 현재 미사용. */
  loungeId?: string;
}

export function FeedItemGuestbookMessage({ item }: Props) {
  const data = item.data as {
    guest_name?: string;
    relation_category?: string;
    relation_detail?: string;
    recipient_slot?: string;
    message?: string;
  };

  const guestName = data.guest_name ?? '(알 수 없음)';
  const message = data.message ?? '';
  const isHeart = message === '__HEART__';

  const relationTag = formatGuestPrefix(data.recipient_slot, data.relation_category, data.relation_detail);

  return (
    <div style={{ padding: '10px 0' }}>
      {/* 카드 + 댓글 통합 (QA 2026-05-29: 'LIVE 축하메세지'·시각 헤더 제거) */}
      <div
        style={{
          backgroundColor: colors.bgWarm,
          border: `1px solid ${colors.borderWarm}`,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {/* 메세지 본문 */}
        <div style={{ padding: '14px 16px' }}>
          {isHeart ? (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={colors.brand} stroke="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
          ) : (
            <p
              style={{
                fontSize: 16,
                color: colors.textPrimary,
                margin: 0,
                lineHeight: 1.6,
                fontFamily: fonts.serif.family,
              }}
            >
              {message}
            </p>
          )}

          {/* 하트 + 작성자 */}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
            <p style={{ fontSize: 15, color: colors.textMuted, margin: 0, marginLeft: 'auto' }}>
              {relationTag && (
                <span style={{ color: colors.textSecondary }}>{relationTag}</span>
              )}
              {relationTag && ' '}
              <span style={{ fontWeight: 600, color: '#3B82C8' }}>{guestName}</span>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
