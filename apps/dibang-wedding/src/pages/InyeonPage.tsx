// Inyeon(인연) 탭 — 디방 유니버스(데이팅·세로피드). 목업 `디방인연_틴더식_목업_260617` 포팅.
// 구조: 다크 셸 + 상단(매칭범위·지갑) + 본문 스크린(유니버스 덱/받은이음/채팅/프로필) + 우측 irail + 시트.
// 흐름: 카드 탐색 → 사진 게이트(2장무료/3장째 요네) → 이음 신청(한마디) → 매칭 → (Moi Credit 재료).
// 받은이음·채팅 화면은 스텁(TODO), 프로필 상세는 ⑤ 공유 프로필 컴포넌트에서 본구현 예정.
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useMachine, useSelector } from '@xstate/react'
import { fromPromise } from 'xstate'
import { normalizeSuiAddress } from '@mysten/sui/utils'
import { giftActor } from '../machines/gift.machine'
import { SlidersHorizontal, Lock } from 'lucide-react'
import { inyeonMachine, type InyeonScreen } from '../machines/inyeon.machine'
import { useOnchainHostActions } from '../hooks/useOnchainHostActions'
import { useDiscoverUsers } from '../hooks/useDiscoverUsers'
import { TIER_META, MOI_INTRO } from '../components/inyeon/data'
import type { Moi } from '../components/inyeon/types'
import { SwipeDeck } from '../components/inyeon/SwipeDeck'
import { InyeonRail } from '../components/inyeon/InyeonRail'
import { FilterSheet } from '../components/inyeon/FilterSheet'
import { IeumSheet } from '../components/inyeon/IeumSheet'
import { MatchOverlay } from '../components/inyeon/MatchOverlay'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet'
import { ProfileSheet } from '../components/profile/ProfileSheet'
import { buildProfileFromMoi } from '../hooks/useOnchainProfile'
import { ReceivedScreen } from '../components/inyeon/ReceivedScreen'
import { ChatScreen } from '../components/inyeon/ChatScreen'
import { MoiGateModal } from '../components/MoiGateModal'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { useMyCreditStats } from '../hooks/useCredit'
import { useOwnedItems } from '../hooks/useOwnedItems'
import { useSuiBalance } from '../hooks/useSuiBalance'
import { useNotes } from '../hooks/useNotes'
import { useGiftLog } from '../hooks/useGiftLog'
import { useAuth } from '../providers/AuthContext'
import { useInyeonProfile, fileToWalrusPhoto, fileToProfileDataUrl } from '../stores/inyeonProfile'
import { useInyeonProfileSync } from '../hooks/useInyeonProfileSync'
import { useT } from '../lib/i18n'

