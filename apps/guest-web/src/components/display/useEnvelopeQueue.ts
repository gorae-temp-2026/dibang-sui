import { useCallback, useEffect, useRef, useState } from 'react'
import type React from 'react'
import { randomInitPos } from './physics'
import {
  REPLAY_INTERVAL_MIN,
  REPLAY_INTERVAL_MAX,
  QUIET_WAIT_MS,
  REPLAY_MAX_CONCURRENT,
  MIN_VISIBLE_TARGET,
  MIN_VISIBLE_HEARTS,
  INIT_POS_MARGIN,
} from './constants'
import type { EnvelopeBase, FloatingEnvelopeData } from './types'

function calcBounds(
  containerRef: React.RefObject<HTMLDivElement | null>,
  qrRef: React.RefObject<HTMLDivElement | null>,
  headerRef: React.RefObject<HTMLDivElement | null>,
) {
  const rect = containerRef.current?.getBoundingClientRect()
  const width = rect?.width ?? 400
  const height = rect?.height ?? 500
  let maxY = height * 0.75
  let minY = 0
  const qrEl = qrRef.current
  if (qrEl && rect) {
    const qrRect = qrEl.getBoundingClientRect()
    maxY = qrRect.top - rect.top
  }
  const headerEl = headerRef.current
  if (headerEl && rect) {
    const headerRect = headerEl.getBoundingClientRect()
    minY = headerRect.bottom - rect.top
  }
  return { width, maxY, minY }
}

/** historyRef 최대 보관 건수 (메모리 관리) */
export const HISTORY_MAX = 200

