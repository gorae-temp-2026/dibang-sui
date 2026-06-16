import { colors } from '../../lib/theme';

const HEART_RED = '#E8465A';

interface Props {
  count: number;
  myHeart: boolean;
  onToggle: () => void;
  isPending?: boolean;
}

export function HeartButton({ count, myHeart, onToggle, isPending }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isPending}
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
      <svg width={20} height={20} viewBox="0 0 22 22" fill="none">
        <path
          d="M11 19C11 19 2 13.5 2 7.5C2 5.015 4.015 3 6.5 3C8.24 3 9.746 3.98 10.5 5.412C11.254 3.98 12.76 3 14.5 3C16.985 3 19 5.015 19 7.5C19 13.5 11 19 11 19Z"
          fill={myHeart ? HEART_RED : 'none'}
          stroke={myHeart ? HEART_RED : colors.textSecondary}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {count > 0 && (
        <span style={{ fontSize: 14, color: myHeart ? HEART_RED : colors.textSecondary }}>
          {count}
        </span>
      )}
    </button>
  );
}
