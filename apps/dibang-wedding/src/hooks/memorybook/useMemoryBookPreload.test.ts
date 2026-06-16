/**
 * useMemoryBookPreload — rawData → applyThumbUrls + Image preload.
 *
 * 책임:
 *  - rawData를 그대로 반환(thumbUrl noop). useMemo 캐시.
 *  - effect에서 모든 사진 URL을 new Image()로 preload.
 *  - URL 중복은 Set으로 dedupe.
 *
 * Image 생성을 spy로 잡아 호출 횟수와 src 인자를 검증.
 */
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMemoryBookPreload } from './useMemoryBookPreload'

afterEach(() => {
  vi.restoreAllMocks()
})

function baseData(overrides?: Partial<{
  cover: string
  guest: string[]
  curated: string[]
  display: string[]
}>) {
  return {
    couple: { coverPhoto: overrides?.cover ?? 'https://a/cover.jpg', groomName: 'g', brideName: 'b' },
    guestPhotos: (overrides?.guest ?? ['https://a/1.jpg']).map((url) => ({ id: url, url })),
    curatedPhotos: (overrides?.curated ?? ['https://a/2.jpg']).map((url) => ({ id: url, url })),
    displayPhotos: (overrides?.display ?? ['https://a/3.jpg']).map((url) => ({ id: url, url })),
  } as never
}

describe('useMemoryBookPreload', () => {
  it('rawData 그대로 반환 (thumbUrl noop)', () => {
    const data = baseData()
    const { result } = renderHook(() => useMemoryBookPreload(data))
    expect(result.current.couple.coverPhoto).toBe('https://a/cover.jpg')
    expect(result.current.guestPhotos[0].url).toBe('https://a/1.jpg')
    expect(result.current.curatedPhotos[0].url).toBe('https://a/2.jpg')
    expect(result.current.displayPhotos[0].url).toBe('https://a/3.jpg')
  })

  it('모든 URL을 new Image()로 preload', () => {
    const srcs: string[] = []
    class ImageMock {
      _src = ''
      set src(v: string) {
        this._src = v
        srcs.push(v)
      }
    }
    vi.stubGlobal('Image', ImageMock)

    const data = baseData()
    renderHook(() => useMemoryBookPreload(data))
    // cover + guest + curated + display 4건
    expect(srcs).toEqual(
      expect.arrayContaining([
        'https://a/cover.jpg',
        'https://a/1.jpg',
        'https://a/2.jpg',
        'https://a/3.jpg',
      ]),
    )
  })

  it('URL 중복은 dedupe(Set)', () => {
    const srcs: string[] = []
    class ImageMock {
      _src = ''
      set src(v: string) {
        this._src = v
        srcs.push(v)
      }
    }
    vi.stubGlobal('Image', ImageMock)
    const data = baseData({
      cover: 'https://a/same.jpg',
      guest: ['https://a/same.jpg', 'https://a/same.jpg'],
    })
    renderHook(() => useMemoryBookPreload(data))
    const sameCount = srcs.filter((u) => u === 'https://a/same.jpg').length
    expect(sameCount).toBe(1)
  })
})
