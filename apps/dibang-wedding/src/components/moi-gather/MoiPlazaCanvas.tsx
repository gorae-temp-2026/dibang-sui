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
import { translate, useLangStore } from '../../lib/i18n'

const lang = () => useLangStore.getState().lang

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
  id: string
  node: Container
  bob: Container
  bx: number
  by: number
  /** 현재 노드 scale (ⓘ 버튼 위치 계산용). */
  scale: number
  /** ego 디밍 alpha 보간 현재값. */
  alpha: number
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
  /** 광장 ego — 모이 id → 광장에서 이어진 상대 스프라이트 id 목록(하이라이트·이음 선). */
  partnersOf: (id: string) => string[]
  /** 우리의 온기 단계(1~N) — 공간 링·바닥 글로우가 단계로 확장(단일축 단계식). */
  warmthStep?: number
}

export function MoiPlazaCanvas({ placed, equipped, crowd, onMoiClick, onMovePlaced, partnersOf, warmthStep = 3 }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const onMoiClickRef = useRef(onMoiClick)
  const onMoveRef = useRef(onMovePlaced)
  const partnersOfRef = useRef(partnersOf)
  const warmthStepRef = useRef(warmthStep)
  const placedRef = useRef(placed)
  const equippedRef = useRef(equipped)
  const crowdRef = useRef(crowd)
  const syncRef = useRef<() => void>(() => {})
  useEffect(() => {
    onMoiClickRef.current = onMoiClick
    onMoveRef.current = onMovePlaced
    partnersOfRef.current = partnersOf
    warmthStepRef.current = warmthStep
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
      const wStep = warmthStepRef.current
      drawPlaza(floor, wStep)
      // 바닥 따뜻한 ambient glow — 우리의 온기 단계로 크기·밝기 확장(단일축 단계식).
      const glow = new Sprite(radialTex(512, 'rgba(255,238,205,0.6)', 'rgba(255,238,205,0)'))
      glow.anchor.set(0.5)
      glow.position.set(PLAZA_W / 2, PLAZA_H * 0.42)
      glow.width = PLAZA_W * (0.85 + wStep * 0.13)
      glow.height = PLAZA_H * (0.7 + wStep * 0.11)
      glow.alpha = Math.min(1, 0.5 + wStep * 0.1)
      glow.eventMode = 'none'
      world.addChild(glow)
      // ego 하이라이트 FX(모이 아래) — 이음 선 + 상대 glow. 레이어 alpha로 페이드.
      const fxLayer = new Container()
      fxLayer.eventMode = 'none'
      fxLayer.alpha = 0
      world.addChild(fxLayer)
      const glowC = new Container()
      fxLayer.addChild(glowC)
      const linkG = new Graphics()
      fxLayer.addChild(linkG)
      const glowTex = radialTex(256, 'rgba(242,200,121,0.78)', 'rgba(242,200,121,0)')
      const dynamic = new Container()
      dynamic.sortableChildren = true
      world.addChild(dynamic)
      const particles = new Container()
      particles.eventMode = 'none' // 모이 위에 떠도 클릭 막지 않게
      world.addChild(particles)
      // ⓘ 프로필 버튼(모이 위) — 포커스 모이 얼굴 옆. 탭 → ProfileSheet.
      const iBtn = new Container()
      const iBg = new Graphics()
      iBg.circle(0, 0, 44).fill({ color: 0xffffff }).stroke({ color: 0x1e3a5f, width: 4, alpha: 0.92 })
      iBtn.addChild(iBg)
      const iTxt = new Text({ text: 'i', style: { fontSize: 52, fill: 0x1e3a5f, fontWeight: '900', fontStyle: 'italic' } })
      iTxt.anchor.set(0.5)
      iTxt.position.set(0, 1)
      iBtn.addChild(iTxt)
      iBtn.eventMode = 'static'
      iBtn.cursor = 'pointer'
      iBtn.visible = false
      world.addChild(iBtn)
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
      // 빈 곳 탭(드래그 아님) = 포커스 해제. 모이·ⓘ 탭은 stopPropagation으로 여기 안 옴.
      a.stage.on('pointertap', (e: FederatedPointerEvent) => {
        if (e.target === a.stage || e.target === floor || e.target === glow || e.target === vignette) setFocus(null)
      })

      // 모이 합성 — shadow(고정) + bob(캐릭터, 좌우 flip·idle 흔들림).
      const makeMoi = (m: PlazaMoi, headId: string, bodyId: string, accId: string | undefined, color: number, flipSign: number): { node: Container; bob: Container } => {
        const node = new Container()
        const shadow = new Graphics()
        shadow.ellipse(0, 0, 84, 24).fill({ color: 0x2a1f18, alpha: 0.16 })
        shadow.rotation = -0.12 // 45° 부감 — 발밑에 살짝 기울어진 타원(접지)
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
            // 부위별 앵커 — 머리위/이마/눈/목/가슴/등(어색하지 않게 head 높이 비율로 보정).
            const accAnchor = accId ? ITEM_BY_ID[accId]?.anchor : undefined
            const hh = headTex.height
            const ay =
              accAnchor === 'top' ? headTopY + hh * 0.06
              : accAnchor === 'forehead' ? headTopY + hh * 0.30
              : accAnchor === 'eyes' ? headTopY + hh * 0.46
              : accAnchor === 'neck' ? headTopY + hh * 0.95
              : accAnchor === 'chest' ? headTopY + hh * 1.12
              : accAnchor === 'back' ? headTopY + hh * 0.7
              : headTopY + hh * 0.5
            ac.position.set(0, ay)
            if (accAnchor === 'back') {
              ac.scale.set(1.15)
              bob.addChildAt(ac, 0) // 등 = 몸 뒤로(날개)
            } else {
              bob.addChild(ac)
            }
          }
        }
        if (m.me) {
          const label = new Text({ text: translate(lang(), 'moiGather.meLabel'), style: { fontSize: 64, fill: 0x2a2320, fontWeight: '800' } })
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
      const basePos = new Map<string, { x: number; y: number }>() // id → 발밑 월드좌표(선·glow·ⓘ).
      let focusId: string | null = null
      let partnerSet = new Set<string>()
      let lineFade = 0
      const FOCUS_DIM = 0.4
      const LINE_COLOR = 0xf2c879

      // 포커스 모이 → 상대로 이음 선 + 상대 glow 다시 그림(위치 정적이라 포커스 변경 시 1회).
      const redrawFx = () => {
        linkG.clear()
        glowC.removeChildren().forEach((c) => c.destroy())
        if (!focusId) return
        const from = basePos.get(focusId)
        if (!from) return
        const fg = new Sprite(glowTex)
        fg.anchor.set(0.5)
        fg.width = fg.height = 540
        fg.position.set(from.x, from.y - 40)
        glowC.addChild(fg)
        for (const pid of partnerSet) {
          const to = basePos.get(pid)
          if (!to) continue
          const gs = new Sprite(glowTex)
          gs.anchor.set(0.5)
          gs.width = gs.height = 430
          gs.position.set(to.x, to.y - 40)
          glowC.addChild(gs)
          linkG.moveTo(from.x, from.y - 30).lineTo(to.x, to.y - 30)
        }
        linkG.stroke({ color: LINE_COLOR, width: 9, alpha: 0.92 })
      }
      const positionIBtn = () => {
        if (!focusId) return
        const base = basePos.get(focusId)
        const am = animMois.find((m) => m.id === focusId)
        if (!base) return
        const s = am?.scale ?? MOI_SCALE
        iBtn.position.set(base.x + 230 * s, base.y - 840 * s)
      }
      const setFocus = (id: string | null) => {
        focusId = id
        partnerSet = new Set(id ? partnersOfRef.current(id) : [])
        redrawFx()
        positionIBtn()
        if (id) lineFade = 0 // 새 선택 = 페이드 인
      }
      iBtn.on('pointerdown', (e: FederatedPointerEvent) => e.stopPropagation())
      iBtn.on('pointertap', (e: FederatedPointerEvent) => {
        e.stopPropagation()
        if (focusId) onMoiClickRef.current(focusId)
      })

      const sync = () => {
        dynamic.removeChildren().forEach((c) => c.destroy({ children: true }))
        animMois = []
        basePos.clear()
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
            dragId = p.uid
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
          const sc = MOI_SCALE * depthScale(m.y)
          const flipSign = m.x < 0.5 ? 1 : -1 // 광장 안쪽을 바라보게
          const { node, bob } = makeMoi(m, headId, bodyId, accId, m.color, flipSign)
          node.scale.set(sc)
          node.position.set(r.x, r.y)
          node.zIndex = r.y + 0.5
          node.eventMode = 'static'
          node.cursor = 'pointer'
          node.on('pointerdown', (e: FederatedPointerEvent) => e.stopPropagation())
          // 탭 = ego 포커스(프로필 즉시열기 폐지 → ⓘ 버튼 경유).
          node.on('pointertap', (e: FederatedPointerEvent) => {
            e.stopPropagation()
            setFocus(m.id)
          })
          dynamic.addChild(node)
          basePos.set(m.id, { x: r.x, y: r.y })
          animMois.push({ id: m.id, node, bob, bx: r.x, by: r.y, scale: sc, alpha: 1, bobAmp: 26 + (i % 3) * 9, swayAmp: 9 + (i % 4) * 3, phase: (i * 1.7) % 6.283, speed: 1.0 + (i % 5) * 0.16 })
        })
        // 군중 재빌드 후 포커스 FX·ⓘ 위치 갱신(포커스 유지 시).
        if (focusId && !basePos.has(focusId)) setFocus(null)
        else {
          redrawFx()
          positionIBtn()
        }
      }
      syncRef.current = sync
      sync()

      // 단일 ticker — 시간기반 idle 흔들림 + 파티클 + 컬링(150~300 대비).
      let elapsed = 0
      a.ticker.add((t) => {
        elapsed += t.deltaMS / 1000
        const k = Math.min(1, t.deltaMS / 120) // 페이드 보간 계수.
        // ego 선·glow·ⓘ 페이드.
        lineFade += ((focusId ? 1 : 0) - lineFade) * k
        fxLayer.alpha = lineFade
        iBtn.alpha = lineFade
        iBtn.visible = !!focusId && lineFade > 0.02
        if (!focusId && lineFade < 0.02) {
          linkG.clear()
          glowC.removeChildren().forEach((c) => c.destroy())
        }
        const { width: w, height: h } = a.screen
        const x0 = -world.position.x / world.scale.x
        const x1 = (w - world.position.x) / world.scale.x
        const y0 = -world.position.y / world.scale.y
        const y1 = (h - world.position.y) / world.scale.y
        for (const m of animMois) {
          const keep = !!focusId && (m.id === focusId || partnerSet.has(m.id))
          const vis = keep || (m.bx > x0 - 240 && m.bx < x1 + 240 && m.by > y0 - 360 && m.by < y1 + 120)
          m.node.visible = vis
          if (!vis) continue
          // ego 디밍 — 포커스/상대는 밝게, 나머지 40%로 페이드.
          const target = !focusId ? 1 : keep ? 1 : FOCUS_DIM
          m.alpha += (target - m.alpha) * k
          m.node.alpha = m.alpha
          // 차분한 idle — bob 진폭 ~35%로 축소 + 호흡(세로 스케일 펄스, 발 고정이라 안 뜸).
          // blink/리액션은 정적 손그림 PNG 한계로 은은한 호흡 펄스로 대체.
          m.bob.scale.y = 1 + Math.sin(elapsed * m.speed * 0.9 + m.phase) * 0.02
          m.bob.position.y = Math.sin(elapsed * m.speed + m.phase) * m.bobAmp * 0.35
          m.bob.position.x = Math.sin(elapsed * m.speed * 0.6 + m.phase) * m.swayAmp * 0.5
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
function drawPlaza(g: Graphics, warmthStep = 3) {
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
  // 우리의 온기 단계 링 — 한 단계↑ = 동심원 한 링 확장(공간이 단계로 넓어짐).
  const cx = PLAZA_W / 2
  const cy = PLAZA_H * 0.5
  for (let i = 1; i <= warmthStep; i++) {
    g.circle(cx, cy, PLAZA_W * 0.13 * i).stroke({ color: 0xe0a23a, alpha: 0.05 + i * 0.012, width: 3 })
  }
}
