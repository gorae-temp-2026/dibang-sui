// Inyeon(인연) 탭 — 디방 유니버스(데이팅·세로피드). 목업 `디방인연_틴더식_목업_260617` 포팅.
// 구조: 다크 셸 + 상단(매칭범위·지갑) + 본문 스크린(유니버스 덱/받은이음/채팅/프로필) + 우측 irail + 시트.
// 흐름: 카드 탐색 → 사진 게이트(2장무료/3장째 요네) → 이음 신청(한마디) → 매칭 → (Moi Credit 재료).
// 받은이음·채팅 화면은 스텁(TODO), 프로필 상세는 ⑤ 공유 프로필 컴포넌트에서 본구현 예정.
import { useMachine, useSelector } from '@xstate/react'
import { giftActor } from '../machines/gift.machine'
import { SlidersHorizontal, Lock } from 'lucide-react'
import { inyeonMachine, type InyeonScreen } from '../machines/inyeon.machine'
import { POOL, TIER_META, MOI_INTRO } from '../components/inyeon/data'
import type { Moi } from '../components/inyeon/types'
import { SwipeDeck } from '../components/inyeon/SwipeDeck'
import { InyeonRail } from '../components/inyeon/InyeonRail'
import { FilterSheet } from '../components/inyeon/FilterSheet'
import { IeumSheet } from '../components/inyeon/IeumSheet'
import { MatchOverlay } from '../components/inyeon/MatchOverlay'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet'
import { ProfileSheet } from '../components/profile/ProfileSheet'
import { useT } from '../lib/i18n'
import { chulsooProfile } from '../components/profile/fixture'
import { chulsooPlazaProfile } from '../components/profile/personaProfiles'
import { ReceivedScreen } from '../components/inyeon/ReceivedScreen'
import { ChatScreen } from '../components/inyeon/ChatScreen'

const moiById = (id: number | null) => (id == null ? null : POOL.find((m) => m.id === id) ?? null)

