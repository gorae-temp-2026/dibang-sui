import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export const APPROACHING_ICON_SIZE = 40
export const APPROACHING_EDGE_PADDING = 24
const BURST_HEART_SIZE = 240

const SPRING_TRANSITION = { type: 'spring' as const, stiffness: 300, damping: 25 }
const BURST_ANIMATE = { scale: [0, 1.4, 1.1, 1.1], opacity: [0, 1, 1, 0] }
const BURST_TRANSITION = { duration: 1.8, times: [0, 0.2, 0.5, 1], ease: 'easeOut' as const }

function HeartSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 100 90" fill="none">
      <path
        d="M50 82 C50 82 8 52 8 28 C8 16 18 8 30 8 C38 8 46 13 50 20 C54 13 62 8 70 8 C82 8 92 16 92 28 C92 52 50 82 50 82Z"
        fill="#E53E3E"
        opacity="0.9"
      />
    </svg>
  )
}

// ─── 신랑: 기쁜 점프 ──────────────────────────────────────────────
function WhaleGroomJump({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <style>{`
        .gj-whale  { transform-box: view-box; transform-origin: 200px 240px; animation: gj-jump 1.6s cubic-bezier(0.5,0,0.5,1) infinite; }
        .gj-body   { transform-box: view-box; transform-origin: 200px 240px; animation: gj-squash 1.6s cubic-bezier(0.5,0,0.5,1) infinite; }
        .gj-hat    { transform-box: view-box; transform-origin: 200px 170px; animation: gj-hat 1.6s cubic-bezier(0.5,0,0.5,1) infinite; }
        .gj-bowtie { transform-box: view-box; transform-origin: 225px 295px; animation: gj-bow 1.6s ease-in-out infinite; }
        @keyframes gj-jump {
          0%,100% { transform: translateY(0); }
          15%     { transform: translateY(6px); }
          50%     { transform: translateY(-38px); }
          85%     { transform: translateY(6px); }
        }
        @keyframes gj-squash {
          0%,100% { transform: scale(1,1); }
          15%     { transform: scale(1.15,0.85); }
          40%     { transform: scale(0.92,1.12); }
          60%     { transform: scale(0.95,1.05); }
          85%     { transform: scale(1.15,0.85); }
        }
        @keyframes gj-hat {
          0%,100% { transform: translateY(0) rotate(0); }
          15%     { transform: translateY(3px) rotate(-2deg); }
          45%     { transform: translateY(-6px) rotate(6deg); }
          60%     { transform: translateY(-10px) rotate(-3deg); }
          85%     { transform: translateY(3px) rotate(2deg); }
        }
        @keyframes gj-bow { 0%,100%{transform:rotate(0)} 50%{transform:rotate(-6deg)} }
      `}</style>
      <g className="gj-whale"><g className="gj-body">
        <path d="M 100 240 Q 55 202 25 170 Q 48 214 82 240 Q 48 266 25 310 Q 55 278 100 240 Z" fill="#3B5F8A"/>
        <ellipse cx="200" cy="240" rx="118" ry="82" fill="#4A7BB0"/>
        <ellipse cx="205" cy="272" rx="92" ry="40" fill="#E8F0F8"/>
        <path d="M 175 310 Q 150 345 138 350 Q 172 335 192 315 Z" fill="#3B5F8A"/>
        <circle cx="268" cy="220" r="13" fill="white"/>
        <circle cx="271" cy="223" r="9" fill="#1A1A2E"/>
        <circle cx="274" cy="218" r="3.5" fill="white"/>
        <path d="M 258 202 Q 270 198 282 204" stroke="#1A1A2E" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <ellipse cx="258" cy="252" rx="14" ry="6" fill="#FFB6C1" opacity="0.7"/>
        <path d="M 286 250 Q 296 265 310 255" stroke="#1A1A2E" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        <g className="gj-hat">
          <ellipse cx="200" cy="172" rx="58" ry="8" fill="#1A1A1A"/>
          <rect x="170" y="115" width="60" height="55" fill="#1A1A1A"/>
          <ellipse cx="200" cy="115" rx="30" ry="6" fill="#2C2C2C"/>
          <rect x="170" y="152" width="60" height="7" fill="#A01028"/>
        </g>
        <g className="gj-bowtie">
          <path d="M 195 295 L 219 280 L 219 310 Z" fill="#C41E3A"/>
          <path d="M 255 295 L 231 280 L 231 310 Z" fill="#C41E3A"/>
          <rect x="218" y="286" width="14" height="18" fill="#8B0000" rx="2"/>
        </g>
      </g></g>
    </svg>
  )
}

