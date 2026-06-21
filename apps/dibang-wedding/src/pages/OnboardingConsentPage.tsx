import { useMachine } from '@xstate/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'
import { useEffect } from 'react'
import {
  onboardingConsentMachine,
  type TermsType,
} from '../machines/onboardingConsent.machine'
import { createConsentsMutation, getMeQueryKey } from '@gorae/contracts/@tanstack/react-query.gen'
import type { User } from '@gorae/contracts'

// _scenario/2026-05-26-user-consent-onboarding/SCENARIOS.md S-01
// 4 체크박스(필수 3 + 선택 1) + "동의하고 시작". 필수 미체크면 버튼 disabled.
// 본문 페이지(전문 보기)는 이번 범위 제외.
export function OnboardingConsentPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const nextUrl = searchParams.get('next') || '/my-wedding'

  const [state, send] = useMachine(onboardingConsentMachine)
  const ctx = state.context
  // 단일 진실원천: '지금 SUBMIT 가능한가'는 머신 guard(canSubmit)가 판정한다.
  // page에서 따로 재계산하지 않고 state.can()으로 그 guard 결과를 파생한다.
  const canSubmit = state.can({ type: 'SUBMIT' })
  const allChecked = ctx.age_verification && ctx.service && ctx.privacy && ctx.marketing

  const mutation = useMutation(createConsentsMutation())

  // success 상태 진입 → next로 리다이렉트 + GetMe 갱신.
  useEffect(() => {
    if (state.matches('success')) {
      // 낙관적 갱신: navigate 전에 getMe 캐시의 consents_required를 비운다.
      // 이렇게 해야 도착 페이지의 OnboardingGate가 옛 "동의 필요" 캐시를 보고
      // 다시 /onboarding/consent로 되돌리는 무한 루프가 생기지 않는다.
      // (invalidate 재요청은 navigate로 취소될 수 있어 캐시를 먼저 확정한다.)
      queryClient.setQueryData<User>(getMeQueryKey(), (old) =>
        old ? { ...old, consents_required: [] } : old,
      )
      void queryClient.invalidateQueries({ queryKey: getMeQueryKey() })
      navigate(nextUrl, { replace: true })
    }
  }, [state, nextUrl, navigate, queryClient])

  const handleToggle = (key: TermsType) => () => send({ type: 'TOGGLE', key })
  const handleToggleAll = () =>
    send({ type: 'TOGGLE_ALL', value: !allChecked })

  const handleSubmit = async () => {
    if (!canSubmit) return
    send({ type: 'SUBMIT' })
    try {
      await mutation.mutateAsync({
        body: {
          items: [
            { terms_type: 'age_verification', agreed: ctx.age_verification },
            { terms_type: 'service', agreed: ctx.service },
            { terms_type: 'privacy', agreed: ctx.privacy },
            { terms_type: 'marketing', agreed: ctx.marketing },
          ],
        },
      })
      send({ type: 'SUBMIT_SUCCESS' })
    } catch (e) {
      send({ type: 'SUBMIT_ERROR', error: e instanceof Error ? e.message : '제출 실패' })
    }
  }

  const submitting = state.matches('submitting')

  return (
    <div className="min-h-screen bg-white px-6 py-10">
      <div className="mx-auto max-w-md">
        <h1 className="text-[28px] font-semibold text-navy mb-2">서비스 이용 동의</h1>
        <p className="text-base text-muted mb-8">
          서비스를 이용하기 위해 아래 약관에 동의해주세요.
        </p>

        <button
          type="button"
          onClick={handleToggleAll}
          className="w-full text-left rounded-xl border border-line bg-gray-50 px-5 py-4 mb-4"
        >
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={handleToggleAll}
              className="h-5 w-5"
            />
            <span className="text-base font-semibold text-navy">전체 동의</span>
          </label>
        </button>

        <div className="space-y-3 mb-8">
          <ConsentRow
            checked={ctx.age_verification}
            onChange={handleToggle('age_verification')}
            label="(필수) 만 14세 이상 확인"
          />
          <ConsentRow
            checked={ctx.service}
            onChange={handleToggle('service')}
            label="(필수) 서비스 이용약관 동의"
          />
          <ConsentRow
            checked={ctx.privacy}
            onChange={handleToggle('privacy')}
            label="(필수) 개인정보 수집·이용 동의"
          />
          <ConsentRow
            checked={ctx.marketing}
            onChange={handleToggle('marketing')}
            label="(선택) 마케팅 정보 수신 동의"
          />
        </div>

        {ctx.error && (
          <p className="mb-4 text-sm text-red-500">{ctx.error}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full rounded-xl bg-navy px-5 py-3.5 text-base font-semibold text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {submitting ? '처리 중...' : '동의하고 시작'}
        </button>
      </div>
    </div>
  )
}

function ConsentRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-line bg-white px-5 py-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-5 w-5"
      />
      <span className="text-base text-navy">{label}</span>
    </label>
  )
}