export function InyeonPage() {
  const [state, send] = useMachine(inyeonMachine)
  const t = useT()
  const giftSignals = useSelector(giftActor, (s) => s.context.signals)

  const {
    queue, photoIdx, unlocked, yone, screen, degMin, degMax, activeId, message, error,
    incoming, chatOpen, sentIds, matchedIds,
    detailId, profileMoiId, myProfileOpen, filterOpen, dmRoomId, memoryId, dms,
  } = state.context
  const unlockedIds = Object.entries(unlocked)
    .filter(([, v]) => v)
    .map(([k]) => Number(k))
  const ieumOpen = state.matches('composing') || state.matches('sending')
  const detailMoi = moiById(detailId)
  const activeMoi = moiById(activeId)
  const profileMoiForSheet = moiById(profileMoiId)
  const profileMeeting = profileMoiForSheet
    ? {
        photoHue: profileMoiForSheet.photos[0]?.hue ?? 210,
        photoUrl: profileMoiForSheet.photos[0]?.url,
        hook: profileMoiForSheet.hook,
        intro: MOI_INTRO[profileMoiForSheet.id],
        prov: profileMoiForSheet.prov.map((p) => ({ emoji: p.emoji, text: p.text, sub: p.sub, tag: TIER_META[p.tier].label })),
        mutualCount: profileMoiForSheet.mutualCount,
        balLabel: profileMoiForSheet.balLabel,
      }
    : undefined

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-5.5rem)] max-w-[420px] flex-col overflow-hidden bg-[#0A1626] text-[#E8EFF6]">
      {/* 상단바 — 매칭범위 · 브랜드 · 요네 지갑 */}
      <header className="flex items-center gap-2.5 border-b border-white/8 bg-[#0a1626]/90 px-4 pb-2.5 pt-3 backdrop-blur">
        <button
          type="button"
          aria-label="매칭 범위"
          onClick={() => send({ type: 'OPEN_FILTER' })}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-[#cfe0ee]"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" />
        </button>
        <div className="flex-1 text-[19px] font-extrabold tracking-tight text-white">{t('inyeon.brand')}</div>
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
              onOpenProfile={(id) => send({ type: 'OPEN_PROFILE', id })}
              onReset={() => send({ type: 'RESET_DECK' })}
            />
          </div>
        )}

        {screen === 'received' && (
          <ReceivedScreen
            incoming={incoming}
            sentIds={sentIds}
            unlockedIds={unlockedIds}
            onAccept={(moiId) => send({ type: 'ACCEPT_REQ', moiId })}
            onDecline={(moiId) => send({ type: 'DECLINE_REQ', moiId })}
            onOpenProfile={(id) => send({ type: 'OPEN_PROFILE', id })}
          />
        )}

        {screen === 'chat' && (
          <ChatScreen
            matchedIds={matchedIds}
            chatOpen={chatOpen}
            dms={dms}
            dmRoomId={dmRoomId}
            memoryId={memoryId}
            onOpenDmRoom={(id) => send({ type: 'OPEN_DM_ROOM', id })}
            onCloseDmRoom={() => send({ type: 'CLOSE_DM_ROOM' })}
            onOpenMemory={(id) => send({ type: 'OPEN_MEMORY', id })}
            onCloseMemory={() => send({ type: 'CLOSE_MEMORY' })}
            onSendDm={(id, text) => send({ type: 'SEND_DM', id, text })}
            onOpenProfile={(id) => send({ type: 'OPEN_PROFILE', id })}
          />
        )}

        {screen === 'me' && <MeScreen onOpenProfile={() => send({ type: 'OPEN_MY_PROFILE' })} />}
      </div>

      {/* 우측 세로 레일 (인연 내부 네비) */}
      <InyeonRail active={screen} onNav={(s: InyeonScreen) => send({ type: 'NAV', screen: s })} />

      {/* 시트 / 오버레이 */}
      <FilterSheet
        open={filterOpen}
        onOpenChange={(o) => send({ type: o ? 'OPEN_FILTER' : 'CLOSE_FILTER' })}
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
        onClose={() => send({ type: 'CLOSE_DETAIL' })}
        onIeum={(id) => send({ type: 'OPEN_IEUM', id })}
        onOpenFull={(id) => send({ type: 'OPEN_PROFILE', id })}
      />
      {/* 내 전체 프로필 — 내 거라 항상 공개(revealed)·풀페이지. chulsooPlazaProfile=가족·만난사람 노드 포함. */}
      <ProfileSheet
        open={myProfileOpen}
        onOpenChange={(o) => send({ type: o ? 'OPEN_MY_PROFILE' : 'CLOSE_MY_PROFILE' })}
        data={chulsooPlazaProfile}
        context="inyeon"
        revealed
        presentation="page"
      />
      {/* 다른 모이 프로필(카드 상세·받은이음·채팅에서 진입) — 이음 전 익명 + 이음 CTA. */}
      <ProfileSheet
        open={profileMoiId != null}
        onOpenChange={(o) => !o && send({ type: 'CLOSE_PROFILE' })}
        data={chulsooProfile}
        context="inyeon"
        presentation="page"
        meeting={profileMeeting}
        giftSignal={profileMoiId != null ? giftSignals[String(profileMoiId)] ?? 0 : 0}
        onIeum={profileMoiId != null ? () => send({ type: 'OPEN_IEUM', id: profileMoiId }) : undefined}
      />
    </div>
  )
}

