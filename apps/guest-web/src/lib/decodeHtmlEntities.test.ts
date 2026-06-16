/**
 * decodeHtmlEntities Vitest 테스트 — co-located 패턴(FRONTEND_TESTING.md § 파일 위치).
 *
 * 금지(TESTING.md § 금지 항목):
 *   - snapshot 테스트 / implementation detail / waitForTimeout
 */
import { describe, expect, it } from 'vitest'
import { decodeHtmlEntities } from './decodeHtmlEntities'

describe('decodeHtmlEntities', () => {
  it('빈 문자열은 빈 문자열로 반환', () => {
    expect(decodeHtmlEntities('')).toBe('')
  })

  it('엔티티 없는 평문은 그대로 반환', () => {
    expect(decodeHtmlEntities('축하해요')).toBe('축하해요')
  })

  it.each<[string, string]>([
    ['&amp;', '&'],
    ['&lt;', '<'],
    ['&gt;', '>'],
    ['&quot;', '"'],
    ['&#39;', "'"],
    ['&#x2764;', '❤'],
  ])('%s → %s', (input, expected) => {
    expect(decodeHtmlEntities(input)).toBe(expected)
  })

  it('혼합된 엔티티와 평문을 함께 디코딩', () => {
    expect(decodeHtmlEntities('Tom &amp; Jerry &lt;3')).toBe('Tom & Jerry <3')
  })
})
