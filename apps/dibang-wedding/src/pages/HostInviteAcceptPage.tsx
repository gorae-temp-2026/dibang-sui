import { useParams, useNavigate } from 'react-router';
import { useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { hostInviteAcceptMachine } from '../machines/hostInviteAccept.machine';
import { useAuth } from '../providers/AuthContext';
import { useGetHostInvite } from '../queries/host-invite/useGetHostInvite';
import { useAcceptHostInvite } from '../queries/host-invite/useAcceptHostInvite';
import { SIDE_LABEL } from '../lib/guestLabel';

export function HostInviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();

  const { data: invite, isLoading: queryLoading, isError: queryError } = useGetHostInvite(token);
  const { mutate: acceptMutate } = useAcceptHostInvite(token);

  // 페이지 flow는 머신(hostInviteAccept): data(조회 로딩) + accept(수락 진행).
  const [state, send] = useMachine(hostInviteAcceptMachine);
  useEffect(() => {
    if (queryLoading) return;
    if (queryError || !invite) send({ type: 'LOAD_ERROR' });
    else send({ type: 'LOAD_DONE' });
  }, [queryLoading, queryError, invite, send]);
  const isLoading = state.matches({ data: 'loading' });
  const isError = state.matches({ data: 'error' });
  const isPending = state.matches({ accept: 'accepting' });

  const accept = () => {
    send({ type: 'ACCEPT' });
    acceptMutate(undefined, {
      onSuccess: () => {
        send({ type: 'ACCEPT_DONE' });
        navigate('/my-wedding');
      },
      onError: () => send({ type: 'ACCEPT_ERROR' }),
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-base text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  if (isError || !invite) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-base text-gray-500">초대를 찾을 수 없습니다</p>
        <button onClick={() => navigate('/my-wedding')} className="text-base text-sky-500 hover:text-sky-700">
          돌아가기
        </button>
      </div>
    );
  }

  if (invite.status === 'accepted') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-bold text-gray-900">이미 수락된 초대입니다</p>
        <button onClick={() => navigate('/my-wedding')} className="rounded-lg bg-sky-500 px-6 py-2.5 text-base font-semibold text-white">
          나의 결혼식으로 이동
        </button>
      </div>
    );
  }

  if (invite.status === 'cancelled') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-bold text-gray-900">취소된 초대입니다</p>
        <button onClick={() => navigate('/my-wedding')} className="text-base text-sky-500 hover:text-sky-700">
          돌아가기
        </button>
      </div>
    );
  }

  const summary = invite.wedding_summary;
  const slotLabel = SIDE_LABEL[invite.slot] ?? invite.slot;

  return (
    <div className="flex h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-[28px] font-semibold text-gray-900">결혼식 초대</h1>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-3 text-left">
          <p className="text-lg font-semibold text-gray-900">
            {summary.groom_name} & {summary.bride_name}
          </p>
          <p className="text-sm text-gray-500">{summary.date}</p>
          {summary.venue_name && (
            <p className="text-sm text-gray-500">{summary.venue_name}</p>
          )}
          <div className="border-t border-gray-100 pt-3 mt-3">
            <p className="text-sm text-gray-400">초대된 역할</p>
            <p className="text-base font-semibold text-gray-900 mt-1">{slotLabel}</p>
          </div>
        </div>

        {session ? (
          <button
            onClick={() => accept()}
            disabled={isPending}
            className="w-full rounded-lg bg-sky-500 px-6 py-3 text-base font-semibold text-white hover:bg-sky-600 disabled:opacity-50 transition-colors"
          >
            {isPending ? '수락 중...' : '수락하기'}
          </button>
        ) : (
          <button
            onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`)}
            className="w-full rounded-lg bg-sky-500 px-6 py-3 text-base font-semibold text-white hover:bg-sky-600 transition-colors"
          >
            로그인하고 수락하기
          </button>
        )}

        <button
          onClick={() => navigate('/my-wedding')}
          className="w-full text-base text-gray-400 hover:text-gray-600"
        >
          나중에
        </button>
      </div>
    </div>
  );
}
