// ⚠️ TRANSITIONAL(전환기) — 아키텍처 의도: 온체인(Sui) = 신뢰/Wedding SSOT, DB(Go/Supabase)는 보조.
// 온체인 쓰기를 DB 흐름과 best-effort dual-write하는 건 *전환기*일 뿐 "DB 우선" 아님. 목표(미완): 앱 온체인-읽기 이관.
// 상세: CLAUDE.md 상단 SSOT 배너 / _architecture/SUI_CONTRACT_DESIGN_DIRECTION §SSOT 선언.
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
  buildCreateInvitationTx,
  buildAddHostTx,
  buildInviteTx,
  buildCreateVaultTx,
  buildWithdrawTx,
  buildCreateMoiTx,
  buildPurchaseItemTx,
  buildEquipItemTx,
  buildUnequipItemTx,
  buildRequestIumTx,
  buildAcceptIumTx,
  buildGiftTx,
  type WithdrawParams,
  type PurchaseItemParams,
  type UnequipItemParams,
  type RequestIumParams,
  type AcceptIumParams,
  type GiftParams,
  type InviteParams,
  type CreateInvitationParams,
} from '@gorae/sui-sdk'
import { useZkLogin } from '../providers/ZkLoginProvider'
import { translate, useLangStore } from '../lib/i18n'

const lang = () => useLangStore.getState().lang

export function useOnchainHostActions() {
  const { address, executeOnchain } = useZkLogin()

  const requireAddress = useCallback((): string => {
    if (!address) throw new Error(translate(lang(), 'common.errNeedLogin'))
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
  // 초대(청첩장) — 혼주가 하객을 초대했다는 관계 신호(CS) 기록.
  const invite = useCallback(
    (p: InviteParams) => executeOnchain(buildInviteTx(p)),
    [executeOnchain],
  )
  // 청첩장(Invitation) 온체인 생성. 이름(신랑·신부)·커버사진은 호출자가 Walrus에 올린 blobId로 전달(평문 금지, VISION §7).
  const createInvitation = useCallback(
    (p: CreateInvitationParams) => executeOnchain(buildCreateInvitationTx(p)),
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
  // 샵 아이템 = Payment Kit SUI 결제 '구매'(결정#6). 무료 mint 폐기 — buildPurchaseItemTx가 coinWithBalance로
  // sponsor-safe 결제(가스 분리 금지) + moi::purchase_item(registry, nonce, …). 호출자가 registryId·nonce 제공.
  const purchaseItem = useCallback(
    (p: Omit<PurchaseItemParams, 'owner'>) =>
      executeOnchain(buildPurchaseItemTx({ ...p, owner: requireAddress() })),
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

  // === Ium 인연 매칭 (2단계 합의: 신청 request_ium → 상대가 수락 accept_ium) ===
  // relationType·label(PII)은 온체인에 안 보낸다(결정#2) — 오프체인 저장.
  const requestIum = useCallback(
    (p: RequestIumParams) => executeOnchain(buildRequestIumTx(p)),
    [executeOnchain],
  )
  const acceptIum = useCallback(
    (p: AcceptIumParams) => executeOnchain(buildAcceptIumTx(p)),
    [executeOnchain],
  )

  // === Gift 선물 (MoiItem 증여 + GIFT 신호) — giver의 Participation·item으로 서명. ===
  const gift = useCallback(
    (p: GiftParams) => executeOnchain(buildGiftTx(p)),
    [executeOnchain],
  )

  return {
    createWedding,
    createInvitation,
    addHost,
    invite,
    createVault,
    withdraw,
    createMoi,
    purchaseItem,
    equipItem,
    unequipItem,
    requestIum,
    acceptIum,
    gift,
  }
}
