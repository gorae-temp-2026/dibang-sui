// 모이가 모인곳(④) — 온체인 Moi 보유 사용자 기반 광장.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useMachine, useSelector } from '@xstate/react'
import { fromPromise } from 'xstate'
import { getConfig } from '@gorae/sui-sdk'
// 온체인 읽기: SDK 직접(fullnode) → Go API 프록시(/onchain/*).
import { getOnchainOwnedMoiIds, getOnchainOwnedMoiItems, getOnchainMoi, getOnchainMoiItem, getOnchainDiscover, getOnchainBalance, getOnchainSignals, getOnchainActionLogged } from '@gorae/contracts/sdk.gen'
import type { OnchainSignal, OnchainActionLogged } from '@gorae/contracts'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { giftActor } from '../machines/gift.machine'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { moiPlazaMachine } from '../machines/moiPlaza.machine'
import { useOnchainHostActions } from '../hooks/useOnchainHostActions'
import { useSuiBalance } from '../hooks/useSuiBalance'
import { MoiPlazaCanvas } from '../components/moi-gather/MoiPlazaCanvas'
import { ShopSheet } from '../components/moi-gather/ShopSheet'
import { ITEM_BY_NAME, DEFAULT_HEAD, DEFAULT_BODY, RECOLOR_BODY, type ShopItem, type EquipSlot, type PlazaMoi } from '../components/moi-gather/data'
import { ProfileSheet } from '../components/profile/ProfileSheet'
import type { ProfileData, SignalNode } from '../components/profile/types'
import { warmthStep } from '../lib/loungeV2Feed'
import { useT } from '../lib/i18n'

const HEAD_POOL = ['chu_default', 'yh_pigtail', 'chu_sport', 'yh_bob', 'chu_buzz', 'yh_veil', 'chu_shaggy']
const COLORS = [0xe6a3b6, 0x88b0d8, 0xf0c98a, 0x9ad0b0, 0xc8a6e0, 0xe0b48a, 0x9ec8e8, 0xd99bb0, 0x8fcdb6, 0xe8c07a]

