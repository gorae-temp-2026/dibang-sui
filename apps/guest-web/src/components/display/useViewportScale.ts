import { useEffect, useState } from 'react'

/** display 디자인 기준 해상도 (FHD) */
const DESIGN_W = 1920
const DESIGN_H = 1080

/**
 * 가로형(landscape)에서 FHD(1920×1080) 기준 화면 비율 스케일을 반환한다.
 *
 * - 가로형이고 뷰포트가 FHD보다 크면: max(1, min(vw/1920, vh/1080)) — 화면 비율대로 1.0 이상 확대
 * - 가로형이지만 FHD 이하면: 1.0 (축소하지 않음)
 * - 세로형(portrait)이면: 항상 1.0
 *
 * 루트 transform 대신 텍스트 레이어에 개별 적용하기 위한 값.
 * (물리 좌표 수식은 건드리지 않는다 — getBoundingClientRect가 변형 후 좌표를 반환하므로 자동 적응)
 */
export function useViewportScale(): number {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      // CSS `landscape` 미디어쿼리와 동일 기준 (width >= height)
      if (vw < vh) {
        setScale(1)
        return
      }
      setScale(Math.max(1, Math.min(vw / DESIGN_W, vh / DESIGN_H)))
    }

    compute()
    window.addEventListener('resize', compute)
    window.addEventListener('orientationchange', compute)
    return () => {
      window.removeEventListener('resize', compute)
      window.removeEventListener('orientationchange', compute)
    }
  }, [])

  return scale
}

/**
 * 뷰포트 높이가 minHeight 이상이면 true.
 * 작은 임베드(예: 모바일 미리보기 iframe 720px)에서 QR 등 큰 화면 전용 요소를 숨길 때 사용.
 * 실제 식장 디스플레이는 1080p 이상이라 영향 없음.
 */
export function useIsTallViewport(minHeight: number): boolean {
  const [tall, setTall] = useState(
    typeof window === 'undefined' ? true : window.innerHeight >= minHeight,
  )

  useEffect(() => {
    const compute = () => setTall(window.innerHeight >= minHeight)
    compute()
    window.addEventListener('resize', compute)
    window.addEventListener('orientationchange', compute)
    return () => {
      window.removeEventListener('resize', compute)
      window.removeEventListener('orientationchange', compute)
    }
  }, [minHeight])

  return tall
}
