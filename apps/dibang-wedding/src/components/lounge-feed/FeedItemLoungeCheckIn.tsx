import { colors } from '../../lib/theme';
import { timeAgo } from '../../lib/timeAgo';
import { SIDE_LABEL, formatGuestPrefix } from '../../lib/guestLabel';
import type { FeedItem } from '@gorae/contracts';

interface Props {
  item: FeedItem;
}

export function FeedItemLoungeCheckIn({ item }: Props) {
  const data = (item.data ?? {}) as {
    visitor_name?: string;
    is_host?: boolean;
    host_role?: string;
    recipient_slot?: string;
    relation_category?: string;
    relation_detail?: string;
  };
  const visitorName = data.visitor_name ?? '(알 수 없음)';
  const isHost = data.is_host ?? false;
  const hostRoleLabel = data.host_role ? (SIDE_LABEL[data.host_role] ?? null) : null;

  const guestPrefix = !isHost
    ? formatGuestPrefix(data.recipient_slot, data.relation_category, data.relation_detail)
    : '';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 12px',
        margin: '8px 0',
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 12,
      }}
    >
      <p style={{ flex: 1, fontSize: 15, color: colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
        {isHost && hostRoleLabel && (
          <span style={{ color: colors.brand, fontWeight: 600 }}>{hostRoleLabel} </span>
        )}
        {!isHost && guestPrefix && (
          <span style={{ color: colors.brand, fontWeight: 600 }}>{guestPrefix} </span>
        )}
        <span style={{ fontStyle: 'normal', color: '#3B82C8', fontWeight: 600 }}>{visitorName}</span>
        님이 라운지에 입장했어요
      </p>
      <span style={{ fontSize: 14, color: colors.textMuted, flexShrink: 0 }}>
        {timeAgo(item.created_at)}
      </span>
    </div>
  );
}
