/**
 * 대리 지갑의 trust balance + connection web 검증.
 * F-8 + F-9 통합.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  createJsonRpcClient, configureSui,
  getSignalEvents, getIumAcceptedEvents, getParticipatedEvents,
} from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';
import { creditFromSignals, signalBreakdownFor, SOURCE } from '../../../apps/dibang-wedding/src/lib/credit';

const here = dirname(fileURLToPath(import.meta.url));
configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');

async function main() {
  const data = JSON.parse(readFileSync(join(here, '.sim-100-result.json'), 'utf-8'));
  const proxy = (data.wallets as Record<string, { address: string }>)['신솔현']!;
  console.log(`대리 지갑: 신솔현 (${proxy.address.slice(0, 10)}…)\n`);

  const [signals, iiums, parts] = await Promise.all([
    getSignalEvents(client),
    getIumAcceptedEvents(client),
    getParticipatedEvents(client),
  ]);

  console.log(`전체 SignalEmitted: ${signals.length}`);
  console.log(`전체 IumAccepted: ${iiums.length}`);
  console.log(`전체 Participated: ${parts.length}\n`);

  // 대리 지갑의 신호 분해
  const bd = signalBreakdownFor(signals, proxy.address);
  console.log('=== 대리 지갑 신호 분해 ===');
  console.log(`  부조: ${bd.부조}`);
  console.log(`  방명록: ${bd.방명록}`);
  console.log(`  초대: ${bd.초대}`);
  console.log(`  참석: ${bd.참석}`);
  console.log(`  매칭: ${bd.매칭}`);
  console.log(`  메모리: ${bd.메모리}`);
  console.log(`  쪽지: ${bd.쪽지}`);
  console.log(`  선물: ${bd.선물}`);
  console.log(`  합계: ${bd.total}`);

  // 신용 계산
  const result = creditFromSignals(signals);
  const credit = result.credit[proxy.address] ?? 0;
  const ranked = Object.entries(result.credit).sort((a, b) => b[1] - a[1]);
  const rank = ranked.findIndex(([addr]) => addr === proxy.address) + 1;
  const total = ranked.length;

  console.log(`\n=== 대리 지갑 신용 ===`);
  console.log(`  score: ${(credit * 1000).toFixed(0)}`);
  console.log(`  rank: ${rank}/${total}`);

  // 이음 수
  const ieumCount = iiums.filter(a => a.initiator === proxy.address || a.receiver === proxy.address).length;
  console.log(`  ieum: ${ieumCount}`);

  // 참석 이벤트 수
  const eventCount = signals.filter(s => s.from === proxy.address && s.source === SOURCE.ATTEND).length;
  console.log(`  events: ${eventCount}`);

  // Connection web (이웃 목록)
  const neighbors = new Set<string>();
  for (const s of signals) {
    if (s.from === proxy.address && s.to !== proxy.address) neighbors.add(s.to);
    if (s.to === proxy.address && s.from !== proxy.address) neighbors.add(s.from);
  }
  console.log(`  neighbors: ${neighbors.size}`);

  console.log('\n=== 상위 10명 ===');
  for (const [addr, score] of ranked.slice(0, 10)) {
    const marker = addr === proxy.address ? ' ← 대리' : '';
    console.log(`  ${addr.slice(0, 8)}… ${(score * 1000).toFixed(0)}${marker}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
