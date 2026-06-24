/**
 * 사진/본문 → Walrus → 온체인 blobId 연결 e2e 검증 (실 testnet).
 *
 * 증명 대상(사용자 요구: "사진·이름 정보는 walrus에 올리고 sui와 제대로 연결"):
 *   1) 사진 바이트 → walrusStore → blobId → memory::create_memory(photo_url=blobId)
 *      → 온체인 Memory 객체의 photo_url == blobId 이고, walrusFetch(blobId)가 원본 바이트와 동일.
 *   2) 본문·이름 → walrus(String/PIIString) → blobId → guestbook::write_message(message=blobId, guest_name=nameBlobId)
 *      → 온체인 GuestbookMessage.message == 본문 blobId, guest_name == 이름 blobId(둘 다 평문 아님),
 *        walrusFetchString로 원본 본문·이름 복원 가능, guest_name != 평문 이름.
 *   3) 공지 본문 → walrusStoreString → blobId → announcement::create_announcement(message=blobId)
 *      → 온체인 Announcement.message == blobId(평문 아님), walrusFetchString(blobId) == 원본 공지.
 *
 * 즉 온체인엔 PII·원본이 평문으로 남지 않고 Walrus 참조(blobId)만 남는 것을 실제 체인에서 단언한다.
 *
 * 실행: pnpm --filter @gorae/sui-sdk exec tsx scripts/test-onchain-walrus-e2e.ts
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
  buildParticipateTx,
  buildCreateMemoryTx,
  buildWriteMessageTx,
  buildCreateAnnouncementTx,
  walrusStore,
  walrusFetch,
  walrusStoreString,
  walrusFetchString,
  walrusStorePIIString,
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

  // === 0. 결혼식 앵커 + GUEST 참가 (write_message는 Participation 필요) ===
  console.log('=== 0. createWedding + participate(GUEST) ===');
  const wRes = await executeAndAssert(client, { transaction: buildCreateWeddingTx({ owner: addr }), signer });
  const weddingId = await extractCreated(wRes.digest, '::wedding::Wedding');
  const weddingCapId = await extractCreated(wRes.digest, '::wedding::WeddingCap');
  console.log('  weddingId:', weddingId, '(digest', wRes.digest + ')');
  console.log('  weddingCapId:', weddingCapId);
  const pRes = await executeAndAssert(client, { transaction: buildParticipateTx({ eventId: await extractCreated(wRes.digest, '::event::Event'), roleId: 1 }), signer });
  const participationId = await extractCreated(pRes.digest, '::event::Participation');
  console.log('  participationId:', participationId);

  // === 1. 사진 → Walrus → 온체인 memory ===
  console.log('\n=== 1. 사진 → Walrus → memory::create_memory ===');
  const photoBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 250, 0, 99]); // 가짜 JPEG 헤더+바이트
  const photoBlobId = await walrusStore(photoBytes, { epochs: ONCHAIN_BLOB_EPOCHS }); // 온체인 참조 → 내구 보존
  console.log('  photo blobId:', photoBlobId);
  const mRes = await executeAndAssert(client, {
    transaction: buildCreateMemoryTx({ weddingId, text: 'e2e 캡션(비민감)', photoBlobId }),
    signer,
  });
  console.log('  create_memory digest:', mRes.digest);
  const memoryId = await extractCreated(mRes.digest, '::memory::Memory');
  const mf = await objectFields(memoryId);
  assert(mf.photo_url === photoBlobId, `온체인 Memory.photo_url == Walrus blobId (평문 사진 아님)`);
  const photoBack = await walrusFetch(photoBlobId);
  assert(photoBack.length === photoBytes.length && photoBack.every((b, i) => b === photoBytes[i]), '사진 바이트 Walrus 왕복 동일');

  // === 2. 방명록 본문 + 이름 → Walrus → 온체인 write_message ===
  console.log('\n=== 2. 본문·이름 → Walrus → guestbook::write_message ===');
  const messageText = '두 분의 결혼을 진심으로 축하합니다! 🎉 — e2e';
  const guestName = '홍길동'; // 사람 이름(PII) — 온체인 평문 금지, Walrus blobId 참조만 싣는다.
  const msgBlobId = await walrusStoreString(messageText, { epochs: ONCHAIN_BLOB_EPOCHS }); // 온체인 참조 → 내구 보존
  const nameBlobId = await walrusStorePIIString(guestName, { epochs: ONCHAIN_BLOB_EPOCHS }); // 이름 → Walrus → blobId
  console.log('  message blobId:', msgBlobId);
  console.log('  name blobId:', nameBlobId);
  const wmRes = await executeAndAssert(client, {
    transaction: buildWriteMessageTx({ weddingId, participationId, messageBlobId: msgBlobId, recipientSlot: 0, guestName: nameBlobId }),
    signer,
  });
  console.log('  write_message digest:', wmRes.digest);
  const msgId = await extractCreated(wmRes.digest, '::guestbook::GuestbookMessage');
  const gf = await objectFields(msgId);
  assert(gf.message === msgBlobId, '온체인 GuestbookMessage.message == Walrus blobId (본문 평문 아님)');
  assert((await walrusFetchString(msgBlobId)) === messageText, '본문 Walrus 왕복 동일');
  // 이름: 온체인엔 blobId 참조만, 평문 이름은 아님. Walrus에서 원본 이름 복원 가능.
  assert(gf.guest_name === nameBlobId, '온체인 guest_name == Walrus blobId (이름 → Walrus → Sui 연결)');
  assert(gf.guest_name !== guestName, '온체인 guest_name != 평문 이름 (PII 평문 미탑재)');
  assert((await walrusFetchString(nameBlobId)) === guestName, '이름 Walrus 왕복 동일(원본 이름 복원)');

  // === 3. 공지 본문 → Walrus → 온체인 announcement ===
  console.log('\n=== 3. 공지 → Walrus → announcement::create_announcement ===');
  const annText = '본식은 2층 그랜드홀에서 진행됩니다. — e2e 공지';
  const annBlobId = await walrusStoreString(annText, { epochs: ONCHAIN_BLOB_EPOCHS });
  console.log('  announcement blobId:', annBlobId);
  const aRes = await executeAndAssert(client, {
    transaction: buildCreateAnnouncementTx({ capId: weddingCapId, messageBlobId: annBlobId, isPinned: true }),
    signer,
  });
  console.log('  create_announcement digest:', aRes.digest);
  const annId = await extractCreated(aRes.digest, '::announcement::Announcement');
  const af = await objectFields(annId);
  assert(af.message === annBlobId, '온체인 Announcement.message == Walrus blobId (공지 평문 아님)');
  assert(af.message !== annText, '온체인 Announcement.message != 평문 공지 (평문 미탑재)');
  assert((await walrusFetchString(annBlobId)) === annText, '공지 Walrus 왕복 동일');

  console.log('\n=== ✅ ONCHAIN×WALRUS E2E OK (사진·본문·이름·공지 모두 blobId 참조로 연결, 온체인 평문 없음) ===');
}

main().catch((e) => {
  console.error('E2E FAILED:', e);
  process.exit(1);
});
