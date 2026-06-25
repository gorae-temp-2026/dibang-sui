// ② 우리 signal — 2D sunburst (2층 fold). 핸드오프 §13-1②·§13-4.
// 안쪽=대분류(EM·CS·AR·MP), 바깥=소분류(부조·선물·참석·이음·대화…), 부채꼴=fold 누적값, 같은 색계열=부모-자식.
// d3-hierarchy partition + d3-shape arc (대표 단독 확정 라이브러리). 3D 안 씀 — "정확히 읽히는 2D".
import { useMemo } from 'react'
import { hierarchy, partition, type HierarchyRectangularNode } from 'd3-hierarchy'
import { arc } from 'd3-shape'
import type { SignalNode } from './types'
import { useT } from '../../lib/i18n'

// Fiske 관계모델(RMT): EM 호혜(동등 맞춤) / CS 유대(공동 공유) / AR 위계(서열·권위) / MP 거래(시장 가격).
const AXIS_COLOR: Record<string, string> = {
  EM: '#D4687A', // 호혜 — 동등 맞춤(부조·답례·선물)
  CS: '#5B89B3', // 유대 — 공동 공유(함께함·나눔·대화)
  AR: '#B8884A', // 위계 — 서열·권위(선후배·멘토링)
  MP: '#9999AD', // 거래 — 시장 가격(스텁)
}

export function SignalSunburst({ data, size = 200 }: { data: SignalNode; size?: number }) {
  const t = useT()
  const radius = size / 2
  const arcs = useMemo(() => {
    const root = hierarchy<SignalNode>(data)
      .sum((d) => (d.children ? 0 : d.value ?? 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    partition<SignalNode>().size([2 * Math.PI, radius])(root)
    const gen = arc<HierarchyRectangularNode<SignalNode>>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => d.y0)
      .outerRadius((d) => d.y1)
      .padAngle(0.006)
    return (root.descendants() as HierarchyRectangularNode<SignalNode>[])
      .filter((d) => d.depth > 0)
      .map((d) => {
        const axis = d.depth === 1 ? d.data.name : d.parent?.data.name ?? ''
        const wide = d.x1 - d.x0 > 0.18
        return {
          path: gen(d) ?? '',
          centroid: gen.centroid(d),
          color: AXIS_COLOR[axis] ?? '#888',
          opacity: d.data.stub ? 0.22 : d.depth === 1 ? 0.92 : 0.55,
          label: d.data.name,
          showLabel: wide && d.depth === 1,
        }
      })
  }, [data, radius])

  return (
    <svg viewBox={`${-radius} ${-radius} ${size} ${size}`} width={size} height={size} role="img" aria-label={t('profile.signalSunburstAria')}>
      {arcs.map((a, i) => (
        <path key={i} d={a.path} fill={a.color} fillOpacity={a.opacity} stroke="#0A1626" strokeWidth={0.6}>
          <title>{a.label}</title>
        </path>
      ))}
      {arcs.filter((a) => a.showLabel).map((a, i) => (
        <text key={`t${i}`} x={a.centroid[0]} y={a.centroid[1]} fill="#fff" fontSize={9} fontWeight={700} textAnchor="middle" dominantBaseline="middle">
          {a.label}
        </text>
      ))}
    </svg>
  )
}
