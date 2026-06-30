import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { createJsonRpcClient, configureSui, executeAndAssert } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');
const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '.sim-100-result.json'), 'utf-8'));
const wallets: { name: string; address: string; sk: string }[] = Object.values(data.wallets);
const funder = Ed25519Keypair.fromSecretKey('suiprivkey1qqrc2pqz7pu2m848n2uh2vtl62hu50jkczuxkh7rcfrs6n8lp06zqtg9er8');

async function main() {
  for (let i = 10; i < 20; i++) {
    const w = wallets[i];
    const kp = Ed25519Keypair.fromSecretKey(w.sk);
    const addr = kp.toSuiAddress();
    try {
      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [200_000_000]);
      tx.transferObjects([coin], addr);
      await executeAndAssert(client, { transaction: tx, signer: funder });
      console.log(`${w.name}: charged 0.2 SUI`);
    } catch (e) { console.error(`${w.name}: FAIL ${(e as Error).message?.slice(0,30)}`); }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
