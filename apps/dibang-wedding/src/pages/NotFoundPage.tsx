import { useNavigate } from 'react-router';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-[#0A1626] px-6 text-center">
      <span className="text-5xl font-black text-white/20">404</span>
      <p className="text-[15px] leading-relaxed text-white/60">
        페이지를 찾을 수 없습니다.
      </p>
      <button
        type="button"
        onClick={() => navigate('/my-wedding', { replace: true })}
        className="rounded-xl bg-white/10 px-6 py-2.5 text-[14px] font-bold text-white"
      >
        홈으로
      </button>
    </div>
  );
}
