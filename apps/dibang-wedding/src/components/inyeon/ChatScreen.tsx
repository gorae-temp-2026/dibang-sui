// 디방인연 채팅 화면 — 목업 chat 스크린 포팅. 메모리 스트립(이음된 모이 짧은 영상) + 대화(DM) 목록.
// 대화 열기 = 관계 거리별 요네 게이트(0/50/200, 머신 OPEN_DM). 대화방 상단 이름·사진 → 프로필(§13-5).
// ★ 모든 대화(DM)는 인연(유니버스)에서 — 라운지에서 이음해도 대화는 여기(핸드오프 §12-3).
import { useState } from 'react'
import { ArrowLeft, Lock, Play, Send, X } from 'lucide-react'
import { POOL, DM_COST, MOI_MEM } from './data'
import { cn } from '../../lib/utils'

const moiById = (id: number) => POOL.find((m) => m.id === id)
const photoBg = (hue: number) => `linear-gradient(150deg, hsl(${hue} 52% 34%), hsl(${(hue + 36) % 360} 48% 16%))`

interface DmMsg {
  sys?: string
  me?: string
  them?: string
}
const seedDm = (): DmMsg[] => [
  { sys: '온라인 이음 완료 · 소속·중심 네트워크는 오프라인에서 만나면 공개돼요' },
  { sys: '모든 대화(DM)는 디방 인연에서 이뤄져요. 이 대화는 신뢰 attestation 기록으로 쌓여요.' },
  { them: '반가워요 :) 온라인에서 먼저 이야기 나눠요' },
]

interface ChatScreenProps {
  matchedIds: number[]
  chatOpen: Record<number, boolean>
  yone: number
  onOpenDm: (id: number) => void
  onOpenProfile: (id: number) => void
}

