// 철수 프로필 fixture — `sim-scale.mjs`가 생성한 out/chulsoo-profile.json 사본.
// 재생성: node _research/gathering-taxonomy-trust-balance/sim-scale.mjs → out/chulsoo-profile.json 복사.
import raw from './chulsoo-profile.json'
import type { ProfileData } from './types'

export const chulsooProfile = raw as unknown as ProfileData
