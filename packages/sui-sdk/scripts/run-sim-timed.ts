/**
 * 시뮬레이션 (20분 타이밍) — 씬 단계별 TX 실행.
 * 0~3분: 지갑100 펀딩+Moi + 결혼식 생성
 * 3~8분: participate (부조 이벤트의 참가)
 * 8~12분: participate + 이음(request_ium) 섞어서
 * 12~16분: 남은 participate + 이음
 * 16~20분: 나머지 이음
 *
 * 1 TX/1.5초 — 레이트리밋 방어. 실패 시 1회 재시도.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import {
  createJsonRpcClient, executeAndAssert, configureSui,
  buildCreateWeddingTx, buildCreateVaultTx, buildCreateMoiTx,
  buildParticipateTx, buildRequestIumTx,
} from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

const here = dirname(fileURLToPath(import.meta.url));
configureSui({ network: 'testnet', packageId: TESTNET_CONFIG.packageId });
const client = createJsonRpcClient('testnet');
const find = (changes: any[] | undefined, suffix: string) =>
  changes?.find((o: any) => o.type === 'created' && o.objectType?.endsWith(suffix));
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function tryExec(tx: Transaction, signer: Ed25519Keypair, label: string): Promise<any> {
  try {
    return await executeAndAssert(client, { transaction: tx, signer });
  } catch (e) {
    await sleep(2000);
    try { return await executeAndAssert(client, { transaction: tx, signer }); }
    catch (e2) { console.error(`  FAIL ${label}: ${(e2 as Error).message?.slice(0, 60)}`); return null; }
  }
}

async function main() {
  const simData = JSON.parse(readFileSync(join(here, '../../../_simulation/sim-100-events.json'), 'utf-8'));
  const persons: string[] = simData.persons;
  const events: { ts: string; event_id: string; type: string; from: string; to: string; action: string; size: number }[] = simData.events;
  const funder = Ed25519Keypair.fromSecretKey(readFileSync(join(here, '.shop-admin-key'), 'utf-8').trim());

  console.log(`시뮬레이션 시작: ${persons.length}명 · ${events.length}건 · 20분 타이밍`);
  console.log(`funder: ${funder.toSuiAddress()}`);
  const t0 = Date.now();
  const elapsed = () => `[${((Date.now() - t0) / 1000).toFixed(0)}s]`;

  // === PHASE 0: 지갑 생성 + 펀딩 (0~1분) ===
  console.log(`\n${elapsed()} PHASE 0: 지갑 생성 + 펀딩`);
  const wallets = new Map<string, Ed25519Keypair>();
  for (const name of persons) wallets.set(name, new Ed25519Keypair());

  const addrs = [...wallets.entries()];
  for (let i = 0; i < addrs.length; i += 5) {
    const batch = addrs.slice(i, i + 5);
    const tx = new Transaction();
    for (const [, kp] of batch) { const [coin] = tx.splitCoins(tx.gas, [200_000_000]); tx.transferObjects([coin], kp.toSuiAddress()); }
    await tryExec(tx, funder, `fund-${i}`);
    await sleep(500);
  }
  console.log(`${elapsed()} 펀딩 완료`);

  // === PHASE 1: Moi 생성 (1~2분) ===
  console.log(`\n${elapsed()} PHASE 1: Moi 생성`);
  for (let i = 0; i < addrs.length; i++) {
    const [name, kp] = addrs[i];
    await tryExec(buildCreateMoiTx({ recipient: kp.toSuiAddress() }), kp, `moi-${name}`);
    await sleep(800);
    if ((i + 1) % 10 === 0) console.log(`${elapsed()}   Moi ${i + 1}/${addrs.length}`);
  }

  // === PHASE 2: 결혼식 생성 (2~4분) ===
  console.log(`\n${elapsed()} PHASE 2: 결혼식 생성`);
  const weddingEventIds = [...new Set(events.filter(e => e.type === '결혼식').map(e => e.event_id))];
  const weddingHosts = new Map<string, string>(); // event_id → host name
  for (const e of events) { if (e.type === '결혼식' && !weddingHosts.has(e.event_id)) weddingHosts.set(e.event_id, e.to); }

  const weddingMap = new Map<string, { weddingId: string; eventId: string; vaultId: string }>();
  for (const eid of weddingEventIds) {
    const hostName = weddingHosts.get(eid);
    if (!hostName || !wallets.has(hostName)) continue;
    const hostKp = wallets.get(hostName)!;
    const res = await tryExec(buildCreateWeddingTx({ owner: hostKp.toSuiAddress() }), hostKp, `wedding-${eid}`);
    if (!res) { await sleep(1500); continue; }
    const weddingId = find(res.objectChanges, '::wedding::Wedding')?.objectId;
    const eventId = find(res.objectChanges, '::event::Event')?.objectId;
    const capId = find(res.objectChanges, '::wedding::WeddingCap')?.objectId;
    if (weddingId && eventId && capId) {
      const v = await tryExec(buildCreateVaultTx({ weddingId, capId }), hostKp, `vault-${eid}`);
      const vaultId = find(v?.objectChanges, '::cash_gift::CashGiftVault')?.objectId ?? '';
      weddingMap.set(eid, { weddingId, eventId, vaultId });
    }
    await sleep(1500);
  }
  console.log(`${elapsed()} 결혼식 ${weddingMap.size}개 생성`);

  // === 참가+이음 이벤트 준비 ===
  const participateEvents = events.filter(e => (e.action === '부조' || e.action === '방명록') && weddingMap.has(e.event_id));
  const iumEvents = events.filter(e => e.action === '이음');
  // 참가 중복 제거 (from + event_id)
  const participateSeen = new Set<string>();
  const uniqueParticipates: typeof participateEvents = [];
  for (const e of participateEvents) {
    const key = `${e.from}|${e.event_id}`;
    if (participateSeen.has(key)) continue;
    participateSeen.add(key);
    uniqueParticipates.push(e);
  }
  // 이음 중복 제거 (쌍)
  const iumSeen = new Set<string>();
  const uniqueIums: typeof iumEvents = [];
  for (const e of iumEvents) {
    const key = [e.from, e.to].sort().join('|');
    if (iumSeen.has(key)) continue;
    iumSeen.add(key);
    uniqueIums.push(e);
  }

  console.log(`\n${elapsed()} 참가 ${uniqueParticipates.length}건 · 이음 ${uniqueIums.length}건 준비`);

  // === PHASE 3~5: 참가 + 이음 섞어서 실행 (4~18분) ===
  // 이음을 참가 사이사이에 균등 삽입
  const mixed: { kind: 'participate' | 'ium'; event: typeof events[0] }[] = [];
  const iumInterval = Math.max(1, Math.floor(uniqueParticipates.length / (uniqueIums.length + 1)));
  let iumIdx = 0;
  for (let i = 0; i < uniqueParticipates.length; i++) {
    mixed.push({ kind: 'participate', event: uniqueParticipates[i] });
    if ((i + 1) % iumInterval === 0 && iumIdx < uniqueIums.length) {
      mixed.push({ kind: 'ium', event: uniqueIums[iumIdx++] });
    }
  }
  while (iumIdx < uniqueIums.length) mixed.push({ kind: 'ium', event: uniqueIums[iumIdx++] });

  console.log(`\n${elapsed()} PHASE 3: 참가+이음 ${mixed.length}건 실행 시작`);
  let success = 0, fail = 0;
  for (let i = 0; i < mixed.length; i++) {
    const m = mixed[i];
    const fromKp = wallets.get(m.event.from);
    const toKp = wallets.get(m.event.to);
    if (!fromKp || !toKp) continue;

    if (m.kind === 'participate') {
      const w = weddingMap.get(m.event.event_id);
      if (!w) continue;
      const res = await tryExec(buildParticipateTx({ eventId: w.eventId, roleId: 1 }), fromKp, `part-${i}`);
      if (res) success++; else fail++;
    } else {
      const res = await tryExec(buildRequestIumTx({ toUser: toKp.toSuiAddress() }), fromKp, `ium-${i}`);
      if (res) success++; else fail++;
    }

    await sleep(1500);
    if ((i + 1) % 20 === 0) console.log(`${elapsed()}   ${i + 1}/${mixed.length} (성공 ${success} / 실패 ${fail})`);
  }

  console.log(`\n${elapsed()} ✅ 시뮬레이션 완료: ${success} 성공 / ${fail} 실패`);
  console.log(`총 소요: ${((Date.now() - t0) / 60000).toFixed(1)}분`);

  // 결과 저장
  const result = {
    wallets: [...wallets.entries()].map(([n, kp]) => ({ name: n, address: kp.toSuiAddress(), sk: kp.getSecretKey() })),
    weddings: [...weddingMap.entries()].map(([eid, w]) => ({ simEventId: eid, ...w })),
    stats: { success, fail, total: mixed.length },
  };
  writeFileSync(join(here, '.sim-timed-result.json'), JSON.stringify(result, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