// ─── 신부: 하트 뿜기 + 바운스 ─────────────────────────────────────
function WhaleBrideHeart({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <style>{`
        .bh-whale   { transform-box: view-box; transform-origin: 200px 240px; animation: bh-bounce 1s ease-in-out infinite; }
        .bh-body    { transform-box: view-box; transform-origin: 200px 240px; animation: bh-squish 1s ease-in-out infinite; }
        .bh-flower  { transform-box: view-box; transform-origin: 200px 170px; animation: bh-flower 0.8s ease-in-out infinite; }
        .bh-heart-1 { transform-box: view-box; transform-origin: 200px 130px; animation: bh-heart 2.1s ease-out infinite 0s; }
        .bh-heart-2 { transform-box: view-box; transform-origin: 155px 150px; animation: bh-heart 2.1s ease-out infinite 0.7s; }
        .bh-heart-3 { transform-box: view-box; transform-origin: 245px 150px; animation: bh-heart 2.1s ease-out infinite 1.4s; }
        @keyframes bh-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes bh-squish { 0%,100%{transform:scale(1,1)} 25%{transform:scale(0.96,1.04)} 75%{transform:scale(1.04,0.96)} }
        @keyframes bh-flower { 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(3deg)} }
        @keyframes bh-heart {
          0%   { transform: translateY(0) scale(0);   opacity: 0; }
          15%  { transform: translateY(-8px) scale(1); opacity: 1; }
          80%  { transform: translateY(-60px) scale(1); opacity: 1; }
          100% { transform: translateY(-80px) scale(0.6); opacity: 0; }
        }
      `}</style>
      <g className="bh-heart-1"><path d="M 200 130 c -8 -14, -26 -10, -26 7 c 0 13, 26 26, 26 26 c 0 0, 26 -13, 26 -26 c 0 -17, -18 -21, -26 -7 Z" fill="#FF4D8F"/></g>
      <g className="bh-heart-2"><path d="M 155 150 c -6 -10, -19 -7, -19 5 c 0 9, 19 19, 19 19 c 0 0, 19 -10, 19 -19 c 0 -12, -13 -15, -19 -5 Z" fill="#FF88B0"/></g>
      <g className="bh-heart-3"><path d="M 245 150 c -6 -10, -19 -7, -19 5 c 0 9, 19 19, 19 19 c 0 0, 19 -10, 19 -19 c 0 -12, -13 -15, -19 -5 Z" fill="#FF88B0"/></g>
      <g className="bh-whale"><g className="bh-body">
        <path d="M 190 158 L 215 158 Q 310 185 325 260 Q 322 298 305 305 Q 290 292 275 292 Q 260 305 245 292 Q 230 303 218 292 Q 208 298 200 290 L 198 165 Z" fill="white" opacity="0.65"/>
        <path d="M 300 240 Q 345 202 375 170 Q 352 214 318 240 Q 352 266 375 310 Q 345 278 300 240 Z" fill="#E89FB8"/>
        <ellipse cx="200" cy="240" rx="118" ry="82" fill="#F5B8D0"/>
        <ellipse cx="195" cy="272" rx="92" ry="40" fill="#FFF0F5"/>
        <path d="M 225 310 Q 250 345 262 350 Q 228 335 208 315 Z" fill="#E89FB8"/>
        <circle cx="132" cy="220" r="13" fill="white"/>
        <circle cx="129" cy="223" r="9" fill="#3D2B1F"/>
        <circle cx="126" cy="218" r="3.5" fill="white"/>
        <path d="M 123 208 Q 118 204 114 203" stroke="#3D2B1F" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <path d="M 130 205 Q 129 200 128 195" stroke="#3D2B1F" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <path d="M 137 207 Q 140 203 143 199" stroke="#3D2B1F" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <ellipse cx="142" cy="252" rx="14" ry="6" fill="#FF8FA3" opacity="0.85"/>
        <path d="M 114 250 Q 104 265 90 255" stroke="#3D2B1F" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        <g className="bh-flower">
          <circle cx="187" cy="165" r="10" fill="#FF8FA3"/>
          <circle cx="213" cy="165" r="10" fill="#FF8FA3"/>
          <circle cx="200" cy="177" r="10" fill="#FF8FA3"/>
          <circle cx="192" cy="155" r="10" fill="#FF8FA3"/>
          <circle cx="208" cy="155" r="10" fill="#FF8FA3"/>
          <circle cx="200" cy="165" r="6" fill="#FFD700"/>
        </g>
      </g></g>
    </svg>
  )
}

type Props = {
  leftOffset: number
  rightOffset: number
  isBursting: boolean
  onBurstComplete: () => void
}

export const ApproachingHearts = memo(function ApproachingHearts({ leftOffset, rightOffset, isBursting, onBurstComplete }: Props) {
  return (
    <>
      {/* Left: 신랑 고래 (점프) */}
      {!isBursting && (
        <motion.div
          className="pointer-events-none absolute z-[12]"
          animate={{ x: leftOffset }}
          transition={SPRING_TRANSITION}
          style={{ left: APPROACHING_EDGE_PADDING, top: 'calc(8% - 55px)', y: '-50%' }}
        >
          <WhaleGroomJump size={APPROACHING_ICON_SIZE} />
        </motion.div>
      )}

      {/* Right: 신부 고래 (하트 뿜기) */}
      {!isBursting && (
        <motion.div
          className="pointer-events-none absolute z-[12]"
          animate={{ x: -rightOffset }}
          transition={SPRING_TRANSITION}
          style={{ right: APPROACHING_EDGE_PADDING, top: 'calc(8% - 55px)', y: '-50%' }}
        >
          <WhaleBrideHeart size={APPROACHING_ICON_SIZE} />
        </motion.div>
      )}

      {/* Burst heart at center */}
      <AnimatePresence>
        {isBursting && (
          <motion.div
            className="pointer-events-none absolute z-[12]"
            initial={{ scale: 0, opacity: 0 }}
            animate={BURST_ANIMATE}
            transition={BURST_TRANSITION}
            onAnimationComplete={onBurstComplete}
            style={{ left: '50%', top: '50%', x: '-50%', y: '-50%' }}
          >
            <HeartSvg size={BURST_HEART_SIZE} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
})
