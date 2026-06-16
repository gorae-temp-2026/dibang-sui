/**
 * useOutsideClick — ref 바깥 클릭 감지.
 *
 * 책임:
 *  - enabled=true (기본) + deferRegistration=true: 다음 틱에 document click 리스너 등록.
 *  - ref 바깥 클릭 → onOutside 호출.
 *  - ref 안 클릭 → onOutside 미호출.
 *  - enabled=false → 리스너 등록 안 함.
 *  - deferRegistration=false → 즉시 등록.
 *  - unmount → 리스너 정리.
 */
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useOutsideClick } from './useOutsideClick'

afterEach(() => {
  vi.useRealTimers()
})

describe('useOutsideClick', () => {
  it('enabled=true + defer: 다음 틱에 등록, ref 바깥 클릭 → onOutside', () => {
    vi.useFakeTimers()
    const onOutside = vi.fn()
    const outsideEl = document.createElement('div')
    const insideEl = document.createElement('div')
    document.body.appendChild(outsideEl)
    document.body.appendChild(insideEl)
    const ref = { current: insideEl }
    renderHook(() => useOutsideClick(ref, onOutside))
    // defer: setTimeout 호출 전엔 등록 안 됨
    outsideEl.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onOutside).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    // 이제 리스너 등록됨 — 바깥 클릭 발사
    outsideEl.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onOutside).toHaveBeenCalledTimes(1)
    document.body.removeChild(outsideEl)
    document.body.removeChild(insideEl)
  })

  it('ref 안 클릭 → onOutside 미호출', () => {
    vi.useFakeTimers()
    const onOutside = vi.fn()
    const insideEl = document.createElement('div')
    document.body.appendChild(insideEl)
    const ref = { current: insideEl }
    renderHook(() => useOutsideClick(ref, onOutside))
    vi.advanceTimersByTime(1)
    insideEl.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onOutside).not.toHaveBeenCalled()
    document.body.removeChild(insideEl)
  })

  it('enabled=false → 리스너 등록 안 함', () => {
    vi.useFakeTimers()
    const onOutside = vi.fn()
    const outsideEl = document.createElement('div')
    document.body.appendChild(outsideEl)
    const ref = { current: document.createElement('div') }
    renderHook(() => useOutsideClick(ref, onOutside, false))
    vi.advanceTimersByTime(10)
    outsideEl.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onOutside).not.toHaveBeenCalled()
    document.body.removeChild(outsideEl)
  })

  it('deferRegistration=false → 즉시 등록', () => {
    const onOutside = vi.fn()
    const outsideEl = document.createElement('div')
    document.body.appendChild(outsideEl)
    const ref = { current: document.createElement('div') }
    renderHook(() => useOutsideClick(ref, onOutside, true, false))
    // 타이머 없이 바로 발사
    outsideEl.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onOutside).toHaveBeenCalledTimes(1)
    document.body.removeChild(outsideEl)
  })

  it('unmount → 리스너 정리(이후 클릭 무반응)', () => {
    vi.useFakeTimers()
    const onOutside = vi.fn()
    const outsideEl = document.createElement('div')
    document.body.appendChild(outsideEl)
    const ref = { current: document.createElement('div') }
    const { unmount } = renderHook(() => useOutsideClick(ref, onOutside, true, false))
    unmount()
    outsideEl.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onOutside).not.toHaveBeenCalled()
    document.body.removeChild(outsideEl)
  })
})
