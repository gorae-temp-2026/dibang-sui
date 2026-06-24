/**
 * useOnchainCheckIn — 단일 participate 보장(중복 = CS 신호 이중 계상 방지).
 *
 * event::participate는 온체인 멱등성이 없어, 입장 게이트·자동 체크인·링크 입장 3곳에서 같은 라운지로
 * 동시 호출돼도 participate가 1회만 나가야 한다(in-flight 공유 + 세션 완료 Set + 온체인 read 가드).
 * 적대적 리뷰(opus 4.8) CRITICAL #1 회귀 방지.
 *
 * 주의: 훅이 모듈 레벨 상태(inflight/done)를 쓰므로 테스트마다 loungeId를 달리해 오염을 피한다.
 */
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const getLounge = vi.fn()
const getWeddingDb = vi.fn()
const getOnchainWedding = vi.fn()
const getParticipationForEvent = vi.fn()
const buildParticipateTx = vi.fn()
const executeOnchain = vi.fn()
const authState = { isAuthenticated: true, address: '0xA' }

vi.mock('@gorae/contracts/sdk.gen', () => ({
  getLounge: (...a: unknown[]) => getLounge(...a),
  getWedding: (...a: unknown[]) => getWeddingDb(...a),
}))

vi.mock('@gorae/sui-sdk', () => ({
  buildParticipateTx: (...a: unknown[]) => buildParticipateTx(...a),
  getWedding: (...a: unknown[]) => getOnchainWedding(...a),
  getParticipationForEvent: (...a: unknown[]) => getParticipationForEvent(...a),
  createJsonRpcClient: () => ({}),
  configureSui: () => {},
}))

vi.mock('../providers/ZkLoginProvider', () => ({
  useZkLogin: () => ({
    isAuthenticated: authState.isAuthenticated,
    address: authState.address,
    executeOnchain,
  }),
}))

vi.mock('../env', () => ({ env: { VITE_SUI_NETWORK: 'testnet', VITE_SUI_PACKAGE_ID: '0xpkg' } }))

import { useOnchainCheckIn } from './useOnchainCheckIn'

function happyPath() {
  getLounge.mockResolvedValue({ data: { wedding_id: 'w-db' } })
  getWeddingDb.mockResolvedValue({ data: { sui_wedding_id: '0xW' } })
  getOnchainWedding.mockResolvedValue({ eventId: '0xEVENT' })
  buildParticipateTx.mockReturnValue({ tx: true })
  executeOnchain.mockResolvedValue('digest')
}

afterEach(() => {
  getLounge.mockReset()
  getWeddingDb.mockReset()
  getOnchainWedding.mockReset()
  getParticipationForEvent.mockReset()
  buildParticipateTx.mockReset()
  executeOnchain.mockReset()
  authState.isAuthenticated = true
  authState.address = '0xA'
})

describe('useOnchainCheckIn — 단일 participate 보장', () => {
  it('같은 라운지 동시 호출 2회 → participate 1회만(in-flight 공유)', async () => {
    happyPath()
    getParticipationForEvent.mockResolvedValue(undefined) // 미참가
    const { result } = renderHook(() => useOnchainCheckIn())
    const fn = result.current
    const [a, b] = await Promise.all([fn('lng-concurrent'), fn('lng-concurrent')])
    expect(executeOnchain).toHaveBeenCalledTimes(1)
    expect(buildParticipateTx).toHaveBeenCalledTimes(1)
    expect(a).toBe('digest')
    expect(b).toBe('digest')
  })

  it('이미 온체인 Participation 있으면 participate 안 함(중복 방지)', async () => {
    happyPath()
    getParticipationForEvent.mockResolvedValue({ id: '0xP' }) // 기존 참가
    const { result } = renderHook(() => useOnchainCheckIn())
    const res = await result.current('lng-existing')
    expect(res).toBeNull()
    expect(executeOnchain).not.toHaveBeenCalled()
  })

  it('sui_wedding_id 없으면 participate 안 함', async () => {
    happyPath()
    getWeddingDb.mockResolvedValue({ data: { sui_wedding_id: null } })
    const { result } = renderHook(() => useOnchainCheckIn())
    const res = await result.current('lng-nosui')
    expect(res).toBeNull()
    expect(executeOnchain).not.toHaveBeenCalled()
  })

  it('미인증이면 no-op(DB 조회조차 안 함)', async () => {
    happyPath()
    authState.isAuthenticated = false
    const { result } = renderHook(() => useOnchainCheckIn())
    const res = await result.current('lng-unauth')
    expect(res).toBeNull()
    expect(getLounge).not.toHaveBeenCalled()
  })
})
