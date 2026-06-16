import { colors } from '../../lib/theme';
import { timeAgo } from '../../lib/timeAgo';
import { formatGuestPrefix } from '../../lib/guestLabel';
import type { FeedItem } from '@gorae/contracts';

interface Props {
  item: FeedItem;
  loungeId: string;
}

export function FeedItemGuestbookEntry({ item }: Props) {
  const data = item.data as {
    guest_name?: string;
    relation_category?: string;
    relation_detail?: string;
    recipient_slot?: string;
  };

  const guestName = data.guest_name ?? '(알 수 없음)';
  const relationTag = formatGuestPrefix(data.recipient_slot, data.relation_category, data.relation_detail);

  return (
    <div style={{ padding: '4px 0' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 12px',
          backgroundColor: 'rgba(0,0,0,0.03)',
          borderRadius: 12,
        }}
      >
        <p style={{ flex: 1, fontSize: 15, color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
          {relationTag && (
            <span style={{ color: colors.brand, fontWeight: 600 }}>{relationTag} </span>
          )}
          <span style={{ fontStyle: 'normal', color: '#3B82C8', fontWeight: 600 }}>{guestName}</span>
          님이 <span style={{ color: colors.brand, fontWeight: 600 }}>현장에 참석했어요</span>
        </p>
        <span style={{ fontSize: 14, color: colors.textMuted, flexShrink: 0 }}>
          {timeAgo(item.created_at)}
        </span>
      </div>

    </div>
  );
}
