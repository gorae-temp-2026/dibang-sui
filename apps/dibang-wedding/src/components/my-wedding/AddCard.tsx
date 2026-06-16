export function AddCard({ onClick, label = '모바일 청첩장 만들기', sub = '나만의 청첩장을 만들어보세요' }: { onClick: () => void; label?: string; sub?: string }) {
  return (
    <div
      onClick={onClick}
      className="rounded-2xl border-2 border-dashed border-soft-sky bg-pale-sky/30 flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-pale-sky/60 w-full min-h-[480px]"
    >
      <span className="text-4xl text-soft-sky mb-3">+</span>
      <span className="text-base font-semibold text-navy">{label}</span>
      <span className="text-sm text-muted mt-1">{sub}</span>
    </div>
  );
}
