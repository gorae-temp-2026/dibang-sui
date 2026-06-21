// ① 인연 연결 — 누구와 이음됐나(인연 그래프). 노드 = 프로필 사진(여기선 hue 플레이스홀더).
// react-force-graph-2d(대표 단독 확정). 인연·모이가모인곳 공용. 강한 이웃 중심(sim-scale 소그래프).
import { useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { ProfileData } from './types'

interface GNode { id: string; label: string; hue: number; self?: boolean; here?: boolean; x?: number; y?: number }
interface GLink { source: string; target: string | GNode; type: string; value: number }

const REL_COLOR: Record<string, string> = { 부조: '#D4687A', 선물: '#F8C57A', 승급: '#5AA3D6', 이음: '#87CEEB' }

export function InyeonGraph({ data, size = 250 }: { data: ProfileData; size?: number }) {
  const graphData = useMemo(
    () => ({ nodes: data.graph.nodes.map((n) => ({ ...n })), links: data.graph.links.map((l) => ({ ...l })) }),
    [data],
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10" style={{ width: size, height: size }}>
      <ForceGraph2D
        width={size}
        height={size}
        graphData={graphData}
        backgroundColor="#0c1a2e"
        nodeRelSize={5}
        nodeVal={(n) => ((n as GNode).self ? 6 : (n as GNode).here ? 4 : 1.5)}
        nodeColor={(n) => {
          const g = n as GNode
          if (g.self) return '#ffffff'
          // here(이 결혼식에서 만난 사람) = 선명, 나머지(더 넓은 네트워크) = 흐리게.
          return g.here ? `hsl(${g.hue} 72% 62%)` : `hsl(${g.hue} 24% 42%)`
        }}
        nodeLabel={(n) => (n as GNode).label}
        // here 노드에 골드 링(광장에서 선이 가는 상대 = 동일 집합).
        nodeCanvasObjectMode={(n) => ((n as GNode).here ? 'after' : undefined)}
        nodeCanvasObject={(n, ctx, scale) => {
          const g = n as GNode
          if (!g.here || g.x == null || g.y == null) return
          const r = 7 / scale
          ctx.beginPath()
          ctx.arc(g.x, g.y, r, 0, 2 * Math.PI)
          ctx.strokeStyle = '#F8C57A'
          ctx.lineWidth = 2 / scale
          ctx.stroke()
        }}
        linkColor={(l) => {
          const t = (l as GLink).target
          const here = typeof t === 'object' && (t as GNode).here
          return here ? REL_COLOR[(l as GLink).type] ?? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'
        }}
        linkWidth={(l) => {
          const t = (l as GLink).target
          const here = typeof t === 'object' && (t as GNode).here
          return here ? Math.max(1.2, (l as GLink).value) : 0.6
        }}
        enableZoomInteraction={false}
        enablePanInteraction={false}
        cooldownTicks={80}
        warmupTicks={20}
      />
    </div>
  )
}
