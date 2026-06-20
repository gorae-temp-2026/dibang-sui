// 모이가모인곳(④) 광장(plaza) 캔버스 — raw PixiJS v8 명령형 마운트(@pixi/react 미사용).
// ★개념: 45° 부감의 넓은 광장 + 다수 모이 군중(150~300 = 라운지 시각화). 작은 방 아님(핸드오프 §3).
// 에셋 부재 → 광장 바닥·모이·데코를 컬러 도형 placeholder로 렌더. 에셋키(item.id/moi.id)로 손그림
//   PNG 텍스처 슬롯 교체 시 build*Node 내부 도형→Sprite만 바꾸면 product-grade(에셋스펙 §4).
// 기능: 부감 광장 바닥 · 테마 데코 레이어 · 모이 군중 히트테스트 · 팬/줌(휠·핀치) · y기반 z-order(깊이)
//       · 샵 데코 드래그 배치(→onMovePlaced) · 모이 클릭(→onMoiClick=공유 ProfileSheet).
// 확장(150~300): 군중은 dedicated 컨테이너 — 대규모 시 ParticleContainer/뷰포트 컬링으로 교체.
import { useEffect, useRef } from 'react'
import { Application, Container, Graphics, Text, Rectangle, type FederatedPointerEvent } from 'pixi.js'
import type { PlacedItem } from '../../machines/moiPlaza.machine'
import { ITEM_BY_ID, type PlazaMoi, type DecorItem, type EquipSlot } from './data'

// 고정 광장 좌표계(월드) — world 트랜스폼이 화면 fit + 팬/줌 담당. 방보다 넓게.
const PLAZA_W = 1400
const PLAZA_H = 1760
const FX = PLAZA_W * 0.05
const FW = PLAZA_W * 0.9
const FY = PLAZA_H * 0.08
const FH = PLAZA_H * 0.85
const ZOOM_MIN = 0.45
const ZOOM_MAX = 2.6

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const toPlaza = (nx: number, ny: number) => ({ x: FX + nx * FW, y: FY + ny * FH })
const toNorm = (px: number, py: number) => ({ x: clamp((px - FX) / FW, 0, 1), y: clamp((py - FY) / FH, 0, 1) })
// 부감 깊이감 — 위(먼 곳)일수록 모이 작게.
const depthScale = (ny: number) => 0.7 + ny * 0.52

interface Props {
  placed: PlacedItem[]
  equipped: Partial<Record<EquipSlot, string>>
  crowd: PlazaMoi[]
  /** 테마 베이스 데코(스왑 레이어). */
  decor: DecorItem[]
  onMoiClick: (id: string) => void
  onMovePlaced: (itemId: string, x: number, y: number) => void
}

