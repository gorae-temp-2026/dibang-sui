// 모이가 모인곳(④) — 풀스크린 2.5D 미니룸. 라운지 미리보기 카드로 진입(핸드오프 §3·§12-2).
// PixiJS placeholder 시스템: 샵 구매→요네 차감→자동 배치/장착 · 아이템 드래그 · 모이 클릭→공유 프로필.
// 모이 클릭 = 디방인연과 동일 ProfileSheet, 단 context='lounge'(③ 오프라인 = 이름·소속·전체 네트워크 공개).
// 에셋(투명 PNG) 부재라 캐릭터·아이템은 컬러 도형 placeholder — 에셋 나오면 슬롯 교체(에셋스펙 §4).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useMachine, useSelector } from '@xstate/react'
import { giftActor } from '../machines/gift.machine'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { moiPlazaMachine } from '../machines/moiPlaza.machine'
import { MoiPlazaCanvas } from '../components/moi-gather/MoiPlazaCanvas'
import { ShopSheet } from '../components/moi-gather/ShopSheet'
import { PLAZA_CROWD, CROWD_BY_ID } from '../components/moi-gather/data'
import { POOL } from '../components/inyeon/data'
import { ProfileSheet } from '../components/profile/ProfileSheet'
import type { ProfileData } from '../components/profile/types'
import { profileForPersonaId, makeGuestProfile, plazaPartnerIds, chulsooPlazaProfile } from '../components/profile/personaProfiles'

// 모이 색 → 사진 placeholder hue (실사진 전).
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

export function MoiGatherPage() {
  const navigate = useNavigate()
  const [state, send] = useMachine(moiPlazaMachine)
  const [shopOpen, setShopOpen] = useState(false)
  const [profileMoiId, setProfileMoiId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const { yone, owned, placed, equipped, pendingItemId, error } = state.context
  const placedIds = placed.map((p) => p.itemId)
  const giftReceived = useSelector(giftActor, (s) => s.context.received)
  const giftSignals = useSelector(giftActor, (s) => s.context.signals)
  // 받은 선물 → 광장 보유로 부여(꾸미기 장착·배치 가능). gift actor 브리지.
  useEffect(() => {
    if (giftReceived.length) send({ type: 'GRANT_OWNED', ids: giftReceived })
  }, [giftReceived, send])

  // 토스트 자동 소멸
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const profileMoi = profileMoiId ? CROWD_BY_ID[profileMoiId] : null
  // 인물별 실제 프로필: 나=철수 sim 산출 / 만난 사람(personaId)=인연과 동일 프로필 / 익명 하객=생성.
  const persona = profileMoi?.personaId != null ? POOL.find((p) => p.id === profileMoi.personaId) ?? null : null
  const profileData: ProfileData = !profileMoi
    ? chulsooPlazaProfile
    : profileMoi.me
      ? chulsooPlazaProfile
      : profileMoi.personaId != null
        ? profileForPersonaId(profileMoi.personaId)
        : makeGuestProfile(profileMoi.id, profileMoi.name, colorToHue(profileMoi.color))
  const profileMeeting = profileMoi
    ? {
        photoHue: persona?.photos[0]?.hue ?? colorToHue(profileMoi.color),
        photoUrl: profileMoi.photoUrl,
        hook: profileMoi.me ? '나의 모이 · 광장의 나' : persona ? persona.hook : profileMoi.role,
        prov: persona
          ? persona.prov.map((p) => ({ emoji: p.emoji, text: p.text, sub: p.sub, tag: '오프라인 · 같은 결혼식' }))
          : [{ emoji: '💍', text: '이 결혼식에서 만난 모이', sub: profileMoi.role, tag: '오프라인' }],
        mutualCount: profileMoi.me ? 0 : persona ? persona.mutualCount : 4,
        balLabel: profileData.trustRange.label,
      }
    : undefined

  const handleIeum = () => {
    const m = profileMoi
    setProfileMoiId(null)
    setToast(m ? `${m.name}님에게 이음 신청을 보냈어요 · 대화는 디방인연에서` : '이음 신청을 보냈어요')
  }

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-[480px] flex-col overflow-hidden bg-[#0A1626] text-[#E8EFF6]">
      {/* 상단바 — 뒤로 · 타이틀(host) · 요네 · 샵 */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-[#0A1626] to-transparent px-3 py-3">
        <button
          type="button"
          aria-label="뒤로"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-extrabold text-white">모이가 모인곳 · 광장</div>
          <div className="truncate text-[11px] text-white/55">김수영 · 박소율 웨딩라운지 · 모이 {PLAZA_CROWD.length}</div>
        </div>
        <div className="rounded-full bg-gradient-to-br from-[#F8C57A] to-[#E8A865] px-3 py-1.5 text-xs font-extrabold text-[#5a3a12]">
          🪙 {yone.toLocaleString()}
        </div>
        <button
          type="button"
          onClick={() => setShopOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[12px] font-bold text-white backdrop-blur"
        >
          <ShoppingBag className="h-4 w-4" /> 샵
        </button>
      </header>

      {/* 2.5D 미니룸 캔버스 (PixiJS) */}
      <div className="relative flex-1 overflow-hidden">
        <MoiPlazaCanvas
          placed={placed}
          equipped={equipped}
          crowd={PLAZA_CROWD}
          onMoiClick={setProfileMoiId}
          onMovePlaced={(itemId, x, y) => send({ type: 'MOVE', itemId, x, y })}
          partnersOf={plazaPartnerIds}
        />

        {/* 조작 힌트 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
          <span className="rounded-full border border-white/12 bg-[#0c1a2e]/70 px-3.5 py-1.5 text-[11px] font-medium text-white/60 backdrop-blur">
            모이를 누르면 이음망이 보여요 · ⓘ로 프로필 · 드래그·핀치로 둘러보기
          </span>
        </div>
      </div>

      {/* 토스트 */}
      {toast && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-30 flex justify-center px-6">
          <div className="rounded-2xl bg-[#1E3A5F]/95 px-4 py-3 text-center text-[12.5px] font-bold text-white shadow-xl backdrop-blur">
            {toast}
          </div>
        </div>
      )}

      {/* 샵 시트 */}
      <ShopSheet
        open={shopOpen}
        onOpenChange={setShopOpen}
        yone={yone}
        owned={owned}
        placedIds={placedIds}
        equipped={equipped}
        pendingItemId={pendingItemId}
        error={error}
        onPurchase={(id) => send({ type: 'PURCHASE', itemId: id })}
        onPlace={(id) => send({ type: 'PLACE', itemId: id })}
        onRemove={(id) => send({ type: 'REMOVE', itemId: id })}
        onEquip={(id) => send({ type: 'EQUIP', itemId: id })}
        onUnequip={(slot) => send({ type: 'UNEQUIP', slot })}
        onCharge={() => send({ type: 'CHARGE' })}
        onDismissError={() => send({ type: 'DISMISS_ERROR' })}
      />

      {/* 모이 클릭 → 공유 프로필(③ 라운지 오프라인 공개규칙). 'me'는 본인이라 이음 CTA 없음. */}
      <ProfileSheet
        open={!!profileMoiId}
        onOpenChange={(o) => !o && setProfileMoiId(null)}
        data={profileData}
        context="lounge"
        meeting={profileMeeting}
        giftSignal={profileMoiId ? giftSignals[profileMoiId] ?? 0 : 0}
        onIeum={profileMoiId && profileMoiId !== 'me' ? handleIeum : undefined}
      />
    </div>
  )
}
