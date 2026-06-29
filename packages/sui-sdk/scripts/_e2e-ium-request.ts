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

// 이음 신청 30건 (시나리오 매핑)
// [requesterIdx, targetIdx]
const iumRequests: [number, number][] = [
  [0, 10],  // A1→B1
  [0, 16],  // A1→B7
  [1, 12],  // A2→B3
  [1, 18],  // A2→B9
  [2, 14],  // A3→B5
  [2, 24],  // A3→B15
  [3, 19],  // A4→B10
  [3, 38],  // A4→B29
  [4, 21],  // A5→B12
  [4, 30],  // A5→B21
  [5, 18],  // A6→B9
  [5, 29],  // A6→B20
  [6, 13],  // A7→B4
  [6, 33],  // A7→B24
  [7, 14],  // A8→B5
  [7, 25],  // A8→B16
  [8, 17],  // A9→B8
  [8, 34],  // A9→B25
  [9, 20],  // A10→B11
  [9, 29],  // A10→B20
  [10, 11], // B1→B2
  [11, 17], // B2→B8
  [12, 15], // B3→B6
  [15, 22], // B6→B13
  [17, 24], // B8→B15
  [23, 27], // B14→B18
  [25, 39], // B16→B30
  [27, 37], // B18→B28
  [30, 33], // B21→B24
  [32, 36], // B23→B27
];

async function main() {
  let success = 0, fail = 0;
  for (let i = 0; i < iumRequests.length; i++) {
    const [reqIdx, tgtIdx] = iumRequests[i];
    const requester = wallets[reqIdx];
    const target = wallets[tgtIdx];
    const kp = Ed25519Keypair.fromSecretKey(requester.sk);

    try {
      const tx = buildRequestIumTx({ toUser: target.address });
      await executeAndAssert(client, { transaction: tx, signer: kp });
      success++;
      console.log(`#${i+1}: ${requester.name} → ${target.name} ✓`);
    } catch (e) {
      fail++;
      console.error(`#${i+1}: ${requester.name} → ${target.name} ✗ ${(e as Error).message?.slice(0, 60)}`);
    }
  }
  console.log(`\n이음 신청 완료: 성공 ${success}, 실패 ${fail}`);
}

main().catch(e => { console.error(e); process.exit(1); });
