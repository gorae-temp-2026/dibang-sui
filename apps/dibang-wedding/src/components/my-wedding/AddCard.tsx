import { useT } from '../../lib/i18n';

export function AddCard({ onClick, label, sub }: { onClick: () => void; label?: string; sub?: string }) {
  const t = useT();
  return (
    <div
      onClick={onClick}
      className="rounded-2xl border-2 border-dashed border-soft-sky bg-pale-sky/30 flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-pale-sky/60 w-full min-h-[480px]"
    >
      <span className="text-4xl text-soft-sky mb-3">+</span>
      <span className="text-base font-semibold text-navy">{label ?? t('myWedding.addCard.label')}</span>
      <span className="text-sm text-muted mt-1">{sub ?? t('myWedding.addCard.sub')}</span>
    </div>
  );
}
