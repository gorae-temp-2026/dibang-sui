/**
 * 전체 Trust Network Graph — 로그인 불필요.
 * 온체인 이벤트(SignalEmitted + Participated + IumAccepted)로 구성.
 * 우측 세로 타임라인 슬라이더 + 노드 클릭 프로필 패널.
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router'
import ForceGraph2D from 'react-force-graph-2d'
import { createJsonRpcClient, getSignalEvents, getParticipatedEvents, getMoiCreatedEvents, getIumAcceptedEvents, configureSui, type SuiNetwork } from '@gorae/sui-sdk'
import { env } from '../env'

interface RawEdge { from: string; to: string; value: number; kind: string; ts: number }
interface GNode { id: string; label: string; hue: number; signalCount: number; iumCount: number }
interface GLink { source: string; target: string; value: number; kind: string }

function buildGraph(rawEdges: RawEdge[], _allAddresses: Set<string>, iumMap: Map<string, string[]>, maxTs: number) {
  const filtered = rawEdges.filter((e) => e.ts <= maxTs)
  const nodeSet = new Set<string>()
  const edgeMap = new Map<string, { value: number; kind: string }>()
  const signalCountMap = new Map<string, number>()

  for (const e of filtered) {
    nodeSet.add(e.from)
    nodeSet.add(e.to)
    const key = [e.from, e.to].sort().join('|')
    const existing = edgeMap.get(key)
    edgeMap.set(key, { value: (existing?.value ?? 0) + e.value, kind: existing?.kind && !existing.kind.includes(e.kind) ? `${existing.kind}+${e.kind}` : e.kind })
    signalCountMap.set(e.from, (signalCountMap.get(e.from) ?? 0) + 1)
    signalCountMap.set(e.to, (signalCountMap.get(e.to) ?? 0) + 1)
  }

  const nodes: GNode[] = [...nodeSet].map((addr) => ({
    id: addr,
    label: `${addr.slice(0, 6)}…${addr.slice(-4)}`,
    hue: parseInt(addr.slice(2, 6), 16) % 360,
    signalCount: signalCountMap.get(addr) ?? 0,
    iumCount: iumMap.get(addr)?.length ?? 0,
  }))
  const links: GLink[] = [...edgeMap.entries()].map(([key, v]) => {
    const [src, tgt] = key.split('|')
    return { source: src!, target: tgt!, value: v.value, kind: v.kind }
  })
  return { nodes, links }
}

export function TrustGraphPage() {
  const [searchParams] = useSearchParams()
  const showVideo = searchParams.get('video') !== '0'
  const [rawEdges, setRawEdges] = useState<RawEdge[]>([])
  const [allAddresses, setAllAddresses] = useState<Set<string>>(new Set())
  const [iumMap, setIumMap] = useState<Map<string, string[]>>(new Map())
  const [timeSteps, setTimeSteps] = useState<number[]>([])
  const [sliderValue, setSliderValue] = useState(50)
  const [selectedNode, setSelectedNode] = useState<(GNode & { screenX?: number; screenY?: number }) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const network = (env.VITE_SUI_NETWORK as SuiNetwork) ?? 'testnet'
    if (env.VITE_SUI_PACKAGE_ID) configureSui({ network, packageId: env.VITE_SUI_PACKAGE_ID })
    const client = createJsonRpcClient(network)

    Promise.all([getSignalEvents(client), getParticipatedEvents(client), getMoiCreatedEvents(client), getIumAcceptedEvents(client)])
      .then(([signals, participations, moiEvents, iumAccepted]) => {
        const addrs = new Set<string>()
        const edges: RawEdge[] = []
        let minTs = Infinity
        let maxTs = 0

        for (const s of signals) {
          addrs.add(s.from); addrs.add(s.to)
          const ts = s.ts
          if (ts < minTs) minTs = ts
          if (ts > maxTs) maxTs = ts
          edges.push({ from: s.from, to: s.to, value: s.magnitude, kind: s.kind === 1 ? 'EM' : 'CS', ts })
        }

        const byEvent = new Map<string, { members: string[]; ts: number }>()
        for (const p of participations) {
          addrs.add(p.participant)
          if (!byEvent.has(p.eventId)) byEvent.set(p.eventId, { members: [], ts: 0 })
          byEvent.get(p.eventId)!.members.push(p.participant)
        }
        // 이벤트별 최소 신호 ts 매핑(참가 엣지에 시점 부여)
        const eventTsMap = new Map<string, number>()
        for (const s of signals) {
          const cur = eventTsMap.get(s.eventId)
          if (!cur || s.ts < cur) eventTsMap.set(s.eventId, s.ts)
        }
        for (const [eid, { members }] of byEvent.entries()) {
          const eventTs = eventTsMap.get(eid) ?? (minTs || Date.now())
          for (let i = 0; i < members.length; i++) {
            for (let j = i + 1; j < members.length; j++) {
              edges.push({ from: members[i]!, to: members[j]!, value: 1, kind: 'event', ts: eventTs })
            }
          }
        }

        for (const m of moiEvents) addrs.add(m.owner)

        // 이음 매핑
        const im = new Map<string, string[]>()
        for (const a of iumAccepted) {
          if (!im.has(a.initiator)) im.set(a.initiator, [])
          im.get(a.initiator)!.push(a.receiver)
          if (!im.has(a.receiver)) im.set(a.receiver, [])
          im.get(a.receiver)!.push(a.initiator)
        }

        if (minTs === Infinity) minTs = Date.now() - 86400000
        if (maxTs === 0) maxTs = Date.now()

        // 50분위수 타임스텝(이벤트 수 균등 분할)
        const sortedTs = edges.map((e) => e.ts).sort((a, b) => a - b)
        const steps: number[] = []
        for (let i = 0; i <= 50; i++) {
          const idx = Math.min(Math.floor((i / 50) * sortedTs.length), sortedTs.length - 1)
          steps.push(sortedTs[idx] ?? maxTs)
        }
        // 중복 제거 + 마지막은 maxTs 보장
        if (steps.length > 0) steps[steps.length - 1] = maxTs

        setRawEdges(edges)
        setAllAddresses(addrs)
        setIumMap(im)
        setTimeSteps(steps)
        setSliderValue(50)
        setLoading(false)
      })
      .catch((e) => { console.error(e); setLoading(false) })
  }, [])

  const currentMaxTs = timeSteps[sliderValue] ?? (timeSteps[timeSteps.length - 1] ?? Date.now())
  const { nodes, links } = useMemo(() => buildGraph(rawEdges, allAddresses, iumMap, currentMaxTs), [rawEdges, allAddresses, iumMap, currentMaxTs])
  const graphData = useMemo(() => ({ nodes, links }), [nodes, links])

  const selectedConnections = useMemo(() => {
    if (!selectedNode) return []
    return links
      .filter((l) => {
        const src = typeof l.source === 'string' ? l.source : (l.source as unknown as GNode).id
        const tgt = typeof l.target === 'string' ? l.target : (l.target as unknown as GNode).id
        return src === selectedNode.id || tgt === selectedNode.id
      })
      .map((l) => {
        const src = typeof l.source === 'string' ? l.source : (l.source as unknown as GNode).id
        const tgt = typeof l.target === 'string' ? l.target : (l.target as unknown as GNode).id
        const other = src === selectedNode.id ? tgt : src
        return { address: other, label: `${other.slice(0, 6)}…${other.slice(-4)}`, kind: l.kind, value: l.value }
      })
  }, [selectedNode, links])

  const iumPartners = selectedNode ? (iumMap.get(selectedNode.id) ?? []) : []

  const graphRef = useRef<any>(null)
  useEffect(() => {
    if (!graphRef.current) return
    graphRef.current.d3Force('charge')?.strength(-300).distanceMax(500)
    graphRef.current.d3Force('link')?.distance(100)
  })
  const handleNodeClick = useCallback((node: GNode & { x?: number; y?: number }) => {
    if (graphRef.current && node.x != null && node.y != null) {
      const coords = graphRef.current.graph2ScreenCoords(node.x, node.y)
      setSelectedNode({ ...node, screenX: coords.x, screenY: coords.y })
    } else {
      setSelectedNode(node)
    }
  }, [])

  const eventLog = useMemo(() => {
    const addr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`
    return rawEdges
      .filter((e) => e.ts <= currentMaxTs)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 50)
      .map((e) => ({
        time: new Date(e.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        from: addr(e.from),
        to: addr(e.to),
        kind: e.kind,
        value: e.value,
      }))
  }, [rawEdges, currentMaxTs])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A1626]">
        <p className="text-white/60">Loading trust graph from on-chain...</p>
      </div>
    )
  }

  const tsLabel = new Date(currentMaxTs).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#0A1626]">
      {showVideo && (
        <div className="h-full w-1/2 flex-shrink-0 border-r border-white/10">
          <iframe
            src="/submit/demo_video_player.html"
            className="h-full w-full border-none"
            allow="autoplay"
          />
        </div>
      )}
      <div className={`relative ${showVideo ? 'w-1/2' : 'w-full'} h-full`}>
      {/* 좌상단 통계 */}
      <div className="absolute left-4 top-4 z-10 rounded-xl bg-black/50 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-bold text-white">Trust Network Graph</h1>
        <p className="mt-1 text-xs text-white/50">{nodes.length} nodes · {links.length} edges</p>
        <p className="mt-0.5 text-[10px] text-white/40">as of {tsLabel}</p>
        <div className="mt-2 flex gap-3 text-[10px]">
          <span className="text-[#D4687A]">● EM (gift)</span>
          <span className="text-[#5B89B3]">● CS (bond)</span>
          <span className="text-white/40">● event</span>
        </div>
      </div>

      {/* 상단 Event Log */}
      <div className="absolute left-1/2 top-4 z-10 w-[520px] -translate-x-1/2 rounded-xl bg-black/60 backdrop-blur">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <span className="text-[11px] font-bold text-white/70">Event Log</span>
          <span className="text-[9px] text-white/40">{eventLog.length} entries (latest 50)</span>
        </div>
        <div className="max-h-[200px] overflow-y-auto px-2 py-1">
          {eventLog.length === 0 ? (
            <p className="py-2 text-center text-[10px] text-white/30">No events</p>
          ) : (
            eventLog.map((e, i) => (
              <div key={i} className="flex items-center gap-1.5 py-0.5 text-[9px]">
                <span className="flex-shrink-0 text-white/30">{e.time}</span>
                <span className="text-white/60">{e.from}</span>
                <span className="text-white/30">→</span>
                <span className="text-white/60">{e.to}</span>
                <span className={`ml-auto flex-shrink-0 font-bold ${e.kind.includes('EM') ? 'text-[#D4687A]' : e.kind.includes('CS') ? 'text-[#5B89B3]' : 'text-white/30'}`}>
                  {e.kind} {e.value > 1 ? e.value : ''}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 우측 세로 타임라인 슬라이더 */}
      <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-2">
        <span className="text-[9px] text-white/40">Latest</span>
        <input
          type="range"
          min={0}
          max={50}
          step={1}
          value={sliderValue}
          onChange={(e) => setSliderValue(Number(e.target.value))}
          className="h-[200px] cursor-pointer accent-[#F8C57A]"
          style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
        />
        <span className="text-[9px] text-white/40">Start</span>
      </div>

      {/* 바깥 클릭 닫기 오버레이 */}
      {selectedNode && (
        <div className="absolute inset-0 z-[9]" onClick={() => setSelectedNode(null)} />
      )}

      {/* 노드 클릭 프로필 패널 — 좌하단 꼭지점이 노드 위에 */}
      {selectedNode && (
        <div
          className="absolute z-10 w-72 rounded-xl bg-black/80 p-4 backdrop-blur"
          style={{
            left: (selectedNode.screenX ?? 100),
            top: (selectedNode.screenY ?? 100) - 8,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full" style={{ background: `hsl(${selectedNode.hue}, 60%, 55%)` }} />
              <div>
                <p className="text-sm font-bold text-white">{selectedNode.label}</p>
                <p className="text-[10px] text-white/40">{selectedNode.signalCount} signals · {selectedNode.iumCount} connections</p>
              </div>
            </div>
            <button type="button" onClick={() => setSelectedNode(null)} className="text-white/50 text-xs">✕</button>
          </div>

          {iumPartners.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-bold text-[#F8C57A]">🔗 Connected partners</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {iumPartners.map((addr) => (
                  <span key={addr} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">{addr.slice(0, 6)}…{addr.slice(-4)}</span>
                ))}
              </div>
            </div>
          )}

          {selectedConnections.length > 0 && (
            <div className="mt-3 max-h-32 overflow-y-auto">
              <p className="text-[10px] font-bold text-white/60">Edges</p>
              {selectedConnections.map((c) => (
                <div key={c.address} className="mt-1 flex items-center justify-between text-[10px]">
                  <span className="text-white/70">{c.label}</span>
                  <span className={c.kind.includes('EM') ? 'text-[#D4687A]' : c.kind.includes('CS') ? 'text-[#5B89B3]' : 'text-white/30'}>
                    {c.kind} · {c.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 그래프 */}
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={typeof window !== 'undefined' ? (showVideo ? window.innerWidth / 2 : window.innerWidth) : 800}
        height={typeof window !== 'undefined' ? window.innerHeight : 600}
        backgroundColor="#0A1626"
        cooldownTicks={30}
        warmupTicks={10}
        d3AlphaMin={0.05}
        d3VelocityDecay={0.3}
        nodeRelSize={6}
        onNodeClick={handleNodeClick}
        nodeColor={(n: GNode) => selectedNode?.id === n.id ? '#F8C57A' : `hsl(${n.hue}, 60%, 55%)`}
        nodeVal={(n: GNode) => Math.max(2, n.signalCount + 1)}
        linkColor={(l: GLink) => l.kind.includes('EM') ? '#D4687A' : l.kind.includes('CS') ? '#5B89B3' : 'rgba(255,255,255,0.12)'}
        linkWidth={(l: GLink) => Math.min(4, Math.log2(l.value + 1) + 0.5)}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        nodeCanvasObject={(node: GNode & { x?: number; y?: number }, ctx: CanvasRenderingContext2D) => {
          if (node.x == null || node.y == null) return
          const isSelected = selectedNode?.id === node.id
          const r = Math.max(4, Math.sqrt(node.signalCount + 1) * 3)
          ctx.beginPath()
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
          ctx.fillStyle = isSelected ? '#F8C57A' : `hsl(${node.hue}, 60%, 55%)`
          ctx.fill()
          if (isSelected) { ctx.strokeStyle = '#F8C57A'; ctx.lineWidth = 2 }
          else { ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.5 }
          ctx.stroke()
          ctx.fillStyle = isSelected ? '#F8C57A' : 'rgba(255,255,255,0.7)'
          ctx.font = `${isSelected ? 'bold ' : ''}3px sans-serif`
          ctx.textAlign = 'center'
          ctx.fillText(node.label, node.x, node.y + r + 4)
        }}
      />
      </div>
    </div>
  )
}
