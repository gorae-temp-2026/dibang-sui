/**
 * Agent A — E2E 테스트 스크립트
 * A-1 ~ A-8: Wedding, CashGift, RSVP 전체 경로
 */
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
  createJsonRpcClient, executeAndAssert, configureSui,
  buildCreateWeddingTx, buildAddHostTx, buildInviteTx,
  buildCreateVaultTx, buildGiveTx, buildWithdrawTx,
  buildParticipateTx, buildSubmitRsvpTx,
  getWedding, getWeddingLounge, getCashGiftVault,
  getOwnedWeddingCapIds, getWeddingCapForWedding,
  getParticipationForEvent, getRsvpEvents,
  getActionLoggedEvents, getSignalEvents,
  TESTNET_CONFIG,
} from '@gorae/sui-sdk';

const here = dirname(fileURLToPath(import.meta.url));
const RESULTS_FILE = join(here, 'results.jsonl');

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');

function log(id: string, status: string, data?: any) {
  const entry = { id, status, ts: new Date().toISOString(), ...data };
  console.log(`${status === 'PASS' || status === 'EXPECTED_FAIL' ? '✅' : '❌'} ${id}: ${status}`, data?.error || '');
  appendFileSync(RESULTS_FILE, JSON.stringify(entry) + '\n');
}

const find = (changes: any[] | undefined, suffix: string) =>
  changes?.find((o: any) => o.type === 'created' && o.objectType?.endsWith(suffix));

async function fund(from: Ed25519Keypair, to: string, amount: number) {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [amount]);
  tx.transferObjects([coin], to);
  await executeAndAssert(client, { transaction: tx, signer: from });
}

