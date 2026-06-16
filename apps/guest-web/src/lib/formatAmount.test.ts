/**
 * 시연용 Vitest 테스트 — co-located 패턴(FRONTEND_TESTING.md § 파일 위치).
 *
 * 다음 세션 에이전트가 이걸 시작점으로 활용:
 *   - utility 테스트: 본 파일의 패턴 그대로
 *   - hook 테스트: FRONTEND_TESTING.md § 1. Custom hook 테스트 코드 예시
 *   - xState machine 테스트: FRONTEND_TESTING.md § 2. xState v5 machine 테스트
 *   - 컴포넌트·페이지 통합: FRONTEND_TESTING.md § 3, § 4
 *
 * 금지(TESTING.md § 금지 항목):
 *   - snapshot 테스트 / implementation detail / waitForTimeout
 */
import { describe, expect, it } from 'vitest'
import { amountToKorean, formatAmount } from './formatAmount'

describe('formatAmount', () => {
  it('숫자에 천 단위 구분 + "원" 접미사', () => {
    expect(formatAmount(50000)).toBe('50,000원')
  })

  it('0도 그대로 포맷', () => {
    expect(formatAmount(0)).toBe('0원')
  })
})

describe('amountToKorean', () => {
  it.each<[number, string]>([
    [10000, '일만원'],
    [50000, '오만원'],
    [123456, '일십이만삼천사백오십육원'],
    [100_000_000, '일억원'],
    [123_456_789, '일억이천삼백사십오만육천칠백팔십구원'],
  ])('%i → %s', (input, expected) => {
    expect(amountToKorean(input)).toBe(expected)
  })

  it('0이하면 빈 문자열', () => {
    expect(amountToKorean(0)).toBe('')
    expect(amountToKorean(-100)).toBe('')
  })
})