export function ChatScreen({ matchedIds, chatOpen, yone, onOpenDm, onOpenProfile }: ChatScreenProps) {
  const [dmRoomId, setDmRoomId] = useState<number | null>(null)
  const [memoryId, setMemoryId] = useState<number | null>(null)
  const [dms, setDms] = useState<Record<number, DmMsg[]>>({})

  // 대화 열기 = 관계 거리별 요네 게이트(머신 OPEN_DM 차감). 통과하면 대화방 입장.
  const enter = (id: number) => {
    if (chatOpen[id]) {
      setDmRoomId(id)
      return
    }
    const m = moiById(id)
    if (!m) return
    onOpenDm(id) // 머신: 차감 또는 요네 부족 에러
    if (yone >= DM_COST[m.tier]) setDmRoomId(id)
  }

  const send = (id: number, text: string) => {
    setDms((prev) => ({ ...prev, [id]: [...(prev[id] ?? seedDm()), { me: text }] }))
    setTimeout(() => {
      setDms((prev) => ({ ...prev, [id]: [...(prev[id] ?? seedDm()), { them: '반가워요! 곧 또 같은 이벤트에서 만나면 네트워크도 이어지겠네요 :)' }] }))
    }, 900)
  }

  const matched = matchedIds.map(moiById).filter((m): m is NonNullable<typeof m> => !!m)

  if (matched.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="text-lg font-extrabold text-white">메모리 · 대화</div>
        <p className="text-[12.5px] leading-relaxed text-white/50">
          아직 이음된 모이가 없어요.<br />이음을 신청하고 수락되면 여기서 대화가 시작돼요.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-4 pb-6 pt-4">
      {/* 메모리 스트립 */}
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-[14px] font-extrabold text-white">🎞️ 메모리</span>
        <span className="text-[10.5px] text-white/40">이음된 모이가 올린 짧은 영상</span>
      </div>
      <div className="mb-4 flex gap-3 overflow-x-auto pb-1">
        {matched.map((m) => (
          <button key={m.id} type="button" onClick={() => setMemoryId(m.id)} className="flex flex-shrink-0 flex-col items-center gap-1">
            <span className="relative grid h-[58px] w-[58px] place-items-center rounded-full bg-gradient-to-br from-[#F8C57A] to-[#5AA3D6] p-[2.5px]">
              <span className="h-full w-full rounded-full bg-cover bg-center" style={{ background: photoBg(m.photos[0]?.hue ?? 210) }} />
              <Play className="absolute h-4 w-4 fill-white text-white drop-shadow" />
            </span>
            <span className="text-[10px] font-bold text-white/80">{m.name}</span>
          </button>
        ))}
      </div>

      {/* 대화 목록 */}
      <div className="mb-2 text-[14px] font-extrabold text-white">대화</div>
      <div className="space-y-2">
        {matched.map((m) => {
          const open = !!chatOpen[m.id]
          const cost = DM_COST[m.tier]
          return (
            <div key={m.id} className={cn('flex items-center gap-3 rounded-2xl border p-3', open ? 'border-white/8 bg-white/[0.04]' : 'border-white/8 bg-white/[0.02]')}>
              <div className="relative h-12 w-12 flex-shrink-0 rounded-full bg-cover bg-center" style={{ background: photoBg(m.photos[0]?.hue ?? 210) }}>
                {m.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0A1626] bg-[#46d77f]" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[13.5px] font-bold text-white">
                  {m.name}
                  {open && <span className="rounded bg-[#F8C57A]/20 px-1.5 py-0.5 text-[9px] font-extrabold text-[#F8C57A]">이음</span>}
                </div>
                <div className="text-[11.5px] text-white/45">{open ? '대화를 시작해보세요' : `이음 수락됨 · 대화 열기 🪙${cost}`}</div>
              </div>
              {open ? (
                <button type="button" onClick={() => enter(m.id)} className="rounded-lg bg-white/[0.08] px-3 py-2 text-[11.5px] font-bold text-white">열기</button>
              ) : (
                <button type="button" onClick={() => enter(m.id)} className="flex items-center gap-1 rounded-lg bg-gradient-to-br from-[#2E5E8A] to-[#5AA3D6] px-3 py-2 text-[11.5px] font-extrabold text-white">
                  <Lock className="h-3 w-3" /> 🪙{cost}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {dmRoomId != null && (
        <DmRoom
          moiId={dmRoomId}
          msgs={dms[dmRoomId] ?? seedDm()}
          onSend={(t) => send(dmRoomId, t)}
          onClose={() => setDmRoomId(null)}
          onOpenProfile={() => onOpenProfile(dmRoomId)}
        />
      )}
      {memoryId != null && <MemoryViewer moiId={memoryId} onClose={() => setMemoryId(null)} />}
    </div>
  )
}

function DmRoom({ moiId, msgs, onSend, onClose, onOpenProfile }: { moiId: number; msgs: DmMsg[]; onSend: (t: string) => void; onClose: () => void; onOpenProfile: () => void }) {
  const [text, setText] = useState('')
  const m = moiById(moiId)
  if (!m) return null
  const submit = () => {
    const v = text.trim()
    if (!v) return
    onSend(v)
    setText('')
  }
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#0A1626]">
      <header className="flex items-center gap-2.5 border-b border-white/8 px-3 py-3">
        <button type="button" aria-label="뒤로" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button type="button" onClick={onOpenProfile} className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="h-9 w-9 flex-shrink-0 rounded-full bg-cover bg-center" style={{ background: photoBg(m.photos[0]?.hue ?? 210) }} />
          <span className="min-w-0 text-left">
            <span className="block truncate text-[14px] font-bold text-white">{m.name}</span>
            <span className="block text-[10.5px] text-white/45">{m.online ? '접속 중' : '오프라인'} · 탭하여 프로필</span>
          </span>
        </button>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {msgs.map((msg, i) =>
          msg.sys ? (
            <div key={i} className="mx-auto max-w-[85%] rounded-xl bg-white/[0.04] px-3 py-2 text-center text-[10.5px] leading-relaxed text-white/45">{msg.sys}</div>
          ) : msg.me ? (
            <div key={i} className="ml-auto max-w-[78%] rounded-2xl rounded-br-md bg-gradient-to-br from-[#2E5E8A] to-[#5AA3D6] px-3.5 py-2 text-[13px] text-white">{msg.me}</div>
          ) : (
            <div key={i} className="mr-auto max-w-[78%] rounded-2xl rounded-bl-md bg-white/[0.08] px-3.5 py-2 text-[13px] text-white">{msg.them}</div>
          ),
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-white/8 px-3 py-2.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="메시지 — 모든 대화(DM)는 인연에서"
          className="flex-1 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2.5 text-[13px] text-white placeholder:text-white/35 focus:outline-none"
        />
        <button type="button" aria-label="보내기" onClick={submit} className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#2E5E8A] to-[#5AA3D6] text-white">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function MemoryViewer({ moiId, onClose }: { moiId: number; onClose: () => void }) {
  const m = moiById(moiId)
  if (!m) return null
  const views = (moiId % 30) + 12
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black/80 backdrop-blur" onClick={onClose}>
      <div className="relative flex-1 bg-cover bg-center" style={{ background: photoBg(m.photos[1]?.hue ?? m.photos[0]?.hue ?? 210) }}>
        <button type="button" aria-label="닫기" onClick={onClose} className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white">
          <X className="h-5 w-5" />
        </button>
        <div className="absolute inset-x-0 top-0 flex items-center gap-2.5 bg-gradient-to-b from-black/55 to-transparent p-4">
          <span className="h-10 w-10 rounded-full border-2 border-white/70 bg-cover bg-center" style={{ background: photoBg(m.photos[0]?.hue ?? 210) }} />
          <div className="leading-tight">
            <div className="text-[14px] font-extrabold text-white">{m.name}</div>
            <div className="text-[11px] text-white/70">▶ 2초 메모리 · {views}명이 봤어요</div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-5 pb-8">
          <p className="text-[14px] font-bold text-white">{MOI_MEM[moiId] ?? '최근 메모리'}</p>
        </div>
      </div>
    </div>
  )
}
