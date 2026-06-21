// 이음 신청 시트 — 폼은 "한마디(주관식)"만 + 미리보기(내 대표사진·이름·한마디). 신청 자체 무료.
// 이음 신청 = 내 이름·관계를 먼저 공개(기능정의 §1·§4). 미리보기 사진 = 디방인연 대표사진(Setting 설정).
import { Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet'
import type { Moi } from './types'
import { IeumIcon } from './icons'
import { useT } from '../../lib/i18n'
import { useInyeonProfile } from '../../stores/inyeonProfile'
import { useZkLogin } from '../../providers/ZkLoginProvider'
import { useAuth } from '../../providers/AuthContext'

interface IeumSheetProps {
  open: boolean
  moi: Moi | null
  message: string
  sending: boolean
  error: string | null
  onMessage: (message: string) => void
  onSend: () => void
  onCancel: () => void
}

export function IeumSheet({ open, message, sending, error, onMessage, onSend, onCancel }: IeumSheetProps) {
  const t = useT()
  const { session } = useAuth()
  const zk = useZkLogin()
  const myName = session?.user?.user_metadata?.name ?? (zk.address ? `${zk.address.slice(0, 6)}…${zk.address.slice(-4)}` : '')
  const photoUrl = useInyeonProfile((s) => s.photoUrl)
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && !sending) onCancel()
      }}
    >
      <SheetContent side="bottom" showClose={!sending}>
        <SheetHeader>
          <SheetTitle>{t('inyeon.ieum')}</SheetTitle>
          <SheetDescription>{t('ieum.desc')}</SheetDescription>
        </SheetHeader>

        <label className="mb-2 mt-1 block text-[12.5px] font-bold text-white/80">
          {t('ieum.label')} <span className="font-medium text-white/45">· {t('ieum.labelSub')}</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => onMessage(e.target.value)}
          maxLength={80}
          rows={2}
          disabled={sending}
          placeholder={t('ieum.placeholder')}
          className="w-full resize-none rounded-2xl border border-white/12 bg-white/[0.05] px-3.5 py-3 text-[13.5px] text-white placeholder:text-white/35 focus:border-[#87CEEB] focus:outline-none"
        />

        {/* 미리보기 — 상대에게 보이는 내 카드 (대표사진) */}
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="h-11 w-11 flex-shrink-0 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${photoUrl})` }} />
          <div className="min-w-0 text-[11.5px] leading-relaxed text-white/60">
            <b className="block text-[13.5px] text-white">{myName}</b>
            {message.trim() ? message : t('ieum.previewHint')}
          </div>
        </div>

        {error && <p className="mt-3 text-[12px] font-medium text-[#E0607A]">{error}</p>}

        <button
          type="button"
          onClick={onSend}
          disabled={sending || !message.trim()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#2d6a9e] py-4 text-[14.5px] font-extrabold text-white disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <IeumIcon className="h-5 w-5" />}
          {sending ? t('ieum.sending') : t('inyeon.ieum')}
        </button>
      </SheetContent>
    </Sheet>
  )
}
