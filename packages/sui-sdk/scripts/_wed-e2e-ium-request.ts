import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { createJsonRpcClient, configureSui, executeAndAssert, buildRequestIumTx } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');
const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '.sim-100-result.json'), 'utf-8'));
const wallets: { name: string; address: string; sk: string }[] = Object.values(data.wallets);
const USER = '0x46e7e39b2acd3973b2d19836243712826200ad5968d5fd4a4c284ccba149c0bb';

async function main() {
  for (let i = 10; i < 15; i++) {
    const w = wallets[i];
    const kp = Ed25519Keypair.fromSecretKey(w.sk);
    try {
      const tx = buildRequestIumTx({ toUser: USER });
      await executeAndAssert(client, { transaction: tx, signer: kp });
      console.log(`${w.name} → user: OK`);
    } catch (e) { console.error(`${w.name} → user: FAIL ${(e as Error).message?.slice(0, 50)}`); }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
