/**
 * zkLogin 유틸 오프라인 단위 테스트.
 * 라이브 Google OAuth / ZK prover 없이 검증 가능한 결정적 부분만 확인한다:
 * ephemeral key/nonce 생성, OAuth URL 구성, 주소 도출 결정성, 세션 직렬화.
 * (fetchSalt/fetchZkProof/buildZkLoginSignature는 실서버·실증명 필요 → E2E에서 다룸.)
 *
 * 실행: pnpm --filter @gorae/sui-sdk exec tsx scripts/test-zklogin.ts
 */
import {
  generateEphemeralKey,
  getGoogleOAuthUrl,
  zkLoginAddress,
  saveSession,
  loadSession,
  clearSession,
  ephemeralKeypairFromSession,
} from '../src/index';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

/** 브라우저 밖에서 쓰는 메모리 Storage. */
function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => Array.from(m.keys())[i] ?? null,
    removeItem: (k) => m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

// 검증 없이 디코드만 되는 샘플 JWT (jwtToAddress는 payload만 디코드).
const sampleJwt = `${b64url({ alg: 'RS256', kid: 'x' })}.${b64url({
  iss: 'https://accounts.google.com',
  aud: 'client-123',
  sub: 'user-abc',
  exp: 9999999999,
})}.sig`;

// 1) ephemeral key + nonce
const ek = generateEphemeralKey(100);
assert(ek.nonce.length > 0, 'nonce 생성됨');
assert(ek.maxEpoch === 102, 'maxEpoch = currentEpoch + 2 (기본 validity)');
assert(ek.randomness.length > 0, 'randomness 생성됨');

// 2) Google OAuth URL
const url = getGoogleOAuthUrl({
  clientId: 'client-123',
  redirectUri: 'http://localhost:5173/callback',
  nonce: ek.nonce,
});
const parsed = new URL(url);
assert(parsed.searchParams.get('response_type') === 'id_token', 'OAuth response_type=id_token');
assert(parsed.searchParams.get('nonce') === ek.nonce, 'OAuth URL에 nonce 포함');
assert(parsed.searchParams.get('client_id') === 'client-123', 'OAuth client_id 포함');

// 3) 주소 도출 결정성
const a1 = zkLoginAddress(sampleJwt, '12345');
const a2 = zkLoginAddress(sampleJwt, '12345');
assert(a1 === a2 && a1.startsWith('0x'), '동일 (JWT, salt) → 동일 주소');
assert(zkLoginAddress(sampleJwt, '99999') !== a1, 'salt 다르면 주소 달라짐');

// 4) 세션 직렬화 + ephemeral key 복원
const mem = memoryStorage();
saveSession(
  {
    ephemeralSecretKey: ek.keypair.getSecretKey(),
    maxEpoch: ek.maxEpoch,
    randomness: ek.randomness,
    jwt: sampleJwt,
    salt: '12345',
    address: a1,
  },
  mem,
);
const loaded = loadSession(mem);
assert(loaded?.address === a1, '세션 저장/복원 일치');
assert(
  ephemeralKeypairFromSession(loaded!).toSuiAddress() === ek.keypair.toSuiAddress(),
  '세션에서 ephemeral keypair 복원',
);
clearSession(mem);
assert(loadSession(mem) === null, '세션 삭제됨');

console.log('\n=== zkLogin 오프라인 단위 테스트 전부 통과 ===');
