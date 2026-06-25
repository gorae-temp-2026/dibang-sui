import { useState } from 'react';
import { colors } from '../../lib/theme';
import { useT } from '../../lib/i18n';
import type { FeedComment } from '../../types/db-compat';

const COMMENT_BG = '#FFF6F8';

/** 댓글 토글 아이콘 버튼 (카드 안에서 사용) */
export function CommentToggleButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px 0',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <svg width={18} height={18} viewBox="0 0 20 20" fill="none">
        <path
          d="M3 4.5C3 3.672 3.672 3 4.5 3H15.5C16.328 3 17 3.672 17 4.5V12.5C17 13.328 16.328 14 15.5 14H6L3 17V4.5Z"
          stroke={colors.textSecondary}
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {count > 0 && (
        <span style={{ fontSize: 14, color: colors.textSecondary }}>{count}</span>
      )}
    </button>
  );
}

interface Props {
  comments: FeedComment[];
  onCreate: (text: string) => Promise<void> | void;
  onDelete: (commentId: string) => Promise<void> | void;
  /** 토글 버튼 옆에 노출되는 카운트 (panelOnly=true이면 무시) */
  commentCount?: number;
  isOpen: boolean;
  onToggleOpen: () => void;
  /** true이면 토글 버튼을 숨기고 패널만 렌더링 */
  panelOnly?: boolean;
  isPending?: boolean;
  /** 패널이 열렸을 때 데이터가 로딩 중이면 true (선택) */
  isLoading?: boolean;
}

export function CommentSection({
  comments,
  onCreate,
  onDelete,
  commentCount,
  isOpen,
  onToggleOpen,
  panelOnly,
  isPending,
  isLoading,
}: Props) {
  const [newComment, setNewComment] = useState('');
  const t = useT();

  const handleSubmit = () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    const result = onCreate(trimmed);
    if (result && typeof (result as Promise<void>).then === 'function') {
      (result as Promise<void>).then(() => setNewComment(''));
    } else {
      setNewComment('');
    }
  };

  return (
    <div>
      {!panelOnly && <button
        type="button"
        onClick={onToggleOpen}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <svg width={18} height={18} viewBox="0 0 20 20" fill="none">
          <path
            d="M3 4.5C3 3.672 3.672 3 4.5 3H15.5C16.328 3 17 3.672 17 4.5V12.5C17 13.328 16.328 14 15.5 14H6L3 17V4.5Z"
            stroke={colors.textSecondary}
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {(commentCount ?? 0) > 0 && (
          <span style={{ fontSize: 14, color: colors.textSecondary }}>
            {commentCount}
          </span>
        )}
      </button>}

      {isOpen && (
        <div
          style={{
            backgroundColor: COMMENT_BG,
            borderRadius: 12,
            padding: 12,
            marginTop: 8,
          }}
        >
          {isLoading && (
            <p style={{ fontSize: 14, color: colors.textMuted, margin: 0 }}>{t('feed.comment.loading')}</p>
          )}

          {comments.map((comment) => (
            <div
              key={comment.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '8px 0',
                borderBottom: `1px solid rgba(0,0,0,0.05)`,
              }}
            >
              <div
                style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: '#E8E0D8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 600, color: colors.textPrimary,
                  flexShrink: 0,
                }}
              >
                {comment.user_name?.charAt(0) ?? '?'}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, color: colors.textPrimary, margin: 0 }}>
                  <strong>{comment.user_name}</strong>{' '}
                  <span style={{ fontWeight: 400 }}>{comment.message}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                disabled={isPending}
                style={{
                  background: 'none', border: 'none',
                  fontSize: 14, color: colors.textMuted,
                  cursor: 'pointer', padding: 0, flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value.slice(0, 50))}
              placeholder={t('feed.comment.placeholder')}
              maxLength={50}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              style={{
                border: 'none',
                backgroundColor: 'rgba(255,255,255,0.8)',
                borderRadius: 8,
                padding: '8px 12px',
                flex: 1,
                fontSize: 14,
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !newComment.trim()}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: '8px 4px',
                opacity: !newComment.trim() ? 0.3 : 1,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={colors.brand} stroke="none">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
