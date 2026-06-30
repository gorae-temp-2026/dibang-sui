import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { createJsonRpcClient, configureSui, executeAndAssert, buildParticipateTx, buildGiveTx, buildWriteTx, getParticipationForEvent } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');
const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '.sim-100-result.json'), 'utf-8'));
const wallets: { name: string; address: string; sk: string }[] = Object.values(data.wallets);

const EVENT_ID = '0xa8fdb56a0fb5904140d4b71cdf5e82eedc17dfcb2b697791299a923cbf6deb60';
const WEDDING_ID = '0xf2e85e7a471e9edbdd18a2b819564e4f65bcbe7c5054516bad8f06c077f911bc';
const VAULT_ID = '0x28c000a5fdac535b77bb1e52c2601b7bc508110cd15c4dd567c4a81ff4b5f2ac';

async function main() {
  const targets = wallets.slice(10, 40); // B1~B30 (idx 10~39)
  let pOk = 0, pFail = 0, gOk = 0, gFail = 0, wOk = 0, wFail = 0;

  for (let i = 0; i < targets.length; i++) {
    const w = targets[i];
    const kp = Ed25519Keypair.fromSecretKey(w.sk);
    const addr = kp.toSuiAddress();
    console.log(`[${i+1}/30] ${w.name} (${addr.slice(0,10)})`);

    // 1. Participate
    const existing = await getParticipationForEvent(client, addr, EVENT_ID);
    let partId: string | null = existing?.id ?? null;
    if (existing) {
      console.log('  participate: already done');
      pOk++;
    } else {
      try {
        const tx = buildParticipateTx({ eventId: EVENT_ID, roleId: 1 });
        await executeAndAssert(client, { transaction: tx, signer: kp });
        const part = await getParticipationForEvent(client, addr, EVENT_ID);
        partId = part?.id ?? null;
        pOk++;
        console.log('  participate: OK');
      } catch (e) { pFail++; console.error('  participate: FAIL', (e as Error).message?.slice(0,50)); continue; }
    }

    // 2. Give (0.05 SUI)
    if (partId) {
      try {
        const tx = buildGiveTx({ vaultId: VAULT_ID, weddingId: WEDDING_ID, participationId: partId, amount: 50_000_000n });
        await executeAndAssert(client, { transaction: tx, signer: kp });
        gOk++;
        console.log('  give: OK');
      } catch (e) { gFail++; console.error('  give: FAIL', (e as Error).message?.slice(0,50)); }
    }

    // 3. Write
    if (partId) {
      try {
        const tx = buildWriteTx({ weddingId: WEDDING_ID, participationId: partId });
        await executeAndAssert(client, { transaction: tx, signer: kp });
        wOk++;
        console.log('  write: OK');
      } catch (e) { wFail++; console.error('  write: FAIL', (e as Error).message?.slice(0,50)); }
    }
  }

  console.log(`\n=== 결과 ===`);
  console.log(`participate: ${pOk} OK, ${pFail} FAIL`);
  console.log(`give: ${gOk} OK, ${gFail} FAIL`);
  console.log(`write: ${wOk} OK, ${wFail} FAIL`);
}

main().catch(e => { console.error(e); process.exit(1); });