export function MoiPlazaCanvas({ placed, equipped, crowd, decor, onMoiClick, onMovePlaced }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const onMoiClickRef = useRef(onMoiClick)
  const onMoveRef = useRef(onMovePlaced)
  const placedRef = useRef(placed)
  const equippedRef = useRef(equipped)
  const crowdRef = useRef(crowd)
  const decorRef = useRef(decor)
  const syncRef = useRef<() => void>(() => {})
  // 최신 props를 ref에 동기화 — 렌더 중 ref 변경 금지(react-hooks/refs)라 효과에서.
  useEffect(() => {
    onMoiClickRef.current = onMoiClick
    onMoveRef.current = onMovePlaced
    placedRef.current = placed
    equippedRef.current = equipped
    crowdRef.current = crowd
    decorRef.current = decor
  })

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

      const bg = new Graphics()
      a.stage.addChild(bg)
      const world = new Container()
      a.stage.addChild(world)
      const floor = new Graphics() // 광장 바닥(부감 평면)
      world.addChild(floor)
      const floorDecor = new Container() // 버진로드 등 바닥 마킹(군중 아래)
      world.addChild(floorDecor)
      const dynamic = new Container() // 데코·군중·배치 데코 (깊이 정렬)
      dynamic.sortableChildren = true
      world.addChild(dynamic)
      drawPlaza(floor)

      const fitWorld = () => {
        const { width: w, height: h } = a.screen
        drawBg(bg, w, h)
        const scale = Math.min(w / PLAZA_W, h / PLAZA_H)
        world.scale.set(scale)
        world.position.set((w - PLAZA_W * scale) / 2, (h - PLAZA_H * scale) / 2)
        a.stage.hitArea = new Rectangle(0, 0, w, h)
      }
      fitWorld()
      const ro = new ResizeObserver(() => {
        a.renderer.resize(el.clientWidth, el.clientHeight)
        fitWorld()
      })
      ro.observe(el)
      cleanupExtra = () => ro.disconnect()

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

      // 포인터: 빈 곳 1개=팬 / 2개=핀치줌 / 데코=드래그 / 모이=클릭
      const pointers = new Map<number, { x: number; y: number }>()
      let panning = false
      let lastPan = { x: 0, y: 0 }
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
        } else if (e.target === a.stage || e.target === bg || e.target === floor || e.target === floorDecor) {
          panning = true
          lastPan = { x: e.global.x, y: e.global.y }
        }
      })
      a.stage.on('pointermove', (e: FederatedPointerEvent) => {
        if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.global.x, y: e.global.y })
        if (dragId && dragNode) {
          const local = world.toLocal(e.global)
          const n = toNorm(local.x, local.y)
          const r = toPlaza(n.x, n.y)
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
          world.position.x += e.global.x - lastPan.x
          world.position.y += e.global.y - lastPan.y
          lastPan = { x: e.global.x, y: e.global.y }
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

      const sync = () => {
        floorDecor.removeChildren().forEach((c) => c.destroy({ children: true }))
        dynamic.removeChildren().forEach((c) => c.destroy({ children: true }))

        // 테마 베이스 데코 — 버진로드는 바닥 마킹(군중 아래), 나머지는 깊이 정렬.
        for (const d of decorRef.current) {
          const r = toPlaza(d.x, d.y)
          const node = buildDecorNode(d)
          node.position.set(r.x, r.y)
          if (d.shape === 'aisle') {
            floorDecor.addChild(node)
          } else {
            node.zIndex = r.y
            dynamic.addChild(node)
          }
        }
        // 샵에서 산 추가 데코 — 드래그 가능.
        for (const p of placedRef.current) {
          const item = ITEM_BY_ID[p.itemId]
          if (!item) continue
          const r = toPlaza(p.x, p.y)
          const node = buildShopDecorNode(item.emoji, item.name, item.color, { sm: 64, md: 92, lg: 132 }[item.size ?? 'md'])
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
        // 모이 군중 — 클릭→프로필. 깊이 스케일.
        const eq = equippedRef.current
        for (const m of crowdRef.current) {
          const r = toPlaza(m.x, m.y)
          const bodyColor = m.me && eq.body ? ITEM_BY_ID[eq.body]?.color ?? m.color : m.color
          const headItem = m.me && eq.head ? ITEM_BY_ID[eq.head] : undefined
          const node = buildMoiNode(m, bodyColor, headItem?.color, depthScale(m.y))
          node.position.set(r.x, r.y)
          node.zIndex = r.y + 0.5
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

  useEffect(() => {
    syncRef.current()
  }, [placed, equipped, crowd, decor])

  return <div ref={hostRef} className="absolute inset-0 touch-none" />
}

// ─ placeholder 도형 빌더 (손그림 PNG 나오면 도형→Sprite 교체 지점) ─

function buildMoiNode(m: PlazaMoi, bodyColor: number, headAccent: number | undefined, scale: number): Container {
  const c = new Container()
  c.scale.set(scale)
  const shadow = new Graphics()
  shadow.ellipse(0, 4, 22, 8).fill({ color: 0x000000, alpha: 0.22 })
  c.addChild(shadow)
  if (m.me) {
    const ring = new Graphics()
    ring.ellipse(0, 3, 28, 11).stroke({ color: 0xf8c57a, width: 3, alpha: 0.95 })
    c.addChild(ring)
  }
  const body = new Graphics()
  body.roundRect(-18, -52, 36, 52, 16).fill(bodyColor).stroke({ color: 0x1a2b3f, alpha: 0.5, width: 2 }) // 손그림=검은 외곽선
  c.addChild(body)
  const head = new Graphics()
  head.circle(0, -64, 19).fill(0xfdf0e2).stroke({ color: 0x1a2b3f, alpha: 0.5, width: 2 })
  c.addChild(head)
  if (headAccent != null) {
    const acc = new Graphics()
    acc.roundRect(-17, -80, 34, 9, 5).fill(headAccent)
    c.addChild(acc)
  }
  if (m.me) {
    const label = new Text({ text: '나', style: { fontSize: 16, fill: 0xffffff, fontWeight: '800' } })
    label.anchor.set(0.5)
    label.position.set(0, 16)
    c.addChild(label)
  }
  return c
}

function buildShopDecorNode(emoji: string, name: string, color: number, w: number): Container {
  const c = new Container()
  const h = w * 1.05
  const shadow = new Graphics()
  shadow.ellipse(0, 6, w * 0.42, w * 0.14).fill({ color: 0x000000, alpha: 0.22 })
  c.addChild(shadow)
  const body = new Graphics()
  body.roundRect(-w / 2, -h, w, h, w * 0.18).fill(color).stroke({ color: 0x1a2b3f, alpha: 0.45, width: 2 })
  c.addChild(body)
  const ico = new Text({ text: emoji, style: { fontSize: w * 0.46, align: 'center' } })
  ico.anchor.set(0.5)
  ico.position.set(0, -h * 0.52)
  c.addChild(ico)
  const label = new Text({ text: name, style: { fontSize: 16, fill: 0xffffff, fontWeight: '700' } })
  label.anchor.set(0.5)
  label.position.set(0, 14)
  c.addChild(label)
  return c
}

function buildDecorNode(d: DecorItem): Container {
  const c = new Container()
  if (d.shape === 'aisle') {
    // 버진로드 — 아치(위)에서 앞쪽으로 내려오는 세로 띠.
    const len = FH * 0.7
    const g = new Graphics()
    g.roundRect(-d.w / 2, -len * 0.5, d.w, len, 18).fill({ color: d.color, alpha: 0.85 }).stroke({ color: 0xe7c9d6, width: 3, alpha: 0.6 })
    c.addChild(g)
    return c
  }
  if (d.shape === 'arch') {
    // 꽃아치 — 양 기둥 + 상단 바.
    const g = new Graphics()
    const w = d.w
    g.roundRect(-w / 2, -w * 0.62, w * 0.16, w * 0.62, 8).fill(d.color).stroke({ color: 0x1a2b3f, alpha: 0.4, width: 2 })
    g.roundRect(w / 2 - w * 0.16, -w * 0.62, w * 0.16, w * 0.62, 8).fill(d.color).stroke({ color: 0x1a2b3f, alpha: 0.4, width: 2 })
    g.roundRect(-w / 2, -w * 0.72, w, w * 0.18, 14).fill(d.color).stroke({ color: 0x1a2b3f, alpha: 0.4, width: 2 })
    c.addChild(g)
    const ico = new Text({ text: d.emoji, style: { fontSize: w * 0.22 } })
    ico.anchor.set(0.5)
    ico.position.set(0, -w * 0.63)
    c.addChild(ico)
    return c
  }
  if (d.shape === 'round') {
    const g = new Graphics()
    g.ellipse(0, 2, d.w * 0.42, d.w * 0.16).fill({ color: 0x000000, alpha: 0.2 })
    g.circle(0, -d.w * 0.32, d.w * 0.42).fill(d.color).stroke({ color: 0x1a2b3f, alpha: 0.45, width: 2 })
    c.addChild(g)
    const ico = new Text({ text: d.emoji, style: { fontSize: d.w * 0.4 } })
    ico.anchor.set(0.5)
    ico.position.set(0, -d.w * 0.32)
    c.addChild(ico)
    return c
  }
  // box
  const g = new Graphics()
  g.roundRect(-d.w / 2, -d.w, d.w, d.w, d.w * 0.18).fill(d.color).stroke({ color: 0x1a2b3f, alpha: 0.45, width: 2 })
  c.addChild(g)
  const ico = new Text({ text: d.emoji, style: { fontSize: d.w * 0.5 } })
  ico.anchor.set(0.5)
  ico.position.set(0, -d.w * 0.5)
  c.addChild(ico)
  return c
}

// ─ 정적 배경 + 광장 바닥(placeholder, 손그림 파스텔 톤) ─

function drawBg(g: Graphics, w: number, h: number) {
  g.clear()
  g.rect(0, 0, w, h).fill(0x0a1626)
  g.rect(0, 0, w, h * 0.46).fill({ color: 0x163a5f, alpha: 0.42 })
  g.ellipse(w / 2, h * 0.4, w * 0.66, h * 0.44).fill({ color: 0x2b6aa0, alpha: 0.16 })
}

function drawPlaza(g: Graphics) {
  g.clear()
  // 45° 부감 광장 바닥 — 위가 좁고 아래가 넓은 사다리꼴(원근).
  const topInset = FW * 0.16
  g.poly([FX + topInset, FY, FX + FW - topInset, FY, FX + FW + 60, FY + FH + 80, FX - 60, FY + FH + 80]).fill(0xf3ede6)
  g.poly([FX + topInset, FY, FX + FW - topInset, FY, FX + FW + 60, FY + FH + 80, FX - 60, FY + FH + 80]).stroke({ color: 0x1e3a5f, alpha: 0.08, width: 3 })
  // 광장 바닥 가이드(부감 그리드)
  for (let i = 1; i < 6; i++) {
    const t = i / 6
    const y = FY + FH * t
    const lx = FX + topInset * (1 - t) - 60 * t
    const rx = FX + FW - topInset * (1 - t) + 60 * t
    g.moveTo(lx, y).lineTo(rx, y).stroke({ color: 0x1e3a5f, alpha: 0.05, width: 2 })
  }
}
