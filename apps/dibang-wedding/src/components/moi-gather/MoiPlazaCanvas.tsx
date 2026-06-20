// 모이가모인곳(④) 광장(plaza) 캔버스 — raw PixiJS v8 명령형 마운트(@pixi/react 미사용).
// ★개념: 45° 부감 넓은 광장 + 다수 모이 군중(라운지 시각화). 기본 = 빈 흰 바닥(스킨 없음).
// 손그림 PNG 합성: 모이 = body(발=바닥)+head(neck278↔256)+accessory(머리). casual=틴트.
// '살아있고 고급': 좌우 flip · idle bob/sway(개체별 위상, 단일 ticker 시간기반) · 발밑 그림자
//   · 바닥 따뜻한 ambient glow + 화면 비네팅 + 가벼운 반짝임 파티클. 깊이=y기반 z+스케일.
// ★ 팬은 바닥 안으로 클램프 = 경계 안 보임. 모이 클릭→ProfileSheet · 아이템 드래그→onMovePlaced.
import { useEffect, useRef } from 'react'
import { Application, Container, Graphics, Sprite, Assets, Text, Texture, Rectangle, type FederatedPointerEvent } from 'pixi.js'
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
const MOI_SCALE = 0.25
const ITEM_SCALE = 0.5
const PARTICLE_N = 28

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const toPlaza = (nx: number, ny: number) => ({ x: MX + nx * MW, y: MY + ny * MH })
const toNorm = (px: number, py: number) => ({ x: clamp((px - MX) / MW, 0, 1), y: clamp((py - MY) / MH, 0, 1) })
const depthScale = (ny: number) => 0.7 + ny * 0.52

// 캔버스 radial 그라데이션 텍스처 (glow·비네팅용).
function radialTex(size: number, inner: string, outer: string): Texture {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return Texture.from(c)
}

interface AnimMoi {
  node: Container
  bob: Container
  bx: number
  by: number
  bobAmp: number
  swayAmp: number
  phase: number
  speed: number
}
interface AnimParticle {
  g: Graphics
  baseAlpha: number
  phase: number
  speed: number
  drift: number
}

interface Props {
  placed: PlacedItem[]
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
      if (disposed) return a.destroy(true, { children: true })
      await Promise.allSettled(ALL_ASSET_URLS.map((u) => Assets.load(u)))
      if (disposed) return a.destroy(true, { children: true })
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
      drawPlaza(floor)
      // 바닥 따뜻한 ambient glow (광장 중앙).
      const glow = new Sprite(radialTex(512, 'rgba(255,238,205,0.55)', 'rgba(255,238,205,0)'))
      glow.anchor.set(0.5)
      glow.position.set(PLAZA_W / 2, PLAZA_H * 0.42)
      glow.width = PLAZA_W * 1.25
      glow.height = PLAZA_H * 1.05
      glow.eventMode = 'none'
      world.addChild(glow)
      const dynamic = new Container()
      dynamic.sortableChildren = true
      world.addChild(dynamic)
      const particles = new Container()
      particles.eventMode = 'none' // 모이 위에 떠도 클릭 막지 않게
      world.addChild(particles)
      // 화면 비네팅 (정적, 모서리 어둡게).
      const vignette = new Sprite(radialTex(512, 'rgba(28,26,38,0)', 'rgba(24,22,34,0.42)'))
      vignette.eventMode = 'none'
      a.stage.addChild(vignette)

