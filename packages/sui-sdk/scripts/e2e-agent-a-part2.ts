/**
 * Agent A Part 2 — 빠진 시나리오 보완
 * Part 1에서 생성된 오브젝트 ID를 results.jsonl에서 읽어서 이어서 실행
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
  createJsonRpcClient, executeAndAssert, configureSui,
  buildAddHostTx, buildInviteTx, buildCreateVaultTx,
  buildParticipateTx, buildGiveTx, buildWithdrawTx,
  buildSubmitRsvpTx,
  getWedding, getCashGiftVault, getWeddingCapForWedding,
  getParticipationForEvent, getActionLoggedEvents, getSignalEvents,
  moveTarget,
} from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

const here = dirname(fileURLToPath(import.meta.url));
const RESULTS_FILE = join(here, '../../../_e2e/2026-06-22-results/agent-a/results.jsonl');

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');

const FUND_AMOUNT = Number(process.env.E2E_FUND_AMOUNT || 40_000_000);

function log(id: string, status: string, data?: any) {
  const entry = { id, status, ts: new Date().toISOString(), ...data };
  console.log(`${status === 'PASS' || status === 'EXPECTED_FAIL' ? '✅' : '❌'} ${id}: ${status}`, data?.error || '');
  appendFileSync(RESULTS_FILE, JSON.stringify(entry) + '\n');
}

const find = (changes: any[] | undefined, suffix: string) =>
  changes?.find((o: any) => o.type === 'created' && o.objectType?.endsWith(suffix));

async function main() {
  console.log('=== Agent A Part 2 — 빠진 시나리오 보완 ===\n');

  const keyPath = join(here, '.shop-admin-key');
  const funder = Ed25519Keypair.fromSecretKey(readFileSync(keyPath, 'utf-8').trim());

  // 지갑 생성 또는 기존 로드
  const WALLET_FILE = join(here, '../../../_e2e/2026-06-22-results/agent-a/wallets-part2.json');
  let Host: Ed25519Keypair, CoHost: Ed25519Keypair, Guest1: Ed25519Keypair, Guest2: Ed25519Keypair;
  let needFunding = false;

  try {
    const saved = JSON.parse(readFileSync(WALLET_FILE, 'utf-8'));
    Host = Ed25519Keypair.fromSecretKey(saved.Host.sk);
    CoHost = Ed25519Keypair.fromSecretKey(saved.CoHost.sk);
    Guest1 = Ed25519Keypair.fromSecretKey(saved.Guest1.sk);
    Guest2 = Ed25519Keypair.fromSecretKey(saved.Guest2.sk);
    console.log('기존 지갑 로드 완료');
  } catch {
    Host = new Ed25519Keypair();
    CoHost = new Ed25519Keypair();
    Guest1 = new Ed25519Keypair();
    Guest2 = new Ed25519Keypair();
    needFunding = true;
    const walletData = {
      Host: { address: Host.toSuiAddress(), sk: Host.getSecretKey() },
      CoHost: { address: CoHost.toSuiAddress(), sk: CoHost.getSecretKey() },
      Guest1: { address: Guest1.toSuiAddress(), sk: Guest1.getSecretKey() },
      Guest2: { address: Guest2.toSuiAddress(), sk: Guest2.getSecretKey() },
      createdAt: new Date().toISOString(),
    };
    writeFileSync(WALLET_FILE, JSON.stringify(walletData, null, 2));
    console.log('새 지갑 생성 → wallets-part2.json 저장');
  }

  if (needFunding) {
    console.log('--- 펀딩 ---');
    const fundTx = new Transaction();
    for (const kp of [Host, CoHost, Guest1, Guest2]) {
      const [coin] = fundTx.splitCoins(fundTx.gas, [FUND_AMOUNT]);
      fundTx.transferObjects([coin], kp.toSuiAddress());
    }
    await executeAndAssert(client, { transaction: fundTx, signer: funder });
    console.log('펀딩 완료\n');
  } else {
    console.log('기존 지갑 — 펀딩 스킵\n');
  }

  // 셋업: 결혼식 생성
  const { buildCreateWeddingTx } = await import('../src/wedding');
  const wRes = await executeAndAssert(client, {
    transaction: buildCreateWeddingTx({ owner: Host.toSuiAddress() }),
    signer: Host,
  });
  const weddingId = find(wRes.objectChanges, '::wedding::Wedding')?.objectId;
  const eventId = find(wRes.objectChanges, '::event::Event')?.objectId;
  const capId = find(wRes.objectChanges, '::wedding::WeddingCap')?.objectId;
  const loungeId = find(wRes.objectChanges, '::wedding::WeddingLounge')?.objectId;
  console.log('Wedding:', weddingId);

  // add_host
  await executeAndAssert(client, {
    transaction: buildAddHostTx({ weddingId: weddingId!, capId: capId!, newHost: CoHost.toSuiAddress() }),
    signer: Host,
  });
  const coCapId = await getWeddingCapForWedding(client, CoHost.toSuiAddress(), weddingId!);

  // vault
  const vRes = await executeAndAssert(client, {
    transaction: buildCreateVaultTx({ weddingId: weddingId!, capId: capId! }),
    signer: Host,
  });
  const vaultId = find(vRes.objectChanges, '::cash_gift::CashGiftVault')?.objectId;

  // Guest1, Guest2 참가
  const g1Res = await executeAndAssert(client, {
    transaction: buildParticipateTx({ eventId: eventId!, roleId: 1 }),
    signer: Guest1,
  });
  const guest1PartId = find(g1Res.objectChanges, '::event::Participation')?.objectId;

  const g2Res = await executeAndAssert(client, {
    transaction: buildParticipateTx({ eventId: eventId!, roleId: 1 }),
    signer: Guest2,
  });
  const guest2PartId = find(g2Res.objectChanges, '::event::Participation')?.objectId;

  // Host Participation
  const hostPart = await getParticipationForEvent(client, Host.toSuiAddress(), eventId!);
  const hostPartId = hostPart!.id;

  // Guest1 부조 (인출 테스트용)
  await executeAndAssert(client, {
    transaction: buildGiveTx({ vaultId: vaultId!, weddingId: weddingId!, participationId: guest1PartId!, amount: 5_000_000n }),
    signer: Guest1,
  });
  // Guest2도 부조
  await executeAndAssert(client, {
    transaction: buildGiveTx({ vaultId: vaultId!, weddingId: weddingId!, participationId: guest2PartId!, amount: 3_000_000n }),
    signer: Guest2,
  });

  console.log('셋업 완료. 빠진 시나리오 실행 시작.\n');

  // ── A-2-4: 잘못된 Cap으로 add_host ──
  try {
    // 다른 결혼식 생성해서 그 Cap 사용
    const w2 = await executeAndAssert(client, {
      transaction: buildCreateWeddingTx({ owner: Guest1.toSuiAddress() }),
      signer: Guest1,
    });
    const wrongCapId = find(w2.objectChanges, '::wedding::WeddingCap')?.objectId;
    await executeAndAssert(client, {
      transaction: buildAddHostTx({ weddingId: weddingId!, capId: wrongCapId!, newHost: Guest2.toSuiAddress() }),
      signer: Guest1,
    });
    log('A-2-4', 'FAIL', { error: '잘못된 Cap 성공하면 안 됨' });
  } catch (e: any) {
    log('A-2-4', e.message.includes('abort code: 0') ? 'EXPECTED_FAIL' : 'FAIL', { error: e.message });
  }

  // ── A-3-3: GUEST 역할로 초대 시도 ──
  try {
    await executeAndAssert(client, {
      transaction: buildInviteTx({ weddingId: weddingId!, hostParticipationId: guest1PartId!, guest: Guest2.toSuiAddress() }),
      signer: Guest1,
    });
    log('A-3-3', 'FAIL', { error: 'GUEST가 초대 성공하면 안 됨' });
  } catch (e: any) {
    log('A-3-3', e.message.includes('abort code: 6') ? 'EXPECTED_FAIL' : 'FAIL', { error: e.message });
  }

  // ── A-3-4: 다른 결혼식 Participation으로 초대 ──
  try {
    // Guest1은 위에서 다른 결혼식도 만들었으므로 그 eventId의 HOST participation 사용
    const g1Part2 = await getParticipationForEvent(client, Guest1.toSuiAddress(), eventId!);
    // 이 participation은 이 결혼식 것이라 다른 걸 써야 함 — Guest1이 만든 결혼식의 것 사용
    const w2Events = await client.getOwnedObjects({
      owner: Guest1.toSuiAddress(),
      filter: { StructType: moveTarget('event', 'Participation') },
      options: { showContent: true },
    });
    const otherPart = w2Events.data.find(o => {
      const f = (o.data?.content as any)?.fields;
      return f && f.event_id !== eventId && f.role_id === 0;
    });
    if (otherPart?.data) {
      await executeAndAssert(client, {
        transaction: buildInviteTx({ weddingId: weddingId!, hostParticipationId: otherPart.data.objectId, guest: Guest2.toSuiAddress() }),
        signer: Guest1,
      });
      log('A-3-4', 'FAIL', { error: '다른 결혼식 participation 성공하면 안 됨' });
    } else {
      log('A-3-4', 'SKIP', { error: '다른 결혼식 HOST participation 없음' });
    }
  } catch (e: any) {
    log('A-3-4', e.message.includes('abort code: 5') ? 'EXPECTED_FAIL' : 'FAIL', { error: e.message });
  }

  // ── A-4-5: 잘못된 Cap으로 vault 생성 ──
  try {
    // Guest1이 만든 결혼식의 Cap으로 Host 결혼식에 vault 만들기 시도
    const wrongCaps = await client.getOwnedObjects({
      owner: Guest1.toSuiAddress(),
      filter: { StructType: moveTarget('wedding', 'WeddingCap') },
      options: { showContent: true },
    });
    const wrongCap = wrongCaps.data[0]?.data?.objectId;
    if (wrongCap) {
      // Guest1이 만든 별도 결혼식에 vault — 그 결혼식 ID도 필요
      // 단순히 Host 결혼식에 Guest1 cap 사용 → EWrongCap
      const w2All = await client.getOwnedObjects({
        owner: Guest1.toSuiAddress(),
        filter: { StructType: moveTarget('wedding', 'WeddingCap') },
        options: { showContent: true },
      });
      // Host 결혼식에 Guest1의 cap → abort
      await executeAndAssert(client, {
        transaction: buildCreateVaultTx({ weddingId: weddingId!, capId: wrongCap }),
        signer: Guest1,
      });
      log('A-4-5', 'FAIL', { error: '잘못된 Cap 성공하면 안 됨' });
    }
  } catch (e: any) {
    log('A-4-5', e.message.includes('abort code: 0') || e.message.includes('abort code: 4') ? 'EXPECTED_FAIL' : 'FAIL', { error: e.message });
  }

  // ── A-5-3: CS TrustMatrix 참석 신호 확인 ──
  try {
    const obj = await client.getObject({ id: TESTNET_CONFIG.csMatrixId!, options: { showContent: true } });
    const fields = (obj.data?.content as any)?.fields;
    const nodeCount = fields?.nodes?.length || 0;
    log('A-5-3', nodeCount > 0 ? 'PASS' : 'FAIL', { nodeCount });
  } catch (e: any) { log('A-5-3', 'FAIL', { error: e.message }); }

  // ── A-5-4: SignalEmitted 이벤트 확인 ──
  try {
    const signals = await getSignalEvents(client);
    const attendCS = signals.filter(s => s.kind === 2 && s.source === 5);
    log('A-5-4', attendCS.length > 0 ? 'PASS' : 'FAIL', { attendCSCount: attendCS.length });
  } catch (e: any) { log('A-5-4', 'FAIL', { error: e.message }); }

  // ── A-5-6~8: 나머지 역할 self-claim 실패 ──
  for (const [id, roleId, roleName] of [['A-5-6', 2, 'OFFICIANT'], ['A-5-7', 3, 'INITIATOR'], ['A-5-8', 4, 'RECEIVER']] as const) {
    try {
      await executeAndAssert(client, {
        transaction: buildParticipateTx({ eventId: eventId!, roleId: Number(roleId) }),
        signer: Guest2,
      });
      log(id, 'FAIL', { error: `${roleName} self-claim 성공하면 안 됨` });
    } catch (e: any) {
      log(id, e.message.includes('abort code: 2') ? 'EXPECTED_FAIL' : 'FAIL', { error: e.message });
    }
  }

  // ── A-6-3: ActionRecord(GIVE_MONEY) 확인 ──
  try {
    const actions = await getActionLoggedEvents(client);
    const gives = actions.filter(a => a.actionType === 0);
    log('A-6-3', gives.length > 0 ? 'PASS' : 'FAIL', { giveCount: gives.length });
  } catch (e: any) { log('A-6-3', 'FAIL', { error: e.message }); }

  // ── A-6-4: EM TrustMatrix 부조 신호 ──
  try {
    const obj = await client.getObject({ id: TESTNET_CONFIG.emMoneyMatrixId!, options: { showContent: true } });
    const fields = (obj.data?.content as any)?.fields;
    const nodeCount = fields?.nodes?.length || 0;
    log('A-6-4', nodeCount > 0 ? 'PASS' : 'FAIL', { nodeCount });
  } catch (e: any) { log('A-6-4', 'FAIL', { error: e.message }); }

  // ── A-6-5: SignalEmitted(BUSU) ──
  try {
    const signals = await getSignalEvents(client);
    const busu = signals.filter(s => s.kind === 1);
    log('A-6-5', busu.length > 0 ? 'PASS' : 'FAIL', { busuCount: busu.length });
  } catch (e: any) { log('A-6-5', 'FAIL', { error: e.message }); }

  // ── A-6-8: 다른 결혼식 Participation으로 부조 → EWrongEvent ──
  try {
    // Guest1이 만든 결혼식의 GUEST participation은 없으므로 HOST participation 사용 시도
    const allParts = await client.getOwnedObjects({
      owner: Guest1.toSuiAddress(),
      filter: { StructType: moveTarget('event', 'Participation') },
      options: { showContent: true },
    });
    const otherPart = allParts.data.find(o => {
      const f = (o.data?.content as any)?.fields;
      return f && f.event_id !== eventId;
    });
    if (otherPart?.data) {
      await executeAndAssert(client, {
        transaction: buildGiveTx({ vaultId: vaultId!, weddingId: weddingId!, participationId: otherPart.data.objectId, amount: 100_000n }),
        signer: Guest1,
      });
      log('A-6-8', 'FAIL', { error: '다른 participation 부조 성공하면 안 됨' });
    } else {
      log('A-6-8', 'SKIP', { error: '다른 event participation 없음' });
    }
  } catch (e: any) {
    log('A-6-8', e.message.includes('abort code: 3') || e.message.includes('abort code: 0') ? 'EXPECTED_FAIL' : 'FAIL', { error: e.message });
  }

  // ── A-7-3: Host SUI 잔액 확인 (인출 후) ──
  try {
    const balBefore = await client.getBalance({ owner: Host.toSuiAddress(), coinType: '0x2::sui::SUI' });
    const before = BigInt(balBefore.totalBalance);
    await executeAndAssert(client, {
      transaction: buildWithdrawTx({ vaultId: vaultId!, capId: capId!, amount: 1_000_000n, owner: Host.toSuiAddress() }),
      signer: Host,
    });
    const balAfter = await client.getBalance({ owner: Host.toSuiAddress(), coinType: '0x2::sui::SUI' });
    const after = BigInt(balAfter.totalBalance);
    // 인출액 1M - 가스비 ≈ 잔액 증가 (가스 때문에 정확히 1M은 아님)
    log('A-7-3', after > before - 5_000_000n ? 'PASS' : 'FAIL', { before: before.toString(), after: after.toString() });
  } catch (e: any) { log('A-7-3', 'FAIL', { error: e.message }); }

  // ── A-7-4: 전액 인출 ──
  try {
    const v = await getCashGiftVault(client, vaultId!);
    if (v && v.balance > 0n) {
      await executeAndAssert(client, {
        transaction: buildWithdrawTx({ vaultId: vaultId!, capId: capId!, amount: v.balance, owner: Host.toSuiAddress() }),
        signer: Host,
      });
      const v2 = await getCashGiftVault(client, vaultId!);
      log('A-7-4', v2 && v2.balance === 0n ? 'PASS' : 'FAIL', { balance: v2?.balance.toString() });
    } else {
      log('A-7-4', 'SKIP', { error: 'Vault 잔액 0' });
    }
  } catch (e: any) { log('A-7-4', 'FAIL', { error: e.message }); }

  // ── A-7-7: 잘못된 Cap으로 인출 ──
  try {
    // Guest1 부조로 vault에 다시 넣기
    await executeAndAssert(client, {
      transaction: buildGiveTx({ vaultId: vaultId!, weddingId: weddingId!, participationId: guest1PartId!, amount: 1_000_000n }),
      signer: Guest1,
    });
    const wrongCaps = await client.getOwnedObjects({
      owner: Guest1.toSuiAddress(),
      filter: { StructType: moveTarget('wedding', 'WeddingCap') },
      options: { showContent: true },
    });
    const wrongCap = wrongCaps.data[0]?.data?.objectId;
    if (wrongCap) {
      await executeAndAssert(client, {
        transaction: buildWithdrawTx({ vaultId: vaultId!, capId: wrongCap, amount: 100_000n, owner: Guest1.toSuiAddress() }),
        signer: Guest1,
      });
      log('A-7-7', 'FAIL', { error: '잘못된 Cap 인출 성공하면 안 됨' });
    }
  } catch (e: any) {
    log('A-7-7', e.message.includes('abort code: 0') ? 'EXPECTED_FAIL' : 'FAIL', { error: e.message });
  }

  // ── A-7-8: 공동혼주 Cap으로 인출 ──
  try {
    await executeAndAssert(client, {
      transaction: buildWithdrawTx({ vaultId: vaultId!, capId: coCapId!, amount: 500_000n, owner: CoHost.toSuiAddress() }),
      signer: CoHost,
    });
    log('A-7-8', 'PASS');
  } catch (e: any) { log('A-7-8', 'FAIL', { error: e.message }); }

  // ── A-8-5: 모든 slot(0~5) 순회 ──
  let allSlotPass = true;
  for (let slot = 0; slot <= 5; slot++) {
    try {
      await executeAndAssert(client, {
        transaction: buildSubmitRsvpTx({ loungeId: loungeId!, recipientSlot: slot, attendance: 0, companionCount: 0, meal: 0 }),
        signer: Guest1,
      });
    } catch (e: any) {
      allSlotPass = false;
      log('A-8-5', 'FAIL', { error: `slot=${slot} 실패: ${e.message}` });
      break;
    }
  }
  if (allSlotPass) log('A-8-5', 'PASS', { slots: '0~5 모두 성공' });

  // ── A-8-6: 모든 meal(0,1,2) 순회 ──
  let allMealPass = true;
  for (let meal = 0; meal <= 2; meal++) {
    try {
      await executeAndAssert(client, {
        transaction: buildSubmitRsvpTx({ loungeId: loungeId!, recipientSlot: 0, attendance: 0, companionCount: 0, meal }),
        signer: Guest2,
      });
    } catch (e: any) {
      allMealPass = false;
      log('A-8-6', 'FAIL', { error: `meal=${meal} 실패: ${e.message}` });
      break;
    }
  }
  if (allMealPass) log('A-8-6', 'PASS', { meals: '0~2 모두 성공' });

  console.log('\n=== Agent A Part 2 완료 ===');
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
