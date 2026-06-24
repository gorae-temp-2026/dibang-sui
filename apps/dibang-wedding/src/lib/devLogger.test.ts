import { describe, it, expect, beforeEach, vi } from 'vitest'

// IndexedDB를 fake-indexeddb로 테스트
import 'fake-indexeddb/auto'

// VITE_DEV_PRIVATE_KEY를 설정해서 활성화
vi.stubEnv('VITE_DEV_PRIVATE_KEY', 'suiprivkey1test')

// devLogger를 dynamic import해서 env stub 이후에 로드
const { devLogger } = await import('./devLogger')

describe('devLogger', () => {
  beforeEach(async () => {
    devLogger.init()
    await devLogger.clear()
  })

  it('init 후 enabled = true', () => {
    expect(devLogger.enabled).toBe(true)
  })

  it('log → query로 읽기', async () => {
    devLogger.log('click', 'button_press', { target: '#submit' })
    await new Promise((r) => setTimeout(r, 50))
    const logs = await devLogger.query({ limit: 10 })
    expect(logs.length).toBeGreaterThanOrEqual(1)
    const found = logs.find((l) => l.event === 'button_press')
    expect(found).toBeTruthy()
    expect(found!.category).toBe('click')
    expect((found!.payload as Record<string, string>).target).toBe('#submit')
  })

  it('category 필터링', async () => {
    devLogger.log('click', 'a', {})
    devLogger.log('error', 'b', {})
    devLogger.log('click', 'c', {})
    await new Promise((r) => setTimeout(r, 50))
    const clicks = await devLogger.query({ category: 'click' })
    expect(clicks.every((l) => l.category === 'click')).toBe(true)
    expect(clicks.length).toBe(2)
  })

  it('clear로 전체 삭제', async () => {
    devLogger.log('click', 'x', {})
    await new Promise((r) => setTimeout(r, 50))
    expect(await devLogger.count()).toBeGreaterThan(0)
    await devLogger.clear()
    expect(await devLogger.count()).toBe(0)
  })

  it('correlationId 전파', async () => {
    const cid = devLogger.generateCorrelationId()
    devLogger.setCorrelation(cid)
    devLogger.log('click', 'with_cid', {})
    await new Promise((r) => setTimeout(r, 50))
    devLogger.setCorrelation(null)
    devLogger.log('click', 'without_cid', {})
    await new Promise((r) => setTimeout(r, 50))
    const withCid = await devLogger.query({ correlationId: cid })
    expect(withCid.length).toBe(1)
    expect(withCid[0].event).toBe('with_cid')
  })

  it('무한 재귀 방지 — log 중 재진입 시 no-op', async () => {
    // _isLogging 플래그가 작동하는지 간접 확인: 빠르게 연속 호출해도 에러 없음
    for (let i = 0; i < 100; i++) {
      devLogger.log('console', `rapid_${i}`, {})
    }
    await new Promise((r) => setTimeout(r, 200))
    const count = await devLogger.count()
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThanOrEqual(100)
  })

  it('search 필터', async () => {
    devLogger.log('network', 'fetch', { url: '/api/me', status: 200 })
    devLogger.log('network', 'fetch', { url: '/api/weddings', status: 500 })
    await new Promise((r) => setTimeout(r, 50))
    const results = await devLogger.query({ search: 'weddings' })
    expect(results.length).toBe(1)
    expect((results[0].payload as Record<string, unknown>).url).toBe('/api/weddings')
  })
})

describe('devLogger disabled', () => {
  it('VITE_DEV_PRIVATE_KEY 없으면 no-op', async () => {
    vi.stubEnv('VITE_DEV_PRIVATE_KEY', '')
    const mod = await import('./devLogger')
    mod.devLogger.init()
    expect(mod.devLogger.enabled).toBe(false)
    mod.devLogger.log('click', 'should_not_write', {})
    const logs = await mod.devLogger.query()
    expect(logs).toEqual([])
  })
})
