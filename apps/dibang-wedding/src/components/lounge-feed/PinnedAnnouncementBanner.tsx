import { useState } from 'react';
import { colors } from '../../lib/theme';
import { SIDE_LABEL } from '../../lib/guestLabel';
import type { FeedItem } from '../../types/db-compat';

interface Props {
  item: FeedItem;
}

export function PinnedAnnouncementBanner({ item }: Props) {
  const [expanded, setExpanded] = useState(false);
  const data = (item.data ?? {}) as { message?: string; author_name?: string; author_role?: string };
  const message = data.message ?? '';
  const authorName = data.author_name;
  const authorRole = data.author_role ? (SIDE_LABEL[data.author_role] ?? data.author_role) : null;

  return (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        width: '100%',
        padding: '14px 20px',
        backgroundColor: '#FFF4E8',
        borderLeft: `4px solid ${colors.brand}`,
        borderRight: 'none',
        borderTop: 'none',
        borderBottom: '1px solid #F0E6D9',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {/* 스피커 아이콘 */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        style={{ flexShrink: 0, marginTop: 1 }}
      >
        <path
          d="M11 5L6 9H2v6h4l5 4V5z"
          fill={colors.brand}
          stroke={colors.brand}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15.54 8.46a5 5 0 0 1 0 7.07"
          stroke={colors.brand}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: colors.textPrimary,
            lineHeight: 1.5,
            margin: 0,
            ...(expanded
              ? {}
              : {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' as const,
                }),
          }}
        >
          {message}
        </p>
        {expanded && authorName && (
          <p style={{ fontSize: 14, color: colors.textMuted, margin: '4px 0 0' }}>
            {authorRole ? `${authorRole} ${authorName}` : authorName}
          </p>
        )}
      </div>

      {/* 펼침/접힘 화살표 */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        style={{
          flexShrink: 0,
          marginTop: 2,
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}
      >
        <path
          d="M6 9l6 6 6-6"
          stroke={colors.textSecondary}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
