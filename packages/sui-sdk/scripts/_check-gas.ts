import { createJsonRpcClient, configureSui, getIumAcceptedEvents } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';
configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');

async function main() {
  const events = await getIumAcceptedEvents(client);
  console.log('총 IumAccepted:', events.length);
  let count = 0;
  for (const ev of events) {
    if (count >= 3) break;
    const tx = await client.getTransactionBlock({ digest: ev.digest, options: { showEffects: true } });
    const gas = tx.effects?.gasUsed;
    if (gas) {
      const total = BigInt(gas.computationCost) + BigInt(gas.storageCost) - BigInt(gas.storageRebate);
      console.log(`${ev.digest.slice(0, 12)}… 가스: ${(Number(total) / 1e9).toFixed(6)} SUI`);
      count++;
    }
  }
  process.exit(0);
}
main();
