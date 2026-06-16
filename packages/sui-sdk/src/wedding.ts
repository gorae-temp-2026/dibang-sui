/**
 * wedding 모듈 PTB 빌더.
 *
 * create_wedding 은 `WeddingCap`을 반환(합성 가능)하므로, 빌더가 PTB 안에서
 * 호출자(owner)에게 transfer 까지 묶어 준다. update/add_host 는 공유 Wedding과
 * Cap을 입력으로 받는다.
 */

import { Transaction } from '@mysten/sui/transactions';
import { moveTarget } from './constants';

/** Option<String> 인자: 값이 없으면 null. */
type Optional = string | null;

export interface CreateWeddingParams {
  /** WeddingCap을 받을 주소(보통 호출자 본인). */
  owner: string;
  groomName: string;
  brideName: string;
  groomFatherName?: Optional;
  groomMotherName?: Optional;
  brideFatherName?: Optional;
  brideMotherName?: Optional;
  /** 예식 날짜 "YYYY-MM-DD". */
  date: string;
  /** 예식 시각 "HH:MM". */
  time: string;
  venueName: string;
  venueAddress: string;
  venueHall?: Optional;
  loungeName: string;
}

export interface UpdateWeddingParams {
  weddingId: string;
  capId: string;
  groomName: string;
  brideName: string;
  groomFatherName?: Optional;
  groomMotherName?: Optional;
  brideFatherName?: Optional;
  brideMotherName?: Optional;
  date: string;
  time: string;
  venueName: string;
  venueAddress: string;
  venueHall?: Optional;
}

export interface AddHostParams {
  weddingId: string;
  capId: string;
  newHost: string;
}

/** 결혼식 생성 + 생성된 WeddingCap을 owner에게 전송. */
export function buildCreateWeddingTx(params: CreateWeddingParams): Transaction {
  const tx = new Transaction();
  // 단일 반환값(WeddingCap)은 구조분해 없이 TransactionResult를 그대로 인자로 쓴다.
  const cap = tx.moveCall({
    target: moveTarget('wedding', 'create_wedding'),
    arguments: [
      tx.pure.string(params.groomName),
      tx.pure.string(params.brideName),
      tx.pure.option('string', params.groomFatherName ?? null),
      tx.pure.option('string', params.groomMotherName ?? null),
      tx.pure.option('string', params.brideFatherName ?? null),
      tx.pure.option('string', params.brideMotherName ?? null),
      tx.pure.string(params.date),
      tx.pure.string(params.time),
      tx.pure.string(params.venueName),
      tx.pure.string(params.venueAddress),
      tx.pure.option('string', params.venueHall ?? null),
      tx.pure.string(params.loungeName),
    ],
  });
  tx.transferObjects([cap], params.owner);
  return tx;
}

/** 결혼식 정보 수정 (WeddingCap 필요). */
export function buildUpdateWeddingTx(params: UpdateWeddingParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('wedding', 'update_wedding'),
    arguments: [
      tx.object(params.weddingId),
      tx.object(params.capId),
      tx.pure.string(params.groomName),
      tx.pure.string(params.brideName),
      tx.pure.option('string', params.groomFatherName ?? null),
      tx.pure.option('string', params.groomMotherName ?? null),
      tx.pure.option('string', params.brideFatherName ?? null),
      tx.pure.option('string', params.brideMotherName ?? null),
      tx.pure.string(params.date),
      tx.pure.string(params.time),
      tx.pure.string(params.venueName),
      tx.pure.string(params.venueAddress),
      tx.pure.option('string', params.venueHall ?? null),
    ],
  });
  return tx;
}

/** 호스트(혼주) 추가 (WeddingCap 필요). */
export function buildAddHostTx(params: AddHostParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget('wedding', 'add_host'),
    arguments: [
      tx.object(params.weddingId),
      tx.object(params.capId),
      tx.pure.address(params.newHost),
    ],
  });
  return tx;
}
