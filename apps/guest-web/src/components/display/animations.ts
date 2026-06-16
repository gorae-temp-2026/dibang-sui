// ─── 메세지 카드 애니메이션 프리셋 ────────────────────────────────────────────
import { FLOAT_START_Y_OFFSET, FLOAT_END_Y_OFFSET } from './constants'
//
// ACTIVE_ANIMATION 한 줄만 바꾸면 전체 애니메이션 모드 전환.
//
// flowAnimation — 아래→위 흐름 (usesPhysics: false)

export type AnimLayerProps = {
  initial: Record<string, unknown>
  animate: Record<string, unknown>
  exit?: Record<string, unknown>
  transition: Record<string, unknown>
}

export type MessageAnimationConfig = {
  name: string
  usesPhysics: boolean
  positionLayer: (pos: { x: number; y: number }, isReplay: boolean, messageLength?: number, totalMessages?: number) => AnimLayerProps
  scaleLayer: (isReplay: boolean) => AnimLayerProps
  contentLayer: (isReplay: boolean) => AnimLayerProps
}

// ── Flow (아래→위 흐름) ───────────────────────────────────────────────────────

export const flowAnimation: MessageAnimationConfig = {
  name: 'flow',
  usesPhysics: false,

  positionLayer: (pos, _isReplay, messageLength = 0, totalMessages = 30) => {
    // 짧은 메세지(30자 미만): 빠르게 / 긴 메세지(30자 이상): 느리게
    const baseDuration = messageLength < 30 ? 10 : 20
    // 총 메세지 30개 미만이면 20% 느리게 (로테이션 여유)
    const duration = totalMessages < 30 ? baseDuration * 1.2 : baseDuration
    return {
      initial: { x: pos.x, y: pos.y + FLOAT_START_Y_OFFSET },
      animate: { x: pos.x, y: pos.y - FLOAT_END_Y_OFFSET },
      exit: {
        opacity: 0,
        transition: { duration: 0.4, ease: 'easeOut' },
      },
      transition: {
        x: { duration: 0 },
        y: { duration, ease: 'linear' },
      },
    }
  },

  scaleLayer: () => ({
    initial: { scale: 0.85 },
    animate: { scale: 1 },
    transition: { duration: 0.6, ease: 'easeOut' },
  }),

  contentLayer: () => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.5, ease: 'easeOut' },
  }),
}

// ── 활성 애니메이션 ────────────────────────────────────────────────────────────
// 여기 한 줄만 바꾸면 전환됩니다.

export const ACTIVE_ANIMATION: MessageAnimationConfig = flowAnimation
