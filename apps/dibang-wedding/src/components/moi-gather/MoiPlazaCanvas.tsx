// 모이가모인곳(④) 광장(plaza) 캔버스 — raw PixiJS v8 명령형 마운트(@pixi/react 미사용).
// ★개념: 45° 부감 넓은 광장 + 다수 모이 군중(라운지 시각화). 기본 = 빈 흰 바닥(스킨 없음).
// 손그림 PNG 합성: 모이 = body(발=바닥) + head(neck278↔body neck256, 22px 위) + accessory(머리). casual=틴트.
//   아이템 = 인테리어 PNG(바닥 배치·드래그). 텍스처는 Assets.load 프리로드.
// ★ 팬은 바닥 안으로 클램프 = 경계 안 보임. 모이 클릭→ProfileSheet · 데코 드래그→onMovePlaced.
import { useEffect, useRef } from 'react'
import { Application, Container, Graphics, Sprite, Assets, Text, Rectangle, type Texture, type FederatedPointerEvent } from 'pixi.js'
import type { PlacedItem } from '../../machines/moiPlaza.machine'
import { ITEM_BY_ID, ALL_ASSET_URLS, RECOLOR_BODY, HEAD_NECK_Y, BODY_NECK_Y, type PlazaMoi, type EquipSlot } from './data'

const PLAZA_W = 1400
const PLAZA_H = 1760
const MX = PLAZA_W * 0.14
const MW = PLAZA_W * 0.72
const MY = PLAZA_H * 0.12
const MH = PLAZA_H * 0.76
const FLOOR = 0xf4f1ea
const ZOOM_MAX_FACTOR = 3.4
const MOI_SCALE = 0.25 // 합성 native(~712px) → 약 178px
const ITEM_SCALE = 0.5

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const toPlaza = (nx: number, ny: number) => ({ x: MX + nx * MW, y: MY + ny * MH })
const toNorm = (px: number, py: number) => ({ x: clamp((px - MX) / MW, 0, 1), y: clamp((py - MY) / MH, 0, 1) })
const depthScale = (ny: number) => 0.7 + ny * 0.52

interface Props {
  placed: PlacedItem[]
  /** 내 모이 장착(head/body/acc). */
  equipped: Partial<Record<EquipSlot, string>>
  crowd: PlazaMoi[]
  onMoiClick: (id: string) => void
  onMovePlaced: (itemId: string, x: number, y: number) => void
}

