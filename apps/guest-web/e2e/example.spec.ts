/**
 * 시연용 E2E spec — 다음 세션 에이전트가 복붙 시작점으로 쓸 것.
 *
 * 패턴 요약:
 *   1. fixture import (loggedInAsGuest/host/cohost)
 *   2. page.goto(경로)
 *   3. getByRole / getByLabel / data-testid 우선 selector
 *   4. expect(locator).toBeVisible() 같은 web-first assertion
 *
 * 금지 (TESTING.md § 금지 항목):
 *   - waitForTimeout 등 고정 대기
 *   - snapshot 테스트
 *   - implementation detail 검증
 */
import { test, expect } from './fixtures'

test.describe('example: 로그인된 게스트 진입', () => {
  test('루트 진입 시 페이지가 로드된다', async ({ loggedInAsGuest }) => {
    await loggedInAsGuest.goto('/')

    // 페이지 자체가 렌더되었는지만 검증 (구체 UI는 앱이 자라면서 추가).
    // 실제 spec에선 getByRole('heading', { name: '...' }) 같이 구체적으로.
    await expect(loggedInAsGuest.locator('body')).toBeVisible()
  })

  test('storageState가 localStorage에 세션을 박았다', async ({
    loggedInAsGuest,
  }) => {
    await loggedInAsGuest.goto('/')

    const sessionKey = await loggedInAsGuest.evaluate(() => {
      // sb-<projectRef>-auth-token 패턴 키 존재 여부만 확인
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i)
        if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) return k
      }
      return null
    })

    expect(sessionKey).not.toBeNull()
  })
})