      // 반짝임 파티클 (가벼움).
      const pData: AnimParticle[] = []
      for (let i = 0; i < PARTICLE_N; i++) {
        const g = new Graphics()
        g.circle(0, 0, 3 + (i % 3) * 1.6).fill({ color: 0xe9c178, alpha: 1 })
        g.position.set((((i * 137) % 100) / 100) * PLAZA_W, (((i * 223) % 100) / 100) * PLAZA_H)
        particles.addChild(g)
        pData.push({ g, baseAlpha: 0.16 + (i % 4) * 0.05, phase: i * 1.3, speed: 0.5 + (i % 5) * 0.12, drift: 7 + (i % 4) * 4 })
      }

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
        vignette.width = w
        vignette.height = h
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
        } else if (e.target === a.stage || e.target === floor || e.target === glow || e.target === vignette) {
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

      // 모이 합성 — shadow(고정) + bob(캐릭터, 좌우 flip·idle 흔들림).
      const makeMoi = (m: PlazaMoi, headId: string, bodyId: string, accId: string | undefined, color: number, flipSign: number): { node: Container; bob: Container } => {
        const node = new Container()
        const shadow = new Graphics()
        shadow.ellipse(0, 0, 84, 26).fill({ color: 0x2a1f18, alpha: 0.14 })
        node.addChild(shadow)
        if (m.me) {
          const ring = new Graphics()
          ring.ellipse(0, -4, 98, 30).stroke({ color: 0xe0922a, width: 6, alpha: 0.95 })
          node.addChild(ring)
        }
        const bob = new Container()
        bob.scale.x = flipSign
        node.addChild(bob)
        const bodyTex = texOf(bodyId)
        let headTopY = -690 - HEAD_NECK_Y
        if (bodyTex) {
          const b = new Sprite(bodyTex)
          b.anchor.set(0.5, 1)
          if (bodyId === RECOLOR_BODY) b.tint = color
          bob.addChild(b)
          headTopY = -(bodyTex.height - BODY_NECK_Y) - HEAD_NECK_Y
        }
        const headTex = texOf(headId)
        if (headTex) {
          const h = new Sprite(headTex)
          h.anchor.set(0.5, 0)
          h.position.set(0, headTopY)
          bob.addChild(h)
          const accTex = texOf(accId)
          if (accTex) {
            const ac = new Sprite(accTex)
            ac.anchor.set(0.5, 0.5)
            ac.position.set(0, headTopY + headTex.height / 2)
            bob.addChild(ac)
          }
        }
        if (m.me) {
          const label = new Text({ text: '나', style: { fontSize: 64, fill: 0x2a2320, fontWeight: '800' } })
          label.anchor.set(0.5)
          label.position.set(0, 70)
          node.addChild(label)
        }
        return { node, bob }
      }

      const makeItem = (itemId: string): Container => {
        const c = new Container()
        const tex = texOf(itemId)
        if (!tex) return c
        const shadow = new Graphics()
        shadow.ellipse(0, 0, tex.width * ITEM_SCALE * 0.36, tex.width * ITEM_SCALE * 0.12).fill({ color: 0x2a1f18, alpha: 0.14 })
        c.addChild(shadow)
        const s = new Sprite(tex)
        s.anchor.set(0.5, 1)
        s.scale.set(ITEM_SCALE)
        c.addChild(s)
        return c
      }

      let animMois: AnimMoi[] = []
      const sync = () => {
        dynamic.removeChildren().forEach((c) => c.destroy({ children: true }))
        animMois = []
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
        const eq = equippedRef.current
        crowdRef.current.forEach((m, i) => {
          const headId = m.me ? eq.head ?? m.head : m.head
          const bodyId = m.me ? eq.body ?? m.body : m.body
          const accId = m.me ? eq.acc : undefined
          const r = toPlaza(m.x, m.y)
          const flipSign = m.x < 0.5 ? 1 : -1 // 광장 안쪽을 바라보게
          const { node, bob } = makeMoi(m, headId, bodyId, accId, m.color, flipSign)
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
          animMois.push({ node, bob, bx: r.x, by: r.y, bobAmp: 26 + (i % 3) * 9, swayAmp: 9 + (i % 4) * 3, phase: (i * 1.7) % 6.283, speed: 1.0 + (i % 5) * 0.16 })
        })
      }
      syncRef.current = sync
      sync()

      // 단일 ticker — 시간기반 idle 흔들림 + 파티클 + 컬링(150~300 대비).
      let elapsed = 0
      a.ticker.add((t) => {
        elapsed += t.deltaMS / 1000
        const { width: w, height: h } = a.screen
        const x0 = -world.position.x / world.scale.x
        const x1 = (w - world.position.x) / world.scale.x
        const y0 = -world.position.y / world.scale.y
        const y1 = (h - world.position.y) / world.scale.y
        for (const m of animMois) {
          const vis = m.bx > x0 - 240 && m.bx < x1 + 240 && m.by > y0 - 360 && m.by < y1 + 120
          m.node.visible = vis
          if (!vis) continue
          m.bob.position.y = Math.sin(elapsed * m.speed + m.phase) * m.bobAmp
          m.bob.position.x = Math.sin(elapsed * m.speed * 0.6 + m.phase) * m.swayAmp
        }
        for (const p of pData) {
          p.g.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(elapsed * p.speed + p.phase))
          p.g.y -= p.drift * (t.deltaMS / 1000)
          if (p.g.y < -20) p.g.y = PLAZA_H + 20
        }
      })
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
    g.moveTo(x, 0).lineTo(x, PLAZA_H).stroke({ color: 0x1e3a5f, alpha: 0.03, width: 2 })
  }
  for (let j = 1; j < 12; j++) {
    const y = (PLAZA_H * j) / 12
    g.moveTo(0, y).lineTo(PLAZA_W, y).stroke({ color: 0x1e3a5f, alpha: 0.03, width: 2 })
  }
}
