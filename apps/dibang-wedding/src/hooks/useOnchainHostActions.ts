/**
 * 호스트 온체인 액션 훅 (dibang-wedding).
 *
 * 웨딩 생성/수정/호스트추가, 축의금 모금함 생성/인출, 아바타(Moi)·아이템, 신뢰관계(Ium)를
 * @gorae/sui-sdk 빌더로 PTB로 만들고 ZkLoginProvider.executeOnchain(zkLogin 서명 + sponsor
 * 가스 대납)으로 실행한다. 호스트도 지갑·SUI 없이 Google 로그인만으로 온체인 작업을 한다.
 *
 * 웨딩 생성은 Sui Wedding/Lounge/Vault/Cap 오브젝트를 "발행"하는 기점 — 여기서 나온 Sui
 * 오브젝트 ID가 초대/라운지 데이터에 실려 게스트 흐름(guest-web)으로 전달된다.
 */
import { useCallback } from 'react'
import {
  buildCreateWeddingTx,
  buildAddHostTx,
  buildCreateVaultTx,
  buildWithdrawTx,
  buildCreateMoiTx,
  buildMintItemTx,
  buildEquipItemTx,
  buildUnequipItemTx,
  buildCreateIumTx,
  buildRevokeIumTx,
  type WithdrawParams,
  type MintItemParams,
  type UnequipItemParams,
  type CreateIumParams,
} from '@gorae/sui-sdk'
import { useZkLogin } from '../providers/ZkLoginProvider'

export function useOnchainHostActions() {
  const { address, executeOnchain } = useZkLogin()

  const requireAddress = useCallback((): string => {
    if (!address) throw new Error('zkLogin 로그인이 필요합니다')
    return address
  }, [address])

  // === Wedding ===
  // create_wedding은 익명 앵커만 생성(표시정보 인자 없음, 결정#2) — 이름·예식장은 Supabase에 별도 저장.
  const createWedding = useCallback(
    () => executeOnchain(buildCreateWeddingTx({ owner: requireAddress() })),
    [executeOnchain, requireAddress],
  )
  const addHost = useCallback(
    (p: { weddingId: string; capId: string; newHost: string }) =>
      executeOnchain(buildAddHostTx(p)),
    [executeOnchain],
  )

  // === CashGift Vault ===
  const createVault = useCallback(
    (p: { weddingId: string; capId: string }) => executeOnchain(buildCreateVaultTx(p)),
    [executeOnchain],
  )
  const withdraw = useCallback(
    (p: Omit<WithdrawParams, 'owner'>) =>
      executeOnchain(buildWithdrawTx({ ...p, owner: requireAddress() })),
    [executeOnchain, requireAddress],
  )

  // === Moi 아바타 ===
  const createMoi = useCallback(
    () => executeOnchain(buildCreateMoiTx({ recipient: requireAddress() })),
    [executeOnchain, requireAddress],
  )
  const mintItem = useCallback(
    (p: Omit<MintItemParams, 'owner'>) =>
      executeOnchain(buildMintItemTx({ ...p, owner: requireAddress() })),
    [executeOnchain, requireAddress],
  )
  const equipItem = useCallback(
    (p: { moiId: string; itemId: string }) => executeOnchain(buildEquipItemTx(p)),
    [executeOnchain],
  )
  const unequipItem = useCallback(
    (p: Omit<UnequipItemParams, 'owner'>) =>
      executeOnchain(buildUnequipItemTx({ ...p, owner: requireAddress() })),
    [executeOnchain, requireAddress],
  )

  // === Ium 신뢰관계 ===
  const createIum = useCallback(
    (p: Omit<CreateIumParams, 'owner'>) =>
      executeOnchain(buildCreateIumTx({ ...p, owner: requireAddress() })),
    [executeOnchain, requireAddress],
  )
  const revokeIum = useCallback(
    (p: { iumId: string }) => executeOnchain(buildRevokeIumTx(p)),
    [executeOnchain],
  )

  return {
    createWedding,
    addHost,
    createVault,
    withdraw,
    createMoi,
    mintItem,
    equipItem,
    unequipItem,
    createIum,
    revokeIum,
  }
}
