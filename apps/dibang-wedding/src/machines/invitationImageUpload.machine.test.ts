/**
 * invitationImageUpload.machine — 청첩장 에디터 이미지 업로드 flow.
 *
 * 책임:
 *  - ADD_FILES: 파일별 아이템 생성(localUrl 즉시 발급) + status 'uploading'.
 *  - ITEM_DONE/ITEM_FAILED: 해당 아이템만 갱신 — 다른 아이템 영향 없음 (파일별 독립).
 *  - RETRY: failed → uploading (failed 외 상태에선 무시).
 *  - REMOVE: 아이템 제거 + revokeObjectURL. 제거된 아이템의 늦은 DONE은 무시.
 *  - CLEAR: 전체 제거 + 전체 revoke (페이지 이탈 정리).
 *
 * 업로드 실행은 머신 밖(훅이 Query mutation 호출 후 결과를 send) —
 * STATE_MANAGEMENT.md §machine 작성 규칙 4 (machine이 직접 fetch하지 않는다).
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createActor } from 'xstate';

import { invitationImageUploadMachine } from './invitationImageUpload.machine';

const createObjectURL = vi.fn();
const revokeObjectURL = vi.fn();

function makeFile(name: string): File {
  return new File(['x'], name, { type: 'image/jpeg' });
}

function startActor() {
  const actor = createActor(invitationImageUploadMachine).start();
  return actor;
}

beforeEach(() => {
  createObjectURL.mockReset().mockImplementation((f: File) => `blob:${f.name}`);
  revokeObjectURL.mockReset();
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL,
    revokeObjectURL,
  });
});

describe('invitationImageUploadMachine', () => {
  it('ADD_FILES: 파일별 아이템이 localUrl과 함께 uploading으로 즉시 생성된다', () => {
    const actor = startActor();
    actor.send({ type: 'ADD_FILES', files: [makeFile('a.jpg'), makeFile('b.jpg')] });

    const { items } = actor.getSnapshot().context;
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ status: 'uploading', localUrl: 'blob:a.jpg' });
    expect(items[1]).toMatchObject({ status: 'uploading', localUrl: 'blob:b.jpg' });
    expect(items[0].id).not.toBe(items[1].id);
  });

  it('ITEM_DONE: 해당 아이템만 serverUrl과 done으로 갱신된다', () => {
    const actor = startActor();
    actor.send({ type: 'ADD_FILES', files: [makeFile('a.jpg'), makeFile('b.jpg')] });
    const [a] = actor.getSnapshot().context.items;

    actor.send({ type: 'ITEM_DONE', id: a.id, serverUrl: 'https://cdn/a.jpg' });

    const { items } = actor.getSnapshot().context;
    expect(items[0]).toMatchObject({ status: 'done', serverUrl: 'https://cdn/a.jpg' });
    expect(items[1].status).toBe('uploading');
  });

  it('ITEM_FAILED: 한 파일 실패가 다른 파일에 영향을 주지 않는다', () => {
    const actor = startActor();
    actor.send({ type: 'ADD_FILES', files: [makeFile('a.jpg'), makeFile('b.jpg')] });
    const [a, b] = actor.getSnapshot().context.items;

    actor.send({ type: 'ITEM_FAILED', id: a.id, error: '업로드 실패' });
    actor.send({ type: 'ITEM_DONE', id: b.id, serverUrl: 'https://cdn/b.jpg' });

    const { items } = actor.getSnapshot().context;
    expect(items[0]).toMatchObject({ status: 'failed', error: '업로드 실패' });
    expect(items[1]).toMatchObject({ status: 'done', serverUrl: 'https://cdn/b.jpg' });
  });

  it('RETRY: failed 아이템만 uploading으로 되돌린다 (done 아이템엔 무시)', () => {
    const actor = startActor();
    actor.send({ type: 'ADD_FILES', files: [makeFile('a.jpg')] });
    const [a] = actor.getSnapshot().context.items;

    actor.send({ type: 'ITEM_FAILED', id: a.id, error: 'boom' });
    actor.send({ type: 'RETRY', id: a.id });
    expect(actor.getSnapshot().context.items[0]).toMatchObject({
      status: 'uploading',
      error: undefined,
    });

    actor.send({ type: 'ITEM_DONE', id: a.id, serverUrl: 'https://cdn/a.jpg' });
    actor.send({ type: 'RETRY', id: a.id });
    expect(actor.getSnapshot().context.items[0].status).toBe('done');
  });

  it('REMOVE: 아이템 제거 + revokeObjectURL, 제거 후 늦은 DONE은 무시된다', () => {
    const actor = startActor();
    actor.send({ type: 'ADD_FILES', files: [makeFile('a.jpg')] });
    const [a] = actor.getSnapshot().context.items;

    actor.send({ type: 'REMOVE', id: a.id });

    expect(actor.getSnapshot().context.items).toHaveLength(0);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:a.jpg');

    // 업로드 완료가 제거보다 늦게 도착한 경우 — 아이템이 되살아나면 안 된다
    actor.send({ type: 'ITEM_DONE', id: a.id, serverUrl: 'https://cdn/a.jpg' });
    expect(actor.getSnapshot().context.items).toHaveLength(0);
  });

  it('CLEAR: 모든 아이템 제거 + 전체 revoke', () => {
    const actor = startActor();
    actor.send({ type: 'ADD_FILES', files: [makeFile('a.jpg'), makeFile('b.jpg')] });

    actor.send({ type: 'CLEAR' });

    expect(actor.getSnapshot().context.items).toHaveLength(0);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:a.jpg');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:b.jpg');
  });
});
