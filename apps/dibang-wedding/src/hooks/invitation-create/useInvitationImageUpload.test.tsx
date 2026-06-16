/**
 * useInvitationImageUpload — 낙관적 이미지 업로드 브리지 훅.
 *
 * 책임:
 *  - addFiles: 머신 ADD_FILES(즉시 미리보기 아이템) 후 파일별 mutation 실행,
 *    결과를 ITEM_DONE/ITEM_FAILED로 머신에 회신.
 *  - 성공 시 onItemDone 콜백 (페이지가 zustand store 동기화에 사용).
 *  - 제거된 아이템의 늦은 성공은 onItemDone을 부르지 않는다.
 *  - retry: failed 아이템 재업로드. remove: 아이템 제거.
 *  - unmount: CLEAR로 objectURL 일괄 해제.
 *
 * useInvitationPhotoUpload(queries 경계)를 vi.mock — 압축·presigned 디테일은 그 레이어 테스트가 담당.
 *
 * 금지(TESTING.md § 금지 항목): snapshot, implementation detail, waitForTimeout.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mutateAsync = vi.fn();
vi.mock('../../queries/invitation/useInvitationPhotoUpload', () => ({
  useInvitationPhotoUpload: () => ({ mutateAsync }),
}));

import { useInvitationImageUpload } from './useInvitationImageUpload';
import { createQueryWrapper } from '../../test-utils';

// 모든 테스트 공통 옵션 — 업로드 스코프는 mutation mock이 흡수하므로 draft로 고정
const baseOptions = { context: { mode: 'draft' } as const, subKind: 'cover' as const };

const createObjectURL = vi.fn();
const revokeObjectURL = vi.fn();

function makeFile(name: string): File {
  return new File(['x'], name, { type: 'image/jpeg' });
}

/** 외부에서 resolve/reject를 제어하는 pending promise. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  mutateAsync.mockReset();
  createObjectURL.mockReset().mockImplementation((f: File) => `blob:${f.name}`);
  revokeObjectURL.mockReset();
  vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
});

describe('useInvitationImageUpload', () => {
  it('addFiles: 서버 응답 전에 즉시 uploading 아이템이 생긴다 (낙관적)', () => {
    mutateAsync.mockReturnValue(deferred<string>().promise);
    const { result } = renderHook(() => useInvitationImageUpload(baseOptions), {
      wrapper: createQueryWrapper(),
    });

    act(() => {
      result.current.addFiles([makeFile('a.jpg'), makeFile('b.jpg')]);
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0]).toMatchObject({ status: 'uploading', localUrl: 'blob:a.jpg' });
  });

  it('업로드 성공: done + serverUrl 반영 + onItemDone 호출', async () => {
    mutateAsync.mockResolvedValue('https://cdn/a.jpg');
    const onItemDone = vi.fn();
    const { result } = renderHook(() => useInvitationImageUpload({ ...baseOptions, onItemDone }), {
      wrapper: createQueryWrapper(),
    });

    act(() => {
      result.current.addFiles([makeFile('a.jpg')]);
    });

    await waitFor(() => expect(result.current.items[0].status).toBe('done'));
    expect(result.current.items[0].serverUrl).toBe('https://cdn/a.jpg');
    expect(onItemDone).toHaveBeenCalledWith(
      expect.objectContaining({ serverUrl: 'https://cdn/a.jpg' }),
    );
  });

  it('업로드 실패: failed + 에러 메시지, onItemDone 미호출', async () => {
    mutateAsync.mockRejectedValue(new Error('이미지를 10MB 이하로 줄이지 못했습니다.'));
    const onItemDone = vi.fn();
    const { result } = renderHook(() => useInvitationImageUpload({ ...baseOptions, onItemDone }), {
      wrapper: createQueryWrapper(),
    });

    act(() => {
      result.current.addFiles([makeFile('a.jpg')]);
    });

    await waitFor(() => expect(result.current.items[0].status).toBe('failed'));
    expect(result.current.items[0].error).toContain('10MB');
    expect(onItemDone).not.toHaveBeenCalled();
  });

  it('retry: failed 아이템을 다시 업로드해 done까지 간다', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('boom'));
    mutateAsync.mockResolvedValueOnce('https://cdn/a.jpg');
    const { result } = renderHook(() => useInvitationImageUpload(baseOptions), {
      wrapper: createQueryWrapper(),
    });

    act(() => {
      result.current.addFiles([makeFile('a.jpg')]);
    });
    await waitFor(() => expect(result.current.items[0].status).toBe('failed'));

    act(() => {
      result.current.retry(result.current.items[0].id);
    });

    await waitFor(() => expect(result.current.items[0].status).toBe('done'));
    expect(mutateAsync).toHaveBeenCalledTimes(2);
  });

  it('업로드 완료 전 remove: 늦은 성공이 와도 onItemDone을 부르지 않는다', async () => {
    const d = deferred<string>();
    mutateAsync.mockReturnValue(d.promise);
    const onItemDone = vi.fn();
    const { result } = renderHook(() => useInvitationImageUpload({ ...baseOptions, onItemDone }), {
      wrapper: createQueryWrapper(),
    });

    act(() => {
      result.current.addFiles([makeFile('a.jpg')]);
    });
    const id = result.current.items[0].id;

    act(() => {
      result.current.remove(id);
    });
    expect(result.current.items).toHaveLength(0);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:a.jpg');

    await act(async () => {
      d.resolve('https://cdn/late.jpg');
      await d.promise;
    });

    expect(onItemDone).not.toHaveBeenCalled();
    expect(result.current.items).toHaveLength(0);
  });

  it('unmount: 남아 있는 아이템의 objectURL을 일괄 해제한다', () => {
    mutateAsync.mockReturnValue(deferred<string>().promise);
    const { result, unmount } = renderHook(() => useInvitationImageUpload(baseOptions), {
      wrapper: createQueryWrapper(),
    });

    act(() => {
      result.current.addFiles([makeFile('a.jpg'), makeFile('b.jpg')]);
    });

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:a.jpg');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:b.jpg');
  });
});
