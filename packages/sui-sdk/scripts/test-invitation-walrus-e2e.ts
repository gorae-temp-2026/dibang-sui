/**
 * 청첩장 이름·사진 → Walrus → 온체인 invitation 연결 e2e 검증 (실 testnet).
 *
 * 증명 대상(사용자 요구: "사진·사람 이름 정보는 walrus에 올리고 sui와 제대로 연결"):
 *   1) 신랑·신부 이름(PII) → walrusStorePIIString → blobId → create_invitation(groom_name=blobId, bride_name=blobId)
 *      → 온체인 Invitation.groom_name/bride_name == blobId(평문 이름 아님),
 *        walrusFetchString(blobId)로 원본 이름 복원, 온체인 필드 != 평문 이름.
 *   2) 커버 사진 바이트 → walrusStore → blobId → create_invitation(cover_photo_url=blobId)
 *      → 온체인 Invitation.cover_photo_url == blobId, walrusFetch(blobId)가 원본 바이트와 동일.
 *   3) date/time/venue/greeting 등 공개·비민감 정보는 평문 그대로(설계대로).
 *   4) getInvitationForWedding(wedding_id)이 이 Invitation을 찾아 반환(앱 읽기 경로 검증).
 *
 * 즉 온체인 청첩장엔 이름·사진이 평문으로 남지 않고 Walrus 참조(blobId)만 남는 것을 실제 체인에서 단언한다.
 *
 * 실행: pnpm --filter @gorae/sui-sdk exec tsx scripts/test-invitation-walrus-e2e.ts
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  createJsonRpcClient,
  executeAndAssert,
  configureSui,
  buildCreateWeddingTx,
  buildCreateInvitationTx,
  getInvitationForWedding,
  walrusStore,
  walrusFetch,
  walrusStoreString,
  walrusStorePIIString,
  walrusFetchString,
  ONCHAIN_BLOB_EPOCHS,
} from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

const here = dirname(fileURLToPath(import.meta.url));
const client = createJsonRpcClient('testnet');
configureSui({
  network: 'testnet',
  packageId: TESTNET_CONFIG.packageId,
  emMoneyMatrixId: TESTNET_CONFIG.emMoneyMatrixId,
  csMatrixId: TESTNET_CONFIG.csMatrixId,
  trustRegistryId: TESTNET_CONFIG.trustRegistryId,
});

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
  console.log('  ✓', msg);
}

function loadKey(): Ed25519Keypair {
  const envPath = [
    join(here, '../../..', 'apps/dibang-wedding/.env.local'),
    join(here, '../../..', 'apps/dibang-wedding/.env.localhost'),
    join(here, '../../..', 'apps/dibang-wedding/.env'),
  ].find((p) => existsSync(p));
  if (!envPath) throw new Error('No env file found with VITE_DEV_PRIVATE_KEY');
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  const sk = lines.find((l) => l.startsWith('VITE_DEV_PRIVATE_KEY='))?.split('=')[1]?.trim();
  if (!sk) throw new Error('VITE_DEV_PRIVATE_KEY not found');
  return Ed25519Keypair.fromSecretKey(sk);
}

async function extractCreated(digest: string, suffix: string): Promise<string> {
  const txb = await client.getTransactionBlock({ digest, options: { showObjectChanges: true } });
  const c = txb.objectChanges?.find((o) => o.type === 'created' && o.objectType.endsWith(suffix));
  if (!c || !('objectId' in c)) throw new Error(`${suffix} not found in ${digest}`);
  return c.objectId;
}

async function objectFields(id: string): Promise<Record<string, unknown>> {
  const obj = await client.getObject({ id, options: { showContent: true } });
  const content = obj.data?.content;
  if (!content || content.dataType !== 'moveObject') throw new Error(`no moveObject content for ${id}`);
  return content.fields as Record<string, unknown>;
}

async function main() {
  const signer = loadKey();
  const addr = signer.toSuiAddress();
  console.log('signer:', addr);
  const bal = await client.getBalance({ owner: addr });
  console.log('balance:', bal.totalBalance, 'MIST\n');

  // === 0. 결혼식 앵커 생성 (invitation은 wedding_id 참조) ===
  console.log('=== 0. createWedding ===');
  const wRes = await executeAndAssert(client, { transaction: buildCreateWeddingTx({ owner: addr }), signer });
  const weddingId = await extractCreated(wRes.digest, '::wedding::Wedding');
  console.log('  weddingId:', weddingId, '(digest', wRes.digest + ')');

  // === 1. 이름·사진 → Walrus → blobId ===
  console.log('\n=== 1. 신랑·신부 이름(PII)·커버사진 → Walrus ===');
  const groomName = '김신랑'; // 사람 이름(PII) — 온체인 평문 금지
  const brideName = '이신부';
  const coverBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 11, 22, 33, 44, 200, 0, 7]); // 가짜 JPEG
  const groomNameBlobId = await walrusStorePIIString(groomName, { epochs: ONCHAIN_BLOB_EPOCHS });
  const brideNameBlobId = await walrusStorePIIString(brideName, { epochs: ONCHAIN_BLOB_EPOCHS });
  const coverPhotoBlobId = await walrusStore(coverBytes, { epochs: ONCHAIN_BLOB_EPOCHS });
  console.log('  groom name blobId:', groomNameBlobId);
  console.log('  bride name blobId:', brideNameBlobId);
  console.log('  cover photo blobId:', coverPhotoBlobId);

  // === 2. create_invitation (이름·사진은 blobId, 나머지는 공개 평문) ===
  console.log('\n=== 2. create_invitation ===');
  const slug = 'e2e-inv-' + weddingId.slice(2, 10);
  const date = '2026-10-10';
  const time = '13:00';
  const venueName = '그랜드컨벤션';
  const venueHall = '5층 그랜드홀';
  // 인사말은 이름이 섞일 수 있는 자유 텍스트(PII 가능) → Walrus blobId로(이름·사진과 동일).
  const greetingText = '저희 김신랑·이신부의 새로운 시작에 함께해 주세요. — e2e';
  const greetingBlobId = await walrusStoreString(greetingText, { epochs: ONCHAIN_BLOB_EPOCHS });
  console.log('  greeting blobId:', greetingBlobId);
  const iRes = await executeAndAssert(client, {
    transaction: buildCreateInvitationTx({
      weddingId, slug, groomNameBlobId, brideNameBlobId,
      date, time, venueName, venueHall, coverPhotoBlobId, greeting: greetingBlobId,
    }),
    signer,
  });
  console.log('  create_invitation digest:', iRes.digest);
  const invitationId = await extractCreated(iRes.digest, '::invitation::Invitation');
  console.log('  invitationId:', invitationId);

  // === 3. 온체인 필드 = blobId 참조(평문 아님) + Walrus 왕복 복원 단언 ===
  console.log('\n=== 3. 온체인 Invitation 필드 검증 ===');
  const f = await objectFields(invitationId);
  assert(f.groom_name === groomNameBlobId, '온체인 Invitation.groom_name == Walrus blobId (이름 → Walrus → Sui)');
  assert(f.groom_name !== groomName, '온체인 groom_name != 평문 이름 (PII 평문 미탑재)');
  assert(f.bride_name === brideNameBlobId, '온체인 Invitation.bride_name == Walrus blobId');
  assert(f.bride_name !== brideName, '온체인 bride_name != 평문 이름');
  assert(f.cover_photo_url === coverPhotoBlobId, '온체인 Invitation.cover_photo_url == Walrus blobId (사진 → Walrus → Sui)');
  assert(f.greeting === greetingBlobId, '온체인 Invitation.greeting == Walrus blobId (인사말 자유텍스트 → Walrus)');
  assert(f.greeting !== greetingText, '온체인 greeting != 평문 인사말 (PII 가능 텍스트 평문 미탑재)');
  // 공개·비민감 구조 정보는 평문 그대로
  assert(f.date === date && f.time === time, '날짜·시간 평문 그대로(비민감)');
  assert(f.venue_name === venueName && f.venue_hall === venueHall, '예식장 평문 그대로(비민감)');
  assert(f.slug === slug, 'slug 평문 그대로');

  // Walrus 왕복: 원본 이름·사진 복원 가능
  assert((await walrusFetchString(groomNameBlobId)) === groomName, '신랑 이름 Walrus 왕복 동일(원본 복원)');
  assert((await walrusFetchString(brideNameBlobId)) === brideName, '신부 이름 Walrus 왕복 동일(원본 복원)');
  assert((await walrusFetchString(greetingBlobId)) === greetingText, '인사말 Walrus 왕복 동일(원본 복원)');
  const coverBack = await walrusFetch(coverPhotoBlobId);
  assert(coverBack.length === coverBytes.length && coverBack.every((b, i) => b === coverBytes[i]), '커버 사진 바이트 Walrus 왕복 동일');

  // === 4. getInvitationForWedding 앱 읽기 경로 ===
  console.log('\n=== 4. getInvitationForWedding(wedding_id) ===');
  const onchainInv = await getInvitationForWedding(client, weddingId);
  assert(!!onchainInv && onchainInv.id === invitationId, 'getInvitationForWedding이 이 Invitation을 반환');
  assert(onchainInv!.groomNameBlobId === groomNameBlobId, '조회 결과 groomNameBlobId 일치(앱은 이 blobId로 walrusFetch)');
  assert(onchainInv!.coverPhotoBlobId === coverPhotoBlobId, '조회 결과 coverPhotoBlobId 일치');
  assert(onchainInv!.greetingBlobId === greetingBlobId, '조회 결과 greetingBlobId 일치');

  console.log('\n=== ✅ INVITATION×WALRUS E2E OK (이름·사진은 blobId 참조로 온체인 연결, 평문 없음, 원본 복원 가능) ===');
}

main().catch((e) => {
  console.error('E2E FAILED:', e);
  process.exit(1);
});
