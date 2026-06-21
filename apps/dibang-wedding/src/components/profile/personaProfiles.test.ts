/**
 * 페르소나 프로필 생성기 — 인물별 다른 프로필 + 데모 일관성 규칙.
 *  - 각 페르소나/하객이 서로 다른 Moi Credit·그래프를 가진다("전부 철수" 버그 회귀 방지).
 *  - 같은 인물은 인연·광장 어디서든 동일 프로필(personaId 기준).
 *  - 광장엔 철수가 만난 사람(tier 0)만 등장, 만난 적 없는 새 인연(tier 2)은 제외(대표 지침 260621).
 * 금지(TESTING.md): snapshot, implementation detail.
 */
import { describe, expect, it } from 'vitest'
import { profileForPersona, profileForPersonaId, makeGuestProfile } from './personaProfiles'
import { POOL } from '../inyeon/data'
import { PLAZA_CROWD } from '../moi-gather/data'

const TIERS = ['B', 'BB', 'BBB', 'A', 'AA', 'AAA']

describe('페르소나 프로필 생성기', () => {
  it('페르소나마다 서로 다른 프로필(이름·Moi Credit·그래프)', () => {
    const ps = POOL.map(profileForPersona)
    expect(new Set(ps.map((p) => p.subject)).size).toBe(POOL.length) // 이름 모두 다름
    expect(new Set(ps.map((p) => p.moiCredit.score)).size).toBeGreaterThan(1) // 점수 갈림
    ps.forEach((p, i) => expect(p.subject).toBe(POOL[i].name))
  })

  it('생성 프로필 shape 유효(그래프·signal·신뢰티어)', () => {
    const p = profileForPersona(POOL[0])
    expect(p.graph.nodes.length).toBeGreaterThan(4)
    expect(p.graph.nodes[0].self).toBe(true)
    expect(p.graph.links.length).toBeGreaterThan(0)
    expect(p.signal.children?.map((c) => c.name)).toEqual(['EM', 'CS', 'AR', 'MP'])
    expect(TIERS).toContain(p.trustRange.tier)
    expect(TIERS).toContain(p.moiCredit.tier)
  })

  it('결정적·캐시 — 같은 인물은 동일 객체 참조(force-graph 재시뮬 방지)', () => {
    expect(profileForPersona(POOL[0])).toBe(profileForPersona(POOL[0]))
    // 같은 인물은 인연·광장(personaId) 어디서든 동일 프로필.
    expect(profileForPersonaId(POOL[0].id)).toBe(profileForPersona(POOL[0]))
  })

  it('익명 하객 — id별로 다른 프로필', () => {
    const a = makeGuestProfile('c1', '서연', 210)
    const b = makeGuestProfile('c2', '준호', 40)
    expect(a.moiCredit.score === b.moiCredit.score && a.subject === b.subject).toBe(false)
    expect(makeGuestProfile('c1', '서연', 210)).toBe(a) // 캐시 안정
  })

  it('관계 강도 반영 — tier0(만난 사람)이 tier2(새 인연)보다 신용 높음', () => {
    const t0 = POOL.find((m) => m.tier === 0)!
    const t2 = POOL.find((m) => m.tier === 2)!
    expect(profileForPersona(t0).moiCredit.score).toBeGreaterThan(profileForPersona(t2).moiCredit.score)
  })
})

describe('광장 등장 규칙(대표 지침 260621)', () => {
  const heroes = PLAZA_CROWD.filter((m) => m.personaId != null)

  it('만난 사람(tier 0)만 hero로 등장 — tier1·2 페르소나는 광장에 없음', () => {
    expect(heroes.length).toBeGreaterThan(0)
    heroes.forEach((h) => {
      const persona = POOL.find((p) => p.id === h.personaId)!
      expect(persona.tier).toBe(0)
    })
    const heroIds = new Set(heroes.map((h) => h.personaId))
    POOL.filter((p) => p.tier !== 0).forEach((p) => expect(heroIds.has(p.id)).toBe(false))
  })

  it('hero 모이는 실사진 url을 가진다', () => {
    heroes.forEach((h) => expect(h.photoUrl).toMatch(/\.jpg$/))
  })
})
