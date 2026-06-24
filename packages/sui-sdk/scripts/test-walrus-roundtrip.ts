/**
 * Walrus 왕복(store→fetch) e2e 검증 — 실 testnet relay.
 * 바이트/문자열/JSON/PII(이름) 각각을 올리고 다시 받아 동일성을 단언한다.
 *
 * 실행: pnpm --filter @gorae/sui-sdk exec tsx scripts/test-walrus-roundtrip.ts
 */
import {
  walrusStore,
  walrusFetch,
  walrusStoreString,
  walrusFetchString,
  walrusStoreJson,
  walrusFetchJson,
  walrusStorePII,
} from '../src/walrus';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log('  ✓', msg);
}

async function main() {
  console.log('=== Walrus 왕복 e2e (testnet) ===\n');

  // 1) 바이트
  const bytes = new Uint8Array([1, 2, 3, 4, 5, 255, 0, 128]);
  const blobId1 = await walrusStore(bytes);
  console.log('1. bytes blobId:', blobId1);
  const back1 = await walrusFetch(blobId1);
  assert(back1.length === bytes.length && back1.every((b, i) => b === bytes[i]), 'bytes 왕복 동일');

  // 2) 문자열(한글)
  const text = '안녕하세요 디방 — Walrus 테스트 ' + 'x'.repeat(20);
  const blobId2 = await walrusStoreString(text);
  console.log('2. string blobId:', blobId2);
  assert((await walrusFetchString(blobId2)) === text, 'string 왕복 동일');

  // 3) JSON
  const obj = { name: '홍길동', side: 'groom', n: 42 };
  const blobId3 = await walrusStoreJson(obj);
  console.log('3. json blobId:', blobId3);
  const back3 = await walrusFetchJson<typeof obj>(blobId3);
  assert(JSON.stringify(back3) === JSON.stringify(obj), 'json 왕복 동일');

  // 4) PII(이름) — 평문 경로(Seal 미적용 경고 동반). 온체인엔 이 blobId만 남기는 패턴.
  const piiName = new TextEncoder().encode('김민태');
  const blobId4 = await walrusStorePII(piiName);
  console.log('4. PII(name) blobId:', blobId4);
  const back4 = await walrusFetch(blobId4);
  assert(new TextDecoder().decode(back4) === '김민태', 'PII 이름 왕복 동일');

  // 5) (선택) 암호화 훅이 동작하는지 — 단순 XOR 모의 encrypt로 store→fetch→복호 확인.
  const key = 0x5a;
  const xor: (p: Uint8Array) => Promise<Uint8Array> = async (p) => p.map((b) => b ^ key);
  const blobId5 = await walrusStorePII(new TextEncoder().encode('이수진'), { encrypt: xor });
  const cipher = await walrusFetch(blobId5);
  const plain = new TextDecoder().decode(cipher.map((b) => b ^ key));
  assert(plain === '이수진', 'PII encrypt 훅 왕복 복호 동일');

  console.log('\n=== WALRUS ROUNDTRIP OK (5/5) ===');
}

main().catch((e) => {
  console.error('WALRUS ROUNDTRIP FAILED:', e);
  process.exit(1);
});
