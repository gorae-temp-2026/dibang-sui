/**
 * 전체 신뢰 네트워크 그래프 — 로그인 불필요.
 * ?video=0 이면 그래프만 풀스크린. 기본은 좌 영상(60%) + 우 상단 로그(1/3) + 우 하단 그래프(2/3).
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router'
import ForceGraph2D from 'react-force-graph-2d'
// 온체인 읽기: SDK 직접(fullnode) → Go API 프록시(/onchain/*).
import { getOnchainSignals, getOnchainParticipated, getOnchainMoiCreated, getOnchainIumAccepted } from '@gorae/contracts/sdk.gen'

interface RawEdge { from: string; to: string; value: number; kind: string; ts: number }
interface GNode { id: string; label: string; hue: number; signalCount: number; iumCount: number }
interface GLink { source: string; target: string; value: number; kind: string }

function buildGraph(rawEdges: RawEdge[], iumMap: Map<string, string[]>, maxTs: number) {
  const filtered = rawEdges.filter((e) => e.ts <= maxTs)
  const nodeSet = new Set<string>()
  const edgeMap = new Map<string, { value: number; kind: string }>()
  const signalCountMap = new Map<string, number>()
  for (const e of filtered) {
    nodeSet.add(e.from); nodeSet.add(e.to)
    const key = [e.from, e.to].sort().join('|')
    const existing = edgeMap.get(key)
    edgeMap.set(key, { value: (existing?.value ?? 0) + e.value, kind: existing?.kind && !existing.kind.includes(e.kind) ? `${existing.kind}+${e.kind}` : e.kind })
    signalCountMap.set(e.from, (signalCountMap.get(e.from) ?? 0) + 1)
    signalCountMap.set(e.to, (signalCountMap.get(e.to) ?? 0) + 1)
  }
  const nodes: GNode[] = [...nodeSet].map((addr) => ({
    id: addr, label: `${addr.slice(0, 6)}…${addr.slice(-4)}`, hue: parseInt(addr.slice(2, 6), 16) % 360,
    signalCount: signalCountMap.get(addr) ?? 0, iumCount: iumMap.get(addr)?.length ?? 0,
  }))
  const links: GLink[] = [...edgeMap.entries()].map(([key, v]) => { const [s, t] = key.split('|'); return { source: s!, target: t!, value: v.value, kind: v.kind } })
  return { nodes, links }
}

export function TrustGraphPage() {
  const [searchParams] = useSearchParams()
  const showVideo = searchParams.get('video') !== '0'

  const [rawEdges, setRawEdges] = useState<RawEdge[]>([])
  const [iumMap, setIumMap] = useState<Map<string, string[]>>(new Map())
  const [timeSteps, setTimeSteps] = useState<number[]>([])
  const [sliderValue, setSliderValue] = useState(50)
  const [selectedNode, setSelectedNode] = useState<(GNode & { screenX?: number; screenY?: number }) | null>(null)
  const [loading, setLoading] = useState(true)

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
    } else { setSelectedNode(node) }
  }, [])

  useEffect(() => {
    let cancelled = false
    function fetchData() {
    Promise.all([
      getOnchainSignals({ throwOnError: true }),
      getOnchainParticipated({ throwOnError: true }),
      getOnchainMoiCreated({ throwOnError: true }),
      getOnchainIumAccepted({ throwOnError: true }),
    ])
      .then(([sigRes, partRes, _moiRes, iumRes]) => {
        if (cancelled) return
        const signals = sigRes.data ?? []
        const participations = partRes.data ?? []
        const iumAccepted = iumRes.data ?? []
        const edges: RawEdge[] = []; let minTs = Infinity, maxTs = 0
        for (const s of signals) {
          if (s.ts < minTs) minTs = s.ts; if (s.ts > maxTs) maxTs = s.ts
          edges.push({ from: s.from, to: s.to, value: s.magnitude, kind: s.kind === 1 ? 'EM' : 'CS', ts: s.ts })
        }
        const eventTsMap = new Map<string, number>()
        for (const s of signals) { const c = eventTsMap.get(s.eventId); if (!c || s.ts < c) eventTsMap.set(s.eventId, s.ts) }
        const byEvent = new Map<string, string[]>()
        for (const p of participations) { if (!byEvent.has(p.eventId)) byEvent.set(p.eventId, []); byEvent.get(p.eventId)!.push(p.participant) }
        for (const [eid, members] of byEvent.entries()) {
          const ts = eventTsMap.get(eid) ?? (minTs || Date.now())
          for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++)
            edges.push({ from: members[i]!, to: members[j]!, value: 1, kind: 'event', ts })
        }
        const im = new Map<string, string[]>()
        for (const a of iumAccepted) {
          if (!im.has(a.initiator)) im.set(a.initiator, []); im.get(a.initiator)!.push(a.receiver)
          if (!im.has(a.receiver)) im.set(a.receiver, []); im.get(a.receiver)!.push(a.initiator)
        }
        if (minTs === Infinity) minTs = Date.now() - 86400000; if (maxTs === 0) maxTs = Date.now()
        const sortedTs = edges.map(e => e.ts).sort((a, b) => a - b)
        const steps: number[] = []; for (let i = 0; i <= 50; i++) { const idx = Math.min(Math.floor((i / 50) * sortedTs.length), sortedTs.length - 1); steps.push(sortedTs[idx] ?? maxTs) }
        if (steps.length > 0) steps[steps.length - 1] = maxTs
        setRawEdges(edges); setIumMap(im); setTimeSteps(steps); setSliderValue(50); setLoading(false)
      }).catch(() => setLoading(false))
    }
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const currentMaxTs = timeSteps[sliderValue] ?? (timeSteps[timeSteps.length - 1] ?? Date.now())
  const { nodes, links } = useMemo(() => buildGraph(rawEdges, iumMap, currentMaxTs), [rawEdges, iumMap, currentMaxTs])
  const graphData = useMemo(() => ({ nodes, links }), [nodes, links])

  const selectedConnections = useMemo(() => {
    if (!selectedNode) return []
    return links.filter(l => {
      const s = typeof l.source === 'string' ? l.source : (l.source as unknown as GNode).id
      const t = typeof l.target === 'string' ? l.target : (l.target as unknown as GNode).id
      return s === selectedNode.id || t === selectedNode.id
    }).map(l => {
      const s = typeof l.source === 'string' ? l.source : (l.source as unknown as GNode).id
      const t = typeof l.target === 'string' ? l.target : (l.target as unknown as GNode).id
      const o = s === selectedNode.id ? t : s
      return { address: o, label: `${o.slice(0, 6)}…${o.slice(-4)}`, kind: l.kind, value: l.value }
    })
  }, [selectedNode, links])
  const iumPartners = selectedNode ? (iumMap.get(selectedNode.id) ?? []) : []

  const eventLog = useMemo(() => {
    const addr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`
    return rawEdges.filter(e => e.ts <= currentMaxTs).sort((a, b) => b.ts - a.ts).slice(0, 50)
      .map(e => ({ time: new Date(e.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }), from: addr(e.from), to: addr(e.to), kind: e.kind, value: e.value }))
  }, [rawEdges, currentMaxTs])

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0A1626]"><p className="text-white/60">Loading trust graph from on-chain...</p></div>

  const tsLabel = new Date(currentMaxTs).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const gw = typeof window !== 'undefined' ? (showVideo ? Math.floor(window.innerWidth * 0.4) : window.innerWidth) : 800
  const gh = typeof window !== 'undefined' ? (showVideo ? Math.floor(window.innerHeight * 0.66) : window.innerHeight) : 600

  // === 공통: 그래프 + 노드 클릭 패널 ===
  const graphSection = (
    <div className="relative h-full w-full">
      {selectedNode && <div className="absolute inset-0 z-[9]" onClick={() => setSelectedNode(null)} />}
      {selectedNode && (
        <div className="absolute z-10 w-64 rounded-xl bg-black/80 p-3 backdrop-blur text-[10px]"
          style={{ left: selectedNode.screenX ?? 100, top: (selectedNode.screenY ?? 100) - 8, transform: 'translateY(-100%)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full" style={{ background: `hsl(${selectedNode.hue}, 60%, 55%)` }} />
              <div><p className="font-bold text-white text-xs">{selectedNode.label}</p><p className="text-white/40">{selectedNode.signalCount} signals · {selectedNode.iumCount} conn</p></div>
            </div>
            <button type="button" onClick={() => setSelectedNode(null)} className="text-white/50">✕</button>
          </div>
          {iumPartners.length > 0 && <div className="mb-2"><p className="font-bold text-[#F8C57A]">🔗 Partners</p><div className="flex flex-wrap gap-1 mt-1">{iumPartners.map(a => <span key={a} className="rounded-full bg-white/10 px-1.5 py-0.5 text-white/70">{a.slice(0,6)}…{a.slice(-4)}</span>)}</div></div>}
          {selectedConnections.length > 0 && <div className="max-h-24 overflow-y-auto"><p className="font-bold text-white/60">Edges</p>{selectedConnections.map(c => <div key={c.address} className="flex justify-between mt-0.5"><span className="text-white/70">{c.label}</span><span className={c.kind.includes('EM') ? 'text-[#D4687A]' : c.kind.includes('CS') ? 'text-[#5B89B3]' : 'text-white/30'}>{c.kind}·{c.value}</span></div>)}</div>}
        </div>
      )}
      <ForceGraph2D ref={graphRef} graphData={graphData} width={gw} height={gh} backgroundColor="#0A1626"
        cooldownTicks={30} warmupTicks={10} d3AlphaMin={0.05} d3VelocityDecay={0.3} nodeRelSize={6}
        onNodeClick={handleNodeClick}
        nodeColor={(n: GNode) => selectedNode?.id === n.id ? '#F8C57A' : `hsl(${n.hue}, 60%, 55%)`}
        nodeVal={(n: GNode) => Math.max(2, n.signalCount + 1)}
        linkColor={(l: GLink) => l.kind.includes('EM') ? '#D4687A' : l.kind.includes('CS') ? '#5B89B3' : 'rgba(255,255,255,0.12)'}
        linkWidth={(l: GLink) => Math.min(4, Math.log2(l.value + 1) + 0.5)}
        linkDirectionalParticles={2} linkDirectionalParticleWidth={2}
        nodeCanvasObject={(node: GNode & { x?: number; y?: number }, ctx: CanvasRenderingContext2D) => {
          if (node.x == null || node.y == null) return
          const sel = selectedNode?.id === node.id, r = Math.max(4, Math.sqrt(node.signalCount + 1) * 3)
          ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
          ctx.fillStyle = sel ? '#F8C57A' : `hsl(${node.hue}, 60%, 55%)`; ctx.fill()
          ctx.strokeStyle = sel ? '#F8C57A' : 'rgba(255,255,255,0.3)'; ctx.lineWidth = sel ? 2 : 0.5; ctx.stroke()
          ctx.fillStyle = sel ? '#F8C57A' : 'rgba(255,255,255,0.7)'; ctx.font = `${sel ? 'bold ' : ''}3px sans-serif`; ctx.textAlign = 'center'
          ctx.fillText(node.label, node.x, node.y + r + 4)
        }}
      />
    </div>
  )

  // === 공통: 이벤트 로그 ===
  const logSection = (compact: boolean) => (
    <div className={compact ? 'flex-1 overflow-y-auto rounded-lg bg-black/30 px-2 py-1' : 'max-h-[200px] overflow-y-auto px-2 py-1'}>
      {eventLog.length === 0 ? <p className="py-2 text-center text-[10px] text-white/30">No events</p> : eventLog.map((e, i) => (
        <div key={i} className={`flex items-center gap-1 ${compact ? 'py-px text-[8px]' : 'py-0.5 text-[9px]'}`}>
          <span className="text-white/25">{e.time}</span>
          <span className="text-white/50">{e.from}→{e.to}</span>
          <span className={`ml-auto font-bold ${e.kind.includes('EM') ? 'text-[#D4687A]' : e.kind.includes('CS') ? 'text-[#5B89B3]' : 'text-white/20'}`}>{e.kind}{e.value > 1 ? ` ${e.value}` : ''}</span>
        </div>
      ))}
    </div>
  )

  // === 공통: 슬라이더 ===
  const sliderSection = (vertical: boolean) => (
    <div className={`flex ${vertical ? 'flex-col' : ''} items-center gap-1`}>
      <span className="text-[8px] text-white/30">Latest</span>
      <input type="range" min={0} max={50} step={1} value={sliderValue} onChange={e => setSliderValue(Number(e.target.value))}
        className={`cursor-pointer accent-[#F8C57A] ${vertical ? 'flex-1' : 'w-full'}`}
        style={vertical ? { writingMode: 'vertical-lr', direction: 'rtl' } : {}} />
      <span className="text-[8px] text-white/30">Start</span>
    </div>
  )

  // ========== VIDEO MODE: 60/40 split ==========
  if (showVideo) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-[#0A1626]">
        {/* 좌: 영상 60% */}
        <div className="h-full flex-shrink-0" style={{ width: '60%' }}>
          <iframe src="/submit/demo_video_player.html" className="h-full w-full border-none" allow="autoplay" />
        </div>
        {/* 우: 40% — 상 1/3 로그 + 하 2/3 그래프 */}
        <div className="flex h-full flex-1 flex-col border-l border-white/10">
          {/* 우상단 */}
          <div className="flex-shrink-0 border-b border-white/10 p-3" style={{ height: '34%' }}>
            <div className="mb-2">
              <h1 className="text-sm font-bold text-white">Trust Network</h1>
              <p className="text-[10px] text-white/50">{nodes.length} nodes · {links.length} edges · {tsLabel}</p>
              <div className="mt-1 flex gap-2 text-[9px]">
                <span className="text-[#D4687A]">● EM</span><span className="text-[#5B89B3]">● CS</span><span className="text-white/40">● event</span>
              </div>
            </div>
            <div className="flex gap-2" style={{ height: 'calc(100% - 52px)' }}>
              {logSection(true)}
              {sliderSection(true)}
            </div>
          </div>
          {/* 우하단 */}
          <div className="flex-1">{graphSection}</div>
        </div>
      </div>
    )
  }

  // ========== FULL-SCREEN MODE ==========
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0A1626]">
      <div className="absolute left-4 top-4 z-10 rounded-xl bg-black/50 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-bold text-white">Trust Network Graph</h1>
        <p className="mt-1 text-xs text-white/50">{nodes.length} nodes · {links.length} edges</p>
        <p className="mt-0.5 text-[10px] text-white/40">as of {tsLabel}</p>
        <div className="mt-2 flex gap-3 text-[10px]">
          <span className="text-[#D4687A]">● EM (gift)</span><span className="text-[#5B89B3]">● CS (bond)</span><span className="text-white/40">● event</span>
        </div>
      </div>
      <div className="absolute left-1/2 top-4 z-10 w-[520px] -translate-x-1/2 rounded-xl bg-black/60 backdrop-blur">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <span className="text-[11px] font-bold text-white/70">Event Log</span>
          <span className="text-[9px] text-white/40">{eventLog.length} entries</span>
        </div>
        {logSection(false)}
      </div>
      <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-2">
        {sliderSection(true)}
      </div>
      {graphSection}
    </div>
  )
}
