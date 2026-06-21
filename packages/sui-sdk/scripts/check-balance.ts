import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { createJsonRpcClient, configureSui } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');
const here = dirname(fileURLToPath(import.meta.url));
const funder = Ed25519Keypair.fromSecretKey(readFileSync(join(here, '.shop-admin-key'), 'utf-8').trim());
const addr = funder.toSuiAddress();
console.log('Funder:', addr);
const bal = await client.getBalance({ owner: addr, coinType: '0x2::sui::SUI' });
console.log('Balance (MIST):', bal.totalBalance, '=', Number(bal.totalBalance) / 1e9, 'SUI');
