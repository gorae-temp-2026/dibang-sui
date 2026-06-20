// ① 인연 연결 — 누구와 이음됐나(인연 그래프). 노드 = 프로필 사진(여기선 hue 플레이스홀더).
// react-force-graph-2d(대표 단독 확정). 인연·모이가모인곳 공용. 강한 이웃 중심(sim-scale 소그래프).
import { useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { ProfileData } from './types'

interface GNode { id: string; label: string; hue: number; self?: boolean }
interface GLink { source: string; target: string; type: string; value: number }

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
        nodeVal={(n) => ((n as GNode).self ? 6 : 2)}
        nodeColor={(n) => ((n as GNode).self ? '#ffffff' : `hsl(${(n as GNode).hue} 62% 58%)`)}
        nodeLabel={(n) => (n as GNode).label}
        linkColor={(l) => REL_COLOR[(l as GLink).type] ?? 'rgba(255,255,255,0.22)'}
        linkWidth={(l) => Math.max(0.6, (l as GLink).value)}
        enableZoomInteraction={false}
        enablePanInteraction={false}
        cooldownTicks={80}
        warmupTicks={20}
      />
    </div>
  )
}
