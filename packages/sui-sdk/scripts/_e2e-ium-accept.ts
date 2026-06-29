import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { createJsonRpcClient, configureSui, executeAndAssert, buildAcceptIumTx, getOwnedIumRequests } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');
const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, '.sim-100-result.json'), 'utf-8'));
const wallets: { name: string; address: string; sk: string }[] = Object.values(data.wallets);

// 이음 수락 30건 — [requesterIdx, acceptorIdx]
const iumAccepts: [number, number][] = [
  [0, 10],  // A1→B1: B1 수락
  [0, 16],  // A1→B7: B7 수락
  [1, 12],  // A2→B3: B3 수락
  [1, 18],  // A2→B9: B9 수락
  [2, 14],  // A3→B5: B5 수락
  [2, 24],  // A3→B15: B15 수락
  [3, 19],  // A4→B10: B10 수락
  [3, 38],  // A4→B29: B29 수락
  [4, 21],  // A5→B12: B12 수락
  [4, 30],  // A5→B21: B21 수락
  [5, 18],  // A6→B9: B9 수락
  [5, 29],  // A6→B20: B20 수락
  [6, 13],  // A7→B4: B4 수락
  [6, 33],  // A7→B24: B24 수락
  [7, 14],  // A8→B5: B5 수락
  [7, 25],  // A8→B16: B16 수락
  [8, 17],  // A9→B8: B8 수락
  [8, 34],  // A9→B25: B25 수락
  [9, 20],  // A10→B11: B11 수락
  [9, 29],  // A10→B20: B20 수락
  [10, 11], // B1→B2: B2 수락
  [11, 17], // B2→B8: B8 수락
  [12, 15], // B3→B6: B6 수락
  [15, 22], // B6→B13: B13 수락
  [17, 24], // B8→B15: B15 수락
  [23, 27], // B14→B18: B18 수락
  [25, 39], // B16→B30: B30 수락
  [27, 37], // B18→B28: B28 수락
  [30, 33], // B21→B24: B24 수락
  [32, 36], // B23→B27: B27 수락
];

async function main() {
  let success = 0, fail = 0, skip = 0;

  for (let i = 0; i < iumAccepts.length; i++) {
    const [reqIdx, accIdx] = iumAccepts[i];
    const requester = wallets[reqIdx];
    const acceptor = wallets[accIdx];
    const accKp = Ed25519Keypair.fromSecretKey(acceptor.sk);

    try {
      const requests = await getOwnedIumRequests(client, accKp.toSuiAddress());
      const req = requests.find(r => r.initiator === requester.address);
      if (!req) {
        console.log(`#${i+1}: ${acceptor.name} ← ${requester.name} — 요청 없음 (skip)`);
        skip++;
        continue;
      }

      const tx = buildAcceptIumTx({ eventId: req.eventId, requestId: req.requestId });
      await executeAndAssert(client, { transaction: tx, signer: accKp });
      success++;
      console.log(`#${i+1}: ${acceptor.name} ← ${requester.name} ✓`);
    } catch (e) {
      fail++;
      console.error(`#${i+1}: ${acceptor.name} ← ${requester.name} ✗ ${(e as Error).message?.slice(0, 60)}`);
    }
  }

  console.log(`\n이음 수락 완료: 성공 ${success}, 스킵 ${skip}, 실패 ${fail}`);
}

main().catch(e => { console.error(e); process.exit(1); });
