import { readFileSync } from 'fs';
import { createJsonRpcClient, configureSui, getOwnedIumRequests, buildAcceptIumTx, ephemeralKeypairFromSession, buildZkLoginSignature, type ZkLoginSession } from '../src/index';
import { TESTNET_CONFIG } from '../src/constants';

configureSui(TESTNET_CONFIG);
const client = createJsonRpcClient('testnet');
const session: ZkLoginSession = JSON.parse(readFileSync('/private/tmp/claude-501/-Users-taewonpark-Github-WORK-GoraeUniverse-dibang-sui/983c790a-b074-496f-a409-cbe6dcbc10f8/scratchpad/zklogin-session.json', 'utf-8'));

async function zkExecute(tx: any): Promise<string> {
  const ephemeral = ephemeralKeypairFromSession(session);
  tx.setSender(session.address);
  const built = await tx.build({ client });
  const { signature: ephSig } = await ephemeral.signTransaction(built);
  const zkSig = buildZkLoginSignature({
    proofInputs: session.proofInputs!,
    maxEpoch: session.maxEpoch,
    userSignature: ephSig,
    salt: session.salt,
    jwt: session.jwt,
  });
  const res = await client.executeTransactionBlock({
    transactionBlock: built,
    signature: zkSig,
    options: { showEffects: true },
  });
  if (res.effects?.status?.status !== 'success') throw new Error(res.effects?.status?.error ?? 'tx failed');
  return res.digest;
}

async function main() {
  const requests = await getOwnedIumRequests(client, session.address);
  console.log(`남은 요청: ${requests.length}건`);
  let ok = 0, fail = 0;
  for (const req of requests) {
    try {
      const tx = buildAcceptIumTx({ eventId: req.eventId, requestId: req.requestId });
      await zkExecute(tx);
      ok++;
      console.log(`  수락 ✓ (${req.initiator.slice(0, 10)})`);
    } catch (e) {
      fail++;
      console.error(`  수락 ✗ ${(e as Error).message?.slice(0, 50)}`);
    }
  }
  console.log(`완료: 성공 ${ok}, 실패 ${fail}`);
}
main().catch(e => { console.error(e); process.exit(1); });
