import { useCallback, useEffect, useState } from 'react'
import { devLogger, type LogCategory, type LogEntry } from '../lib/devLogger'

const CATEGORIES: LogCategory[] = ['click', 'navigation', 'error', 'state', 'network', 'render', 'console', 'sui', 'auth']
const CAT_COLORS: Record<LogCategory, string> = {
  click: '#F8C57A', navigation: '#87CEEB', error: '#FF6B6B', state: '#A78BFA',
  network: '#34D399', render: '#FB923C', console: '#9CA3AF', sui: '#4DA2FF', auth: '#F472B6',
}

export function DevLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<LogCategory | null>(null)
  const [search, setSearch] = useState('')
  const [highlightCid, setHighlightCid] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const refresh = useCallback(async () => {
    const entries = await devLogger.query({ category: filter ?? undefined, search: search || undefined, limit: 500 })
    setLogs(entries)
    setTotal(await devLogger.count())
  }, [filter, search])

  useEffect(() => { devLogger.init(); refresh() }, [refresh])
  useEffect(() => { const t = setInterval(refresh, 2000); return () => clearInterval(t) }, [refresh])

  const handleClear = async () => { await devLogger.clear(); refresh() }
  const handleDownload = async () => {
    const all = await devLogger.query({ limit: 100000 })
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `dev-logs-${Date.now()}.json`; a.click()
  }

  return (
    <div className="min-h-screen bg-[#0A1626] p-4 font-mono text-xs text-white">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-lg font-bold">Dev Logs</h1>
        <span className="text-white/40">{total} entries</span>
        <input
          type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
          className="ml-auto rounded bg-white/10 px-2 py-1 text-xs text-white placeholder:text-white/30 w-48"
        />
        <button type="button" onClick={handleDownload} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">JSON</button>
        <button type="button" onClick={handleClear} className="rounded bg-red-500/20 px-2 py-1 text-red-400 hover:bg-red-500/30">Clear</button>
        <button type="button" onClick={refresh} className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">Refresh</button>
      </div>

      <div className="mb-3 flex gap-1 flex-wrap">
        <button type="button" onClick={() => setFilter(null)}
          className={`rounded px-2 py-0.5 text-[10px] ${!filter ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50'}`}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} type="button" onClick={() => setFilter(filter === c ? null : c)}
            className={`rounded px-2 py-0.5 text-[10px] ${filter === c ? 'text-white' : 'text-white/50'}`}
            style={{ backgroundColor: filter === c ? CAT_COLORS[c] + '40' : 'rgba(255,255,255,0.03)' }}>
            {c}
          </button>
        ))}
        {highlightCid && (
          <button type="button" onClick={() => setHighlightCid(null)} className="rounded bg-yellow-500/20 px-2 py-0.5 text-[10px] text-yellow-400">
            chain: {highlightCid.slice(0, 15)}… ✕
          </button>
        )}
      </div>

      <div className="max-h-[calc(100vh-120px)] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-[#0A1626]">
            <tr className="text-left text-[10px] text-white/40">
              <th className="w-24 px-1 py-1">Time</th>
              <th className="w-16 px-1">Cat</th>
              <th className="w-32 px-1">Event</th>
              <th className="px-1">Payload</th>
              <th className="w-20 px-1">Chain</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => {
              const isError = l.category === 'error'
              const isHighlighted = highlightCid && l.correlationId === highlightCid
              return (
                <tr key={l.id}
                  className={`border-b border-white/5 ${isError ? 'bg-red-500/10' : ''} ${isHighlighted ? 'bg-yellow-500/10' : ''}`}>
                  <td className="px-1 py-0.5 text-white/30">{new Date(l.ts).toLocaleTimeString('en', { hour12: false, fractionalSecondDigits: 3 })}</td>
                  <td className="px-1"><span className="rounded px-1" style={{ backgroundColor: CAT_COLORS[l.category] + '30', color: CAT_COLORS[l.category] }}>{l.category}</span></td>
                  <td className="px-1 text-white/70">{l.event}</td>
                  <td className="max-w-md truncate px-1 text-white/50">{JSON.stringify(l.payload)?.slice(0, 120)}</td>
                  <td className="px-1">
                    {l.correlationId && (
                      <button type="button" onClick={() => setHighlightCid(l.correlationId!)}
                        className="text-[9px] text-yellow-400/60 hover:text-yellow-400">{l.correlationId.slice(2, 12)}</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {logs.length === 0 && <p className="py-8 text-center text-white/30">No logs</p>}
      </div>
    </div>
  )
}
