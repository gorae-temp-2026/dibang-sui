import { useCallback, useEffect, useRef } from 'react';
import { useMachine } from '@xstate/react';
import {
  invitationImageUploadMachine,
  type InvitationUploadItem,
} from '../../machines/invitationImageUpload.machine';
import {
  useInvitationPhotoUpload,
  type InvitationPhotoSubKind,
  type InvitationUploadContext,
} from '../../queries/invitation/useInvitationPhotoUpload';
import { useT } from '../../lib/i18n';

// 낙관적 이미지 업로드 브리지 — flow는 머신, 업로드 실행은 본 훅이
// React Query mutation으로 수행 후 결과를 머신에 send (STATE_MANAGEMENT.md §4).
// 커버·갤러리가 각자 인스턴스로 사용. 페이지는 onItemDone에서 zustand store를
// 서버 URL로 동기화한다 (저장 페이로드에 로컬 URL이 섞이지 않는 경계).
// 업로드는 presigned 경유 — Edit은 wedding 스코프, Create는 draft(v3-tmp) (STORAGE.md).

export interface UseInvitationImageUploadOptions {
  /** 업로드 스코프 — Edit: wedding, Create: draft */
  context: InvitationUploadContext;
  subKind: InvitationPhotoSubKind;
  /** 아이템 업로드 성공 직후 (제거된 아이템에는 호출 안 됨) */
  onItemDone?: (item: { id: string; serverUrl: string }) => void;
}

export function useInvitationImageUpload(options: UseInvitationImageUploadOptions) {
  const t = useT();
  const [state, send, actorRef] = useMachine(invitationImageUploadMachine);
  const mutation = useInvitationPhotoUpload(options.context, options.subKind);

  // 콜백·mutation 최신 참조 유지 — addFiles/retry의 비동기 완료 시점에 stale 방지.
  // 렌더 중 ref 쓰기 금지(react-hooks/refs) — effect에서 갱신한다.
  const onItemDoneRef = useRef(options.onItemDone);
  const mutateAsyncRef = useRef(mutation.mutateAsync);
  useEffect(() => {
    onItemDoneRef.current = options.onItemDone;
    mutateAsyncRef.current = mutation.mutateAsync;
  });

  const runUpload = useCallback(
    async (id: string, file: File) => {
      try {
        const serverUrl = await mutateAsyncRef.current(file);
        send({ type: 'ITEM_DONE', id, serverUrl });
        // REMOVE가 먼저 온 경우 머신이 무시 — store 동기화도 건너뛴다
        const alive = actorRef
          .getSnapshot()
          .context.items.some((it) => it.id === id && it.status === 'done');
        if (alive) onItemDoneRef.current?.({ id, serverUrl });
      } catch (e) {
        send({
          type: 'ITEM_FAILED',
          id,
          error: e instanceof Error ? e.message : t('lettering.uploadFailed'),
        });
      }
    },
    [send, actorRef, t],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const beforeIds = new Set(actorRef.getSnapshot().context.items.map((it) => it.id));
      send({ type: 'ADD_FILES', files });
      const added = actorRef
        .getSnapshot()
        .context.items.filter((it) => !beforeIds.has(it.id));
      for (const item of added) void runUpload(item.id, item.file);
    },
    [send, actorRef, runUpload],
  );

  const retry = useCallback(
    (id: string) => {
      const item = actorRef.getSnapshot().context.items.find((it) => it.id === id);
      if (!item || item.status !== 'failed') return;
      send({ type: 'RETRY', id });
      void runUpload(id, item.file);
    },
    [send, actorRef, runUpload],
  );

  const remove = useCallback(
    (id: string) => {
      send({ type: 'REMOVE', id });
    },
    [send],
  );

  // 페이지 이탈 시 objectURL 일괄 해제. unmount 시점엔 useMachine의 actor가
  // 이미 stop됐을 수 있어(send 무시됨) 마지막 스냅샷에서 직접 revoke한다.
  // 중복 revoke는 무해(no-op).
  useEffect(() => {
    return () => {
      for (const it of actorRef.getSnapshot().context.items) {
        URL.revokeObjectURL(it.localUrl);
      }
    };
  }, [actorRef]);

  const items: InvitationUploadItem[] = state.context.items;
  return { items, addFiles, retry, remove };
}
