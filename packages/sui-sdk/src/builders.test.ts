import { describe, it, expect } from 'vitest';
import { buildCreateWeddingTx } from './wedding';
import { buildParticipateTx } from './event';
import { buildGiveTx, buildCreateVaultTx, buildWithdrawTx } from './cash-gift';
import { buildWriteTx, buildWriteMessageTx } from './guestbook';
import { buildInviteTx, buildAddHostTx } from './wedding';
import { buildCreateMemoryTx } from './memory';
import { buildSendNoteTx, buildCreateNoteBoxTx } from './note';
import { buildRequestIumTx, buildAcceptIumTx } from './ium';
import { buildGiftTx } from './gift';
import { buildSubmitRsvpTx } from './rsvp';
import { buildCreateAnnouncementTx } from './announcement';
import { buildBootstrapTrustTx } from './trust';
import { TESTNET_CONFIG, configureSui, requireMatrixId } from './constants';

const PKG = TESTNET_CONFIG.packageId;

function commands(tx: ReturnType<typeof buildCreateWeddingTx>) {
  return tx.getData().commands;
}

function firstMoveCall(tx: ReturnType<typeof buildCreateWeddingTx>) {
  const cmds = commands(tx);
  const mc = cmds.find((c) => c.$kind === 'MoveCall');
  if (!mc || mc.$kind !== 'MoveCall') throw new Error('no MoveCall');
  return mc.MoveCall;
}

describe('빌더 함수 — moveCall target·인자 수 검증', () => {
  it('buildCreateWeddingTx: wedding::create_wedding, 인자 1(clock)', () => {
    const mc = firstMoveCall(buildCreateWeddingTx({ owner: '0xABC' }));
    expect(mc.package).toBe(PKG);
    expect(mc.module).toBe('wedding');
    expect(mc.function).toBe('create_wedding');
    expect(mc.arguments).toHaveLength(1);
  });

  it('buildParticipateTx: event::participate, 인자 3(event, role, matrix, clock)', () => {
    const mc = firstMoveCall(buildParticipateTx({ eventId: '0x1', roleId: 1 }));
    expect(mc.module).toBe('event');
    expect(mc.function).toBe('participate');
    expect(mc.arguments).toHaveLength(4);
  });

  it('buildGiveTx: cash_gift::give, 인자 6(vault, wedding, participation, coin, matrix, clock)', () => {
    const mc = firstMoveCall(buildGiveTx({
      vaultId: '0x1', weddingId: '0x2', participationId: '0x3', amount: 100_000n,
    }));
    expect(mc.module).toBe('cash_gift');
    expect(mc.function).toBe('give');
    expect(mc.arguments).toHaveLength(6);
  });

  it('buildWriteTx: guestbook::write, 인자 4', () => {
    const mc = firstMoveCall(buildWriteTx({ weddingId: '0x1', participationId: '0x2' }));
    expect(mc.module).toBe('guestbook');
    expect(mc.function).toBe('write');
    expect(mc.arguments).toHaveLength(4);
  });

  it('buildWriteMessageTx: guestbook::write_message, 인자 7', () => {
    const mc = firstMoveCall(buildWriteMessageTx({
      weddingId: '0x1', participationId: '0x2', messageBlobId: 'blob1', recipientSlot: 0,
    }));
    expect(mc.module).toBe('guestbook');
    expect(mc.function).toBe('write_message');
    expect(mc.arguments).toHaveLength(7);
  });

  it('buildInviteTx: wedding::invite, 인자 5', () => {
    const mc = firstMoveCall(buildInviteTx({
      weddingId: '0x1', hostParticipationId: '0x2', guest: '0x3',
    }));
    expect(mc.module).toBe('wedding');
    expect(mc.function).toBe('invite');
    expect(mc.arguments).toHaveLength(5);
  });

  it('buildAddHostTx: wedding::add_host, 인자 3', () => {
    const mc = firstMoveCall(buildAddHostTx({ weddingId: '0x1', capId: '0x2', newHost: '0x3' }));
    expect(mc.module).toBe('wedding');
    expect(mc.function).toBe('add_host');
    expect(mc.arguments).toHaveLength(3);
  });

  it('buildCreateMemoryTx: memory::create_memory, 인자 6', () => {
    const mc = firstMoveCall(buildCreateMemoryTx({
      weddingId: '0x1', participationId: '0x2', text: 'hi', photoBlobId: 'blob',
    }));
    expect(mc.module).toBe('memory');
    expect(mc.function).toBe('create_memory');
    expect(mc.arguments).toHaveLength(6);
  });

  it('buildSendNoteTx: note::send_note, 인자 6', () => {
    const mc = firstMoveCall(buildSendNoteTx({
      noteBoxId: '0x1', participationId: '0x2', to: '0x3', blobId: new Uint8Array([1, 2]),
    }));
    expect(mc.module).toBe('note');
    expect(mc.function).toBe('send_note');
    expect(mc.arguments).toHaveLength(6);
  });

  it('buildCreateNoteBoxTx: note::create_note_box, 인자 1', () => {
    const mc = firstMoveCall(buildCreateNoteBoxTx({ other: '0x1' }));
    expect(mc.module).toBe('note');
    expect(mc.function).toBe('create_note_box');
    expect(mc.arguments).toHaveLength(1);
  });

  it('buildRequestIumTx: ium::request_ium, 인자 2', () => {
    const mc = firstMoveCall(buildRequestIumTx({ toUser: '0x1' }));
    expect(mc.module).toBe('ium');
    expect(mc.function).toBe('request_ium');
    expect(mc.arguments).toHaveLength(2);
  });

  it('buildAcceptIumTx: ium::accept_ium, 인자 4', () => {
    const mc = firstMoveCall(buildAcceptIumTx({ eventId: '0x1', requestId: '0x2' }));
    expect(mc.module).toBe('ium');
    expect(mc.function).toBe('accept_ium');
    expect(mc.arguments).toHaveLength(4);
  });

  it('buildGiftTx: gift::gift, 인자 5', () => {
    const mc = firstMoveCall(buildGiftTx({
      participationId: '0x1', itemId: '0x2', recipient: '0x3',
    }));
    expect(mc.module).toBe('gift');
    expect(mc.function).toBe('gift');
    expect(mc.arguments).toHaveLength(5);
  });

  it('buildSubmitRsvpTx: rsvp::submit_rsvp, 인자 6', () => {
    const mc = firstMoveCall(buildSubmitRsvpTx({
      loungeId: '0x1', recipientSlot: 0, attendance: 0, companionCount: 0, meal: 0,
    }));
    expect(mc.module).toBe('rsvp');
    expect(mc.function).toBe('submit_rsvp');
    expect(mc.arguments).toHaveLength(6);
  });

  it('buildCreateAnnouncementTx: announcement::create_announcement, 인자 4', () => {
    const mc = firstMoveCall(buildCreateAnnouncementTx({
      capId: '0x1', messageBlobId: 'blobHello', isPinned: false,
    }));
    expect(mc.module).toBe('announcement');
    expect(mc.function).toBe('create_announcement');
    expect(mc.arguments).toHaveLength(4);
  });

  it('buildBootstrapTrustTx: trust_registry::bootstrap, 인자 0', () => {
    const mc = firstMoveCall(buildBootstrapTrustTx());
    expect(mc.module).toBe('trust_registry');
    expect(mc.function).toBe('bootstrap');
    expect(mc.arguments).toHaveLength(0);
  });

  it('buildCreateVaultTx: cash_gift::create_vault, 인자 2', () => {
    const mc = firstMoveCall(buildCreateVaultTx({ weddingId: '0x1', capId: '0x2' }));
    expect(mc.module).toBe('cash_gift');
    expect(mc.function).toBe('create_vault');
    expect(mc.arguments).toHaveLength(2);
  });

  it('buildWithdrawTx: cash_gift::withdraw, 인자 3+transferObjects', () => {
    const mc = firstMoveCall(buildWithdrawTx({ vaultId: '0x1', capId: '0x2', amount: 100n, owner: '0x3' }));
    expect(mc.module).toBe('cash_gift');
    expect(mc.function).toBe('withdraw');
    expect(mc.arguments).toHaveLength(3);
  });
});

