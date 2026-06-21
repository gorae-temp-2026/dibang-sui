import { createJsonRpcClient } from '../src/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const client = createJsonRpcClient('testnet');
  const sk = readFileSync(join(here, '.shop-admin-key'), 'utf-8').trim();
  const kp = Ed25519Keypair.fromSecretKey(sk);
  const addr = kp.toSuiAddress();
  console.log('funder:', addr);
  const bal = await client.getBalance({ owner: addr });
  console.log('balance:', bal.totalBalance, 'MIST');
  console.log('balance SUI:', Number(bal.totalBalance) / 1e9, 'SUI');
}
main();
