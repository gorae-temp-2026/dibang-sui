// 축의 메세지 플로우 v1의 마지막 페이지 (A/B 실험군 A).
// 상단 '축하 메세지를 보냈어요'만 작게 두고, 그 아래 웨딩 라운지 미리보기를
// 가로 100%·세로 끝까지 full-bleed로 노출한다. 미리보기는 landing의 정적 HTML
// (lounge-mvp-v4.html)을 iframe으로 임베드하고 ScaledContainer로 원본 393px를 폭에 맞춰 축소한다.
// 하단은 아래로 갈수록 흐릿해지는 페이드 그라데이션을 깔고, 그 위에 라운지 입장 버튼을
// absolute로 띄운다(페이드는 클릭 통과, 버튼은 z-index로 위).
import { motion } from 'framer-motion';
import { serif, springs, colors } from '../../styles/tokens';
import { ScaledContainer } from './ScaledContainer';

interface StepDoneProps {
  /**
   * Dibang Wedding 라운지 진입 게이트로 이동. 라우팅/외부 navigation 책임은
   * 컨테이너(`GuestFlowPage`)가 갖는다. 본 컴포넌트는 prop 콜백만 호출.
   */
  onGoToLounge: () => void;
}

export function StepDone({ onGoToLounge }: StepDoneProps) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0 }}>
      {/* 상단: '축하 메세지를 보냈어요'만 (하트·부제 삭제, 작게) */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, ...springs.smooth }}
        style={{ ...serif, fontSize: 18, fontWeight: 700, color: colors.textPrimary, textAlign: 'center', padding: '12px 24px 14px', margin: 0, flexShrink: 0 }}
      >
        축하 메세지를 보냈어요
      </motion.p>

      {/* 웨딩 라운지 미리보기 — 가로 100%·세로 끝까지 full-bleed.
          페이드 그라데이션 + 입장 버튼을 그 위에 absolute로 얹는다. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, ...springs.smooth }}
        style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', inset: 0 }}>
          <ScaledContainer>
            <iframe
              src="/lounge-mvp-v4.html?day=event"
              title="웨딩 라운지 미리보기"
              loading="lazy"
              style={{ width: '100%', height: '100%', border: 0, display: 'block', background: '#fff' }}
            />
          </ScaledContainer>
        </div>

        {/* 하단 페이드: 아래로 갈수록 점점 흐릿해지는 효과. 클릭은 iframe으로 통과시킨다. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 160,
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.85) 55%, #fff 100%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* 입장 버튼: 미리보기 위에 absolute로 띄워 하단 고정 */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, ...springs.smooth }}
          whileTap={{ scale: 0.95 }}
          onClick={onGoToLounge}
          style={{
            position: 'absolute',
            left: 20,
            right: 20,
            bottom: 24,
            zIndex: 2,
            height: 56,
            borderRadius: 16,
            fontSize: 18,
            fontWeight: 500,
            color: '#fff',
            background: colors.accent,
            border: 'none',
            cursor: 'pointer',
            ...serif,
          }}
        >
          라운지 입장하고 사진 공유하기
        </motion.button>
      </motion.div>
    </div>
  );
}
