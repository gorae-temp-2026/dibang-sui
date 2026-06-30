import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { createJsonRpcClient, configureSui, executeAndAssert, buildGiveTx, buildWriteTx, getParticipationForEvent } from '../src/index';
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
  const targets = wallets.slice(10, 40);

  // Step 1: 잔액 확인 + 충전
  console.log('=== 잔액 확인 + 충전 ===');
  let charged = 0;
  for (const w of targets) {
    const kp = Ed25519Keypair.fromSecretKey(w.sk);
    const addr = kp.toSuiAddress();
    const bal = await client.getBalance({ owner: addr });
    const sui = Number(bal.totalBalance) / 1e9;
    if (sui < 0.1) {
      try {
        const tx = new Transaction();
        const [coin] = tx.splitCoins(tx.gas, [150_000_000]); // 0.15 SUI
        tx.transferObjects([coin], addr);
        await executeAndAssert(client, { transaction: tx, signer: funder });
        charged++;
        console.log(`  ${w.name}: ${sui.toFixed(3)} → 충전 OK`);
      } catch (e) { console.error(`  ${w.name}: charge FAIL ${(e as Error).message?.slice(0,30)}`); }
    }
  }
  console.log(`충전: ${charged}개\n`);

  // Step 2: give/write만 재시도 (participate는 이미 됨)
  console.log('=== give/write 재시도 ===');
  let gOk = 0, gSkip = 0, gFail = 0, wOk = 0, wSkip = 0, wFail = 0;

  for (let i = 0; i < targets.length; i++) {
    const w = targets[i];
    const kp = Ed25519Keypair.fromSecretKey(w.sk);
    const addr = kp.toSuiAddress();

    const part = await getParticipationForEvent(client, addr, EVENT_ID);
    if (!part) { console.log(`[${i+1}] ${w.name}: no participation, skip`); continue; }

    // Give
    try {
      const tx = buildGiveTx({ vaultId: VAULT_ID, weddingId: WEDDING_ID, participationId: part.id, amount: 50_000_000n });
      await executeAndAssert(client, { transaction: tx, signer: kp });
      gOk++;
    } catch (e) {
      const msg = String((e as Error).message ?? '');
      if (msg.includes('abort')) { gSkip++; } // 이미 부조한 경우 Move abort
      else { gFail++; console.log(`[${i+1}] ${w.name} give FAIL: ${msg.slice(0,40)}`); }
    }

    // Write
    try {
      const tx = buildWriteTx({ weddingId: WEDDING_ID, participationId: part.id });
      await executeAndAssert(client, { transaction: tx, signer: kp });
      wOk++;
    } catch (e) {
      const msg = String((e as Error).message ?? '');
      if (msg.includes('abort')) { wSkip++; }
      else { wFail++; console.log(`[${i+1}] ${w.name} write FAIL: ${msg.slice(0,40)}`); }
    }
  }

  console.log(`\n=== 최종 ===`);
  console.log(`give: +${gOk} new, ${gSkip} already done, ${gFail} fail`);
  console.log(`write: +${wOk} new, ${wSkip} already done, ${wFail} fail`);
}

main().catch(e => { console.error(e); process.exit(1); });