export function InyeonPage() {
  const t = useT()
  const { requestIum, acceptIum, purchaseItem } = useOnchainHostActions()
  const { items: ownedOnchainItems, refetch: refetchItems } = useOwnedItems()
  const { balanceSui, refetch: refetchBalance } = useSuiBalance()
  const zk = useZkLogin()
  const { data: myStats } = useMyCreditStats(zk.address ?? undefined)
  const myCreditScore = myStats?.score ?? 0
  const toSignalNode = (em: number, cs: number) => ({ name: 'root', children: [
    { name: 'EM', value: em }, { name: 'CS', value: cs }, { name: 'AR', value: 0, stub: true }, { name: 'MP', value: 0, stub: true },
  ] })
  const noteActions = useNotes()
  const { gifts: onchainGiftLog, refetch: refetchGiftLog } = useGiftLog()
  const { users: discoveredUsers, incoming: discoveredIncoming, sentMoiIds, matchedAddresses, mySignal, loading: discoverLoading, refetch: refetchDiscover } = useDiscoverUsers()
  const pool = discoveredUsers
  const moiById = (id: number | null) => (id == null ? null : pool.find((m) => m.id === id) ?? null)

  const machine = useMemo(
    () =>
      inyeonMachine.provide({
        actors: {
          sendIeum: fromPromise<{ accepted: boolean }, { targetId: number | null }>(async ({ input }) => {
            if (input.targetId != null) {
              const target = pool.find((m) => m.id === input.targetId)
              const suiAddress = target && (target as Moi & { suiAddress?: string }).suiAddress
              if (suiAddress) await requestIum({ toUser: suiAddress })
            }
            return { accepted: true }
          }),
        },
      }),
    [requestIum, pool],
  )
  const [state, send] = useMachine(machine)

  useEffect(() => {
    if (discoveredUsers.length > 0) {
      send({ type: 'SET_POOL', pool: discoveredUsers })
    }
  }, [discoveredUsers, send])
  useEffect(() => {
    if (discoveredIncoming.length > 0) {
      send({ type: 'SET_INCOMING', incoming: discoveredIncoming })
    }
  }, [discoveredIncoming, send])
  useEffect(() => {
    if (matchedAddresses.length > 0 && pool.length > 0) {
      const moiIds = matchedAddresses
        .map((addr) => {
          const norm = normalizeSuiAddress(addr)
          return pool.find((m) => normalizeSuiAddress((m as Moi & { suiAddress?: string }).suiAddress ?? '') === norm)?.id
        })
        .filter((id): id is number => id != null)
      if (moiIds.length > 0) send({ type: 'SET_MATCHED', moiIds })
    }
  }, [matchedAddresses, pool, send])
  const giftSignals = useSelector(giftActor, (s) => s.context.signals)

  const {
    queue, photoIdx, unlocked, screen, degMin, degMax, activeId, message, error,
    incoming, chatOpen, sentIds, matchedIds,
    detailId, profileMoiId, myProfileOpen, filterOpen, dmRoomId, memoryId,
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
      {/* Moi 미보유 시 강제 생성 게이트 — 인연은 Moi 아바타가 핵심인 기능. */}
      <MoiGateModal />
      {/* 상단바 — 매칭범위 · 브랜드 · 요네 지갑 */}
      <header className="flex items-center gap-2.5 border-b border-white/8 bg-[#0a1626]/90 px-4 pb-2.5 pt-3 backdrop-blur">
        <button
          type="button"
          aria-label={t('page.inyeon.matchRange')}
          onClick={() => send({ type: 'OPEN_FILTER' })}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-[#cfe0ee]"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" />
        </button>
        <div className="flex-1 text-[19px] font-extrabold tracking-tight text-white">{t('inyeon.brand')}</div>
        <div className="rounded-full bg-gradient-to-br from-[#4DA2FF] to-[#2E7BD6] px-3 py-1.5 text-xs font-extrabold text-white">
          💧 {balanceSui.toFixed(3)} SUI
        </div>
      </header>

      {/* 본문 스크린 */}
      <div className="relative flex-1 overflow-x-hidden overflow-y-visible">
        {screen === 'universe' && discoverLoading && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-white/50">{t('page.inyeon.finding')}</p>
          </div>
        )}
        {screen === 'universe' && !discoverLoading && (
          <div className="flex h-full flex-col">
            <SwipeDeck
              pool={pool}
              queue={queue}
              photoIdx={photoIdx}
              unlocked={unlocked}
              onPhotoNav={(id, dir) => send({ type: 'PHOTO_NAV', id, dir })}
              onUnlock={(id) => send({ type: 'UNLOCK_PHOTOS', id })}
              onSwipeNext={() => send({ type: 'SWIPE_NEXT' })}
              onOpenProfile={(id) => send({ type: 'OPEN_PROFILE', id })}
              onIeum={(id) => send({ type: 'OPEN_IEUM', id })}
              onReset={() => send({ type: 'RESET_DECK' })}
            />
          </div>
        )}

        {screen === 'received' && discoverLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
          </div>
        )}
        {screen === 'received' && !discoverLoading && (
          <ReceivedScreen
            pool={pool}
            incoming={incoming}
            sentIds={[...new Set([...sentIds, ...sentMoiIds])]}
            unlockedIds={unlockedIds}
            onAccept={async (moiId) => {
              const req = incoming.find((r) => r.moiId === moiId)
              if (req?.eventId && req?.requestId) {
                try {
                  await acceptIum({ eventId: req.eventId, requestId: req.requestId })
                  send({ type: 'ACCEPT_REQ', moiId })
                  refetchDiscover()
                } catch (e) {
                  console.error('[accept ieum] failed:', e)
                }
              } else {
                console.warn('[accept ieum] missing eventId/requestId for moiId:', moiId, req)
                send({ type: 'ACCEPT_REQ', moiId })
              }
            }}
            onDecline={(moiId) => send({ type: 'DECLINE_REQ', moiId })}
            onOpenProfile={(id) => send({ type: 'OPEN_PROFILE', id })}
          />
        )}

        {screen === 'chat' && discoverLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
          </div>
        )}
        {screen === 'chat' && !discoverLoading && (
          <ChatScreen
            pool={pool}
            matchedIds={matchedIds}
            chatOpen={chatOpen}
            dmRoomId={dmRoomId}
            memoryId={memoryId}
            ownedOnchainItems={ownedOnchainItems}
            suiBalance={balanceSui}
            onPurchase={async (name, itemType, slot) => {
              const config = (await import('@gorae/sui-sdk')).getConfig()
              await purchaseItem({
                registryId: config.shopRegistryId!,
                nonce: crypto.randomUUID(),
                name,
                itemType,
                slot,
              })
              refetchItems()
              refetchBalance()
            }}
            onSendOnchainGift={async (recipientAddress) => {
              const { createJsonRpcClient, getParticipationForEvent, getIumAcceptedEvents, buildPurchaseAndGiftTx, getConfig } = await import('@gorae/sui-sdk')
              const config = getConfig()
              const client = createJsonRpcClient((config.network as 'testnet') ?? 'testnet')
              const addr = zk.address
              if (!addr) throw new Error('로그인 필요')
              const accepted = await getIumAcceptedEvents(client)
              const myMatch = accepted.find(a =>
                (a.initiator === addr && a.receiver === recipientAddress) ||
                (a.receiver === addr && a.initiator === recipientAddress)
              )
              if (!myMatch) throw new Error('이음 매칭을 찾을 수 없음')
              const part = await getParticipationForEvent(client, addr, myMatch.eventId)
              if (!part) throw new Error('Participation을 찾을 수 없음')
              // 한 PTB: purchase_item → gift (구매+선물 동시)
              const tx = buildPurchaseAndGiftTx({
                participationId: part.id,
                recipient: recipientAddress,
                registryId: config.shopRegistryId!,
                nonce: crypto.randomUUID(),
                name: 'Gift Item',
                itemType: 'gift',
                slot: 'gift',
              })
              await zk.executeOnchain(tx)
              refetchItems()
              refetchBalance()
              refetchGiftLog()
            }}
            onOpenDmRoom={(id) => send({ type: 'OPEN_DM_ROOM', id })}
            onCloseDmRoom={() => send({ type: 'CLOSE_DM_ROOM' })}
            onOpenMemory={(id) => send({ type: 'OPEN_MEMORY', id })}
            onCloseMemory={() => send({ type: 'CLOSE_MEMORY' })}
            onSendDm={(id, text) => {
              send({ type: 'SEND_DM', id, text })
              const target = pool.find((m) => m.id === id)
              const suiAddr = target && (target as Moi & { suiAddress?: string }).suiAddress
              if (suiAddr) noteActions.sendNote(suiAddr, text).catch(() => {})
            }}
            onOpenProfile={(id) => send({ type: 'OPEN_PROFILE', id })}
            notes={noteActions.notes}
            myAddress={zk.address}
            onchainGiftLog={onchainGiftLog}
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
      {/* 내 전체 프로필 — 내 거라 항상 공개(revealed)·풀페이지. 온체인 신호(buildProfileFromMoi)로 구성. */}
      <ProfileSheet
        open={myProfileOpen}
        onOpenChange={(o) => send({ type: o ? 'OPEN_MY_PROFILE' : 'CLOSE_MY_PROFILE' })}
        data={buildProfileFromMoi(null, { creditScore: myCreditScore, ieumCount: matchedAddresses.length, signal: toSignalNode(mySignal.em, mySignal.cs) })}
        context="inyeon"
        revealed
        presentation="page"
      />
      {/* 다른 모이 프로필(카드 상세·받은이음·채팅에서 진입) — 이음 전 익명 + 이음 CTA. */}
      <ProfileSheet
        open={profileMoiId != null}
        onOpenChange={(o) => !o && send({ type: 'CLOSE_PROFILE' })}
        data={buildProfileFromMoi(profileMoiForSheet, {
          ieumCount: (profileMoiForSheet as Moi & { ieumCount?: number })?.ieumCount ?? 0,
          creditScore: myCreditScore,
          signal: toSignalNode(
            (profileMoiForSheet as Moi & { signalEM?: number })?.signalEM ?? 0,
            (profileMoiForSheet as Moi & { signalCS?: number })?.signalCS ?? 0,
          ),
        })}
        context="inyeon"
        presentation="page"
        meeting={profileMeeting}
        sharedEventIds={(profileMoiForSheet as Moi & { sharedEventIds?: string[] })?.sharedEventIds}
        giftSignal={profileMoiId != null ? giftSignals[String(profileMoiId)] ?? 0 : 0}
        onIeum={profileMoiId != null && !matchedIds.includes(profileMoiId) ? () => send({ type: 'OPEN_IEUM', id: profileMoiId }) : undefined}
      />
    </div>
  )
}

