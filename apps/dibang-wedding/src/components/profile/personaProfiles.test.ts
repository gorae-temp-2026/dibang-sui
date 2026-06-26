/**
 * 페르소나 프로필 생성기 — 인물별 다른 프로필 + 데모 일관성 규칙.
 *  - 각 페르소나/하객이 서로 다른 Moi Credit·그래프를 가진다("전부 철수" 버그 회귀 방지).
 *  - 같은 인물은 인연·광장 어디서든 동일 프로필(personaId 기준).
 *  - 광장엔 철수가 만난 사람(tier 0)만 등장, 만난 적 없는 새 인연(tier 2)은 제외(대표 지침 260621).
 * 금지(TESTING.md): snapshot, implementation detail.
 */
import { describe, expect, it } from 'vitest'
import { profileForPersona, profileForPersonaId, makeGuestProfile, plazaPartnerIds, chulsooPlazaProfile } from './personaProfiles'
import { POOL } from '../inyeon/data'
import { PLAZA_CROWD, CROWD_BY_ID } from '../moi-gather/data'

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

describe('광장 ego 네트워크(하이라이트 인터랙션)', () => {
  it('철수(me) = 만난 사람(tier0 hero)만 연결', () => {
    const ids = plazaPartnerIds('me')
    expect(ids.length).toBeGreaterThan(0)
    ids.forEach((id) => {
      const m = CROWD_BY_ID[id]
      expect(m).toBeTruthy()
      expect(POOL.find((p) => p.id === m.personaId)?.tier).toBe(0)
    })
  })

  it('연결 상대는 광장 실재 스프라이트만 · 자기·me 제외 · 2~5 · 결정적', () => {
    const a = plazaPartnerIds('c0')
    expect(a).toEqual(plazaPartnerIds('c0')) // 결정적
    expect(a.length).toBeGreaterThanOrEqual(2)
    expect(a.length).toBeLessThanOrEqual(5)
    expect(new Set(a).size).toBe(a.length) // 중복 없음
    a.forEach((id) => {
      expect(CROWD_BY_ID[id]).toBeTruthy()
      expect(id).not.toBe('c0')
      expect(id).not.toBe('me')
    })
  })

  it('광장 선 = 프로필 ① 인연-연결 ∩ 광장 (모순 없음)', () => {
    for (const sprite of ['c0', 'c7', 'persona-201', 'persona-203']) {
      const partners = plazaPartnerIds(sprite)
      const m = CROWD_BY_ID[sprite]!
      const profile = m.personaId != null ? profileForPersonaId(m.personaId) : makeGuestProfile(sprite, m.name, 210)
      const graphIds = new Set(profile.graph.nodes.map((n) => n.id))
      // 광장 선 ⊆ 프로필 그래프 노드
      partners.forEach((pid) => expect(graphIds.has(pid)).toBe(true))
      // 프로필 그래프 중 광장 실재 노드 = 광장 선과 정확히 일치
      const inPlaza = profile.graph.nodes.filter((n) => !n.self && CROWD_BY_ID[n.id]).map((n) => n.id).sort()
      expect(inPlaza).toEqual([...partners].sort())
      // here(이 결혼식에서 만난 사람) 강조 집합 = 광장 선과 동일
      const hereIds = profile.graph.nodes.filter((n) => n.here).map((n) => n.id).sort()
      expect(hereIds).toEqual([...partners].sort())
    }
  })

  it('서로 다른 모이 = 다른 연결 세트', () => {
    expect(plazaPartnerIds('c0')).not.toEqual(plazaPartnerIds('c1'))
  })

  it('철수 = 전체망 유지(많은 노드) + here(이 결혼식에서 만난 사람) = 광장 hero와 일치', () => {
    const partners = plazaPartnerIds('me')
    // here 강조엔 광장 hero + 철수 가족이 섞여 있으므로, 광장 실재 스프라이트(CROWD_BY_ID)만 추려 광장 선과 비교.
    const hereInPlaza = chulsooPlazaProfile.graph.nodes.filter((n) => n.here && CROWD_BY_ID[n.id]).map((n) => n.id).sort()
    expect(hereInPlaza).toEqual([...partners].sort()) // 광장 선 = here ∩ 광장 스프라이트
    expect(chulsooPlazaProfile.graph.nodes.length).toBeGreaterThan(10) // 전체 신뢰 네트워크 유지
    expect(chulsooPlazaProfile.moiCredit.score).toBe(834) // 실데이터 불변
  })
})
