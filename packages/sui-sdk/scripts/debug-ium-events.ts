import { createJsonRpcClient, configureSui, getIumRequestedEvents, getIumAcceptedEvents, getOwnedIumRequests } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');

const MY_ADDR = '0x46e7e39b2acd3973b2d19836243712826200ad5968d5fd4a4c284ccba149c0bb';

async function main() {
  console.log('=== IumRequested 이벤트 ===');
  const requested = await getIumRequestedEvents(client);
  const mySent = requested.filter(r => r.initiator === MY_ADDR);
  console.log(`전체: ${requested.length}, 내가 보낸: ${mySent.length}`);
  for (const r of mySent) {
    console.log(`  → ${r.toUser.slice(0,10)}... eventId=${r.eventId.slice(0,10)}...`);
  }

  console.log('\n=== IumAccepted 이벤트 ===');
  const accepted = await getIumAcceptedEvents(client);
  console.log(`전체: ${accepted.length}`);
  for (const a of accepted) {
    console.log(`  initiator=${a.initiator.slice(0,10)}... receiver=${a.receiver.slice(0,10)}... eventId=${a.eventId.slice(0,10)}...`);
  }

  // 내가 보낸 이음 중 수락된 것
  const acceptedEventIds = new Set(accepted.map(a => a.eventId));
  const mySentPending = mySent.filter(r => !acceptedEventIds.has(r.eventId));
  const mySentAccepted = mySent.filter(r => acceptedEventIds.has(r.eventId));
  console.log(`\n내가 보낸 이음: 대기중 ${mySentPending.length}, 수락됨 ${mySentAccepted.length}`);

  // 나한테 온 이음 (IumRequest 소유)
  console.log('\n=== 내 소유 IumRequest ===');
  const owned = await getOwnedIumRequests(client, MY_ADDR);
  console.log(`${owned.length}개`);
  for (const o of owned) {
    console.log(`  requestId=${o.requestId.slice(0,10)}... eventId=${o.eventId.slice(0,10)}... initiator=${o.initiator.slice(0,10)}...`);
  }

  // 내가 관련된 매칭 성사
  const myMatched = accepted.filter(a => a.initiator === MY_ADDR || a.receiver === MY_ADDR);
  console.log(`\n내 매칭 성사: ${myMatched.length}`);
  for (const m of myMatched) {
    const other = m.initiator === MY_ADDR ? m.receiver : m.initiator;
    console.log(`  ↔ ${other.slice(0,10)}...`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