async function main() {
  writeFileSync(RESULTS_FILE, '');
  console.log('=== Agent A E2E 시작 ===\n');

  // ── W: 공통 사전 작업 ──
  const keyPath = join(here, '../../packages/sui-sdk/scripts/.shop-admin-key');
  const funder = Ed25519Keypair.fromSecretKey(readFileSync(keyPath, 'utf-8').trim());
  console.log('Funder:', funder.toSuiAddress());

  const Host = new Ed25519Keypair();
  const CoHost = new Ed25519Keypair();
  const Guest1 = new Ed25519Keypair();
  const Guest2 = new Ed25519Keypair();
  console.log('Host:', Host.toSuiAddress());
  console.log('CoHost:', CoHost.toSuiAddress());
  console.log('Guest1:', Guest1.toSuiAddress());
  console.log('Guest2:', Guest2.toSuiAddress());

  console.log('\n--- 펀딩 ---');
  for (const kp of [Host, CoHost, Guest1, Guest2]) {
    await fund(funder, kp.toSuiAddress(), 100_000_000);
  }
  console.log('펀딩 완료\n');

  // ── A-1: Wedding 생성 ──
  console.log('=== A-1: Wedding 생성 ===');
  let weddingId: string, eventId: string, capId: string, loungeId: string;

  try {
    const res = await executeAndAssert(client, {
      transaction: buildCreateWeddingTx({ owner: Host.toSuiAddress() }),
      signer: Host,
    });
    weddingId = find(res.objectChanges, '::wedding::Wedding')?.objectId;
    eventId = find(res.objectChanges, '::event::Event')?.objectId;
    capId = find(res.objectChanges, '::wedding::WeddingCap')?.objectId;
    loungeId = find(res.objectChanges, '::wedding::WeddingLounge')?.objectId;
    log('A-1-1', 'PASS', { weddingId, eventId, capId, loungeId, digest: res.digest });
  } catch (e: any) {
    log('A-1-1', 'FAIL', { error: e.message }); throw e;
  }

  // A-1-2: Wedding 조회
  try {
    const w = await getWedding(client, weddingId!);
    const ok = w && w.status === 'active' && w.hosts[0] === Host.toSuiAddress() && w.eventId && w.vaultId === null;
    log('A-1-2', ok ? 'PASS' : 'FAIL', { wedding: w });
  } catch (e: any) { log('A-1-2', 'FAIL', { error: e.message }); }

  // A-1-3: Lounge 조회
  try {
    const l = await getWeddingLounge(client, loungeId!);
    log('A-1-3', l && l.weddingId === weddingId! ? 'PASS' : 'FAIL', { lounge: l });
  } catch (e: any) { log('A-1-3', 'FAIL', { error: e.message }); }

  // A-1-4: WeddingCap 소유 확인
  try {
    const caps = await getOwnedWeddingCapIds(client, Host.toSuiAddress());
    log('A-1-4', caps.includes(capId!) ? 'PASS' : 'FAIL', { caps });
  } catch (e: any) { log('A-1-4', 'FAIL', { error: e.message }); }

  // A-1-5: Host Participation(HOST) 확인
  try {
    const p = await getParticipationForEvent(client, Host.toSuiAddress(), eventId!);
    log('A-1-5', p && p.roleId === 0 ? 'PASS' : 'FAIL', { participation: p });
  } catch (e: any) { log('A-1-5', 'FAIL', { error: e.message }); }

  // A-1-6: Event 조회
  try {
    const ev = await client.getObject({ id: eventId!, options: { showContent: true } });
    const fields = (ev.data?.content as any)?.fields;
    log('A-1-6', fields?.event_type === 0 || fields?.event_type === '0' ? 'PASS' : 'FAIL', { eventType: fields?.event_type, creator: fields?.creator });
  } catch (e: any) { log('A-1-6', 'FAIL', { error: e.message }); }

  // ── A-2: 공동 혼주 추가 ──
  console.log('\n=== A-2: 공동 혼주 추가 ===');

  // A-2-1: add_host 성공
  try {
    const res = await executeAndAssert(client, {
      transaction: buildAddHostTx({ weddingId: weddingId!, capId: capId!, newHost: CoHost.toSuiAddress() }),
      signer: Host,
    });
    log('A-2-1', 'PASS', { digest: res.digest });
  } catch (e: any) { log('A-2-1', 'FAIL', { error: e.message }); }

  // A-2-2: 공동혼주 WeddingCap 확인
  try {
    const coCapId = await getWeddingCapForWedding(client, CoHost.toSuiAddress(), weddingId!);
    log('A-2-2', coCapId ? 'PASS' : 'FAIL', { coCapId });
  } catch (e: any) { log('A-2-2', 'FAIL', { error: e.message }); }

  // A-2-3: 비-primary가 add_host → 실패
  try {
    const coCapId = await getWeddingCapForWedding(client, CoHost.toSuiAddress(), weddingId!);
    await executeAndAssert(client, {
      transaction: buildAddHostTx({ weddingId: weddingId!, capId: coCapId!, newHost: Guest1.toSuiAddress() }),
      signer: CoHost,
    });
    log('A-2-3', 'FAIL', { error: '성공하면 안 됨' });
  } catch (e: any) {
    log('A-2-3', e.message.includes('7') || e.message.includes('ENotPrimaryHost') ? 'EXPECTED_FAIL' : 'FAIL', { error: e.message });
  }

  // ── A-3: 초대 ──
  console.log('\n=== A-3: 초대 ===');
  let hostPartId: string;
  try {
    const hp = await getParticipationForEvent(client, Host.toSuiAddress(), eventId!);
    hostPartId = hp!.id;
  } catch (e: any) { log('A-3-0', 'FAIL', { error: 'Host Participation 조회 실패: ' + e.message }); throw e; }

  // A-3-1: 초대 성공
  try {
    const res = await executeAndAssert(client, {
      transaction: buildInviteTx({ weddingId: weddingId!, hostParticipationId: hostPartId!, guest: Guest1.toSuiAddress() }),
      signer: Host,
    });
    log('A-3-1', 'PASS', { digest: res.digest });
  } catch (e: any) { log('A-3-1', 'FAIL', { error: e.message }); }

  // A-3-2: ActionRecord 확인
  try {
    const actions = await getActionLoggedEvents(client);
    const invite = actions.find(a => a.actionType === 6 && a.actor === Host.toSuiAddress());
    log('A-3-2', invite ? 'PASS' : 'FAIL', { invite });
  } catch (e: any) { log('A-3-2', 'FAIL', { error: e.message }); }

  // ── A-4: 축의금 모금함 ──
  console.log('\n=== A-4: CashGiftVault 생성 ===');
  let vaultId: string;

  // A-4-1: Vault 생성
  try {
    const res = await executeAndAssert(client, {
      transaction: buildCreateVaultTx({ weddingId: weddingId!, capId: capId! }),
      signer: Host,
    });
    vaultId = find(res.objectChanges, '::cash_gift::CashGiftVault')?.objectId;
    log('A-4-1', vaultId ? 'PASS' : 'FAIL', { vaultId, digest: res.digest });
  } catch (e: any) { log('A-4-1', 'FAIL', { error: e.message }); throw e; }

  // A-4-2: Vault 조회
  try {
    const v = await getCashGiftVault(client, vaultId!);
    log('A-4-2', v && v.balance === 0n ? 'PASS' : 'FAIL', { vault: v ? { ...v, balance: v.balance.toString() } : null });
  } catch (e: any) { log('A-4-2', 'FAIL', { error: e.message }); }

  // A-4-3: Wedding에 vaultId 연결 확인
  try {
    const w = await getWedding(client, weddingId!);
    log('A-4-3', w && w.vaultId === vaultId! ? 'PASS' : 'FAIL', { vaultId: w?.vaultId });
  } catch (e: any) { log('A-4-3', 'FAIL', { error: e.message }); }

  // A-4-4: 중복 생성 → 실패
  try {
    await executeAndAssert(client, {
      transaction: buildCreateVaultTx({ weddingId: weddingId!, capId: capId! }),
      signer: Host,
    });
    log('A-4-4', 'FAIL', { error: '중복 성공하면 안 됨' });
  } catch (e: any) {
    log('A-4-4', e.message.includes('4') || e.message.includes('VaultAlreadySet') ? 'EXPECTED_FAIL' : 'FAIL', { error: e.message });
  }

  // ── A-5: 하객 참석 ──
  console.log('\n=== A-5: 하객 참석 ===');
  let guest1PartId: string, guest2PartId: string;

  // A-5-1: Guest1 참가
  try {
    const res = await executeAndAssert(client, {
      transaction: buildParticipateTx({ eventId: eventId!, roleId: 1 }),
      signer: Guest1,
    });
    guest1PartId = find(res.objectChanges, '::event::Participation')?.objectId;
    log('A-5-1', guest1PartId ? 'PASS' : 'FAIL', { guest1PartId, digest: res.digest });
  } catch (e: any) { log('A-5-1', 'FAIL', { error: e.message }); throw e; }

  // A-5-2: Guest1 Participation 조회
  try {
    const p = await getParticipationForEvent(client, Guest1.toSuiAddress(), eventId!);
    log('A-5-2', p && p.roleId === 1 ? 'PASS' : 'FAIL', { participation: p });
  } catch (e: any) { log('A-5-2', 'FAIL', { error: e.message }); }

  // Guest2도 참가 (A-6에서 사용)
  try {
    const res = await executeAndAssert(client, {
      transaction: buildParticipateTx({ eventId: eventId!, roleId: 1 }),
      signer: Guest2,
    });
    guest2PartId = find(res.objectChanges, '::event::Participation')?.objectId;
    console.log('  Guest2 참가 완료:', guest2PartId);
  } catch (e: any) { console.log('  Guest2 참가 실패:', e.message); }

  // A-5-5: HOST 역할 self-claim → 실패
  try {
    await executeAndAssert(client, {
      transaction: buildParticipateTx({ eventId: eventId!, roleId: 0 }),
      signer: Guest1,
    });
    log('A-5-5', 'FAIL', { error: '성공하면 안 됨' });
  } catch (e: any) {
    log('A-5-5', e.message.includes('2') || e.message.includes('NotSelfClaimable') ? 'EXPECTED_FAIL' : 'FAIL', { error: e.message });
  }

  // ── A-6: 부조 ──
  console.log('\n=== A-6: 부조 ===');
  const GIVE_AMOUNT = 5_000_000n; // 0.005 SUI

  // A-6-1: Guest1 부조
  try {
    const res = await executeAndAssert(client, {
      transaction: buildGiveTx({ vaultId: vaultId!, weddingId: weddingId!, participationId: guest1PartId!, amount: GIVE_AMOUNT }),
      signer: Guest1,
    });
    log('A-6-1', 'PASS', { digest: res.digest });
  } catch (e: any) { log('A-6-1', 'FAIL', { error: e.message }); }

  // A-6-2: Vault 잔액 확인
  try {
    const v = await getCashGiftVault(client, vaultId!);
    log('A-6-2', v && v.balance === GIVE_AMOUNT ? 'PASS' : 'FAIL', { balance: v?.balance.toString() });
  } catch (e: any) { log('A-6-2', 'FAIL', { error: e.message }); }

  // A-6-6: Guest2도 부조
  try {
    const res = await executeAndAssert(client, {
      transaction: buildGiveTx({ vaultId: vaultId!, weddingId: weddingId!, participationId: guest2PartId!, amount: GIVE_AMOUNT }),
      signer: Guest2,
    });
    const v = await getCashGiftVault(client, vaultId!);
    log('A-6-6', v && v.balance === GIVE_AMOUNT * 2n ? 'PASS' : 'FAIL', { balance: v?.balance.toString(), digest: res.digest });
  } catch (e: any) { log('A-6-6', 'FAIL', { error: e.message }); }

  // A-6-7: 0원 부조 → 실패
  try {
    await executeAndAssert(client, {
      transaction: buildGiveTx({ vaultId: vaultId!, weddingId: weddingId!, participationId: guest1PartId!, amount: 0n }),
      signer: Guest1,
    });
    log('A-6-7', 'FAIL', { error: '0원 성공하면 안 됨' });
  } catch (e: any) {
    log('A-6-7', e.message.includes('1') || e.message.includes('ZeroAmount') ? 'EXPECTED_FAIL' : 'FAIL', { error: e.message });
  }

  // ── A-7: 인출 ──
  console.log('\n=== A-7: 축의금 인출 ===');
  const WITHDRAW_AMOUNT = 3_000_000n;

  // A-7-1: 일부 인출
  try {
    const res = await executeAndAssert(client, {
      transaction: buildWithdrawTx({ vaultId: vaultId!, capId: capId!, amount: WITHDRAW_AMOUNT, owner: Host.toSuiAddress() }),
      signer: Host,
    });
    log('A-7-1', 'PASS', { digest: res.digest });
  } catch (e: any) { log('A-7-1', 'FAIL', { error: e.message }); }

  // A-7-2: Vault 잔액 확인
  try {
    const v = await getCashGiftVault(client, vaultId!);
    const expected = GIVE_AMOUNT * 2n - WITHDRAW_AMOUNT;
    log('A-7-2', v && v.balance === expected ? 'PASS' : 'FAIL', { balance: v?.balance.toString(), expected: expected.toString() });
  } catch (e: any) { log('A-7-2', 'FAIL', { error: e.message }); }

  // A-7-5: 잔액 초과 인출 → 실패
  try {
    await executeAndAssert(client, {
      transaction: buildWithdrawTx({ vaultId: vaultId!, capId: capId!, amount: 999_000_000_000n, owner: Host.toSuiAddress() }),
      signer: Host,
    });
    log('A-7-5', 'FAIL', { error: '초과 인출 성공하면 안 됨' });
  } catch (e: any) {
    log('A-7-5', e.message.includes('2') || e.message.includes('InsufficientBalance') ? 'EXPECTED_FAIL' : 'FAIL', { error: e.message });
  }

  // A-7-6: 0원 인출 → 실패
  try {
    await executeAndAssert(client, {
      transaction: buildWithdrawTx({ vaultId: vaultId!, capId: capId!, amount: 0n, owner: Host.toSuiAddress() }),
      signer: Host,
    });
    log('A-7-6', 'FAIL', { error: '0원 인출 성공하면 안 됨' });
  } catch (e: any) {
    log('A-7-6', e.message.includes('1') || e.message.includes('ZeroAmount') ? 'EXPECTED_FAIL' : 'FAIL', { error: e.message });
  }

  // ── A-8: RSVP ──
  console.log('\n=== A-8: RSVP ===');

  // A-8-1: 참석 의사 (attending)
  try {
    const res = await executeAndAssert(client, {
      transaction: buildSubmitRsvpTx({ loungeId: loungeId!, recipientSlot: 0, attendance: 0, companionCount: 2, meal: 0 }),
      signer: Guest1,
    });
    log('A-8-1', 'PASS', { digest: res.digest });
  } catch (e: any) { log('A-8-1', 'FAIL', { error: e.message }); }

  // A-8-2: RSVP 이벤트 조회
  try {
    const rsvps = await getRsvpEvents(client, weddingId!);
    const mine = rsvps.find(r => r.submitter === Guest1.toSuiAddress());
    log('A-8-2', mine && mine.attendance === 0 && mine.companionCount === 2 ? 'PASS' : 'FAIL', { rsvp: mine });
  } catch (e: any) { log('A-8-2', 'FAIL', { error: e.message }); }

  // A-8-3: 불참 의사
  try {
    const res = await executeAndAssert(client, {
      transaction: buildSubmitRsvpTx({ loungeId: loungeId!, recipientSlot: 1, attendance: 1, companionCount: 0, meal: 1 }),
      signer: Guest2,
    });
    log('A-8-3', 'PASS', { digest: res.digest });
  } catch (e: any) { log('A-8-3', 'FAIL', { error: e.message }); }

  // A-8-4: 동반 인원 최대(20명)
  try {
    const res = await executeAndAssert(client, {
      transaction: buildSubmitRsvpTx({ loungeId: loungeId!, recipientSlot: 2, attendance: 0, companionCount: 20, meal: 0 }),
      signer: Guest1,
    });
    log('A-8-4', 'PASS', { digest: res.digest });
  } catch (e: any) { log('A-8-4', 'FAIL', { error: e.message }); }

  // A-8-7: attendance=2 → 실패
  try {
    await executeAndAssert(client, {
      transaction: buildSubmitRsvpTx({ loungeId: loungeId!, recipientSlot: 0, attendance: 2, companionCount: 0, meal: 0 }),
      signer: Guest1,
    });
    log('A-8-7', 'FAIL', { error: '범위 밖 성공하면 안 됨' });
  } catch (e: any) {
    log('A-8-7', 'EXPECTED_FAIL', { error: e.message });
  }

  // A-8-8: companionCount=21 → 실패
  try {
    await executeAndAssert(client, {
      transaction: buildSubmitRsvpTx({ loungeId: loungeId!, recipientSlot: 0, attendance: 0, companionCount: 21, meal: 0 }),
      signer: Guest1,
    });
    log('A-8-8', 'FAIL', { error: '21명 성공하면 안 됨' });
  } catch (e: any) {
    log('A-8-8', 'EXPECTED_FAIL', { error: e.message });
  }

  // A-8-9: meal=3 → 실패
  try {
    await executeAndAssert(client, {
      transaction: buildSubmitRsvpTx({ loungeId: loungeId!, recipientSlot: 0, attendance: 0, companionCount: 0, meal: 3 }),
      signer: Guest1,
    });
    log('A-8-9', 'FAIL', { error: 'meal=3 성공하면 안 됨' });
  } catch (e: any) {
    log('A-8-9', 'EXPECTED_FAIL', { error: e.message });
  }

  // A-8-10: slot=6 → 실패
  try {
    await executeAndAssert(client, {
      transaction: buildSubmitRsvpTx({ loungeId: loungeId!, recipientSlot: 6, attendance: 0, companionCount: 0, meal: 0 }),
      signer: Guest1,
    });
    log('A-8-10', 'FAIL', { error: 'slot=6 성공하면 안 됨' });
  } catch (e: any) {
    log('A-8-10', 'EXPECTED_FAIL', { error: e.message });
  }

  console.log('\n=== Agent A E2E 완료 ===');
  console.log('결과:', RESULTS_FILE);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
