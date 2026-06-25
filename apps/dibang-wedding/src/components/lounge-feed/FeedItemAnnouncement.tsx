import { colors, fonts } from '../../lib/theme';
import { timeAgo } from '../../lib/timeAgo';
import { useT } from '../../lib/i18n';
import { sideLabel } from '../../lib/guestLabel';
import { HeartButton } from './HeartButton';
import { CommentSection } from './CommentSection';
import type { FeedComment, FeedItem } from '../../types/db-compat';

/**
 * 공지 카드 presentational — 데이터/콜백 props만 받아 렌더링.
 * (UI/데이터 분리 1-F: mutation/query 호출은 FeedItemAnnouncementContainer가 책임)
 */
interface Props {
  item: FeedItem;
  comments: FeedComment[];
  isCommentsOpen: boolean;
  onToggleCommentsOpen: () => void;
  onToggleHeart: () => void;
  onCreateComment: (text: string) => Promise<void>;
  onDeleteComment: (commentId: string) => void;
  isHeartPending: boolean;
  isCommentMutating: boolean;
  isCommentsLoading: boolean;
}

export function FeedItemAnnouncement({
  item,
  comments,
  isCommentsOpen,
  onToggleCommentsOpen,
  onToggleHeart,
  onCreateComment,
  onDeleteComment,
  isHeartPending,
  isCommentMutating,
  isCommentsLoading,
}: Props) {
  const t = useT();
  const data = (item.data ?? {}) as { message?: string; is_pinned?: boolean; author_name?: string; author_role?: string };
  const message = data.message ?? '';
  const isPinned = data.is_pinned ?? false;
  const authorName = data.author_name;
  const authorRole = data.author_role ? (sideLabel(data.author_role) || null) : null;

  return (
    <div style={{ padding: '10px 0' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={colors.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={colors.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ fontSize: 14, fontWeight: 600, color: colors.brand }}>
          {t('feed.announcement.label')}{isPinned ? ` ${t('feed.announcement.pinnedSuffix')}` : ''}
        </span>
        <span style={{ fontSize: 14, color: colors.textMuted, marginLeft: 'auto' }}>
          {timeAgo(item.created_at)}
        </span>
      </div>

      {/* 공지 본문 */}
      <div
        style={{
          backgroundColor: colors.bgWarm,
          border: `1px solid ${colors.borderWarm}`,
          borderRadius: 16,
          padding: '14px 16px',
        }}
      >
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
        {authorName && (
          <p style={{ fontSize: 14, color: colors.textMuted, marginTop: 8, marginBottom: 0 }}>
            {authorRole ? `${authorRole} ${authorName}` : authorName}
          </p>
        )}
      </div>

      {/* 하트/댓글 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <HeartButton
          count={item.heart_count ?? 0}
          myHeart={item.my_heart ?? false}
          onToggle={onToggleHeart}
          isPending={isHeartPending}
        />
        <CommentSection
          comments={comments}
          onCreate={onCreateComment}
          onDelete={onDeleteComment}
          commentCount={item.comment_count ?? 0}
          isOpen={isCommentsOpen}
          onToggleOpen={onToggleCommentsOpen}
          isPending={isCommentMutating}
          isLoading={isCommentsLoading}
        />
      </div>
    </div>
  );
}
