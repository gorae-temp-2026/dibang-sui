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

async function main() {
  const b22 = wallets[31];
  const kp = Ed25519Keypair.fromSecretKey(b22.sk);
  const a1addr = '0xdabbe66008c98c2f3fe44557fe1ea905a5f4ea6467b4cd3a98f25c391171e6a0';
  console.log(`${b22.name}(${b22.address.slice(0,10)}) → A1 이음 신청`);
  const tx = buildRequestIumTx({ toUser: a1addr });
  const res = await executeAndAssert(client, { transaction: tx, signer: kp });
  console.log('TX:', res.digest.slice(0, 20));
}
main().catch(e => { console.error(e.message?.slice(0,80)); process.exit(1); });
