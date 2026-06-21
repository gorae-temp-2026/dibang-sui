import { createJsonRpcClient, configureSui, getParticipatedEvents, getEventCreatedEvents } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';
configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');

const MY = '0x46e7e39b2acd3973b2d19836243712826200ad5968d5fd4a4c284ccba149c0bb';
const TARGET = '0x3ca2'; // partial

async function main() {
  const [parts, events] = await Promise.all([getParticipatedEvents(client), getEventCreatedEvents(client)]);

  const weddingEventIds = new Set(events.filter(e => e.eventType === 0).map(e => e.eventId));
  const inyeonEventIds = new Set(events.filter(e => e.eventType === 1).map(e => e.eventId));

  console.log(`WEDDING 이벤트: ${weddingEventIds.size}개, INYEON 이벤트: ${inyeonEventIds.size}개`);

  const myParts = parts.filter(p => p.participant === MY);
  console.log(`\n내 Participation: ${myParts.length}개`);
  for (const p of myParts) {
    const type = weddingEventIds.has(p.eventId) ? 'WEDDING' : inyeonEventIds.has(p.eventId) ? 'INYEON' : 'UNKNOWN';
    console.log(`  eventId=${p.eventId.slice(0,10)}... role=${p.roleId} type=${type}`);
  }

  const targetParts = parts.filter(p => p.participant.startsWith(TARGET));
  const targetAddr = targetParts[0]?.participant ?? '?';
  console.log(`\n상대(${targetAddr.slice(0,10)}...) Participation: ${targetParts.length}개`);
  for (const p of targetParts) {
    const type = weddingEventIds.has(p.eventId) ? 'WEDDING' : inyeonEventIds.has(p.eventId) ? 'INYEON' : 'UNKNOWN';
    console.log(`  eventId=${p.eventId.slice(0,10)}... role=${p.roleId} type=${type}`);
  }

  // 공유 이벤트 (전체)
  const myEventIds = new Set(myParts.map(p => p.eventId));
  const sharedAll = targetParts.filter(p => myEventIds.has(p.eventId));
  console.log(`\n공유 이벤트 (전체): ${sharedAll.length}개`);
  for (const p of sharedAll) {
    const type = weddingEventIds.has(p.eventId) ? 'WEDDING' : inyeonEventIds.has(p.eventId) ? 'INYEON' : 'UNKNOWN';
    console.log(`  eventId=${p.eventId.slice(0,10)}... type=${type}`);
  }

  // 공유 WEDDING만
  const myWeddingEventIds = new Set(myParts.filter(p => weddingEventIds.has(p.eventId)).map(p => p.eventId));
  const sharedWedding = targetParts.filter(p => myWeddingEventIds.has(p.eventId));
  console.log(`공유 WEDDING: ${sharedWedding.length}개`);
}

main().catch(e => { console.error(e); process.exit(1); });
