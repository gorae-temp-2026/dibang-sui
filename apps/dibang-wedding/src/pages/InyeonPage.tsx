// Inyeon(인연) 탭 — 디방 유니버스(데이팅·세로피드). 목업 `디방인연_틴더식_목업_260617` 포팅.
// 구조: 다크 셸 + 상단(매칭범위·지갑) + 본문 스크린(유니버스 덱/받은이음/채팅/프로필) + 우측 irail + 시트.
// 흐름: 카드 탐색 → 사진 게이트(2장무료/3장째 요네) → 이음 신청(한마디) → 매칭 → (Moi Credit 재료).
// 받은이음·채팅 화면은 스텁(TODO), 프로필 상세는 ⑤ 공유 프로필 컴포넌트에서 본구현 예정.
import { useState } from 'react'
import { useMachine } from '@xstate/react'
import { SlidersHorizontal, Lock } from 'lucide-react'
import { inyeonMachine, type InyeonScreen } from '../machines/inyeon.machine'
import { POOL, TIER_META } from '../components/inyeon/data'
import type { Moi } from '../components/inyeon/types'
import { SwipeDeck } from '../components/inyeon/SwipeDeck'
import { InyeonRail } from '../components/inyeon/InyeonRail'
import { FilterSheet } from '../components/inyeon/FilterSheet'
import { IeumSheet } from '../components/inyeon/IeumSheet'
import { MatchOverlay } from '../components/inyeon/MatchOverlay'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet'
import { ProfileSheet } from '../components/profile/ProfileSheet'
import { chulsooProfile } from '../components/profile/fixture'

const moiById = (id: number | null) => (id == null ? null : POOL.find((m) => m.id === id) ?? null)

export function InyeonPage() {
  const [state, send] = useMachine(inyeonMachine)
  const [filterOpen, setFilterOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  const { queue, photoIdx, unlocked, yone, screen, degMin, degMax, activeId, message, error } = state.context
  const ieumOpen = state.matches('composing') || state.matches('sending')
  const detailMoi = moiById(detailId)
  const activeMoi = moiById(activeId)

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-5.5rem)] max-w-[420px] flex-col overflow-hidden bg-[#0A1626] text-[#E8EFF6]">
      {/* 상단바 — 매칭범위 · 브랜드 · 요네 지갑 */}
      <header className="flex items-center gap-2.5 border-b border-white/8 bg-[#0a1626]/90 px-4 pb-2.5 pt-3 backdrop-blur">
        <button
          type="button"
          aria-label="매칭 범위"
          onClick={() => setFilterOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-[#cfe0ee]"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" />
        </button>
        <div className="flex-1 text-[19px] font-extrabold tracking-tight text-white">디방인연</div>
        <div className="rounded-full bg-gradient-to-br from-[#F8C57A] to-[#E8A865] px-3 py-1.5 text-xs font-extrabold text-[#5a3a12]">
          🪙 {yone.toLocaleString()}
        </div>
      </header>

      {/* 본문 스크린 */}
      <div className="relative flex-1 overflow-hidden">
        {screen === 'universe' && (
          <div className="flex h-full flex-col">
            <SwipeDeck
              queue={queue}
              photoIdx={photoIdx}
              unlocked={unlocked}
              onPhotoNav={(id, dir) => send({ type: 'PHOTO_NAV', id, dir })}
              onUnlock={(id) => send({ type: 'UNLOCK_PHOTOS', id })}
              onIeum={(id) => send({ type: 'OPEN_IEUM', id })}
              onSwipeNext={() => send({ type: 'SWIPE_NEXT' })}
              onOpenDetail={(id) => setDetailId(id)}
              onReset={() => send({ type: 'RESET_DECK' })}
            />
          </div>
        )}

        {screen === 'received' && (
          <ScreenStub
            title="받은 이음 · 관심"
            lines={[
              '나에게 온 이음 신청(수락/거절) · 내가 보낸 이음(대기).',
              '관심 = 내 사진을 연 모이 · 내가 연 모이.',
            ]}
            todo="TODO(②): reqList/sentList + 관심 그리드(blur 잠금) 포팅."
          />
        )}

        {screen === 'chat' && (
          <ScreenStub
            title="메모리 · 대화"
            lines={['이음된 모이의 짧은 영상(메모리) + 대화 목록.', '대화 열기 = 관계 거리별 요네(0 / 50 / 200).']}
            todo="TODO(②): 메모리 스트립 + DM 목록/대화방 포팅(대화는 인연 영역)."
          />
        )}

        {screen === 'me' && <MeScreen onOpenProfile={() => setProfileOpen(true)} />}
      </div>

      {/* 우측 세로 레일 (인연 내부 네비) */}
      <InyeonRail active={screen} onNav={(s: InyeonScreen) => send({ type: 'NAV', screen: s })} />

      {/* 시트 / 오버레이 */}
      <FilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        degMin={degMin}
        degMax={degMax}
        onApply={(min, max) => send({ type: 'SET_FILTER', degMin: min, degMax: max })}
      />
      <IeumSheet
        open={ieumOpen}
        moi={activeMoi}
        message={message}
        sending={state.matches('sending')}
        error={error}
        onMessage={(m) => send({ type: 'SET_MESSAGE', message: m })}
        onSend={() => send({ type: 'SEND_IEUM' })}
        onCancel={() => send({ type: 'CANCEL_IEUM' })}
      />
      <MatchOverlay
        open={state.matches('matched')}
        moi={activeMoi}
        onDismiss={() => send({ type: 'DISMISS_MATCH' })}
        onOpenChat={() => {
          send({ type: 'DISMISS_MATCH' })
          send({ type: 'NAV', screen: 'chat' })
        }}
      />
      <DetailSheet
        moi={detailMoi}
        onClose={() => setDetailId(null)}
        onIeum={(id) => {
          setDetailId(null)
          send({ type: 'OPEN_IEUM', id })
        }}
      />
      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} data={chulsooProfile} context="inyeon" />
    </div>
  )
}

