/**
 * 전체 신뢰 네트워크 그래프 — 로그인 불필요. 온체인 이벤트(SignalEmitted + Participated)만 읽어서
 * 패키지 구성원 전체의 연결 관계 + 가중치를 force-directed 그래프로 시각화.
 */
import { useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { createJsonRpcClient, getSignalEvents, getParticipatedEvents, getMoiCreatedEvents, configureSui, type SuiNetwork } from '@gorae/sui-sdk'
import { env } from '../env'

interface GNode { id: string; label: string; hue: number; signalCount: number }
interface GLink { source: string; target: string; value: number; kind: string }

export function TrustGraphPage() {
  const [nodes, setNodes] = useState<GNode[]>([])
  const [links, setLinks] = useState<GLink[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ nodes: 0, edges: 0, signals: 0 })

  useEffect(() => {
    const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'
    if (env.VITE_SUI_PACKAGE_ID) configureSui({ network, packageId: env.VITE_SUI_PACKAGE_ID })
    const client = createJsonRpcClient(network)

    Promise.all([getSignalEvents(client), getParticipatedEvents(client), getMoiCreatedEvents(client)])
      .then(([signals, participations, moiEvents]) => {
        const nodeSet = new Set<string>()
        const edgeMap = new Map<string, { value: number; kind: string }>()
        const signalCountMap = new Map<string, number>()

        // 신호(from→to) = 직접 연결
        for (const s of signals) {
          nodeSet.add(s.from)
          nodeSet.add(s.to)
          const key = [s.from, s.to].sort().join('|')
          const existing = edgeMap.get(key)
          const kind = s.kind === 1 ? 'EM' : 'CS'
          edgeMap.set(key, { value: (existing?.value ?? 0) + s.magnitude, kind: existing?.kind ? `${existing.kind}+${kind}` : kind })
          signalCountMap.set(s.from, (signalCountMap.get(s.from) ?? 0) + 1)
          signalCountMap.set(s.to, (signalCountMap.get(s.to) ?? 0) + 1)
        }

        // 참가(같은 이벤트 = 간접 연결)
        const byEvent = new Map<string, string[]>()
        for (const p of participations) {
          if (!byEvent.has(p.eventId)) byEvent.set(p.eventId, [])
          byEvent.get(p.eventId)!.push(p.participant)
          nodeSet.add(p.participant)
        }
        for (const members of byEvent.values()) {
          for (let i = 0; i < members.length; i++) {
            for (let j = i + 1; j < members.length; j++) {
              const key = [members[i]!, members[j]!].sort().join('|')
              if (!edgeMap.has(key)) edgeMap.set(key, { value: 1, kind: 'event' })
            }
          }
        }

        // Moi 소유자도 노드에 추가
        for (const m of moiEvents) nodeSet.add(m.owner)

        const nodeArr: GNode[] = [...nodeSet].map((addr) => ({
          id: addr,
          label: `${addr.slice(0, 6)}…${addr.slice(-4)}`,
          hue: parseInt(addr.slice(2, 6), 16) % 360,
          signalCount: signalCountMap.get(addr) ?? 0,
        }))

        const linkArr: GLink[] = [...edgeMap.entries()].map(([key, v]) => {
          const [src, tgt] = key.split('|')
          return { source: src!, target: tgt!, value: v.value, kind: v.kind }
        })

        setNodes(nodeArr)
        setLinks(linkArr)
        setStats({ nodes: nodeArr.length, edges: linkArr.length, signals: signals.length })
        setLoading(false)
      })
      .catch((e) => { console.error(e); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A1626]">
        <p className="text-white/60">온체인 신뢰 그래프 로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-screen bg-[#0A1626]">
      <div className="absolute left-4 top-4 z-10 rounded-xl bg-black/50 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-bold text-white">신뢰 네트워크 그래프</h1>
        <p className="mt-1 text-xs text-white/50">
          {stats.nodes}명 · {stats.edges}개 연결 · {stats.signals}개 신호
        </p>
        <div className="mt-2 flex gap-3 text-[10px]">
          <span className="text-[#D4687A]">● EM(부조)</span>
          <span className="text-[#5B89B3]">● CS(유대)</span>
          <span className="text-white/40">● event(참가)</span>
        </div>
      </div>
      <ForceGraph2D
        graphData={{ nodes, links }}
        width={typeof window !== 'undefined' ? window.innerWidth : 800}
        height={typeof window !== 'undefined' ? window.innerHeight : 600}
        backgroundColor="#0A1626"
        nodeLabel={(n: GNode) => `${n.label}\n신호 ${n.signalCount}건`}
        nodeColor={(n: GNode) => `hsl(${n.hue}, 60%, 55%)`}
        nodeVal={(n: GNode) => Math.max(2, n.signalCount + 1)}
        linkColor={(l: GLink) => l.kind.includes('EM') ? '#D4687A' : l.kind.includes('CS') ? '#5B89B3' : 'rgba(255,255,255,0.12)'}
        linkWidth={(l: GLink) => Math.min(4, Math.log2(l.value + 1) + 0.5)}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        nodeCanvasObject={(node: GNode & { x?: number; y?: number }, ctx: CanvasRenderingContext2D) => {
          if (node.x == null || node.y == null) return
          const r = Math.max(4, Math.sqrt(node.signalCount + 1) * 3)
          ctx.beginPath()
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
          ctx.fillStyle = `hsl(${node.hue}, 60%, 55%)`
          ctx.fill()
          ctx.strokeStyle = 'rgba(255,255,255,0.3)'
          ctx.lineWidth = 0.5
          ctx.stroke()
          ctx.fillStyle = 'rgba(255,255,255,0.7)'
          ctx.font = '3px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(node.label, node.x, node.y + r + 4)
        }}
      />
    </div>
  )
}
