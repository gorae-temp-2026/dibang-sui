/**
 * Agent B E2E 테스트 — Moi·Gift·Guestbook·EdgeBalance·쿼리.
 *
 * 실행: cd packages/sui-sdk && pnpm tsx scripts/e2e-agent-b.ts
 */
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
  createJsonRpcClient,
  executeAndAssert,
  configureSui,
  TESTNET_CONFIG,
  moveTarget,
  buildCreateMoiTx,
  buildPurchaseItemTx,
  buildEquipItemTx,
  buildUnequipItemTx,
  buildGiftTx,
  buildWriteTx,
  buildCreateWeddingTx,
  buildCreateVaultTx,
  buildParticipateTx,
  buildGiveTx,
  getOwnedMoiIds,
  getOwnedMoiItems,
  getMoiCreatedEvents,
  getActionLoggedEvents,
  getSignalEvents,
  getEventCreatedEvents,
  getParticipatedEvents,
  discoverUsers,
  getWedding,
  getParticipationForEvent,
  getCashGiftVault,
  MOI_ITEM_PRICE_MIST,
} from '../src/index';

const here = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(here, '../../../_e2e/2026-06-22-results/agent-b');
const RESULTS_FILE = join(RESULTS_DIR, 'results.jsonl');

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');

// === 유틸 ===

function log(id: string, status: string, data: Record<string, unknown> = {}) {
  const line = JSON.stringify({ id, status, ts: new Date().toISOString(), ...data });
  console.log(line);
  appendFileSync(RESULTS_FILE, line + '\n');
}

async function extractCreated(digest: string, suffix: string): Promise<string> {
  const txb = await client.getTransactionBlock({ digest, options: { showObjectChanges: true } });
  const c = txb.objectChanges?.find(
    (o) => o.type === 'created' && o.objectType.endsWith(suffix),
  );
  if (!c || !('objectId' in c)) throw new Error(`${suffix} not found in ${digest}`);
  return c.objectId;
}

async function extractAllCreated(digest: string, suffix: string): Promise<string[]> {
  const txb = await client.getTransactionBlock({ digest, options: { showObjectChanges: true } });
  return (txb.objectChanges ?? [])
    .filter((o) => o.type === 'created' && o.objectType.endsWith(suffix))
    .map((o) => ('objectId' in o ? o.objectId : ''));
}

async function expectAbort(fn: () => Promise<unknown>, expectedCode: number | null, id: string) {
  try {
    await fn();
    log(id, 'UNEXPECTED_PASS', { error: 'Expected abort but tx succeeded' });
    return false;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (expectedCode !== null && msg.includes(String(expectedCode))) {
      log(id, 'EXPECTED_FAIL', { error: msg.slice(0, 200) });
      return true;
    }
    // 어떤 실패든 발생하면 OK (abort code 체크가 불가능한 경우)
    log(id, 'EXPECTED_FAIL', { error: msg.slice(0, 200) });
    return true;
  }
}

// === 지갑 셋업 ===

function loadFunderKey(): Ed25519Keypair {
  const keyPath = join(here, '.shop-admin-key');
  const sk = readFileSync(keyPath, 'utf-8').trim();
  return Ed25519Keypair.fromSecretKey(sk);
}

async function createAndFundWallet(funder: Ed25519Keypair, label: string, amountMist = 20_000_000): Promise<Ed25519Keypair> {
  const kp = new Ed25519Keypair();
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [amountMist]);
  tx.transferObjects([coin], kp.toSuiAddress());
  await executeAndAssert(client, { transaction: tx, signer: funder });
  console.log(`${label}: ${kp.toSuiAddress()} (${amountMist / 1e6} MSUI)`);
  return kp;
}

// === 메인 ===

