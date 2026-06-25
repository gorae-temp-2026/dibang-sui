// 축의 메세지 플로우의 마지막 페이지 (A/B 종료 후 v2 승격 — 기본 done 화면).
// 구 v1(StepDone)이 라운지 미리보기인 것과 달리, '하객 모임 현황'을 보여준다.
// 신랑측/신부측 라운지 하객 수(getWedding 응답 lounge.{groom,bride}_side_guest_count)를
// brother.svg/sister.svg를 섞은 아바타(full width 카드)로 시각화해 라운지 합류를 유도한다.
// 하객이 0명인 측은 같은 full width 카드 안에 "첫 번째로 입장" 안내를 글자로 노출한다.
// 라운지 입장은 화면 하단 고정 버튼으로 연결한다.
import { motion } from 'framer-motion';
import { serif, springs, colors } from '../../styles/tokens';
import { useT } from '../../lib/i18n';
import brotherSvg from '../../assets/avatars/brother.svg';
import sisterSvg from '../../assets/avatars/sister.svg';

// 아바타 스택에 표시할 최대 개수. 초과분은 "+N" 뱃지로 표시.
const MAX_AVATARS = 5;
// brother/sister를 섞어서 채운다(지시: 두 종류를 섞어서). 측마다 시작 종류만 다르게.
const GROOM_POOL = [brotherSvg, sisterSvg];
const BRIDE_POOL = [sisterSvg, brotherSvg];

// full width 프로필 카드 공통 스타일 (아바타 카드 / 0명 안내 카드가 동일하게 사용).
const cardStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  borderRadius: 14,
  border: `1px solid ${colors.border}`,
  background: colors.bgCard,
  boxShadow: '0 2px 8px -4px rgba(26, 26, 46, 0.1)',
  marginBottom: 10,
};

// accent 채움 버튼 스타일(하단 메인 버튼).
const primaryButtonStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  borderRadius: 16,
  border: 'none',
  background: colors.accent,
  color: '#fff',
  fontSize: 18,
  fontWeight: 500,
  cursor: 'pointer',
  ...serif,
};

function HeartSVG() {
  return (
    <svg width="80" height="72" viewBox="0 0 100 90" fill="none">
      <path
        d="M50 82 C50 82 8 52 8 28 C8 16 18 8 30 8 C38 8 46 13 50 20 C54 13 62 8 70 8 C82 8 92 16 92 28 C92 52 50 82 50 82Z"
        fill="#E8A0AD"
        opacity="0.85"
      />
    </svg>
  );
}

// 하객 모임 현황 한 줄 — (full width 프로필 카드: 아바타 또는 0명 안내 글자) → 그 아래 라벨 문구.
function GuestRow({
  side,
  count,
  avatarPool,
  hostName,
  t,
}: {
  side: string;
  count: number;
  avatarPool: string[];
  hostName: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const shown = Math.min(count, MAX_AVATARS);
  const extra = count - shown;
  return (
    <div style={{ width: '100%' }}>
      {count > 0 ? (
        // 하객이 있으면: 프로필 아바타를 full width 카드로 감싸 표시
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', padding: '14px 16px' }}>
          {Array.from({ length: shown }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid #fff',
                marginLeft: i === 0 ? 0 : -12,
                background: colors.bgMuted,
                flexShrink: 0,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
              }}
            >
              <img src={avatarPool[i % avatarPool.length]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
            </div>
          ))}
          {extra > 0 && (
            <span style={{ ...serif, fontSize: 14, fontWeight: 500, color: colors.textSubtle, marginLeft: 10 }}>+{extra}</span>
          )}
        </div>
      ) : (
        // 하객이 0명이면: 같은 카드 안에 "첫 번째로 입장" 안내를 글자로 표시
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px 16px', minHeight: 72 }}>
          <p style={{ ...serif, fontSize: 14, color: colors.textMuted, margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
            {t('guestFlow.doneV2.waitingLine1', { side, host: hostName })}
            <br />
            {t('guestFlow.doneV2.waitingLine2')}
          </p>
        </div>
      )}

      <p style={{ ...serif, fontSize: 18, fontWeight: 700, color: colors.textPrimary, margin: 0, textAlign: 'left' }}>
        {t('guestFlow.doneV2.gatheredCount', { side, count })}
      </p>
    </div>
  );
}

interface StepDoneV2Props {
  /**
   * Dibang Wedding 라운지 진입 게이트로 이동. 라우팅/외부 navigation 책임은
   * 컨테이너(`GuestFlowPage`)가 갖는다. 본 컴포넌트는 prop 콜백만 호출.
   */
  onGoToLounge: () => void;
  /** 라운지에 체크인한 신랑측/신부측 하객 수 (getWedding 응답 lounge에서 전달). */
  groomSideCount: number;
  brideSideCount: number;
  /** 0명일 때 "첫 번째로 입장" 안내 문구에 쓰는 신랑/신부 이름. */
  groomName: string;
  brideName: string;
}

export function StepDoneV2({ onGoToLounge, groomSideCount, brideSideCount, groomName, brideName }: StepDoneV2Props) {
  const t = useT();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '40px 24px 32px', maxWidth: 420, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {/* 상단: 하트 + 완료 문구 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, flexShrink: 0 }}>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        >
          <HeartSVG />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, ...springs.smooth }}
          style={{ ...serif, fontSize: 26, fontWeight: 700, lineHeight: 1.4, color: colors.textPrimary }}
        >
          {t('guestFlow.done.sent')}
        </motion.p>
      </div>

      {/* 중앙: 하객 현황 (상단 문구 아래 빈 공간의 세로 중앙) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, ...springs.smooth }}
        style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}
      >
        <GuestRow side={t('guestFlow.doneV2.groomSide')} count={groomSideCount} avatarPool={GROOM_POOL} hostName={groomName} t={t} />
        <GuestRow side={t('guestFlow.doneV2.brideSide')} count={brideSideCount} avatarPool={BRIDE_POOL} hostName={brideName} t={t} />
      </motion.div>

      {/* 하단 고정: 라운지 입장 버튼 */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, ...springs.smooth }}
        whileTap={{ scale: 0.95 }}
        onClick={onGoToLounge}
        style={{ ...primaryButtonStyle, height: 56, flexShrink: 0 }}
      >
        {t('guestFlow.done.enterLounge')}
      </motion.button>
    </div>
  );
}
