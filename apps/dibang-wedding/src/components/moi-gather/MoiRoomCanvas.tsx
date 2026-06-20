// 모이가모인곳(④) 2.5D 미니룸 캔버스 — raw PixiJS v8 명령형 마운트(@pixi/react 미사용).
// 에셋 부재 → 룸/모이/아이템을 컬러 도형 placeholder로 렌더. 에셋키(item.id/moi.id)로 텍스처
// 슬롯 교체 시 build*Node 내부 도형→Sprite만 바꾸면 product-grade 점프(에셋스펙 §4 워크플로).
// 기능: 룸 배경+캐릭터 분리 합성 · 모이/아이템 히트테스트 · 팬(드래그)/줌(휠·핀치) · y기반 z-order
//       · 아이템 드래그 배치(→onMovePlaced) · 모이 클릭(→onMoiClick=공유 ProfileSheet).
import { useEffect, useRef } from 'react'
import { Application, Container, Graphics, Text, Rectangle, type FederatedPointerEvent } from 'pixi.js'
import type { PlacedItem } from '../../machines/moiRoom.machine'
import { ITEM_BY_ID, type RoomMoi, type EquipSlot } from './data'

// 고정 룸 좌표계(월드) — world 트랜스폼이 화면 fit + 팬/줌 담당.
const ROOM_W = 1000
const ROOM_H = 1500
const FX = ROOM_W * 0.1 // 바닥 좌
const FW = ROOM_W * 0.8 // 바닥 폭
const FY = ROOM_H * 0.37 // 바닥 상단
const FH = ROOM_H * 0.6 // 바닥 높이
const ITEM_W: Record<'sm' | 'md' | 'lg', number> = { sm: 78, md: 112, lg: 168 }
const ZOOM_MIN = 0.55
const ZOOM_MAX = 2.6

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const toRoom = (nx: number, ny: number) => ({ x: FX + nx * FW, y: FY + ny * FH })
const toNorm = (rx: number, ry: number) => ({ x: clamp((rx - FX) / FW, 0, 1), y: clamp((ry - FY) / FH, 0, 1) })

interface Props {
  placed: PlacedItem[]
  equipped: Partial<Record<EquipSlot, string>>
  mois: RoomMoi[]
  onMoiClick: (id: string) => void
  onMovePlaced: (itemId: string, x: number, y: number) => void
}

