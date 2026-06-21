import { createJsonRpcClient, executeAndAssert } from '../src/index';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const client = createJsonRpcClient('testnet');

  // .env.localhost에서 dev private key 읽기
  const envPath = join(here, '../../../apps/dibang-wedding/.env.localhost');
  if (!existsSync(envPath)) throw new Error('.env.localhost not found');
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  const sk = lines.find(l => l.startsWith('VITE_DEV_PRIVATE_KEY='))?.split('=')[1]?.trim();
  if (!sk) throw new Error('VITE_DEV_PRIVATE_KEY not found');

  const dev = Ed25519Keypair.fromSecretKey(sk);
  const devAddr = dev.toSuiAddress();

  const bal = await client.getBalance({ owner: devAddr });
  console.log('dev wallet:', devAddr);
  console.log('balance:', Number(bal.totalBalance) / 1e9, 'SUI');

  const funderAddr = '0xbe43f5bb0ee950321b00fdf393f206845676fc69f3ff94bb428c5cb8b40186dc';
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [300_000_000]); // 0.3 SUI
  tx.transferObjects([coin], funderAddr);
  const res = await executeAndAssert(client, { transaction: tx, signer: dev });
  console.log('funded 0.5 SUI to funder:', res.digest);

  const funderBal = await client.getBalance({ owner: funderAddr });
  console.log('funder balance:', Number(funderBal.totalBalance) / 1e9, 'SUI');
}
main().catch(e => { console.error(e); process.exit(1); });
