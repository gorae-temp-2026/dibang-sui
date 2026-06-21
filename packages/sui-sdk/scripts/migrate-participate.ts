/**
 * DB→온체인 마이그레이션: 사용자 DEV 지갑으로 모든 WEDDING 이벤트에 GUEST 참가.
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  createJsonRpcClient, executeAndAssert, configureSui,
  buildParticipateTx, getEventCreatedEvents, getParticipatedEvents,
} from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');

const DEV_KEY = 'suiprivkey1qp6ldcag9qaq3cf8nsfcc065l62vr6qsn55wqsgz4m245t4h0sjevs6qx27';

async function main() {
  const kp = Ed25519Keypair.fromSecretKey(DEV_KEY);
  const addr = kp.toSuiAddress();
  console.log('DEV 지갑:', addr);

  const [events, parts] = await Promise.all([
    getEventCreatedEvents(client),
    getParticipatedEvents(client),
  ]);

  const weddingEvents = events.filter(e => e.eventType === 0);
  const myParts = parts.filter(p => p.participant === addr);
  const myEventIds = new Set(myParts.map(p => p.eventId));

  console.log(`WEDDING 이벤트: ${weddingEvents.length}개`);
  console.log(`내 Participation: ${myParts.length}개`);

  const missing = weddingEvents.filter(e => !myEventIds.has(e.eventId) && e.creator !== addr);
  console.log(`참가 안 한 WEDDING (내가 만든 것 제외): ${missing.length}개`);

  for (const e of missing) {
    console.log(`  참가: ${e.eventId.slice(0, 16)}... (creator: ${e.creator.slice(0, 10)}...)`);
    try {
      const res = await executeAndAssert(client, {
        transaction: buildParticipateTx({ eventId: e.eventId, roleId: 1 }),
        signer: kp,
      });
      console.log(`    ✅ ${res.digest}`);
    } catch (err: any) {
      console.log(`    ❌ ${err.message.slice(0, 80)}`);
    }
  }

  console.log('\n마이그레이션 완료');
}

main().catch(e => { console.error(e); process.exit(1); });
