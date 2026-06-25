import { memo, useLayoutEffect, useRef, useState } from 'react'
import type { DisplayWedding as Wedding } from './types'
import { serif } from './constants'
import { useT } from '../../lib/i18n'

// 신랑·신부 이름 (커플) — 동일 클래스/스타일 유지
const NAME_CLASS =
  'text-[30px] sm:text-[57px] font-semibold tracking-[4px] sm:tracking-[8px] whitespace-nowrap'
// 부모 성함 — 커플 이름의 0.65배
const PARENT_NAME_CLASS =
  'text-[20px] sm:text-[37px] font-semibold tracking-[3px] sm:tracking-[5px] whitespace-nowrap leading-tight'
const NAME_STYLE = {
  color: 'rgba(255, 250, 244, 0.93)',
  textShadow: '0 2px 24px rgba(0,0,0,0.6)',
  ...serif,
} as const
const AMP_STYLE = {
  color: 'rgba(200, 180, 155, 0.55)',
  textShadow: '0 2px 16px rgba(0,0,0,0.5)',
  ...serif,
} as const

// 라벨 (WEDDING / 신랑측 혼주 / 신부측 혼주) — 동일 크기, 이름 위에 배치
const LABEL_CLASS =
  'mb-1 sm:mb-2 text-[11px] sm:text-[17px] tracking-[2px] sm:tracking-[3px] whitespace-nowrap'
const LABEL_STYLE = {
  color: 'rgba(255, 248, 240, 0.32)',
  textShadow: '0 1px 12px rgba(0,0,0,0.5)',
  ...serif,
} as const

/**
 * 한쪽(신랑측/신부측) 혼주: 라벨이 부모 성함 위, 부모 성함은 세로 스택.
 * 좌우 대칭(중앙 정렬 컬럼이라 양쪽 동일 구조). 값 없으면 미표시.
 *
 * [세로 정렬 — 기하학적 정확] 세 그룹(신랑측/커플/신부측) 모두 동일 LABEL_CLASS
 * (라벨 높이 Lh + mb 동일)를 위에 두고 그 아래 이름 블록을 두는 동일한 세로 구조다.
 * 어떤 그룹이든 (이름블록 중앙 − 그룹 중앙) = (Lh+mb)/2 로 이름블록 크기와 무관하게 동일.
 * 따라서 외곽 items-center 가 그룹 중앙을 맞추면 부모 스택 중앙 = 커플 이름 중앙이
 * 구조상 자동으로 정확히 일치한다. ⚠️ 여기에 translateY 등 추가 오프셋을 절대 넣지 말 것
 * (그게 정확 정렬을 깨뜨린다).
 */
function Side({ label, father, mother }: { label: string; father?: string; mother?: string }) {
  const names = [father, mother].filter(Boolean) as string[]
  if (names.length === 0) return null

  return (
    <div className="flex flex-col items-center">
      <p className={LABEL_CLASS} style={LABEL_STYLE}>
        {label}
      </p>
      <div className="flex flex-col items-center">
        {names.map((n, i) => (
          <span key={i} className={PARENT_NAME_CLASS} style={NAME_STYLE}>
            {n}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * fit-to-width (option A): 줄이 실제 화면 폭을 넘으면 그 줄만 축소.
 *
 * 측정 대상은 inline-flex(콘텐츠 폭으로 shrink-wrap)이고, getBoundingClientRect는
 * 조상 transform(헤더 vpScale ×2 등)까지 반영된 "최종 렌더 폭"을 돌려준다. 현재 적용 중인
 * fit scale은 나눠서 제거 → vpScale을 몰라도 항상 올바른 비율 계산. window.innerWidth가
 * 진짜 한계(루트 overflow-hidden).
 */
function useFitScale(deps: unknown[]) {
  const rowRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(1)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = rowRef.current
    if (!el) return
    const measure = () => {
      const bcr = el.getBoundingClientRect().width
      if (bcr === 0) return
      const renderedNatural = bcr / (scaleRef.current || 1) // 적용 중인 fit scale 제거
      const avail = window.innerWidth * 0.94 // 좌우 안전 여백
      const next = renderedNatural > avail ? avail / renderedNatural : 1
      if (Math.abs(next - scaleRef.current) > 0.005) {
        scaleRef.current = next
        setScale(next)
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { rowRef, scale }
}

/**
 * 신랑·신부 + 양가 부모를 한 줄로.
 * - 신랑측/신부측: [라벨(위)] + [부모 세로 스택] (좌우 대칭)
 * - 부모 성함은 신랑·신부의 0.65배. 세로 정렬은 동일 라벨 구조 + items-center로 기하학적으로 정확 (추가 오프셋 금지)
 * - 커플(가운데)·WEDDING 라벨은 이전 그대로 (무수정)
 * - 그룹들은 수직 가운데 정렬 (items-center)
 * - 줄이 화면 폭을 넘으면 그 줄만 자동 축소 (fit-to-width)
 * 헤더 vpScale 스케일러 안에 위치 → 화면 비율 확대는 그대로 유지된다.
 */
export const HostNamesRow = memo(function HostNamesRow({ wedding }: { wedding: Wedding }) {
  const t = useT()
  const { rowRef, scale } = useFitScale([
    wedding.groomName,
    wedding.brideName,
    wedding.groomFatherName,
    wedding.groomMotherName,
    wedding.brideFatherName,
    wedding.brideMotherName,
  ])

  return (
    <div className="mb-2 sm:mb-4 flex w-full justify-center">
      <div
        ref={rowRef}
        className="inline-flex items-center gap-20 sm:gap-40 whitespace-nowrap"
        style={{
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top center',
        }}
      >
        <Side
          label={t('display.groomFamily')}
          father={wedding.groomFatherName}
          mother={wedding.groomMotherName}
        />

        <div className="flex flex-col items-center">
          <p className={LABEL_CLASS} style={LABEL_STYLE}>
            WEDDING
          </p>
          <div className="flex items-baseline gap-3 sm:gap-6">
            <span className={NAME_CLASS} style={NAME_STYLE}>
              {wedding.groomName}
            </span>
            <span className="text-[20px] sm:text-[36px] font-light italic" style={AMP_STYLE}>
              &amp;
            </span>
            <span className={NAME_CLASS} style={NAME_STYLE}>
              {wedding.brideName}
            </span>
          </div>
        </div>

        <Side
          label={t('display.brideFamily')}
          father={wedding.brideFatherName}
          mother={wedding.brideMotherName}
        />
      </div>
    </div>
  )
})
