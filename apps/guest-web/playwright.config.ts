import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const configDir = path.dirname(fileURLToPath(import.meta.url))

// .env.test 우선, 없으면 .env.local. 둘 다 없으면 process.env 그대로.
// 컨벤션: _code_convention/TESTING.md § 시드 유저 / § 운영 - 8. 환경 가정.
dotenv.config({ path: path.resolve(configDir, '.env.test') })
dotenv.config({ path: path.resolve(configDir, '.env.local') })

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5201'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    // CLAUDE.md memory: 사용자 환경 보호 — 결정성 우선
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // setup project → storageState 생성 → 역할별 chromium project가 그걸 로드.
  // TESTING.md § E2E 인증 = storageState 패턴.
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium-guest',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/guest.json',
      },
      dependencies: ['setup'],
      testIgnore: /.*\.setup\.ts/,
    },
    {
      name: 'chromium-host',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/host.json',
      },
      dependencies: ['setup'],
      testIgnore: /.*\.setup\.ts/,
    },
    {
      name: 'chromium-cohost',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/cohost.json',
      },
      dependencies: ['setup'],
      testIgnore: /.*\.setup\.ts/,
    },
  ],

  // 사용자가 띄워둔 dev server 재사용. CI에선 강제로 새로 띄움.
  // TESTING.md § 운영 - 5. 포트 충돌 처리.
  webServer: {
    command: 'pnpm dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