function ScreenStub({ title, lines, todo }: { title: string; lines: string[]; todo: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="text-lg font-extrabold text-white">{title}</div>
      <div className="space-y-1 text-[12.5px] leading-relaxed text-white/55">
        {lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
      <span className="mt-2 rounded-full border border-white/12 px-3 py-1 text-[10px] font-bold text-white/40">{todo}</span>
    </div>
  )
}

// 내 프로필 — 신뢰잔액(Moi Credit 재료)이 데모 핵심이라 정적으로 표시. 편집/업로드는 TODO.
// "내 전체 프로필" → 공유 ProfileSheet(⑤): ① 연결 그래프 + ② signal sunburst + Moi Credit raw→층→공식.
function MeScreen({ onOpenProfile }: { onOpenProfile: () => void }) {
  return (
    <div className="h-full overflow-y-auto px-5 pb-6 pt-5">
      <div className="text-center">
        <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-[#FCE6EC] to-[#E8F4FA]" />
        <div className="mt-3 text-xl font-extrabold text-white">유상</div>
        <div className="mt-0.5 text-xs text-white/50">모이 #1024 · 서울</div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center text-[13px] font-bold text-white">
          🪙 내 신뢰잔액
          <span className="ml-auto text-[10.5px] font-medium text-white/45">Moi Credit 재료</span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-1.5">
          <b className="text-[32px] font-black tracking-tight text-white">724</b>
          <span className="text-xs text-white/50">/ 신뢰 점수</span>
        </div>
        <div className="mt-3.5 flex gap-2.5">
          {[
            ['38', '이음'],
            ['12', '함께한 이벤트'],
            ['상위 9%', '네트워크 중심성'],
          ].map(([v, l]) => (
            <div key={l} className="flex-1 rounded-xl bg-white/[0.05] py-2.5 text-center">
              <b className="block text-[17px] font-extrabold text-white">{v}</b>
              <span className="text-[10px] text-white/50">{l}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10.5px] leading-relaxed text-white/45">
          이음·이벤트 참여·기여가 신뢰 attestation으로 쌓여 신뢰잔액이 돼요. 이 잔액이 Moi Credit(온체인 신용)의
          재료입니다. ※ 타인에겐 익명(범위)으로만 보여요.
        </p>
      </div>

      <button
        type="button"
        onClick={onOpenProfile}
        className="mt-3 w-full rounded-2xl border border-[#F8C57A]/40 bg-white/[0.05] py-3 text-[13px] font-bold text-[#F8C57A]"
      >
        🔭 내 전체 프로필 · Moi Credit 분석 보기
      </button>

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="text-[13px] font-bold text-white">✍️ 인연 소개글 · 노출 설정</div>
        <p className="mt-1.5 text-[10.5px] leading-relaxed text-white/45">
          추가 사진 업로드 · 소개글 · 매칭 풀 노출 토글 — TODO(②). 대표 사진은 Setting에서 변경.
        </p>
      </div>
    </div>
  )
}

// 프로필 상세 (경량) — 이음 전 익명 단계. 전체 신뢰네트워크 그래프·signal sunburst는 ⑤ 공유 프로필에서.
function DetailSheet({ moi, onClose, onIeum }: { moi: Moi | null; onClose: () => void; onIeum: (id: number) => void }) {
  return (
    <Sheet open={!!moi} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom">
        {moi && (
          <>
            <SheetHeader>
              <SheetTitle>{TIER_META[moi.tier].label}</SheetTitle>
            </SheetHeader>
            <div
              className="mb-3 h-40 rounded-2xl bg-cover bg-[center_18%]"
              style={{ background: `linear-gradient(150deg, hsl(${moi.photos[0]?.hue ?? 210} 52% 34%), hsl(${((moi.photos[0]?.hue ?? 210) + 36) % 360} 48% 16%))` }}
            />
            <div className="space-y-2">
              {moi.prov.map((p) => (
                <div key={p.text} className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5">
                  <span className="text-lg">{p.emoji}</span>
                  <div className="min-w-0">
                    <b className="text-[13px] font-bold text-white">{p.text}</b>
                    {p.sub && <span className="block text-[11px] text-white/50">{p.sub}</span>}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5 text-[12px] text-white/70">
                🤝 공통으로 아는 사람 {moi.mutualCount}명 · 신뢰 {moi.balLabel}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-2.5 text-[11px] text-white/45">
                <Lock className="h-4 w-4 flex-shrink-0" />
                이름·소속·전체 신뢰네트워크는 이음 후 공개돼요. (전체 그래프·signal은 ⑤ 공유 프로필)
              </div>
            </div>
            <button
              type="button"
              onClick={() => onIeum(moi.id)}
              className="mt-4 w-full rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#2d6a9e] py-3.5 text-[14.5px] font-extrabold text-white"
            >
              이음 신청하기
            </button>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
