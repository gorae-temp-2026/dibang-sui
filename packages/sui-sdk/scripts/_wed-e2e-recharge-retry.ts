import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { createJsonRpcClient, configureSui, executeAndAssert, buildParticipateTx, buildGiveTx, buildWriteTx, getParticipationForEvent } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');
const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '.sim-100-result.json'), 'utf-8'));
const wallets: { name: string; address: string; sk: string }[] = Object.values(data.wallets);
const funder = Ed25519Keypair.fromSecretKey('suiprivkey1qqrc2pqz7pu2m848n2uh2vtl62hu50jkczuxkh7rcfrs6n8lp06zqtg9er8');

const EVENT_ID = '0xa8fdb56a0fb5904140d4b71cdf5e82eedc17dfcb2b697791299a923cbf6deb60';
const WEDDING_ID = '0xf2e85e7a471e9edbdd18a2b819564e4f65bcbe7c5054516bad8f06c077f911bc';
const VAULT_ID = '0x28c000a5fdac535b77bb1e52c2601b7bc508110cd15c4dd567c4a81ff4b5f2ac';

async function main() {
  const targets = wallets.slice(10, 40); // B1~B30

  // Step 1: 충전
  console.log('=== Step 1: 잔액 부족 지갑 충전 ===');
  let charged = 0;
  for (const w of targets) {
    const kp = Ed25519Keypair.fromSecretKey(w.sk);
    const addr = kp.toSuiAddress();
    const bal = await client.getBalance({ owner: addr });
    if (Number(bal.totalBalance) < 150_000_000) { // 0.15 SUI 미만
      try {
        const tx = new Transaction();
        const [coin] = tx.splitCoins(tx.gas, [200_000_000]);
        tx.transferObjects([coin], addr);
        await executeAndAssert(client, { transaction: tx, signer: funder });
        charged++;
      } catch { console.error('  charge fail:', w.name); }
    }
  }
  console.log(`충전 완료: ${charged}개 지갑\n`);

  // Step 2: 재실행 (participate → give → write)
  console.log('=== Step 2: 실패분 재실행 ===');
  let pOk=0, gOk=0, wOk=0, pFail=0, gFail=0, wFail=0;
  for (let i = 0; i < targets.length; i++) {
    const w = targets[i];
    const kp = Ed25519Keypair.fromSecretKey(w.sk);
    const addr = kp.toSuiAddress();

    // Participate
    let part = await getParticipationForEvent(client, addr, EVENT_ID);
    if (!part) {
      try {
        const tx = buildParticipateTx({ eventId: EVENT_ID, roleId: 1 });
        await executeAndAssert(client, { transaction: tx, signer: kp });
        part = await getParticipationForEvent(client, addr, EVENT_ID);
        pOk++; console.log(`[${i+1}] ${w.name} participate: OK`);
      } catch { pFail++; console.log(`[${i+1}] ${w.name} participate: FAIL`); continue; }
    }
    if (!part) continue;

    // Give — 이미 부조했는지 확인은 어려우니 try-catch로 처리
    try {
      const tx = buildGiveTx({ vaultId: VAULT_ID, weddingId: WEDDING_ID, participationId: part.id, amount: 50_000_000n });
      await executeAndAssert(client, { transaction: tx, signer: kp });
      gOk++; console.log(`[${i+1}] ${w.name} give: OK`);
    } catch (e) {
      const msg = String((e as Error).message ?? '');
      if (msg.includes('already') || msg.includes('abort')) { gOk++; } // 이미 부조한 경우
      else { gFail++; console.log(`[${i+1}] ${w.name} give: FAIL ${msg.slice(0,40)}`); }
    }

    // Write
    try {
      const tx = buildWriteTx({ weddingId: WEDDING_ID, participationId: part.id });
      await executeAndAssert(client, { transaction: tx, signer: kp });
      wOk++; console.log(`[${i+1}] ${w.name} write: OK`);
    } catch (e) {
      const msg = String((e as Error).message ?? '');
      if (msg.includes('already') || msg.includes('abort')) { wOk++; }
      else { wFail++; console.log(`[${i+1}] ${w.name} write: FAIL ${msg.slice(0,40)}`); }
    }
  }

  console.log(`\n=== 최종 결과 ===`);
  console.log(`participate: +${pOk} OK, ${pFail} FAIL`);
  console.log(`give: +${gOk} OK, ${gFail} FAIL`);
  console.log(`write: +${wOk} OK, ${wFail} FAIL`);
}

main().catch(e => { console.error(e); process.exit(1); });
