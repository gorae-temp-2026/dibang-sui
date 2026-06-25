/**
 * 온체인 데이터 기반 ProfileData 생성 — Moi 타입의 실 데이터에서 프로필을 구성한다.
 * 이음 수 = IumAccepted 이벤트, 크레딧 = SignalEmitted 기반 간이 계산.
 * 정밀 크레딧은 credit.ts이지만 여기서는 간이 티어만.
 */
import type { ProfileData } from '../components/profile/types'
import type { Moi } from '../components/inyeon/types'
import { translate, useLangStore } from '../lib/i18n'

const lang = () => useLangStore.getState().lang

const EMPTY_SIGNAL: ProfileData['signal'] = { name: 'root', children: [
  { name: 'EM', value: 0 }, { name: 'CS', value: 0 }, { name: 'AR', value: 0, stub: true }, { name: 'MP', value: 0, stub: true },
] }
const EMPTY_TRACE = {
  L1_raw: { 부조: 0, 이음: 0, 대화: 0, 선물: 0, total: 0 },
  L2_fold: { 부조EM: 0, 증여EM: 0, topTies: [] },
  L3_phi: { 부조: 0, CS: 0, 이행: 0, op: 'fold' },
  L4_integrate: { W: { 부조: 0, cs: 0, 이행: 0 }, formula: '', value: 0 },
}

export function buildProfileFromMoi(moi: Moi | null, options?: { ieumCount?: number; creditScore?: number }): ProfileData {
  const addr = (moi as Moi & { suiAddress?: string })?.suiAddress ?? ''
  const addrNum = addr ? parseInt(addr.slice(2, 10), 16) : 210
  const name = addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : translate(lang(), 'feed.unknownPlain')
  const ieumCount = options?.ieumCount ?? 0
  const score = options?.creditScore ?? 0
  const tier = score >= 700 ? 'AAA' : score >= 500 ? 'AA' : score >= 300 ? 'A' : score >= 100 ? 'B' : 'C'

  return {
    subject: name,
    asOf: new Date().toISOString(),
    moiCredit: {
      value: score,
      score,
      tier,
      rank: 0,
      total: 0,
      onchain: true,
    },
    trace: EMPTY_TRACE,
    graph: {
      nodes: Array.from({ length: ieumCount + 1 }, (_, i) => ({
        id: String(i),
        label: i === 0 ? name : translate(lang(), 'profile.graph.node', { i }),
        hue: (addrNum + i * 60) % 360,
        here: i === 0,
      })),
      links: Array.from({ length: ieumCount }, (_, i) => ({
        source: '0',
        target: String(i + 1),
        type: '이음',
        value: 1,
      })),
    },
    signal: EMPTY_SIGNAL,
    trustRange: {
      tier: score >= 300 ? 'high' : score >= 100 ? 'medium' : 'low',
      label: translate(lang(), score >= 300 ? 'trust.high' : score >= 100 ? 'trust.medium' : 'trust.low'),
      anon: true,
    },
  }
}