function colorToHue(hex: number): number {
  const r = ((hex >> 16) & 255) / 255
  const g = ((hex >> 8) & 255) / 255
  const b = (hex & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return 210
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return Math.round((h * 60 + 360) % 360)
}

function addrShort(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function buildOnchainProfile(
  addr: string,
  isSelf: boolean,
  signals: OnchainSignal[],
  actions: OnchainActionLogged[],
  t: (key: string, vars?: Record<string, string | number>) => string,
): ProfileData {
  // isSelf: 나와 관련된 모든 신호/액션. !isSelf: addr은 상대, 나↔상대 간만.
  const relevant = isSelf
    ? signals.filter((s) => s.from === addr || s.to === addr)
    : signals // 호출 전에 이미 필터 (아래 useEffect 참조)
  const relevantActions = isSelf
    ? actions.filter((a) => a.actor === addr || a.target === addr)
    : actions

  const emSignals = relevant.filter((s) => s.kind === 1)
  const csSignals = relevant.filter((s) => s.kind === 2)
  const emTotal = emSignals.reduce((a, s) => a + s.magnitude, 0)
  const csTotal = csSignals.reduce((a, s) => a + s.magnitude, 0)

  const busu = relevantActions.filter((a) => a.actionType === 0).length
  const ium = relevantActions.filter((a) => a.actionType === 1 || a.actionType === 2).length
  const gift = relevantActions.filter((a) => a.actionType === 3).length
  const write = relevantActions.filter((a) => a.actionType === 4).length

  const score = Math.min(1000, emTotal / 100 + csTotal * 50 + busu * 30 + ium * 20 + gift * 15 + write * 10)
  const tier = score >= 820 ? 'AAA' : score >= 760 ? 'AA' : score >= 690 ? 'A' : score >= 620 ? 'BBB' : score >= 550 ? 'BB' : 'B'
  const label = score >= 760 ? t('page.moiGather.veryGood') : score >= 620 ? t('page.moiGather.good') : score >= 480 ? t('page.moiGather.fair') : score > 0 ? t('page.moiGather.low') : t('page.moiGather.noData')

  const signal: SignalNode = {
    name: isSelf ? t('page.moiGather.me') : t('page.moiGather.us'),
    children: [
      { name: 'EM', children: [{ name: t('page.moiGather.sigGift'), value: emTotal / 1e6 }, { name: t('page.moiGather.sigPresent'), value: gift }] },
      { name: 'CS', children: [{ name: t('page.moiGather.sigAttend'), value: csSignals.filter(s => s.source === 5).length }, { name: t('page.moiGather.sigIeum'), value: ium }, { name: t('page.moiGather.sigTalk'), value: write }, { name: t('page.moiGather.sigGathering'), value: 0 }] },
      { name: 'AR', children: [{ name: t('page.moiGather.sigRelation'), value: 0, stub: true }] },
      { name: 'MP', children: [{ name: t('page.moiGather.sigTrade'), value: 0, stub: true }] },
    ],
  }

  const selfLabel = addrShort(addr)
  const nodes: { id: string; label: string; hue: number; self?: boolean; here?: boolean }[] = [
    { id: selfLabel, label: selfLabel, hue: 210, self: true },
  ]
  const links: { source: string; target: string; type: string; value: number }[] = []

  // 이음 완료(ACCEPT_IUM=2) 상대만 그래프 노드+링크
  const iumPeers = new Set<string>()
  relevantActions.filter((a) => a.actionType === 2).forEach((a) => {
    if (a.actor !== addr) iumPeers.add(a.actor)
    if (a.target && a.target !== addr) iumPeers.add(a.target)
  })
  iumPeers.forEach((p) => {
    const pLabel = addrShort(p)
    nodes.push({ id: pLabel, label: pLabel, hue: parseInt(p.slice(2, 6), 16) % 360, here: true })
    links.push({ source: selfLabel, target: pLabel, type: t('page.moiGather.sigIeum'), value: 1 })
  })

  return {
    subject: selfLabel,
    asOf: 'now',
    moiCredit: { value: score / 1000, score: Math.round(score), tier, rank: 0, total: 0, onchain: true },
    trace: {
      L1_raw: { 부조: busu, 이음: ium, 대화: write, 선물: gift, total: busu + ium + write + gift },
      L2_fold: { 부조EM: emTotal, 증여EM: gift, topTies: [] },
      L3_phi: { 부조: emTotal > 0 ? 1 : 0, CS: csTotal > 0 ? 1 : 0, 이행: 1, op: 'onchain' },
      L4_integrate: { W: { 부조: 0.5, cs: 0.3, 이행: 0.2 }, formula: 'onchain', value: score / 1000 },
    },
    graph: { nodes, links },
    signal,
    trustRange: { tier, label, anon: relevant.length === 0 },
  }
}

export function MoiGatherPage() {
  const navigate = useNavigate()
  const t = useT()
  const { purchaseItem, equipItem, unequipItem } = useOnchainHostActions()
  const { balanceSui } = useSuiBalance()
  const plazaMachine = useMemo(
    () =>
      moiPlazaMachine.provide({
        actors: {
          buyItem: fromPromise<{ ok: boolean }, { item: ShopItem | null }>(async ({ input }) => {
            if (input.item) {
              const registryId = getConfig().shopRegistryId
              if (!registryId) throw new Error('샵 결제 레지스트리가 설정되지 않았습니다')
              await purchaseItem({
                registryId,
                nonce: crypto.randomUUID(),
                name: input.item.name,
                itemType: input.item.category,
                slot: input.item.slot ?? input.item.category,
              })
            }
            return { ok: true }
          }),
        },
      }),
    [purchaseItem],
  )
  const [state, send] = useMachine(plazaMachine)
  const { address } = useZkLogin()
  const [shopOpen, setShopOpen] = useState(false)
  const [profileMoiId, setProfileMoiId] = useState<string | null>(null)

  const handleEquip = useCallback(
    (itemId: string) => {
      send({ type: 'EQUIP', itemId })
      if (!address) return
      Promise.all([
        getOnchainOwnedMoiIds({ path: { address }, throwOnError: true }),
        getOnchainOwnedMoiItems({ path: { address }, throwOnError: true }),
      ])
        .then(([idsRes, itemsRes]) => {
          const moiId = (idsRes.data ?? [])[0]
          const suiItem = (itemsRes.data ?? []).find((i) => i.name === itemId || i.itemType === itemId)
          if (moiId && suiItem) return equipItem({ moiId, itemId: suiItem.id })
        })
        .catch(() => {})
    },
    [address, equipItem, send],
  )
  const handleUnequip = useCallback(
    (slot: EquipSlot) => {
      send({ type: 'UNEQUIP', slot })
      if (!address) return
      getOnchainOwnedMoiIds({ path: { address }, throwOnError: true })
        .then((res) => {
          const moiId = (res.data ?? [])[0]
          if (moiId) return unequipItem({ moiId, slot })
        })
        .catch(() => {})
    },
    [address, unequipItem, send],
  )

  // 온체인 보유 아이템 + 장착 상태 hydrate
  useEffect(() => {
    if (!address) return
    Promise.all([
      getOnchainOwnedMoiItems({ path: { address }, throwOnError: true }),
      getOnchainOwnedMoiIds({ path: { address }, throwOnError: true }),
    ])
      .then(async ([itemsRes, idsRes]) => {
        const items = itemsRes.data ?? []
        const moiIds = idsRes.data ?? []
        const ids = items
          .map((i) => ITEM_BY_NAME[i.name]?.id)
          .filter((id): id is string => !!id)
        if (ids.length) send({ type: 'GRANT_OWNED', ids })
        // 장착 상태: Moi 오브젝트의 equipped VecMap → 각 아이템 name으로 로컬 ID 매핑
        if (moiIds.length === 0) return
        const { data: moi } = await getOnchainMoi({ path: { moiId: moiIds[0] } })
        if (!moi || Object.keys(moi.equipped).length === 0) return
        const equippedLocal: Partial<Record<EquipSlot, string>> = {}
        const equippedItemIds = Object.values(moi.equipped)
        for (const itemObjId of equippedItemIds) {
          const { data: item } = await getOnchainMoiItem({ path: { itemId: itemObjId } })
          if (item) {
            const name = item.name
            const slot = item.slot
            const localItem = ITEM_BY_NAME[name]
            if (localItem?.slot && (slot === 'head' || slot === 'body' || slot === 'acc')) {
              equippedLocal[slot as EquipSlot] = localItem.id
            }
          }
        }
        if (Object.keys(equippedLocal).length > 0) {
          send({ type: 'HYDRATE_EQUIPPED', equipped: equippedLocal })
        }
      })
      .catch(() => {})
  }, [address, send])

  // 온체인 군중 — 같은 이벤트에 참가한 Moi 보유 사용자만(degree=1).
  const [crowd, setCrowd] = useState<PlazaMoi[]>([])
  useEffect(() => {
    if (!address) return
    getOnchainDiscover({ query: { address }, throwOnError: true })
      .then((res) => {
        const discovered = res.data ?? []
        const me: PlazaMoi = {
          id: 'me', name: t('page.moiGather.me'), role: t('page.moiGather.myMoi'),
          x: 0.5, y: 0.92, head: DEFAULT_HEAD, body: DEFAULT_BODY, color: 0x9ec8e8, me: true,
        }
        const sameEvent = discovered.filter((d) => d.degree === 1)
        const others: PlazaMoi[] = sameEvent.map((d, i) => {
          const hash = parseInt(d.address.slice(2, 10), 16)
          const left = hash % 2 === 0
          const x = left ? 0.08 + ((hash % 100) / 100) * 0.34 : 0.58 + ((hash % 100) / 100) * 0.34
          const y = 0.15 + ((hash % 73) / 73) * 0.65
          return {
            id: d.address,
            name: addrShort(d.address),
            role: t('page.moiGather.sharedEvents', { n: d.mutualCount }),
            x, y,
            head: HEAD_POOL[i % HEAD_POOL.length],
            body: RECOLOR_BODY,
            color: COLORS[hash % COLORS.length],
          }
        })
        setCrowd([me, ...others])
      })
      .catch(() => {
        setCrowd([{
          id: 'me', name: t('page.moiGather.me'), role: t('page.moiGather.myMoi'),
          x: 0.5, y: 0.92, head: DEFAULT_HEAD, body: DEFAULT_BODY, color: 0x9ec8e8, me: true,
        }])
      })
  }, [address, t])

  // 군중 인덱스 — 모이 클릭 시 프로필 조회용
  const crowdById = useMemo(() => Object.fromEntries(crowd.map((m) => [m.id, m])), [crowd])

  // SUI 잔액
  const [suiBalance, setSuiBalance] = useState<string | null>(null)
  useEffect(() => {
    if (!address) return
    getOnchainBalance({ path: { address }, throwOnError: true })
      .then((res) => setSuiBalance((Number(res.data?.mist ?? '0') / 1e9).toFixed(3)))
      .catch(() => {})
  }, [address])

  // 온기 — 군중 수 기반 근사 (참가자 많을수록 온기 상승)
  const warmth = useMemo(() => Math.min(36.5 + crowd.length * 0.1, 42), [crowd])
  const warmthStepVal = warmthStep(warmth)

  const [onboard, setOnboard] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setOnboard(false), 5200)
    return () => clearTimeout(t)
  }, [])

  const { owned, placed, equipped, pendingItemId, error, toast } = state.context
  const giftReceived = useSelector(giftActor, (s) => s.context.received)
  const giftSignals = useSelector(giftActor, (s) => s.context.signals)
  useEffect(() => {
    if (giftReceived.length) send({ type: 'GRANT_OWNED', ids: giftReceived })
  }, [giftReceived, send])

  const profileMoi = profileMoiId ? crowdById[profileMoiId] : null

  // 온체인 프로필 데이터 — 클릭 시 신호/액션 조회. "나"와 "다른 사람" 동일 함수, isSelf만 다름.
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  useEffect(() => {
    if (!profileMoi || !address) {
      setProfileData(null)
      return
    }
    const isSelf = !!profileMoi.me
    const targetAddr = isSelf ? address : profileMoi.id
    Promise.all([
      getOnchainSignals({ throwOnError: true }),
      getOnchainActionLogged({ throwOnError: true }),
    ])
      .then(([sigRes, actRes]) => {
        const allSignals = sigRes.data ?? []
        const allActions = actRes.data ?? []
        if (isSelf) {
          setProfileData(buildOnchainProfile(address, true, allSignals, allActions, t))
        } else {
          const pairSignals = allSignals.filter(
            (s) => (s.from === address && s.to === targetAddr) || (s.from === targetAddr && s.to === address),
          )
          const pairActions = allActions.filter(
            (a) => (a.actor === address && a.target === targetAddr) || (a.actor === targetAddr && a.target === address),
          )
          setProfileData(buildOnchainProfile(targetAddr, false, pairSignals, pairActions, t))
        }
      })
      .catch(() => setProfileData(null))
  }, [profileMoi?.id, address, t])

  const emptyProfile: ProfileData = {
    subject: t('page.moiGather.me'), asOf: 'now',
    moiCredit: { value: 0, score: 0, tier: '—', rank: 0, total: 0, onchain: true },
    trace: { L1_raw: { 부조: 0, 이음: 0, 대화: 0, 선물: 0, total: 0 }, L2_fold: { 부조EM: 0, 증여EM: 0, topTies: [] }, L3_phi: { 부조: 0, CS: 0, 이행: 0, op: '' }, L4_integrate: { W: { 부조: 0, cs: 0, 이행: 0 }, formula: '', value: 0 } },
    graph: { nodes: [], links: [] }, signal: { name: t('page.moiGather.us'), children: [] },
    trustRange: { tier: '—', label: t('page.moiGather.noData'), anon: true },
  }
  const currentProfileData = profileData ?? emptyProfile

  const profileMeeting = profileMoi
    ? {
        photoHue: colorToHue(profileMoi.color),
        photoUrl: profileMoi.photoUrl,
        hook: profileMoi.me ? (address ? addrShort(address) : t('page.moiGather.myMoi')) : profileMoi.role,
        prov: [{ emoji: '💍', text: profileMoi.name, sub: profileMoi.role, tag: t('page.lounge.onchain') }],
        mutualCount: 0,
        balLabel: currentProfileData.trustRange.label,
      }
    : undefined

  const handleIeum = () => {
    const m = profileMoi
    setProfileMoiId(null)
    send({ type: 'SHOW_TOAST', message: m ? t('page.moiGather.ieumSentTo', { name: m.name }) : t('page.moiGather.ieumSent') })
  }

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-[480px] flex-col overflow-hidden bg-[#0A1626] text-[#E8EFF6]">
      <header className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-[#0A1626] to-transparent px-3 py-3">
        <button type="button" aria-label={t('page.moiGather.back')} onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-extrabold text-white">
            {address ? addrShort(address) : ''} {t('page.lounge.weddingLounge')}
          </div>
          <div className="truncate text-[10px] text-white/50">{t('page.moiGather.onchainParticipants', { n: crowd.length })}</div>
        </div>
        <div className="flex flex-col items-center rounded-full bg-white/10 px-2.5 py-1 backdrop-blur">
          <span className="text-[7.5px] font-bold uppercase tracking-wide text-white/45">{t('page.moiGather.ourWarmth')}</span>
          <span className="text-[12px] font-extrabold leading-none text-[#F8A24A]">{warmth.toFixed(1)}°</span>
        </div>
        <div className="flex flex-col items-center rounded-full bg-gradient-to-br from-[#F8C57A] to-[#E8A865] px-3 py-1.5 text-xs font-extrabold text-[#5a3a12]">
          {suiBalance ? <span>{suiBalance} SUI</span> : <span>—</span>}
        </div>
        <button type="button" onClick={() => setShopOpen(true)} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[12px] font-bold text-white backdrop-blur">
          <ShoppingBag className="h-4 w-4" /> {t('page.moiGather.shop')}
        </button>
      </header>

      <div className="relative flex-1 overflow-hidden">
        <MoiPlazaCanvas
          placed={placed}
          equipped={equipped}
          crowd={crowd}
          onMoiClick={setProfileMoiId}
          onMovePlaced={(uid, x, y) => send({ type: 'MOVE', uid, x, y })}
          partnersOf={() => []}
          warmthStep={warmthStepVal}
        />
        {onboard && (
          <div className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center px-6">
            <div className="rounded-2xl border border-white/12 bg-[#0c1a2e]/85 px-4 py-2.5 text-center backdrop-blur">
              <div className="text-[11px] font-medium text-white/75">{t('page.moiGather.tapHint')}</div>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-30 flex justify-center px-6">
          <div className="rounded-2xl bg-[#1E3A5F]/95 px-4 py-3 text-center text-[12.5px] font-bold text-white shadow-xl backdrop-blur">{toast}</div>
        </div>
      )}

      <ShopSheet
        open={shopOpen}
        onOpenChange={setShopOpen}
        yone={Math.round(balanceSui * 1000)}
        owned={owned}
        placed={placed}
        equipped={equipped}
        pendingItemId={pendingItemId}
        error={error}
        onPurchase={(id) => send({ type: 'PURCHASE', itemId: id })}
        onPlace={(id) => send({ type: 'PLACE', itemId: id })}
        onRemove={(uid) => send({ type: 'REMOVE', uid })}
        onEquip={handleEquip}
        onUnequip={handleUnequip}
        onCharge={() => send({ type: 'CHARGE' })}
        onDismissError={() => send({ type: 'DISMISS_ERROR' })}
      />

      <ProfileSheet
        open={!!profileMoiId}
        onOpenChange={(o) => !o && setProfileMoiId(null)}
        data={currentProfileData}
        context="lounge"
        meeting={profileMeeting}
        giftSignal={profileMoiId ? giftSignals[profileMoiId] ?? 0 : 0}
        onIeum={profileMoiId && profileMoiId !== 'me' ? handleIeum : undefined}
      />
    </div>
  )
}
