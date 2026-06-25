/**
 * 공유 프로필 viz 스모크 (⑤) — sim-scale fixture 기반.
 *  - SignalSunburst: 2층 fold 부채꼴(path) + 대분류 라벨.
 *  - MoiCreditPanel: raw→층→공식 + 온체인 Moi Credit 강조.
 *  - TrustRange: 익명 범위(정확값 비노출).
 * ※ InyeonGraph(react-force-graph-2d)는 canvas라 jsdom 비대상 — 타입체크+빌드로 검증.
 * 금지(TESTING.md): snapshot, implementation detail, waitForTimeout.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SignalSunburst } from './SignalSunburst'
import { MoiCreditPanel } from './MoiCreditPanel'
import { TrustRange } from './TrustRange'
import { chulsooProfile } from './fixture'

describe('공유 프로필 viz', () => {
  it('SignalSunburst — 2층 fold 부채꼴 + 대분류 라벨', () => {
    const { container } = render(<SignalSunburst data={chulsooProfile.signal} />)
    expect(container.querySelectorAll('path').length).toBeGreaterThan(3)
    // EM은 <title>·<text>(라벨) 둘 다 등장 → 존재만 확인
    expect(screen.getAllByText('EM').length).toBeGreaterThan(0)
  })

  it('MoiCreditPanel — raw→층→공식 + 온체인 Moi Credit 강조', () => {
    render(<MoiCreditPanel data={chulsooProfile} />)
    expect(screen.getByText(/Moi Credit \(on-chain\)/)).toBeInTheDocument()
    expect(screen.getByText(/L1 raw/)).toBeInTheDocument()
  })

  it('TrustRange — 익명 신뢰범위(정확값 비노출)', () => {
    render(<TrustRange trust={chulsooProfile.trustRange} />)
    expect(screen.getByText(/anonymous/)).toBeInTheDocument()
  })
})
