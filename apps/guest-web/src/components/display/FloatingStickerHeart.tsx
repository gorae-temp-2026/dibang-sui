import { motion } from 'framer-motion'
import bouquetSvg from '../../assets/bouquet_scene.svg'
import cakeSvg from '../../assets/cake_scene.svg'
import clamSvg from '../../assets/clam_scene.svg'
import dressSvg from '../../assets/dress_scene.svg'
import fountainSvg from '../../assets/fountain_scene.svg'
import heartSceneSvg from '../../assets/heart_scene.svg'
import heelsSvg from '../../assets/heels_scene.svg'
import ringSvg from '../../assets/ring_scene.svg'
import tuxedoSvg from '../../assets/tuxedo_scene.svg'
import waveSvg from '../../assets/wave_scene.svg'

const STICKER_MAP: Record<string, string> = {
  bouquet: bouquetSvg,
  cake: cakeSvg,
  clam: clamSvg,
  dress: dressSvg,
  fountain: fountainSvg,
  heart: heartSceneSvg,
  heels: heelsSvg,
  ring: ringSvg,
  tuxedo: tuxedoSvg,
  wave: waveSvg,
}

const STICKER_ANIMATE = {
  scale:   [0, 1.4, 0.9, 1.1, 1, 1, 0.5],
  opacity: [0, 1,   1,   1,   1, 1, 0],
  y:       [0, 0,   0,   0,   0, -20, -50],
  rotate:  [0, 0,   -6,  5,   -3, 2, 0],
}
const STICKER_TRANSITION = {
  duration: 4,
  times: [0, 0.08, 0.15, 0.22, 0.3, 0.75, 1],
  ease: 'easeOut' as const,
}

type Props = {
  id: string
  x: number
  y: number
  stickerType?: string
  onComplete: () => void
}

export function FloatingStickerHeart({ x, y, stickerType, onComplete }: Props) {
  const src = (stickerType && STICKER_MAP[stickerType]) || STICKER_MAP.heart

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={STICKER_ANIMATE}
      transition={STICKER_TRANSITION}
      onAnimationComplete={onComplete}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        pointerEvents: 'none',
        zIndex: 25,
      }}
    >
      <img src={src} alt="" width={240} height={240} style={{ objectFit: 'contain' }} />
    </motion.div>
  )
}