export function MoiRoomCanvas({ placed, equipped, mois, onMoiClick, onMovePlaced }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  // 핸들러/데이터 최신값을 마운트-1회 효과 안에서 읽도록 ref로 유지.
  const onMoiClickRef = useRef(onMoiClick)
  const onMoveRef = useRef(onMovePlaced)
  const placedRef = useRef(placed)
  const equippedRef = useRef(equipped)
  const moisRef = useRef(mois)
  const syncRef = useRef<() => void>(() => {})
  // 최신 props를 ref에 동기화 — 렌더 중 ref 변경 금지(react-hooks/refs)라 효과에서 갱신.
  useEffect(() => {
    onMoiClickRef.current = onMoiClick
    onMoveRef.current = onMovePlaced
    placedRef.current = placed
    equippedRef.current = equipped
    moisRef.current = mois
  })

  // ─ 마운트: pixi Application 1회 생성 + 씬·인터랙션 구성 ─
  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    let app: Application | null = null
    let disposed = false
    let wheelCanvas: HTMLCanvasElement | null = null
    let onWheel: ((e: WheelEvent) => void) | null = null
    let cleanupExtra: (() => void) | null = null

    void (async () => {
      const a = new Application()
      await a.init({ background: 0x0a1626, antialias: true, width: el.clientWidth || 360, height: el.clientHeight || 640, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true })
      if (disposed) {
        a.destroy(true, { children: true })
        return
      }
      app = a
      el.appendChild(a.canvas)

      const bg = new Graphics() // 정적 배경(하늘/비네트) — 팬/줌 안 함
      a.stage.addChild(bg)
      const world = new Container() // 룸·아이템·모이 — 팬/줌 대상
      a.stage.addChild(world)
      const room = new Graphics()
      world.addChild(room)
      const dynamic = new Container() // 아이템+모이(재합성)
      dynamic.sortableChildren = true
      world.addChild(dynamic)
      drawRoom(room)

      // 화면 fit (룸을 세로 풀스크린에 맞춤)
      const fitWorld = () => {
        const { width: w, height: h } = a.screen
        drawBg(bg, w, h)
        const scale = Math.min(w / ROOM_W, h / ROOM_H) * 1.0
        world.scale.set(scale)
        world.position.set((w - ROOM_W * scale) / 2, (h - ROOM_H * scale) / 2)
        a.stage.hitArea = new Rectangle(0, 0, w, h)
      }
      fitWorld()
      const ro = new ResizeObserver(() => {
        a.renderer.resize(el.clientWidth, el.clientHeight)
        fitWorld()
      })
      ro.observe(el)
      cleanupExtra = () => ro.disconnect()

      // 줌(커서 기준)
      const zoomAt = (sx: number, sy: number, factor: number) => {
        const next = clamp(world.scale.x * factor, ZOOM_MIN, ZOOM_MAX)
        const f = next / world.scale.x
        world.position.x = sx - (sx - world.position.x) * f
        world.position.y = sy - (sy - world.position.y) * f
        world.scale.set(next)
      }
      onWheel = (e: WheelEvent) => {
        e.preventDefault()
        zoomAt(e.offsetX, e.offsetY, e.deltaY < 0 ? 1.1 : 1 / 1.1)
      }
      wheelCanvas = a.canvas
      a.canvas.addEventListener('wheel', onWheel, { passive: false })

      // 포인터: 빈 곳 1개=팬 / 2개=핀치줌 / 아이템=드래그 / 모이=클릭
      const pointers = new Map<number, { x: number; y: number }>()
      let panning = false
      let last = { x: 0, y: 0 }
      let pinchDist = 0
      let dragId: string | null = null
      let dragNode: Container | null = null

      a.stage.eventMode = 'static'
      a.stage.on('pointerdown', (e: FederatedPointerEvent) => {
        pointers.set(e.pointerId, { x: e.global.x, y: e.global.y })
        if (pointers.size === 2) {
          const [p, q] = [...pointers.values()]
          pinchDist = Math.hypot(p.x - q.x, p.y - q.y)
          panning = false
        } else if (e.target === a.stage || e.target === bg || e.target === room) {
          panning = true
          last = { x: e.global.x, y: e.global.y }
        }
      })
      a.stage.on('pointermove', (e: FederatedPointerEvent) => {
        if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.global.x, y: e.global.y })
        if (dragId && dragNode) {
          const local = world.toLocal(e.global)
          const n = toNorm(local.x, local.y)
          const r = toRoom(n.x, n.y)
          dragNode.position.set(r.x, r.y)
          dragNode.zIndex = r.y
          return
        }
        if (pointers.size === 2) {
          const [p, q] = [...pointers.values()]
          const d = Math.hypot(p.x - q.x, p.y - q.y)
          if (pinchDist > 0) zoomAt((p.x + q.x) / 2, (p.y + q.y) / 2, d / pinchDist)
          pinchDist = d
          return
        }
        if (panning) {
          world.position.x += e.global.x - last.x
          world.position.y += e.global.y - last.y
          last = { x: e.global.x, y: e.global.y }
        }
      })
      const endPointer = (e: FederatedPointerEvent) => {
        pointers.delete(e.pointerId)
        if (pointers.size < 2) pinchDist = 0
        if (pointers.size === 0) panning = false
        if (dragId && dragNode) {
          const local = world.toLocal(e.global)
          const n = toNorm(local.x, local.y)
          onMoveRef.current(dragId, n.x, n.y)
          dragId = null
          dragNode = null
        }
      }
      a.stage.on('pointerup', endPointer)
      a.stage.on('pointerupoutside', endPointer)

      // 씬 재합성 — placed/equipped/mois 변경 시 호출.
      const sync = () => {
        dynamic.removeChildren().forEach((c) => c.destroy({ children: true }))
        // 아이템(인테리어)
        for (const p of placedRef.current) {
          const item = ITEM_BY_ID[p.itemId]
          if (!item) continue
          const r = toRoom(p.x, p.y)
          const node = buildItemNode(item.emoji, item.name, item.color, ITEM_W[item.size ?? 'md'])
          node.position.set(r.x, r.y)
          node.zIndex = r.y
          node.eventMode = 'static'
          node.cursor = 'grab'
          node.on('pointerdown', (e: FederatedPointerEvent) => {
            e.stopPropagation()
            dragId = p.itemId
            dragNode = node
          })
          dynamic.addChild(node)
        }
        // 모이(캐릭터)
        const eq = equippedRef.current
        for (const m of moisRef.current) {
          const r = toRoom(m.x, m.y)
          const bodyColor = m.me && eq.body ? ITEM_BY_ID[eq.body]?.color ?? m.color : m.color
          const headItem = m.me && eq.head ? ITEM_BY_ID[eq.head] : undefined
          const node = buildMoiNode(m, bodyColor, headItem?.color)
          node.position.set(r.x, r.y)
          node.zIndex = r.y + 0.5 // 동률 시 모이를 아이템 앞에
          node.eventMode = 'static'
          node.cursor = 'pointer'
          node.on('pointerdown', (e: FederatedPointerEvent) => e.stopPropagation())
          node.on('pointertap', (e: FederatedPointerEvent) => {
            e.stopPropagation()
            onMoiClickRef.current(m.id)
          })
          dynamic.addChild(node)
        }
      }
      syncRef.current = sync
      sync()
    })()

    return () => {
      disposed = true
      cleanupExtra?.()
      if (wheelCanvas && onWheel) wheelCanvas.removeEventListener('wheel', onWheel)
      if (app) app.destroy(true, { children: true })
    }
  }, [])

  // placed/equipped/mois 변경 → 씬 재합성
  useEffect(() => {
    syncRef.current()
  }, [placed, equipped, mois])

  return <div ref={hostRef} className="absolute inset-0 touch-none" />
}

