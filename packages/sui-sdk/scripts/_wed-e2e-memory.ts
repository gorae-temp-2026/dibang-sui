import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { createJsonRpcClient, configureSui, executeAndAssert, buildCreateMemoryTx, getParticipationForEvent } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');
const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '.sim-100-result.json'), 'utf-8'));
const wallets: { name: string; address: string; sk: string }[] = Object.values(data.wallets);

const EVENT_ID = '0xa8fdb56a0fb5904140d4b71cdf5e82eedc17dfcb2b697791299a923cbf6deb60';
const WEDDING_ID = '0xf2e85e7a471e9edbdd18a2b819564e4f65bcbe7c5054516bad8f06c077f911bc';

async function main() {
  // B1~B10 (idx 10~19) 메모리 작성
  let ok = 0, fail = 0;
  for (let i = 10; i < 20; i++) {
    const w = wallets[i];
    const kp = Ed25519Keypair.fromSecretKey(w.sk);
    const addr = kp.toSuiAddress();
    const part = await getParticipationForEvent(client, addr, EVENT_ID);
    if (!part) { console.log(`${w.name}: no participation`); fail++; continue; }
    try {
      const tx = buildCreateMemoryTx({
        weddingId: WEDDING_ID,
        participationId: part.id,
        text: `Beautiful wedding! Congratulations from ${w.name}`,
        photoBlobId: '',
      });
      await executeAndAssert(client, { transaction: tx, signer: kp });
      ok++;
      console.log(`${w.name} memory: OK`);
    } catch (e) { fail++; console.error(`${w.name} memory: FAIL ${(e as Error).message?.slice(0, 50)}`); }
  }
  console.log(`\nmemory: ${ok} OK, ${fail} FAIL`);
}
main().catch(e => { console.error(e); process.exit(1); });
