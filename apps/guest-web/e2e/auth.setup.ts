/**
 * Setup project: dev Supabase 시드 유저(test-guest/host/cohost)로 비밀번호 로그인 →
 * 받은 세션을 e2e/.auth/{role}.json 에 storageState로 저장.
 *
 * 이후 모든 spec(`chromium-{role}` projects)은 이 파일을 로드해 로그인된 상태로 시작한다.
 * UI 로그인 페이지 클릭 금지 (TESTING.md § E2E 인증).
 *
 * 환경변수(.env.test 권장):
 *   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY            ← dev Supabase
 *   E2E_TEST_GUEST_EMAIL  / E2E_TEST_GUEST_PASSWORD       ← 시드 유저 (guest)
 *   E2E_TEST_HOST_EMAIL   / E2E_TEST_HOST_PASSWORD        ← 시드 유저 (host)
 *   E2E_TEST_COHOST_EMAIL / E2E_TEST_COHOST_PASSWORD      ← 시드 유저 (cohost)
 */
import { test as setup } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? process.env.E2E_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ?? process.env.E2E_SUPABASE_ANON_KEY ?? ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[auth.setup] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 환경변수 필수. ' +
      'apps/guest-web/.env.test 를 설정하라.'
  )
}

// 'https://<ref>.supabase.co' → '<ref>'  (supabase-js localStorage 키 prefix)
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
const storageKey = `sb-${projectRef}-auth-token`

type Role = 'guest' | 'host' | 'cohost'

const roles: Array<{ role: Role; email: string; password: string }> = [
  {
    role: 'guest',
    email: process.env.E2E_TEST_GUEST_EMAIL ?? 'test-guest@example.com',
    password: process.env.E2E_TEST_GUEST_PASSWORD ?? '',
  },
  {
    role: 'host',
    email: process.env.E2E_TEST_HOST_EMAIL ?? 'test-host@example.com',
    password: process.env.E2E_TEST_HOST_PASSWORD ?? '',
  },
  {
    role: 'cohost',
    email: process.env.E2E_TEST_COHOST_EMAIL ?? 'test-cohost@example.com',
    password: process.env.E2E_TEST_COHOST_PASSWORD ?? '',
  },
]

for (const { role, email, password } of roles) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    if (!password) {
      throw new Error(
        `[auth.setup] E2E_TEST_${role.toUpperCase()}_PASSWORD 환경변수 필수.`
      )
    }

    // anon 클라이언트로 비밀번호 로그인 → session 획득
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error || !data.session) {
      throw new Error(
        `[auth.setup] signInWithPassword 실패 (${role}/${email}): ${
          error?.message ?? 'no session'
        }`
      )
    }

    // baseURL 도메인의 localStorage에 supabase 세션 박기.
    // 앱이 supabase-js 기본 storageKey 패턴으로 세션을 읽는다는 전제.
    // (앱이 cookie 기반이면 page.context().addCookies(...)로 대체 — TESTING.md 참조)
    await page.goto('/')
    await page.evaluate(
      ({ key, value }) => {
        window.localStorage.setItem(key, value)
      },
      { key: storageKey, value: JSON.stringify(data.session) }
    )

    const outPath = path.resolve(here, `.auth/${role}.json`)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    await page.context().storageState({ path: outPath })
    console.log(`[auth.setup] storageState saved → ${outPath}`)
  })
}