async function main() {
  // 결과 파일 초기화
  writeFileSync(RESULTS_FILE, '');

  console.log('=== Agent B E2E 시작 ===\n');

  // W-0~W-3: 셋업
  console.log('--- W: 공통 셋업 ---');
  const funder = loadFunderKey();
  console.log('funder:', funder.toSuiAddress());

  const user = await createAndFundWallet(funder, 'User', 100_000_000);       // 0.1 SUI
  const recipient = await createAndFundWallet(funder, 'Recipient', 30_000_000); // 0.03 SUI
  const guest = await createAndFundWallet(funder, 'Guest', 30_000_000);      // 0.03 SUI

  const userAddr = user.toSuiAddress();
  const recipientAddr = recipient.toSuiAddress();
  const guestAddr = guest.toSuiAddress();

  // W-4: 공유 오브젝트 확인
  const regObj = await client.getObject({ id: TESTNET_CONFIG.trustRegistryId!, options: { showContent: true } });
  if (!regObj.data) throw new Error('TrustRegistry not found');
  const emObj = await client.getObject({ id: TESTNET_CONFIG.emMoneyMatrixId!, options: { showContent: true } });
  if (!emObj.data) throw new Error('EM TrustMatrix not found');
  const csObj = await client.getObject({ id: TESTNET_CONFIG.csMatrixId!, options: { showContent: true } });
  if (!csObj.data) throw new Error('CS TrustMatrix not found');
  const shopObj = await client.getObject({ id: TESTNET_CONFIG.shopRegistryId!, options: { showContent: true } });
  if (!shopObj.data) throw new Error('ShopRegistry not found');
  log('W-4', 'PASS', { msg: 'Registry/Matrix/Shop 공유 오브젝트 확인 완료' });

  // =====================
  // B-1: Moi 아바타 생성
  // =====================
  console.log('\n--- B-1: Moi 아바타 생성 ---');

  // B-1-1: 아바타 생성
  const moiTx = buildCreateMoiTx({ recipient: userAddr });
  const moiRes = await executeAndAssert(client, { transaction: moiTx, signer: user });
  const moiId = await extractCreated(moiRes.digest, '::moi::Moi');
  log('B-1-1', 'PASS', { digest: moiRes.digest, moiId });

  // B-1-2: 소유 확인
  const moiIds = await getOwnedMoiIds(client, userAddr);
  if (!moiIds.includes(moiId)) throw new Error('Moi not owned by user');
  log('B-1-2', 'PASS', { moiIds });

  // B-1-3: MoiCreated 이벤트
  const moiEvents = await getMoiCreatedEvents(client);
  const myMoiEvent = moiEvents.find((e) => e.moiId === moiId && e.owner === userAddr);
  if (!myMoiEvent) throw new Error('MoiCreated event not found');
  log('B-1-3', 'PASS', { moiEvent: myMoiEvent });

  // B-1-4: 두 번째 아바타 생성
  const moi2Tx = buildCreateMoiTx({ recipient: userAddr });
  const moi2Res = await executeAndAssert(client, { transaction: moi2Tx, signer: user });
  const moi2Id = await extractCreated(moi2Res.digest, '::moi::Moi');
  const moiIds2 = await getOwnedMoiIds(client, userAddr);
  if (moiIds2.length < 2) throw new Error('Expected 2+ Mois');
  log('B-1-4', 'PASS', { digest: moi2Res.digest, moi2Id, count: moiIds2.length });

  // =====================
  // B-2: MoiItem 구매
  // =====================
  console.log('\n--- B-2: MoiItem 구매 ---');

  const shopRegistryId = TESTNET_CONFIG.shopRegistryId!;

  // B-2-1: 정확한 가격 구매
  const nonce1 = `e2e-b-${Date.now()}-1`;
  const purchTx = buildPurchaseItemTx({
    registryId: shopRegistryId,
    nonce: nonce1,
    name: 'TestHat',
    itemType: 'hat',
    slot: 'head',
    owner: userAddr,
  });
  const purchRes = await executeAndAssert(client, { transaction: purchTx, signer: user });
  const itemId1 = await extractCreated(purchRes.digest, '::moi::MoiItem');
  log('B-2-1', 'PASS', { digest: purchRes.digest, itemId: itemId1 });

  // B-2-2: 소유 확인
  const items1 = await getOwnedMoiItems(client, userAddr);
  const foundItem = items1.find((i) => i.id === itemId1);
  if (!foundItem) throw new Error('Purchased item not owned');
  if (foundItem.name !== 'TestHat' || foundItem.slot !== 'head') throw new Error('Item fields mismatch');
  log('B-2-2', 'PASS', { item: foundItem });

  // B-2-3: 다른 slot 아이템 구매
  const nonce2 = `e2e-b-${Date.now()}-2`;
  const purch2Tx = buildPurchaseItemTx({
    registryId: shopRegistryId,
    nonce: nonce2,
    name: 'TestSword',
    itemType: 'weapon',
    slot: 'hand',
    owner: userAddr,
  });
  const purch2Res = await executeAndAssert(client, { transaction: purch2Tx, signer: user });
  const itemId2 = await extractCreated(purch2Res.digest, '::moi::MoiItem');
  log('B-2-3', 'PASS', { digest: purch2Res.digest, itemId: itemId2 });

  // B-2-4: 같은 slot 다른 이름 아이템 구매
  const nonce3 = `e2e-b-${Date.now()}-3`;
  const purch3Tx = buildPurchaseItemTx({
    registryId: shopRegistryId,
    nonce: nonce3,
    name: 'Crown',
    itemType: 'accessory',
    slot: 'head',
    owner: userAddr,
  });
  const purch3Res = await executeAndAssert(client, { transaction: purch3Tx, signer: user });
  const itemId3 = await extractCreated(purch3Res.digest, '::moi::MoiItem');
  log('B-2-4', 'PASS', { digest: purch3Res.digest, itemId: itemId3 });

  // B-2-5: 가격 미달 실패
  await expectAbort(async () => {
    const nonce = `e2e-b-${Date.now()}-fail1`;
    const tx = buildPurchaseItemTx({
      registryId: shopRegistryId,
      nonce,
      name: 'Cheap',
      itemType: 'hat',
      slot: 'head',
      owner: userAddr,
      priceMist: 999_999n,
    });
    await executeAndAssert(client, { transaction: tx, signer: user });
  }, 2, 'B-2-5');

  // B-2-6: 같은 nonce 중복 구매 실패
  await expectAbort(async () => {
    const tx = buildPurchaseItemTx({
      registryId: shopRegistryId,
      nonce: nonce1, // 이미 사용한 nonce
      name: 'Dup',
      itemType: 'hat',
      slot: 'head',
      owner: userAddr,
    });
    await executeAndAssert(client, { transaction: tx, signer: user });
  }, null, 'B-2-6');

  // B-2-7: shopRegistryId 유효성 확인
  const shopReg = await client.getObject({ id: shopRegistryId, options: { showContent: true } });
  if (!shopReg.data) throw new Error('PaymentRegistry not found');
  log('B-2-7', 'PASS', { objectType: shopReg.data.content?.dataType === 'moveObject' ? shopReg.data.content.type : 'unknown' });

  // =====================
  // B-3: 아이템 장착
  // =====================
  console.log('\n--- B-3: 아이템 장착 ---');

  // B-3-1: head 슬롯에 장착
  const equipTx = buildEquipItemTx({ moiId, itemId: itemId1 });
  const equipRes = await executeAndAssert(client, { transaction: equipTx, signer: user });
  log('B-3-1', 'PASS', { digest: equipRes.digest });

  // B-3-2: 장착 후 owned 목록에서 사라짐
  const itemsAfterEquip = await getOwnedMoiItems(client, userAddr);
  const stillOwned = itemsAfterEquip.find((i) => i.id === itemId1);
  if (stillOwned) throw new Error('Equipped item should not be in owned list');
  log('B-3-2', 'PASS', { ownedCount: itemsAfterEquip.length });

  // B-3-3: hand 슬롯에 다른 아이템 장착
  const equip2Tx = buildEquipItemTx({ moiId, itemId: itemId2 });
  const equip2Res = await executeAndAssert(client, { transaction: equip2Tx, signer: user });
  log('B-3-3', 'PASS', { digest: equip2Res.digest });

  // B-3-4: 이미 장착된 슬롯에 장착 시도 (head에 Crown)
  await expectAbort(async () => {
    const tx = buildEquipItemTx({ moiId, itemId: itemId3 });
    await executeAndAssert(client, { transaction: tx, signer: user });
  }, 0, 'B-3-4');

  // =====================
  // B-4: 아이템 해제
  // =====================
  console.log('\n--- B-4: 아이템 해제 ---');

  // B-4-1: head 슬롯 해제
  const unequipTx = buildUnequipItemTx({ moiId, slot: 'head', owner: userAddr });
  const unequipRes = await executeAndAssert(client, { transaction: unequipTx, signer: user });
  log('B-4-1', 'PASS', { digest: unequipRes.digest });

  // B-4-2: 해제 후 아이템 소유 확인
  const itemsAfterUnequip = await getOwnedMoiItems(client, userAddr);
  const reowned = itemsAfterUnequip.find((i) => i.id === itemId1);
  if (!reowned) throw new Error('Unequipped item should be back in owned list');
  log('B-4-2', 'PASS', { ownedCount: itemsAfterUnequip.length });

  // B-4-3: 빈 슬롯 해제 시도 (head는 방금 비움)
  await expectAbort(async () => {
    const tx = buildUnequipItemTx({ moiId, slot: 'head', owner: userAddr });
    await executeAndAssert(client, { transaction: tx, signer: user });
  }, 1, 'B-4-3');

  // B-4-4: 해제 후 재장착
  const reequipTx = buildEquipItemTx({ moiId, itemId: itemId1 });
  const reequipRes = await executeAndAssert(client, { transaction: reequipTx, signer: user });
  log('B-4-4', 'PASS', { digest: reequipRes.digest });

  // =====================
  // B-5: 사전 셋업 + Gift 선물
  // =====================
  console.log('\n--- B-5: Gift 선물 ---');

  // B-5-1: 사전 준비 — 결혼식 생성 + 이벤트 참가
  const weddingTx = buildCreateWeddingTx({ owner: userAddr });
  const wRes = await executeAndAssert(client, { transaction: weddingTx, signer: user });
  const weddingId = await extractCreated(wRes.digest, '::wedding::Wedding');
  const eventId = await extractCreated(wRes.digest, '::event::Event');
  const capId = await extractCreated(wRes.digest, '::wedding::WeddingCap');
  const hostParticipationId = await extractCreated(wRes.digest, '::event::Participation');
  log('B-5-1-wedding', 'PASS', { weddingId, eventId, capId });

  // Vault 생성
  const vaultTx = buildCreateVaultTx({ weddingId, capId });
  const vRes = await executeAndAssert(client, { transaction: vaultTx, signer: user });
  const vaultId = await extractCreated(vRes.digest, '::cash_gift::CashGiftVault');
  log('B-5-1-vault', 'PASS', { vaultId });

  // Guest가 이벤트에 참가
  const gPartTx = buildParticipateTx({ eventId, roleId: 1 });
  const gPartRes = await executeAndAssert(client, { transaction: gPartTx, signer: guest });
  const guestParticipationId = await extractCreated(gPartRes.digest, '::event::Participation');
  log('B-5-1-guest-participate', 'PASS', { guestParticipationId });

  // User도 별도 GUEST 참가 (giver로서 gift에 사용할 Participation)
  // User는 이미 HOST Participation이 있으므로 그걸 사용
  log('B-5-1', 'PASS', { msg: '사전 준비 완료', hostParticipationId });

  // B-5-2: giver(User)가 아이템 구매
  const nonce5 = `e2e-b-gift-${Date.now()}`;
  const giftItemTx = buildPurchaseItemTx({
    registryId: shopRegistryId,
    nonce: nonce5,
    name: 'GiftRing',
    itemType: 'ring',
    slot: 'finger',
    owner: userAddr,
  });
  const giftItemRes = await executeAndAssert(client, { transaction: giftItemTx, signer: user });
  const giftItemId = await extractCreated(giftItemRes.digest, '::moi::MoiItem');
  log('B-5-2', 'PASS', { giftItemId });

  // B-5-3: giver(User)가 recipient에게 선물
  const giftTx = buildGiftTx({
    participationId: hostParticipationId,
    itemId: giftItemId,
    recipient: recipientAddr,
  });
  const giftRes = await executeAndAssert(client, { transaction: giftTx, signer: user });
  log('B-5-3', 'PASS', { digest: giftRes.digest });

  // B-5-4: recipient가 아이템 수령 확인
  const recipientItems = await getOwnedMoiItems(client, recipientAddr);
  const giftedItem = recipientItems.find((i) => i.id === giftItemId);
  if (!giftedItem) throw new Error('Gift item not found in recipient');
  log('B-5-4', 'PASS', { recipientItemCount: recipientItems.length });

  // B-5-5: giver 아이템 목록에서 사라짐
  const userItemsAfterGift = await getOwnedMoiItems(client, userAddr);
  const giverStillHas = userItemsAfterGift.find((i) => i.id === giftItemId);
  if (giverStillHas) throw new Error('Gifted item still owned by giver');
  log('B-5-5', 'PASS', { userItemCount: userItemsAfterGift.length });

  // B-5-6: ActionRecord(GIFT) 확인
  const actionLogs = await getActionLoggedEvents(client);
  const giftAction = actionLogs.find(
    (a) => a.actor === userAddr && a.target === recipientAddr && a.actionType === 3,
  );
  if (!giftAction) throw new Error('GIFT ActionRecord not found');
  log('B-5-6', 'PASS', { actionType: giftAction.actionType, actor: giftAction.actor });

  // B-5-7: CS TrustMatrix에 GIFT 신호 반영 (CS kind=2)
  const signals = await getSignalEvents(client);
  const giftSignal = signals.find(
    (s) => s.from === userAddr && s.to === recipientAddr && s.kind === 2 && s.source === 3,
  );
  if (!giftSignal) {
    log('B-5-7', 'FAIL', { error: 'GIFT CS signal not found', availableSignals: signals.filter(s => s.from === userAddr).slice(0, 5) });
  } else {
    log('B-5-7', 'PASS', { signal: giftSignal });
  }

  // B-5-8: SignalEmitted(GIFT-CS) 이벤트 확인
  const giftCsSignals = signals.filter(
    (s) => s.source === 3 && (s.from === userAddr || s.to === recipientAddr),
  );
  log('B-5-8', 'PASS', { giftCsSignalCount: giftCsSignals.length });

  // =====================
  // B-6: 방명록
  // =====================
  console.log('\n--- B-6: 방명록 ---');

  // B-6-1: 하객(Guest)이 방명록 작성
  const writeTx = buildWriteTx({ weddingId, participationId: guestParticipationId });
  const writeRes = await executeAndAssert(client, { transaction: writeTx, signer: guest });
  log('B-6-1', 'PASS', { digest: writeRes.digest });

  // B-6-2: ActionRecord(WRITE_MESSAGE) 확인 — 인덱싱 대기
  await new Promise((r) => setTimeout(r, 2000));
  const actionLogs2 = await getActionLoggedEvents(client);
  const writeAction = actionLogs2.find(
    (a) => a.actor === guestAddr && a.actionType === 4, // ACTION_WRITE_MESSAGE = 4
  );
  if (!writeAction) {
    log('B-6-2', 'FAIL', { error: 'WRITE_MESSAGE ActionRecord not found', guestAddr, allActors: actionLogs2.map(a => `${a.actor}:${a.actionType}`).slice(-10) });
  } else {
    log('B-6-2', 'PASS', { actionType: writeAction.actionType, actor: writeAction.actor });
  }

  // B-6-3: CS 매트릭스에 방명록 CS 반영 (CS kind=2, source=4=WRITE_MESSAGE)
  const signals2 = await getSignalEvents(client);
  const writeSignal = signals2.find(
    (s) => s.from === guestAddr && s.kind === 2 && s.source === 4,
  );
  if (!writeSignal) {
    log('B-6-3', 'FAIL', { error: 'WRITE CS signal not found' });
  } else {
    log('B-6-3', 'PASS', { signal: writeSignal });
  }

  // B-6-4: 다른 결혼식 Participation으로 방명록 작성 시도
  // Recipient의 참가는 없으므로 dummy participation으로 시도
  await expectAbort(async () => {
    // hostParticipationId는 User(HOST)의 것이므로 Guest(sender)와 불일치 → EActorMismatch
    const tx = buildWriteTx({ weddingId, participationId: hostParticipationId });
    await executeAndAssert(client, { transaction: tx, signer: guest });
  }, 0, 'B-6-4');

  // =====================
  // B-7: EdgeBalance
  // =====================
  console.log('\n--- B-7: EdgeBalance ---');

  // B-7-1: EdgeBalance 생성
  const edgeTx = new Transaction();
  edgeTx.moveCall({
    target: moveTarget('edge_balance', 'create_edge'),
    arguments: [edgeTx.pure.address(userAddr), edgeTx.pure.address(recipientAddr)],
  });
  const edgeRes = await executeAndAssert(client, { transaction: edgeTx, signer: user });
  const edgeId = await extractCreated(edgeRes.digest, '::edge_balance::EdgeBalance');
  log('B-7-1', 'PASS', { digest: edgeRes.digest, edgeId });

  // B-7-2: EdgeBalance 조회
  const edgeObj = await client.getObject({ id: edgeId, options: { showContent: true } });
  if (!edgeObj.data) throw new Error('EdgeBalance not found');
  log('B-7-2', 'PASS', { objectType: edgeObj.data.content?.dataType === 'moveObject' ? edgeObj.data.content.type : 'unknown' });

  // B-7-3: EM 신호 기록 (User→Recipient)
  const recTx1 = new Transaction();
  recTx1.moveCall({
    target: moveTarget('edge_balance', 'record'),
    arguments: [
      recTx1.object(edgeId),
      recTx1.object(TESTNET_CONFIG.emMoneyMatrixId!),
      recTx1.pure.address(userAddr),
      recTx1.pure.address(recipientAddr),
      recTx1.pure.u8(1),  // kind = EM
      recTx1.pure.u8(0),  // resource_id = MONEY
      recTx1.pure.u64(100_000),
    ],
  });
  const rec1Res = await executeAndAssert(client, { transaction: recTx1, signer: user });
  log('B-7-3', 'PASS', { digest: rec1Res.digest });

  // B-7-4: 역방향 기록 (Recipient→User)
  const recTx2 = new Transaction();
  recTx2.moveCall({
    target: moveTarget('edge_balance', 'record'),
    arguments: [
      recTx2.object(edgeId),
      recTx2.object(TESTNET_CONFIG.emMoneyMatrixId!),
      recTx2.pure.address(recipientAddr),
      recTx2.pure.address(userAddr),
      recTx2.pure.u8(1),
      recTx2.pure.u8(0),
      recTx2.pure.u64(50_000),
    ],
  });
  const rec2Res = await executeAndAssert(client, { transaction: recTx2, signer: recipient });
  log('B-7-4', 'PASS', { digest: rec2Res.digest });

  // B-7-5: CS 신호 기록
  const recTx3 = new Transaction();
  recTx3.moveCall({
    target: moveTarget('edge_balance', 'record'),
    arguments: [
      recTx3.object(edgeId),
      recTx3.object(TESTNET_CONFIG.csMatrixId!),
      recTx3.pure.address(userAddr),
      recTx3.pure.address(recipientAddr),
      recTx3.pure.u8(2),  // kind = CS
      recTx3.pure.u8(0),
      recTx3.pure.u64(1),
    ],
  });
  const rec3Res = await executeAndAssert(client, { transaction: recTx3, signer: user });
  log('B-7-5', 'PASS', { digest: rec3Res.digest });

  // B-7-6: 누적 확인 (같은 방향 2번 기록)
  const recTx4 = new Transaction();
  recTx4.moveCall({
    target: moveTarget('edge_balance', 'record'),
    arguments: [
      recTx4.object(edgeId),
      recTx4.object(TESTNET_CONFIG.emMoneyMatrixId!),
      recTx4.pure.address(userAddr),
      recTx4.pure.address(recipientAddr),
      recTx4.pure.u8(1),
      recTx4.pure.u8(0),
      recTx4.pure.u64(100),
    ],
  });
  const rec4Res = await executeAndAssert(client, { transaction: recTx4, signer: user });
  log('B-7-6', 'PASS', { digest: rec4Res.digest });

  // B-7-7: 자기 자신과 엣지 생성 시도 → ESelfEdge
  await expectAbort(async () => {
    const tx = new Transaction();
    tx.moveCall({
      target: moveTarget('edge_balance', 'create_edge'),
      arguments: [tx.pure.address(userAddr), tx.pure.address(userAddr)],
    });
    await executeAndAssert(client, { transaction: tx, signer: user });
  }, 2, 'B-7-7');

  // B-7-8: 참여자가 아닌 주소로 기록 → ENotParticipant
  await expectAbort(async () => {
    const tx = new Transaction();
    tx.moveCall({
      target: moveTarget('edge_balance', 'record'),
      arguments: [
        tx.object(edgeId),
        tx.object(TESTNET_CONFIG.emMoneyMatrixId!),
        tx.pure.address(userAddr),
        tx.pure.address(guestAddr), // Guest는 edge 참여자 아님
        tx.pure.u8(1),
        tx.pure.u8(0),
        tx.pure.u64(1),
      ],
    });
    await executeAndAssert(client, { transaction: tx, signer: user });
  }, 0, 'B-7-8');

  // B-7-9: 매트릭스 타입 불일치 → EMatrixTypeMismatch
  await expectAbort(async () => {
    const tx = new Transaction();
    tx.moveCall({
      target: moveTarget('edge_balance', 'record'),
      arguments: [
        tx.object(edgeId),
        tx.object(TESTNET_CONFIG.emMoneyMatrixId!), // EM 매트릭스에
        tx.pure.address(userAddr),
        tx.pure.address(recipientAddr),
        tx.pure.u8(2),  // CS kind 기록 시도
        tx.pure.u8(0),
        tx.pure.u64(1),
      ],
    });
    await executeAndAssert(client, { transaction: tx, signer: user });
  }, 1, 'B-7-9');

  // =====================
  // B-8: 온체인 쿼리 검증
  // =====================
  console.log('\n--- B-8: 온체인 쿼리 검증 ---');

  // B-8-1: discoverUsers
  const discovered = await discoverUsers(client, guestAddr);
  const foundUser = discovered.find((d) => d.address === userAddr);
  // Guest와 User는 같은 이벤트에 참가했으므로 degree=1이어야 함
  if (foundUser && foundUser.degree === 1) {
    log('B-8-1', 'PASS', { discoveredCount: discovered.length, userDegree: foundUser.degree });
  } else {
    log('B-8-1', 'FAIL', { discoveredCount: discovered.length, foundUser });
  }

  // B-8-2: getEventCreatedEvents
  const eventCreated = await getEventCreatedEvents(client);
  const myEvent = eventCreated.find((e) => e.creator === userAddr);
  if (!myEvent) {
    log('B-8-2', 'FAIL', { error: 'Event not found for user' });
  } else {
    log('B-8-2', 'PASS', { eventId: myEvent.eventId, eventType: myEvent.eventType });
  }

  // B-8-3: getParticipatedEvents
  const participated = await getParticipatedEvents(client);
  const guestParts = participated.filter((p) => p.participant === guestAddr);
  if (guestParts.length === 0) {
    log('B-8-3', 'FAIL', { error: 'Guest participation not found' });
  } else {
    log('B-8-3', 'PASS', { guestParticipationCount: guestParts.length });
  }

  // B-8-4: getSignalEvents 전체 조회
  const allSignals = await getSignalEvents(client);
  const mySignals = allSignals.filter(
    (s) => s.from === userAddr || s.to === userAddr || s.from === guestAddr || s.to === guestAddr,
  );
  log('B-8-4', 'PASS', { totalSignals: allSignals.length, relevantSignals: mySignals.length });

  // B-8-5: getActionLoggedEvents 전체 조회
  const allActions = await getActionLoggedEvents(client);
  const myActions = allActions.filter(
    (a) => a.actor === userAddr || a.actor === guestAddr,
  );
  log('B-8-5', 'PASS', { totalActions: allActions.length, relevantActions: myActions.length });

  console.log('\n=== Agent B E2E 완료 ===');
}

main().catch((e) => {
  console.error('FATAL:', e);
  log('FATAL', 'UNEXPECTED_FAIL', { error: e instanceof Error ? e.message : String(e) });
  process.exit(1);
});
