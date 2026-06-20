// 이음 신청 시트 — 폼은 "한마디(주관식)"만 + 미리보기(내 대표사진·이름·한마디). 신청 자체 무료.
// 이음 신청 = 내 이름·관계를 먼저 공개(기능정의 §1·§4). 객관식 관계·나이·성별 입력 없음.
import { Loader2, Share2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet'
import type { Moi } from './types'

// 데모용 내 표시 이름(실서비스: 구글 로그인 프로필). me 화면과 동일.
const MY_NAME = '유상'

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

export function IeumSheet({ open, moi, message, sending, error, onMessage, onSend, onCancel }: IeumSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && !sending) onCancel()
      }}
    >
      <SheetContent side="bottom" showClose={!sending}>
        <SheetHeader>
          <SheetTitle>이음 신청</SheetTitle>
          <SheetDescription>
            내 이름과 한마디가 <b className="text-white/90">먼저</b> 공개돼요. 상대가 수락하면 이음이 성사돼요.
          </SheetDescription>
        </SheetHeader>

        <label className="mb-2 mt-1 block text-[12.5px] font-bold text-white/80">
          한마디 <span className="font-medium text-white/45">· 어떻게 인사를 건넬까요?</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => onMessage(e.target.value)}
          maxLength={80}
          rows={2}
          disabled={sending}
          placeholder="예) 같은 결혼식에서 뵀어요 :) 좋은 인연이면 좋겠어요"
          className="w-full resize-none rounded-2xl border border-white/12 bg-white/[0.05] px-3.5 py-3 text-[13.5px] text-white placeholder:text-white/35 focus:border-[#87CEEB] focus:outline-none"
        />

        {/* 미리보기 — 상대에게 보이는 내 카드 */}
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="h-11 w-11 flex-shrink-0 rounded-full bg-gradient-to-br from-[#FCE6EC] to-[#E8F4FA]" />
          <div className="min-w-0 text-[11.5px] leading-relaxed text-white/60">
            <b className="block text-[13.5px] text-white">{MY_NAME}</b>
            {message.trim() ? message : '한마디를 적으면 상대에게 이렇게 보여요.'}
          </div>
        </div>

        {error && <p className="mt-3 text-[12px] font-medium text-[#E0607A]">{error}</p>}

        <button
          type="button"
          onClick={onSend}
          disabled={sending || !message.trim()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#2d6a9e] py-4 text-[14.5px] font-extrabold text-white disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />}
          {sending ? '이음 신청 보내는 중…' : moi ? '이음 신청 보내기' : '이음 신청'}
        </button>
      </SheetContent>
    </Sheet>
  )
}