// ─ placeholder 도형 빌더 (에셋 나오면 도형→Sprite 교체 지점) ─

function buildItemNode(emoji: string, name: string, color: number, w: number): Container {
  const c = new Container()
  const h = w * 1.05
  const shadow = new Graphics()
  shadow.ellipse(0, 6, w * 0.42, w * 0.14).fill({ color: 0x000000, alpha: 0.22 })
  c.addChild(shadow)
  const body = new Graphics()
  body.roundRect(-w / 2, -h, w, h, w * 0.18).fill(color).stroke({ color: 0xffffff, alpha: 0.18, width: 2 })
  c.addChild(body)
  const ico = new Text({ text: emoji, style: { fontSize: w * 0.46, align: 'center' } })
  ico.anchor.set(0.5)
  ico.position.set(0, -h * 0.52)
  c.addChild(ico)
  const label = new Text({ text: name, style: { fontSize: 19, fill: 0xffffff, fontWeight: '700' } })
  label.anchor.set(0.5)
  label.position.set(0, 16)
  c.addChild(label)
  return c
}

function buildMoiNode(m: RoomMoi, bodyColor: number, headAccent?: number): Container {
  const c = new Container()
  const shadow = new Graphics()
  shadow.ellipse(0, 6, 38, 13).fill({ color: 0x000000, alpha: 0.24 })
  c.addChild(shadow)
  if (m.me) {
    const ring = new Graphics()
    ring.ellipse(0, 4, 46, 17).stroke({ color: 0xf8c57a, width: 3, alpha: 0.9 })
    c.addChild(ring)
  }
  const body = new Graphics()
  body.roundRect(-30, -84, 60, 84, 26).fill(bodyColor).stroke({ color: 0xffffff, alpha: 0.25, width: 2 })
  c.addChild(body)
  const head = new Graphics()
  head.circle(0, -104, 30).fill(0xfdf0e2).stroke({ color: 0xffffff, alpha: 0.3, width: 2 })
  c.addChild(head)
  if (headAccent != null) {
    const acc = new Graphics()
    acc.roundRect(-26, -128, 52, 14, 7).fill(headAccent)
    c.addChild(acc)
  }
  const label = new Text({ text: m.name, style: { fontSize: 20, fill: 0xffffff, fontWeight: '800' } })
  label.anchor.set(0.5)
  label.position.set(0, 24)
  c.addChild(label)
  return c
}

// ─ 정적 배경 + 룸(placeholder, STYLE LOCK 파스텔: sky #87CEEB · pale #E8F4FA · ivory #FDFBF7 · navy #1E3A5F) ─

function drawBg(g: Graphics, w: number, h: number) {
  g.clear()
  g.rect(0, 0, w, h).fill(0x0a1626)
  g.rect(0, 0, w, h * 0.5).fill({ color: 0x163a5f, alpha: 0.5 })
  // 가벼운 비네트
  g.ellipse(w / 2, h * 0.42, w * 0.62, h * 0.42).fill({ color: 0x2b6aa0, alpha: 0.18 })
}

function drawRoom(g: Graphics) {
  g.clear()
  // 뒷벽
  g.rect(FX - 40, 120, FW + 80, FY - 120).fill(0xe8f4fa)
  g.rect(FX - 40, 120, (FW + 80) / 2, FY - 120).fill({ color: 0xdce9f2, alpha: 0.6 })
  // 창문 placeholder
  g.roundRect(FX + FW * 0.58, 220, FW * 0.3, FY * 0.42, 14).fill(0xbfe0f2).stroke({ color: 0xffffff, width: 6 })
  // 바닥(아이보리, 살짝 사다리꼴로 2.5D 느낌)
  g.poly([FX - 40, FY, FX + FW + 40, FY, FX + FW + 110, FY + FH + 80, FX - 110, FY + FH + 80]).fill(0xfdfbf7)
  g.poly([FX - 40, FY, FX + FW + 40, FY, FX + FW + 110, FY + FH + 80, FX - 110, FY + FH + 80]).stroke({ color: 0x1e3a5f, alpha: 0.08, width: 3 })
  // 바닥 가이드 라인
  for (let i = 1; i < 4; i++) {
    const y = FY + (FH * i) / 4
    g.moveTo(FX - 40 - i * 18, y).lineTo(FX + FW + 40 + i * 18, y).stroke({ color: 0x1e3a5f, alpha: 0.05, width: 2 })
  }
}
