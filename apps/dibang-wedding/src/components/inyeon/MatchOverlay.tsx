// 이음 성사 오버레이 — 이름 공개 + Moi Credit 티저(해커톤 심장: 이음·대화가 신용의 재료).
// 목업 .matchov 이식. 대화(DM)는 인연 채팅 탭에서.
import { MessageCircle, Share2 } from 'lucide-react'
import type { Moi } from './types'
import { useT } from '../../lib/i18n'
import { useInyeonProfile } from '../../stores/inyeonProfile'

interface MatchOverlayProps {
  open: boolean
  moi: Moi | null
  pending?: boolean
  onDismiss: () => void
  onOpenChat: () => void
}

export function MatchOverlay({ open, moi, pending, onDismiss, onOpenChat }: MatchOverlayProps) {
  const t = useT()
  const myPhoto = useInyeonProfile((s) => s.photoUrl)
  if (!open || !moi) return null
  const mutualCount = moi.mutualCount ?? 0
  const moiPhoto = moi.photos[0]?.url
  return (
    <div className="fixed inset-0 z-[70] mx-auto flex max-w-[420px] flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_36%,rgba(30,58,95,0.95),rgba(11,23,34,0.97))] px-8 text-center">
      <div className="text-[12px] font-extrabold tracking-[0.24em] text-[#F8C57A]">{pending ? '이음 신청 완료' : '이음 성사'}</div>
      <div className="mb-1 mt-2 text-[33px] font-black text-white">{pending ? '신청을 보냈어요' : `${moi.name} 님과 이어졌어요`}</div>
      <p className="max-w-[290px] text-[12.5px] leading-relaxed text-white/80">
        {pending ? '상대가 수락하면 이음이 성사돼요. 기다려주세요!' : '이제 이름이 서로 공개됐어요. 대화를 열면 더 가까워질 수 있어요.'}
      </p>

      <div className="my-7 flex items-center">
        {/* 나 = 디방인연 대표사진 */}
        <div
          className="z-[2] -mr-5 h-24 w-24 rounded-full border-[3px] border-[#FDFBF7] bg-cover bg-[center_30%]"
          style={{ backgroundImage: `url(${myPhoto})` }}
        />
        <div className="z-[3] flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[#F8C57A] text-[#5a3a12] shadow-[0_8px_22px_rgba(248,197,122,0.55)]">
          <Share2 className="h-6 w-6" />
        </div>
        {/* 상대 = 실제 프로필 사진(없으면 hue 그라데이션) */}
        <div
          className="z-[2] -ml-5 h-24 w-24 rounded-full border-[3px] border-[#FDFBF7] bg-cover bg-[center_18%]"
          style={moiPhoto ? { backgroundImage: `url(${moiPhoto})` } : { background: `linear-gradient(150deg, hsl(${moi.photos[0]?.hue ?? 210} 52% 34%), hsl(${((moi.photos[0]?.hue ?? 210) + 36) % 360} 48% 16%))` }}
        />
      </div>

      {mutualCount > 0 && (
        <div className="mb-4 max-w-[300px]">
          <div className="text-[11px] font-bold text-white/55">🤝 {t('profile.mutualKnown')}</div>
          <div className="mt-1.5">
            <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11.5px] font-bold text-white">공통으로 아는 사람 {mutualCount}명</span>
          </div>
        </div>
      )}

      {/* Moi Credit 티저 — 데모 심장 */}
      <div className="max-w-[310px] rounded-2xl border border-[#F8C57A]/40 bg-white/[0.07] px-4 py-3">
        <div className="flex items-center justify-center gap-1.5 text-[11.5px] font-extrabold text-[#F8C57A]">
          💎 이 이음이 신용이 됩니다
        </div>
        <div className="mt-1.5 text-[11px] leading-relaxed text-white/75">
          이음·대화·이벤트 참여가 신뢰 attestation으로 쌓여 <b className="text-white/90">Moi Credit</b>(온체인 신용)의 재료가 돼요.
        </div>
      </div>

      <div className="mt-7 flex w-full max-w-[300px] flex-col gap-3">
        {!pending && (
          <button
            type="button"
            onClick={onOpenChat}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#F8C57A] py-3.5 text-[14.5px] font-extrabold text-[#5a3a12]"
          >
            <MessageCircle className="h-5 w-5" /> 대화 시작하기
          </button>
        )}
        <button type="button" onClick={onDismiss} className="py-1.5 text-[13px] font-bold text-white/80">
          계속 둘러보기
        </button>
      </div>
    </div>
  )
}
