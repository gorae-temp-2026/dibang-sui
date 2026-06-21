import { createJsonRpcClient, configureSui, getActionLoggedEvents } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';
configureSui(TESTNET_CONFIG);
const c = createJsonRpcClient('testnet');
const all = await getActionLoggedEvents(c);
const gifts = all.filter(a => a.actionType === 3);
console.log('GIFT 총:', gifts.length);
gifts.forEach(g => console.log(`  actor: ${g.actor.slice(0,10)}... target: ${g.target?.slice(0,10)}... amount: ${g.amount} ts: ${g.ts}`));
if (gifts.length === 0) console.log('온체인 GIFT ActionLogged 이벤트 없음');
