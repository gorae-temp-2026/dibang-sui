/* eslint-disable react-hooks/rules-of-hooks --
 * Playwright의 `use(...)` 함수는 React Hook의 use와 이름만 겹치는 fixture 콜백.
 * ESLint react-hooks/rules-of-hooks가 함수명 매칭으로 잘못 잡는 false-positive.
 */
/**
 * 역할별 Playwright fixture.
 *
 * 각 spec은 단순히 다음과 같이 시작한다:
 *
 *   import { test, expect } from './fixtures'
 *
 *   test('게스트는 라운지에 입장할 수 있다', async ({ loggedInAsGuest }) => {
 *     await loggedInAsGuest.goto('/lounge/...')
 *     await expect(loggedInAsGuest.getByRole('heading')).toBeVisible()
 *   })
 *
 * 인증은 storageState로 이미 주입됨. UI 로그인 클릭 금지 (TESTING.md § E2E 인증).
 * project별로 storageState가 다르므로, fixture는 단지 의미 있는 이름의 page를 노출한다.
 */
import { test as base, expect, type Page } from '@playwright/test'

type RoleFixtures = {
  loggedInAsGuest: Page
  loggedInAsHost: Page
  loggedInAsCohost: Page
}

export const test = base.extend<RoleFixtures>({
  loggedInAsGuest: async ({ page }, use) => {
    // chromium-guest project에서 실행될 때 page는 이미 guest storageState 로드 상태
    await use(page)
  },
  loggedInAsHost: async ({ page }, use) => {
    await use(page)
  },
  loggedInAsCohost: async ({ page }, use) => {
    await use(page)
  },
})

export { expect }