describe('빌더 함수 — 모든 target이 배포 packageId를 가리킴', () => {
  const builders = [
    () => buildCreateWeddingTx({ owner: '0xABC' }),
    () => buildParticipateTx({ eventId: '0x1', roleId: 1 }),
    () => buildGiveTx({ vaultId: '0x1', weddingId: '0x2', participationId: '0x3', amount: 1n }),
    () => buildWriteTx({ weddingId: '0x1', participationId: '0x2' }),
    () => buildCreateMemoryTx({ weddingId: '0x1', participationId: '0x2', text: '', photoBlobId: '' }),
    () => buildSendNoteTx({ noteBoxId: '0x1', participationId: '0x2', to: '0x3', blobId: new Uint8Array() }),
    () => buildRequestIumTx({ toUser: '0x1' }),
    () => buildGiftTx({ participationId: '0x1', itemId: '0x2', recipient: '0x3' }),
    () => buildSubmitRsvpTx({ loungeId: '0x1', recipientSlot: 0, attendance: 0, companionCount: 0, meal: 0 }),
    () => buildBootstrapTrustTx(),
  ];

  it.each(builders.map((fn, i) => [i, fn]))('빌더 %i의 target이 testnet packageId를 가리킴', (_i, fn) => {
    const mc = firstMoveCall((fn as () => ReturnType<typeof buildCreateWeddingTx>)());
    expect(mc.package).toBe(PKG);
  });
});

describe('requireMatrixId — 설정 누락 시 에러', () => {
  it('csMatrixId 미설정이면 throw', () => {
    configureSui({ csMatrixId: undefined });
    expect(() => requireMatrixId('cs')).toThrow('TrustMatrix(cs) 미설정');
    configureSui({ csMatrixId: TESTNET_CONFIG.csMatrixId });
  });

  it('emMoneyMatrixId 미설정이면 throw', () => {
    configureSui({ emMoneyMatrixId: undefined });
    expect(() => requireMatrixId('emMoney')).toThrow('TrustMatrix(emMoney) 미설정');
    configureSui({ emMoneyMatrixId: TESTNET_CONFIG.emMoneyMatrixId });
  });

  it('설정돼 있으면 ID 반환', () => {
    expect(requireMatrixId('cs')).toBe(TESTNET_CONFIG.csMatrixId);
    expect(requireMatrixId('emMoney')).toBe(TESTNET_CONFIG.emMoneyMatrixId);
  });
});