export function useEnvelopeQueue() {
  const containerRef = useRef<HTMLDivElement>(null)
  const qrRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  const [visible, setVisible] = useState<FloatingEnvelopeData[]>([])

  const visibleRef = useRef<FloatingEnvelopeData[]>([])
  const historyRef = useRef<EnvelopeBase[]>([])

  const inReplayModeRef = useRef(false)
  const replayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const quietTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recentlyShownRef = useRef<string[]>([])

  useEffect(() => {
    visibleRef.current = visible
  }, [visible])

  const addEnvelope = useCallback(
    (item: EnvelopeBase, isReplay: boolean) => {
      const { width, maxY, minY } = calcBounds(containerRef, qrRef, headerRef)
      const { x, y } = randomInitPos(width, maxY, minY, INIT_POS_MARGIN)
      const id = `env-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      const newEnv: FloatingEnvelopeData = {
        id,
        ...item,
        initX: x,
        initY: y,
        addedAt: Date.now(),
        isReplay,
        speedFactor: 0.75 + Math.random() * 0.5,  // 0.75~1.25
      }

      setVisible((prev) => [...prev, newEnv])
    },
    [],
  )

  const stopReplay = useCallback(() => {
    inReplayModeRef.current = false
    if (replayTimerRef.current) { clearTimeout(replayTimerRef.current); replayTimerRef.current = null }
    if (quietTimerRef.current) { clearTimeout(quietTimerRef.current); quietTimerRef.current = null }
  }, [])

  // 자기-재귀 호출 우회용 ref. ESLint use-before-declared 회피 + setTimeout 클로저에서
  // 항상 최신 scheduleNextReplay 참조하도록 effect로 동기화.
  const scheduleNextReplayRef = useRef<() => void>(() => {})

  const scheduleNextReplay = useCallback(() => {
    if (!inReplayModeRef.current) return

    const interval = Math.random() * (REPLAY_INTERVAL_MAX - REPLAY_INTERVAL_MIN) + REPLAY_INTERVAL_MIN

    replayTimerRef.current = setTimeout(() => {
      if (!inReplayModeRef.current) return

      const history = historyRef.current
      if (history.length === 0) return

      const isHeart = (e: EnvelopeBase) => !e.message || e.message.trim() === '❤️'
      const visibleHearts = visibleRef.current.filter((e) => isHeart(e) && !e.isNotice).length
      const needHeart = visibleHearts < MIN_VISIBLE_HEARTS

      let pool: EnvelopeBase[]
      if (needHeart) {
        const hearts = history.filter((h) => isHeart(h))
        pool = hearts.length > 0 ? hearts : history
      } else {
        const nonHearts = history.filter((h) => !isHeart(h) && !recentlyShownRef.current.includes(h.guestName))
        pool = nonHearts.length > 0 ? nonHearts : history.filter((h) => !isHeart(h))
        if (pool.length === 0) pool = history
      }

      const item = pool[Math.floor(Math.random() * pool.length)]

      if (!isHeart(item)) {
        recentlyShownRef.current = [item.guestName, ...recentlyShownRef.current].slice(0, 3)
      }

      const currentReplayCount = visibleRef.current.filter((e) => e.isReplay).length
      if (currentReplayCount < REPLAY_MAX_CONCURRENT) {
        addEnvelope(item, true)
      }

      scheduleNextReplayRef.current()
    }, interval)
  }, [addEnvelope])

  useEffect(() => {
    scheduleNextReplayRef.current = scheduleNextReplay
  }, [scheduleNextReplay])

  useEffect(() => {
    if (visible.length >= MIN_VISIBLE_TARGET || historyRef.current.length === 0) {
      if (quietTimerRef.current) {
        clearTimeout(quietTimerRef.current)
        quietTimerRef.current = null
      }
      return
    }

    const waitMs = visible.length === 0 ? QUIET_WAIT_MS : 1000

    quietTimerRef.current = setTimeout(() => {
      quietTimerRef.current = null
      if (
        visibleRef.current.length < MIN_VISIBLE_TARGET &&
        historyRef.current.length > 0 &&
        !inReplayModeRef.current
      ) {
        inReplayModeRef.current = true
        scheduleNextReplay()
      }
    }, waitMs)

    return () => {
      if (quietTimerRef.current) {
        clearTimeout(quietTimerRef.current)
        quietTimerRef.current = null
      }
    }
  }, [visible.length, scheduleNextReplay])

  const addNoticeEnvelope = useCallback(
    (item: EnvelopeBase) => {
      const { width, maxY, minY } = calcBounds(containerRef, qrRef, headerRef)
      const { x, y } = randomInitPos(width, maxY, minY, INIT_POS_MARGIN)
      const id = `notice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      const newEnv: FloatingEnvelopeData = {
        id,
        ...item,
        initX: x,
        initY: y,
        addedAt: Date.now(),
        isReplay: false,
        isNotice: true,
      }

      setVisible((prev) => [...prev, newEnv])
    },
    [],
  )

  const addLiveEnvelope = useCallback(
    (item: EnvelopeBase) => {
      // historyRef 상한 HISTORY_MAX건 유지 (오래된 것부터 제거)
      const updated = [...historyRef.current, item]
      historyRef.current = updated.length > HISTORY_MAX ? updated.slice(-HISTORY_MAX) : updated
      stopReplay()
      addEnvelope(item, false)
    },
    [addEnvelope, stopReplay],
  )

  /** 기존 메시지를 history에 시드 (페이지 로드 시 호출, replay 직접 시작) */
  const seedHistory = useCallback((items: EnvelopeBase[]) => {
    if (items.length === 0) return
    const updated = [...historyRef.current, ...items].slice(-HISTORY_MAX)
    historyRef.current = updated
    // history가 채워졌으니 replay 즉시 시작
    if (!inReplayModeRef.current && visibleRef.current.length < MIN_VISIBLE_TARGET) {
      inReplayModeRef.current = true
      scheduleNextReplay()
    }
  }, [scheduleNextReplay])

  const removeEnvelope = useCallback((id: string) => {
    setVisible((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const historyCount = historyRef.current.length

  // hook의 반환 객체에 ref를 직접 포함하는 건 표준 React 패턴(부모가 DOM 측정·이벤트 attach).
  // react-hooks/refs는 ref 자체 반환을 false-positive로 잡는다.
  // eslint-disable-next-line react-hooks/refs
  return { visible, historyCount, addLiveEnvelope, addNoticeEnvelope, removeEnvelope, seedHistory, containerRef, qrRef, headerRef }
}