// 내 프로필 — 신뢰잔액·이음·중심성을 온체인 신호(useMyCreditStats)로 라이브 표시(#68 배선).
// 신호 없으면 0/—(온체인 액션 연결되어 신호가 흐르면 채워짐). "내 전체 프로필" → 공유 ProfileSheet(⑤).
function MeScreen({ onOpenProfile }: { onOpenProfile: () => void }) {
  const t = useT()
  const { address } = useZkLogin()
  useInyeonProfileSync()
  const { session } = useAuth()
  const photoUrl = useInyeonProfile((s) => s.photoUrl)
  const extraPhotos = useInyeonProfile((s) => s.extraPhotos)
  const addExtraPhoto = useInyeonProfile((s) => s.addExtraPhoto)
  const removeExtraPhoto = useInyeonProfile((s) => s.removeExtraPhoto)
  const bio = useInyeonProfile((s) => s.bio)
  const setBio = useInyeonProfile((s) => s.setBio)
  const extraFileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const displayName = session?.user?.user_metadata?.name ?? (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : t('page.inyeon.unknown'))
  const subtitle = address ? `${address.slice(0, 8)}…${address.slice(-6)}` : ''
  const { data: stats, isLoading } = useMyCreditStats(address ?? undefined)
  return (
    <div className="h-full overflow-y-auto px-5 pb-6 pt-5">
      <div className="text-center">
        <div className="mx-auto h-24 w-24 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${photoUrl})` }} />
        <div className="mt-3 text-xl font-extrabold text-white">{displayName}</div>
        <div className="mt-0.5 text-xs text-white/50">{subtitle}</div>
      </div>

      {/* 내가 쌓은 것 = 1층 활동(카운트만). 절대 신용 숫자(신뢰잔액·Moi Credit) 없음. */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center text-[13px] font-bold text-white">
          🪙 {t('page.inyeon.myTrustBalance')}
          <span className="ml-auto text-[10.5px] font-medium text-white/45">{t('page.inyeon.creditMaterial')}</span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-1.5">
          <b className="text-[32px] font-black tracking-tight text-white">{isLoading ? '—' : (stats?.score ?? 0)}</b>
          <span className="text-xs text-white/50">{t('page.inyeon.trustScoreUnit')}</span>
        </div>
        <div className="mt-3.5 flex gap-2.5">
          {[
            [isLoading ? '—' : String(stats?.ieum ?? 0), t('page.inyeon.statIeum')],
            [isLoading ? '—' : String(stats?.events ?? 0), t('page.inyeon.statEvents')],
            [isLoading ? '—' : stats?.topPercent != null ? t('page.inyeon.topPercent', { p: stats.topPercent }) : '—', t('page.inyeon.statCentrality')],
          ].map(([v, l]) => (
            <div key={l} className="flex-1 rounded-xl bg-white/[0.05] py-2.5 text-center">
              <b className="block text-[17px] font-extrabold text-white">{v}</b>
              <span className="text-[10px] text-white/50">{l}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10.5px] leading-relaxed text-white/45">
          {t('page.inyeon.trustBalanceDesc')}
        </p>
      </div>

      <button
        type="button"
        onClick={onOpenProfile}
        className="mt-3 w-full rounded-2xl border border-white/12 bg-white/[0.05] py-3 text-[13px] font-bold text-white"
      >
        🔭 {t('page.inyeon.fullProfileCta')}
      </button>
      <button
        type="button"
        onClick={() => window.open('https://suiscan.xyz/testnet', '_blank', 'noopener,noreferrer')}
        className="mt-2 w-full rounded-2xl border border-[#F8C57A]/40 bg-[#F8C57A]/[0.08] py-3 text-[13px] font-bold text-[#F8C57A]"
      >
        ⛓ {t('me.checkOnchain')}
      </button>

      {/* 인연 전용 사진 관리 */}
      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center text-[13px] font-bold text-white">
          📸 {t('page.inyeon.photosTitle')}
          <span className="ml-auto text-[10.5px] font-medium text-white/45">{t('page.inyeon.bioInyeonOnly')}</span>
        </div>
        <div className="mt-3 flex gap-2.5">
          {/* 대표 사진 (고정) */}
          <div className="relative">
            <div className="h-[72px] w-[72px] rounded-xl bg-cover bg-center ring-1 ring-white/20" style={{ backgroundImage: `url(${photoUrl})` }} />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#0A1626]/80 px-1.5 py-0.5 text-[8px] font-bold text-white/70">{t('page.inyeon.photosMain')}</span>
          </div>
          {/* 추가 사진 (최대 3장) */}
          {[0, 1, 2].map((i) => {
            const url = extraPhotos[i]
            return url ? (
              <button key={i} type="button" onClick={() => removeExtraPhoto(i)} className="group relative h-[72px] w-[72px] rounded-xl bg-cover bg-center ring-1 ring-white/20" style={{ backgroundImage: `url(${url})` }}>
                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="text-xs font-bold text-white/80">✕</span>
                </span>
              </button>
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => extraFileRef.current?.click()}
                disabled={uploading || extraPhotos.length !== i}
                className="flex h-[72px] w-[72px] flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-white/20 text-white/40 disabled:opacity-30"
              >
                <span className="text-lg">+</span>
                <span className="text-[9px]">{uploading && extraPhotos.length === i ? '...' : t('page.inyeon.photosAdd')}</span>
              </button>
            )
          })}
        </div>
        <input ref={extraFileRef} type="file" accept="image/*" onChange={async (e: ChangeEvent<HTMLInputElement>) => {
          const f = e.target.files?.[0]; e.target.value = '';
          if (!f || extraPhotos.length >= 3) return;
          setUploading(true);
          try {
            const { url } = await fileToWalrusPhoto(f);
            addExtraPhoto(url);
          } catch {
            addExtraPhoto(await fileToProfileDataUrl(f));
          } finally { setUploading(false); }
        }} className="hidden" />
        <p className="mt-2.5 text-[10.5px] leading-relaxed text-white/40">{t('page.inyeon.photosDesc')}</p>
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center text-[13px] font-bold text-white">
          ✍️ {t('page.inyeon.bioVisibilityTitle')}
          <span className="ml-auto text-[10.5px] font-medium text-white/45">{t('page.inyeon.bioInyeonOnly')}</span>
        </div>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={t('page.inyeon.bioPlaceholder')}
          maxLength={100}
          rows={3}
          className="mt-2.5 w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:border-[#87CEEB]/50 focus:outline-none"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <p className="text-[10.5px] leading-relaxed text-white/45">
            {t('page.inyeon.bioVisibilityDesc')}
          </p>
          <span className="text-[10px] text-white/30">{bio.length}/100</span>
        </div>
      </div>
    </div>
  )
}

// 프로필 상세 (경량) — 이음 전 익명 단계. 전체 신뢰네트워크 그래프·signal sunburst는 ⑤ 공유 프로필에서.
function DetailSheet({ moi, onClose, onIeum, onOpenFull }: { moi: Moi | null; onClose: () => void; onIeum: (id: number) => void; onOpenFull: (id: number) => void }) {
  const t = useT()
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
                🤝 {t('page.inyeon.mutualAndTrust', { n: moi.mutualCount, label: moi.balLabel })}
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-2.5 text-[11px] text-white/45">
                <Lock className="h-4 w-4 flex-shrink-0" />
                {t('page.inyeon.lockedAfterIeum')}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenFull(moi.id)}
              className="mt-4 w-full rounded-2xl border border-[#F8C57A]/40 bg-white/[0.04] py-3 text-[13px] font-bold text-[#F8C57A]"
            >
              🔭 {t('page.inyeon.viewFullProfileNetwork')}
            </button>
            <button
              type="button"
              onClick={() => onIeum(moi.id)}
              className="mt-2.5 w-full rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#2d6a9e] py-3.5 text-[14.5px] font-extrabold text-white"
            >
              {t('page.inyeon.requestIeum')}
            </button>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
