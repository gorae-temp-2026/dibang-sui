/**
 * Testnet 실호출 e2e — 온체인 신호 분류(signal.move)가 실제 testnet에서 발행·조회되는지 검증.
 *
 * 흐름(HOST=혼주, GUEST=하객 — 방향 검증 위해 2 지갑):
 *   HOST: create_wedding → create_vault
 *   GUEST: participate(웨딩 GUEST) → 참석 CS / give(부조) → BUSU / write(방명록) → CS
 *   read: getSignalEvents(SignalEmitted) → creditFromSignals
 *
 * 실행: PKG=<packageId> pnpm --filter @gorae/sui-sdk exec tsx scripts/test-signals-testnet.ts
 *
 * 분류=온체인 SSOT, 집계=오프체인 검증이 목적. 결과로 신호 fan-out·방향·source·신용 산출을 실증한다.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { Transaction } from '@mysten/sui/transactions';
import type { SuiTransactionBlockResponse } from '@mysten/sui/jsonRpc';
import {
  createJsonRpcClient,
  executeAndAssert,
  configureSui,
  getSignalEvents,
  getWedding,
  getCashGiftVault,
} from '../src/index';
import { creditFromSignals, type SignalEvent } from '../../../apps/dibang-wedding/src/lib/credit';

const PKG = process.env.PKG;
if (!PKG) throw new Error('PKG env(packageId) 필요');
const CLOCK = '0x6';
const ROLE_GUEST = 1;
const here = dirname(fileURLToPath(import.meta.url));
const client = createJsonRpcClient('testnet');

function loadKey(name: string): Ed25519Keypair {
  const p = join(here, `.${name}-key`);
  if (existsSync(p)) return Ed25519Keypair.fromSecretKey(readFileSync(p, 'utf-8').trim());
  const kp = new Ed25519Keypair();
  writeFileSync(p, kp.getSecretKey(), 'utf-8');
  return kp;
}

async function bal(addr: string): Promise<bigint> {
  return BigInt((await client.getBalance({ owner: addr })).totalBalance);
}

async function faucet(addr: string) {
  if ((await bal(addr)) >= 200_000_000n) return;
  try {
    await requestSuiFromFaucetV2({ host: getFaucetHost('testnet'), recipient: addr });
  } catch (e) {
    console.error('faucet 실패(레이트리밋?):', (e as Error).message);
  }
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    if ((await bal(addr)) >= 200_000_000n) return;
  }
}

const created = (res: SuiTransactionBlockResponse, suffix: string): string => {
  const c = res.objectChanges?.find((o) => o.type === 'created' && o.objectType.endsWith(suffix));
  if (!c || c.type !== 'created') throw new Error(`created ${suffix} 없음`);
  return c.objectId;
};

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT 실패: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

async function main() {
  const host = loadKey('signals-host');
  const guest = loadKey('signals-guest');
  const H = host.toSuiAddress();
  const G = guest.toSuiAddress();
  console.log('PKG :', PKG);
  console.log('HOST:', H);
  console.log('GUEST:', G);

  // 펀딩: HOST faucet → GUEST에 0.3 SUI 송금(faucet 레이트리밋 회피).
  await faucet(H);
  if ((await bal(H)) < 300_000_000n) throw new Error(`HOST 잔액 부족: ${await bal(H)} — 수동 충전 필요`);
  if ((await bal(G)) < 200_000_000n) {
    const t = new Transaction();
    const [c] = t.splitCoins(t.gas, [300_000_000]);
    t.transferObjects([c], G);
    await executeAndAssert(client, { transaction: t, signer: host });
    console.log('  ✓ GUEST 펀딩(0.3 SUI)');
  }

  // 1) HOST: create_wedding (Wedding/Event/Lounge 공유 + Cap 반환→HOST).
  const t1 = new Transaction();
  const cap = t1.moveCall({ target: `${PKG}::wedding::create_wedding`, arguments: [t1.object(CLOCK)] });
  t1.transferObjects([cap], H);
  const r1 = await executeAndAssert(client, { transaction: t1, signer: host });
  const weddingId = created(r1, '::wedding::Wedding');
  const eventId = created(r1, '::event::Event');
  const capId = created(r1, '::wedding::WeddingCap');
  console.log('  ✓ create_wedding', { weddingId, eventId });

  // 2) HOST: create_vault.
  const t2 = new Transaction();
  t2.moveCall({ target: `${PKG}::cash_gift::create_vault`, arguments: [t2.object(weddingId), t2.object(capId)] });
  const r2 = await executeAndAssert(client, { transaction: t2, signer: host });
  const vaultId = created(r2, '::cash_gift::CashGiftVault');
  console.log('  ✓ create_vault', { vaultId });

  // 3) GUEST: participate(웨딩 GUEST) → 참석 CS 신호.
  const t3 = new Transaction();
  t3.moveCall({ target: `${PKG}::event::participate`, arguments: [t3.object(eventId), t3.pure.u8(ROLE_GUEST), t3.object(CLOCK)] });
  const r3 = await executeAndAssert(client, { transaction: t3, signer: guest });
  const partId = created(r3, '::event::Participation');
  console.log('  ✓ participate (attendance CS)', { partId });

  // 4) GUEST: give(부조 1000 MIST) → BUSU 신호.
  const t4 = new Transaction();
  const [coin] = t4.splitCoins(t4.gas, [1000]);
  t4.moveCall({
    target: `${PKG}::cash_gift::give`,
    arguments: [t4.object(vaultId), t4.object(weddingId), t4.object(partId), coin, t4.object(CLOCK)],
  });
  await executeAndAssert(client, { transaction: t4, signer: guest });
  console.log('  ✓ give (BUSU)');

  // 5) GUEST: write(방명록) → CS 신호.
  const t5 = new Transaction();
  t5.moveCall({ target: `${PKG}::guestbook::write`, arguments: [t5.object(weddingId), t5.object(partId), t5.object(CLOCK)] });
  await executeAndAssert(client, { transaction: t5, signer: guest });
  console.log('  ✓ write (CS)');

  // 6) 인연 매칭: HOST(=initiator A) request_ium(GUEST=receiver B) → INYEON Event + IumRequest(→B).
  const t6 = new Transaction();
  t6.moveCall({ target: `${PKG}::ium::request_ium`, arguments: [t6.pure.address(G), t6.object(CLOCK)] });
  const r6 = await executeAndAssert(client, { transaction: t6, signer: host });
  const inyeonEventId = created(r6, '::event::Event');
  const reqId = created(r6, '::ium::IumRequest');
  console.log('  ✓ request_ium', { inyeonEventId });

  // 7) GUEST(B) accept_ium → 매칭 확정 = 양방향 CS(initiator↔receiver) 신호.
  const t7 = new Transaction();
  t7.moveCall({ target: `${PKG}::ium::accept_ium`, arguments: [t7.object(inyeonEventId), t7.object(reqId), t7.object(CLOCK)] });
  await executeAndAssert(client, { transaction: t7, signer: guest });
  console.log('  ✓ accept_ium (match CS 양방향)');

  // 8) read: 온체인 SignalEmitted 조회 (인덱싱 대기 후).
  configureSui({ network: 'testnet', packageId: PKG });
  let sigs: SignalEvent[] = [];
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    sigs = await getSignalEvents(client);
    if (sigs.length >= 5) break;
  }
  console.log('\n온체인 SignalEmitted 조회:', sigs.length, '건');
  for (const s of sigs) console.log('  ', { kind: s.kind, source: s.source, from: s.from.slice(0, 8), to: s.to.slice(0, 8), mag: s.magnitude });

  const BUSU = 1, CS = 2, A_ACCEPT = 2, A_WRITE = 4, A_ATTEND = 5;
  const busu = sigs.filter((s) => s.kind === BUSU && s.from === G && s.to === H && s.magnitude === 1000);
  const attend = sigs.filter((s) => s.kind === CS && s.source === A_ATTEND && s.from === G && s.to === H);
  const write = sigs.filter((s) => s.kind === CS && s.source === A_WRITE && s.from === G && s.to === H);
  assert(busu.length >= 1, '부조 BUSU 신호(하객→혼주, 1000) 발행·조회');
  assert(attend.length >= 1, '참석 CS 신호(source=ATTEND, 하객→혼주) 발행·조회');
  assert(write.length >= 1, '방명록 CS 신호(source=WRITE_MESSAGE, 하객→혼주) 발행·조회');
  const matchHG = sigs.filter((s) => s.kind === CS && s.source === A_ACCEPT && s.from === H && s.to === G);
  const matchGH = sigs.filter((s) => s.kind === CS && s.source === A_ACCEPT && s.from === G && s.to === H);
  assert(matchHG.length >= 1 && matchGH.length >= 1, '인연 매칭 양방향 CS 신호(source=ACCEPT_IUM, A↔B) 발행·조회');

  // 7) 오프체인 집계: 온체인 분류 신호 → 신용.
  const { credit, components } = creditFromSignals(sigs);
  console.log('\ncreditFromSignals:', JSON.stringify({ credit, components }, null, 0));
  assert((components[G]?.busu ?? 0) > 0, '하객(베푼 쪽) 부조 신용 > 0');
  assert((components[H]?.cs ?? 0) > 0, '혼주(유대받은 쪽) CS 신용 > 0');

  // 9) 온체인 읽기 층(#43) 실증: getWedding/getCashGiftVault = useOnchainWedding/useOnchainVault의 SDK 경로.
  const w = await getWedding(client, weddingId);
  assert(
    !!w && w.hosts.includes(H) && w.eventId === eventId && w.vaultId === vaultId,
    'getWedding 온체인 앵커(혼주·event_id·vault) 정합 — DB 아닌 온체인 읽기',
  );
  const v = await getCashGiftVault(client, vaultId);
  assert(!!v && v.balance >= 1000n, 'getCashGiftVault 온체인 잔액 >= 부조 1000 MIST');

  console.log('\n=== TESTNET 신호 e2e + 읽기층 실증 통과 ===');
}

main().catch((e) => {
  console.error('\nTESTNET 신호 e2e 실패:', e);
  process.exit(1);
});
