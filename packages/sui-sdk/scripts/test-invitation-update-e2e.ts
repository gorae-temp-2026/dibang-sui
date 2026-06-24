/**
 * 청첩장 *수정* 온체인 연결 e2e 검증 (실 testnet) — P1-2.
 *
 * 증명 대상(useUpdateWedding dual-write의 온체인 측 계약):
 *   create_invitation 으로 만든 Invitation을 update_invitation 으로 수정할 때
 *   1) 새 이름·커버·인사말은 Walrus blobId 참조로 갱신(온체인 평문 없음, 원본 복원 가능)
 *   2) 갱신 안 한 필드는 호출자가 기존 blobId/값을 다시 실어 보내면 그대로 보존(부분수정 안전 — 훅의 보존 로직 계약)
 *   3) 갱신한 평문(예식장 홀) 반영, getInvitationForWedding이 수정본을 반환
 *
 * 즉 "수정 시에도 이름·사진은 Walrus 참조로 온체인 연결되고, 안 바꾼 필드는 안 지워진다"를 실제 체인에서 단언.
 *
 * 실행: pnpm --filter @gorae/sui-sdk exec tsx scripts/test-invitation-update-e2e.ts
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
  buildUpdateInvitationTx,
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

  // === 0. wedding + invitation 생성(초기값) ===
  console.log('=== 0. createWedding + create_invitation (초기값) ===');
  const wRes = await executeAndAssert(client, { transaction: buildCreateWeddingTx({ owner: addr }), signer });
  const weddingId = await extractCreated(wRes.digest, '::wedding::Wedding');
  console.log('  weddingId:', weddingId);

  const groomName0 = '김신랑';
  const brideName0 = '이신부';
  const cover0 = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  const greeting0 = '초기 인사말 — e2e';
  const groomBlob0 = await walrusStorePIIString(groomName0, { epochs: ONCHAIN_BLOB_EPOCHS });
  const brideBlob0 = await walrusStorePIIString(brideName0, { epochs: ONCHAIN_BLOB_EPOCHS });
  const coverBlob0 = await walrusStore(cover0, { epochs: ONCHAIN_BLOB_EPOCHS });
  const greetBlob0 = await walrusStoreString(greeting0, { epochs: ONCHAIN_BLOB_EPOCHS });
  const slug = 'e2e-upd-' + weddingId.slice(2, 10);
  const iRes = await executeAndAssert(client, {
    transaction: buildCreateInvitationTx({
      weddingId, slug,
      groomNameBlobId: groomBlob0, brideNameBlobId: brideBlob0,
      date: '2026-10-10', time: '13:00', venueName: '그랜드컨벤션', venueHall: '5층 그랜드홀',
      coverPhotoBlobId: coverBlob0, greeting: greetBlob0,
    }),
    signer,
  });
  const invitationId = await extractCreated(iRes.digest, '::invitation::Invitation');
  console.log('  invitationId:', invitationId);
  const f0 = await objectFields(invitationId);
  assert(f0.groom_name === groomBlob0 && f0.bride_name === brideBlob0, '초기 이름 blobId 탑재');
  assert(f0.venue_hall === '5층 그랜드홀', '초기 예식장 홀 평문');

  // === 1. update_invitation — groom·cover·greeting·venueHall 변경, bride·date·time·venueName 보존 ===
  console.log('\n=== 1. update_invitation (부분수정: 보존 필드는 기존 blobId 재전달) ===');
  const groomName1 = '박신랑'; // 변경
  const cover1 = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 9, 8, 7, 6]); // 변경(가짜 PNG)
  const greeting1 = '수정된 인사말 — 새 문구 e2e'; // 변경
  const groomBlob1 = await walrusStorePIIString(groomName1, { epochs: ONCHAIN_BLOB_EPOCHS });
  const coverBlob1 = await walrusStore(cover1, { epochs: ONCHAIN_BLOB_EPOCHS });
  const greetBlob1 = await walrusStoreString(greeting1, { epochs: ONCHAIN_BLOB_EPOCHS });
  const uRes = await executeAndAssert(client, {
    transaction: buildUpdateInvitationTx({
      invitationId,
      groomNameBlobId: groomBlob1,           // 변경
      brideNameBlobId: brideBlob0,           // 보존(기존 blobId 재전달)
      date: '2026-10-10',                    // 보존
      time: '13:00',                         // 보존
      venueName: '그랜드컨벤션',              // 보존
      venueHall: '7층 다이아몬드홀',          // 변경(평문)
      coverPhotoBlobId: coverBlob1,          // 변경
      greeting: greetBlob1,                  // 변경
    }),
    signer,
  });
  console.log('  update digest:', uRes.digest);

  // === 2. 수정 결과 단언 ===
  console.log('\n=== 2. 수정 후 온체인 필드 검증 ===');
  const f1 = await objectFields(invitationId);
  assert(f1.groom_name === groomBlob1, '신랑 이름 → 새 Walrus blobId로 갱신');
  assert(f1.groom_name !== groomName1, '갱신 후에도 온체인엔 평문 이름 없음(blobId만)');
  assert(f1.bride_name === brideBlob0, '신부 이름 → 기존 blobId 보존(부분수정 안전)');
  assert(f1.cover_photo_url === coverBlob1, '커버 사진 → 새 Walrus blobId로 갱신');
  assert(f1.greeting === greetBlob1, '인사말 → 새 Walrus blobId로 갱신');
  assert(f1.venue_hall === '7층 다이아몬드홀', '예식장 홀 평문 갱신');
  assert(f1.venue_name === '그랜드컨벤션', '예식장명 평문 보존');
  assert(f1.date === '2026-10-10' && f1.time === '13:00', '날짜·시간 평문 보존');

  // Walrus 왕복: 갱신된 이름·사진·인사말 원본 복원
  assert((await walrusFetchString(groomBlob1)) === groomName1, '갱신 신랑 이름 Walrus 왕복 동일');
  assert((await walrusFetchString(greetBlob1)) === greeting1, '갱신 인사말 Walrus 왕복 동일');
  const coverBack = await walrusFetch(coverBlob1);
  assert(coverBack.length === cover1.length && coverBack.every((b, i) => b === cover1[i]), '갱신 커버 바이트 Walrus 왕복 동일');

  // === 3. getInvitationForWedding이 수정본 반환 ===
  console.log('\n=== 3. getInvitationForWedding(wedding_id) → 수정본 ===');
  const inv = await getInvitationForWedding(client, weddingId);
  assert(!!inv && inv.id === invitationId, 'getInvitationForWedding이 같은 Invitation 반환');
  assert(inv!.groomNameBlobId === groomBlob1, '조회 결과 groom blobId = 갱신값');
  assert(inv!.brideNameBlobId === brideBlob0, '조회 결과 bride blobId = 보존값');
  assert(inv!.coverPhotoBlobId === coverBlob1, '조회 결과 cover blobId = 갱신값');
  assert(inv!.greetingBlobId === greetBlob1, '조회 결과 greeting blobId = 갱신값');

  console.log('\n=== ✅ INVITATION UPDATE × WALRUS E2E OK (수정 시 이름·사진 blobId 갱신, 미수정 필드 보존, 평문 없음) ===');
}

main().catch((e) => {
  console.error('E2E FAILED:', e);
  process.exit(1);
});
