import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createJsonRpcClient } from '../src/index';

const here = dirname(fileURLToPath(import.meta.url));

async function main() {
  const data = JSON.parse(readFileSync(join(here, '.sim-100-result.json'), 'utf-8'));
  const wallets: {name: string; address: string; sk: string}[] = Object.values(data.wallets);
  const client = createJsonRpcClient('testnet');

  let zero = 0, low = 0, ok = 0;
  const needFund: string[] = [];
  for (let i = 0; i < wallets.length; i += 10) {
    const batch = wallets.slice(i, i + 10);
    const results = await Promise.all(batch.map(w =>
      client.getBalance({ owner: w.address }).then(b => ({ name: w.name, addr: w.address, bal: BigInt(b.totalBalance) }))
    ));
    for (const r of results) {
      if (r.bal === 0n) { zero++; needFund.push(r.addr); }
      else if (r.bal < 100_000_000n) { low++; needFund.push(r.addr); }
      else ok++;
    }
  }
  console.log(`잔액 0: ${zero} | 0.1 SUI 미만: ${low} | 0.1 SUI 이상: ${ok} | 총: ${wallets.length}`);
  console.log(`충전 필요: ${needFund.length}개`);
}
main();
