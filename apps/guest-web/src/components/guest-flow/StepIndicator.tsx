import { colors } from '../../styles/tokens';

type GuestStep = 'recipient' | 'name' | 'amount' | 'transfer' | 'message' | 'done';

const STEP_DOT: Record<GuestStep, number> = {
  recipient: 0,
  name: 1,
  amount: 2,
  transfer: 3,
  message: 4,
  done: 5,
};

const TOTAL_DOTS = 6;

interface Props {
  step: GuestStep;
  onBack?: () => void;
}

export function StepIndicator({ step, onBack }: Props) {
  const active = STEP_DOT[step];
  const canBack = step !== 'done';

  return (
    <div style={{ display: 'flex', alignItems: 'center', paddingTop: 20, paddingBottom: 4, position: 'relative' }}>
      {canBack && onBack && (
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            left: 16,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke={colors.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flex: 1 }}>
        {Array.from({ length: TOTAL_DOTS }, (_, i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              transition: 'background 0.3s',
              background:
                i < active ? 'rgba(120,80,40,0.35)' :
                i === active ? colors.accent :
                colors.textDisabled,
            }}
          />
        ))}
      </div>
    </div>
  );
}
