// 레거시 apps/display/src/DisplayPage.tsx 의 BackgroundSlideshow를 그대로 분리·이식.
// 3-Photo Sliding Window. GPU 메모리 ~25MB 고정. 전환은 opacity 스왑만.
// (시각 동일성 보존, 코드 변경 금지.)
import { memo, useEffect, useRef } from 'react'
import { SLIDESHOW_INTERVAL_MS } from './constants'

interface Slot {
  wrapper: HTMLDivElement
  el: HTMLImageElement
  bgEl: HTMLImageElement
  src: string
}

interface SlotState {
  prev: Slot | null
  curr: Slot | null
  next: Slot | null
}

function createSlotImg(src: string, container: HTMLDivElement): Slot {
  const wrapper = document.createElement('div')
  wrapper.className = 'absolute inset-0 h-full w-full overflow-hidden'
  wrapper.style.opacity = '0.001'
  wrapper.style.willChange = 'opacity'

  const bgImg = document.createElement('img')
  bgImg.alt = ''
  bgImg.className = 'absolute inset-0 h-full w-full'
  bgImg.style.objectFit = 'cover'
  bgImg.style.objectPosition = 'center center'
  bgImg.style.filter = 'blur(40px) brightness(0.7) saturate(1.2)'
  bgImg.style.transform = 'scale(1.1)'
  bgImg.src = src

  const img = document.createElement('img')
  img.alt = ''
  img.decoding = 'async'
  img.className = 'absolute inset-0 h-full w-full'
  img.style.objectFit = 'contain'

  // 사진 비율 vs 화면 비율의 상대 차이 기준(사용자 결정, 2026-05-20 정정):
  //   ratio = imgRatio / screenRatio
  //   - 1/1.1 ≤ ratio ≤ 1.1 (화면과 ±10% 이내): cover로 잘림 감수 꽉 채움
  //   - 그 외(상대 차이 10% 초과): contain + blur 배경
  // 분기 적용 함수. onload 콜백 등록 순서·캐시 케이스 양쪽에서 동작하도록 분리.
  const applyFit = () => {
    if (!img.naturalWidth || !img.naturalHeight) return
    const imgRatio = img.naturalWidth / img.naturalHeight
    const screenRatio = window.innerWidth / window.innerHeight
    const ratio = imgRatio / screenRatio
    const TOLERANCE_UPPER = 1.1
    const TOLERANCE_LOWER = 1 / 1.1
    const isCloseToScreen = ratio >= TOLERANCE_LOWER && ratio <= TOLERANCE_UPPER
    img.style.objectFit = isCloseToScreen ? 'cover' : 'contain'
    img.style.objectPosition = isCloseToScreen ? 'center 15%' : 'center center'
  }
  img.onload = applyFit
  img.src = src
  // 캐시된 이미지는 src 설정 즉시 complete=true가 되어 onload가 호출되지 않을 수
  // 있다. 그 경우를 위해 즉시 한 번 시도.
  if (img.complete && img.naturalWidth > 0) applyFit()
  img.decode().catch(() => {})

  wrapper.appendChild(bgImg)
  wrapper.appendChild(img)
  container.appendChild(wrapper)
  return { wrapper, el: img, bgEl: bgImg, src }
}

function getNextSrc(
  srcs: string[],
  currSrc: string | null,
  excludeSrc: string | null,
): string | null {
  for (const src of srcs) {
    if (src === currSrc) continue
    if (src === excludeSrc) continue
    return src
  }
  return srcs.length > 0 ? srcs[0] : null
}

export const BackgroundSlideshow = memo(function BackgroundSlideshow({
  photos,
  photoUrl,
}: {
  photos: string[]
  photoUrl?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const slotRef = useRef<SlotState>({ prev: null, curr: null, next: null })
  const srcsRef = useRef<string[]>([])
  const nextIndexRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const advanceSlideshowRef = useRef<(() => void) | null>(null)
  advanceSlideshowRef.current = () => {
    const container = containerRef.current
    if (!container) return
    const srcs = srcsRef.current
    if (srcs.length <= 1) return
    const { prev, curr, next } = slotRef.current
    if (!next || !next.el.complete || next.el.naturalWidth === 0) return
    if (prev) { prev.wrapper.style.willChange = 'auto'; prev.wrapper.remove() }
    if (curr) curr.wrapper.style.opacity = '0.001'
    next.wrapper.style.opacity = '1'
    const newNextSrc = srcs[nextIndexRef.current % srcs.length]
    const newNext = createSlotImg(newNextSrc, container)
    nextIndexRef.current = (nextIndexRef.current + 1) % srcs.length
    slotRef.current = { prev: curr ?? null, curr: next, next: newNext }
  }

  const startIntervalRef = useRef<(() => void) | null>(null)
  startIntervalRef.current = () => {
    if (timerRef.current) return
    timerRef.current = setInterval(() => { advanceSlideshowRef.current?.() }, SLIDESHOW_INTERVAL_MS)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const srcs = photos.length > 0 ? photos : photoUrl ? [photoUrl] : []
    srcsRef.current = srcs

    if (srcs.length === 0) {
      const { prev, curr, next } = slotRef.current
      prev?.wrapper.remove(); curr?.wrapper.remove(); next?.wrapper.remove()
      slotRef.current = { prev: null, curr: null, next: null }
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      return
    }

    if (slotRef.current.curr === null) {
      const currSlot = createSlotImg(srcs[0], container)
      currSlot.wrapper.style.opacity = '1'
      const nextSlot = srcs.length >= 2 ? createSlotImg(srcs[1], container) : null
      slotRef.current = { prev: null, curr: currSlot, next: nextSlot }
      nextIndexRef.current = srcs.length >= 3 ? 2 : 0
      return
    }

    const { curr, next } = slotRef.current

    if (curr && !srcs.includes(curr.src)) {
      curr.el.src = srcs[0]; curr.bgEl.src = srcs[0]; curr.src = srcs[0]
      curr.el.decode().catch(() => {}); curr.wrapper.style.opacity = '1'
    }

    if (next && !srcs.includes(next.src)) {
      const newNextSrc = getNextSrc(srcs, slotRef.current.curr?.src ?? null, null)
      if (newNextSrc) {
        next.el.src = newNextSrc; next.bgEl.src = newNextSrc; next.src = newNextSrc
        next.el.decode().catch(() => {}); next.wrapper.style.opacity = '0.001'
      }
    }

    if (!next && srcs.length >= 2) {
      const newNextSrc = getNextSrc(srcs, slotRef.current.curr?.src ?? null, null)
      if (newNextSrc) {
        slotRef.current = { ...slotRef.current, next: createSlotImg(newNextSrc, container) }
        if (!timerRef.current) startIntervalRef.current?.()
      }
    }

    if (srcs.length <= 1 && timerRef.current) {
      clearInterval(timerRef.current); timerRef.current = null
    }

    const currAfter = slotRef.current.curr
    if (currAfter && srcs.length >= 2) {
      const idx = srcs.indexOf(currAfter.src)
      nextIndexRef.current = idx >= 0 ? (idx + 2) % srcs.length : 0
    }
  }, [photos, photoUrl])

  useEffect(() => {
    if (srcsRef.current.length >= 2) startIntervalRef.current?.()
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      const { prev, curr, next } = slotRef.current
      prev?.wrapper.remove(); curr?.wrapper.remove(); next?.wrapper.remove()
      slotRef.current = { prev: null, curr: null, next: null }
    }
  }, [])

  return <div ref={containerRef} className="absolute inset-0 z-[1]" style={{ background: '#0f0c0a' }} />
})