// 내 프로필 — 앱엔 정성·1층 활동만(절대 신용·신뢰잔액 숫자 노출 금지). 정확 Moi Credit은 온체인.
// 신뢰잔액(2층 상대값)은 '타인 프로필의 나와의 시그널'에만 등장 — 자기 프로필엔 없음.
// "내 전체 프로필" → 공유 ProfileSheet(⑤, 정성). 정확 신용은 온체인 오브젝트 링크로.
function MeScreen({ onOpenProfile }: { onOpenProfile: () => void }) {
  const t = useT()
  const stats: [string, string][] = [
    ['38', t('me.ieum')],
    ['12', t('me.events')],
    ['24', t('me.contrib')],
  ]
  return (
    <div className="h-full overflow-y-auto px-5 pb-6 pt-5">
      <div className="text-center">
        <div className="mx-auto h-24 w-24 rounded-full bg-cover bg-center" style={{ backgroundImage: 'url(/assets/inyeon-photos/my-profile.jpg)' }} />
        <div className="mt-3 text-xl font-extrabold text-white">유상</div>
        <div className="mt-0.5 text-xs text-white/50">{t('me.handle')}</div>
      </div>

      {/* 내가 쌓은 것 = 1층 활동(카운트만). 절대 신용 숫자(신뢰잔액·Moi Credit) 없음. */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="text-[13px] font-bold text-white">🌱 {t('me.builtUp')}</div>
        <div className="mt-3 flex gap-2.5">
          {stats.map(([v, l]) => (
            <div key={l} className="flex-1 rounded-xl bg-white/[0.05] py-2.5 text-center">
              <b className="block text-[17px] font-extrabold text-white">{v}</b>
              <span className="text-[10px] text-white/50">{l}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10.5px] leading-relaxed text-white/45">{t('me.activityNote')}</p>
      </div>

      {/* 크레딧 = 정성(좋음/보통)만. 정확값은 온체인. */}
      <div className="mt-3 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
        <span className="shrink-0 rounded-full bg-[#3FAE6E]/20 px-3 py-1 text-[13px] font-extrabold text-[#6fe0a0]">🪙 {t('me.creditLabel')} · {t('profile.creditGood')}</span>
        <span className="text-[10px] leading-snug text-white/45">{t('profile.creditOnchain')}</span>
      </div>

      <button
        type="button"
        onClick={onOpenProfile}
        className="mt-3 w-full rounded-2xl border border-white/12 bg-white/[0.05] py-3 text-[13px] font-bold text-white"
      >
        🔭 {t('me.viewFull')}
      </button>
      <button
        type="button"
        onClick={() => window.open('https://suiscan.xyz/testnet', '_blank', 'noopener,noreferrer')}
        className="mt-2 w-full rounded-2xl border border-[#F8C57A]/40 bg-[#F8C57A]/[0.08] py-3 text-[13px] font-bold text-[#F8C57A]"
      >
        ⛓ {t('me.checkOnchain')}
      </button>

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="text-[13px] font-bold text-white">{t('me.editTitle')}</div>
        <p className="mt-1.5 text-[10.5px] leading-relaxed text-white/45">{t('me.editHint')}</p>
      </div>
    </div>
  )
}

// 프로필 상세 (경량) — 이음 전 익명 단계. 전체 신뢰네트워크 그래프·signal sunburst는 ⑤ 공유 프로필에서.
function DetailSheet({ moi, onClose, onIeum, onOpenFull }: { moi: Moi | null; onClose: () => void; onIeum: (id: number) => void; onOpenFull: (id: number) => void }) {
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
              style={
                moi.photos[0]?.url
                  ? { backgroundImage: `url(${moi.photos[0].url})` }
                  : { background: `linear-gradient(150deg, hsl(${moi.photos[0]?.hue ?? 210} 52% 34%), hsl(${((moi.photos[0]?.hue ?? 210) + 36) % 360} 48% 16%))` }
              }
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
              onClick={() => onOpenFull(moi.id)}
              className="mt-4 w-full rounded-2xl border border-[#F8C57A]/40 bg-white/[0.04] py-3 text-[13px] font-bold text-[#F8C57A]"
            >
              🔭 전체 프로필 · 신뢰 네트워크 보기
            </button>
            <button
              type="button"
              onClick={() => onIeum(moi.id)}
              className="mt-2.5 w-full rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#2d6a9e] py-3.5 text-[14.5px] font-extrabold text-white"
            >
              이음 신청하기
            </button>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