export function MoiPlazaCanvas({ placed, equipped, crowd, onMoiClick, onMovePlaced }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const onMoiClickRef = useRef(onMoiClick)
  const onMoveRef = useRef(onMovePlaced)
  const placedRef = useRef(placed)
  const equippedRef = useRef(equipped)
  const crowdRef = useRef(crowd)
  const syncRef = useRef<() => void>(() => {})
  useEffect(() => {
    onMoiClickRef.current = onMoiClick
    onMoveRef.current = onMovePlaced
    placedRef.current = placed
    equippedRef.current = equipped
    crowdRef.current = crowd
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
      await a.init({ background: FLOOR, antialias: true, width: el.clientWidth || 360, height: el.clientHeight || 640, resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true })
      if (disposed) {
        a.destroy(true, { children: true })
        return
      }
      // 손그림 텍스처 프리로드 (실패해도 도형 없이 통과).
      await Promise.allSettled(ALL_ASSET_URLS.map((u) => Assets.load(u)))
      if (disposed) {
        a.destroy(true, { children: true })
        return
      }
      app = a
      el.appendChild(a.canvas)
      const texOf = (id?: string): Texture | undefined => {
        if (!id) return undefined
        const it = ITEM_BY_ID[id]
        return it ? (Assets.get(it.url) as Texture | undefined) : undefined
      }

      const world = new Container()
      a.stage.addChild(world)
      const floor = new Graphics()
      world.addChild(floor)
      const dynamic = new Container()
      dynamic.sortableChildren = true
      world.addChild(dynamic)
      drawPlaza(floor)

      let coverScale = 1
      const clampWorld = () => {
        const { width: w, height: h } = a.screen
        const sw = PLAZA_W * world.scale.x
        const sh = PLAZA_H * world.scale.y
        world.position.x = Math.min(0, Math.max(w - sw, world.position.x))
        world.position.y = Math.min(0, Math.max(h - sh, world.position.y))
      }
      const fitWorld = () => {
        const { width: w, height: h } = a.screen
        coverScale = Math.max(w / PLAZA_W, h / PLAZA_H)
        world.scale.set(coverScale)
        world.position.set((w - PLAZA_W * coverScale) / 2, (h - PLAZA_H * coverScale) / 2)
        clampWorld()
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
        const next = clamp(world.scale.x * factor, coverScale, coverScale * ZOOM_MAX_FACTOR)
        const f = next / world.scale.x
        world.position.x = sx - (sx - world.position.x) * f
        world.position.y = sy - (sy - world.position.y) * f
        world.scale.set(next)
        clampWorld()
      }
      onWheel = (e: WheelEvent) => {
        e.preventDefault()
        zoomAt(e.offsetX, e.offsetY, e.deltaY < 0 ? 1.1 : 1 / 1.1)
      }
      wheelCanvas = a.canvas
      a.canvas.addEventListener('wheel', onWheel, { passive: false })

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
        } else if (e.target === a.stage || e.target === floor) {
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
          clampWorld()
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

      // 모이 합성 = body(발=원점) + head(neck 정렬) + accessory(머리). casual=틴트.
      const makeMoi = (m: PlazaMoi, headId: string, bodyId: string, accId: string | undefined, color: number): Container => {
        const c = new Container()
        const shadow = new Graphics()
        shadow.ellipse(0, 0, 78, 24).fill({ color: 0x000000, alpha: 0.12 })
        c.addChild(shadow)
        if (m.me) {
          const ring = new Graphics()
          ring.ellipse(0, -6, 96, 30).stroke({ color: 0xe0922a, width: 6, alpha: 0.95 })
          c.addChild(ring)
        }
        const bodyTex = texOf(bodyId)
        let headTopY = -690 - HEAD_NECK_Y // 텍스처 없을 때 폴백 기준
        if (bodyTex) {
          const b = new Sprite(bodyTex)
          b.anchor.set(0.5, 1)
          if (bodyId === RECOLOR_BODY) b.tint = color
          c.addChild(b)
          headTopY = -(bodyTex.height - BODY_NECK_Y) - HEAD_NECK_Y
        }
        const headTex = texOf(headId)
        if (headTex) {
          const h = new Sprite(headTex)
          h.anchor.set(0.5, 0)
          h.position.set(0, headTopY)
          c.addChild(h)
          const accTex = texOf(accId)
          if (accTex) {
            const ac = new Sprite(accTex)
            ac.anchor.set(0.5, 0.5)
            ac.position.set(0, headTopY + headTex.height / 2) // 머리 중앙
            c.addChild(ac)
          }
        }
        if (m.me) {
          const label = new Text({ text: '나', style: { fontSize: 64, fill: 0x2a2320, fontWeight: '800' } })
          label.anchor.set(0.5)
          label.position.set(0, 64)
          c.addChild(label)
        }
        return c
      }

      const makeItem = (itemId: string): Container => {
        const c = new Container()
        const tex = texOf(itemId)
        if (!tex) return c
        const shadow = new Graphics()
        shadow.ellipse(0, 0, tex.width * ITEM_SCALE * 0.36, tex.width * ITEM_SCALE * 0.12).fill({ color: 0x000000, alpha: 0.12 })
        c.addChild(shadow)
        const s = new Sprite(tex)
        s.anchor.set(0.5, 1)
        s.scale.set(ITEM_SCALE)
        c.addChild(s)
        return c
      }

      const sync = () => {
        dynamic.removeChildren().forEach((c) => c.destroy({ children: true }))
        // 샵에서 산 인테리어 — 드래그 가능. (기본 데코 없음 = 빈 흰 바닥)
        for (const p of placedRef.current) {
          if (!ITEM_BY_ID[p.itemId]) continue
          const r = toPlaza(p.x, p.y)
          const node = makeItem(p.itemId)
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
        // 모이 군중 — 'me'는 장착(equipped) 반영. 클릭→프로필. 깊이 스케일.
        const eq = equippedRef.current
        for (const m of crowdRef.current) {
          const headId = m.me ? eq.head ?? m.head : m.head
          const bodyId = m.me ? eq.body ?? m.body : m.body
          const accId = m.me ? eq.acc : undefined
          const r = toPlaza(m.x, m.y)
          const node = makeMoi(m, headId, bodyId, accId, m.color)
          node.scale.set(MOI_SCALE * depthScale(m.y))
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
  }, [placed, equipped, crowd])

  return <div ref={hostRef} className="absolute inset-0 touch-none" />
}

// ─ 기본 흰 바닥(풀블리드) + 45° 부감 느낌 옅은 그리드 ─
function drawPlaza(g: Graphics) {
  g.clear()
  g.rect(0, 0, PLAZA_W, PLAZA_H).fill(FLOOR)
  for (let i = 1; i < 10; i++) {
    const x = (PLAZA_W * i) / 10
    g.moveTo(x, 0).lineTo(x, PLAZA_H).stroke({ color: 0x1e3a5f, alpha: 0.035, width: 2 })
  }
  for (let j = 1; j < 12; j++) {
    const y = (PLAZA_H * j) / 12
    g.moveTo(0, y).lineTo(PLAZA_W, y).stroke({ color: 0x1e3a5f, alpha: 0.035, width: 2 })
  }
}
